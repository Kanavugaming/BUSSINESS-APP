import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, LogIn, UserPlus2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './auth.css';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login, registerFirstAdmin } = useAuth();
  const navigate = useNavigate();

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await registerFirstAdmin(form.name, form.email, form.password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.error ||
          (mode === 'register'
            ? 'Registration failed — if a workspace already exists, ask an admin to add you instead.'
            : 'Invalid email or password')
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-shell auth-shell">
      <div className="blob blob--1" />
      <div className="blob blob--2" />
      <div className="auth-card glass-strong">
        <div className="auth-brand">
          <span className="sidebar-brand-mark">
            <Sparkles size={20} />
          </span>
          <div>
            <h3>AI Business OS</h3>
            <p className="sidebar-brand-sub">Run your shop with an AI co-pilot</p>
          </div>
        </div>

        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            Log in
          </button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
            First-time setup
          </button>
        </div>

        <form onSubmit={submit} className="auth-form">
          {mode === 'register' && (
            <div className="field">
              <label>Your name</label>
              <input required value={form.name} onChange={update('name')} placeholder="Jeishu Anand" />
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input required type="email" value={form.email} onChange={update('email')} placeholder="you@business.com" />
          </div>
          <div className="field">
            <label>Password</label>
            <input required type="password" value={form.password} onChange={update('password')} placeholder="••••••••" />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button className="btn btn-primary auth-submit" type="submit" disabled={busy}>
            {mode === 'login' ? <LogIn size={16} /> : <UserPlus2 size={16} />}
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create workspace admin'}
          </button>
        </form>

        {mode === 'register' && (
          <p className="auth-note">
            This only works for the very first account. Once a workspace exists, new team members are added by an
            admin from inside the dashboard.
          </p>
        )}
      </div>
    </div>
  );
}
