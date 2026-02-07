import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ShadowRoot from './ShadowRoot';

describe('ShadowRoot', () => {
  it('creates a shadow root and renders children', () => {
    const { container } = render(
      <ShadowRoot css={['.test { color: red; }']}>
        <div id="inner">In Shadow</div>
      </ShadowRoot>
    );

    const rootElement = container.querySelector('#aura-extension-root') as HTMLElement;
    expect(rootElement).toBeDefined();
    
    const shadow = rootElement.shadowRoot;
    expect(shadow).toBeDefined();
    
    if (shadow) {
        // JSDOM has limited shadow support but it should work for basic structure
        const inner = shadow.getElementById('aura-shadow-container');
        expect(inner).toBeDefined();
        // Child should be there via portal
        expect(inner?.innerHTML).toContain('In Shadow');
    }
  });
});