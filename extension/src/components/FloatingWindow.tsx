import React, { useState, useEffect, useRef, useCallback } from 'react';

interface FloatingWindowProps {
  children: React.ReactNode;
  title?: string;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  onClose?: () => void;
  storageKey?: string;
  setShowSettings?: (show: boolean) => void;
}

const FloatingWindow: React.FC<FloatingWindowProps> = ({
  children,
  title = "Aura",
  defaultPosition = { x: window.innerWidth - 300, y: 40 },
  defaultSize = { width: 260, height: 320 },
  onClose,
  storageKey = 'aura-floating-window-state',
  setShowSettings
}) => {
  const [position, setPosition] = useState(defaultPosition);
  const [size, setSize] = useState(defaultSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const windowRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
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
          setSize({ width: width || defaultSize.width, height: height || defaultSize.height });
          setIsMinimized(!!minimized);
        }
      });

      const handleStorageChange = (changes: any, area: string) => {
        if (area === 'local' && changes[storageKey]) {
          const newState = changes[storageKey].newValue;
          if (newState && typeof newState.minimized === 'boolean') {
            setIsMinimized(newState.minimized);
          }
        }
      };

      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }
  }, [storageKey, defaultSize.width, defaultSize.height]);

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
      dragStartPos.current = { x: e.clientX, y: e.clientY };
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
        const newWidth = Math.max(280, Math.min(resizeStart.current.width + deltaX, window.innerWidth - position.x));
        const newHeight = Math.max(150, Math.min(resizeStart.current.height + deltaY, window.innerHeight - position.y));
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

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    left: position.x,
    top: position.y,
    width: isMinimized ? 'auto' : size.width,
    height: isMinimized ? 'auto' : size.height,
    zIndex: 2147483647,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: isMinimized ? '50%' : '12px',
    boxShadow: '0 12px 40px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
    transition: isDragging || isResizing ? 'none' : 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    maxHeight: 'calc(100vh - 40px)',
    maxWidth: 'calc(100vw - 40px)',
  };

  if (isMinimized) {
      if (!hasInteracted) {
          return (
              <div 
                style={{
                    ...containerStyle, 
                    width: '52px', 
                    height: '52px', 
                    cursor: isDragging ? 'grabbing' : 'grab', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    padding: 0,
                    borderRadius: '50%'
                }}
                onClick={(e) => {
                    const dragDist = Math.sqrt(
                        Math.pow(e.clientX - dragStartPos.current.x, 2) + 
                        Math.pow(e.clientY - dragStartPos.current.y, 2)
                    );
                    if (dragDist < 5) setHasInteracted(true);
                }}
                className="aura-drag-handle"
                onMouseDown={handleMouseDown}
              >
                  <div style={{ 
                      width: '36px', 
                      height: '36px', 
                      background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: 'white', 
                      fontWeight: 'bold', 
                      fontSize: '18px',
                      boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                  }}>
                    A
                  </div>
              </div>
          );
      }

      return (
          <div 
            style={{
                ...containerStyle, 
                width: '180px', 
                height: '52px', 
                cursor: isDragging ? 'grabbing' : 'grab', 
                display: 'flex', 
                alignItems: 'center', 
                padding: '6px',
                borderRadius: '16px',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.98)',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05)'
            }}
            className="aura-drag-handle"
            onMouseDown={handleMouseDown}
          >
              <button 
                onClick={(e) => { 
                    e.stopPropagation(); 
                    setHasInteracted(false);
                    if (setShowSettings) setShowSettings(true);
                    setIsMinimized(false); 
                    saveState({ minimized: false }); 
                }}
                style={{ 
                    width: '40px',
                    height: '40px', 
                    background: '#f8fafc', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: '#64748b', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    flexShrink: 0
                }}
                title="Settings"
              >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              </button>
              <button 
                onClick={(e) => { 
                    e.stopPropagation(); 
                    setHasInteracted(false);
                    setIsMinimized(false); 
                    saveState({ minimized: false }); 
                }}
                style={{ 
                    flex: 1, 
                    height: '40px', 
                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', 
                    border: 'none',
                    borderRadius: '12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: 'white', 
                    fontWeight: '700', 
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                    transition: 'all 0.2s ease'
                }}
              >
                Explain Page
              </button>
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
          padding: '8px 12px',
          background: 'rgba(248, 250, 252, 0.5)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
          cursor: isDragging ? 'grabbing' : 'grab',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '18px', height: '18px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '10px' }}>
                A
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                {title}
            </span>
        </div>
        <div style={{ display: 'flex', gap: '2px' }}>
            <button 
                onClick={(e) => { e.stopPropagation(); setIsMinimized(true); saveState({ minimized: true }); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px', borderRadius: '4px', color: '#94a3b8' }}
                title="Minimize"
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            {onClose && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px', borderRadius: '4px', color: '#94a3b8' }}
                    title="Close"
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
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
          width: '12px',
          height: '12px',
          cursor: 'nwse-resize',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          padding: '1px',
          opacity: 0.5
        }}
      >
        <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="12" x2="12" y2="22"></line>
            <line x1="22" y1="2" x2="2" y2="22"></line>
        </svg>
      </div>
    </div>
  );
};

export default FloatingWindow;
