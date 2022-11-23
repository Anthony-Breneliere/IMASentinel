/**
 * Created by abreneli on 20/09/2016.
 */
import { Component, EventEmitter, ElementRef, Input, Output, QueryList, ViewChild, ViewChildren, AfterViewInit } from '@angular/core';
import {Dto, DtoState} from "./dto";


@Component( {
  moduleId: module.id,
  selector: 'compDto',
  template: `
<td #dtoId id="dtoId">{{dto.Id}}</td>
<td #lastexecution id="lastexecution">{{dto.LastExecution | datex:'YYYY-MM-DD HH:mm:ss'}}</td>
<td #dtostate id="dtostate">{{State()}}</td>
<td #actiontype id="actiontype">{{dto.ActionType}}</td>
<td #dataSource id="dataSource">{{dto.DataSource}}</td>
<td #sourceobjecttype id="sourceobjecttype">{{dto.SourceObjectType}}:{{dto.DestObjectType}} </td>
<td #sourceobjectid id="sourceobjectid">{{dto.SourceObjectId}}</td>
<!--<td id="destobjectid">{{dto.DestObjectId}}</td>-->
<td #message id="message">{{dto.Message}}</td>
`,
  styleUrls: ['./compDto.css']

  })

export class CompDto implements AfterViewInit
{
  @Input() dto : Dto;
 // @Output() newColWidths = new EventEmitter<CompDto>();

  @ViewChildren("dtoId, lastexecution, dtostate, actiontype, dataSource, sourceobjecttype, sourceobjectid" ) cells: QueryList<ElementRef>;
  @ViewChild("message" ) messageCell: ElementRef;

  constructor( private el : ElementRef ) {}

  // on garde en mémoire les largeurs naturelles des éléments:
  private naturalWidths : number[];

  public State() : string {

    // console.log( DtoState[tdis.dto.State] );
    return DtoState[this.dto.State];

  }

  public get colWidths() : number[] 
  {
     return this.cells.map( c => c.nativeElement.offsetWidth );
  }

  public get colNaturalWidths() : number[] 
  {
     return this.naturalWidths;
  }

  public resetNaturalWidths()
  {
    this.naturalWidths = null;

    this.cells.forEach( ( c, i ) => { c.nativeElement.style.width = "auto" } );

    this.naturalWidths = this.colWidths;
  }

  public set colWidths( newWidths : number[] ) 
  {
     this.cells.forEach( ( c, i ) => { c.nativeElement.style.width = newWidths[i] + "px" } );
  }

  public ngAfterViewInit()
  {
    // on garde mémorise les largeurs naturelles des éléments qui sont définies au moment de l'initialisation du composant
    // on s'assure que cela n'est fait qu'une fois en cas de réinitilisation
    if ( ! this.naturalWidths )
      this.naturalWidths = this.colWidths;
  }

  public get offsetTop() : number
  {
    return (<HTMLElement> this.el.nativeElement).offsetTop;
  }

  public get offsetBottom() : number
  {
    let elem = <HTMLElement> this.el.nativeElement;
    return elem.offsetTop + elem.offsetHeight;
  }
}


