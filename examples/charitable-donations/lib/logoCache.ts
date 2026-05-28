const STORAGE_PREFIX = 'charitable-donations-logo:';

export function getCachedLogoSrc(logoId: string): string | null {
  try {
    return sessionStorage.getItem(STORAGE_PREFIX + logoId);
  } catch {
    return null;
  }
}

export function setCachedLogoSrc(logoId: string, dataUrl: string): void {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + logoId, dataUrl);
  } catch {
    // Quota exceeded or private browsing — ignore.
  }
}

export async function cacheLogoFromFile(logoId: string, file: File): Promise<void> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read logo file'));
    reader.readAsDataURL(file);
  });
  setCachedLogoSrc(logoId, dataUrl);
}
