/**
 * Lobby UI Controller
 */

import { roomState, localPlayer, updateSelectedGame, updateGameSettings, addBots, startGame } from './state.js';
import { getAvatarSvg } from './components/avatar.js';
import { drawQRCode } from './components/qr.js';

// DOM Selectors (Cached)
const viewLobby = document.getElementById('view-lobby');
const displayRoomCode = document.getElementById('display-room-code');
const qrCanvas = document.getElementById('lobby-qr-canvas');
const hostControlsPanel = document.getElementById('host-controls-panel');
const playerWaitPanel = document.getElementById('player-wait-panel');
const lobbyCurrentGameName = document.getElementById('lobby-selected-game-name');
const selectGame = document.getElementById('select-game');
const lobbyPlayersList = document.getElementById('lobby-players-list');
const lobbyPlayerCount = document.getElementById('lobby-player-count');

// Subpanels for settings
const settingsPanels = {
  yseem: document.getElementById('settings-yseem'),
  excuse: document.getElementById('settings-excuse'),
  big3: document.getElementById('settings-big3'),
  mission: document.getElementById('settings-mission')
};

// Config inputs
const inputs = {
  yseem: {
    rounds: document.getElementById('yseem-opt-rounds'),
    time: document.getElementById('yseem-opt-time'),
    results: document.getElementById('yseem-opt-results')
  },
  excuse: {
    rounds: document.getElementById('excuse-opt-rounds'),
    time: document.getElementById('excuse-opt-time'),
    anonAns: document.getElementById('excuse-opt-anon-ans'),
    bonus: document.getElementById('excuse-opt-bonus')
  },
  big3: {
    rounds: document.getElementById('big3-opt-rounds'),
    performers: document.getElementById('big3-opt-performers'),
    penalty: document.getElementById('big3-opt-penalty')
  },
  mission: {
    mode: document.getElementById('mission-opt-mode'),
    teamCount: document.getElementById('mission-opt-team-count'),
    personal: document.getElementById('mission-opt-personal'),
    callPenalty: document.getElementById('mission-opt-call-penalty')
  }
};

let isLobbyInitialized = false;

export function initLobbyView() {
  if (isLobbyInitialized) return;
  
  // Set up Host Events
  if (localPlayer.isHost) {
    // Game select change
    selectGame.addEventListener('change', (e) => {
      const gameId = e.target.value;
      updateSelectedGame(gameId);
      showSettingsSubpanel(gameId);
    });

    // Wire settings elements
    // 1. You Seem
    inputs.yseem.rounds.addEventListener('change', gatherAndSyncSettings);
    inputs.yseem.time.addEventListener('change', gatherAndSyncSettings);
    inputs.yseem.results.addEventListener('change', gatherAndSyncSettings);

    // 2. Excuse Me
    inputs.excuse.rounds.addEventListener('change', gatherAndSyncSettings);
    inputs.excuse.time.addEventListener('change', gatherAndSyncSettings);
    inputs.excuse.anonAns.addEventListener('change', gatherAndSyncSettings);
    inputs.excuse.bonus.addEventListener('change', gatherAndSyncSettings);

    // 3. The Big 3
    inputs.big3.rounds.addEventListener('change', gatherAndSyncSettings);
    inputs.big3.performers.addEventListener('change', gatherAndSyncSettings);
    inputs.big3.penalty.addEventListener('change', gatherAndSyncSettings);

    // 4. Mission Improbable
    inputs.mission.mode.addEventListener('change', gatherAndSyncSettings);
    inputs.mission.teamCount.addEventListener('change', gatherAndSyncSettings);
    inputs.mission.personal.addEventListener('change', gatherAndSyncSettings);
    inputs.mission.callPenalty.addEventListener('change', gatherAndSyncSettings);

    // Bot click
    document.getElementById('btn-lobby-fill-bots').addEventListener('click', () => {
      addBots(3);
    });

    // Start click
    document.getElementById('btn-start-game').addEventListener('click', () => {
      if (roomState.players.length < 2) {
        showToast("You need at least 2 players (or bots) to start!", "error");
        return;
      }
      startGame();
    });
  }

  isLobbyInitialized = true;
}

function showSettingsSubpanel(gameId) {
  Object.keys(settingsPanels).forEach(key => {
    if (key === gameId) {
      settingsPanels[key].classList.remove('hidden');
    } else {
      settingsPanels[key].classList.add('hidden');
    }
  });
}

function gatherAndSyncSettings() {
  const gameId = roomState.gameId;
  const currentSettings = {};

  if (gameId === 'yseem') {
    currentSettings.rounds = parseInt(inputs.yseem.rounds.value) || 5;
    currentSettings.time = parseInt(inputs.yseem.time.value) || 30;
    currentSettings.results = inputs.yseem.results.value;
  } else if (gameId === 'excuse') {
    currentSettings.rounds = parseInt(inputs.excuse.rounds.value) || 3;
    currentSettings.time = parseInt(inputs.excuse.time.value) || 60;
    currentSettings.anonAns = inputs.excuse.anonAns.checked;
    currentSettings.bonus = inputs.excuse.bonus.checked;
  } else if (gameId === 'big3') {
    currentSettings.rounds = parseInt(inputs.big3.rounds.value) || 3;
    currentSettings.performers = parseInt(inputs.big3.performers.value) || 3;
    currentSettings.penalty = inputs.big3.penalty.checked;
  } else if (gameId === 'mission') {
    currentSettings.mode = inputs.mission.mode.value;
    currentSettings.teamCount = parseInt(inputs.mission.teamCount.value) || 3;
    currentSettings.personal = inputs.mission.personal.checked;
    currentSettings.callPenalty = inputs.mission.callPenalty.checked;
  }

  updateGameSettings(gameId, currentSettings);
}

// Renders the Lobby UI based on room state updates
export function renderLobby() {
  // Update Room Code PIN text
  displayRoomCode.textContent = roomState.pin;
  
  // Render Join QR code (only once or when PIN changes)
  const joinUrl = `${window.location.origin}${window.location.pathname}?room=${roomState.pin}`;
  drawQRCode(qrCanvas, joinUrl, roomState.pin);

  // Toggle Host vs Player panels
  if (localPlayer.isHost) {
    hostControlsPanel.classList.remove('hidden');
    playerWaitPanel.classList.add('hidden');
    
    // Sync Select Game dropdown to current roomState
    selectGame.value = roomState.gameId;
    showSettingsSubpanel(roomState.gameId);
  } else {
    hostControlsPanel.classList.add('hidden');
    playerWaitPanel.classList.remove('hidden');
    
    // Update active game name display
    const gameNames = {
      yseem: 'You Seem the Type',
      excuse: 'Excuse Me',
      big3: 'The Big 3',
      mission: 'Mission Improbable'
    };
    lobbyCurrentGameName.textContent = gameNames[roomState.gameId] || 'Setting up...';
  }

  // Update Player count badge
  lobbyPlayerCount.textContent = `${roomState.players.length} Player${roomState.players.length === 1 ? '' : 's'}`;

  // Re-build player list grid
  lobbyPlayersList.innerHTML = '';
  roomState.players.forEach(p => {
    const chip = document.createElement('div');
    chip.className = `player-chip ${p.isHost ? 'is-host' : ''}`;
    
    const svgCode = getAvatarSvg(p.avatarId);
    
    chip.innerHTML = `
      <div class="player-chip-avatar">${svgCode}</div>
      <div class="player-chip-info">
        <span class="player-chip-name">${escapeHTML(p.name)}</span>
        <span class="player-chip-role">${p.isHost ? 'Host' : p.isBot ? 'Bot' : 'Player'}</span>
      </div>
    `;
    lobbyPlayersList.appendChild(chip);
  });
}

// Utility: simple escape to prevent XSS in chat rooms
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

// Toast Display helper
export function showToast(message, type = 'normal') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  // Slide in sound simulation or visual cue
  setTimeout(() => {
    toast.remove();
  }, 3000);
}
window.showToast = showToast; // Export globally for other files
