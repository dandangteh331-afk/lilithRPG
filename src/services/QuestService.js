const db = require('../models/Database');
const { addExp } = require('../utils/helpers');

function assignRandomQuest(user) {
  const quests = db.getQuests().quests || [];
  if (quests.length === 0) return user;

  const available = quests.filter(q => !user.questProgress[q.id]?.completed);
  const pool = available.length > 0 ? available : quests;
  const quest = pool[Math.floor(Math.random() * pool.length)];

  user.activeQuestId = quest.id;
  if (!user.questProgress[quest.id]) {
    user.questProgress[quest.id] = { progress: 0, completed: false, claimed: false };
  }
  return user;
}

function getActiveQuest(user) {
  const quests = db.getQuests().quests || [];
  if (!user.activeQuestId) return null;
  return quests.find(q => q.id === user.activeQuestId) || null;
}

function updateQuestProgress(user, type, amount = 1, extra = {}) {
  const quest = getActiveQuest(user);
  if (!quest || quest.type !== type) {
    if (type === 'fish_legendary' && extra.rank === 'Legendary') {
      return updateQuestByType(user, 'fish_legendary', 1);
    }
    return { user, completed: false };
  }

  const progress = user.questProgress[quest.id];
  if (progress.completed) return { user, completed: false };

  if (type === 'collect_rupiah') {
    progress.progress = user.stats.rupiahEarned || user.rupiah;
  } else if (type === 'collect_diamond') {
    progress.progress = user.stats.diamondEarned || user.diamond;
  } else if (type === 'level_up') {
    progress.progress = user.stats.levelUpsThisQuest || 0;
  } else {
    progress.progress = (progress.progress || 0) + amount;
  }

  if (progress.progress >= quest.target) {
    progress.completed = true;
    return { user, completed: true, quest };
  }
  return { user, completed: false, quest };
}

function updateQuestByType(user, type, amount = 1) {
  const quests = db.getQuests().quests || [];
  for (const quest of quests) {
    if (quest.type !== type) continue;
    const progress = user.questProgress[quest.id];
    if (!progress || progress.completed) continue;
    if (user.activeQuestId !== quest.id) continue;

    progress.progress = (progress.progress || 0) + amount;
    if (progress.progress >= quest.target) {
      progress.completed = true;
      return { user, completed: true, quest };
    }
  }
  return { user, completed: false };
}

function claimQuestReward(user) {
  const quest = getActiveQuest(user);
  if (!quest) return { success: false, message: 'Tidak ada quest aktif.' };

  const progress = user.questProgress[quest.id];
  if (!progress?.completed) return { success: false, message: 'Quest belum selesai!' };
  if (progress.claimed) return { success: false, message: 'Reward sudah di-claim.' };

  user.rupiah += quest.rewardRupiah;
  user.diamond += quest.rewardDiamond;
  const { user: updatedUser, notifications } = addExp(user, quest.rewardExp);
  progress.claimed = true;

  user.stats.levelUpsThisQuest = 0;
  user.activeQuestId = null;
  assignRandomQuest(user);

  return {
    success: true,
    user: updatedUser,
    quest,
    notifications,
    message: `✅ Quest "${quest.name}" selesai!\n💰 +${quest.rewardRupiah} Rupiah\n💎 +${quest.rewardDiamond} Diamond\n⭐ +${quest.rewardExp} EXP`
  };
}

module.exports = {
  assignRandomQuest,
  getActiveQuest,
  updateQuestProgress,
  updateQuestByType,
  claimQuestReward
};
