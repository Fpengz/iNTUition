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
    <div className="aura-card" style={{
        background: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        padding: '1rem',
        marginTop: '1rem',
        textAlign: 'left',
        color: '#333'
    }}>
      <h3 style={{ marginTop: '0', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Aura Summary</h3>
      <p style={{ marginBottom: '1rem', lineHeight: '1.4' }}>{summary}</p>
      
      {actions && actions.length > 0 && (
        <>
          <h4 style={{ margin: '1rem 0 0.5rem 0', fontSize: '1rem' }}>Suggested Actions:</h4>
          <ul style={{ listStyleType: 'none', padding: '0', margin: '0' }}>
            {actions.map((action, index) => (
              <li key={index} style={{ marginBottom: '0.5rem' }}>
                <button
                  onClick={() => onActionClick(action)}
                  style={{
                    background: '#e0e0e0',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0.5rem 0.8rem',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    color: '#333',
                    fontSize: '0.9rem',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = '#d0d0d0')}
                  onMouseOut={(e) => (e.currentTarget.style.background = '#e0e0e0')}
                >
                  {action}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
        {summary && (
          <button
            onClick={() => onTTSClick(summary)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '0'
            }}
            title="Listen to summary"
          >
            <img src="https://img.icons8.com/ios-glyphs/30/000000/speaker.png" alt="Play" style={{ width: '20px', height: '20px', marginRight: '0.5rem' }} />
            Listen
          </button>
        )}
        
        {processTime && (
            <span style={{ fontSize: '0.75rem', color: '#888' }}>
                Latency: {(parseFloat(processTime) * 1000).toFixed(0)}ms
            </span>
        )}
      </div>
    </div>
  );
};

export default AuraCardDisplay;