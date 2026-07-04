const { UserModel } = require('../models/User');
const { requireUser } = require('./AuthController');
const { workMenu } = require('../views/Keyboards');
const { addExp, formatNumber, randomInt } = require('../utils/helpers');
const {
  useStamina, isOnCooldown, getCooldownRemaining, setCooldown
} = require('../services/StaminaService');
const { updateQuestProgress } = require('../services/QuestService');
const { log } = require('../services/Logger');
const { WORK_JOBS, WORK_STAMINA_COST, WORK_COOLDOWN } = require('../config/constants');

async function showWorkMenu(ctx) {
  const user = await requireUser(ctx);
  if (!user) return;

  const text =
    `⚒️ <b>Kerja</b>\n\n` +
    `⚡ Stamina: ${user.stamina}/${user.maxStamina} (butuh ${WORK_STAMINA_COST})\n` +
    `Pilih pekerjaan:`;

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...workMenu(WORK_JOBS) });
  } else {
    await ctx.replyWithHTML(text, workMenu(WORK_JOBS));
  }
}

async function doWork(ctx) {
  const userId = ctx.from.id;
  let user = await requireUser(ctx);
  if (!user) return;

  const jobIndex = parseInt(ctx.match[1], 10);
  const job = WORK_JOBS[jobIndex];
  if (!job) {
    await ctx.answerCbQuery('Pekerjaan tidak valid');
    return;
  }

  if (isOnCooldown(user, 'work')) {
    await ctx.answerCbQuery(`⏳ Cooldown ${getCooldownRemaining(user, 'work')}s`, { show_alert: true });
    return;
  }

  if (!useStamina(user, WORK_STAMINA_COST)) {
    await ctx.answerCbQuery('⚡ Stamina tidak cukup!', { show_alert: true });
    return;
  }

  const rupiah = randomInt(job.rupiahMin, job.rupiahMax);
  const exp = randomInt(job.expMin, job.expMax);

  user.rupiah += rupiah;
  user.stats.rupiahEarned = (user.stats.rupiahEarned || 0) + rupiah;
  user.stats.totalWork = (user.stats.totalWork || 0) + 1;

  const { user: expUser, notifications } = addExp(user, exp);
  user = expUser;

  setCooldown(user, 'work', WORK_COOLDOWN);

  let questResult = updateQuestProgress(user, 'work', 1);
  user = questResult.user;
  const collectResult = updateQuestProgress(user, 'collect_rupiah', 0);
  user = collectResult.user;

  UserModel.save(userId, user);
  log(userId, 'work', { job: job.name, rupiah, exp });

  let text =
    `⚒️ <b>${job.name}</b> selesai!\n\n` +
    `💰 +${formatNumber(rupiah)} Rupiah\n` +
    `⭐ +${exp} EXP\n` +
    `⚡ Stamina: ${user.stamina}/${user.maxStamina}`;

  if (notifications.length) text += '\n\n' + notifications.join('\n');
  if (questResult.completed) text += '\n\n📜 Quest selesai! Claim reward di menu Quest.';

  await ctx.answerCbQuery('Kerja selesai!');
  await ctx.editMessageText(text, { parse_mode: 'HTML', ...workMenu(WORK_JOBS) });
}

module.exports = { showWorkMenu, doWork };
