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

// ================================================================
//  Extra points: drinking + ticket, after party, bet, 2x question
//
//  quiz_config.extras (jsonb) holds the settings:
//    { drinking:{enabled}, ticket:{enabled,label,points}, party:{enabled,label,points},
//      bet:{enabled,win,loss,round}, double:{enabled,mult,max,rounds:{"3":[7,9]}} }
//      (bet.round > 0 = one fixed round for every team, 0 = each team picks its own)
//      (rounds: round -> numbers of the multiplied questions; mult = 2 means "2x")
//  teams.extras (jsonb) holds per-team entries:
//    { ticket:1, party:1, bet:{round:3, guess:7.5}, adjust:-3, adjust_note:"phone" }
//  scores.double_points = points the team got on that round's multiplied question(s);
//  the extra awarded is (mult - 1) times that amount (the points already count once).
//  adjust = free manual +/- points, always available, shown to players only when non-zero.
//  Drinking keeps its original columns (quiz_config.bonus_*, teams.shots_bonus).
// ================================================================

function extrasSettings(config) {
  var c = config || {};
  var ex = (c.extras && typeof c.extras === 'object') ? c.extras : {};
  function num(v, d) { var x = parseFloat(v); return (isNaN(x) || x < 0) ? d : x; }
  function lbl(v, d) { var t = ('' + (v || '')).trim(); return t || d; }
  var dr = bonusSettings(c);
  var t = ex.ticket || {}, p = ex.party || {}, b = ex.bet || {}, x = ex.double || {};
  var rounds = {};   // round -> array of question numbers (may be empty)
  if (x.rounds && typeof x.rounds === 'object') {
    Object.keys(x.rounds).forEach(function (k) {
      var v = x.rounds[k];
      rounds[k] = (Array.isArray(v) ? v : [v]).map(function (q) { return parseInt(q, 10); })
        .filter(function (q) { return q > 0; });
    });
  }
  var mult = parseInt(x.mult, 10);
  if (!(mult >= 2)) mult = 2;
  if (mult > 10) mult = 10;
  return {
    drinking: { enabled: !(ex.drinking && ex.drinking.enabled === false),
                label: dr.label, mode: dr.mode, max: dr.max, yesPoints: dr.yesPoints },
    ticket:   { enabled: t.enabled === true, label: lbl(t.label, 'Ticket'),      points: num(t.points, 1) },
    party:    { enabled: p.enabled === true, label: lbl(p.label, 'After party'), points: num(p.points, 1) },
    bet:      { enabled: b.enabled === true, label: 'Bet', win: num(b.win, 3), loss: num(b.loss, 1), round: Math.max(0, parseInt(b.round, 10) || 0) },
    double:   { enabled: x.enabled === true, label: mult + 'x question', mult: mult, max: Math.max(1, parseInt(x.max, 10) || 1), rounds: rounds }
  };
}

// Points a team earns from each extra. scoreRows = this team's score rows that count
// (public page: only published rounds). Bet is "pending" until its round has a score.
function teamExtraBreakdown(team, scoreRows, ex) {
  var te = (team && team.extras && typeof team.extras === 'object') ? team.extras : {};
  var rows = scoreRows || [];
  var out = { drinking: 0, ticket: 0, party: 0, bet: 0, double: 0, adjust: 0, betPending: false, total: 0 };

  if (ex.drinking.enabled) out.drinking = bonusPoints(team, ex.drinking);
  if (ex.ticket.enabled && te.ticket) out.ticket = ex.ticket.points;
  if (ex.party.enabled && te.party) out.party = ex.party.points;

  // A bet needs a guess (an empty guess = no bet, nothing won or lost) and a round
  // (the fixed bet round of the quiz, or the one the team picked).
  var betRound = ex.bet.round || (te.bet && te.bet.round);
  if (ex.bet.enabled && te.bet && betRound && te.bet.guess !== undefined && te.bet.guess !== null && te.bet.guess !== '') {
    var row = rows.find(function (s) { return s.round_number === betRound; });
    if (row) out.bet = Number(row.standard_points) === Number(te.bet.guess) ? ex.bet.win : -ex.bet.loss;
    else out.betPending = true;
  }

  if (ex.double.enabled) {
    rows.forEach(function (s) {
      if (ex.double.rounds[s.round_number] !== undefined) {
        out.double += (ex.double.mult - 1) * (Number(s.double_points) || 0);
      }
    });
  }

  out.adjust = Number(te.adjust) || 0;

  out.total = out.drinking + out.ticket + out.party + out.bet + out.double + out.adjust;
  return out;
}

// Group score rows by team id
function scoresByTeam(scoreRows) {
  var m = {};
  (scoreRows || []).forEach(function (s) { (m[s.team_id] = m[s.team_id] || []).push(s); });
  return m;
}
