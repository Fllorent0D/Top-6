import * as dateFormat from 'dateformat';
import * as fs from 'fs';
import { chain, find, findIndex, flatten, forEach, toNumber } from 'lodash';

import * as appRoot from 'app-root-path';
import { Config, IConfigCategoryRanking, IConfigRegionRanking } from '../config';
//import { Week } from '../helpers/week';
import { ClubEntry, GetClubsRequest, GetMatchesRequest, TeamMatchEntry } from '../tabt-models';
import { TabTRequestor } from '../TabTRequestor';
import { PlayersStatsAggregator, RankingEvolution } from './players-stats-aggregator';
import { RankingRegion, TaskOuput } from './ranking.model';


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

  public readonly playersStats: PlayersStatsAggregator;
  public readonly rankings: Ranking[];

  private tabt: TabTRequestor;
  //private readonly week: Week;
  private readonly currentWeek: number;
  private readonly playerInTop: number;
  private readonly detailed: boolean;

  constructor(weekName: number, playerInTop: number, detailed: boolean) {
    this.tabt = new TabTRequestor();
    //this.week = new Week();
    //this.currentWeek = this.week.getCurrentJournee();

    this.currentWeek = weekName;
    this.playerInTop = playerInTop;
    this.detailed = detailed;

    this.playersStats = new PlayersStatsAggregator();
    this.playersStats.currentWeek = this.currentWeek;

    this.rankings = [];
  }


  public async start(): Promise<TaskOuput> {
    Config.logger.info(`Top 6 script started - Current week ${this.currentWeek}`);

    const matches = await this.downloadAllMatches();
    const clubs = await this.downloadAllClubs();

    this.playersStats.processPlayersFromMatches(matches);
    this.playersStats.overridePlayerHistory();
    this.playersStats.attributeDivisionToEachPlayers();
    this.playersStats.attributeClubNameToEachPlayers(clubs);

    Config.logger.info('Calculating rankings');
    this.createRankings();

    fs.writeFile(`${appRoot}/players-${dateFormat(new Date(), 'yyyy-mm-dd')}.json`, JSON.stringify(this.playersStats), 'utf8', (err: any) => {
      if (err) {
        Config.logger.info('Error while saving debug data : ', err);
      } else {
        Config.logger.info('Debug saved successfully');
      }
    });
    Config.logger.info('Top 6 script ended');

    return this.printRankings();
  }


  public printRankings(): TaskOuput {
    const rankingCurrentWeek = find(this.rankings, { week: this.currentWeek });
    const rankingsTexts: TaskOuput = [];
    for (const ranking of rankingCurrentWeek.rankings) {
      let text = `Classement de la journée n°${this.currentWeek}`;

      if (this.detailed) {
        text = `${text}\n# Classement ${ranking.name}`;
      }

      for (const category of ranking.categories) {
        text = `${text}\n\n## Catégorie ${category.name}`;

        for (const player of category.players) {
          if (this.detailed) {
            text = `${text}\n${player.position}. ${player.uniqueIndex} ${Config.titleCase(player.name)} - ${player.clubName} ${player.clubIndex} - ${player.points} points `;
          } else {
            text = `${text}\n${player.position}. ${Config.titleCase(player.name)} - ${player.clubName} - ${player.points} points `;
          }
        }
      }

      if (!this.detailed) {
        text = `${text}\n\n Ce classement est calculé par BePing - L'appli de Ping belge`;
      }

      rankingsTexts.push({
        name: ranking.name,
        text: text
      });
    }
    /*
    text = `${text}\n\nErreurs détectées: `;
    for (const error of this.playersStats.errorsDetected) {
      text = `${text}\n${error}`;
    }*/

    return rankingsTexts;
  }

  private async downloadAllMatches(): Promise<TeamMatchEntry[]> {
    const clubs: string[] = Config.getAllClubs();
    const divisions: number[] = Config.getAllDivisions();
    //const allMatches: TeamMatchEntry[] = [];
    const getMatchesPromise: Promise<TeamMatchEntry[]>[] = clubs.map((club: string) => this.downloadMatchesOfClub(club));
    const allMatchesArray: TeamMatchEntry[][] = await Promise.all(getMatchesPromise);
    const allMatches: TeamMatchEntry[] = flatten(allMatchesArray);

    return allMatches.filter((match: TeamMatchEntry) => parseInt(match.WeekName, 10) <= this.currentWeek && divisions.indexOf(toNumber(match.DivisionId)) > -1);
  }

  /*
  * Download all matches for a club for a specific date
  */

  private async downloadMatchesOfClub(club: string): Promise<TeamMatchEntry[]> {
    Config.logger.info(`Top : Downloading ${club}`);

    const getMatchRequest = new GetMatchesRequest();
    //getMatchRequest.WeekName = week.toString();
    getMatchRequest.Club = club;
    getMatchRequest.WithDetails = true;
    getMatchRequest.Season = 21;

    return this.tabt.getMatches(getMatchRequest);
  }


  private createRankings() {
    for (let i = 1; i <= this.currentWeek; i = i + 1) {

      // Creates a new week to wrap the regions rankings
      const rankingsCurrentWeek: Ranking = {
        week: i,
        rankings: []
      };
      forEach(Config.regions, (value: IConfigRegionRanking) => {
        // Creates a new region for this week
        const ranking = {
          name: value.name,
          categories: []
        };
        forEach(Config.categories, (category: IConfigCategoryRanking) => {
          // Creates each category for this region of this week
          ranking.categories.push({
            name: category.name,
            players: []
          });
        });
        rankingsCurrentWeek.rankings.push(ranking);
      });

      //Loop on players on include them in the correct ranking
      forEach(this.playersStats.playersStats, (player: any) => {

        // Check the current category the player is in for the week n°i
        const currentPointsPlayer: RankingEvolution = find(player.rankingEvolution, { 'weekName': i }) as RankingEvolution;

        if (currentPointsPlayer) {
          // Check in which region the club is in
          const rankingRegion = Config.dispatchInRankingForClub(player.clubIndex);

          if (rankingRegion) {
            // Find the index of the correct region for the club
            const rankingRegionIndex = findIndex(rankingsCurrentWeek.rankings, { 'name': rankingRegion.name });

            // Find the index of the correct category
            const categoryIndex = findIndex(rankingsCurrentWeek.rankings[rankingRegionIndex].categories, { 'name': currentPointsPlayer.rankingCategory });

            // Push the player to the correct category and region
            rankingsCurrentWeek.rankings[rankingRegionIndex].categories[categoryIndex].players.push({
              uniqueIndex: player.uniqueIndex,
              clubName: player.clubName,
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
          const rank = chain(category.players)
            .orderBy(['points', 'name'], ['desc', 'asc'])
            .slice(0, this.playerInTop)
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


  private downloadAllClubs(): Promise<ClubEntry[]> {
    const clubRequest = new GetClubsRequest();

    return this.tabt.getClubs(clubRequest);
  }
}
