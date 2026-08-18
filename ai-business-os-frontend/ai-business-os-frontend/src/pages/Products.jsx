import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import '../styles/page.css';

const EMPTY = { name: '', sku: '', category: '', price: '', stock_qty: '', low_stock_threshold: '5' };
const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function Products() {
  const { user } = useAuth();
  const location = useLocation();
  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(location.state?.query || '');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.get('/api/products').then((r) => setProducts(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q)
    );
  }, [products, query]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setError(''); setModalOpen(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ name: p.name, sku: p.sku || '', category: p.category || '', price: p.price, stock_qty: p.stock_qty, low_stock_threshold: p.low_stock_threshold });
    setError('');
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      name: form.name,
      sku: form.sku,
      category: form.category,
      price: parseFloat(form.price),
      stock_qty: parseInt(form.stock_qty, 10) || 0,
      low_stock_threshold: parseInt(form.low_stock_threshold, 10) || 5
    };
    try {
      if (editing) {
        await api.put(`/api/products/${editing.id}`, payload);
      } else {
        await api.post('/api/products', payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save product');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p) => {
    if (!confirm(`Remove ${p.name} from inventory?`)) return;
    await api.delete(`/api/products/${p.id}`);
    load();
  };

  return (
    <Layout title="Inventory" subtitle={`${products.length} products in catalog`}>
      <div className="toolbar">
        <div className="toolbar-search">
          <Search size={16} />
          <input placeholder="Search name, SKU, or category" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={16} /> Add product
          </button>
        )}
      </div>

      <div className="glass table-wrap">
        {loading ? (
          <div className="spinner-wrap">Loading inventory…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <h4>No products found</h4>
            <p>{query ? 'Try a different search.' : 'Add your first product to start tracking stock.'}</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const low = p.stock_qty <= p.low_stock_threshold;
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td className="mono">{p.sku || '—'}</td>
                    <td>{p.category || '—'}</td>
                    <td className="mono">{money(p.price)}</td>
                    <td>
                      <span className={`badge ${low ? 'badge-amber' : 'badge-teal'}`}>
                        {low && <AlertTriangle size={11} />} {p.stock_qty}
                      </span>
                    </td>
                    <td>
                      {canManage && (
                        <div className="row-actions">
                          <button className="btn btn-icon btn-sm" onClick={() => openEdit(p)} aria-label="Edit"><Pencil size={14} /></button>
                          <button className="btn btn-icon btn-sm btn-danger" onClick={() => remove(p)} aria-label="Delete"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Edit product' : 'Add product'} onClose={() => setModalOpen(false)}>
          <form onSubmit={submit} className="modal-body">
            <div className="field">
              <label>Name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="field">
                <label>SKU (optional)</label>
                <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
              <div className="field">
                <label>Category (optional)</label>
                <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Price (₹)</label>
                <input required type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="field">
                <label>Stock quantity</label>
                <input required type="number" min="0" value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Low-stock threshold</label>
              <input type="number" min="0" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} />
            </div>
            {error && <p className="auth-error">{error}</p>}
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save product'}</button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
