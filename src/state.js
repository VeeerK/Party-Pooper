/**
 * Global Session State Manager (BroadcastChannel Sync + Bot Simulator)
 */

import { getRandomAvatar, getAvatarSvg } from './components/avatar.js';

// --- Local Player Profile ---
export let localPlayer = {
  id: '',
  name: '',
  avatarId: '',
  isHost: false,
  points: 0
};

// --- Active Room State (Authoritative on Host) ---
export let roomState = {
  pin: '',
  players: [], // Array of { id, name, avatarId, isHost, points, isBot, activeState }
  gameId: 'yseem', // yseem, excuse, big3, mission
  settings: {
    yseem: { rounds: 5, time: 30, results: 'each' },
    excuse: { rounds: 3, time: 60, anonAns: true, bonus: true },
    big3: { rounds: 3, performers: 3, penalty: false },
    mission: { mode: 'solo', teamCount: 3, personal: true, callPenalty: true }
  },
  currentView: 'welcome', // welcome, join-setup, lobby, game, results
  gameData: null // Dynamic game-specific state (e.g. current question, answers, votes)
};

// --- Communications ---
let bc = null;
let stateChangeCallbacks = [];

// BOT PRESETS FOR SIMULATED MULTIPLAYER
const BOT_NAMES = [
  "Lobby Liam", "Vibe Vicky", "Disco Dan", "Cocktail Chad", 
  "Silent Sue", "Wildcard Wendy", "Sassy Sam", "Gamer Grace"
];

const BOT_EXCUSES = [
  "My therapy hot pocket was calling me.",
  "I heard a weird noise and had to check if it was my social battery dying.",
  "I was technically present but spiritually checked out.",
  "My cat texted me that the house was being invaded by a vacuum.",
  "I got stuck behind a suspicious side character.",
  "I accidentally locked myself in a conversation about crypto.",
  "My GPS told me to make a U-turn in my life choices.",
  "I had to go water my plastic plants.",
  "I was sneaking an entire pizza in my trench coat.",
  "I thought the invitation said 8 PM next year."
];

// Initialize local player profile
export function initLocalPlayer() {
  let stored = localStorage.getItem('party_pooper_player');
  if (stored) {
    try {
      localPlayer = JSON.parse(stored);
    } catch (e) {
      resetPlayerProfile();
    }
  } else {
    resetPlayerProfile();
  }
}

function resetPlayerProfile() {
  localPlayer.id = 'p-' + Math.random().toString(36).substring(2, 9);
  localPlayer.name = '';
  const av = getRandomAvatar();
  localPlayer.avatarId = av.id;
  localPlayer.isHost = false;
  localPlayer.points = 0;
  savePlayerProfile();
}

export function savePlayerProfile() {
  localStorage.setItem('party_pooper_player', JSON.stringify(localPlayer));
}

export function updatePlayerProfile(name, avatarId) {
  localPlayer.name = name.trim();
  localPlayer.avatarId = avatarId;
  savePlayerProfile();
}

// Subscribe to state changes
export function onStateChange(callback) {
  stateChangeCallbacks.push(callback);
}

function notifyStateChange() {
  stateChangeCallbacks.forEach(cb => cb(roomState));
}

// Initialize communication channel
export function initBroadcastChannel(pin) {
  if (bc) bc.close();
  
  bc = new BroadcastChannel('party_pooper_room_' + pin);
  
  bc.onmessage = (event) => {
    handleIncomingMessage(event.data);
  };
  
  window.addEventListener('beforeunload', () => {
    sendLeaveNotification();
  });
}

function sendLeaveNotification() {
  if (bc) {
    bc.postMessage({
      type: 'PLAYER_LEAVE',
      playerId: localPlayer.id
    });
  }
}

// Host Creates Room
export function createRoom() {
  initLocalPlayer();
  localPlayer.isHost = true;
  localPlayer.points = 0;
  savePlayerProfile();
  
  const pin = Math.floor(10000 + Math.random() * 90000).toString();
  roomState.pin = pin;
  roomState.players = [{
    id: localPlayer.id,
    name: localPlayer.name || 'Host',
    avatarId: localPlayer.avatarId,
    isHost: true,
    points: 0,
    isBot: false
  }];
  roomState.gameId = 'yseem';
  roomState.currentView = 'lobby';
  roomState.gameData = null;
  
  initBroadcastChannel(pin);
  notifyStateChange();
  
  return pin;
}

// Player Joins Room
export function joinRoom(pin) {
  initLocalPlayer();
  localPlayer.isHost = false;
  localPlayer.points = 0;
  savePlayerProfile();
  
  roomState.pin = pin;
  roomState.currentView = 'join-setup';
  
  initBroadcastChannel(pin);
  notifyStateChange();
}

// Request to enter lobby after name set
export function requestLobbyJoin() {
  bc.postMessage({
    type: 'JOIN_REQUEST',
    player: {
      id: localPlayer.id,
      name: localPlayer.name,
      avatarId: localPlayer.avatarId,
      isHost: false,
      points: 0,
      isBot: false
    }
  });
}

// Broadcast full state (Host only)
export function broadcastRoomState() {
  if (!localPlayer.isHost) return;
  if (bc) {
    bc.postMessage({
      type: 'ROOM_STATE_UPDATE',
      state: roomState
    });
  }
  notifyStateChange();
}

// Host updates game selection
export function updateSelectedGame(gameId) {
  if (!localPlayer.isHost) return;
  roomState.gameId = gameId;
  broadcastRoomState();
}

// Host updates game-specific settings
export function updateGameSettings(gameId, settings) {
  if (!localPlayer.isHost) return;
  roomState.settings[gameId] = { ...roomState.settings[gameId], ...settings };
  broadcastRoomState();
}

// Host starts the game
export function startGame() {
  if (!localPlayer.isHost) return;
  roomState.currentView = 'game';
  
  // Reset all players' game points to 0 for a new game
  roomState.players.forEach(p => p.points = 0);
  
  broadcastRoomState();
}

// Host transitions view
export function changeView(viewName) {
  if (!localPlayer.isHost) return;
  roomState.currentView = viewName;
  broadcastRoomState();
}

// Send Player Action (Client -> Host)
export function sendPlayerAction(actionType, data) {
  if (bc) {
    bc.postMessage({
      type: 'PLAYER_ACTION',
      playerId: localPlayer.id,
      action: actionType,
      data: data
    });
  }
  
  // If host, route locally as well
  if (localPlayer.isHost) {
    handlePlayerAction(localPlayer.id, actionType, data);
  }
}

// Add AI Bots (Host only)
export function addBots(count = 3) {
  if (!localPlayer.isHost) return;
  
  // Filter out names already in lobby
  const currentNames = roomState.players.map(p => p.name);
  const availableBots = BOT_NAMES.filter(name => !currentNames.includes(name));
  
  const botsToAdd = Math.min(count, availableBots.length);
  for (let i = 0; i < botsToAdd; i++) {
    const av = getRandomAvatar();
    roomState.players.push({
      id: 'bot-' + Math.random().toString(36).substring(2, 7),
      name: availableBots[i],
      avatarId: av.id,
      isHost: false,
      points: 0,
      isBot: true
    });
  }
  
  broadcastRoomState();
}

// Handle action from players (Host side)
let playerActionHandlers = [];
export function registerPlayerActionHandler(callback) {
  playerActionHandlers.push(callback);
}

export function clearPlayerActionHandlers() {
  playerActionHandlers = [];
}

function handlePlayerAction(playerId, action, data) {
  playerActionHandlers.forEach(handler => handler(playerId, action, data));
}

// Inward communications processor
function handleIncomingMessage(msg) {
  // 1. Join Request (Recieved by Host)
  if (msg.type === 'JOIN_REQUEST' && localPlayer.isHost) {
    // Add player if they aren't already in list
    if (!roomState.players.some(p => p.id === msg.player.id)) {
      roomState.players.push(msg.player);
      // Give feedback of success
      bc.postMessage({
        type: 'JOIN_CONFIRMED',
        playerId: msg.player.id,
        state: roomState
      });
      broadcastRoomState();
    }
  }
  
  // 2. Join Confirmed (Recieved by Joining Player)
  if (msg.type === 'JOIN_CONFIRMED' && msg.playerId === localPlayer.id) {
    // Sync room state and shift view
    Object.assign(roomState, msg.state);
    roomState.currentView = 'lobby';
    notifyStateChange();
  }
  
  // 3. Room State Update (Recieved by Players)
  if (msg.type === 'ROOM_STATE_UPDATE' && !localPlayer.isHost) {
    Object.assign(roomState, msg.state);
    notifyStateChange();
  }
  
  // 4. Player Action (Recieved by Host)
  if (msg.type === 'PLAYER_ACTION' && localPlayer.isHost) {
    handlePlayerAction(msg.playerId, msg.action, msg.data);
  }
  
  // 5. Player Leave (Recieved by Host)
  if (msg.type === 'PLAYER_LEAVE' && localPlayer.isHost) {
    roomState.players = roomState.players.filter(p => p.id !== msg.playerId);
    broadcastRoomState();
  }
}

// ==========================================================================
// BOT BEHAVIOR ENGINE (Simulates active responses during game rounds)
// ==========================================================================

export function simulateBotActions(stage, contextData = {}) {
  if (!localPlayer.isHost) return;
  
  const bots = roomState.players.filter(p => p.isBot);
  if (bots.length === 0) return;
  
  if (stage === 'yseem_vote') {
    // You Seem The Type: Bots submit random votes
    bots.forEach(bot => {
      const delay = 1000 + Math.random() * 4000; // 1-5s delay
      setTimeout(() => {
        // Vote for anyone except themselves
        const candidates = roomState.players.filter(p => p.id !== bot.id);
        if (candidates.length > 0) {
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          handlePlayerAction(bot.id, 'vote', { targetId: target.id });
        }
      }, delay);
    });
  } 
  
  else if (stage === 'excuse_write') {
    // Excuse Me: Bots submit pre-written witty excuses
    bots.forEach(bot => {
      const delay = 3000 + Math.random() * 5000; // 3-8s delay
      setTimeout(() => {
        const excuse = BOT_EXCUSES[Math.floor(Math.random() * BOT_EXCUSES.length)];
        handlePlayerAction(bot.id, 'submit_excuse', { text: excuse });
      }, delay);
    });
  } 
  
  else if (stage === 'excuse_vote') {
    // Excuse Me: Bots vote on submissions (excluding their own)
    bots.forEach(bot => {
      const delay = 1500 + Math.random() * 4000;
      setTimeout(() => {
        const excuses = contextData.submissions || [];
        const voteables = excuses.filter(ex => ex.authorId !== bot.id);
        if (voteables.length > 0) {
          const chosen = voteables[Math.floor(Math.random() * voteables.length)];
          handlePlayerAction(bot.id, 'vote_excuse', { authorId: chosen.authorId });
        }
      }, delay);
    });
  } 
  
  else if (stage === 'big3_predict') {
    // The Big 3: Bots predict top 3 players
    bots.forEach(bot => {
      const delay = 2000 + Math.random() * 4500;
      setTimeout(() => {
        // Shuffle candidates and pick top 3
        const candidates = [...roomState.players];
        const podium = [];
        for (let i = 0; i < Math.min(3, candidates.length); i++) {
          const index = Math.floor(Math.random() * candidates.length);
          podium.push(candidates.splice(index, 1)[0].id);
        }
        handlePlayerAction(bot.id, 'submit_prediction', { podium });
      }, delay);
    });
  }
  
  else if (stage === 'mission_background') {
    // Mission Improbable: Bots periodically check off missions or trigger fake callouts
    // This is run inside a timer interval by the host during the game
    bots.forEach(bot => {
      // 10% chance to check off a mission
      if (Math.random() < 0.12) {
        setTimeout(() => {
          handlePlayerAction(bot.id, 'bot_complete_mission', {});
        }, Math.random() * 5000);
      }
      
      // 5% chance to call out someone
      if (Math.random() < 0.06) {
        setTimeout(() => {
          const targets = roomState.players.filter(p => p.id !== bot.id);
          if (targets.length > 0) {
            const target = targets[Math.floor(Math.random() * targets.length)];
            // 35% chance to get it right
            const isCorrect = Math.random() < 0.35;
            handlePlayerAction(bot.id, 'callout', { targetId: target.id, isCorrect });
          }
        }, Math.random() * 5000);
      }
    });
  }
}
