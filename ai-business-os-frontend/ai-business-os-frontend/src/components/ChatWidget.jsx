import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import api from '../api/client';
import './chat-widget.css';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi, I'm your business assistant. Ask me about today's sales, stock, or customers." }
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    setBusy(true);
    try {
      const { data } = await api.post('/api/ai/chat', { message: text });
      setMessages((m) => [...m, { role: 'assistant', text: data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: "I couldn't reach the AI service — try again in a moment." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="chat-root">
      {open && (
        <div className="chat-panel glass-strong">
          <div className="chat-head">
            <span className="chat-head-icon"><Sparkles size={15} /></span>
            <div>
              <h4>Business assistant</h4>
              <p className="sidebar-brand-sub">Grounded in your live data</p>
            </div>
            <button className="btn btn-icon btn-sm" onClick={() => setOpen(false)} aria-label="Close chat">
              <X size={16} />
            </button>
          </div>
          <div className="chat-list" ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.role}`}>
                {m.text}
              </div>
            ))}
            {busy && <div className="chat-bubble assistant chat-typing">thinking…</div>}
          </div>
          <div className="chat-input-row">
            <input
              placeholder="Ask about sales, stock, customers…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button className="btn btn-primary btn-icon" onClick={send} disabled={busy} aria-label="Send">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
      <button className="chat-fab btn-primary" onClick={() => setOpen((o) => !o)} aria-label="Toggle chat">
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </div>
  );
}
