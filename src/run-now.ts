import * as admin from 'firebase-admin';
import { Config } from './config';
import { facebookPoster } from './firebase/facebook';
//import { facebookPoster } from './firebase/facebook';
import { FirebaseAdmin } from './firebase/firebase-admin';
import { sendErrorMail, sendMail } from './helpers/mail';
import { TopCalculator } from './top-6';
import { WeekSummary } from './week-summary';
import MessagingTopicResponse = admin.messaging.MessagingTopicResponse;

const start = () => {
  const top: TopCalculator = new TopCalculator();
  const summary: WeekSummary = new WeekSummary();

  const firebase: FirebaseAdmin = new FirebaseAdmin();
  const currentDay: number = new Date().getDay();
  const currentHour: number = new Date().getHours();

  if ((currentDay === 0 && currentHour === 8) || (currentDay === 4 && currentHour === 21)) {
    return;
  }

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
          });
      })
      .catch((err: any) => {
        Config.logger.error(`Email sending error : ${err}`);

        return sendErrorMail(err);
      });
  } else {

    top.start()
      .then((topTexts: { name: string; text: string }[]) => {
        firebase.saveTop(top.rankings, top.playersStats);
        facebookPoster.postTopOnFacebook(topTexts.find((t: { name: string; text: string }) => t.name === 'Verviers').text);

        return FirebaseAdmin.sendNotification()
          .then((notification: MessagingTopicResponse) => {
            Config.logger.info(`Notification sent ${notification}`);
          });
      })
      .catch((err: any) => {
        Config.logger.error(`Email sending error : ${err}`);

        return sendErrorMail(err);
      });
  }
};

start();

