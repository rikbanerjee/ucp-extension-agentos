export interface MerchantMeta {
  humanName: string;
  owner: string;
  tagline: string;
  problem: string;
  resolution: string;
  archetype: string;
}

export const merchantMeta: Record<string, MerchantMeta> = {
  'm_boutique_001': {
    humanName: "Sara's Boutique",
    owner: 'Sara',
    tagline: 'Handcrafted goods, made to order',
    archetype: 'Discovery-Led Retail',
    problem:
      "Sara has beautiful products but AI shopping assistants never recommended them — she had no machine-readable way to declare what she sells or who it's for.",
    resolution:
      "With RetailAgentOS, Sara's catalog is agent-discoverable. Any shopper asking an AI assistant for personalised gifts can now find her.",
  },
  'm_wholesale_002': {
    humanName: 'B&T Wholesale',
    owner: 'B&T',
    tagline: 'Bulk supply for cafes and restaurants',
    archetype: 'Qualification-First Commerce',
    problem:
      "B&T's tiered pricing and buyer qualification rules were opaque to agents. Buyers were quoted the wrong price, and the wrong people got access to wholesale listings.",
    resolution:
      'RetailAgentOS enforces qualification gates and volume pricing automatically. Agents only surface listings to verified buyers and always quote the right tier.',
  },
  'm_grocery_003': {
    humanName: 'Fresh Corner Market',
    owner: 'Fresh Corner',
    tagline: 'Your neighbourhood grocery, agent-ready',
    archetype: 'Contextual Offers & Fulfillment',
    problem:
      "Customers were ordering items for shipping that Fresh Corner only delivers locally. Weekly promos weren't visible to agents at all.",
    resolution:
      'RetailAgentOS surfaces weekly sale prices and mix-and-match promos in real time, and blocks unavailable fulfillment modes before the buyer wastes a trip.',
  },
};
