import * as  appRoot from 'app-root-path';
import * as admin from 'firebase-admin';
import * as fs from 'fs';

export class FirebaseAdmin {
  private app: admin.app.App;

  constructor() {
    const serviceAccount: any = JSON.parse(fs.readFileSync(`${appRoot}/beping-196714-firebase-adminsdk-0tn8d-22c3cc2319.json`, 'utf-8'));

     this.app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: 'https://beping-196714.firebaseio.com'
    });

  }

  public sendNotification() {
    return this.app.messaging().sendToTopic('Top6', {
      notification: {
        title: 'Classement Top 6',
        body: 'Le nouveau classement Top 6 est disponible sur BePing',
        sound: 'default'
      }
    });
  }

  public saveTop(top: any, debug: any) {
    const topSave = admin.database().ref('/tops').set(top)
    const debugSave = admin.database().ref('/debug').set(debug)

    return Promise.all([topSave, debugSave])
  }

  public release(){
    return this.app.delete();
  }

}
