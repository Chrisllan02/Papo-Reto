import React from 'react';

interface BrandLogoProps {
  className?: string;
}

const BrandLogo: React.FC<BrandLogoProps> = ({ className = '' }) => (
  <span aria-hidden="true" className={`flex items-center gap-2 md:gap-2.5 ${className}`}>
    <svg viewBox="0 0 64 64" className="h-9 w-9 shrink-0 rounded-[9px] ring-1 ring-white/35" focusable="false">
      <rect width="64" height="64" rx="16" fill="#002776" />
      <path d="M15 18h34a7 7 0 0 1 7 7v14a7 7 0 0 1-7 7H30L18 56v-10h-3a7 7 0 0 1-7-7V25a7 7 0 0 1 7-7Z" fill="#F5F8FC" />
      <path d="M19 28h26M19 36h17" stroke="#009C3B" strokeWidth="5" strokeLinecap="round" />
      <circle cx="48" cy="18" r="8" fill="#FFDF00" />
    </svg>
    <span className="text-lg md:text-xl font-black tracking-tight text-white">
      Papo<span className="text-spring">Reto</span>
    </span>
  </span>
);

export default BrandLogo;
