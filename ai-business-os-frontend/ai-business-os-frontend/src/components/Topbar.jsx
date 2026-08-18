import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import VoiceButton from './VoiceButton';
import './topbar.css';

export default function Topbar({ title, subtitle }) {
  const { logout } = useAuth();

  return (
    <header className="topbar glass">
      <div>
        <h2>{title}</h2>
        {subtitle && <p className="topbar-sub">{subtitle}</p>}
      </div>
      <div className="topbar-actions">
        <VoiceButton />
        <NotificationBell />
        <button className="btn btn-icon" onClick={logout} aria-label="Log out" title="Log out">
          <LogOut size={17} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}
