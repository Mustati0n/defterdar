export interface StoredObjectMetadata {
  mimeType: string | null;
  sizeBytes: number;
}

export interface SignedStorageUrl {
  expiresAt: Date;
  url: string;
}

export abstract class ObjectStorageService {
  abstract createUploadUrl(
    storageKey: string,
    mimeType: string,
    sizeBytes: number,
  ): Promise<SignedStorageUrl>;
  abstract createDownloadUrl(storageKey: string): Promise<SignedStorageUrl>;
  abstract head(storageKey: string): Promise<StoredObjectMetadata | null>;
  abstract delete(storageKey: string): Promise<void>;
}
