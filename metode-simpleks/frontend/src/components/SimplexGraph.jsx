import React from 'react';

export default function SimplexGraph({ graphData, optimalPoint }) {
  if (!graphData) return null;

  const { feasible_polygon, constraint_lines, x_limit, y_limit } = graphData;

  // SVG parameters
  const svgWidth = 500;
  const svgHeight = 500;
  const padding = 50;

  // Mapping functions: LP coordinates to SVG coordinates
  const mapX = (x) => {
    return padding + (x / x_limit) * (svgWidth - 2 * padding);
  };

  const mapY = (y) => {
    return (svgHeight - padding) - (y / y_limit) * (svgHeight - 2 * padding);
  };

  // Generate grid ticks
  const generateTicks = (limit) => {
    const ticks = [];
    const step = limit / 5;
    for (let i = 0; i <= 5; i++) {
      ticks.push(i * step);
    }
    return ticks;
  };

  const xTicks = generateTicks(x_limit);
  const yTicks = generateTicks(y_limit);

  // Construct SVG polygon points string
  const polygonPointsStr = feasible_polygon && feasible_polygon.length > 0
    ? feasible_polygon.map(pt => `${mapX(pt.x)},${mapY(pt.y)}`).join(' ')
    : '';

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-full max-w-[480px] aspect-square bg-[#ffffff] rounded-xl border border-black/5 p-2 shadow-sm">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full select-none"
        >
          {/* Grid lines */}
          {xTicks.map((tick, i) => (
            <line
              key={`grid-x-${i}`}
              x1={mapX(tick)}
              y1={padding}
              x2={mapX(tick)}
              y2={svgHeight - padding}
              stroke="rgba(62, 39, 35, 0.03)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}
          {yTicks.map((tick, i) => (
            <line
              key={`grid-y-${i}`}
              x1={padding}
              y1={mapY(tick)}
              x2={svgWidth - padding}
              y2={mapY(tick)}
              stroke="rgba(62, 39, 35, 0.03)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}

          {/* Feasible Region Polygon */}
          {polygonPointsStr && (
            <polygon
              points={polygonPointsStr}
              fill="rgba(204, 111, 87, 0.15)"
              stroke="rgba(204, 111, 87, 0.6)"
              strokeWidth="2.5"
              strokeDasharray="3 3"
              className="transition-all duration-500 ease-in-out"
            />
          )}

          {/* Axes */}
          {/* X Axis */}
          <line
            x1={padding}
            y1={svgHeight - padding}
            x2={svgWidth - padding + 10}
            y2={svgHeight - padding}
            stroke="rgba(62, 39, 35, 0.4)"
            strokeWidth="2"
          />
          {/* Y Axis */}
          <line
            x1={padding}
            y1={padding - 10}
            x2={padding}
            y2={svgHeight - padding}
            stroke="rgba(62, 39, 35, 0.4)"
            strokeWidth="2"
          />

          {/* Axis Ticks and Labels */}
          {/* X Ticks */}
          {xTicks.map((tick, i) => (
            <g key={`tick-x-${i}`}>
              <line
                x1={mapX(tick)}
                y1={svgHeight - padding}
                x2={mapX(tick)}
                y2={svgHeight - padding + 5}
                stroke="rgba(62, 39, 35, 0.4)"
                strokeWidth="1.5"
              />
              <text
                x={mapX(tick)}
                y={svgHeight - padding + 20}
                fill="#8E7A75"
                fontSize="11"
                textAnchor="middle"
                fontWeight="500"
              >
                {tick.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Y Ticks */}
          {yTicks.map((tick, i) => (
            <g key={`tick-y-${i}`}>
              <line
                x1={padding - 5}
                y1={mapY(tick)}
                x2={padding}
                y2={mapY(tick)}
                stroke="rgba(62, 39, 35, 0.4)"
                strokeWidth="1.5"
              />
              <text
                x={padding - 12}
                y={mapY(tick) + 4}
                fill="#8E7A75"
                fontSize="11"
                textAnchor="end"
                fontWeight="500"
              >
                {tick.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Axis Titles */}
          <text
            x={svgWidth - padding + 15}
            y={svgHeight - padding + 4}
            fill="#3E2723"
            fontSize="12"
            fontWeight="bold"
            textAnchor="start"
          >
            x1
          </text>
          <text
            x={padding}
            y={padding - 18}
            fill="#3E2723"
            fontSize="12"
            fontWeight="bold"
            textAnchor="middle"
          >
            x2
          </text>

          {/* Constraint Lines */}
          {constraint_lines.map((line, idx) => {
            const pts = line.points;
            if (pts.length < 2) return null;
            return (
              <g key={line.id}>
                <line
                  x1={mapX(pts[0].x)}
                  y1={mapY(pts[0].y)}
                  x2={mapX(pts[1].x)}
                  y2={mapY(pts[1].y)}
                  stroke={
                    idx === 0 ? '#4f46e5' :
                    idx === 1 ? '#CC6F57' :
                    idx === 2 ? '#E3A38F' :
                    idx === 3 ? '#a855f7' : '#ec4899'
                  }
                  strokeWidth="2.5"
                  opacity="0.85"
                />
              </g>
            );
          })}

          {/* Optimal Point Indicator */}
          {optimalPoint && !isNaN(optimalPoint.x) && !isNaN(optimalPoint.y) && (
            <g>
              {/* Outer pulsing glow */}
              <circle
                cx={mapX(optimalPoint.x)}
                cy={mapY(optimalPoint.y)}
                r="12"
                fill="rgba(204, 111, 87, 0.15)"
                stroke="#CC6F57"
                strokeWidth="1.5"
              >
                <animate
                  attributeName="r"
                  values="8;16;8"
                  dur="2.5s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.9;0.2;0.9"
                  dur="2.5s"
                  repeatCount="indefinite"
                />
              </circle>
              {/* Main point */}
              <circle
                cx={mapX(optimalPoint.x)}
                cy={mapY(optimalPoint.y)}
                r="6"
                fill="#CC6F57"
                stroke="#ffffff"
                strokeWidth="2.5"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs text-slate-500 max-w-[480px]">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3 bg-[#CC6F57]/10 border border-[#CC6F57]/40 rounded"></span>
          <span>Area Layak (Feasible Region)</span>
        </div>
        {optimalPoint && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-[#CC6F57] border border-white rounded-full"></span>
            <span>Titik Optimal ({optimalPoint.x.toFixed(2)}, {optimalPoint.y.toFixed(2)})</span>
          </div>
        )}
        {constraint_lines.map((line, idx) => {
          const color = 
            idx === 0 ? 'bg-indigo-500' :
            idx === 1 ? 'bg-[#CC6F57]' :
            idx === 2 ? 'bg-[#E3A38F]' :
            idx === 3 ? 'bg-purple-500' : 'bg-pink-500';
          return (
            <div className="flex items-center gap-1.5" key={line.id}>
              <span className={`w-3 h-0.5 ${color}`}></span>
              <span>{line.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
