'use client';
import React, { useState } from 'react';
import { AgentChatUI } from './components/AgentChatUI';
import { AgentMechanicsVisualizer } from './components/AgentBrainLogs';
import { mockSandboxCatalog } from './data/mock-catalog';
import { evaluateProductRequest, AgentAction, SimulationState } from './logic/agent-brain';
import { SandboxProduct } from './types/agent-os';

export default function RetailAgentOsSandbox() {
  const [inspectedProduct, setInspectedProduct] = useState<SandboxProduct | null>(null);
  const [agentAction, setAgentAction] = useState<AgentAction | null>(null);
  const [simState, setSimState] = useState<SimulationState>('IDLE');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [chatHistory, setChatHistory] = useState<{sender: 'user'|'agent', text: string}[]>([
    { sender: 'agent', text: 'Hello! I am your RetailAgentOS assistant. What would you like to buy today?' }
  ]);

  const mockUserContext = {
    deliveryZone: 'TX_REMOTE',
    hasResaleCertificate: false
  };

  const handleSimulateRequest = async (product: SandboxProduct) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // 1. Add user request to chat
      const newChat = [...chatHistory, { sender: 'user' as const, text: `I want to buy: ${product.title}` }];
      setChatHistory(newChat);
      
      // Reset right panel
      setInspectedProduct(product);
      setAgentAction(null);

      // --- ANIMATED TIMELINE ---
      
      // Step 1: Extract Intent
      setSimState('EXTRACTING_INTENT');
      await new Promise(r => setTimeout(r, 800));

      // Step 2: Browse
      setSimState('BROWSING_CATALOGS');
      await new Promise(r => setTimeout(r, 1200));

      // Step 3: Evaluate Rules
      setSimState('EVALUATING_RULES');
      const action = evaluateProductRequest(product, 1, mockUserContext);
      setAgentAction(action);
      await new Promise(r => setTimeout(r, 1500));

      // Step 4: Complete
      setSimState('COMPLETED');
      
      // -------------------------

      let agentResponse = '';
      if (action.type === 'ADD_TO_CART') {
        agentResponse = `Great! I've securely added 1x ${product.title} to your cart.`;
        if (product.extensions?.return_policy?.isFinalSale) {
          agentResponse += ' Please note: This item is Final Sale and cannot be returned.';
        }
      } else if (action.type === 'REJECT_REQUEST') {
        const reason = action.reasoning.length > 0 ? action.reasoning[action.reasoning.length - 1] : '';
        agentResponse = `I'm sorry, I cannot complete this purchase. ${reason.replace(/^[❌⚠️✅]\s*/, '')}`;
      } else if (action.type === 'REQUIRE_DEPENDENCY') {
        const skus = action.payload?.requiredSkus?.join(', ') || 'required items';
        agentResponse = `I can arrange that! However, the merchant requires you to also purchase: ${skus}. Should I add the bundle?`;
      } else if (action.type === 'REQUIRE_USER_INPUT') {
        if (action.payload?.action === 'request_quote') {
          const inputs = action.payload?.requiredInputs?.join(', ') || 'details';
          agentResponse = `This item requires a custom quote. I need a few more details first: ${inputs}. Please provide them so I can contact the merchant.`;
        } else {
          const inputs = action.payload?.requiredInputs?.join(', ') || 'details';
          agentResponse = `This item requires customization. Please specify: ${inputs}.`;
        }
      }

      setChatHistory([...newChat, { sender: 'agent' as const, text: agentResponse }]);
    } catch (error: any) {
      console.error(error);
      setChatHistory([...chatHistory, { sender: 'agent', text: `System Error: ${error.message}` }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">RetailAgentOS: Sandbox Demo</h1>
          <p className="text-sm text-gray-500">Self-contained split-screen capability demonstration.</p>
        </div>
      </header>

      <main className="flex-grow flex flex-col lg:flex-row p-4 md:p-6 gap-4 md:gap-6 h-[calc(100vh-80px)] lg:overflow-hidden">
        {/* Left Side: Consumer Chat UI */}
        <div className="w-full lg:w-1/3 flex flex-col h-1/2 lg:h-full min-h-0 shrink-0 lg:shrink relative">
          {isProcessing && <div className="absolute inset-0 bg-white/50 z-10 rounded-lg"></div>}
          <AgentChatUI 
            onSimulateRequest={handleSimulateRequest} 
            products={mockSandboxCatalog} 
            chatHistory={chatHistory}
          />
        </div>

        {/* Right Side: Agent Mechanics UI */}
        <div className="w-full lg:w-2/3 flex flex-col h-1/2 lg:h-full min-h-0">
          <AgentMechanicsVisualizer 
            product={inspectedProduct} 
            agentAction={agentAction}
            simState={simState}
          />
        </div>
      </main>
    </div>
  );
}
