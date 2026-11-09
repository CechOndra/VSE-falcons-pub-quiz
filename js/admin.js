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

  const shotsSection   = document.getElementById('shotsSection');
  const shotsBody      = document.getElementById('shotsBody');
  const shotsMsg       = document.getElementById('shotsMsg');
  const saveShotsBtn   = document.getElementById('saveShotsBtn');

  const summarySection = document.getElementById('summarySection');
  const summaryHead    = document.getElementById('summaryHead');
  const summaryBody    = document.getElementById('summaryBody');

  const exportSection   = document.getElementById('exportSection');
  const exportFormat    = document.getElementById('exportFormat');
  const exportStandings = document.getElementById('exportStandings');
  const exportBreakdown = document.getElementById('exportBreakdown');
  const exportState     = document.getElementById('exportState');
  const exportName      = document.getElementById('exportName');
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

  function renderTeamsSection() {
    if (teams.length === 0) { teamsSection.classList.add('hidden'); return; }
    teamsSection.classList.remove('hidden');
    var html = '';
    teams.forEach(function (t) {
      html += '<tr>'
        + '<td>' + escHtml(t.name) + '</td>'
        + '<td class="text-center"><input type="number" class="score-input" min="1" step="1" '
        + 'data-team-id="' + t.id + '" value="' + (t.player_count || 1) + '"></td>'
        + '</tr>';
    });
    teamsBody.innerHTML = html;
  }

  saveTeamsBtn.addEventListener('click', async function () {
    saveTeamsBtn.disabled = true;
    var inputs = teamsBody.querySelectorAll('input[data-team-id]');
    var updates = [];
    for (var i = 0; i < inputs.length; i++) {
      var id = inputs[i].getAttribute('data-team-id');
      var count = parseInt(inputs[i].value, 10);
      if (isNaN(count) || count < 1) {
        showMsg(teamsMsg, 'Invalid player count for a team.', 'error');
        saveTeamsBtn.disabled = false;
        return;
      }
      updates.push({ id: id, player_count: count });
    }
    for (var i = 0; i < updates.length; i++) {
      var { error } = await db.from('teams').update({ player_count: updates[i].player_count }).eq('id', updates[i].id);
      if (error) {
        showMsg(teamsMsg, error.message, 'error');
        saveTeamsBtn.disabled = false;
        return;
      }
    }
    showMsg(teamsMsg, 'Player counts saved.', 'success');
    saveTeamsBtn.disabled = false;
    // Refresh teams data
    var { data: t } = await db.from('teams').select('*').order('name');
    teams = t || [];
  });

  // ---- Shots Bonus ----
  function renderShotsSection() {
    if (teams.length === 0) { shotsSection.classList.add('hidden'); return; }
    shotsSection.classList.remove('hidden');
    var html = '';
    teams.forEach(function (t) {
      html += '<tr>'
        + '<td>' + escHtml(t.name) + '</td>'
        + '<td class="text-center"><input type="checkbox" data-team-id="' + t.id + '"'
        + (t.shots_bonus ? ' checked' : '') + '></td>'
        + '</tr>';
    });
    shotsBody.innerHTML = html;
  }

  var checkAllShotsBtn = document.getElementById('checkAllShotsBtn');
  checkAllShotsBtn.addEventListener('click', function () {
    var allChecked = shotsBody.querySelectorAll('input[data-team-id]');
    var unchecked = shotsBody.querySelectorAll('input[data-team-id]:not(:checked)');
    // If all are checked, uncheck all; otherwise check all
    var newState = unchecked.length > 0;
    allChecked.forEach(function (cb) { cb.checked = newState; });
    checkAllShotsBtn.textContent = newState ? 'Uncheck All' : 'Check All';
  });

  saveShotsBtn.addEventListener('click', async function () {
    saveShotsBtn.disabled = true;
    var checkboxes = shotsBody.querySelectorAll('input[data-team-id]');
    for (var i = 0; i < checkboxes.length; i++) {
      var id = checkboxes[i].getAttribute('data-team-id');
      var val = checkboxes[i].checked ? 1 : 0;
      var { error } = await db.from('teams').update({ shots_bonus: val }).eq('id', id);
      if (error) {
        showMsg(shotsMsg, error.message, 'error');
        saveShotsBtn.disabled = false;
        return;
      }
    }
    showMsg(shotsMsg, 'Shots bonus saved.', 'success');
    saveShotsBtn.disabled = false;
    var { data: t } = await db.from('teams').select('*').order('name');
    teams = t || [];
  });

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
      var parts = lines[i].split(',');
      var tName = parts[0].trim();
      var count = parts.length > 1 ? parseInt(parts[parts.length - 1].trim(), 10) : 1;
      if (!tName) { showMsg(setupMsg, 'Empty team name on line ' + (i + 1) + '.', 'error'); return; }
      if (isNaN(count) || count < 1) { showMsg(setupMsg, 'Invalid player count on line ' + (i + 1) + '. Use: Name, Number', 'error'); return; }
      parsedTeams.push({ name: tName, player_count: count });
    }

    // Check for duplicate names
    var unique = new Set(parsedTeams.map(function (t) { return t.name; }));
    if (unique.size !== parsedTeams.length) { showMsg(setupMsg, 'Duplicate team names found.', 'error'); return; }

    setupSaveBtn.disabled = true;

    // Save config
    var { error: cfgErr } = await db.from('quiz_config').upsert({
      id: 1, rounds: rounds, questions_per_round: qpr, has_tipovacka: tipArr
    });
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

  // ---- Publish controls ----
  function updatePublishStatus() {
    var pub = config.published_rounds || 0;
    publishStatus.textContent = 'Published: Round ' + pub + ' of ' + config.rounds;
    publishBtn.disabled = pub >= config.rounds;
    unpublishBtn.disabled = pub <= 0;
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
          + '<input type="checkbox" class="tip-check" data-tip-team="' + t.id + '"' + (tip === 1 ? ' checked' : '') + '>'
          + '</td>';
      } else {
        html += '<td class="text-center hidden"></td>';
      }
      html += '</tr>';
    });
    scoreBody.innerHTML = html;

    // Warn when multiple tipovacka are checked
    if (hasTip) {
      scoreBody.querySelectorAll('.tip-check').forEach(function (cb) {
        cb.addEventListener('change', updateTipWarning);
      });
      updateTipWarning();
    }
  }

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

      rows.push({
        team_id: teamId,
        round_number: rn,
        standard_points: pts,
        tipovacka_point: (hasTip && tipTeamIds[teamId]) ? 1 : 0,
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
    hHtml += '<th class="text-center">Shots</th>';
    hHtml += '<th class="text-right">Total</th></tr>';
    summaryHead.innerHTML = hHtml;

    // Build map
    var teamMap = {};
    teams.forEach(function (t) { teamMap[t.id] = t; });
    var map = {};
    teams.forEach(function (t) { map[t.id] = { name: t.name, shots: t.shots_bonus || 0, rounds: {}, total: t.shots_bonus || 0 }; });
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
      bHtml += '<td class="text-center">' + (t.shots ? '\u2713' : '-') + '</td>';
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
    teams.forEach(function (t) {
      map[t.id] = { id: t.id, name: t.name, players: t.player_count || 1, shots: t.shots_bonus || 0, rounds: {}, total: t.shots_bonus || 0 };
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
      return a.players - b.players;
    });
    return list;
  }

  function computeExportRanks(standings) {
    var sorted = standings.slice().sort(function (a, b) {
      if (a.total !== b.total) return b.total - a.total;
      return a.players - b.players;
    });
    var nums = [];
    for (var i = 0; i < sorted.length; i++) {
      if (i === 0) {
        nums.push(1);
      } else if (sorted[i].total === sorted[i - 1].total &&
                 sorted[i].players === sorted[i - 1].players) {
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
    header.push('Shots');
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
      row.push(t.shots ? 1 : 0);
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
    var scoreMap = {};
    allScores.forEach(function (s) {
      scoreMap[s.team_id + ':' + s.round_number] = s;
    });

    var header = ['Team', 'Players', 'Shots'];
    var pointCols = [];
    for (var r = 1; r <= config.rounds; r++) {
      pointCols.push(header.length);
      header.push('R' + r);
      if (tipovacka[r - 1] === true) {
        pointCols.push(header.length);
        header.push('R' + r + ' Tip');
      }
    }
    var totalCol = header.length;
    var rankCol = totalCol + 1;
    var keyCol = totalCol + 2;
    header.push('Total');
    header.push('Rank');
    header.push('Sort key (helper)');

    var n = teams.length;
    var first = 2, last = n + 1; // Excel rows (1 = header)
    var totalRange = colLetter(totalCol) + first + ':' + colLetter(totalCol) + last;
    var playersRange = 'B' + first + ':B' + last;

    var rows = [header];
    var totals = [];
    teams.forEach(function (t) {
      var players = t.player_count || 1;
      var shots = t.shots_bonus ? 1 : 0;
      var row = [t.name, players, shots];
      var total = shots;
      for (var rn = 1; rn <= config.rounds; rn++) {
        var s = scoreMap[t.id + ':' + rn];
        row.push(s ? s.standard_points : '');
        if (s) total += s.standard_points;
        if (tipovacka[rn - 1] === true) {
          row.push(s ? s.tipovacka_point : '');
          if (s) total += s.tipovacka_point;
        }
      }
      totals.push(total);
      row.push(total); // placeholders, replaced below
      row.push('');
      row.push('');
      rows.push(row);
    });

    // Compute ranks (same rule as standings: points desc, fewer players first)
    rows.slice(1).forEach(function (row, i) {
      var t = teams[i];
      var players = t.player_count || 1;
      var rank = 1;
      teams.forEach(function (o, j) {
        var op = o.player_count || 1;
        if (totals[j] > totals[i] || (totals[j] === totals[i] && op < players)) rank++;
      });
      var xr = i + 2; // Excel row
      var firstPt = colLetter(pointCols[0]), lastPt = colLetter(pointCols[pointCols.length - 1]);
      var totalF = 'C' + xr + '+SUM(' + firstPt + xr + ':' + lastPt + xr + ')';
      var tc = colLetter(totalCol);
      var rankF = '1+COUNTIF(' + totalRange + ',">"&' + tc + xr + ')'
        + '+COUNTIFS(' + totalRange + ',' + tc + xr + ',' + playersRange + ',"<"&B' + xr + ')';
      // Unique sort key: points desc, then fewer players, then sheet order
      var keyF = tc + xr + '*100000-B' + xr + '*100-ROW()/1000';
      var keyV = totals[i] * 100000 - players * 100 - xr / 1000;
      row[totalCol] = { t: 'n', v: totals[i], f: totalF };
      row[rankCol]  = { t: 'n', v: rank, f: rankF };
      row[keyCol]   = { t: 'n', v: keyV, f: keyF };
    });

    // Layout info for styling and for the Standings formulas
    var fillCols = [];
    var greenCols = [];
    header.forEach(function (h, i) {
      if (/^R\d+$/.test(h)) fillCols.push(i);
      if (h === 'Shots' || /^R\d+ Tip$/.test(h)) greenCols.push(i);
    });
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
      ['Teams', teams.length],
      [],
      ['Note', 'Fill points into the R columns of the Quiz State sheet. Total and Rank are formulas (Excel only). Ties are broken by fewer players.']
    ];
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
  function buildExportFilename(today) {
    var name = exportName.value.trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-');
    var perRound = {};
    allScores.forEach(function (s) { perRound[s.round_number] = (perRound[s.round_number] || 0) + 1; });
    var done = 0;
    Object.keys(perRound).forEach(function (rn) {
      if (perRound[rn] >= teams.length && +rn > done) done = +rn;
    });
    var parts = [name || 'pub-quiz', exportState.checked ? 'state' : 'results'];
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
      // Conditional format: a cell equal to 1 gets a light green background
      (sheet.greenCols || []).forEach(function (ci) {
        var L = colLetter(ci);
        ws.addConditionalFormatting({
          ref: L + '2:' + L + sheet.data.length,
          rules: [{
            type: 'cellIs',
            operator: 'equal',
            formulae: [1],
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
    var sheets = [];
    var stateMeta = null;
    if (exportState.checked) {
      var state = buildStateData();
      var stateData = fmt === 'xlsx' ? state.rows : flattenCells(state.rows);
      stateMeta = state.meta;
      sheets.push({ name: 'Quiz State', data: stateData, fillCols: state.meta.fillCols, greyCols: state.meta.greyCols, greenCols: state.meta.greenCols, rankCol: state.meta.rankCol, totalCol: state.meta.totalCol });
      sheets.push({ name: 'Quiz Config', data: buildConfigData() });
    }
    if (exportStandings.checked) {
      var standingsData = buildStandingsData();
      if (fmt === 'xlsx' && stateMeta) standingsData = buildLiveStandings(stateMeta, standingsData);
      sheets.push({ name: 'Standings', data: standingsData });
    }
    if (exportBreakdown.checked) {
      sheets.push({ name: 'Round Breakdown', data: buildBreakdownData() });
    }

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

  // ---- Collapsible sections ----
  document.querySelectorAll('.collapsible-header').forEach(function (header) {
    header.addEventListener('click', function () {
      header.closest('.collapsible').classList.toggle('collapsed');
    });
  });

  // ---- Init ----
  checkSession();
})();
