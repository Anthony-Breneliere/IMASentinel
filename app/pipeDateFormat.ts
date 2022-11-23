import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment';

@Pipe({
    name: 'datex'
})

export class DatexPipe implements PipeTransform {
    transform(value: string, format: string = ""): string {
        if (!value || value==="") return "";

        var momentFunc = (moment as any).default ? (moment as any).default : moment;
        var newFormat = momentFunc(value).format( format );
        
        return newFormat;
    }
}