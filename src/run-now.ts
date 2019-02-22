import { Config } from './config';

import * as admin from 'firebase-admin';
import { FirebaseAdmin } from './firebase/firebase-admin';
import { sendErrorMail, sendMail } from './helpers/mail';
import { TopCalculator } from './top-6';
import { WeekSummary } from './week-summary';
import MessagingTopicResponse = admin.messaging.MessagingTopicResponse;

const top: TopCalculator = new TopCalculator();
const summary: WeekSummary = new WeekSummary();

const firebase: FirebaseAdmin = new FirebaseAdmin();
const currentDay: number = new Date().getDay();

Promise.all([top.start(), summary.start()])
  .then(([topTexts, summaryTexts]: [{ name: string; text: string }[], { name: string; text: string }[]]) => {

    if (currentDay === 0){
      const errors = top.playersStats.errorsDetected;
      const notices = top.playersStats.noticesDetected;
      //[{ 'email': 'fcardoen@gmail.com', 'name': 'Florent Cardoen' }]

      return sendMail(summaryTexts, topTexts, errors, notices)
        .then(([response, body]: [any, any]) => {
          Config.logger.info(`Email send!`);
          Config.logger.info(`Response: ${body}`);
          Config.logger.info(`Status code: ${response.statusCode}`);
        });
    } else {
      firebase.saveTop(top.rankings, top.playersStats);

      return FirebaseAdmin.sendNotification()
        .then((notification: MessagingTopicResponse) => {
          Config.logger.info(`Notification sent ${notification}`);
        });
    }
  })
  .catch((err: any) => {
    Config.logger.error(`Error calculation top : ${err}`);

    return sendErrorMail(err);
  });



