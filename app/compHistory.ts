import { filter } from 'rxjs/operator/filter';
import { Dto, DtoState } from './dto';
import { HistoryService } from './history.service';
import { CompDto } from './compDto'
import {
    AfterViewChecked,
    ChangeDetectorRef,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    Output,
    QueryList,
    ViewChild,
    ViewChildren
} from '@angular/core';
import { ContextMenuComponent } from 'ngx-contextmenu'
import { FilterDto } from './filterDto'
import { FilterHistoryPipe } from './pipeFilterHistory'
import * as Collections from 'typescript-collections';

const darkerHourLap : number = 24;

// on définit une luminosité max à 70
const maxLigness : number = 70;

// on définit une luminosité max à 20
const minLigness : number = 20;

const dtoHue = {
  "Success": 123,
  "Error": 53,
  "Warning": 83,
  "Waiting": 151,
  "Processing": 170,
  "Ignored": 123
};

const dtoSaturation = {
  "Success": 80,
  "Error": 80,
  "Warning": 80,
  "Waiting": 80,
  "Processing": 80,
  "Ignored": 10
};

const lastSelectedColor = "hsl(12, 100%, 87%)";
const selectedColor = "hsl(64, 100%, 87%)";

  // (mouseover)="onMouseOver( $event, dto )"
  // (mouseout)="onMouseOut( $event, dto )"

@Component ({
    moduleId: module.id,
    selector: 'history',
    template: `

<table>
<tr
  *ngFor="let dto of ( dtos | pipeFilterHistory: lastDateUpdate:filterDto | sortHistory: sortArg:lastDateUpdate | pipeDumpHistory)"
  [style.color]="fontColor( dto )"
  [class.selected]="dtoListSelected.contains(dto)"
  (click)="onSelect( dto, $event )"
  [contextMenu]="dtoMenu"
  [contextMenuSubject]="dto" >
  <compDto
    [dto]="dto"
    (newColWidths)="setNewColWidths( $event )"
  ></compDto>
</tr>
</table>

<context-menu #dtoMenu>

  <ng-template *ngIf="dtoListSelected.size() == 0" contextMenuItem let-item (execute)="retryDto($event.item?.Id, false)">
    Relancer le flux {{item?.Id}} 
  </ng-template>
  <ng-template *ngIf="dtoListSelected.size() == 0" contextMenuItem let-item (execute)="retryDto($event.item?.Id, true)">
    Relancer le flux {{item?.Id}} a partir de la source
  </ng-template>
  <ng-template *ngIf="dtoListSelected.size() > 0" contextMenuItem let-item (execute)="retrySelectedDtos(false)">
    Relancer les flux 
  </ng-template>
  <ng-template *ngIf="dtoListSelected.size() > 0" contextMenuItem let-item (execute)="retrySelectedDtos(true)">
    Relancer les flux a partir de la source
  </ng-template>
  <ng-template *ngIf="dtoListSelected.size() > 0" contextMenuItem let-item (execute)="unselect()">
    Désélectionner
  </ng-template>

</context-menu>
`,
  styleUrls: ['./compHistory.css']
})
 
export class CompHistory implements AfterViewChecked
{
  // filtre d'affichage pour les dto: seuls les dtos répondant aux critères définis dans le filtre sont affichés
  @Input() public filterDto: FilterDto;

  @Output() public dtoHighlighted = new EventEmitter<Dto>();

  // événeement envoyé quand la liste des dto a été mise à jour: le nombre dtos dans la liste est  envoyé
  @Output() public updatedList = new EventEmitter<number>();

  @ViewChild(ContextMenuComponent) public dtoMenu: ContextMenuComponent;

  @ViewChildren(CompDto) public compDtos: QueryList<CompDto>;

  // sauvegarde du moment présent qui devient passé
  private dateNow: Date;

  // cet propriété est en entrée de la fonction de tri. Elle permet à la détection du changement de redéclencher automatiquement
  // le tri quand c'est nécessaire: par exemple quand un DTO a changé de date.
  public lastDateUpdate: Number;

  // Propriété de tri d'acchage dans la liste
  public sortField : string = "LastExecution";

  // Sens du tri, par défaut décroissant
  public sortAscending : boolean = false;

  // dto  selected
  public dtoListSelected : Collections.LinkedList<Dto> = new Collections.LinkedList<Dto>();

  // dto  hovering
  private dtoHovering : Dto;
  private afterScrollTimer : any = null;
  private afterResizeTimer : any = null;

  // boolean mis à vrai quand le composant est déjà en train de charger des dtos, suite à un
  // scroll ou à une recherche par exemple
  private currentlyLoadingHistory : boolean = false;
  
  // attente d'une mise à jour d'une liste de DTOs
  public waitForDtoListUpdate : boolean = false;
  
  constructor(
    private historyService: HistoryService,
    private cdRef:ChangeDetectorRef,
    private elRef: ElementRef )
  {
    // on récupère les nouveaux dto
    historyService.newDtos$.subscribe(
      dto => {
        this.addDtoFromHistory(dto);
      });

    // on récupère les changement: c'est pour garder la liste triée correctement
    historyService.updateDto$.subscribe(
      dtoTuple => {
        this.checkDtoChange(dtoTuple);
      });

      // on s'abonne à la fin de chargement des données de l'historique
      historyService.endLoading$.subscribe(
          () => {
            this.currentlyLoadingHistory = false;
            this.lastDateUpdate = Date.now();
          });
  }


  // liste des Dtos, récupérés à partir du servce historyService
  public dtos: Dto[] = [];

  private currentColWidths : number[];
 
  // la liste des dtos triée est maintenue à jour à chaque tri pour la sélection de plages 
  // de DTOs (avec la touche shift)
  private sortedDtos : Dto[] = null;

  get dtoList() { return this.dtos; }
  
  // la liste triée est accédée par le pipe de dump de la liste triée
  public get dtoSortedList() { return this.sortedDtos; }
  public set dtoSortedList( value: Dto[] )
  {
    this.sortedDtos = value;

    this.currentColWidths = null;

    // on previent le parent que la liste triée des DTOs a été mise à jour
    this.onUpdatedDtoList( this.sortedDtos ? this.sortedDtos.length : 0);

    // les éléments chargés peuvent être éventuellement visibles: on recalcule les colonnes
    this.resetColWidths();
  } 


  // ajout d'un dto depuis l'historique
  private addDtoFromHistory(  dto: Dto )
  {
    this.dtos.push(dto);

    // après l'ajout d'un dto, on va resetter les colonnes que si le niveau de scroll est tout en haut:
    var histoScrollTop = (<HTMLElement> this.elRef.nativeElement).scrollTop;
    console.log("History scrolltop:" + histoScrollTop);
    if ( histoScrollTop < 10 )
    {
      this.resetColWidths();
    }
  }

   // ajout d'un dto depuis l'historique
  private checkDtoChange(  dtoTuple: [ Dto, Dto ] )
  {
      var dtoUnchanged = dtoTuple[0];
      var dtoChanged = dtoTuple[1];
      if ( dtoUnchanged['LastExecution'] != dtoChanged['LastExecution'] )
      {
        // la date a changé, on met à jour le paramètre d'entrée du pipe de tri de la liste des DTOs, ce qui va redéclencher le tri
        console.log( "changement de date d'un dTO ! ");
        this.lastDateUpdate = Date.now();

      } // todo: à terme on peut le faire marcher pour le critère en cours de tri et non pour  LastExecution

  }

  // fonction de redémarrage d'un flux
  retryDto( dtoId: number, reloadSourceData : boolean )
  {
    this.historyService.retryOne( dtoId, reloadSourceData );
  }

  // redémarrage d'une liste de flux
  private retrySelectedDtos( reloadSourceData : boolean )
  {
    let listIds: number[] = this.dtoListSelected.toArray().map(( dto : Dto ) => dto.Id);
    this.historyService.retry( listIds, reloadSourceData );
    this.dtoListSelected.clear();
  }
  
  // combinaison du sens et du critère du tri
  get sortArg() {
    return ( this.sortAscending == true  ? "+" : "-" ) + this.sortField;
  }

  private displayFlows( dto2Display : Dto ) : void
  {
      this.dtoHighlighted.emit( dto2Display );

      // on va chercher les flux uniquement si le flux source n'est pas défini:
      if ( dto2Display != null && dto2Display.SourceObject == null)
        this.historyService.refreshDto( dto2Display );
  }
  
  private onSelect( dtoSelected : Dto, $event: MouseEvent ) : void
  {
    let addSelected : boolean = $event.ctrlKey;
    let rangeSelected : boolean = $event.shiftKey;
    let lastSelected : Dto;
    
    if (  this.dtoListSelected && ! this.dtoListSelected.isEmpty() ) 
      lastSelected = this.dtoListSelected.last();

    // cas du click sur un élément sélectionné
    if ( this.dtoListSelected.contains( dtoSelected ) )
    {
      // l'élément est désélectionné sauf si SHIFT est pressé
      if ( ! addSelected )
      {
        this.dtoListSelected.remove(dtoSelected); // on désélectionne
      }
    }
    // cas du click sur un élément NON sélectionné
    else
    {
      // si la touche CTRL ou SHIFT n'est pas pressée on efface tous ceux sélectionnés
      if ( ! addSelected )
      {
        this.dtoListSelected.clear();
      }
      // si la touche shift n'est pas pressée on ne sélectionne que celui qui est cliqué
      if ( ! rangeSelected )
      {
          this.dtoListSelected.add( dtoSelected ); // on sélectionne
      }
      else // SHIFT pressé, on sélectionne la plage à partir du dernier sélectionné, on gère pas la 
      // déselection par le SHIFT car ce n'est pas performant avec la structure dtoListSelected:LinkedList
      {
        // la liste triée/filtrée a été récupérée par le pipeDumpHistory
        let sortedDto = this.sortedDtos;
        let newSelection = new Collections.LinkedList<Dto>();

        let inRange : boolean = false;
        for( let dto of sortedDto )
        {
          if ( dto === lastSelected || dto === dtoSelected )
          {
            inRange = ! inRange;
            newSelection.add( dto );
            if ( ! inRange ) {
              if ( dto === lastSelected )
                // les éléments sélectionnés doivent être ajoutés à partir du dernier
                newSelection.reverse();

              break; // on sort de la sélection: pas la peine de continuer
            }
          }
          else
            if ( inRange )
              newSelection.add( dto );
        }
        // ajout de la nouvelle sélection aux dtos sélectionnés dans l'historique
        newSelection.forEach( (dto: Dto) => { this.dtoListSelected.add( dto ); } );
      }

    }

    this.displayFlows( this.dtoListSelected.last() );  // affichage des flux

  }

  public unselect()
  {
    console.log("Déselection des DTO sélectionnés.")
    this.dtoListSelected.clear();
  }

  /**
   * Récupération de données complémentaires sur le DTO quand on le survole avec la souris.
   * On ne le fait que si on reste dessus un certain temps.
   */
  // private onMouseOver( $event: MouseEvent, dtoSelected : Dto ) : void
  // {
  //   this.dtoHovering = dtoSelected;
      
  //   if ( this.hoverTimer != null )
  //   {
  //     clearTimeout(  this.hoverTimer );
  //     this.hoverTimer = null;
  //   }

  //   this.hoverTimer = setTimeout( () => {

  //     if ( this.dtoHovering === dtoSelected && this.dtoListSelected.size() == 0 )
  //       this.displayFlows( dtoSelected ); // affichage des flux
  //     this.hoverTimer = null;

  //   }, 500);
  // }

  /**
   * Quand le pointeur quitte un DTO:
   * - si le dto affiché est le dto survolé, et qu'un chargement des flux était en attente => alors on annule le chargement
   * - si le dto affiché est le dto survolé, et qu'il n'y a pas de sélection =>  alors on n'affiche rien
   */
  // private onMouseOut( $event: MouseEvent, dtoSelected : Dto ) : void
  // {
  //   if ( this.dtoHovering === dtoSelected )
  //   {
  //     if ( this.hoverTimer != null )
  //     {
  //       clearTimeout(  this.hoverTimer );
  //       this.hoverTimer = null;
  //     }

  //     if ( this.dtoListSelected.size() == 0 )
  //     {
  //       this.displayFlows( null );
  //     }
  //   }

  // }

  /**
   *  couleur calculée à partir de l'ancienneté du flux
   * */ 
  private fontColor( dto : Dto ) : string {

    let color : string;

    if ( this.dtoListSelected.last() === dto )
      return lastSelectedColor;

    if ( this.dtoListSelected.contains( dto ) )
      return selectedColor;

    // date d'exécution du dto
    let dtoDate : Date = new Date( dto.LastExecution );
    // console.log ( dtoDate.getTime() );
    // console.log ( Date.now() );
    // console.log ( new Date().getTime() - dtoDate.getTime() );

    if ( this.dateNow == null )
      this.dateNow = new Date();

    // timeLap =
    //  différence de temps en minutes
    //  différence de temps en milliseconde / 60000
    let timeLap :number = Math.max( 0, ( this.dateNow.getTime() - dtoDate.getTime() ) / 60000 );

    // amplitude en % de luminosité (valeur comprise en 0 et 1 ) =
    //  différence en minutes plafonné plafonné à 24h / nb de minutes par 24h
    //  max( timeLap, 60 * darkerHourLap) / ( 60 * darkerHourLap )
    let diffAmp :number = Math.min( timeLap,  60 * darkerHourLap ) / ( 60 * darkerHourLap );

    // on fait un dégradé non linéaire, courbe de puissance 10 pour privilégier la luminosité sur les derniers
    let puissance : number = 5;
    let lightnessAmp :number = Math.round( ( maxLigness - minLigness ) * ( 1 - Math.pow( 1 - diffAmp, puissance) ) );
    let lighness = maxLigness - lightnessAmp;
      
    if ( dto.State === DtoState.Ignored)
      lighness = minLigness;

    // la teinte et la saturation est paramétrée dans les enums de ce fichier en entête:
    let hue : number = dtoHue[ DtoState[dto.State] ];
    let saturation : number = dtoSaturation[ DtoState[dto.State] ];

    color =  "hsl( " + hue + ", " + saturation + "%, " + lighness + "%)";

    return color;
  }

  // pour le changement des couleurs au fil du temps, 
  // il est nécessaire de mettre à jour la date courante à chaque cycle de mise à jour du composant
  // on le fait donc la fonction de hooking ngAfterViewChecked
  ngAfterViewChecked()
  {
    this.dateNow = new Date();
    this.cdRef.detectChanges();
  }


    /**
     *  on filtre les dtos avec le filtre passé en paramètre
     * @param filterDto les critères de recherche
     */
    public filterResults(filterDto : FilterDto) : void
    {
        // affichage de log
        if ( filterDto == null )
        {
            console.log("Suppression du filtre de recherche.");
        }    
        else
        {
            console.log("Nouveau filtre à appliquer sur les résultats:");
            console.log( filterDto );
        }

        // à la prochaine mise à jour de la liste des DTO
        this.waitForDtoListUpdate = true;

        // on applique le filtre venant du composant de recherche, celui-ci sera utilisé par la fonction
        // de recherche dans l'historique
        this.filterDto = filterDto;
    }

    /**
     * Appelée quand la liste des DTOs affichée dans le composant ( et filtrée par celui-ci ) a changé.
     * Le composant history envoie le nombre de DTOs affichés, et si on estime qu'il y en a pas assez (<100)
     * alors on en charge d'autres
     * 
     * @param dtoNumber: nom de dtos affichés à l'écran
     */
    public onUpdatedDtoList(dtoNumber: number)
    {
        // si on attent une liste de DTO mise à jour pour savoir si on en charge des nouveaus avec filtre
        // et qu'en plus il y en a pas assez alors on en charge d'autres
        if ( this.waitForDtoListUpdate && dtoNumber < 100)
        {
            this.currentlyLoadingHistory = true;
            this.historyService.loadFromHistory( this.filterDto );
        }
    }

    /**
     * Appelé lorsque le composant parent a effectué un scroll vers le base
     */
    public downloadMoreDtos() : void
    {
        // on déclenche le chargement de données depuis l'historique
        if ( ! this.currentlyLoadingHistory )
        {
            this.currentlyLoadingHistory = true;
            this.historyService.loadFromHistory( this.filterDto );
        }
    }

    /**
     * réinitialise les largeurs naturelles de tous les éléments de texte
     */
    public resetNaturalWidths()
    {
      // on set un timer déclenchant le redimensionnement des colonnes
      if ( this.afterResizeTimer )
        clearTimeout( this.afterResizeTimer );

      this.afterResizeTimer = setTimeout( () => {

        this.afterResizeTimer = null;

        let allDtos = this.compDtos.toArray();
        if (! allDtos )
          return;
        console.log("Reinitialisation des largeurs de tous les dtos, nombre=" + allDtos.length);
        for( let i = 0; i < allDtos.length; ++i)
        {
          let compDtoToReset = allDtos[i];
          if( compDtoToReset)
            compDtoToReset.resetNaturalWidths();
        }
  
        // une fois que les largeurs naturelles sont redéfinies on réajuste les colonnes.
        this.resetColWidths();

      }, 50);
    }

    public resetColWidths() : void
    {
      // on set un timer déclenchant le redimensionnement des colonnes
      if ( this.afterScrollTimer )
        clearTimeout( this.afterScrollTimer );

      this.afterScrollTimer = setTimeout( () => {

        this.afterScrollTimer = null;
        this.adjustColumnsSizes();

      }, 50);
    }

    private adjustColumnsSizes() : void
    {
      let historyElem = <Element> (this.elRef.nativeElement);

      let scrollTop = historyElem.scrollTop;
      let scrollBottom = historyElem.scrollTop + historyElem.clientHeight;

      console.log("Récupération des dtos (nombre=" + this.compDtos.length + ") dont la position Y est entre " + scrollTop + " et " + scrollBottom);

      // on ne prend que les dtos qui sont visibles
      let visibleDtos = this.compDtos.filter( d => d.offsetBottom >= scrollTop && d.offsetTop <= scrollBottom);
      console.log("Nombre de dtos visibles:" + visibleDtos.length);

      // on calcule la largeur idéales des colonnes
      // pour ce faire on prend la largeur maximale naturelle de chaque élément dans la colonne
      // la largeur naturelle est la largeur définie automatiquement quand le compDto est initialisé
      for( let i = 0; i < visibleDtos.length; ++i)
      {
        let colNaturalWidths = visibleDtos[i].colNaturalWidths;
        
        if ( i == 0 )
        {
          this.currentColWidths = colNaturalWidths; 
          continue;
        }
        else
        {
          let widenAllDtos : boolean = false;
          let widenSenderDto : boolean = false;
          
          for( let i = 0; i < colNaturalWidths.length; ++i)
          {
            if ( this.currentColWidths[i] < colNaturalWidths[i] )
              this.currentColWidths[i] = colNaturalWidths[i];
          }
        }
      }

      console.log("Nouvelles largeurs colonnes définies: ");
      console.log(this.currentColWidths);

      // on définit les largeurs des éléments de chaque dto avec les largeurs idéales
      // elles sont identiques pour tous les dtos visibles
      for( let i = 0; i < visibleDtos.length; ++i)
      {
        visibleDtos[i].colWidths = this.currentColWidths;
      }
    }

}
