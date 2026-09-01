import type { WebMcpToolName } from '../../../packages/webmcp/src';

export function toolLabel(tool: WebMcpToolName | 'checkout'): string {
  switch (tool) {
    case 'get_storefront_capabilities': return 'Storefront capabilities';
    case 'search_catalog': return 'Search catalog';
    case 'evaluate_shopping_plan': return 'Evaluate shopping plan';
    case 'find_valid_alternatives': return 'Find valid alternatives';
    case 'apply_plan_repair': return 'Apply plan repair';
    case 'prepare_validated_cart': return 'Prepare validated cart';
    case 'request_quote': return 'Request quote';
    default: return 'Checkout';
  }
}
