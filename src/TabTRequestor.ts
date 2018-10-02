import { Client, createClientAsync } from 'soap';
import { GetClubsRequest } from './models/GetClubsRequest';
import { GetClubsResponse } from './models/GetClubsResponse';
import { GetClubTeamsRequest } from './models/GetClubTeamsRequest';
import { GetClubTeamsResponse } from './models/GetClubTeamsResponse';
import { GetDivisionRankingRequest } from './models/GetDivisionRankingRequest';
import { GetDivisionRankingResponse } from './models/GetDivisionRankingResponse';
import { GetDivisionsRequest } from './models/GetDivisionsRequest';
import { GetDivisionsResponse } from './models/GetDivisionsResponse';
import { GetMatchesRequest } from './models/GetMatchesRequest';
import { GetMatchesResponse } from './models/GetMatchesResponse';
import { GetMembersRequest } from './models/GetMembersRequest';
import { GetMembersResponse } from './models/GetMembersResponse';
import { GetSeasonsResponse } from './models/GetSeasonsResponse';
import { GetTournamentsRequest } from './models/GetTournamentsRequest';
import { GetTournamentsResponse } from './models/GetTournamentsResponse';
import { IRequest } from './models/IRequest';
import { TestRequest } from './models/TestRequest';
import { TestResponse } from './models/TestResponse';
import { TournamentRegister } from './models/TournamentRegister';
import { TournamentRegisterResponse } from './models/TournamentRegisterResponse';

export class TabTRequestor {
  public stub: string = 'https://resultats.aftt.be/api/?wsdl';

  public getSeasons(): Promise<GetSeasonsResponse> {
    return this.callOperation('GetSeasons', {} as IRequest);
  }

  public getClubTeams(args: GetClubTeamsRequest): Promise<GetClubTeamsResponse> {
    return this.callOperation('GetClubTeams', args);
  }

  public getDivisionRanking(args: GetDivisionRankingRequest): Promise<GetDivisionRankingResponse> {
    return this.callOperation('GetDivisionRanking', args);
  }

  public getMatches(args: GetMatchesRequest): Promise<GetMatchesResponse> {
    return this.callOperation('GetMatches', args);
  }

  public getMembers(args: GetMembersRequest): Promise<GetMembersResponse> {
    return this.callOperation('GetMembers', args);
  }

  public getClubs(args: GetClubsRequest): Promise<GetClubsResponse> {
    return this.callOperation('GetClubs', args);
  }

  public getDivisions(args: GetDivisionsRequest): Promise<GetDivisionsResponse> {
    return this.callOperation('GetDivisions', args);
  }

  public getTournaments(args: GetTournamentsRequest): Promise<GetTournamentsResponse> {
    return this.callOperation('GetTournaments', args);
  }

  public registerTournament(args: TournamentRegister): Promise<TournamentRegisterResponse> {
    return this.callOperation('TournamentRegister', args);
  }

  public testRequest(args: TestRequest): Promise<TestResponse> {
    return this.callOperation('Test', args);
  }

  private createClient(): Promise<Client> {
    return createClientAsync(this.stub);
  }

  private callOperation(operationToExecute: string, args: IRequest): Promise<any> {
    return this.createClient()
      .then((client: Client) => {
        // @ts-ignore
        return client[`${operationToExecute}Async`](args);
      })
      .then((result: any) => Promise.resolve(result[0]));
    ;
  }


}
