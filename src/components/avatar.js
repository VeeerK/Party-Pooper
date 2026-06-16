/**
 * SVG Avatar Generator & Picker Component
 */

const AVATAR_PRESETS = [
  { id: 'av-1', emoji: '😎', name: 'Cool Vibe', bg1: '#8b5cf6', bg2: '#6366f1' },  // Violet -> Indigo
  { id: 'av-2', emoji: '🔥', name: 'On Fire', bg1: '#ef4444', bg2: '#f97316' },    // Red -> Orange
  { id: 'av-3', emoji: '⚡', name: 'Lightning', bg1: '#facc15', bg2: '#eab308' },  // Yellow -> Amber
  { id: 'av-4', emoji: '🚀', name: 'Rocket', bg1: '#06b6d4', bg2: '#3b82f6' },     // Cyan -> Blue
  { id: 'av-5', emoji: '👑', name: 'Crown', bg1: '#f59e0b', bg2: '#d97706' },      // Amber -> Orange-Dark
  { id: 'av-6', emoji: '💎', name: 'Diamond', bg1: '#22d3ee', bg2: '#0891b2' },    // Cyan-Light -> Cyan-Dark
  { id: 'av-7', emoji: '🎧', name: 'Beats', bg1: '#ec4899', bg2: '#d946ef' },      // Magenta -> Pink
  { id: 'av-8', emoji: '👾', name: 'Alien', bg1: '#10b981', bg2: '#059669' },      // Emerald -> Green
  { id: 'av-9', emoji: '🔮', name: 'Oracle', bg1: '#c084fc', bg2: '#8b5cf6' },     // Purple-Light -> Violet
  { id: 'av-10', emoji: '🪐', name: 'Saturn', bg1: '#64748b', bg2: '#334155' },    // Slate-Light -> Slate-Dark
  { id: 'av-11', emoji: '🍀', name: 'Lucky', bg1: '#34d399', bg2: '#059669' },     // Emerald-Light -> Emerald-Dark
  { id: 'av-12', emoji: '🥂', name: 'Cheers', bg1: '#fbbf24', bg2: '#f59e0b' },    // Amber-Light -> Amber-Dark
  { id: 'av-13', emoji: '🎯', name: 'Sniper', bg1: '#f87171', bg2: '#dc2626' },    // Red-Light -> Red-Dark
  { id: 'av-14', emoji: '🍕', name: 'Slice', bg1: '#f97316', bg2: '#ea580c' },     // Orange -> Orange-Dark
  { id: 'av-15', emoji: '👻', name: 'Phantom', bg1: '#94a3b8', bg2: '#475569' },   // Slate -> Zinc
  { id: 'av-16', emoji: '✨', name: 'Sparkle', bg1: '#f472b6', bg2: '#db2777' }    // Pink-Light -> Pink-Dark
];

export function getRandomAvatar() {
  const index = Math.floor(Math.random() * AVATAR_PRESETS.length);
  return AVATAR_PRESETS[index];
}

export function getAvatarById(id) {
  return AVATAR_PRESETS.find(av => av.id === id) || AVATAR_PRESETS[0];
}

export function getNextAvatarId(currentId) {
  const index = AVATAR_PRESETS.findIndex(av => av.id === currentId);
  if (index === -1) return AVATAR_PRESETS[0].id;
  const nextIndex = (index + 1) % AVATAR_PRESETS.length;
  return AVATAR_PRESETS[nextIndex].id;
}

export function getAvatarSvg(id) {
  const av = getAvatarById(id);
  
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
      <defs>
        <linearGradient id="grad-${av.id}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${av.bg1}" />
          <stop offset="100%" stop-color="${av.bg2}" />
        </linearGradient>
        <filter id="glow-${av.id}" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#grad-${av.id})" stroke="rgba(255,255,255,0.15)" stroke-width="2" />
      <text x="50%" y="54%" font-family="Outfit, sans-serif" font-size="44" font-weight="bold" text-anchor="middle" dom-dominant-baseline="middle" alignment-baseline="middle" filter="url(#glow-${av.id})">
        ${av.emoji}
      </text>
    </svg>
  `;
}
