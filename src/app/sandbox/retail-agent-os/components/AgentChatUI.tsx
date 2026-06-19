'use client';
import React, { useState } from 'react';
import { SandboxProduct } from '../types/agent-os';

interface AgentChatUIProps {
  onSimulateRequest: (product: SandboxProduct) => void;
  products: SandboxProduct[];
  chatHistory: { sender: 'user' | 'agent', text: string }[];
}

export function AgentChatUI({ onSimulateRequest, products, chatHistory }: AgentChatUIProps) {
  const [selectedProduct, setSelectedProduct] = useState<string>(products[0].id);

  const handleSend = () => {
    const product = products.find(p => p.id === selectedProduct);
    if (product) {
      onSimulateRequest(product);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      <div className="bg-gray-50 border-b border-gray-200 p-4 font-semibold text-gray-800 flex items-center justify-between shrink-0">
        <span>Shopping Assistant</span>
        <span className="text-xs font-normal px-2 py-1 bg-blue-100 text-blue-800 rounded-full">RetailAgentOS Active</span>
      </div>
      
      {/* Moved to top for better visibility */}
      <div className="border-b border-gray-200 p-4 bg-gray-50 shrink-0 shadow-sm z-10 relative">
        <div className="mb-2 text-xs text-gray-500 font-medium">Select a scenario to test:</div>
        <div className="flex gap-2">
          <select 
            value={selectedProduct} 
            onChange={e => setSelectedProduct(e.target.value)}
            className="flex-grow p-2 border border-gray-300 rounded text-sm bg-white"
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>Buy: {p.title}</option>
            ))}
          </select>
          <button 
            onClick={handleSend}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium text-sm transition-colors"
          >
            Send
          </button>
        </div>
      </div>

      <div className="flex-grow p-4 overflow-y-auto flex flex-col gap-3">
        {chatHistory.map((msg, i) => (
          <div key={i} className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.sender === 'user' ? 'bg-blue-600 text-white self-end rounded-br-none' : 'bg-gray-100 text-gray-800 self-start rounded-bl-none'}`}>
            <span className="font-semibold block mb-1 text-xs opacity-75">{msg.sender === 'user' ? 'You' : 'Agent'}</span>
            {msg.text}
          </div>
        ))}
      </div>
    </div>
  );
}
