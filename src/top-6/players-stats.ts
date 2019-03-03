import * as _ from 'lodash';

import { Config, IConfigCategoryRanking } from '../config';
import { ClubEntry, IndividualMatchResultEntry, TeamMatchEntry, TeamMatchPlayerEntry } from '../tabt-models';

export interface IMatchItem {
  divisionIndex: number
  divisionCategory: string,
  weekName: number,
  victoryCount: number,
  forfeit: number,
  pointsWon: number,
  matchId: string,
}

export interface IRankingEvolution {
  weekName: number,
  rankingCategory: string,
  points: number
}

export interface IPlayerStats {
  uniqueIndex: number;
  name: string;
  clubIndex: string;
  clubName: string;
  victoryHistory: IMatchItem[];
  rankingEvolution: IRankingEvolution[];

}


export class PlayersStats {
  public currentWeek: number;
  public playersStats: { [index: string]: IPlayerStats };
  public errorsDetected: string[];
  public noticesDetected: string[];

  constructor() {
    this.playersStats = {};
    this.errorsDetected = [];
    this.noticesDetected = [];
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

          // Find the config category from the main category
          const mainRanking: IConfigCategoryRanking = _.find(Config.categories, { 'name': result.divisionCategory }) as IConfigCategoryRanking;

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
            'points': points
          });
        }
      }
    });
  }

  public processPlayersFromMatches(matches: TeamMatchEntry[]): void {
    for (const match of matches) {
      const divisionId = match.DivisionId;
      const weekName = match.WeekName;
      const homeClub = match.HomeClub;
      const awayClub = match.AwayClub;

      if (((homeClub === '-' && match.HomeTeam.indexOf('Bye') > -1) || (awayClub === '-' && match.AwayTeam.indexOf('Bye') > -1))
        && _.get(match, 'MatchDetails.DetailsCreated', false)) {
        //If Home or Away is BYE, we have to count players stats and count 5 points

        const players = (homeClub === '-' && match.HomeTeam.indexOf('Bye') > -1) ? _.get(match, 'MatchDetails.AwayPlayers.Players', []) : _.get(match, 'MatchDetails.HomePlayers.Players', []);
        const club = (homeClub === '-' && match.HomeTeam.indexOf('Bye') > -1) ? awayClub : homeClub;

        for (const player of players) {
          this.upsertPlayerStat(player, divisionId, weekName, club, match.MatchId, 5);
        }

      } else if (match.MatchDetails.DetailsCreated) {
        //Process HomePlayer(s)
        if (Config.getAllClubs().indexOf(match.HomeClub) > -1) {
          this.processPlayersFromMatch(match, 'Home');
        }
        //Process AwayPlayer(s)
        if (Config.getAllClubs().indexOf(match.AwayClub) > -1) {
          this.processPlayersFromMatch(match, 'Away');
        }
      }
    }
  }

  public attributeClubNameToEachPlayers(clubs: ClubEntry[]) {
    _.forEach(this.playersStats, (value: IPlayerStats) => {
      this.playersStats[value.uniqueIndex] = {
        ...this.playersStats[value.uniqueIndex],
        clubName: _.get(_.find(clubs, { 'UniqueIndex': value.clubIndex }), 'Name', '')
      };
    });
  }

  private processPlayersFromMatch(match: TeamMatchEntry, position: string) {
    const players: TeamMatchPlayerEntry[] = _.get(match, `MatchDetails.${position}Players.Players`);
    const divisionId: number = _.get(match, 'DivisionId');
    const weekName: number = _.get(match, 'WeekName');
    const club: string = _.get(match, `${position}Club`);
    const opposite: string = (position === 'Home') ? 'Away' : 'Home';
    const oppositePlayers: TeamMatchPlayerEntry[] = _.get(match, `MatchDetails.${opposite}Players.Players`, []);
    const lghForfeitOpposite: number = _.filter(oppositePlayers, 'IsForfeited').length;
    const oppositeIsFG: boolean = _.get(match, `Is${opposite}Forfeited`, false) && _.get(match, `Is${opposite}Withdrawn`, 'N') === '1';

    // position team is FG
    if (_.get(match, `Is${position}Forfeited`, false) &&
      _.get(match, `Is${position}Withdrawn`, 'N') === '1') {
      return;
    }

    if (_.get(match, `Is${opposite}Forfeited`, false) === true){
      for(const player of players){
        player.VictoryCount = 0;
        this.upsertPlayerStat(player, divisionId, weekName, club, match.MatchId, 5);
      }

      return;
    }

    for (const player of players) {
      if (!player.IsForfeited || oppositeIsFG) {
        const playerShouldBeForfeited = this.checkIfPlayerShouldBeForfeited(player.UniqueIndex, match.MatchDetails.IndividualMatchResults, position);
        if (playerShouldBeForfeited === false) {

          let forfeit = 0;
          if (_.get(match, `Is${opposite}Forfeited`, false)) {
            if (_.get(player, `VictoryCount`)) {
              forfeit = lghForfeitOpposite;
              const matchPlayedForfeit = this.calculateForfeit(player.UniqueIndex, match.MatchDetails.IndividualMatchResults, position);
              if (matchPlayedForfeit !== 0 && matchPlayedForfeit > forfeit) {
                forfeit = matchPlayedForfeit;
                this.addNotice(`Match : ${match.MatchId} division ${match.DivisionId} journée ${match.WeekName} : ${player.FirstName} ${player.LastName} ${player.UniqueIndex} a un nombre de match forfeit supérieur au nombre de joueur noté forfeit. Les matchs comptés forfeits sont compts dans ce cas`);
              }
            } else {
              forfeit = 4;
            }
          } else {
            forfeit = lghForfeitOpposite;
            const matchPlayedForfeit = this.calculateForfeit(player.UniqueIndex, match.MatchDetails.IndividualMatchResults, position);
            if (matchPlayedForfeit !== 0 && matchPlayedForfeit > forfeit) {
              forfeit = matchPlayedForfeit;
              //this.addNotice(`Match : ${match.MatchId} division ${match.DivisionId} journée ${match.WeekName} : ${player.FirstName} ${player.LastName} ${player.UniqueIndex} a un nombre de match forfeit supérieur au nombre de joueur noté forfeit. Les matchs comptés forfeits sont compts dans ce cas`);
            }
          }

          this.upsertPlayerStat(player, divisionId, weekName, club, match.MatchId, forfeit);
        } else {
          if (_.get(match, `Is${opposite}Withdrawn`, 'N') === 'N' &&
            _.get(match, `Is${position}Withdrawn`, 'N') === 'N' &&
            _.get(match, `Is${position}Forfeited`, false) === false
          ) {
            this.addError(`Match : ${match.MatchId} : ${player.FirstName} ${player.LastName} ${player.UniqueIndex} (${club}) est marqué WO pour tous ses matchs, mais n'est pas marqué WO dans la liste des joueurs de la feuille de matchs`);

            return;
          }

          if (_.get(match, `Is${opposite}Withdrawn`, 'N') === '1') {
            this.upsertPlayerStat(player, divisionId, weekName, club, match.MatchId, 4);
          }
        }
      }
    }
  }


  private upsertPlayerStat(player: TeamMatchPlayerEntry, division: number, weekname: number, club: string, matchId: string, forfeit: number) {
    if (!_.get(player, 'UniqueIndex')) {
      return;
    }

    const newVictoryHistory: IMatchItem = {
      'divisionIndex': division,
      'divisionCategory': Config.mapDivisionIdToCategory(_.toNumber(division)).name,
      'weekName': weekname,
      'victoryCount': player.VictoryCount || 0,
      'forfeit': forfeit || 0,
      'pointsWon': Config.mapVictoryToPoint(_.get(player, 'VictoryCount', 0) + forfeit),
      'matchId': matchId
    };

    if (!_.has(this.playersStats, player.UniqueIndex)) {
      //Not yet found in stats
      this.playersStats[player.UniqueIndex] = {
        'uniqueIndex': player.UniqueIndex,
        'clubName': '',
        'name': `${player.LastName} ${player.FirstName}`,
        'clubIndex': club,
        'victoryHistory': [],
        'rankingEvolution': []
      };
    }

    const alreadyExistingResult: IMatchItem = _.find(this.playersStats[player.UniqueIndex].victoryHistory, { 'weekName': weekname });

    if (!alreadyExistingResult) {
      this.playersStats[player.UniqueIndex].victoryHistory.push(newVictoryHistory);
    } else {
      if (alreadyExistingResult.matchId !== matchId) {
        this.addError(`${player.FirstName} ${player.LastName} ${player.UniqueIndex} a été inscrit sur deux feuilles de match différentes à la semaine ${weekname}. Match 1 : ${alreadyExistingResult.matchId}, Match2 : ${matchId}`);
      }
    }
  }

  private calculateForfeit(playerUniqueIndex: number, individualMatches: IndividualMatchResultEntry[], position: string): number {

    const label = `${position}PlayerUniqueIndex`;
    const oppositeToCheck = (position === 'Home') ? 'IsAwayForfeited' : 'IsHomeForfeited';

    return _.chain(individualMatches)
      .filter((individual: IndividualMatchResultEntry) => _.includes(_.get(individual, label, []), playerUniqueIndex))
      .filter((playerMatch: IndividualMatchResultEntry[]) => _.get(playerMatch, oppositeToCheck, false))
      .size()
      .value();
  }

  private checkIfPlayerShouldBeForfeited(uniqueIndex: number, individualMatchResults: IndividualMatchResultEntry[], position: string): boolean {
    const label = `${position}PlayerUniqueIndex`;
    const forfeitLabel = `Is${position}Forfeited`;

    return _.chain(individualMatchResults)
      .filter((individual: IndividualMatchResultEntry) => _.includes(_.get(individual, label, []), uniqueIndex))
      .filter((playerMatch: IndividualMatchResultEntry[]) => _.get(playerMatch, forfeitLabel, false))
      .size()
      .isEqual(4)
      .value();
  }

  private addError(error: string): void {
    if (this.errorsDetected.indexOf(error) === -1) {
      Config.logger.error(error);
      this.errorsDetected.push(error);
    }
  }

  private addNotice(notice: string): void {
    if (this.noticesDetected.indexOf(notice) === -1) {
      Config.logger.info(notice);
      this.noticesDetected.push(notice);
    }
  }

}
