import React, { useEffect, useState } from 'react';

const SG = { fontFamily: "'Space Grotesk', sans-serif" };
const IN = { fontFamily: "'Inter', sans-serif" };
const SM = { fontFamily: "'Space Mono', monospace" };

interface PollData {
  id: string;
  question: string;
  options: string[];
  timeoutSec: number;
  createdAt: number;
}

interface PollResults {
  poll: PollData;
  tally: number[];
  totalResponses: number;
}

interface PollOverlayProps {
  poll: PollData | null;
  results: PollResults | null;
  liveTally: { tally: number[]; totalResponses: number } | null;
  isTeacher: boolean;
  onSubmitResponse: (optionIndex: number) => void;
  onDismiss: () => void;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const OPTION_COLORS = ['#FFD600', '#7B61FF', '#00C851', '#FF6B35', '#0085FF', '#FF3D57'];

const PollOverlay: React.FC<PollOverlayProps> = ({ poll, results, liveTally, isTeacher, onSubmitResponse, onDismiss }) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!poll) return;
    setSelectedOption(null);
    setSubmitted(false);

    const elapsed = Math.floor((Date.now() - poll.createdAt) / 1000);
    const remaining = Math.max(0, poll.timeoutSec - elapsed);
    setTimeLeft(remaining);

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [poll?.id]);

  const handleSelect = (idx: number) => {
    if (submitted || isTeacher || results) return;
    setSelectedOption(idx);
  };

  const handleSubmit = () => {
    if (selectedOption === null || submitted) return;
    onSubmitResponse(selectedOption);
    setSubmitted(true);
  };

  if (!poll && !results) return null;

  if (results) {
    const maxVotes = Math.max(...results.tally, 1);
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 950,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          background: '#fff', border: '3px solid #000',
          borderRadius: '8px', boxShadow: '8px 8px 0px #000',
          width: '460px', overflow: 'hidden',
        }}>
          <div style={{
            background: '#00C851', borderBottom: '3px solid #000',
            padding: '14px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ ...SG, fontSize: '16px', fontWeight: 700, color: '#fff' }}>
              📊 Poll Results
            </span>
            <span style={{ ...SM, fontSize: '11px', fontWeight: 700, color: '#fff' }}>
              {results.totalResponses} response{results.totalResponses !== 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ padding: '20px' }}>
            <p style={{ ...SG, fontSize: '15px', fontWeight: 700, color: '#000', marginBottom: '16px' }}>
              {results.poll.question}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {results.poll.options.map((opt, idx) => {
                const votes = results.tally[idx] || 0;
                const pct = results.totalResponses > 0 ? Math.round((votes / results.totalResponses) * 100) : 0;
                return (
                  <div key={idx}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          ...SG, fontSize: '12px', fontWeight: 700,
                          width: '24px', height: '24px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: OPTION_COLORS[idx], border: '2px solid #000', borderRadius: '4px',
                          color: idx === 0 ? '#000' : '#fff',
                        }}>
                          {LETTERS[idx]}
                        </span>
                        <span style={{ ...IN, fontSize: '13px', color: '#000' }}>{opt}</span>
                      </div>
                      <span style={{ ...SM, fontSize: '12px', fontWeight: 700, color: '#000' }}>
                        {votes} ({pct}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '10px', border: '2px solid #000', background: '#f5f5f5', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${(votes / maxVotes) * 100}%`,
                        background: OPTION_COLORS[idx],
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ padding: '0 20px 20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={onDismiss}
              style={{
                ...SG, fontSize: '13px', fontWeight: 700,
                padding: '8px 20px',
                background: '#FFD600', color: '#000',
                border: '2px solid #000', borderRadius: '4px',
                boxShadow: '3px 3px 0px #000', cursor: 'pointer',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#E6C200'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#FFD600'; }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 950,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', border: '3px solid #000',
        borderRadius: '8px', boxShadow: '8px 8px 0px #000',
        width: '460px', overflow: 'hidden',
      }}>
        <div style={{
          background: '#7B61FF', borderBottom: '3px solid #000',
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ ...SG, fontSize: '16px', fontWeight: 700, color: '#fff' }}>
            📊 Live Poll
          </span>
          <div style={{
            ...SM, fontSize: '14px', fontWeight: 700,
            padding: '4px 12px',
            background: timeLeft <= 5 ? '#FF3D57' : '#FFD600',
            border: '2px solid #000', borderRadius: '4px',
            color: timeLeft <= 5 ? '#fff' : '#000',
          }}>
            {timeLeft}s
          </div>
        </div>

        <div style={{ padding: '20px' }}>
          <p style={{ ...SG, fontSize: '15px', fontWeight: 700, color: '#000', marginBottom: '16px' }}>
            {poll!.question}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {poll!.options.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  disabled={submitted || isTeacher}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    width: '100%', padding: '10px 14px',
                    background: isSelected ? OPTION_COLORS[idx] : '#fff',
                    border: '2px solid #000', borderRadius: '4px',
                    boxShadow: isSelected ? '2px 2px 0px #000' : '3px 3px 0px #000',
                    cursor: submitted || isTeacher ? 'default' : 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'left',
                    opacity: submitted && !isSelected ? 0.5 : 1,
                  }}
                >
                  <span style={{
                    width: '28px', height: '28px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isSelected ? '#fff' : OPTION_COLORS[idx],
                    border: '2px solid #000', borderRadius: '4px',
                    color: isSelected ? '#000' : (idx === 0 ? '#000' : '#fff'),
                    flexShrink: 0,
                  }}>
                    {LETTERS[idx]}
                  </span>
                  <span style={{ ...IN, fontSize: '14px', color: isSelected ? '#fff' : '#000', fontWeight: isSelected ? 700 : 400 }}>
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>

          {isTeacher && liveTally && (
            <div style={{ marginTop: '14px', padding: '10px', background: '#FFFBE6', border: '2px solid #000', borderRadius: '4px' }}>
              <span style={{ ...SM, fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666' }}>
                LIVE RESPONSES: {liveTally.totalResponses}
              </span>
            </div>
          )}

          {!isTeacher && !submitted && (
            <button
              onClick={handleSubmit}
              disabled={selectedOption === null}
              style={{
                width: '100%', marginTop: '14px',
                ...SG, fontSize: '14px', fontWeight: 700,
                padding: '10px',
                background: selectedOption !== null ? '#00C851' : '#ccc',
                color: '#fff',
                border: '2px solid #000', borderRadius: '4px',
                boxShadow: '3px 3px 0px #000', cursor: selectedOption !== null ? 'pointer' : 'default',
              }}
            >
              Submit Answer
            </button>
          )}

          {!isTeacher && submitted && (
            <div style={{
              marginTop: '14px', padding: '10px 14px', textAlign: 'center',
              background: '#FFFBE6', border: '2px solid #000', borderRadius: '4px',
            }}>
              <span style={{ ...SG, fontSize: '13px', fontWeight: 700, color: '#00C851' }}>
                ✅ Answer submitted! Waiting for results…
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PollOverlay;
