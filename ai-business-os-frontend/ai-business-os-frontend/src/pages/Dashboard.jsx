import { useEffect, useState } from 'react';
import { Users, Package, Wallet, AlertTriangle, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import '../styles/page.css';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [predictLoading, setPredictLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, d, t] = await Promise.all([
          api.get('/api/analytics/summary'),
          api.get('/api/analytics/daily?days=14'),
          api.get('/api/analytics/top-products?limit=5')
        ]);
        setSummary(s.data);
        setDaily(
          d.data.map((row) => ({
            ...row,
            day: new Date(row.day).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
          }))
        );
        setTopProducts(t.data);
      } finally {
        setLoading(false);
      }
    })();

    api.get('/api/analytics/predict').then((r) => setPrediction(r.data)).finally(() => setPredictLoading(false));
  }, []);

  const trendIcon =
    prediction?.trend === 'up' ? (
      <TrendingUp size={16} />
    ) : prediction?.trend === 'down' ? (
      <TrendingDown size={16} />
    ) : (
      <Minus size={16} />
    );

  return (
    <Layout title={`Welcome back, ${user?.name?.split(' ')[0] || ''}`} subtitle="Here's how the business looks today">
      {loading ? (
        <div className="spinner-wrap">Loading dashboard…</div>
      ) : (
        <>
          <div className="stat-grid">
            <StatCard label="Today's revenue" value={money(summary.today_revenue)} icon={Wallet} tone="indigo" hint={`${summary.today_sales_count} sales today`} />
            <StatCard label="Customers" value={summary.total_customers} icon={Users} tone="teal" />
            <StatCard label="Products in catalog" value={summary.total_products} icon={Package} tone="teal" />
            <StatCard label="Low stock alerts" value={summary.low_stock_count} icon={AlertTriangle} tone="amber" hint={summary.low_stock_count > 0 ? 'Needs attention' : 'All stocked'} />
          </div>

          <div className="grid-2">
            <div className="glass panel">
              <div className="panel-head">
                <h3>Revenue — last 14 days</h3>
                <span className="badge badge-indigo">{money(summary.last_30_days_revenue)} / 30d</span>
              </div>
              {daily.length === 0 ? (
                <div className="empty-state">
                  <h4>No sales yet</h4>
                  <p>Create your first sale to see revenue trends here.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={daily}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7C7FF2" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#7C7FF2" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,160,0.15)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#5B6478' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#5B6478' }} axisLine={false} tickLine={false} width={50} />
                    <Tooltip
                      contentStyle={{ borderRadius: 10, border: '1px solid rgba(120,120,160,0.2)', fontSize: 12.5 }}
                      formatter={(v) => [money(v), 'Revenue']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#7C7FF2" strokeWidth={2.5} fill="url(#rev)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="glass panel">
              <div className="panel-head">
                <h3>Top products</h3>
              </div>
              {topProducts.length === 0 ? (
                <div className="empty-state"><p>No sales recorded yet.</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {topProducts.map((p, i) => (
                    <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="badge badge-indigo" style={{ width: 22, justifyContent: 'center' }}>{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13.5, fontWeight: 600 }}>{p.name}</p>
                        <p style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{p.units_sold} units sold</p>
                      </div>
                      <p className="mono" style={{ fontSize: 13.5, fontWeight: 600 }}>{money(p.revenue)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="glass panel">
            <div className="panel-head">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={16} color="var(--accent-indigo)" /> AI sales forecast
              </h3>
              {prediction?.trend && prediction.trend !== 'unknown' && (
                <span className={`badge ${prediction.trend === 'up' ? 'badge-teal' : prediction.trend === 'down' ? 'badge-rose' : 'badge-indigo'}`}>
                  {trendIcon} {prediction.trend}
                </span>
              )}
            </div>
            {predictLoading ? (
              <p style={{ color: 'var(--ink-faint)', fontSize: 13.5 }}>Analyzing recent sales history…</p>
            ) : prediction?.predictedTotal != null ? (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, flexWrap: 'wrap' }}>
                <p className="mono" style={{ fontSize: 30, fontWeight: 700, color: 'var(--accent-indigo)' }}>
                  {money(prediction.predictedTotal)}
                </p>
                <p style={{ fontSize: 13.5, color: 'var(--ink-muted)', maxWidth: 440, paddingBottom: 4 }}>
                  {prediction.explanation}
                </p>
              </div>
            ) : (
              <p style={{ fontSize: 13.5, color: 'var(--ink-muted)' }}>
                {prediction?.explanation || 'Not enough sales history yet to forecast.'}
              </p>
            )}
          </div>
        </>
      )}
    </Layout>
  );
}
