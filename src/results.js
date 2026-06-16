/**
 * Shared Results Screen Controller
 */

import { roomState, localPlayer, changeView } from './state.js';
import { getAvatarSvg } from './components/avatar.js';

// DOM Selectors
const resultsGameBadge = document.getElementById('results-game-badge');
const resultsTitle = document.getElementById('results-title');
const resultsDynamicContent = document.getElementById('results-dynamic-content');
const btnResultsLobby = document.getElementById('btn-results-lobby');
const playerResultsWaitingText = document.getElementById('player-results-waiting-text');

let isResultsInitialized = false;

export function initResultsView() {
  if (isResultsInitialized) return;
  
  if (localPlayer.isHost) {
    btnResultsLobby.classList.remove('hidden');
    playerResultsWaitingText.classList.add('hidden');
    
    btnResultsLobby.addEventListener('click', () => {
      // Clear game data and return to lobby
      roomState.gameData = null;
      changeView('lobby');
    });
  } else {
    btnResultsLobby.classList.add('hidden');
    playerResultsWaitingText.classList.remove('hidden');
  }
  
  isResultsInitialized = true;
}

export function renderResults() {
  initResultsView();
  
  // Set Game Badge
  const gameNames = {
    yseem: 'YOU SEEM THE TYPE',
    excuse: 'EXCUSE ME',
    big3: 'THE BIG 3',
    mission: 'MISSION IMPROBABLE'
  };
  resultsGameBadge.textContent = gameNames[roomState.gameId] || 'GAME OVER';
  
  // Clear dynamic panel
  resultsDynamicContent.innerHTML = '';
  
  // Dispatch rendering by game
  if (roomState.gameId === 'yseem') {
    renderYouSeemResults();
  } else if (roomState.gameId === 'excuse') {
    renderExcuseResults();
  } else if (roomState.gameId === 'big3') {
    renderBig3Results();
  } else if (roomState.gameId === 'mission') {
    renderMissionResults();
  }
}

// ---------------------------------------------------------
// GAME 1: You Seem the Type - Results Rendering
// ---------------------------------------------------------
function renderYouSeemResults() {
  resultsTitle.textContent = "VIBE AWARDS";
  
  // Sort players by points
  const sortedPlayers = [...roomState.players].sort((a, b) => b.points - a.points);
  
  // Define Vibe Titles based on rankings
  const titles = [
    { title: "Top Vibe", desc: "Highest social intuition & vibe match.", icon: "✨" },
    { title: "Strongest First Impression", desc: "The crowd sees right through you.", icon: "🔥" },
    { title: "Crowd Pick", desc: "Voted with the majority most often.", icon: "🤝" },
    { title: "Wildcard", desc: "Unpredictable choices and reactions.", icon: "🃏" },
    { title: "Quietly Correct", desc: "Spoke little, guessed accurately.", icon: "🤫" },
    { title: "Least Surprising", desc: "Exactly who they seemed to be.", icon: "🎯" }
  ];

  const listContainer = document.createElement('div');
  listContainer.className = 'leaderboard-list';
  
  sortedPlayers.forEach((p, idx) => {
    const item = document.createElement('div');
    item.className = `leaderboard-item rank-${idx + 1}`;
    
    // Assign title
    const t = titles[idx % titles.length];
    
    item.innerHTML = `
      <div class="leaderboard-item-left">
        <span class="leaderboard-rank">#${idx + 1}</span>
        <div class="leaderboard-avatar">${getAvatarSvg(p.avatarId)}</div>
        <div style="text-align: left;">
          <span class="leaderboard-name">${escapeHTML(p.name)}</span>
          <div style="font-size: 0.7rem; color: #a1a1aa; font-weight:600;">
            ${t.icon} ${t.title} — ${t.desc}
          </div>
        </div>
      </div>
      <span class="leaderboard-points">${p.points} pts</span>
    `;
    listContainer.appendChild(item);
  });
  
  resultsDynamicContent.appendChild(listContainer);
}

// ---------------------------------------------------------
// GAME 2: Excuse Me - Results Rendering
// ---------------------------------------------------------
function renderExcuseResults() {
  resultsTitle.textContent = "ALIBIS EXPOSED";
  
  const sortedPlayers = [...roomState.players].sort((a, b) => b.points - a.points);
  
  const titles = [
    { title: "Best Cover Story", desc: "Wrote the most convincing lies.", icon: "📂" },
    { title: "Most Delusional", desc: "Escapes so wild, they might be real.", icon: "🌀" },
    { title: "Cleanest Escape", desc: "Sneaked away without a scratch.", icon: "🏃" },
    { title: "Least Believable", desc: "They caught you red-handed.", icon: "🚨" },
    { title: "Crowd Favorite", desc: "Simply the funniest excuse designer.", icon: "🎭" }
  ];

  const listContainer = document.createElement('div');
  listContainer.className = 'leaderboard-list';
  
  sortedPlayers.forEach((p, idx) => {
    const item = document.createElement('div');
    item.className = `leaderboard-item rank-${idx + 1}`;
    
    const t = titles[idx % titles.length];
    
    item.innerHTML = `
      <div class="leaderboard-item-left">
        <span class="leaderboard-rank">#${idx + 1}</span>
        <div class="leaderboard-avatar">${getAvatarSvg(p.avatarId)}</div>
        <div style="text-align: left;">
          <span class="leaderboard-name">${escapeHTML(p.name)}</span>
          <div style="font-size: 0.7rem; color: #a1a1aa; font-weight:600;">
            ${t.icon} ${t.title}
          </div>
        </div>
      </div>
      <span class="leaderboard-points">${p.points} ${p.points === 1 ? 'pt' : 'pts'}</span>
    `;
    listContainer.appendChild(item);
  });
  
  resultsDynamicContent.appendChild(listContainer);
}

// ---------------------------------------------------------
// GAME 3: The Big 3 - Results Rendering
// ---------------------------------------------------------
function renderBig3Results() {
  resultsTitle.textContent = "PODIUM SUMMARY";
  
  const sortedPlayers = [...roomState.players].sort((a, b) => b.points - a.points);
  
  // Visual Podium Container
  const podiumCard = document.createElement('div');
  podiumCard.className = 'card glass-card';
  podiumCard.style.padding = '24px 16px';
  
  // Render podium list
  let podiumHtml = `<div style="display:flex; justify-content:space-around; align-items:flex-end; margin-bottom:24px; min-height:110px;">`;
  
  const top3 = sortedPlayers.slice(0, 3);
  
  // Arrange in order: 2nd place (left), 1st place (center), 3rd place (right)
  const order = [
    { p: top3[1], h: 60, title: "2nd", color: "#94a3b8" },
    { p: top3[0], h: 90, title: "1st", color: "#eab308" },
    { p: top3[2], h: 45, title: "3rd", color: "#b45309" }
  ];
  
  order.forEach(item => {
    if (item.p) {
      podiumHtml += `
        <div style="display:flex; flex-direction:column; align-items:center; width:30%;">
          <div style="width:38px; height:38px; margin-bottom:6px;">${getAvatarSvg(item.p.avatarId)}</div>
          <span style="font-size:0.75rem; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; text-align:center;">
            ${escapeHTML(item.p.name)}
          </span>
          <div style="background:${item.color}; height:${item.h}px; width:100%; border-radius:6px 6px 0 0; display:flex; justify-content:center; align-items:center; margin-top:6px; box-shadow:0 4px 10px rgba(0,0,0,0.3);">
            <strong style="color:#000; font-family:var(--font-display); font-size:1.1rem;">${item.title}</strong>
          </div>
        </div>
      `;
    } else {
      // Empty placeholder pedestal
      podiumHtml += `<div style="width:30%;"></div>`;
    }
  });
  podiumHtml += `</div>`;
  podiumCard.innerHTML = podiumHtml;
  resultsDynamicContent.appendChild(podiumCard);

  // Standard Score list below podium
  const listContainer = document.createElement('div');
  listContainer.className = 'leaderboard-list';
  
  sortedPlayers.forEach((p, idx) => {
    const item = document.createElement('div');
    item.className = `leaderboard-item rank-${idx + 1}`;
    
    let label = "Close Guess";
    if (idx === 0) label = "Gold Call";
    else if (idx === 1) label = "Silver Call";
    else if (idx === 2) label = "Bronze Call";
    
    item.innerHTML = `
      <div class="leaderboard-item-left">
        <span class="leaderboard-rank">#${idx + 1}</span>
        <div class="leaderboard-avatar">${getAvatarSvg(p.avatarId)}</div>
        <div style="text-align: left;">
          <span class="leaderboard-name">${escapeHTML(p.name)}</span>
          <div style="font-size: 0.7rem; color: #a1a1aa; font-weight:600;">
            ${label} Prediction
          </div>
        </div>
      </div>
      <span class="leaderboard-points">${p.points} pts</span>
    `;
    listContainer.appendChild(item);
  });
  resultsDynamicContent.appendChild(listContainer);
}

// ---------------------------------------------------------
// GAME 4: Mission Improbable - Results Rendering
// ---------------------------------------------------------
function renderMissionResults() {
  resultsTitle.textContent = "DOSSIER SUMMARY";
  
  const sortedPlayers = [...roomState.players].sort((a, b) => b.points - a.points);
  
  // Award badges custom block
  const awardsGrid = document.createElement('div');
  awardsGrid.className = 'awards-grid';
  
  const quietOp = sortedPlayers[0] ? sortedPlayers[0].name : 'N/A';
  const exposed = sortedPlayers[sortedPlayers.length - 1] ? sortedPlayers[sortedPlayers.length - 1].name : 'N/A';
  
  const awards = [
    { title: "Quiet Operator", name: quietOp, desc: "Completed most tasks secretly.", icon: "🕵️‍♂️" },
    { title: "Exposed Agent", name: exposed, desc: "Called out by other players.", icon: "🚨" },
    { title: "Mission Specialist", name: sortedPlayers[1] ? sortedPlayers[1].name : 'N/A', desc: "Outstanding team coordination.", icon: "💼" },
    { title: "Perfect Disguise", name: sortedPlayers[2] ? sortedPlayers[2].name : 'N/A', desc: "Maintained a low profile.", icon: "🎭" }
  ];
  
  awards.forEach(aw => {
    const card = document.createElement('div');
    card.className = 'award-card';
    card.innerHTML = `
      <span class="award-icon">${aw.icon}</span>
      <span class="award-title">${aw.title}</span>
      <span class="award-player-name">${escapeHTML(aw.name)}</span>
      <span style="font-size:0.65rem; color:#64748b;">${aw.desc}</span>
    `;
    awardsGrid.appendChild(card);
  });
  
  resultsDynamicContent.appendChild(awardsGrid);
  
  // Scoreboard
  const listContainer = document.createElement('div');
  listContainer.className = 'leaderboard-list';
  listContainer.style.marginTop = '16px';
  
  sortedPlayers.forEach((p, idx) => {
    const item = document.createElement('div');
    item.className = `leaderboard-item rank-${idx + 1}`;
    
    item.innerHTML = `
      <div class="leaderboard-item-left">
        <span class="leaderboard-rank">#${idx + 1}</span>
        <div class="leaderboard-avatar">${getAvatarSvg(p.avatarId)}</div>
        <span class="leaderboard-name">${escapeHTML(p.name)}</span>
      </div>
      <span class="leaderboard-points">${p.points} pts</span>
    `;
    listContainer.appendChild(item);
  });
  
  resultsDynamicContent.appendChild(listContainer);
}

// Utility: simple escape to prevent HTML injection
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
