'use client';
import React from 'react';
import { SandboxProduct } from '../types/agent-os';
import { AgentAction, SimulationState, TraceNode } from '../logic/agent-brain';

// Recursive Subcomponent for Trace Waterfall
function TraceNodeView({ node, depth = 0 }: { node: TraceNode, depth?: number }) {
  const [expanded, setExpanded] = React.useState(depth === 0);
  
  const statusColor = node.status === 'success' ? 'text-green-400' : node.status === 'warning' ? 'text-yellow-400' : 'text-red-400';
  const typeColor = node.type === 'tool' ? 'text-blue-400' : node.type === 'llm' ? 'text-purple-400' : 'text-gray-400';
  
  return (
    <div className="flex flex-col text-xs font-mono w-full">
      <div 
        className={`flex items-center gap-2 p-1.5 hover:bg-gray-800 rounded cursor-pointer transition-colors ${depth > 0 ? 'ml-4 border-l border-gray-700 pl-2' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-4 flex justify-center text-gray-500">
          {(node.children?.length || node.payload) ? (expanded ? '▼' : '▶') : '•'}
        </div>
        <div className={`font-semibold ${typeColor}`}>[{node.type.toUpperCase()}]</div>
        <div className="text-gray-300">{node.name}</div>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-gray-500">{node.latencyMs}ms</div>
          <div className={statusColor}>{node.status === 'success' ? 'OK' : node.status === 'warning' ? 'WARN' : 'ERR'}</div>
        </div>
      </div>
      
      {expanded && (
        <div className={`${depth > 0 ? 'ml-4 border-l border-gray-700 pl-6 py-1' : 'ml-2 pl-4 py-1'}`}>
          {node.payload && (
            <pre className="bg-gray-950 p-2 rounded border border-gray-800 text-[10px] text-gray-400 overflow-x-auto mb-2 mt-1">
              {JSON.stringify(node.payload, null, 2)}
            </pre>
          )}
          {node.children?.map((child, i) => (
            <TraceNodeView key={child.id || i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

interface AgentMechanicsVisualizerProps {
  product: SandboxProduct | null;
  agentAction: AgentAction | null;
  simState: SimulationState;
}

export function AgentMechanicsVisualizer({ product, agentAction, simState }: AgentMechanicsVisualizerProps) {
  if (simState === 'IDLE' || !product) {
    return (
      <div className="flex flex-col h-full min-h-0 bg-gray-900 text-gray-400 rounded-lg border border-gray-800 font-mono text-sm p-8 justify-center items-center text-center shadow-sm">
        <div className="w-12 h-12 mb-4 text-gray-700">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
        </div>
        Waiting for user request...<br/>
        Select a scenario on the left to watch the agent process it.
      </div>
    );
  }

  // Helper to determine step visual state
  const getStepClass = (targetStates: SimulationState[]) => {
    // If the simulation is complete, everything is 'done' (lit up but not pulsing)
    if (simState === 'COMPLETED') return 'border-blue-500 bg-blue-900/20 opacity-100';
    // If it's the current active state, pulse it brightly
    if (targetStates.includes(simState)) return 'border-blue-400 bg-blue-900/40 opacity-100 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-pulse';
    // If we've passed this state, keep it lit
    const order = ['EXTRACTING_INTENT', 'BROWSING_CATALOGS', 'EVALUATING_RULES', 'COMPLETED'];
    const currentIdx = order.indexOf(simState);
    const targetIdx = order.indexOf(targetStates[0]);
    if (currentIdx > targetIdx) return 'border-blue-500 bg-blue-900/20 opacity-100';
    // Not reached yet
    return 'border-gray-800 opacity-40';
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-900 text-gray-300 rounded-lg border border-gray-800 font-mono text-sm overflow-hidden shadow-sm">
      <div className="bg-gray-950 border-b border-gray-800 p-3 text-xs text-blue-400 font-semibold tracking-wider uppercase flex justify-between shrink-0">
        <span>Agent Mechanics Visualizer</span>
        <span>{simState === 'COMPLETED' ? 'DONE' : 'PROCESSING...'}</span>
      </div>
      
      <div className="flex-grow p-4 overflow-y-auto flex flex-col gap-4 relative">
        
        {/* Step 1: Intent Extraction */}
        <div className={`p-4 rounded-lg border transition-all duration-300 ${getStepClass(['EXTRACTING_INTENT'])}`}>
          <div className="text-blue-300 font-semibold mb-1 flex items-center gap-2">
            <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-xs">Step 1</span> 
            Understanding User Intent
          </div>
          <p className="text-gray-400 text-xs mb-2">The agent converts plain English into a structured goal.</p>
          <div className="bg-gray-950 p-2 rounded text-xs border border-gray-800 flex gap-4">
            <div><span className="text-gray-500">Goal:</span> <span className="text-green-400">PURCHASE</span></div>
            <div><span className="text-gray-500">Target:</span> <span className="text-green-400">{product.title}</span></div>
          </div>
        </div>

        {/* Step 2: Browsing & Discovery */}
        <div className={`p-4 rounded-lg border transition-all duration-300 ${getStepClass(['BROWSING_CATALOGS'])}`}>
          <div className="text-blue-300 font-semibold mb-1 flex items-center gap-2">
            <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-xs">Step 2</span> 
            Searching Merchant Networks
          </div>
          <p className="text-gray-400 text-xs mb-2">The agent silently pings merchant profiles to find the exact match.</p>
          {(simState === 'BROWSING_CATALOGS' || simState === 'EVALUATING_RULES' || simState === 'COMPLETED') && (
            <div className="bg-gray-950 p-2 rounded text-xs border border-gray-800 text-gray-400">
              <div className="text-gray-500">GET /.well-known/ucp</div>
              <div>Searching for capability: {product.id}... <span className="text-green-400 ml-2">FOUND</span></div>
            </div>
          )}
        </div>
        {/* Step 3: Rules & Constraints */}
        <div className={`p-4 rounded-lg border transition-all duration-300 ${getStepClass(['EVALUATING_RULES'])}`}>
          <div className="text-blue-300 font-semibold mb-1 flex items-center gap-2">
            <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-xs">Step 3</span> 
            Evaluating Retail Constraints (UCP Extensions)
          </div>
          <p className="text-gray-400 text-xs mb-2">Before buying, the agent reads the merchant's machine-readable rules to ensure it's safe.</p>
          
          {(simState === 'EVALUATING_RULES' || simState === 'COMPLETED') && (
            <div className="flex flex-col gap-2">
              {agentAction?.traces?.map((trace, i) => (
                <div key={i} className="bg-gray-950 rounded border border-gray-800 p-2">
                  <TraceNodeView node={trace} />
                </div>
              ))}
              
              {agentAction && (
                <div className="bg-gray-950 p-2 rounded text-xs border border-gray-800 mt-2">
                  <div className="text-yellow-500 mb-1 font-semibold">Agent Thoughts:</div>
                  {agentAction.reasoning.map((step, i) => (
                    <div key={i} className={`${step.startsWith('❌') ? 'text-red-400' : step.startsWith('⚠️') ? 'text-yellow-400' : step.startsWith('✅') ? 'text-green-400' : 'text-gray-500'}`}>
                      {step}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 4: Outcome */}
        <div className={`p-4 rounded-lg border transition-all duration-300 ${getStepClass(['COMPLETED'])}`}>
          <div className="text-blue-300 font-semibold mb-1 flex items-center gap-2">
            <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-xs">Step 4</span> 
            Agent Action
          </div>
          
          {(simState === 'COMPLETED' && agentAction) && (
            <div className={`mt-2 p-3 rounded text-xs font-semibold border ${agentAction.type === 'ADD_TO_CART' ? 'bg-green-900/30 border-green-800 text-green-400' : agentAction.type === 'REJECT_REQUEST' ? 'bg-red-900/30 border-red-800 text-red-400' : 'bg-yellow-900/30 border-yellow-800 text-yellow-400'}`}>
              [OUTCOME] {agentAction.type}
              {agentAction.payload && (
                <pre className="mt-2 text-gray-400 font-normal">
                  {JSON.stringify(agentAction.payload, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
