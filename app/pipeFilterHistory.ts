/**
 * Created by abreneli on 30/08/2017.
 */

import { FilterDto } from './filterDto';
import {Pipe, PipeTransform, Input} from '@angular/core';
import {Dto} from "./dto";
import {CompHistory} from "./compHistory";

@Pipe( {
  name: 'pipeFilterHistory',
  pure: true 
} )
export class FilterHistoryPipe implements PipeTransform
{
  // @Input() name : string;
  
/**
 * Permet de créer une liste filtrée sur le filtreDto passé en paramètre
 * @param dtoList : list des DTO passés en entrée
 * @param dateChange : date pour déclencher le pipe (comme il est pur il ne peut être décl)
 * @param filter : filtre contenant les critères de sélection des DTOs
 */
  transform( dtoList : Dto[], dateChange: Number, filter: FilterDto ): Dto[]
  {
    console.log( `Filtre de la liste: avant: ${dtoList.length}.` );

    // console.log( "tri de la liste, nb d'éléments = " + dtoList.length)
    let ascending : boolean = true;

    let returnList : Dto[] = dtoList;

    if ( filter )
      returnList = dtoList.filter( dto => {

        // on ne retient que les DTO cont l'iD contient l'id du filtre
        return (! filter.SourceObjectId || filter.SourceObjectId.length <= 3 || dto.SourceObjectId.indexOf(filter.SourceObjectId) != -1)
          && ( ! filter.State || dto.State == filter.State)
        // ajouter les filtre ici:  
        ;

      });

    console.log( `Filtre de la liste: après: ${returnList.length}.` );

    return returnList;
  }
}
