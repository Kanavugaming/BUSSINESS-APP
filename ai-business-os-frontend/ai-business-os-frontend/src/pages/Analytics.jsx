import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Layout from '../components/Layout';
import api from '../api/client';
import '../styles/page.css';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const RANGES = [7, 14, 30, 60];

export default function Analytics() {
  const [days, setDays] = useState(14);
  const [daily, setDaily] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/api/analytics/daily?days=${days}`),
      api.get('/api/analytics/top-products?limit=8')
    ]).then(([d, t]) => {
      setDaily(d.data.map((row) => ({ ...row, day: new Date(row.day).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) })));
      setTopProducts(t.data);
    }).finally(() => setLoading(false));
  }, [days]);

  const totalRevenue = daily.reduce((s, d) => s + Number(d.revenue || 0), 0);
  const totalSales = daily.reduce((s, d) => s + Number(d.sales_count || 0), 0);

  return (
    <Layout title="Analytics" subtitle="Revenue trends and best sellers">
      <div className="toolbar">
        <div style={{ display: 'flex', gap: 6 }}>
          {RANGES.map((r) => (
            <button key={r} className={`btn btn-sm${days === r ? ' btn-primary' : ''}`} onClick={() => setDays(r)}>
              {r}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="spinner-wrap">Crunching numbers…</div>
      ) : (
        <>
          <div className="stat-grid">
            <div className="glass stat-card tone-indigo" style={{ padding: 18 }}>
              <span className="stat-card-label">Revenue ({days}d)</span>
              <p className="stat-card-value mono">{money(totalRevenue)}</p>
            </div>
            <div className="glass stat-card tone-teal" style={{ padding: 18 }}>
              <span className="stat-card-label">Sales ({days}d)</span>
              <p className="stat-card-value mono">{totalSales}</p>
            </div>
            <div className="glass stat-card tone-amber" style={{ padding: 18 }}>
              <span className="stat-card-label">Avg. sale value</span>
              <p className="stat-card-value mono">{money(totalSales ? totalRevenue / totalSales : 0)}</p>
            </div>
          </div>

          <div className="glass panel">
            <div className="panel-head"><h3>Daily revenue</h3></div>
            {daily.length === 0 ? (
              <div className="empty-state"><p>No sales in this range.</p></div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,160,0.15)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#5B6478' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#5B6478' }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid rgba(120,120,160,0.2)', fontSize: 12.5 }} formatter={(v) => [money(v), 'Revenue']} />
                  <Bar dataKey="revenue" fill="#43C6AC" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="glass panel">
            <div className="panel-head"><h3>Top products (all time)</h3></div>
            {topProducts.length === 0 ? (
              <div className="empty-state"><p>No sales recorded yet.</p></div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Product</th><th>Units sold</th><th>Revenue</th></tr></thead>
                  <tbody>
                    {topProducts.map((p) => (
                      <tr key={p.name}>
                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                        <td>{p.units_sold}</td>
                        <td className="mono">{money(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </Layout>
  );
}
