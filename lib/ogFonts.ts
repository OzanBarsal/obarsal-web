// Inlined as base64 data URLs by Vite's `?inline`: the Worker has no filesystem
// to read from. These are `.ttf` because Satori cannot parse woff2.
import groteskDataUrl from './og/fonts/SpaceGrotesk-600.ttf?inline';
import monoDataUrl from './og/fonts/JetBrainsMono-400.ttf?inline';

function decode(dataUrl: string): ArrayBuffer {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export const spaceGrotesk600 = decode(groteskDataUrl);
export const jetBrainsMono400 = decode(monoDataUrl);
