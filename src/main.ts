import * as schedule from 'node-schedule';
import { Config } from './config';

import * as admin from 'firebase-admin';
import { FirebaseAdmin } from './firebase/firebase-admin';
import { sendErrorMail, sendMail } from './helpers/mail';
import { TopCalculator } from './top-6';
import { WeekSummary } from './week-summary';
import MessagingTopicResponse = admin.messaging.MessagingTopicResponse;

const firebase: FirebaseAdmin = new FirebaseAdmin();
const rule = new schedule.RecurrenceRule();
rule.dayOfWeek = [0, 4];
rule.hour = [21, 8];
rule.minute = 0;

const job = schedule.scheduleJob(rule, (fireDate: Date) => {

  const currentDay: number = new Date().getDay();
  const currentHour: number = new Date().getHours();

  if ((currentDay === 0 && currentHour === 8) || (currentDay === 4 && currentHour === 21)) {
    return;
  }

  Config.logger.info(`Job starting at supposed to run at ${fireDate}, but actually ran at ${new Date()}`);

  const top: TopCalculator = new TopCalculator();
  const summary: WeekSummary = new WeekSummary();

  if (currentDay === 0) {
    Promise.all([summary.start(), top.start()])
      .then(([summaryTexts, topTexts]: [{ name: string; text: string }[], { name: string; text: string }[]]) => {
        const errors = top.playersStats.errorsDetected;
        const notices = top.playersStats.noticesDetected;
        //[{ 'email': 'fcardoen@gmail.com', 'name': 'Florent Cardoen' }]

        return sendMail(summaryTexts, topTexts, errors, notices)
          .then(([response, body]: [any, any]) => {
            Config.logger.info(`Email send!`);
            Config.logger.info(`Response: ${body}`);
            Config.logger.info(`Status code: ${response.statusCode}`);
            Config.logger.info(`Job finished. Next invocation at ${job.nextInvocation()}`);

          });
      })
      .catch((err: any) => {
        Config.logger.error(`Email sending error : ${err}`);

        return sendErrorMail(err);
      });
  } else {

    top.start()
      .then(() => {
        firebase.saveTop(top.rankings, top.playersStats);

        return FirebaseAdmin.sendNotification()
          .then((notification: MessagingTopicResponse) => {
            Config.logger.info(`Notification sent ${notification}`);
            Config.logger.info(`Job finished. Next invocation at ${job.nextInvocation()}`);
          });
      })
      .catch((err: any) => {
        Config.logger.error(`Email sending error : ${err}`);

        return sendErrorMail(err);
      });
  }
});

Config.logger.info(`Job initialized. First invocation at ${job.nextInvocation()}`);
