import * as client from '@sendgrid/client';
import * as dateFormat from 'dateformat';
import { promisify } from 'es6-promisify';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as schedule from 'node-schedule';
import { TopCalculator } from './top-calculator';
import { WeekSummary } from './week-summary';

const mkdirpP = promisify(mkdirp);
const writeFile = promisify(fs.writeFile);

schedule.scheduleJob('*/2 * * * *', () => {
  const app = new TopCalculator();
  const summary = new WeekSummary();
  const date = dateFormat(new Date(), 'yyyy-mm-dd');

  Promise.all([summary.start(), app.start()])
    .then(([summaryText, topText]: [string, string]) => {
      client.setApiKey('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');

      const text = `Voici les top 6 calculé automatiquement.`;

      const request = {};
      const data = {
        'content': [
          {
            'type': 'text/plain',
            'value': `Le nouveau classement TOP 6 de Verviers vient d\'être calculé automatiquement par le serveur de BePing.\n\n
                      Vous trouverez en pièces jointes de ce mail le classement du TOP6 ainsi qu\'un résumé des rencontres dans la région de Verviers de cette semaine. Si des erreurs étaient à constater, merci de répondre à ce mail.\n\n 
                      Coordialement,\n
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
            ],
          },
        ],
        'reply_to': {
          'email': 'f.cardoen@me.com',
          'name': 'Florent Cardoen',
        },
        'subject': 'Top 6 & Résultats de la région de Verviers',
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
            filename: `week-summary-${date}.txt`,
            type: 'plain/text',
            disposition: 'attachment',
            contentId: `WEEK-SUMMARY-${date}`,
          },
        ],

      };
      request.body = data;
      request.method = 'POST';
      request.add;
      request.url = '/v3/mail/send';
      client.request(request)
        .then(([response, body]: [any, any]) => {
          console.log(response.statusCode);
          console.log(body);
        });
    });


  console.log('should be executed');
});


/*

*/
