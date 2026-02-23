// Public scoreboard logic
(function () {
  'use strict';

  let config = null;   // quiz_config row
  let teams  = [];     // [{id, name}]
  let scores = [];     // [{team_id, round_number, standard_points, tipovacka_point}]

  // ---- DOM refs ----
  const roundIndicator = document.getElementById('roundIndicator');
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
    });
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
    scores = scoreRes.data || [];

    render();
  }

  // ---- Compute standings ----
  function computeStandings() {
    // Map team_id -> {name, rounds: {roundNum: {std, tip}}, total}
    var map = {};
    teams.forEach(function (t) {
      map[t.id] = { id: t.id, name: t.name, rounds: {}, total: 0 };
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
    list.sort(function (a, b) { return b.total - a.total; });
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

    var standings = computeStandings();
    var scored = scoredRounds();
    var roundsScored = scored.length;

    roundIndicator.textContent = roundsScored > 0
      ? 'Round ' + roundsScored + ' of ' + config.rounds
      : 'No rounds scored yet';

    renderStandings(standings);
    renderBreakdown(standings, scored);
  }

  function renderStandings(standings) {
    var html = '';
    standings.forEach(function (team, i) {
      var rank = i + 1;
      var cls = rank <= 3 ? ' class="rank-' + rank + '"' : '';
      html += '<tr' + cls + '>'
        + '<td>' + rank + '</td>'
        + '<td>' + escHtml(team.name) + '</td>'
        + '<td class="text-right">' + team.total + '</td>'
        + '</tr>';
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

    // Header
    var headHtml = '<tr><th>#</th><th>Team</th>';
    scored.forEach(function (r) {
      headHtml += '<th class="text-center">R' + r + '</th>';
    });
    headHtml += '<th class="text-right">Total</th></tr>';
    breakdownHead.innerHTML = headHtml;

    // Body
    var bodyHtml = '';
    standings.forEach(function (team, i) {
      var rank = i + 1;
      var cls = rank <= 3 ? ' class="rank-' + rank + '"' : '';
      bodyHtml += '<tr' + cls + '>';
      bodyHtml += '<td>' + rank + '</td>';
      bodyHtml += '<td>' + escHtml(team.name) + '</td>';

      scored.forEach(function (r) {
        var rd = team.rounds[r];
        if (!rd) {
          bodyHtml += '<td class="text-center">-</td>';
        } else {
          var hasTip = tipovacka[r - 1] === true;
          if (hasTip && rd.tip === 1) {
            bodyHtml += '<td class="text-center">' + rd.std + ' + 1</td>';
          } else {
            bodyHtml += '<td class="text-center">' + (rd.std + rd.tip) + '</td>';
          }
        }
      });

      bodyHtml += '<td class="text-right"><strong>' + team.total + '</strong></td>';
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
