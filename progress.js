// progress.js — draws the mood calendar on progress.html. Needs mood.js loaded first.
//
// How it works:
//  1. The grid is built from the real date (new Date()) — month length, which weekday the
//     1st falls on, and which cell is "today" are all calculated, nothing is hard-coded.
//  2. The grid is drawn immediately, then moods are fetched from Supabase and the faces are added.
//  3. It redraws itself when the day changes (midnight) and when you come back to the tab,
//     so a mood picked on Home shows up here and "Today" always moves to the right cell.

(function initCalendar() {
  const grid = document.getElementById('calendar-grid');
  if (!grid) return;

  const titleEl = document.getElementById('month-title');
  const hintEl = document.getElementById('hint');
  const errorEl = document.getElementById('calendar-error');
  const legendEl = document.getElementById('legend');
  const chipEl = document.getElementById('today-chip');

  let viewYear = new Date().getFullYear();
  let viewMonth = new Date().getMonth(); // 0 = January ... 11 = December
  let renderToken = 0;                   // ignores late responses if you click months quickly

  legendEl.innerHTML = Object.keys(MOODS).map((m) =>
    `<span>${moodFaceSVG(m, 18)}${MOODS[m].label}</span>`
  ).join('');

  function render() {
    const now = new Date();               // read fresh every time so "today" is never stale
    const todayKey = localDateKey(now);
    const token = ++renderToken;

    chipEl.textContent = 'Today · ' + now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

    const first = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const leading = first.getDay();                                  // 0 = Sunday
    const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7;   // full weeks only

    const gridStart = new Date(viewYear, viewMonth, 1 - leading);    // Sunday on/before the 1st
    const gridEnd = new Date(viewYear, viewMonth, 1 - leading + totalCells - 1);

    titleEl.textContent = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
    hintEl.textContent = isCurrentMonth
      ? 'Choose a mood on Home to update ' + now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) + '.'
      : '';
    errorEl.textContent = '';

    // Step 1: draw the empty calendar right away
    let html = '';
    for (let i = 0; i < totalCells; i++) {
      const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
      const key = localDateKey(d);
      const outside = d.getMonth() !== viewMonth;
      const isToday = key === todayKey;
      const label = outside && d.getDate() === 1
        ? d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })   // "1 Dec"
        : d.getDate();

      html += `<div class="cell${outside ? ' outside' : ''}${isToday ? ' today' : ''}" data-date="${key}">
        <span>${label}</span>
        <span class="face"></span>
        ${isToday ? '<span class="today-label">Today</span>' : ''}
      </div>`;
    }
    grid.innerHTML = html;

    // Step 2: fetch saved moods and drop a face into each matching day
    fetchMoods(localDateKey(gridStart), localDateKey(gridEnd)).then(({ map, error }) => {
      if (token !== renderToken) return; // a newer render replaced this one
      if (error) {
        errorEl.textContent = 'Could not load your moods: ' + error.message;
        return;
      }
      Object.keys(map).forEach((key) => {
        const cell = grid.querySelector(`[data-date="${key}"] .face`);
        if (cell && MOODS[map[key]]) cell.innerHTML = moodFaceSVG(map[key], 28);
      });
    });
  }

  document.getElementById('prev-month').addEventListener('click', () => {
    viewMonth--;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    render();
  });
  document.getElementById('next-month').addEventListener('click', () => {
    viewMonth++;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    render();
  });

  // Coming back to this tab (e.g. after picking a mood on Home) refreshes the faces
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') render();
  });
  window.addEventListener('focus', render);

  // When the clock passes midnight, move "Today" to the new day (and new month if needed)
  function scheduleMidnightRefresh() {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    setTimeout(() => {
      const t = new Date();
      viewYear = t.getFullYear();
      viewMonth = t.getMonth();
      render();
      scheduleMidnightRefresh();
    }, nextMidnight - now);
  }

  render();
  scheduleMidnightRefresh();
})();
