type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: Gtag;
  }
}

export function trackPatchUpload(fileCount: number): void {
  window.gtag?.('event', 'patch_upload', {
    file_count: fileCount,
  });
}
