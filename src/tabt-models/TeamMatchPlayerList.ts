import {TeamMatchDoubleTeamEntry} from "./TeamMatchDoubleTeamEntry";
import {TeamMatchPlayerEntry} from "./TeamMatchPlayerEntry";

export class TeamMatchPlayerList{
	public PlayerCount: number;
	public DoubleTeamCount: number;
	public Players: TeamMatchPlayerEntry[];
	public DoubleTeams: TeamMatchDoubleTeamEntry[];
}
