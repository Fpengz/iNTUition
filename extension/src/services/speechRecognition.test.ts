import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpeechRecognitionService } from './speechRecognition';

describe('SpeechRecognitionService', () => {
  let mockRecognition: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRecognition = {
        start: vi.fn(),
        stop: vi.fn(),
        continuous: false,
        interimResults: false,
        lang: 'en-US',
        onresult: null,
        onend: null,
        onerror: null
    };
    
    // @ts-ignore
    (globalThis as any).SpeechRecognition = vi.fn(() => mockRecognition);
  });

  it('initializes correctly', () => {
    const onResult = vi.fn();
    new SpeechRecognitionService({ onResult });
    expect((globalThis as any).SpeechRecognition).toHaveBeenCalled();
    expect(mockRecognition.continuous).toBe(true);
  });

  it('starts and stops listening', () => {
    const service = new SpeechRecognitionService({ onResult: vi.fn() });
    service.start();
    expect(mockRecognition.start).toHaveBeenCalled();
    
    service.stop();
    expect(mockRecognition.stop).toHaveBeenCalled();
  });

  it('handles result', () => {
    const onResult = vi.fn();
    new SpeechRecognitionService({ onResult });
    
    const event = {
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: 'hello world' } }]
    } as any;
    
    mockRecognition.onresult(event);
    expect(onResult).toHaveBeenCalledWith('hello world');
  });

  it('handles error', () => {
    const onError = vi.fn();
    new SpeechRecognitionService({ onResult: vi.fn(), onError });
    
    mockRecognition.onerror({ error: 'network' } as any);
    expect(onError).toHaveBeenCalledWith({ error: 'network' });
  });

  it('restarts on end if listening', () => {
    const service = new SpeechRecognitionService({ onResult: vi.fn() });
    service.start();
    mockRecognition.start.mockClear();
    
    mockRecognition.onend();
    expect(mockRecognition.start).toHaveBeenCalled();
  });

  it('handles start error', () => {
    const service = new SpeechRecognitionService({ onResult: vi.fn() });
    mockRecognition.start = vi.fn(() => { throw new Error('Start Fail'); });
    service.start();
    // Should log error
  });

  it('calls onEnd option', () => {
    const onEnd = vi.fn();
    new SpeechRecognitionService({ onResult: vi.fn(), onEnd });
    mockRecognition.onend();
    expect(onEnd).toHaveBeenCalled();
  });

  it('throws if SpeechRecognition is missing', () => {
    // @ts-ignore
    (globalThis as any).SpeechRecognition = undefined;
    // @ts-ignore
    (globalThis as any).webkitSpeechRecognition = undefined;
    
    expect(() => new SpeechRecognitionService({ onResult: vi.fn() })).toThrow();
  });
});