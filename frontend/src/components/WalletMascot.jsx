import React from 'react';

export default function WalletMascot({ className = 'w-24 h-20', mood = 'happy' }) {
  return (
    <div className={`relative select-none pointer-events-none animate-mascot ${className}`}>
      <svg
        viewBox="0 0 140 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_8px_16px_rgba(255,144,43,0.3)]"
      >
        <defs>
          <linearGradient id="mascotGrad" x1="70" y1="0" x2="70" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFA64D" />
            <stop offset="0.6" stopColor="#FF8B26" />
            <stop offset="1" stopColor="#F5760F" />
          </linearGradient>
          <radialGradient id="mascotShine" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(50 30) rotate(45) scale(40)">
            <stop stopColor="#FFF2E6" stopOpacity="0.8" />
            <stop offset="1" stopColor="#FFA64D" stopOpacity="0" />
          </radialGradient>
          <filter id="softGlow" x="0" y="0" width="140" height="100" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Mascot Body: cute friendly dome peeking up */}
        <path
          d="M 12 100 C 12 40, 32 6, 70 6 C 108 6, 128 40, 128 100 Z"
          fill="url(#mascotGrad)"
        />

        {/* Soft highlight shine on top forehead */}
        <ellipse cx="64" cy="24" rx="34" ry="14" fill="url(#mascotShine)" />

        {/* Left ear/nub */}
        <ellipse cx="26" cy="62" rx="7" ry="12" transform="rotate(-20 26 62)" fill="#FF831B" />
        {/* Right ear/nub */}
        <ellipse cx="114" cy="62" rx="7" ry="12" transform="rotate(20 114 62)" fill="#FF831B" />

        {/* Big Shiny Black Left Eye */}
        <ellipse cx="50" cy="48" rx="8" ry="11" fill="#1C1014" />
        <circle cx="47" cy="44" r="3.5" fill="#FFFFFF" />
        <circle cx="53" cy="52" r="1.5" fill="#FFFFFF" />

        {/* Big Shiny Black Right Eye */}
        <ellipse cx="90" cy="48" rx="8" ry="11" fill="#1C1014" />
        <circle cx="87" cy="44" r="3.5" fill="#FFFFFF" />
        <circle cx="93" cy="52" r="1.5" fill="#FFFFFF" />

        {/* Soft Rosy Cheeks */}
        <ellipse cx="38" cy="58" rx="6" ry="3.5" fill="#FF5E2C" opacity="0.45" />
        <ellipse cx="102" cy="58" rx="6" ry="3.5" fill="#FF5E2C" opacity="0.45" />

        {/* Cute Smiling Mouth */}
        {mood === 'happy' ? (
          <path
            d="M 62 58 Q 70 66 78 58"
            stroke="#1C1014"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />
        ) : (
          <path
            d="M 64 60 Q 70 63 76 60"
            stroke="#1C1014"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        )}
      </svg>
    </div>
  );
}
