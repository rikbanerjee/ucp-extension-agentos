import type { WebMcpBrowserAdapter, WebMcpModelContext } from './types';

/** The only direct browser API boundary in this package. */
export function createBrowserAdapter(): WebMcpBrowserAdapter {
  return {
    getModelContext(): WebMcpModelContext | undefined {
      if (typeof document === 'undefined') return undefined;
      const modelContext = (document as Document & { modelContext?: WebMcpModelContext }).modelContext;
      return modelContext && typeof modelContext.registerTool === 'function' ? modelContext : undefined;
    },
  };
}
