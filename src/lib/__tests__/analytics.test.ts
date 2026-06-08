import { beforeEach, describe, expect, test, vi } from 'vitest';
import { trackInferenceError, trackInferenceFallback, trackUnsupportedOutputTarget } from '../analytics';

describe('analytics telemetry helpers', () => {
  const gtagMock = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('window', { gtag: gtagMock });
  });

  test('trackInferenceError sends infer_error event', () => {
    trackInferenceError('test_error', { detail: 'failure' });
    expect(gtagMock).toHaveBeenCalledWith('event', 'infer_error', {
      reason: 'test_error',
      detail: 'failure'
    });
  });

  test('trackInferenceFallback sends infer_worker_fallback event', () => {
    trackInferenceFallback('worker_missing', { stage: 'init' });
    expect(gtagMock).toHaveBeenCalledWith('event', 'infer_worker_fallback', {
      reason: 'worker_missing',
      stage: 'init'
    });
  });

  test('trackUnsupportedOutputTarget sends infer_unsupported_output event', () => {
    trackUnsupportedOutputTarget('abc', 'unsupported');
    expect(gtagMock).toHaveBeenCalledWith('event', 'infer_unsupported_output', {
      target: 'abc',
      requested: 'unsupported'
    });
  });
});
