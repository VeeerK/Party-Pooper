/**
 * PARTY POOPER — Application Engine v3
 * Architecture: Single-file SPA, BroadcastChannel sync, partial DOM updates for timers.
 * Key design rule: timers NEVER trigger full re-renders. Only stage transitions do.
 */

'use strict';

// ═══════════════════════════════════════════════════════════
// CONTENT BANK  (placeholder-ready — swap in external source at getContent())
// ═══════════════════════════════════════════════════════════
const DEFAULT_CONTENT = {
  yseem: [
    "Who seems the type to have hundreds of unread messages?",
    "Who seems the type to disappear from a party without saying goodbye?",
    "Who seems the type to know one obscure fact about everything?",
    "Who seems the type to accidentally become locally famous?",
    "Who seems the type to own something random but expensive?",
    "[ACTION] Who seems the type to perform the best fake proposal?",
    "[ACTION] Who seems the type to give the most dramatic apology?",
    "[ACTION] Who seems the type to sell ice to an Eskimo?",
    "[ACTION] Who seems the type to give the best motivational speech?",
    "[ACTION] Who seems the type to act out a dramatic death scene?",
    "Who seems the type to start a story they didn't intend to tell?",
    "Who seems the type to have a very locked notes app?",
    "Who seems the type to survive a chaotic night without saying much?",
    "Who seems the type to order the most complicated thing on any menu?",
    "Who seems the type to carry an emergency kit for everything?",
    "Who seems the type to buy a gym membership and never go?",
    "Who seems the type to send a 4-minute voice note instead of a text?",
    "Who seems the type to get lost in their own neighborhood?",
    "Who seems the type to win an argument and immediately apologize?",
    "Who seems the type to check their phone the most in one hour?",
    "Who seems the type to have a very strong opinion about fonts?",
    "Who seems the type to arrive 30 minutes early to everything?",
    "Who seems the type to have an organized but chaotic desk?"
  ],
  excuse: [
    "You were caught sneaking snacks into a movie theater.",
    "You forgot your own plan and showed up 45 minutes late.",
    "You accidentally sent a message meant for someone else.",
    "You were caught leaving the party before saying goodbye.",
    "You were found standing alone in a corner looking suspicious.",
    "You sent a message and regretted it within seconds.",
    "You fell asleep during something you promised to pay attention to.",
    "You liked a very old photo while scrolling someone's profile.",
    "You sang the completely wrong lyrics in public.",
    "You ignored someone's wave because you thought they were waving at someone else.",
    "You left the store without buying anything and felt watched.",
    "You were caught talking to yourself in public.",
    "You tried to push a pull door three times."
  ],
  big3: [
    "Stack the tallest tower from random objects in the room in 20 seconds.",
    "Balance a small object on your head while walking a short path.",
    "Land the most paper balls into a cup in 30 seconds.",
    "Build the longest chain using only nearby objects.",
    "Keep a small item balanced on the back of your hand the longest.",
    "Move three items from one table to another using only one hand.",
    "Flick a coin from the table edge and catch it in one try.",
    "Complete a pattern tap sequence 5 times without mistakes.",
    "Transfer items from one container to another using only your elbow.",
    "Hold a tricky pose while solving a simple hand puzzle.",
    "Keep a bottle cap spinning the longest.",
    "Do 3 consecutive successful bottle flips."
  ],
  mission: [
    "Get two people to start the same story without realizing it.",
    "Get someone to repeat a specific word you used earlier.",
    "Get a group to make a decision without directly suggesting the answer.",
    "Get someone to check their phone without asking directly.",
    "Make someone ask a question that starts with 'why'.",
    "Get three different people to laugh within a 5-minute window.",
    "Make a group photo happen without suggesting it.",
    "Get two strangers in the room to introduce themselves.",
    "Sneak a specific word into three separate conversations.",
    "Redirect a group's attention without anyone noticing you did it.",
    "Get someone to explain the plot of their favorite show or movie.",
    "High-five four different people within 10 minutes.",
    "Start someone humming a song without humming it first.",
    "Get someone to offer you food or a drink without asking directly.",
    "Get two people to agree on something they initially disagreed on."
  ]
};

// External content hook — replace this function to plug in external banks
function getContent(key) {
  try {
    const raw = localStorage.getItem('pp_content_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed[key] && Array.isArray(parsed[key]) && parsed[key].length > 0) return parsed[key];
    }
  } catch (_) {}
  return [...DEFAULT_CONTENT[key]];
}

function saveContent(key, arr) {
  try {
    const raw = localStorage.getItem('pp_content_v2');
    const all = raw ? JSON.parse(raw) : {};
    all[key] = arr;
    localStorage.setItem('pp_content_v2', JSON.stringify(all));
  } catch (_) {}
}

function addContentItem(key, text) {
  const arr = getContent(key);
  const t = text.trim();
  if (!t || arr.includes(t)) return false;
  arr.unshift(t);
  saveContent(key, arr);
  return true;
}

function deleteContentItem(key, idx) {
  const arr = getContent(key);
  arr.splice(idx, 1);
  saveContent(key, arr);
}

function resetContent() {
  localStorage.removeItem('pp_content_v2');
}

// ═══════════════════════════════════════════════════════════
// SOUND EFFECTS & CONFETTI SYSTEM (Web Audio API)
// ═══════════════════════════════════════════════════════════
class SoundFX {
  constructor() {
    this.ctx = null;
  }
  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  play(type) {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    
    const now = this.ctx.currentTime;
    
    switch (type) {
      case 'click': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }
      case 'click_heavy': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }
      case 'drumroll': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.linearRampToValueAtTime(160, now + 2.2);
        
        gain.gain.setValueAtTime(0.01, now);
        for (let i = 0; i < 22; i++) {
          const t = now + (i * 0.1);
          gain.gain.setValueAtTime(0.12, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
        }
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 2.2);
        break;
      }
      case 'reveal': {
        const freqs = [261.63, 329.63, 392.00, 523.25];
        freqs.forEach((f, index) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + (index * 0.06));
          gain.gain.setValueAtTime(0.0, now);
          gain.gain.linearRampToValueAtTime(0.06, now + (index * 0.06) + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 1.8);
        });
        break;
      }
      case 'success': {
        const freqs = [523.25, 659.25, 783.99, 1046.50];
        freqs.forEach((f, index) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + (index * 0.08));
          gain.gain.setValueAtTime(0.0, now);
          gain.gain.linearRampToValueAtTime(0.05, now + (index * 0.08) + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 1.0);
        });
        break;
      }
      case 'fail': {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(130, now);
        osc2.frequency.setValueAtTime(133, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.8);
        osc2.stop(now + 0.8);
        break;
      }
      case 'suspense': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(75, now);
        gain.gain.setValueAtTime(0.05, now);
        for (let i = 0; i < 15; i++) {
          const t = now + (i * 0.5);
          gain.gain.linearRampToValueAtTime(0.08, t + 0.25);
          gain.gain.linearRampToValueAtTime(0.02, t + 0.5);
        }
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 7.5);
        break;
      }
    }
  }
}
const sfx = new SoundFX();

class ConfettiExplosion {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.animationFrame = null;
  }
  start() {
    this.stop();
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'fixed';
    this.canvas.style.inset = '0';
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '9999';
    document.body.appendChild(this.canvas);
    
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    this.resizeHandler = () => this.resize();
    window.addEventListener('resize', this.resizeHandler);
    
    const colors = ['#7c6af5', '#06c9c4', '#f5c842', '#e8419a', '#ff7675', '#74b9ff', '#55efc4'];
    this.particles = [];
    for (let i = 0; i < 120; i++) {
      this.particles.push({
        x: this.canvas.width / 2 + (Math.random() - 0.5) * 40,
        y: this.canvas.height + 20,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 16 - 10,
        size: Math.random() * 6 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }
    this.animate();
  }
  resize() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
  }
  animate() {
    if (!this.canvas || !this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    let active = false;
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35;
      p.vx *= 0.98;
      p.rotation += p.rotationSpeed;
      if (p.vy > 0) p.opacity -= 0.015;
      if (p.opacity > 0 && p.y < this.canvas.height + 10) {
        active = true;
        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.rotation * Math.PI) / 180);
        this.ctx.globalAlpha = p.opacity;
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        this.ctx.restore();
      }
    });
    if (active) {
      this.animationFrame = requestAnimationFrame(() => this.animate());
    } else {
      this.stop();
    }
  }
  stop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
      this.ctx = null;
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
  }
}
const confetti = new ConfettiExplosion();

// ─── Utility ───
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(arr, n) { return shuffle(arr).slice(0, n); }

function h(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

// ─── Semantic matching removed (accusations happen in real life) ───

// ═══════════════════════════════════════════════════════════
// AVATAR SYSTEM
// ═══════════════════════════════════════════════════════════
const AVATARS = [
  { id: 0,  bg1: '#6c5ce7', bg2: '#a29bfe' },
  { id: 1,  bg1: '#00cec9', bg2: '#81ecec' },
  { id: 2,  bg1: '#e84393', bg2: '#fd79a8' },
  { id: 3,  bg1: '#fdcb6e', bg2: '#ffeaa7' },
  { id: 4,  bg1: '#636e72', bg2: '#b2bec3' },
  { id: 5,  bg1: '#0984e3', bg2: '#74b9ff' },
  { id: 6,  bg1: '#00b894', bg2: '#55efc4' },
  { id: 7,  bg1: '#d63031', bg2: '#ff7675' },
  { id: 8,  bg1: '#4834d4', bg2: '#686de0' },
  { id: 9,  bg1: '#e17055', bg2: '#fab1a0' },
  { id: 10, bg1: '#00b89c', bg2: '#55efc4' },
  { id: 11, bg1: '#8e44ad', bg2: '#be2edd' },
];
const AVATAR_LABELS = ['Violet','Teal','Rose','Gold','Slate','Blue','Green','Coral','Indigo','Amber','Mint','Plum'];

function getAvatar(id) { return AVATARS[((id || 0) % AVATARS.length + AVATARS.length) % AVATARS.length]; }
function getAvatarLabel(id) { return AVATAR_LABELS[((id || 0) % AVATAR_LABELS.length + AVATAR_LABELS.length) % AVATAR_LABELS.length]; }

function avatarSvg(id, name) {
  const av = getAvatar(id);
  const initial = (name || 'P').charAt(0).toUpperCase();
  // Unique gradient ID per player+render to avoid SVG gradient ID collisions
  const gid = 'avgrad_' + ((id * 31 + initial.charCodeAt(0)) & 0xfff).toString(16);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
    <defs><linearGradient id="${gid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${av.bg1}"/><stop offset="100%" stop-color="${av.bg2}"/>
    </linearGradient></defs>
    <circle cx="20" cy="20" r="20" fill="url(#${gid})"/>
    <text x="20" y="25.5" font-family="Inter,sans-serif" font-size="15" font-weight="700"
      fill="rgba(0,0,0,0.6)" text-anchor="middle" dominant-baseline="middle">${initial}</text>
  </svg>`;
}

// ═══════════════════════════════════════════════════════════
// QR CODE
// ═══════════════════════════════════════════════════════════
let _lastQrPin = '';
function renderQR(canvas, url, pin) {
  if (!canvas || pin === _lastQrPin) return;
  _lastQrPin = pin;
  const size = canvas.width;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=080a10&margin=6`;
  img.onload = () => { canvas.getContext('2d').drawImage(img, 0, 0, size, size); };
  img.onerror = () => {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#6c5ce7';
    ctx.font = `bold ${Math.floor(size * 0.2)}px Inter,sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(pin, size / 2, size / 2);
  };
}

// ═══════════════════════════════════════════════════════════
// LOCAL PLAYER
// ═══════════════════════════════════════════════════════════
let localPlayer = { id: '', name: '', avatarId: 0, isHost: false };
let mySecretMission = null;

function loadLocalPlayer() {
  try {
    const raw = localStorage.getItem('pp_player_v3');
    if (raw) Object.assign(localPlayer, JSON.parse(raw));
  } catch (_) {}
  if (!localPlayer.id) localPlayer.id = 'p-' + Math.random().toString(36).slice(2, 9);
}

function saveLocalPlayer() {
  localStorage.setItem('pp_player_v3', JSON.stringify(localPlayer));
}

// ═══════════════════════════════════════════════════════════
// ROOM STATE
// ═══════════════════════════════════════════════════════════
let roomState = {
  pin: '',
  players: [],
  gameId: 'yseem',
  settings: {
    yseem:   { rounds: 5,  time: 30, reveal: 'each' },
    excuse:  { rounds: 3,  time: 60, anon: true, bonus: true },
    big3:    { rounds: 3,  time: 30, performers: 3, penalty: false },
    mission: { mode: 'solo', teamCount: 3, personal: true, callPenalty: true }
  },
  view: 'welcome',
  gameData: null
};

// ═══════════════════════════════════════════════════════════
// BROADCAST CHANNEL
// ═══════════════════════════════════════════════════════════
let bc = null;

const MSG = {
  JOIN_REQ:     'JOIN_REQ',
  JOIN_CONFIRM: 'JOIN_CONFIRM',
  STATE_SYNC:   'STATE_SYNC',
  TIMER_SYNC:   'TIMER_SYNC',   // lightweight — only updates timer display
  PLAYER_ACTION:'PLAYER_ACTION',
  PLAYER_LEAVE: 'PLAYER_LEAVE',
  SECRET:       'SECRET',       // host -> specific player: their secret mission
};

let _sendQueue = [];

// Transport-agnostic send. Queues messages while the socket is opening so that
// host broadcasts / join requests issued immediately after openChannel() are
// never dropped.
function bcSend(msg) {
  if (!bc) return;
  const payload = typeof msg === 'string' ? JSON.parse(msg) : msg;
  if (bc.state === 'joined') {
    bc.send({ type: 'broadcast', event: 'msg', payload: payload });
  } else {
    _sendQueue.push(payload);
  }
}

function openChannel(pin) {
  if (bc) { try { supabaseClient.removeChannel(bc); } catch(_) {} }
  _sendQueue = [];
  
  bc = supabaseClient.channel('room:' + pin, {
    config: {
      broadcast: { ack: false, self: false },
      presence: { key: localPlayer.id }
    }
  });

  bc.on('broadcast', { event: 'msg' }, (payload) => {
    let msg = payload.payload;
    if (!msg) return;
    if (msg.type === 'SW_SYNC' && !localPlayer.isHost) {
      const el = document.getElementById('sw-display');
      if (el) el.textContent = fmtTime(msg.val || 0);
      return;
    }
    handleBCMessage({ data: msg });
  });

  bc.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
    if (localPlayer.isHost) {
      leftPresences.forEach(p => {
        handleBCMessage({ data: { type: MSG.PLAYER_LEAVE, playerId: p.playerId } });
      });
    }
  });

  bc.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log("[Supabase] SUBSCRIBED to room:" + pin);
      bc.track({ playerId: localPlayer.id });

      bc.send({ type: 'broadcast', event: 'msg', payload: { type: 'HELLO', room: String(pin), playerId: localPlayer.id, isHost: localPlayer.isHost } });
      const q = _sendQueue; _sendQueue = [];
      q.forEach(d => { try { bc.send({ type: 'broadcast', event: 'msg', payload: d }); } catch(_) {} });
    } else if (status === 'CLOSED') {
      console.log("[Supabase] CLOSED");
    } else if (status === 'CHANNEL_ERROR') {
      console.error("[Supabase] CHANNEL_ERROR");
    } else if (status === 'TIMED_OUT') {
      console.log("[Supabase] TIMED_OUT... attempting to reconnect.");
    }
  });

  window.addEventListener('beforeunload', () => {
    bcSend({ type: MSG.PLAYER_LEAVE, playerId: localPlayer.id });
    try { supabaseClient.removeChannel(bc); } catch(_) {}
  }, { once: true });
}

// Host: broadcast full state snapshot + re-render host view.
// Secret missions are stripped from the broadcast during active play so they
// are never exposed to other players. They are only revealed at game end.
function hostBroadcast() {
  if (localPlayer.isHost && bc) {
    bcSend({ type: MSG.STATE_SYNC, state: sanitizeStateForBroadcast(roomState) });
  }
  if (localPlayer.isHost) {
    renderCurrentView();
  }
}

function sanitizeStateForBroadcast(state) {
  if (!state.gameData || !state.gameData.personalMissions || state.view === 'results') {
    return state;
  }
  return { ...state, gameData: { ...state.gameData, personalMissions: {} } };
}

// Host: deliver each player their own secret mission privately.
function hostSendSecrets() {
  if (!localPlayer.isHost || !bc) return;
  const gd = roomState.gameData;
  if (!gd || !gd.personalMissions) return;
  roomState.players.forEach(p => {
    const mission = gd.personalMissions[p.id];
    if (mission) bcSend({ type: MSG.SECRET, playerId: p.id, mission });
  });
}

// Host: broadcast only timer value — lightweight, does not trigger full re-render on players
function hostTimerSync(val, total) {
  if (!localPlayer.isHost || !bc) return;
  bcSend({ type: MSG.TIMER_SYNC, val, total });
}

function playerSend(action, data) {
  if (localPlayer.isHost) {
    handlePlayerAction(localPlayer.id, action, data);
    return;
  }
  if (bc) bcSend({ type: MSG.PLAYER_ACTION, playerId: localPlayer.id, action, data });
}

function handleBCMessage(event) {
  const msg = event.data;
  if (!msg || !msg.type) return;

  switch (msg.type) {
    case MSG.JOIN_REQ: {
      if (!localPlayer.isHost) return;
      if (!roomState.players.find(p => p.id === msg.player.id)) {
        roomState.players.push(msg.player);
      }
      bcSend({ type: MSG.JOIN_CONFIRM, playerId: msg.player.id, state: roomState });
      hostBroadcast();
      break;
    }
    case MSG.JOIN_CONFIRM: {
      if (msg.playerId !== localPlayer.id) return;
      Object.assign(roomState, msg.state);
      roomState.view = 'lobby';
      renderCurrentView();
      break;
    }
    case MSG.STATE_SYNC: {
      if (localPlayer.isHost) return;
      Object.assign(roomState, msg.state);
      renderCurrentView();
      break;
    }
    case MSG.TIMER_SYNC: {
      if (localPlayer.isHost) return;
      // Patch timer display in-place — do NOT re-render
      patchTimerDisplay(msg.val, msg.total);
      break;
    }
    case MSG.PLAYER_ACTION: {
      if (!localPlayer.isHost) return;
      handlePlayerAction(msg.playerId, msg.action, msg.data);
      break;
    }
    case MSG.PLAYER_LEAVE: {
      if (!localPlayer.isHost) return;
      roomState.players = roomState.players.filter(p => p.id !== msg.playerId);
      hostBroadcast();
      break;
    }
    case MSG.SECRET: {
      if (localPlayer.isHost) return;
      if (msg.playerId !== localPlayer.id) return;
      mySecretMission = msg.mission;
      renderCurrentView();
      break;
    }
  }
}

// ─── In-place timer patch (players only) ───
function patchTimerDisplay(val, total) {
  const badge = document.querySelector('.timer-badge');
  const fill  = document.querySelector('.timer-bar-fill');
  const urgent = val <= 5;
  if (badge) { badge.textContent = val + 's'; badge.classList.toggle('urgent', urgent); }
  if (fill)  {
    fill.style.width = Math.max(0, (val / (total || 1)) * 100) + '%';
    fill.classList.toggle('urgent', urgent);
  }
}

// ═══════════════════════════════════════════════════════════
// TIMER MANAGEMENT — never triggers full re-renders
// ═══════════════════════════════════════════════════════════
let _timerInterval = null;
let _timerTotal = 0;

function clearTimer() {
  if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
}

/**
 * startTimer — ticks silently, only updates timer DOM in-place.
 * @param {number} seconds - countdown duration
 * @param {Function} onDone - called when timer reaches 0
 */
function startTimer(seconds, onDone) {
  clearTimer();
  _timerTotal = seconds;
  let remaining = seconds;

  // Host patches its own display in-place too
  _patchHostTimer(remaining, seconds);
  hostTimerSync(remaining, seconds);

  _timerInterval = setInterval(() => {
    remaining--;
    _patchHostTimer(remaining, seconds);
    hostTimerSync(remaining, seconds);

    if (remaining <= 0) {
      clearTimer();
      onDone();
    }
  }, 1000);
}

function _patchHostTimer(val, total) {
  if (!localPlayer.isHost) return;
  patchTimerDisplay(val, total);
}

// Stopwatch — for Big 3 challenge phase
let _swInterval = null;

function clearStopwatch() {
  if (_swInterval) { clearInterval(_swInterval); _swInterval = null; }
}

function startStopwatch() {
  clearStopwatch();
  _swInterval = setInterval(() => {
    const gd = roomState.gameData;
    if (!gd || !gd.stopwatchRunning) { clearStopwatch(); return; }
    gd.stopwatchVal = (gd.stopwatchVal || 0) + 1;
    // Patch stopwatch display only
    const el = document.getElementById('sw-display');
    if (el) el.textContent = fmtTime(gd.stopwatchVal);
    // Sync to players
    if (bc) bcSend({ type: 'SW_SYNC', val: gd.stopwatchVal });
  }, 1000);
}

function fmtTime(secs) {
  return String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0');
}

// ═══════════════════════════════════════════════════════════
// VIEW ROUTER
// ═══════════════════════════════════════════════════════════
let _currentViewId = '';

const VIEW_MAP = {
  welcome: 'v-welcome',
  profile: 'v-profile',
  lobby:   'v-lobby',
  game:    'v-game',
  results: 'v-results',
  editor:  'v-editor',
};

function showView(id, force = false) {
  if (_currentViewId === id && !force) {
    renderViewContent(id);
    return;
  }
  if (_currentViewId) {
    const old = document.getElementById(_currentViewId);
    if (old) old.classList.remove('active');
  }
  _currentViewId = id;
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('active');
    renderViewContent(id);
  }
}

function renderCurrentView() {
  const id = VIEW_MAP[roomState.view] || 'v-welcome';
  showView(id);
}

function renderViewContent(id) {
  switch (id) {
    case 'v-lobby':   renderLobby();   break;
    case 'v-game':    renderGame();    break;
    case 'v-results': renderResults(); break;
    case 'v-profile': renderProfile(); break;
  }
}

// ═══════════════════════════════════════════════════════════
// LOBBY
// ═══════════════════════════════════════════════════════════
// Track which gameId we last synced settings UI for — prevents overwriting user input
let _settingsSyncedForGame = null;

function renderLobby() {
  const pinEl = document.getElementById('lbl-room-pin');
  if (pinEl) pinEl.textContent = roomState.pin;

  const qrCanvas = document.getElementById('qr-canvas');
  if (qrCanvas) renderQR(qrCanvas, `${location.origin}${location.pathname}?room=${roomState.pin}`, roomState.pin);

  const countEl = document.getElementById('player-count');
  if (countEl) countEl.textContent = roomState.players.length;

  // Players grid — only rebuild if player list changed (avoid thrashing)
  renderPlayersGrid();

  const hostPanel  = document.getElementById('host-controls');
  const playerWait = document.getElementById('player-wait');

  if (localPlayer.isHost) {
    hostPanel?.classList.remove('hidden');
    playerWait?.classList.add('hidden');
    // Only sync picker/settings when gameId has changed — not on every render
    syncGamePickerHighlight();
    if (_settingsSyncedForGame !== roomState.gameId) {
      syncSettingsPanelVisibility();
      syncSettingsValues();
      _settingsSyncedForGame = roomState.gameId;
    }
  } else {
    hostPanel?.classList.add('hidden');
    playerWait?.classList.remove('hidden');
    const GAME_NAMES = { yseem: 'You Seem the Type', excuse: 'Excuse Me', big3: 'The Big 3', mission: 'Mission Improbable' };
    const wnEl = document.getElementById('wait-game-name');
    if (wnEl) wnEl.textContent = GAME_NAMES[roomState.gameId] || '';
  }
}

let _lastPlayerCount = -1;
let _lastPlayerIds   = '';

function renderPlayersGrid() {
  const grid = document.getElementById('players-grid');
  if (!grid) return;
  // Cheap change-detection — don't thrash the DOM if players haven't changed
  const ids = roomState.players.map(p => p.id + p.name).join('|');
  if (ids === _lastPlayerIds) return;
  _lastPlayerIds = ids;

  grid.innerHTML = '';
  roomState.players.forEach(p => {
    const card = document.createElement('div');
    card.className = 'player-card' + (p.isHost ? ' is-host' : '') + (p.id === localPlayer.id ? ' is-you' : '');
    card.innerHTML = `
      <div class="player-avatar">${avatarSvg(p.avatarId, p.name)}</div>
      <div class="player-info">
        <div class="player-name">${h(p.name)}</div>
        <div class="player-role">${p.isHost ? 'Host' : p.isBot ? 'Bot' : 'Player'}${p.id === localPlayer.id ? ' · You' : ''}</div>
      </div>`;
    grid.appendChild(card);
  });
}

function syncGamePickerHighlight() {
  document.querySelectorAll('.game-card').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.game === roomState.gameId);
  });
}

function syncSettingsPanelVisibility() {
  ['yseem', 'excuse', 'big3', 'mission'].forEach(g => {
    document.getElementById('settings-' + g)?.classList.toggle('hidden', g !== roomState.gameId);
  });
}

function syncSettingsValues() {
  const s = roomState.settings;
  _sv('yseem-rounds',  s.yseem.rounds);
  _sv('yseem-time',    s.yseem.time);
  _sv('yseem-reveal',  s.yseem.reveal);
  _sv('excuse-rounds', s.excuse.rounds);
  _sv('excuse-time',   s.excuse.time);
  _sc('excuse-anon',   s.excuse.anon);
  _sc('excuse-bonus',  s.excuse.bonus);
  _sv('big3-rounds',      s.big3.rounds);
  _sv('big3-time',        s.big3.time);
  _sv('big3-performers',  s.big3.performers);
  _sc('big3-penalty',     s.big3.penalty);
  _sv('mission-mode',       s.mission.mode);
  _sv('mission-team-count', s.mission.teamCount);
  _sc('mission-personal',    s.mission.personal);
  _sc('mission-call-penalty',s.mission.callPenalty);
}

function _sv(id, val) { const el = document.getElementById(id); if (el && document.activeElement !== el) el.value = val; }
function _sc(id, val) { const el = document.getElementById(id); if (el) el.checked = !!val; }

function collectSettings() {
  const s = roomState.settings;
  const g = roomState.gameId;
  if (g === 'yseem') {
    s.yseem.rounds  = parseInt(document.getElementById('yseem-rounds')?.value)  || 5;
    s.yseem.time    = parseInt(document.getElementById('yseem-time')?.value)    || 30;
    s.yseem.reveal  = document.getElementById('yseem-reveal')?.value || 'each';
  } else if (g === 'excuse') {
    s.excuse.rounds = parseInt(document.getElementById('excuse-rounds')?.value) || 3;
    s.excuse.time   = parseInt(document.getElementById('excuse-time')?.value)   || 60;
    s.excuse.anon   = document.getElementById('excuse-anon')?.checked  ?? true;
    s.excuse.bonus  = document.getElementById('excuse-bonus')?.checked ?? true;
  } else if (g === 'big3') {
    s.big3.rounds     = parseInt(document.getElementById('big3-rounds')?.value)     || 3;
    s.big3.time       = parseInt(document.getElementById('big3-time')?.value)       || 30;
    s.big3.performers = parseInt(document.getElementById('big3-performers')?.value) || 3;
    s.big3.penalty    = document.getElementById('big3-penalty')?.checked ?? false;
  } else if (g === 'mission') {
    s.mission.mode        = document.getElementById('mission-mode')?.value        || 'solo';
    s.mission.teamCount   = parseInt(document.getElementById('mission-team-count')?.value) || 3;
    s.mission.personal    = document.getElementById('mission-personal')?.checked    ?? true;
    s.mission.callPenalty = document.getElementById('mission-call-penalty')?.checked ?? true;
  }
}

// ═══════════════════════════════════════════════════════════
// GAME ROUTER
// ═══════════════════════════════════════════════════════════
function renderGame() {
  const gd = roomState.gameData;
  const root = document.getElementById('game-root');
  if (!root) return;
  if (!gd) { root.innerHTML = '<div style="padding:3rem;text-align:center;color:var(--text-muted)">Starting game...</div>'; return; }
  switch (roomState.gameId) {
    case 'yseem':   renderYouseem(gd, root);   break;
    case 'excuse':  renderExcuse(gd, root);    break;
    case 'big3':    renderBig3(gd, root);      break;
    case 'mission': renderMission(gd, root);   break;
  }
}

// ─── Player action dispatcher (host side) ───
function handlePlayerAction(playerId, action, data) {
  const gd = roomState.gameData;
  if (!gd) return;
  switch (roomState.gameId) {
    case 'yseem':   handleYouseemAction(playerId, action, data);  break;
    case 'excuse':  handleExcuseAction(playerId, action, data);   break;
    case 'big3':    handleBig3Action(playerId, action, data);     break;
    case 'mission': handleMissionAction(playerId, action, data);  break;
  }
}

// ═══════════════════════════════════════════════════════════
// BOTS
// ═══════════════════════════════════════════════════════════
const BOT_NAMES = ['Liam V','Jade K','Dan R','Sara M','Alex T','Mia P','Sam W','Kim L'];
const BOT_EXCUSES = [
  "My emotional support playlist needed urgent updating.",
  "I was technically there but spiritually in another country.",
  "My cat staged a very compelling intervention.",
  "I got stuck in a conversation about cryptocurrency.",
  "My GPS told me to reroute my life choices.",
  "I was guarding a very important snack situation.",
  "I thought the invitation said next week.",
  "I needed to water my fictional plants.",
  "I had a scheduling conflict with my anxiety.",
  "I briefly became a different person and they don't go out."
];

function addBots(count = 3) {
  const existing = new Set(roomState.players.map(p => p.name));
  const available = BOT_NAMES.filter(n => !existing.has(n));
  const toAdd = Math.min(count, available.length);
  for (let i = 0; i < toAdd; i++) {
    roomState.players.push({
      id: 'bot-' + Math.random().toString(36).slice(2, 7),
      name: available[i],
      avatarId: Math.floor(Math.random() * AVATARS.length),
      isHost: false, isBot: true, points: 0
    });
  }
  _lastPlayerIds = ''; // Force player grid rebuild
  hostBroadcast();
}

function runBotAction(stage, ctx = {}) {
  if (!localPlayer.isHost) return;
  const bots = roomState.players.filter(p => p.isBot);
  bots.forEach(bot => {
    if (stage === 'yseem_vote') {
      setTimeout(() => {
        const cands = roomState.players.filter(p => p.id !== bot.id);
        if (cands.length) handlePlayerAction(bot.id, 'vote', { targetId: cands[Math.floor(Math.random() * cands.length)].id });
      }, 1500 + Math.random() * 4000);
    }
    if (stage === 'excuse_write') {
      setTimeout(() => {
        handlePlayerAction(bot.id, 'submit_excuse', { text: BOT_EXCUSES[Math.floor(Math.random() * BOT_EXCUSES.length)] });
      }, 3000 + Math.random() * 6000);
    }
    if (stage === 'excuse_vote') {
      setTimeout(() => {
        const subs = (ctx.submissions || []).filter(s => s.authorId !== bot.id);
        if (subs.length) handlePlayerAction(bot.id, 'vote_excuse', { authorId: subs[Math.floor(Math.random() * subs.length)].authorId });
      }, 1500 + Math.random() * 4000);
    }
    if (stage === 'big3_vote') {
      setTimeout(() => {
        const cands = roomState.players.filter(p => p.id !== bot.id);
        if (cands.length) {
          handlePlayerAction(bot.id, 'submit_prediction', { targetId: cands[Math.floor(Math.random() * cands.length)].id });
        }
      }, 1500 + Math.random() * 4000);
    }
  });
}

// ═══════════════════════════════════════════════════════════
// GAME 1: YOU SEEM THE TYPE
// ═══════════════════════════════════════════════════════════
function startYouseem() {
  clearTimer();
  const opts = roomState.settings.yseem;
  const allYseem = getContent('yseem');
  const actionables = shuffle(allYseem.filter(q => q.startsWith('[ACTION]')));
  const normals = shuffle(allYseem.filter(q => !q.startsWith('[ACTION]')));
  const questions = [];
  let aIdx = 0, nIdx = 0;
  for (let i = 0; i < opts.rounds; i++) {
    let isBonus = Math.random() < 0.33 && aIdx < actionables.length;
    if (isBonus) {
      questions.push({ text: actionables[aIdx++].replace('[ACTION] ', '').trim(), isBonus: true });
    } else {
      let q = normals.length > 0 ? normals[nIdx % normals.length] : actionables[aIdx % actionables.length];
      questions.push({ text: q.replace('[ACTION] ', '').trim(), isBonus: false });
      nIdx++;
    }
  }
  roomState.gameData = {
    game: 'yseem', round: 0, totalRounds: questions.length,
    questions, currentQ: questions[0],
    stage: 'vote',   // 'vote' | 'suspense' | 'drumroll' | 'reveal'
    votes: {},
    tally: null, winners: [], maxVotes: 0,
    timerTotal: opts.time
  };
  runBotAction('yseem_vote');
  startTimer(opts.time, () => finalizeYouseemVote());
  hostBroadcast();
}

function handleYouseemAction(playerId, action, data) {
  const gd = roomState.gameData;
  if (!gd) return;
  
  if (gd.stage === 'vote' && action === 'vote') {
    if (gd.votes[playerId]) return;
    gd.votes[playerId] = data.targetId;
    if (Object.keys(gd.votes).length >= roomState.players.length) finalizeYouseemVote();
    else {
      const cntEl = document.getElementById('yseem-vote-count');
      if (cntEl) cntEl.textContent = Object.keys(gd.votes).length + ' / ' + roomState.players.length + ' voted';
      hostBroadcast();
    }
    return;
  }
  
  if (action === 'yseem_trigger_reveal' && localPlayer.isHost && gd.stage === 'suspense') {
    gd.stage = 'drumroll';
    hostBroadcast();
    sfx.play('drumroll');
    setTimeout(() => {
      sfx.play('reveal');
      confetti.start();
      gd.stage = 'reveal';
      hostBroadcast();
    }, 2200);
    return;
  }
}

function finalizeYouseemVote() {
  clearTimer();
  const gd = roomState.gameData;
  if (!gd || gd.stage !== 'vote') return;

  const tally = {};
  roomState.players.forEach(p => { tally[p.id] = 0; });
  Object.values(gd.votes).forEach(tid => { if (tally[tid] !== undefined) tally[tid]++; });

  const maxVotes = Math.max(0, ...Object.values(tally));
  const winners = Object.keys(tally).filter(id => tally[id] === maxVotes && maxVotes > 0);

  roomState.players.forEach(p => {
    if (winners.includes(p.id)) p.points = (p.points || 0) + 100;
    const myVote = gd.votes[p.id];
    if (myVote && winners.includes(myVote)) p.points = (p.points || 0) + 50;
  });

  Object.assign(gd, { tally, winners, maxVotes });

  if (roomState.settings.yseem.reveal === 'end') {
    advanceYouseem();
  } else {
    gd.stage = 'suspense';
    sfx.play('suspense');
    hostBroadcast();
  }
}

function advanceYouseem() {
  const gd = roomState.gameData;
  gd.round++;
  if (gd.round >= gd.totalRounds) { finishGame(); return; }
  gd.currentQ = gd.questions[gd.round];
  gd.stage = 'vote';
  gd.votes = {};
  gd.tally = null; gd.winners = []; gd.maxVotes = 0;
  runBotAction('yseem_vote');
  startTimer(roomState.settings.yseem.time, () => finalizeYouseemVote());
  hostBroadcast();
}

function renderYouseem(gd, root) {
  if (gd.stage === 'vote') renderYouseemVote(gd, root);
  else if (gd.stage === 'suspense') renderYouseemSuspense(gd, root);
  else if (gd.stage === 'drumroll') renderYouseemDrumroll(gd, root);
  else renderYouseemReveal(gd, root);
}

function renderYouseemVote(gd, root) {
  const total = gd.timerTotal || roomState.settings.yseem.time;
  const myVote = gd.votes[localPlayer.id];
  const candidates = roomState.players.filter(p => p.id !== localPlayer.id);

  root.innerHTML = `
    <div class="game-hdr" data-game="yseem">
      <span class="game-hdr-title">You Seem the Type</span>
      <div class="game-hdr-meta">
        <span class="round-badge">${gd.round + 1} / ${gd.totalRounds}</span>
        <span class="timer-badge">${total}s</span>
      </div>
    </div>
    <div class="timer-bar"><div class="timer-bar-fill" style="width:100%"></div></div>

    <div class="game-content">
      <div class="prompt-card">
        <div class="prompt-eyebrow">Who seems the type to...</div>
        <div class="prompt-text">${h(gd.currentQ.text)}</div>
      </div>

      ${myVote ? `
        <div class="submitted-state">
          <div class="check-circle">
            <svg viewBox="0 0 20 20" fill="none"><path d="M5 10l4 4 6-7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div class="submitted-title">Vote locked in</div>
          <div id="yseem-vote-count" class="submitted-sub">${Object.keys(gd.votes).length} / ${roomState.players.length} voted</div>
        </div>
      ` : candidates.length === 0 ? `
        <div class="info-card"><p>Waiting for other players to join...</p></div>
      ` : `
        <div class="vote-list" id="vote-list">
          ${candidates.map(p => `
            <button class="vote-option" data-tid="${p.id}">
              <div class="vote-avatar">${avatarSvg(p.avatarId, p.name)}</div>
              <span class="vote-name">${h(p.name)}</span>
              <span class="vote-check"></span>
            </button>`).join('')}
        </div>
        <div id="yseem-vote-count" class="text-muted" style="text-align:center;font-size:0.8rem">
          ${Object.keys(gd.votes).length} / ${roomState.players.length} voted
        </div>
      `}
    </div>`;

  if (!myVote) {
    root.querySelectorAll('.vote-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const tid = btn.dataset.tid;
        btn.classList.add('selected');
        root.querySelectorAll('.vote-option').forEach(b => b.classList.add('locked'));
        playerSend('vote', { targetId: tid });
      });
    });
  }
}

function renderYouseemSuspense(gd, root) {
  root.innerHTML = `
    <div class="game-hdr" data-game="yseem">
      <span class="game-hdr-title">You Seem the Type</span>
      <span class="round-badge">${gd.round + 1} / ${gd.totalRounds}</span>
    </div>
    <div class="game-content" style="justify-content: center; align-items: center; text-align: center;">
      <div class="suspense-pulse-circle">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-yseem)" stroke-width="1.5" style="width: 48px; height: 48px;">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </div>
      <h2 style="font-size: 1.4rem; font-weight: 900; margin-top: 24px; color: var(--text-primary);">Votes Are In!</h2>
      <p class="text-secondary" style="max-width: 280px; font-size: 0.88rem; margin-top: 8px;">
        ${localPlayer.isHost ? 'Prepare the crew. Press Reveal to show the vibe!' : 'Prepare yourself. The host is about to reveal the vibe...'}
      </p>
      ${localPlayer.isHost && gd.currentQ.isBonus ? `
        <div style="margin-top: 16px; display: inline-block; padding: 6px 12px; background: rgba(255,95,64,0.15); color: var(--accent-yseem); font-weight: 800; border-radius: var(--r-md); border: 1px solid var(--accent-yseem); font-size: 0.8rem;">
          <svg viewBox="0 0 20 20" fill="currentColor" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle; margin-top: -2px; margin-right: 4px;"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" /></svg>
          BONUS ROUND
        </div>
      ` : ''}
    </div>
    ${localPlayer.isHost ? `
      <div class="game-footer">
        <button id="btn-yseem-reveal" class="btn btn-primary btn-full btn-xl" style="background: var(--accent-yseem); box-shadow: 4px 4px 0 #111;">
          Reveal Vibe
        </button>
      </div>
    ` : ''}`;

  document.getElementById('btn-yseem-reveal')?.addEventListener('click', () => playerSend('yseem_trigger_reveal', {}));
}

function renderYouseemDrumroll(gd, root) {
  root.innerHTML = `
    <div class="game-hdr" data-game="yseem">
      <span class="game-hdr-title">Revealing...</span>
      <span class="round-badge">${gd.round + 1} / ${gd.totalRounds}</span>
    </div>
    <div class="game-content" style="justify-content: center; align-items: center; text-align: center;">
      <div class="drumroll-animation">
        <div class="drumroll-stick left"></div>
        <div class="drumroll-stick right"></div>
        <div class="drumroll-wave"></div>
      </div>
      <h2 class="shimmer-text" style="font-size: 1.5rem; font-weight: 900; margin-top: var(--sp-lg); text-transform: uppercase; letter-spacing: 0.05em;">
        Drumroll Please...
      </h2>
    </div>`;
}

function renderYouseemReveal(gd, root) {
  const tally = gd.tally || {};
  const winners = gd.winners || [];
  const maxVotes = gd.maxVotes || 0;
  const sorted = [...roomState.players].sort((a, b) => (tally[b.id] || 0) - (tally[a.id] || 0));
  const winnerNames = winners.map(id => roomState.players.find(p => p.id === id)?.name || '').filter(Boolean);

  root.innerHTML = `
    <div class="game-hdr" data-game="yseem">
      <span class="game-hdr-title">The Vibe Decided</span>
      <span class="round-badge">${gd.round + 1} / ${gd.totalRounds}</span>
    </div>

    <div class="game-content">
      <div class="prompt-card" style="padding:var(--sp-md) var(--sp-lg)">
        <div class="prompt-eyebrow">Who seems the type to...</div>
        <div class="prompt-text" style="font-size:1rem">${h(gd.currentQ.text)}</div>
      </div>

      ${winnerNames.length > 0 ? `
        <div class="consequence-card animate-pop" style="margin-bottom: var(--sp-md); border: 3px solid var(--accent-yseem); box-shadow: 6px 6px 0 var(--accent-yseem);">
          <div class="prompt-eyebrow" style="color: var(--accent-yseem);">The Vibe Has Decided</div>
          <h3 class="consequence-title" style="font-size: 1.6rem; font-weight: 900; margin: 12px 0 6px 0; color: var(--text-primary);">
            ${winnerNames.join(' & ')}
          </h3>
          <p class="consequence-desc" style="font-size: 0.88rem; color: var(--text-secondary);">
            fits this profile perfectly!
          </p>
          <div class="consequence-badge" style="display: inline-block; margin-top: 14px; padding: 6px 16px; background: var(--accent-yseem); color: #fff; font-weight: 800; font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.05em; border-radius: var(--r-pill); border: 2px solid var(--border); box-shadow: 3px 3px 0 #111;">
            ${gd.currentQ.isBonus ? 'Bonus Round: Perform the action implied by the question right now!' : 'Consequence: Take a shot or face a challenge!'}
          </div>
        </div>
      ` : ''}

      <div class="section-heading">Votes</div>
      <div class="chart-list">
        ${sorted.map(p => {
          const votes = tally[p.id] || 0;
          const pct = maxVotes > 0 ? Math.round((votes / maxVotes) * 100) : 0;
          const isWinner = winners.includes(p.id);
          return `<div class="chart-row">
            <div class="chart-label">
              <div style="display:flex;align-items:center;gap:8px">
                <div style="width:26px;height:26px;border-radius:50%;overflow:hidden;flex-shrink:0">${avatarSvg(p.avatarId, p.name)}</div>
                <span class="chart-name">${isWinner ? '<span class="winner-star">★</span> ' : ''}${h(p.name)}</span>
              </div>
              <span class="chart-val">${votes}</span>
            </div>
            <div class="chart-track">
              <div class="chart-fill${isWinner ? ' winner' : ''}" data-w="${pct}" style="width:0%"></div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>

    ${localPlayer.isHost ? `
      <div class="game-footer">
        <button id="btn-yseem-next" class="btn btn-primary btn-full btn-xl" style="background: var(--accent-yseem); box-shadow: 4px 4px 0 #111;">
          ${gd.round + 1 >= gd.totalRounds ? 'Final Results' : 'Next Question'}
        </button>
      </div>
    ` : `<div class="game-footer"><div class="wait-inline">Waiting for host...</div></div>`}`;

  requestAnimationFrame(() => {
    root.querySelectorAll('.chart-fill[data-w]').forEach(el => {
      const w = el.dataset.w;
      requestAnimationFrame(() => { el.style.width = w + '%'; });
    });
  });

  document.getElementById('btn-yseem-next')?.addEventListener('click', () => {
    confetti.stop();
    advanceYouseem();
  });
}

// ═══════════════════════════════════════════════════════════
// GAME 2: EXCUSE ME
// ═══════════════════════════════════════════════════════════
function startExcuse() {
  clearTimer();
  const opts = roomState.settings.excuse;
  const situations = pick(getContent('excuse'), opts.rounds);
  roomState.gameData = {
    game: 'excuse', round: 0, totalRounds: situations.length,
    situations, currentSit: situations[0],
    stage: 'write',   // 'write' | 'vote' | 'suspense' | 'drumroll' | 'reveal'
    submissions: [],  // { authorId, authorName, authorAvatar, text, votes:[] }
    roundWinner: null, roundLoser: null, isBonus: false,
    writeTotal: opts.time, voteTotal: 30
  };
  runBotAction('excuse_write');
  startTimer(opts.time, () => transitionExcuseToVote());
  hostBroadcast();
}

function handleExcuseAction(playerId, action, data) {
  const gd = roomState.gameData;
  if (!gd) return;

  if (action === 'submit_excuse' && gd.stage === 'write') {
    if (gd.submissions.find(s => s.authorId === playerId)) return;
    const p = roomState.players.find(pl => pl.id === playerId);
    if (!p) return;
    gd.submissions.push({ authorId: playerId, authorName: p.name, authorAvatar: p.avatarId, text: data.text.slice(0, 140).trim(), votes: [] });
    const cntEl = document.getElementById('excuse-submit-count');
    if (cntEl) cntEl.textContent = gd.submissions.length + ' / ' + roomState.players.length + ' submitted';
    if (gd.submissions.length >= roomState.players.length) transitionExcuseToVote();
    else hostBroadcast();
    return;
  }

  if (action === 'vote_excuse' && gd.stage === 'vote') {
    const sub = gd.submissions.find(s => s.authorId === data.authorId);
    if (!sub || sub.authorId === playerId) return;
    if (gd.submissions.some(s => s.votes.includes(playerId))) return;
    sub.votes.push(playerId);
    const total = gd.submissions.reduce((acc, s) => acc + s.votes.length, 0);
    if (total >= roomState.players.length) finalizeExcuseVote();
    else hostBroadcast();
    return;
  }

  if (action === 'excuse_trigger_reveal' && localPlayer.isHost && gd.stage === 'suspense') {
    gd.stage = 'drumroll';
    hostBroadcast();
    sfx.play('drumroll');
    setTimeout(() => {
      sfx.play('reveal');
      confetti.start();
      gd.stage = 'reveal';
      hostBroadcast();
    }, 2200);
    return;
  }
}

function transitionExcuseToVote() {
  clearTimer();
  const gd = roomState.gameData;
  if (!gd || gd.stage !== 'write') return;
  gd.stage = 'vote';
  gd.submissions = shuffle(gd.submissions);
  runBotAction('excuse_vote', { submissions: gd.submissions });
  startTimer(30, () => finalizeExcuseVote());
  hostBroadcast();
}

function finalizeExcuseVote() {
  clearTimer();
  const gd = roomState.gameData;
  if (!gd || gd.stage === 'suspense' || gd.stage === 'reveal') return;
  
  const opts = roomState.settings.excuse;
  const isFinal = (gd.round + 1) === gd.totalRounds;
  gd.isBonus = opts.bonus && (isFinal || Math.random() > 0.65);
  const pts = gd.isBonus ? (isFinal ? 200 : 150) : 100;
  
  // Calculate winner (most votes)
  let maxV = 0, winnerSub = null;
  gd.submissions.forEach(s => { if (s.votes.length > maxV) { maxV = s.votes.length; winnerSub = s; } });
  gd.roundWinner = (winnerSub && maxV > 0) ? winnerSub.authorId : null;
  if (gd.roundWinner) {
    const wp = roomState.players.find(p => p.id === gd.roundWinner);
    if (wp) wp.points = (wp.points || 0) + pts;
  }
  
  // Calculate loser (least votes)
  if (gd.submissions.length > 0) {
    let minV = Infinity, loserSub = null;
    gd.submissions.forEach(s => { if (s.votes.length < minV) minV = s.votes.length; });
    const losers = gd.submissions.filter(s => s.votes.length === minV);
    if (losers.length > 0) {
      loserSub = losers[Math.floor(Math.random() * losers.length)];
      gd.roundLoser = loserSub.authorId;
    } else {
      gd.roundLoser = null;
    }
  } else {
    gd.roundLoser = null;
  }
  
  gd.stage = 'suspense';
  sfx.play('suspense');
  hostBroadcast();
}

function advanceExcuse() {
  const gd = roomState.gameData;
  gd.round++;
  if (gd.round >= gd.totalRounds) { finishGame(); return; }
  gd.currentSit = gd.situations[gd.round];
  gd.stage = 'write';
  gd.submissions = [];
  gd.roundWinner = null; gd.roundLoser = null; gd.isBonus = false;
  runBotAction('excuse_write');
  startTimer(roomState.settings.excuse.time, () => transitionExcuseToVote());
  hostBroadcast();
}

function renderExcuse(gd, root) {
  if (gd.stage === 'write')  renderExcuseWrite(gd, root);
  else if (gd.stage === 'vote')   renderExcuseVote(gd, root);
  else if (gd.stage === 'suspense') renderExcuseSuspense(gd, root);
  else if (gd.stage === 'drumroll') renderExcuseDrumroll(gd, root);
  else renderExcuseReveal(gd, root);
}

function renderExcuseWrite(gd, root) {
  const total = gd.writeTotal || roomState.settings.excuse.time;
  const mySub = gd.submissions.find(s => s.authorId === localPlayer.id);

  const sentinel = root.dataset.excuseStage;
  const alreadySubmitted = root.dataset.excuseSubmitted === '1';

  // While we remain in the write stage, never tear down the DOM — only patch the
  // live counter. This preserves textarea focus, cursor position and scroll
  // while the countdown ticks and other players submit.
  if (sentinel === 'write' && (!mySub || alreadySubmitted)) {
    const cntEl = document.getElementById('excuse-submit-count');
    if (cntEl) cntEl.textContent = gd.submissions.length + ' / ' + roomState.players.length + ' submitted';
    return;
  }

  root.dataset.excuseStage = 'write';
  root.dataset.excuseSubmitted = mySub ? '1' : '0';

  root.innerHTML = `
    <div class="game-hdr" data-game="excuse">
      <span class="game-hdr-title">Excuse Me</span>
      <div class="game-hdr-meta">
        <span class="round-badge">Round ${gd.round + 1} / ${gd.totalRounds}</span>
        <span class="timer-badge">${total}s</span>
      </div>
    </div>
    <div class="timer-bar"><div class="timer-bar-fill" style="width:100%"></div></div>

    <div class="game-content">
      <div class="prompt-card">
        <div class="prompt-eyebrow">Funniest / worst excuse for:</div>
        <div class="prompt-text">${h(gd.currentSit)}</div>
      </div>

      ${mySub ? `
        <div class="submitted-state">
          <div class="check-circle">
            <svg viewBox="0 0 20 20" fill="none"><path d="M5 10l4 4 6-7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div class="submitted-title">Excuse filed</div>
          <div class="submitted-sub" style="font-style:italic">"${h(mySub.text)}"</div>
        </div>
      ` : `
        <div class="excuse-write-area">
          <div class="field-group">
            <label class="field-label" for="exc-ta">Your excuse</label>
            <textarea id="exc-ta" class="input-text" maxlength="140"
              placeholder="Craft your escape..."
              autocomplete="off" autocorrect="on" spellcheck="true"></textarea>
            <div class="char-count"><span id="exc-count">0</span> / 140</div>
          </div>
          <button id="btn-submit-excuse" class="btn btn-primary btn-full">Submit Excuse</button>
        </div>
      `}

      <div class="status-pill" id="excuse-submit-count">${gd.submissions.length} / ${roomState.players.length} submitted</div>
    </div>`;

  if (!mySub) {
    const ta = document.getElementById('exc-ta');
    const counter = document.getElementById('exc-count');
    if (ta) {
      ta.addEventListener('input', () => { if (counter) counter.textContent = ta.value.length; });
    }
    document.getElementById('btn-submit-excuse')?.addEventListener('click', () => {
      const text = ta?.value?.trim();
      if (!text) { showToast('Write something first.', 'error'); return; }
      playerSend('submit_excuse', { text });
    });
  }
}

function renderExcuseVote(gd, root) {
  root.dataset.excuseStage = 'vote';
  const total = gd.voteTotal || 30;
  const myVote = gd.submissions.find(s => s.votes.includes(localPlayer.id));
  const opts = roomState.settings.excuse;

  root.innerHTML = `
    <div class="game-hdr" data-game="excuse">
      <span class="game-hdr-title">Best Excuse?</span>
      <div class="game-hdr-meta">
        <span class="round-badge">Round ${gd.round + 1}</span>
        <span class="timer-badge">${total}s</span>
      </div>
    </div>
    <div class="timer-bar"><div class="timer-bar-fill" style="width:100%"></div></div>

    <div class="game-content">
      <div class="prompt-card" style="padding:var(--sp-md)">
        <div class="prompt-eyebrow">The situation</div>
        <div class="prompt-text" style="font-size:1rem">${h(gd.currentSit)}</div>
      </div>

      ${myVote ? `
        <div class="submitted-state">
          <div class="check-circle">
            <svg viewBox="0 0 20 20" fill="none"><path d="M5 10l4 4 6-7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div class="submitted-title">Vote locked in</div>
          <div class="submitted-sub">Waiting for others...</div>
        </div>
      ` : ''}

      <div class="excuse-cards">
        ${gd.submissions.map(s => {
          const isOwn = s.authorId === localPlayer.id;
          const isSelected = myVote?.authorId === s.authorId;
          const showName = !opts.anon && !isOwn;
          return `<div class="excuse-card${isOwn ? ' own' : ''}${isSelected ? ' selected' : ''}${myVote && !isOwn ? ' voted' : ''}"
               data-aid="${s.authorId}">
            <div class="excuse-author">${isOwn ? 'Your excuse' : showName ? h(s.authorName) : 'Anonymous'}</div>
            <div class="excuse-text">"${h(s.text)}"</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;

  if (!myVote) {
    root.querySelectorAll('.excuse-card:not(.own)').forEach(card => {
      card.addEventListener('click', () => playerSend('vote_excuse', { authorId: card.dataset.aid }));
    });
  }
}

function renderExcuseSuspense(gd, root) {
  root.innerHTML = `
    <div class="game-hdr" data-game="excuse">
      <span class="game-hdr-title">Excuse Me</span>
      <span class="round-badge">Round ${gd.round + 1} / ${gd.totalRounds}</span>
    </div>
    <div class="game-content" style="justify-content: center; align-items: center; text-align: center;">
      <div class="suspense-pulse-circle" style="background: rgba(245,158,11,0.06); border-color: rgba(245,158,11,0.25); animation-name: pulse-ring-excuse;">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-excuse)" stroke-width="1.5" style="width: 44px; height: 44px;">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
        </svg>
      </div>
      <h2 style="font-size: 1.4rem; font-weight: 900; margin-top: 24px; color: var(--text-primary);">Deliberation Complete</h2>
      <p class="text-secondary" style="max-width: 280px; font-size: 0.88rem; margin-top: 8px;">
        ${localPlayer.isHost ? 'Reveal the verdicts. Press button to show the winner and the loser!' : 'The host is about to reveal the funniest and the worst excuses...'}
      </p>
    </div>
    ${localPlayer.isHost ? `
      <div class="game-footer">
        <button id="btn-excuse-reveal" class="btn btn-primary btn-full btn-xl" style="background: var(--accent-excuse); color: var(--text-primary); box-shadow: 4px 4px 0 #111;">
          Reveal Verdicts
        </button>
      </div>
    ` : ''}`;

  document.getElementById('btn-excuse-reveal')?.addEventListener('click', () => playerSend('excuse_trigger_reveal', {}));
}

function renderExcuseDrumroll(gd, root) {
  root.innerHTML = `
    <div class="game-hdr" data-game="excuse">
      <span class="game-hdr-title">Revealing...</span>
      <span class="round-badge">Round ${gd.round + 1}</span>
    </div>
    <div class="game-content" style="justify-content: center; align-items: center; text-align: center;">
      <div class="drumroll-animation" style="border-bottom-color: var(--accent-excuse);">
        <div class="drumroll-stick left"></div>
        <div class="drumroll-stick right"></div>
        <div class="drumroll-wave" style="background: radial-gradient(ellipse, rgba(245,158,11,0.5), transparent);"></div>
      </div>
      <h2 class="shimmer-text" style="font-size: 1.5rem; font-weight: 900; margin-top: var(--sp-lg); text-transform: uppercase; letter-spacing: 0.05em; background-image: linear-gradient(90deg, var(--text-primary), var(--accent-excuse), var(--text-primary));">
        Deliberation Reveal...
      </h2>
    </div>`;
}

function renderExcuseReveal(gd, root) {
  root.dataset.excuseStage = 'reveal';
  const winner = gd.roundWinner ? gd.submissions.find(s => s.authorId === gd.roundWinner) : null;
  const loser = gd.roundLoser ? gd.submissions.find(s => s.authorId === gd.roundLoser) : null;
  const sorted = [...gd.submissions].sort((a, b) => b.votes.length - a.votes.length);

  root.innerHTML = `
    <div class="game-hdr" data-game="excuse">
      <span class="game-hdr-title">Round ${gd.round + 1} Verdict</span>
      <span class="round-badge">${gd.round + 1} / ${gd.totalRounds}</span>
    </div>

    <div class="game-content">
      ${gd.isBonus ? `<div class="bonus-banner" style="margin-bottom: var(--sp-sm);">Bonus Round — Double Points</div>` : ''}

      ${winner ? `
        <div class="winner-card animate-pop" style="margin-bottom: var(--sp-md);">
          <div class="prompt-eyebrow" style="color: var(--accent-excuse);">Funniest Excuse (Winner)</div>
          <div class="winner-text" style="font-size: 1.15rem; line-height: 1.35; margin: var(--sp-xs) 0;">"${h(winner.text)}"</div>
          <div class="winner-by" style="font-weight: 700; color: var(--text-primary);">— ${h(winner.authorName)}</div>
        </div>
      ` : ''}

      ${loser ? `
        <div class="loser-card animate-pop" style="margin-bottom: var(--sp-lg);">
          <div class="prompt-eyebrow" style="color: var(--danger);">Worst Excuse (Consequence)</div>
          <div class="winner-text" style="font-size: 1.05rem; line-height: 1.35; margin: var(--sp-xs) 0; opacity: 0.85;">"${h(loser.text)}"</div>
          <div class="winner-by" style="font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">— ${h(loser.authorName)}</div>
          <div style="display: inline-block; padding: 4px 12px; background: var(--danger); color: #fff; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; border-radius: var(--r-pill); border: 2px solid var(--border); box-shadow: 2px 2px 0 #111;">
            Consequence: Take a shot or face a dare!
          </div>
        </div>
      ` : ''}

      <div class="section-heading">All Excuses</div>
      <div class="excuse-cards">
        ${sorted.map(s => {
          const isWinner = gd.roundWinner === s.authorId;
          const isLoser = gd.roundLoser === s.authorId;
          let borderStyle = '';
          if (isWinner) borderStyle = ' border-color: var(--accent-excuse);';
          else if (isLoser) borderStyle = ' border-color: var(--danger);';
          return `<div class="excuse-card own" style="${borderStyle}">
            <div class="excuse-author">${h(s.authorName)}</div>
            <div class="excuse-text">"${h(s.text)}"</div>
            <div class="excuse-votes">${s.votes.length} vote${s.votes.length !== 1 ? 's' : ''}</div>
          </div>`;
        }).join('')}
      </div>
    </div>

    ${localPlayer.isHost ? `
      <div class="game-footer">
        <button id="btn-excuse-next" class="btn btn-primary btn-full btn-xl" style="background: var(--accent-excuse); color: var(--text-primary); box-shadow: 4px 4px 0 #111;">
          ${gd.round + 1 >= gd.totalRounds ? 'Final Results' : 'Next Round'}
        </button>
      </div>
    ` : `<div class="game-footer"><div class="wait-inline">Waiting for host...</div></div>`}`;

  document.getElementById('btn-excuse-next')?.addEventListener('click', () => {
    confetti.stop();
    advanceExcuse();
  });
}

// ═══════════════════════════════════════════════════════════
// GAME 3: THE BIG 3
// ═══════════════════════════════════════════════════════════
function startBig3() {
  clearTimer();
  const opts = roomState.settings.big3;
  const challenges = pick(getContent('big3'), opts.rounds);
  roomState.gameData = {
    game: 'big3', round: 0, totalRounds: challenges.length,
    challenges, currentChallenge: challenges[0],
    stage: 'predict',   // 'predict' | 'perform' | 'judge' | 'suspense' | 'drumroll' | 'reveal'
    predictions: {},      // { playerId: targetPlayerId } (single vote)
    competitors: [],      // [id1, id2, id3]
    winnerId: null,
    timerTotal: 30
  };
  startTimer(30, () => launchBig3Perform());
  hostBroadcast();
}

function handleBig3Action(playerId, action, data) {
  const gd = roomState.gameData;
  if (!gd) return;

  if (action === 'submit_prediction' && gd.stage === 'predict') {
    if (gd.predictions[playerId]) return;
    gd.predictions[playerId] = data.targetId;
    if (Object.keys(gd.predictions).length >= roomState.players.length) {
      launchBig3Perform();
    } else {
      hostBroadcast();
    }
    return;
  }

  if (action === 'skip_challenge' && localPlayer.isHost && gd.stage === 'perform') {
    launchBig3Judge();
    return;
  }

  if (action === 'judge_winner' && localPlayer.isHost && gd.stage === 'judge') {
    gd.winnerId = data.targetId;
    finalizeBig3();
    return;
  }

  if (action === 'big3_trigger_reveal' && localPlayer.isHost && gd.stage === 'suspense') {
    gd.stage = 'drumroll';
    hostBroadcast();
    sfx.play('drumroll');
    setTimeout(() => {
      sfx.play('reveal');
      confetti.start();
      gd.stage = 'reveal';
      hostBroadcast();
    }, 2200);
    return;
  }
}

function launchBig3Perform() {
  clearTimer();
  const gd = roomState.gameData;
  if (!gd || gd.stage !== 'predict') return;
  
  const tally = {};
  roomState.players.forEach(p => { tally[p.id] = 0; });
  Object.values(gd.predictions).forEach(tid => {
    if (tally[tid] !== undefined) tally[tid]++;
  });
  const sortedIds = Object.keys(tally).sort((a, b) => tally[b] - tally[a]);
  gd.competitors = sortedIds.slice(0, 3);

  gd.stage = 'perform';
  const opts = roomState.settings.big3;
  gd.timerTotal = opts.time || 30;
  startTimer(gd.timerTotal, () => launchBig3Judge());
  hostBroadcast();
}

function launchBig3Judge() {
  clearTimer();
  const gd = roomState.gameData;
  if (!gd || gd.stage !== 'perform') return;
  gd.stage = 'judge';
  hostBroadcast();
}

function finalizeBig3() {
  clearTimer();
  const gd = roomState.gameData;
  if (!gd || gd.stage === 'suspense' || gd.stage === 'reveal') return;

  roomState.players.forEach(p => {
    if (gd.predictions[p.id] === gd.winnerId) {
      p.points = (p.points || 0) + 150;
    }
  });
  
  const winner = roomState.players.find(p => p.id === gd.winnerId);
  if (winner) winner.points = (winner.points || 0) + 100;

  gd.stage = 'suspense';
  sfx.play('suspense');
  hostBroadcast();
}

function advanceBig3() {
  const gd = roomState.gameData;
  gd.round++;
  if (gd.round >= gd.totalRounds) { finishGame(); return; }
  gd.currentChallenge = gd.challenges[gd.round];
  gd.stage = 'predict';
  gd.predictions = {}; gd.competitors = []; gd.winnerId = null;
  gd.timerTotal = 30;
  startTimer(30, () => launchBig3Perform());
  hostBroadcast();
}

function renderBig3(gd, root) {
  if (gd.stage === 'predict') renderBig3Predict(gd, root);
  else if (gd.stage === 'perform') renderBig3Challenge(gd, root);
  else if (gd.stage === 'judge') renderBig3Judge(gd, root);
  else if (gd.stage === 'suspense') renderBig3Suspense(gd, root);
  else if (gd.stage === 'drumroll') renderBig3Drumroll(gd, root);
  else renderBig3Reveal(gd, root);
}

function renderBig3Predict(gd, root) {
  root.dataset.big3Stage = 'predict';
  const myVote = gd.predictions[localPlayer.id];
  const candidates = roomState.players.filter(p => p.id !== localPlayer.id);

  root.innerHTML = `
    <div class="game-hdr" data-game="big3">
      <span class="game-hdr-title">Prediction Phase</span>
      <div class="game-hdr-meta">
        <span class="round-badge">Challenge ${gd.round + 1} / ${gd.totalRounds}</span>
        <span class="timer-badge">30s</span>
      </div>
    </div>
    <div class="timer-bar"><div class="timer-bar-fill" style="width:100%"></div></div>

    <div class="game-content">
      <div class="prompt-card" style="padding:var(--sp-sm); text-align:center; border-color: var(--accent-big3);">
        <div class="prompt-eyebrow" style="color: var(--accent-big3);">The challenge is:</div>
        <div style="font-size:0.95rem; font-weight:600; opacity:0.85;">"${h(gd.currentChallenge)}"</div>
      </div>
      
      ${myVote ? `
        <div class="submitted-state">
          <div class="check-circle" style="border-color: var(--accent-big3); color: var(--accent-big3);">
            <svg viewBox="0 0 20 20" fill="none"><path d="M5 10l4 4 6-7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div class="submitted-title">Prediction Locked</div>
          <div class="submitted-sub">Waiting for others to predict...</div>
        </div>
      ` : `
        <div class="section-heading" style="margin-top: var(--sp-md);">Who will win?</div>
        <div class="vote-roster-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--sp-sm); margin-top: var(--sp-sm);">
          ${candidates.map(p => `
            <button class="vote-card btn-vote-player" data-pid="${p.id}">
              <div class="vote-avatar" style="width: 48px; height: 48px; margin-bottom: 8px;">
                ${avatarSvg(p.avatarId, p.name)}
              </div>
              <span style="font-weight: 700; font-size: 0.9rem;">${h(p.name)}</span>
            </button>
          `).join('')}
        </div>
      `}
    </div>`;

  if (!myVote) {
    root.querySelectorAll('.btn-vote-player').forEach(btn => {
      btn.addEventListener('click', () => {
        playerSend('submit_prediction', { targetId: btn.dataset.pid });
      });
    });
  }
}

function renderBig3Challenge(gd, root) {
  const total = gd.timerTotal || roomState.settings.big3.time || 30;
  const isCompetitor = gd.competitors.includes(localPlayer.id);

  root.innerHTML = `
    <div class="game-hdr" data-game="big3">
      <span class="game-hdr-title">Live Challenge</span>
      <div class="game-hdr-meta">
        <span class="round-badge">Challenge ${gd.round + 1} / ${gd.totalRounds}</span>
        <span class="timer-badge">${total}s</span>
      </div>
    </div>
    <div class="timer-bar"><div class="timer-bar-fill" style="width:100%"></div></div>

    <div class="game-content">
      <div class="prompt-card" style="padding:var(--sp-md); border-color: var(--accent-big3); box-shadow: 6px 6px 0 var(--accent-big3);">
        <div class="prompt-eyebrow" style="color: var(--accent-big3);">The physical task</div>
        <div class="prompt-text" style="font-size:1.15rem; line-height:1.45; font-weight:700;">${h(gd.currentChallenge)}</div>
      </div>
      
      <div class="section-heading" style="margin-top: var(--sp-md);">Top Predicted Competitors</div>
      <div class="vote-roster-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-sm); margin-top: var(--sp-sm);">
        ${gd.competitors.map(pid => {
          const p = roomState.players.find(pl => pl.id === pid);
          if(!p) return '';
          return `
            <div class="vote-card" style="background: var(--bg-panel); border-color: var(--border); pointer-events: none;">
              <div class="vote-avatar" style="width: 40px; height: 40px; margin-bottom: 6px;">
                ${avatarSvg(p.avatarId, p.name)}
              </div>
              <span style="font-weight: 700; font-size: 0.8rem;">${h(p.name)}</span>
            </div>
          `;
        }).join('')}
      </div>

      <div style="margin-top: var(--sp-lg); text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;">
        <div class="suspense-pulse-circle" style="animation-name: pulse-ring-big3; background: rgba(14,165,233,0.06); border-color: rgba(14,165,233,0.25); width: 80px; height: 80px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-big3)" stroke-width="1.5" style="width: 36px; height: 36px;">
            <path d="M20 12V8H4v4M2 20h20M6 20v-8a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v8M14 20v-16a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v16M18 20v-6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v6"/>
          </svg>
        </div>
        <h3 style="color:var(--text-primary); font-size:1.1rem; font-weight:800; margin-top:20px;">
          ${isCompetitor ? 'You are performing!' : 'Watch the competitors!'}
        </h3>
        <p class="text-secondary" style="font-size:0.85rem; max-width:260px; margin-top:6px; line-height:1.4;">
          ${isCompetitor ? 'Do your best. The host will declare the winner.' : 'Cheer them on. The host will declare the winner.'}
        </p>
      </div>
    </div>
    ${localPlayer.isHost ? `
      <div class="game-footer">
        <button id="btn-skip-challenge" class="btn btn-primary btn-full btn-xl" style="background: var(--accent-big3); color: var(--text-primary); box-shadow: 4px 4px 0 #111;">
          Skip to Judging
        </button>
      </div>
    ` : `<div class="game-footer"><div class="wait-inline">Performing challenge...</div></div>`}`;

  document.getElementById('btn-skip-challenge')?.addEventListener('click', () => playerSend('skip_challenge', {}));
}

function renderBig3Judge(gd, root) {
  root.dataset.big3Stage = 'judge';

  root.innerHTML = `
    <div class="game-hdr" data-game="big3">
      <span class="game-hdr-title">Judging Phase</span>
      <span class="round-badge">Challenge ${gd.round + 1} / ${gd.totalRounds}</span>
    </div>

    <div class="game-content">
      <div class="prompt-card" style="padding:var(--sp-sm); text-align:center; border-color: var(--accent-big3);">
        <div class="prompt-eyebrow" style="color: var(--accent-big3);">The challenge was:</div>
        <div style="font-size:0.95rem; font-weight:600; opacity:0.85;">"${h(gd.currentChallenge)}"</div>
      </div>

      ${localPlayer.isHost ? `
        <div class="section-heading" style="margin-top: var(--sp-md);">Who won? (Host Only)</div>
        <div class="vote-roster-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-sm); margin-top: var(--sp-sm);">
          ${gd.competitors.map(pid => {
            const p = roomState.players.find(pl => pl.id === pid);
            if(!p) return '';
            return `
              <button class="vote-card btn-judge-player" data-pid="${p.id}">
                <div class="vote-avatar" style="width: 48px; height: 48px; margin-bottom: 8px;">
                  ${avatarSvg(p.avatarId, p.name)}
                </div>
                <span style="font-weight: 700; font-size: 0.9rem;">${h(p.name)}</span>
              </button>
            `;
          }).join('')}
        </div>
      ` : `
        <div class="submitted-state" style="margin-top: var(--sp-xl);">
          <div class="suspense-pulse-circle" style="animation-name: pulse-ring-big3; background: rgba(14,165,233,0.06); border-color: rgba(14,165,233,0.25);">
             <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-big3)" stroke-width="1.5" style="width: 36px; height: 36px;">
               <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
             </svg>
          </div>
          <div class="submitted-title" style="margin-top: 20px;">Judging...</div>
          <div class="submitted-sub">The host is declaring the winner.</div>
        </div>
      `}
    </div>`;

  if (localPlayer.isHost) {
    root.querySelectorAll('.btn-judge-player').forEach(btn => {
      btn.addEventListener('click', () => {
        playerSend('judge_winner', { targetId: btn.dataset.pid });
      });
    });
  }
}

function renderBig3Suspense(gd, root) {
  root.innerHTML = `
    <div class="game-hdr" data-game="big3">
      <span class="game-hdr-title">The Big 3</span>
      <span class="round-badge">Challenge ${gd.round + 1} / ${gd.totalRounds}</span>
    </div>
    <div class="game-content" style="justify-content: center; align-items: center; text-align: center;">
      <div class="suspense-pulse-circle" style="background: rgba(14,165,233,0.06); border-color: rgba(14,165,233,0.25); animation-name: pulse-ring-big3;">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-big3)" stroke-width="1.5" style="width: 44px; height: 44px;">
          <path d="M20 12V8H4v4M2 20h20M6 20v-8a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v8M14 20v-16a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v16M18 20v-6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v6"/>
        </svg>
      </div>
      <h2 style="font-size: 1.4rem; font-weight: 900; margin-top: 24px; color: var(--text-primary);">Verdict Reached</h2>
      <p class="text-secondary" style="max-width: 280px; font-size: 0.88rem; margin-top: 8px;">
        ${localPlayer.isHost ? 'Reveal the winner! Press Reveal to show the results.' : 'The host is about to reveal the challenge winner...'}
      </p>
    </div>
    ${localPlayer.isHost ? `
      <div class="game-footer">
        <button id="btn-big3-reveal" class="btn btn-primary btn-full btn-xl" style="background: var(--accent-big3); color: var(--text-primary); box-shadow: 4px 4px 0 #111;">
          Reveal Results
        </button>
      </div>
    ` : ''}`;

  document.getElementById('btn-big3-reveal')?.addEventListener('click', () => {
    playerSend('big3_trigger_reveal', {});
  });
}

function renderBig3Drumroll(gd, root) {
  root.innerHTML = `
    <div class="game-hdr" data-game="big3">
      <span class="game-hdr-title">Revealing...</span>
      <span class="round-badge">Challenge ${gd.round + 1}</span>
    </div>
    <div class="game-content" style="justify-content: center; align-items: center; text-align: center;">
      <div class="drumroll-animation" style="border-bottom-color: var(--accent-big3);">
        <div class="drumroll-stick left"></div>
        <div class="drumroll-stick right"></div>
        <div class="drumroll-wave" style="background: radial-gradient(ellipse, rgba(14,165,233,0.5), transparent);"></div>
      </div>
      <h2 class="shimmer-text" style="font-size: 1.5rem; font-weight: 900; margin-top: var(--sp-lg); text-transform: uppercase; letter-spacing: 0.05em; background-image: linear-gradient(90deg, var(--text-primary), var(--accent-big3), var(--text-primary));">
        Drumroll Please...
      </h2>
    </div>`;
}

function renderBig3Reveal(gd, root) {
  root.dataset.big3Stage = 'reveal';
  const myGuess = gd.predictions[localPlayer.id];
  const predictedWinner = roomState.players.find(p => p.id === myGuess);
  const correct = gd.winnerId === myGuess;
  const actualWinner = roomState.players.find(p => p.id === gd.winnerId);

  root.innerHTML = `
    <div class="game-hdr" data-game="big3">
      <span class="game-hdr-title">Results</span>
      <span class="round-badge">${gd.round + 1} / ${gd.totalRounds}</span>
    </div>
    <div class="game-content">
      ${actualWinner ? `
        <div class="winner-card animate-pop" style="margin-bottom: var(--sp-md); border-color: var(--accent-big3);">
          <div class="prompt-eyebrow" style="color: var(--accent-big3);">Challenge Winner</div>
          <div class="winner-text" style="font-size: 1.4rem; line-height: 1.35; margin: var(--sp-xs) 0; font-weight: 900;">${h(actualWinner.name)}</div>
        </div>
      ` : ''}

      <div class="section-heading">Your Prediction</div>
      <div class="predict-check-list" style="margin-bottom: var(--sp-md);">
        <div class="predict-check-row ${correct ? 'correct' : 'wrong'}">
          <div class="predict-check-icon">
            ${correct
              ? '<svg viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4 8-8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
              : '<svg viewBox="0 0 20 20" fill="none"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'}
          </div>
          <span class="predict-pos">You Guessed:</span>
          <span class="predict-name">${predictedWinner ? h(predictedWinner.name) : '—'}</span>
          ${correct ? '<span style="margin-left: auto; font-size: 0.75rem; font-weight: 800; color: var(--accent-big3); background: rgba(14,165,233,0.15); padding: 2px 6px; border-radius: 4px;">Safe! +150 pts</span>' : ''}
        </div>
      </div>
      
      ${!correct ? `
        <div class="loser-card animate-pop" style="margin-bottom: var(--sp-lg); border-color: var(--danger);">
          <div class="prompt-eyebrow" style="color: var(--danger);">Prediction Failed</div>
          <div class="winner-text" style="font-size: 1.05rem; line-height: 1.35; margin: var(--sp-xs) 0; opacity: 0.85;">You did not predict the winner.</div>
          <div style="display: inline-block; padding: 4px 12px; background: var(--danger); color: #fff; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; border-radius: var(--r-pill); border: 2px solid var(--border); box-shadow: 2px 2px 0 #111; margin-top: 8px;">
            Consequence: Take a shot or face a dare!
          </div>
        </div>
      ` : ''}
    </div>
    ${localPlayer.isHost ? `
      <div class="game-footer">
        <button id="btn-big3-next" class="btn btn-primary btn-full btn-xl" style="background: var(--accent-big3); color: var(--text-primary); box-shadow: 4px 4px 0 #111;">
          ${gd.round + 1 >= gd.totalRounds ? 'Final Results' : 'Next Challenge'}
        </button>
      </div>
    ` : '<div class="game-footer"><div class="wait-inline">Waiting for host...</div></div>'}`;

  document.getElementById('btn-big3-next')?.addEventListener('click', () => {
    confetti.stop();
    advanceBig3();
  });
}

// ═══════════════════════════════════════════════════════════
// GAME 4: MISSION IMPROBABLE
// ═══════════════════════════════════════════════════════════
function startMission() {
  clearTimer();
  const opts = roomState.settings.mission;
  const teams = assignTeams(opts.mode);
  const teamNames = [...new Set(Object.values(teams))];

  // Team missions — unique per team, no overlap
  const teamMissions = {};
  const usedMissions = new Set();
  const missionsPerTeam = Math.max(3, parseInt(opts.teamCount) || 3);
  const missionPool = shuffle(getContent('mission'));
  teamNames.forEach(tn => {
    const assigned = [];
    for (let i = 0; i < missionsPerTeam; i++) {
      const mission = missionPool[(usedMissions.size) % missionPool.length];
      assigned.push(mission);
      usedMissions.add(mission);
    }
    teamMissions[tn] = assigned;
  });

  // Personal/secret missions — unique per player, different from team missions
  const personalMissions = {};
  if (opts.personal) {
    const secretPool = shuffle(getContent('mission'));
    let si = 0;
    roomState.players.forEach(p => {
      const myTeamMissions = teamMissions[teams[p.id]] || [];
      let found = false;
      for (let attempt = 0; attempt < secretPool.length; attempt++) {
        const candidate = secretPool[(si + attempt) % secretPool.length];
        if (!myTeamMissions.includes(candidate)) {
          personalMissions[p.id] = candidate;
          si = (si + attempt + 1) % secretPool.length;
          found = true;
          break;
        }
      }
      if (!found) {
        personalMissions[p.id] = secretPool[si % secretPool.length];
        si = (si + 1) % secretPool.length;
      }
    });
  }

  roomState.gameData = {
    game: 'mission',
    stage: 'briefing',
    teams,           // { playerId: teamName }
    teamMissions,    // { teamName: [string] }
    personalMissions,// { playerId: string }
    completed: {},   // { 'team_TeamName': [idx...], 'secret_playerId': [0] }
    compromised: {}, // { playerId: boolean }
    feed: []         // { type, text }
  };
  hostBroadcast();
  hostSendSecrets();
}

function assignTeams(mode) {
  const players = shuffle(roomState.players);
  const assignments = {};
  if (mode === 'solo') {
    players.forEach(p => { assignments[p.id] = p.name; });
  } else {
    const size = mode === 'duo' ? 2 : 3;
    let n = 1;
    for (let i = 0; i < players.length; i += size) {
      const tname = 'Team ' + n++;
      players.slice(i, i + size).forEach(p => { assignments[p.id] = tname; });
    }
  }
  return assignments;
}

function handleMissionAction(playerId, action, data) {
  const gd = roomState.gameData;
  if (!gd) return;

  if (action === 'start_ops') {
    gd.stage = 'ops';
    hostBroadcast();
    return;
  }

  if (action === 'complete_team') {
    if (gd.compromised && gd.compromised[playerId]) return;
    const teamName = gd.teams[playerId];
    if (!teamName) return;
    const key = 'team_' + teamName;
    if (!gd.completed[key]) gd.completed[key] = [];
    if (gd.completed[key].includes(data.idx)) return;
    gd.completed[key].push(data.idx);
    const teammates = roomState.players.filter(p => gd.teams[p.id] === teamName);
    teammates.forEach(p => {
      if (!gd.compromised || !gd.compromised[p.id]) {
        p.points = (p.points || 0) + 80;
      }
    });
    const who = roomState.players.find(p => p.id === playerId);
    gd.feed.unshift({ type: 'success', text: `${h(who?.name || 'Someone')} completed a team objective.` });
    hostBroadcast();
    return;
  }

  if (action === 'complete_secret') {
    if (gd.compromised && gd.compromised[playerId]) return;
    const key = 'secret_' + playerId;
    if (!gd.completed[key]) gd.completed[key] = [];
    if (gd.completed[key].includes(0)) return;
    gd.completed[key].push(0);
    const p = roomState.players.find(pl => pl.id === playerId);
    if (p) p.points = (p.points || 0) + 150;
    gd.feed.unshift({ type: 'success', text: `${h(p?.name || 'An agent')} completed their secret mission.` });
    hostBroadcast();
    return;
  }

  if (action === 'mission_add_points') {
    const p = roomState.players.find(pl => pl.id === data.targetId);
    if (p) {
      p.points = (p.points || 0) + 100;
      gd.feed.unshift({ type: 'success', text: `Host awarded +100 pts to ${h(p.name)}.` });
      hostBroadcast();
    }
    return;
  }

  if (action === 'mission_deduct_points') {
    const p = roomState.players.find(pl => pl.id === data.targetId);
    if (p) {
      p.points = Math.max(0, (p.points || 0) - 50);
      gd.feed.unshift({ type: 'callout-fail', text: `Host deducted -50 pts from ${h(p.name)}.` });
      hostBroadcast();
    }
    return;
  }

  if (action === 'mission_compromise') {
    if (!gd.compromised) gd.compromised = {};
    const pid = data.targetId;
    const p = roomState.players.find(pl => pl.id === pid);
    if (!p) return;
    
    const wasCompromised = !!gd.compromised[pid];
    gd.compromised[pid] = !wasCompromised;
    
    if (gd.compromised[pid]) {
      gd.feed.unshift({ type: 'callout-win', text: `Host compromised and eliminated ${h(p.name)}!` });
    } else {
      gd.feed.unshift({ type: 'success', text: `Host restored ${h(p.name)}'s operational status.` });
    }
    hostBroadcast();
    return;
  }
}

function renderMission(gd, root) {
  if (gd.stage === 'briefing') renderMissionBriefing(gd, root);
  else renderMissionOps(gd, root);
}

function renderMissionBriefing(gd, root) {
  const myTeam = gd.teams[localPlayer.id];
  const myPersonal = localPlayer.isHost ? (gd.personalMissions && gd.personalMissions[localPlayer.id]) : mySecretMission;
  const teammates = roomState.players.filter(p => p.id !== localPlayer.id && gd.teams[p.id] === myTeam);

  root.innerHTML = `
    <div class="game-hdr" data-game="mission">
      <span class="game-hdr-title">Mission Improbable</span>
      <span class="round-badge">Briefing</span>
    </div>
    <div class="game-content">
      <div class="mission-assignment">
        <div class="prompt-eyebrow">Your unit</div>
        <div class="mission-unit-name">${h(myTeam)}</div>
        <div class="mission-unit-members">
          ${teammates.length ? `With: ${teammates.map(t => `<span class="unit-member">${h(t.name)}</span>`).join('')}` : 'Solo operative'}
        </div>
      </div>

      ${myPersonal ? `
        <div class="dossier-card">
          <div class="dossier-header">
            <svg viewBox="0 0 20 20" fill="none" style="width:14px;height:14px;flex-shrink:0">
              <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/>
              <path d="M7 4V3a3 3 0 016 0v1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
            </svg>
            Eyes Only — Secret Dossier
          </div>
          <div class="dossier-peek-btn" id="peek-btn">Hold to reveal your mission</div>
          <div class="dossier-content" id="peek-content">"${h(myPersonal)}"</div>
        </div>
      ` : ''}

      <div class="info-card" style="text-align:left">
        <p style="font-size:0.85rem;color:var(--text-secondary)">
          Complete your team objectives during the game. If you have a secret mission,
          execute it without getting caught. The host verifies callouts.
        </p>
      </div>
    </div>
    <div class="game-footer">
      ${localPlayer.isHost ? `
        <button id="btn-start-ops" class="btn btn-primary btn-full">Begin Operations</button>
      ` : '<div class="wait-inline">Waiting for host to begin operations...</div>'}
    </div>`;

  setupPeekButton('peek-btn', 'peek-content');
  document.getElementById('btn-start-ops')?.addEventListener('click', () => playerSend('start_ops', {}));
}

function setupPeekButton(btnId, contentId) {
  const btn = document.getElementById(btnId);
  const content = document.getElementById(contentId);
  if (!btn || !content) return;
  let peekActive = false;
  const show = () => { if (!peekActive) { peekActive = true; content.classList.add('revealed'); btn.style.opacity = '0'; } };
  const hide = () => { peekActive = false; content.classList.remove('revealed'); btn.style.opacity = '1'; };
  btn.addEventListener('pointerdown', show);
  btn.addEventListener('touchstart', show, { passive: true });
  document.addEventListener('pointerup', hide, { once: true });
  document.addEventListener('touchend', hide, { once: true });
}

function renderMissionOps(gd, root) {
  const myTeam     = gd.teams[localPlayer.id];
  const myPersonal = localPlayer.isHost ? (gd.personalMissions && gd.personalMissions[localPlayer.id]) : mySecretMission;
  const teamMissions  = gd.teamMissions[myTeam] || [];
  const completedTeam = gd.completed['team_' + myTeam] || [];
  const doneSecret    = (gd.completed['secret_' + localPlayer.id] || []).includes(0);
  const isCompromised = gd.compromised && gd.compromised[localPlayer.id];

  root.innerHTML = `
    <div class="game-hdr" data-game="mission">
      <span class="game-hdr-title">Ops — ${h(myTeam)}</span>
      ${localPlayer.isHost ? `<button id="btn-end-ops" class="btn btn-danger btn-sm">End game</button>` : ''}
    </div>
    
    <div class="game-content">
      <!-- Team Objectives -->
      <div class="section-heading">Team Objectives <span class="count-badge">${completedTeam.length}/${teamMissions.length}</span></div>
      <div class="mission-cards">
        ${teamMissions.map((m, i) => {
          const done = completedTeam.includes(i);
          return `<div class="mission-item${done ? ' done' : ''}">
            <span class="mission-tag ${done ? 'tag-done' : 'tag-team'}">${done ? 'Done' : 'Team'}</span>
            <div class="mission-text">${h(m)}</div>
            ${!done && !isCompromised ? `<div class="mission-actions">
              <button class="btn btn-secondary btn-sm btn-complete-team" data-idx="${i}">Mark Done</button>
            </div>` : ''}
          </div>`;
        }).join('')}
      </div>

      <!-- Secret Mission -->
      ${myPersonal ? `
        <div class="section-heading">Secret Mission</div>
        <div class="mission-item${doneSecret ? ' done' : ''}${isCompromised ? ' exposed' : ''}">
          <div class="mission-tags-row">
            <span class="mission-tag tag-secret">${isCompromised ? 'Compromised' : 'Secret'}</span>
            ${doneSecret ? '<span class="mission-tag tag-done">Done</span>' : ''}
          </div>
          ${isCompromised ? `<div class="mission-text" style="color: var(--danger); font-style: italic;">You are compromised! Mission revealed to host.</div>` : `
            <div class="dossier-peek-btn" id="ops-peek-btn">Hold to view your mission</div>
            <div class="dossier-content" id="ops-peek-content">"${h(myPersonal)}"</div>
          `}
          ${!doneSecret && !isCompromised ? `
            <div class="mission-actions" style="margin-top:var(--sp-sm)">
              <button class="btn btn-secondary btn-sm" id="btn-complete-secret">Mark Done</button>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- Host Operations Panel -->
      ${localPlayer.isHost ? renderHostOpsPanel(gd) : renderPlayerRosterPanel(gd)}

      <!-- Live Feed -->
      <div class="section-heading">Live Feed</div>
      <div class="ops-feed">
        ${gd.feed.length === 0
          ? '<div class="feed-item">Operations underway. No events yet.</div>'
          : gd.feed.slice(0, 10).map(f => `<div class="feed-item ${f.type || ''}">${f.text}</div>`).join('')}
      </div>
    </div>`;

  setupPeekButton('ops-peek-btn', 'ops-peek-content');

  root.querySelectorAll('.btn-complete-team').forEach(btn => {
    btn.addEventListener('click', () => playerSend('complete_team', { idx: +btn.dataset.idx }));
  });
  document.getElementById('btn-complete-secret')?.addEventListener('click', () => playerSend('complete_secret', {}));
  document.getElementById('btn-end-ops')?.addEventListener('click', () => finishGame());

  if (localPlayer.isHost) {
    root.querySelectorAll('.btn-host-add').forEach(btn => {
      btn.addEventListener('click', () => {
        playerSend('mission_add_points', { targetId: btn.dataset.pid });
      });
    });
    root.querySelectorAll('.btn-host-sub').forEach(btn => {
      btn.addEventListener('click', () => {
        playerSend('mission_deduct_points', { targetId: btn.dataset.pid });
      });
    });
    root.querySelectorAll('.btn-host-comp').forEach(btn => {
      btn.addEventListener('click', () => {
        playerSend('mission_compromise', { targetId: btn.dataset.pid });
      });
    });
  }
}

function renderHostOpsPanel(gd) {
  return `
    <div class="verify-panel" style="margin-top: var(--sp-md);">
      <div class="verify-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        Host Operations Console
      </div>
      <div style="display: flex; flex-direction: column; gap: var(--sp-sm);">
        ${roomState.players.map(p => {
          const isCompromised = gd.compromised && gd.compromised[p.id];
          const team = gd.teams[p.id] || 'Solo';
          const secret = gd.personalMissions[p.id] || 'No secret mission';
          return `
            <div class="ops-player-row${isCompromised ? ' is-compromised' : ''}">
              <div class="ops-player-top">
                <div class="ops-player-id">
                  <div style="width: 32px; height: 32px; position: relative; flex-shrink: 0;">
                    ${avatarSvg(p.avatarId, p.name)}
                    ${isCompromised ? `
                      <div style="position: absolute; top: -4px; right: -4px; background: var(--danger); border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; border: 1px solid #fff;">
                        <svg viewBox="0 0 20 20" fill="none" style="width: 10px; height: 10px;"><path d="M6 6l8 8M14 6l-8 8" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>
                      </div>
                    ` : ''}
                  </div>
                  <div style="min-width:0">
                    <div class="ops-player-name">
                      ${h(p.name)}
                      <span style="font-size: 0.7rem; font-weight: 500; color: var(--text-muted);">(${h(team)})</span>
                    </div>
                    <div class="ops-player-score">Score: ${p.points || 0} pts</div>
                  </div>
                </div>
                <div class="ops-player-btns">
                  <button class="btn btn-secondary btn-sm btn-host-add" data-pid="${p.id}">+100</button>
                  <button class="btn btn-secondary btn-sm btn-host-sub" data-pid="${p.id}">-50</button>
                  <button class="btn btn-sm btn-host-comp" data-pid="${p.id}" style="background: ${isCompromised ? 'var(--bg-base)' : 'var(--danger)'}; color: ${isCompromised ? 'var(--danger)' : '#fff'}; border-color: var(--danger);">
                    ${isCompromised ? 'Restore' : 'Eliminate'}
                  </button>
                </div>
              </div>
              <div class="ops-secret-box">
                <strong style="color: var(--text-primary);">Secret Dossier:</strong> "${h(secret)}"
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>`;
}

function renderPlayerRosterPanel(gd) {
  return `
    <div class="section-heading" style="margin-top: var(--sp-md);">Operative Status</div>
    <div class="roster-grid" style="margin-top: var(--sp-sm); margin-bottom: var(--sp-md);">
      ${roomState.players.map(p => {
        const isCompromised = gd.compromised && gd.compromised[p.id];
        const team = gd.teams[p.id] || 'Solo';
        return `
          <div class="roster-chip${isCompromised ? ' is-compromised' : ''}">
            <div style="width: 28px; height: 28px; position: relative; flex-shrink: 0;">
              ${avatarSvg(p.avatarId, p.name)}
              ${isCompromised ? `
                <div style="position: absolute; top: -4px; right: -4px; background: var(--danger); border-radius: 50%; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; border: 1px solid #fff;">
                  <svg viewBox="0 0 20 20" fill="none" style="width: 8px; height: 8px;"><path d="M6 6l8 8M14 6l-8 8" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>
                </div>
              ` : ''}
            </div>
            <div style="overflow: hidden; min-width: 0;">
              <div class="roster-chip-name">${h(p.name)}</div>
              <div class="roster-chip-team">${h(team)} ${isCompromised ? '— OUT' : '— ACTIVE'}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>`;
}

// ═══════════════════════════════════════════════════════════
// FINISH & RESULTS
// ═══════════════════════════════════════════════════════════
function finishGame() {
  clearTimer(); clearStopwatch();
  roomState.view = 'results';
  hostBroadcast();
}

const AWARD_TITLES = {
  yseem:   ['Top Vibe', 'Crowd Pick', 'Correctly Typed', 'Wildcard', 'The Dark Horse', 'Consistent'],
  excuse:  ['Best Cover Story', 'Cleanest Exit', 'Crowd Favorite', 'Most Convincing', 'Delusional Genius', 'Unshakeable'],
  big3:    ['Perfect Call', 'Podium Master', 'Gold Reader', 'Close Guess', 'Crowd Correct', 'Solid Pick'],
  mission: ['Ghost Operative', 'Mission Clear', 'Strategic Winner', 'Clean Execution', 'Team Player', 'Unreadable'],
};

function renderResults() {
  const root = document.getElementById('results-root');
  if (!root) return;

  const sorted = [...roomState.players].sort((a, b) => (b.points || 0) - (a.points || 0));
  const GAME_NAME = { yseem: 'You Seem the Type', excuse: 'Excuse Me', big3: 'The Big 3', mission: 'Mission Improbable' };
  const titles = AWARD_TITLES[roomState.gameId] || AWARD_TITLES.yseem;

  root.innerHTML = `
    <div class="results-header">
      <div class="results-eyebrow">${h(GAME_NAME[roomState.gameId] || '')}</div>
      <div class="results-title">Final Results</div>
    </div>

    <div class="results-layout">
      <div class="section-heading">Leaderboard</div>
      <div class="leaderboard">
        ${sorted.map((p, i) => `
          <div class="lb-item${i < 3 ? ' rank-' + (i+1) : ''}" style="animation-delay:${i * 60}ms">
            <div class="lb-rank">${i + 1}</div>
            <div class="lb-avatar">${avatarSvg(p.avatarId, p.name)}</div>
            <div class="lb-info">
              <div class="lb-name">${h(p.name)}${p.id === localPlayer.id ? ' <span class="you-tag">you</span>' : ''}</div>
              <div class="lb-award">${titles[Math.min(i, titles.length - 1)]}</div>
            </div>
            <div class="lb-pts">${p.points || 0} pts</div>
          </div>`).join('')}
      </div>

      ${roomState.gameId === 'mission' ? renderMissionSummary() : ''}
    </div>

    <div class="results-actions">
      ${localPlayer.isHost ? `<button id="btn-back-lobby" class="btn btn-primary btn-full">Back to Lobby</button>` : `<p class="text-muted">Waiting for host...</p>`}
    </div>`;

  document.getElementById('btn-back-lobby')?.addEventListener('click', () => {
    clearTimer(); clearStopwatch();
    roomState.gameData = null;
    roomState.view = 'lobby';
    roomState.players.forEach(p => { p.points = 0; });
    _lastPlayerIds = '';
    hostBroadcast();
  });
}

function renderMissionSummary() {
  const gd = roomState.gameData;
  if (!gd || !gd.personalMissions) return '';
  const hasSecrets = Object.keys(gd.personalMissions).length > 0;
  if (!hasSecrets) return '';
  return `
    <div class="section-heading" style="margin-top:var(--sp-md)">Mission Reveal</div>
    <div class="mission-cards">
      ${roomState.players.filter(p => gd.personalMissions[p.id]).map(p => {
        const exposed = !!(gd.compromised && gd.compromised[p.id]);
        const done = (gd.completed['secret_' + p.id] || []).includes(0);
        return `<div class="mission-item${done ? ' done' : ''}${exposed ? ' exposed' : ''}">
          <div class="mission-tags-row">
            ${exposed ? '<span class="mission-tag tag-secret">Exposed</span>' : done ? '<span class="mission-tag tag-done">Completed</span>' : '<span class="mission-tag tag-team">Not Completed</span>'}
          </div>
          <div class="excuse-author">${h(p.name)}</div>
          <div class="mission-text">"${h(gd.personalMissions[p.id])}"</div>
        </div>`;
      }).join('')}
    </div>`;
}

// ═══════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════
function renderProfile() {
  const el = document.getElementById('avatar-display');
  if (el) el.innerHTML = avatarSvg(localPlayer.avatarId, localPlayer.name || 'P');
  const lbl = document.getElementById('avatar-label');
  if (lbl) lbl.textContent = getAvatarLabel(localPlayer.avatarId);
  const nameEl = document.getElementById('inp-name');
  if (nameEl && !nameEl.value) nameEl.value = localPlayer.name || '';
}

// ═══════════════════════════════════════════════════════════
// CONTENT EDITOR
// ═══════════════════════════════════════════════════════════
let _editorTab = 'yseem';

function renderEditorList() {
  const list = document.getElementById('editor-list');
  if (!list) return;
  const items = getContent(_editorTab);
  list.innerHTML = '';
  items.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'editor-row';
    row.innerHTML = `
      <span class="editor-row-text">${h(item)}</span>
      <button class="editor-del" aria-label="Delete">
        <svg viewBox="0 0 20 20" fill="none">
          <path d="M6 8h8M8 8v7m4-7v7M5 6h10M8 6V5h4v1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>`;
    row.querySelector('.editor-del').addEventListener('click', () => {
      deleteContentItem(_editorTab, i);
      renderEditorList();
    });
    list.appendChild(row);
  });
}

// ═══════════════════════════════════════════════════════════
// TOASTS
// ═══════════════════════════════════════════════════════════
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
window.showToast = showToast;

// ═══════════════════════════════════════════════════════════
// BOOT / EVENT BINDING
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  loadLocalPlayer();

  // Handle SW_SYNC on player side (stopwatch)
  if (typeof BroadcastChannel !== 'undefined') {
    // Temporary listener until bc is initialized
    // (proper bc is opened when joining/creating a room)
  }

  showView('v-welcome');

  // ── URL auto-join ──
  const urlPin = new URLSearchParams(location.search).get('room');
  if (urlPin && /^\d{5}$/.test(urlPin)) {
    const inp = document.getElementById('inp-join-pin');
    if (inp) inp.value = urlPin;
  }

  // ── Welcome ──
  document.getElementById('btn-create-room')?.addEventListener('click', () => {
    localPlayer.isHost = true;
    roomState.view = 'profile';
    showView('v-profile');
    renderProfile();
  });

  document.getElementById('btn-join-room')?.addEventListener('click', () => {
    const pin = document.getElementById('inp-join-pin')?.value?.trim();
    if (!pin || !/^\d{5}$/.test(pin)) { showToast('Enter a valid 5-digit PIN.', 'error'); return; }
    localPlayer.isHost = false;
    roomState.pin = pin;
    openChannel(pin);
    roomState.view = 'profile';
    showView('v-profile');
    renderProfile();
  });

  // Allow pressing Enter in the PIN field
  document.getElementById('inp-join-pin')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-join-room')?.click();
  });

  document.getElementById('btn-content-editor')?.addEventListener('click', () => {
    showView('v-editor');
    renderEditorList();
  });

  // ── Profile ──
  document.getElementById('btn-avatar-prev')?.addEventListener('click', () => {
    localPlayer.avatarId = ((localPlayer.avatarId - 1) + AVATARS.length) % AVATARS.length;
    renderProfile();
  });
  document.getElementById('btn-avatar-next')?.addEventListener('click', () => {
    localPlayer.avatarId = (localPlayer.avatarId + 1) % AVATARS.length;
    renderProfile();
  });

  document.getElementById('btn-confirm-profile')?.addEventListener('click', () => {
    const name = document.getElementById('inp-name')?.value?.trim();
    if (!name) { showToast('Enter a name to continue.', 'error'); return; }
    localPlayer.name = name;
    saveLocalPlayer();

    if (localPlayer.isHost) {
      const pin = String(10000 + Math.floor(Math.random() * 89999));
      roomState.pin = pin;
      roomState.players = [{
        id: localPlayer.id, name: localPlayer.name,
        avatarId: localPlayer.avatarId, isHost: true, isBot: false, points: 0
      }];
      roomState.gameId = 'yseem';
      roomState.view   = 'lobby';
      _settingsSyncedForGame = null;
      _lastPlayerIds = '';
      _lastQrPin = '';
      openChannel(pin);
      hostBroadcast();
    } else {
      if (!bc) { showToast('Connection error. Go back and try again.', 'error'); return; }
      bcSend({
        type: MSG.JOIN_REQ,
        player: { id: localPlayer.id, name: localPlayer.name, avatarId: localPlayer.avatarId, isHost: false, isBot: false, points: 0 }
      });
      showToast('Joining room…', 'info');
      roomState.view = 'lobby';
      showView('v-lobby');
      renderLobby();
    }
  });

  document.getElementById('inp-name')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-confirm-profile')?.click();
  });

  // ── Back buttons ──
  document.querySelectorAll('.back-btn[data-back]').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.back));
  });

  // Global click sound effect for buttons
  document.addEventListener('click', e => {
    if (e.target.closest('.btn, .back-btn, .link-btn, .etab, .vote-option, .roster-btn, .podium-seat, .excuse-card')) {
      sfx.play('click');
    }
  });

  // ── Lobby — game cards & settings modal ──
  function openSettingsModal(gameId) {
    if (!localPlayer.isHost) return;
    sfx.play('click_heavy');
    collectSettings();
    roomState.gameId = gameId;
    _settingsSyncedForGame = null; // Force settings re-sync
    
    // Highlight active card
    document.querySelectorAll('.game-card').forEach(card => {
      card.classList.toggle('active', card.dataset.game === gameId);
    });
    
    // Set modal game ID for theme variations
    const modal = document.getElementById('settings-modal');
    if (modal) {
      modal.dataset.gameId = gameId;
      modal.classList.add('active');
    }
    
    // Update modal header info
    const GAME_DETAILS = {
      yseem: { title: 'You Seem the Type', sub: 'Vibe profiling & group reveals' },
      excuse: { title: 'Excuse Me', sub: 'Hilarious excuse-writing showdown' },
      big3: { title: 'The Big 3', sub: 'Physical mini-challenges and crew voting' },
      mission: { title: 'Mission Improbable', sub: 'Secret physical tasks & verbal callouts' }
    };
    
    const titleEl = document.getElementById('modal-title');
    const subEl = document.getElementById('modal-eyebrow');
    
    if (titleEl) titleEl.textContent = GAME_DETAILS[gameId].title;
    if (subEl) subEl.textContent = GAME_DETAILS[gameId].sub;
    
    syncSettingsPanelVisibility();
    syncSettingsValues();
    _settingsSyncedForGame = gameId;
  }

  function closeSettingsModal() {
    sfx.play('click');
    document.getElementById('settings-modal')?.classList.remove('active');
  }

  document.querySelectorAll('.game-card').forEach(btn => {
    btn.addEventListener('click', () => {
      openSettingsModal(btn.dataset.game);
    });
  });

  document.getElementById('btn-close-settings')?.addEventListener('click', closeSettingsModal);
  document.getElementById('settings-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeSettingsModal();
  });

  // ── Lobby — bots & start ──
  document.getElementById('btn-add-bots')?.addEventListener('click', () => {
    if (!localPlayer.isHost) return;
    addBots(3);
  });

  document.getElementById('btn-start-game')?.addEventListener('click', () => {
    if (!localPlayer.isHost) return;
    if (roomState.players.length < 2) { showToast('Need at least 2 players. Add bots to test.', 'error'); return; }
    collectSettings();
    document.getElementById('settings-modal')?.classList.remove('active');
    roomState.players.forEach(p => { p.points = 0; });
    roomState.view     = 'game';
    roomState.gameData = null;

    // Broadcast the view transition first so players see "game" view
    if (bc) bcSend({ type: MSG.STATE_SYNC, state: roomState });
    showView('v-game', true);

    // Small delay so DOM is ready before game init writes to it
    setTimeout(() => {
      switch (roomState.gameId) {
        case 'yseem':   startYouseem();  break;
        case 'excuse':  startExcuse();   break;
        case 'big3':    startBig3();     break;
        case 'mission': startMission();  break;
      }
    }, 80);
  });

  // ── Content editor ──
  document.querySelectorAll('.etab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.etab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      _editorTab = tab.dataset.etab;
      renderEditorList();
    });
  });

  document.getElementById('btn-add-content')?.addEventListener('click', () => {
    const inp = document.getElementById('inp-new-content');
    const text = inp?.value?.trim();
    if (!text) return;
    if (addContentItem(_editorTab, text)) {
      inp.value = '';
      renderEditorList();
      showToast('Prompt added.', 'success');
    } else {
      showToast('Already in the bank.', 'error');
    }
  });

  document.getElementById('inp-new-content')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-add-content')?.click();
  });

  document.getElementById('btn-reset-content')?.addEventListener('click', () => {
    if (confirm('Reset all prompts to defaults? Custom entries will be removed.')) {
      resetContent();
      renderEditorList();
      showToast('Content reset to defaults.', 'success');
    }
  });

});
