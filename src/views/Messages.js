const { Markup } = require('telegraf');
const { formatNumber } = require('../utils/helpers');
const { getStaminaRegenInfo } = require('../services/StaminaService');
const { SKILL_UNLOCK_LEVEL } = require('../config/constants');

function mainMenu() {
  const { mainMenu: kb } = require('./Keyboards');
  return kb();
}

function mainMenuText(user) {
  if (!user) {
    return (
      `╔═══════════════════╗\n` +
      `  ⚔️  <b>RPG Fantasy Bot</b>  ⚔️\n` +
      `╚═══════════════════╝\n\n` +
      `Selamat datang, Petualang!\n` +
      `Pilih menu untuk memulai petualangan.`
    );
  }

  const regen   = getStaminaRegenInfo(user);
  const invUsed = user.inventory.reduce((s, i) => s + i.qty, 0);
  const staminaBar = buildBar(user.stamina, user.maxStamina, 8);
  const expBar     = buildBar(user.exp, user.expToNext, 8);

  return (
    `┌─────────────────────┐\n` +
    `  ${user.avatar}  <b>${user.name}</b>\n` +
    `  🏅 ${user.rank}\n` +
    `└─────────────────────┘\n\n` +
    `📊 <b>Lv.${user.level}</b>  ${expBar}  <code>${formatNumber(user.exp)}/${formatNumber(user.expToNext)}</code>\n` +
    `⚡ <b>Stamina</b>  ${staminaBar}  <code>${user.stamina}/${user.maxStamina}</code>\n\n` +
    `💎 <code>${formatNumber(user.diamond)}</code>  ·  💰 <code>${formatNumber(user.rupiah)}</code>\n` +
    `⚔️ ${user.weapon.name}  ·  🎒 ${invUsed}/${user.house.capacity}\n\n` +
    `<i>Regen stamina: ~${regen.nextRegenMinutes}m · Pilih menu:</i>`
  );
}

function buildBar(current, max, length = 8) {
  const filled = Math.round((current / max) * length);
  const empty  = length - filled;
  return '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, empty));
}

function backToMenu() {
  return Markup.inlineKeyboard([[Markup.button.callback('🔙 Menu Utama', 'menu_main')]]);
}

function confirmButtons(yesAction, noAction = 'menu_main') {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Ya', yesAction), Markup.button.callback('❌ Batal', noAction)]
  ]);
}

// ─── Profile ─────────────────────────────────────────────────────────────────

function profileText(user) {
  const regen   = getStaminaRegenInfo(user);
  const invUsed = user.inventory.reduce((s, i) => s + i.qty, 0);

  // Skills section — shown only if level >= SKILL_UNLOCK_LEVEL
  let skillsSection = '';
  if (user.level >= SKILL_UNLOCK_LEVEL) {
    const skills = user.skills && user.skills.length > 0
      ? user.skills.map(s => `  ${s.emoji || '✨'} ${s.name}`).join('\n')
      : '  <i>Belum ada skill</i>';
    skillsSection = `\n✨ <b>Skills:</b>\n${skills}\n`;
  } else {
    skillsSection = `\n🔒 Skill unlock di Level ${SKILL_UNLOCK_LEVEL}\n`;
  }

  // Artifacts section
  let artSection = '';
  if (user.artifacts && user.artifacts.length > 0) {
    const arts = user.artifacts.map(a => `  ${a.emoji || '🔮'} ${a.name}`).join('\n');
    artSection = `\n🔮 <b>Artefak:</b>\n${arts}\n`;
  }

  return (
    `${user.avatar} <b>${user.name}</b>\n` +
    `━━━━━━━━━━━━━━━━\n` +
    `🏅 Rank: <b>${user.rank}</b>\n` +
    `📊 Level: <b>${user.level}</b> (${formatNumber(user.exp)}/${formatNumber(user.expToNext)} EXP)\n` +
    `⚡ Stamina: <b>${user.stamina}/${user.maxStamina}</b> (regen ~${regen.nextRegenMinutes}m)\n` +
    `💎 Diamond: <b>${formatNumber(user.diamond)}</b>\n` +
    `💰 Rupiah: <b>${formatNumber(user.rupiah)}</b>\n` +
    `⚔️ Weapon: <b>${user.weapon.name}</b> (+${user.weapon.attack})\n` +
    `🏠 Rumah: <b>${user.house.name}</b> (${invUsed}/${user.house.capacity})\n` +
    `🎣 Total Tangkapan: <b>${user.fishingStats.totalCatch}</b>\n` +
    `🏰 Dungeon Progress: <b>Lantai ${user.dungeonProgress}</b>` +
    skillsSection +
    artSection
  );
}

function profileKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✏️ Ganti Nama',  'profile_edit_name'),   Markup.button.callback('🖼 Ganti Avatar', 'profile_edit_avatar')],
    [Markup.button.callback('🎒 Inventory',   'profile_inventory')],
    [Markup.button.callback('🔙 Menu Utama',  'menu_main')]
  ]);
}

// ─── Help ─────────────────────────────────────────────────────────────────────

function helpText() {
  return (
    `<b>🎮 RPG Fantasy Bot - Bantuan</b>\n\n` +
    `<b>Commands:</b>\n` +
    `/start - Daftar & mulai\n` +
    `/register - Daftar ulang info\n` +
    `/profile - Lihat profile\n` +
    `/menu - Menu utama\n` +
    `/daily - Claim reward harian\n` +
    `/help - Bantuan\n\n` +
    `<b>Fitur Utama:</b>\n` +
    `• 🎣 Mancing — tangkap ikan, dapat material bonus\n` +
    `• ⚒️ Kerja — hasilkan rupiah & EXP\n` +
    `• 🏰 Dungeon — lawan monster tiap lantai\n` +
    `• 🎲 Looting — temukan item & material random\n` +
    `• 🏪 Shop — 5 kategori: Weapon, Ramuan, Batu Sihir, Skill, Artefak\n` +
    `• 💰 Jual Item — jual item dari inventory\n` +
    `• ✨ Skill — unlock di Level ${SKILL_UNLOCK_LEVEL}, tampil di profile\n` +
    `• 🔮 Artefak — bonus pasif permanen\n\n` +
    `<b>Tips:</b>\n` +
    `• Stamina regen +1 setiap 10 menit\n` +
    `• Mancing butuh 10 stamina\n` +
    `• Kerja butuh 15 stamina\n` +
    `• Dungeon butuh 20 stamina\n` +
    `• Looting butuh 15 stamina\n` +
    `• EXP naik level = level × 100\n` +
    `• Gunakan tombol untuk navigasi!`
  );
}

// ─── Welcome ─────────────────────────────────────────────────────────────────

function welcomeText(name, isNew) {
  if (isNew) {
    return (
      `🎮 <b>Selamat datang, ${name}!</b>\n\n` +
      `Kamu telah terdaftar sebagai petualang!\n` +
      `💎 100 Diamond | 💰 10.000 Rupiah\n` +
      `⚔️ Pedang Kayu | 🏠 Gubuk\n\n` +
      `Unlock Skill di Level ${SKILL_UNLOCK_LEVEL}!\n` +
      `Gunakan 🎲 Looting untuk menemukan item langka.\n\n` +
      `Gunakan menu di bawah untuk mulai petualangan!`
    );
  }
  return `👋 Selamat datang kembali, <b>${name}</b>!\n\nPilih aksi dari menu:`;
}

module.exports = {
  mainMenu,
  mainMenuText,
  backToMenu,
  confirmButtons,
  profileText,
  profileKeyboard,
  helpText,
  welcomeText
};
