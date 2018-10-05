import * as _ from 'lodash';

import { Config, IConfigCategoryRanking } from './config';
import { TeamMatchEntry } from './models/TeamMatchEntry';
import { TeamMatchPlayerEntry } from './models/TeamMatchPlayerEntry';

export class PlayersStats {
  public currentWeek: number;
  public readonly playersStats: any;

  constructor(){
    this.playersStats = {};
  }

  public attributeDivisionToEachPlayers() {
    _.forEach(this.playersStats, (value: any) => {
      // Calculate in with category the player is categorized for each week
      for (let i = 1; i < this.currentWeek; i = i + 1) {

        //We take the participation we are interested in
        const slicedParticipation = value.victoryHistory.filter((participation: any) => participation.weekName <= i);

        if (slicedParticipation.length > 0) {
          // Grouped by division category and
          const result = _.chain(slicedParticipation)
            .groupBy('divisionCategory')
            .values()
            .map((group: any) => ({ 'divisionCategory': group[0].divisionCategory, 'played': group.length }))
            .orderBy(['played', 'divisionCategory'], ['desc', 'desc'])
            .head()
            .value();
          console.log(result);

          // Find the config category from the main category
          const mainRanking: IConfigCategoryRanking = _.find(Config.categories, {'name': result.divisionCategory});

          // filter participation from the main category
          const matchesToCount = slicedParticipation.filter((participation: any) => {
            const matchCategory: IConfigCategoryRanking = Config.categories.find((ranking: IConfigCategoryRanking) => ranking.name === participation.divisionCategory);

            return mainRanking.id >= matchCategory.id;
          });

          // Count points
          const points: number = _.reduce(matchesToCount, (acc: number, current: any) => {
            return acc + current.pointsWon;
          }, 0);

          // Push the new ranking evolution
          this.playersStats[value.uniqueIndex].rankingEvolution.push({
            'weekName': i,
            'rankingCategory': result.divisionCategory,
            'points': points,
          });
        }
      }
    });
  }

  public processPlayersFromMatches(matches: TeamMatchEntry[]): void {
    for (const match of matches) {
      if (match.MatchDetails.DetailsCreated) {
        const divisionId = match.DivisionId;
        const weekName = match.WeekName;
        const homeClub = match.HomeClub;
        const awayClub = match.AwayClub;
        const forfeitFilter = (player: TeamMatchPlayerEntry) => _.get(player, 'IsForfeited', false);
        const forfeitAway = match.MatchDetails.AwayPlayers.Players.filter(forfeitFilter).length;
        const forfeitHome = match.MatchDetails.HomePlayers.Players.filter(forfeitFilter).length;
        // TO DO check if club in region

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
      // TO DO Check for BYE
    }
  }

  private upsertPlayerStat(player: TeamMatchPlayerEntry, division: number, weekname: number, club: string, forfeit: number) {
    const newVictoryHistory = {
      'divisionIndex': division,
      'divisionCategory': Config.mapDivisionIdToCategory(division).name,
      'weekName': weekname,
      'victoryCount': player.VictoryCount,
      'forfeit': forfeit,
      'pointsWon': Config.mapVictoryToPoint(player.VictoryCount + forfeit),
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

    const alreadyExistingResult = _.find(this.playersStats[player.UniqueIndex].victoryHistory, {'weekName': weekname});

    if (!alreadyExistingResult) {
      this.playersStats[player.UniqueIndex].victoryHistory.push(newVictoryHistory);
    }
  }

}
