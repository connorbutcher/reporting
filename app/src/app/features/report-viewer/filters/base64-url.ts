/** URL-safe base64 of UTF-8 text. */
export class Base64Url {
  private static readonly CHUNK = 0x8000;

  public static encode(text: string): string {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let i = 0; i < bytes.length; i += Base64Url.CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + Base64Url.CHUNK));
    }
    return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  }

  /** Throws on malformed input. */
  public static decode(text: string): string {
    const base64 = text.replaceAll('-', '+').replaceAll('_', '/');
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    return new TextDecoder('utf-8', { fatal: true }).decode(
      Uint8Array.from(binary, (c) => c.charCodeAt(0)),
    );
  }
}
