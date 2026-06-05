/**
 * Minimal dependency-injection registry (service locator) used as the
 * application composition root, so domain modules can depend on *contracts*
 * declared in `common` instead of importing each other's concrete services.
 *
 * Implementations are registered once at startup (see `register-services.ts`),
 * and consumers resolve them lazily — at first use, never at module-load time —
 * which keeps construction order independent of import order.
 */
type Factory<T> = () => T;

const registry = new Map<string, Factory<unknown>>();

export const PORT_TOKENS = {
  FlightLookup: "FlightLookupPort",
  GeoLookup: "GeoLookupPort",
} as const;

export type PortToken = (typeof PORT_TOKENS)[keyof typeof PORT_TOKENS];

export function registerService<T>(token: string, factory: Factory<T>): void {
  registry.set(token, factory);
}

export function resolveService<T>(token: string): T {
  const factory = registry.get(token);
  if (!factory) {
    throw new Error(
      `No implementation registered for "${token}". ` +
        "Did the composition root (register-services.ts) run at startup?",
    );
  }
  return factory() as T;
}

/** Test helper — clears all registrations. */
export function __clearRegistryForTests(): void {
  registry.clear();
}
