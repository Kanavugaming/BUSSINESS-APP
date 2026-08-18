import { useState, useRef } from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import './voice-button.css';

// Backend expects plain transcribed text and returns a structured action:
// add_customer (executed server-side), search_product, show_analytics, unknown.
export default function VoiceButton({ onResult }) {
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const recognitionRef = useRef(null);
  const navigate = useNavigate();
  const Supported = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleTranscript = async (transcript) => {
    setBusy(true);
    try {
      const { data } = await api.post('/api/ai/voice-command', { transcript });
      if (data.action === 'add_customer') {
        showToast(`Added customer ${data.result?.name || ''}`);
      } else if (data.action === 'search_product') {
        showToast(`Searching products for "${data.query}"`);
        navigate('/products', { state: { query: data.query } });
      } else if (data.action === 'show_analytics') {
        showToast(`Opening analytics (${data.period})`);
        navigate('/analytics');
      } else {
        showToast(data.reason || "Didn't catch a known command");
      }
      onResult?.(data);
    } catch {
      showToast('Voice command failed — try again');
    } finally {
      setBusy(false);
    }
  };

  const start = () => {
    if (!Supported) {
      showToast('Voice control needs Chrome or Edge (Web Speech API)');
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new Recognition();
    recognition.lang = 'en-IN';
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      handleTranscript(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  return (
    <div className="voice-wrap">
      <button
        className={`voice-btn glass${listening ? ' voice-listening' : ''}`}
        onClick={start}
        disabled={busy}
        aria-label="Voice command"
        title="Try: 'add customer Rahul phone 9876543210'"
      >
        {busy ? <Loader2 size={17} className="spin" /> : <Mic size={17} strokeWidth={2} />}
        {listening && <span className="voice-ring" />}
      </button>
      {toast && <div className="voice-toast glass-strong">{toast}</div>}
    </div>
  );
}
