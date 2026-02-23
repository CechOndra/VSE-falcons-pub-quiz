// Admin panel logic
(function () {
  'use strict';

  // ---- State ----
  let config = null;
  let teams  = [];
  let allScores = [];

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

  const summarySection = document.getElementById('summarySection');
  const summaryHead    = document.getElementById('summaryHead');
  const summaryBody    = document.getElementById('summaryBody');

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
    loginSection.classList.remove('hidden');
    dashboard.classList.add('hidden');
    signOutBtn.classList.add('hidden');
  });

  async function showDashboard() {
    loginSection.classList.add('hidden');
    dashboard.classList.remove('hidden');
    signOutBtn.classList.remove('hidden');
    await loadConfig();
  }

  // ================================================================
  //  QUIZ SETUP
  // ================================================================

  async function loadConfig() {
    var { data } = await db.from('quiz_config').select('*').eq('id', 1).maybeSingle();
    config = data;

    if (!config) {
      setupSection.classList.remove('hidden');
      configBanner.classList.add('hidden');
      scoreSection.classList.add('hidden');
      summarySection.classList.add('hidden');
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

    showScoreSection();
    await loadAllScores();
  }

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

    // Parse team names
    var lines = setupTeams.value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    if (lines.length === 0) { showMsg(setupMsg, 'Enter at least one team name.', 'error'); return; }
    if (lines.length > 30) { showMsg(setupMsg, 'Maximum 30 teams.', 'error'); return; }

    // Check for duplicate names
    var unique = new Set(lines);
    if (unique.size !== lines.length) { showMsg(setupMsg, 'Duplicate team names found.', 'error'); return; }

    setupSaveBtn.disabled = true;

    // Save config
    var { error: cfgErr } = await db.from('quiz_config').upsert({
      id: 1, rounds: rounds, questions_per_round: qpr, has_tipovacka: tipArr
    });
    if (cfgErr) { showMsg(setupMsg, cfgErr.message, 'error'); setupSaveBtn.disabled = false; return; }

    // Save teams
    var teamRows = lines.map(function (name) { return { name: name }; });
    var { error: teamErr } = await db.from('teams').insert(teamRows);
    if (teamErr) { showMsg(setupMsg, teamErr.message, 'error'); setupSaveBtn.disabled = false; return; }

    setupSaveBtn.disabled = false;
    await loadConfig();
  });

  // ---- Reset ----
  resetBtn.addEventListener('click', async function () {
    if (!confirm('This will delete ALL quiz data (config, teams, scores). Are you sure?')) return;
    if (!confirm('Really? This cannot be undone.')) return;

    await db.from('scores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await db.from('teams').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await db.from('quiz_config').delete().eq('id', 1);

    config = null;
    teams = [];
    allScores = [];
    await loadConfig();
  });

  // ================================================================
  //  SCORE ENTRY
  // ================================================================

  function showScoreSection() {
    scoreSection.classList.remove('hidden');
    summarySection.classList.remove('hidden');

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
      html += '<td>' + escHtml(t.name) + '</td>';
      html += '<td class="text-center">'
        + '<input type="number" class="score-input std-input" min="0" max="' + config.questions_per_round + '" step="0.5" value="' + pts + '">'
        + '</td>';

      if (hasTip) {
        html += '<td class="text-center">'
          + '<input type="radio" name="tipovacka" value="' + t.id + '"' + (tip === 1 ? ' checked' : '') + '>'
          + '</td>';
      } else {
        html += '<td class="text-center hidden"></td>';
      }
      html += '</tr>';
    });
    scoreBody.innerHTML = html;
  }

  saveRoundBtn.addEventListener('click', async function () {
    var rn = parseInt(roundSelect.value);
    var tipovacka = config.has_tipovacka || [];
    var hasTip = tipovacka[rn - 1] === true;

    // Determine which team gets tipovacka
    var tipTeamId = null;
    if (hasTip) {
      var checked = document.querySelector('input[name="tipovacka"]:checked');
      if (checked) tipTeamId = checked.value;
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

      rows.push({
        team_id: teamId,
        round_number: rn,
        standard_points: pts,
        tipovacka_point: (hasTip && teamId === tipTeamId) ? 1 : 0,
        updated_at: new Date().toISOString()
      });
    });

    if (!valid || rows.length !== teams.length) {
      showMsg(scoreMsg, 'Fill in valid points for every team (0-' + config.questions_per_round + ').', 'error');
      return;
    }

    saveRoundBtn.disabled = true;
    var { error } = await db.from('scores').upsert(rows, { onConflict: 'team_id,round_number' });
    saveRoundBtn.disabled = false;

    if (error) { showMsg(scoreMsg, error.message, 'error'); return; }
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
      var name = tr.querySelector('td').textContent;
      nameMap[name] = tr;
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
        var radio = tr.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
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
    hHtml += '<th class="text-right">Total</th></tr>';
    summaryHead.innerHTML = hHtml;

    // Build map
    var map = {};
    teams.forEach(function (t) { map[t.id] = { name: t.name, rounds: {}, total: 0 }; });
    allScores.forEach(function (s) {
      if (!map[s.team_id]) return;
      var pts = s.standard_points + s.tipovacka_point;
      map[s.team_id].rounds[s.round_number] = { std: s.standard_points, tip: s.tipovacka_point };
      map[s.team_id].total += pts;
    });

    var list = Object.values(map).sort(function (a, b) { return b.total - a.total; });

    var bHtml = '';
    list.forEach(function (t) {
      bHtml += '<tr><td>' + escHtml(t.name) + '</td>';
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
      bHtml += '<td class="text-right"><strong>' + t.total + '</strong></td></tr>';
    });
    summaryBody.innerHTML = bHtml;

    // Also re-render the score table for the current round (it may have new data)
    renderScoreTable();
  }

  // ---- Init ----
  checkSession();
})();
