import { ObjectStorageService } from './object-storage.service.js';

export class InMemoryObjectStorageService extends ObjectStorageService {
  private readonly objects = new Map<string, { mimeType: string; sizeBytes: number }>();

  async createUploadUrl(storageKey: string, mimeType: string, sizeBytes: number) {
    this.objects.set(storageKey, { mimeType, sizeBytes });
    return { url: `memory://upload/${encodeURIComponent(storageKey)}`, expiresAt: this.expiresAt() };
  }

  async createDownloadUrl(storageKey: string) {
    return { url: `memory://download/${encodeURIComponent(storageKey)}`, expiresAt: this.expiresAt() };
  }

  async head(storageKey: string) {
    return this.objects.get(storageKey) ?? null;
  }

  async delete(storageKey: string) {
    this.objects.delete(storageKey);
  }

  private expiresAt() {
    return new Date(Date.now() + 15 * 60 * 1000);
  }
}
