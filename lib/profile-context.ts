import { AsyncLocalStorage } from "node:async_hooks";

// Per-request profile override. The Next.js MCP route handler binds this for
// the lifetime of an incoming JSON-RPC call so every repository call inside
// the tool handlers scopes to the right profile — without leaning on cookies
// (which clients like Claude don't send).
const profileSlugContext = new AsyncLocalStorage<string>();

export function runWithProfile<T>(slug: string, fn: () => Promise<T>): Promise<T> {
  return profileSlugContext.run(slug, fn);
}

export function getProfileFromContext(): string | undefined {
  return profileSlugContext.getStore();
}
