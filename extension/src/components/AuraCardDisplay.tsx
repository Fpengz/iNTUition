// src/components/AuraCardDisplay.tsx
import React from 'react';

interface AuraCardDisplayProps {
  summary: string;
  actions: string[];
  processTime?: string;
  isStreaming?: boolean;
  onTTSClick: (text: string) => void;
  onActionClick: (action: string) => void;
}

const AuraCardDisplay: React.FC<AuraCardDisplayProps> = ({ summary, actions, processTime, isStreaming, onTTSClick, onActionClick }) => {
  return (
    <article className="aura-card" style={{
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 4px 12px -2px rgba(0,0,0,0.05)',
        padding: '1rem',
        textAlign: 'left',
        color: '#1e293b',
        border: '1px solid rgba(99, 102, 241, 0.05)',
        lineHeight: '1.5'
    }}>
      <h3 style={{ marginTop: '0', marginBottom: '0.5rem', fontSize: '1rem', color: '#6366f1', fontWeight: 800 }}>Page Insight</h3>
      <p style={{ marginBottom: '1rem', fontSize: '0.85rem', color: '#334155' }}>
        {summary}
        {isStreaming && <span className="typing-indicator" style={{ color: '#6366f1', marginLeft: '2px', animation: 'blink 1s infinite' }}>|</span>}
      </p>
      
      {actions && actions.length > 0 && (
        <nav aria-label="Suggested actions">
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>Smart Actions</h4>
          <ul style={{ listStyleType: 'none', padding: '0', margin: '0' }}>
            {actions.map((action, index) => (
              <li key={index} style={{ marginBottom: '0.5rem' }}>
                <button
                  className="btn-secondary"
                  onClick={() => onActionClick(action)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {action}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f0f0f0' }}>
        {summary && (
          <button
            onClick={() => onTTSClick(summary)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '0.2rem',
              color: '#BD34FE',
              fontSize: '0.8rem',
              fontWeight: '600'
            }}
            title="Listen to summary"
          >
            <img src="https://img.icons8.com/ios-glyphs/30/BD34FE/speaker.png" alt="" style={{ width: '16px', height: '16px', marginRight: '0.4rem' }} />
            Listen
          </button>
        )}
        
        {processTime && (
            <span style={{ fontSize: '0.65rem', color: '#999', fontWeight: '500' }}>
                {(parseFloat(processTime) * 1000).toFixed(0)}ms
            </span>
        )}
      </footer>
    </article>
  );
};

export default AuraCardDisplay;