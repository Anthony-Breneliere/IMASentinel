
import *  as Collections from 'typescript-collections';

import { environment } from '../environments/environment';
import { Injectable } from '@angular/core';
import { Dto } from './dto';
import { Http }    from '@angular/http';
import { Subject }    from 'rxjs/Subject';
import { FilterDto } from './filterDto';

import 'expose-loader?jQuery!jquery';
import 'signalr';

@Injectable()
export class HistoryService {

  // C'est le dictionnaire qui contient tous les DTO qui sont affichés à l'écran. On les stocke dans un
  // dictionnaire dont l'index est l'id. Cela permet de retrouver rapidement un DTO dans le cas de
  // réception d'un changement de DTO, par exemple.
  public managedDtoDico : Collections.Dictionary<number, Dto> = new Collections.Dictionary<number, Dto>();
    // { [Id: number]: Dto; } = {};

  public displayableDtoArray : Dto[] = [];

  // C'est le proxy sur le hub SignalR, il permet d'appeler des méthodes coté server et au serveur
  // d'appeler des méthodes sur tous les clients.
  public historyProxy : any = null;

  // C'est la date maximale du prochain chargement dans l'historique: on considère que les DTO ayant une data supérieure on déja 
  // été chargés et on ne les recharge pas.
  private filterDto : FilterDto = new FilterDto();

  // c'est la source des nouveaux dto qui arrivent, ils peuvent être nouveau quand ils viennent d'être créé coté
  // serveur, ou bien quand ils viennent d'être chargés. 
  private dtoSource = new Subject< Dto >();
  private updateDtoSource = new Subject< [ Dto, Dto ] >();
  private endLoadingSource = new Subject< HistoryService >();

  // Observable string streams
  newDtos$ = this.dtoSource.asObservable();
  updateDto$ = this.updateDtoSource.asObservable();
  endLoading$ = this.endLoadingSource.asObservable();

  private filterForDtos : FilterDto;

  /**
   * Le constructeur du service est construit par le module Angular
   */
  constructor( private http: Http ) {

    this.loadHubsScript();

  }

  private addDtoToManagedList( dto: Dto )
  {
    // on ajoute le dto que s'il n'est pas déjà présent, on vérifie sa présence
    if ( ! this.managedDtoDico.containsKey( dto.Id ) )
    {
        this.managedDtoDico.setValue( dto.Id, dto );

        // s'il n'y avait pas de dto existant alors c'est un nouveau jamais chargé: on notifie les observeurs d'un nouveau dto
        this.dtoSource.next( dto );
    }
  }

  /**
   * Cette méthode appelle exécute le script de génération des hubs proxys signalR. Ce script
   * est est généré le serveur SignalR, il faut donc l'appeler dynamiquement.
   */
  private loadHubsScript() :void
  {
    let hubScriptUrl : string = environment['server'] + "/signalr/hubs";
    jQuery.getScript(hubScriptUrl ).done( () => {
      this.initHubCallbacks();
    }).fail( ( j, s, e ) => {
      console.error(`Could not load the script ${hubScriptUrl}: ${e}`);
    } );
  }

  /**
   * affectation des callbacks aux fonctions du hubproxy. Ce sont les callbacks qui sont
   * appelées lorsque le serveur broadcast des informations.
   */
  initHubCallbacks() : void
  {
    let signalRUrl : string = environment['server'] + "/signalr";
 
    jQuery.connection.hub.url = signalRUrl;
    jQuery.hubConnection().logging = true;
    jQuery.hubConnection().error( (error) => {      console.error('SignalR error: ' + error);     });
    jQuery.connection.hub.connectionSlow( () => {
        console.log('We are currently experiencing difficulties with the connection.')
    });
    jQuery.connection.hub.stateChanged( ( change: SignalR.StateChanged ) => { 
      console.log("L'état de la connexion a changé de l'état " + change.oldState + " à l'état " + change.newState + " (Connecting = 0, Connected, Reconnecting, Disconnected)");
    });

    this.historyProxy = jQuery.connection['sentinelFireHub'];

    // Méthode appelée quand un nouveau DTO a été créé coté serveur
    this.historyProxy.client.newDto = ( message : Dto ) =>
    {
      console.log ( "Nouveau: " );
      console.log ( message ); 

      this.addDtoToManagedList( message );
    };

    // Méthode appelée quand un DTO existant a été chargé depuis l'historique coté serveur
    this.historyProxy.client.loadedDto = ( message : Dto ) =>
    {
      console.log ( "Chargement DTO: " );
      console.log ( message );

      this.addDtoToManagedList( message );
    };

    // Méthode appelée quand un changement a été opéré sur un DTO coté serveur
    this.historyProxy.client.dtoChange = ( message : any ) =>
    {
      console.log ( "Changement d'une propriété DTO: " );
      console.log ( message );

      let change = message;
      let id = message['Id'];

      if ( id == null )
      {
        console.error("Le changement ne possède pas d'Id !");
      }

      // a t'on ce dto ?
      let dtoChanged = this.managedDtoDico.getValue( id );
      
      if ( dtoChanged != null )
      {
        // on garde une copie inchangée du dto
        let dtoUnchanged = jQuery.extend( {}, dtoChanged );

        // on merge les deux objets
        let result = jQuery.extend( dtoChanged, change );
        console.log( result );

        // on envoie une notification du dto changé avec l'ancien DTO
        this.updateDtoSource.next( [ dtoUnchanged, dtoChanged ]);        // on envoie une notification du dto changé avec l'ancien DTO
      }
      else{
        console.log( "Changement sur un dto non connu: " + id);
      }

    };

    // attention le démarrage du serveur doit se faire APRES l'enregistrement des callbacks ! 
    jQuery.connection.hub.start() 
      .done( () => {

        console.log("Connecté, transport = " + jQuery.connection.hub.transport.name
          + ", connection id = " + jQuery.connection.hub.id );

        this.loadFromHistory( null );  

      })
      .fail( ( e ) => {
        console.error('Connexion au serveur impossible.');
        console.error( e );
      } );
  }

  /**
   * Redémarrage de l'éxécution d'un flux, qui a pu échouer précédemment
   */
  retryOne( dtoId: number, reloadSourceData: boolean )
  {
    if ( dtoId != null )
      this.retry( [ dtoId ], reloadSourceData );
  }

  /**
   * Redémarrage de l'éxécution d'une liste de flux
   */
  retry( dtoIdList: number[], reloadSourceData: boolean )
  {
    console.log( "Redemarrage de la liste des dtos " + dtoIdList );
    if ( dtoIdList != null )
      this.historyProxy.invoke('retry', dtoIdList, reloadSourceData );
  }

  /**
   * Récupération de données de l'historique
   */
  loadFromHistory( pfilterDto: FilterDto ) : void {

    let filterDto = pfilterDto ? pfilterDto : this.filterDto;

    console.log( `Récupération de données d'historique supplémentaires avec le filtre:`  );
    console.log( filterDto);

    this.historyProxy.invoke('loadFromHistory', 100, filterDto )
      .done( (history : Dto[] ) => {

        console.log( `${history.length} dtos récupérés.`);

        for (let dto of history)
        {
          this.addDtoToManagedList( dto );

          // les chargemens d'historiques qui incluent un filtre n'affectent pas maxDate
          
          let dtoDate = new Date( dto.LastExecution );
          if ( ! filterDto.MaxDate || dtoDate < filterDto.MaxDate )
            filterDto.MaxDate = dtoDate;
            
        }
        
        // on notifie la fin du chargement pour ceux que ça intéresse
        this.endLoadingSource.next( this );
    })
    .fail( (message : any) => { console.error( message ); });

  }

  /**
   * Permet de récupérer la date min des dto chargés en mémoire, 
   * Cela sert à charger les plus anciens.
  
   OBSOLETE 

  private getMaxDate(): Date
  {
    let minDate: Date;
    this.managedDtoDico.forEach(  ( key:number, value: Dto) =>
    {
        if ( value.LastExecution ) // check of null or empty
        {
          let dtoDate = new Date( value.LastExecution );
          if ( ! minDate )
            minDate = dtoDate;
          else 
            if ( minDate > dtoDate )
              minDate = dtoDate;
        }
    } );
    return minDate;
  }
 */

  /**
   * Rafraichissement des données d'un DTO, elle récupère les données complètes du DTO,
   * également les SourceObject et DestinationObject qui ne sont pas récupérés par la fonction loadFromHistory.
   */
  refreshDto( dto: Dto ): void
  {
    console.log( "Demande de rafraichissement du dto " + dto.Id );
    this.historyProxy.invoke('refreshDto', dto.Id ).done( (receivedDto : any) =>
    {
      // tous les champs du dto sont écrasés, 
      jQuery.extend( dto, receivedDto );

      if ( dto.SourceObject == null )
        dto.SourceObject = "";

      if ( dto.DestinationObject == null )
        dto.DestinationObject = "";

    } );
    
  } 

  applyNewFilter( filterDto : FilterDto ) : void
  {
    // pas d'application si filtre équivalent
    if( filterDto.SourceObjectId == this.filterForDtos.SourceObjectId)
      return;

    this.filterForDtos = filterDto;

    if ( filterDto.SourceObjectId )
    {
      // tous les dtos ne répondant pas au filtre sont retirés de la mémoire
      this.managedDtoDico.values().filter(  dto =>  dto.SourceObjectId.indexOf( filterDto.SourceObjectId ) == -1 )
        .forEach( dto => this.managedDtoDico.remove( dto.Id ) );
    }
    
  }

  /**
   * Retourne la liste des Dtos qui est chargée en mémoire
   */
  getDtoArray() : Dto[]
  {
    return this.managedDtoDico.values();
  }

}// end class ChatService
