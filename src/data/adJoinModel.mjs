export const grainHierarchy = ['delivery', 'line_item', 'campaign', 'advertiser', 'agency']

export const tables = [
  { name: 'ad_delivery_fact', grain: 'delivery' },
  { name: 'line_item_dim', grain: 'line_item' },
  { name: 'campaign_dim', grain: 'campaign' },
  { name: 'advertiser_dim', grain: 'advertiser' },
  { name: 'agency_dim', grain: 'agency' },
  { name: 'publisher_site_dim', grain: 'delivery' },
  { name: 'creative_dim', grain: 'line_item' },
]

export const joinRules = [
  { id: 'delivery_to_line_item', from: 'ad_delivery_fact', to: 'line_item_dim', cost: 1, cardinality: 'many-to-one', enabled: true },
  { id: 'line_item_to_campaign', from: 'line_item_dim', to: 'campaign_dim', cost: 1, cardinality: 'many-to-one', enabled: true },
  { id: 'campaign_to_advertiser', from: 'campaign_dim', to: 'advertiser_dim', cost: 1, cardinality: 'many-to-one', enabled: true },
  { id: 'advertiser_to_buying_agency', from: 'advertiser_dim', to: 'agency_dim', toRole: 'buying_agency', cost: 1, cardinality: 'many-to-one', enabled: true },
  { id: 'advertiser_to_billing_agency', from: 'advertiser_dim', to: 'agency_dim', toRole: 'billing_agency', cost: 1, cardinality: 'many-to-one', enabled: true },
  { id: 'delivery_to_publisher_site', from: 'ad_delivery_fact', to: 'publisher_site_dim', cost: 1, cardinality: 'many-to-one', enabled: true },
  { id: 'delivery_to_creative', from: 'ad_delivery_fact', to: 'creative_dim', cost: 1, cardinality: 'many-to-one', enabled: true },
  { id: 'delivery_to_advertiser_shortcut', from: 'ad_delivery_fact', to: 'advertiser_dim', cost: 2.5, cardinality: 'many-to-one', enabled: true },
  { id: 'line_item_to_creative_rotation', from: 'line_item_dim', to: 'creative_dim', cost: 3, cardinality: 'many-to-many', enabled: true },
]

export const adJoinModel = { tables, joinRules }
