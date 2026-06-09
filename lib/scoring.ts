export function getOutcome(home: number, away: number) {
  if (home > away) return 'home';
  if (home < away) return 'away';
  return 'draw';
}

export function calculatePoints(predHome: number, predAway: number, realHome: number | null, realAway: number | null) {
  if (realHome === null || realAway === null || realHome === undefined || realAway === undefined) return 0;
  if (predHome === realHome && predAway === realAway) return 5;
  if (getOutcome(predHome, predAway) === getOutcome(realHome, realAway)) return 3;
  if (predHome === realHome || predAway === realAway) return 1;
  return 0;
}
