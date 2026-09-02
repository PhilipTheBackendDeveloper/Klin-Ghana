import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'blue' | 'white';
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', variant = 'blue' }) => {
  const isLg = size === 'lg';
  const isSm = size === 'sm';

  const textColor = variant === 'white' ? 'text-white' : 'text-[#1D70F5]';

  return (
    <div className="flex items-center select-none font-['Outfit',sans-serif]">
      <span className={`font-black tracking-tight ${isLg ? 'text-3xl' : isSm ? 'text-base' : 'text-2xl'} ${textColor}`}>
        KlinGh
      </span>
      {/* Custom SmartBin Icon glyph inside logo */}
      <div className={`inline-flex items-center justify-center mx-0.5 ${isLg ? 'w-6 h-7' : isSm ? 'w-3.5 h-4' : 'w-5 h-6'}`}>
        <svg viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Bin Lid */}
          <rect x="2" y="4" width="20" height="3.5" rx="1.5" fill={variant === 'white' ? '#FFFFFF' : '#1D70F5'} />
          <rect x="7" y="1.5" width="10" height="2" rx="1" fill={variant === 'white' ? '#FFFFFF' : '#1D70F5'} />
          {/* Bin Body */}
          <path d="M4 8.5 L6 24 C6.2 25.5 7.5 26.5 9 26.5 L15 26.5 C16.5 26.5 17.8 25.5 18 24 L20 8.5 Z" fill={variant === 'white' ? '#FFFFFF' : '#1D70F5'} />
          {/* Internal Stripes */}
          <line x1="9" y1="12" x2="9" y2="22" stroke={variant === 'white' ? '#1D70F5' : '#FFFFFF'} strokeWidth="2" strokeLinecap="round" />
          <line x1="15" y1="12" x2="15" y2="22" stroke={variant === 'white' ? '#1D70F5' : '#FFFFFF'} strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <span className={`font-black tracking-tight ${isLg ? 'text-3xl' : isSm ? 'text-base' : 'text-2xl'} ${textColor}`}>
        na
      </span>
    </div>
  );
};
