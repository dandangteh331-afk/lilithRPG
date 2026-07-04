const fs = require('fs');
const path = require('path');
const { DATA_DIR, LOGS_DIR } = require('../config/constants');

class Database {
  constructor() {
    this.cache = {};
    this.ensureDirs();
  }

  ensureDirs() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
  }

  getPath(filename) {
    return path.join(DATA_DIR, filename);
  }

  load(filename, defaultValue = {}) {
    if (this.cache[filename]) return this.cache[filename];
    const filePath = this.getPath(filename);
    try {
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        this.cache[filename] = data;
        return data;
      }
    } catch (err) {
      console.error(`Error loading ${filename}:`, err.message);
    }
    this.cache[filename] = defaultValue;
    return defaultValue;
  }

  save(filename, data) {
    const filePath = this.getPath(filename);
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      this.cache[filename] = data;
      return true;
    } catch (err) {
      console.error(`Error saving ${filename}:`, err.message);
      return false;
    }
  }

  getUsers() {
    return this.load('users.json', {});
  }

  saveUsers(users) {
    return this.save('users.json', users);
  }

  getUser(userId) {
    const users = this.getUsers();
    return users[userId] || null;
  }

  setUser(userId, userData) {
    const users = this.getUsers();
    users[userId] = userData;
    return this.saveUsers(users);
  }

  getShop() {
    return this.load('shop.json');
  }

  getFish() {
    return this.load('fish.json');
  }

  getDungeon() {
    return this.load('dungeon.json');
  }

  getRanks() {
    return this.load('rank.json');
  }

  getCrafting() {
    return this.load('crafting.json');
  }

  getQuests() {
    return this.load('quests.json');
  }
}

module.exports = new Database();
