// Worktree port pairs go up in twos, so the next port along is another worktree's front door.
// Worked out rather than stored so `pnpm dev` never sees it.
const SECOND_GHOST_OFFSET = 1000;

export function secondGhostPort(env: Record<string, string>): number {
  return Number(env.GHOST_DEV_BACKEND_PORT) + SECOND_GHOST_OFFSET;
}

/**
 * What `pnpm dev:multi` adds to the environment of everything it starts. The caches go to Redis
 * so both Ghosts share them, under this checkout's name because every checkout shares Redis.
 */
export function multiEnv(env: Record<string, string>): Record<string, string> {
  const name = env.GHOST_DEV_NAME ?? '';
  const cache = (key: string, prefix: string) => ({
    [`adapters__cache__${key}__adapter`]: 'Redis',
    [`adapters__cache__${key}__keyPrefix`]: `${name}:${prefix}:`,
    [`adapters__cache__${key}__ttl`]: '300',
  });
  return {
    GHOST_DEV_BACKEND_PORT_2: String(secondGhostPort(env)),
    ...cache('postsPublic', 'posts-public'),
    hostSettings__postsPublicCache__enabled: 'true',
    ...cache('tagsPublic', 'tags-public'),
    hostSettings__tagsPublicCache__enabled: 'true',
    ...cache('imageSizes', 'image-sizes'),
  };
}
