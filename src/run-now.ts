import { Config } from './config';

import { sendErrorMail } from './helpers/mail';
import { Week } from './helpers/week';
import { TopCalculator } from './top-6';
import { WeekSummary } from './week-summary';
import { FirebaseAdmin } from './firebase/firebase-admin';

const week = new Week();
const top: TopCalculator = new TopCalculator();
const summary: WeekSummary = new WeekSummary();
const firebase: FirebaseAdmin = new FirebaseAdmin();

let dayJob: Promise<any>;

dayJob = Promise.all([top.start(), summary.start()])
  .then((results: [any, string]) => {
    const topText = top.printRankings(week.getCurrentJournee());
    firebase.saveTop(results[0], top.playersStats);

    Config.logger.info(topText);
    //return sendMail(summaryText, topText);

    return Promise.resolve([results[1], 1]);
  })
  .then(([response, body]: [any, any]) => {
    Config.logger.info(`Email send!`);
    Config.logger.info(`Response: ${body}`);
    Config.logger.info(`Status code: ${response.statusCode}`);
  })
  .catch((err: any) => {
    Config.logger.error(`Email sending error : ${err}`);

    return sendErrorMail(err);
  });


dayJob.then(() => {
  Config.logger.info(`Finished`);
});



