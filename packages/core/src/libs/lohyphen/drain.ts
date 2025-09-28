export function drain(stream: ReadableStream | null) {
  return stream?.pipeTo(new WritableStream({ write() {} })).catch(() => {});
}
