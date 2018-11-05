import * as appRootPath from 'app-root-path';
import * as _ from 'lodash';
import * as winston from 'winston';
import { AppOptions, ServiceAccount } from 'firebase-admin';

export interface IConfigRegionRanking {
  name: string;
  clubs: string[];
}

export interface IConfigCategoryRanking {
  id: number;
  name: string;
  divisions: number[];
}

export module Config {
  export const regions: IConfigRegionRanking[] = [
    {
      name: 'Huy-Waremme',
      clubs: [
        'L029', 'L126', 'L193', 'L205', 'L230', 'L246', 'L257', 'L266',
        'L267', 'L275', 'L276', 'L282', 'L293', 'L295', 'L333', 'L335',
        'L358', 'L365', 'L374', 'L387', 'L393', 'L398', 'L400', 'L310', 'L124',
      ],
    },
    {
      name: 'Verviers',
      clubs:
        ['L095', 'L323', 'L264', 'L002', 'L318', 'L320', 'L337', 'L348',
          'L313', 'L328', 'L125', 'L389', 'L382', 'L179', 'L360', 'L399', 'L066', 'L368',
          'L003', 'L184', 'L252', 'L272', 'L274', 'L284', 'L296', 'L326',
          'L329', 'L344', 'L349', 'L357', 'L378'],
    },
    /*
    {
      name: 'Liège',
      clubs: ['L264'],
    },*/
  ];
  export const categories: IConfigCategoryRanking[] = [
    {
      'id': 0,
      'name': 'NAT/WB',
      'divisions': [3625, 3626, 3627, 3628, 3629, 3630, 3678, 3679, 3680, 3681, 3682],
    },
    {
      'id': 1,
      'name': 'Provincial 1',
      'divisions': [3962, 3963],
    },
    {
      'id': 2,
      'name': 'Provincial 2',
      'divisions': [3965, 3966, 3967, 3968],
    },
    {
      'id': 3,
      'name': 'Provincial 3',
      'divisions': [3970, 3971, 3972, 3973, 3974, 3975],
    },
    {
      'id': 4,
      'name': 'Provincial 4',
      'divisions': [3976, 3977, 3978, 3979, 3980, 3981, 3982],
    },
    {
      'id': 5,
      'name': 'Provincial 5',
      'divisions': [3983, 3984, 3985, 3986, 3987, 3988, 3989, 3990],
    },
    {
      'id': 6,
      'name': 'Provincial 6',
      'divisions': [3991, 3992, 3993, 3994, 3995, 3996, 3997, 3998, 3999, 4000],
    },
  ];

  export const getAllClubs = (): string[] => {
    return _.uniq(_.flatten(regions.map((ranking: IConfigRegionRanking) => ranking.clubs)));
  };

  export const getAllDivisions = (): number[] => {
    return _.uniq(_.flatten(categories.map((category: IConfigCategoryRanking) => category.divisions)));
  };

  export const mapVictoryToPoint = (victory: number): number => {
    switch (victory) {
      case 4:
        return 5;
      default:
        return victory;
    }
  };

  export const mapDivisionIdToCategory = (divisionId: number): IConfigCategoryRanking => {
    return categories.find((category: IConfigCategoryRanking) => {
      return category.divisions.indexOf(divisionId) > -1;
    });
  };

  export const dispatchInRankingForClub = (club: string): IConfigRegionRanking => {
    return Config.regions.find((ranking: IConfigRegionRanking) => {
      return _.includes(ranking.clubs, club);
    });
  };

  export const timeout = (ms: number) => {
    return new Promise((resolve: any) => setTimeout(resolve, ms));
  };


  export const loggerOptions = {
    file: {
      level: 'info',
      filename: `${appRootPath}/logs/app.log`,
      handleExceptions: true,
      json: true,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      colorize: false,
    },
    console: {
      level: 'debug',
      handleExceptions: true,
      json: false,
      colorize: true,
    },
    format: winston.format.combine(
      winston.format.splat(),
      winston.format.simple(),
    ),
  };
  export const logger = winston.createLogger({
    transports: [
      new winston.transports.File(loggerOptions.file),
      new winston.transports.Console(loggerOptions.console),
    ],
    exitOnError: false, // do not exit on handled exceptions
  });

  export const titleCase = (text: string) => text.toLowerCase().split(' ').map((s: string) => s.charAt(0).toUpperCase() + s.substring(1)).join(' ');

  export const firebaseConfig: any = {
    "type": "service_account",
    "project_id": "beping-196714",
    "private_key_id": "22c3cc2319f82bb07a889dc6516cac6d20bfc03d",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCoDe7R/Di9C1/L\n9utvpXnykXCV3XtqEP3moCXOb3w6iBMDP5dxvNjT0AeyfWm2P9PVkcKo7aHK35F/\nqD07WNjM2gqPiT20IGuSL7J1ri9ettt0NN50hH/3dZY0EhuHUz7nu4OaZjH0DnM5\ndH+ilJxUQsGvcxpshuC+ChYRIkqniVgvqarDQv6yYQ2aFzoqlfQTF9SJtTmrVvKG\n/T7RQ0kvpS0YrZEhviJx9dGoIdavPKlmC10fkCFrQo5nn3wZpPkk05e5/PetZCmg\ngLg0ly69ge/r9UimCeHngUP20trOhYVftKUapLrbQcoU4HaM8iGyjKtPXZWKSZcB\nWlSqkye7AgMBAAECggEAFYjHhVKCZhMFi6olzBt9BLdcoQ+NnMSgTFj8JIzw8xfJ\nsT0I/R2Q/pSlz9o13WZ7ZglfU2yJMr5diL6jA1j6BZybsCiKvBX6wsjoNMqFA71/\nDHp+gO6+Q77maDYOdKjsTXR1Q30nQdnyK4wWk4Y4gVbr4RK+RubXo0fBQSEkRihk\nEoZNBFcus0F6rfoW2M/snzW2Ib+8jvn3nCMXrN4TCY5vxngTsNNF6Mr2u8AnGzlz\noXMANyiMTQhtqTt/KdoHWVz0KzJBRArdD9/rbvdO+QQAEp+JGSZsEhK4P1YVWlNH\nWFE6uvSAlNuOxygFO3tbDNyFxoB2YlRaxFZ+mPs+KQKBgQDjv05tvAa1zn524CpF\nzSzUKdsHe6EBcASo8ed6mAOVe/dzcwKGxA4/jLVCdeymQ9vGnEMemioUED4JiW4R\nrvsikehsYujnkEe7uhfSMJLRvy7p1S9cgSTjUSNFD2fMWwZwUux2Vu9RX+C/EvPA\nKeC8tt6pA+2TrZS8fDsB1VZBqQKBgQC85u2QzzMgy51FHy4rnsfPZL5fitBGzTuJ\n4qKnfl5wGCuLB5zhf/96ZOh0XmNBQWZwO27TC3G5ReFQbjMxKC/lVijmBmZKLUDl\nK/rh35N+Klv+Wjc+x93hQG8WZoBO6ErEMr4UsetP0t/NPYRX8TZgL3hMBlKre1P6\nN7Hu+mSEwwKBgByO7qy/+S9vF1icv3BFTCvGm9qSXBwsCcmNm/M5gKmMA/mMIHL5\nvrelU01kMCqhM7vx+FCsED630q+rdgvtnzw0g6qjtITlCLm3mikXQjHfAWj8/JVi\n9Fc043FTfzaW63XGUDR+rj/MAAi1va8JEU9Ytw8GmRH9oDsKcPPH5qsRAoGAA+56\ne00Ur1YNi+a+O0Iuvm5GWA63jwGuf4wr/nhu1r5qCZa6+SaE1rNK80ETp8QIscVK\n5TGTyFtf+SCSCC/h70//wenYLysJ8rsbmZ/hnfqbt4uBItleENYaecjgWsQS6kp0\nElIxp5On/MmO+5WVoCLcyhhHmDIU6VxHY8XqWakCgYEAliMtzIZiJvTO/w5XOT+Y\nhtRZW3kjFijl6fPT9iH7nLygM6lRUgfHzafGFBTmDKL1XYMKahiEDeKj95Rvuq+m\nRObNiFKgN0FzElmo8I2hZe66zecnIdNMMgsuA+/3UQltr48VHmdGUY770gV7VhNa\nzK2zyMvBt23vBdCqn7HBfK8=\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk-0tn8d@beping-196714.iam.gserviceaccount.com",
    "client_id": "107150654526057606434",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-0tn8d%40beping-196714.iam.gserviceaccount.com"
  };

  export const mailConfig = {
    to: [
      {
        'email': 'f.cardoen@me.com',
        'name': 'Florent Cardoen'
      },
      {
        'email': 'jacpirard@hotmail.com',
        'name': 'Jacques Pirard'
      },
      {
        'email': 'thomasbastin5@gmail.com',
        'name': 'Thomas Bastin'
      }
    ],
    subject: 'Top 6 & Techniques Verviers & Huy-Waremme',
    message:`Le nouveau classement TOP 6 de Verviers & Huy-Waremme vient d\'être calculé automatiquement par le serveur de BePing.<br/>
                      Vous trouverez en pièces jointes de ce mail le classement du TOP6 ainsi que les techniques des rencontres dans la région de Verviers & Huy-Waremme de cette semaine. <br/>Si des erreurs étaient à constater, merci de répondre à ce mail.<br/><br/> 
                      Coordialement,<br/>
                      Florent Cardoen`,

  }

}
