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

  public saveTop(top: any, debug: any) {
    admin.database().ref('/tops').set(top, () => {
      Config.logger.info('Top saved in firebase');
    });
    admin.database().ref('/debug').set(debug, () => {
      Config.logger.info('Debug in firebase');
    });
  }
}
