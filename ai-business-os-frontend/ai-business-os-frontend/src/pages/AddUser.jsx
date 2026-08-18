import { useState } from 'react';
import { UserPlus2 } from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import '../styles/page.css';

const ROLES = ['staff', 'manager', 'admin'];

export default function AddUser() {
  const { registerUser } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' });
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const user = await registerUser(form.name, form.email, form.password, form.role);
      setStatus({ ok: true, msg: `${user.name} was added as ${user.role}.` });
      setForm({ name: '', email: '', password: '', role: 'staff' });
    } catch (err) {
      setStatus({ ok: false, msg: err.response?.data?.error || 'Could not create user' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout title="Add team member" subtitle="Create staff, manager, or admin accounts">
      <div className="glass panel" style={{ maxWidth: 440 }}>
        <form onSubmit={submit} className="modal-body">
          <div className="field">
            <label>Full name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label>Email</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field">
            <label>Temporary password</label>
            <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="field">
            <label>Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {status && <p className={status.ok ? 'sidebar-brand-sub' : 'auth-error'} style={status.ok ? { color: 'var(--accent-teal)' } : {}}>{status.msg}</p>}
          <button className="btn btn-primary" type="submit" disabled={busy} style={{ justifyContent: 'center' }}>
            <UserPlus2 size={16} /> {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
