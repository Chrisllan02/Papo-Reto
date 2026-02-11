import React from 'react';

interface BrazilMapProps {
  data?: Record<string, number>;
  selectedState?: string;
  onSelectState?: (uf: string) => void;
  heatmapMode?: boolean;
}

const BrazilMap: React.FC<BrazilMapProps> = ({
  data,
  selectedState,
  onSelectState,
  heatmapMode = false,
}) => {
  return (
    <div className="w-full h-full">
      <svg
        viewBox="0 0 612 650"
        role="img"
        aria-label="Mapa do Brasil"
        className="w-full h-full"
      >
        <rect width="100%" height="100%" fill="transparent" />
        <text x="50%" y="50%" textAnchor="middle" className="fill-current text-gray-400" fontSize="14">
          Mapa em manutenção
        </text>
      </svg>
    </div>
  );
};

export default BrazilMap;