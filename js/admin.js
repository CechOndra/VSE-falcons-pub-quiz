// Admin panel logic
(function () {
  'use strict';

  // ---- State ----
  let config = null;
  let teams  = [];
  let allScores = [];
  let helperMode = false;   // helper accounts only see the Extra Points card

  // ---- DOM refs ----
  const loginSection  = document.getElementById('loginSection');
  const dashboard     = document.getElementById('dashboard');
  const signOutBtn    = document.getElementById('signOutBtn');
  const loginBtn      = document.getElementById('loginBtn');
  const loginEmail    = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');
  const loginMsg      = document.getElementById('loginMsg');

  const setupSection  = document.getElementById('setupSection');
  const configBanner  = document.getElementById('configBanner');
  const configSummary = document.getElementById('configSummary');
  const resetBtn      = document.getElementById('resetBtn');
  const publishStatus = document.getElementById('publishStatus');
  const publishBtn    = document.getElementById('publishBtn');
  const unpublishBtn  = document.getElementById('unpublishBtn');

  const setupRounds    = document.getElementById('setupRounds');
  const setupQuestions = document.getElementById('setupQuestions');
  const setupTipAll    = document.getElementById('setupTipAll');
  const perRoundTip    = document.getElementById('perRoundTip');
  const setupTeams     = document.getElementById('setupTeams');
  const setupSaveBtn   = document.getElementById('setupSaveBtn');
  const setupMsg       = document.getElementById('setupMsg');

  const scoreSection  = document.getElementById('scoreSection');
  const roundSelect   = document.getElementById('roundSelect');
  const scoreBody     = document.getElementById('scoreBody');
  const maxPtsLabel   = document.getElementById('maxPtsLabel');
  const tipHeader     = document.getElementById('tipHeader');
  const saveRoundBtn  = document.getElementById('saveRoundBtn');
  const scoreMsg      = document.getElementById('scoreMsg');

  const csvFile       = document.getElementById('csvFile');
  const csvText       = document.getElementById('csvText');
  const csvImportBtn  = document.getElementById('csvImportBtn');

  const teamsSection   = document.getElementById('teamsSection');
  const teamsBody      = document.getElementById('teamsBody');
  const teamsMsg       = document.getElementById('teamsMsg');
  const saveTeamsBtn   = document.getElementById('saveTeamsBtn');
  const teamsEditBtn   = document.getElementById('teamsEditBtn');
  const teamsEditBar   = document.getElementById('teamsEditBar');
  const teamsActionHead = document.getElementById('teamsActionHead');
  const addTeamBtn     = document.getElementById('addTeamBtn');
  const cancelTeamsBtn = document.getElementById('cancelTeamsBtn');

  const shotsSection   = document.getElementById('shotsSection');
  const shotsBody      = document.getElementById('shotsBody');
  const shotsMsg       = document.getElementById('shotsMsg');
  const saveShotsBtn   = document.getElementById('saveShotsBtn');
  const bonusTitle     = document.getElementById('bonusTitle');
  const bonusDesc      = document.getElementById('bonusDesc');
  const bonusSummary   = document.getElementById('bonusSummary');
  const bonusEditBtn   = document.getElementById('bonusEditBtn');
  const bonusSettingsView = document.getElementById('bonusSettingsView');
  const bonusSettingsForm = document.getElementById('bonusSettingsForm');
  const bonusSaveSettingsBtn = document.getElementById('bonusSaveSettingsBtn');
  const bonusCancelBtn    = document.getElementById('bonusCancelBtn');
  const extrasEditBox     = document.getElementById('extrasEditBox');
  const setupExtrasBox    = document.getElementById('setupExtrasBox');
  const extrasEntryHead   = document.getElementById('extrasEntryHead');
  const doubleBox         = document.getElementById('doubleBox');
  const doubleOn          = document.getElementById('doubleOn');
  const doubleQ           = document.getElementById('doubleQ');
  const doubleQWrap       = document.getElementById('doubleQWrap');
  const doubleHint        = document.getElementById('doubleHint');
  const doubleOnLabel     = document.getElementById('doubleOnLabel');
  const csvToggleBtn      = document.getElementById('csvToggleBtn');
  const doubleEntry       = document.getElementById('doubleEntry');
  const helperNoQuiz      = document.getElementById('helperNoQuiz');
  const csvSection        = document.getElementById('csvSection');
  const dblHeader         = document.getElementById('dblHeader');

  const summarySection = document.getElementById('summarySection');
  const summaryHead    = document.getElementById('summaryHead');
  const summaryBody    = document.getElementById('summaryBody');

  const exportSection   = document.getElementById('exportSection');
  const exportFormat    = document.getElementById('exportFormat');
  const exportStandings = document.getElementById('exportStandings');
  const exportBreakdown = document.getElementById('exportBreakdown');
  const exportState     = document.getElementById('exportState');
  const exportName      = document.getElementById('exportName');
  const checksSection   = document.getElementById('checksSection');
  const checksList      = document.getElementById('checksList');
  const archiveSection  = document.getElementById('archiveSection');
  const archiveMsg      = document.getElementById('archiveMsg');
  const archiveSaveBox  = document.getElementById('archiveSaveBox');
  const archiveName     = document.getElementById('archiveName');
  const archiveIsTest   = document.getElementById('archiveIsTest');
  const archiveSaveBtn  = document.getElementById('archiveSaveBtn');
  const archiveNewBtn   = document.getElementById('archiveNewBtn');
  const archiveList     = document.getElementById('archiveList');
  const exportBtn       = document.getElementById('exportBtn');
  const exportMsg       = document.getElementById('exportMsg');

  // ---- Helpers ----
  function showMsg(el, text, type) {
    el.innerHTML = '<div class="msg msg-' + type + '">' + escHtml(text) + '</div>';
    setTimeout(function () { el.innerHTML = ''; }, 5000);
  }

  function escHtml(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ================================================================
  //  AUTH
  // ================================================================

  async function checkSession() {
    var { data } = await db.auth.getSession();
    if (data.session) {
      showDashboard();
    }
  }

  loginBtn.addEventListener('click', async function () {
    var email = loginEmail.value.trim();
    var pw    = loginPassword.value;
    if (!email || !pw) { showMsg(loginMsg, 'Enter email and password.', 'error'); return; }

    loginBtn.disabled = true;
    var { error } = await db.auth.signInWithPassword({ email: email, password: pw });
    loginBtn.disabled = false;

    if (error) { showMsg(loginMsg, error.message, 'error'); return; }
    showDashboard();
  });

  // Allow Enter key on password field
  loginPassword.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') loginBtn.click();
  });

  signOutBtn.addEventListener('click', async function () {
    await db.auth.signOut();
    helperMode = false;
    document.body.classList.remove('helper-mode');
    helperNoQuiz.classList.add('hidden');
    loginSection.classList.remove('hidden');
    dashboard.classList.add('hidden');
    signOutBtn.classList.add('hidden');
  });

  async function showDashboard() {
    loginSection.classList.add('hidden');
    dashboard.classList.remove('hidden');
    signOutBtn.classList.remove('hidden');
    // Accounts with app_metadata.role = "helper" only get the Extra Points card
    var { data: sess } = await db.auth.getSession();
    var user = sess && sess.session && sess.session.user;
    helperMode = !!(user && user.app_metadata && user.app_metadata.role === 'helper');
    document.body.classList.toggle('helper-mode', helperMode);
    await loadConfig();
    helperNoQuiz.classList.toggle('hidden', !(helperMode && teams.length === 0));
    if (helperMode) shotsSection.classList.remove('collapsed');
    else await loadArchive();
  }

  // ================================================================
  //  QUIZ SETUP
  // ================================================================

  async function loadConfig() {
    var { data } = await db.from('quiz_config').select('*').eq('id', 1).maybeSingle();
    config = data;
    archiveSaveBox.classList.toggle('hidden', !config);
    if (!config) checksSection.classList.add('hidden');

    if (!config) {
      setupSection.classList.remove('hidden');
      configBanner.classList.add('hidden');
      scoreSection.classList.add('hidden');
      teamsSection.classList.add('hidden');
      shotsSection.classList.add('hidden');
      summarySection.classList.add('hidden');
      exportSection.classList.add('hidden');
      return;
    }

    // Config exists — lock setup, show banner
    setupSection.classList.add('hidden');
    configBanner.classList.remove('hidden');

    // Load teams
    var { data: t } = await db.from('teams').select('*').order('name');
    teams = t || [];

    var tipovacka = config.has_tipovacka || [];
    var tipCount = tipovacka.filter(function (v) { return v; }).length;
    configSummary.textContent = config.rounds + ' rounds, '
      + config.questions_per_round + ' questions each, '
      + teams.length + ' teams, '
      + tipCount + ' rounds with Tipovacka.';

    updatePublishStatus();
    showScoreSection();
    renderTeamsSection();
    renderShotsSection();
    await loadAllScores();
  }

  // ---- Teams (view / edit) ----
  var teamsEditing = false;

  // Small icon next to teams that were edited/added after the quiz started.
  // The note (teams.mod_note) is one line per change; shown as the tooltip.
  function teamFlag(t) {
    if (!t || !t.mod_note) return '';
    return ' <span class="mod-flag" title="' + attrEsc('Modified after quiz start:\n' + t.mod_note) + '">\u270E</span>';
  }

  // Does the loaded teams data have the mod_note column (migration run)?
  function modNoteSupported() {
    return teams.length > 0 && Object.prototype.hasOwnProperty.call(teams[0], 'mod_note');
  }

  function stamp() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  // How far the quiz was when a change was made, e.g. "after round 3 was published"
  function progressText() {
    var pub = config.published_rounds || 0;
    return pub > 0 ? 'after round ' + pub + ' was published' : 'before any round was published';
  }

  // Escape for use inside a double-quoted HTML attribute
  function attrEsc(str) { return escHtml(str).replace(/"/g, '&quot;'); }

  function teamEditRow(t) {
    return '<tr data-team-id="' + (t ? t.id : '') + '"' + (t ? '' : ' data-new="1"') + '>'
      + '<td><input type="text" class="team-name" maxlength="60" placeholder="Team name" value="' + attrEsc(t ? t.name : '') + '"></td>'
      + '<td class="text-center"><input type="number" class="score-input team-players" min="1" step="1" value="' + (t ? (t.player_count || 1) : 1) + '"></td>'
      + '<td class="text-center"><button type="button" class="btn btn-secondary team-remove">Remove</button></td>'
      + '</tr>';
  }

  function renderTeamsSection() {
    if (teams.length === 0 && !teamsEditing) { teamsSection.classList.add('hidden'); return; }
    teamsSection.classList.remove('hidden');
    teamsActionHead.classList.toggle('hidden', !teamsEditing);
    teamsEditBar.classList.toggle('hidden', !teamsEditing);
    teamsEditBtn.classList.toggle('hidden', teamsEditing);
    var html = '';
    teams.forEach(function (t) {
      if (teamsEditing) {
        html += teamEditRow(t);
      } else {
        var noteHtml = t.mod_note
          ? '<div style="font-size:0.7rem;opacity:0.65;white-space:pre-line;">' + escHtml(t.mod_note) + '</div>' : '';
        html += '<tr><td>' + escHtml(t.name) + teamFlag(t) + noteHtml + '</td><td class="text-center">' + (t.player_count || 1) + '</td></tr>';
      }
    });
    teamsBody.innerHTML = html;
  }

  teamsEditBtn.addEventListener('click', function () {
    if (!confirmMidQuizEdit('team names, player counts or the list of teams',
        'Renaming, adding or removing teams (and changing player counts, which decide ties) can change standings that are already scored or shown to players.')) return;
    teamsEditing = true;
    teamsMsg.innerHTML = '';
    renderTeamsSection();
  });

  teamsBody.addEventListener('click', function (e) {
    var btn = e.target.closest('.team-remove');
    if (!btn) return;
    var tr = btn.closest('tr');
    if (tr.hasAttribute('data-new')) { tr.remove(); return; }
    var nowRemoved = !tr.hasAttribute('data-removed');
    tr.toggleAttribute('data-removed', nowRemoved);
    tr.style.opacity = nowRemoved ? '0.4' : '';
    btn.textContent = nowRemoved ? 'Undo' : 'Remove';
    tr.querySelectorAll('input').forEach(function (i) { i.disabled = nowRemoved; });
  });

  addTeamBtn.addEventListener('click', function () {
    teamsBody.insertAdjacentHTML('beforeend', teamEditRow(null));
    var inputs = teamsBody.querySelectorAll('.team-name');
    inputs[inputs.length - 1].focus();
  });

  cancelTeamsBtn.addEventListener('click', function () {
    teamsEditing = false;
    teamsMsg.innerHTML = '';
    renderTeamsSection();
  });

  saveTeamsBtn.addEventListener('click', async function () {
    var removed = [], added = [], changed = [];
    var seen = {};
    var kept = 0;
    var rows = teamsBody.querySelectorAll('tr');
    for (var i = 0; i < rows.length; i++) {
      var tr = rows[i];
      var id = tr.getAttribute('data-team-id');
      if (tr.hasAttribute('data-removed')) { removed.push(id); continue; }

      var name = tr.querySelector('.team-name').value.trim();
      var players = parseInt(tr.querySelector('.team-players').value, 10);
      if (!name) { showMsg(teamsMsg, 'Every team needs a name (or use Remove).', 'error'); return; }
      if (isNaN(players) || players < 1) { showMsg(teamsMsg, 'Invalid player count for "' + name + '".', 'error'); return; }
      var key = name.toLowerCase();
      if (seen[key]) { showMsg(teamsMsg, 'Duplicate team name: "' + name + '".', 'error'); return; }
      seen[key] = true;
      kept++;

      if (tr.hasAttribute('data-new')) {
        added.push({ name: name, player_count: players, mod_note: stamp() + ' added (' + progressText() + ')' });
      } else {
        var old = teams.find(function (t) { return t.id === id; });
        if (old && (old.name !== name || (old.player_count || 1) !== players)) {
          var parts = [];
          if (old.name !== name) parts.push('renamed from "' + old.name + '"');
          if ((old.player_count || 1) !== players) parts.push('players ' + (old.player_count || 1) + ' \u2192 ' + players);
          var line = stamp() + ' ' + parts.join(', ') + ' (' + progressText() + ')';
          changed.push({ id: id, name: name, player_count: players,
                         mod_note: old.mod_note ? old.mod_note + '\n' + line : line });
        }
      }
    }

    if (kept === 0) { showMsg(teamsMsg, 'A quiz needs at least one team.', 'error'); return; }
    var startedBefore = quizHasStarted();   // evaluated before anything changes
    if (!removed.length && !added.length && !changed.length) { showMsg(teamsMsg, 'No changes to save.', 'info'); return; }

    if (removed.length) {
      var names = removed.map(function (rid) {
        var t = teams.find(function (x) { return x.id === rid; });
        return t ? t.name : rid;
      });
      var ok = confirm('Removing ' + (names.length === 1 ? 'this team' : 'these teams') + ' permanently deletes '
        + 'all of their scores and bonus:\n\n' + names.join('\n') + '\n\nThis cannot be undone. Continue?');
      if (!ok) return;
    }

    saveTeamsBtn.disabled = true;
    function fail(err) {
      showMsg(teamsMsg, err.message, 'error');
      saveTeamsBtn.disabled = false;
    }

    // Deletes first so a removed team's name can be reused
    if (removed.length) {
      var { error: dErr } = await db.from('teams').delete().in('id', removed);
      if (dErr) return fail(dErr);
    }
    // Only record modification notes when the quiz had started and the column exists
    var track = startedBefore && modNoteSupported();
    for (var c = 0; c < changed.length; c++) {
      var upd = { name: changed[c].name, player_count: changed[c].player_count };
      if (track) upd.mod_note = changed[c].mod_note;
      var { error: uErr } = await db.from('teams').update(upd).eq('id', changed[c].id);
      if (uErr) return fail(uErr);
    }
    if (added.length) {
      var addRows = added.map(function (a) {
        return track ? a : { name: a.name, player_count: a.player_count };
      });
      var { error: iErr } = await db.from('teams').insert(addRows);
      if (iErr) return fail(iErr);
    }

    saveTeamsBtn.disabled = false;
    teamsEditing = false;
    await loadConfig();

    var parts = [];
    if (added.length)   parts.push(added.length + ' added');
    if (changed.length) parts.push(changed.length + ' changed');
    if (removed.length) parts.push(removed.length + ' removed');
    var msg = 'Teams saved (' + parts.join(', ') + ').';
    if (added.length && allScores.length > 0) {
      msg += ' New teams have no points for rounds that are already saved. Pick that round in Score Entry and save it again to enter them.';
    }
    if (startedBefore && !modNoteSupported() && teams.length > 0) {
      msg += ' (Run migrations/2026-11-team-modified.sql in Supabase to also mark modified teams with an icon.)';
    }
    showMsg(teamsMsg, msg, 'success');
  });

  // ---- Extra points ----
  function fmtPts(n) { return (+n).toString(); }

  // Points with a sign for negatives, "-" for none
  function fmtExtra(v) {
    if (!v) return '-';
    return v > 0 ? '' + v : '−' + Math.abs(v);
  }

  function ptsText(n) { return fmtPts(n) + ' point' + (+n === 1 ? '' : 's'); }

  // One short line per enabled extra (settings summary, also used in the export)
  function extrasSummaryLines(ex) {
    var L = [];
    if (ex.drinking.enabled) {
      L.push(ex.drinking.label + ': ' + (ex.drinking.mode === 'count'
        ? 'count, 1 point per round of drinks, up to ' + ex.drinking.max
        : 'yes/no, ' + ptsText(ex.drinking.yesPoints)));
    }
    if (ex.ticket.enabled) L.push(ex.ticket.label + ': yes/no, ' + ptsText(ex.ticket.points));
    if (ex.party.enabled)  L.push(ex.party.label + ': yes/no, ' + ptsText(ex.party.points));
    if (ex.bet.enabled) {
      L.push('Bet: +' + fmtPts(ex.bet.win) + ' if the guess is right, \u2212' + fmtPts(ex.bet.loss) + ' if wrong (one bet per team, '
        + (ex.bet.round ? 'round ' + ex.bet.round + ' for everyone' : 'each team picks its round') + '; empty guess = no bet)');
    }
    if (ex.double.enabled) {
      var used = Object.keys(ex.double.rounds).sort(function (a, b) { return a - b; }).map(function (r) {
        var qs = ex.double.rounds[r];
        return 'round ' + r + (qs.length ? ' (question' + (qs.length > 1 ? 's ' : ' ') + qs.join(', ') + ')' : '');
      });
      L.push(ex.double.mult + 'x question: up to ' + ex.double.max + ' round' + (ex.double.max === 1 ? '' : 's')
        + (used.length ? ', set for ' + used.join(', ') : ', none set yet'));
    }
    return L;
  }

  // ---- Extras settings form (used for quiz setup and for "Edit settings") ----
  function extrasFormHtml(p) {
    function block(id, title, inner) {
      return '<div style="margin-bottom:0.7rem;">'
        + '<div class="toggle-row"><input type="checkbox" id="' + p + id + 'On">'
        + '<label for="' + p + id + 'On" style="display:inline;margin:0;font-weight:600;">' + title + '</label></div>'
        + '<div id="' + p + id + 'Box" style="margin-left:1.6rem;">' + inner + '</div></div>';
    }
    function field(id, label, attrs) {
      return '<span style="display:inline-block;margin:0.2rem 0.9rem 0.2rem 0;white-space:nowrap;">'
        + '<label for="' + p + id + '" style="display:inline;margin:0 0.4rem 0 0;">' + label + '</label>'
        + '<input ' + attrs + ' id="' + p + id + '" style="width:' + (attrs.indexOf('type="text"') >= 0 ? '150px' : '75px') + ';"></span>';
    }
    var num = 'type="number" min="0" max="10" step="0.5"';
    return block('Drink', 'Drinking (team orders drinks for every member)',
          field('DrinkLabel', 'Name', 'type="text" maxlength="30"')
        + '<select id="' + p + 'DrinkMode" style="width:auto;margin:0.2rem 0;">'
        + '<option value="yes_no">Yes / No (one-time)</option>'
        + '<option value="count">Count (1 point per round of drinks, up to a maximum)</option></select><br>'
        + '<span id="' + p + 'DrinkYesRow">' + field('DrinkYes', 'Points for yes', num) + '</span>'
        + '<span id="' + p + 'DrinkMaxRow">' + field('DrinkMax', 'Max orders (= max points)', 'type="number" min="1" max="20" step="1"') + '</span>')
      + block('Ticket', 'Game ticket (yes/no)',
          field('TicketLabel', 'Name', 'type="text" maxlength="30"') + field('TicketPts', 'Points', num))
      + block('Party', 'After-party ticket (yes/no)',
          field('PartyLabel', 'Name', 'type="text" maxlength="30"') + field('PartyPts', 'Points', num))
      + block('Bet', 'Bet (team guesses the points it gets in a round, once per team)',
          field('BetWin', 'Points if correct', num) + field('BetLoss', 'Points lost if wrong', num)
          + field('BetRound', 'Fixed round for everyone (0 = each team picks)', 'type="number" min="0" max="20" step="1"'))
      + block('Double', 'Multiplied question (the voted question counts extra)',
          field('DoubleMult', 'Multiplier (2 = 2x)', 'type="number" min="2" max="10" step="1"')
        + field('DoubleMax', 'Max rounds with one', 'type="number" min="1" max="10" step="1"'));
  }

  function fillExtrasForm(p, ex) {
    function el(id) { return document.getElementById(p + id); }
    el('DrinkOn').checked = ex.drinking.enabled;
    el('DrinkLabel').value = ex.drinking.label;
    el('DrinkMode').value = ex.drinking.mode;
    el('DrinkYes').value = ex.drinking.yesPoints;
    el('DrinkMax').value = ex.drinking.max;
    el('TicketOn').checked = ex.ticket.enabled;
    el('TicketLabel').value = ex.ticket.label;
    el('TicketPts').value = ex.ticket.points;
    el('PartyOn').checked = ex.party.enabled;
    el('PartyLabel').value = ex.party.label;
    el('PartyPts').value = ex.party.points;
    el('BetOn').checked = ex.bet.enabled;
    el('BetWin').value = ex.bet.win;
    el('BetLoss').value = ex.bet.loss;
    el('BetRound').value = ex.bet.round;
    el('DoubleOn').checked = ex.double.enabled;
    el('DoubleMax').value = ex.double.max;
    el('DoubleMult').value = ex.double.mult;
  }

  // Show only the fields that belong to enabled extras / the chosen drinking mode
  function syncExtrasForm(p) {
    function el(id) { return document.getElementById(p + id); }
    ['Drink', 'Ticket', 'Party', 'Bet', 'Double'].forEach(function (id) {
      el(id + 'Box').classList.toggle('hidden', !el(id + 'On').checked);
    });
    var count = el('DrinkMode').value === 'count';
    el('DrinkYesRow').classList.toggle('hidden', count);
    el('DrinkMaxRow').classList.toggle('hidden', !count);
  }

  function renderExtrasForm(box, p, ex) {
    box.innerHTML = extrasFormHtml(p);
    fillExtrasForm(p, ex);
    syncExtrasForm(p);
    box.addEventListener('change', function () { syncExtrasForm(p); });
  }

  // Read + validate the form; returns the object to store in quiz_config, or null (message shown)
  function readExtrasForm(p, msgEl, roundsCount) {
    function el(id) { return document.getElementById(p + id); }
    var err = null;
    function val(id, what, min, max, half, enabled, def) {
      var v = parseFloat(el(id).value);
      var ok = !isNaN(v) && v >= min && v <= max && (half ? (v * 2) % 1 === 0 : Number.isInteger(v));
      if (ok) return v;
      if (enabled && !err) {
        err = what + ' must be ' + (half ? min + ' to ' + max + ' in steps of 0.5' : 'a whole number from ' + min + ' to ' + max) + '.';
      }
      return def;
    }
    function txt(id, what, enabled, def) {
      var t = el(id).value.trim();
      if (t) return t;
      if (enabled && !err) err = 'Enter a name for ' + what + '.';
      return def;
    }
    var dOn = el('DrinkOn').checked, tOn = el('TicketOn').checked, pOn = el('PartyOn').checked,
        bOn = el('BetOn').checked, xOn = el('DoubleOn').checked;

    var out = {
      bonus_label: txt('DrinkLabel', 'the drinking bonus', dOn, 'Drinking'),
      bonus_mode: el('DrinkMode').value === 'count' ? 'count' : 'yes_no',
      bonus_yes_points: val('DrinkYes', 'Drinking points for "yes"', 0, 10, true, dOn && el('DrinkMode').value !== 'count', 1),
      bonus_max: val('DrinkMax', 'Drinking maximum orders', 1, 20, false, dOn && el('DrinkMode').value === 'count', 3),
      extras: {
        drinking: { enabled: dOn },
        ticket: { enabled: tOn, label: txt('TicketLabel', 'the game ticket', tOn, 'Ticket'), points: val('TicketPts', 'Game ticket points', 0, 10, true, tOn, 1) },
        party:  { enabled: pOn, label: txt('PartyLabel', 'the after-party ticket', pOn, 'After party'), points: val('PartyPts', 'After-party points', 0, 10, true, pOn, 1) },
        bet:    { enabled: bOn, win: val('BetWin', 'Bet points if correct', 0, 10, true, bOn, 3), loss: val('BetLoss', 'Bet points lost if wrong', 0, 10, true, bOn, 1),
                round: val('BetRound', 'Bet round', 0, 20, false, bOn, 0) },
        double: { enabled: xOn, mult: val('DoubleMult', 'Multiplier', 2, 10, false, xOn, 2), max: val('DoubleMax', 'Max rounds with a multiplied question', 1, 10, false, xOn, 1), rounds: {} }
      }
    };
    if (bOn && out.extras.bet.round > roundsCount && !err) err = 'The fixed bet round must be between 1 and ' + roundsCount + ' (or 0 so each team picks).';
    if (err) { showMsg(msgEl, err, 'error'); return null; }
    return out;
  }

  // ---- Extra points: entry table ----
  function teamScoreRows(t) {
    return allScores.filter(function (s) { return s.team_id === t.id; });
  }

  // The Adjustment note column stays hidden until you click the Adjustment column
  // (or when a team already has a note). Toggling just shows/hides cells, so typed values are kept.
  var adjustNotesOpen = false;

  // Every entry field has a data-key. The value it had when drawn is remembered, so Save only
  // writes fields that were actually changed here (another person's changes are not overwritten).
  var entryBaseline = {};

  function entryValue(el) { return el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value.trim(); }
  function isEntryDirty(el) {
    var k = el.getAttribute('data-key');
    return k !== null && entryBaseline[k] !== undefined && entryBaseline[k] !== entryValue(el);
  }
  function recordBaseline() {
    entryBaseline = {};
    shotsSection.querySelectorAll('[data-key]').forEach(function (el) { entryBaseline[el.getAttribute('data-key')] = entryValue(el); });
  }
  function hasDirtyEntries() {
    return Array.prototype.some.call(shotsSection.querySelectorAll('[data-key]'), isEntryDirty);
  }

  // On a phone each team row becomes a card; the labels come from the table header
  function labelCells() {
    var heads = Array.prototype.map.call(extrasEntryHead.querySelectorAll('th'), function (th) {
      return th.textContent.replace('▾', '').trim();
    });
    shotsBody.querySelectorAll('tr').forEach(function (tr) {
      Array.prototype.forEach.call(tr.children, function (td, i) { td.setAttribute('data-label', i === 0 ? '' : (heads[i] || '')); });
    });
  }

  function entryAttrs(t, extra) {
    return 'data-team-id="' + t.id + '" data-extra="' + extra + '" data-key="' + t.id + ':' + extra + '"';
  }

  function renderShotsSection() {
    if (teams.length === 0) { shotsSection.classList.add('hidden'); return; }
    shotsSection.classList.remove('hidden');
    var ex = extrasSettings(config);

    var lines = extrasSummaryLines(ex);
    bonusSummary.innerHTML = lines.length
      ? lines.map(function (l) { return escHtml(l); }).join('<br>')
      : 'No extra points are enabled.';
    bonusDesc.textContent = 'Drinking, tickets, the bet and free adjustments are entered here. Bet: leave the guess empty if the team did not bet. An adjustment (e.g. -3 for phone use) shows to players only when it is not 0. The multiplied question is marked per round in Enter Scores; its points can be entered below.';

    var head = '<tr><th>Team</th>';
    if (ex.drinking.enabled) head += '<th class="text-center">' + escHtml(ex.drinking.label) + '</th>';
    if (ex.ticket.enabled)   head += '<th class="text-center">' + escHtml(ex.ticket.label) + '</th>';
    if (ex.party.enabled)    head += '<th class="text-center">' + escHtml(ex.party.label) + '</th>';
    if (ex.bet.enabled) {
      head += ex.bet.round ? '<th class="text-center">Bet guess (round ' + ex.bet.round + ')</th>'
                           : '<th class="text-center">Bet round</th><th class="text-center">Bet guess</th>';
    }
    if (ex.double.enabled) head += '<th class="text-center" title="Entered in the ' + ex.double.mult + 'x table below or per round in Enter Scores">' + ex.double.mult + 'x</th>';
    var showNote = adjustNotesOpen || teams.some(function (t) { return t.extras && t.extras.adjust_note; });
    head += '<th class="text-center adj-head" style="cursor:pointer;" title="Click to show/hide the note column">Adjustment <span style="opacity:0.6;">▾</span></th>'
      + '<th class="text-center adj-note-cell' + (showNote ? '' : ' hidden') + '">Adjustment note</th>';
    head += '<th class="text-center">Extra total</th></tr>';
    extrasEntryHead.innerHTML = head;

    var html = '';
    teams.forEach(function (t) {
      var te = (t.extras && typeof t.extras === 'object') ? t.extras : {};
      var br = teamExtraBreakdown(t, teamScoreRows(t), ex);
      html += '<tr><td>' + escHtml(t.name) + teamFlag(t) + '</td>';
      if (ex.drinking.enabled) {
        var v = t.shots_bonus || 0;
        html += '<td class="text-center">' + (ex.drinking.mode === 'count'
          ? '<span class="stepper"><button type="button" class="step" data-dir="-1" aria-label="minus one">−</button>'
            + '<input type="number" class="score-input" ' + entryAttrs(t, 'drinking') + ' min="0" max="' + ex.drinking.max + '" step="1" value="' + v + '">'
            + '<button type="button" class="step" data-dir="1" aria-label="plus one">+</button></span>'
          : '<input type="checkbox" ' + entryAttrs(t, 'drinking') + (v ? ' checked' : '') + '>') + '</td>';
      }
      if (ex.ticket.enabled) html += '<td class="text-center"><input type="checkbox" ' + entryAttrs(t, 'ticket') + (te.ticket ? ' checked' : '') + '></td>';
      if (ex.party.enabled)  html += '<td class="text-center"><input type="checkbox" ' + entryAttrs(t, 'party') + (te.party ? ' checked' : '') + '></td>';
      if (ex.bet.enabled) {
        var bet = te.bet || {};
        if (!ex.bet.round) {
          html += '<td class="text-center"><input type="number" class="score-input" ' + entryAttrs(t, 'betRound') + ' min="1" max="' + config.rounds + '" step="1" value="' + (bet.round || '') + '"></td>';
        }
        html += '<td class="text-center"><input type="number" class="score-input" ' + entryAttrs(t, 'betGuess') + ' min="0" max="' + config.questions_per_round + '" step="0.5" value="' + (bet.guess !== undefined ? bet.guess : '') + '"></td>';
      }
      if (ex.double.enabled) {
        // Read-only here: the points are entered in the table below or in Enter Scores
        var dblParts = teamScoreRows(t).filter(function (s) { return ex.double.rounds[s.round_number] !== undefined && Number(s.double_points) > 0; })
          .sort(function (a, b) { return a.round_number - b.round_number; })
          .map(function (s) { return 'R' + s.round_number + ': ' + fmtExtra((ex.double.mult - 1) * Number(s.double_points)); });
        html += '<td class="text-center" style="opacity:0.85;" title="' + attrEsc(dblParts.join(', ')) + '">' + fmtExtra(br.double) + '</td>';
      }
      html += '<td class="text-center"><input type="number" class="score-input" ' + entryAttrs(t, 'adjust') + ' step="0.5" min="-100" max="100" placeholder="0" value="' + (te.adjust ? te.adjust : '') + '"></td>'
        + '<td class="text-center adj-note-cell' + (showNote ? '' : ' hidden') + '"><input type="text" ' + entryAttrs(t, 'adjustNote') + ' maxlength="80" placeholder="reason (admin only)" style="width:150px;" value="' + attrEsc(te.adjust_note || '') + '"></td>';
      var detail = [];
      if (ex.drinking.enabled && br.drinking) detail.push(ex.drinking.label + ' ' + fmtExtra(br.drinking));
      if (br.ticket) detail.push(ex.ticket.label + ' ' + fmtExtra(br.ticket));
      if (br.party) detail.push(ex.party.label + ' ' + fmtExtra(br.party));
      if (br.bet) detail.push('Bet ' + fmtExtra(br.bet));
      if (br.betPending) detail.push('Bet pending');
      if (br.double) detail.push(ex.double.mult + 'x ' + fmtExtra(br.double));
      if (br.adjust) detail.push('Adjustment ' + fmtExtra(br.adjust));
      html += '<td class="text-center" title="' + attrEsc(detail.join(', ')) + '"><strong>' + fmtExtra(br.total) + '</strong>'
        + (br.betPending ? ' <span style="opacity:0.6;">(bet pending)</span>' : '') + '</td></tr>';
    });
    shotsBody.innerHTML = html;
    labelCells();

    var yesNoDrink = ex.drinking.enabled && ex.drinking.mode !== 'count';
    checkAllShotsBtn.classList.toggle('hidden', !yesNoDrink);
    checkAllShotsBtn.textContent = 'Check All';

    renderDoubleEntry(ex);
    recordBaseline();
  }

  // Points each team got on the multiplied question, per marked round. Anyone with access to this
  // card can enter them; marking which round/question is multiplied stays in Enter Scores.
  function renderDoubleEntry(ex) {
    if (!ex.double.enabled) { doubleEntry.classList.add('hidden'); doubleEntry.innerHTML = ''; return; }
    doubleEntry.classList.remove('hidden');
    var rounds = Object.keys(ex.double.rounds).map(Number).sort(function (a, b) { return a - b; });
    var title = '<h3 style="font-size:0.95rem;margin:0 0 0.4rem;">' + ex.double.mult + 'x question points</h3>';
    if (rounds.length === 0) {
      doubleEntry.innerHTML = title + '<p style="font-size:0.8rem;opacity:0.7;">No round is marked as a ' + ex.double.mult
        + 'x round yet. Mark it in Enter Scores (admin).</p>';
      return;
    }
    var html = title + '<p style="font-size:0.8rem;opacity:0.7;margin-bottom:0.5rem;">Points each team got on the ' + ex.double.mult
      + 'x question(s). A team can be entered once its round has been scored.</p>';
    rounds.forEach(function (r) {
      var qs = ex.double.rounds[r];
      var count = Math.max(1, qs.length);
      html += '<div class="dbl-round"><strong>Round ' + r + (qs.length ? ' (question' + (qs.length > 1 ? 's ' : ' ') + qs.join(', ') + ')' : '') + '</strong>';
      teams.forEach(function (t) {
        var row = teamScoreRows(t).find(function (s) { return s.round_number === r; });
        html += '<label class="dbl-row"><span>' + escHtml(t.name) + teamFlag(t) + '</span>';
        if (!row) {
          html += '<span style="opacity:0.6;">not scored yet</span>';
        } else {
          var cur = Number(row.double_points) || 0;
          var opts = [];
          for (var v = 0; v <= count + 1e-9; v += 0.5) opts.push(v);
          if (opts.indexOf(cur) === -1) opts.push(cur);
          html += '<select data-team-id="' + t.id + '" data-round="' + r + '" data-key="dbl:' + t.id + ':' + r + '" style="width:auto;">'
            + opts.map(function (o) { return '<option value="' + o + '"' + (o === cur ? ' selected' : '') + '>' + o + '</option>'; }).join('')
            + '</select>';
        }
        html += '</label>';
      });
      html += '</div>';
    });
    html += '<button class="btn btn-primary" id="saveDoubleBtn" style="margin-top:0.5rem;">Save ' + ex.double.mult + 'x points</button>';
    doubleEntry.innerHTML = html;
  }

  // Reload teams + scores and redraw everything that shows extras
  async function refreshExtrasData() {
    var t = await db.from('teams').select('*').order('name');
    var s = await db.from('scores').select('*');
    if (t.error || s.error) throw (t.error || s.error);
    teams = t.data || [];
    allScores = s.data || [];
    renderShotsSection();
    renderSummary();
    renderChecks();
  }

  doubleEntry.addEventListener('click', async function (e) {
    var btn = e.target.closest('#saveDoubleBtn');
    if (!btn) return;
    var dirty = Array.prototype.filter.call(doubleEntry.querySelectorAll('select[data-round]'), isEntryDirty);
    if (dirty.length === 0) { showMsg(shotsMsg, 'No changes to save.', 'info'); return; }
    btn.disabled = true;
    try {
      for (var i = 0; i < dirty.length; i++) {
        var el = dirty[i];
        var { error } = await db.from('scores').update({ double_points: parseFloat(el.value) })
          .eq('team_id', el.getAttribute('data-team-id')).eq('round_number', parseInt(el.getAttribute('data-round'), 10));
        if (error) { showMsg(shotsMsg, error.message, 'error'); return; }
      }
      await refreshExtrasData();
      showMsg(shotsMsg, dirty.length + ' point value' + (dirty.length === 1 ? '' : 's') + ' saved.', 'success');
    } catch (err) {
      showMsg(shotsMsg, err.message || String(err), 'error');
    } finally {
      var again = doubleEntry.querySelector('#saveDoubleBtn');
      if (again) again.disabled = false;
    }
  });

  function setAdjustNotes(open) {
    adjustNotesOpen = open;
    document.querySelectorAll('#shotsSection .adj-note-cell').forEach(function (c) { c.classList.toggle('hidden', !open); });
  }
  extrasEntryHead.addEventListener('click', function (e) {
    if (!e.target.closest('.adj-head')) return;
    var cell = shotsSection.querySelector('.adj-note-cell');
    setAdjustNotes(cell ? cell.classList.contains('hidden') : true);
  });
  shotsBody.addEventListener('focusin', function (e) {
    if (e.target.matches('[data-extra="adjust"]')) setAdjustNotes(true);
  });

  // +/- buttons next to the drinking count (easier on a phone)
  shotsBody.addEventListener('click', function (e) {
    var btn = e.target.closest('.step');
    if (!btn) return;
    var input = btn.parentNode.querySelector('input');
    var min = parseFloat(input.min) || 0, max = parseFloat(input.max);
    var v = (parseFloat(input.value) || 0) + parseInt(btn.getAttribute('data-dir'), 10);
    v = Math.max(min, isNaN(max) ? v : Math.min(max, v));
    input.value = v;
  });

  var checkAllShotsBtn = document.getElementById('checkAllShotsBtn');
  checkAllShotsBtn.addEventListener('click', function () {
    var sel = 'input[type="checkbox"][data-extra="drinking"]';
    var allChecked = shotsBody.querySelectorAll(sel);
    var unchecked = shotsBody.querySelectorAll(sel + ':not(:checked)');
    // If all are checked, uncheck all; otherwise check all
    var newState = unchecked.length > 0;
    allChecked.forEach(function (cb) { cb.checked = newState; });
    checkAllShotsBtn.textContent = newState ? 'Uncheck All' : 'Check All';
  });

  saveShotsBtn.addEventListener('click', async function () {
    var ex = extrasSettings(config);
    var dirtyEls = Array.prototype.filter.call(shotsBody.querySelectorAll('[data-key]'), isEntryDirty);
    if (dirtyEls.length === 0) { showMsg(shotsMsg, 'No changes to save.', 'info'); return; }

    // Which fields of which teams were changed here
    var changes = {};
    dirtyEls.forEach(function (el) {
      var id = el.getAttribute('data-team-id'), f = el.getAttribute('data-extra');
      (changes[id] = changes[id] || {})[f] = true;
    });

    // Start from what is in the database now, so another person's changes are kept
    var { data: fresh, error: fErr } = await db.from('teams').select('*');
    if (fErr) { showMsg(shotsMsg, fErr.message, 'error'); return; }
    var freshById = {};
    (fresh || []).forEach(function (t) { freshById[t.id] = t; });

    var updates = [];
    var ids = Object.keys(changes);
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i], ch = changes[id], t = freshById[id];
      if (!t) continue;   // team was removed meanwhile
      var field = function (name) { return shotsBody.querySelector('[data-team-id="' + id + '"][data-extra="' + name + '"]'); };
      var payload = {};
      var merged = Object.assign({}, (t.extras && typeof t.extras === 'object') ? t.extras : {});
      var extrasChanged = false;

      if (ch.drinking) {
        var d = field('drinking'), val;
        if (ex.drinking.mode === 'count') {
          var raw = d.value.trim();
          val = raw === '' ? 0 : Number(raw);
          if (!Number.isInteger(val) || val < 0 || val > ex.drinking.max) {
            showMsg(shotsMsg, t.name + ' - ' + ex.drinking.label + ': enter a whole number from 0 to ' + ex.drinking.max + '.', 'error');
            return;
          }
        } else {
          val = d.checked ? 1 : 0;
        }
        payload.shots_bonus = val;
      }
      if (ch.ticket) { merged.ticket = field('ticket').checked ? 1 : 0; extrasChanged = true; }
      if (ch.party)  { merged.party  = field('party').checked ? 1 : 0;  extrasChanged = true; }

      if (ch.betRound || ch.betGuess) {
        // Empty guess = the team did not bet (nothing won or lost)
        var fixedR = ex.bet.round;
        var rEl = field('betRound');
        var rRaw = rEl ? rEl.value.trim() : '';
        var gRaw = field('betGuess').value.trim();
        if (gRaw === '' && rRaw === '') {
          delete merged.bet;
        } else {
          var br = fixedR || Number(rRaw), bg = Number(gRaw);
          var roundBad = !fixedR && (rRaw === '' || !Number.isInteger(br) || br < 1 || br > config.rounds);
          if (gRaw === '' || roundBad || isNaN(bg) || bg < 0 || bg > config.questions_per_round || (bg * 2) % 1 !== 0) {
            showMsg(shotsMsg, 'Bet for "' + t.name + '": ' + (fixedR ? '' : 'enter a round 1-' + config.rounds + ' and ')
              + 'a guess 0-' + config.questions_per_round + ' in steps of 0.5 (or clear it to mean no bet).', 'error');
            return;
          }
          merged.bet = { round: br, guess: bg };
        }
        extrasChanged = true;
      }

      if (ch.adjust || ch.adjustNote) {
        // Free adjustment: +/- points with an admin-only note
        var aRaw = field('adjust').value.trim();
        var aNum = aRaw === '' ? 0 : Number(aRaw);
        if (isNaN(aNum) || aNum < -100 || aNum > 100 || (aNum * 2) % 1 !== 0) {
          showMsg(shotsMsg, 'Adjustment for "' + t.name + '" must be a number from -100 to 100 in steps of 0.5.', 'error');
          return;
        }
        if (aNum !== 0) merged.adjust = aNum; else delete merged.adjust;
        var aNote = field('adjustNote').value.trim();
        if (aNote && aNum !== 0) merged.adjust_note = aNote; else delete merged.adjust_note;
        extrasChanged = true;
      }

      if (extrasChanged) payload.extras = merged;
      if (Object.keys(payload).length) updates.push({ id: id, payload: payload });
    }

    saveShotsBtn.disabled = true;
    try {
      for (var j = 0; j < updates.length; j++) {
        var { error } = await db.from('teams').update(updates[j].payload).eq('id', updates[j].id);
        if (error) { showMsg(shotsMsg, error.message, 'error'); return; }
      }
      await refreshExtrasData();
      showMsg(shotsMsg, 'Extra points saved (' + updates.length + ' team' + (updates.length === 1 ? '' : 's') + ').', 'success');
    } catch (err) {
      showMsg(shotsMsg, err.message || String(err), 'error');
    } finally {
      saveShotsBtn.disabled = false;
    }
  });

  // Keep the extras view fresh while two people work at once (skipped while typing or unsaved)
  var pollBusy = false;
  async function pollExtras() {
    if (pollBusy || !config || teams.length === 0 || document.hidden) return;
    if (shotsSection.classList.contains('hidden') || teamsEditing) return;
    if (shotsBody.contains(document.activeElement) || doubleEntry.contains(document.activeElement) || hasDirtyEntries()) return;
    pollBusy = true;
    try {
      var c = await db.from('quiz_config').select('*').eq('id', 1).maybeSingle();
      var t = await db.from('teams').select('*').order('name');
      var s = await db.from('scores').select('*');
      if (c.error || t.error || s.error || !c.data) return;
      if (JSON.stringify(c.data) === JSON.stringify(config)
          && JSON.stringify(t.data) === JSON.stringify(teams)
          && JSON.stringify(s.data) === JSON.stringify(allScores)) return;
      config = c.data;
      teams = t.data || [];
      allScores = s.data || [];
      updatePublishStatus();
      renderShotsSection();
      renderChecks();
    } finally {
      pollBusy = false;
    }
  }
  setInterval(pollExtras, 10000);

  // Has the quiz already started? (anything scored, published or bonus given)
  function quizHasStarted() {
    return allScores.length > 0
      || (config.published_rounds || 0) > 0
      || teams.some(function (t) {
        return (t.shots_bonus || 0) > 0 || (t.extras && Object.keys(t.extras).length > 0);
      });
  }

  // Warn before editing setup-type data once the quiz is under way.
  // Returns true when it's fine to continue.
  function confirmMidQuizEdit(subject, consequence) {
    if (!quizHasStarted()) return true;
    return confirm('The quiz has already started.\n\n' + consequence
      + ' You should normally never need to edit ' + subject + ' mid-quiz.\n\nEdit anyway?');
  }

  bonusEditBtn.addEventListener('click', function () {
    if (!confirmMidQuizEdit('the extra points settings',
        'Changing the extra points settings now can change points and standings that are already scored or shown to players.')) return;
    renderExtrasForm(extrasEditBox, 'ed', extrasSettings(config));
    bonusSettingsView.classList.add('hidden');
    bonusSettingsForm.classList.remove('hidden');
  });

  bonusCancelBtn.addEventListener('click', function () {
    bonusSettingsForm.classList.add('hidden');
    bonusSettingsView.classList.remove('hidden');
  });

  bonusSaveSettingsBtn.addEventListener('click', async function () {
    var next = readExtrasForm('ed', shotsMsg, config.rounds);
    if (!next) return;

    // Keep the rounds already marked as 2x; they can't exceed the new maximum
    var cur = extrasSettings(config);
    var usedRounds = Object.keys(cur.double.rounds).length;
    if (next.extras.double.enabled && usedRounds > next.extras.double.max) {
      showMsg(shotsMsg, usedRounds + ' rounds are already marked as multiplied. Set the maximum to at least ' + usedRounds
        + ' (or untick the multiplied question in those rounds first).', 'error');
      return;
    }
    next.extras.double.rounds = cur.double.rounds;

    // Drinking values above the new limit get reduced to it
    var newMax = next.bonus_mode === 'count' ? next.bonus_max : 1;
    var affected = next.extras.drinking.enabled
      ? teams.filter(function (t) { return (t.shots_bonus || 0) > newMax; }) : [];
    if (affected.length > 0) {
      var okClamp = confirm(affected.length + ' team(s) currently have more than the new drinking maximum ('
        + newMax + ') and will be reduced to ' + newMax + '.\n\nContinue?');
      if (!okClamp) return;
    }

    bonusSaveSettingsBtn.disabled = true;
    var { error } = await db.from('quiz_config').update(next).eq('id', 1);
    if (error) {
      bonusSaveSettingsBtn.disabled = false;
      showMsg(shotsMsg, error.message + ' (Has the database migration been run?)', 'error');
      return;
    }
    for (var i = 0; i < affected.length; i++) {
      var { error: tErr } = await db.from('teams').update({ shots_bonus: newMax }).eq('id', affected[i].id);
      if (tErr) { showMsg(shotsMsg, tErr.message, 'error'); break; }
    }
    bonusSaveSettingsBtn.disabled = false;
    bonusSettingsForm.classList.add('hidden');
    bonusSettingsView.classList.remove('hidden');
    await loadConfig();
    showMsg(shotsMsg, 'Settings saved.', 'success');
  });

  // Defaults for a new quiz: everything on (untick what a quiz does not use)
  function setupDefaults() {
    var d = extrasSettings({ extras: { ticket: { enabled: true }, party: { enabled: true }, bet: { enabled: true }, double: { enabled: true } } });
    d.drinking.label = 'Drinking';
    return d;
  }
  renderExtrasForm(setupExtrasBox, 'setup', setupDefaults());

  // Per-round Tipovacka toggles when "all rounds" is unchecked
  setupTipAll.addEventListener('change', updateTipToggles);
  setupRounds.addEventListener('change', updateTipToggles);

  function updateTipToggles() {
    if (setupTipAll.checked) {
      perRoundTip.classList.add('hidden');
      return;
    }
    perRoundTip.classList.remove('hidden');
    var n = parseInt(setupRounds.value) || 5;
    var html = '';
    for (var i = 1; i <= n; i++) {
      html += '<div class="toggle-row">'
        + '<input type="checkbox" id="tip_r' + i + '" checked>'
        + '<label for="tip_r' + i + '" style="display:inline;margin:0;">Round ' + i + '</label>'
        + '</div>';
    }
    perRoundTip.innerHTML = html;
  }

  setupSaveBtn.addEventListener('click', async function () {
    var rounds = parseInt(setupRounds.value) || 5;
    var qpr    = parseInt(setupQuestions.value) || 10;

    // Build tipovacka array
    var tipArr = [];
    if (setupTipAll.checked) {
      for (var i = 0; i < rounds; i++) tipArr.push(true);
    } else {
      for (var i = 1; i <= rounds; i++) {
        var cb = document.getElementById('tip_r' + i);
        tipArr.push(cb ? cb.checked : false);
      }
    }

    // Parse teams: "Name, PlayerCount" per line
    var lines = setupTeams.value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    if (lines.length === 0) { showMsg(setupMsg, 'Enter at least one team.', 'error'); return; }

    var parsedTeams = [];
    for (var i = 0; i < lines.length; i++) {
      // The player count is after the LAST comma, so a team name may contain commas
      var lastComma = lines[i].lastIndexOf(',');
      var tName = lastComma === -1 ? lines[i].trim() : lines[i].slice(0, lastComma).trim();
      var count = lastComma === -1 ? 1 : parseInt(lines[i].slice(lastComma + 1).trim(), 10);
      if (!tName) { showMsg(setupMsg, 'Empty team name on line ' + (i + 1) + '.', 'error'); return; }
      if (isNaN(count) || count < 1) { showMsg(setupMsg, 'Invalid player count on line ' + (i + 1) + '. Use: Name, Number (the number after the last comma).', 'error'); return; }
      parsedTeams.push({ name: tName, player_count: count });
    }

    // Check for duplicate names
    var unique = new Set(parsedTeams.map(function (t) { return t.name; }));
    if (unique.size !== parsedTeams.length) { showMsg(setupMsg, 'Duplicate team names found.', 'error'); return; }

    var bonus = readExtrasForm('setup', setupMsg, parseInt(setupRounds.value, 10) || 5);
    if (!bonus) return;

    setupSaveBtn.disabled = true;

    // Save config
    var { error: cfgErr } = await db.from('quiz_config').upsert(Object.assign({
      id: 1, rounds: rounds, questions_per_round: qpr, has_tipovacka: tipArr
    }, bonus));
    if (cfgErr) { showMsg(setupMsg, cfgErr.message, 'error'); setupSaveBtn.disabled = false; return; }

    // Save teams
    var teamRows = parsedTeams.map(function (t) { return { name: t.name, player_count: t.player_count }; });
    var { error: teamErr } = await db.from('teams').insert(teamRows);
    if (teamErr) { showMsg(setupMsg, teamErr.message, 'error'); setupSaveBtn.disabled = false; return; }

    setupSaveBtn.disabled = false;
    await loadConfig();
  });

  // ---- Reset ----
  resetBtn.addEventListener('click', async function () {
    if (!confirm('This will delete ALL quiz data (config, teams, scores). Tip: use "Save & start new quiz" in Quiz Archive to keep a copy.\n\nAre you sure?')) return;
    if (!confirm('Really? This cannot be undone.')) return;

    await db.from('scores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await db.from('teams').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await db.from('quiz_config').delete().eq('id', 1);

    config = null;
    teams = [];
    allScores = [];
    await loadConfig();
  });

  // ---- Publish controls ----
  function updatePublishStatus() {
    var pub = config.published_rounds || 0;
    publishStatus.textContent = 'Published: Round ' + pub + ' of ' + config.rounds;
    publishBtn.disabled = pub >= config.rounds;
    unpublishBtn.disabled = pub <= 0;
    renderChecks();
  }

  publishBtn.addEventListener('click', async function () {
    var next = (config.published_rounds || 0) + 1;
    if (next > config.rounds) return;
    publishBtn.disabled = true;
    var { error } = await db.from('quiz_config').update({ published_rounds: next }).eq('id', 1);
    publishBtn.disabled = false;
    if (error) { alert(error.message); return; }
    config.published_rounds = next;
    updatePublishStatus();
  });

  unpublishBtn.addEventListener('click', async function () {
    var prev = (config.published_rounds || 0) - 1;
    if (prev < 0) return;
    unpublishBtn.disabled = true;
    var { error } = await db.from('quiz_config').update({ published_rounds: prev }).eq('id', 1);
    unpublishBtn.disabled = false;
    if (error) { alert(error.message); return; }
    config.published_rounds = prev;
    updatePublishStatus();
  });

  // ================================================================
  //  SCORE ENTRY
  // ================================================================

  function showScoreSection() {
    scoreSection.classList.remove('hidden');
    summarySection.classList.remove('hidden');
    exportSection.classList.remove('hidden');

    maxPtsLabel.textContent = config.questions_per_round;

    // Populate round selector
    roundSelect.innerHTML = '';
    for (var i = 1; i <= config.rounds; i++) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = 'Round ' + i;
      roundSelect.appendChild(opt);
    }

    roundSelect.addEventListener('change', renderScoreTable);
    renderScoreTable();
  }

  function renderScoreTable() {
    var rn = parseInt(roundSelect.value);
    var tipovacka = config.has_tipovacka || [];
    var hasTip = tipovacka[rn - 1] === true;

    tipHeader.classList.toggle('hidden', !hasTip);

    // 2x question controls for this round
    var exs = extrasSettings(config);
    var isDouble = exs.double.enabled && exs.double.rounds[rn] !== undefined;
    var usedDoubles = Object.keys(exs.double.rounds).length;
    doubleBox.classList.toggle('hidden', !exs.double.enabled);
    if (exs.double.enabled) {
      doubleOnLabel.textContent = 'This round has a ' + exs.double.mult + 'x question (or more than one)';
      dblHeader.textContent = 'Points on the ' + exs.double.mult + 'x question(s)';
      doubleOn.checked = isDouble;
      doubleOn.disabled = !isDouble && usedDoubles >= exs.double.max;
      doubleQ.value = isDouble ? exs.double.rounds[rn].join(', ') : '';
      doubleQWrap.classList.toggle('hidden', !isDouble);
      doubleHint.textContent = usedDoubles + ' of ' + exs.double.max + ' ' + exs.double.mult + 'x round' + (exs.double.max === 1 ? '' : 's') + ' used'
        + (doubleOn.disabled ? ' (limit reached; change it in Extra Points > Edit settings)' : '');
    }
    dblHeader.classList.toggle('hidden', !isDouble);

    // Find existing scores for this round
    var existing = {};
    allScores.forEach(function (s) {
      if (s.round_number === rn) existing[s.team_id] = s;
    });

    var html = '';
    teams.forEach(function (t) {
      var ex = existing[t.id];
      var pts = ex ? ex.standard_points : '';
      var tip = ex ? ex.tipovacka_point : 0;

      html += '<tr data-team-id="' + t.id + '">';
      html += '<td>' + escHtml(t.name) + teamFlag(t) + '</td>';
      html += '<td class="text-center">'
        + '<input type="number" class="score-input std-input" min="0" max="' + config.questions_per_round + '" step="0.5" value="' + pts + '">'
        + '</td>';

      if (hasTip) {
        html += '<td class="text-center">'
          + '<input type="checkbox" class="tip-check" data-tip-team="' + t.id + '"' + (tip === 1 ? ' checked' : '') + '>'
          + '</td>';
      } else {
        html += '<td class="text-center hidden"></td>';
      }
      if (exs.double.enabled) {
        var dv = ex && ex.double_points ? Number(ex.double_points) : 0;
        html += '<td class="text-center dbl-cell' + (isDouble ? '' : ' hidden') + '">'
          + '<select class="dbl-select" data-val="' + dv + '" style="width:auto;"></select></td>';
      }
      html += '</tr>';
    });
    scoreBody.innerHTML = html;
    fillDblOptions();

    // Warn when multiple tipovacka are checked
    if (hasTip) {
      scoreBody.querySelectorAll('.tip-check').forEach(function (cb) {
        cb.addEventListener('change', updateTipWarning);
      });
      updateTipWarning();
    }
  }

  // "6, 9" -> [6, 9]
  function parseQuestions(text) {
    return text.split(/[,;\s]+/).map(function (q) { return parseInt(q, 10); })
      .filter(function (q) { return q > 0; });
  }

  // Dropdown 0, 0.5, ... up to the number of multiplied questions (one point each at most)
  function fillDblOptions() {
    var count = Math.max(1, parseQuestions(doubleQ.value).length);
    scoreBody.querySelectorAll('.dbl-select').forEach(function (sel) {
      var cur = sel.value !== '' ? parseFloat(sel.value) : parseFloat(sel.getAttribute('data-val')) || 0;
      var opts = [];
      for (var v = 0; v <= count + 1e-9; v += 0.5) opts.push(v);
      if (opts.indexOf(cur) === -1) opts.push(cur);
      sel.innerHTML = opts.map(function (o) {
        return '<option value="' + o + '"' + (o === cur ? ' selected' : '') + '>' + o + '</option>';
      }).join('');
    });
  }
  doubleQ.addEventListener('input', fillDblOptions);

  doubleOn.addEventListener('change', function () {
    var on = doubleOn.checked;
    doubleQWrap.classList.toggle('hidden', !on);
    dblHeader.classList.toggle('hidden', !on);
    scoreBody.querySelectorAll('.dbl-cell').forEach(function (c) { c.classList.toggle('hidden', !on); });
  });

  function updateTipWarning() {
    var checked = scoreBody.querySelectorAll('.tip-check:checked');
    var existing = scoreMsg.querySelector('.tip-warning');
    if (checked.length > 1) {
      if (!existing) {
        var warn = document.createElement('div');
        warn.className = 'msg msg-info tip-warning';
        warn.textContent = checked.length + ' teams selected for Tipovacka.';
        scoreMsg.appendChild(warn);
      } else {
        existing.textContent = checked.length + ' teams selected for Tipovacka.';
      }
    } else if (existing) {
      existing.remove();
    }
  }

  saveRoundBtn.addEventListener('click', async function () {
    var rn = parseInt(roundSelect.value);
    var tipovacka = config.has_tipovacka || [];
    var hasTip = tipovacka[rn - 1] === true;

    // 2x question state for this round
    var exs = extrasSettings(config);
    var wantDouble = exs.double.enabled && doubleOn.checked;
    var wasDouble = exs.double.rounds[rn] !== undefined;
    var qArr = wantDouble ? parseQuestions(doubleQ.value) : [];
    if (wantDouble && !wasDouble && Object.keys(exs.double.rounds).length >= exs.double.max) {
      showMsg(scoreMsg, 'The maximum of ' + exs.double.max + ' ' + exs.double.mult + 'x round(s) is already used.', 'error');
      return;
    }

    var dblUpdates = [];   // 2x points changed in this table

    // Determine which teams get tipovacka
    var tipTeamIds = {};
    if (hasTip) {
      scoreBody.querySelectorAll('.tip-check:checked').forEach(function (cb) {
        tipTeamIds[cb.getAttribute('data-tip-team')] = true;
      });
    }

    var rows = [];
    var valid = true;
    var trEls = scoreBody.querySelectorAll('tr');
    trEls.forEach(function (tr) {
      var teamId = tr.getAttribute('data-team-id');
      var input  = tr.querySelector('.std-input');
      var val    = input.value.trim();
      if (val === '') { valid = false; return; }

      var pts = parseFloat(val);
      if (isNaN(pts) || pts < 0 || pts > config.questions_per_round) { valid = false; return; }
      if (pts % 0.5 !== 0) { valid = false; return; }

      var scoreRow = {
        team_id: teamId,
        round_number: rn,
        standard_points: pts,
        tipovacka_point: (hasTip && tipTeamIds[teamId]) ? 1 : 0,
        updated_at: new Date().toISOString()
      };
      // Points on the multiplied question are written separately and only when changed here,
      // so this save never overwrites values someone else entered meanwhile
      if (wantDouble) {
        var dsel = tr.querySelector('.dbl-select');
        if (dsel && (parseFloat(dsel.value) || 0) !== (parseFloat(dsel.getAttribute('data-val')) || 0)) {
          dblUpdates.push({ teamId: teamId, value: parseFloat(dsel.value) || 0 });
        }
      }
      rows.push(scoreRow);
    });

    if (!valid || rows.length !== teams.length) {
      showMsg(scoreMsg, 'Fill in valid points for every team (0-' + config.questions_per_round + ').', 'error');
      return;
    }

    saveRoundBtn.disabled = true;

    // Record which round has the 2x question (kept in the quiz settings)
    var doubleChanged = exs.double.enabled
      && (wantDouble !== wasDouble || (wantDouble && JSON.stringify(qArr) !== JSON.stringify(exs.double.rounds[rn])));
    if (doubleChanged) {
      var newRounds = Object.assign({}, exs.double.rounds);
      if (wantDouble) newRounds[rn] = qArr; else delete newRounds[rn];
      var newExtras = Object.assign({}, config.extras || {});
      newExtras.double = Object.assign({}, newExtras.double || {}, { rounds: newRounds });
      var { error: cErr } = await db.from('quiz_config').update({ extras: newExtras }).eq('id', 1);
      if (cErr) { saveRoundBtn.disabled = false; showMsg(scoreMsg, cErr.message, 'error'); return; }
      config.extras = newExtras;
    }

    var { error } = await db.from('scores').upsert(rows, { onConflict: 'team_id,round_number' });
    saveRoundBtn.disabled = false;

    if (error) { showMsg(scoreMsg, error.message, 'error'); return; }
    if (exs.double.enabled) {
      if (wasDouble && !wantDouble) {
        await db.from('scores').update({ double_points: 0 }).eq('round_number', rn);   // round no longer multiplied
      }
      for (var du = 0; du < dblUpdates.length; du++) {
        var { error: dErr } = await db.from('scores').update({ double_points: dblUpdates[du].value })
          .eq('team_id', dblUpdates[du].teamId).eq('round_number', rn);
        if (dErr) { showMsg(scoreMsg, dErr.message, 'error'); return; }
      }
    }
    showMsg(scoreMsg, 'Round ' + rn + ' saved.', 'success');
    await loadAllScores();
  });

  // ================================================================
  //  CSV IMPORT
  // ================================================================

  csvImportBtn.addEventListener('click', function () {
    var text = '';

    if (csvFile.files.length > 0) {
      var reader = new FileReader();
      reader.onload = function (e) {
        parseAndFillCsv(e.target.result);
      };
      reader.readAsText(csvFile.files[0]);
      return;
    }

    text = csvText.value.trim();
    if (!text) { showMsg(scoreMsg, 'No CSV data provided.', 'error'); return; }
    parseAndFillCsv(text);
  });

  csvToggleBtn.addEventListener('click', function () {
    var hidden = csvSection.classList.toggle('hidden');
    csvToggleBtn.textContent = hidden ? 'Show CSV import' : 'Hide CSV import';
  });

  // Parse a CSV line respecting quoted fields (e.g. "3,5" for European 3.5)
  function parseCsvLine(line) {
    var fields = [];
    var current = '';
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    return fields;
  }

  // Normalize a number string: accept both "3.5" and "3,5" (European decimal)
  function parsePoints(str) {
    var normalized = str.replace(',', '.');
    return parseFloat(normalized);
  }

  function parseAndFillCsv(raw) {
    var lines = raw.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);

    // Build a name -> row element map
    var nameMap = {};
    var trEls = scoreBody.querySelectorAll('tr');
    trEls.forEach(function (tr) {
      var team = teams.find(function (t) { return t.id === tr.getAttribute('data-team-id'); });
      if (team) nameMap[team.name] = tr;
    });

    var notFound = [];
    lines.forEach(function (line) {
      var parts = parseCsvLine(line);
      if (parts.length < 2) return;

      var name = parts[0];
      var pts  = parsePoints(parts[1]);
      var tip  = parts.length >= 3 ? parseInt(parts[2]) : 0;

      var tr = nameMap[name];
      if (!tr) { notFound.push(name); return; }

      var input = tr.querySelector('.std-input');
      if (input && !isNaN(pts)) input.value = pts;

      if (tip === 1) {
        var cb = tr.querySelector('.tip-check');
        if (cb) cb.checked = true;
      }
    });

    if (notFound.length > 0) {
      showMsg(scoreMsg, 'Teams not found: ' + notFound.join(', '), 'error');
    } else {
      showMsg(scoreMsg, 'CSV imported. Review and click Save Round.', 'info');
    }
  }

  // ================================================================
  //  SUMMARY TABLE
  // ================================================================

  async function loadAllScores() {
    var { data } = await db.from('scores').select('*');
    allScores = data || [];
    renderSummary();
    renderChecks();
    renderShotsSection();
  }

  function renderSummary() {
    if (!config || teams.length === 0) return;

    var tipovacka = config.has_tipovacka || [];

    // Find which rounds have data
    var roundSet = new Set();
    allScores.forEach(function (s) { roundSet.add(s.round_number); });
    var rounds = Array.from(roundSet).sort(function (a, b) { return a - b; });

    if (rounds.length === 0) {
      summaryHead.innerHTML = '';
      summaryBody.innerHTML = '<tr><td>No scores saved yet.</td></tr>';
      return;
    }

    // Header
    var hHtml = '<tr><th>Team</th>';
    rounds.forEach(function (r) { hHtml += '<th class="text-center">R' + r + '</th>'; });
    hHtml += '<th class="text-center">Extra</th>';
    hHtml += '<th class="text-right">Total</th></tr>';
    summaryHead.innerHTML = hHtml;

    // Build map
    var teamMap = {};
    teams.forEach(function (t) { teamMap[t.id] = t; });
    var map = {};
    var exSum = extrasSettings(config), byTeamSum = scoresByTeam(allScores);
    teams.forEach(function (t) {
      var brs = teamExtraBreakdown(t, byTeamSum[t.id] || [], exSum);
      map[t.id] = { name: t.name, flag: teamFlag(t), players: t.player_count || 1, extra: brs.total, rounds: {}, total: brs.total };
    });
    allScores.forEach(function (s) {
      if (!map[s.team_id]) return;
      var pts = s.standard_points + s.tipovacka_point;
      map[s.team_id].rounds[s.round_number] = { std: s.standard_points, tip: s.tipovacka_point };
      map[s.team_id].total += pts;
    });

    var list = Object.values(map).sort(function (a, b) {
      if (a.total !== b.total) return b.total - a.total;
      if (a.players !== b.players) return a.players - b.players;
      return a.extra - b.extra;
    });

    var bHtml = '';
    list.forEach(function (t) {
      bHtml += '<tr><td>' + escHtml(t.name) + t.flag + '</td>';
      rounds.forEach(function (r) {
        var rd = t.rounds[r];
        if (!rd) {
          bHtml += '<td class="text-center">-</td>';
        } else {
          var hasTip = tipovacka[r - 1] === true;
          if (hasTip && rd.tip === 1) {
            bHtml += '<td class="text-center">' + rd.std + ' + 1</td>';
          } else {
            bHtml += '<td class="text-center">' + (rd.std + rd.tip) + '</td>';
          }
        }
      });
      bHtml += '<td class="text-center">' + fmtExtra(t.extra) + '</td>';
      bHtml += '<td class="text-right"><strong>' + t.total + '</strong></td></tr>';
    });
    summaryBody.innerHTML = bHtml;

    // Also re-render the score table for the current round (it may have new data)
    renderScoreTable();
  }

  // ================================================================
  //  EXPORT RESULTS
  // ================================================================

  function computeExportStandings() {
    var map = {};
    var exs = extrasSettings(config), byTeam = scoresByTeam(allScores);
    teams.forEach(function (t) {
      var br = teamExtraBreakdown(t, byTeam[t.id] || [], exs);
      map[t.id] = { id: t.id, name: t.name, players: t.player_count || 1, extra: br.total, rounds: {}, total: br.total };
    });
    allScores.forEach(function (s) {
      if (!map[s.team_id]) return;
      var pts = s.standard_points + s.tipovacka_point;
      map[s.team_id].rounds[s.round_number] = { std: s.standard_points, tip: s.tipovacka_point };
      map[s.team_id].total += pts;
    });
    var list = Object.values(map);
    list.sort(function (a, b) {
      if (a.total !== b.total) return b.total - a.total;
      if (a.players !== b.players) return a.players - b.players;
      return a.extra - b.extra;   // fewer extra points = more points from the rounds
    });
    return list;
  }

  function computeExportRanks(standings) {
    var sorted = standings.slice().sort(function (a, b) {
      if (a.total !== b.total) return b.total - a.total;
      if (a.players !== b.players) return a.players - b.players;
      return a.extra - b.extra;
    });
    var nums = [];
    for (var i = 0; i < sorted.length; i++) {
      if (i === 0) {
        nums.push(1);
      } else if (sorted[i].total === sorted[i - 1].total &&
                 sorted[i].players === sorted[i - 1].players &&
                 sorted[i].extra === sorted[i - 1].extra) {
        nums.push(nums[i - 1]);
      } else {
        nums.push(i + 1);
      }
    }
    var counts = {};
    nums.forEach(function (n) { counts[n] = (counts[n] || 0) + 1; });
    var rankMap = {};
    sorted.forEach(function (team, i) {
      var n = nums[i];
      rankMap[team.id] = { num: n, label: counts[n] > 1 ? 'T-' + n : '' + n };
    });
    return rankMap;
  }

  function getScoredRounds() {
    var set = new Set();
    allScores.forEach(function (s) { set.add(s.round_number); });
    return Array.from(set).sort(function (a, b) { return a - b; });
  }

  function buildStandingsData() {
    var standings = computeExportStandings();
    var ranks = computeExportRanks(standings);
    var header = ['Rank', 'Team', 'Players', 'Points'];
    var rows = [header];
    standings.forEach(function (t) {
      var r = ranks[t.id];
      rows.push([r.label, t.name, t.players, t.total]);
    });
    return rows;
  }

  function buildBreakdownData() {
    var standings = computeExportStandings();
    var ranks = computeExportRanks(standings);
    var rounds = getScoredRounds();
    var tipovacka = config.has_tipovacka || [];

    var header = ['Rank', 'Team'];
    rounds.forEach(function (r) { header.push('R' + r); });
    header.push('Extra');
    header.push('Total');

    var rows = [header];
    standings.forEach(function (t) {
      var r = ranks[t.id];
      var row = [r.label, t.name];
      rounds.forEach(function (rn) {
        var rd = t.rounds[rn];
        if (!rd) {
          row.push('-');
        } else {
          var hasTip = tipovacka[rn - 1] === true;
          if (hasTip && rd.tip === 1) {
            row.push(rd.std + ' + 1');
          } else {
            row.push(rd.std + rd.tip);
          }
        }
      });
      row.push(t.extra);
      row.push(t.total);
      return rows.push(row);
    });
    return rows;
  }

  // Column index (0-based) -> Excel letter (0 -> A, 26 -> AA)
  function colLetter(i) {
    var s = '';
    i++;
    while (i > 0) {
      var m = (i - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      i = Math.floor((i - 1) / 26);
    }
    return s;
  }

  // Full quiz state: one row per team, raw inputs (players, shots, points per
  // round, tipovacka per round) plus Total and Rank. Unscored rounds are left
  // empty so the sheet can be filled in by hand. Total/Rank are live Excel
  // formulas ({v, f} cells); non-xlsx formats flatten them to plain values.
  function buildStateData() {
    var tipovacka = config.has_tipovacka || [];
    var ex = extrasSettings(config);
    var byTeam = scoresByTeam(allScores);
    var scoreMap = {};
    allScores.forEach(function (s) {
      scoreMap[s.team_id + ':' + s.round_number] = s;
    });

    // Columns: Team, Players, extras (drinking, ticket, party, bet), then per round
    // R# [Tip] [2x], then Total, Rank, sort key. Everything between Players and Total is summed.
    var header = ['Team', 'Players'];
    var fillCols = [], greenCols = [];
    var col = {};
    function addCol(h, green) { if (green) greenCols.push(header.length); header.push(h); }
    if (ex.drinking.enabled) { col.drinking = header.length; addCol(ex.drinking.label, true); }
    if (ex.ticket.enabled)   { col.ticket = header.length;   addCol(ex.ticket.label, true); }
    if (ex.party.enabled)    { col.party = header.length;    addCol(ex.party.label, true); }
    if (ex.bet.enabled) {
      col.betInfo = header.length; addCol('Bet (round / guess)', false);
      col.bet = header.length;     addCol('Bet pts', true);
    }
    col.adjust = header.length;     addCol('Adjustment', true);
    col.adjustNote = header.length; addCol('Adjustment note', false);
    var roundCol = {};
    for (var r = 1; r <= config.rounds; r++) {
      roundCol[r] = { std: header.length };
      fillCols.push(header.length);
      header.push('R' + r);
      if (tipovacka[r - 1] === true) { roundCol[r].tip = header.length; addCol('R' + r + ' Tip', true); }
      if (ex.double.enabled && ex.double.rounds[r] !== undefined) { roundCol[r].dbl = header.length; addCol('R' + r + ' ' + ex.double.mult + 'x bonus' + (ex.double.rounds[r].length ? ' (Q' + ex.double.rounds[r].join('+') + ')' : ''), true); }
    }
    var totalCol = header.length;
    var extraCol = totalCol + 1;
    var rankCol = totalCol + 2;
    var keyCol = totalCol + 3;
    header.push('Total');
    header.push('Extra');
    header.push('Rank');
    header.push('Sort key (helper)');

    var n = teams.length;
    var first = 2, last = n + 1; // Excel rows (1 = header)
    var totalRange = colLetter(totalCol) + first + ':' + colLetter(totalCol) + last;
    var playersRange = 'B' + first + ':B' + last;
    var extraRange = colLetter(extraCol) + first + ':' + colLetter(extraCol) + last;

    var rows = [header];
    var totals = [];
    var extrasArr = [];
    teams.forEach(function (t) {
      var players = t.player_count || 1;
      var row = [];
      for (var c = 0; c < header.length; c++) row.push('');
      row[0] = t.name;
      row[1] = players;

      var br = teamExtraBreakdown(t, byTeam[t.id] || [], ex);
      if (col.drinking !== undefined) row[col.drinking] = br.drinking;
      if (col.ticket !== undefined)   row[col.ticket] = br.ticket;
      if (col.party !== undefined)    row[col.party] = br.party;
      if (col.bet !== undefined) {
        var te = (t.extras && typeof t.extras === 'object') ? t.extras : {};
        var eff = ex.bet.round || (te.bet && te.bet.round);
        row[col.betInfo] = (te.bet && eff && te.bet.guess !== undefined) ? eff + ' / ' + te.bet.guess : '';
        row[col.bet] = br.bet;
      }

      var tex = (t.extras && typeof t.extras === 'object') ? t.extras : {};
      row[col.adjust] = br.adjust;
      row[col.adjustNote] = tex.adjust_note || '';

      var total = br.total;   // extras incl. the multiplied-question bonus; round points are added below
      for (var rn = 1; rn <= config.rounds; rn++) {
        var s = scoreMap[t.id + ':' + rn];
        if (!s) continue;
        row[roundCol[rn].std] = s.standard_points;
        total += s.standard_points;
        if (roundCol[rn].tip !== undefined) {
          row[roundCol[rn].tip] = s.tipovacka_point;
          total += s.tipovacka_point;
        }
        if (roundCol[rn].dbl !== undefined) row[roundCol[rn].dbl] = (ex.double.mult - 1) * (Number(s.double_points) || 0);
      }
      totals.push(total);
      extrasArr.push(br.total);
      row[totalCol] = total; // replaced by a formula cell below
      rows.push(row);
    });

    // Rank rule: most total points; if tied, fewer players; if still tied, fewer extra points
    // (= more points from the rounds). Same rule as the public standings.
    rows.slice(1).forEach(function (row, i) {
      var t = teams[i];
      var players = t.player_count || 1;
      var rank = 1;
      teams.forEach(function (o, j) {
        var op = o.player_count || 1;
        if (totals[j] > totals[i]
            || (totals[j] === totals[i] && op < players)
            || (totals[j] === totals[i] && op === players && extrasArr[j] < extrasArr[i])) rank++;
      });
      var xr = i + 2; // Excel row
      var totalF = 'SUM(C' + xr + ':' + colLetter(totalCol - 1) + xr + ')';
      // Extra = everything except the round points: the extra columns plus the 2x bonus cells
      var extraF = 'SUM(C' + xr + ':' + colLetter(col.adjustNote) + xr + ')';
      Object.keys(roundCol).forEach(function (rk) {
        if (roundCol[rk].dbl !== undefined) extraF += '+' + colLetter(roundCol[rk].dbl) + xr;
      });
      var tc = colLetter(totalCol), ec = colLetter(extraCol);
      var rankF = '1+COUNTIF(' + totalRange + ',">"&' + tc + xr + ')'
        + '+COUNTIFS(' + totalRange + ',' + tc + xr + ',' + playersRange + ',"<"&B' + xr + ')'
        + '+COUNTIFS(' + totalRange + ',' + tc + xr + ',' + playersRange + ',B' + xr + ',' + extraRange + ',"<"&' + ec + xr + ')';
      // Unique sort key: points desc, then fewer players (up to 99), then fewer extra points
      // (between -199 and 200), then sheet order (up to 499 teams). Kept small so spreadsheets don't round it.
      var keyF = tc + xr + '*100000-B' + xr + '*500-(' + ec + xr + '+200)-ROW()/1000';
      var keyV = totals[i] * 100000 - players * 500 - (extrasArr[i] + 200) - xr / 1000;
      row[totalCol] = { t: 'n', v: totals[i], f: totalF };
      row[extraCol] = { t: 'n', v: extrasArr[i], f: extraF };
      row[rankCol]  = { t: 'n', v: rank, f: rankF };
      row[keyCol]   = { t: 'n', v: keyV, f: keyF };
    });

    // Layout info for styling and for the Standings formulas
    var meta = {
      n: n,
      fillCols: fillCols,
      greyCols: [keyCol],
      greenCols: greenCols,
      rankCol: rankCol,
      totalCol: totalCol,
      teamRange: 'A' + first + ':A' + last,
      playersRange: playersRange,
      totalRange: totalRange,
      rankRange: colLetter(rankCol) + first + ':' + colLetter(rankCol) + last,
      keyRange: colLetter(keyCol) + first + ':' + colLetter(keyCol) + last
    };
    return { rows: rows, meta: meta };
  }

  // Standings whose cells are formulas over the Quiz State sheet: the k-th row
  // picks the team with the k-th largest sort key, so the order, ranks and
  // points all update when scores are edited in Quiz State.
  function buildLiveStandings(meta, staticRows) {
    var q = "'Quiz State'!";
    function abs(range) {
      return q + range.replace(/([A-Z]+)(\d+)/g, '$$$1$$$2');
    }
    var key = abs(meta.keyRange);
    var rows = [staticRows[0]];
    for (var k = 1; k <= meta.n; k++) {
      var m = 'MATCH(LARGE(' + key + ',' + k + '),' + key + ',0)';
      var rankRef = 'INDEX(' + abs(meta.rankRange) + ',' + m + ')';
      var st = staticRows[k];
      rows.push([
        { v: st[0], f: 'IF(COUNTIF(' + abs(meta.rankRange) + ',' + rankRef + ')>1,"T-"&' + rankRef + ',' + rankRef + ')' },
        { v: st[1], f: 'INDEX(' + abs(meta.teamRange) + ',' + m + ')' },
        { v: st[2], f: 'INDEX(' + abs(meta.playersRange) + ',' + m + ')' },
        { v: st[3], f: 'INDEX(' + abs(meta.totalRange) + ',' + m + ')' }
      ]);
    }
    return rows;
  }

  function buildConfigData() {
    var tipovacka = config.has_tipovacka || [];
    var tipRounds = [];
    tipovacka.forEach(function (v, i) { if (v === true) tipRounds.push(i + 1); });
    return [
      ['Setting', 'Value'],
      ['Exported at', new Date().toISOString()],
      ['Rounds', config.rounds],
      ['Questions per round', config.questions_per_round],
      ['Tipovacka rounds', tipRounds.join(', ') || 'none'],
      ['Published rounds', config.published_rounds || 0],
    ].concat(extrasSummaryLines(extrasSettings(config)).map(function (l) { return ['Extra points', l]; })).concat([
      ['Teams', teams.length],
      [],
      ['Note', 'Fill points into the R columns of the Quiz State sheet. The extra-points columns (drinking, tickets, Bet pts, Adjustment) and the R# bonus columns of the multiplied question hold points as plain numbers; Total sums them with the round points. Total and Rank are formulas (Excel only). Ties are broken by fewer players.']
    ]);
  }

  function flattenCells(data) {
    return data.map(function (row) {
      return row.map(function (c) {
        return (c && typeof c === 'object') ? c.v : c;
      });
    });
  }

  // e.g. VSE-Falcons-Pub-Quiz_state_round-3-of-5_2026-11-09
  //      pub-quiz_results_FINAL_2026-11-09
  // Highest round for which every team has a score (0 if none)
  function lastCompleteRound() {
    var perRound = {};
    allScores.forEach(function (s) { perRound[s.round_number] = (perRound[s.round_number] || 0) + 1; });
    var done = 0;
    Object.keys(perRound).forEach(function (rn) {
      if (perRound[rn] >= teams.length && +rn > done) done = +rn;
    });
    return done;
  }

  function buildExportFilename(today, nameOverride, forceState) {
    var rawName = nameOverride !== undefined ? nameOverride : exportName.value;
    var name = rawName.trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-');
    var done = lastCompleteRound();
    var parts = [name || 'pub-quiz', (forceState || exportState.checked) ? 'state' : 'results'];
    if (done >= config.rounds) parts.push('FINAL');
    else if (done > 0) parts.push('round-' + done + '-of-' + config.rounds);
    else parts.push('not-started');
    parts.push(today);
    return parts.join('_');
  }

  function triggerDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportCSV(sheets, filename) {
    var parts = [];
    sheets.forEach(function (sheet) {
      parts.push('--- ' + sheet.name + ' ---');
      sheet.data.forEach(function (row) {
        var line = row.map(function (cell) {
          var s = '' + cell;
          if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1) {
            return '"' + s.replace(/"/g, '""') + '"';
          }
          return s;
        }).join(',');
        parts.push(line);
      });
      parts.push('');
    });
    var blob = new Blob([parts.join('\n')], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, filename);
  }

  async function exportExcel(sheets, filename) {
    var wb = new ExcelJS.Workbook();
    var blue = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } };
    sheets.forEach(function (sheet) {
      var ws = wb.addWorksheet(sheet.name);
      var widths = [];
      sheet.data.forEach(function (row) {
        var cells = row.map(function (c) {
          if (c && typeof c === 'object') return { formula: c.f, result: c.v };
          return c;
        });
        ws.addRow(cells);
        row.forEach(function (c, i) {
          var v = (c && typeof c === 'object') ? c.v : c;
          var len = ('' + (v === undefined || v === null ? '' : v)).length;
          widths[i] = Math.max(widths[i] || 8, Math.min(len + 2, 60));
        });
      });
      widths.forEach(function (w, i) { ws.getColumn(i + 1).width = w; });
      ws.getRow(1).font = { bold: true };
      // Line under the header row
      ws.getRow(1).eachCell(function (cell) {
        cell.border = { bottom: { style: 'medium' } };
      });
      // Total column: thick line on the left, slightly thinner on the right,
      // to separate it from the cells that get typed into
      if (sheet.totalCol !== undefined) {
        for (var r = 1; r <= sheet.data.length; r++) {
          var tcell = ws.getCell(r, sheet.totalCol + 1);
          tcell.border = Object.assign({}, tcell.border, { left: { style: 'thick' }, right: { style: 'medium' } });
        }
      }
      (sheet.fillCols || []).forEach(function (ci) {
        ws.getColumn(ci + 1).eachCell(function (cell) { cell.fill = blue; });
      });
      // Conditional format: a cell above 0 (bonus earned / tipovacka point) gets a light green background
      (sheet.greenCols || []).forEach(function (ci) {
        var L = colLetter(ci);
        ws.addConditionalFormatting({
          ref: L + '2:' + L + sheet.data.length,
          rules: [{
            type: 'cellIs',
            operator: 'greaterThan',
            formulae: [0],
            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFE2F0D9' } } }
          }]
        });
      });
      // Rank column: podium colours, subtle 4th/5th, bold red number for last place.
      // Rule priority (all set the same fill, so the first match wins): podium, last place, then 4-5.
      if (sheet.rankCol !== undefined) {
        var RL = colLetter(sheet.rankCol);
        var rf = RL + '2', rr = '$' + RL + '$2:$' + RL + '$' + sheet.data.length;
        function rankRule(formula, argb, type, operator) {
          var r = {
            type: type || 'cellIs',
            formulae: [formula],
            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: argb } } }
          };
          if (operator) r.operator = operator;
          return r;
        }
        ws.addConditionalFormatting({
          ref: RL + '2:' + RL + sheet.data.length,
          rules: [
            rankRule(1, 'FFFFE699', 'cellIs', 'equal'),                 // gold
            rankRule(2, 'FFD9D9D9', 'cellIs', 'equal'),                 // silver
            rankRule(3, 'FFF4C7A1', 'cellIs', 'equal'),                 // bronze
            { // last place: normal white background, bold red number
              type: 'expression',
              formulae: [rf + '=MAX(' + rr + ')'],
              style: { font: { bold: true, color: { argb: 'FFC00000' } } }
            },
            // 4th/5th: subtle blue, but never on the last place (that stays white)
            rankRule('AND(' + rf + '=4,' + rf + '<>MAX(' + rr + '))', 'FFEEF3FA', 'expression'),
            rankRule('AND(' + rf + '=5,' + rf + '<>MAX(' + rr + '))', 'FFEEF3FA', 'expression')
          ]
        });
      }
      (sheet.greyCols || []).forEach(function (ci) {
        ws.getColumn(ci + 1).font = { color: { argb: 'FF999999' } };
      });
    });
    var buf = await wb.xlsx.writeBuffer();
    triggerDownload(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
  }

  function exportPDF(sheets, filename) {
    var doc = new jspdf.jsPDF();
    sheets.forEach(function (sheet, idx) {
      if (idx > 0) doc.addPage();
      doc.setFontSize(14);
      doc.text(sheet.name, 14, 15);
      doc.autoTable({
        head: [sheet.data[0]],
        body: sheet.data.slice(1),
        startY: 20,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [17, 48, 95] }
      });
    });
    doc.save(filename);
  }

  try { exportName.value = localStorage.getItem('pubQuizExportName') || ''; } catch (e) {}

  exportBtn.addEventListener('click', function () {
    if (!exportStandings.checked && !exportBreakdown.checked && !exportState.checked) {
      showMsg(exportMsg, 'Select at least one content option.', 'error');
      return;
    }
    if (!exportState.checked && allScores.length === 0) {
      showMsg(exportMsg, 'No scores to export.', 'error');
      return;
    }

    var fmt = exportFormat.value;
    var sheets = assembleSheets(fmt, {
      state: exportState.checked, standings: exportStandings.checked, breakdown: exportBreakdown.checked
    });

    var today = new Date().toISOString().slice(0, 10);
    var filename = buildExportFilename(today);
    try { localStorage.setItem('pubQuizExportName', exportName.value.trim()); } catch (e) {}

    if (fmt === 'xlsx') {
      exportExcel(sheets, filename + '.xlsx').catch(function (e) {
        showMsg(exportMsg, 'Excel export failed: ' + e.message, 'error');
      });
    } else if (fmt === 'csv') {
      exportCSV(sheets, filename + '.csv');
    } else if (fmt === 'pdf') {
      exportPDF(sheets, filename + '.pdf');
    }

    showMsg(exportMsg, 'Export complete.', 'success');
  });

  // Build the sheet list for an export from the current config/teams/allScores
  function assembleSheets(fmt, want) {
    var sheets = [];
    var stateMeta = null;
    if (want.state) {
      var state = buildStateData();
      var stateData = fmt === 'xlsx' ? state.rows : flattenCells(state.rows);
      stateMeta = state.meta;
      sheets.push({ name: 'Quiz State', data: stateData, fillCols: state.meta.fillCols, greyCols: state.meta.greyCols, greenCols: state.meta.greenCols, rankCol: state.meta.rankCol, totalCol: state.meta.totalCol });
      sheets.push({ name: 'Quiz Config', data: buildConfigData() });
    }
    if (want.standings) {
      var standingsData = buildStandingsData();
      if (fmt === 'xlsx' && stateMeta) standingsData = buildLiveStandings(stateMeta, standingsData);
      sheets.push({ name: 'Standings', data: standingsData });
    }
    if (want.breakdown) {
      sheets.push({ name: 'Round Breakdown', data: buildBreakdownData() });
    }
    return sheets;
  }

  // ================================================================
  //  CHECKS — reminders about things that look unfinished
  // ================================================================

  function nameList(names) {
    var shown = names.slice(0, 6).map(escHtml).join(', ');
    return names.length > 6 ? shown + ' +' + (names.length - 6) + ' more' : shown;
  }

  function computeChecks() {
    var items = [];
    if (!config || teams.length === 0) return items;

    var n = teams.length;
    var tipovacka = config.has_tipovacka || [];
    var published = config.published_rounds || 0;
    var exc = extrasSettings(config);

    // Per round: which teams have a score, who has the tipovacka point
    var info = [];
    for (var r = 1; r <= config.rounds; r++) info[r] = { scored: {}, tip: [], dbl: 0 };
    allScores.forEach(function (s) {
      var ri = info[s.round_number];
      if (!ri) return;
      ri.scored[s.team_id] = true;
      if (s.tipovacka_point === 1) ri.tip.push(s.team_id);
      ri.dbl += Number(s.double_points) || 0;
    });
    function teamName(id) { var t = teams.find(function (x) { return x.id === id; }); return t ? t.name : '?'; }

    var anyLater = {};           // does any later round have scores?
    var seen = false;
    for (var k = config.rounds; k >= 1; k--) {
      anyLater[k] = seen;
      if (Object.keys(info[k].scored).length > 0) seen = true;
    }

    var unpublished = [];
    for (var rn = 1; rn <= config.rounds; rn++) {
      var ri = info[rn];
      var count = Object.keys(ri.scored).length;
      var missing = teams.filter(function (t) { return !ri.scored[t.id]; }).map(function (t) { return t.name; });
      var complete = count === n;

      if (!complete && rn <= published) {
        // Published while incomplete: players already see this round
        var whoTxt = count === 0 ? 'no team has points' : missing.length + ' of ' + n + ' teams ' + (missing.length === 1 ? 'has' : 'have') + ' no points (' + nameList(missing) + ')';
        items.push({ level: 'warn', round: rn,
          text: 'Round ' + rn + ' is published but ' + whoTxt + '. Players see incomplete standings.' });
      } else if (!complete && (count > 0 || anyLater[rn])) {
        // Missing scores (partly entered, or skipped while later rounds have scores)
        var txt = count === 0
          ? 'Round ' + rn + ' has no scores yet, but a later round does.'
          : 'Round ' + rn + ': ' + missing.length + ' of ' + n + ' team' + (n === 1 ? '' : 's') + ' still missing points (' + nameList(missing) + ').';
        items.push({ level: 'warn', round: rn, text: txt });
      }

      // 2. Scored but not published
      if (complete && rn > published) unpublished.push(rn);

      // 2x round with no points entered for the doubled question
      if (complete && exc.double.enabled && exc.double.rounds[rn] !== undefined && ri.dbl === 0) {
        items.push({ level: 'note', round: rn, text: 'Round ' + rn + ' is a ' + exc.double.mult + 'x round, but no team has points entered for the ' + exc.double.mult + 'x question.' });
      }

      // 4. Tipovacka sanity (only once the round is fully scored)
      if (complete && tipovacka[rn - 1] === true) {
        if (ri.tip.length === 0) {
          items.push({ level: 'note', round: rn, text: 'Round ' + rn + ' has tipova\u010dka, but no team has the tipova\u010dka point.' });
        } else if (ri.tip.length > 1) {
          items.push({ level: 'warn', round: rn,
            text: 'Round ' + rn + ': ' + ri.tip.length + ' teams have the tipova\u010dka point (' + nameList(ri.tip.map(teamName)) + '). Usually it is only one.' });
        }
      }
    }

    if (unpublished.length > 0) {
      var label = unpublished.length === 1 ? 'Round ' + unpublished[0] + ' is' : 'Rounds ' + unpublished.join(', ') + ' are';
      items.push({ level: 'note', round: unpublished[0], text: label + ' fully scored but not published yet.' });
    }
    return items;
  }

  function renderChecks() {
    if (!config || teams.length === 0) { checksSection.classList.add('hidden'); return; }
    checksSection.classList.remove('hidden');
    var items = computeChecks();
    if (items.length === 0) {
      checksList.innerHTML = '<div class="check-item check-ok"><span class="check-icon">\u2713</span><span>Nothing open. Everything entered so far looks complete.</span></div>';
      return;
    }
    // Warnings first
    items.sort(function (a, b) { return (a.level === 'warn' ? 0 : 1) - (b.level === 'warn' ? 0 : 1); });
    checksList.innerHTML = items.map(function (it) {
      return '<div class="check-item check-' + it.level + '"><span class="check-icon">' + (it.level === 'warn' ? '\u26A0' : '\u2139') + '</span>'
        + '<span>' + it.text
        + ' <button type="button" class="check-open" data-round="' + it.round + '">Open round ' + it.round + '</button></span></div>';
    }).join('');
  }

  checksList.addEventListener('click', function (e) {
    var btn = e.target.closest('.check-open');
    if (!btn) return;
    roundSelect.value = btn.getAttribute('data-round');
    renderScoreTable();
    scoreSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ================================================================
  //  QUIZ ARCHIVE (save / view / export / restore past quizzes)
  // ================================================================

  // Run fn with config/teams/allScores temporarily swapped to a snapshot, so the
  // export builders can be reused unchanged on an archived quiz.
  function withSnapshot(snap, fn) {
    var saved = { config: config, teams: teams, scores: allScores };
    config = snap.config; teams = snap.teams || []; allScores = snap.scores || [];
    try { return fn(); } finally { config = saved.config; teams = saved.teams; allScores = saved.scores; }
  }

  function summarize(snap) {
    return withSnapshot(snap, function () {
      var last = lastCompleteRound();
      return {
        teams: teams.length,
        rounds: config.rounds,
        last_complete_round: last,
        final: last >= config.rounds,
        top: computeExportStandings().slice(0, 3).map(function (t) { return { name: t.name, points: t.total }; })
      };
    });
  }

  // Read the live quiz fresh from the database (null if there is none)
  async function captureLive() {
    var c = await db.from('quiz_config').select('*').eq('id', 1).maybeSingle();
    if (c.error) throw c.error;
    if (!c.data) return null;
    var t = await db.from('teams').select('*').order('name');
    if (t.error) throw t.error;
    var s = await db.from('scores').select('*');
    if (s.error) throw s.error;
    return { config: c.data, teams: t.data || [], scores: s.data || [] };
  }

  async function saveArchive(snap, name, isTest) {
    var { error } = await db.from('quiz_archive').insert({
      name: name, is_test: !!isTest, summary: summarize(snap), snapshot: snap
    });
    return error;
  }

  async function clearLive() {
    await db.from('scores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await db.from('teams').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await db.from('quiz_config').delete().eq('id', 1);
    config = null; teams = []; allScores = [];
  }

  function defaultArchiveName() {
    var base = '';
    try { base = localStorage.getItem('pubQuizExportName') || ''; } catch (e) {}
    return (base || 'Pub quiz') + ' ' + new Date().toISOString().slice(0, 10);
  }

  async function loadArchive() {
    archiveSection.classList.remove('hidden');
    var { data, error } = await db.from('quiz_archive')
      .select('id,name,is_test,archived_at,summary').order('archived_at', { ascending: false });
    if (error) {
      archiveList.innerHTML = '';
      archiveSaveBox.classList.add('hidden');
      showMsg(archiveMsg, 'Archive not available: ' + error.message
        + ' (Run migrations/2026-11-quiz-archive.sql in Supabase.)', 'error');
      return;
    }
    if (!archiveName.value) archiveName.value = defaultArchiveName();
    renderArchiveList(data || []);
  }

  function renderArchiveList(rows) {
    if (rows.length === 0) {
      archiveList.innerHTML = '<p style="font-size:0.85rem;opacity:0.7;">No saved quizzes yet.</p>';
      return;
    }
    var html = '<div class="table-wrap"><table><thead><tr><th>Quiz</th><th>Saved</th><th></th></tr></thead><tbody>';
    rows.forEach(function (r) {
      var s = r.summary || {};
      var progress = s.final ? 'FINAL' : (s.last_complete_round > 0
        ? 'round ' + s.last_complete_round + ' of ' + s.rounds : 'not started');
      var top = (s.top || []).map(function (t, i) { return (i + 1) + '. ' + escHtml(t.name) + ' (' + t.points + ')'; }).join('  ');
      html += '<tr data-archive-id="' + r.id + '">'
        + '<td><strong>' + escHtml(r.name) + '</strong>'
        + (r.is_test ? ' <span style="font-size:0.7rem;border:1px solid var(--accent);color:var(--accent);border-radius:3px;padding:0 0.3rem;">TEST</span>' : '')
        + '<div style="font-size:0.75rem;opacity:0.7;">' + (s.teams || 0) + ' teams \u00b7 ' + progress + '</div>'
        + (top ? '<div style="font-size:0.75rem;opacity:0.7;">' + top + '</div>' : '')
        + '</td>'
        + '<td style="font-size:0.8rem;white-space:nowrap;">' + escHtml(new Date(r.archived_at).toLocaleString()) + '</td>'
        + '<td style="white-space:nowrap;">'
        + '<button class="btn btn-secondary archive-act" data-act="view">View</button> '
        + '<button class="btn btn-secondary archive-act" data-act="excel">Excel</button> '
        + '<button class="btn btn-secondary archive-act" data-act="restore">Restore</button> '
        + '<button class="btn btn-danger archive-act" data-act="delete">Delete</button>'
        + '</td></tr>'
        + '<tr class="archive-detail hidden" data-detail-for="' + r.id + '"><td colspan="3"></td></tr>';
    });
    html += '</tbody></table></div>';
    archiveList.innerHTML = html;
  }

  function simpleTableHtml(rows) {
    var h = '<div class="table-wrap"><table><thead><tr>'
      + rows[0].map(function (c) { return '<th>' + escHtml('' + c) + '</th>'; }).join('') + '</tr></thead><tbody>';
    rows.slice(1).forEach(function (r) {
      h += '<tr>' + r.map(function (c) { return '<td>' + escHtml('' + c) + '</td>'; }).join('') + '</tr>';
    });
    return h + '</tbody></table></div>';
  }

  async function fetchSnapshot(id) {
    var { data, error } = await db.from('quiz_archive').select('name,snapshot').eq('id', id).maybeSingle();
    if (error || !data) throw error || new Error('Saved quiz not found.');
    return data;
  }

  archiveSaveBtn.addEventListener('click', async function () {
    var name = archiveName.value.trim();
    if (!name) { showMsg(archiveMsg, 'Enter a name.', 'error'); return; }
    archiveSaveBtn.disabled = true;
    try {
      var snap = await captureLive();
      if (!snap) { showMsg(archiveMsg, 'There is no live quiz to save.', 'error'); return; }
      var err = await saveArchive(snap, name, archiveIsTest.checked);
      if (err) { showMsg(archiveMsg, err.message, 'error'); return; }
      showMsg(archiveMsg, 'Saved "' + name + '". The live quiz is unchanged.', 'success');
      await loadArchive();
    } catch (e) {
      showMsg(archiveMsg, e.message, 'error');
    } finally {
      archiveSaveBtn.disabled = false;
    }
  });

  archiveNewBtn.addEventListener('click', async function () {
    var name = archiveName.value.trim();
    if (!name) { showMsg(archiveMsg, 'Enter a name.', 'error'); return; }
    if (!confirm('Save "' + name + '" to the archive and then CLEAR the live quiz (setup, teams and scores) '
        + 'so you can set up a new one?\n\nYou can restore it from the archive later.')) return;
    archiveNewBtn.disabled = true;
    try {
      var snap = await captureLive();
      if (!snap) { showMsg(archiveMsg, 'There is no live quiz to save.', 'error'); return; }
      var err = await saveArchive(snap, name, archiveIsTest.checked);
      if (err) { showMsg(archiveMsg, 'Not cleared, saving failed: ' + err.message, 'error'); return; }
      await clearLive();
      archiveName.value = '';
      archiveIsTest.checked = false;
      await loadConfig();
      await loadArchive();
      showMsg(archiveMsg, 'Saved "' + name + '" and cleared the live quiz. Set up the new quiz above.', 'success');
    } catch (e) {
      showMsg(archiveMsg, e.message, 'error');
    } finally {
      archiveNewBtn.disabled = false;
    }
  });

  archiveList.addEventListener('click', async function (e) {
    var btn = e.target.closest('.archive-act');
    if (!btn) return;
    var tr = btn.closest('tr');
    var id = tr.getAttribute('data-archive-id');
    var act = btn.getAttribute('data-act');
    var label = tr.querySelector('strong').textContent;
    btn.disabled = true;
    try {
      if (act === 'view') {
        var detail = archiveList.querySelector('tr[data-detail-for="' + id + '"]');
        if (!detail.classList.contains('hidden')) { detail.classList.add('hidden'); return; }
        var row = await fetchSnapshot(id);
        detail.firstChild.innerHTML = withSnapshot(row.snapshot, function () {
          return '<h4 style="margin:0.5rem 0;">Standings</h4>' + simpleTableHtml(buildStandingsData())
            + (allScores.length ? '<h4 style="margin:0.75rem 0 0.5rem;">Round Breakdown</h4>' + simpleTableHtml(buildBreakdownData()) : '');
        });
        detail.classList.remove('hidden');
      } else if (act === 'excel') {
        var r2 = await fetchSnapshot(id);
        var today = new Date().toISOString().slice(0, 10);
        var sheets = withSnapshot(r2.snapshot, function () {
          return assembleSheets('xlsx', { state: true, standings: true, breakdown: allScores.length > 0 });
        });
        var fname = withSnapshot(r2.snapshot, function () { return buildExportFilename(today, r2.name, true); });
        await exportExcel(sheets, fname + '.xlsx');
      } else if (act === 'restore') {
        await restoreArchive(id, label);
      } else if (act === 'delete') {
        if (!confirm('Permanently delete the saved quiz "' + label + '"? This cannot be undone.')) return;
        var { error } = await db.from('quiz_archive').delete().eq('id', id);
        if (error) { showMsg(archiveMsg, error.message, 'error'); return; }
        showMsg(archiveMsg, 'Deleted "' + label + '".', 'success');
        await loadArchive();
      }
    } catch (err) {
      showMsg(archiveMsg, err.message || String(err), 'error');
    } finally {
      btn.disabled = false;
    }
  });

  async function restoreArchive(id, label) {
    var live = await captureLive();
    var msg = 'Restore "' + label + '" as the live quiz (players will see it on the scoreboard)?\n\n';
    msg += live
      ? 'The current live quiz will first be saved to the archive as "Auto-saved before restoring" and then replaced.'
      : 'There is no live quiz right now.';
    if (!confirm(msg)) return;

    var row = await fetchSnapshot(id);
    var snap = row.snapshot;

    if (live) {
      var err = await saveArchive(live, 'Auto-saved before restoring "' + label + '" (' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ')', false);
      if (err) { showMsg(archiveMsg, 'Not restored, auto-save of the current quiz failed: ' + err.message, 'error'); return; }
    }

    await clearLive();

    var { error: cErr } = await db.from('quiz_config').upsert(snap.config);
    if (cErr) { showMsg(archiveMsg, 'Restore failed (config): ' + cErr.message, 'error'); await loadConfig(); return; }

    var teamRows = (snap.teams || []).map(function (t) {
      var copy = Object.assign({}, t);
      delete copy.id; delete copy.created_at;
      return copy;
    });
    var { data: newTeams, error: tErr } = teamRows.length
      ? await db.from('teams').insert(teamRows).select()
      : { data: [], error: null };
    if (tErr) { showMsg(archiveMsg, 'Restore failed (teams): ' + tErr.message, 'error'); await loadConfig(); return; }

    // Teams got new ids; map old id -> new id through the (unique) team name
    var byName = {};
    (newTeams || []).forEach(function (t) { byName[t.name] = t.id; });
    var oldName = {};
    (snap.teams || []).forEach(function (t) { oldName[t.id] = t.name; });
    var scoreRows = (snap.scores || []).map(function (s) {
      var row = {
        team_id: byName[oldName[s.team_id]],
        round_number: s.round_number,
        standard_points: s.standard_points,
        tipovacka_point: s.tipovacka_point,
        updated_at: s.updated_at
      };
      if (s.double_points !== undefined) row.double_points = s.double_points;
      return row;
    }).filter(function (s) { return s.team_id; });
    if (scoreRows.length) {
      var { error: sErr } = await db.from('scores').insert(scoreRows);
      if (sErr) { showMsg(archiveMsg, 'Restore failed (scores): ' + sErr.message, 'error'); await loadConfig(); return; }
    }

    await loadConfig();
    await loadArchive();
    showMsg(archiveMsg, 'Restored "' + label + '" as the live quiz.' + (live ? ' The previous quiz was saved to the archive.' : ''), 'success');
  }

  // ---- Collapsible sections ----
  document.querySelectorAll('.collapsible-header').forEach(function (header) {
    header.addEventListener('click', function () {
      header.closest('.collapsible').classList.toggle('collapsed');
    });
  });

  // ---- Init ----
  checkSession();
})();
