import * as dateFormat from 'dateformat';
import * as mailjet from 'node-mailjet';
import { Config } from '../config';

const client = mailjet.connect('xxx', 'xxx');

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
        'Base64Content': Buffer.from(summary.text, 'utf8').toString('base64'),
        'Filename': `techniques-${date}-${summary.name}.txt`,
        'ContentType': 'plain/text'
      });
    }
    for (const top of topText) {
      attachments.push({
        'Base64Content': Buffer.from(top.text, 'utf8').toString('base64'),
        'Filename': `tops-${date}-${top.name}.txt`,
        'ContentType': 'plain/text'
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

    const data = {
      'Messages': [
        {
          'From': {
            'Email': 'beping@floca.be',
            'Name': 'BePing server'
          },
          'To': to.map((email: string) => ({ 'Email': email })),
          'ReplyTo':[{'Email': 'f.cardoen@me.com'}],
          'Subject': Config.mailConfig.subject,
          'HTMLPart': message,
          'Attachments': attachments
        }
      ]
    };

    return client
      .post('send', { 'version': 'v3.1' })
      .request(data);
  };

const sendErrorMail = (error: Error): Promise<any> => {
  const data = {
    'Messages': [
      {
        'From': {
          'Email': 'beping@floca.be',
          'Name': 'BePing - L\'appli de Ping belge'
        },
        'To': [{ 'Email': 'f.cardoen@me.com' }],
        'Subject': Config.mailConfig.subject,
        'HTMLPart': `Name: ${error.name}</br>Message: ${error.message}<br/>Stacktrace: ${error.stack}`,
      }
    ]
  };

  return client
    .post('send', { 'version': 'v3.1' })
    .request(data);
};

export { sendMail, sendErrorMail };
