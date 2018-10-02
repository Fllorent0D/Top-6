import { Spinner } from 'cli-spinner';
import * as Table from 'cli-table';
import * as fs from 'fs';
import * as _ from 'lodash';
import * as sleep from 'sleep';
import { IConfig } from '../build/src/models/IConfig.interface';
import { RankingCategories } from '../build/src/models/RankingCategories.model';
import { RankingItem } from '../build/src/models/RankingItem.model';
import { GetMatchesRequest } from './models/GetMatchesRequest';
import { GetMatchesResponse } from './models/GetMatchesResponse';
import { TeamMatchEntry } from './models/TeamMatchEntry';
import { TeamMatchPlayerEntry } from './models/TeamMatchPlayerEntry';
import { TabTRequestor } from './TabTRequestor';
import { Week } from './week';

export class TopCalculator {
  /*

  1 - Loop over weeks and download matchs
  2 - Upsert document for each player with victory for the week n
  3 - Process each player document to choose the good division
  4 - Dispatch players in correct rankings
  5 - Dispatch players in correct categories

  */
  private tabt: TabTRequestor;
  private config: IConfig;
  private week: Week;
  private playersStats: any;
  private rankings: any[];
  private spinner: Spinner;

  constructor() {
    this.tabt = new TabTRequestor();
    this.week = new Week();
    this.playersStats = {};
    this.rankings = [];
    this.spinner = new Spinner('Calcul en cours.. %s');
    Spinner.setDefaultSpinnerString(10);
    this.spinner.start();
    this.config = {
      'rankings': [
        {
          name: 'Huy-Waremme',
          clubs: [],
        },
        {
          name: 'Verviers',
          clubs:
            ['L095', 'L323', 'L264', 'L002', 'L318', 'L320', 'L337', 'L348',
              'L313', 'L328', 'L125', 'L389', 'L382', 'L179','L360', 'L399', 'L066', 'L368',
              'L003', 'L184', 'L252', 'L272', 'L274', 'L284', 'L296', 'L326',
              'L329', 'L344', 'L349', 'L357', 'L378'],
          // clubs:['L252']
        },
        {
          name: 'Liège',
          clubs: [],
        },
      ],
      'categories': [
        {
          'id': 0,
          'name': 'NAT/WB',
          'divisions': [3625, 3626, 3627, 3628, 3629, 3630, 3678, 3679, 3680, 3681, 3682],
        },
        {
          'id': 1,
          'name': 'Provincial 1',
          'divisions': [3962, 3963],
        },
        {
          'id': 2,
          'name': 'Provincial 2',
          'divisions': [3965, 3966, 3967, 3968],
        },
        {
          'id': 3,
          'name': 'Provincial 3',
          'divisions': [3970, 3971, 3972, 3973, 3974, 3975],
        },
        {
          'id': 4,
          'name': 'Provincial 4',
          'divisions': [3976, 3977, 3978, 3979, 3980, 3981, 3982],
        },
        {
          'id': 5,
          'name': 'Provincial 5',
          'divisions': [3983, 3984, 3985, 3986, 3987, 3988, 3989, 3990],
        },
        {
          'id': 6,
          'name': 'Provincial 6',
          'divisions': [3991, 3992, 3993, 3994, 3995, 3996, 3997, 3998, 3999, 4000],
        },
      ],
    };

  }


  public async start() {
    const currentWeek2: number = this.week.getCurrentJournee();
    const clubs: string[] = this.getAllClubs();
    const divisions: number[] = this.getAllDivisions();
    try {
      // Step 1 Download and Upsert documents
      for (let i = 1; i < currentWeek2; i = i + 1) {
        for (const club of clubs) {
          this.spinner.setSpinnerTitle(`Téléchargement des matchs | journee : ${i} | club : ${club}`);
          sleep.msleep(1000);
          let matchs = await this.downloadMatchsOfClubForWeek(club, i);
          if (matchs) {
            matchs = matchs.filter((match: TeamMatchEntry) => divisions.indexOf(match.DivisionId) > -1);
            this.processPlayersFromMatchs(matchs);
          }
        }

      }
      this.spinner.setSpinnerTitle(`Calcul des classements`);

      this.attributeDivisionToEachPlayers();
      this.createRankings();
      this.spinner.stop();
      fs.writeFile('players.json', JSON.stringify(this.playersStats), 'utf8', (err: any) => {
        console.log(err);
      });
      this.displayRankigs();
    } catch(e){
      console.log('Erreur');
      console.error(e);
      this.spinner.stop();
    }


  }


  private createRankings() {

    const currentWeek2: number = this.week.getCurrentJournee();
    for (let i = 1; i < currentWeek2; i = i + 1) {
      let rankingsCurrentWeek = {
        'week': i,
        'rankings': [],
      };
      _.forEach(this.config.rankings, (values: RankingItem) => {
        const ranking = {
          name: values.name,
          categories: [],
        };
        _.forEach(this.config.categories, (category: RankingCategories) => {
          ranking.categories.push({
            name: category.name,
            players: [],
          });
        });
        rankingsCurrentWeek.rankings.push(ranking);
      });
      _.forEach(this.playersStats, (player: any) => {
        const currentPointsPlayer = player.rankingEvolution.find((evolution: any) => evolution.weekName === i);
        if (currentPointsPlayer) {
          const rankingZone = this.dispatchInRankingForClub(player.clubIndex);
          if (rankingZone) {
            const rankingZoneIndex = _.findIndex(rankingsCurrentWeek.rankings, (ranking: any) => {
              return ranking.name === rankingZone.name;
            });
            const categoryIndex = _.findIndex(rankingsCurrentWeek.rankings[rankingZoneIndex].categories, (category: any) => {
              return category.name === currentPointsPlayer.rankingCategory;
            });
            rankingsCurrentWeek.rankings[rankingZoneIndex].categories[categoryIndex].players.push({
              uniqueIndex: player.uniqueIndex,
              clubIndex: player.clubIndex,
              name: player.name,
              points: currentPointsPlayer.points,
            });
          }
        }
      });

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
      //console.log(JSON.stringify(rankingsCurrentWeek));
    }
  }

  private dispatchInRankingForClub(club: string): RankingItem {
    return this.config.rankings.find((ranking: RankingItem) => {
      return _.includes(ranking.clubs, club);
    });
  }

  private attributeDivisionToEachPlayers() {
    const currentWeek2: number = this.week.getCurrentJournee();
    _.forEach(this.playersStats, (value: any) => {
      for (let i = 1; i < currentWeek2; i = i + 1) {
        const slicedParticipation = value.victoryHistory.filter((particiaption: any) => particiaption.weekName <= i);
        if (slicedParticipation.length > 0) {
          const result = _.chain(slicedParticipation)
            .groupBy('divisionCategory')
            .values()
            .map((group: any) => ({ 'divisionCategory': group[0].divisionCategory, 'played': group.length }))
            .orderBy(['played', 'divisionCategory'], ['desc', 'desc'])
            .head()
            .value();

          const mainRanking: RankingCategories = this.config.categories.find((ranking: RankingCategories) => ranking.name === result.divisionCategory);
          const matchsToCount = slicedParticipation.filter((participation: any) => {
            const matchCategory: RankingCategories = this.config.categories.find((ranking: RankingCategories) => ranking.name === participation.divisionCategory);

            return mainRanking.id >= matchCategory.id;
          });

          const points = _.reduce(matchsToCount, (acc: number, current: any) => {
            return acc + current.pointsWon;
          }, 0);
          this.playersStats[value.uniqueIndex].rankingEvolution.push({
            'weekName': i,
            'rankingCategory': result.divisionCategory,
            'points': points,
          });
        }
      }
    });
  }


  private processPlayersFromMatchs(matchs: TeamMatchEntry[]): void {
    for (const match of matchs) {
      //console.log(JSON.stringify(match));
      if (match.MatchDetails.DetailsCreated) {
        const divisionId = match.DivisionId;
        const weekName = match.WeekName;
        const homeClub = match.HomeClub;
        const awayClub = match.AwayClub;
        const forfeitFilter = (player: TeamMatchPlayerEntry) => _.get(player, 'IsForfeited', false);
        const forfeitAway = match.MatchDetails.AwayPlayers.Players.filter(forfeitFilter).length;
        const forfeitHome = match.MatchDetails.HomePlayers.Players.filter(forfeitFilter).length;

        //Process HomePlayer
        if (!match.IsHomeForfeited) {
          for (const player of match.MatchDetails.HomePlayers.Players) {
            if (!player.IsForfeited) {
              this.upsertPlayerStat(player, divisionId, weekName, homeClub, forfeitAway);
            }
          }
        }

        //Process AwayPlayer
        if (!match.IsAwayForfeited) {
          for (const player of match.MatchDetails.AwayPlayers.Players) {
            if (!player.IsForfeited) {
              this.upsertPlayerStat(player, divisionId, weekName, awayClub, forfeitHome);
            }
          }
        }

      }
    }
  }

  private upsertPlayerStat(player: TeamMatchPlayerEntry, division: number, weekname: number, club: string, forfeit: number) {
    const newVictoryHistory = {
      'divisionIndex': division,
      'divisionCategory': this.mapDivisionIdToCategory(division).name,
      'weekName': weekname,
      'victoryCount': player.VictoryCount,
      'forfeit': forfeit,
      'pointsWon': this.mapVictoryToPoint(player.VictoryCount + forfeit),
    };

    if (!_.has(this.playersStats, player.UniqueIndex)) {
      //Not yet found in stats
      const newPlayerStats = {
        'uniqueIndex': player.UniqueIndex,
        'name': `${player.LastName} ${player.FirstName}`,
        'clubIndex': club,
        'victoryHistory': [],
        'rankingEvolution': [],
      };
      this.playersStats[player.UniqueIndex] = newPlayerStats;
    }

    const alreadyExistingResult = this.playersStats[player.UniqueIndex].victoryHistory.find((history: any) => {
      return history.weekName === weekname;
    });
    if (!alreadyExistingResult) {
      this.playersStats[player.UniqueIndex].victoryHistory.push(newVictoryHistory);
    }
  }

  private mapVictoryToPoint(victory: number): number {
    switch (victory) {
      case 4:
        return 5;
      default:
        return victory;
    }
  }

  private mapDivisionIdToCategory(divisionId: number): RankingCategories {
    return this.config.categories.find((category: RankingCategories) => {
      return category.divisions.indexOf(divisionId) > -1;
    });
  }

  private getAllClubs(): string[] {
    return _.uniq(_.flatten(this.config.rankings.map((ranking: RankingItem) => ranking.clubs)));
  }

  private getAllDivisions(): number[] {
    return _.uniq(_.flatten(this.config.categories.map((categories: RankingCategories) => categories.divisions)));
  }

  private async downloadMatchsOfClubForWeek(club: string, week: number): Promise<TeamMatchEntry[]> {
    const getMatchRequest = new GetMatchesRequest();
    getMatchRequest.WeekName = week.toString();
    getMatchRequest.Club = club;
    getMatchRequest.WithDetails = true;

    return this.tabt.getMatches(getMatchRequest).then((matchs: GetMatchesResponse) => matchs.TeamMatchesEntries);
  }

  private displayRankigs() {

    const header = ['Position', 'Unique Index', 'Nom', 'Club', 'Points'];

    for (const week of this.rankings) {
      console.log(`\nJournée ${week.week}`);
      for (const ranking of week.rankings) {
        console.log(`\n\n\n---------- Classement ${ranking.name} ----------`);
        console.log(`------------------------------------------------`);
        for (const category of ranking.categories) {
          console.log(`\n-- Catégorie ${category.name}`);

          let table = new Table({
            head: header,
          });

          for (const player of category.players) {
            table.push([player.position, player.uniqueIndex, player.name, player.clubIndex, player.points]);
          }
          console.log(table.toString());
        }
      }
      console.log(`-----------------------------------------------------------`);
      console.log(`-----------------------------------------------------------`);
    }
  }
}
