import React, { useState, useEffect, useRef, useCallback } from 'react';

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
  title = "Aura",
  defaultPosition = { x: window.innerWidth - 400, y: 50 },
  defaultSize = { width: 350, height: 500 },
  onClose,
  storageKey = 'aura-floating-window-state'
}) => {
  const [position, setPosition] = useState(defaultPosition);
  const [size, setSize] = useState(defaultSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const windowRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Load state from storage
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(storageKey, (result) => {
        const data = result[storageKey];
        if (data && typeof data === 'object') {
          const { x, y, width, height, minimized } = data as any;
          // Ensure window is still within viewport
          const validX = Math.max(0, Math.min(x, window.innerWidth - 50));
          const validY = Math.max(0, Math.min(y, window.innerHeight - 50));
          setPosition({ x: validX, y: validY });
          setSize({ width, height });
          setIsMinimized(!!minimized);
        }
      });
    }
  }, [storageKey]);

  // Save state to storage
  const saveState = useCallback((updates: any) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(storageKey, (result) => {
        const currentState = result[storageKey] || { ...defaultPosition, ...defaultSize, minimized: false };
        const newState = { ...currentState, ...updates };
        chrome.storage.local.set({ [storageKey]: newState });
      });
    }
  }, [storageKey, defaultPosition, defaultSize]);

  // Dragging logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.aura-drag-handle')) {
      setIsDragging(true);
      dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
      };
      e.preventDefault();
    }
  };

  // Resizing logic
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    };
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(e.clientX - dragOffset.current.x, window.innerWidth - 50));
        const newY = Math.max(0, Math.min(e.clientY - dragOffset.current.y, window.innerHeight - 50));
        setPosition({ x: newX, y: newY });
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStart.current.x;
        const deltaY = e.clientY - resizeStart.current.y;
        const newWidth = Math.max(250, Math.min(resizeStart.current.width + deltaX, window.innerWidth - position.x));
        const newHeight = Math.max(100, Math.min(resizeStart.current.height + deltaY, window.innerHeight - position.y));
        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        saveState({ x: position.x, y: position.y });
      }
      if (isResizing) {
        setIsResizing(false);
        saveState({ width: size.width, height: size.height });
      }
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, position, size, saveState]);

  const toggleMinimize = () => {
    const nextMinimized = !isMinimized;
    setIsMinimized(nextMinimized);
    saveState({ minimized: nextMinimized });
  };

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    left: position.x,
    top: position.y,
    width: isMinimized ? 'auto' : size.width,
    height: isMinimized ? 'auto' : size.height,
    zIndex: 2147483647,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--aura-bg, white)',
    borderRadius: '16px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
    transition: isDragging || isResizing ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    maxHeight: 'calc(100vh - 40px)',
    maxWidth: 'calc(100vw - 40px)',
  };

  if (isMinimized) {
      return (
          <div 
            style={{...containerStyle, width: '60px', height: '60px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
            onClick={toggleMinimize}
            className="aura-drag-handle"
            onMouseDown={handleMouseDown}
          >
              <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '18px' }}>
                A
              </div>
          </div>
      );
  }

  return (
    <div 
      ref={windowRef} 
      style={containerStyle}
      onMouseDown={handleMouseDown}
    >
      {/* Header / Drag Handle */}
      <div 
        className="aura-drag-handle"
        style={{
          padding: '12px 16px',
          background: 'linear-gradient(90deg, #f8fafc 0%, #ffffff 100%)',
          borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
          cursor: isDragging ? 'grabbing' : 'grab',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '24px', height: '24px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
                A
            </div>
            <span style={{ fontWeight: 800, fontSize: '1rem', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {title}
            </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
            <button 
                onClick={(e) => { e.stopPropagation(); toggleMinimize(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', color: '#64748b' }}
                title="Minimize"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            {onClose && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', color: '#64748b' }}
                    title="Close"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            )}
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {children}
      </div>

      {/* Resize Handle */}
      <div 
        onMouseDown={handleResizeMouseDown}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: '16px',
          height: '16px',
          cursor: 'nwse-resize',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          padding: '2px'
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="12" x2="12" y2="22"></line>
            <line x1="22" y1="2" x2="2" y2="22"></line>
        </svg>
      </div>
    </div>
  );
};

export default FloatingWindow;
