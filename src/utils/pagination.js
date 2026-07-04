const { Markup } = require('telegraf');

function paginate(items, page, perPage, prefix, labelFn) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * perPage;
  const pageItems = items.slice(start, start + perPage);

  const buttons = pageItems.map((item, i) => {
    const idx = start + i;
    return [Markup.button.callback(labelFn(item, idx), `${prefix}_${idx}`)];
  });

  const nav = [];
  if (currentPage > 1) nav.push(Markup.button.callback('◀️ Prev', `${prefix}_page_${currentPage - 1}`));
  nav.push(Markup.button.callback(`${currentPage}/${totalPages}`, 'noop'));
  if (currentPage < totalPages) nav.push(Markup.button.callback('Next ▶️', `${prefix}_page_${currentPage + 1}`));

  if (totalPages > 1) buttons.push(nav);
  return { buttons, currentPage, totalPages, pageItems };
}

module.exports = { paginate };
