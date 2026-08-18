import { useEffect, useState, useMemo } from 'react';
import { Search, Plus, Pencil, Trash2, Star } from 'lucide-react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import '../styles/page.css';

const EMPTY = { name: '', phone: '', email: '', address: '' };

export default function Customers() {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.get('/api/customers').then((r) => setCustomers(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email || '').toLowerCase().includes(q));
  }, [customers, query]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setError(''); setModalOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, phone: c.phone, email: c.email || '', address: c.address || '' }); setError(''); setModalOpen(true); };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await api.put(`/api/customers/${editing.id}`, { ...form, loyalty_points: editing.loyalty_points });
      } else {
        await api.post('/api/customers', form);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save customer');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c) => {
    if (!confirm(`Remove ${c.name} from customers?`)) return;
    await api.delete(`/api/customers/${c.id}`);
    load();
  };

  return (
    <Layout title="Customers" subtitle={`${customers.length} on file`}>
      <div className="toolbar">
        <div className="toolbar-search">
          <Search size={16} />
          <input placeholder="Search name, phone, or email" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={16} /> Add customer
        </button>
      </div>

      <div className="glass table-wrap">
        {loading ? (
          <div className="spinner-wrap">Loading customers…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <h4>No customers found</h4>
            <p>{query ? 'Try a different search.' : 'Add your first customer to start tracking loyalty and sales.'}</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Loyalty</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td className="mono">{c.phone}</td>
                  <td>{c.email || '—'}</td>
                  <td>
                    <span className="badge badge-amber"><Star size={11} /> {c.loyalty_points}</span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-icon btn-sm" onClick={() => openEdit(c)} aria-label="Edit"><Pencil size={14} /></button>
                      {canManage && (
                        <button className="btn btn-icon btn-sm btn-danger" onClick={() => remove(c)} aria-label="Delete"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Edit customer' : 'Add customer'} onClose={() => setModalOpen(false)}>
          <form onSubmit={submit} className="modal-body">
            <div className="field">
              <label>Name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="field">
              <label>Email (optional)</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="field">
              <label>Address (optional)</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            {error && <p className="auth-error">{error}</p>}
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save customer'}</button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
