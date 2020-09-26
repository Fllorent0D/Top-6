import * as client from '@sendgrid/client';
import * as dateFormat from 'dateformat';
import * as NodeMailer from 'nodemailer';
import { Config } from '../config';

client.setApiKey('xxx');

const sendMail =
  (summaryText: { name: string; text: string }[],
   topText: { name: string; text: string }[],
   errors: string[],
   notices: string[],
   to: string[]): Promise<any> => {

    const date = dateFormat(new Date(), 'yyyy-mm-dd');
    const attachments = [];
    for (const summary of summaryText) {
      attachments.push({
        content: Buffer.from(summary.text, 'utf8'),
        filename: `techniques-${date}-${summary.name}.txt`,
        type: 'plain/text',
        disposition: 'attachment'
      });
    }
    for (const top of topText) {
      attachments.push({
        content: Buffer.from(top.text, 'utf8'),
        filename: `tops-${date}-${top.name}.txt`,
        type: 'plain/text'
      });
    }
    let message = Config.mailConfig.message;

    if (errors.length > 0) {
      message = `${message}<br/><br/>Erreurs détectées:<br/>`;
      for (const error of errors) {
        message = `${message} ${error}<br/>`;
      }
    }

    if (notices.length > 0) {
      message = `${message}<br/><br/>Avertissements:<br/>`;
      for (const notice of notices) {
        message = `${message} ${notice}<br/>`;
      }
    }

    const transporter = NodeMailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'flocardoen@gmail.com',
        pass: 'Fc087229090'
      }
    });

    const mailOptions = {
      from: 'flocardoen@gmail.com', // sender address
      to, // list of receivers
      subject: Config.mailConfig.subject, // Subject line
      html: message,// plain text body
      attachments
    };

    return transporter.sendMail(mailOptions);

/*

    const data = {
      'content': [
        {
          'type': 'text/html',
          'value': message
        }
      ],
      'from': {
        'email': 'florent.cardoen@floca.be',
        'name': 'Florent Cardoen'
      },
      'personalizations': [
        {
          'subject': Config.mailConfig.subject,
          'to': to.map((email: string) => ({email}))
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

*/
  };

const sendErrorMail = (error: Error): Promise<any> => {

/*
  const transporter = NodeMailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'flocardoen@gmail.com',
      pass: 'Fc087229090'
    }
  });

  const mailOptions = {
    from: 'flocardoen@gmail.com', // sender address
    to: 'f.cardoen@me.com', // list of receivers
    subject: Config.mailConfig.subject, // Subject line
    html: `Name: ${error.name}</br>Message: ${error.message}<br/>Stacktrace: ${error.stack}`,
  };

  return transporter.sendMail(mailOptions);
*/
  const data = {
    'content': [
      {
        'type': 'text/html',
        'value': `Name: ${error.name}</br>Message: ${error.message}<br/>Stacktrace: ${error.stack}`
      }
    ],
    'from': {
      'email': 'florent.cardoen@floca.be',
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
