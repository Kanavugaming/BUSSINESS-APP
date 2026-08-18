import { useState, useRef, useEffect } from 'react';
import { Bell, PackageX, ReceiptText, Info } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import './notification-bell.css';

const ICONS = {
  low_stock: PackageX,
  new_sale: ReceiptText,
  system: Info
};

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell() {
  const { notifications, unreadCount, pulse, markRead } = useSocket();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="bell-wrap" ref={ref}>
      <button
        className={`bell-btn glass${pulse ? ' bell-pulse' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
      >
        <Bell size={17} strokeWidth={2} />
        {unreadCount > 0 && <span className="bell-count">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        <span className="bell-ring" />
      </button>

      {open && (
        <div className="bell-panel glass-strong">
          <div className="bell-panel-head">
            <h4>Notifications</h4>
            <span className="sidebar-brand-sub">{notifications.length ? `${unreadCount} unread` : ''}</span>
          </div>
          <div className="bell-list">
            {notifications.length === 0 && (
              <p className="bell-empty">Nothing yet — new sales and low-stock alerts show up here in real time.</p>
            )}
            {notifications.map((n) => {
              const Icon = ICONS[n.type] || Info;
              return (
                <button
                  key={n.id}
                  className={`bell-item${n.is_read ? '' : ' unread'}`}
                  onClick={() => !n.is_read && markRead(n.id)}
                >
                  <span className={`bell-item-icon ${n.type === 'low_stock' ? 'amber' : n.type === 'new_sale' ? 'teal' : 'indigo'}`}>
                    <Icon size={14} strokeWidth={2.2} />
                  </span>
                  <span className="bell-item-body">
                    <span className="bell-item-msg">{n.message}</span>
                    <span className="bell-item-time">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
