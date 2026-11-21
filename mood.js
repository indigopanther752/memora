// mood.js — mood helpers shared by index.html (check-in) and progress.html (calendar).
// Load AFTER supabase.js, the client setup script, and script.js.

const MOODS = {
  awful: { label: 'Awful', color: '#E6A9A4' },
  low:   { label: 'Low',   color: '#A9B8DE' },
  okay:  { label: 'Okay',  color: '#E3CB8A' },
  good:  { label: 'Good',  color: '#A9C8B5' },
  great: { label: 'Great', color: '#EBCB6B' },
};

// Local-time date key like "2026-11-20" (toISOString would use UTC and can be off by a day)
function localDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Saves (or replaces) the mood for a day
async function saveMood(mood, dateKey = localDateKey()) {
  const { data, error: userError } = await supabaseClient.auth.getUser();
  const user = data && data.user;
  if (userError || !user) return { error: userError || new Error('Please log in first.') };

  return supabaseClient.from('mood_entries').upsert(
    { user_id: user.id, entry_date: dateKey, mood, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,entry_date' }
  );
}

// Returns { 'YYYY-MM-DD': 'good', ... } for the date range
async function fetchMoods(startKey, endKey) {
  const { data, error } = await supabaseClient
    .from('mood_entries')
    .select('entry_date, mood')
    .gte('entry_date', startKey)
    .lte('entry_date', endKey);

  const map = {};
  if (!error && data) data.forEach((row) => { map[row.entry_date] = row.mood; });
  return { map, error };
}

// Small round face used in the calendar + legend (drawn in code, no extra files needed)
function moodFaceSVG(mood, size = 28) {
  const color = (MOODS[mood] || MOODS.okay).color;
  const ink = '#4A4A45';
  const eyes = `<circle cx="11.5" cy="13.5" r="1.4" fill="${ink}"/><circle cx="20.5" cy="13.5" r="1.4" fill="${ink}"/>`;
  const faces = {
    awful: `<path d="M8.5 10.5l5 2M23.5 10.5l-5 2" stroke="${ink}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
            <path d="M11 22c1.5-2.5 8.5-2.5 10 0" stroke="${ink}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`,
    low:   `${eyes}<path d="M11.5 21.5c1.5-2 7.5-2 9 0" stroke="${ink}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`,
    okay:  `${eyes}<path d="M11.5 21h9" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/>`,
    good:  `${eyes}<path d="M11 19.5c2 3 8 3 10 0" stroke="${ink}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`,
    great: `${eyes}<path d="M10.5 19h11c0 4-2.5 6-5.5 6s-5.5-2-5.5-6z" fill="${ink}"/>`,
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" aria-label="${(MOODS[mood] || {}).label || ''}" role="img">
    <circle cx="16" cy="16" r="16" fill="${color}"/>${faces[mood] || ''}</svg>`;
}

/* ---------------- Home page: daily check-in ---------------- */
(function initCheckIn() {
  const buttons = document.querySelectorAll('.mood-btn');
  if (!buttons.length) return; // not on the home page

  // Highlight style for the chosen face (!important so it beats the inline button styles)
  const style = document.createElement('style');
  style.textContent = `
    .mood-btn { border-radius: 16px !important; transition: background .15s, box-shadow .15s; }
    .mood-btn.selected {
      background: #F2F5EE !important;
      box-shadow: 0 0 0 1.5px #8FB3A3 !important;
    }`;
  document.head.appendChild(style);

  const titleEl = document.getElementById('mood-status-title');
  const subEl = document.getElementById('mood-status-sub');
  const todayKey = localDateKey();
  const todayLabel = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  function showSelected(mood) {
    buttons.forEach((b) => b.classList.toggle('selected', b.dataset.mood === mood));
    if (titleEl) titleEl.textContent = `${todayLabel} · ${MOODS[mood].label}`;
    if (subEl) subEl.textContent = 'Your choice appears in your mood calendar.';
  }

  // Restore today's saved mood when the page loads
  fetchMoods(todayKey, todayKey).then(({ map }) => {
    if (map[todayKey] && MOODS[map[todayKey]]) showSelected(map[todayKey]);
  });

  buttons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const mood = btn.dataset.mood;
      if (!MOODS[mood]) return;

      showSelected(mood); // instant feedback
      if (subEl) subEl.textContent = 'Saving…';

      const { error } = await saveMood(mood, todayKey);
      if (error) {
        if (titleEl) titleEl.textContent = 'Could not save your mood.';
        if (subEl) subEl.textContent = error.message || 'Please try again.';
        buttons.forEach((b) => b.classList.remove('selected'));
        return;
      }
      showSelected(mood); // runs after script.js's older click handler, so this text wins
    });
  });
})();
