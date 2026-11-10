import { setTimeout as sleep } from 'node:timers/promises';
import { checkoutSettings } from './lib/dev-stack.ts';

// Holds back `pnpm dev:multi`'s second Ghost until the first answers, so the first alone sets up
// the database and runs any migrations. Started together, the loser exits. As in the front door,
// Ghost answers 503 until it has booted, and an https url redirects this plain request.
const site = `http://127.0.0.1:${checkoutSettings().GHOST_DEV_BACKEND_PORT}/ghost/api/admin/site/`;
const isUp = () =>
  fetch(site, { redirect: 'manual' }).then(
    (res) => res.status < 500,
    () => false,
  );
while (!(await isUp())) {
  await sleep(500);
}
