const fs = require('fs');
const path = require('path');
const { LOGS_DIR } = require('../config/constants');

function getLogFile() {
  const date = new Date().toISOString().split('T')[0];
  return path.join(LOGS_DIR, `activity-${date}.log`);
}

function log(userId, action, details = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    userId,
    action,
    ...details
  };
  const line = JSON.stringify(entry) + '\n';
  try {
    fs.appendFileSync(getLogFile(), line, 'utf8');
  } catch (err) {
    console.error('Log error:', err.message);
  }
}

module.exports = { log };
