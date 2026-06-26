/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'emblem' | 'horizontal';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  customHeight?: number | string;
  customWidth?: number | string;
}

export default function Logo({
  className = '',
  variant = 'full',
  size = 'md',
  customHeight,
  customWidth,
}: LogoProps) {
  // Sizing map
  const sizeClasses = {
    sm: variant === 'emblem' ? 'h-9 w-9' : variant === 'horizontal' ? 'h-8 w-auto' : 'h-16 w-auto',
    md: variant === 'emblem' ? 'h-16 w-16' : variant === 'horizontal' ? 'h-12 w-auto' : 'h-28 w-auto',
    lg: variant === 'emblem' ? 'h-28 w-28' : variant === 'horizontal' ? 'h-16 w-auto' : 'h-44 w-auto',
    xl: variant === 'emblem' ? 'h-44 w-44' : variant === 'horizontal' ? 'h-24 w-auto' : 'h-64 w-auto',
    custom: '',
  };

  const selectedSizeClass = sizeClasses[size];
  const widthVal = size === 'custom' ? customWidth : undefined;
  const heightVal = size === 'custom' ? customHeight : undefined;

  // Modern corporate colors and filters to match the premium "COMPLIANCE LINK" 3D look
  const renderDefs = () => (
    <defs>
      {/* Metallic Silver/Titanium Gradient for C */}
      <linearGradient id="gradC" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1e293b" />
        <stop offset="30%" stopColor="#cbd5e1" />
        <stop offset="50%" stopColor="#64748b" />
        <stop offset="75%" stopColor="#e2e8f0" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>

      {/* Cybernetic Matte Bevel for C */}
      <linearGradient id="gradCBevel" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
        <stop offset="30%" stopColor="#94a3b8" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.95" />
      </linearGradient>

      {/* Crimson Metallic 3D Gradients for L */}
      <linearGradient id="gradCrimsonL" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f43f5e" />
        <stop offset="40%" stopColor="#dc2626" />
        <stop offset="70%" stopColor="#991b1b" />
        <stop offset="100%" stopColor="#4c0519" />
      </linearGradient>

      {/* Metallic L Bevel Overlay */}
      <linearGradient id="gradLBevel" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#ffe4e6" stopOpacity="0.75" />
        <stop offset="50%" stopColor="#fda4af" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#4c0519" stopOpacity="0.95" />
      </linearGradient>

      {/* Brilliant Fire Flame Gradients */}
      <linearGradient id="gradFlameRed" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#991b1b" />
        <stop offset="70%" stopColor="#dc2626" />
        <stop offset="100%" stopColor="#ef4444" />
      </linearGradient>

      <linearGradient id="gradFlameOrange" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#ea580c" />
        <stop offset="60%" stopColor="#f97316" />
        <stop offset="100%" stopColor="#fb923c" />
      </linearGradient>

      <linearGradient id="gradFlameGold" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#ca8a04" />
        <stop offset="50%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#fef08a" />
      </linearGradient>

      {/* Silver Metallic Text Gradient for SVG text */}
      <linearGradient id="gradTextMetal" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="35%" stopColor="#f1f5f9" />
        <stop offset="50%" stopColor="#cbd5e1" />
        <stop offset="65%" stopColor="#f8fafc" />
        <stop offset="100%" stopColor="#475569" />
      </linearGradient>

      {/* Glowing Drop Shadow filter */}
      <filter id="premiumShadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#020617" floodOpacity="0.45" />
      </filter>

      {/* Intense Internal Fire Glow */}
      <filter id="flameGlow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="8" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
  );

  // High-fidelity vector rendition of the "COMPLIANCE LINK" emblem: Interlocking C & L with center flame
  const renderEmblem = () => (
    <g filter="url(#premiumShadow)">
      {/* 1. Fire Flame Back-Aura for depth */}
      <path
        d="M 100 135 C 75 135, 50 110, 50 82 C 50 48, 80 32, 100 5 C 120 32, 150 48, 150 82 C 150 110, 125 135, 100 135 Z"
        fill="url(#gradFlameRed)"
        opacity="0.25"
        filter="url(#flameGlow)"
      />

      {/* 2. Heavy 3D Metallic "C" Shape (Left Interlock) */}
      {/* Main beveled C body */}
      <path
        d="M 142 50 C 70 20, 25 70, 25 120 C 25 170, 70 220, 142 190 C 158 183, 148 165, 134 169 C 85 186, 52 153, 52 120 C 52 87, 85 54, 134 71 C 148 75, 158 57, 142 50 Z"
        fill="url(#gradC)"
        stroke="#1e293b"
        strokeWidth="1.5"
      />
      {/* Inner Metallic Bevel Highlight */}
      <path
        d="M 142 50 C 70 20, 25 70, 25 120 C 25 170, 70 220, 142 190 C 138 180, 128 174, 118 165 C 75 165, 42 142, 42 120 C 42 98, 75 75, 118 75 C 128 66, 138 60, 142 50 Z"
        fill="url(#gradCBevel)"
        opacity="0.6"
      />

      {/* 3. Glowing Fire Flame Core (Sits dramatically inside C) */}
      {/* Outer Flame body */}
      <path
        d="M 100 136 C 85 136, 70 118, 70 94 C 70 65, 88 48, 100 15 C 112 48, 130 65, 130 94 C 130 118, 115 136, 100 136 Z"
        fill="url(#gradFlameRed)"
        filter="url(#flameGlow)"
        opacity="0.9"
      />
      {/* Mid Flame Core */}
      <path
        d="M 100 136 C 89 136, 78 122, 78 103 C 78 78, 91 63, 100 35 C 109 78, 122 78, 122 103 C 122 122, 111 136, 100 136 Z"
        fill="url(#gradFlameOrange)"
      />
      {/* Inner Hot Gold Flame center */}
      <path
        d="M 100 136 C 93 136, 86 126, 86 112 C 86 94, 94 82, 100 55 C 106 82, 114 94, 114 112 C 114 126, 107 136, 100 136 Z"
        fill="url(#gradFlameGold)"
      />

      {/* 4. Elegant 3D Crimson Red Metallic "L" Shape (Right Interlock) */}
      {/* Dropshadow block under L mapping onto the C background */}
      <path
        d="M 112 48 L 134 48 L 126 126 L 172 126 L 164 148 L 98 148 Z"
        fill="#020617"
        opacity="0.5"
        filter="url(#flameGlow)"
      />
      {/* Main Face of L */}
      <path
        d="M 112 48 L 134 48 L 126 126 L 172 126 L 164 148 L 98 148 Z"
        fill="url(#gradCrimsonL)"
        stroke="#7f1d1d"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Bevel highlight of L */}
      <path
        d="M 112 48 L 121 48 L 115 126 L 161 126 L 157 136 L 102 136 L 108 58 L 112 48 Z"
        fill="url(#gradLBevel)"
        opacity="0.65"
      />
    </g>
  );

  if (variant === 'emblem') {
    return (
      <svg
        id="compliance-link-emblem"
        viewBox="0 0 200 200"
        className={`${selectedSizeClass} ${className}`}
        style={{ width: widthVal, height: heightVal }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {renderDefs()}
        {renderEmblem()}
      </svg>
    );
  }

  if (variant === 'horizontal') {
    return (
      <svg
        id="compliance-link-logo-horizontal"
        viewBox="0 0 740 200"
        className={`${selectedSizeClass} ${className}`}
        style={{ width: widthVal, height: heightVal }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {renderDefs()}
        
        {/* Emblem on the Left */}
        <g transform="translate(10, -5) scale(0.95)">
          {renderEmblem()}
        </g>

        {/* Premium Corporate Text Typography on the right */}
        <g transform="translate(210, 65)">
          {/* COMPLIANCE text with titanium/silver gradient */}
          <text
            x="0"
            y="32"
            fontSize="52"
            fontWeight="900"
            fontFamily="'Inter', -apple-system, sans-serif"
            fill="url(#gradTextMetal)"
            letterSpacing="8"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
          >
            COMPLIANCE
          </text>

          {/* LINK text centered below with flanking metallic lines */}
          <g transform="translate(0, 52)">
            <text
              x="0"
              y="32"
              fontSize="34"
              fontWeight="900"
              fontFamily="'Inter', -apple-system, sans-serif"
              fill="url(#gradCrimsonL)"
              letterSpacing="10"
            >
              LINK
            </text>
            
            {/* Elegant laser-styled crimson line indicator flanking next to the text */}
            <rect
              x="135"
              y="22"
              width="230"
              height="4"
              rx="2"
              fill="url(#gradCrimsonL)"
              opacity="0.95"
            />
          </g>
        </g>
      </svg>
    );
  }

  // Variant "full" (Vertical stacked presentation aligned with the uploaded mock)
  return (
    <div className={`flex flex-col items-center text-center select-none ${className}`}>
      <svg
        id="compliance-link-logo-full"
        viewBox="0 0 200 200"
        className="h-24 w-24 xs:h-28 xs:w-28 md:h-32 md:w-32"
        style={{ width: widthVal, height: heightVal }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {renderDefs()}
        {renderEmblem()}
      </svg>
      
      {/* Brand Text Elements utilizing advanced Tailwind text formatting for maximum 3D reflection aesthetic */}
      <div className="mt-4 flex flex-col items-center">
        {/* COMPLIANCE branding with gorgeous silver/titanium gloss colors */}
        <h2 className="text-2xl xs:text-3xl font-black tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-slate-400 via-slate-100 to-slate-400 drop-shadow-sm uppercase font-sans leading-none">
          COMPLIANCE
        </h2>
        
        {/* LINK with flanking laser styled crimson dividers */}
        <div className="flex items-center gap-3 w-full max-w-[240px] xs:max-w-[280px] mt-2.5">
          <div className="h-[2px] bg-gradient-to-r from-transparent to-[#dc2626] flex-1 rounded-full" />
          <span className="text-xs font-sans font-black text-[#dc2626] tracking-[0.40em] uppercase leading-none pl-1">
            LINK
          </span>
          <div className="h-[2px] bg-gradient-to-l from-transparent to-[#dc2626] flex-1 rounded-full" />
        </div>

        {/* Small official system network subtitle */}
        <span className="text-[9px] font-mono font-bold tracking-[0.16em] uppercase text-slate-400 mt-2 block pointer-events-none">
          Prevention Bureau System Network
        </span>
      </div>
    </div>
  );
}
