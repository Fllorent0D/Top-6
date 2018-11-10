import * as dateFormat from 'dateformat';
import * as fs from 'fs';
import * as _ from 'lodash';

import { Config, IConfigCategoryRanking, IConfigRegionRanking } from '../config';
import { Week } from '../helpers/week';
import { GetMatchesRequest, TeamMatchEntry } from '../tabt-models';
import { TabTRequestor } from '../TabTRequestor';
import { IRankingEvolution, PlayersStats } from './players-stats';
import { RankingRegion } from './ranking.model';


export class Ranking {
  public week: number;
  public rankings: RankingRegion[];
}


export class TopCalculator {
  /*

  1 - Loop over weeks and download matchs
  2 - Upsert document for each player with victory for the week n
  3 - Process each player document to choose the good division
  4 - Dispatch players in correct regions
  5 - Dispatch players in correct categories

  */
  public readonly playersStats: PlayersStats;

  private tabt: TabTRequestor;
  private readonly week: Week;
  private readonly rankings: Ranking[];
  private readonly currentWeek: number;

  constructor() {
    this.tabt = new TabTRequestor();

    this.week = new Week();
    this.currentWeek = this.week.getCurrentJournee();

    this.playersStats = new PlayersStats();
    this.playersStats.currentWeek = this.currentWeek;

    this.rankings = [];
  }


  public async start(): Promise<Ranking[]> {
    Config.logger.info('Top 6 script started');

    const matches = await this.downloadAllMatches();
    this.playersStats.processPlayersFromMatches(matches);
    this.playersStats.attributeDivisionToEachPlayers();

    Config.logger.info('Calculating rankings');
    this.createRankings();

    fs.writeFile(`debug/players-${dateFormat(new Date(), 'yyyy-mm-dd')}.json`, JSON.stringify(this.playersStats), 'utf8', (err: any) => {
      if (err) {
        Config.logger.info('Error while saving debug data : ', err);
      } else {
        Config.logger.info('Debug saved successfully');
      }
    });
    Config.logger.info('Top 6 script ended');

    return this.rankings;
  }


  public printRankings(week: number): string {
    let text = '';
    text = `${text}\nJournée ${week - 1}`;
    const rankingCurrentWeek = _.find(this.rankings, { week: week - 1 });

    for (const ranking of rankingCurrentWeek.rankings) {
      text = `${text}\n\n------------------------------------------`;
      text = `${text}\n---------- Classements ${ranking.name} ----------`;
      text = `${text}\n------------------------------------------`;
      for (const category of ranking.categories) {
        text = `${text}\n\n--- Catégorie ${category.name}`;

        for (const player of category.players) {
          text = `${text}\n${player.position} ${player.uniqueIndex} ${Config.titleCase(player.name)} ${player.clubIndex} ${ player.points } `;
        }
      }
    }
    text = `${text}\n\nErreurs détectées: `;
    for (const error of this.playersStats.errorsDetected) {
      text = `${text}\n${error}`;
    }

    return text;
  }

  private async downloadAllMatches(): Promise<TeamMatchEntry[]> {
    const clubs: string[] = Config.getAllClubs();
    const divisions: number[] = Config.getAllDivisions();
    const allMatches: TeamMatchEntry[] = [];

    for (let i = 1; i < this.currentWeek; i = i + 1) {
      for (const club of clubs) {

        await Config.timeout(4000);
        Config.logger.info(`Top : Downloading ${club} weekname ${i}`);
        let matches = await this.downloadMatchesOfClubForWeek(club, i);
        if (matches) {
          matches = matches.filter((match: TeamMatchEntry) => divisions.indexOf(_.toNumber(match.DivisionId)) > -1);
          allMatches.push(...matches);
        }
      }
    }

    return allMatches;
  }

  /*
  * Download all matches for a club for a specific date
  */

  private async downloadMatchesOfClubForWeek(club: string, week: number): Promise<TeamMatchEntry[]> {
    const getMatchRequest = new GetMatchesRequest();
    getMatchRequest.WeekName = week.toString();
    getMatchRequest.Club = club;
    getMatchRequest.WithDetails = true;

    return this.tabt.getMatches(getMatchRequest);
  }


  private createRankings() {
    for (let i = 1; i < this.currentWeek; i = i + 1) {

      // Creates a new week to wrap the regions rankings
      const rankingsCurrentWeek: Ranking = {
        week: i,
        rankings: []
      };
      _.forEach(Config.regions, (value: IConfigRegionRanking) => {
        // Creates a new region for this week
        const ranking = {
          name: value.name,
          categories: []
        };
        _.forEach(Config.categories, (category: IConfigCategoryRanking) => {
          // Creates each category for this region of this week
          ranking.categories.push({
            name: category.name,
            players: []
          });
        });
        rankingsCurrentWeek.rankings.push(ranking);
      });

      //Loop on players on include them in the correct ranking
      _.forEach(this.playersStats.playersStats, (player: any) => {

        // Check the current category the player is in for the week n°i
        const currentPointsPlayer: IRankingEvolution = _.find(player.rankingEvolution, { 'weekName': i }) as IRankingEvolution;

        if (currentPointsPlayer) {
          // Check in which region the club is in
          const rankingRegion = Config.dispatchInRankingForClub(player.clubIndex);

          if (rankingRegion) {
            // Find the index of the correct region for the club
            const rankingRegionIndex = _.findIndex(rankingsCurrentWeek.rankings, { 'name': rankingRegion.name });

            // Find the index of the correct category
            const categoryIndex = _.findIndex(rankingsCurrentWeek.rankings[rankingRegionIndex].categories, { 'name': currentPointsPlayer.rankingCategory });

            // Push the player to the correct category and region
            rankingsCurrentWeek.rankings[rankingRegionIndex].categories[categoryIndex].players.push({
              uniqueIndex: player.uniqueIndex,
              clubIndex: player.clubIndex,
              name: player.name,
              points: currentPointsPlayer.points
            });
          }
        }
      });

      // Loop on each regions categories to order and take 10 bests
      rankingsCurrentWeek.rankings = rankingsCurrentWeek.rankings.map((ranking: any) => {
        const orderedCategories = ranking.categories.map((category: any) => {
          const rank = _.chain(category.players)
            .orderBy(['points', 'name'], ['desc', 'asc'])
            .slice(0, 12)
            .map((val: any, index: number) => ({ ...val, position: index + 1 }))
            .value();

          return {
            name: category.name,
            players: rank
          };
        });

        return {
          name: ranking.name,
          categories: orderedCategories
        };
      });
      this.rankings.push(rankingsCurrentWeek);
    }
  }


}
