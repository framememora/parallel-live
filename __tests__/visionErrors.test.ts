import {
  CAPTURE_INTERVAL_MS,
  MissingApiKeyError,
  VisionRequestError,
  classifyVisionError,
  nextBackoffMs,
} from '../src/services/ai/visionErrors';

describe('classifyVisionError', () => {
  it('names a missing key as its own permanent case', () => {
    expect(classifyVisionError(new MissingApiKeyError())).toBe('missing-key');
  });

  it('treats a rejected key as permanent', () => {
    expect(classifyVisionError(new VisionRequestError(401, 'claude-haiku-4-5', 'unauthorized'))).toBe('auth');
    expect(classifyVisionError(new VisionRequestError(403, 'claude-haiku-4-5', 'forbidden'))).toBe('auth');
  });

  it('treats a refused request as permanent, since the next one is identical', () => {
    // The case worth having: a model rejecting `output_config.effort`, which
    // returns 400 forever until the user picks a different model.
    expect(classifyVisionError(new VisionRequestError(400, 'claude-haiku-4-5', 'bad effort'))).toBe('request');
    expect(classifyVisionError(new VisionRequestError(404, 'claude-haiku-4-5', 'no such model'))).toBe('request');
  });

  it('treats rate limits and server faults as worth retrying', () => {
    expect(classifyVisionError(new VisionRequestError(429, 'claude-haiku-4-5', 'slow down'))).toBe('transient');
    expect(classifyVisionError(new VisionRequestError(500, 'claude-haiku-4-5', 'oops'))).toBe('transient');
    expect(classifyVisionError(new VisionRequestError(529, 'claude-haiku-4-5', 'overloaded'))).toBe('transient');
  });

  it('falls back to transient for anything it cannot identify', () => {
    // Network failures, aborted requests, and a snapshot that threw all land here.
    expect(classifyVisionError(new TypeError('Network request failed'))).toBe('transient');
    expect(classifyVisionError(new Error('PreviewView isn’t ready yet!'))).toBe('transient');
    expect(classifyVisionError('something odd')).toBe('transient');
    expect(classifyVisionError(undefined)).toBe('transient');
  });
});

describe('nextBackoffMs', () => {
  it('leaves the first retry at the normal capture interval', () => {
    expect(nextBackoffMs(0)).toBe(CAPTURE_INTERVAL_MS);
    expect(nextBackoffMs(1)).toBe(CAPTURE_INTERVAL_MS);
  });

  it('doubles with each consecutive failure', () => {
    expect(nextBackoffMs(2)).toBe(CAPTURE_INTERVAL_MS * 2);
    expect(nextBackoffMs(3)).toBe(CAPTURE_INTERVAL_MS * 4);
  });

  it('caps, so a session left offline keeps costing one cheap attempt', () => {
    const capped = nextBackoffMs(50);
    expect(capped).toBe(160_000);
    expect(nextBackoffMs(500)).toBe(capped);
    expect(Number.isFinite(capped)).toBe(true);
  });

  it('never returns less than the base interval', () => {
    for (let attempt = 0; attempt < 20; attempt++) {
      expect(nextBackoffMs(attempt)).toBeGreaterThanOrEqual(CAPTURE_INTERVAL_MS);
    }
  });
});
