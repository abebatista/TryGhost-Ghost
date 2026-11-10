import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { APP_FAILURE_CODES } from '@tryghost/app-contracts';

const serviceRoot = path.resolve(
  __dirname,
  '../../../../../core/server/services/app-installations',
);

/** Codes the service throws that never reach Admin, with why. */
const NOT_FOR_ADMIN = new Map([
  ['APP_CONFIG_INVALID', 'Thrown at boot, when the site’s apps config is invalid'],
]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(file);
    }
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts') ? [file] : [];
  });
}

/**
 * Every string in the service's code that reads as an app failure code. Parsed, so a code in
 * a comment doesn't count, and a code passed through, as in `err.code ?? 'APP_UNAVAILABLE'`,
 * does.
 */
function codesInService(): Set<string> {
  const codes = new Set<string>();
  for (const file of sourceFiles(serviceRoot)) {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest);
    const visit = (node: ts.Node) => {
      if (ts.isStringLiteralLike(node) && /^APP_[A-Z_]+$/.test(node.text)) {
        codes.add(node.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return codes;
}

describe('app installation failure codes', function () {
  const thrown = codesInService();

  it('match the codes app-contracts lists for Admin', function () {
    const listed = new Set<string>(APP_FAILURE_CODES);
    const forAdmin = [...thrown].filter((code) => !NOT_FOR_ADMIN.has(code));

    const unlisted = forAdmin.filter((code) => !listed.has(code)).sort();
    const neverThrown = [...listed].filter((code) => !thrown.has(code)).sort();
    assert.deepEqual(
      unlisted,
      [],
      `Used in the service but not in APP_FAILURE_CODES: ${unlisted.join(', ')}`,
    );
    assert.deepEqual(
      neverThrown,
      [],
      `In APP_FAILURE_CODES but not used in the service: ${neverThrown.join(', ')}`,
    );
  });

  it('keeps out of the list only codes that never reach Admin', function () {
    for (const code of NOT_FOR_ADMIN.keys()) {
      assert.ok(thrown.has(code), `${code} is no longer thrown`);
      assert.ok(!(APP_FAILURE_CODES as readonly string[]).includes(code));
    }
  });
});
