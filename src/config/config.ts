import * as appRootPath from 'app-root-path';
import * as _ from 'lodash';
import * as winston from 'winston';
import { MatchResult } from '../top-6/ranking.model';

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
        'L358', 'L365', 'L374', 'L387', 'L393', 'L398', 'L400', 'L310', 'L124', 'L234'
      ]
    },
    {
      name: 'Verviers',
      clubs:
        ['L095', 'L323', 'L264', 'L002', 'L318', 'L320', 'L337', 'L348',
          'L313', 'L328', 'L125', 'L389', 'L382', 'L179', 'L360', 'L399',
          'L066', 'L368', 'L003', 'L184', 'L252', 'L272', 'L274', 'L284',
          'L296', 'L326', 'L329', 'L344', 'L349', 'L357', 'L378']
    },
    {
      name: 'Liège',
      clubs: ['L030', 'L043', 'L098', 'L111', 'L119', 'L143',
        'L152', 'L165', 'L170', 'L185', 'L199', 'L217', 'L218',
        'L263', 'L312', 'L316', 'L338', 'L351', 'L355', 'L370',
        'L377', 'L383', 'L384', 'L390', 'L391', 'L396', 'L401',],
    },
  ];
  export const categories: IConfigCategoryRanking[] = [
    {
      'id': 0,
      'name': 'NAT/WB',
      'divisions': [4141, 4142, 4143, 4144, 4145, 4146, 4235, 4236, 4237, 4238, 4239]
    },
    {
      'id': 1,
      'name': 'Provincial 1',
      'divisions': [4482, 4483]
    },
    {
      'id': 2,
      'name': 'Provincial 2',
      'divisions': [4485, 4486, 4487, 4488]
    },
    {
      'id': 3,
      'name': 'Provincial 3',
      'divisions': [4489, 4490, 4491, 4492, 4493, 4494]
    },
    {
      'id': 4,
      'name': 'Provincial 4',
      'divisions': [4495, 4521, 4496, 4497, 4489, 4498, 4499, 4500]
    },
    {
      'id': 5,
      'name': 'Provincial 5',
      'divisions': [4501, 4502, 4503, 4504, 4505, 4506, 4507, 4508]
    },
    {
      'id': 6,
      'name': 'Provincial 6',
      'divisions': [4509, 4510, 4511, 4512, 4513, 4514, 4515, 4516, 4517, 4518]
    }
  ];

  export const overrideMatchResults: MatchResult[] = [
    {
      matchId: '123',
      homeVictoryCount: 3,
      homeForfeit: 0,
      awayVictoryCount: 3,
      awayForfeit: 0
    }
  ];

  export const overridePlayerVictoryHistory: { [index: string]: any[] } = {
    '123': [
      {
        'divisionIndex': '3968',
        'divisionCategory': 'Provincial 2',
        'weekName': '06',
        'victoryCount': 4,
        'forfeit': 0,
        'pointsWon': 5,
        'matchId': 'LgH06/151'
      }
    ]

  };

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
    return regions.find((ranking: IConfigRegionRanking) => {
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
      colorize: false
    },
    console: {
      level: 'info',
      handleExceptions: true,
      json: false,
      colorize: true
    },
    format: winston.format.combine(
      winston.format.splat(),
      winston.format.simple()
    )
  };
  export const logger = winston.createLogger({
    transports: [
      new winston.transports.File(loggerOptions.file),
      new winston.transports.Console(loggerOptions.console)
    ],
    exitOnError: false // do not exit on handled exceptions
  });

  export const titleCase = (text: string) => text.toLowerCase().split(' ').map((s: string) => s.charAt(0).toUpperCase() + s.substring(1)).join(' ');

  export const mailConfig = {
    to: [
      'f.cardoen@me.com',
      'jacpirard@hotmail.com',
      'thomasbastin5@gmail.com'
    ],
    subject: 'Top 6 & Techniques Verviers & Huy-Waremme',
    message: `Le nouveau classement TOP 6 de Verviers & Huy-Waremme vient d\'être calculé automatiquement par le serveur de BePing.<br/>
                      Vous trouverez en pièces jointes de ce mail le classement du TOP6 ainsi que les techniques des rencontres dans la région de Verviers & Huy-Waremme de cette semaine. <br/>Si des erreurs étaient à constater, merci de répondre à ce mail.<br/><br/>`

  };

}
