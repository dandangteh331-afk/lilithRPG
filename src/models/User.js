const db = require('./Database');
const { STAMINA_REGEN_INTERVAL } = require('../config/constants');

function createDefaultUser(telegramName) {
  return {
    name: telegramName || 'Petualang',
    avatar: '⚔️',
    level: 1,
    exp: 0,
    expToNext: 100,
    stamina: 100,
    maxStamina: 100,
    diamond: 100,
    rupiah: 10000,
    weapon: { name: 'Pedang Kayu', attack: 5 },
    house: { name: 'Gubuk', level: 1, capacity: 80 },
    rank: 'Petualang Pemula',
    inventory: [],
    skills: [],
    artifacts: [],
    fishingStats: { totalCatch: 0, fishCaught: {} },
    questProgress: {},
    activeQuestId: null,
    dungeonProgress: 0,
    lastStaminaRegen: Date.now(),
    lastDailyClaim: null,
    cooldowns: { fishing: 0, work: 0, dungeon: 0, loot: 0 },
    stats: {
      totalWork: 0,
      totalDungeon: 0,
      totalLoot: 0,
      weaponsBought: 0,
      skillsBought: 0,
      artefaksBought: 0,
      rupiahEarned: 0,
      diamondEarned: 0,
      levelUpsThisQuest: 0
    },
    hasLuckyAmulet: false,
    experiment: {
      selectedWeaponId: null,
      characterSlots:   new Array(6).fill(null),
      weaponSlots:      new Array(6).fill(null)
    },
    registeredAt: Date.now()
  };
}

class UserModel {
  static get(userId) {
    return db.getUser(String(userId));
  }

  static exists(userId) {
    return !!UserModel.get(userId);
  }

  static register(userId, telegramName) {
    const id = String(userId);
    if (UserModel.exists(id)) return UserModel.get(id);
    const user = createDefaultUser(telegramName);
    db.setUser(id, user);
    return user;
  }

  static save(userId, user) {
    // Ensure new fields exist on old user objects (migration shim)
    if (!user.skills)     user.skills     = [];
    if (!user.artifacts)  user.artifacts  = [];
    if (!user.cooldowns)  user.cooldowns  = {};
    if (user.cooldowns.loot === undefined) user.cooldowns.loot = 0;
    if (!user.stats)      user.stats      = {};
    if (user.stats.totalLoot    === undefined) user.stats.totalLoot    = 0;
    if (user.stats.skillsBought === undefined) user.stats.skillsBought = 0;
    if (user.stats.artefaksBought === undefined) user.stats.artefaksBought = 0;
    if (!user.experiment) user.experiment = {
      selectedWeaponId: null,
      characterSlots:   new Array(6).fill(null),
      weaponSlots:      new Array(6).fill(null)
    };

    // Migrate old house capacities to new values
    const capacityMap = { 1: 80, 2: 150, 3: 250, 4: 400, 5: 600 };
    if (user.house && user.house.level) {
      const expectedCap = capacityMap[user.house.level];
      if (expectedCap && user.house.capacity < expectedCap) {
        user.house.capacity = expectedCap;
      }
    }

    return db.setUser(String(userId), user);
  }

  static getAll() {
    return db.getUsers();
  }
}

module.exports = { UserModel, createDefaultUser };
