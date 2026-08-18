import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Package, Receipt, LineChart, UserPlus, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './sidebar.css';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/products', label: 'Inventory', icon: Package },
  { to: '/sales', label: 'Sales & Billing', icon: Receipt },
  { to: '/analytics', label: 'Analytics', icon: LineChart }
];

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="sidebar glass-strong">
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark">
          <Sparkles size={18} strokeWidth={2.2} />
        </span>
        <div>
          <h4>Business OS</h4>
          <p className="sidebar-brand-sub">AI-powered</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <Icon size={18} strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
        ))}
        {user?.role === 'admin' && (
          <NavLink
            to="/users/new"
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <UserPlus size={18} strokeWidth={2} />
            <span>Add user</span>
          </NavLink>
        )}
      </nav>

      <div className="sidebar-footer">
        <p className="sidebar-brand-sub">Signed in as</p>
        <p className="sidebar-user-name">{user?.name}</p>
        <span className={`badge badge-indigo`}>{user?.role}</span>
      </div>
    </aside>
  );
}
