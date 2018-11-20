import * as client from '@sendgrid/client';
import * as dateFormat from 'dateformat';
import { Config } from '../config';

client.setApiKey('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');

const sendMail = (summaryText: string, topText: string, to: any = Config.mailConfig.to): Promise<any> => {
  const date = dateFormat(new Date(), 'yyyy-mm-dd');


  const data = {
    'content': [
      {
        'type': 'text/html',
        'value': Config.mailConfig.message
      }
    ],
    'from': {
      'email': 'florent.cardoen@beping.be',
      'name': 'Florent Cardoen'
    },
    'personalizations': [
      {
        'subject': Config.mailConfig.subject,
        'to': to
      }
    ],
    'reply_to': {
      'email': 'f.cardoen@me.com',
      'name': 'Florent Cardoen'
    },
    'subject': Config.mailConfig.subject,
    attachments: [
      {
        content: Buffer.from(summaryText, 'utf8').toString('base64'),
        filename: `resume-${date}.txt`,
        type: 'plain/text',
        disposition: 'attachment',
        contentId: `WEEK-SUMMARY-${date}`
      },
      {
        content: Buffer.from(topText, 'utf8').toString('base64'),
        filename: `tops-${date}.txt`,
        type: 'plain/text',
        disposition: 'attachment',
        contentId: `TOPS-${date}`
      }
    ]

  };
  const request = {
    body: data,
    method: 'POST',
    url: '/v3/mail/send'
  };

  return client.request(request);
};

const sendErrorMail = (error: Error): Promise<any> => {

  const data = {
    'content': [
      {
        'type': 'text/html',
        'value': `Name: ${error.name}</br>Message: ${error.message}<br/>Stacktrace: ${error.stack}`
      }
    ],
    'from': {
      'email': 'florent.cardoen@beping.be',
      'name': 'Florent Cardoen'
    },
    'personalizations': [
      {
        'subject': 'Error when calculting tops',
        'to': [{
          'email': 'f.cardoen@me.com',
          'name': 'Florent Cardoen'
        }]
      }
    ],
    'reply_to': {
      'email': 'f.cardoen@me.com',
      'name': 'Florent Cardoen'
    },
    'subject': 'Error when calculting tops',

  };
  const request = {
    body: data,
    method: 'POST',
    url: '/v3/mail/send'
  };

  return client.request(request);
};

export { sendMail, sendErrorMail };
