const db = require('../models/Database');
const { UserModel } = require('../models/User');
const { requireUser } = require('./AuthController');
const { dungeonMenu } = require('../views/Keyboards');
const { addExp, formatNumber, randomInt, addInventoryItem, canAddToInventory } = require('../utils/helpers');
const {
  useStamina, isOnCooldown, getCooldownRemaining, setCooldown
} = require('../services/StaminaService');
const { updateQuestProgress } = require('../services/QuestService');
const { log } = require('../services/Logger');
const { DUNGEON_STAMINA_COST, DUNGEON_COOLDOWN } = require('../config/constants');
const { backToMenu } = require('../views/Messages');

async function showDungeon(ctx) {
  const user = await requireUser(ctx);
  if (!user) return;

  const floors = db.getDungeon().floors || [];
  const text =
    `🏰 <b>Dungeon</b>\n\n` +
    `⚔️ Attack: +${user.weapon.attack}\n` +
    `⚡ Stamina: ${user.stamina}/${user.maxStamina} (butuh ${DUNGEON_STAMINA_COST})\n` +
    `📍 Progress: Lantai ${user.dungeonProgress}\n\n` +
    `Pilih lantai:`;

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...dungeonMenu(floors, user.dungeonProgress) });
  } else {
    await ctx.replyWithHTML(text, dungeonMenu(floors, user.dungeonProgress));
  }
}

async function enterFloor(ctx) {
  const userId = ctx.from.id;
  let user = await requireUser(ctx);
  if (!user) return;

  const floorNum = parseInt(ctx.match[1], 10);
  const dungeonData = db.getDungeon();
  const floor = dungeonData.floors.find(f => f.floor === floorNum);
  if (!floor) {
    await ctx.answerCbQuery('Lantai tidak ditemukan');
    return;
  }

  if (floorNum > 1 && user.dungeonProgress < floorNum - 1) {
    await ctx.answerCbQuery('🔒 Selesaikan lantai sebelumnya dulu!', { show_alert: true });
    return;
  }

  if (isOnCooldown(user, 'dungeon')) {
    await ctx.answerCbQuery(`⏳ Cooldown ${getCooldownRemaining(user, 'dungeon')}s`, { show_alert: true });
    return;
  }

  if (!useStamina(user, DUNGEON_STAMINA_COST)) {
    await ctx.answerCbQuery('⚡ Stamina tidak cukup!', { show_alert: true });
    return;
  }

  const playerAttack = user.weapon.attack;
  const required = floor.attackRequired;

  if (playerAttack < required) {
    user.stamina += DUNGEON_STAMINA_COST;
    await ctx.answerCbQuery(`⚔️ Attack terlalu rendah! Butuh ${required}, kamu ${playerAttack}`, { show_alert: true });
    return;
  }

  const winChance = Math.min(0.95, 0.5 + (playerAttack - required) / (required * 2));
  const victory = Math.random() < winChance;

  setCooldown(user, 'dungeon', DUNGEON_COOLDOWN);

  if (!victory) {
    UserModel.save(userId, user);
    await ctx.answerCbQuery('Kalah!');
    await ctx.editMessageText(
      `💀 <b>Kalah di ${floor.name}!</b>\n\n` +
      `${floor.enemy} terlalu kuat!\n` +
      `Butuh attack minimal ${required} (kamu: ${playerAttack})\n\n` +
      `Coba upgrade senjata dan coba lagi!`,
      { parse_mode: 'HTML', ...backToMenu() }
    );
    return;
  }

  const bonusRupiah = randomInt(0, Math.floor(floor.dropRupiah * 0.3));
  const bonusDiamond = Math.random() < 0.3 ? randomInt(1, floor.dropDiamond) : floor.dropDiamond;

  user.rupiah += floor.dropRupiah + bonusRupiah;
  user.diamond += bonusDiamond;
  user.stats.rupiahEarned = (user.stats.rupiahEarned || 0) + floor.dropRupiah;
  user.stats.diamondEarned = (user.stats.diamondEarned || 0) + bonusDiamond;
  user.stats.totalDungeon = (user.stats.totalDungeon || 0) + 1;

  if (user.dungeonProgress < floorNum) user.dungeonProgress = floorNum;

  const { user: expUser, notifications } = addExp(user, floor.dropExp);
  user = expUser;

  let dropsText = '';
  const materialDrops = dungeonData.materialDrops || [];
  for (const drop of materialDrops) {
    if (floorNum >= (drop.minFloor || 1) && Math.random() < drop.chance) {
      if (canAddToInventory(user, 1)) {
        user.inventory = addInventoryItem(user.inventory, drop.name, 1, 'material');
        dropsText += `\n🎁 ${drop.name}`;
      }
    }
  }

  let questResult = updateQuestProgress(user, 'dungeon', 1);
  user = questResult.user;
  const collectR = updateQuestProgress(user, 'collect_rupiah', 0);
  user = collectR.user;
  const collectD = updateQuestProgress(user, 'collect_diamond', 0);
  user = collectD.user;

  UserModel.save(userId, user);
  log(userId, 'dungeon', { floor: floorNum, victory: true });

  let text =
    `🏆 <b>${floor.name}</b> - SELESAI!\n\n` +
    `👹 Boss: ${floor.boss} dikalahkan!\n\n` +
    `⭐ +${floor.dropExp} EXP\n` +
    `💰 +${formatNumber(floor.dropRupiah + bonusRupiah)} Rupiah\n` +
    `💎 +${bonusDiamond} Diamond` +
    dropsText;

  if (notifications.length) text += '\n\n' + notifications.join('\n');
  if (questResult.completed) text += '\n\n📜 Quest selesai!';

  await ctx.answerCbQuery('Victory!');
  await ctx.editMessageText(text, { parse_mode: 'HTML', ...backToMenu() });
}

module.exports = { showDungeon, enterFloor };
