import * as admin from 'firebase-admin';
import * as fs from 'fs';


export class FirebaseAdmin{
  private database;

  constructor() {
    const serviceAccount = JSON.parse(fs.readFileSync('/Users/id096319/BePing/top-6/src/firebase/beping-196714-firebase-adminsdk-0tn8d-22c3cc2319.json', 'utf8'));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: 'https://beping-196714.firebaseio.com'
    });

    this.database = admin.database().ref('/tops');
  }

  public saveTop(top){
    this.database.set(top, (a)=> {
      console.log('top saved in firebase', a)
    });
  }
  public saveDebug(debug){
    admin.database().ref('debug').set(debug);
  }

}
