// The session clock: the time a replay shows on its simulated devices.
//
// A replay packs half an hour of work into a few minutes, so a clock reading the viewer's own
// time stands still beside it and says the opposite of what is on screen (Gary, 2026-10-12:
// "the clock on the top right of the MacBook should be syncing with the speed of the work").
// The session clock starts when the session started and moves with the work done so far, the
// same total the counter under the header shows: it runs fast while the work runs, and stands
// still while the session waits on the viewer, is paused, or has ended.
//
// Where the session started: `source.startedAt` when the scenario records it. Write it as the
// session's own wall time with no offset ("2026-10-12T14:03:00") to show that time to every
// viewer; a value with Z or an offset is shown in the viewer's zone. Without it, nine in the
// morning on `source.date`, and never the viewer's now: a start time is never invented.

export const CLOCKS = ['session', 'wall'];
const START_HOUR = 9;

export function normalizeClock(v) {
  const c = String(v ?? '').trim().toLowerCase();
  return CLOCKS.includes(c) ? c : 'session';
}

export function sessionStart(sc) {
  const at = sc?.source?.startedAt ? new Date(sc.source.startedAt) : null;
  if (at && !Number.isNaN(at.getTime())) return at;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(sc?.source?.date ?? '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3], START_HOUR, 0, 0) : new Date(2026, 0, 5, START_HOUR, 0, 0);
}

// The session's time once `workMs` of work is done (the counter's own total).
export const sessionTime = (sc, workMs = 0) => new Date(sessionStart(sc).getTime() + (Number.isFinite(workMs) ? workMs : 0));

const hm = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
// The MacBook's menu bar: "Sat Oct 10  9:00 AM".
export const menuBarText = (d) => `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', '')}  ${hm(d)}`;
// The iPhone's status bar and the phone's time pill: "9:00".
export const statusText = (d) => hm(d).replace(/\s?[AP]M$/, '');
