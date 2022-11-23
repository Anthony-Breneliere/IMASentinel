
import { Component, ViewChild, AfterViewChecked, ElementRef, EventEmitter, Output } from '@angular/core'
import { HistoryService } from './history.service'
import { NgForm, NgModel }   from '@angular/forms';
import { FilterDto } from './filterDto';
import { DtoState } from './dto';


@Component({
    moduleId: module.id,
    selector: 'search',
    template: `
<form #searchForm="ngForm" class="overlap search" (keyup.esc)="exit()" (ngSubmit)="commit()" >

    <div>
        <label>Recherche Id:</label><br/>
        <input #searchIdInput
            (key.enter)="commit()" (blur)="commit()"
            [(ngModel)]="filterDto.SourceObjectId"
            name="searchId" type="text" ><br/>
    </div>

    <div>
        <label>Status:</label><br/>

        <select #searchByStatus [(ngModel)]="filterDto.State" (ngModelChange)="commit()" name="searchStatus">
            <option [ngValue]="i" *ngFor="let state of DtoStateValues; let i = index" class="option">{{DtoState[i]}}</option>
        </select>
    </div>

    <div>
        <label>Type d'action:</label><br/>

        <select [(ngModel)]="filterDto.ActionType" (ngModelChange)="commit()" name="actionType">
            <option [ngValue]="actionType" *ngFor="let actionType of ActionTypeValues; let i = index" class="option">{{ActionType[i]}}</option>
        </select>
    </div>

    <div>
        <label>Type de data source:</label><br/>

        <select [(ngModel)]="filterDto.DataSource" (ngModelCrhange)="commit()" name="actionType">
            <option [ngValue]="dataSource" *ngFor="let dataSource of dataSources" class="option">{{dataSource}}</option>
        </select>
    </div>


</form>`,
    styleUrls: ['./search.css']
})

export class Search implements AfterViewChecked
{
    public filterDto : FilterDto = new FilterDto();
    private focusAndTypeKeys: string;

    // liste des enums
    private DtoState = DtoState;
    public DtoStateValues = Object.values(DtoState).filter( (e : any) => typeof( e ) == "number" );

    // liste des enums
    private ActionType = ActionType;
    public ActionTypeValues = Object.values(ActionType);

    constructor( private _historyService : HistoryService ) {}

    get dataSources() : string[] { return [""].concat( this._historyService.dataSourceList); }

    // les nouvelles recherches sont retournées au composant parent via cet event
    @Output() search = new EventEmitter<FilterDto>();
    @Output() close = new EventEmitter();

    // on a beson d'une référence sur la recherche pour faire un focus de dessus
    @ViewChild("searchIdInput") public searchIdInput: ElementRef;

    // quand le composant n'existe pas encore dans le DOM, une première lettre a été tapée, on la met dans le champ searchId
    public focusInput( keys : string )
    {
        if ( ! this.focusAndTypeKeys )
            this.focusAndTypeKeys = "";
        this.focusAndTypeKeys += keys;
    }

    // commiter le filtre
    public commit() : void
    {
        var hasSourceId = this.filterDto.SourceObjectId && this.filterDto.SourceObjectId.length > 3;
        var hasState = this.filterDto.State;

        // n'émettre un événement que si les champs saisis doivent déclencher une mise à jour de la recherche
        if ( hasSourceId || hasState )
        {
            console.log( "Emission d'une recherche");

            // on crée une nouvelle copie à chaque émission pour déclencher les mises à jour dans l'IHM
            let newFilterDto = Object.assign( {}, this.filterDto );

            this.search.emit ( newFilterDto );
        }
        else
        {
            this.search.emit ( null );
        }
    }

    // exit du filtre
    public exit() : void
    {
        this.close.emit(null);
    }

    // Le focus s'effectue une fois la vue contant le champ searchId cré
    ngAfterViewChecked()
    {
        if ( this.focusAndTypeKeys )
        {
            this.searchIdInput.nativeElement.value = this.focusAndTypeKeys;
            this.searchIdInput.nativeElement.focus();
            this.focusAndTypeKeys = null;
        }
    }

    public onKey( event : KeyboardEvent ) : void
    {
        console.log( event.keyCode );

        if ( event.keyCode == 27 )
        {
             console.log( "exit search" );
             this.exit();
        }
    }
}
