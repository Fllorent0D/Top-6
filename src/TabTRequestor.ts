import * as _ from 'lodash';
import * as fetch from 'node-fetch';

import * as dateFormat from 'dateformat';
import * as randomIpv4 from 'random-ipv4';
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
  TestResponse,
  TournamentEntry,
  TournamentRegister,
  TournamentRegisterResponse
} from './tabt-models';

export class TabTRequestor {
  public stub: string = 'https://resultats.aftt.be/api/?wsdl';
  private currentIp: string;

  constructor() {
    this.reloadIp();
  }


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

  public getMatchesOfDivisionForToday(divisionId: number): Promise<TeamMatchEntry[]> {
    const matchRequest = new GetMatchesRequest();
    matchRequest.DivisionId = divisionId;
    matchRequest.YearDateFrom = dateFormat(new Date(), 'yyyy-mm-dd');
    matchRequest.YearDateTo = dateFormat(new Date().setDate(new Date().getDate() + 1), 'yyyy-mm-dd');
    //matchRequest.YearDateFrom = '2018-11-03';
    //matchRequest.YearDateTo = '2018-11-04';

    return this.getMatches(matchRequest);
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
        'x-frenoy-database': 'aftt',
        'x-forwarded-for': this.currentIp
      }
    }).then(async (res: any) => {
      if (res.status === 200) {
        return res.json();
      } else if (maxRetry > 0) {

        this.reloadIp();
        Config.logger.info(`Changing IP to ${this.currentIp}...`);

        return this.callUrl(url, args, maxRetry - 1);
      } else {
        throw new Error(await res.text());
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

  private reloadIp() {
    this.currentIp = randomIpv4('{token1}.{token2}.{token3}.{token4}', {
      token1: {
        min: 127,
        max: 127
      },
      token2: {
        min: 127,
        max: 192
      },
      token3: {
        min: 0,
        max: 200
      },
      token4: {
        min: 0,
        max: 200
      }
    });
  }

}
