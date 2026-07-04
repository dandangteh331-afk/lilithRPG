const db = require('../models/Database');
const { UserModel } = require('../models/User');
const { requireUser } = require('./AuthController');
const { formatNumber, addInventoryItem, canAddToInventory, removeInventoryItem } = require('../utils/helpers');
const { log } = require('../services/Logger');
const { updateQuestProgress } = require('../services/QuestService');
const { Markup } = require('telegraf');
const { EXPENSIVE_THRESHOLD, SHOP_CATEGORIES, ITEM_SELL_PRICES, SKILL_UNLOCK_LEVEL } = require('../config/constants');
const { backToMenu } = require('../views/Messages');

const pendingPurchases = new Map();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function needsConfirm(price) {
  return price >= EXPENSIVE_THRESHOLD;
}

function shopCategoryKeyboard(backAction = 'menu_shop') {
  const rows = [];
  for (let i = 0; i < SHOP_CATEGORIES.length; i += 2) {
    const pair = SHOP_CATEGORIES.slice(i, i + 2).map(c =>
      Markup.button.callback(c.label, c.action)
    );
    rows.push(pair);
  }
  rows.push([
    Markup.button.callback('💰 Jual Item', 'shop_sell_menu_0'),
    Markup.button.callback('🔙 Menu Utama', 'menu_main')
  ]);
  return Markup.inlineKeyboard(rows);
}

// ─── Main shop ────────────────────────────────────────────────────────────────

async function showShop(ctx) {
  const user = await requireUser(ctx);
  if (!user) return;

  const text =
    `🏪 <b>Shop</b>\n\n` +
    `💎 Diamond: ${formatNumber(user.diamond)}\n` +
    `💰 Rupiah: ${formatNumber(user.rupiah)}\n\n` +
    `Pilih kategori:`;

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...shopCategoryKeyboard() });
  } else {
    await ctx.replyWithHTML(text, shopCategoryKeyboard());
  }
}

// ─── WEAPON category ──────────────────────────────────────────────────────────

async function showCategoryWeapon(ctx, page = 0) {
  const user = await requireUser(ctx);
  if (!user) return;

  const weapons = db.getShop().weapons || [];
  const w = weapons[page];
  if (!w) { await ctx.answerCbQuery(); return; }

  const owned = user.weapon.name === w.name;
  const text =
    `⚔️ <b>Weapon Shop</b>\n\n` +
    `🗡️ <b>${w.name}</b>\n` +
    `Attack: +${w.attack}\n` +
    `💎 ${formatNumber(w.priceDiamond)} | 💰 ${formatNumber(w.priceRupiah)}\n` +
    `💸 Jual: ${formatNumber(w.sellRupiah || 0)} Rupiah\n\n` +
    `Senjata kamu: ${user.weapon.name} (+${user.weapon.attack})\n` +
    (owned ? '✅ <i>Sudah dimiliki</i>\n' : '') +
    `\n[${page + 1}/${weapons.length}]`;

  const nav = [];
  if (page > 0) nav.push(Markup.button.callback('◀️', `shop_cat_weapon_${page - 1}`));
  if (!owned) {
    nav.push(Markup.button.callback('Beli 💎', `shop_buy_weapon_${page}_diamond`));
    nav.push(Markup.button.callback('Beli 💰', `shop_buy_weapon_${page}_rupiah`));
  }
  if (page < weapons.length - 1) nav.push(Markup.button.callback('▶️', `shop_cat_weapon_${page + 1}`));

  const kb = Markup.inlineKeyboard([
    nav,
    [Markup.button.callback('🔙 Shop', 'menu_shop')]
  ]);

  if (ctx.callbackQuery) await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
  else await ctx.replyWithHTML(text, kb);
}

// ─── Generic category (ramuan / batu_sihir / skill / artefak) ─────────────────

const CATEGORY_META = {
  ramuan:     { emoji: '🧪', label: 'Ramuan' },
  batu_sihir: { emoji: '💎', label: 'Batu Sihir' },
  skill:      { emoji: '✨', label: 'Skill' },
  artefak:    { emoji: '🔮', label: 'Artefak' }
};

async function showCategory(ctx, catId, page = 0) {
  const user = await requireUser(ctx);
  if (!user) return;

  const shop = db.getShop();
  const items = (shop.categories && shop.categories[catId]) || [];
  const item = items[page];
  if (!item) { await ctx.answerCbQuery(); return; }

  const meta = CATEGORY_META[catId] || { emoji: '🛒', label: catId };

  // Level lock info for skills/artefacts
  const minLevel = item.minLevel || 0;
  const locked = user.level < minLevel;

  // Check if already owned (skills / artefacts)
  let alreadyOwned = false;
  if (catId === 'skill') {
    alreadyOwned = user.skills && user.skills.some(s => s.id === item.id);
  } else if (catId === 'artefak') {
    alreadyOwned = user.artifacts && user.artifacts.some(a => a.id === item.id);
  }

  let text =
    `${meta.emoji} <b>${meta.label} Shop</b>\n\n` +
    `${item.emoji || '📦'} <b>${item.name}</b>\n` +
    `${item.desc || ''}\n\n` +
    `💎 ${formatNumber(item.priceDiamond)} | 💰 ${formatNumber(item.priceRupiah)}\n`;

  if (item.sellRupiah > 0) text += `💸 Jual: ${formatNumber(item.sellRupiah)} Rupiah\n`;
  if (minLevel > 0) text += `🔓 Min Level: ${minLevel}\n`;
  if (catId === 'skill' && item.skillType) text += `🎯 Tipe: ${item.skillType} | Power: ${item.power}\n`;
  if (catId === 'artefak' && item.bonus) {
    const bonuses = Object.entries(item.bonus).map(([k, v]) => `${k}: +${v}`).join(', ');
    text += `✨ Bonus: ${bonuses}\n`;
  }

  text += `\n[${page + 1}/${items.length}]`;

  if (locked) text += `\n\n🔒 <i>Butuh Level ${minLevel} untuk membeli!</i>`;
  if (alreadyOwned) text += `\n\n✅ <i>Sudah dimiliki</i>`;

  const nav = [];
  if (page > 0) nav.push(Markup.button.callback('◀️', `shop_cat_${catId}_${page - 1}`));
  if (!locked && !alreadyOwned) {
    nav.push(Markup.button.callback('Beli 💎', `shop_buy_cat_${catId}_${page}_diamond`));
    nav.push(Markup.button.callback('Beli 💰', `shop_buy_cat_${catId}_${page}_rupiah`));
  }
  if (page < items.length - 1) nav.push(Markup.button.callback('▶️', `shop_cat_${catId}_${page + 1}`));

  const kb = Markup.inlineKeyboard([
    nav,
    [Markup.button.callback('🔙 Shop', 'menu_shop')]
  ]);

  if (ctx.callbackQuery) await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
  else await ctx.replyWithHTML(text, kb);
}

// ─── BUY WEAPON ───────────────────────────────────────────────────────────────

async function initiateBuyWeapon(ctx) {
  const page = parseInt(ctx.match[1], 10);
  const currency = ctx.match[2];
  const user = await requireUser(ctx);
  if (!user) return;

  const weapon = db.getShop().weapons[page];
  if (!weapon) return;

  const price = currency === 'diamond' ? weapon.priceDiamond : weapon.priceRupiah;
  const symbol = currency === 'diamond' ? '💎' : '💰';

  if (currency === 'diamond' && user.diamond < weapon.priceDiamond) {
    await ctx.answerCbQuery('💎 Diamond tidak cukup!', { show_alert: true });
    return;
  }
  if (currency === 'rupiah' && user.rupiah < weapon.priceRupiah) {
    await ctx.answerCbQuery('💰 Rupiah tidak cukup!', { show_alert: true });
    return;
  }

  if (needsConfirm(price)) {
    pendingPurchases.set(ctx.from.id, { type: 'weapon', page, currency });
    await ctx.editMessageText(
      `⚠️ <b>Konfirmasi Pembelian</b>\n\nBeli <b>${weapon.name}</b> (+${weapon.attack})?\nHarga: ${symbol} ${formatNumber(price)}`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard([
        [Markup.button.callback('✅ Konfirmasi Beli', `shop_confirm_weapon_${page}_${currency}`),
         Markup.button.callback('❌ Batal', 'menu_shop')]
      ]) }
    );
    return;
  }

  await completeBuyWeapon(ctx, page, currency, user);
}

async function completeBuyWeapon(ctx, page, currency, user) {
  const userId = ctx.from.id;
  const weapon = db.getShop().weapons[page];

  if (currency === 'diamond') user.diamond -= weapon.priceDiamond;
  else user.rupiah -= weapon.priceRupiah;

  user.weapon = { name: weapon.name, attack: weapon.attack };
  user.stats.weaponsBought = (user.stats.weaponsBought || 0) + 1;

  let questResult = updateQuestProgress(user, 'buy_weapon', 1);
  user = questResult.user;

  UserModel.save(userId, user);
  log(userId, 'buy_weapon', { weapon: weapon.name });

  await ctx.answerCbQuery('Senjata dibeli!');
  await ctx.editMessageText(
    `✅ <b>${weapon.name}</b> dibeli!\n⚔️ Attack: +${weapon.attack}`,
    { parse_mode: 'HTML', ...backToMenu() }
  );
}

// ─── BUY CATEGORY ITEM ────────────────────────────────────────────────────────

async function initiateBuyCategoryItem(ctx) {
  const catId    = ctx.match[1];
  const page     = parseInt(ctx.match[2], 10);
  const currency = ctx.match[3];
  const user     = await requireUser(ctx);
  if (!user) return;

  const shop  = db.getShop();
  const items = (shop.categories && shop.categories[catId]) || [];
  const item  = items[page];
  if (!item) return;

  // Level check
  if (item.minLevel && user.level < item.minLevel) {
    await ctx.answerCbQuery(`🔒 Butuh Level ${item.minLevel}!`, { show_alert: true });
    return;
  }

  // Already owned check (skills/artefak)
  if (catId === 'skill' && user.skills && user.skills.some(s => s.id === item.id)) {
    await ctx.answerCbQuery('✅ Skill sudah dimiliki!', { show_alert: true });
    return;
  }
  if (catId === 'artefak' && user.artifacts && user.artifacts.some(a => a.id === item.id)) {
    await ctx.answerCbQuery('✅ Artefak sudah dimiliki!', { show_alert: true });
    return;
  }

  const price  = currency === 'diamond' ? item.priceDiamond : item.priceRupiah;
  const symbol = currency === 'diamond' ? '💎' : '💰';

  if (currency === 'diamond' && user.diamond < item.priceDiamond) {
    await ctx.answerCbQuery('💎 Diamond tidak cukup!', { show_alert: true });
    return;
  }
  if (currency === 'rupiah' && user.rupiah < item.priceRupiah) {
    await ctx.answerCbQuery('💰 Rupiah tidak cukup!', { show_alert: true });
    return;
  }

  if (needsConfirm(price)) {
    pendingPurchases.set(ctx.from.id, { type: 'cat_item', catId, page, currency });
    await ctx.editMessageText(
      `⚠️ <b>Konfirmasi Pembelian</b>\n\n${item.emoji || ''} Beli <b>${item.name}</b>?\nHarga: ${symbol} ${formatNumber(price)}`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard([
        [Markup.button.callback('✅ Konfirmasi Beli', `shop_confirm_cat_${catId}_${page}_${currency}`),
         Markup.button.callback('❌ Batal', 'menu_shop')]
      ]) }
    );
    return;
  }

  await completeBuyCategoryItem(ctx, catId, page, currency, user);
}

async function completeBuyCategoryItem(ctx, catId, page, currency, user) {
  const userId = ctx.from.id;
  const shop   = db.getShop();
  const items  = (shop.categories && shop.categories[catId]) || [];
  const item   = items[page];
  if (!item) return;

  if (currency === 'diamond') user.diamond -= item.priceDiamond;
  else user.rupiah -= item.priceRupiah;

  if (catId === 'skill') {
    // Add to skills array
    if (!user.skills) user.skills = [];
    user.skills.push({
      id:        item.id,
      name:      item.name,
      emoji:     item.emoji,
      skillType: item.skillType,
      power:     item.power,
      desc:      item.desc,
      active:    true
    });
    UserModel.save(userId, user);
    log(userId, 'buy_skill', { skill: item.name });
    await ctx.answerCbQuery('Skill dipelajari!');
    await ctx.editMessageText(
      `✨ <b>${item.name}</b> dipelajari!\n\n${item.desc}`,
      { parse_mode: 'HTML', ...backToMenu() }
    );
    return;
  }

  if (catId === 'artefak') {
    // Add to artifacts array
    if (!user.artifacts) user.artifacts = [];
    user.artifacts.push({
      id:    item.id,
      name:  item.name,
      emoji: item.emoji,
      bonus: item.bonus || {},
      desc:  item.desc
    });
    UserModel.save(userId, user);
    log(userId, 'buy_artefak', { artefak: item.name });
    await ctx.answerCbQuery('Artefak diperoleh!');
    await ctx.editMessageText(
      `🔮 <b>${item.name}</b> diperoleh!\n\n${item.desc}`,
      { parse_mode: 'HTML', ...backToMenu() }
    );
    return;
  }

  // ramuan / batu_sihir — goes to inventory
  if (!canAddToInventory(user, 1)) {
    await ctx.answerCbQuery('🎒 Inventory penuh!', { show_alert: true });
    return;
  }

  const invType = catId === 'ramuan' ? 'item' : 'material';

  if (item.effect === 'fishing_luck') {
    user.hasLuckyAmulet = true;
  }
  user.inventory = addInventoryItem(user.inventory, item.name, 1, invType);

  UserModel.save(userId, user);
  log(userId, 'buy_item', { item: item.name, cat: catId });

  await ctx.answerCbQuery('Item dibeli!');
  await ctx.editMessageText(
    `✅ <b>${item.name}</b> dibeli!\n${item.desc || ''}`,
    { parse_mode: 'HTML', ...backToMenu() }
  );
}

async function confirmCategoryPurchase(ctx) {
  const catId    = ctx.match[1];
  const page     = parseInt(ctx.match[2], 10);
  const currency = ctx.match[3];
  const user     = await requireUser(ctx);
  if (!user) return;
  await completeBuyCategoryItem(ctx, catId, page, currency, user);
}

async function confirmWeaponPurchase(ctx) {
  const page     = parseInt(ctx.match[1], 10);
  const currency = ctx.match[2];
  const user     = await requireUser(ctx);
  if (!user) return;
  await completeBuyWeapon(ctx, page, currency, user);
}

// ─── SELL INVENTORY ───────────────────────────────────────────────────────────

const PAGE_SIZE = 5;

const ITEM_TYPE_EMOJI = {
  fish:     '🐟',
  material: '🪨',
  item:     '📦',
  artefak:  '🔮'
};

async function showSellMenu(ctx, page = 0) {
  const user = await requireUser(ctx);
  if (!user) return;

  // Build sellable list — all inventory items with a known sell price
  const sellable = user.inventory.filter(i => getSellPrice(i) > 0);

  if (sellable.length === 0) {
    const text = `💰 <b>Jual Item</b>\n\n<i>Tidak ada item yang bisa dijual.</i>`;
    const kb   = Markup.inlineKeyboard([[Markup.button.callback('🔙 Shop', 'menu_shop')]]);
    if (ctx.callbackQuery) await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
    else await ctx.replyWithHTML(text, kb);
    return;
  }

  const totalPages = Math.ceil(sellable.length / PAGE_SIZE);
  const safePage   = Math.max(0, Math.min(page, totalPages - 1));
  const slice      = sellable.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  let text =
    `💰 <b>Jual Item</b>\n` +
    `💎 ${formatNumber(user.diamond)}  ·  💰 ${formatNumber(user.rupiah)}\n` +
    `─────────────────────\n`;

  slice.forEach((item, idx) => {
    const price   = getSellPrice(item);
    const absIdx  = safePage * PAGE_SIZE + idx;
    const typeEmoji = ITEM_TYPE_EMOJI[item.type] || '📦';
    text += `${typeEmoji} <b>${item.name}</b> x${item.qty}\n`;
    text += `   └ ${formatNumber(price)}/unit · total ${formatNumber(price * item.qty)}\n`;
  });

  text += `\n<i>Halaman ${safePage + 1}/${totalPages}</i>`;

  const itemButtons = slice.map((item, idx) => {
    const absIdx    = safePage * PAGE_SIZE + idx;
    const price     = getSellPrice(item);
    const typeEmoji = ITEM_TYPE_EMOJI[item.type] || '📦';
    return [Markup.button.callback(
      `${typeEmoji} Jual ${item.name} (${formatNumber(price * item.qty)})`,
      `shop_sell_item_${absIdx}_${item.qty}`
    )];
  });

  const nav = [];
  if (safePage > 0) nav.push(Markup.button.callback('◀️ Prev', `shop_sell_menu_${safePage - 1}`));
  if (safePage < totalPages - 1) nav.push(Markup.button.callback('Next ▶️', `shop_sell_menu_${safePage + 1}`));
  if (nav.length) itemButtons.push(nav);

  itemButtons.push([Markup.button.callback('🔙 Shop', 'menu_shop')]);

  const kb = Markup.inlineKeyboard(itemButtons);
  if (ctx.callbackQuery) await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
  else await ctx.replyWithHTML(text, kb);
}

function getSellPrice(invItem) {
  // Fish — lookup harga dari fish.json berdasarkan nama
  if (invItem.type === 'fish') {
    const fishData = db.getFish();
    const fish = (fishData.fish || []).find(f => f.name === invItem.name);
    if (fish && fish.priceRupiah > 0) return fish.priceRupiah;
  }

  // Check shop categories for sellRupiah
  const shop = db.getShop();
  for (const cat of Object.values(shop.categories || {})) {
    const found = cat.find(i => i.name === invItem.name);
    if (found && found.sellRupiah > 0) return found.sellRupiah;
  }
  // Check weapons
  const wpn = (shop.weapons || []).find(w => w.name === invItem.name);
  if (wpn && wpn.sellRupiah > 0) return wpn.sellRupiah;
  // Fallback to ITEM_SELL_PRICES (materials, loot items)
  return ITEM_SELL_PRICES[invItem.name] || 0;
}

async function sellItem(ctx) {
  // action: shop_sell_item_{invIndex}_{qty}
  const invIndex = parseInt(ctx.match[1], 10);
  const qty      = parseInt(ctx.match[2], 10) || 1;
  const userId   = ctx.from.id;
  let user       = await requireUser(ctx);
  if (!user) return;

  // Rebuild sellable list to get consistent ordering
  const sellable = user.inventory.filter(i => getSellPrice(i) > 0);
  const item     = sellable[invIndex];

  if (!item) {
    await ctx.answerCbQuery('❌ Item tidak ditemukan!', { show_alert: true });
    return;
  }

  const actualQty = Math.min(qty, item.qty);
  const price     = getSellPrice(item);
  const total     = price * actualQty;

  const result = removeInventoryItem(user.inventory, item.name, actualQty);
  if (!result.success) {
    await ctx.answerCbQuery('❌ Gagal menjual item!', { show_alert: true });
    return;
  }

  user.inventory = result.inventory;
  user.rupiah   += total;
  user.stats.rupiahEarned = (user.stats.rupiahEarned || 0) + total;

  UserModel.save(userId, user);
  log(userId, 'sell_item', { item: item.name, qty: actualQty, total });

  await ctx.answerCbQuery(`💰 Terjual +${formatNumber(total)} Rupiah!`);

  // Refresh sell menu at page 0
  await showSellMenu(ctx, 0);
}

// ─── Legacy item shop (for backward compat with old bot actions) ───────────────

async function showWeapons(ctx, page = 0) {
  return showCategoryWeapon(ctx, page);
}

async function showItems(ctx, page = 0) {
  const user = await requireUser(ctx);
  if (!user) return;

  const items = db.getShop().items || [];
  const item  = items[page];
  if (!item) return;

  const text =
    `🧪 <b>${item.name}</b>\n\n` +
    `Efek: ${item.effect} (${item.value})\n` +
    `💎 ${formatNumber(item.priceDiamond)} | 💰 ${formatNumber(item.priceRupiah)}\n\n` +
    `[${page + 1}/${items.length}]`;

  const nav = [];
  if (page > 0) nav.push(Markup.button.callback('◀️', `shop_items_${page - 1}`));
  nav.push(Markup.button.callback('Beli 💎', `shop_buy_item_${page}_diamond`));
  nav.push(Markup.button.callback('Beli 💰', `shop_buy_item_${page}_rupiah`));
  if (page < items.length - 1) nav.push(Markup.button.callback('▶️', `shop_items_${page + 1}`));

  const kb = Markup.inlineKeyboard([nav, [Markup.button.callback('🔙 Shop', 'menu_shop')]]);
  if (ctx.callbackQuery) await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
  else await ctx.replyWithHTML(text, kb);
}

async function initiateBuyItem(ctx) {
  const page     = parseInt(ctx.match[1], 10);
  const currency = ctx.match[2];
  const user     = await requireUser(ctx);
  if (!user) return;

  const item   = db.getShop().items[page];
  const price  = currency === 'diamond' ? item.priceDiamond : item.priceRupiah;
  const symbol = currency === 'diamond' ? '💎' : '💰';

  if (currency === 'diamond' && user.diamond < item.priceDiamond) {
    await ctx.answerCbQuery('💎 Diamond tidak cukup!', { show_alert: true });
    return;
  }
  if (currency === 'rupiah' && user.rupiah < item.priceRupiah) {
    await ctx.answerCbQuery('💰 Rupiah tidak cukup!', { show_alert: true });
    return;
  }

  if (needsConfirm(price)) {
    pendingPurchases.set(ctx.from.id, { type: 'item', page, currency });
    await ctx.editMessageText(
      `⚠️ <b>Konfirmasi Pembelian</b>\n\nBeli <b>${item.name}</b>?\nHarga: ${symbol} ${formatNumber(price)}`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard([
        [Markup.button.callback('✅ Konfirmasi Beli', `shop_confirm_item_${page}_${currency}`),
         Markup.button.callback('❌ Batal', 'menu_shop')]
      ]) }
    );
    return;
  }

  await completeBuyLegacyItem(ctx, page, currency, user);
}

async function completeBuyLegacyItem(ctx, page, currency, user) {
  const userId = ctx.from.id;
  const item   = db.getShop().items[page];

  if (currency === 'diamond') user.diamond -= item.priceDiamond;
  else user.rupiah -= item.priceRupiah;

  if (item.effect === 'material') {
    if (!canAddToInventory(user, 1)) {
      await ctx.answerCbQuery('🎒 Inventory penuh!', { show_alert: true });
      return;
    }
    user.inventory = addInventoryItem(user.inventory, item.name, 1, 'material');
  } else if (item.effect === 'fishing_luck') {
    user.hasLuckyAmulet = true;
    user.inventory = addInventoryItem(user.inventory, item.name, 1, 'item');
  } else {
    if (!canAddToInventory(user, 1)) {
      await ctx.answerCbQuery('🎒 Inventory penuh!', { show_alert: true });
      return;
    }
    user.inventory = addInventoryItem(user.inventory, item.name, 1, 'item');
  }

  UserModel.save(userId, user);
  log(userId, 'buy_item', { item: item.name });
  await ctx.answerCbQuery('Item dibeli!');
  await ctx.editMessageText(`✅ <b>${item.name}</b> dibeli!`, { parse_mode: 'HTML', ...backToMenu() });
}

async function confirmPurchase(ctx) {
  const action = ctx.match[0];
  const user   = await requireUser(ctx);
  if (!user) return;

  if (action.includes('weapon')) {
    const page     = parseInt(ctx.match[1], 10);
    const currency = ctx.match[2];
    await completeBuyWeapon(ctx, page, currency, user);
  } else if (action.includes('item')) {
    const page     = parseInt(ctx.match[1], 10);
    const currency = ctx.match[2];
    await completeBuyLegacyItem(ctx, page, currency, user);
  }
}

module.exports = {
  showShop,
  showWeapons,
  showItems,
  showCategory,
  showCategoryWeapon,
  showSellMenu,
  sellItem,
  initiateBuyWeapon,
  initiateBuyItem,
  initiateBuyCategoryItem,
  completeBuyCategoryItem,
  confirmCategoryPurchase,
  confirmWeaponPurchase,
  confirmPurchase
};
