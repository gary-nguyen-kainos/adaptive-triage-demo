import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Distribution } from '../model/network';

export const percent = (p: number) => `${(p * 100).toFixed(p > 0 && p < 0.01 ? 2 : 1)}%`;

export function DistributionChart({ labels, prior, posterior, compact = false }: {
  labels: readonly string[]; prior: Distribution; posterior: Distribution; compact?: boolean;
}) {
  const data = labels.map((state, i) => ({ state, Prior: prior[i] * 100, Current: posterior[i] * 100 }));
  return (
    <div className={`distribution-chart ${compact ? 'compact' : ''}`}>
      <ResponsiveContainer width="100%" height={compact ? 76 : labels.length * 36 + 18} minWidth={1}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 8, top: 2, bottom: 0 }} barGap={2}>
          {!compact && <CartesianGrid horizontal={false} stroke="#e7edec" strokeDasharray="3 3" />}
          <XAxis type="number" domain={[0, 100]} hide={compact} tickFormatter={value => `${value}%`} tick={{ fontSize: 10, fill: '#75847e' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="state" width={compact ? 0 : 116} hide={compact} tick={{ fontSize: 11, fill: '#425655' }} axisLine={false} tickLine={false} />
          <Tooltip formatter={value => `${Number(value).toFixed(2)}% (synthetic)`} cursor={{ fill: '#f0f5f3' }} />
          <Bar dataKey="Prior" fill="#c7d7d3" radius={[0, 3, 3, 0]} barSize={compact ? 7 : 6} isAnimationActive={false} />
          <Bar dataKey="Current" fill="#14796f" radius={[0, 3, 3, 0]} barSize={compact ? 10 : 10} animationDuration={450} />
        </BarChart>
      </ResponsiveContainer>
      <table className="sr-only">
        <caption>Synthetic probability distribution</caption>
        <thead><tr><th>State</th><th>Prior</th><th>Current</th></tr></thead>
        <tbody>{labels.map((state, i) => <tr key={state}><th>{state}</th><td>{percent(prior[i])}</td><td>{percent(posterior[i])}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
