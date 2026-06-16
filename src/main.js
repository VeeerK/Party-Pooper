/**
 * Main Coordinator & View Router
 */

import { 
  localPlayer, 
  roomState, 
  initLocalPlayer, 
  createRoom, 
  joinRoom, 
  requestLobbyJoin, 
  updatePlayerProfile, 
  onStateChange, 
  changeView 
} from './state.js';

import { getAvatarSvg, getNextAvatarId } from './components/avatar.js';
import { initLobbyView, renderLobby } from './lobby.js';
import { renderResults } from './results.js';
import { initYouSeem, renderYouSeemView, cleanupYouSeem } from './games/yseem.js';
import { initExcuse, renderExcuseView, cleanupExcuse } from './games/excuse.js';
import { initBig3, renderBig3View, cleanupBig3 } from './games/big3.js';
import { initMission, renderMissionView, cleanupMission } from './games/mission.js';
import { getItems, addItem, deleteItem, resetToDefaults } from './content.js';

// Cache views
const views = {
  welcome: document.getElementById('view-welcome'),
  joinSetup: document.getElementById('view-join-setup'),
  lobby: document.getElementById('view-lobby'),
  game: document.getElementById('view-game'),
  results: document.getElementById('view-results'),
  editor: document.getElementById('view-editor')
};

let previousView = '';
let activeEditorTab = 'yseem';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  initLocalPlayer();
  setupWelcomeListeners();
  setupJoinSetupListeners();
  setupEditorListeners();
  
  // Subscribe to BroadcastChannel state updates
  onStateChange(handleStateChange);
  
  // Check for Join Room PIN in URL query parameters (?room=12345)
  const params = new URLSearchParams(window.location.search);
  const urlRoomPin = params.get('room');
  if (urlRoomPin && urlRoomPin.match(/^\d{5}$/)) {
    // Fill PIN input and click join
    document.getElementById('input-join-code').value = urlRoomPin;
    initiateJoinRoom(urlRoomPin);
  }
});

// ---------------------------------------------------------
// View Router & State Handler
// ---------------------------------------------------------
function handleStateChange(state) {
  const currentViewName = state.currentView;
  
  // 1. If view changed, perform cleanups and initializers
  if (currentViewName !== previousView) {
    // Hide all views, show current
    Object.keys(views).forEach(key => {
      const el = views[key];
      if (key === 'welcome' && currentViewName === 'welcome') el.classList.remove('hidden');
      else if (key === 'joinSetup' && currentViewName === 'join-setup') el.classList.remove('hidden');
      else if (key === 'lobby' && currentViewName === 'lobby') el.classList.remove('hidden');
      else if (key === 'game' && currentViewName === 'game') el.classList.remove('hidden');
      else if (key === 'results' && currentViewName === 'results') el.classList.remove('hidden');
      else if (key === 'editor' && currentViewName === 'editor') el.classList.remove('hidden');
      else el.classList.add('hidden');
    });

    // Run cleanups for previous game states
    cleanupYouSeem();
    cleanupExcuse();
    cleanupBig3();
    cleanupMission();

    // Trigger Initializer for Host when entering Game view
    if (currentViewName === 'game' && localPlayer.isHost) {
      if (state.gameId === 'yseem') initYouSeem();
      else if (state.gameId === 'excuse') initExcuse();
      else if (state.gameId === 'big3') initBig3();
      else if (state.gameId === 'mission') initMission();
    }

    // Trigger Lobby bindings
    if (currentViewName === 'lobby') {
      initLobbyView();
    }

    previousView = currentViewName;
  }

  // 2. Render view contents
  if (currentViewName === 'lobby') {
    renderLobby();
  } else if (currentViewName === 'game') {
    if (state.gameId === 'yseem') renderYouSeemView();
    else if (state.gameId === 'excuse') renderExcuseView();
    else if (state.gameId === 'big3') renderBig3View();
    else if (state.gameId === 'mission') renderMissionView();
  } else if (currentViewName === 'results') {
    renderResults();
  }
}

// ---------------------------------------------------------
// Welcome View Bindings
// ---------------------------------------------------------
function setupWelcomeListeners() {
  const btnHost = document.getElementById('btn-host-room');
  const btnJoin = document.getElementById('btn-direct-join');
  const inputPin = document.getElementById('input-join-code');
  const btnOpenEditor = document.getElementById('btn-open-editor');
  
  btnHost.addEventListener('click', () => {
    // Host automatically enters profile details first if empty
    if (!localPlayer.name) {
      localPlayer.isHost = true;
      roomState.currentView = 'join-setup';
      handleStateChange(roomState);
    } else {
      createRoom();
    }
  });
  
  btnJoin.addEventListener('click', () => {
    const pin = inputPin.value.trim();
    if (!pin.match(/^\d{5}$/)) {
      showToast("Room PIN must be exactly 5 digits!", "error");
      return;
    }
    initiateJoinRoom(pin);
  });
  
  btnOpenEditor.addEventListener('click', () => {
    roomState.currentView = 'editor';
    handleStateChange(roomState);
    renderEditorList();
  });
}

function initiateJoinRoom(pin) {
  joinRoom(pin);
  handleStateChange(roomState);
}

// ---------------------------------------------------------
// Join Setup View Bindings
// ---------------------------------------------------------
function setupJoinSetupListeners() {
  const avatarPreview = document.getElementById('join-avatar-preview');
  const btnNextAvatar = document.getElementById('btn-next-avatar');
  const inputName = document.getElementById('input-player-name');
  const btnCompleteJoin = document.getElementById('btn-complete-join');
  const btnBackWelcome = document.querySelector('.btn-back-welcome');
  
  // Set initial preview
  avatarPreview.innerHTML = getAvatarSvg(localPlayer.avatarId);
  inputName.value = localPlayer.name;
  
  btnNextAvatar.addEventListener('click', () => {
    const nextId = getNextAvatarId(localPlayer.avatarId);
    localPlayer.avatarId = nextId;
    avatarPreview.innerHTML = getAvatarSvg(nextId);
  });
  
  btnCompleteJoin.addEventListener('click', () => {
    const name = inputName.value.trim();
    if (!name) {
      showToast("Please enter your name!", "error");
      return;
    }
    
    updatePlayerProfile(name, localPlayer.avatarId);
    
    if (localPlayer.isHost) {
      createRoom();
    } else {
      requestLobbyJoin();
      // Let player wait a moment
      showToast("Connecting to room lobby...", "success");
    }
  });

  btnBackWelcome.addEventListener('click', () => {
    roomState.currentView = 'welcome';
    handleStateChange(roomState);
  });
}

// ---------------------------------------------------------
// Content Editor Modal Bindings
// ---------------------------------------------------------
function setupEditorListeners() {
  const btnClose = document.getElementById('btn-close-editor');
  const tabs = document.querySelectorAll('.tab-btn');
  const btnAdd = document.getElementById('btn-editor-add');
  const inputNew = document.getElementById('editor-new-item');
  const btnReset = document.getElementById('btn-editor-reset');
  
  btnClose.addEventListener('click', () => {
    roomState.currentView = 'welcome';
    handleStateChange(roomState);
  });
  
  // Tab triggers
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeEditorTab = tab.getAttribute('data-tab');
      renderEditorList();
    });
  });
  
  // Add item
  btnAdd.addEventListener('click', () => {
    const text = inputNew.value.trim();
    if (!text) return;
    
    const added = addItem(activeEditorTab, text);
    if (added) {
      inputNew.value = '';
      renderEditorList();
      showToast("Prompt added successfully!", "success");
    } else {
      showToast("Prompt already exists in bank!", "error");
    }
  });
  
  // Reset
  btnReset.addEventListener('click', () => {
    if (confirm("Restore all defaults? Custom items will be deleted.")) {
      resetToDefaults();
      renderEditorList();
      showToast("Prompt bank restored to default seeds.", "success");
    }
  });
}

function renderEditorList() {
  const container = document.getElementById('editor-items-list');
  container.innerHTML = '';
  
  const items = getItems(activeEditorTab);
  
  items.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'editor-item-row';
    row.innerHTML = `
      <span class="editor-item-text">${escapeHTML(item)}</span>
      <button class="btn-delete-item" data-idx="${idx}">🗑️</button>
    `;
    
    // Bind delete
    row.querySelector('.btn-delete-item').addEventListener('click', () => {
      deleteItem(activeEditorTab, idx);
      renderEditorList();
      showToast("Prompt deleted.", "normal");
    });
    
    container.appendChild(row);
  });
}

// Helper to escape HTML strings
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
