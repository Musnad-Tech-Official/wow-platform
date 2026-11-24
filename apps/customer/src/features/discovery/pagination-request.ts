/**
 * One in-flight page per active filter generation. Invalidation is synchronous
 * so an old response (including its finally block) cannot touch the next search.
 */
export function createPaginationRequestGate() {
  let active: symbol | null = null;
  return {
    begin(): symbol | null {
      if (active !== null) return null;
      active = Symbol('discovery-page');
      return active;
    },
    invalidate(): void {
      active = null;
    },
    isCurrent(request: symbol): boolean {
      return active === request;
    },
    finish(request: symbol): boolean {
      if (active !== request) return false;
      active = null;
      return true;
    },
  };
}
