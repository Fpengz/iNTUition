// src/components/AuraCardDisplay.tsx
import React from 'react';

interface AuraCardDisplayProps {
  summary: string;
  actions: string[];
  onTTSClick: (text: string) => void;
}

const AuraCardDisplay: React.FC<AuraCardDisplayProps> = ({ summary, actions, onTTSClick }) => {
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
                  onClick={() => console.log(`Action: ${action}`)} // Placeholder for action handling
                  style={{
                    background: '#e0e0e0',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0.5rem 0.8rem',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    color: '#333',
                    fontSize: '0.9rem'
                  }}
                >
                  {action}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {summary && (
        <button
          onClick={() => onTTSClick(summary)}
          style={{
            marginTop: '1rem',
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
    </div>
  );
};

export default AuraCardDisplay;