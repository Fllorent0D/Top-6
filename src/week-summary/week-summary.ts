import * as dateFormat from 'dateformat';
import * as _ from 'lodash';

import { Config } from '../config';

import { DivisionNameType, GetMatchesRequest, TeamMatchEntry, TeamMatchPlayerEntry } from '../tabt-models';
import { TabTRequestor } from '../TabTRequestor';

interface IGroupedMatches {
  series: string;
  region: string;
  sex: string;
  matches: TeamMatchEntry[];
}

export class WeekSummary {
  private readonly tabt: TabTRequestor;

  constructor() {
    //this.config = Config.getAllClubs();
    this.tabt = new TabTRequestor();
  }

  private static getLastWeek(): Date {
    const date = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(date.getDate() - 7);

    return lastWeek;
  }

  public async start(): Promise<string> {
    Config.logger.info('Script summary started');
    let text = '';
    for (const region of Config.regions) {
      Config.logger.info(`Starting summary for region ${region.name}`);

      const matches = await this.downloadAllMatches(region.clubs);
      const groupedMatch = this.groupMatches(matches);
      text = text + this.printResult(groupedMatch, region.name, region.clubs);

      Config.logger.info(`Summary for region ${region.name} ended`);
    }
    Config.logger.info('Script summary ended');

    return text;
  }

  private async downloadAllMatches(clubs: string[]): Promise<TeamMatchEntry[]> {
    const matches: TeamMatchEntry[] = [];
    for (const club of clubs) {
      //await Config.timeout(5000);
      Config.logger.info(`Summary: Downloading this week of ${club}`);
      const matchesOfClub = await this.downloadMatchesOfClubForWeek(club);

      if (matchesOfClub) {
        matches.push(...matchesOfClub);
      }
    }

    return matches;
  }


  // @ts-ignore
  private groupMatches = (matches: TeamMatchEntry[]): IGroupedMatches[] => _.chain(matches)
    .uniqBy('MatchId')
    .filter((match: TeamMatchEntry) => !(match.HomeTeam.includes('Bye') || match.AwayTeam.includes('Bye')))
    .groupBy('DivisionName')
    .toPairsIn()
    .map(([divisionName, matchesSerie]: [string, TeamMatchEntry[]]) => {
      const [series, region, sex] = divisionName.split(' - ');

      return { series, region, sex, matches: matchesSerie };
    })
    // @ts-ignore
    .filter(({ series, region, sex, matchs }: { series: string; region: string; sex: string; matchs: TeamMatchEntry[]; }) => series.indexOf('7') === -1)
    .orderBy(['sex', 'region', 'series'], ['DESC', 'ASC', 'ASC'])
    .value();

  private printResult(matchesGrouped: IGroupedMatches[], region: string, clubs: string[]): string {
    let text = `\n\n------------------------------------------`;
    text = `${text}\n---------- Techniques ${region} ----------`;
    text = `${text}\n------------------------------------------`;
    for (const series of matchesGrouped) {
      text = `${text}\n\n---  ${series.sex} - ${series.region} - ${series.series}\n`;
      for (const match of series.matches) {
        text = `${text}\n\t${this.printMatch(match, clubs)}`;
      }
    }

    return text;
  }

  private printMatch(match: TeamMatchEntry, clubs: string[]): string {
    const teams = `${match.HomeTeam} - ${match.AwayTeam}`;
    const score = _.get(match, 'Score', ' - ');

    let players = '';
    if (_.get(match, 'MatchDetails.DetailsCreated', false)) {
      const playersArray = [];

      const reduceNames = (acc: string[], player: TeamMatchPlayerEntry): string[] => {

        const playerString: string = `${player.FirstName.charAt(0)}. ${Config.titleCase(player.LastName)} ${_.get(player, 'VictoryCount', 'WO')}`;

        return _.concat(acc, playerString);
      };
      if (_.includes(clubs, match.HomeClub)) {
        playersArray.push(_.reduce(match.MatchDetails.HomePlayers.Players, reduceNames, []).join(', '));
      }

      if (_.includes(clubs, match.AwayClub)) {
        playersArray.push(_.reduce(match.MatchDetails.AwayPlayers.Players, reduceNames, []).join(', '));
      }

      players = playersArray.join(', ');
    } else {
      players = 'NC';
    }

    return `${teams} : ${score}   ${players}`;
  }

  private async downloadMatchesOfClubForWeek(club: string): Promise<TeamMatchEntry[]> {
    const getMatchRequest = new GetMatchesRequest();
    getMatchRequest.Club = club;
    getMatchRequest.WithDetails = true;
    getMatchRequest.YearDateTo = dateFormat(new Date(), 'yyyy-mm-dd');
    getMatchRequest.YearDateFrom = dateFormat(WeekSummary.getLastWeek(), 'yyyy-mm-dd');
    getMatchRequest.ShowDivisionName = DivisionNameType.Yes;

    return this.tabt.getMatches(getMatchRequest);
  }

}
