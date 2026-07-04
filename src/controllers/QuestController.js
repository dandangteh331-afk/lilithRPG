const db = require('../models/Database');
const { UserModel } = require('../models/User');
const { requireUser } = require('./AuthController');
const { questMenu } = require('../views/Keyboards');
const {
  getActiveQuest, assignRandomQuest, claimQuestReward
} = require('../services/QuestService');
const { formatNumber } = require('../utils/helpers');
const { Markup } = require('telegraf');
const { backToMenu } = require('../views/Messages');

async function showQuestMenu(ctx) {
  const user = await requireUser(ctx);
  if (!user) return;

  const active = getActiveQuest(user);
  let text = `📜 <b>Quest</b>\n\n`;

  if (active) {
    const progress = user.questProgress[active.id] || { progress: 0 };
    text +=
      `Quest Aktif: <b>${active.name}</b>\n` +
      `${active.description}\n` +
      `Progress: ${progress.progress}/${active.target}\n` +
      `Reward: ⭐${active.rewardExp} 💰${formatNumber(active.rewardRupiah)} 💎${active.rewardDiamond}`;
  } else {
    text += '<i>Tidak ada quest aktif. Ambil quest baru!</i>';
  }

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...questMenu() });
  } else {
    await ctx.replyWithHTML(text, questMenu());
  }
}

async function showActiveQuest(ctx) {
  await showQuestMenu(ctx);
}

async function newQuest(ctx) {
  const userId = ctx.from.id;
  let user = await requireUser(ctx);
  if (!user) return;

  user = assignRandomQuest(user);
  UserModel.save(userId, user);

  const active = getActiveQuest(user);
  await ctx.answerCbQuery('Quest baru!');
  await ctx.editMessageText(
    `📜 <b>Quest Baru!</b>\n\n` +
    `<b>${active.name}</b>\n${active.description}\n\n` +
    `Target: ${active.target}\n` +
    `Reward: ⭐${active.rewardExp} 💰${formatNumber(active.rewardRupiah)} 💎${active.rewardDiamond}`,
    { parse_mode: 'HTML', ...questMenu() }
  );
}

async function claimQuest(ctx) {
  const userId = ctx.from.id;
  let user = await requireUser(ctx);
  if (!user) return;

  const result = claimQuestReward(user);
  if (!result.success) {
    await ctx.answerCbQuery(result.message, { show_alert: true });
    return;
  }

  UserModel.save(userId, result.user);
  let text = result.message;
  if (result.notifications?.length) text += '\n\n' + result.notifications.join('\n');

  await ctx.answerCbQuery('Reward claimed!');
  await ctx.editMessageText(text, { parse_mode: 'HTML', ...questMenu() });
}

async function listQuests(ctx, page = 0) {
  const user = await requireUser(ctx);
  if (!user) return;

  const quests = db.getQuests().quests || [];
  const q = quests[page];
  if (!q) return;

  const progress = user.questProgress[q.id];
  const status = progress?.claimed ? '✅ Claimed' : progress?.completed ? '🎁 Ready' : progress ? `📊 ${progress.progress}/${q.target}` : '⬜ Belum';

  const text =
    `📜 <b>${q.name}</b> [${page + 1}/${quests.length}]\n\n` +
    `${q.description}\n\n` +
    `Reward: ⭐${q.rewardExp} 💰${formatNumber(q.rewardRupiah)} 💎${q.rewardDiamond}\n` +
    `Status: ${status}`;

  const nav = [];
  if (page > 0) nav.push(Markup.button.callback('◀️', `quest_list_${page - 1}`));
  nav.push(Markup.button.callback(`${page + 1}/${quests.length}`, 'noop'));
  if (page < quests.length - 1) nav.push(Markup.button.callback('▶️', `quest_list_${page + 1}`));

  const kb = Markup.inlineKeyboard([nav, [Markup.button.callback('🔙 Quest', 'menu_quest')]]);

  await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
}

module.exports = {
  showQuestMenu,
  showActiveQuest,
  newQuest,
  claimQuest,
  listQuests
};
