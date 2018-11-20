export class RankingRegion {
  public name: string;
  public categories: RankingCategory[];
}

export class RankingCategory {
  public name: string;
  public players: RankingPlayer[];
}

export class RankingPlayer {
  public position?: number;
  public uniqueIndex: string;
  public clubIndex: string;
  public clubName: string;
  public name: string;
  public points: number;
}