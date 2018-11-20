import * as _ from 'lodash';
import * as fetch from 'node-fetch';

import { Client, createClientAsync } from 'soap';
import { Config } from './config';
import {
  ClubEntry,
  DivisionEntry,
  GetClubsRequest,
  GetClubTeamsRequest,
  GetDivisionRankingRequest,
  GetDivisionsRequest,
  GetMatchesRequest,
  GetMembersRequest,
  GetSeasonsResponse,
  GetTournamentsRequest,
  IRequest,
  MemberEntry,
  RankingEntry,
  TeamEntry,
  TeamMatchEntry,
  TestRequest,
  TestResponse, TournamentEntry,
  TournamentRegister,
  TournamentRegisterResponse
} from './tabt-models';


export class TabTRequestor {
  public stub: string = 'https://resultats.aftt.be/api/?wsdl';

  public getSeasons(): Promise<GetSeasonsResponse> {
    return this.callUrl('/seasons');

    //return this.callOperation("GetSeasons", {} as IRequest);
  }

  public getClubTeams(club: string, args: GetClubTeamsRequest): Promise<TeamEntry[]> {
    return this.callUrl(`/clubs/${club}/teams`, args);

    //return this.callOperation("GetClubTeams", args);
  }

  public getDivisionRanking(divisionId: string, args: GetDivisionRankingRequest): Promise<RankingEntry[]> {
    return this.callUrl(`/divisions/${divisionId}/ranking`, args);

    //return this.callOperation("GetDivisionRanking", args);
  }

  public getMatches(args: GetMatchesRequest): Promise<TeamMatchEntry[]> {
    return this.callUrl('/matchs', args);

    //return this.callOperation("GetMatches", args);
  }

  public getMembers(args: GetMembersRequest): Promise<MemberEntry[]> {
    return this.callUrl('/membres', args);

    //return this.callOperation('GetMembers', args);
  }

  public getClubs(args: GetClubsRequest): Promise<ClubEntry[]> {
    return this.callUrl('/clubs', args);

    //return this.callOperation('GetClubs', args);
  }

  public getDivisions(args: GetDivisionsRequest): Promise<DivisionEntry[]> {
    return this.callUrl('/divisions', args);

    //return this.callOperation('GetDivisions', args);
  }

  public getTournaments(args: GetTournamentsRequest): Promise<TournamentEntry[]> {
    return this.callUrl('/tournaments', args);

    //return this.callOperation('GetTournaments', args);
  }

  public getTournament(tournamentId: string, args: GetTournamentsRequest): Promise<TournamentEntry[]> {
    return this.callUrl(`/tournaments/${tournamentId}`, args);

    //return this.callOperation('GetTournaments', args);
  }

  public registerTournament(args: TournamentRegister): Promise<TournamentRegisterResponse> {
    return this.callOperation('TournamentRegister', args);
  }

  public testRequest(args: TestRequest): Promise<TestResponse> {
    return this.callUrl('/test', args);
  }

  private createClient(): Promise<Client> {
    return createClientAsync(this.stub);
  }

  private async callUrl(url: string, args?: IRequest, maxRetry: number = 5): Promise<any> {

    const argmentifiedUrl = url.split('/').map((part: string) => {
      if (part.charAt(0) === ':') {
        let expectedParam: string = _.chain(part)
          .replace(':', '')
          .startCase()
          .replace(new RegExp(' ', 'g'), '')
          .value();
        const isOptional: boolean = expectedParam.charAt(expectedParam.length) === '?';

        if (isOptional) {
          expectedParam = expectedParam.slice(0, -1);
        }

        const valueParam = _.get(args, expectedParam, null);

        if (valueParam !== null) {
          _.omit(args, expectedParam);

          return valueParam;
        } else if (isOptional) {
          return '';
        } else {
          throw new Error('Parameter not found in arguments.');
        }
      }

      return part;
    }).join('/');

    const queryString = _.chain(args)
      .toPairsIn()
      .map(([key, value]: [string, string]) => `${_.camelCase(encodeURIComponent(key))}=${encodeURIComponent(value)}`)
      .join('&')
      .value();

    const urlToCall = `http://localhost:5000/api${argmentifiedUrl}?${queryString}`;

    return fetch(urlToCall, {
      headers: {
        'x-frenoy-login': 'floca',
        'x-frenoy-password': 'fca-1995',
        'x-frenoy-database': 'aftt'
      }
    }).then(async (res: any) => {
      if (res.status === 200) {
        return res.json()
      } else if (maxRetry > 0) {
        const waitTime = (6 - maxRetry) * 20000;
        Config.logger.debug(res);
        Config.logger.info(`Making a pause for ${waitTime}ms...`);
        await Config.timeout(waitTime);

        return this.callUrl(url, args, maxRetry - 1);
      } else {
        throw new Error(await res.text())
      }
    });


  }

  private callOperation(operationToExecute: string, args: IRequest): Promise<any> {
    return this.createClient()
      .then((client: Client) => {
        // @ts-ignore
        return client[`${operationToExecute}Async`](args);
      })
      .then((result: any) => Promise.resolve(result[0]));
  }


}
