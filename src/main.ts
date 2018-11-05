import * as schedule from 'node-schedule';
import { Config } from './config';

import { FirebaseAdmin } from './firebase/firebase-admin';
import { sendMail } from './helpers/mail';
import { Week } from './helpers/week';
import { TopCalculator } from './top-6';
import { WeekSummary } from './week-summary';

const rule = new schedule.RecurrenceRule();
rule.dayOfWeek = [0, 1, 2];
rule.hour = 20;
rule.minute = 0;

const job = schedule.scheduleJob(rule, (fireDate: Date) => {
  Config.logger.info(`Job starting at supposed to run at ${fireDate}, but actually ran at ${new Date()}`);
  const week = new Week();
  const top: TopCalculator = new TopCalculator();
  const summary: WeekSummary = new WeekSummary();
  const firebase: FirebaseAdmin = new FirebaseAdmin();
  const currentDay: number = new Date().getDay();
  let dayJob: Promise<any>;

  if (currentDay === 0) {
    dayJob = Promise.all([summary.start(), top.start()])
      .then(([summaryText, tops]: [string, any]) => {
        firebase.saveTop(tops, top.playersStats);
        const topText = top.printRankings(week.getCurrentJournee());

        return sendMail(summaryText, topText);
      })
      .then(([response, body]: [any, any]) => {
        Config.logger.info(`Email send!`);
        Config.logger.info(`Response: ${body}`);
        Config.logger.info(`Status code: ${response.statusCode}`);
      })
      .catch((err: any) => {
        Config.logger.error(`Email sending error : ${err}`);
      });
  } else {
    dayJob = top.start().then((tops: any) => {
      firebase.saveTop(tops, top.playersStats);
    });
  }
  dayJob.then(() => {
    Config.logger.info(`Job finished. Next invocation at ${job.nextInvocation()}`);
  });
});
Config.logger.info(`Job initialized. First invocation at ${job.nextInvocation()}`);
