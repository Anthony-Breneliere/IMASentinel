/**
 * Created by abreneli on 23/09/2016.
 */

import {Pipe, PipeTransform, Input, Inject, forwardRef} from '@angular/core';
import {Dto} from "./dto";
import {CompHistory} from "./compHistory";

// ce pipe sert à dumper le résultat de la liste de dtos qu'on reçoit en paramètre dans le composant compHistory
@Pipe( {
  name: 'pipeDumpHistory',
  pure: true // le passage à false fait ramer énormément l'appli, mais permettait de garder la liste constamment triée
    // l'astuce pour garder le pipe pure a été d'ajouter en paramètre le dernier DTO dont la date a changé. Ainsi, si on change 
    // ce dto dans le composant d'historique, alors cela déclenche une réévaluation du pipe.
} )
export class DumpHistoryPipe implements PipeTransform
{
  private compHistory : CompHistory;

  constructor(@Inject(forwardRef( () => CompHistory )) compHistory:CompHistory )
  {
    this.compHistory = compHistory;
  }

  /**
   * Permet de dumper une liste triée dans le composant CompHistory passé en paramètre
   * @param dtoList
  */
  transform( dtoList : Dto[] ): Dto[]
  {
    this.compHistory.dtoSortedList = dtoList;

    return dtoList;
  }
}

