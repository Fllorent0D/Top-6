import * as appRootPath from 'app-root-path'
import * as _ from 'lodash';
import * as winston from 'winston';

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
    /*
    {
      name: 'Huy-Waremme',
      clubs: [],
    },*/
    {
      name: 'Verviers',
      clubs:
        ['L095', 'L323', 'L264', 'L002', 'L318', 'L320', 'L337', 'L348',
          'L313', 'L328', 'L125', 'L389', 'L382', 'L179', 'L360', 'L399', 'L066', 'L368',
          'L003', 'L184', 'L252', 'L272', 'L274', 'L284', 'L296', 'L326',
          'L329', 'L344', 'L349', 'L357', 'L378'],

      //clubs: ['L360', 'L252', 'L326']
    }
    /*,
    {
      name: 'Liège',
      clubs: [],
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
  }


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
      winston.format.simple()
    )
  };
  export const logger = winston.createLogger({
    transports: [
      new winston.transports.File(loggerOptions.file),
      new winston.transports.Console(loggerOptions.console)
    ],
    exitOnError: false, // do not exit on handled exceptions
  });
  export const titleCase = (text: string) => text.toLowerCase().split(' ').map((s: string) => s.charAt(0).toUpperCase() + s.substring(1)).join(' ');
}
