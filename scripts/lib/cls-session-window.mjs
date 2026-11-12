// Core Web Vitals CLS is the largest session window, not the lifetime shift sum.
export function largestSessionWindow(entries) {
  const shifts = entries
    .filter((entry) => entry && !(entry.hadRecentInput || entry.had_recent_input))
    .map((entry) => ({
      time: Number(entry.startTime ?? entry.start_time),
      value: Number(entry.value),
    }))
    .filter((entry) => Number.isFinite(entry.time) && Number.isFinite(entry.value) && entry.value > 0)
    .sort((left, right) => left.time - right.time);
  let maximum = 0;
  let sessionStart = 0;
  let previous = 0;
  let total = 0;
  let active = false;
  for (const shift of shifts) {
    if (!active || shift.time - previous > 1000 || shift.time - sessionStart > 5000) {
      sessionStart = shift.time;
      total = 0;
      active = true;
    }
    total += shift.value;
    previous = shift.time;
    maximum = Math.max(maximum, total);
  }
  return maximum;
}
