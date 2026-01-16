
import React, { useState } from 'react';

interface BrazilMapProps {
  data: Record<string, number>; // { SP: 1000, RJ: 500 }
  labelFormatter?: (value: number) => string;
  metricName?: string;
}

// Simple path data for Brazil states (Simplified for performance/code size)
const STATE_PATHS: Record<string, string> = {
  AC: "M75.1,215.4l19.6-6.5l26.1,10.9l-2.2,15.3l-37,6.5L75.1,215.4z",
  AL: "M542.5,198.2l8.7,2.2l-2.2,8.7l-8.7-2.2L542.5,198.2z",
  AP: "M368.1,45.8l26.1,4.4l6.5,21.8l-19.6,13.1L368.1,45.8z",
  AM: "M94.7,117.7l126.3-17.4l56.6,39.2l-37,58.8H151.3L94.7,117.7z",
  BA: "M435.6,200.4l69.7-15.3l28.3,37l-58.8,50.1L435.6,200.4z",
  CE: "M485.7,98.1l39.2,4.4l6.5,23.9l-37,13.1L485.7,98.1z",
  DF: "M405.1,263.6l8.7,2.2l-2.2,8.7l-8.7-2.2L405.1,263.6z",
  ES: "M505.3,322.3l21.8,4.4l-4.4,26.1l-21.8-4.4L505.3,322.3z",
  GO: "M359.4,237.4l58.8-6.5l19.6,56.6l-50.1,23.9L359.4,237.4z",
  MA: "M409.5,82.8l50.1,8.7l10.9,61l-47.9,13.1L409.5,82.8z",
  MT: "M276.6,193.8l78.4-13.1l43.6,63.1l-50.1,50.1L276.6,193.8z",
  MS: "M294,311.5l61-4.4l19.6,61l-56.6,21.8L294,311.5z",
  MG: "M418.2,274.5l74-13.1l30.5,50.1l-61,43.6L418.2,274.5z",
  PA: "M281,78.4l78.4-21.8l56.6,39.2l-30.5,74l-69.7-21.8L281,78.4z",
  PB: "M524.9,132.9l32.7,2.2l4.4,15.3l-34.9,6.5L524.9,132.9z",
  PR: "M357.2,383.3l65.3-6.5l15.3,39.2l-61,10.9L357.2,383.3z",
  PE: "M509.7,152.5l45.7-4.4l10.9,15.3l-52.3,6.5L509.7,152.5z",
  PI: "M433.4,115.5l30.5,6.5l10.9,63.1l-34.9,13.1L433.4,115.5z",
  RJ: "M483.5,357.2l34.9-4.4l4.4,15.3l-34.9,6.5L483.5,357.2z",
  RN: "M518.4,113.3l32.7-4.4l10.9,17.4l-37,6.5L518.4,113.3z",
  RS: "M342,437.8l61-4.4l21.8,61l-65.3,13.1L342,437.8z",
  RO: "M164.4,226.5l56.6-6.5l26.1,43.6l-50.1,13.1L164.4,226.5z",
  RR: "M179.6,30.5l47.9,8.7l13.1,47.9l-47.9,13.1L179.6,30.5z",
  SC: "M376.8,413.8l56.6-4.4l13.1,30.5l-56.6,13.1L376.8,413.8z",
  SP: "M387.7,344.1l56.6-13.1l30.5,34.9l-50.1,30.5L387.7,344.1z",
  SE: "M536,180.8l15.3,4.4l-4.4,10.9l-13.1-4.4L536,180.8z",
  TO: "M379,159l43.6,6.5l13.1,65.3l-39.2,8.7L379,159z"
};

// Simplified coordinate system for text labels
const STATE_LABELS: Record<string, {x: number, y: number}> = {
  AC: {x: 105, y: 225}, AL: {x: 545, y: 208}, AP: {x: 385, y: 65}, AM: {x: 200, y: 140},
  BA: {x: 480, y: 230}, CE: {x: 502, y: 118}, DF: {x: 410, y: 270}, ES: {x: 515, y: 343},
  GO: {x: 390, y: 270}, MA: {x: 437, y: 125}, MT: {x: 330, y: 240}, MS: {x: 330, y: 353},
  MG: {x: 465, y: 310}, PA: {x: 340, y: 140}, PB: {x: 542, y: 150}, PR: {x: 395, y: 408},
  PE: {x: 532, y: 170}, PI: {x: 452, y: 155}, RJ: {x: 500, y: 366}, RN: {x: 537, y: 128},
  RS: {x: 375, y: 470}, RO: {x: 205, y: 250}, RR: {x: 213, y: 63}, SC: {x: 412, y: 433},
  SP: {x: 430, y: 368}, SE: {x: 540, y: 193}, TO: {x: 400, y: 198}
};

const BrazilMap: React.FC<BrazilMapProps> = ({ data, labelFormatter = (v) => v.toLocaleString(), metricName = 'Valor' }) => {
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  // Calculate min/max for color scale
  const values = Object.values(data) as number[];
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);

  const getColor = (uf: string) => {
    const val = data[uf] || 0;
    // Simple Green Scale
    const intensity = (val - minVal) / (maxVal - minVal);
    
    // Using HSL for easier gradient: Green is approx 140 hue. Lightness from 90% (light) to 30% (dark)
    const lightness = 90 - (intensity * 60); 
    
    // If no data, return gray
    if (val === 0) return 'fill-gray-200 dark:fill-gray-800';
    
    return `hsl(142, 70%, ${lightness}%)`; 
  };

  return (
    <div className="relative w-full h-full min-h-[400px] flex items-center justify-center">
      <svg viewBox="0 0 600 550" className="w-full h-full max-w-[600px] drop-shadow-xl">
        {Object.keys(STATE_PATHS).map((uf) => (
          <g key={uf} 
             onMouseEnter={() => setHoveredState(uf)}
             onMouseLeave={() => setHoveredState(null)}
             className="cursor-pointer transition-all duration-300 hover:brightness-110 hover:-translate-y-1"
          >
            <path
              d={STATE_PATHS[uf]}
              fill={data[uf] ? undefined : 'currentColor'} // Use inline style for dynamic color, class for fallback
              style={{ fill: data[uf] ? getColor(uf) : undefined }}
              stroke="white"
              strokeWidth={1.5}
              className={`transition-colors duration-500 ${!data[uf] ? 'text-gray-200 dark:text-gray-800' : ''}`}
            />
          </g>
        ))}
        
        {/* Labels Layer (Pointer events none to not block hover on paths) */}
        {Object.keys(STATE_LABELS).map((uf) => (
           <text
             key={`label-${uf}`}
             x={STATE_LABELS[uf].x}
             y={STATE_LABELS[uf].y}
             textAnchor="middle"
             alignmentBaseline="middle"
             className="text-[8px] font-black fill-gray-600 dark:fill-gray-300 pointer-events-none opacity-80"
           >
             {uf}
           </text>
        ))}
      </svg>

      {/* Floating Tooltip */}
      {hoveredState && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl pointer-events-none animate-in fade-in zoom-in duration-200 z-20 border border-white/10">
           <div className="flex flex-col items-center">
              <span className="text-2xl font-black">{hoveredState}</span>
              <span className="text-xs uppercase font-bold text-gray-400 mb-1">{metricName}</span>
              <span className="text-lg font-bold text-green-400">{labelFormatter(data[hoveredState] || 0)}</span>
           </div>
        </div>
      )}
      
      {/* Legend Scale */}
      <div className="absolute bottom-0 right-0 flex flex-col items-end gap-1 p-4">
          <div className="h-32 w-2 rounded-full bg-gradient-to-t from-[#005720] to-[#E0F2E9] border border-white/20"></div>
          <span className="text-[10px] font-bold text-gray-400">Max</span>
      </div>
    </div>
  );
};

export default BrazilMap;
