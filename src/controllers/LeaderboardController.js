const { UserModel } = require('../models/User');
const { requireUser } = require('./AuthController');
const { applyStaminaRegen } = require('../services/StaminaService');
const { formatNumber } = require('../utils/helpers');
const { backToMenu } = require('../views/Messages');
const { DAILY_REWARD } = require('../config/constants');
const { log } = require('../services/Logger');

async function showLeaderboard(ctx) {
  const user = await requireUser(ctx);
  if (!user) return;

  const users = UserModel.getAll();
  const sorted = Object.entries(users)
    .map(([id, u]) => ({ id, ...u }))
    .sort((a, b) => b.level - a.level || b.exp - a.exp)
    .slice(0, 10);

  let text = `🏆 <b>Leaderboard</b> (Top 10 Level)\n\n`;
  sorted.forEach((u, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    const isYou = u.id === String(ctx.from.id) ? ' ← Kamu' : '';
    text += `${medal} ${u.avatar} ${u.name} - Lv.${u.level} (${u.rank})${isYou}\n`;
  });

  if (sorted.length === 0) text += '<i>Belum ada data.</i>';

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...backToMenu() });
  } else {
    await ctx.replyWithHTML(text, backToMenu());
  }
}

function isSameDay(ts1, ts2) {
  const d1 = new Date(ts1);
  const d2 = new Date(ts2);
  return d1.toDateString() === d2.toDateString();
}

async function claimDaily(ctx) {
  const userId = ctx.from.id;
  let user = await requireUser(ctx);
  if (!user) return;

  const now = Date.now();
  if (user.lastDailyClaim && isSameDay(user.lastDailyClaim, now)) {
    const msg = '⏳ Daily reward sudah di-claim hari ini!';
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery(msg, { show_alert: true });
    } else {
      await ctx.reply(msg);
    }
    return;
  }

  user.diamond += DAILY_REWARD.diamond;
  user.rupiah += DAILY_REWARD.rupiah;
  user.stamina = Math.min(user.maxStamina, user.stamina + DAILY_REWARD.stamina);
  user.lastDailyClaim = now;
  user.stats.diamondEarned = (user.stats.diamondEarned || 0) + DAILY_REWARD.diamond;
  user.stats.rupiahEarned = (user.stats.rupiahEarned || 0) + DAILY_REWARD.rupiah;

  user = applyStaminaRegen(user);
  UserModel.save(userId, user);
  log(userId, 'daily_claim');

  const text =
    `🎁 <b>Daily Reward!</b>\n\n` +
    `💎 +${DAILY_REWARD.diamond} Diamond\n` +
    `💰 +${formatNumber(DAILY_REWARD.rupiah)} Rupiah\n` +
    `⚡ +${DAILY_REWARD.stamina} Stamina\n\n` +
    `Kembali besok untuk reward lagi!`;

  if (ctx.callbackQuery) {
    await ctx.answerCbQuery('Daily claimed!');
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...backToMenu() });
  } else {
    await ctx.replyWithHTML(text, backToMenu());
  }
}

module.exports = { showLeaderboard, claimDaily };
