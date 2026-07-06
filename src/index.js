const { createBot } = require('./bot');

// ─── Terminal colors (no deps needed) ────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  cyan:   '\x1b[36m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  gray:   '\x1b[90m',
  blue:   '\x1b[34m',
  magenta:'\x1b[35m'
};

function colorize(color, text) {
  return `${color}${text}${C.reset}`;
}

function timestamp() {
  return colorize(C.gray, new Date().toLocaleString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }));
}

function printBanner() {
  const line = colorize(C.cyan, '═'.repeat(44));
  console.log('');
  console.log(line);
  console.log(colorize(C.bold + C.cyan, '   ⚔️  RPG Fantasy Bot  ⚔️'));
  console.log(colorize(C.dim,  '   Telegram RPG Game Engine'));
  console.log(line);
  console.log('');
}

function printStatus(label, value, color = C.green) {
  const pad = ' '.repeat(Math.max(0, 14 - label.length));
  console.log(`  ${colorize(C.gray, '›')} ${colorize(C.bold, label)}${pad}${colorize(color, value)}`);
}

function printSeparator() {
  console.log(colorize(C.gray, '  ' + '─'.repeat(40)));
}

// ─── Error formatter ─────────────────────────────────────────────────────────
function formatError(err) {
  const lines = [];
  lines.push(colorize(C.red + C.bold, '  [ERROR] ' + (err.message || String(err))));
  if (err.stack) {
    const stack = err.stack
      .split('\n')
      .slice(1)        // skip the first "Error: ..." line (already shown)
      .slice(0, 6)     // cap at 6 frames
      .map(l => colorize(C.gray, '    ' + l.trim()))
      .join('\n');
    lines.push(stack);
  }
  return lines.join('\n');
}

// ─── Errors yang aman diabaikan (bukan bug) ───────────────────────────────────
const IGNORED_ERRORS = [
  'message is not modified',   // user klik tombol sama 2x
  'query is too old',          // callback query kadaluarsa
  'message to edit not found', // pesan sudah dihapus
  'bot was blocked by the user'
];

function isIgnoredError(err) {
  const msg = err?.message || String(err);
  return IGNORED_ERRORS.some(pattern => msg.includes(pattern));
}

// ─── Override bot.catch for pretty error display ─────────────────────────────
function wrapBotErrors(bot) {
  bot.catch((err, ctx) => {
    // Abaikan error yang bukan bug
    if (isIgnoredError(err)) {
      ctx?.answerCbQuery().catch(() => {});
      return;
    }

    const who    = ctx?.from
      ? `user ${ctx.from.id} (@${ctx.from.username || ctx.from.first_name})`
      : 'unknown context';
    const action = ctx?.callbackQuery?.data || ctx?.message?.text || '?';

    console.log('');
    console.log(`${timestamp()} ${colorize(C.red + C.bold, '⚠  Bot Error')}`);
    console.log(`  ${colorize(C.gray, 'From  :')} ${colorize(C.yellow, who)}`);
    console.log(`  ${colorize(C.gray, 'Action:')} ${colorize(C.yellow, action)}`);
    console.log(formatError(err));
    console.log('');
    ctx?.reply('❌ Terjadi kesalahan. Coba lagi.').catch(() => {});
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  printBanner();

  let bot;
  try {
    bot = createBot();
    wrapBotErrors(bot);
    await bot.launch();
  } catch (err) {
    console.log(colorize(C.red + C.bold, '  ✗ Gagal menjalankan bot:'));
    console.log(formatError(err));
    console.log('');
    process.exit(1);
  }

  const { BOT_TOKEN } = process.env;
  const tokenPreview  = BOT_TOKEN ? BOT_TOKEN.slice(0, 10) + '...' : 'tidak ada';

  printStatus('Status',    '● Running', C.green);
  printStatus('Bot Token', tokenPreview, C.dim + C.gray);
  printStatus('Waktu',     new Date().toLocaleString('id-ID'), C.cyan);
  printStatus('Node.js',   process.version, C.blue);
  printStatus('PID',       String(process.pid), C.magenta);
  printSeparator();
  console.log(colorize(C.gray, '  Ctrl+C untuk menghentikan bot.'));
  console.log('');

  // Live log helper — bisa dipakai dari mana saja via global.botLog
  global.botLog = (level, msg, data) => {
    const icons = { info: '●', warn: '▲', error: '✗', action: '→' };
    const colors = { info: C.cyan, warn: C.yellow, error: C.red, action: C.green };
    const icon  = icons[level]  || '●';
    const color = colors[level] || C.reset;
    const extra = data ? colorize(C.gray, '  ' + JSON.stringify(data)) : '';
    console.log(`${timestamp()} ${colorize(color + C.bold, icon)} ${msg}${extra}`);
  };

  process.once('SIGINT',  () => shutdown(bot, 'SIGINT'));
  process.once('SIGTERM', () => shutdown(bot, 'SIGTERM'));
}

function shutdown(bot, signal) {
  console.log('');
  console.log(`${timestamp()} ${colorize(C.yellow + C.bold, `⏹  Menerima ${signal}, menghentikan bot...`)}`);
  bot.stop(signal);
  console.log(colorize(C.gray, '  Bot dihentikan. Sampai jumpa!'));
  console.log('');
  process.exit(0);
}

main();
