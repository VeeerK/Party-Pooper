/**
 * Game 2: Excuse Me
 */

import { roomState, localPlayer, sendPlayerAction, registerPlayerActionHandler, broadcastRoomState, changeView, simulateBotActions } from '../state.js';
import { getRandomPrompts } from '../content.js';
import { getAvatarSvg } from '../components/avatar.js';

const gameArea = document.getElementById('game-inner-wrapper');

// Local timer variable
let timerInterval = null;

export function initExcuse() {
  if (localPlayer.isHost) {
    const opts = roomState.settings.excuse;
    const situations = getRandomPrompts('excuse', opts.rounds);
    
    roomState.gameData = {
      round: 0,
      totalRounds: situations.length,
      situations: situations,
      currentSituation: situations[0],
      stage: 'write', // 'write', 'vote', 'reveal'
      submissions: [], // Array of { authorId, authorName, authorAvatar, text, votes: [] }
      timer: opts.time,
      isBonus: false,
      roundWinner: null
    };
    
    registerPlayerActionHandler(handlePlayerActionHost);
    
    startTimer('write', opts.time);
    broadcastRoomState();
  }
}

// Host actions router
function handlePlayerActionHost(playerId, action, data) {
  const gd = roomState.gameData;
  if (!gd) return;

  if (gd.stage === 'write' && action === 'submit_excuse') {
    // Check if player already submitted
    if (gd.submissions.some(s => s.authorId === playerId)) return;
    
    const playerRecord = roomState.players.find(p => p.id === playerId);
    if (!playerRecord) return;
    
    gd.submissions.push({
      authorId: playerId,
      authorName: playerRecord.name,
      authorAvatar: playerRecord.avatarId,
      text: data.text.trim(),
      votes: [] // Will store playerIds who voted for this excuse
    });
    
    // Check if everyone submitted
    const activePlayers = roomState.players;
    if (gd.submissions.length >= activePlayers.length) {
      startVotingStage();
    } else {
      broadcastRoomState();
    }
  } 
  
  else if (gd.stage === 'vote' && action === 'vote_excuse') {
    // Verify voter hasn't already voted
    const alreadyVoted = gd.submissions.some(s => s.votes.includes(playerId));
    if (alreadyVoted) return;
    
    // Cannot vote for own excuse
    const submission = gd.submissions.find(s => s.authorId === data.authorId);
    if (submission && submission.authorId !== playerId) {
      submission.votes.push(playerId);
      
      // Check if everyone voted
      const activePlayers = roomState.players;
      let totalVotes = 0;
      gd.submissions.forEach(s => totalVotes += s.votes.length);
      
      if (totalVotes >= activePlayers.length) {
        revealExcuseResults();
      } else {
        broadcastRoomState();
      }
    }
  }
}

// Host Timer controller
function startTimer(stage, seconds) {
  clearInterval(timerInterval);
  const gd = roomState.gameData;
  gd.timer = seconds;
  
  if (stage === 'write') {
    simulateBotActions('excuse_write');
  } else if (stage === 'vote') {
    simulateBotActions('excuse_vote', { submissions: gd.submissions });
  }
  
  timerInterval = setInterval(() => {
    gd.timer--;
    
    if (gd.timer <= 0) {
      clearInterval(timerInterval);
      if (stage === 'write') {
        startVotingStage();
      } else if (stage === 'vote') {
        revealExcuseResults();
      }
    } else {
      broadcastRoomState();
    }
  }, 1000);
}

// Host: transition to voting
function startVotingStage() {
  clearInterval(timerInterval);
  const gd = roomState.gameData;
  gd.stage = 'vote';
  
  // Shuffle submissions to make anonymous voting fair
  gd.submissions.sort(() => Math.random() - 0.5);
  
  startTimer('vote', 30); // 30s for voting stage
  broadcastRoomState();
}

// Host: compile votes, grant points
function revealExcuseResults() {
  clearInterval(timerInterval);
  const gd = roomState.gameData;
  gd.stage = 'reveal';
  
  // Determine if this is a bonus round (e.g., last round or host enabled bonus)
  const opts = roomState.settings.excuse;
  const isFinalRound = (gd.round + 1) === gd.totalRounds;
  gd.isBonus = opts.bonus && (isFinalRound || Math.random() > 0.6);
  
  const pointValue = gd.isBonus ? (isFinalRound ? 3 : 2) : 1;
  
  let maxVotes = -1;
  let winnerRecord = null;
  
  gd.submissions.forEach(sub => {
    const voteCount = sub.votes.length;
    if (voteCount > maxVotes) {
      maxVotes = voteCount;
      winnerRecord = sub;
    }
  });
  
  if (winnerRecord && maxVotes > 0) {
    gd.roundWinner = winnerRecord.authorId;
    
    // Find player in roomState and add points
    const winnerPlayer = roomState.players.find(p => p.id === winnerRecord.authorId);
    if (winnerPlayer) {
      winnerPlayer.points += pointValue;
      if (winnerPlayer.id === localPlayer.id) {
        localPlayer.points = winnerPlayer.points;
      }
    }
  } else {
    gd.roundWinner = null; // TIE or NO VOTES
  }
  
  broadcastRoomState();
}

// Host: next round
function nextExcuseRound() {
  const gd = roomState.gameData;
  gd.round++;
  
  if (gd.round >= gd.totalRounds) {
    clearInterval(timerInterval);
    changeView('results');
  } else {
    gd.stage = 'write';
    gd.submissions = [];
    gd.currentSituation = gd.situations[gd.round];
    gd.roundWinner = null;
    gd.isBonus = false;
    
    const opts = roomState.settings.excuse;
    startTimer('write', opts.time);
    broadcastRoomState();
  }
}

export function cleanupExcuse() {
  clearInterval(timerInterval);
}

// ==========================================================
// RENDERING CODE (Executed by all players based on roomState)
// ==========================================================
export function renderExcuseView() {
  const gd = roomState.gameData;
  if (!gd) return;
  
  if (gd.stage === 'write') {
    renderExcuseWrite(gd);
  } else if (gd.stage === 'vote') {
    renderExcuseVote(gd);
  } else if (gd.stage === 'reveal') {
    renderExcuseReveal(gd);
  }
}

// 1. Write Stage Render
function renderExcuseWrite(gd) {
  const opts = roomState.settings.excuse;
  const progressPercent = (gd.timer / opts.time) * 100;
  const isUrgent = gd.timer <= 6;
  
  const mySubmission = gd.submissions.find(s => s.authorId === localPlayer.id);
  
  gameArea.innerHTML = `
    <div class="game-header">
      <span class="game-title-text">Excuse Me</span>
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
    
    <div class="game-content-area">
      <div class="card glass-card prompt-display-card">
        <span class="prompt-heading">THE SITUATION</span>
        <h3 class="prompt-text">“${escapeHTML(gd.currentSituation)}”</h3>
      </div>
      
      ${mySubmission ? `
        <div style="text-align:center; padding: 24px;">
          <h4 style="color:hsl(var(--secondary)); font-family:var(--font-display); font-weight:700; margin-bottom:8px;">ALIBI FILED</h4>
          <p style="font-size:0.95rem; color:hsl(var(--text-secondary)); font-style:italic;">“${escapeHTML(mySubmission.text)}”</p>
          <p style="font-size:0.8rem; color:hsl(var(--text-muted)); margin-top:20px;">Waiting for other players to craft excuses...</p>
        </div>
      ` : `
        <div class="excuse-input-area">
          <div class="form-group">
            <label for="textarea-excuse">CRAFT YOUR ESCAPE COVER STORY</label>
            <textarea id="textarea-excuse" maxlength="120" placeholder="Type excuse here..." class="input-text" style="height:100px; resize:none; font-size:1rem;"></textarea>
            <span id="char-counter" class="char-counter">0/120</span>
          </div>
          <button id="btn-submit-excuse" class="btn btn-primary btn-block">File Excuse 📁</button>
        </div>
      `}
    </div>
  `;
  
  if (!mySubmission) {
    const textarea = document.getElementById('textarea-excuse');
    const counter = document.getElementById('char-counter');
    const btn = document.getElementById('btn-submit-excuse');
    
    textarea.focus();
    textarea.addEventListener('input', () => {
      counter.textContent = `${textarea.value.length}/120`;
    });
    
    btn.addEventListener('click', () => {
      const text = textarea.value.trim();
      if (!text) {
        showToast("Excuse cannot be empty!", "error");
        return;
      }
      sendPlayerAction('submit_excuse', { text });
    });
  }
}

// 2. Vote Stage Render
function renderExcuseVote(gd) {
  const isUrgent = gd.timer <= 5;
  const progressPercent = (gd.timer / 30) * 100;
  
  // Did I vote already?
  const myVote = gd.submissions.find(s => s.votes.includes(localPlayer.id));
  
  // Did I submit?
  const myExcuse = gd.submissions.find(s => s.authorId === localPlayer.id);
  const myExcuseText = myExcuse ? myExcuse.text : '';
  
  const opts = roomState.settings.excuse;
  
  let cardsHtml = '';
  gd.submissions.forEach(sub => {
    // Cannot vote for yourself
    const isOwn = sub.authorId === localPlayer.id;
    const isSelected = myVote?.authorId === sub.authorId;
    
    // Hide name if answers are anonymous in lobby settings
    const authorName = opts.anonAns ? 'Anonymous Alibi' : sub.authorName;
    
    cardsHtml += `
      <div class="card glass-card ${isOwn ? 'disabled-card' : ''} ${isSelected ? 'selected' : ''}" 
           style="padding:16px; margin-bottom:12px; cursor:${isOwn ? 'not-allowed' : 'pointer'}; border-color:${isSelected ? 'hsl(var(--primary))' : ''}; opacity:${isOwn ? '0.6' : '1'}; text-align:left;"
           data-author-id="${sub.authorId}">
        <div style="font-size:0.7rem; font-weight:700; color:${isOwn ? 'hsl(var(--text-muted))' : 'hsl(var(--secondary))'}; text-transform:uppercase; margin-bottom:6px;">
          ${isOwn ? 'Your Excuse' : authorName}
        </div>
        <p style="font-size:0.95rem; font-weight:600; font-style:italic;">“${escapeHTML(sub.text)}”</p>
      </div>
    `;
  });
  
  gameArea.innerHTML = `
    <div class="game-header">
      <span class="game-title-text">Vote for Funniest</span>
      <div class="game-meta-group">
        <span style="font-size:0.8rem; font-weight:600; color:hsl(var(--text-secondary));">
          Voting
        </span>
        <span class="game-timer-badge ${isUrgent ? 'timer-urgent' : ''}">
          ⏱️ ${gd.timer}s
        </span>
      </div>
    </div>
    
    <div class="timer-bar-container">
      <div class="timer-bar-fill" style="width: ${progressPercent}%;"></div>
    </div>
    
    <div class="game-content-area" style="justify-content:flex-start; margin-top:20px; overflow-y:auto; max-height:80%;">
      <div class="card glass-card prompt-display-card" style="padding:16px; margin-bottom:16px;">
        <span class="prompt-heading" style="margin-bottom:4px;">THE SITUATION</span>
        <p style="font-size:1rem; font-weight:600; font-style:italic;">“${escapeHTML(gd.currentSituation)}”</p>
      </div>
      
      <div class="excuses-vote-list">
        ${cardsHtml}
      </div>
      
      ${myVote ? '<p style="text-align:center; font-size:0.85rem; color:hsl(var(--secondary)); margin-top:16px; font-weight:600;">Vote counted! Waiting for others...</p>' : ''}
    </div>
  `;
  
  if (!myVote) {
    const cards = gameArea.querySelectorAll('.glass-card[data-author-id]');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const authorId = card.getAttribute('data-author-id');
        if (authorId === localPlayer.id) return; // Can't vote for self
        sendPlayerAction('vote_excuse', { authorId });
      });
    });
  }
}

// 3. Reveal Stage Render
function renderExcuseReveal(gd) {
  const winnerId = gd.roundWinner;
  const winnerRecord = gd.submissions.find(s => s.authorId === winnerId);
  
  let excusesTallyHtml = '';
  
  // Sort submissions by votes received
  const sortedSubs = [...gd.submissions].sort((a, b) => b.votes.length - a.votes.length);
  
  sortedSubs.forEach(sub => {
    const votes = sub.votes.length;
    const isWinner = winnerId === sub.authorId;
    
    excusesTallyHtml += `
      <div class="card glass-card" style="padding:16px; margin-bottom:12px; border-color:${isWinner ? 'hsl(var(--accent))' : ''}; text-align:left;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:24px; height:24px;">${getAvatarSvg(sub.authorAvatar)}</div>
            <span style="font-size:0.85rem; font-weight:700; color:${isWinner ? 'hsl(var(--accent))' : '#fff'};">${escapeHTML(sub.authorName)}</span>
          </div>
          <span style="font-size:0.85rem; font-weight:700; color:hsl(var(--text-secondary));">${votes} Vote${votes === 1 ? '' : 's'}</span>
        </div>
        <p style="font-size:0.95rem; font-style:italic; font-weight:600;">“${escapeHTML(sub.text)}”</p>
      </div>
    `;
  });
  
  gameArea.innerHTML = `
    <div class="game-header">
      <span class="game-title-text">Excuse Revealed</span>
      <span style="font-size:0.8rem; font-weight:600; color:hsl(var(--text-secondary));">
        Round ${gd.round + 1}/${gd.totalRounds}
      </span>
    </div>
    
    <div class="game-content-area" style="justify-content:flex-start; margin-top:16px; overflow-y:auto;">
      ${gd.isBonus ? `
        <div class="badge-premium" style="background:rgba(236, 72, 153, 0.2); border-color:hsl(var(--accent)); color:hsl(var(--accent)); align-self:center; margin-bottom:12px; animation:shake 0.4s infinite alternate;">
          🔥 BONUS ROUND — WORTH DOUBLE POINTS
        </div>
      ` : ''}

      ${winnerRecord ? `
        <div class="card glass-card" style="text-align:center; padding:24px; border-color:hsl(var(--accent)); background:rgba(236,72,153,0.03); margin-bottom:20px;">
          <span class="prompt-heading" style="color:hsl(var(--accent));">WINNING ALIBI</span>
          <p style="font-size:1.15rem; font-weight:700; font-style:italic; margin-bottom:16px;">“${escapeHTML(winnerRecord.text)}”</p>
          <div style="display:inline-flex; align-items:center; gap:10px;">
            <div style="width:28px; height:28px;">${getAvatarSvg(winnerRecord.authorAvatar)}</div>
            <strong style="font-size:0.95rem;">${escapeHTML(winnerRecord.authorName)}</strong>
          </div>
        </div>
      ` : `
        <div class="card glass-card" style="text-align:center; padding:24px; margin-bottom:20px;">
          <span class="prompt-heading">TIE OR NO ALIBI</span>
          <p style="font-size:1.05rem; font-weight:700; color:hsl(var(--text-muted));">No alibi stood out to the crowd this round.</p>
        </div>
      `}
      
      <h3 style="font-size:1rem; margin-bottom:12px; text-transform:uppercase;">Excuse Leaderboard</h3>
      <div class="tally-box">
        ${excusesTallyHtml}
      </div>
      
      <div class="action-footer" style="margin-top:20px; padding-top:16px;">
        ${localPlayer.isHost ? `
          <button id="btn-excuse-next" class="btn btn-primary btn-block">
            ${gd.round + 1 >= gd.totalRounds ? 'View Final Results 🏆' : 'Next Round 🚀'}
          </button>
        ` : `
          <p class="wait-text" style="text-align:center;">Waiting for host to continue...</p>
        `}
      </div>
    </div>
  `;
  
  if (localPlayer.isHost) {
    document.getElementById('btn-excuse-next').addEventListener('click', () => {
      nextExcuseRound();
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
