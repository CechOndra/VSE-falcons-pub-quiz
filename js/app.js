// Public scoreboard logic
(function () {
  'use strict';

  let config = null;   // quiz_config row
  let teams  = [];     // [{id, name}]
  let scores = [];     // [{team_id, round_number, standard_points, tipovacka_point}]

  // Sort state: { col: 'total' | round number, dir: 'desc' | 'asc' }
  var sortState = { col: 'total', dir: 'desc' };
  var showPlayers = false;
  var showShots = false;

  // ---- DOM refs ----
  const roundIndicator = document.getElementById('roundIndicator');
  const standingsHead  = document.getElementById('standingsHead');
  const standingsBody  = document.getElementById('standingsBody');
  const breakdownHead  = document.getElementById('breakdownHead');
  const breakdownBody  = document.getElementById('breakdownBody');
  const noData         = document.getElementById('noData');
  const viewStandings  = document.getElementById('view-standings');
  const viewBreakdown  = document.getElementById('view-breakdown');
  const tabBtns        = document.querySelectorAll('.tab-btn');

  // ---- Tab switching ----
  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      tabBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var view = btn.getAttribute('data-view');
      viewStandings.classList.toggle('hidden', view !== 'standings');
      viewBreakdown.classList.toggle('hidden', view !== 'breakdown');
      togglePlayersBtn.classList.toggle('hidden', view !== 'standings');
      toggleShotsBtn.classList.toggle('hidden', view !== 'breakdown');
    });
  });

  // ---- Toggle players column ----
  var togglePlayersBtn = document.getElementById('togglePlayersBtn');
  togglePlayersBtn.addEventListener('click', function () {
    showPlayers = !showPlayers;
    togglePlayersBtn.textContent = showPlayers ? 'Hide Players' : 'Show Players';
    render();
  });

  // ---- Toggle shots column ----
  var toggleShotsBtn = document.getElementById('toggleShotsBtn');
  toggleShotsBtn.classList.add('hidden');
  toggleShotsBtn.addEventListener('click', function () {
    showShots = !showShots;
    toggleShotsBtn.textContent = showShots ? 'Hide Shots' : 'Show Shots';
    render();
  });

  // ---- Data fetching ----
  async function fetchData() {
    var [cfgRes, teamRes, scoreRes] = await Promise.all([
      db.from('quiz_config').select('*').eq('id', 1).maybeSingle(),
      db.from('teams').select('*').order('name'),
      db.from('scores').select('*')
    ]);

    config = cfgRes.data;
    teams  = teamRes.data || [];
    var allScores = scoreRes.data || [];

    // Only show scores for published rounds
    var pubRounds = config ? (config.published_rounds || 0) : 0;
    scores = allScores.filter(function (s) { return s.round_number <= pubRounds; });

    render();
  }

  // ---- Compute standings ----
  function computeStandings() {
    // Map team_id -> {name, rounds: {roundNum: {std, tip}}, total}
    var map = {};
    teams.forEach(function (t) {
      var pubRounds = config ? (config.published_rounds || 0) : 0;
      var shots = pubRounds > 0 ? (t.shots_bonus || 0) : 0;
      map[t.id] = { id: t.id, name: t.name, players: t.player_count || 1, shots: shots, rounds: {}, total: shots };
    });

    scores.forEach(function (s) {
      if (!map[s.team_id]) return;
      var pts = s.standard_points + s.tipovacka_point;
      map[s.team_id].rounds[s.round_number] = {
        std: s.standard_points,
        tip: s.tipovacka_point
      };
      map[s.team_id].total += pts;
    });

    var list = Object.values(map);
    var pubRounds = config ? (config.published_rounds || 0) : 0;

    if (pubRounds === 0) {
      // Before any round is published, sort alphabetically
      list.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });
    } else {
      // Sort by selected column
      var col = sortState.col;
      var dir = sortState.dir === 'desc' ? 1 : -1;
      list.sort(function (a, b) {
        var aVal, bVal;
        if (col === 'total') {
          aVal = a.total;
          bVal = b.total;
        } else {
          var aRd = a.rounds[col];
          var bRd = b.rounds[col];
          aVal = aRd ? aRd.std + aRd.tip : 0;
          bVal = bRd ? bRd.std + bRd.tip : 0;
        }
        if (aVal !== bVal) return (bVal - aVal) * dir;
        // Tiebreak by total if sorting by round
        if (col !== 'total' && a.total !== b.total) return b.total - a.total;
        // Tiebreak by fewer players (fewer = higher rank)
        return a.players - b.players;
      });
    }
    return list;
  }

  // Figure out which rounds have been scored (at least one score row exists)
  function scoredRounds() {
    var set = new Set();
    scores.forEach(function (s) { set.add(s.round_number); });
    var arr = Array.from(set);
    arr.sort(function (a, b) { return a - b; });
    return arr;
  }

  // Compute display ranks based on total (descending), independent of current sort
  // Returns a map: team.id -> { num: rankNumber, label: displayString }
  function computeRanks(standings) {
    var pubRounds = config ? (config.published_rounds || 0) : 0;

    if (pubRounds === 0) {
      // Before any round is published, sequential ranks based on alphabetical order
      var sorted = standings.slice().sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });
      var rankMap = {};
      sorted.forEach(function (team, i) {
        rankMap[team.id] = { num: i + 1, label: '' + (i + 1) };
      });
      return rankMap;
    }

    // Sort a copy by total desc, then fewer players
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
    // Mark which ranks are tied
    var counts = {};
    nums.forEach(function (n) { counts[n] = (counts[n] || 0) + 1; });
    // Build lookup by team id
    var rankMap = {};
    sorted.forEach(function (team, i) {
      var n = nums[i];
      rankMap[team.id] = { num: n, label: counts[n] > 1 ? 'T-' + n : '' + n };
    });
    return rankMap;
  }

  // ---- Rendering ----
  function render() {
    if (!config || teams.length === 0) {
      noData.classList.remove('hidden');
      viewStandings.classList.add('hidden');
      viewBreakdown.classList.add('hidden');
      roundIndicator.textContent = '';
      return;
    }
    noData.classList.add('hidden');

    var active = document.querySelector('.tab-btn.active');
    var currentView = active ? active.getAttribute('data-view') : 'standings';
    viewStandings.classList.toggle('hidden', currentView !== 'standings');
    viewBreakdown.classList.toggle('hidden', currentView !== 'breakdown');

    var scored = scoredRounds();
    var roundsScored = scored.length;

    var pubRounds = config.published_rounds || 0;
    roundIndicator.textContent = pubRounds > 0
      ? 'Round ' + pubRounds + ' of ' + config.rounds
      : 'No rounds scored yet';

    // Standings always sorted by total descending
    var savedState = { col: sortState.col, dir: sortState.dir };
    sortState.col = 'total';
    sortState.dir = 'desc';
    renderStandings(computeStandings());

    // Breakdown uses user-selected sort
    sortState.col = savedState.col;
    sortState.dir = savedState.dir;
    renderBreakdown(computeStandings(), scored);
  }

  function renderStandings(standings) {
    var ranks = computeRanks(standings);

    var headHtml = '<tr><th>#</th><th>Team</th><th class="text-right">Points</th>';
    if (showPlayers) headHtml += '<th class="text-center">Players</th>';
    headHtml += '</tr>';
    standingsHead.innerHTML = headHtml;

    var html = '';
    standings.forEach(function (team) {
      var r = ranks[team.id];
      var pubRounds = config ? (config.published_rounds || 0) : 0;
      var cls = (pubRounds > 0 && r.num <= 3) ? ' class="rank-' + r.num + '"' : '';
      html += '<tr' + cls + '>'
        + '<td>' + r.label + '</td>'
        + '<td>' + escHtml(team.name) + '</td>'
        + '<td class="text-right">' + team.total + '</td>';
      if (showPlayers) html += '<td class="text-center">' + team.players + '</td>';
      html += '</tr>';
    });
    standingsBody.innerHTML = html;
  }

  function renderBreakdown(standings, scored) {
    if (scored.length === 0) {
      breakdownHead.innerHTML = '';
      breakdownBody.innerHTML = '';
      return;
    }

    var tipovacka = config.has_tipovacka || [];

    // Header with sortable columns
    var headHtml = '<tr><th>#</th><th>Team</th>';
    scored.forEach(function (r) {
      var active = sortState.col === r;
      var arrow = active ? (sortState.dir === 'desc' ? ' \u25BC' : ' \u25B2') : '';
      headHtml += '<th class="text-center sortable' + (active ? ' sort-active' : '') + '" data-sort-col="' + r + '">R' + r + arrow + '</th>';
    });
    if (showShots) headHtml += '<th class="text-center">Shots</th>';
    var totalActive = sortState.col === 'total';
    var totalArrow = totalActive ? (sortState.dir === 'desc' ? ' \u25BC' : ' \u25B2') : '';
    headHtml += '<th class="text-right sortable' + (totalActive ? ' sort-active' : '') + '" data-sort-col="total">Total' + totalArrow + '</th></tr>';
    breakdownHead.innerHTML = headHtml;

    // Attach click handlers to sortable headers
    breakdownHead.querySelectorAll('.sortable').forEach(function (th) {
      th.addEventListener('click', function () {
        var col = th.getAttribute('data-sort-col');
        col = col === 'total' ? 'total' : parseInt(col, 10);
        if (sortState.col === col) {
          sortState.dir = sortState.dir === 'desc' ? 'asc' : 'desc';
        } else {
          sortState.col = col;
          sortState.dir = 'desc';
        }
        render();
      });
    });

    // Body
    var ranks = computeRanks(standings);
    var bodyHtml = '';
    standings.forEach(function (team) {
      var r = ranks[team.id];
      var pubRounds = config ? (config.published_rounds || 0) : 0;
      var cls = (pubRounds > 0 && r.num <= 3) ? ' class="rank-' + r.num + '"' : '';
      bodyHtml += '<tr' + cls + '>';
      bodyHtml += '<td>' + r.label + '</td>';
      bodyHtml += '<td>' + escHtml(team.name) + '</td>';

      scored.forEach(function (r) {
        var colCls = 'text-center' + (sortState.col === r ? ' sort-active' : '');
        var rd = team.rounds[r];
        if (!rd) {
          bodyHtml += '<td class="' + colCls + '">-</td>';
        } else {
          var hasTip = tipovacka[r - 1] === true;
          if (hasTip && rd.tip === 1) {
            bodyHtml += '<td class="' + colCls + '">' + rd.std + ' + 1</td>';
          } else {
            bodyHtml += '<td class="' + colCls + '">' + (rd.std + rd.tip) + '</td>';
          }
        }
      });

      if (showShots) bodyHtml += '<td class="text-center">' + (team.shots ? '\u2713' : '-') + '</td>';
      var totalCls = 'text-right' + (sortState.col === 'total' ? ' sort-active' : '');
      bodyHtml += '<td class="' + totalCls + '"><strong>' + team.total + '</strong></td>';
      bodyHtml += '</tr>';
    });
    breakdownBody.innerHTML = bodyHtml;
  }

  function escHtml(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ---- Init + auto-refresh ----
  fetchData();
  setInterval(fetchData, 15000);
})();
