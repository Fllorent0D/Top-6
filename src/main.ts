#!/usr/bin/env node
import { Config } from './config';
import { FacebookHelper } from './firebase/facebook';
import { FirebaseAdmin } from './firebase/firebase-admin';
import { sendErrorMail, sendMail } from './helpers/mail';
import {Week} from './helpers/week';
import { TopCalculator } from './top-6';
import { CategoryOutput, TaskOuput } from './top-6/ranking.model';
import { WeekSummary } from './week-summary';
// tslint:disable-next-line:no-require-imports no-var-requires
const argv = require('yargs')
  .alias('w', 'weekname')
  .describe('w', 'Week to compute')
  .number('w')
  .alias('s', 'sunday')
  .describe('s', 'Run sunday job')
  .boolean('s')
  .alias('t', 'top')
  .describe('t', 'Run top job')
  .boolean('t')
  .alias('p', 'playerInTop')
  .describe('p', 'Number of player in top results')
  .number('p')
  .alias('f', 'saveinfirebase')
  .describe('f', 'Save result in firebase for BePing')
  .boolean('f')
  .alias('fb', 'postonfacebook')
  .describe('fb', 'Post result of Top on Facebook')
  .boolean('fb')
  .alias('m', 'emails')
  .describe('m', 'Emails addresses to send results')
  .array('m')
  .help()
  .epilogue('for more information, ask Florent Cardoen')
  .argv;

const sundayJob = async (weekName: number, playerInTop: number, emails: string[] = Config.mailConfig.to) => {
  const top: TopCalculator = new TopCalculator(weekName, playerInTop, true);
  const summary: WeekSummary = new WeekSummary();

  try {
    const [summaryTexts, topTexts]: TaskOuput[] = await Promise.all([summary.start(), top.start()]);

    const errors = top.playersStats.errorsDetected;
    const notices = top.playersStats.noticesDetected;

    const sentMessageInfo = await sendMail(summaryTexts, topTexts, errors, notices, emails);
    Config.logger.info(`Email send!`);
    Config.logger.info(`Response: ${JSON.stringify(sentMessageInfo)}`);

  } catch (err) {
    Config.logger.error(` Sending error because of error : ${err}`);
    await sendErrorMail(err);
  }
};

const processTop = async (weekName: number, playerInTop: number, saveInFirebase: boolean, postOnFacebook: boolean) => {
  const top: TopCalculator = new TopCalculator(weekName, playerInTop, false);
  const firebase: FirebaseAdmin = new FirebaseAdmin();

  try {
    const topTexts: TaskOuput = await top.start();
    Config.logger.info(topTexts);

    topTexts.map((categoryOuput: CategoryOutput) => {
      console.debug(`## ${categoryOuput.name}`);
      console.debug(categoryOuput.text);
    });

    if (saveInFirebase) {
      const test = await firebase.saveTop(top.rankings, top.playersStats);
      Config.logger.info('Top saved in firebase: ', test);

      await firebase.sendNotification();
      Config.logger.info(`Notification sent`);

      await firebase.release()
    }

    if (postOnFacebook) {
      FacebookHelper.PostTopOnFacebook(topTexts.find((t: { name: string; text: string }) => t.name === 'Verviers').text);
    }
  } catch (e) {
    Config.logger.error(`Email sending error : ${e}`);
    await sendErrorMail(e);
  }
};


const start = async () => {

  const currentDay: number = new Date().getDay();

  if ((currentDay < 2 && !argv.top) || argv.sunday) {
    const emails = argv.emails || Config.mailConfig.to;
    const playerInTop = argv.playerintop || 24;
    const weekName = argv.weekname || Week.GetCurrentWeekname;
    Config.logger.info(`Starting sunday: week [${weekName}], emails [${emails.join(',')}], playerInTop [${playerInTop}]`);

    await sundayJob(weekName, playerInTop, emails);
  } else {
    const weekName = argv.weekname || (Week.GetCurrentWeekname - 1);
    const saveInFirebase = currentDay >= 4 || argv.saveinfirebase;
    const postOnFacebook = currentDay === 4 || argv.postonfacebook;
    const playerInTop = argv.playerintop || 12;


    Config.logger.info(`Starting with config: week [${weekName}], saveInFirebase [${saveInFirebase}], postOnFacebook [${postOnFacebook}], playerInTop [${playerInTop}]`);

    await processTop(weekName, playerInTop, saveInFirebase, postOnFacebook);
  }
};

start()
  .then(() => Config.logger.info('Program successfully exited'))
  .catch((err: any) => Config.logger.error('Something seems to be wrong', err));

