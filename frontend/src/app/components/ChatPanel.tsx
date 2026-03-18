import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { X, Send } from 'lucide-react';

const SG = { fontFamily: "'Space Grotesk', sans-serif" };
const IN = { fontFamily: "'Inter', sans-serif" };
const SM = { fontFamily: "'Space Mono', monospace" };

interface Message {
  id: string;
  name: string;
  role: string;
  text: string;
  timestamp: number;
}

interface ChatPanelProps {
  roomId: string;
  userName: string;
  userRole: string;
  isOpen: boolean;
  onClose: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ roomId, userName, userRole, isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const socket = io('http://localhost:3001');
    socketRef.current = socket;

    socket.emit('join_room', { roomId, name: userName, role: userRole });
    socket.emit('get_messages', { roomId });

    socket.on('message_history', ({ messages: history }: { messages: Message[] }) => {
      setMessages(history);
    });

    socket.on('new_message', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.disconnect();
    };
  }, [isOpen, roomId, userName, userRole]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !socketRef.current) return;
    socketRef.current.emit('chat_message', { roomId, name: userName, role: userRole, text });
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: '340px', zIndex: 900,
      background: '#fff', borderLeft: '3px solid #000',
      display: 'flex', flexDirection: 'column',
      boxShadow: '-6px 0 0 #000',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        background: '#FFD600', borderBottom: '3px solid #000',
        flexShrink: 0,
      }}>
        <span style={{ ...SG, fontSize: '15px', fontWeight: 700, color: '#000' }}>
          💬 Class Chat
        </span>
        <button
          onClick={onClose}
          style={{
            width: '28px', height: '28px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#999', border: '2px solid #000', borderRadius: '4px',
            cursor: 'pointer', boxShadow: '2px 2px 0px #000', color: "#999"
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#FF3D57'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
        >
          <X size={14} />
        </button>
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px',
        display: 'flex', flexDirection: 'column', gap: '8px',
        background: '#FFFBE6',
      }}>
        {messages.length === 0 && (
          <p style={{ ...IN, fontSize: '13px', color: '#999', textAlign: 'center', marginTop: '20px' }}>
            No messages yet. Start the conversation!
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.name === userName;
          const isTeacher = msg.role === 'teacher';
          return (
            <div key={msg.id} style={{
              alignSelf: isMe ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
            }}>
              {!isMe && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                  <span style={{ ...SM, fontSize: '10px', fontWeight: 700, color: isTeacher ? '#FF6B35' : '#7B61FF' }}>
                    {msg.name}
                  </span>
                  {isTeacher && (
                    <span style={{
                      ...SM, fontSize: '8px', fontWeight: 700,
                      background: '#FF6B35', color: '#fff',
                      padding: '1px 4px', borderRadius: '2px',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      Teacher
                    </span>
                  )}
                </div>
              )}
              <div style={{
                background: isMe ? '#FFD600' : '#fff',
                border: '2px solid #000',
                borderRadius: isMe ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                padding: '8px 12px',
                boxShadow: '2px 2px 0px #000',
              }}>
                <p style={{ ...IN, fontSize: '13px', color: '#000', margin: 0, wordBreak: 'break-word' }}>
                  {msg.text}
                </p>
              </div>
              <span style={{
                ...SM, fontSize: '9px', color: '#999',
                display: 'block', marginTop: '2px',
                textAlign: isMe ? 'right' : 'left',
              }}>
                {formatTime(msg.timestamp)}
              </span>
            </div>
          );
        })}
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
          placeholder="Type a message…"
          style={{
            flex: 1, padding: '8px 12px',
            border: '2px solid #000', borderRadius: '4px',
            ...IN, fontSize: '13px', outline: 'none',
            background: '#FFFBE6',
          }}
        />
        <button
          onClick={sendMessage}
          style={{
            width: '36px', height: '36px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#00C851', border: '2px solid #000', borderRadius: '4px',
            boxShadow: '2px 2px 0px #000', cursor: 'pointer',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#00B848'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#00C851'; }}
        >
          <Send size={14} color="#fff" />
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;
