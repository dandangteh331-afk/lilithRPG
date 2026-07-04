const { UserModel } = require('../models/User');
const { assignRandomQuest } = require('../services/QuestService');
const { applyStaminaRegen } = require('../services/StaminaService');
const { log } = require('../services/Logger');
const { welcomeText, mainMenu, mainMenuText } = require('../views/Messages');

async function getUser(ctx) {
  const userId = ctx.from.id;
  let user = UserModel.get(userId);
  if (user) {
    user = applyStaminaRegen(user);
    UserModel.save(userId, user);
  }
  return user;
}

async function requireUser(ctx) {
  const user = await getUser(ctx);
  if (!user) {
    await ctx.reply('❌ Kamu belum terdaftar. Gunakan /start untuk mendaftar.');
    return null;
  }
  return user;
}

async function handleStart(ctx) {
  const userId = ctx.from.id;
  const name = ctx.from.first_name || 'Petualang';
  const exists = UserModel.exists(userId);
  let user = UserModel.register(userId, name);

  if (!exists) {
    user = assignRandomQuest(user);
    UserModel.save(userId, user);
    log(userId, 'register', { name });
  }

  user = applyStaminaRegen(user);
  UserModel.save(userId, user);

  const text = exists ? mainMenuText(user) : welcomeText(user.name, true);
  await ctx.replyWithHTML(text, mainMenu());
}

async function handleRegister(ctx) {
  await handleStart(ctx);
}

async function handleMenu(ctx) {
  const user = await requireUser(ctx);
  if (!user) return;
  await ctx.replyWithHTML(mainMenuText(user), mainMenu());
}

async function handleHelp(ctx) {
  const { helpText } = require('../views/Messages');
  await ctx.replyWithHTML(helpText(), mainMenu());
}

module.exports = {
  getUser,
  requireUser,
  handleStart,
  handleRegister,
  handleMenu,
  handleHelp
};
