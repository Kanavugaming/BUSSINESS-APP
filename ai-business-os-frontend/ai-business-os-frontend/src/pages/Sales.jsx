import { useEffect, useState, useMemo } from 'react';
import { Plus, Receipt, Trash2, Sparkles, Search } from 'lucide-react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../api/client';
import '../styles/page.css';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const PAYMENT_MODES = ['cash', 'card', 'upi', 'other'];

function NewSaleModal({ onClose, onCreated }) {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [discount, setDiscount] = useState('0');
  const [cart, setCart] = useState([]); // { product_id, name, price, quantity }
  const [productPick, setProductPick] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/api/customers').then((r) => setCustomers(r.data));
    api.get('/api/products').then((r) => setProducts(r.data));
  }, []);

  const addToCart = () => {
    if (!productPick) return;
    const product = products.find((p) => String(p.id) === productPick);
    if (!product) return;
    setCart((c) => {
      const existing = c.find((i) => i.product_id === product.id);
      if (existing) {
        return c.map((i) => (i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...c, { product_id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
    setProductPick('');
  };

  const updateQty = (id, qty) => {
    setCart((c) => c.map((i) => (i.product_id === id ? { ...i, quantity: Math.max(1, qty) } : i)));
  };

  const removeItem = (id) => setCart((c) => c.filter((i) => i.product_id !== id));

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax = +(subtotal * 0.18).toFixed(2);
  const total = +(subtotal + tax - (parseFloat(discount) || 0)).toFixed(2);

  const submit = async () => {
    if (cart.length === 0) { setError('Add at least one product'); return; }
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/api/sales', {
        customer_id: customerId || null,
        items: cart.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        discount_amount: parseFloat(discount) || 0,
        payment_mode: paymentMode
      });
      onCreated(data.sale.id);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create sale');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="New sale" onClose={onClose} width={560}>
      <div className="form-row">
        <div className="field">
          <label>Customer (optional)</label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Walk-in customer</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Payment mode</label>
          <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
            {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
          </select>
        </div>
      </div>

      <div className="field">
        <label>Add product</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={productPick} onChange={(e) => setProductPick(e.target.value)} style={{ flex: 1 }}>
            <option value="">Select a product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id} disabled={p.stock_qty === 0}>
                {p.name} — {money(p.price)} ({p.stock_qty} in stock)
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-primary" onClick={addToCart}>Add</button>
        </div>
      </div>

      {cart.length > 0 && (
        <div className="table-wrap" style={{ border: '1px solid var(--glass-border)' }}>
          <table className="data-table">
            <thead><tr><th>Item</th><th>Qty</th><th>Total</th><th></th></tr></thead>
            <tbody>
              {cart.map((i) => (
                <tr key={i.product_id}>
                  <td>{i.name}</td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      value={i.quantity}
                      onChange={(e) => updateQty(i.product_id, parseInt(e.target.value, 10) || 1)}
                      style={{ width: 56, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--glass-border)' }}
                    />
                  </td>
                  <td className="mono">{money(i.price * i.quantity)}</td>
                  <td>
                    <button className="btn btn-icon btn-sm btn-danger" onClick={() => removeItem(i.product_id)}><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="field">
        <label>Discount (₹)</label>
        <input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
      </div>

      <div className="glass" style={{ padding: 14, background: 'rgba(124,127,242,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 4 }}>
          <span>Subtotal</span><span className="mono">{money(subtotal)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 4 }}>
          <span>GST (18%)</span><span className="mono">{money(tax)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 8 }}>
          <span>Discount</span><span className="mono">-{money(discount || 0)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 700, borderTop: '1px solid rgba(120,120,160,0.2)', paddingTop: 8 }}>
          <span>Total</span><span className="mono">{money(total)}</span>
        </div>
      </div>

      {error && <p className="auth-error">{error}</p>}

      <div className="modal-actions">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Creating…' : 'Complete sale'}</button>
      </div>
    </Modal>
  );
}

function ReceiptModal({ saleId, onClose }) {
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    api.get(`/api/sales/${saleId}`).then((r) => setDetail(r.data));
  }, [saleId]);

  return (
    <Modal title="Receipt" onClose={onClose} width={480}>
      {!detail ? (
        <p style={{ color: 'var(--ink-faint)' }}>Loading…</p>
      ) : (
        <>
          {detail.sale.ai_summary && (
            <div className="glass" style={{ padding: 12, background: 'rgba(124,127,242,0.07)', display: 'flex', gap: 10 }}>
              <Sparkles size={16} color="var(--accent-indigo)" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 13, color: 'var(--ink)' }}>{detail.sale.ai_summary}</p>
            </div>
          )}
          <pre className="mono" style={{
            whiteSpace: 'pre-wrap', fontSize: 12.5, background: 'rgba(255,255,255,0.5)',
            padding: 14, borderRadius: 10, border: '1px solid var(--glass-border)', lineHeight: 1.6
          }}>
            {detail.receiptText}
          </pre>
        </>
      )}
    </Modal>
  );
}

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [newSaleOpen, setNewSaleOpen] = useState(false);
  const [receiptId, setReceiptId] = useState(null);

  const load = () => api.get('/api/sales').then((r) => setSales(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter((s) => (s.customer_name || 'walk-in').toLowerCase().includes(q) || String(s.id).includes(q));
  }, [sales, query]);

  return (
    <Layout title="Sales & billing" subtitle={`${sales.length} sales recorded`}>
      <div className="toolbar">
        <div className="toolbar-search">
          <Search size={16} />
          <input placeholder="Search by customer or sale #" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={() => setNewSaleOpen(true)}>
          <Plus size={16} /> New sale
        </button>
      </div>

      <div className="glass table-wrap">
        {loading ? (
          <div className="spinner-wrap">Loading sales…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <h4>No sales yet</h4>
            <p>Create your first sale to generate a receipt and AI invoice summary.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>#</th><th>Customer</th><th>Payment</th><th>Total</th><th>Date</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td className="mono">#{s.id}</td>
                  <td>{s.customer_name || 'Walk-in'}</td>
                  <td><span className="badge badge-indigo">{s.payment_mode}</span></td>
                  <td className="mono" style={{ fontWeight: 600 }}>{money(s.total_amount)}</td>
                  <td>{new Date(s.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td>
                    <button className="btn btn-icon btn-sm" onClick={() => setReceiptId(s.id)} aria-label="View receipt">
                      <Receipt size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {newSaleOpen && (
        <NewSaleModal
          onClose={() => setNewSaleOpen(false)}
          onCreated={(id) => { setNewSaleOpen(false); load(); setReceiptId(id); }}
        />
      )}
      {receiptId && <ReceiptModal saleId={receiptId} onClose={() => setReceiptId(null)} />}
    </Layout>
  );
}
