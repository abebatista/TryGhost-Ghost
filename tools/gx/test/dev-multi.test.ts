import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { multiEnv, secondGhostPort } from '../lib/dev-multi.ts';

const repo = fileURLToPath(new URL('../../../', import.meta.url));

describe('multiEnv', () => {
  it('keeps each checkout out of the others’ Redis keys', () => {
    const env = multiEnv({ GHOST_DEV_NAME: 'one', GHOST_DEV_BACKEND_PORT: '2401' });
    assert.equal(env.GHOST_DEV_BACKEND_PORT_2, '3401');
    assert.equal(env.adapters__cache__postsPublic__adapter, 'Redis');
    assert.equal(env.adapters__cache__postsPublic__keyPrefix, 'one:posts-public:');
    assert.equal(env.hostSettings__postsPublicCache__enabled, 'true');
    assert.equal(env.adapters__cache__tagsPublic__keyPrefix, 'one:tags-public:');
    assert.equal(env.adapters__cache__imageSizes__keyPrefix, 'one:image-sizes:');
  });

  it('never gives a worktree a port another worktree can be assigned', () => {
    const assigned = [2368, 2369];
    for (let port = 2400; port < 3000; port++) {
      assigned.push(port);
    }
    for (const backend of [2369, 2401, 2999]) {
      const second = secondGhostPort({ GHOST_DEV_BACKEND_PORT: String(backend) });
      assert.equal(assigned.includes(second), false, `port ${second}`);
    }
  });
});

describe('dev:up', () => {
  it('offers dev:multi among the commands that run Ghost on the host', () => {
    const result = spawnSync(process.execPath, ['tools/gx/dev-up.ts', 'dev:docker'], {
      cwd: repo,
      encoding: 'utf8',
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /doesn't run Ghost on the host\. Try one of: .*dev:multi/);
  });
});
