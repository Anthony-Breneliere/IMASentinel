import { NgModule }      from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpModule }    from '@angular/http';
import { FormsModule, ReactiveFormsModule }   from '@angular/forms';

import { HistoryApp }  from './history-app';
import { HistoryService } from './history.service';
import { ContextMenuModule } from 'ngx-contextmenu';

import { CompDto } from './compDto'
import { CompHistory } from './compHistory'
import { Search } from './search'

import { DatexPipe } from "./pipeDateFormat";
import { SortHistoryPipe } from "./pipeSortHistory";
import { DumpHistoryPipe } from "./pipeDumpHistory";
import { FilterHistoryPipe } from "./pipeFilterHistory";


@NgModule({
  imports: [ BrowserModule, ContextMenuModule, HttpModule, FormsModule ],
  declarations: [ Search, HistoryApp, CompDto, CompHistory, SortHistoryPipe, DumpHistoryPipe, DatexPipe, FilterHistoryPipe ],
  bootstrap: [ HistoryApp ],
  providers:  [ HistoryService ]
})
export class AppModule { }
