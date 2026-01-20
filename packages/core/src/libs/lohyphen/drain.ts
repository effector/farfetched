export function drain(stream: ReadableStream | null) {
  if (!stream) return;

  // Check if WritableStream is available (not available in React Native)
  if (typeof WritableStream !== 'undefined') {
    return stream.pipeTo(new WritableStream({ write() {} })).catch(() => {});
  }

  // Fallback: cancel the stream
  return stream.cancel?.().catch(() => {});
}
