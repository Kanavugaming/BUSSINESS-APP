import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ChatWidget from './ChatWidget';
import './layout.css';

export default function Layout({ title, subtitle, children }) {
  return (
    <div className="app-shell">
      <div className="blob blob--1" />
      <div className="blob blob--2" />
      <Sidebar />
      <main className="main-area">
        <Topbar title={title} subtitle={subtitle} />
        <div className="main-content">{children}</div>
      </main>
      <ChatWidget />
    </div>
  );
}
