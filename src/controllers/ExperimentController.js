/**
 * ExperimentController.js
 * Fitur Eksperimen — simulasi stats karakter & weapon dengan slot gem/enhancement.
 *
 * Slot:
 *   Character : 6 slot → characterSlots[0..5]  (cgem_*)
 *   Weapon    : 6 slot → weaponSlots[0..5]      (gem_*)
 *
 * Data experiment disimpan di user.experiment (bukan langsung ke stats aktif),
 * sehingga perubahan di sini tidak mempengaruhi karakter asli.
 */

const db          = require('../models/Database');
const { UserModel } = require('../models/User');
const { requireUser } = require('./AuthController');
const { formatNumber } = require('../utils/helpers');
const { Markup }  = require('telegraf');

const MAX_CHAR_SLOTS   = 6;
const MAX_WEAPON_SLOTS = 6;

// ─── Default experiment state ────────────────────────────────────────────────

function defaultExperiment() {
  return {
    selectedWeaponId: null,   // id weapon yang dipilih untuk sim
    characterSlots:   new Array(MAX_CHAR_SLOTS).fill(null),
    weaponSlots:      new Array(MAX_WEAPON_SLOTS).fill(null)
  };
}

function ensureExperiment(user) {
  if (!user.experiment) user.experiment = defaultExperiment();
  // migration — pastikan array length benar
  while (user.experiment.characterSlots.length < MAX_CHAR_SLOTS)
    user.experiment.characterSlots.push(null);
  while (user.experiment.weaponSlots.length < MAX_WEAPON_SLOTS)
    user.experiment.weaponSlots.push(null);
  return user;
}

// ─── Stat calculator ─────────────────────────────────────────────────────────

function calcStats(user) {
  const exp    = user.experiment || defaultExperiment();
  const shop   = db.getShop();

  // Base weapon attack
  let baseAttack = user.weapon.attack;
  if (exp.selectedWeaponId) {
    const w = (shop.weapons || []).find(w => w.id === exp.selectedWeaponId);
    if (w) baseAttack = w.attack;
  }

  // Accumulate bonuses
  let attackFlat    = 0;
  let attackPct     = 0;   // from artifacts already on user
  let critBonus     = 0;
  let pierceBonus   = 0;
  let cooldownRed   = 0;
  let expBonus      = 0;
  let rupiahBonus   = 0;
  let luckBonus     = 0;
  let dodgeBonus    = 0;
  let maxStaminaUp  = 0;

  // Weapon slots
  const weaponGems = shop.weaponGems || [];
  for (const slotGemId of exp.weaponSlots) {
    if (!slotGemId) continue;
    const gem = weaponGems.find(g => g.id === slotGemId);
    if (!gem) continue;
    attackFlat  += gem.bonus.attackFlat    || 0;
    critBonus   += gem.bonus.critBonus     || 0;
    pierceBonus += gem.bonus.pierceBonus   || 0;
    cooldownRed += gem.bonus.cooldownReduce|| 0;
  }

  // Character slots
  const charGems = shop.characterGems || [];
  for (const slotGemId of exp.characterSlots) {
    if (!slotGemId) continue;
    const gem = charGems.find(g => g.id === slotGemId);
    if (!gem) continue;
    maxStaminaUp += gem.bonus.maxStaminaUp || 0;
    expBonus     += gem.bonus.expBonus     || 0;
    rupiahBonus  += gem.bonus.rupiahBonus  || 0;
    luckBonus    += gem.bonus.luckBonus    || 0;
    dodgeBonus   += gem.bonus.dodgeBonus   || 0;
    cooldownRed  += gem.bonus.cooldownReduce|| 0;
  }

  // Existing artifacts on real character also count in simulation
  for (const art of (user.artifacts || [])) {
    attackFlat  += art.bonus.attackBonus   || 0;
    expBonus    += art.bonus.expBonus      || 0;
    luckBonus   += art.bonus.luckBonus     || 0;
    dodgeBonus  += art.bonus.dodgeBonus    || 0;
    cooldownRed += art.bonus.cooldownReduce|| 0;
  }

  const totalAttack   = baseAttack + attackFlat;
  const totalStamina  = user.maxStamina + maxStaminaUp;

  return {
    baseAttack, attackFlat, totalAttack,
    critBonus, pierceBonus, cooldownRed,
    expBonus, rupiahBonus, luckBonus, dodgeBonus,
    maxStaminaUp, totalStamina
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slotLabel(gem, idx, type) {
  if (!gem) return `[${idx + 1}] — Kosong`;
  return `[${idx + 1}] ${gem.emoji} ${gem.name}`;
}

// ─── Main experiment menu ─────────────────────────────────────────────────────

async function showExperiment(ctx) {
  const user = await requireUser(ctx);
  if (!user) return;
  ensureExperiment(user);

  const stats = calcStats(user);
  const exp   = user.experiment;
  const shop  = db.getShop();

  // Selected weapon label
  let weaponLabel = `${user.weapon.name} (aktif, +${user.weapon.attack})`;
  if (exp.selectedWeaponId) {
    const w = (shop.weapons || []).find(w => w.id === exp.selectedWeaponId);
    if (w) weaponLabel = `${w.name} (+${w.attack}) [sim]`;
  }

  const text =
    `🔬 <b>Eksperimen</b>\n` +
    `─────────────────────────\n` +
    `Simulasi stats tanpa mempengaruhi karakter asli.\n\n` +
    `⚔️ <b>Weapon Sim:</b> ${weaponLabel}\n\n` +
    `📊 <b>Stats Simulasi:</b>\n` +
    `  ⚔️ Total Attack   : <b>${formatNumber(stats.totalAttack)}</b> <i>(+${formatNumber(stats.attackFlat)} dari gem)</i>\n` +
    `  ⚡ Max Stamina    : <b>${stats.totalStamina}</b> <i>(+${stats.maxStaminaUp})</i>\n` +
    `  🎯 Crit Chance    : <b>+${stats.critBonus}%</b>\n` +
    `  🔱 Armor Pierce   : <b>+${stats.pierceBonus}%</b>\n` +
    `  ⏱️ Cooldown Red.  : <b>-${stats.cooldownRed}%</b>\n` +
    `  ⭐ EXP Bonus      : <b>+${stats.expBonus}%</b>\n` +
    `  💰 Rupiah Bonus   : <b>+${stats.rupiahBonus}%</b>\n` +
    `  🍀 Luck Bonus     : <b>+${stats.luckBonus}%</b>\n` +
    `  💨 Dodge Bonus    : <b>+${stats.dodgeBonus}%</b>\n\n` +
    `🗡️ <b>Weapon Slots</b> (${exp.weaponSlots.filter(Boolean).length}/${MAX_WEAPON_SLOTS}):\n` +
    exp.weaponSlots.map((g, i) => {
      const gem = g ? (shop.weaponGems || []).find(x => x.id === g) : null;
      return `  ${slotLabel(gem, i, 'weapon')}`;
    }).join('\n') + '\n\n' +
    `👤 <b>Character Slots</b> (${exp.characterSlots.filter(Boolean).length}/${MAX_CHAR_SLOTS}):\n` +
    exp.characterSlots.map((g, i) => {
      const gem = g ? (shop.characterGems || []).find(x => x.id === g) : null;
      return `  ${slotLabel(gem, i, 'char')}`;
    }).join('\n');

  const kb = Markup.inlineKeyboard([
    [Markup.button.callback('⚔️ Pilih Weapon',      'exp_weapon_pick_0'),
     Markup.button.callback('🗡️ Slot Weapon',        'exp_wslot_menu')],
    [Markup.button.callback('👤 Slot Character',     'exp_cslot_menu'),
     Markup.button.callback('🔄 Reset Semua',        'exp_reset')],
    [Markup.button.callback('🔙 Menu Utama',         'menu_main')]
  ]);

  if (ctx.callbackQuery) await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
  else await ctx.replyWithHTML(text, kb);
}

// ─── Weapon picker ────────────────────────────────────────────────────────────

async function showWeaponPick(ctx, page = 0) {
  const user = await requireUser(ctx);
  if (!user) return;
  ensureExperiment(user);

  const weapons  = db.getShop().weapons || [];
  const pageSize = 5;
  const total    = Math.ceil(weapons.length / pageSize);
  const safePage = Math.max(0, Math.min(page, total - 1));
  const slice    = weapons.slice(safePage * pageSize, safePage * pageSize + pageSize);

  let text = `⚔️ <b>Pilih Weapon untuk Simulasi</b>\n<i>Halaman ${safePage + 1}/${total}</i>\n\n`;
  slice.forEach((w, i) => {
    const active = user.experiment.selectedWeaponId === w.id ? ' ✅' : '';
    text += `${safePage * pageSize + i + 1}. <b>${w.name}</b> (+${formatNumber(w.attack)})${active}\n`;
  });

  const itemBtns = slice.map((w, i) =>
    [Markup.button.callback(`⚔️ ${w.name} (+${formatNumber(w.attack)})`, `exp_wpick_${w.id}`)]
  );

  const nav = [];
  if (safePage > 0)       nav.push(Markup.button.callback('◀️', `exp_weapon_pick_${safePage - 1}`));
  if (safePage < total-1) nav.push(Markup.button.callback('▶️', `exp_weapon_pick_${safePage + 1}`));
  if (nav.length) itemBtns.push(nav);

  itemBtns.push([Markup.button.callback('🔙 Eksperimen', 'menu_experiment')]);
  await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(itemBtns) });
}

async function selectWeapon(ctx) {
  const weaponId = ctx.match[1];
  const user     = await requireUser(ctx);
  if (!user) return;
  ensureExperiment(user);

  user.experiment.selectedWeaponId = weaponId;
  UserModel.save(ctx.from.id, user);

  const w = (db.getShop().weapons || []).find(w => w.id === weaponId);
  await ctx.answerCbQuery(`⚔️ ${w?.name || weaponId} dipilih!`);
  await showExperiment(ctx);
}

// ─── Weapon slot menu ─────────────────────────────────────────────────────────

async function showWeaponSlotMenu(ctx) {
  const user = await requireUser(ctx);
  if (!user) return;
  ensureExperiment(user);

  const shop       = db.getShop();
  const weaponGems = shop.weaponGems || [];
  const slots      = user.experiment.weaponSlots;

  let text = `🗡️ <b>Weapon Slots</b>\nPasang gem untuk meningkatkan attack & stats weapon.\n\n`;
  slots.forEach((g, i) => {
    const gem = g ? weaponGems.find(x => x.id === g) : null;
    text += `Slot ${i + 1}: ${gem ? `${gem.emoji} <b>${gem.name}</b> (${Object.entries(gem.bonus).map(([k,v])=>`${k}:+${v}`).join(', ')})` : '<i>Kosong</i>'}\n`;
  });

  const rows = slots.map((g, i) => {
    if (g) return [Markup.button.callback(`🔓 Lepas Slot ${i+1}`, `exp_wslot_remove_${i}`)];
    return [Markup.button.callback(`➕ Pasang Slot ${i+1}`, `exp_wslot_pick_${i}_0`)];
  });
  rows.push([Markup.button.callback('🔙 Eksperimen', 'menu_experiment')]);

  await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
}

async function showWeaponGemPicker(ctx, slotIdx, page = 0) {
  const user = await requireUser(ctx);
  if (!user) return;

  const weaponGems = db.getShop().weaponGems || [];
  const pageSize   = 5;
  const total      = Math.ceil(weaponGems.length / pageSize);
  const safePage   = Math.max(0, Math.min(page, total - 1));
  const slice      = weaponGems.slice(safePage * pageSize, safePage * pageSize + pageSize);

  let text = `🗡️ <b>Pilih Gem untuk Weapon Slot ${slotIdx + 1}</b>\n<i>Halaman ${safePage + 1}/${total}</i>\n\n`;
  slice.forEach(g => {
    text += `${g.emoji} <b>${g.name}</b>\n  ${g.desc}\n  💎 ${formatNumber(g.priceDiamond)} | 💰 ${formatNumber(g.priceRupiah)}\n\n`;
  });

  const itemBtns = slice.map(g =>
    [Markup.button.callback(`${g.emoji} ${g.name}`, `exp_wslot_set_${slotIdx}_${g.id}`)]
  );

  const nav = [];
  if (safePage > 0)       nav.push(Markup.button.callback('◀️', `exp_wslot_pick_${slotIdx}_${safePage - 1}`));
  if (safePage < total-1) nav.push(Markup.button.callback('▶️', `exp_wslot_pick_${slotIdx}_${safePage + 1}`));
  if (nav.length) itemBtns.push(nav);
  itemBtns.push([Markup.button.callback('🔙 Slot Weapon', 'exp_wslot_menu')]);

  await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(itemBtns) });
}

async function setWeaponSlotGem(ctx, slotIdx, gemId) {
  const user = await requireUser(ctx);
  if (!user) return;
  ensureExperiment(user);

  user.experiment.weaponSlots[slotIdx] = gemId;
  UserModel.save(ctx.from.id, user);

  const gem = (db.getShop().weaponGems || []).find(g => g.id === gemId);
  await ctx.answerCbQuery(`${gem?.emoji || '💎'} ${gem?.name} dipasang di Slot ${slotIdx + 1}!`);
  await showWeaponSlotMenu(ctx);
}

async function removeWeaponSlotGem(ctx, slotIdx) {
  const user = await requireUser(ctx);
  if (!user) return;
  ensureExperiment(user);

  user.experiment.weaponSlots[slotIdx] = null;
  UserModel.save(ctx.from.id, user);

  await ctx.answerCbQuery(`🔓 Slot ${slotIdx + 1} dikosongkan.`);
  await showWeaponSlotMenu(ctx);
}

// ─── Character slot menu ──────────────────────────────────────────────────────

async function showCharSlotMenu(ctx) {
  const user = await requireUser(ctx);
  if (!user) return;
  ensureExperiment(user);

  const shop     = db.getShop();
  const charGems = shop.characterGems || [];
  const slots    = user.experiment.characterSlots;

  let text = `👤 <b>Character Slots</b>\nPasang batu untuk meningkatkan stats karakter.\n\n`;
  slots.forEach((g, i) => {
    const gem = g ? charGems.find(x => x.id === g) : null;
    text += `Slot ${i + 1}: ${gem ? `${gem.emoji} <b>${gem.name}</b> (${Object.entries(gem.bonus).map(([k,v])=>`${k}:+${v}`).join(', ')})` : '<i>Kosong</i>'}\n`;
  });

  const rows = slots.map((g, i) => {
    if (g) return [Markup.button.callback(`🔓 Lepas Slot ${i+1}`, `exp_cslot_remove_${i}`)];
    return [Markup.button.callback(`➕ Pasang Slot ${i+1}`, `exp_cslot_pick_${i}_0`)];
  });
  rows.push([Markup.button.callback('🔙 Eksperimen', 'menu_experiment')]);

  await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
}

async function showCharGemPicker(ctx, slotIdx, page = 0) {
  const user = await requireUser(ctx);
  if (!user) return;

  const charGems = db.getShop().characterGems || [];
  const pageSize = 5;
  const total    = Math.ceil(charGems.length / pageSize);
  const safePage = Math.max(0, Math.min(page, total - 1));
  const slice    = charGems.slice(safePage * pageSize, safePage * pageSize + pageSize);

  let text = `👤 <b>Pilih Batu untuk Character Slot ${slotIdx + 1}</b>\n<i>Halaman ${safePage + 1}/${total}</i>\n\n`;
  slice.forEach(g => {
    text += `${g.emoji} <b>${g.name}</b>\n  ${g.desc}\n  💎 ${formatNumber(g.priceDiamond)} | 💰 ${formatNumber(g.priceRupiah)}\n\n`;
  });

  const itemBtns = slice.map(g =>
    [Markup.button.callback(`${g.emoji} ${g.name}`, `exp_cslot_set_${slotIdx}_${g.id}`)]
  );

  const nav = [];
  if (safePage > 0)       nav.push(Markup.button.callback('◀️', `exp_cslot_pick_${slotIdx}_${safePage - 1}`));
  if (safePage < total-1) nav.push(Markup.button.callback('▶️', `exp_cslot_pick_${slotIdx}_${safePage + 1}`));
  if (nav.length) itemBtns.push(nav);
  itemBtns.push([Markup.button.callback('🔙 Slot Character', 'exp_cslot_menu')]);

  await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(itemBtns) });
}

async function setCharSlotGem(ctx, slotIdx, gemId) {
  const user = await requireUser(ctx);
  if (!user) return;
  ensureExperiment(user);

  user.experiment.characterSlots[slotIdx] = gemId;
  UserModel.save(ctx.from.id, user);

  const gem = (db.getShop().characterGems || []).find(g => g.id === gemId);
  await ctx.answerCbQuery(`${gem?.emoji || '💎'} ${gem?.name} dipasang di Slot ${slotIdx + 1}!`);
  await showCharSlotMenu(ctx);
}

async function removeCharSlotGem(ctx, slotIdx) {
  const user = await requireUser(ctx);
  if (!user) return;
  ensureExperiment(user);

  user.experiment.characterSlots[slotIdx] = null;
  UserModel.save(ctx.from.id, user);

  await ctx.answerCbQuery(`🔓 Slot ${slotIdx + 1} dikosongkan.`);
  await showCharSlotMenu(ctx);
}

// ─── Reset ────────────────────────────────────────────────────────────────────

async function resetExperiment(ctx) {
  const user = await requireUser(ctx);
  if (!user) return;

  user.experiment = defaultExperiment();
  UserModel.save(ctx.from.id, user);

  await ctx.answerCbQuery('🔄 Eksperimen direset!');
  await showExperiment(ctx);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  showExperiment,
  showWeaponPick,
  selectWeapon,
  showWeaponSlotMenu,
  showWeaponGemPicker,
  setWeaponSlotGem,
  removeWeaponSlotGem,
  showCharSlotMenu,
  showCharGemPicker,
  setCharSlotGem,
  removeCharSlotGem,
  resetExperiment
};
