const db = require('../models/Database');
const { UserModel } = require('../models/User');
const { requireUser } = require('./AuthController');
const { houseMenu } = require('../views/Keyboards');
const { formatNumber, getInventoryUsed } = require('../utils/helpers');
const { log } = require('../services/Logger');
const { backToMenu } = require('../views/Messages');

async function showHouse(ctx) {
  const user = await requireUser(ctx);
  if (!user) return;

  const text =
    `🏠 <b>Rumah</b>\n\n` +
    `Nama: <b>${user.house.name}</b> (Level ${user.house.level})\n` +
    `Kapasitas: ${getInventoryUsed(user.inventory)}/${user.house.capacity}\n\n` +
    `Upgrade rumah untuk kapasitas lebih besar!`;

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...houseMenu() });
  } else {
    await ctx.replyWithHTML(text, houseMenu());
  }
}

async function showUpgrade(ctx) {
  const user = await requireUser(ctx);
  if (!user) return;

  const houses = db.getShop().houses || [];
  const next = houses.find(h => h.level === user.house.level + 1);

  if (!next) {
    await ctx.answerCbQuery('Rumah sudah level maksimum!', { show_alert: true });
    return;
  }

  const text =
    `⬆️ <b>Upgrade Rumah</b>\n\n` +
    `Saat ini: ${user.house.name} (${user.house.capacity} slot)\n` +
    `Upgrade ke: <b>${next.name}</b> (${next.capacity} slot)\n\n` +
    `💎 ${formatNumber(next.priceDiamond)} | 💰 ${formatNumber(next.priceRupiah)}`;

  const { Markup } = require('telegraf');
  const kb = Markup.inlineKeyboard([
    [Markup.button.callback('✅ Konfirmasi Upgrade', `house_confirm_${next.level}`), Markup.button.callback('❌ Batal', 'menu_house')]
  ]);

  await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
}

async function confirmUpgrade(ctx) {
  const userId = ctx.from.id;
  let user = await requireUser(ctx);
  if (!user) return;

  const level = parseInt(ctx.match[1], 10);
  const houses = db.getShop().houses || [];
  const next = houses.find(h => h.level === level);

  if (!next || next.level !== user.house.level + 1) {
    await ctx.answerCbQuery('Upgrade tidak valid');
    return;
  }

  if (user.diamond < next.priceDiamond) {
    await ctx.answerCbQuery('💎 Diamond tidak cukup!', { show_alert: true });
    return;
  }
  if (user.rupiah < next.priceRupiah) {
    await ctx.answerCbQuery('💰 Rupiah tidak cukup!', { show_alert: true });
    return;
  }

  user.diamond -= next.priceDiamond;
  user.rupiah -= next.priceRupiah;
  user.house = { name: next.name, level: next.level, capacity: next.capacity };

  UserModel.save(userId, user);
  log(userId, 'house_upgrade', { house: next.name });

  await ctx.answerCbQuery('Rumah diupgrade!');
  await ctx.editMessageText(
    `✅ Rumah diupgrade ke <b>${next.name}</b>!\n📦 Kapasitas: ${next.capacity}`,
    { parse_mode: 'HTML', ...backToMenu() }
  );
}

async function showHouseInfo(ctx) {
  const user = await requireUser(ctx);
  if (!user) return;

  const houses = db.getShop().houses || [];
  let text = `📦 <b>Daftar Rumah</b>\n\n`;
  houses.forEach(h => {
    const current = h.level === user.house.level ? ' ← Saat ini' : '';
    text += `L${h.level} ${h.name}: ${h.capacity} slot${current}\n`;
  });

  await ctx.answerCbQuery();
  await ctx.editMessageText(text, { parse_mode: 'HTML', ...houseMenu() });
}

module.exports = { showHouse, showUpgrade, confirmUpgrade, showHouseInfo };
