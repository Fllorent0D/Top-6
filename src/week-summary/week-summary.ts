import * as dateFormat from 'dateformat';
import { chain, concat, get, includes, reduce, flatten } from 'lodash';

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

  public async start(): Promise<{ name: string; text: string }[]> {
    Config.logger.info('Script summary started');
    const technicsTexts: { name: string; text: string }[] = [];

    for (const region of Config.regions) {
      Config.logger.info(`Starting summary for region ${region.name}`);

      const matches = await this.downloadAllMatches(region.clubs);
      const groupedMatch = this.groupMatches(matches);

      technicsTexts.push({
        name: region.name,
        text: this.printResult(groupedMatch, region.name, region.clubs)
      });

      Config.logger.info(`Summary for region ${region.name} ended`);
    }
    Config.logger.info('Script summary ended');

    return technicsTexts;
  }

  private async downloadAllMatches(clubs: string[]): Promise<TeamMatchEntry[]> {
    const getMatchesPromise: Promise<TeamMatchEntry[]>[] = clubs.map((club: string) => this.downloadMatchesOfClubForWeek(club));
    const allMatchesArray: TeamMatchEntry[][] = await Promise.all(getMatchesPromise);

    return flatten(allMatchesArray);
  }

  private groupMatches = (matches: TeamMatchEntry[]): IGroupedMatches[] => chain(matches)
    .uniqBy('MatchId')
    .filter((match: TeamMatchEntry) => !(match.HomeTeam.includes('Bye') || match.AwayTeam.includes('Bye')))
    .groupBy('DivisionName')
    .toPairsIn()
    .map(([divisionName, matchesSerie]: [string, TeamMatchEntry[]]) => {
      const [series, region, sex] = divisionName.split(' - ');

      return { series, region, sex, matches: matchesSerie };
    })
    .filter((obj: { series: string; region: string; sex: string; matches: TeamMatchEntry[] }) => obj.series.indexOf('7') === -1)
    .orderBy(['sex', 'region', 'series'], ['asc', 'asc', 'asc'] as ReadonlyArray<'desc' | 'asc'>)
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
    const score = get(match, 'Score', ' - ');

    let players = '';
    if (get(match, 'MatchDetails.DetailsCreated', false)) {
      const playersArray = [];

      const reduceNames = (acc: string[], player: TeamMatchPlayerEntry): string[] => {
        const playerString: string = `${player.FirstName.charAt(0)}. ${Config.titleCase(player.LastName)} ${get(player, 'VictoryCount', 'WO')}`;

        return concat(acc, playerString);
      };
      if (includes(clubs, match.HomeClub)) {
        playersArray.push(reduce(match.MatchDetails.HomePlayers.Players, reduceNames, []).join(', '));
      }

      if (includes(clubs, match.AwayClub)) {
        playersArray.push(reduce(match.MatchDetails.AwayPlayers.Players, reduceNames, []).join(', '));
      }

      players = playersArray.join(', ');
    } else {
      players = 'NC';
    }

    return `${teams} : ${score}   ${players}`;
  }

  private async downloadMatchesOfClubForWeek(club: string): Promise<TeamMatchEntry[]> {
    Config.logger.info(`Summary: Downloading this week of ${club}`);

    const getMatchRequest = new GetMatchesRequest();
    getMatchRequest.Club = club;
    getMatchRequest.WithDetails = true;
    getMatchRequest.YearDateTo = dateFormat(new Date(), 'yyyy-mm-dd');
    getMatchRequest.YearDateFrom = dateFormat(WeekSummary.getLastWeek(), 'yyyy-mm-dd');
    getMatchRequest.ShowDivisionName = DivisionNameType.Yes;

    return this.tabt.getMatches(getMatchRequest);
  }

}
