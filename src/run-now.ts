import { Config } from './config';

import { sendErrorMail, sendMail } from './helpers/mail';
import { TopCalculator } from './top-6';
import { WeekSummary } from './week-summary';

const top: TopCalculator = new TopCalculator();
const summary: WeekSummary = new WeekSummary();

let dayJob: Promise<any>;

dayJob = Promise.all([top.start(), summary.start()])
  .then(([topTexts, summaryTexts]: [{ name: string; text: string }[], { name: string; text: string }[]]) => {
    // const topText = top.printRankings(week.getCurrentJournee());
    //firebase.saveTop(top.rankings, top.playersStats);
    //Config.logger.info(topTexts);
    const errors = top.playersStats.errorsDetected;
    const notices = top.playersStats.noticesDetected;
//[{ 'email': 'fcardoen@gmail.com', 'name': 'Florent Cardoen' }]
    return sendMail(summaryTexts, topTexts, errors, notices);
    //return Promise.resolve([results[1], 1]);
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



