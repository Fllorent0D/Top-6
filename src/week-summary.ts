import * as dateFormat from 'dateformat';
import * as _ from 'lodash';
import { Config } from './config';
import { DivisionNameType, GetMatchesRequest } from './models/GetMatchesRequest';
import { GetMatchesResponse } from './models/GetMatchesResponse';
import { TeamMatchEntry } from './models/TeamMatchEntry';
import { TeamMatchPlayerEntry } from './models/TeamMatchPlayerEntry';
import { TabTRequestor } from './TabTRequestor';

interface IGroupedMatches {
  series: string;
  region: string;
  sex: string;
  matches: TeamMatchEntry[];
}

export class WeekSummary {
  private readonly config: string[];
  private readonly tabt: TabTRequestor;

  constructor() {
    this.config = Config.getAllClubs();
    this.tabt = new TabTRequestor();
  }

  private static getLastWeek(): Date {
    const date = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(date.getDate() - 7);

    return lastWeek;
  }

  public async start(): Promise<string> {

    Config.logger.info('Script summary started')
    const matches = await this.downloadAllMatches();
    const groupedMatch = this.groupMatches(matches);
    const text = this.printResult(groupedMatch);
    Config.logger.info('Script summary ended')
    return text;
  }

  private async downloadAllMatches(): Promise<TeamMatchEntry[]> {
    const matches: TeamMatchEntry[] = [];
    for (const club of this.config) {
      await Config.timeout(5000);
      Config.logger.info(`Summary: Downloading this week of ${club}`);
      const matchesOfClub = await this.downloadMatchesOfClubForWeek(club);

      if (matchesOfClub) {
        matches.push(...matchesOfClub);
      }
    }

    return matches;
  }

  private groupMatches = (matches: TeamMatchEntry[]): IGroupedMatches[] => _.chain(matches)
    .uniqBy('MatchId')
    .filter((match: TeamMatchEntry) => !(match.HomeTeam.includes('Bye') || match.AwayTeam.includes('Bye')))
    .groupBy('DivisionName')
    .toPairsIn()
    .map(([divisionName, matchesSerie]: [string, TeamMatchEntry[]]) => {
      const [series, region, sex] = divisionName.split(' - ');

      return { series, region, sex, matches: matchesSerie };
    })
    .orderBy(['sex', 'region', 'series'], ['DESC', 'DESC', 'ASC'])
    .value();

  private printResult(matchesGrouped: IGroupedMatches[]): string {
    let text = '';
    for (const series of matchesGrouped) {
      text = `${text}\n\n--- ${series.region} - ${series.series} - ${series.sex}`;
      for (const match of series.matches) {
        text = `${text}\n\n\t${this.printMatch(match)}`;
      }
    }

    return text;
  }

  private printMatch(match: TeamMatchEntry): string {
    const teams = `${match.HomeTeam} - ${match.AwayTeam}`;
    const score = _.get(match, 'Score', ' - ');

    let players = '';
    if (_.get(match, 'MatchDetails.DetailsCreated', false)) {
      const playersArray = [];

      const reduceNames = (acc: string[], player: TeamMatchPlayerEntry): string[] => {
        const playerString: string = `${player.FirstName} ${player.LastName} (${player.Ranking}, ${_.get(player, 'VictoryCount', 'WO')})`;

        return _.concat(acc, playerString);
      };

      const reduceRanking = (playersToReduce: TeamMatchPlayerEntry[]): string[] => _.chain(playersToReduce)
        .countBy('Ranking')
        .toPairsIn()
        .map(([ranking, count]: [string, number]) => `${count} ${ranking}`)
        .value();


      if (_.includes(this.config, match.HomeClub)) {
        playersArray.push(`\n\t\t${match.HomeTeam}: `, _.reduce(match.MatchDetails.HomePlayers.Players, reduceNames, []).join(', '));
      } else {
        playersArray.push(`\n\t\t${match.HomeTeam}: `, reduceRanking(match.MatchDetails.HomePlayers.Players).join(', '));
      }
      if (_.includes(this.config, match.AwayClub)) {
        playersArray.push(`\n\t\t${match.AwayTeam}: `, _.reduce(match.MatchDetails.AwayPlayers.Players, reduceNames, []).join(', '));
      } else {
        playersArray.push(`\n\t\t${match.AwayTeam}: `, reduceRanking(match.MatchDetails.AwayPlayers.Players).join(', '));
      }
      players = playersArray.join('');
    } else {
      players = 'NC';
    }

    return `${teams} | ${score} | ${players}`;
  }

  private async downloadMatchesOfClubForWeek(club: string): Promise<TeamMatchEntry[]> {
    const getMatchRequest = new GetMatchesRequest();
    getMatchRequest.Club = club;
    getMatchRequest.WithDetails = true;
    getMatchRequest.YearDateTo = dateFormat(new Date(), 'yyyy-mm-dd');
    getMatchRequest.YearDateFrom = dateFormat(WeekSummary.getLastWeek(), 'yyyy-mm-dd');
    getMatchRequest.ShowDivisionName = DivisionNameType.Yes;

    return this.tabt.getMatches(getMatchRequest).then((matches: GetMatchesResponse) => matches.TeamMatchesEntries);
  }

}
