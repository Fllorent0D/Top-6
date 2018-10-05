import * as dateFormat from 'dateformat';
import * as fs from 'fs';
import * as _ from 'lodash';
import * as sleep from 'sleep';
import { IConfig } from '../build/src/models/IConfig.interface';
import { ConfigRankingCategories } from '../build/src/models/RankingCategories.model';
import { ConfingRankingRegion } from '../build/src/models/RankingItem.model';
import { Config } from './config';
import { GetMatchesRequest } from './models/GetMatchesRequest';
import { GetMatchesResponse } from './models/GetMatchesResponse';
import { TeamMatchEntry } from './models/TeamMatchEntry';
import { PlayersStats } from './players-stats';
import { TabTRequestor } from './TabTRequestor';
import { Week } from './week';

class Ranking {
  public week: number;
  public rankings: RankingRegion[];
}

class RankingRegion {
  public name: string;
  public categories: RankingCategory[];
}

class RankingCategory {
  public name: string;
  public players: RankingPlayer[];
}

class RankingPlayer {
  public position?: number;
  public uniqueIndex: string;
  public clubIndex: string;
  public name: string;
  public points: number;
}


export class TopCalculator {
  public static config: IConfig;
  /*

  1 - Loop over weeks and download matchs
  2 - Upsert document for each player with victory for the week n
  3 - Process each player document to choose the good division
  4 - Dispatch players in correct regions
  5 - Dispatch players in correct categories

  */
  private tabt: TabTRequestor;
  private readonly week: Week;
  private readonly playersStats: PlayersStats;
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


  public async start(): Promise<string> {

    const matches = await this.downloadAllMatches();
    this.playersStats.processPlayersFromMatches(matches);
    this.playersStats.attributeDivisionToEachPlayers();

    this.createRankings();

    fs.writeFile(`players-${dateFormat(new Date(), 'yyyy-mm-dd')}.json`, JSON.stringify(this.playersStats), 'utf8', (err: any) => {
      console.log(err);
    });

    return this.printRankings(this.currentWeek);
  }

  private async downloadAllMatches(): Promise<TeamMatchEntry[]> {
    const clubs: string[] = Config.getAllClubs();
    const divisions: number[] = Config.getAllDivisions();
    const allMatches: TeamMatchEntry[] = [];

    for (let i = 1; i < this.currentWeek; i = i + 1) {
      for (const club of clubs) {
        sleep.msleep(5000);

        let matches = await this.downloadMatchesOfClubForWeek(club, i);
        if (matches) {
          matches = matches.filter((match: TeamMatchEntry) => divisions.indexOf(match.DivisionId) > -1);

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

    return this.tabt.getMatches(getMatchRequest).then((matchs: GetMatchesResponse) => matchs.TeamMatchesEntries);
  }


  private createRankings() {
    for (let i = 1; i < this.currentWeek; i = i + 1) {

      // Creates a new week to wrap the regions rankings
      const rankingsCurrentWeek = {
        week: i,
        rankings: [],
      } as Ranking;
      _.forEach(Config.regions, (value: ConfingRankingRegion) => {
        // Creates a new region for this week
        const ranking = {
          name: value.name,
          categories: [],
        };
        _.forEach(Config.categories, (category: ConfigRankingCategories) => {
          // Creates each category for this region of this week
          ranking.categories.push({
            name: category.name,
            players: [],
          });
        });
        rankingsCurrentWeek.rankings.push(ranking);
      });

      //Loop on players on include them in the correct ranking
      _.forEach(this.playersStats.playersStats, (player: any) => {
        console.log(player);

        // Check the current category the player is in for the week n°i
        const currentPointsPlayer = _.find(player.rankingEvolution, {'weekName': i});

        if (currentPointsPlayer) {
          // Check in which region the club is in
          const rankingRegion = Config.dispatchInRankingForClub(player.clubIndex);

          if (rankingRegion) {
            // Find the index of the correct region for the club
            const rankingRegionIndex = _.findIndex(rankingsCurrentWeek.rankings, {'name': rankingRegion.name});

            // Find the index of the correct category
            const categoryIndex = _.findIndex(rankingsCurrentWeek.rankings[rankingRegionIndex].categories, {'name': currentPointsPlayer.rankingCategory});

            // Push the player to the correct category and region
            rankingsCurrentWeek.rankings[rankingRegionIndex].categories[categoryIndex].players.push({
              uniqueIndex: player.uniqueIndex,
              clubIndex: player.clubIndex,
              name: player.name,
              points: currentPointsPlayer.points,
            });
          }
        }
      });

      // Loop on each regions categories to order and take 10 bests
      rankingsCurrentWeek.rankings = rankingsCurrentWeek.rankings.map((ranking: any) => {
        const orderedCategories = ranking.categories.map((category: any) => {
          const rank = _.chain(category.players)
            .orderBy(['points', 'name'], ['desc', 'asc'])
            .slice(0, 10)
            .map((val: any, index: number) => ({ ...val, position: index + 1 }))
            .value();

          return {
            name: category.name,
            players: rank,
          };
        });

        return {
          name: ranking.name,
          categories: orderedCategories,
        };
      });
      this.rankings.push(rankingsCurrentWeek);
    }
  }


  private printRankings(week: number): string {
    let text = ''
    text = `${text}\nJournée ${week}`;
    const rankingCurrentWeek = _.find(this.rankings, { week: week - 1 });

    for (const ranking of rankingCurrentWeek.rankings) {
      text = `${text}\n\n\n\n------------------------------------------`;
      text = `${text}\n---------- Classements ${ranking.name} ----------`;
      text = `${text}\n------------------------------------------`;
      for (const category of ranking.categories) {
        text = `${text}\n\n--- Catégorie ${category.name}`;

        for (const player of category.players) {
          text = `${text}\n${player.position} ${player.uniqueIndex} ${player.name} ${player.clubIndex} ${ player.points } `;
        }
      }
    }

    return text;
  }


}
