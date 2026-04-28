export enum StatReportPages {
  Standings,
  Individuals,
  Scoreboard,
  TeamDetails,
  PlayerDetails,
  RoundReport,
}

export const StatReportPageOrder = [
  StatReportPages.Standings,
  StatReportPages.Individuals,
  StatReportPages.Scoreboard,
  StatReportPages.TeamDetails,
  StatReportPages.PlayerDetails,
  StatReportPages.RoundReport,
];

export const StatReportFileNames = {
  [StatReportPages.Standings]: 'standings.html',
  [StatReportPages.Individuals]: 'individuals.html',
  [StatReportPages.Scoreboard]: 'games.html',
  [StatReportPages.TeamDetails]: 'teamdetail.html',
  [StatReportPages.PlayerDetails]: 'playerdetail.html',
  [StatReportPages.RoundReport]: 'rounds.html',
};
