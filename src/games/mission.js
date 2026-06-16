/**
 * Game 4: Mission Improbable
 */

import { roomState, localPlayer, sendPlayerAction, registerPlayerActionHandler, broadcastRoomState, changeView, simulateBotActions } from '../state.js';
import { getRandomPrompts, getItems } from '../content.js';
import { getAvatarSvg } from '../components/avatar.js';

const gameArea = document.getElementById('game-inner-wrapper');

// Local timer for bots
let botOpsInterval = null;

export function initMission() {
  if (localPlayer.isHost) {
    const opts = roomState.settings.mission;
    
    // 1. Assign Teams
    const teamAssignments = generateTeams(opts.mode);
    
    // 2. Fetch Missions
    const teamMissions = {}; // teamName -> array of strings
    const uniqueTeams = [...new Set(Object.values(teamAssignments))];
    
    uniqueTeams.forEach(teamName => {
      teamMissions[teamName] = getRandomPrompts('mission', opts.teamCount);
    });
    
    // 3. Assign Secret Missions
    const personalMissions = {}; // playerId -> string
    const secretPool = getRandomPrompts('mission', roomState.players.length + 5);
    
    roomState.players.forEach((p, idx) => {
      if (opts.personal) {
        personalMissions[p.id] = secretPool[idx];
      } else {
        personalMissions[p.id] = '';
      }
    });
    
    roomState.gameData = {
      stage: 'teams', // 'teams', 'ops'
      teams: teamAssignments, // playerId -> teamName
      teamMissions: teamMissions, // teamName -> [mission strings]
      personalMissions: personalMissions, // playerId -> mission string
      completedMissions: {}, // playerId/teamId -> [mission indices]
      exposedPlayers: [], // list of player IDs whose secret mission was compromised
      revealedMissions: {}, // playerId -> boolean (incorrect callout penalty)
      calloutLog: [] // List of callouts: { caller, target, isSuccess, guessText }
    };
    
    registerPlayerActionHandler(handlePlayerActionHost);
    
    broadcastRoomState();
  }
}

// Helper to generate teams (Solo, Duos, Trios)
function generateTeams(mode) {
  const players = [...roomState.players];
  // Shuffle
  players.sort(() => Math.random() - 0.5);
  
  const assignments = {};
  
  if (mode === 'solo') {
    players.forEach(p => {
      assignments[p.id] = p.name; // Team is just player's name
    });
  } else {
    const size = mode === 'duo' ? 2 : 3;
    let teamCounter = 1;
    
    for (let i = 0; i < players.length; i += size) {
      const teamSlice = players.slice(i, i + size);
      const teamName = `Team ${teamCounter}`;
      teamSlice.forEach(p => {
        assignments[p.id] = teamName;
      });
      teamCounter++;
    }
  }
  
  return assignments;
}

// Host actions router
function handlePlayerActionHost(playerId, action, data) {
  const gd = roomState.gameData;
  if (!gd) return;

  const playerRecord = roomState.players.find(p => p.id === playerId);
  if (!playerRecord) return;

  if (gd.stage === 'teams' && action === 'start_ops' && playerId === localPlayer.id) {
    gd.stage = 'ops';
    startBotInterval();
    broadcastRoomState();
  } 
  
  else if (gd.stage === 'ops' && action === 'complete_mission') {
    const isSecret = data.isSecret;
    const missionIdx = data.missionIdx;
    
    const key = isSecret ? playerId : gd.teams[playerId];
    if (!gd.completedMissions[key]) {
      gd.completedMissions[key] = [];
    }
    
    // Avoid double counting
    if (!gd.completedMissions[key].includes(missionIdx)) {
      gd.completedMissions[key].push(missionIdx);
      
      // Award points
      const pointsToAdd = isSecret ? 150 : 100;
      playerRecord.points += pointsToAdd;
      
      if (playerId === localPlayer.id) {
        localPlayer.points = playerRecord.points;
      }
      
      gd.calloutLog.unshift({
        type: 'completion',
        playerName: playerRecord.name,
        details: isSecret ? 'completed their Secret Mission!' : `completed a Team Mission: "${data.missionText}"`
      });
      
      broadcastRoomState();
    }
  }
  
  // Callout mechanic
  else if (gd.stage === 'ops' && action === 'callout') {
    const targetId = data.targetId;
    const targetRecord = roomState.players.find(p => p.id === targetId);
    if (!targetRecord) return;
    
    const secretMission = gd.personalMissions[targetId];
    
    // Verify guess: either simulated bot guess isCorrect, or player selected correct match
    let isSuccess = false;
    
    if (data.isBotSimulated) {
      isSuccess = data.isCorrect;
    } else {
      // Direct comparison of text
      isSuccess = secretMission === data.guessText;
    }
    
    if (isSuccess) {
      // Target gets exposed
      if (!gd.exposedPlayers.includes(targetId)) {
        gd.exposedPlayers.push(targetId);
      }
      
      // Deduct target points, award caller points
      targetRecord.points = Math.max(0, targetRecord.points - 75);
      playerRecord.points += 100;
      
      if (playerId === localPlayer.id) localPlayer.points = playerRecord.points;
      if (targetId === localPlayer.id) localPlayer.points = targetRecord.points;
      
      gd.calloutLog.unshift({
        type: 'callout_success',
        callerName: playerRecord.name,
        targetName: targetRecord.name,
        details: `successfully exposed ${targetRecord.name}'s mission: "${secretMission}"`
      });
    } else {
      // Caller gets penalized
      playerRecord.points = Math.max(0, playerRecord.points - 50);
      if (playerId === localPlayer.id) localPlayer.points = playerRecord.points;
      
      // Penalty: Reveal caller's secret mission to the room
      const opts = roomState.settings.mission;
      if (opts.callPenalty) {
        gd.revealedMissions[playerId] = true;
      }
      
      gd.calloutLog.unshift({
        type: 'callout_fail',
        callerName: playerRecord.name,
        targetName: targetRecord.name,
        details: `falsely accused ${targetRecord.name}! Their own secret mission is now revealed.`
      });
    }
    
    broadcastRoomState();
  }
  
  // Special bot complete hook
  else if (gd.stage === 'ops' && action === 'bot_complete_mission') {
    // Choose a random incomplete mission
    const myTeam = gd.teams[playerId];
    const teamMissions = gd.teamMissions[myTeam] || [];
    
    const completedTeam = gd.completedMissions[myTeam] || [];
    const completedPersonal = gd.completedMissions[playerId] || [];
    
    // 50% chance for team, 50% for personal
    if (Math.random() < 0.5 && completedTeam.length < teamMissions.length) {
      // Complete random team mission
      let index = Math.floor(Math.random() * teamMissions.length);
      while (completedTeam.includes(index)) {
        index = Math.floor(Math.random() * teamMissions.length);
      }
      handlePlayerActionHost(playerId, 'complete_mission', {
        isSecret: false,
        missionIdx: index,
        missionText: teamMissions[index]
      });
    } else if (roomState.settings.mission.personal && completedPersonal.length === 0 && !gd.exposedPlayers.includes(playerId)) {
      // Complete personal mission
      handlePlayerActionHost(playerId, 'complete_mission', {
        isSecret: true,
        missionIdx: 0,
        missionText: gd.personalMissions[playerId]
      });
    }
  }
}

// Host simulation interval
function startBotInterval() {
  clearInterval(botOpsInterval);
  
  botOpsInterval = setInterval(() => {
    simulateBotActions('mission_background');
  }, 15000); // Trigger check every 15s
}

// Host: Terminate night ops and show results
function endNightOps() {
  clearInterval(botOpsInterval);
  changeView('results');
}

export function cleanupMission() {
  clearInterval(botOpsInterval);
}

// ==========================================================
// RENDERING CODE (Executed by all players based on roomState)
// ==========================================================
export function renderMissionView() {
  const gd = roomState.gameData;
  if (!gd) return;
  
  if (gd.stage === 'teams') {
    renderMissionTeams(gd);
  } else if (gd.stage === 'ops') {
    renderMissionOps(gd);
  }
}

// 1. Render Team Assignments Screen
function renderMissionTeams(gd) {
  const teamName = gd.teams[localPlayer.id] || 'Solo';
  const mySecret = gd.personalMissions[localPlayer.id];
  
  // Find teammates
  const teammates = roomState.players.filter(p => p.id !== localPlayer.id && gd.teams[p.id] === teamName);
  
  gameArea.innerHTML = `
    <div class="game-header">
      <span class="game-title-text">Mission Improbable</span>
      <span style="font-size:0.8rem; font-weight:600; color:hsl(var(--text-secondary));">Assignments</span>
    </div>
    
    <div class="game-content-area" style="justify-content:flex-start; margin-top:20px; overflow-y:auto;">
      <div class="card glass-card" style="text-align:center; padding:24px; border-color:hsl(var(--primary));">
        <span class="prompt-heading">YOUR ASSIGNMENT</span>
        <h2 style="font-size:1.8rem; font-family:var(--font-display); font-weight:800; margin:8px 0; color:hsl(var(--primary));">
          ${escapeHTML(teamName)}
        </h2>
        
        ${teammates.length > 0 ? `
          <p style="font-size:0.85rem; color:hsl(var(--text-secondary)); margin-top:8px;">
            Teammates: ${teammates.map(t => `<strong>${escapeHTML(t.name)}</strong>`).join(', ')}
          </p>
        ` : `
          <p style="font-size:0.85rem; color:hsl(var(--text-muted)); margin-top:4px;">You are operating as a Solo Agent.</p>
        `}
      </div>
      
      ${mySecret ? `
        <!-- Secret Mission Dossier with Peek functionality -->
        <div class="card glass-card" style="padding:16px; border-color:hsl(var(--accent) / 0.5); background:rgba(236, 72, 153, 0.01);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <span class="prompt-heading" style="color:hsl(var(--accent)); margin-bottom:0;">PERSONAL DOSSIER</span>
            <span style="font-size:0.6rem; color:hsl(var(--text-muted)); font-weight:700; border:1px solid rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px;">EYES ONLY</span>
          </div>
          
          <div id="personal-peek-box" class="mission-peek-panel">
            <span class="mission-peek-text">👁️ Tap to Reveal Secret Task</span>
          </div>
          <div id="personal-secret-text" class="hidden" style="padding:12px; background:rgba(0,0,0,0.3); border-radius:var(--radius-sm); border:1px solid rgba(255,255,255,0.05); text-align:center;">
            <p style="font-size:0.95rem; font-weight:600; font-style:italic;">“${escapeHTML(mySecret)}”</p>
          </div>
        </div>
      ` : ''}
      
      <div class="action-footer" style="margin-top:auto; padding-top:16px;">
        ${localPlayer.isHost ? `
          <button id="btn-start-ops" class="btn btn-primary btn-block">
            Commence Operations 🚀
          </button>
        ` : `
          <p class="wait-text" style="text-align:center;">Waiting for host to initiate operations...</p>
        `}
      </div>
    </div>
  `;
  
  // Bind peek logic
  const peekBox = document.getElementById('personal-peek-box');
  const secretText = document.getElementById('personal-secret-text');
  
  if (peekBox) {
    peekBox.addEventListener('pointerdown', () => {
      peekBox.classList.add('hidden');
      secretText.classList.remove('hidden');
    });
    // Hide back when releasing pointer (prevent screen peeking in party)
    window.addEventListener('pointerup', () => {
      if (peekBox.classList.contains('hidden')) {
        peekBox.classList.remove('hidden');
        secretText.classList.add('hidden');
      }
    });
  }

  if (localPlayer.isHost) {
    document.getElementById('btn-start-ops').addEventListener('click', () => {
      sendPlayerAction('start_ops', {});
    });
  }
}

// 2. Render Continuous Ops Dashboard
function renderMissionOps(gd) {
  const teamName = gd.teams[localPlayer.id] || 'Solo';
  const mySecret = gd.personalMissions[localPlayer.id];
  
  // Shared team list
  const teamMissions = gd.teamMissions[teamName] || [];
  const completedTeam = gd.completedMissions[teamName] || [];
  
  // Personal list
  const completedPersonal = gd.completedMissions[localPlayer.id] || [];
  const isExposed = gd.exposedPlayers.includes(localPlayer.id);
  const isMySecretRevealed = gd.revealedMissions[localPlayer.id];

  // Build Team Missions List HTML
  let teamListHtml = '';
  teamMissions.forEach((mis, idx) => {
    const isDone = completedTeam.includes(idx);
    teamListHtml += `
      <div class="mission-card ${isDone ? 'completed' : ''}">
        <div class="mission-card-header">
          <span class="mission-tag tag-team">Team Task</span>
          ${isDone ? '<span style="color:#22c55e; font-weight:700; font-size:0.8rem;">✓ SUCCESS</span>' : ''}
        </div>
        <p class="mission-card-body">“${escapeHTML(mis)}”</p>
        ${!isDone ? `
          <div class="mission-actions">
            <button class="btn btn-secondary btn-sm btn-check-team" data-idx="${idx}" data-text="${mis}">Check Off ✓</button>
          </div>
        ` : ''}
      </div>
    `;
  });

  // Build Personal Mission HTML
  let personalListHtml = '';
  if (mySecret) {
    const isDone = completedPersonal.includes(0);
    personalListHtml = `
      <div class="mission-card ${isDone ? 'completed' : ''}" style="border-color:${isExposed ? '#ef4444' : isMySecretRevealed ? 'hsl(var(--accent))' : ''};">
        <div class="mission-card-header">
          <span class="mission-tag tag-secret">Secret Dossier</span>
          ${isDone ? '<span style="color:#22c55e; font-weight:700; font-size:0.8rem;">✓ COMPLETED</span>' : 
            isExposed ? '<span style="color:#ef4444; font-weight:700; font-size:0.8rem;">⚠️ EXPOSED</span>' : 
            isMySecretRevealed ? '<span style="color:hsl(var(--accent)); font-weight:700; font-size:0.8rem;">📢 COMPROMISED (REVEALED)</span>' : ''}
        </div>
        
        <div id="ops-peek-box" class="mission-peek-panel" style="margin-bottom:8px;">
          <span class="mission-peek-text">👁️ Hold to Peek Secret Task</span>
        </div>
        <div id="ops-secret-text" class="hidden" style="padding:10px; background:rgba(0,0,0,0.3); border-radius:var(--radius-sm); border:1px solid rgba(255,255,255,0.05); text-align:center; margin-bottom:8px;">
          <p style="font-size:0.9rem; font-weight:600; font-style:italic;">“${escapeHTML(mySecret)}”</p>
        </div>
        
        ${!isDone && !isExposed ? `
          <div class="mission-actions">
            <button class="btn btn-primary btn-sm btn-check-secret" data-idx="0">Mark Done ✓</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  // Build Compromised / Revealed Missions list (for callout penalty)
  let revealedLobbyHtml = '';
  const revealedPlayers = Object.keys(gd.revealedMissions);
  if (revealedPlayers.length > 0) {
    revealedLobbyHtml += `
      <div class="card glass-card" style="padding:12px; border-color:#ef4444;">
        <span class="prompt-heading" style="color:#ef4444; margin-bottom:8px;">🚨 REVEALED DOSSIERS (PENALIZED)</span>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${revealedPlayers.map(pid => {
            const name = roomState.players.find(p => p.id === pid)?.name || 'Agent';
            const mission = gd.personalMissions[pid];
            return `
              <div style="font-size:0.75rem; border-bottom:1px solid rgba(255,255,255,0.03); padding-bottom:4px;">
                <strong>${escapeHTML(name)}'s Secret task:</strong> “${escapeHTML(mission)}”
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // Build Callout Log HTML
  let logHtml = '';
  gd.calloutLog.slice(0, 5).forEach(log => {
    let style = 'color:hsl(var(--text-secondary)); border-left-color:rgba(255,255,255,0.1);';
    let label = 'NOTICE';
    
    if (log.type === 'completion') {
      style = 'border-left-color: #22c55e; background: rgba(34, 197, 94, 0.02);';
      label = 'SUCCESS';
    } else if (log.type === 'callout_success') {
      style = 'border-left-color: #eab308; background: rgba(234, 179, 8, 0.02);';
      label = 'EXPOSED';
    } else if (log.type === 'callout_fail') {
      style = 'border-left-color: #ef4444; background: rgba(239, 68, 68, 0.02);';
      label = 'FALSE ALARM';
    }
    
    logHtml += `
      <div style="padding:10px 12px; border-left:3px solid; border-radius:4px; font-size:0.75rem; margin-bottom:8px; ${style}">
        <span style="font-weight:700; font-size:0.65rem; display:block; margin-bottom:2px; text-transform:uppercase;">${label}</span>
        ${escapeHTML(log.playerName || log.callerName)} ${escapeHTML(log.details)}
      </div>
    `;
  });

  gameArea.innerHTML = `
    <div class="game-header">
      <span class="game-title-text">Ops Cockpit: ${escapeHTML(teamName)}</span>
      ${localPlayer.isHost ? `
        <button id="btn-end-mission" class="btn btn-secondary btn-sm" style="background:#ef4444; color:#fff; border:none;">END OPS</button>
      ` : `
        <span style="font-size:0.7rem; font-weight:700; color:hsl(var(--secondary)); border:1px solid hsl(var(--secondary) / 0.3); padding:2px 8px; border-radius:100px; animation:breathe 2s infinite alternate;">OPS ACTIVE</span>
      `}
    </div>
    
    <div class="game-content-area" style="justify-content:flex-start; margin-top:16px; overflow-y:auto; padding-bottom:40px;">
      <!-- Compromised List -->
      ${revealedLobbyHtml}
      
      <!-- Shared Missions -->
      <h3 style="font-size:0.95rem; margin-bottom:12px; text-transform:uppercase; display:flex; justify-content:space-between;">
        <span>Team Objectives</span>
        <span style="font-size:0.75rem; color:hsl(var(--text-muted)); font-weight:500;">${completedTeam.length} / ${teamMissions.length} done</span>
      </h3>
      <div class="mission-list" style="margin-bottom:24px;">
        ${teamListHtml}
      </div>
      
      <!-- Personal Mission -->
      ${mySecret ? `
        <h3 style="font-size:0.95rem; margin-bottom:12px; text-transform:uppercase;">Secret Dossier</h3>
        <div style="margin-bottom:24px;">
          ${personalListHtml}
        </div>
      ` : ''}
      
      <!-- Callout Trigger UI -->
      <div class="card glass-card callout-box">
        <span class="callout-title">📡 ACCUSE SUSPECT / CALL OUT</span>
        <p style="font-size:0.75rem; color:hsl(var(--text-secondary)); margin-bottom:12px;">
          Spot someone doing a weird task? Guess their secret mission. Correct gives +100pts. Incorrect reveals your own mission!
        </p>
        
        <div class="form-group">
          <label>SELECT SUSPECT</label>
          <select id="select-callout-target" class="custom-select-sm">
            <option value="">-- Choose Player --</option>
            ${roomState.players.filter(p => p.id !== localPlayer.id).map(p => `<option value="${p.id}">${escapeHTML(p.name)}</option>`).join('')}
          </select>
        </div>
        
        <div class="form-group">
          <label>CHOOSE GUESSED MISSION</label>
          <select id="select-callout-mission" class="custom-select-sm">
            <option value="">-- Choose Mission --</option>
            ${getItems('mission').map(m => `<option value="${m}">${escapeHTML(m)}</option>`).join('')}
          </select>
        </div>
        
        <button id="btn-submit-callout" class="btn btn-secondary btn-sm" style="border-color:hsl(var(--accent)); color:hsl(var(--accent));">Submit Accusation 📢</button>
      </div>
      
      <!-- Live Ops Feed -->
      <h3 style="font-size:0.95rem; margin-bottom:12px; text-transform:uppercase; margin-top:16px;">Live Ops Feed</h3>
      <div class="log-container">
        ${logHtml || '<p style="font-size:0.75rem; text-align:center; color:hsl(var(--text-muted));">Operations feeds loading...</p>'}
      </div>
    </div>
  `;

  // Bind peek logic
  const peekBox = document.getElementById('ops-peek-box');
  const secretText = document.getElementById('ops-secret-text');
  
  if (peekBox) {
    peekBox.addEventListener('pointerdown', () => {
      peekBox.classList.add('hidden');
      secretText.classList.remove('hidden');
    });
    window.addEventListener('pointerup', () => {
      if (peekBox.classList.contains('hidden')) {
        peekBox.classList.remove('hidden');
        secretText.classList.add('hidden');
      }
    });
  }

  // Bind team checkoff
  const teamBtns = gameArea.querySelectorAll('.btn-check-team');
  teamBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-idx'));
      const text = btn.getAttribute('data-text');
      sendPlayerAction('complete_mission', { isSecret: false, missionIdx: idx, missionText: text });
    });
  });

  // Bind secret checkoff
  const secretBtn = gameArea.querySelector('.btn-check-secret');
  if (secretBtn) {
    secretBtn.addEventListener('click', () => {
      const idx = parseInt(secretBtn.getAttribute('data-idx'));
      sendPlayerAction('complete_mission', { isSecret: true, missionIdx: idx });
    });
  }

  // Bind callout action
  const calloutBtn = document.getElementById('btn-submit-callout');
  calloutBtn.addEventListener('click', () => {
    const targetSelect = document.getElementById('select-callout-target');
    const missionSelect = document.getElementById('select-callout-mission');
    
    const targetId = targetSelect.value;
    const guessText = missionSelect.value;
    
    if (!targetId) {
      showToast("Must select a suspect!", "error");
      return;
    }
    if (!guessText) {
      showToast("Must guess their mission!", "error");
      return;
    }
    
    sendPlayerAction('callout', { targetId, guessText, isBotSimulated: false });
    
    // Reset selections
    targetSelect.value = '';
    missionSelect.value = '';
  });

  // Host end button
  if (localPlayer.isHost) {
    document.getElementById('btn-end-mission').addEventListener('click', () => {
      endNightOps();
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
