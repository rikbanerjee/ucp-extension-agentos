import { SandboxProduct } from '../types/agent-os';

export type SimulationState = 'IDLE' | 'EXTRACTING_INTENT' | 'BROWSING_CATALOGS' | 'EVALUATING_RULES' | 'COMPLETED';

export interface TraceNode {
  id: string;
  name: string;
  type: 'llm' | 'tool' | 'logic';
  latencyMs: number;
  status: 'success' | 'warning' | 'error';
  payload?: any;
  children?: TraceNode[];
}

export interface AgentAction {
  type: 'ADD_TO_CART' | 'REQUIRE_USER_INPUT' | 'REJECT_REQUEST' | 'REQUIRE_DEPENDENCY';
  reasoning: string[];
  payload?: any;
  traces: TraceNode[];
}

export function evaluateProductRequest(product: SandboxProduct, requestedQty: number, userContext: any): AgentAction {
  const reasoning: string[] = [];
  const traces: TraceNode[] = [];
  const exts = product.extensions;
  
  reasoning.push(`Evaluating request for ${requestedQty}x [${product.title}]`);

  const coreTrace: TraceNode = {
    id: 't_root',
    name: 'evaluate_product_request',
    type: 'logic',
    latencyMs: Math.floor(Math.random() * 50) + 120, // Mock latency
    status: 'success',
    children: []
  };

  // 1. Evaluate Inventory
  const invTrace: TraceNode = {
    id: 't_inv',
    name: 'check_inventory_constraints',
    type: 'tool',
    latencyMs: Math.floor(Math.random() * 20) + 30,
    status: 'success',
    payload: exts.inventory_state
  };
  coreTrace.children!.push(invTrace);

  if (exts.inventory_state) {
    if (exts.inventory_state.status === 'OUT_OF_STOCK') {
      invTrace.status = 'error';
      reasoning.push('❌ Item is out of stock. Rejecting.');
      traces.push(coreTrace);
      return { type: 'REJECT_REQUEST', reasoning, traces };
    }
    if (exts.inventory_state.status === 'MADE_TO_ORDER' && exts.inventory_state.leadTimeDays) {
      invTrace.status = 'warning';
      reasoning.push(`⚠️ Item is made to order. Lead time is ${exts.inventory_state.leadTimeDays} days.`);
    }
  }

  // 2. Evaluate Fulfillment (Perishability)
  const fulfillTrace: TraceNode = {
    id: 't_fulfill',
    name: 'validate_fulfillment_zone',
    type: 'tool',
    latencyMs: Math.floor(Math.random() * 15) + 20,
    status: 'success',
    payload: { zone: userContext.deliveryZone, reqs: exts.fulfillment_promises }
  };
  coreTrace.children!.push(fulfillTrace);

  if (exts.fulfillment_promises?.coldChainRequired) {
    if (userContext.deliveryZone !== 'NY_LOCAL_ZONES') {
      fulfillTrace.status = 'error';
      reasoning.push(`❌ Cold chain required. Delivery zone ${userContext.deliveryZone} is unsupported.`);
      traces.push(coreTrace);
      return { type: 'REJECT_REQUEST', reasoning, traces };
    }
  }

  // 3. Evaluate Dependencies
  const depTrace: TraceNode = {
    id: 't_dep',
    name: 'analyze_product_relations',
    type: 'logic',
    latencyMs: Math.floor(Math.random() * 10) + 10,
    status: 'success',
    payload: exts.product_relations
  };
  coreTrace.children!.push(depTrace);

  if (exts.product_relations?.requires && exts.product_relations.requires.length > 0) {
    depTrace.status = 'warning';
    reasoning.push(`⚠️ Detected required dependencies: ${exts.product_relations.requires.join(', ')}`);
    reasoning.push('Agent must bundle dependencies to prevent unusable purchase.');
    traces.push(coreTrace);
    return { 
      type: 'REQUIRE_DEPENDENCY', 
      reasoning, 
      payload: { requiredSkus: exts.product_relations.requires },
      traces 
    };
  }

  // 4. Evaluate Intent Routing
  const intentTrace: TraceNode = {
    id: 't_intent',
    name: 'check_merchant_intent_rules',
    type: 'logic',
    latencyMs: Math.floor(Math.random() * 5) + 5,
    status: 'success',
    payload: exts.intent_routing
  };
  coreTrace.children!.push(intentTrace);

  if (exts.intent_routing) {
    if (exts.intent_routing.action === 'request_quote') {
      intentTrace.status = 'warning';
      reasoning.push('⚠️ Merchant requires a quote request for this item.');
      reasoning.push(`Required inputs: ${exts.intent_routing.requiredInputs?.join(', ')}`);
      traces.push(coreTrace);
      return { 
        type: 'REQUIRE_USER_INPUT', 
        reasoning, 
        payload: { action: 'request_quote', requiredInputs: exts.intent_routing.requiredInputs },
        traces
      };
    }
    if (exts.intent_routing.action === 'configure_custom') {
      intentTrace.status = 'warning';
      reasoning.push('⚠️ Merchant requires custom configuration.');
      traces.push(coreTrace);
      return { 
        type: 'REQUIRE_USER_INPUT', 
        reasoning, 
        payload: { action: 'configure_custom', requiredInputs: exts.intent_routing.requiredInputs },
        traces
      };
    }
  }

  // 5. Evaluate Risk
  if (exts.return_policy?.isFinalSale) {
    coreTrace.children!.push({
      id: 't_risk',
      name: 'evaluate_purchase_risk',
      type: 'logic',
      latencyMs: 2,
      status: 'warning',
      payload: exts.return_policy
    });
    reasoning.push('ℹ️ Note: This item is Final Sale (no returns). Informing user of risk.');
  }

  traces.push(coreTrace);
  reasoning.push('✅ Evaluation complete. Safe to proceed to cart.');
  return { type: 'ADD_TO_CART', reasoning, traces };
}
