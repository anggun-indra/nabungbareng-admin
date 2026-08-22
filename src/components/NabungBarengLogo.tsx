import React from 'react';

export interface NabungBarengLogoProps {
  size?: number;
  className?: string;
  variant?: 'ayam' | 'bulat';
  primaryColor?: string;
  framed?: boolean;
  withGlow?: boolean;
}

export default function NabungBarengLogo({
  size = 48,
  className = '',
  variant = 'ayam',
  primaryColor = '#2B7FFF',
  framed = false,
  withGlow = false,
}: NabungBarengLogoProps) {
  const isAyam = variant === 'ayam';

  const innerContent = isAyam ? (
    <g id="nabungbareng-celengan-ayam">
      {/* Coin Entering Slot */}
      <circle cx="256" cy="116" r="26" fill="#FFFFFF" />
      <circle cx="256" cy="116" r="16" fill={primaryColor} />

      {/* Coin Slot */}
      <rect x="208" y="142" width="96" height="16" rx="8" fill="#FFFFFF" />

      {/* Feet */}
      <rect x="182" y="390" width="50" height="64" rx="18" fill={primaryColor} />
      <rect x="280" y="390" width="50" height="64" rx="18" fill={primaryColor} />

      {/* Rooster Tail Feathers */}
      <path
        d="M 340 240 C 370 175, 420 115, 462 115 C 478 115, 482 132, 470 152 C 448 190, 398 240, 358 280 Z"
        fill={primaryColor}
      />
      <path
        d="M 350 270 C 390 228, 452 195, 486 205 C 498 210, 498 228, 482 246 C 455 278, 405 310, 358 320 Z"
        fill={primaryColor}
      />
      <path
        d="M 340 310 C 380 298, 442 288, 472 302 C 482 308, 478 322, 462 336 C 430 362, 380 368, 335 358 Z"
        fill={primaryColor}
      />

      {/* Tail Accents */}
      <path
        d="M 368 245 C 410 198, 446 156, 466 136"
        stroke="#FFFFFF"
        strokeWidth="4.5"
        strokeLinecap="round"
        opacity="0.35"
      />
      <path
        d="M 374 285 C 416 252, 456 230, 476 220"
        stroke="#FFFFFF"
        strokeWidth="4.5"
        strokeLinecap="round"
        opacity="0.35"
      />

      {/* Main Central Piggy Body */}
      <circle cx="256" cy="295" r="142" fill={primaryColor} />

      {/* Rooster Head & Neck */}
      <path
        d="M 195 210 C 170 185, 150 165, 135 165 C 118 165, 105 180, 105 200 C 105 224, 125 264, 168 325 Z"
        fill={primaryColor}
      />

      {/* Comb (Jengger) */}
      <circle cx="112" cy="146" r="18" fill={primaryColor} />
      <circle cx="136" cy="126" r="22" fill={primaryColor} />
      <circle cx="166" cy="138" r="18" fill={primaryColor} />

      {/* Beak */}
      <path d="M 108 186 L 62 200 L 108 214 Z" fill={primaryColor} />

      {/* Wattle */}
      <path
        d="M 114 214 C 100 214, 92 228, 96 242 C 100 254, 116 260, 128 250 C 136 242, 136 228, 128 218 Z"
        fill={primaryColor}
      />

      {/* Eye */}
      <circle cx="130" cy="188" r="6.5" fill="#FFFFFF" />

      {/* 'Rp' Center Emblem in Pure White #FFFFFF */}
      <g id="rp-emblem" transform="translate(236, 290) scale(1.05)">
        {/* R (Capital) */}
        <path
          d="M -78 -48 L -26 -48 C -4 -48, 12 -34, 12 -14 C 12 1, 0 14, -16 16 L 14 50 L -12 50 L -36 18 L -54 18 L -54 50 L -78 50 Z M -54 -26 L -54 -4 L -24 -4 C -11 -4, -4 -8, -4 -15 C -4 -22, -11 -26, -24 -26 Z"
          fill="#FFFFFF"
        />
        {/* p (Lowercase) */}
        <path
          d="M 24 -18 L 46 -18 L 46 -5 C 54 -14, 66 -20, 80 -20 C 102 -20, 118 -3, 118 20 C 118 43, 102 60, 80 60 C 66 60, 54 54, 46 45 L 46 72 L 24 72 Z M 46 20 C 46 32, 56 42, 70 42 C 84 42, 94 32, 94 20 C 94 8, 84 -2, 70 -2 C 56 -2, 46 8, 46 20 Z"
          fill="#FFFFFF"
        />
      </g>
    </g>
  ) : (
    <g id="nabungbareng-celengan-bulat">
      {/* Coin Entering Slot */}
      <circle cx="256" cy="98" r="26" fill="#FFFFFF" />
      <circle cx="256" cy="98" r="16" fill={primaryColor} />
      <rect x="208" y="124" width="96" height="16" rx="8" fill="#FFFFFF" />

      {/* Feet */}
      <rect x="182" y="380" width="50" height="64" rx="18" fill={primaryColor} />
      <rect x="280" y="380" width="50" height="64" rx="18" fill={primaryColor} />

      {/* Tail */}
      <path
        d="M 115 285 C 75 270, 55 310, 80 335 C 95 350, 115 330, 100 315 C 92 308, 85 315, 88 322"
        stroke={primaryColor}
        strokeWidth="18"
        strokeLinecap="round"
        fill="none"
      />

      {/* Body */}
      <circle cx="256" cy="285" r="148" fill={primaryColor} />

      {/* Ear */}
      <path
        d="M 320 148 L 368 85 C 376 75, 392 78, 396 90 L 404 135 C 408 148, 400 160, 386 164 Z"
        fill={primaryColor}
      />
      <path
        d="M 345 138 L 374 98 C 378 92, 386 94, 388 100 L 392 128 Z"
        fill="#FFFFFF"
        opacity="0.35"
      />

      {/* Snout */}
      <rect x="382" y="248" width="54" height="74" rx="27" fill={primaryColor} />
      <circle cx="416" cy="272" r="5" fill="#FFFFFF" />
      <circle cx="416" cy="298" r="5" fill="#FFFFFF" />

      {/* Eye */}
      <circle cx="362" cy="215" r="6.5" fill="#FFFFFF" />

      {/* 'Rp' Center Emblem */}
      <g id="rp-emblem" transform="translate(236, 280) scale(1.05)">
        <path
          d="M -78 -48 L -26 -48 C -4 -48, 12 -34, 12 -14 C 12 1, 0 14, -16 16 L 14 50 L -12 50 L -36 18 L -54 18 L -54 50 L -78 50 Z M -54 -26 L -54 -4 L -24 -4 C -11 -4, -4 -8, -4 -15 C -4 -22, -11 -26, -24 -26 Z"
          fill="#FFFFFF"
        />
        <path
          d="M 24 -18 L 46 -18 L 46 -5 C 54 -14, 66 -20, 80 -20 C 102 -20, 118 -3, 118 20 C 118 43, 102 60, 80 60 C 66 60, 54 54, 46 45 L 46 72 L 24 72 Z M 46 20 C 46 32, 56 42, 70 42 C 84 42, 94 32, 94 20 C 94 8, 84 -2, 70 -2 C 56 -2, 46 8, 46 20 Z"
          fill="#FFFFFF"
        />
      </g>
    </g>
  );

  if (framed) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
        width={size}
        height={size}
        className={className}
        fill="none"
      >
        <defs>
          <linearGradient id="adminSquircleBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#080D1A" />
            <stop offset="50%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#1E293B" />
          </linearGradient>
          <radialGradient id="adminElectricAtmosphere" cx="50%" cy="52%" r="50%">
            <stop offset="0%" stopColor={primaryColor} stopOpacity="0.35" />
            <stop offset="100%" stopColor={primaryColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="512" height="512" rx="116" fill="url(#adminSquircleBg)" />
        {withGlow && <circle cx="256" cy="270" r="185" fill="url(#adminElectricAtmosphere)" />}
        <g transform="translate(18, 10) scale(0.93)">{innerContent}</g>
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      fill="none"
    >
      {innerContent}
    </svg>
  );
}
