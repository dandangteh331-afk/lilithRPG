const {
  STAMINA_REGEN_INTERVAL,
  STAMINA_REGEN_AMOUNT
} = require('../config/constants');

function applyStaminaRegen(user) {
  const now = Date.now();
  const last = user.lastStaminaRegen || now;
  const elapsed = now - last;
  const ticks = Math.floor(elapsed / STAMINA_REGEN_INTERVAL);

  if (ticks > 0 && user.stamina < user.maxStamina) {
    user.stamina = Math.min(user.maxStamina, user.stamina + ticks * STAMINA_REGEN_AMOUNT);
    user.lastStaminaRegen = last + ticks * STAMINA_REGEN_INTERVAL;
  } else if (!user.lastStaminaRegen) {
    user.lastStaminaRegen = now;
  }

  return user;
}

function getStaminaRegenInfo(user) {
  const now = Date.now();
  const last = user.lastStaminaRegen || now;
  const nextRegen = STAMINA_REGEN_INTERVAL - ((now - last) % STAMINA_REGEN_INTERVAL);
  const minutes = Math.ceil(nextRegen / 60000);
  return { nextRegenMinutes: minutes };
}

function useStamina(user, amount) {
  if (user.stamina < amount) return false;
  user.stamina -= amount;
  return true;
}

function restoreStamina(user, amount) {
  user.stamina = Math.min(user.maxStamina, user.stamina + amount);
  return user;
}

function isOnCooldown(user, type) {
  const cd = user.cooldowns?.[type] || 0;
  return Date.now() < cd;
}

function getCooldownRemaining(user, type) {
  const cd = user.cooldowns?.[type] || 0;
  const remaining = cd - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

function setCooldown(user, type, ms) {
  if (!user.cooldowns) user.cooldowns = {};
  user.cooldowns[type] = Date.now() + ms;
  return user;
}

module.exports = {
  applyStaminaRegen,
  getStaminaRegenInfo,
  useStamina,
  restoreStamina,
  isOnCooldown,
  getCooldownRemaining,
  setCooldown
};
