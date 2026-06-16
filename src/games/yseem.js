/**
 * Game 1: You Seem the Type
 */

import { roomState, localPlayer, sendPlayerAction, registerPlayerActionHandler, broadcastRoomState, changeView, simulateBotActions } from '../state.js';
import { getRandomPrompts } from '../content.js';
import { getAvatarSvg } from '../components/avatar.js';

const gameArea = document.getElementById('game-inner-wrapper');

// Local variables for Host timer
let timerInterval = null;

// Initialize You Seem the Type (Run on both Host and Player when starting)
export function initYouSeem() {
  if (localPlayer.isHost) {
    const opts = roomState.settings.yseem;
    const questions = getRandomPrompts('yseem', opts.rounds);
    
    roomState.gameData = {
      round: 0,
      totalRounds: questions.length,
      questions: questions,
      currentQuestion: questions[0],
      stage: 'vote', // 'vote', 'reveal'
      votes: {}, // playerId -> targetId
      timer: opts.time,
      results: null
    };
    
    // Bind host-side actions
    registerPlayerActionHandler(handlePlayerActionHost);
    
    startTimer();
    broadcastRoomState();
  } else {
    // Players listen for actions/states
  }
}

// Host actions router
function handlePlayerActionHost(playerId, action, data) {
  if (roomState.gameData.stage === 'vote' && action === 'vote') {
    // Record vote
    roomState.gameData.votes[playerId] = data.targetId;
    
    // Check if everyone voted
    const activePlayers = roomState.players;
    const voteCount = Object.keys(roomState.gameData.votes).length;
    
    if (voteCount >= activePlayers.length) {
      revealVotes();
    } else {
      broadcastRoomState();
    }
  }
}

// Host Timer controller
function startTimer() {
  clearInterval(timerInterval);
  const opts = roomState.settings.yseem;
  roomState.gameData.timer = opts.time;
  
  // Trigger bots to vote
  simulateBotActions('yseem_vote');
  
  timerInterval = setInterval(() => {
    roomState.gameData.timer--;
    
    if (roomState.gameData.timer <= 0) {
      clearInterval(timerInterval);
      revealVotes();
    } else {
      broadcastRoomState();
    }
  }, 1000);
}

// Host: Tabulate votes and award points
function revealVotes() {
  clearInterval(timerInterval);
  const data = roomState.gameData;
  data.stage = 'reveal';
  
  // Initialize tally counts
  const tally = {};
  roomState.players.forEach(p => tally[p.id] = 0);
  
  // Count votes
  Object.values(data.votes).forEach(targetId => {
    if (tally[targetId] !== undefined) {
      tally[targetId]++;
    }
  });
  
  // Find highest vote count
  let maxVotes = 0;
  Object.values(tally).forEach(count => {
    if (count > maxVotes) maxVotes = count;
  });
  
  // Determine winner(s)
  const winners = [];
  if (maxVotes > 0) {
    Object.keys(tally).forEach(id => {
      if (tally[id] === maxVotes) {
        winners.push(id);
      }
    });
  }
  
  // Award points to player records in roomState
  roomState.players.forEach(player => {
    // If they were voted as matching the vibe
    if (winners.includes(player.id)) {
      player.points += 100;
      
      // If host is this player, sync local points
      if (player.id === localPlayer.id) {
        localPlayer.points = player.points;
      }
    }
    
    // If they guessed the majority winner ("Social Intuition" bonus)
    const playerVote = data.votes[player.id];
    if (playerVote && winners.includes(playerVote)) {
      player.points += 50;
      
      if (player.id === localPlayer.id) {
        localPlayer.points = player.points;
      }
    }
  });
  
  // Save tally counts for view rendering
  data.results = {
    tally,
    winners,
    maxVotes
  };
  
  broadcastRoomState();
}

// Host: Transition to next round or end game
function nextRound() {
  const data = roomState.gameData;
  data.round++;
  
  if (data.round >= data.totalRounds) {
    // Game over! transition to final results
    clearInterval(timerInterval);
    changeView('results');
  } else {
    data.stage = 'vote';
    data.votes = {};
    data.currentQuestion = data.questions[data.round];
    data.results = null;
    startTimer();
    broadcastRoomState();
  }
}

// Clean up timer if views change
export function cleanupYouSeem() {
  clearInterval(timerInterval);
}

// ==========================================================
// RENDERING CODE (Executed by all players based on roomState)
// ==========================================================
export function renderYouSeemView() {
  const data = roomState.gameData;
  if (!data) return;
  
  if (data.stage === 'vote') {
    renderVotingStage(data);
  } else if (data.stage === 'reveal') {
    renderRevealStage(data);
  }
}

// 1. Voting Stage Render
function renderVotingStage(data) {
  const opts = roomState.settings.yseem;
  const progressPercent = (data.timer / opts.time) * 100;
  
  // Is urgent if timer < 6s
  const isUrgent = data.timer <= 5;
  const myVote = data.votes[localPlayer.id];
  
  // Generate candidate list (exclude self as voting option)
  const candidates = roomState.players.filter(p => p.id !== localPlayer.id);
  
  let candidatesHtml = '';
  candidates.forEach(p => {
    const isSelected = myVote === p.id;
    candidatesHtml += `
      <button class="vote-btn-card ${isSelected ? 'selected' : ''}" data-target-id="${p.id}">
        <div class="vote-card-avatar">${getAvatarSvg(p.avatarId)}</div>
        <span class="vote-card-name">${escapeHTML(p.name)}</span>
      </button>
    `;
  });
  
  gameArea.innerHTML = `
    <!-- Game Header -->
    <div class="game-header">
      <span class="game-title-text">You Seem the Type</span>
      <div class="game-meta-group">
        <span style="font-size:0.8rem; font-weight:600; color:hsl(var(--text-secondary));">
          Q ${data.round + 1} of ${data.totalRounds}
        </span>
        <span class="game-timer-badge ${isUrgent ? 'timer-urgent' : ''}">
          ⏱️ ${data.timer}s
        </span>
      </div>
    </div>
    
    <!-- Timer countdown bar -->
    <div class="timer-bar-container">
      <div class="timer-bar-fill" style="width: ${progressPercent}%;"></div>
    </div>
    
    <!-- Main Content -->
    <div class="game-content-area">
      <div class="card glass-card prompt-display-card">
        <span class="prompt-heading">FIRST IMPRESSION VIBE</span>
        <h3 class="prompt-text">“${escapeHTML(data.currentQuestion)}”</h3>
      </div>
      
      <div class="voting-options-list">
        ${candidatesHtml || '<p style="text-align:center; color:hsl(var(--text-muted));">Waiting for other players to join...</p>'}
      </div>
      
      ${myVote ? '<p style="text-align:center; font-size:0.85rem; color:hsl(var(--secondary)); margin-top:20px; font-weight:600;">Vote submitted! Waiting for others...</p>' : ''}
    </div>
  `;
  
  // Bind voting buttons
  if (!myVote) {
    const buttons = gameArea.querySelectorAll('.vote-btn-card');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target-id');
        sendPlayerAction('vote', { targetId });
      });
    });
  }
}

// 2. Reveal Stage Render (Neon Bar Charts)
function renderRevealStage(data) {
  const tally = data.results.tally;
  const winners = data.results.winners;
  const maxVotes = data.results.maxVotes;
  
  let chartRowsHtml = '';
  
  // Sort players by vote count for the chart
  const sortedByVotes = [...roomState.players].sort((a, b) => (tally[b.id] || 0) - (tally[a.id] || 0));
  
  sortedByVotes.forEach(p => {
    const votes = tally[p.id] || 0;
    const percent = maxVotes > 0 ? (votes / maxVotes) * 100 : 0;
    const isWinner = winners.includes(p.id);
    
    chartRowsHtml += `
      <div class="results-chart-row">
        <div class="results-chart-label">
          <span style="font-weight:700; display:flex; align-items:center; gap:8px;">
            ${isWinner ? '👑 ' : ''}${escapeHTML(p.name)}
          </span>
          <span style="color:hsl(var(--text-secondary)); font-weight:600;">${votes} vote${votes === 1 ? '' : 's'}</span>
        </div>
        <div class="results-chart-bar-container">
          <div class="results-chart-bar-fill" style="width: ${percent}%; ${isWinner ? 'background:linear-gradient(90deg, hsl(var(--accent)) 0%, hsl(var(--primary)) 100%)' : ''}"></div>
        </div>
      </div>
    `;
  });
  
  gameArea.innerHTML = `
    <!-- Game Header -->
    <div class="game-header">
      <span class="game-title-text">Vibe Reveal</span>
      <span style="font-size:0.8rem; font-weight:600; color:hsl(var(--text-secondary));">
        Q ${data.round + 1} of ${data.totalRounds}
      </span>
    </div>
    
    <!-- Main Content -->
    <div class="game-content-area" style="justify-content:flex-start; margin-top:20px;">
      <div class="card glass-card prompt-display-card" style="padding: 20px; margin-bottom:16px;">
        <span class="prompt-heading" style="color:hsl(var(--accent));">THE PROMPT</span>
        <h4 style="font-family:var(--font-display); font-size:1.1rem; font-weight:600;">“${escapeHTML(data.currentQuestion)}”</h4>
      </div>
      
      <div class="card glass-card" style="padding:24px 20px;">
        <h3 style="font-size:1.1rem; margin-bottom:20px; text-transform:uppercase; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:8px;">Vibe Tally</h3>
        <div class="results-chart-list">
          ${chartRowsHtml}
        </div>
      </div>
      
      <div class="action-footer" style="margin-top:auto; padding-top:16px;">
        ${localPlayer.isHost ? `
          <button id="btn-yseem-next" class="btn btn-primary btn-block">
            ${data.round + 1 >= data.totalRounds ? 'View Final Results 🏆' : 'Next Question 🚀'}
          </button>
        ` : `
          <p class="wait-text" style="text-align:center;">Waiting for host to continue...</p>
        `}
      </div>
    </div>
  `;
  
  // Trigger width transition after render
  setTimeout(() => {
    const fills = gameArea.querySelectorAll('.results-chart-bar-fill');
    fills.forEach(fill => {
      // Trigger CSS transition
      fill.style.width = fill.style.width; 
    });
  }, 50);

  // Bind host next button
  if (localPlayer.isHost) {
    document.getElementById('btn-yseem-next').addEventListener('click', () => {
      nextRound();
    });
  }
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
