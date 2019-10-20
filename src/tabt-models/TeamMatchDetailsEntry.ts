import {IndividualMatchResultEntry} from "./IndividualMatchResultEntry";
import {TeamMatchPlayerList} from "./TeamMatchPlayerList";

export class TeamMatchDetailsEntry{
	public DetailsCreated: boolean;
	public StartTime: string;
	public EndTime: string;
	public HomeCaptain: number;
	public AwayCaptain: number;
	public Referee: number;
	public HallCommissioner: number;
	public HomePlayers: TeamMatchPlayerList;
	public AwayPlayers: TeamMatchPlayerList;
	public IndividualMatchResults: IndividualMatchResultEntry[];
	public MatchSystem: number;
	public HomeScore: number;
	public AwayScore: number;

}
