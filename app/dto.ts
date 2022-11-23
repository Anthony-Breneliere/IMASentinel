/**
 * Created by abreneli on 22/09/2016.
 */

export enum DtoState
{
  Waiting = 1,
  Processing,
  Warning,
  Error,
  Success,
  Ignored
}

export class Dto
{
  Id: number;
  ActionType: string;
  ApiVersion: string;
  DataSource: string;
  DestObjectId: string;
  DestinationObject: string;
  DestObjectType: string;
  LastExecution: string;
  Message: string;
  SourceObject: string;
  SourceObjectId: string;
  SourceObjectType: string;
  State: DtoState
}
