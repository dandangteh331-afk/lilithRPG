const { UserModel } = require('../models/User');
const { requireUser } = require('./AuthController');
const { log } = require('../services/Logger');
const { updateQuestProgress } = require('../services/QuestService');
const { addExp, formatNumber, randomInt, addInventoryItem, canAddToInventory } = require('../utils/helpers');
const { useStamina, isOnCooldown, getCooldownRemaining, setCooldown } = require('../services/StaminaService');
const {
  LOOT_TABLE,
  LOOT_STAMINA_COST,
  LOOT_COOLDOWN
} = require('../config/constants');
const { Markup } = require('telegraf');
const { backToMenu } = require('../views/Messages');

// ─── Tier emoji & labels ────────────────────────────────────────────────────
const TIER_META = {
  common:    { emoji: '⚪', label: 'Common' },
  uncommon:  { emoji: '🟢', label: 'Uncommon' },
  rare:      { emoji: '🔵', label: 'Rare' },
  epic:      { emoji: '🟣', label: 'Epic' },
  legendary: { emoji: '🟡', label: 'Legendary' }
};

// ─── Pick a random tier based on weights ────────────────────────────────────
function pickTier(luckBonus = 0) {
  const weights = { ...LOOT_TABLE.weights };
  // Lucky Star skill or artifacts with luckBonus boost rare+ tiers
  if (luckBonus > 0) {
    const boost = Math.floor(luckBonus / 2);
    weights.rare      += boost;
    weights.epic      += Math.floor(boost / 2);
    weights.legendary += Math.floor(boost / 4);
    weights.common    = Math.max(1, weights.common - boost);
    weights.uncommon  = Math.max(1, weights.uncommon - Math.floor(boost / 2));
  }

  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  let rand = Math.random() * total;
  for (const [tier, w] of Object.entries(weights)) {
    rand -= w;
    if (rand <= 0) return tier;
  }
  return 'common';
}

// ─── Pick a random item from a tier ─────────────────────────────────────────
function pickItemFromTier(tier) {
  const pool = LOOT_TABLE.tiers[tier];
  if (!pool || pool.length === 0) return null;
  const entry = pool[randomInt(0, pool.length - 1)];
  const qty = randomInt(entry.qty[0], entry.qty[1]);
  return { name: entry.name, type: entry.type, qty };
}

// ─── Calculate effective luck bonus for a user ───────────────────────────────
function getLuckBonus(user) {
  let bonus = user.hasLuckyAmulet ? 5 : 0;
  // Check artifact bonuses
  if (user.artifacts && Array.isArray(user.artifacts)) {
    for (const art of user.artifacts) {
      if (art.bonus && art.bonus.luckBonus) bonus += art.bonus.luckBonus;
    }
  }
  // Check passive skill: lucky_star gives +15
  if (user.skills && Array.isArray(user.skills)) {
    if (user.skills.some(s => s.id === 'skill_lucky_star' && s.active)) bonus += 15;
  }
  return bonus;
}

// ─── Loot menu ───────────────────────────────────────────────────────────────
function lootMenuKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🎲 Loot Sekarang!', 'loot_do')],
    [Markup.button.callback('🔙 Menu Utama', 'menu_main')]
  ]);
}

async function showLootMenu(ctx) {
  const user = await requireUser(ctx);
  if (!user) return;

  const luckBonus = getLuckBonus(user);
  const text =
    `🎲 <b>Looting</b>\n\n` +
    `Jelajahi dunia dan temukan barang-barang tersembunyi!\n\n` +
    `⚡ Stamina: ${user.stamina}/${user.maxStamina} (butuh ${LOOT_STAMINA_COST})\n` +
    `🍀 Luck Bonus: +${luckBonus}%\n\n` +
    `<i>Tier: Common → Uncommon → Rare → Epic → Legendary</i>`;

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...lootMenuKeyboard() });
  } else {
    await ctx.replyWithHTML(text, lootMenuKeyboard());
  }
}

// ─── Do loot ─────────────────────────────────────────────────────────────────
async function doLoot(ctx) {
  const userId = ctx.from.id;
  let user = await requireUser(ctx);
  if (!user) return;

  // Cooldown check
  if (isOnCooldown(user, 'loot')) {
    const remaining = getCooldownRemaining(user, 'loot');
    await ctx.answerCbQuery(`⏳ Cooldown ${remaining}s lagi!`, { show_alert: true });
    return;
  }

  // Stamina check
  if (!useStamina(user, LOOT_STAMINA_COST)) {
    await ctx.answerCbQuery(`⚡ Stamina tidak cukup! (butuh ${LOOT_STAMINA_COST})`, { show_alert: true });
    return;
  }

  // Inventory check
  if (!canAddToInventory(user, 1)) {
    await ctx.answerCbQuery('🎒 Inventory penuh! Jual atau gunakan item dulu.', { show_alert: true });
    return;
  }

  const luckBonus = getLuckBonus(user);
  const tier = pickTier(luckBonus);
  const item = pickItemFromTier(tier);

  if (!item) {
    await ctx.answerCbQuery('Tidak ada item ditemukan.', { show_alert: true });
    return;
  }

  // Cap qty by remaining inventory space
  const invUsed = user.inventory.reduce((s, i) => s + i.qty, 0);
  const invCap = user.house?.capacity || 10;
  const space = invCap - invUsed;
  item.qty = Math.min(item.qty, space);

  // Add to inventory
  user.inventory = addInventoryItem(user.inventory, item.name, item.qty, item.type);

  // Bonus EXP for looting
  const expGain = tier === 'legendary' ? 80
    : tier === 'epic'     ? 40
    : tier === 'rare'     ? 20
    : tier === 'uncommon' ? 10
    : 5;

  // Apply gold_touch passive (+25% rupiah bonus handled separately — loot gives small rupiah bonus)
  let rupiahBonus = tier === 'legendary' ? 5000
    : tier === 'epic'     ? 2000
    : tier === 'rare'     ? 800
    : tier === 'uncommon' ? 300
    : 100;

  if (user.skills && user.skills.some(s => s.id === 'skill_gold_touch' && s.active)) {
    rupiahBonus = Math.floor(rupiahBonus * 1.25);
  }

  user.rupiah += rupiahBonus;
  user.stats.rupiahEarned = (user.stats.rupiahEarned || 0) + rupiahBonus;

  const { user: expUser, notifications } = addExp(user, expGain);
  user = expUser;

  // Quest progress
  const questResult = updateQuestProgress(user, 'loot', 1);
  user = questResult.user;

  // Set cooldown
  setCooldown(user, 'loot', LOOT_COOLDOWN);

  UserModel.save(userId, user);
  log(userId, 'loot', { item: item.name, qty: item.qty, tier });

  const meta = TIER_META[tier];
  let text =
    `${meta.emoji} <b>Looting Berhasil!</b> [${meta.label}]\n\n` +
    `📦 Ditemukan: <b>${item.name}</b> x${item.qty}\n` +
    `💰 +${formatNumber(rupiahBonus)} Rupiah\n` +
    `⭐ +${expGain} EXP\n` +
    `⚡ Stamina: ${user.stamina}/${user.maxStamina}`;

  if (notifications.length) text += '\n\n' + notifications.join('\n');
  if (questResult.completed) text += '\n\n📜 Quest progress updated!';

  await ctx.answerCbQuery('Item ditemukan!');
  await ctx.editMessageText(text, { parse_mode: 'HTML', ...lootMenuKeyboard() });
}

module.exports = { showLootMenu, doLoot };
