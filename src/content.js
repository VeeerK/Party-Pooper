/**
 * Content Bank & Seed System
 */

const SEED_DATA = {
  yseem: [
    "Who seems the type to have the most unread messages?",
    "Who seems the type to disappear without saying goodbye?",
    "Who seems the type to know one weird fact about everything?",
    "Who seems the type to accidentally become famous?",
    "Who seems the type to own a random but expensive object?",
    "Who seems the type to get into a story they did not intend to start?",
    "Who seems the type to be the most likely to have a locked notes app?",
    "Who seems the type to survive a chaos-filled night without saying much?",
    "Who seems the type to order the most complicated drink?",
    "Who seems the type to check their reflection in every window?",
    "Who seems the type to buy a gym membership and never go?",
    "Who seems the type to read the entire terms & conditions page?",
    "Who seems the type to have a detailed escape plan for a minor inconvenience?",
    "Who seems the type to carry three different phone chargers?",
    "Who seems the type to win an argument and then apologize for it?",
    "Who seems the type to send a 5-minute voice note instead of a text?",
    "Who seems the type to buy an item just because the packaging looks nice?",
    "Who seems the type to get lost in their own neighborhood?"
  ],
  excuse: [
    "You were caught sneaking food into a movie theater.",
    "You forgot your own plan and showed up late.",
    "You accidentally replied to the wrong person.",
    "You were caught leaving early without saying goodbye.",
    "You got found standing alone like a suspicious side character.",
    "You sent a message and immediately regretted it.",
    "You were caught falling asleep during a presentation.",
    "You wore two different shoes to an important social gathering.",
    "You liked a photo from three years ago on someone's profile.",
    "You sang the completely wrong lyrics out loud in public.",
    "You walked out of a store without buying anything and felt guilty.",
    "You ignored a greeting because you thought they were talking to someone else.",
    "You were caught trying to talk your way out of a library fine."
  ],
  big3: [
    "Stack the tallest tower from random household objects in 20 seconds.",
    "Balance a bottle on your head while walking a short path.",
    "Land the most paper balls into a cup in 30 seconds.",
    "Build the longest chain using nearby objects.",
    "Keep a small object balanced on your hand the longest.",
    "Move three items from one spot to another using only one hand and no dropping.",
    "Arrange shuffled objects into the correct order as fast as possible.",
    "Transfer items from one container to another using an awkward method.",
    "Hold a tricky pose while completing a simple hand task.",
    "Complete a simple sequence with a time limit and no mistakes.",
    "Do 3 consecutive flips of a half-filled plastic bottle.",
    "Keep a coin spinning on a table for the longest time."
  ],
  mission: [
    "Make two different people start the same story without realizing it.",
    "Get someone to repeat a word you used earlier.",
    "Cause a group to make a decision without directly suggesting the answer.",
    "Get someone to check their phone for a harmless reason.",
    "Make someone ask a question starting with 'why'.",
    "Get three people to laugh within a short window.",
    "Make a group photo happen naturally.",
    "Get two people to introduce themselves.",
    "Sneak a specific word into a conversation without being noticed.",
    "Make a situation shift without anyone realizing you steered it.",
    "Get someone to explain their favorite movie plot in detail.",
    "High-five three different people in the room.",
    "Hum a popular song until someone else starts humming or singing it.",
    "Get someone to offer you a drink or snack without asking directly.",
    "Complain about an imaginary noise and get someone else to agree they hear it."
  ]
};

// Initialize Content Bank from LocalStorage or seed data
let contentBank = {};

function initContent() {
  const stored = localStorage.getItem('party_pooper_content_bank');
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
  localStorage.setItem('party_pooper_content_bank', JSON.stringify(contentBank));
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
