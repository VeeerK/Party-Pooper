/**
 * Game 3: The Big 3
 */

import { roomState, localPlayer, sendPlayerAction, registerPlayerActionHandler, broadcastRoomState, changeView, simulateBotActions } from '../state.js';
import { getRandomPrompts } from '../content.js';
import { getAvatarSvg } from '../components/avatar.js';

const gameArea = document.getElementById('game-inner-wrapper');

// Local timer variables
let timerInterval = null;
let liveStopwatchInterval = null;

export function initBig3() {
  if (localPlayer.isHost) {
    const opts = roomState.settings.big3;
    const challenges = getRandomPrompts('big3', opts.rounds);
    
    roomState.gameData = {
      round: 0,
      totalRounds: challenges.length,
      challenges: challenges,
      currentChallenge: challenges[0],
      stage: 'predict', // 'predict', 'challenge', 'reveal'
      predictions: {}, // playerId -> [firstId, secondId, thirdId]
      performers: [], // Chosen top 3 players
      finalRanking: [], // actual performer ranks [1st, 2nd, 3rd]
      timer: 30, // 30s prediction timer
      liveTimer: 30, // Default live challenge timer
      liveTimerRunning: false
    };
    
    registerPlayerActionHandler(handlePlayerActionHost);
    
    startPredictTimer();
    broadcastRoomState();
  }
}

// Host actions router
function handlePlayerActionHost(playerId, action, data) {
  const gd = roomState.gameData;
  if (!gd) return;

  if (gd.stage === 'predict' && action === 'submit_prediction') {
    if (gd.predictions[playerId]) return; // Already locked
    
    gd.predictions[playerId] = data.podium;
    
    // Check if everyone locked
    const activePlayers = roomState.players;
    const lockCount = Object.keys(gd.predictions).length;
    
    if (lockCount >= activePlayers.length) {
      launchChallengeStage();
    } else {
      broadcastRoomState();
    }
  } 
  
  else if (gd.stage === 'challenge' && action === 'submit_rankings' && playerId === localPlayer.id) {
    gd.finalRanking = data.finalRanking; // [1stPlayerId, 2ndPlayerId, 3rdPlayerId]
    revealChallengeResults();
  }
}

// Host prediction countdown
function startPredictTimer() {
  clearInterval(timerInterval);
  const gd = roomState.gameData;
  gd.timer = 30;
  
  simulateBotActions('big3_predict');
  
  timerInterval = setInterval(() => {
    gd.timer--;
    
    if (gd.timer <= 0) {
      clearInterval(timerInterval);
      launchChallengeStage();
    } else {
      broadcastRoomState();
    }
  }, 1000);
}

// Host: select performers based on prediction tallies and start challenge stage
function launchChallengeStage() {
  clearInterval(timerInterval);
  const gd = roomState.gameData;
  gd.stage = 'challenge';
  
  // Tally who got predicted most often (nomination counts)
  const nominations = {};
  roomState.players.forEach(p => nominations[p.id] = 0);
  
  Object.values(gd.predictions).forEach(podium => {
    podium.forEach((pid, rankIdx) => {
      // 1st gets 3 weight, 2nd gets 2, 3rd gets 1
      if (nominations[pid] !== undefined) {
        nominations[pid] += (3 - rankIdx);
      }
    });
  });
  
  // Sort candidates by nomination weight
  const sortedCandidates = [...roomState.players].sort((a, b) => nominations[b.id] - nominations[a.id]);
  
  // Choose top N performers (usually 3)
  const opts = roomState.settings.big3;
  const numPerformers = Math.min(opts.performers, roomState.players.length);
  
  gd.performers = sortedCandidates.slice(0, numPerformers).map(p => p.id);
  gd.finalRanking = Array(numPerformers).fill(''); // Clear previous
  gd.liveTimer = 30; // 30s challenge timer
  gd.liveTimerRunning = false;
  
  broadcastRoomState();
}

// Host: score calculations based on live ranks
function revealChallengeResults() {
  const gd = roomState.gameData;
  gd.stage = 'reveal';
  
  const opts = roomState.settings.big3;
  const actual = gd.finalRanking; // Array of [1stId, 2ndId, 3rdId]
  
  // 1. Award points to performers
  const performerPoints = [150, 100, 50]; // 1st, 2nd, 3rd place points
  actual.forEach((pid, idx) => {
    if (!pid) return;
    const player = roomState.players.find(p => p.id === pid);
    if (player) {
      player.points += performerPoints[idx];
    }
  });
  
  // 2. Award points to guessers
  roomState.players.forEach(player => {
    const guess = gd.predictions[player.id]; // [firstId, secondId, thirdId]
    if (!guess) return;
    
    let roundScore = 0;
    let correctCount = 0;
    
    // Check 1st place
    if (guess[0] === actual[0]) {
      roundScore += 100;
      correctCount++;
    } else if (opts.penalty && guess[0]) {
      roundScore -= 25;
    }
    
    // Check 2nd place
    if (guess[1] === actual[1]) {
      roundScore += 50;
      correctCount++;
    } else if (opts.penalty && guess[1]) {
      roundScore -= 20;
    }
    
    // Check 3rd place
    if (guess[2] === actual[2]) {
      roundScore += 25;
      correctCount++;
    } else if (opts.penalty && guess[2]) {
      roundScore -= 10;
    }
    
    // Trifecta bonus (all 3 correct in order)
    if (correctCount === 3) {
      roundScore += 150;
    }
    
    player.points = Math.max(0, player.points + roundScore); // Prevent negative total
    
    if (player.id === localPlayer.id) {
      localPlayer.points = player.points;
    }
  });
  
  broadcastRoomState();
}

// Host: next round
function nextBig3Round() {
  const gd = roomState.gameData;
  gd.round++;
  
  if (gd.round >= gd.totalRounds) {
    changeView('results');
  } else {
    gd.stage = 'predict';
    gd.predictions = {};
    gd.performers = [];
    gd.finalRanking = [];
    gd.currentChallenge = gd.challenges[gd.round];
    
    startPredictTimer();
    broadcastRoomState();
  }
}

export function cleanupBig3() {
  clearInterval(timerInterval);
  clearInterval(liveStopwatchInterval);
}

// ==========================================================
// RENDERING CODE (Executed by all players based on roomState)
// ==========================================================
export function renderBig3View() {
  const gd = roomState.gameData;
  if (!gd) return;
  
  if (gd.stage === 'predict') {
    renderBig3Predict(gd);
  } else if (gd.stage === 'challenge') {
    renderBig3Challenge(gd);
  } else if (gd.stage === 'reveal') {
    renderBig3Reveal(gd);
  }
}

// Local prediction builder state
let selectedPodium = [null, null, null]; // [GoldId, SilverId, BronzeId]

// 1. Predict Stage Render
function renderBig3Predict(gd) {
  const progressPercent = (gd.timer / 30) * 100;
  const isUrgent = gd.timer <= 5;
  const lockedPrediction = gd.predictions[localPlayer.id];
  
  let selectionPanelHtml = '';
  
  if (lockedPrediction) {
    // Show locked selection
    const names = lockedPrediction.map(pid => roomState.players.find(p => p.id === pid)?.name || 'Empty');
    selectionPanelHtml = `
      <div style="text-align:center; padding:16px;">
        <h4 style="color:hsl(var(--secondary)); font-family:var(--font-display); font-weight:700; margin-bottom:12px;">PREDICTIONS LOCKED</h4>
        <div class="podium-selector-grid" style="pointer-events:none;">
          <div class="podium-seat-row filled">
            <span class="podium-badge-icon badge-gold">1</span>
            <span class="podium-seat-name">${escapeHTML(names[0])}</span>
          </div>
          <div class="podium-seat-row filled">
            <span class="podium-badge-icon badge-silver">2</span>
            <span class="podium-seat-name">${escapeHTML(names[1])}</span>
          </div>
          <div class="podium-seat-row filled">
            <span class="podium-badge-icon badge-bronze">3</span>
            <span class="podium-seat-name">${escapeHTML(names[2])}</span>
          </div>
        </div>
        <p style="font-size:0.8rem; color:hsl(var(--text-muted)); margin-top:20px;">Waiting for others to bet...</p>
      </div>
    `;
  } else {
    // Show active builder UI
    let seatsHtml = '';
    const seatNames = ['GOLD (1st)', 'SILVER (2nd)', 'BRONZE (3rd)'];
    const seatClasses = ['badge-gold', 'badge-silver', 'badge-bronze'];
    
    for (let i = 0; i < 3; i++) {
      const pid = selectedPodium[i];
      const player = pid ? roomState.players.find(p => p.id === pid) : null;
      seatsHtml += `
        <div class="podium-seat-row ${player ? 'filled' : ''}" data-seat-idx="${i}">
          <span class="podium-badge-icon ${seatClasses[i]}">${i + 1}</span>
          ${player ? `
            <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
              <span class="podium-seat-name">${escapeHTML(player.name)}</span>
              <button class="btn-clear-seat" style="background:none; border:none; color:#ef4444; font-size:0.8rem; cursor:pointer;">❌</button>
            </div>
          ` : `
            <span class="podium-seat-placeholder">Tap to nominate ${seatNames[i]}</span>
          `}
        </div>
      `;
    }
    
    // Grid of all players to tap
    let rosterHtml = '';
    roomState.players.forEach(p => {
      const isNominated = selectedPodium.includes(p.id);
      rosterHtml += `
        <button class="vote-btn-card ${isNominated ? 'selected' : ''}" data-player-id="${p.id}" style="padding:10px 14px;">
          <div style="width:24px; height:24px;">${getAvatarSvg(p.avatarId)}</div>
          <span style="font-size:0.85rem; font-weight:600;">${escapeHTML(p.name)}</span>
        </button>
      `;
    });
    
    selectionPanelHtml = `
      <div class="podium-selector-grid" style="margin-bottom:20px;">
        ${seatsHtml}
      </div>
      
      <h4 style="font-family:var(--font-display); font-size:0.75rem; font-weight:700; letter-spacing:0.08em; color:hsl(var(--text-secondary)); margin-bottom:8px;">CREW LIST</h4>
      <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:8px; margin-bottom:20px;">
        ${rosterHtml}
      </div>
      
      <button id="btn-lock-predictions" class="btn btn-primary btn-block">Lock Predictions 🏆</button>
    `;
  }
  
  gameArea.innerHTML = `
    <div class="game-header">
      <span class="game-title-text">Predict the Best</span>
      <div class="game-meta-group">
        <span style="font-size:0.8rem; font-weight:600; color:hsl(var(--text-secondary));">
          Round ${gd.round + 1}/${gd.totalRounds}
        </span>
        <span class="game-timer-badge ${isUrgent ? 'timer-urgent' : ''}">
          ⏱️ ${gd.timer}s
        </span>
      </div>
    </div>
    
    <div class="timer-bar-container">
      <div class="timer-bar-fill" style="width: ${progressPercent}%;"></div>
    </div>
    
    <div class="game-content-area" style="justify-content:flex-start; margin-top:20px; overflow-y:auto;">
      <div class="card glass-card prompt-display-card" style="padding: 16px 20px; margin-bottom:16px;">
        <span class="prompt-heading">THE CHALLENGE</span>
        <h3 class="prompt-text" style="font-size:1.15rem;">“${escapeHTML(gd.currentChallenge)}”</h3>
      </div>
      
      ${selectionPanelHtml}
    </div>
  `;
  
  // Bind Builder events
  if (!lockedPrediction) {
    let activeSeatIdx = 0; // Default fill gold first
    
    // Find next empty seat index
    const updateActiveSeat = () => {
      const nextEmpty = selectedPodium.findIndex(x => x === null);
      activeSeatIdx = nextEmpty === -1 ? 0 : nextEmpty;
      
      // Add border glow to active seat
      const seats = gameArea.querySelectorAll('.podium-seat-row');
      seats.forEach((seat, idx) => {
        if (idx === activeSeatIdx) {
          seat.style.borderColor = 'hsl(var(--secondary))';
          seat.style.borderStyle = 'solid';
        } else if (!selectedPodium[idx]) {
          seat.style.borderColor = '';
          seat.style.borderStyle = 'dashed';
        }
      });
    };
    
    updateActiveSeat();
    
    // Click seat to change target index
    const seats = gameArea.querySelectorAll('.podium-seat-row');
    seats.forEach(seat => {
      seat.addEventListener('click', (e) => {
        const idx = parseInt(seat.getAttribute('data-seat-idx'));
        
        // Handle clear click
        if (e.target.classList.contains('btn-clear-seat')) {
          selectedPodium[idx] = null;
          renderBig3Predict(gd);
          return;
        }
        
        activeSeatIdx = idx;
        seats.forEach((s, sIdx) => {
          s.style.borderColor = sIdx === idx ? 'hsl(var(--secondary))' : '';
          if (!selectedPodium[sIdx]) s.style.borderStyle = sIdx === idx ? 'solid' : 'dashed';
        });
      });
    });
    
    // Click player roster button
    const rosterBtns = gameArea.querySelectorAll('.vote-btn-card[data-player-id]');
    rosterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const pid = btn.getAttribute('data-player-id');
        
        // Remove from anywhere else first
        const prevIdx = selectedPodium.indexOf(pid);
        if (prevIdx !== -1) {
          selectedPodium[prevIdx] = null;
        }
        
        selectedPodium[activeSeatIdx] = pid;
        renderBig3Predict(gd);
      });
    });
    
    // Submit click
    document.getElementById('btn-lock-predictions').addEventListener('click', () => {
      // Validate all seats filled
      if (selectedPodium.includes(null)) {
        showToast("Fill all 3 podium slots first!", "error");
        return;
      }
      sendPlayerAction('submit_prediction', { podium: selectedPodium });
      // Reset local variable
      selectedPodium = [null, null, null];
    });
  }
}

// 2. Live Challenge Stage Render
function renderBig3Challenge(gd) {
  // Find names of performers
  const performerNames = gd.performers.map(pid => roomState.players.find(p => p.id === pid)?.name || 'Bot');
  
  // Check if I am a performer
  const amIPerformer = gd.performers.includes(localPlayer.id);
  
  let hostInputPanel = '';
  
  if (localPlayer.isHost) {
    // Dropdowns for ranking results
    let selectsHtml = '';
    const labels = ['Gold Winner (1st)', 'Silver Winner (2nd)', 'Bronze Winner (3rd)'];
    
    for (let i = 0; i < gd.performers.length; i++) {
      let optionsHtml = '<option value="">-- Select Winner --</option>';
      gd.performers.forEach(pid => {
        const name = roomState.players.find(p => p.id === pid)?.name || 'Performer';
        const isSelected = gd.finalRanking[i] === pid;
        optionsHtml += `<option value="${pid}" ${isSelected ? 'selected' : ''}>${escapeHTML(name)}</option>`;
      });
      
      selectsHtml += `
        <div class="host-rank-selector">
          <span>${labels[i]}</span>
          <select class="custom-select-sm rank-dropdown" data-rank-idx="${i}" style="width:180px;">
            ${optionsHtml}
          </select>
        </div>
      `;
    }
    
    hostInputPanel = `
      <div class="card glass-card" style="margin-top:20px; padding:16px;">
        <h4 style="font-family:var(--font-display); font-weight:700; font-size:0.85rem; color:hsl(var(--accent)); margin-bottom:12px;">HOST: ENTER LIVE RESULTS</h4>
        <div class="host-ranking-controls">
          ${selectsHtml}
        </div>
        <button id="btn-submit-live-rankings" class="btn btn-primary btn-block" style="margin-top:16px;">Submit Rankings 📊</button>
      </div>
    `;
  }
  
  gameArea.innerHTML = `
    <div class="game-header">
      <span class="game-title-text">Live Duel! ⚔️</span>
      <span style="font-size:0.8rem; font-weight:600; color:hsl(var(--text-secondary));">
        Challenge Stage
      </span>
    </div>
    
    <div class="game-content-area" style="justify-content:flex-start; margin-top:20px; overflow-y:auto;">
      <div class="card glass-card prompt-display-card" style="padding:16px; margin-bottom:16px;">
        <span class="prompt-heading">THE TASK</span>
        <p style="font-size:1rem; font-weight:600; font-style:italic;">“${escapeHTML(gd.currentChallenge)}”</p>
      </div>
      
      <div class="card glass-card" style="text-align:center; padding:16px; border-color:hsl(var(--secondary) / 0.5); background:rgba(6, 182, 212, 0.02);">
        <span class="prompt-heading" style="color:hsl(var(--secondary)); font-size:0.7rem;">CHOSEN PERFORMERS</span>
        <div style="display:flex; justify-content:space-around; margin-top:10px;">
          ${gd.performers.map((pid, idx) => {
            const name = roomState.players.find(p => p.id === pid)?.name || 'Performer';
            const isMe = pid === localPlayer.id;
            return `
              <div style="display:flex; flex-direction:column; align-items:center; width:30%;">
                <div style="width:36px; height:36px;">${getAvatarSvg(roomState.players.find(p => p.id === pid)?.avatarId)}</div>
                <strong style="font-size:0.8rem; color:${isMe ? 'hsl(var(--secondary))' : '#fff'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; text-align:center; margin-top:4px;">
                  ${isMe ? '⭐ YOU' : escapeHTML(name)}
                </strong>
                <span style="font-size:0.65rem; color:hsl(var(--text-muted)); font-weight:600;">Rank #${idx + 1} Nominee</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      
      <!-- Live Stopwatch Timer -->
      <div class="card glass-card" style="text-align:center; padding:20px; background:rgba(0,0,0,0.2);">
        <span class="prompt-heading" style="font-size:0.65rem;">STOPWATCH</span>
        <h2 id="live-stopwatch-display" style="font-size:2.8rem; font-family:var(--font-display); font-weight:800; color:#ef4444; margin:8px 0;">
          00:${gd.liveTimer < 10 ? '0' + gd.liveTimer : gd.liveTimer}
        </h2>
        ${localPlayer.isHost ? `
          <div style="display:flex; justify-content:center; gap:12px;">
            <button id="btn-stopwatch-start" class="btn btn-secondary btn-sm" style="background:#22c55e; border:none; color:#000; font-weight:700;">START</button>
            <button id="btn-stopwatch-reset" class="btn btn-secondary btn-sm">RESET</button>
          </div>
        ` : `
          <p style="font-size:0.75rem; color:hsl(var(--text-muted));">Host coordinates the live timer</p>
        `}
      </div>
      
      ${amIPerformer ? `
        <div class="badge-premium" style="background:rgba(6, 182, 212, 0.2); border-color:hsl(var(--secondary)); color:hsl(var(--secondary)); align-self:center; margin-top:12px; font-weight:800; animation:pulse-red 1s infinite alternate;">
          ⚡ GET READY — YOU ARE PERFORMING LIVE!
        </div>
      ` : ''}

      ${hostInputPanel}
      
      ${!localPlayer.isHost ? `
        <p class="wait-text" style="text-align:center; margin-top:auto; padding-top:16px;">Waiting for host to input performance rankings...</p>
      ` : ''}
    </div>
  `;

  // Bind host timer buttons
  if (localPlayer.isHost) {
    const startBtn = document.getElementById('btn-stopwatch-start');
    const resetBtn = document.getElementById('btn-stopwatch-reset');
    const display = document.getElementById('live-stopwatch-display');
    
    // Set start button text based on active status
    if (gd.liveTimerRunning) {
      startBtn.textContent = 'PAUSE';
      startBtn.style.backgroundColor = '#ef4444';
    } else {
      startBtn.textContent = 'START';
      startBtn.style.backgroundColor = '#22c55e';
    }
    
    startBtn.addEventListener('click', () => {
      if (gd.liveTimerRunning) {
        // Pause
        gd.liveTimerRunning = false;
        clearInterval(liveStopwatchInterval);
        broadcastRoomState();
      } else {
        // Start
        gd.liveTimerRunning = true;
        broadcastRoomState();
        
        clearInterval(liveStopwatchInterval);
        liveStopwatchInterval = setInterval(() => {
          gd.liveTimer--;
          if (gd.liveTimer <= 0) {
            gd.liveTimer = 0;
            gd.liveTimerRunning = false;
            clearInterval(liveStopwatchInterval);
          }
          broadcastRoomState();
        }, 1000);
      }
    });
    
    resetBtn.addEventListener('click', () => {
      gd.liveTimer = 30;
      gd.liveTimerRunning = false;
      clearInterval(liveStopwatchInterval);
      broadcastRoomState();
    });

    // Handle submit ranking click
    const submitBtn = document.getElementById('btn-submit-live-rankings');
    submitBtn.addEventListener('click', () => {
      const dropdowns = gameArea.querySelectorAll('.rank-dropdown');
      const rankings = [];
      let allSelected = true;
      
      dropdowns.forEach(drop => {
        const val = drop.value;
        if (!val) allSelected = false;
        rankings.push(val);
      });
      
      if (!allSelected) {
        showToast("Must assign 1st, 2nd, and 3rd place!", "error");
        return;
      }
      
      // Check duplicate selections
      const uniques = new Set(rankings);
      if (uniques.size !== rankings.length) {
        showToast("Cannot assign same player to multiple places!", "error");
        return;
      }
      
      sendPlayerAction('submit_rankings', { finalRanking: rankings });
    });
  }
}

// 3. Reveal Stage Render
function renderBig3Reveal(gd) {
  const ranking = gd.finalRanking; // [1st, 2nd, 3rd] ids
  const performers = gd.performers;
  
  let pedestalHtml = '';
  const medals = ['🥇 1st Place', '🥈 2nd Place', '🥉 3rd Place'];
  const colors = ['#facc15', '#cbd5e1', '#d97706'];
  
  ranking.forEach((pid, idx) => {
    if (!pid) return;
    const player = roomState.players.find(p => p.id === pid);
    if (!player) return;
    
    pedestalHtml += `
      <div class="card glass-card" style="padding:12px 16px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; border-color:${colors[idx]};">
        <div style="display:flex; align-items:center; gap:10px;">
          <strong style="color:${colors[idx]}; font-family:var(--font-display); font-size:0.9rem;">${medals[idx]}</strong>
          <div style="width:24px; height:24px; margin-left:4px;">${getAvatarSvg(player.avatarId)}</div>
          <span style="font-weight:700; font-size:0.9rem;">${escapeHTML(player.name)}</span>
        </div>
        <span style="font-size:0.8rem; font-weight:700; color:hsl(var(--text-secondary));">+${idx === 0 ? 150 : idx === 1 ? 100 : 50} pts</span>
      </div>
    `;
  });
  
  // Did I predict correctly?
  const myGuess = gd.predictions[localPlayer.id];
  let guessReportHtml = '';
  
  if (myGuess) {
    const hits = [];
    if (myGuess[0] === ranking[0]) hits.push("1st Place");
    if (myGuess[1] === ranking[1]) hits.push("2nd Place");
    if (myGuess[2] === ranking[2]) hits.push("3rd Place");
    
    const trifecta = hits.length === 3;
    
    guessReportHtml += `
      <div class="card glass-card" style="padding:16px; text-align:center; border-color:${hits.length > 0 ? 'hsl(var(--secondary))' : ''};">
        <span class="prompt-heading" style="color:hsl(var(--secondary));">YOUR BETS RESULTS</span>
        ${hits.length > 0 ? `
          <h4 style="color:#22c55e; font-family:var(--font-display); font-size:1.05rem; font-weight:700; margin-bottom:4px;">
            ${trifecta ? '🔥 PERFECT PODIUM TRIFECTA! (+325 pts)' : `Hit ${hits.length} Guess${hits.length === 1 ? '' : 'es'}!`}
          </h4>
          <p style="font-size:0.8rem; color:hsl(var(--text-secondary));">Correctly predicted: ${hits.join(', ')}</p>
        ` : `
          <h4 style="color:hsl(var(--text-muted)); font-family:var(--font-display); font-size:0.95rem; font-weight:700; margin-bottom:4px;">No Correct Guesses</h4>
          <p style="font-size:0.8rem; color:hsl(var(--text-muted));">Better luck on the next challenge!</p>
        `}
      </div>
    `;
  }
  
  gameArea.innerHTML = `
    <div class="game-header">
      <span class="game-title-text">Duel Results</span>
      <span style="font-size:0.8rem; font-weight:600; color:hsl(var(--text-secondary));">
        Round ${gd.round + 1}/${gd.totalRounds}
      </span>
    </div>
    
    <div class="game-content-area" style="justify-content:flex-start; margin-top:16px; overflow-y:auto;">
      <h3 style="font-size:1rem; margin-bottom:12px; text-transform:uppercase;">Challenge Standings</h3>
      <div style="margin-bottom:16px;">
        ${pedestalHtml}
      </div>
      
      ${guessReportHtml}
      
      <div class="action-footer" style="margin-top:auto; padding-top:16px;">
        ${localPlayer.isHost ? `
          <button id="btn-big3-next" class="btn btn-primary btn-block">
            ${gd.round + 1 >= gd.totalRounds ? 'View Final Results 🏆' : 'Next Challenge 🚀'}
          </button>
        ` : `
          <p class="wait-text" style="text-align:center;">Waiting for host to continue...</p>
        `}
      </div>
    </div>
  `;
  
  if (localPlayer.isHost) {
    document.getElementById('btn-big3-next').addEventListener('click', () => {
      nextBig3Round();
    });
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
