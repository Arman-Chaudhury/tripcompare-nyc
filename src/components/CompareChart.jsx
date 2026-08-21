import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, ErrorBar } from 'recharts';

export default function CompareChart({ options, t }) {
  const data = options.map((o) => ({
    name: o.name,
    time: o.timeMid,
    cost: o.costMid,
    timeErr: [o.timeMid - o.time[0], o.time[1] - o.timeMid],
    costErr: [o.costMid - o.cost[0], o.cost[1] - o.costMid],
  }));
  return (
    <section className="panel chart" aria-label={t('chart')}>
      <h2 className="h2">{t('chart')}</h2>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: -8 }}>
            <XAxis type="number" dataKey="time" name="min" unit=" min" tick={{ fontSize: 12 }} stroke="currentColor" />
            <YAxis type="number" dataKey="cost" name="$" unit="$" tick={{ fontSize: 12 }} stroke="currentColor" />
            <ZAxis range={[80, 80]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ payload }) =>
                payload?.length ? (
                  <div className="tip-box">
                    <strong>{payload[0].payload.name}</strong>
                    <div>~{Math.round(payload[0].payload.time)} min · ~${Math.round(payload[0].payload.cost)}</div>
                  </div>
                ) : null
              }
            />
            <Scatter data={data} fill="var(--accent)">
              <ErrorBar dataKey="timeErr" direction="x" width={3} strokeWidth={1.5} stroke="var(--muted)" />
              <ErrorBar dataKey="costErr" direction="y" width={3} strokeWidth={1.5} stroke="var(--muted)" />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="muted small">Bars show the full cost and time range for each option.</p>
    </section>
  );
}
