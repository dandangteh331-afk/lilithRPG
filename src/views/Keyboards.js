const { Markup } = require('telegraf');

function mainMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('👤 Profile', 'menu_profile'),    Markup.button.callback('🎣 Mancing', 'menu_fishing')],
    [Markup.button.callback('⚒️ Kerja', 'menu_work'),         Markup.button.callback('📜 Quest', 'menu_quest')],
    [Markup.button.callback('🏰 Dungeon', 'menu_dungeon'),    Markup.button.callback('🏪 Shop', 'menu_shop')],
    [Markup.button.callback('🏠 Rumah', 'menu_house'),        Markup.button.callback('⚔️ Weapon', 'menu_weapon')],
    [Markup.button.callback('🧪 Alkimia', 'menu_alchemy'),    Markup.button.callback('📊 Rank', 'menu_rank')],
    [Markup.button.callback('⚡ Stamina', 'menu_stamina'),    Markup.button.callback('🏆 Leaderboard', 'menu_leaderboard')],
    [Markup.button.callback('🎁 Daily', 'menu_daily'),        Markup.button.callback('🎲 Looting', 'menu_loot')],
    [Markup.button.callback('🔬 Eksperimen', 'menu_experiment'), Markup.button.callback('❓ Help', 'menu_help')]
  ]);
}

function backToMenu() {
  return Markup.inlineKeyboard([[Markup.button.callback('🔙 Menu Utama', 'menu_main')]]);
}

function confirmButtons(yesAction, noAction = 'menu_main') {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Ya', yesAction), Markup.button.callback('❌ Batal', noAction)]
  ]);
}

// ─── Shop ─────────────────────────────────────────────────────────────────────

function shopMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('⚔️ Weapon',      'shop_cat_weapon_0'),     Markup.button.callback('🧪 Ramuan',      'shop_cat_ramuan_0')],
    [Markup.button.callback('💎 Batu Sihir',  'shop_cat_batu_sihir_0'), Markup.button.callback('✨ Skill',        'shop_cat_skill_0')],
    [Markup.button.callback('🔮 Artefak',     'shop_cat_artefak_0')],
    [Markup.button.callback('💰 Jual Item',   'shop_sell_menu_0'),      Markup.button.callback('🔙 Menu Utama',  'menu_main')]
  ]);
}

function buyConfirmKeyboard(action, backAction = 'menu_shop') {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Konfirmasi Beli', action), Markup.button.callback('❌ Batal', backAction)]
  ]);
}

// ─── House ───────────────────────────────────────────────────────────────────

function houseMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('⬆️ Upgrade Rumah', 'house_upgrade')],
    [Markup.button.callback('📦 Lihat Kapasitas', 'house_info')],
    [Markup.button.callback('🔙 Menu Utama', 'menu_main')]
  ]);
}

// ─── Work ────────────────────────────────────────────────────────────────────

function workMenu(jobs) {
  const rows = jobs.map((job, i) => [Markup.button.callback(`${job.name}`, `work_do_${i}`)]);
  rows.push([Markup.button.callback('🔙 Menu Utama', 'menu_main')]);
  return Markup.inlineKeyboard(rows);
}

// ─── Fishing ─────────────────────────────────────────────────────────────────

function fishingMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🎣 Mancing Sekarang!', 'fishing_cast')],
    [Markup.button.callback('📊 Statistik Mancing', 'fishing_stats')],
    [Markup.button.callback('🔙 Menu Utama', 'menu_main')]
  ]);
}

// ─── Loot ─────────────────────────────────────────────────────────────────────

function lootMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🎲 Loot Sekarang!', 'loot_do')],
    [Markup.button.callback('🔙 Menu Utama', 'menu_main')]
  ]);
}

// ─── Dungeon ─────────────────────────────────────────────────────────────────

function dungeonMenu(floors, progress) {
  const rows = [];
  for (let i = 0; i < floors.length; i++) {
    const f        = floors[i];
    const unlocked = i === 0 || progress >= f.floor - 1;
    const label    = unlocked ? `Lantai ${f.floor}: ${f.name}` : `🔒 Lantai ${f.floor}`;
    rows.push([Markup.button.callback(label, unlocked ? `dungeon_enter_${f.floor}` : 'noop')]);
  }
  rows.push([Markup.button.callback('🔙 Menu Utama', 'menu_main')]);
  return Markup.inlineKeyboard(rows);
}

// ─── Quest ───────────────────────────────────────────────────────────────────

function questMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📋 Quest Aktif',   'quest_active')],
    [Markup.button.callback('🔄 Quest Baru',    'quest_new')],
    [Markup.button.callback('🎁 Claim Reward',  'quest_claim')],
    [Markup.button.callback('📜 Daftar Quest',  'quest_list_0')],
    [Markup.button.callback('🔙 Menu Utama',    'menu_main')]
  ]);
}

// ─── Alchemy ─────────────────────────────────────────────────────────────────

function alchemyMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📜 Daftar Resep',  'alchemy_recipes_0')],
    [Markup.button.callback('🧪 Craft Item',    'alchemy_craft_menu')],
    [Markup.button.callback('🔙 Menu Utama',    'menu_main')]
  ]);
}

// ─── Weapon ──────────────────────────────────────────────────────────────────

function weaponMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('⚔️ Info Senjata',  'weapon_info')],
    [Markup.button.callback('🎒 Inventory',     'profile_inventory')],
    [Markup.button.callback('🔙 Menu Utama',    'menu_main')]
  ]);
}

// ─── Stamina ─────────────────────────────────────────────────────────────────

function staminaMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🧪 Gunakan Potion', 'stamina_use_potion')],
    [Markup.button.callback('🧪 Gunakan Elixir', 'stamina_use_elixir')],
    [Markup.button.callback('🔙 Menu Utama',     'menu_main')]
  ]);
}

// ─── Profile ─────────────────────────────────────────────────────────────────

function avatarOptions() {
  const avatars = ['⚔️', '🛡️', '🏹', '🧙', '🧝', '🐉', '👑', '🗡️', '🦸', '🧛'];
  const rows    = [];
  for (let i = 0; i < avatars.length; i += 5) {
    rows.push(
      avatars.slice(i, i + 5).map((a, j) => Markup.button.callback(a, `profile_avatar_${i + j}`))
    );
  }
  rows.push([Markup.button.callback('🔙 Kembali', 'menu_profile')]);
  return Markup.inlineKeyboard(rows);
}

module.exports = {
  mainMenu,
  backToMenu,
  confirmButtons,
  shopMenu,
  buyConfirmKeyboard,
  houseMenu,
  workMenu,
  fishingMenu,
  lootMenu,
  dungeonMenu,
  questMenu,
  alchemyMenu,
  weaponMenu,
  staminaMenu,
  avatarOptions
};
