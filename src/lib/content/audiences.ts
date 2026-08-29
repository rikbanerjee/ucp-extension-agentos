// Shared audience data model — the three commercial (non-developer) audiences.
//
// Single source of truth for copy that appears in more than one place: the
// homepage "No jargon" cards, the primary nav Solutions dropdown, and the
// footer Solutions column. Solution pages themselves are NOT driven by this
// file — they have distinct, hand-written content per AGENTS.md instructions
// ("do not create three pages that are merely the same template with nouns
// replaced"). This module only owns the short, repeated summary copy.

export interface AudienceSummary {
  id: 'enterprise-retail' | 'independent-retail' | 'commerce-platforms';
  navLabel: string;
  label: string;
  headline: string;
  body: string;
  valuePoints: string[];
  cta: string;
  href: string;
}

export const AUDIENCES: AudienceSummary[] = [
  {
    id: 'enterprise-retail',
    navLabel: 'Enterprise Retail',
    label: 'Enterprise Retail Leaders',
    headline: 'Keep every AI shopping channel aligned with your retail policies.',
    body: 'RetailAgentOS gives AI agents consistent answers across pricing, customer eligibility, inventory and fulfilment.',
    valuePoints: [
      'Govern how AI represents the business',
      'Reduce inconsistent prices and fulfilment promises',
      'Explain and audit every decision',
    ],
    cta: 'See the enterprise value',
    href: '/solutions/enterprise-retail',
  },
  {
    id: 'independent-retail',
    navLabel: 'Boutique & Specialty Retail',
    label: 'Boutique & Specialty Retailers',
    headline: 'Help AI find your products—and represent your store correctly.',
    body: 'Make your products, prices and delivery rules understandable to AI shoppers without rebuilding your storefront.',
    valuePoints: [
      'Become visible to AI shoppers',
      'Show the correct customer price',
      'Prevent impossible orders',
    ],
    cta: 'See the retailer value',
    href: '/solutions/independent-retail',
  },
  {
    id: 'commerce-platforms',
    navLabel: 'Commerce & Fulfilment Platforms',
    label: 'Commerce & Fulfilment Platforms',
    headline: 'Make AI commerce reliable across thousands of different merchants.',
    body: 'Turn merchant-specific rules into consistent answers that shopping agents can use before creating a cart.',
    valuePoints: [
      'Reduce invalid and failed carts',
      'Lower merchant-specific exception logic',
      'Accelerate merchant and AI-agent adoption',
    ],
    cta: 'See the platform value',
    href: '/solutions/commerce-platforms',
  },
];
