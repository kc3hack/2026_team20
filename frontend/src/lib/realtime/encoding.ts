const CHUNK_SIZE = 32 * 1024;

export function encodeYjsUpdate(update: Uint8Array): string {
  if (update.length === 0) return "";

  if (update.length <= CHUNK_SIZE) {
    return btoa(String.fromCharCode(...update));
  }

  let binary = "";
  for (let offset = 0; offset < update.length; offset += CHUNK_SIZE) {
    const chunk = update.subarray(offset, offset + CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function decodeYjsUpdate(encoded: string): Uint8Array {
  if (encoded === "") return new Uint8Array(0);

  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
