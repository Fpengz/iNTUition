// src/components/AuraCardDisplay.tsx
import React from 'react';

interface AuraCardDisplayProps {
  summary: string;
  actions: string[];
  processTime?: string;
  onTTSClick: (text: string) => void;
  onActionClick: (action: string) => void;
}

const AuraCardDisplay: React.FC<AuraCardDisplayProps> = ({ summary, actions, processTime, onTTSClick, onActionClick }) => {
  return (
    <article className="aura-card" style={{
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        padding: '1.25rem',
        textAlign: 'left',
        color: '#1a1a1a',
        border: '1px solid #eeeeee'
    }}>
      <h3 style={{ marginTop: '0', marginBottom: '0.75rem', fontSize: '1.2rem', color: '#BD34FE' }}>Aura Summary</h3>
      <p style={{ marginBottom: '1.25rem', lineHeight: '1.5', fontSize: '1rem' }}>{summary}</p>
      
      {actions && actions.length > 0 && (
        <nav aria-label="Suggested actions">
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#666' }}>Suggested Actions</h4>
          <ul style={{ listStyleType: 'none', padding: '0', margin: '0' }}>
            {actions.map((action, index) => (
              <li key={index} style={{ marginBottom: '0.6rem' }}>
                <button
                  className="btn-secondary"
                  onClick={() => onActionClick(action)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.6rem 0.8rem',
                    fontWeight: '500'
                  }}
                >
                  {action}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f0f0f0' }}>
        {summary && (
          <button
            onClick={() => onTTSClick(summary)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '0.25rem',
              color: '#BD34FE',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}
            title="Listen to summary"
          >
            <img src="https://img.icons8.com/ios-glyphs/30/BD34FE/speaker.png" alt="" style={{ width: '20px', height: '20px', marginRight: '0.5rem' }} />
            Listen to Summary
          </button>
        )}
        
        {processTime && (
            <span style={{ fontSize: '0.75rem', color: '#999', fontWeight: '500' }}>
                Latency: {(parseFloat(processTime) * 1000).toFixed(0)}ms
            </span>
        )}
      </footer>
    </article>
  );
};

export default AuraCardDisplay;