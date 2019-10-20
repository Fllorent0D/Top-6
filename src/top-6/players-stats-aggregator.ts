import { assign, chain, filter, find, forEach, get, has, includes, reduce, set, toNumber } from 'lodash';
import { Config, IConfigCategoryRanking } from '../config';
import { ClubEntry, IndividualMatchResultEntry, TeamMatchEntry, TeamMatchPlayerEntry } from '../tabt-models';
import { MatchResult } from './ranking.model';

export interface MatchItem {
  divisionIndex: number
  divisionCategory: string,
  weekName: number,
  victoryCount: number,
  forfeit: number,
  pointsWon: number,
  matchId: string,
}

export interface RankingEvolution {
  weekName: number,
  rankingCategory: string,
  points: number
}

export interface PlayerStats {
  uniqueIndex: number;
  name: string;
  clubIndex: string;
  clubName: string;
  victoryHistory: MatchItem[];
  rankingEvolution: RankingEvolution[];

}

export class PlayersStatsAggregator {
  public currentWeek: number;
  public playersStats: { [index: string]: PlayerStats };
  public errorsDetected: string[];
  public noticesDetected: string[];

  constructor() {
    this.playersStats = {};
    this.errorsDetected = [];
    this.noticesDetected = [];
  }

  public attributeDivisionToEachPlayers() {
    forEach(this.playersStats, (value: any) => {
      // Calculate in with category the player is categorized for each week
      for (let i = 1; i <= this.currentWeek; i = i + 1) {

        //We take the participation we are interested in
        const slicedParticipation = value.victoryHistory.filter((participation: any) => participation.weekName <= i);

        if (slicedParticipation.length > 0) {
          // Grouped by division category and
          const result = chain(slicedParticipation)
            .groupBy('divisionCategory')
            .values()
            .map((group: any) => ({ 'divisionCategory': group[0].divisionCategory, 'played': group.length }))
            .orderBy(['played', 'divisionCategory'], ['desc', 'desc'])
            .head()
            .value();

          // Find the config category from the main category
          const mainRanking: IConfigCategoryRanking = find(Config.categories, { 'name': result.divisionCategory }) as IConfigCategoryRanking;

          // filter participation from the main category
          const matchesToCount = slicedParticipation.filter((participation: any) => {
            const matchCategory: IConfigCategoryRanking = Config.categories.find((ranking: IConfigCategoryRanking) => ranking.name === participation.divisionCategory);

            return mainRanking.id >= matchCategory.id;
          });

          // Count points
          const points: number = reduce(matchesToCount, (acc: number, current: any) => {
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
      const weekName = toNumber(match.WeekName);
      const homeClub = match.HomeClub;
      const awayClub = match.AwayClub;
      const homeTeam = match.HomeTeam;
      const awayTeam = match.AwayTeam;
      const detailsCreated = match.MatchDetails.DetailsCreated;

      const isBye = (hClub: string, hTeam: string, aClub: string, aTeam: string, hasDetails: boolean): boolean => {
        return ((hClub === '-' && hTeam.indexOf('Bye') > -1) ||
          (aClub === '-' && aTeam.indexOf('Bye') > -1))
          && hasDetails;
      };


      //If Home or Away is BYE, we have to count players stats and count 5 points
      if (isBye(homeClub, homeTeam, awayClub, awayTeam, detailsCreated)) {
        //Get players that are on the list
        const players = (homeClub === '-' && homeTeam.indexOf('Bye') > -1) ? get(match, 'MatchDetails.AwayPlayers.Players', []) : get(match, 'MatchDetails.HomePlayers.Players', []);
        const club = (homeClub === '-' && homeTeam.indexOf('Bye') > -1) ? awayClub : homeClub;

        for (const player of players) {
          this.upsertPlayerStat(player, divisionId, weekName, club, match.MatchId, 5);
        }

      } else if (detailsCreated) {
        //Process HomePlayer(s) if it's in the settings
        if (Config.getAllClubs().indexOf(homeClub) > -1) {
          this.processPlayersFromMatch(match, 'Home');
        }
        //Process AwayPlayer(s) if it's in the settings
        if (Config.getAllClubs().indexOf(awayClub) > -1) {
          this.processPlayersFromMatch(match, 'Away');
        }
      }
    }
  }

  public attributeClubNameToEachPlayers(clubs: ClubEntry[]) {
    forEach(this.playersStats, (value: PlayerStats) => {
      this.playersStats[value.uniqueIndex] = {
        ...this.playersStats[value.uniqueIndex],
        clubName: get(find(clubs, { 'UniqueIndex': value.clubIndex }), 'Name', '')
      };
    });
  }

  public overridePlayerHistory() {
    //Loop on all the players to override
    for (const playerIdToOverride of Object.keys(Config.overridePlayerVictoryHistory)) {
      //Get matches to override and existing data
      const newMatches: any[] = get(Config.overridePlayerVictoryHistory, playerIdToOverride, []);
      const playerStat: PlayerStats = get(this.playersStats, playerIdToOverride);
      if(!playerStat){
        Config.logger.error('Trying to override player that hasn\'t played yet');
        continue;
      }

      //Loop on all matches
      for (const matchToOverride of newMatches) {
        //Get existing match and merge it
        const oldResult: MatchItem = get(playerStat, 'victoryHistory', [] as MatchItem[]).find((match: MatchItem) => match.weekName === matchToOverride.weekName);
        if(!playerStat){
          Config.logger.error(`Trying to override match of player ${playerIdToOverride} weekname ${matchToOverride.weekName} but this player hasn't played on that week`)
        }

        const newResult: MatchItem = assign(oldResult, matchToOverride);

        //Put the new result in place
        const historyFiltered: MatchItem[] = get(playerStat, 'victoryHistory', [] as MatchItem[]).filter((match: MatchItem) => match.weekName !== matchToOverride.weekName);
        historyFiltered.push(newResult);

        set(playerStat, 'victoryHistory', historyFiltered);
      }
      set(this.playersStats, playerIdToOverride, playerStat);
    }
  }

  // tslint:disable-next-line:cyclomatic-complexity
  private processPlayersFromMatch(match: TeamMatchEntry, position: string) {
    const players: TeamMatchPlayerEntry[] = get(match, `MatchDetails.${position}Players.Players`);
    const divisionId: number = get(match, 'DivisionId');
    const weekName: number = toNumber(get(match, 'WeekName'));
    const club: string = get(match, `${position}Club`);
    const opposite: string = (position === 'Home') ? 'Away' : 'Home';
    const oppositePlayers: TeamMatchPlayerEntry[] = get(match, `MatchDetails.${opposite}Players.Players`, []);
    const lghForfeitOpposite: number = filter(oppositePlayers, 'IsForfeited').length;
    const oppositeIsFG: boolean = get(match, `Is${opposite}Forfeited`, false) && get(match, `Is${opposite}Withdrawn`, 'N') === '1';

    //Check if we want to override some match because agility is too important
    const toOverride: MatchResult = Config.overrideMatchResults.find((matchResult: MatchResult) => matchResult.matchId === match.MatchId);
    if (toOverride) {
      for (const player of players) {
        player.VictoryCount = get(toOverride, `${position.toLowerCase()}VictoryCount`, 0);
        this.upsertPlayerStat(player, divisionId, weekName, club, match.MatchId, get(toOverride, `${position.toLowerCase()}Forfeit`, 0));
      }

      return;
    }

    // position team is FG => Just skip it
    if (get(match, `Is${position}Forfeited`, false) &&
      get(match, `Is${position}Withdrawn`, 'N') === '1') {
      return;
    }

    //Modified score 'Score Modifié" by the admin
    if (match.Score.includes('sm')) {
      const cleanedScore = match.Score.replace(' sm', '');
      const scores = cleanedScore.split('-').map(Number);
      const positionScore = (position === 'Home') ? scores[0] : scores[1];
      const oppositeScore = (position === 'Home') ? scores[1] : scores[0];

      //Check if the results of the position team is the best score possible
      if (positionScore === (positionScore + oppositeScore) && oppositeScore === 0) {
        for (const player of players) {
          player.VictoryCount = 0;
          this.upsertPlayerStat(player, divisionId, weekName, club, match.MatchId, 5);
        }

        return;
      } else {
        this.addNotice(`Le match ${match.MatchId} a un score modifié, mais le score n'est pas le score maximum de défaite. Aucune décision prise pour le top6.`);
      }
    }

    // Opposite is forfeit => 5 points
    if (get(match, `Is${opposite}Forfeited`, false) === true) {
      for (const player of players) {
        //Can be possible that a team has been burnt and remove so results are still set
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
          if (get(match, `Is${opposite}Forfeited`, false)) {
            if (get(player, `VictoryCount`)) {
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
          if (get(match, `Is${opposite}Withdrawn`, 'N') === 'N' &&
            get(match, `Is${position}Withdrawn`, 'N') === 'N' &&
            get(match, `Is${position}Forfeited`, false) === false
          ) {
            this.addError(`Match : ${match.MatchId} : ${player.FirstName} ${player.LastName} ${player.UniqueIndex} (${club}) est marqué WO pour tous ses matchs, mais n'est pas marqué WO dans la liste des joueurs de la feuille de matchs`);

            return;
          }

          if (get(match, `Is${opposite}Withdrawn`, 'N') === '1') {
            this.upsertPlayerStat(player, divisionId, weekName, club, match.MatchId, 4);
          }
        }
      }
    }
  }

  private upsertPlayerStat(player: TeamMatchPlayerEntry, division: number, weekname: number, club: string, matchId: string, forfeit: number) {
    if (!get(player, 'UniqueIndex')) {
      return;
    }

    const newVictoryHistory: MatchItem = {
      'divisionIndex': division,
      'divisionCategory': Config.mapDivisionIdToCategory(toNumber(division)).name,
      'weekName': weekname,
      'victoryCount': player.VictoryCount || 0,
      'forfeit': forfeit || 0,
      'pointsWon': Config.mapVictoryToPoint(get(player, 'VictoryCount', 0) + forfeit),
      'matchId': matchId
    };

    if (!has(this.playersStats, player.UniqueIndex)) {
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

    const alreadyExistingResult: MatchItem = find(this.playersStats[player.UniqueIndex].victoryHistory, { 'weekName': weekname });

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

    return chain(individualMatches)
      .filter((individual: IndividualMatchResultEntry) => includes(get(individual, label, []), playerUniqueIndex))
      .filter((playerMatch: IndividualMatchResultEntry[]) => get(playerMatch, oppositeToCheck, false))
      .size()
      .value();
  }

  private checkIfPlayerShouldBeForfeited(uniqueIndex: number, individualMatchResults: IndividualMatchResultEntry[], position: string): boolean {
    const label = `${position}PlayerUniqueIndex`;
    const forfeitLabel = `Is${position}Forfeited`;

    return chain(individualMatchResults)
      .filter((individual: IndividualMatchResultEntry) => includes(get(individual, label, []), uniqueIndex))
      .filter((playerMatch: IndividualMatchResultEntry[]) => get(playerMatch, forfeitLabel, false))
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
