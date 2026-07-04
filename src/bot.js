require('dotenv').config();
const { Telegraf } = require('telegraf');

const { handleStart, handleRegister, handleMenu, handleHelp, getUser } = require('./controllers/AuthController');
const { showProfile, startEditName, startEditAvatar, setAvatar, handleTextInput, showInventory } = require('./controllers/ProfileController');
const { showFishingMenu, castLine, showFishingStats } = require('./controllers/FishingController');
const { showWorkMenu, doWork } = require('./controllers/WorkController');
const {
  showShop,
  showWeapons,
  showItems,
  showCategory,
  showCategoryWeapon,
  showSellMenu,
  sellItem,
  initiateBuyWeapon,
  initiateBuyItem,
  initiateBuyCategoryItem,
  confirmCategoryPurchase,
  confirmWeaponPurchase,
  confirmPurchase
} = require('./controllers/ShopController');
const { showDungeon, enterFloor } = require('./controllers/DungeonController');
const { showQuestMenu, showActiveQuest, newQuest, claimQuest, listQuests } = require('./controllers/QuestController');
const { showHouse, showUpgrade, confirmUpgrade, showHouseInfo } = require('./controllers/HouseController');
const { showAlchemy, showRecipes, craft, showCraftMenu } = require('./controllers/AlchemyController');
const { showRank } = require('./controllers/RankController');
const { showStamina, usePotion, showWeapon } = require('./controllers/StaminaController');
const { showLeaderboard, claimDaily } = require('./controllers/LeaderboardController');
const { showLootMenu, doLoot } = require('./controllers/LootController');
const { mainMenu, mainMenuText } = require('./views/Messages');

function createBot() {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error('BOT_TOKEN tidak ditemukan di .env');

  const bot = new Telegraf(token);

  bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply('❌ Terjadi kesalahan. Coba lagi.').catch(() => {});
  });

  // ─── Commands ───────────────────────────────────────────────────────────────
  bot.command('start',    handleStart);
  bot.command('register', handleRegister);
  bot.command('profile',  showProfile);
  bot.command('menu',     handleMenu);
  bot.command('help',     handleHelp);
  bot.command('daily',    claimDaily);

  bot.on('text', async (ctx) => {
    const handled = await handleTextInput(ctx);
    if (!handled && ctx.message.text.startsWith('/')) {
      await ctx.reply('❓ Command tidak dikenal. Gunakan /help');
    }
  });

  // ─── Utility ─────────────────────────────────────────────────────────────────
  bot.action('noop', (ctx) => ctx.answerCbQuery());

  // ─── Main menu ───────────────────────────────────────────────────────────────
  bot.action('menu_main', async (ctx) => {
    await ctx.answerCbQuery();
    const { UserModel } = require('./models/User');
    const user = UserModel.get(ctx.from.id);
    await ctx.editMessageText(mainMenuText(user), { parse_mode: 'HTML', ...mainMenu() });
  });

  // ─── Top-level menu entries ───────────────────────────────────────────────────
  bot.action('menu_profile',     async (ctx) => { await ctx.answerCbQuery(); await showProfile(ctx); });
  bot.action('menu_fishing',     async (ctx) => { await ctx.answerCbQuery(); await showFishingMenu(ctx); });
  bot.action('menu_work',        async (ctx) => { await ctx.answerCbQuery(); await showWorkMenu(ctx); });
  bot.action('menu_quest',       async (ctx) => { await ctx.answerCbQuery(); await showQuestMenu(ctx); });
  bot.action('menu_dungeon',     async (ctx) => { await ctx.answerCbQuery(); await showDungeon(ctx); });
  bot.action('menu_shop',        async (ctx) => { await ctx.answerCbQuery(); await showShop(ctx); });
  bot.action('menu_house',       async (ctx) => { await ctx.answerCbQuery(); await showHouse(ctx); });
  bot.action('menu_weapon',      async (ctx) => { await ctx.answerCbQuery(); await showWeapon(ctx); });
  bot.action('menu_alchemy',     async (ctx) => { await ctx.answerCbQuery(); await showAlchemy(ctx); });
  bot.action('menu_rank',        async (ctx) => { await ctx.answerCbQuery(); await showRank(ctx); });
  bot.action('menu_stamina',     async (ctx) => { await ctx.answerCbQuery(); await showStamina(ctx); });
  bot.action('menu_leaderboard', async (ctx) => { await ctx.answerCbQuery(); await showLeaderboard(ctx); });
  bot.action('menu_daily',       async (ctx) => { await ctx.answerCbQuery(); await claimDaily(ctx); });
  bot.action('menu_help',        async (ctx) => { await ctx.answerCbQuery(); await handleHelp(ctx); });
  bot.action('menu_loot',        async (ctx) => { await ctx.answerCbQuery(); await showLootMenu(ctx); });

  // ─── Profile ─────────────────────────────────────────────────────────────────
  bot.action('profile_edit_name',   startEditName);
  bot.action('profile_edit_avatar', startEditAvatar);
  bot.action(/^profile_avatar_(\d+)$/, setAvatar);
  bot.action('profile_inventory', async (ctx) => { await ctx.answerCbQuery(); await showInventory(ctx); });
  bot.action(/^inv_page_(\d+)$/,  async (ctx) => { await ctx.answerCbQuery(); await showInventory(ctx, parseInt(ctx.match[1])); });

  // ─── Fishing ─────────────────────────────────────────────────────────────────
  bot.action('fishing_cast',  castLine);
  bot.action('fishing_stats', showFishingStats);

  // ─── Looting ─────────────────────────────────────────────────────────────────
  bot.action('loot_do', doLoot);

  // ─── Work ─────────────────────────────────────────────────────────────────────
  bot.action(/^work_do_(\d+)$/, doWork);

  // ─── Shop: category navigation ───────────────────────────────────────────────
  // Weapon category (uses its own dedicated handler)
  bot.action(/^shop_cat_weapon_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    await showCategoryWeapon(ctx, parseInt(ctx.match[1]));
  });

  // Other 4 categories: ramuan, batu_sihir, skill, artefak
  bot.action(/^shop_cat_(ramuan|batu_sihir|skill|artefak)_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    await showCategory(ctx, ctx.match[1], parseInt(ctx.match[2]));
  });

  // ─── Shop: buy weapon ─────────────────────────────────────────────────────────
  bot.action(/^shop_buy_weapon_(\d+)_(diamond|rupiah)$/,     initiateBuyWeapon);
  bot.action(/^shop_confirm_weapon_(\d+)_(diamond|rupiah)$/, confirmWeaponPurchase);

  // ─── Shop: buy category items (ramuan / batu_sihir / skill / artefak) ─────────
  bot.action(/^shop_buy_cat_(ramuan|batu_sihir|skill|artefak)_(\d+)_(diamond|rupiah)$/, initiateBuyCategoryItem);
  bot.action(/^shop_confirm_cat_(ramuan|batu_sihir|skill|artefak)_(\d+)_(diamond|rupiah)$/, confirmCategoryPurchase);

  // ─── Shop: sell inventory ─────────────────────────────────────────────────────
  bot.action(/^shop_sell_menu_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    await showSellMenu(ctx, parseInt(ctx.match[1]));
  });
  bot.action(/^shop_sell_item_(\d+)_(\d+)$/, sellItem);

  // ─── Shop: legacy item actions (kept for backward compat) ─────────────────────
  bot.action(/^shop_weapons_(\d+)$/,                          async (ctx) => { await ctx.answerCbQuery(); await showWeapons(ctx, parseInt(ctx.match[1])); });
  bot.action(/^shop_items_(\d+)$/,                            async (ctx) => { await ctx.answerCbQuery(); await showItems(ctx, parseInt(ctx.match[1])); });
  bot.action(/^shop_buy_item_(\d+)_(diamond|rupiah)$/,        initiateBuyItem);
  bot.action(/^shop_confirm_item_(\d+)_(diamond|rupiah)$/,    confirmPurchase);

  // ─── Dungeon ──────────────────────────────────────────────────────────────────
  bot.action(/^dungeon_enter_(\d+)$/, enterFloor);

  // ─── Quest ────────────────────────────────────────────────────────────────────
  bot.action('quest_active', showActiveQuest);
  bot.action('quest_new',    newQuest);
  bot.action('quest_claim',  claimQuest);
  bot.action(/^quest_list_(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); await listQuests(ctx, parseInt(ctx.match[1])); });

  // ─── House ────────────────────────────────────────────────────────────────────
  bot.action('house_upgrade',         showUpgrade);
  bot.action(/^house_confirm_(\d+)$/, confirmUpgrade);
  bot.action('house_info',            showHouseInfo);

  // ─── Alchemy ──────────────────────────────────────────────────────────────────
  bot.action(/^alchemy_recipes_(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); await showRecipes(ctx, parseInt(ctx.match[1])); });
  bot.action('alchemy_craft_menu',      async (ctx) => { await ctx.answerCbQuery(); await showCraftMenu(ctx); });
  bot.action(/^alchemy_craft_(\d+)$/,   craft);

  // ─── Stamina ──────────────────────────────────────────────────────────────────
  bot.action('stamina_use_potion', async (ctx) => { await ctx.answerCbQuery(); await usePotion(ctx, 'potion'); });
  bot.action('stamina_use_elixir', async (ctx) => { await ctx.answerCbQuery(); await usePotion(ctx, 'elixir'); });

  // ─── Weapon info ──────────────────────────────────────────────────────────────
  bot.action('weapon_info', async (ctx) => { await ctx.answerCbQuery(); await showWeapon(ctx); });

  return bot;
}

module.exports = { createBot };
