import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

import { drain } from '../drain';

describe('drain', () => {
  test('handles null stream', async () => {
    // Should not throw
    await drain(null);
  });

  test('drains stream using WritableStream when available', async () => {
    const mockStream = {
      pipeTo: vi.fn().mockResolvedValue(undefined),
      cancel: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReadableStream;

    await drain(mockStream);

    expect(mockStream.pipeTo).toHaveBeenCalled();
    expect(mockStream.cancel).not.toHaveBeenCalled();
  });

  test('catches errors from pipeTo', async () => {
    const mockStream = {
      pipeTo: vi.fn().mockRejectedValue(new Error('pipeTo failed')),
      cancel: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReadableStream;

    // Should not throw
    await drain(mockStream);

    expect(mockStream.pipeTo).toHaveBeenCalled();
  });

  describe('without WritableStream (React Native)', () => {
    let originalWritableStream: typeof WritableStream | undefined;

    beforeEach(() => {
      originalWritableStream = globalThis.WritableStream;
      // @ts-expect-error - simulating React Native environment
      delete globalThis.WritableStream;
    });

    afterEach(() => {
      if (originalWritableStream) {
        globalThis.WritableStream = originalWritableStream;
      }
    });

    test('falls back to stream.cancel() when WritableStream is unavailable', async () => {
      const mockStream = {
        pipeTo: vi.fn().mockResolvedValue(undefined),
        cancel: vi.fn().mockResolvedValue(undefined),
      } as unknown as ReadableStream;

      await drain(mockStream);

      expect(mockStream.pipeTo).not.toHaveBeenCalled();
      expect(mockStream.cancel).toHaveBeenCalled();
    });

    test('catches errors from cancel()', async () => {
      const mockStream = {
        pipeTo: vi.fn().mockResolvedValue(undefined),
        cancel: vi.fn().mockRejectedValue(new Error('cancel failed')),
      } as unknown as ReadableStream;

      // Should not throw
      await drain(mockStream);

      expect(mockStream.cancel).toHaveBeenCalled();
    });

    test('handles stream without cancel method', async () => {
      const mockStream = {
        pipeTo: vi.fn().mockResolvedValue(undefined),
        // No cancel method
      } as unknown as ReadableStream;

      // Should not throw
      await drain(mockStream);
    });
  });
});
