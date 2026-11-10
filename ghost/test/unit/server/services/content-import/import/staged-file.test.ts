import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import sinon from 'sinon';
import { afterEach, beforeEach, describe, it } from 'vitest';
import LocalStorageBase from '../../../../../../core/server/adapters/storage/LocalStorageBase';
import { createImportFileStager } from '../../../../../../core/server/services/content-import/import/staged-file';

describe('content import staged file', function () {
  let sourceDirectory: string;
  let sourcePath: string;
  let storagePath: string;
  // Configured the way storage:imports is by default.
  const importsStore = () =>
    new LocalStorageBase({ storagePath, staticFileURLPrefix: 'content/imports' });

  beforeEach(async function () {
    sourceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'content-import-stager-test-'));
    sourcePath = path.join(sourceDirectory, 'upload');
    await fs.writeFile(sourcePath, 'title\nA staged post\n');
    storagePath = await fs.mkdtemp(path.join(os.tmpdir(), 'content-import-store-test-'));
  });

  afterEach(async function () {
    sinon.restore();
    await fs.remove(sourceDirectory);
    await fs.remove(storagePath);
  });

  it('stores uploads under unique keys and removes them idempotently', async function () {
    const stager = createImportFileStager(importsStore);
    const first = await stager.stage({ filePath: sourcePath, fileName: 'posts.csv' });
    const second = await stager.stage({ filePath: sourcePath, fileName: 'posts.csv' });

    assert.notEqual(first.key, second.key);
    assert.match(first.key, /^content-csv-import-[0-9a-f-]{36}$/);
    assert.equal(first.name, 'posts.csv');
    assert.equal(
      await fs.readFile(path.join(storagePath, first.key), 'utf8'),
      'title\nA staged post\n',
    );

    await stager.remove(first);
    await stager.remove(first);
    assert.deepEqual(await fs.readdir(storagePath), [second.key]);
  });

  it('downloads a stored upload to a local copy that cleanup removes', async function () {
    const stager = createImportFileStager(importsStore);
    const staged = await stager.stage({ filePath: sourcePath, fileName: 'posts.csv' });
    await fs.remove(sourcePath);

    const downloaded = await stager.download(staged);

    assert.equal(await fs.readFile(downloaded.path, 'utf8'), 'title\nA staged post\n');
    await downloaded.cleanup();
    assert.equal(await fs.pathExists(path.dirname(downloaded.path)), false);
    assert.deepEqual(await fs.readdir(storagePath), [staged.key]);
  });

  it('leaves no local copy when the download fails', async function () {
    const stager = createImportFileStager(importsStore);
    const mkdtemp = sinon.spy(fs.promises, 'mkdtemp');

    await assert.rejects(stager.download({ key: 'missing', name: 'posts.csv' }), {
      errorType: 'NotFoundError',
    });

    assert.equal(fs.existsSync(await mkdtemp.firstCall.returnValue), false);
  });

  it('removes a partial staged file when the copy fails', async function () {
    const stager = createImportFileStager(importsStore);
    sinon.stub(fs, 'copy').callsFake(async (_src: unknown, dest: unknown) => {
      await fs.writeFile(dest as string, 'partial');
      throw new Error('copy failed');
    });

    await assert.rejects(
      stager.stage({ filePath: sourcePath, fileName: 'posts.csv' }),
      /copy failed/,
    );

    assert.deepEqual(await fs.readdir(storagePath), []);
  });
});
