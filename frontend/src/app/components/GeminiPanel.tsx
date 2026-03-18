import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Loader2 } from 'lucide-react';

const SG = { fontFamily: "'Space Grotesk', sans-serif" };
const IN = { fontFamily: "'Inter', sans-serif" };
const SM = { fontFamily: "'Space Mono', monospace" };

interface GeminiMessage {
  role: 'user' | 'model';
  text: string;
}

interface GeminiPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const GeminiPanel: React.FC<GeminiPanelProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<GeminiMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: GeminiMessage = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3001/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages,
        }),
      });

      const data = await response.json();
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'model', text: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', text: '⚠️ ' + (data.error || 'Something went wrong.') }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: '⚠️ Could not reach the server.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: '380px', zIndex: 900,
      background: '#fff', borderLeft: '3px solid #000',
      display: 'flex', flexDirection: 'column',
      boxShadow: '-6px 0 0 #000',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        background: '#7B61FF', borderBottom: '3px solid #000',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="#FFD600" />
          <span style={{ ...SG, fontSize: '15px', fontWeight: 700, color: '#fff' }}>
            Proxima AI
          </span>
          <span style={{
            ...SM, fontSize: '8px', fontWeight: 700,
            background: '#FFD600', color: '#000',
            padding: '2px 6px', borderRadius: '3px',
            letterSpacing: '0.05em',
          }}>
            GEMINI
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            width: '28px', height: '28px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#999', border: '2px solid #000', borderRadius: '4px',
            cursor: 'pointer', boxShadow: '2px 2px 0px #000',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#FF3D57'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#999'; }}
        >
          <X size={14} />
        </button>
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px',
        display: 'flex', flexDirection: 'column', gap: '10px',
        background: '#FFFBE6',
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <Sparkles size={32} color="#7B61FF" style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ ...SG, fontSize: '15px', fontWeight: 700, color: '#000', marginBottom: '6px' }}>
              Hi! I'm Proxima AI
            </p>
            <p style={{ ...IN, fontSize: '13px', color: '#666' }}>
              Ask me anything about the lesson, get help with concepts, or just chat!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '16px' }}>
              {['Explain this topic simply', 'Give me a quiz question', 'Summarize the key points'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); setTimeout(() => inputRef.current?.focus(), 50); }}
                  style={{
                    ...IN, fontSize: '12px',
                    padding: '8px 12px',
                    background: '#fff', border: '2px solid #000',
                    borderRadius: '4px', boxShadow: '2px 2px 0px #000',
                    cursor: 'pointer', textAlign: 'left', color: '#999',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#FFD600'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
                >
                  💡 {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '88%',
          }}>
            {msg.role === 'model' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                <Sparkles size={10} color="#7B61FF" />
                <span style={{ ...SM, fontSize: '9px', fontWeight: 700, color: '#7B61FF' }}>
                  PROXIMA AI
                </span>
              </div>
            )}
            <div style={{
              background: msg.role === 'user' ? '#7B61FF' : '#fff',
              color: msg.role === 'user' ? '#fff' : '#000',
              border: '2px solid #000',
              borderRadius: msg.role === 'user' ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
              padding: '10px 14px',
              boxShadow: '2px 2px 0px #000',
            }}>
              <p style={{
                ...IN, fontSize: '13px', margin: 0, wordBreak: 'break-word',
                whiteSpace: 'pre-wrap', lineHeight: '1.5',
              }}>
                {msg.text}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
              <Sparkles size={10} color="#7B61FF" />
              <span style={{ ...SM, fontSize: '9px', fontWeight: 700, color: '#7B61FF' }}>PROXIMA AI</span>
            </div>
            <div style={{
              background: '#fff', border: '2px solid #000',
              borderRadius: '8px 8px 8px 2px',
              padding: '12px 16px', boxShadow: '2px 2px 0px #000',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <Loader2 size={14} color="#7B61FF" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ ...IN, fontSize: '13px', color: '#999' }}>Thinking…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div style={{
        display: 'flex', gap: '8px',
        padding: '12px', borderTop: '3px solid #000',
        background: '#fff', flexShrink: 0,
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Proxima AI…"
          disabled={isLoading}
          style={{
            flex: 1, padding: '8px 12px',
            border: '2px solid #000', borderRadius: '4px',
            ...IN, fontSize: '13px', outline: 'none',
            background: '#FFFBE6',
            opacity: isLoading ? 0.5 : 1,
          }}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          style={{
            width: '36px', height: '36px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: input.trim() && !isLoading ? '#7B61FF' : '#ccc',
            border: '2px solid #000', borderRadius: '4px',
            boxShadow: '2px 2px 0px #000', cursor: input.trim() && !isLoading ? 'pointer' : 'default',
            flexShrink: 0,
          }}
        >
          <Send size={14} color="#fff" />
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default GeminiPanel;
