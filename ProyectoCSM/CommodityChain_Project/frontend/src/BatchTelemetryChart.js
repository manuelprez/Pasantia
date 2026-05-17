import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

const formatHour = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-cyan-500 text-slate-100 p-3 rounded-lg shadow-lg">
      <div className="text-xs text-cyan-300 mb-1">{label}</div>
      <div className="text-sm font-semibold">{payload[0].value} °C</div>
      <div className="text-xs text-slate-400">Sensor reading</div>
    </div>
  );
};

const BatchTelemetryChart = ({ data }) => {
  const chartData = useMemo(
    () =>
      (data || []).map((item) => ({
        ...item,
        time: formatHour(item.timestamp),
      })),
    [data]
  );

  const valueRange = useMemo(() => {
    if (!chartData.length) return [0, 100];
    const values = chartData.map((item) => Number(item.value));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1 || 1;
    return [Math.max(0, min - padding), max + padding];
  }, [chartData]);

  return (
    <div className="w-full h-96 bg-slate-950 rounded-3xl border border-slate-800 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Telemetría del Lote</h3>
          <p className="text-sm text-slate-400">Datos IoT en tiempo real desde sensor_logs</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradientTelemetry" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.08} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#334155" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            domain={valueRange}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${value}°`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#22d3ee', strokeWidth: 2 }} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#22d3ee"
            strokeWidth={3}
            fill="url(#gradientTelemetry)"
            activeDot={{ r: 5, stroke: '#06b6d4', strokeWidth: 2, fill: '#0f172a' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BatchTelemetryChart;
