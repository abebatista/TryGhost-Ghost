import { spawn } from 'node:child_process';
import { multiEnv, secondGhostPort } from './lib/dev-multi.ts';
import { checkoutSettings, isListening } from './lib/dev-stack.ts';
import { resolveGhostDevEnv } from '../scripts/lib/ghost-dev-env.ts';

// Runs this checkout's `pnpm dev` with a second Ghost behind the front door. Both use the same
// database, Redis, Mailpit and content folder. The front door sends a request to the Ghost its
// `X-Ghost-Target` header names, 1 or 2, and otherwise has the two take turns.
await resolveGhostDevEnv();
const settings = checkoutSettings();
const second = secondGhostPort(settings);
if (await isListening(second)) {
  console.error(`Port ${second}, which \`pnpm dev:multi\` uses, is in use.`);
  console.error("`pnpm dev:status` shows what's running; `pnpm dev:down` stops this checkout's.");
  process.exit(1);
}

console.log(`Running two Ghosts, on ports ${settings.GHOST_DEV_BACKEND_PORT} and ${second}`);
const child = spawn('nx', ['run', 'ghost-monorepo:dev:host:multi'], {
  stdio: 'inherit',
  env: { ...process.env, ...multiEnv(settings) },
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => child.kill(signal));
}
child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
