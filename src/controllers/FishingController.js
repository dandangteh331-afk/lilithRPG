const db = require('../models/Database');
const { UserModel } = require('../models/User');
const { requireUser } = require('./AuthController');
const { fishingMenu } = require('../views/Keyboards');
const {
  addExp, formatNumber, randomInt, addInventoryItem, canAddToInventory
} = require('../utils/helpers');
const {
  useStamina, isOnCooldown, getCooldownRemaining, setCooldown
} = require('../services/StaminaService');
const { updateQuestProgress } = require('../services/QuestService');
const { log } = require('../services/Logger');
const {
  FISHING_STAMINA_COST, FISHING_COOLDOWN, FISH_RANK_WEIGHTS, RANK_EMOJI
} = require('../config/constants');

function pickFish(fishList, luckBonus = 0) {
  const byRank = {};
  for (const fish of fishList) {
    if (!byRank[fish.rank]) byRank[fish.rank] = [];
    byRank[fish.rank].push(fish);
  }

  const weights = Object.entries(FISH_RANK_WEIGHTS).map(([rank, weight]) => ({
    rank,
    weight: rank === 'Legendary' || rank === 'Mythic'
      ? weight + luckBonus
      : weight
  }));

  let total = weights.reduce((s, w) => s + w.weight, 0);
  let rand = Math.random() * total;
  let selectedRank = 'Common';
  for (const w of weights) {
    rand -= w.weight;
    if (rand <= 0) { selectedRank = w.rank; break; }
  }

  const pool = byRank[selectedRank] || fishList;
  return pool[randomInt(0, pool.length - 1)];
}

async function showFishingMenu(ctx) {
  const user = await requireUser(ctx);
  if (!user) return;

  const text =
    `🎣 <b>Mancing</b>\n\n` +
    `⚡ Stamina: ${user.stamina}/${user.maxStamina} (butuh ${FISHING_STAMINA_COST})\n` +
    `🍀 Luck: ${user.hasLuckyAmulet ? '+5%' : '0%'}\n` +
    `📊 Total tangkapan: ${user.fishingStats.totalCatch}`;

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...fishingMenu() });
  } else {
    await ctx.replyWithHTML(text, fishingMenu());
  }
}

async function castLine(ctx) {
  const userId = ctx.from.id;
  let user = await requireUser(ctx);
  if (!user) return;

  if (isOnCooldown(user, 'fishing')) {
    await ctx.answerCbQuery(`⏳ Cooldown ${getCooldownRemaining(user, 'fishing')}s`, { show_alert: true });
    return;
  }

  if (!useStamina(user, FISHING_STAMINA_COST)) {
    await ctx.answerCbQuery('⚡ Stamina tidak cukup!', { show_alert: true });
    return;
  }

  const fishData = db.getFish();
  const luckBonus = user.hasLuckyAmulet ? 5 : 0;
  const caught = pickFish(fishData.fish, luckBonus);

  const { user: expUser, notifications } = addExp(user, caught.exp);
  user = expUser;
  user.rupiah += caught.priceRupiah;
  user.stats.rupiahEarned = (user.stats.rupiahEarned || 0) + caught.priceRupiah;

  user.fishingStats.totalCatch += 1;
  user.fishingStats.fishCaught[caught.name] = (user.fishingStats.fishCaught[caught.name] || 0) + 1;

  if (canAddToInventory(user, 1)) {
    user.inventory = addInventoryItem(user.inventory, caught.name, 1, 'fish');
  }

  setCooldown(user, 'fishing', FISHING_COOLDOWN);

  let questResult = updateQuestProgress(user, 'fish', 1);
  user = questResult.user;
  if (caught.rank === 'Legendary') {
    const legResult = updateQuestProgress(user, 'fish_legendary', 1, { rank: caught.rank });
    user = legResult.user;
  }
  const collectResult = updateQuestProgress(user, 'collect_rupiah', 0);
  user = collectResult.user;

  let extraText = '';
  const materialDrops = fishData.materialDrops || [];
  for (const drop of materialDrops) {
    if (Math.random() < drop.chance) {
      if (canAddToInventory(user, 1)) {
        user.inventory = addInventoryItem(user.inventory, drop.name, 1, 'material');
        extraText += `\n🎁 Bonus: ${drop.name}!`;
      }
    }
  }

  if (Math.random() < 0.05) {
    extraText += '\n✨ <b>Random Event!</b> Kamu menemukan harta tersembunyi! +500 Rupiah';
    user.rupiah += 500;
  }

  UserModel.save(userId, user);
  log(userId, 'fishing', { fish: caught.name, rank: caught.rank });

  const emoji = RANK_EMOJI[caught.rank] || '🐟';
  let text =
    `${emoji} <b>${caught.name}</b> [${caught.rank}]\n\n` +
    `💰 +${formatNumber(caught.priceRupiah)} Rupiah\n` +
    `⭐ +${caught.exp} EXP\n` +
    `⚡ Stamina: ${user.stamina}/${user.maxStamina}` +
    extraText;

  if (notifications.length) text += '\n\n' + notifications.join('\n');
  if (questResult.completed) text += '\n\n📜 Quest progress updated!';

  await ctx.answerCbQuery('Ikan ditangkap!');
  await ctx.editMessageText(text, { parse_mode: 'HTML', ...fishingMenu() });
}

async function showFishingStats(ctx) {
  const user = await requireUser(ctx);
  if (!user) return;

  let text = `📊 <b>Statistik Mancing</b>\n\nTotal: ${user.fishingStats.totalCatch} ikan\n\n`;
  const caught = user.fishingStats.fishCaught;
  const entries = Object.entries(caught).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) text += '<i>Belum ada tangkapan.</i>';
  else entries.slice(0, 15).forEach(([name, count]) => { text += `• ${name}: ${count}x\n`; });

  await ctx.answerCbQuery();
  await ctx.editMessageText(text, { parse_mode: 'HTML', ...fishingMenu() });
}

module.exports = { showFishingMenu, castLine, showFishingStats };
