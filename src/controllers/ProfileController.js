const { UserModel } = require('../models/User');
const { requireUser } = require('./AuthController');
const { profileText, profileKeyboard } = require('../views/Messages');
const { formatNumber, getInventoryUsed } = require('../utils/helpers');
const { log } = require('../services/Logger');
const { Markup } = require('telegraf');
const { paginate } = require('../utils/pagination');
const { backToMenu } = require('../views/Messages');

const pendingEdits = new Map();

async function showProfile(ctx) {
  const user = await requireUser(ctx);
  if (!user) return;

  if (ctx.callbackQuery) {
    await ctx.editMessageText(profileText(user), { parse_mode: 'HTML', ...profileKeyboard() });
  } else {
    await ctx.replyWithHTML(profileText(user), profileKeyboard());
  }
}

async function startEditName(ctx) {
  const userId = ctx.from.id;
  pendingEdits.set(userId, 'name');
  await ctx.answerCbQuery();
  await ctx.reply('✏️ Kirim nama panggilan baru kamu:');
}

async function startEditAvatar(ctx) {
  const { avatarOptions } = require('../views/Keyboards');
  await ctx.answerCbQuery();
  await ctx.editMessageText('🖼 Pilih avatar:', avatarOptions());
}

const AVATARS = ['⚔️', '🛡️', '🏹', '🧙', '🧝', '🐉', '👑', '🗡️', '🦸', '🧛'];

async function setAvatar(ctx) {
  const user = await requireUser(ctx);
  if (!user) return;

  const idx = parseInt(ctx.match[1], 10);
  const avatar = AVATARS[idx] || '⚔️';
  user.avatar = avatar;
  UserModel.save(ctx.from.id, user);
  log(ctx.from.id, 'change_avatar', { avatar });

  await ctx.answerCbQuery('Avatar diubah!');
  await ctx.editMessageText(profileText(user), { parse_mode: 'HTML', ...profileKeyboard() });
}

async function handleTextInput(ctx) {
  const userId = ctx.from.id;
  const editType = pendingEdits.get(userId);
  if (!editType) return false;

  const user = UserModel.get(userId);
  if (!user) return false;

  const text = ctx.message.text.trim();
  if (text.startsWith('/')) {
    pendingEdits.delete(userId);
    return false;
  }

  if (editType === 'name') {
    if (text.length < 2 || text.length > 20) {
      await ctx.reply('❌ Nama harus 2-20 karakter.');
      return true;
    }
    user.name = text;
    UserModel.save(userId, user);
    log(userId, 'change_name', { name: text });
    pendingEdits.delete(userId);
    await ctx.replyWithHTML(`✅ Nama diubah menjadi <b>${text}</b>`, profileKeyboard());
    return true;
  }

  return false;
}

async function showInventory(ctx, page = 1) {
  const user = await requireUser(ctx);
  if (!user) return;

  const items = user.inventory.length > 0 ? user.inventory : [{ name: '(Kosong)', qty: 0, type: 'empty' }];
  const displayItems = user.inventory.length > 0 ? user.inventory : [];

  let text = `🎒 <b>Inventory</b> (${getInventoryUsed(user.inventory)}/${user.house.capacity})\n\n`;

  if (displayItems.length === 0) {
    text += '<i>Inventory kosong.</i>';
    const kb = backToMenu();
    if (ctx.callbackQuery) await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
    else await ctx.replyWithHTML(text, kb);
    return;
  }

  const { buttons, pageItems, currentPage, totalPages } = paginate(
    displayItems, page, 5, 'inv', (item) => `${item.name} x${item.qty}`
  );

  pageItems.forEach(item => {
    text += `• ${item.name} x<b>${item.qty}</b> [${item.type}]\n`;
  });
  text += `\nHalaman ${currentPage}/${totalPages}`;

  buttons.push([Markup.button.callback('🔙 Profile', 'menu_profile')]);
  const kb = Markup.inlineKeyboard(buttons);

  if (ctx.callbackQuery) await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
  else await ctx.replyWithHTML(text, kb);
}

module.exports = {
  showProfile,
  startEditName,
  startEditAvatar,
  setAvatar,
  handleTextInput,
  showInventory
};
