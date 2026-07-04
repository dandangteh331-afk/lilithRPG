const path = require('path');

module.exports = {
  DATA_DIR: path.join(__dirname, '../../data'),
  LOGS_DIR: path.join(__dirname, '../../logs'),

  // Stamina
  STAMINA_REGEN_INTERVAL: 10 * 60 * 1000,
  STAMINA_REGEN_AMOUNT: 1,
  FISHING_STAMINA_COST: 10,
  WORK_STAMINA_COST: 15,
  DUNGEON_STAMINA_COST: 20,
  LOOT_STAMINA_COST: 15,

  // Cooldowns (ms)
  FISHING_COOLDOWN: 5 * 1000,
  WORK_COOLDOWN: 10 * 1000,
  DUNGEON_COOLDOWN: 15 * 1000,
  LOOT_COOLDOWN: 30 * 1000,

  // Shop
  EXPENSIVE_THRESHOLD: 100000,

  // Skill system
  SKILL_UNLOCK_LEVEL: 5,

  // Shop categories
  SHOP_CATEGORIES: [
    { id: 'weapon',     label: '⚔️ Weapon',     action: 'shop_cat_weapon_0'    },
    { id: 'ramuan',     label: '🧪 Ramuan',      action: 'shop_cat_ramuan_0'    },
    { id: 'batu_sihir', label: '💎 Batu Sihir',  action: 'shop_cat_batu_sihir_0'},
    { id: 'skill',      label: '✨ Skill',        action: 'shop_cat_skill_0'     },
    { id: 'artefak',    label: '🔮 Artefak',     action: 'shop_cat_artefak_0'   }
  ],

  // Daily reward
  DAILY_REWARD: {
    diamond: 20,
    rupiah: 5000,
    stamina: 30
  },

  // Work jobs
  WORK_JOBS: [
    { name: '⛏️ Jadi Kuli',        rupiahMin: 5000,  rupiahMax: 10000, expMin: 10, expMax: 20 },
    { name: '🎣 Jadi Nelayan',      rupiahMin: 10000, rupiahMax: 20000, expMin: 15, expMax: 30 },
    { name: '🔨 Jadi Pandai Besi',  rupiahMin: 15000, rupiahMax: 25000, expMin: 20, expMax: 35 },
    { name: '🏪 Jadi Pedagang',     rupiahMin: 20000, rupiahMax: 40000, expMin: 25, expMax: 45 },
    { name: '🗡️ Jadi Petualang',   rupiahMin: 30000, rupiahMax: 60000, expMin: 30, expMax: 60 }
  ],

  // Fish rank weights
  FISH_RANK_WEIGHTS: {
    Common:    40,
    Uncommon:  25,
    Rare:      18,
    Epic:      10,
    Legendary:  5,
    Mythic:     2
  },

  // Rank emoji
  RANK_EMOJI: {
    Common:    '⚪',
    Uncommon:  '🟢',
    Rare:      '🔵',
    Epic:      '🟣',
    Legendary: '🟡',
    Mythic:    '🔴'
  },

  // Loot table — tiered by rarity
  LOOT_TABLE: {
    // weight out of 100 for each tier
    weights: {
      common:    50,
      uncommon:  28,
      rare:      14,
      epic:       6,
      legendary:  2
    },
    tiers: {
      common: [
        { name: 'Herba',            type: 'material', qty: [1, 3] },
        { name: 'Besi',             type: 'material', qty: [1, 2] },
        { name: 'Kayu',             type: 'material', qty: [2, 5] },
        { name: 'Batu Biasa',       type: 'material', qty: [1, 4] },
        { name: 'Kain Linen',       type: 'material', qty: [1, 3] },
        { name: 'Tulang',           type: 'material', qty: [1, 2] }
      ],
      uncommon: [
        { name: 'Batu Api',         type: 'material', qty: [1, 2] },
        { name: 'Batu Es',          type: 'material', qty: [1, 2] },
        { name: 'Air Suci',         type: 'material', qty: [1, 2] },
        { name: 'Kristal',          type: 'material', qty: [1, 1] },
        { name: 'Bulu Phoenix',     type: 'material', qty: [1, 2] },
        { name: 'Emas',             type: 'material', qty: [1, 1] },
        { name: 'Stamina Potion',   type: 'item',     qty: [1, 1] }
      ],
      rare: [
        { name: 'Batu Petir',       type: 'material', qty: [1, 2] },
        { name: 'Batu Bayangan',    type: 'material', qty: [1, 1] },
        { name: 'Kristal Suci',     type: 'material', qty: [1, 1] },
        { name: 'Sisik Naga',       type: 'material', qty: [1, 2] },
        { name: 'Batu Bertuah',     type: 'material', qty: [1, 1] },
        { name: 'Stamina Elixir',   type: 'item',     qty: [1, 1] },
        { name: 'EXP Scroll',       type: 'item',     qty: [1, 1] }
      ],
      epic: [
        { name: 'Kristal Kehampaan','type': 'material', qty: [1, 1] },
        { name: 'Kristal Naga',     type: 'material', qty: [1, 1] },
        { name: 'Api Abadi',        type: 'material', qty: [1, 1] },
        { name: 'Emas Murni',       type: 'material', qty: [1, 1] },
        { name: 'Kitab EXP',        type: 'item',     qty: [1, 1] },
        { name: 'Lucky Amulet',     type: 'item',     qty: [1, 1] }
      ],
      legendary: [
        { name: 'Permata Asal',     type: 'material', qty: [1, 1] },
        { name: 'Batu Kekacauan',   type: 'material', qty: [1, 1] },
        { name: 'Grimoire EXP',     type: 'item',     qty: [1, 1] },
        { name: 'Orb Kosmos',       type: 'artefak',  qty: [1, 1] }
      ]
    }
  },

  // Item effects that can be used from inventory
  USABLE_ITEM_EFFECTS: ['restore_stamina', 'add_exp', 'fishing_luck', 'max_stamina_up'],

  // Sell price for non-shop items obtained via fishing/looting (rupiah per unit)
  ITEM_SELL_PRICES: {
    // Materials
    'Herba':              500,
    'Besi':               1000,
    'Kayu':               300,
    'Batu Biasa':         200,
    'Kain Linen':         400,
    'Tulang':             250,
    'Batu Api':           2000,
    'Batu Es':            2000,
    'Batu Petir':         2500,
    'Batu Bayangan':      3000,
    'Air Suci':           1500,
    'Kristal':            3000,
    'Kristal Suci':       8000,
    'Kristal Kehampaan':  15000,
    'Kristal Naga':       20000,
    'Batu Bertuah':       5000,
    'Batu Kekacauan':     25000,
    'Permata Asal':       50000,
    'Batu Sihir':         1500,
    'Mutiara':            3000,
    'Bulu Phoenix':       4000,
    'Emas':               5000,
    'Emas Murni':         12000,
    'Sisik Naga':         10000,
    'Api Abadi':          18000,
    // Fish sell at their own priceRupiah (handled by FishingController already)
    // Items
    'Stamina Potion':     5000,
    'Stamina Elixir':     12000,
    'Mega Stamina Elixir':22000,
    'EXP Scroll':         8000,
    'Kitab EXP':          25000,
    'Grimoire EXP':       60000,
    'Lucky Amulet':       30000,
    'Energy Drink':       2500,
    'Antidot Racun':      4000,
    'Phoenix Down':       120000
  }
};
