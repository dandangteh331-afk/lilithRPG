const db = require('../models/Database');

function getRankForLevel(level) {
  const ranks = db.getRanks().ranks || [];
  let currentRank = ranks[0]?.name || 'Petualang Pemula';
  for (const rank of ranks) {
    if (level >= rank.level) currentRank = rank.name;
  }
  return currentRank;
}

function addExp(user, amount) {
  const notifications = [];
  user.exp += amount;
  let leveledUp = false;

  while (user.exp >= user.expToNext) {
    user.exp -= user.expToNext;
    user.level += 1;
    user.expToNext = user.level * 100;
    leveledUp = true;
    user.stats.levelUpsThisQuest = (user.stats.levelUpsThisQuest || 0) + 1;
    notifications.push(`🎉 Level Up! Sekarang Level ${user.level}`);
  }

  const oldRank = user.rank;
  const newRank = getRankForLevel(user.level);
  if (newRank !== oldRank) {
    user.rank = newRank;
    notifications.push(`🏆 Rank Naik! ${oldRank} → ${newRank}`);
  }

  return { user, leveledUp, notifications };
}

function formatNumber(n) {
  return n.toLocaleString('id-ID');
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedRandom(items, weightKey = 'weight') {
  const total = items.reduce((sum, item) => sum + (item[weightKey] || 1), 0);
  let rand = Math.random() * total;
  for (const item of items) {
    rand -= item[weightKey] || 1;
    if (rand <= 0) return item;
  }
  return items[items.length - 1];
}

function countInventoryItem(inventory, name) {
  const item = inventory.find(i => i.name === name);
  return item ? item.qty : 0;
}

function addInventoryItem(inventory, name, qty = 1, type = 'material') {
  const existing = inventory.find(i => i.name === name);
  if (existing) {
    existing.qty += qty;
  } else {
    inventory.push({ name, qty, type });
  }
  return inventory;
}

function removeInventoryItem(inventory, name, qty = 1) {
  const idx = inventory.findIndex(i => i.name === name);
  if (idx === -1) return { success: false, inventory };
  if (inventory[idx].qty < qty) return { success: false, inventory };
  inventory[idx].qty -= qty;
  if (inventory[idx].qty <= 0) inventory.splice(idx, 1);
  return { success: true, inventory };
}

function getInventoryCapacity(user) {
  return user.house?.capacity || 10;
}

function getInventoryUsed(inventory) {
  return inventory.reduce((sum, i) => sum + i.qty, 0);
}

function canAddToInventory(user, qty = 1) {
  return getInventoryUsed(user.inventory) + qty <= getInventoryCapacity(user);
}

module.exports = {
  getRankForLevel,
  addExp,
  formatNumber,
  randomInt,
  weightedRandom,
  countInventoryItem,
  addInventoryItem,
  removeInventoryItem,
  getInventoryCapacity,
  getInventoryUsed,
  canAddToInventory
};
