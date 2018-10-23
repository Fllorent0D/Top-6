import * as client from '@sendgrid/client';
import * as dateFormat from 'dateformat';
import * as schedule from 'node-schedule';
import { Config } from './config';
import { TopCalculator } from './top-calculator';
import { WeekSummary } from './week-summary';

const rule = new schedule.RecurrenceRule();
rule.dayOfWeek = 0;
rule.hour = 20;
rule.minute = 0;

const job = schedule.scheduleJob(rule, (fireDate: Date) => {
  Config.logger.info(`Job starting at supposed to run at ${fireDate}, but actually ran at ${new Date()}`);

  const app = new TopCalculator();
  const summary = new WeekSummary();
  const date = dateFormat(new Date(), 'yyyy-mm-dd');

  Promise.all([summary.start(), app.start()])
    .then(([summaryText, topText]: [string, string]) => {
      client.setApiKey('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');

      const data = {
        'content': [
          {
            'type': 'text/html',
            'value': `Le nouveau classement TOP 6 de Verviers & Huy-Waremme vient d\'être calculé automatiquement par le serveur de BePing.<br/>
                      Vous trouverez en pièces jointes de ce mail le classement du TOP6 ainsi que les techniques des rencontres dans la région de Verviers & Huy-Waremme de cette semaine. <br/>Si des erreurs étaient à constater, merci de répondre à ce mail.<br/><br/> 
                      Coordialement,<br/>
                      Florent Cardoen`,
          },
        ],
        'from': {
          'email': 'florent.cardoen@beping.be',
          'name': 'Florent Cardoen',
        },
        'personalizations': [
          {
            'subject': 'Top 6 & Résumé de la région de Verviers',
            'to': [
              {
                'email': 'f.cardoen@me.com',
                'name': 'Florent Cardoen',
              },
              {
                'email': 'aurelie.kaye@gmail.com',
                'name': 'Aurélie Kaye',
              },
              {
                'email': 'jacpirard@hotmail.com',
                'name': 'Jacques Pirard',
              },
              {
                'email': 'thomasbastin5@gmail.com',
                'name': 'Thomas Bastin'
              }
            ],
          },
        ],
        'reply_to': {
          'email': 'f.cardoen@me.com',
          'name': 'Florent Cardoen',
        },
        'subject': 'Top 6 & Techniques de la région de Verviers & Huy-Waremme',
        attachments: [
          {
            content: Buffer.from(topText, 'utf8').toString('base64'),
            filename: `top6-${date}.txt`,
            type: 'plain/text',
            disposition: 'attachment',
            contentId: `TOP6-${date}`,
          },
          {
            content: Buffer.from(summaryText, 'utf8').toString('base64'),
            filename: `resume-${date}.txt`,
            type: 'plain/text',
            disposition: 'attachment',
            contentId: `WEEK-SUMMARY-${date}`,
          },
        ],

      };
      const request = {
        body: data,
        method: 'POST',
        url: '/v3/mail/send',
      };

      return client.request(request);
    })
    .then(([response, body]: [any, any]) => {
      Config.logger.info(`Email send!`);
      Config.logger.info(`Response: ${body}`);
      Config.logger.info(`Status code: ${response.statusCode}`);
    })
    .catch((err: any) => {
      Config.logger.error(`Email sending error : ${err}`);
    })
    .then(() => {
      Config.logger.info(`Job finished. Next invocation at ${job.nextInvocation()}`);
    });
});
Config.logger.info(`Job initialized. First invocation at ${job.nextInvocation()}`);
