// Drinking bonus helpers, shared by the public scoreboard (app.js) and admin.js.
//
// Settings live in the quiz_config row (bonus_label, bonus_mode, bonus_max,
// bonus_yes_points). Each team's value is stored in teams.shots_bonus:
//   yes_no mode: 0 or 1 (worth bonus_yes_points points)
//   count mode:  0..bonus_max (1 point per order)
// Missing fields (old database) fall back to the original "Shots" yes/no, 1 point.

function bonusSettings(config) {
  var c = config || {};
  var mode = c.bonus_mode === 'count' ? 'count' : 'yes_no';
  var max = parseInt(c.bonus_max, 10);
  if (!(max >= 1)) max = 3;
  var yes = parseFloat(c.bonus_yes_points);
  if (isNaN(yes) || yes < 0) yes = 1;
  var label = ('' + (c.bonus_label || '')).trim() || 'Shots';
  return { label: label, mode: mode, max: max, yesPoints: yes };
}

// Highest value a team's shots_bonus may have under these settings
function bonusValueMax(s) {
  return s.mode === 'count' ? s.max : 1;
}

// Points a team earns from the bonus
function bonusPoints(team, s) {
  var v = team.shots_bonus || 0;
  return s.mode === 'count' ? v : (v ? s.yesPoints : 0);
}

// Short text for a table cell
function bonusDisplay(team, s) {
  var v = team.shots_bonus || 0;
  if (!v) return '-';
  return s.mode === 'count' ? '' + v : '\u2713';
}
