import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus } from 'lucide-react';

interface FloatingWindowProps {
  children: React.ReactNode;
  title?: string;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  onClose?: () => void;
  storageKey?: string;
}

const FloatingWindow: React.FC<FloatingWindowProps> = ({
  children,
  title = "Aura AI",
  defaultPosition = { x: window.innerWidth - 80, y: window.innerHeight - 80 },
  defaultSize = { width: 320, height: 480 },
  onClose,
  storageKey = 'aura-floating-window-state'
}) => {
  const [position, setPosition] = useState(defaultPosition);
  const [size, setSize] = useState(defaultSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const windowRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });

  // Load state from storage
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(storageKey, (result) => {
        const data = result[storageKey];
        if (data && typeof data === 'object') {
          const { x, y, width, height, expanded } = data as any;
          const validX = Math.max(20, Math.min(x, window.innerWidth - 80));
          const validY = Math.max(20, Math.min(y, window.innerHeight - 80));
          setPosition({ x: validX, y: validY });
          setSize({ width: width || defaultSize.width, height: height || defaultSize.height });
          setIsExpanded(!!expanded);
        }
      });
    }
  }, [storageKey, defaultSize.width, defaultSize.height]);

  const saveState = useCallback((updates: any) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(storageKey, (result) => {
        const currentState = result[storageKey] || { ...defaultPosition, ...defaultSize, expanded: false };
        const newState = { ...currentState, ...updates };
        chrome.storage.local.set({ [storageKey]: newState });
      });
    }
  }, [storageKey, defaultPosition, defaultSize]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.aura-drag-handle')) {
      setIsDragging(true);
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
      };
      e.preventDefault();
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(10, Math.min(e.clientX - dragOffset.current.x, window.innerWidth - (isExpanded ? size.width : 60)));
        const newY = Math.max(10, Math.min(e.clientY - dragOffset.current.y, window.innerHeight - (isExpanded ? size.height : 60)));
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        setIsDragging(false);
        saveState({ x: position.x, y: position.y });
        
        // If it was a click (not a drag), toggle expanded
        const dragDist = Math.sqrt(
          Math.pow(e.clientX - dragStartPos.current.x, 2) + 
          Math.pow(e.clientY - dragStartPos.current.y, 2)
        );
        if (dragDist < 5 && !isExpanded) {
          setIsExpanded(true);
          saveState({ expanded: true });
        }
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isExpanded, position, size, saveState]);

  return (
    <div
      ref={windowRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 2147483647,
        pointerEvents: 'none', // Allow clicking through the container
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.div
            key="minimized"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="aura-drag-handle"
            onMouseDown={handleMouseDown}
            style={{
              width: '60px',
              height: '60px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              cursor: isDragging ? 'grabbing' : 'pointer',
              boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.3)',
              pointerEvents: 'auto',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2) 0%, transparent 70%)',
            }} />
            <span style={{ fontWeight: 900, fontSize: '24px', letterSpacing: '-1px', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>A</span>
            
            {/* Animated Ring */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: '2px solid #6366f1',
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            style={{
              width: size.width,
              height: size.height,
              maxHeight: '80vh',
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '24px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              pointerEvents: 'auto',
              border: '1px solid rgba(255, 255, 255, 0.5)',
            }}
          >
            {/* Header */}
            <div
              className="aura-drag-handle"
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.4)',
                borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                cursor: isDragging ? 'grabbing' : 'grab',
              }}
              onMouseDown={handleMouseDown}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '12px'
                }}>A</div>
                <span style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>{title}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => { setIsExpanded(false); saveState({ expanded: false }); }}
                  style={{
                    background: 'rgba(0,0,0,0.05)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px',
                    cursor: 'pointer',
                    color: '#64748b',
                    display: 'flex'
                  }}
                >
                  <Minus size={16} />
                </button>
                {onClose && (
                  <button
                    onClick={onClose}
                    style={{
                      background: 'rgba(0,0,0,0.05)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px',
                      cursor: 'pointer',
                      color: '#64748b',
                      display: 'flex'
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
              {children}
            </div>

            {/* Footer / Drag Indicator */}
            <div style={{ padding: '8px', display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.02)' }}>
                <div style={{ width: '40px', height: '4px', background: '#e2e8f0', borderRadius: '2px' }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FloatingWindow;