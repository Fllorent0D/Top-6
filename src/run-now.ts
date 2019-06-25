import { Config } from './config';
//import { facebookPoster } from './firebase/facebook';
import { FirebaseAdmin } from './firebase/firebase-admin';
import { sendErrorMail, sendMail } from './helpers/mail';
import { TopCalculator } from './top-6';
import { WeekSummary } from './week-summary';

const top: TopCalculator = new TopCalculator();
const summary: WeekSummary = new WeekSummary();

const firebase: FirebaseAdmin = new FirebaseAdmin();
const currentDay: number = new Date().getDay();

Promise.all([top.start(), summary.start()])
  .then(([topTexts, summaryTexts]: [{ name: string; text: string }[], { name: string; text: string }[]]) => {

    if (currentDay === 0) {
      const errors = top.playersStats.errorsDetected;
      const notices = top.playersStats.noticesDetected;
      //[{ 'email': 'fcardoen@gmail.com', 'name': 'Florent Cardoen' }]

      return sendMail(summaryTexts, topTexts, errors, notices, [{ 'email': 'fcardoen@gmail.com', 'name': 'Florent Cardoen' }])
        .then(([response, body]: [any, any]) => {
          Config.logger.info(`Email send!`);
          Config.logger.info(`Response: ${body}`);
          Config.logger.info(`Status code: ${response.statusCode}`);
        });
    } else {
      // facebookPoster.postTopOnFacebook(topTexts.find((t: { name: string; text: string }) => t.name === 'Verviers').text);
      // FirebaseAdmin.sendNotification();

      return firebase.saveTop(top.rankings, top.playersStats);
      //console.log(topTexts[1].text);
    }
  })
  .catch((err: any) => {
    Config.logger.error(`Error calculation top : ${err}`);

    return sendErrorMail(err);
  });


