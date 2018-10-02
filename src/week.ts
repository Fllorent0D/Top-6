export interface IWeek {
  [index: number]: {
    fromDate: Date;
    toDate: Date;
  }
}

export class Week {
  private journees: IWeek = {
    1: { fromDate: new Date(2018, 7, 1), toDate: new Date(2018, 8, 16) },
    2: { fromDate: new Date(2018, 8, 16), toDate: new Date(2018, 8, 22) },
    3: { fromDate: new Date(2018, 8, 23), toDate: new Date(2018, 8, 29) },
    4: { fromDate: new Date(2018, 8, 30), toDate: new Date(2018, 9, 6) },
    5: { fromDate: new Date(2018, 9, 7), toDate: new Date(2018, 9, 20) },
    6: { fromDate: new Date(2018, 9, 21), toDate: new Date(2018, 10, 3) },
    7: { fromDate: new Date(2018, 10, 4), toDate: new Date(2018, 10, 10) },
    8: { fromDate: new Date(2018, 10, 11), toDate: new Date(2018, 10, 17) },
    9: { fromDate: new Date(2018, 10, 18), toDate: new Date(2018, 10, 24) },
    10: { fromDate: new Date(2018, 10, 25), toDate: new Date(2018, 11, 1) },
    11: { fromDate: new Date(2018, 11, 2), toDate: new Date(2018, 11, 8) },
    12: { fromDate: new Date(2018, 11, 9), toDate: new Date(2019, 0, 12) },
    13: { fromDate: new Date(2019, 0, 13), toDate: new Date(2019, 0, 19) },
    14: { fromDate: new Date(2019, 0, 20), toDate: new Date(2019, 0, 26) },
    15: { fromDate: new Date(2019, 0, 27), toDate: new Date(2019, 1, 2) },
    16: { fromDate: new Date(2019, 1, 3), toDate: new Date(2019, 1, 16) },
    17: { fromDate: new Date(2019, 1, 17), toDate: new Date(2019, 1, 23) },
    18: { fromDate: new Date(2019, 1, 24), toDate: new Date(2019, 2, 9) },
    19: { fromDate: new Date(2019, 2, 10), toDate: new Date(2019, 2, 16) },
    20: { fromDate: new Date(2019, 2, 17), toDate: new Date(2019, 2, 23) },
    21: { fromDate: new Date(2019, 2, 24), toDate: new Date(2019, 2, 30) },
    22: { fromDate: new Date(2019, 2, 31), toDate: new Date(2019, 3, 6) },
  };

  public getDate(numJournee: number): IWeek {
    return this.journees[numJournee];
  }

  public getCurrentJournee(): number {
    let today = new Date();
    today = new Date(today.setHours(0, 0, 0, 0));
    let i;
    for (i = 0; i < Object.keys(this.journees).length; i++) {
      if (today >= this.journees[i + 1].fromDate && today <= this.journees[i + 1].toDate) {
        break;
      }
    }

    if (i === 0) {
      return 1;
    } else if (this.journees[i + 1]){
      return i + 1;
    }
    else {
      return i;
    }
  }
}
