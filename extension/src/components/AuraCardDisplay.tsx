import React from 'react';
import { motion } from 'framer-motion';
import { Volume2, ChevronRight, Clock, CheckCircle2 } from 'lucide-react';

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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}
    >
      {/* Insight Section */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <div style={{ width: '8px', height: '8px', background: '#6366f1', borderRadius: '50%' }} />
          <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6366f1' }}>Page Insight</h3>
        </div>
        
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          border: '1px solid rgba(0,0,0,0.05)',
          position: 'relative'
        }}>
          <p style={{
            margin: 0,
            fontSize: '15px',
            lineHeight: '1.6',
            color: '#334155',
            fontWeight: 500
          }}>
            {summary}
            {isStreaming && (
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                style={{ color: '#6366f1', marginLeft: '4px', fontWeight: 900 }}
              >
                |
              </motion.span>
            )}
          </p>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button
              onClick={() => onTTSClick(summary)}
              style={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#6366f1',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Volume2 size={16} />
              Listen
            </button>
          </div>
        </div>
      </section>

      {/* Actions Section */}
      {actions && actions.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ width: '8px', height: '8px', background: '#a855f7', borderRadius: '50%' }} />
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a855f7' }}>Smart Actions</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {actions.map((action, index) => (
              <motion.button
                key={index}
                whileHover={{ x: 5, background: '#f1f5f9' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onActionClick(action)}
                style={{
                  textAlign: 'left',
                  padding: '12px 16px',
                  background: 'white',
                  border: '1px solid rgba(0,0,0,0.05)',
                  borderRadius: '14px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}
              >
                <span>{action}</span>
                <ChevronRight size={16} color="#94a3b8" />
              </motion.button>
            ))}
          </div>
        </section>
      )}

      {/* Footer Meta */}
      <footer style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '10px',
        paddingTop: '16px',
        borderTop: '1px solid rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>
          <Clock size={12} />
          <span>PROCESSED IN {(parseFloat(processTime || "0") * 1000).toFixed(0)}MS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '11px', fontWeight: 700 }}>
          <CheckCircle2 size={12} />
          <span>Aura Verified</span>
        </div>
      </footer>
    </motion.div>
  );
};

export default AuraCardDisplay;
