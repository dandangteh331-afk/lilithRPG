const db = require('../models/Database');
const { requireUser } = require('./AuthController');
const { formatNumber } = require('../utils/helpers');
const { backToMenu } = require('../views/Messages');

async function showRank(ctx) {
  const user = await requireUser(ctx);
  if (!user) return;

  const ranks = db.getRanks().ranks || [];
  let text =
    `📊 <b>Rank System</b>\n\n` +
    `Rank saat ini: <b>${user.rank}</b> (Level ${user.level})\n\n`;

  ranks.forEach(r => {
    const achieved = user.level >= r.level;
    const icon = achieved ? '✅' : '🔒';
    text += `${icon} Lv.${r.level} - ${r.name}\n`;
  });

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...backToMenu() });
  } else {
    await ctx.replyWithHTML(text, backToMenu());
  }
}

module.exports = { showRank };
