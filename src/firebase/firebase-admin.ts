import * as  appRoot from 'app-root-path';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import { Config } from '../config';

export class FirebaseAdmin {
  constructor() {
    const serviceAccount: any = JSON.parse(fs.readFileSync(`${appRoot}/beping-196714-firebase-adminsdk-0tn8d-22c3cc2319.json`, 'utf-8'));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: 'https://beping-196714.firebaseio.com'
    });

  }

  public static sendNotification() {
    return admin.messaging().sendToTopic('Top6', {
      notification: {
        title: 'Classement Top 6',
        body: 'Le nouveau classement Top 6 est disponible sur BePing',
        sound: 'default'
      }
    });
  }

  public static SendNotificationToTopic(topic: string, title: string, body: string) {
    return admin.messaging().sendToTopic(topic, {
      notification: {
        title,
        body
      }
    });
  }

  public static GetDatabase() {
    return admin.database();
  }

  public saveTop(top: any, debug: any) {
    admin.database().ref('/tops').set(top, (err) => {
      Config.logger.info('Top saved in firebase', err);
    });
    admin.database().ref('/debug').set(debug, (err) => {
      Config.logger.info('Debug in firebase', err);
    });
  }
}
