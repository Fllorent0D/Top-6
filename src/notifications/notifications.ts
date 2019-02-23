import * as admin from 'firebase-admin';
import { get } from 'lodash';
import * as schedule from 'node-schedule';
import * as promisify from 'promisify-es6';
import { Config } from '../config';
import { FirebaseAdmin } from '../firebase/firebase-admin';
import { TeamMatchEntry } from '../tabt-models';
import { TabTRequestor } from '../TabTRequestor';
import DataSnapshot = admin.database.DataSnapshot;

export class Notifications {
  private tabtRequestor: TabTRequestor;
  private firebase: admin.database.Database = FirebaseAdmin.GetDatabase();
  private interval: NodeJS.Timer;
  private notificationAlreadySentForMatches: string[];
  private divisionsRef: admin.database.Reference;
  private notificationSentRef: admin.database.Reference;
  private divisionsOfTheDay: number[];
  private divisionsRejected: number[];
  private currentIndex: number;
  private readonly pushNotificationFlag: any;

  constructor() {
    this.notificationAlreadySentForMatches = [];
    this.tabtRequestor = new TabTRequestor();
    this.currentIndex = 0;
    this.divisionsOfTheDay = [];
    this.divisionsRejected = [];
    this.divisionsRef = this.firebase.ref('notifications/subscribedTo');
    this.notificationSentRef = this.firebase.ref('notifications/sent');
    this.pushNotificationFlag = promisify(this.notificationSentRef.push);

    this.initDivisionsObservable();
    this.initResetJob();
    this.startInterval();
  }


  public startInterval() {
    // Division check result in one hour
    const intervalTime = 3600000 / this.divisionsOfTheDay.length;
    Config.logger.info('Start interval');

    this.interval = setInterval(async () => {
      return this.checkForNotifications();
    }, intervalTime);
  }

  private stopInterval() {
    Config.logger.info('Stop Interval');

    clearInterval(this.interval);
  }


  private async checkForNotifications() {
    if (this.divisionsOfTheDay.length === 0) {
      return;
    }

    const division = this.divisionsOfTheDay[this.currentIndex];
    Config.logger.info(`Check for notification for division ${division}`);

    let matches = await this.tabtRequestor.getMatchesOfDivisionForToday(division);
    matches = matches.filter((match: TeamMatchEntry) =>
      this.notificationAlreadySentForMatches.indexOf(match.MatchId) === -1 &&
      get(match, 'Score') &&
      get(match, 'IsHomeForfeited', false) === false &&
      get(match, 'IsAwayForfeited', false) === false
    );

    if (matches) {
      for (const match of matches) {
        await FirebaseAdmin.SendNotificationToTopic(`results_division_${division}`, `${match.HomeTeam} - ${match.AwayTeam} : rencontre terminée`, `Score final ${match.Score}`);

        Config.logger.info(`Sending notification for match ${match.MatchId}`);
        try {
          await this.pushNotificationFlag(match.MatchId);
          Config.logger.info(`Flag for match ${match.MatchId} saved into the database`);
        } catch (err) {
          Config.logger.error(err);
        }

      }
    }

    this.currentIndex = this.currentIndex + 1;
    if (this.currentIndex >= this.divisionsOfTheDay.length) {
      this.currentIndex = 0;
    }

    return Promise.resolve();
  }


  private initDivisionsObservable() {

    this.divisionsRef.on('value', async (snapshot: DataSnapshot) => {
      const divisions = snapshot.val();
      await this.importDivisionsForToday(divisions);
    }, (e: Error) => Config.logger.error(e));

    this.notificationSentRef.on('value', (snapshot: DataSnapshot) => {
      this.notificationAlreadySentForMatches = [];
      snapshot.forEach((childSnapshot: DataSnapshot) => {
        this.notificationAlreadySentForMatches.push(childSnapshot.val());

        return false;
      });
    }, (e: Error) => Config.logger.error(e));
  }

  private async resetDivisionOfTheDay() {
    this.divisionsOfTheDay = [];
    this.divisionsRejected = [];
    this.currentIndex = 0;

    this.divisionsRef.once('value', async (snapshot: DataSnapshot) => {
      const divisions = snapshot.val();
      await this.importDivisionsForToday(divisions);
    });

  }

  private async importDivisionsForToday(divisions: any[]) {
    this.stopInterval();
    for (const division of divisions) {
      if (this.divisionsRejected.indexOf(division.id) === -1 &&
        this.divisionsOfTheDay.indexOf(division.id) === -1 &&
        await this.isDivisionInterestingForToday(division.id)) {
        this.divisionsOfTheDay.push(division.id);
      } else {
        this.divisionsRejected.push(division.id);
      }
    }
    this.startInterval();
  }

  private async isDivisionInterestingForToday(divisionId: number): Promise<boolean> {
    let matches = await this.tabtRequestor.getMatchesOfDivisionForToday(divisionId);
    matches = matches.filter((match: TeamMatchEntry) =>
      get(match, 'IsHomeForfeited', false) === false &&
      get(match, 'IsAwayForfeited', false) === false
    );
    const isInteresting = matches.length > 0;
    Config.logger.info(`Division ${divisionId} is interesting : ${isInteresting}`);

    return isInteresting;
  }


  private initResetJob() {
    const rule = new schedule.RecurrenceRule();
    rule.hour = 1;
    rule.minute = 0;


    setTimeout(async () => {
      Config.logger.info('Reset');
      await this.resetDivisionOfTheDay();

    }, 60000);

    const job = schedule.scheduleJob(rule, async () => {
      await this.resetDivisionOfTheDay();
      Config.logger.info(`Reset job finished. Next invocation at ${job.nextInvocation()}`);
    });
    Config.logger.info(`Reset job initialized. First invocation at ${job.nextInvocation()}`);
  }
}
