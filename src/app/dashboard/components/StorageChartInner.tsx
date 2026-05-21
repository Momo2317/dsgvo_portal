'use client';

import React from 'react';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
} from 'recharts';

interface Props {
  percentage: number;
}

export default function StorageChartInner({ percentage }: Props) {
  const usedValue = Math.max(0, Math.min(100, percentage));

  const data = [
    { name: 'Genutzt', value: usedValue, fill: 'var(--primary)' },
  ];

  return (
    <div className="relative h-36">
      {/* Background ring — same thickness as the bar */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <div
          className="rounded-full"
          style={{
            width: '108px',
            height: '108px',
            border: '10px solid var(--muted)',
          }}
        />
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="60%"
          outerRadius="90%"
          barSize={10}
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar
            dataKey="value"
            cornerRadius={5}
            background={false}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <span className="text-xl font-bold text-foreground tabular-nums">
            {percentage}%
          </span>
        </div>
      </div>
    </div>
  );
}