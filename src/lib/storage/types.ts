export interface FileKind {
  ext: string;
  maxBytes: number;
  /** Checks the file's leading bytes so a renamed file can't pass as another type. */
  sniff: (b: Buffer) => boolean;
}

/** Where uploads live. Drivers only store and delete; validation happens in `lib/storage.ts`. */
export interface StorageDriver {
  /** Stores an already-validated file and returns its public URL. */
  save(siteId: string, buffer: Buffer, kind: FileKind): Promise<string>;
  /** Deletes a file if the URL belongs to this driver; otherwise does nothing. Never throws. */
  remove(url: string): Promise<void>;
  /** Deletes every file of a site. */
  removeSite(siteId: string): Promise<void>;
}
