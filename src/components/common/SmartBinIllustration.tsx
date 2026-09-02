import React from 'react';

export const SmartBinIllustration: React.FC<{ className?: string }> = ({ className = 'w-48 h-48' }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Soft Blue Cloud Backdrop */}
      <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-2xl transform scale-110"></div>

      {/* Main SVG Vector of Illustrated SmartBin */}
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full relative z-10 drop-shadow-xl">
        {/* Soft Background Blob */}
        <path d="M40 100 C20 40 80 10 140 30 C190 50 190 130 150 170 C100 200 40 170 40 100 Z" fill="#D6E4FF" />

        {/* Back Cards / Documents */}
        <rect x="95" y="35" width="60" height="42" rx="6" transform="rotate(18 95 35)" fill="#437EF7" stroke="#00359E" strokeWidth="4" />
        <line x1="108" y1="52" x2="135" y2="61" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
        <line x1="112" y1="62" x2="138" y2="71" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />

        {/* Circular Info Disk Badge */}
        <circle cx="68" cy="65" r="24" fill="#FFFFFF" stroke="#00359E" strokeWidth="4.5" />
        <circle cx="68" cy="55" r="3" fill="#00359E" />
        <line x1="68" y1="62" x2="68" y2="76" stroke="#00359E" strokeWidth="4" strokeLinecap="round" />

        {/* Main Blue Waste Bin Container */}
        <g transform="rotate(-6 100 120)">
          {/* Lid */}
          <rect x="35" y="70" width="105" height="16" rx="6" fill="#437EF7" stroke="#00359E" strokeWidth="4.5" />
          {/* Bin Body */}
          <path d="M42 86 L52 165 C53 172 60 178 68 178 L108 178 C116 178 123 172 124 165 L134 86 Z" fill="#437EF7" stroke="#00359E" strokeWidth="4.5" />
          {/* Vertical Recessed Grooves */}
          <rect x="62" y="102" width="12" height="52" rx="6" fill="#FFFFFF" />
          <rect x="88" y="102" width="12" height="52" rx="6" fill="#FFFFFF" />
        </g>

        {/* ID Card in Front Bottom-Left */}
        <g transform="rotate(8 35 150)">
          <rect x="10" y="130" width="55" height="36" rx="5" fill="#5B93FF" stroke="#00359E" strokeWidth="4" />
          <circle cx="24" cy="148" r="5" fill="#FFFFFF" stroke="#00359E" strokeWidth="2.5" />
          <line x1="34" y1="144" x2="52" y2="144" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="34" y1="152" x2="46" y2="152" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
};
