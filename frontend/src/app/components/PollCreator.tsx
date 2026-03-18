import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

const SG = { fontFamily: "'Space Grotesk', sans-serif" };
const IN = { fontFamily: "'Inter', sans-serif" };
const SM = { fontFamily: "'Space Mono', monospace" };

interface PollCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePoll: (data: { question: string; options: string[]; timeoutSec: number }) => void;
}

const PollCreator: React.FC<PollCreatorProps> = ({ isOpen, onClose, onCreatePoll }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [timeoutSec, setTimeoutSec] = useState(30);

  const addOption = () => {
    if (options.length < 6) setOptions([...options, '']);
  };

  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, val: string) => {
    const updated = [...options];
    updated[idx] = val;
    setOptions(updated);
  };

  const handleCreate = () => {
    const trimQ = question.trim();
    const trimOpts = options.map(o => o.trim()).filter(o => o);
    if (!trimQ || trimOpts.length < 2) return;
    onCreatePoll({ question: trimQ, options: trimOpts, timeoutSec });
    setQuestion('');
    setOptions(['', '']);
    setTimeoutSec(30);
    onClose();
  };

  if (!isOpen) return null;

  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', border: '3px solid #000',
        borderRadius: '8px', boxShadow: '8px 8px 0px #000',
        width: '440px', maxHeight: '80vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#7B61FF', borderBottom: '3px solid #000',
          padding: '14px 20px',
        }}>
          <span style={{ ...SG, fontSize: '16px', fontWeight: 700, color: '#fff' }}>
            📊 Create Poll
          </span>
          <button
            onClick={onClose}
            style={{
              width: '28px', height: '28px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#999', border: '2px solid #000', borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ ...SM, fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666', display: 'block', marginBottom: '6px' }}>
              Question
            </label>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What is the capital of France?"
              style={{
                width: '100%', padding: '10px 12px',color: '#000',
                border: '2px solid #000', borderRadius: '4px',
                ...IN, fontSize: '14px', outline: 'none',
                background: '#FFFBE6', boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ ...SM, fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666', display: 'block', marginBottom: '6px' }}>
              Options
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {options.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{
                    ...SG, fontSize: '13px', fontWeight: 700,
                    width: '28px', height: '28px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#FFD600', border: '2px solid #000', borderRadius: '4px',
                    flexShrink: 0,
                  }}>
                    {LETTERS[idx]}
                  </span>
                  <input
                    value={opt}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    placeholder={`Option ${LETTERS[idx]}`}
                    style={{
                      flex: 1, padding: '8px 12px', background: '#FFFBE6', color: '#000',
                      border: '2px solid #000', borderRadius: '4px',
                      ...IN, fontSize: '13px', outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => removeOption(idx)}
                      style={{
                        width: '28px', height: '28px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: '#fff', border: '2px solid #000', borderRadius: '4px',
                        cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      <Trash2 size={12} color="#FF3D57" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 6 && (
              <button
                onClick={addOption}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  ...SG, fontSize: '12px', fontWeight: 700,
                  padding: '6px 12px', marginTop: '8px',
                  background: '#FFD600', border: '2px solid #000', borderRadius: '4px',
                  cursor: 'pointer', boxShadow: '2px 2px 0px #000',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#FFD600'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#FFD600'; }}
              >
                <Plus size={12} /> Add Option
              </button>
            )}
          </div>

          <div>
            <label style={{ ...SM, fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666', display: 'block', marginBottom: '6px' }}>
              Time Limit (seconds)
            </label>
            <input
              type="number"
              value={timeoutSec}
              onChange={(e) => setTimeoutSec(Math.max(5, parseInt(e.target.value) || 5))}
              min={10}
              max={200}
              style={{
                width: '100px', padding: '8px 12px',color: '#000',
                border: '2px solid #000', borderRadius: '4px',
                ...SM, fontSize: '14px', fontWeight: 700, outline: 'none',
                textAlign: 'center',
              }}
            />
          </div>
        </div>

        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: '10px',
          padding: '16px 20px', borderTop: '3px solid #000',
        }}>
          <button
            onClick={onClose}
            style={{
              ...SG, fontSize: '13px', fontWeight: 700,
              padding: '8px 20px',
              background: '#fff', color: '#000',
              border: '2px solid #000', borderRadius: '4px',
              boxShadow: '3px 3px 0px #000', cursor: 'pointer',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f5'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
            style={{
              ...SG, fontSize: '13px', fontWeight: 700,
              padding: '8px 20px',
              background: question.trim() && options.filter(o => o.trim()).length >= 2 ? '#7B61FF' : '#ccc',
              color: '#fff',
              border: '2px solid #000', borderRadius: '4px',
              boxShadow: '3px 3px 0px #000', cursor: 'pointer',
            }}
            onMouseEnter={(e) => { if (question.trim()) (e.currentTarget as HTMLButtonElement).style.background = '#6B51EF'; }}
            onMouseLeave={(e) => { if (question.trim()) (e.currentTarget as HTMLButtonElement).style.background = '#7B61FF'; }}
          >
            🚀 Launch Poll
          </button>
        </div>
      </div>
    </div>
  );
};

export default PollCreator;
