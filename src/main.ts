import * as schedule from 'node-schedule';
import { Config } from './config';

import * as admin from 'firebase-admin';
import { FirebaseAdmin } from './firebase/firebase-admin';
import { sendErrorMail, sendMail } from './helpers/mail';
import { TopCalculator } from './top-6';
import { WeekSummary } from './week-summary';
import MessagingTopicResponse = admin.messaging.MessagingTopicResponse;

const rule = new schedule.RecurrenceRule();
rule.dayOfWeek = [0, 4];
rule.hour = 21;
rule.minute = 0;

const job = schedule.scheduleJob(rule, (fireDate: Date) => {

  Config.logger.info(`Job starting at supposed to run at ${fireDate}, but actually ran at ${new Date()}`);

  const top: TopCalculator = new TopCalculator();
  const summary: WeekSummary = new WeekSummary();

  const currentDay: number = new Date().getDay();

  if (currentDay === 0) {
    Promise.all([summary.start(), top.start()])
      .then(([topTexts, summaryTexts]: [{ name: string; text: string }[], { name: string; text: string }[]]) => {
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
  } else if (currentDay === 4) {
    const firebase: FirebaseAdmin = new FirebaseAdmin();

    top.start()
      .then((tops: any) => {
        firebase.saveTop(tops.rankings, tops.playersStats);

        return FirebaseAdmin.sendNotification()
          .then((notification: MessagingTopicResponse) => {
            Config.logger.info(`Notification sent ${notification}`);
            Config.logger.info(`Job finished. Next invocation at ${job.nextInvocation()}`);
          });
      });
  }
});

Config.logger.info(`Job initialized. First invocation at ${job.nextInvocation()}`);
