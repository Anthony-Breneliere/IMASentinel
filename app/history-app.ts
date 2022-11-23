import { CompHistory } from './compHistory';
import { FilterDto } from './filterDto';
import {HistoryService} from './history.service';
import { Component, ViewChild, AfterViewChecked, HostListener } from '@angular/core';
import { Dto } from './dto';
import { ContextMenuComponent } from 'ngx-contextmenu'
import { Search } from './search'

declare var require: any;
var format = require('xml-formatter');

@Component({
    moduleId: module.id,
    selector: 'history-app',
    template: `
<!-- le tabindex est une astuce pour permettre au div d'avoir le focus, et donc de pouvoir
recevoir des keyevents. 

historydiv.focus permet de recevoir les événement de touche de clavier.
-->

<div #historydiv tabindex="0" class="app_component" (mouseover)="historydiv.focus()" (keyup)="onKey( $event )">

    <history  
        (scroll)="onScroll($event)"
        (dtoHighlighted)="displayDto( $event )" >
    </history>

    <div class="vertical-division" *ngIf="displayedDto">

        <div id="top" class="gradient"></div>

        <div class="source" [contextMenu]="sourceMenu" [contextMenuSubject]="displayedDto">{{displayedDto?.SourceObject}}</div>

        <div id="bottom" class="gradient"></div>

        <div  class="destination" [contextMenu]="destMenu" [contextMenuSubject]="displayedDto">{{displayedDto?.DestinationObject}}</div>

    </div>

</div>

<context-menu #sourceMenu>
    <ng-template [visible]="whatSourceDataType() == 'xml'" contextMenuItem let-item (execute)="formatSource()">
        Formatter la source
    </ng-template>
</context-menu>

<context-menu #destMenu>
    <ng-template [visible]="whatDestDataType() == 'xml'" contextMenuItem let-item (execute)="formatDest()">
        Formatter la destination
    </ng-template>
</context-menu>

<search #searchForm (close)="onCloseSearch()" (search)="history.filterResults($event)" *ngIf="searchFormVisible"></search>
`,
    styleUrls: ['./history-app.css']

})
export class HistoryApp implements AfterViewChecked {

    public displayedDto : Dto;
    public searchFormVisible : Boolean;
    public waitForDtoListUpdate : boolean = false;
    
    @ViewChild(Search)
    searchForm : Search;

    @ViewChild(CompHistory)
    history : CompHistory;

    waitingKeys: string;

    constructor(
        private historyService: HistoryService )
    {
    }

    ngAfterViewChecked() : void
    {
        // si un existe une touche en attente d'etre envoyée dans la feneêtre de recherche alors on l'nvoie
        if ( this.searchForm  && this.waitingKeys )
        {
            this.searchForm.focusInput( this.waitingKeys );
            this.waitingKeys = undefined;
        }
    }

    public onScrollGradient( event : Event ) : void
    {
        console.log( event ); 
    }

    public formatSource() : void
    {
        let unformatted = this.displayedDto.SourceObject;
        try{
            let formatted = <string> format(unformatted);
            formatted = formatted.replace("\n", "\<br /\>");
            console.log( formatted );
            
            this.displayedDto.SourceObject = formatted; 
        } catch(e) { console.log(e); }
        
    }

    public formatDest() : void
    {
        let unformatted = this.displayedDto.DestinationObject;
        let formatted = (<string> format(unformatted)).replace("\n", '<br />');
        this.displayedDto.DestinationObject = formatted;
    }

    public whatDestDataType() : string
    {
        if ( this.displayedDto )
            return this.whatDataType( this.displayedDto.DestinationObject );
        return null;
    }

    public whatSourceDataType() : string
    {
        if ( this.displayedDto )
            return this.whatDataType( this.displayedDto.SourceObject );
        return null;
    }

    private whatDataType( data: string ) : string
    {
        if ( ! data )
            return null;

        if ( data.startsWith("<") )
            return "xml";

        if ( data.startsWith("{") )
            return "json";

        return null;
    }
    // private get sourceObjectFlow() : string
    // {
    //     // pas de dto à sélectionner
    //     if ( this.displayedDto == null )
    //         return "";

    //     if ( this.displayedDto.SourceObject == null )
    //         // on demande au service d'historique de récupérer le flux source
    //         this.historyService.refreshDto( this.displayedDto );

    //     return this.displayedDto.SourceObject;
    // }

    // private get destinationObjectFlow() : string
    // {
    //     // pas de dto à sélectionner
    //     if ( this.displayedDto == null )
    //         return "";

    //     if ( this.displayedDto.DestinationObject == null )
    //         // on demande au service d'historique de récupérer le flux destination
    //         this.historyService.refreshDto( this.displayedDto );

    //     return this.displayedDto.DestinationObject;
    // }

    public displayDto( event : any ) : void
    {
        this.displayedDto = event;
    }


    private  letterNumber = /^[0-9a-zA-Z]+$/;

    public onKey( event : KeyboardEvent ) : void
    {
        console.log( event.keyCode );

        if ( event.keyCode == 27 )
        {
            if ( this.searchFormVisible )
                this.searchFormVisible = false;
            else if ( this.displayedDto)
                this.displayedDto = null;
            else
                this.history.unselect();
        }
        else
        {
            if ( event.key && event.key.length == 1 && event.key.match(this.letterNumber) )
            {
                this.searchFormVisible = true;
                if ( ! this.waitingKeys )
                    this.waitingKeys = "";
                this.waitingKeys += event.key;
            }
        }
    }

    /**
     * Appelée lors de la fermeture de la recherche, seule ce composant peut désactiver l'affichage du
     * composant recherche.
     */
    public onCloseSearch() : void
    {
        this.searchFormVisible = false;
    }

    /**
     * Le module écoute les redimensionnements de la fenêtre, pour redimensionner les colonnes
     * @param event
     */
    @HostListener('window:resize', ['$event'])
    public onResize( event ) : void
    {
        this.history.resetNaturalWidths();
    }

    /**
     * Apelée à chaque fois qu'on scroll la liste de l'historique. Si on scroll en bas alors on charge2
     * de nouveaux DTOs avec le filtre qui a été défini par le composant de recherche.
     * 
     * @param event on s'en fiche
     */
    public onScroll( event : any ) : void
    {
        let histoElem : Element = <Element> event.target;

        // les largeurs de colonnes sont resettées
        this.history.resetColWidths();

        // on vérifie si la barre de scroll est en bas (on va dire grossomodo dans les 10% en bas)
        if ( histoElem.scrollHeight * 0.92 < histoElem.scrollTop + histoElem.scrollWidth )
        {
            this.history.downloadMoreDtos();
        }
        else
        {
           // console.log (histoElem.scrollHeight + " " histoElem.scrollTop + " " + histoElem.scrollWidth )
        }
    }

}
