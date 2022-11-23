/**
 * Created by abreneli on 23/09/2016.
 */

import {Pipe, PipeTransform, Input} from '@angular/core';
import {Dto} from "./dto";
import {CompHistory} from "./compHistory";

@Pipe( {
  name: 'sortHistory',
  pure: true // le passage à false fait ramer énormément l'appli, mais permettait de garder la liste constemment triée
    // l'astuce pour garder le pipe pure a été d'ajouter en paramètre le dernier DTO dont la date a changé. Ainsi, si on change 
    // ce dto dans le composant d'historique, alors cela déclenche une réévaluation du pipe.
} )
export class SortHistoryPipe implements PipeTransform
{
  // @Input() name : string;
  
  /**
   * Permet de créer une liste triée sur la propriété passée en paramètre
   * @param dtoList
   * @param sortOption : options de tri, par défaut -LastExecution
   * @param lastDateUpdated : option non utilisée dans le code, elle permet juste à angular de redéclencher de tri quand sa valeur change
  */
  transform( dtoList : Dto[], sortOption: string, lastDateUpdated : Number): Dto[]
  {
    console.log( "Tri de la liste, nb d'éléments = " + dtoList.length)
    let ascending : boolean = true;

    if ( sortOption == null || sortOption.length <= 1 )
      return dtoList;

    if (sortOption[0] == '+' )
      ascending = true;
    else if (sortOption[0] == '-' )
      ascending = false;

    let property = sortOption.substr( 1, sortOption.length - 1 );

    let returnList = dtoList.sort( ( dto1, dto2) =>
    {
      if ( dto1[ property ] < dto2[ property ] )
        return ascending == true ? -1 : 1;

      if ( dto1[ property ] > dto2[ property ] )
        return ascending == true ? 1 : -1;

      return 0;
    });

    return returnList;
  }
}

