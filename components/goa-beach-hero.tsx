"use client";

import React from "react";

export function GoaBeachHero() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#F4C93B]/25 bg-gradient-to-b from-[#093823] via-[#062C1B] to-[#041F13] shadow-2xl mb-8">
      {/* Sun glow effect */}
      <div className="absolute left-1/2 top-4 -translate-x-1/2 h-36 w-36 rounded-full bg-[#F4C93B]/20 blur-2xl pointer-events-none" />

      <svg
        className="w-full h-auto max-h-[220px] sm:max-h-[280px] object-cover"
        viewBox="0 0 1200 450"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="sky-grad" x1="600" y1="0" x2="600" y2="250" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0B4228" />
            <stop offset="100%" stopColor="#062C1B" />
          </linearGradient>

          <linearGradient id="sun-grad" x1="600" y1="50" x2="600" y2="210" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFDC65" />
            <stop offset="100%" stopColor="#F4C93B" />
          </linearGradient>

          <linearGradient id="sea-grad" x1="600" y1="210" x2="600" y2="290" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#083821" />
            <stop offset="100%" stopColor="#052617" />
          </linearGradient>

          <linearGradient id="sand-grad" x1="600" y1="290" x2="600" y2="450" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F4F1EA" />
            <stop offset="100%" stopColor="#E5E0D5" />
          </linearGradient>
        </defs>

        {/* Sky Background */}
        <rect width="1200" height="250" fill="url(#sky-grad)" />

        {/* Sun Rays */}
        <g stroke="#F4C93B" strokeWidth="2.5" strokeLinecap="round" opacity="0.8">
          <line x1="600" y1="20" x2="600" y2="50" />
          <line x1="530" y1="35" x2="550" y2="60" />
          <line x1="670" y1="35" x2="650" y2="60" />
          <line x1="470" y1="70" x2="495" y2="90" />
          <line x1="730" y1="70" x2="705" y2="90" />
          <line x1="430" y1="120" x2="460" y2="130" />
          <line x1="770" y1="120" x2="740" y2="130" />
        </g>

        {/* Big Yellow Sun */}
        <circle cx="600" cy="150" r="80" fill="url(#sun-grad)" />

        {/* Goa Hills Silhouette */}
        <path
          d="M 0 220 Q 200 170, 400 210 T 800 200 T 1200 215 L 1200 250 L 0 250 Z"
          fill="#062C1B"
          opacity="0.9"
        />
        <path
          d="M 0 230 Q 150 195, 350 225 T 750 215 T 1200 230 L 1200 250 L 0 250 Z"
          fill="#093823"
        />

        {/* Ocean Sea */}
        <rect y="235" width="1200" height="55" fill="url(#sea-grad)" />

        {/* Wave lines */}
        <g stroke="#F4C93B" strokeWidth="1.5" opacity="0.4">
          <path d="M 540 255 C 570 250, 630 250, 660 255" />
          <path d="M 520 265 C 560 260, 640 260, 680 265" />
          <path d="M 480 278 C 550 272, 650 272, 720 278" />
        </g>

        {/* Sandy Beach Shore */}
        <path
          d="M 0 285 Q 300 270, 600 280 T 1200 275 L 1200 450 L 0 450 Z"
          fill="url(#sand-grad)"
        />

        {/* Left Beach Huts & Houses */}
        <g transform="translate(40, 290)">
          {/* House 1 */}
          <path d="M 0 80 L 70 30 L 140 80 L 140 160 L 0 160 Z" fill="#062C1B" stroke="#062C1B" strokeWidth="2" />
          <path d="M -10 80 L 70 20 L 150 80" stroke="#F4C93B" strokeWidth="4" fill="none" />
          {/* Windows & Doors */}
          <rect x="25" y="95" width="30" height="45" fill="#F4C93B" />
          <rect x="85" y="95" width="30" height="30" fill="#F4C93B" />
        </g>

        {/* Right Beach Shack "GOA BEACH" */}
        <g transform="translate(760, 240)">
          {/* Shack Structure */}
          <rect x="20" y="50" width="140" height="90" fill="#062C1B" rx="4" />
          <path d="M 10 50 L 90 10 L 170 50 Z" fill="#093823" stroke="#F4C93B" strokeWidth="2" />

          {/* GOA BEACH Pink Sign */}
          <rect x="35" y="25" width="110" height="22" rx="4" fill="#D94F8C" />
          <text x="90" y="40" fill="#FFFFFF" textAnchor="middle" fontFamily="'Space Mono', monospace" fontSize="11" fontWeight="700">
            GOA BEACH
          </text>

          {/* Shack Bar Window */}
          <rect x="35" y="65" width="70" height="40" fill="#F4F1EA" stroke="#062C1B" strokeWidth="2" />
          {/* Bar Stools */}
          <rect x="45" y="110" width="12" height="25" fill="#062C1B" />
          <rect x="75" y="110" width="12" height="25" fill="#062C1B" />
        </g>

        {/* Surfboards leaned near Shack */}
        <g transform="translate(735, 275)">
          <path d="M 0 50 C 0 10, 15 0, 15 0 C 15 0, 30 10, 30 50 Z" fill="#F4C93B" stroke="#062C1B" strokeWidth="2" />
          <line x1="15" y1="5" x2="15" y2="48" stroke="#D94F8C" strokeWidth="2" />
          
          <path d="M 22 55 C 22 15, 37 5, 37 5 C 37 5, 52 15, 52 55 Z" fill="#093823" stroke="#F4C93B" stroke-width="2" />
        </g>

        {/* Beach Umbrellas & Lounge Chairs */}
        <g transform="translate(320, 270)">
          {/* Umbrella 1 */}
          <path d="M 10 35 C 10 15, 50 15, 50 35 Z" fill="#F4C93B" />
          <line x1="30" y1="35" x2="30" y2="70" stroke="#062C1B" strokeWidth="3" />
          <path d="M 20 35 C 20 20, 40 20, 40 35 Z" fill="#062C1B" />
          {/* Chair */}
          <path d="M 45 60 L 75 50 L 85 70" stroke="#062C1B" strokeWidth="3" fill="none" />
        </g>

        <g transform="translate(480, 275)">
          {/* Umbrella 2 */}
          <path d="M 10 35 C 10 15, 50 15, 50 35 Z" fill="#D94F8C" />
          <line x1="30" y1="35" x2="30" y2="70" stroke="#062C1B" strokeWidth="3" />
          <path d="M 20 35 C 20 20, 40 20, 40 35 Z" fill="#F4C93B" />
        </g>

        {/* Left Big Palm Tree */}
        <g transform="translate(20, 60)">
          {/* Trunk */}
          <path d="M 80 340 C 60 200, 110 100, 130 30" stroke="#F4C93B" strokeWidth="14" fill="none" strokeLinecap="round" />
          <path d="M 80 340 C 60 200, 110 100, 130 30" stroke="#062C1B" strokeWidth="8" fill="none" strokeLinecap="round" />

          {/* Palm Fronds */}
          <g stroke="#093823" strokeWidth="4" fill="#0D472D">
            <path d="M 130 30 C 70 0, 10 -10, -20 20 C 30 30, 80 35, 130 30 Z" />
            <path d="M 130 30 C 180 -20, 230 -10, 260 20 C 210 30, 170 35, 130 30 Z" />
            <path d="M 130 30 C 50 40, 10 70, -10 110 C 40 80, 80 60, 130 30 Z" />
            <path d="M 130 30 C 190 40, 230 70, 260 110 C 210 80, 170 60, 130 30 Z" />
            <path d="M 130 30 C 120 -40, 130 -80, 150 -100 C 150 -50, 140 -20, 130 30 Z" />
          </g>
        </g>

        {/* Right Big Palm Tree */}
        <g transform="translate(980, 50)">
          {/* Trunk */}
          <path d="M 80 350 C 110 210, 60 100, 40 30" stroke="#F4C93B" strokeWidth="14" fill="none" strokeLinecap="round" />
          <path d="M 80 350 C 110 210, 60 100, 40 30" stroke="#062C1B" strokeWidth="8" fill="none" strokeLinecap="round" />

          {/* Palm Fronds */}
          <g stroke="#093823" strokeWidth="4" fill="#0D472D">
            <path d="M 40 30 C -20 0, -80 -10, -110 20 C -60 30, -10 35, 40 30 Z" />
            <path d="M 40 30 C 90 -20, 140 -10, 170 20 C 120 30, 80 35, 40 30 Z" />
            <path d="M 40 30 C -40 40, -80 70, -100 110 C -50 80, -10 60, 40 30 Z" />
            <path d="M 40 30 C 100 40, 140 70, 170 110 C 120 80, 80 60, 40 30 Z" />
          </g>
        </g>

        {/* Foreground Telemetry Text Overlay */}
        <g transform="translate(600, 420)">
          <text textAnchor="middle" fill="#062C1B" fontFamily="'Space Mono', monospace" fontSize="13" fontWeight="700" letterSpacing="3">
            WELCOME TO HACKER HOUSE GOA 2026
          </text>
        </g>
      </svg>
    </div>
  );
}
