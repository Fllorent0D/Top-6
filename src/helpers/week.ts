export interface IWeek {
  [index: number]: {
    fromDate: Date;
    toDate: Date;
  }
}

export class Week {
  // tslint:disable-next-line:variable-name
  private static Weeks: IWeek = {
    1: { fromDate: new Date(2020, 6, 1), toDate: new Date(2020, 8, 13) },
    2: { fromDate: new Date(2020, 8, 14), toDate: new Date(2020, 8, 20) },
    3: { fromDate: new Date(2020, 8, 21), toDate: new Date(2020, 8, 27) },
    4: { fromDate: new Date(2020, 8, 28), toDate: new Date(2020, 9, 4) },
    5: { fromDate: new Date(2020, 9, 5), toDate: new Date(2020, 9, 11) },
    6: { fromDate: new Date(2020, 9, 12), toDate: new Date(2020, 9, 18) },
    7: { fromDate: new Date(2020, 9, 19), toDate: new Date(2020, 9, 25) },
    8: { fromDate: new Date(2020, 9, 26), toDate: new Date(2020, 10, 8) },
    9: { fromDate: new Date(2020, 10, 9), toDate: new Date(2020, 10, 15) },
    10: { fromDate: new Date(2020, 10, 16), toDate: new Date(2020, 10, 22) },
    11: { fromDate: new Date(2020, 10, 23), toDate: new Date(2020, 11, 6) },
    12: { fromDate: new Date(2020, 11, 7), toDate: new Date(2021, 0, 17) },
    13: { fromDate: new Date(2021, 0, 18), toDate: new Date(2021, 0, 24) },
    14: { fromDate: new Date(2021, 0, 25), toDate: new Date(2021, 0, 31) },
    15: { fromDate: new Date(2021, 1, 1), toDate: new Date(2021, 1, 7) },
    16: { fromDate: new Date(2021, 1, 8), toDate: new Date(2021, 1, 21) },
    17: { fromDate: new Date(2021, 1, 22), toDate: new Date(2021, 1, 28) },
    18: { fromDate: new Date(2021, 2, 1), toDate: new Date(2021, 2, 14) },
    19: { fromDate: new Date(2021, 2, 15), toDate: new Date(2021, 2, 21) },
    20: { fromDate: new Date(2021, 2, 22), toDate: new Date(2021, 2, 28) },
    21: { fromDate: new Date(2021, 2, 29), toDate: new Date(2021, 3, 4) },
    22: { fromDate: new Date(2021, 3, 5), toDate: new Date(2021, 5, 5) }
  };

  // tslint:disable-next-line:function-name
  public static GetDate(numJournee: number): { fromDate: Date; toDate: Date } {
    return Week.Weeks[numJournee];
  }

  // tslint:disable-next-line:function-name
  public static get GetCurrentWeekname(): number {
    let today = new Date();
    today = new Date(today.setHours(0, 0, 0, 0));
    let i;
    for (i = 0; i < Object.keys(Week.Weeks).length; i++) {
      if (today >= Week.Weeks[i + 1].fromDate && today <= Week.Weeks[i + 1].toDate) {
        break;
      }
    }

    if (i === 0) {
      return 1;
    } else if (Week.Weeks[i + 1]) {
      return i + 1;
    } else {
      return i;
    }
  }
}
