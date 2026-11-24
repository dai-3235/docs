export const grainHierarchy = ['event', 'placement', 'promotion', 'sponsor', 'partner']

export const tables = [
  { name: 'ad_event_fact', grain: 'event' },
  { name: 'placement_dim', grain: 'placement' },
  { name: 'promotion_dim', grain: 'promotion' },
  { name: 'sponsor_dim', grain: 'sponsor' },
  { name: 'partner_dim', grain: 'partner' },
  { name: 'surface_dim', grain: 'event' },
  { name: 'banner_dim', grain: 'placement' },
]

export const joinRules = [
  { id: 'event_to_placement', from: 'ad_event_fact', to: 'placement_dim', cost: 1, cardinality: 'many-to-one', enabled: true },
  { id: 'placement_to_promotion', from: 'placement_dim', to: 'promotion_dim', cost: 1, cardinality: 'many-to-one', enabled: true },
  { id: 'promotion_to_sponsor', from: 'promotion_dim', to: 'sponsor_dim', cost: 1, cardinality: 'many-to-one', enabled: true },
  { id: 'sponsor_to_buying_partner', from: 'sponsor_dim', to: 'partner_dim', toRole: 'buying_partner', cost: 1, cardinality: 'many-to-one', enabled: true },
  { id: 'sponsor_to_billing_partner', from: 'sponsor_dim', to: 'partner_dim', toRole: 'billing_partner', cost: 1, cardinality: 'many-to-one', enabled: true },
  { id: 'event_to_surface', from: 'ad_event_fact', to: 'surface_dim', cost: 1, cardinality: 'many-to-one', enabled: true },
  { id: 'event_to_banner', from: 'ad_event_fact', to: 'banner_dim', cost: 1, cardinality: 'many-to-one', enabled: true },
  { id: 'event_to_sponsor_shortcut', from: 'ad_event_fact', to: 'sponsor_dim', cost: 2.5, cardinality: 'many-to-one', enabled: true },
  { id: 'placement_to_banner_rotation', from: 'placement_dim', to: 'banner_dim', cost: 3, cardinality: 'many-to-many', enabled: true },
]

export const adJoinModel = { tables, joinRules }
