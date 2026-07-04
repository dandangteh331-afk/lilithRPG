const { UserModel } = require('../models/User');
const { requireUser } = require('./AuthController');
const { staminaMenu } = require('../views/Keyboards');
const { countInventoryItem, removeInventoryItem } = require('../utils/helpers');
const { restoreStamina, getStaminaRegenInfo } = require('../services/StaminaService');
const { log } = require('../services/Logger');
const { backToMenu } = require('../views/Messages');

async function showStamina(ctx) {
  const user = await requireUser(ctx);
  if (!user) return;

  const regen = getStaminaRegenInfo(user);
  const potions = countInventoryItem(user.inventory, 'Stamina Potion');
  const elixirs = countInventoryItem(user.inventory, 'Stamina Elixir');

  const text =
    `⚡ <b>Stamina</b>\n\n` +
    `${user.stamina}/${user.maxStamina}\n` +
    `Regen +1 setiap 10 menit (~${regen.nextRegenMinutes}m)\n\n` +
    `🧪 Stamina Potion: ${potions} (+50)\n` +
    `🧪 Stamina Elixir: ${elixirs} (+100)`;

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...staminaMenu() });
  } else {
    await ctx.replyWithHTML(text, staminaMenu());
  }
}

async function usePotion(ctx, type) {
  const userId = ctx.from.id;
  let user = await requireUser(ctx);
  if (!user) return;

  const itemName = type === 'elixir' ? 'Stamina Elixir' : 'Stamina Potion';
  const amount = type === 'elixir' ? 100 : 50;

  if (countInventoryItem(user.inventory, itemName) < 1) {
    await ctx.answerCbQuery(`${itemName} tidak ada!`, { show_alert: true });
    return;
  }

  if (user.stamina >= user.maxStamina) {
    await ctx.answerCbQuery('Stamina sudah penuh!', { show_alert: true });
    return;
  }

  const result = removeInventoryItem(user.inventory, itemName, 1);
  user.inventory = result.inventory;
  user = restoreStamina(user, amount);

  if (itemName === 'EXP Scroll') {
    const { addExp } = require('../utils/helpers');
    const expResult = addExp(user, 50);
    user = expResult.user;
  }

  UserModel.save(userId, user);
  log(userId, 'use_stamina_item', { item: itemName });

  await ctx.answerCbQuery(`${itemName} digunakan!`);
  await ctx.editMessageText(
    `✅ ${itemName} digunakan!\n⚡ Stamina: ${user.stamina}/${user.maxStamina}`,
    { parse_mode: 'HTML', ...staminaMenu() }
  );
}

async function showWeapon(ctx) {
  const user = await requireUser(ctx);
  if (!user) return;

  const { weaponMenu } = require('../views/Keyboards');
  const text =
    `⚔️ <b>Senjata</b>\n\n` +
    `Nama: <b>${user.weapon.name}</b>\n` +
    `Attack: +${user.weapon.attack}\n\n` +
    `Senjata mempengaruhi kekuatan di Dungeon.\n` +
    `Upgrade via Shop atau Alkimia!`;

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...weaponMenu() });
  } else {
    await ctx.replyWithHTML(text, weaponMenu());
  }
}

module.exports = { showStamina, usePotion, showWeapon };
