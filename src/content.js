/**
 * Content Bank & Seed System
 */

const SEED_DATA = {
  "yseem": [],
  "excuse": [],
  "big3": [],
  "mission": []
};

// Initialize Content Bank from LocalStorage or seed data
let contentBank = {};

function initContent() {
  const stored = localStorage.getItem('party_pooper_content_bank_v2');
  if (stored) {
    try {
      contentBank = JSON.parse(stored);
      // Ensure all keys exist
      Object.keys(SEED_DATA).forEach(key => {
        if (!contentBank[key] || !Array.isArray(contentBank[key])) {
          contentBank[key] = [...SEED_DATA[key]];
        }
      });
    } catch (e) {
      contentBank = JSON.parse(JSON.stringify(SEED_DATA));
    }
  } else {
    contentBank = JSON.parse(JSON.stringify(SEED_DATA));
    saveToStorage();
  }
}

function saveToStorage() {
  localStorage.setItem('party_pooper_content_bank_v2', JSON.stringify(contentBank));
}

export function getItems(gameKey) {
  if (!contentBank[gameKey]) initContent();
  return contentBank[gameKey];
}

export function addItem(gameKey, text) {
  if (!text || !text.trim()) return false;
  if (!contentBank[gameKey]) initContent();
  
  const formatted = text.trim();
  if (!contentBank[gameKey].includes(formatted)) {
    contentBank[gameKey].unshift(formatted); // Add to beginning
    saveToStorage();
    return true;
  }
  return false;
}

export function deleteItem(gameKey, index) {
  if (!contentBank[gameKey]) initContent();
  if (index >= 0 && index < contentBank[gameKey].length) {
    contentBank[gameKey].splice(index, 1);
    saveToStorage();
    return true;
  }
  return false;
}

export function resetToDefaults() {
  contentBank = JSON.parse(JSON.stringify(SEED_DATA));
  saveToStorage();
  return true;
}

export function getRandomPrompts(gameKey, count) {
  if (!contentBank[gameKey]) initContent();
  const list = [...contentBank[gameKey]];
  
  // Shuffle list
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  
  return list.slice(0, Math.min(count, list.length));
}

// Initial run
initContent();
