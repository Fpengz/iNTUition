import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface ShadowRootProps {
  children: React.ReactNode;
  css?: string[];
}

const ShadowRoot: React.FC<ShadowRootProps> = ({ children, css }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);
  const [mountNode, setMountNode] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (containerRef.current && !shadowRoot) {
      let root = containerRef.current.shadowRoot;
      if (!root) {
        root = containerRef.current.attachShadow({ mode: 'open' });
      }
      
      // Clear existing content to prevent duplication if hot reloading/re-rendering
      // root.innerHTML = ''; // Actually, careful here. React might lose track.
      
      const resetStyle = document.createElement('style');
      resetStyle.textContent = `
        :host {
          all: initial;
        }
        #aura-shadow-container {
          all: initial;
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
        }
        * {
          box-sizing: border-box;
        }
      `;
      root.appendChild(resetStyle);

      if (css) {
        css.forEach(styleContent => {
          const style = document.createElement('style');
          style.textContent = styleContent;
          root.appendChild(style);
        });
      }

      const container = document.createElement('div');
      container.id = 'aura-shadow-container';
      root.appendChild(container);
      
      setShadowRoot(root);
      setMountNode(container);
    }
  }, [css, shadowRoot]);

  return (
    <div ref={containerRef} id="aura-extension-root">
      {mountNode && createPortal(children, mountNode)}
    </div>
  );
};

export default ShadowRoot;
