import React from "react";

import { classNames } from "../lib/format";

function BrandMark({ className }) {
  return (
    <svg className={className} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="gm-ring-a" x1="18" y1="34" x2="128" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0f766e" />
          <stop offset="1" stopColor="#0891b2" />
        </linearGradient>
        <linearGradient id="gm-ring-b" x1="42" y1="118" x2="144" y2="124" gradientUnits="userSpaceOnUse">
          <stop stopColor="#dc2626" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
        <linearGradient id="gm-arrow" x1="18" y1="112" x2="142" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#16a34a" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      <circle cx="80" cy="80" r="66" fill="white" />
      <path d="M22 90C18 48 46 18 94 18C110 18 124 22 136 30" stroke="url(#gm-ring-a)" strokeWidth="10" strokeLinecap="round" />
      <path d="M138 68C142 110 114 142 68 142C50 142 34 138 22 128" stroke="url(#gm-ring-b)" strokeWidth="10" strokeLinecap="round" />

      <text x="42" y="96" fill="#1D4ED8" fontFamily="Georgia, serif" fontSize="54" fontStyle="italic" fontWeight="700">
        G
      </text>
      <text x="82" y="98" fill="#F59E0B" fontFamily="Georgia, serif" fontSize="54" fontStyle="italic" fontWeight="700">
        A
      </text>

      <path
        d="M16 111C43 118 68 117 92 103C111 92 126 73 143 41"
        stroke="url(#gm-arrow)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M143 41L144 58L129 52" fill="url(#gm-arrow)" />

      <circle cx="70" cy="121" r="11" fill="#F59E0B" fillOpacity="0.15" />
      <path
        d="M64 122C64 118 67 115 71 115C75 115 78 118 78 122C78 126 75 129 71 129C67 129 64 126 64 122Z"
        stroke="#D97706"
        strokeWidth="2.2"
      />
      <path d="M66 122H76M71 116V128" stroke="#D97706" strokeWidth="2.2" strokeLinecap="round" />

      <circle cx="99" cy="121" r="11" fill="#0891B2" fillOpacity="0.15" />
      <rect x="93" y="116" width="12" height="10" rx="3" stroke="#0891B2" strokeWidth="2.2" />
      <path d="M89 119V123M109 119V123M97 111H101" stroke="#0891B2" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default function BrandLogo({ dark = false, compact = false, className = "" }) {
  return (
    <div className={classNames("flex items-center gap-3", className)}>
      <BrandMark className={compact ? "h-11 w-11 shrink-0" : "h-14 w-14 shrink-0"} />
      <div>
        <p
          className={classNames(
            "font-bold tracking-[-0.04em]",
            compact ? "text-[1.35rem] leading-none" : "text-[1.7rem] leading-none",
            dark ? "text-white" : "text-slate-950",
          )}
        >
          Gatemate Learning
        </p>
        <p className={classNames("mt-1 text-[11px] font-semibold uppercase tracking-[0.28em]", dark ? "text-slate-300" : "text-teal-700")}>
          Smart Learning Platform
        </p>
      </div>
    </div>
  );
}
