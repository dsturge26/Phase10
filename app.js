(function () {
  'use strict';

  const PHASES = [
    '2 Sets of 3',
    '1 Set of 3 + 1 Run of 4',
    '1 Set of 4 + 1 Run of 4',
    '1 Run of 7',
    '1 Run of 8',
    '1 Run of 9',
    '2 Sets of 4',
    '7 Cards of One Color',
    '1 Set of 5 + 1 Set of 2',
    '1 Set of 5 + 1 Set of 3',
  ];

  const STORAGE_KEY = 'phase10_game';

  let state = null;

  // ===== DOM refs =====
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const setupScreen = $('#setup-screen');
  const gameScreen = $('#game-screen');
  const playerNamesList = $('#player-names-list');
  const startBtn = $('#start-game-btn');
  const resumeSection = $('#resume-section');
  const resumeBtn = $('#resume-game-btn');
  const standingsList = $('#standings-list');
  const roundIndicator = $('#round-indicator');
  const scoreEntries = $('#score-entries');
  const submitRoundBtn = $('#submit-round-btn');
  const historyWrapper = $('#history-table-wrapper');
  const undoBtn = $('#undo-btn');
  const newGameBtn = $('#new-game-btn');
  const phaseRefBtn = $('#phase-ref-btn');
  const phaseRefModal = $('#phase-ref-modal');
  const closePhaseRef = $('#close-phase-ref');
  const gameOverOverlay = $('#game-over-overlay');
  const confirmModal = $('#confirm-modal');

  // ===== Setup =====
  let selectedCount = 3;

  function renderNameInputs() {
    playerNamesList.innerHTML = '';
    for (let i = 0; i < selectedCount; i++) {
      const row = document.createElement('div');
      row.className = 'name-input-row';
      row.innerHTML =
        '<span class="player-number">' + (i + 1) + '</span>' +
        '<input type="text" placeholder="Player ' + (i + 1) + '" maxlength="20" data-index="' + i + '">';
      playerNamesList.appendChild(row);
    }
  }

  $$('.count-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      $$('.count-btn').forEach((b) => b.classList.remove('active'));
      this.classList.add('active');
      selectedCount = parseInt(this.dataset.count);
      renderNameInputs();
    });
  });

  renderNameInputs();

  // Check for saved game
  function checkSavedGame() {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      resumeSection.style.display = '';
    } else {
      resumeSection.style.display = 'none';
    }
  }
  checkSavedGame();

  resumeBtn.addEventListener('click', function () {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      state = JSON.parse(saved);
      showScreen('game');
      renderGame();
    }
  });

  startBtn.addEventListener('click', function () {
    var names = [];
    var inputs = playerNamesList.querySelectorAll('input');
    inputs.forEach(function (inp, i) {
      var name = inp.value.trim();
      names.push(name || 'Player ' + (i + 1));
    });

    state = {
      players: names.map(function (name) {
        return { name: name, score: 0, phase: 1 };
      }),
      rounds: [],
      gameOver: false,
    };

    saveState();
    showScreen('game');
    renderGame();
  });

  // ===== Screen switching =====
  function showScreen(name) {
    setupScreen.classList.remove('active');
    gameScreen.classList.remove('active');
    if (name === 'setup') {
      setupScreen.classList.add('active');
      checkSavedGame();
    } else {
      gameScreen.classList.add('active');
    }
  }

  // ===== Save/Load =====
  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  var nextRoundNumber = $('#next-round-number');

  // ===== Render game =====
  function renderGame() {
    renderStandings();
    renderScoreEntry();
    renderHistory();
    roundIndicator.textContent = 'Round ' + state.rounds.length;
    nextRoundNumber.textContent = state.rounds.length + 1;
    undoBtn.disabled = state.rounds.length === 0;

    if (state.gameOver) {
      showGameOver();
    }
  }

  // ===== Standings =====
  function getSortedPlayers() {
    var indexed = state.players.map(function (p, i) {
      return { index: i, name: p.name, score: p.score, phase: p.phase };
    });
    indexed.sort(function (a, b) {
      return a.score - b.score;
    });
    return indexed;
  }

  function renderStandings() {
    var sorted = getSortedPlayers();
    standingsList.innerHTML = '';
    sorted.forEach(function (p, rank) {
      var card = document.createElement('div');
      card.className = 'standing-card';
      if (rank === 0 && !state.gameOver) card.classList.add('leader');
      if (p.phase > 10) card.classList.add('completed-game');

      var phaseText = p.phase > 10 ? 'Completed!' : 'Phase ' + p.phase + ': ' + PHASES[p.phase - 1];

      card.innerHTML =
        '<div class="standing-rank">' + (rank + 1) + '</div>' +
        '<div class="standing-info">' +
          '<div class="standing-name">' + escapeHtml(p.name) + '</div>' +
          '<div class="standing-phase">' + phaseText + '</div>' +
        '</div>' +
        '<div class="standing-score">' + p.score + '</div>';

      standingsList.appendChild(card);
    });
  }

  // ===== Score Entry =====
  function renderScoreEntry() {
    scoreEntries.innerHTML = '';

    if (state.gameOver) {
      submitRoundBtn.style.display = 'none';
      return;
    }
    submitRoundBtn.style.display = '';

    state.players.forEach(function (player, i) {
      var card = document.createElement('div');
      card.className = 'score-entry-card';
      card.dataset.playerIndex = i;

      var finished = player.phase > 10;
      if (finished) {
        card.classList.add('finished-phase');
      }

      var phaseLabel = finished
        ? 'Done'
        : 'Phase ' + player.phase;

      var goalText = finished
        ? ''
        : 'Goal: ' + PHASES[player.phase - 1];

      card.innerHTML =
        '<div class="score-entry-header">' +
          '<span class="score-entry-player">' + escapeHtml(player.name) + '</span>' +
          '<span class="score-entry-phase">' + phaseLabel + '</span>' +
        '</div>' +
        (finished
          ? ''
          : '<div class="score-entry-goal">' + goalText + '</div>' +
            '<div class="score-entry-body">' +
              '<div class="score-input-wrapper">' +
                '<label>Points</label>' +
                '<input type="number" inputmode="numeric" pattern="[0-9]*" class="score-input" ' +
                  'data-player="' + i + '" min="0" value="0">' +
              '</div>' +
              '<div class="phase-toggle">' +
                '<label>Completed?</label>' +
                '<button type="button" class="toggle-btn" data-player="' + i + '" data-completed="false"></button>' +
              '</div>' +
            '</div>');

      scoreEntries.appendChild(card);
    });

    // Toggle listeners
    scoreEntries.querySelectorAll('.toggle-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var completed = this.dataset.completed === 'true';
        this.dataset.completed = (!completed).toString();
        this.classList.toggle('completed');
      });
    });

    // Select all on focus for score inputs
    scoreEntries.querySelectorAll('.score-input').forEach(function (inp) {
      inp.addEventListener('focus', function () {
        this.select();
      });
    });
  }

  // ===== Submit Round =====
  submitRoundBtn.addEventListener('click', function () {
    var roundData = [];
    var activePlayers = 0;

    state.players.forEach(function (player, i) {
      if (player.phase > 10) {
        roundData.push({ points: 0, completedPhase: false, skipped: true });
        return;
      }
      activePlayers++;

      var scoreInput = scoreEntries.querySelector('.score-input[data-player="' + i + '"]');
      var toggleBtn = scoreEntries.querySelector('.toggle-btn[data-player="' + i + '"]');

      var points = parseInt(scoreInput.value) || 0;
      if (points < 0) points = 0;
      var completed = toggleBtn.dataset.completed === 'true';

      roundData.push({ points: points, completedPhase: completed, skipped: false });
    });

    if (activePlayers === 0) return;

    // Apply round
    roundData.forEach(function (rd, i) {
      if (rd.skipped) return;
      state.players[i].score += rd.points;
      if (rd.completedPhase) {
        state.players[i].phase++;
      }
    });

    state.rounds.push(roundData);

    // Check for game over
    var finishers = state.players.filter(function (p) { return p.phase > 10; });
    if (finishers.length > 0) {
      state.gameOver = true;
    }

    saveState();
    renderGame();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ===== Undo =====
  undoBtn.addEventListener('click', function () {
    if (state.rounds.length === 0) return;

    var lastRound = state.rounds.pop();

    lastRound.forEach(function (rd, i) {
      if (rd.skipped) return;
      state.players[i].score -= rd.points;
      if (rd.completedPhase) {
        state.players[i].phase--;
      }
    });

    state.gameOver = false;
    gameOverOverlay.style.display = 'none';

    saveState();
    renderGame();
  });

  // ===== History =====
  function renderHistory() {
    if (state.rounds.length === 0) {
      historyWrapper.innerHTML = '<p class="empty-history">No rounds played yet.</p>';
      return;
    }

    var html = '<table class="history-table"><thead><tr><th>Round</th>';
    state.players.forEach(function (p) {
      html += '<th>' + escapeHtml(p.name) + '</th>';
    });
    html += '</tr></thead><tbody>';

    state.rounds.forEach(function (round, ri) {
      html += '<tr><td>R' + (ri + 1) + '</td>';
      round.forEach(function (rd) {
        if (rd.skipped) {
          html += '<td>—</td>';
        } else {
          html += '<td>' + rd.points;
          if (rd.completedPhase) {
            html += '<span class="history-phase-up"> &#x2191;</span>';
          }
          html += '</td>';
        }
      });
      html += '</tr>';
    });

    // Totals row
    html += '<tr><td><b>Total</b></td>';
    state.players.forEach(function (p) {
      html += '<td><b>' + p.score + '</b></td>';
    });
    html += '</tr>';

    html += '</tbody></table>';
    historyWrapper.innerHTML = html;
  }

  // ===== Game Over =====
  function showGameOver() {
    var finishers = state.players
      .map(function (p, i) { return { index: i, name: p.name, score: p.score, phase: p.phase }; })
      .filter(function (p) { return p.phase > 10; });

    finishers.sort(function (a, b) { return a.score - b.score; });

    var winner = finishers[0];
    $('#winner-name').textContent = winner.name + ' Wins!';
    $('#winner-details').textContent = 'Score: ' + winner.score + ' points — completed all 10 phases';

    var sorted = getSortedPlayers();
    var finalDiv = $('#final-standings');
    finalDiv.innerHTML = '';
    sorted.forEach(function (p, rank) {
      var row = document.createElement('div');
      row.className = 'final-standing-row';
      var phaseStr = p.phase > 10 ? 'Completed' : 'Phase ' + p.phase;
      row.innerHTML =
        '<div>' +
          '<span class="final-standing-name">' + (rank + 1) + '. ' + escapeHtml(p.name) + '</span>' +
          ' <span class="final-standing-phase">(' + phaseStr + ')</span>' +
        '</div>' +
        '<span class="final-standing-score">' + p.score + ' pts</span>';
      finalDiv.appendChild(row);
    });

    gameOverOverlay.style.display = 'flex';
  }

  $('#play-again-btn').addEventListener('click', function () {
    gameOverOverlay.style.display = 'none';
    localStorage.removeItem(STORAGE_KEY);
    state = null;
    showScreen('setup');
  });

  // ===== New Game =====
  newGameBtn.addEventListener('click', function () {
    confirmModal.style.display = 'flex';
  });

  $('#confirm-yes').addEventListener('click', function () {
    confirmModal.style.display = 'none';
    gameOverOverlay.style.display = 'none';
    localStorage.removeItem(STORAGE_KEY);
    state = null;
    showScreen('setup');
  });

  $('#confirm-no').addEventListener('click', function () {
    confirmModal.style.display = 'none';
  });

  // ===== Phase Reference =====
  phaseRefBtn.addEventListener('click', function () {
    phaseRefModal.style.display = 'flex';
  });

  closePhaseRef.addEventListener('click', function () {
    phaseRefModal.style.display = 'none';
  });

  // Close modals on backdrop click
  [phaseRefModal, confirmModal].forEach(function (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  });

  // ===== Utility =====
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
