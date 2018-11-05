import * as admin from 'firebase-admin';
import { Config } from '../config';


export class FirebaseAdmin {
  constructor() {
    const serviceAccount: any = Config.firebaseConfig;

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
