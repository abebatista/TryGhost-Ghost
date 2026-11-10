import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { StorageBase } from 'ghost-storage-base';

export interface StagedImportFile {
  key: string;
  name: string;
}

export interface DownloadedImportFile {
  path: string;
  cleanup(): Promise<void>;
}

export interface ImportFileStager {
  stage(file: { filePath: string; fileName: string }): Promise<StagedImportFile>;
  download(file: StagedImportFile): Promise<DownloadedImportFile>;
  remove(file: StagedImportFile): Promise<void>;
}

type ImportsStorage = StorageBase & {
  readStream(options: { path: string }): Promise<Readable>;
};

export function createImportFileStager(getStorage: () => ImportsStorage): ImportFileStager {
  return {
    async stage({ filePath, fileName }) {
      const storage = getStorage();
      const name = `content-csv-import-${crypto.randomUUID()}`;

      try {
        const url = await storage.save({ name, path: filePath }, storage.storagePath);
        return { key: storage.urlToPath(url), name: fileName };
      } catch (error) {
        await storage.delete(name).catch(() => {});
        throw error;
      }
    },

    async download(file) {
      const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'content-csv-download-'));
      const cleanup = () => fs.promises.rm(directory, { recursive: true, force: true });
      const downloadPath = path.join(directory, 'upload');

      try {
        await pipeline(
          await getStorage().readStream({ path: file.key }),
          fs.createWriteStream(downloadPath),
        );
        return { path: downloadPath, cleanup };
      } catch (error) {
        await cleanup().catch(() => {});
        throw error;
      }
    },

    async remove(file) {
      await getStorage().delete(file.key);
    },
  };
}
