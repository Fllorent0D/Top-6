import * as client from '@sendgrid/client';
import * as dateFormat from 'dateformat';
import { Config } from '../config';

client.setApiKey('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');

const sendMail =
  (summaryText: { name: string; text: string }[],
   topText: { name: string; text: string }[],
   errors: string[],
   notices: string[],
   to: any = Config.mailConfig.to): Promise<any> => {

    const date = dateFormat(new Date(), 'yyyy-mm-dd');
    const attachments = [];
    for (const summary of summaryText) {
      attachments.push({
        content: Buffer.from(summary.text, 'utf8').toString('base64'),
        filename: `techniques-${date}-${summary.name}.txt`,
        type: 'plain/text',
        disposition: 'attachment',
        contentId: `WEEK-SUMMARY-${summary.name}-${date}`
      });
    }
    for (const top of topText) {
      attachments.push({
        content: Buffer.from(top.text, 'utf8').toString('base64'),
        filename: `tops-${date}-${top.name}.txt`,
        type: 'plain/text',
        disposition: 'attachment',
        contentId: `TOPS-${top.name}-${date}`
      });
    }
    let message = Config.mailConfig.message;

    message = `${message}<br/><br/>Erreurs détectées:<br/>`;
    for (const error of errors) {
      message = `${message} ${error}<br/>`;
    }

    message = `${message}<br/><br/>Avertissements:<br/>`;
    for (const notice of notices) {
      message = `${message} ${notice}<br/>`;
    }

    const data = {
      'content': [
        {
          'type': 'text/html',
          'value': message
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
      attachments: attachments
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
    'subject': 'Error when calculting tops'

  };
  const request = {
    body: data,
    method: 'POST',
    url: '/v3/mail/send'
  };

  return client.request(request);
};

export { sendMail, sendErrorMail };
