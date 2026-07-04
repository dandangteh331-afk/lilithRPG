const db = require('../models/Database');
const { UserModel } = require('../models/User');
const { requireUser } = require('./AuthController');
const { alchemyMenu } = require('../views/Keyboards');
const {
  countInventoryItem, removeInventoryItem, addInventoryItem, canAddToInventory
} = require('../utils/helpers');
const { log } = require('../services/Logger');
const { Markup } = require('telegraf');
const { backToMenu } = require('../views/Messages');

async function showAlchemy(ctx) {
  const user = await requireUser(ctx);
  if (!user) return;

  const text = `🧪 <b>Alkimia</b>\n\nCraft item dan upgrade senjata dengan bahan!`;

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...alchemyMenu() });
  } else {
    await ctx.replyWithHTML(text, alchemyMenu());
  }
}

async function showRecipes(ctx, page = 0) {
  const user = await requireUser(ctx);
  if (!user) return;

  const recipes = db.getCrafting().recipes || [];
  const recipe = recipes[page];
  if (!recipe) return;

  let ingredientsText = recipe.ingredients.map(ing => {
    const have = ing.name === user.weapon.name
      ? 1
      : countInventoryItem(user.inventory, ing.name);
    const check = have >= ing.qty ? '✅' : '❌';
    return `${check} ${ing.qty}x ${ing.name} (punya: ${have})`;
  }).join('\n');

  const text =
    `📜 <b>${recipe.result}</b> [${page + 1}/${recipes.length}]\n\n` +
    `Bahan:\n${ingredientsText}\n\n` +
    `Tipe: ${recipe.resultType}`;

  const nav = [];
  if (page > 0) nav.push(Markup.button.callback('◀️', `alchemy_recipes_${page - 1}`));
  nav.push(Markup.button.callback('🧪 Craft', `alchemy_craft_${page}`));
  if (page < recipes.length - 1) nav.push(Markup.button.callback('▶️', `alchemy_recipes_${page + 1}`));

  const kb = Markup.inlineKeyboard([nav, [Markup.button.callback('🔙 Alkimia', 'menu_alchemy')]]);

  await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
}

function canCraft(user, recipe) {
  for (const ing of recipe.ingredients) {
    if (ing.name === user.weapon.name) {
      if (recipe.resultType === 'weapon' && user.weapon.name === ing.name) continue;
      return false;
    }
    if (countInventoryItem(user.inventory, ing.name) < ing.qty) return false;
  }
  return true;
}

async function craft(ctx) {
  const userId = ctx.from.id;
  let user = await requireUser(ctx);
  if (!user) return;

  const page = parseInt(ctx.match[1], 10);
  const recipes = db.getCrafting().recipes || [];
  const recipe = recipes[page];
  if (!recipe) return;

  for (const ing of recipe.ingredients) {
    if (recipe.resultType === 'weapon' && ing.name === user.weapon.name) {
      if (user.weapon.name !== ing.name) {
        await ctx.answerCbQuery(`Butuh senjata: ${ing.name}`, { show_alert: true });
        return;
      }
      continue;
    }
    if (countInventoryItem(user.inventory, ing.name) < ing.qty) {
      await ctx.answerCbQuery(`Bahan kurang: ${ing.name}`, { show_alert: true });
      return;
    }
  }

  for (const ing of recipe.ingredients) {
    if (recipe.resultType === 'weapon' && ing.name === user.weapon.name) {
      continue;
    }
    const result = removeInventoryItem(user.inventory, ing.name, ing.qty);
    if (!result.success) {
      await ctx.answerCbQuery(`Bahan kurang: ${ing.name}`, { show_alert: true });
      return;
    }
    user.inventory = result.inventory;
  }

  if (recipe.resultType === 'weapon') {
    user.weapon = { name: recipe.result, attack: recipe.attack };
  } else {
    if (!canAddToInventory(user, 1)) {
      await ctx.answerCbQuery('🎒 Inventory penuh!', { show_alert: true });
      return;
    }
    user.inventory = addInventoryItem(user.inventory, recipe.result, 1, 'item');
  }

  UserModel.save(userId, user);
  log(userId, 'craft', { result: recipe.result });

  const text = recipe.resultType === 'weapon'
    ? `✅ Craft berhasil!\n⚔️ <b>${recipe.result}</b> (+${recipe.attack} attack)`
    : `✅ Craft berhasil!\n🧪 <b>${recipe.result}</b> ditambahkan ke inventory`;

  await ctx.answerCbQuery('Craft berhasil!');
  await ctx.editMessageText(text, { parse_mode: 'HTML', ...backToMenu() });
}

async function showCraftMenu(ctx) {
  await showRecipes(ctx, 0);
}

module.exports = { showAlchemy, showRecipes, craft, showCraftMenu };
