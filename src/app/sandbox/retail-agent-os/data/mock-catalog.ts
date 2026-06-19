import { SandboxProduct } from '../types/agent-os';

export const mockSandboxCatalog: SandboxProduct[] = [
  {
    id: 'p_espressomachine_01',
    title: 'Commercial Espresso Machine',
    description: 'High-volume 3-group espresso machine. Requires hardplumbed water line.',
    basePrice: 12500.00,
    currency: 'USD',
    extensions: {
      inventory_state: {
        status: 'MADE_TO_ORDER',
        leadTimeDays: 21,
      },
      product_relations: {
        requires: ['p_waterfilter_01', 'p_install_service_01'],
        suggests: ['p_knockbox_01', 'p_espresso_beans_wholesale'],
      },
      intent_routing: {
        action: 'request_quote',
        primaryChannel: 'whatsapp',
        requiredInputs: ['company_tax_id', 'voltage_requirement', 'installation_zipcode']
      },
      return_policy: {
        isFinalSale: false,
        returnWindowDays: 14,
        restockingFeePercent: 20,
        conditionRequirements: ['unused', 'original_pallet']
      }
    }
  },
  {
    id: 'p_waterfilter_01',
    title: 'Commercial Water Filtration System',
    description: 'Required inline water filtration system for espresso machines.',
    basePrice: 350.00,
    currency: 'USD',
    extensions: {
      inventory_state: {
        status: 'IN_STOCK',
      },
      product_relations: {
        isCompatibleWith: ['m_espresso_series_all']
      },
      intent_routing: {
        action: 'add_to_cart',
        primaryChannel: 'web_checkout'
      },
      return_policy: {
        isFinalSale: false,
        returnWindowDays: 30
      }
    }
  },
  {
    id: 'p_install_service_01',
    title: 'Certified Installation Service',
    description: 'On-site installation and calibration by a certified technician.',
    basePrice: 500.00,
    currency: 'USD',
    extensions: {
      inventory_state: {
        status: 'IN_STOCK'
      },
      intent_routing: {
        action: 'add_to_cart'
      },
      return_policy: {
        isFinalSale: true
      }
    }
  },
  {
    id: 'p_custom_mug_01',
    title: 'Custom Monogrammed Mug',
    description: 'Hand-thrown ceramic mug with a personalized monogram.',
    basePrice: 28.00,
    currency: 'USD',
    extensions: {
      inventory_state: {
        status: 'IN_STOCK',
        leadTimeDays: 3 // Time to monogram
      },
      intent_routing: {
        action: 'configure_custom',
        requiredInputs: ['monogram_initials', 'glaze_color']
      },
      return_policy: {
        isFinalSale: true,
        conditionRequirements: ['defective_only']
      }
    }
  },
  {
    id: 'p_organic_milk_01',
    title: 'Local Organic Whole Milk (1 Gallon)',
    description: 'Farm-fresh organic whole milk.',
    basePrice: 6.50,
    currency: 'USD',
    extensions: {
      inventory_state: {
        status: 'LOW_STOCK',
        perishability: 'high'
      },
      intent_routing: {
        action: 'add_to_cart'
      },
      return_policy: {
        isFinalSale: true
      },
      fulfillment_promises: {
        coldChainRequired: true,
        maxTransitHours: 2,
        supportedRegions: ['NY_LOCAL_ZONES']
      }
    }
  }
];
