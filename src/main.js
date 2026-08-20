import './styles.css';
import { platform } from './platform.js';
import { LEVELS, MILESTONES, PRODUCT_TEMPLATES, TIER_UNLOCKS, UPGRADES } from './data.js';
import {
  applyUpgrade,
  canApplyUpgrade,
  createInitialState,
  decideBuyer,
  decideSeller,
  generateBuyerOffer,
  generateListings,
  getCapital,
  getItemValue,
  getLevel,
  getPeakProgress,
  getUnlockedTier,
  getUpgradeCost,
  getUpgradeLockReason,
  migrateState,
  roundPrice,
  uid,
} from './gameEngine.js';

const app = document.querySelector('#app');
const money = (value) => `${Math.round(value).toLocaleString('ru-RU')} ₽`;
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const unlockRequirement = (unlock) => `${money(unlock.capital)} · ${unlock.deals} ${unlock.deals % 10 === 1 && unlock.deals % 100 !== 11 ? 'сделка' : unlock.deals % 10 >= 2 && unlock.deals % 10 <= 4 && (unlock.deals % 100 < 10 || unlock.deals % 100 >= 20) ? 'сделки' : 'сделок'}`;

let state = migrateState(platform.load());
let activeTab = 'feed';
let modal = state.tutorial.started ? null : { type: 'welcome' };
let toastTimer;

function syncState() {
  state.maxCapital = Math.max(state.maxCapital || 500, getCapital(state));
  state.maxUnlockedTier = Math.max(state.maxUnlockedTier || 0, getUnlockedTier(state));
  platform.save(state);
}

function commit(shouldRender = true) {
  syncState();
  if (shouldRender) render();
}

function showToast(message, tone = '') {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast show ${tone}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.className = 'toast', 2200);
}

function animateMoney(amount) {
  const floater = document.createElement('div');
  floater.className = `money-float ${amount >= 0 ? 'gain' : 'loss'}`;
  floater.textContent = `${amount >= 0 ? '+' : '−'}${money(Math.abs(amount))}`;
  document.body.append(floater);
  setTimeout(() => floater.remove(), 1500);
}

function renderTopbar() {
  const capital = getCapital(state);
  const percentage = Math.min(100, capital / 1000000 * 100);
  return `
    <header class="topbar">
      <button class="brand" data-action="nav" data-tab="profile" aria-label="Открыть профиль">
        <span class="brand-mark">₽</span>
        <span><small>ПЕРЕКУП</small><b>${getLevel(state).name}</b></span>
      </button>
      <div class="balance-box">
        <span>Баланс</span>
        <strong>${money(state.cash)}</strong>
      </div>
    </header>
    <div class="million-line" aria-label="Прогресс до миллиона"><span style="width:${Math.max(.5, percentage)}%"></span></div>
  `;
}

function listingCard(item) {
  const expert = item.expertKnown ? `<span class="market-hint">рынок ≈ ${money(item.marketValue)}</span>` : '';
  return `
    <button class="listing-card ${item.urgent ? 'is-urgent' : ''}" data-action="open-listing" data-id="${item.id}">
      <div class="listing-visual tone-${item.templateId.length % 4}">
        ${item.urgent ? `<span class="urgent">СРОЧНО · <i data-countdown="${item.expiresAt}">...</i></span>` : ''}
        <span class="product-emoji">${item.emoji}</span>
        <span class="category-chip">${escapeHtml(item.category)}</span>
      </div>
      <div class="listing-copy">
        <div class="card-meta"><span class="condition ${item.conditionClass}">${item.condition}</span>${expert}</div>
        <h2>${escapeHtml(item.name)}</h2>
        <strong>${money(item.price)}</strong>
        <small>${item.postedMinutes} мин назад · ${escapeHtml(item.seller)}</small>
      </div>
    </button>
  `;
}

const LOCKED_SHOWCASE_IDS = ['phone-camera', 'console-bundle', 'tablet-pro', 'laptop-gaming', 'drone-camera'];

function renderLockedDeals(unlockedTier) {
  const lockedItems = LOCKED_SHOWCASE_IDS
    .map((id) => PRODUCT_TEMPLATES.find((item) => item.id === id))
    .filter((item) => item && item.tier > unlockedTier);
  if (!lockedItems.length) return '';

  return `
    <section class="locked-showcase">
      <div class="locked-showcase-head">
        <div><span class="eyebrow">ВПЕРЕДИ — БОЛЬШИЕ ДЕНЬГИ</span><h2>Будущие сделки</h2><p>Наращивай капитал, чтобы перейти от мелких находок к серьёзной технике.</p></div>
        <span class="vault-mark">🔐</span>
      </div>
      <div class="locked-deals-grid">
        ${lockedItems.map((item) => {
          const unlock = TIER_UNLOCKS.find((candidate) => candidate.tier === item.tier);
          return `<button class="locked-deal-card locked-tone-${item.tier}" data-action="locked-teaser" data-tier="${item.tier}">
            <span class="locked-price">рынок ≈ ${money(item.base)}</span>
            <span class="locked-product">${item.emoji}</span>
            <span class="lock-seal">🔒</span>
            <span class="locked-category">${escapeHtml(item.category)}</span>
            <b>${escapeHtml(item.name)}</b>
            <small>Откроется: ${unlockRequirement(unlock)}</small>
          </button>`;
        }).join('')}
      </div>
    </section>
  `;
}

function renderFeed() {
  const unlockedTier = getUnlockedTier(state);
  const categories = [...new Set(state.listings.map((item) => item.category))];
  return `
    <section class="feed-hero">
      <div>
        <span class="eyebrow">ЦЕЛЬ: 1 000 000 ₽</span>
        <h1>Охоться за выгодой.</h1>
        <p>Смотри на состояние, торгуйся и не забывай про риск скрытых дефектов.</p>
      </div>
      <div class="capital-orbit"><small>Капитал</small><b>${money(getCapital(state))}</b><span>${(getCapital(state) / 1000000 * 100).toFixed(2).replace('.', ',')}%</span></div>
    </section>
    <div class="reward-row" aria-label="Бонусные действия">
      <button class="reward-chip" data-action="reward" data-kind="urgent"><span>⚡</span> Найти срочное</button>
      <button class="reward-chip" data-action="reward" data-kind="refresh"><span>↻</span> Обновить ленту</button>
    </div>
    <section class="section-head">
      <div><span class="live-dot"></span><span>Свежие объявления</span><em>${state.listings.length}</em></div>
      <span class="tier-label">Категорий: ${categories.length}</span>
    </section>
    <section class="listing-grid">
      ${state.listings.length ? state.listings.map(listingCard).join('') : `
        <div class="empty-state wide"><span>🕵️</span><h2>Всё разобрали</h2><p>Обнови ленту и найди новую сделку.</p><button class="primary-button" data-action="reward" data-kind="refresh">Обновить объявления</button></div>
      `}
    </section>
    ${unlockedTier < 5 ? `<div class="unlock-note"><span>🔒</span><div><b>Следующая категория</b><p>${TIER_UNLOCKS[unlockedTier + 1].label} — ${unlockRequirement(TIER_UNLOCKS[unlockedTier + 1])}</p></div></div>` : ''}
    ${renderLockedDeals(unlockedTier)}
  `;
}

function inventoryCard(item) {
  const value = getItemValue(item);
  const profitHint = value - item.purchasePrice - item.expenses;
  return `
    <article class="inventory-card ${item.status === 'listed' ? 'listed' : ''}">
      <button class="inventory-main" data-action="open-item" data-id="${item.id}">
        <span class="inventory-emoji">${item.emoji}</span>
        <span class="inventory-copy"><span class="status-tag">${item.status === 'listed' ? 'НА ПРОДАЖЕ' : 'В НАЛИЧИИ'}</span><b>${escapeHtml(item.name)}</b><small>${item.condition} · куплен за ${money(item.purchasePrice)}</small></span>
        <span class="value-stack"><small>Потенциал</small><b>${money(value)}</b><em class="${profitHint >= 0 ? 'positive' : 'negative'}">${profitHint >= 0 ? '+' : ''}${money(profitHint)}</em></span>
      </button>
      ${item.status === 'listed' ? `<div class="listed-strip"><span>Цена: <b>${money(item.listPrice)}</b></span><span>${state.offers.some((offer) => offer.itemId === item.id && offer.status === 'active') ? 'Есть предложение' : 'Ищем покупателя…'}</span></div>` : `<div class="inventory-actions"><button class="soft-button" data-action="open-item" data-id="${item.id}">Улучшить</button><button class="primary-button compact" data-action="open-list" data-id="${item.id}">Продать</button></div>`}
    </article>
  `;
}

function renderInventory() {
  const ownedValue = state.inventory.reduce((sum, item) => sum + getItemValue(item), 0);
  return `
    <section class="page-title"><div><span class="eyebrow">ТВОЙ СКЛАД</span><h1>Мои товары</h1><p>${state.inventory.length ? 'Улучшай вещи и выставляй их по разумной цене.' : 'Купи первую вещь в объявлениях — она появится здесь.'}</p></div><div class="mini-stat"><span>Стоимость</span><b>${money(ownedValue)}</b></div></section>
    <section class="inventory-list">${state.inventory.length ? state.inventory.map(inventoryCard).join('') : `<div class="empty-state"><span>📦</span><h2>Пока пусто</h2><p>Хорошая сделка уже ждёт в ленте.</p><button class="primary-button" data-action="nav" data-tab="feed">Искать товар</button></div>`}</section>
    ${state.inventory.some((item) => item.status === 'listed') ? `<button class="wide-reward" data-action="reward" data-kind="fast"><span>⚡</span><span><b>Быстрее найти покупателя</b><small>Тест rewarded-механики</small></span></button>` : ''}
  `;
}

function offerCard(offer) {
  const item = state.inventory.find((candidate) => candidate.id === offer.itemId);
  if (!item) return '';
  const age = Math.max(1, Math.round((Date.now() - offer.createdAt) / 60000));
  return `
    <article class="offer-card">
      <div class="buyer-line"><span class="buyer-avatar">${offer.avatar}</span><div><b>${escapeHtml(offer.buyerName)}</b><small>${escapeHtml(offer.buyerTitle)} · ${age} мин</small></div><span class="online-dot"></span></div>
      <div class="offer-product"><span>${item.emoji}</span><div><small>${escapeHtml(item.name)}</small><b>Выставлено за ${money(item.listPrice)}</b></div></div>
      <div class="message-bubble">${escapeHtml(offer.text)}</div>
      <div class="offer-price"><span>Предлагает</span><strong>${money(offer.amount)}</strong></div>
      <div class="offer-actions"><button class="ghost-button danger" data-action="decline-offer" data-id="${offer.id}">Отказать</button><button class="soft-button" data-action="counter-offer" data-id="${offer.id}">Встречная</button><button class="primary-button compact" data-action="accept-offer" data-id="${offer.id}">Принять</button></div>
    </article>
  `;
}

function renderMessages() {
  const activeOffers = state.offers.filter((offer) => offer.status === 'active');
  const listed = state.inventory.filter((item) => item.status === 'listed');
  const hadOffers = listed.some((item) => state.offers.some((offer) => offer.itemId === item.id));
  return `
    <section class="page-title"><div><span class="eyebrow">ПОКУПАТЕЛИ</span><h1>Сообщения</h1><p>Не хватай первое предложение — иногда встречная цена выгоднее.</p></div><div class="mini-stat accent"><span>Новых</span><b>${activeOffers.length}</b></div></section>
    <section class="offer-list">${activeOffers.length ? activeOffers.map(offerCard).join('') : `<div class="empty-state"><span>${listed.length ? '⏳' : '💬'}</span><h2>${listed.length ? (hadOffers ? 'Ищем следующего покупателя' : 'Покупатели уже смотрят') : 'Сообщений пока нет'}</h2><p>${listed.length ? `${hadOffers ? 'Следующее' : 'Первое'} предложение придёт через несколько секунд.` : 'Выстави товар, чтобы начать получать предложения.'}</p>${listed.length ? `<button class="primary-button" data-action="reward" data-kind="fast">Ускорить поиск</button>` : `<button class="primary-button" data-action="nav" data-tab="inventory">К моим товарам</button>`}</div>`}</section>
    ${state.offers.some((offer) => offer.status !== 'active') ? `<div class="history-note">Завершённых диалогов: ${state.offers.filter((offer) => offer.status !== 'active').length}</div>` : ''}
  `;
}

function progressMilestones() {
  const capital = getCapital(state);
  return MILESTONES.map((milestone, index) => {
    const reached = capital >= milestone;
    const current = !reached && (index === 0 || capital >= MILESTONES[index - 1]);
    return `<div class="milestone ${reached ? 'reached' : ''} ${current ? 'current' : ''}"><span>${reached ? '✓' : index + 1}</span><b>${milestone === 1000000 ? 'Миллион' : money(milestone)}</b></div>`;
  }).join('');
}

function renderProfile() {
  const capital = getCapital(state);
  const level = getLevel(state);
  const nextLevel = LEVELS.find((candidate) => candidate.min > getPeakProgress(state));
  const inventoryValue = state.inventory.reduce((sum, item) => sum + getItemValue(item), 0);
  const nextUnlock = TIER_UNLOCKS.find((unlock) => unlock.tier > getUnlockedTier(state));
  const lastSales = state.saleHistory.slice(0, 3);
  return `
    <section class="profile-hero"><div class="rank-orb">${level.emoji}</div><div><span class="eyebrow">УРОВЕНЬ ПЕРЕКУПА</span><h1>${level.name}</h1><p>${nextLevel ? `До уровня «${nextLevel.name}»: ${money(Math.max(0, nextLevel.min - getPeakProgress(state)))}` : 'Ты прошёл путь до вершины рынка.'}</p></div></section>
    <section class="stats-grid"><article class="stat-card hero-stat"><span>Общий капитал</span><b>${money(capital)}</b><small>Баланс + стоимость товаров</small></article><article class="stat-card"><span>Баланс</span><b>${money(state.cash)}</b></article><article class="stat-card"><span>В товарах</span><b>${money(inventoryValue)}</b></article><article class="stat-card"><span>Заработано</span><b>${money(state.earned)}</b></article><article class="stat-card"><span>Сделок</span><b>${state.stats.deals}</b></article><article class="stat-card"><span>Лучшая сделка</span><b>${money(state.stats.bestProfit)}</b></article></section>
    <section class="progress-card"><div class="section-head"><div><span>Путь до миллиона</span></div><b>${(capital / 1000000 * 100).toFixed(2).replace('.', ',')}%</b></div><div class="milestone-track">${progressMilestones()}</div></section>
    <section class="unlock-card"><span class="unlock-icon">${nextUnlock ? '🔓' : '🏆'}</span><div><span class="eyebrow">${nextUnlock ? 'СЛЕДУЮЩЕЕ ОТКРЫТИЕ' : 'ВСЁ ОТКРЫТО'}</span><b>${nextUnlock ? nextUnlock.label : 'Доступны все категории'}</b>${nextUnlock ? `<small>Нужно: ${unlockRequirement(nextUnlock)}</small>` : ''}</div></section>
    ${lastSales.length ? `<section class="recent-sales"><h2>Последние сделки</h2>${lastSales.map((sale) => `<div><span>${sale.emoji} ${escapeHtml(sale.name)}</span><b class="${sale.profit >= 0 ? 'positive' : 'negative'}">${sale.profit >= 0 ? '+' : ''}${money(sale.profit)}</b></div>`).join('')}</section>` : ''}
    <button class="reset-link" data-action="confirm-reset">Начать игру заново</button>
  `;
}

function navBar() {
  const offersCount = state.offers.filter((offer) => offer.status === 'active').length;
  const tabs = [['feed', '⌂', 'Объявления'], ['inventory', '▣', 'Мои товары'], ['messages', '●', 'Сообщения'], ['profile', '♟', 'Профиль']];
  return `<nav class="tabbar" aria-label="Разделы игры">${tabs.map(([id, icon, label]) => `<button class="${activeTab === id ? 'active' : ''} ${state.tutorial.step === 3 && id === 'inventory' ? 'coach-pulse' : ''} ${state.tutorial.step === 4 && id === 'messages' ? 'coach-pulse' : ''}" data-action="nav" data-tab="${id}"><span>${icon}</span><b>${label}</b>${id === 'messages' && offersCount ? `<i>${offersCount}</i>` : ''}</button>`).join('')}</nav>`;
}

function coachBanner() {
  if (!state.tutorial.started || state.tutorial.complete) return '';
  const steps = {
    1: ['Шаг 1 из 4', 'Открой выгодное объявление', 'Начни с карточки «СРОЧНО» — там хорошая цена.'],
    2: ['Шаг 2 из 4', 'Попробуй сбить цену', 'Предложи продавцу свою цену или купи сразу.'],
    3: ['Шаг 3 из 4', 'Подготовь товар', 'Открой «Мои товары», улучши вещь и выстави её.'],
    4: ['Шаг 4 из 4', 'Дождись покупателя', 'Следи за сообщениями и закрой первую продажу.'],
  };
  const content = steps[state.tutorial.step];
  return content ? `<aside class="coach-banner"><span class="coach-icon">☝️</span><div><small>${content[0]}</small><b>${content[1]}</b><p>${content[2]}</p></div><button data-action="skip-tutorial" aria-label="Пропустить обучение">×</button></aside>` : '';
}

function renderListingModal(item) {
  const initialOffer = roundPrice(item.price * 0.82);
  const messages = modal.chat || [];
  return `
    <div class="modal-backdrop"><section class="modal-card deal-modal" role="dialog" aria-modal="true" aria-label="Объявление ${escapeHtml(item.name)}">
      <button class="modal-close" data-action="close-modal" aria-label="Закрыть">×</button>
      <div class="deal-product tone-${item.templateId.length % 4}">${item.urgent ? `<span class="urgent">СРОЧНО · <i data-countdown="${item.expiresAt}">...</i></span>` : ''}<span>${item.emoji}</span></div>
      <div class="deal-body"><span class="condition ${item.conditionClass}">${item.condition}</span><h2>${escapeHtml(item.name)}</h2><div class="deal-price"><strong>${money(item.price)}</strong><small>Цена продавца</small></div><p class="description">${escapeHtml(item.description)}</p>
        <div class="seller-row"><span>${item.seller.charAt(0)}</span><div><b>${escapeHtml(item.seller)}</b><small>Продавец · был недавно</small></div></div>
        <div class="knowledge-grid">
          <button data-action="reward" data-kind="expert" data-id="${item.id}" class="knowledge-button ${item.expertKnown ? 'known' : ''}"><span>💡</span><div><b>${item.expertKnown ? `Рынок: ${money(item.marketValue)}` : 'Узнать цену рынка'}</b><small>${item.expertKnown ? `Возможная маржа: ${money(item.marketValue - item.price)}` : 'Экспертная оценка · бонус'}</small></div></button>
          <button data-action="reward" data-kind="inspect" data-id="${item.id}" class="knowledge-button ${item.inspected ? 'known' : ''}"><span>🔍</span><div><b>${item.inspected ? (item.latentDefect ? `Найдено: ${item.latentDefect.label}` : 'Дефектов нет') : 'Проверить товар'}</b><small>${item.inspected ? 'Проверка завершена' : 'Скрытые дефекты · бонус'}</small></div></button>
        </div>
        ${messages.length ? `<div class="trade-chat">${messages.map((message) => `<div class="chat-message ${message.from}">${escapeHtml(message.text)}</div>`).join('')}</div>` : ''}
        ${modal.sellerAgreed ? `<div class="deal-agreed"><span>${modal.sellerDecision === 'counter' ? '💬' : '🤝'}</span><div><b>${modal.sellerDecision === 'counter' ? 'Встречная цена продавца' : 'Продавец согласился'}</b><small>${modal.sellerDecision === 'counter' ? 'Можно согласиться и купить' : 'Финальная цена'} ${money(modal.sellerAgreed)}</small></div></div>` : `<div class="haggle-box"><label for="seller-offer">Твоё предложение</label><div><input id="seller-offer" inputmode="numeric" type="number" min="20" step="10" value="${modal.lastOffer || initialOffer}" /><span>₽</span><button data-action="send-seller-offer">Торговаться</button></div></div>`}
        <div class="modal-actions stacked-mobile"><button class="ghost-button" data-action="close-modal">Отказаться</button><button class="primary-button" data-action="buy-listing" data-id="${item.id}" data-price="${modal.sellerAgreed || item.price}">Купить за ${money(modal.sellerAgreed || item.price)}</button></div>
      </div>
    </section></div>`;
}

function renderItemModal(item) {
  return `<div class="modal-backdrop"><section class="modal-card item-modal" role="dialog" aria-modal="true"><button class="modal-close" data-action="close-modal" aria-label="Закрыть">×</button>
    <div class="item-heading"><span>${item.emoji}</span><div><span class="condition ${item.conditionClass}">${item.condition}</span><h2>${escapeHtml(item.name)}</h2><p>Куплен за ${money(item.purchasePrice)} · расходы ${money(item.expenses)}</p></div></div>
    ${item.defect && !item.defectFixed ? `<div class="defect-alert"><span>${item.defect.emoji}</span><div><b>Дефект: ${escapeHtml(item.defect.label)}</b><small>Снижает потенциальную цену</small></div></div>` : item.defect && item.defectFixed ? `<div class="fixed-alert">✓ Дефект исправлен</div>` : `<div class="fixed-alert">✓ Дефектов нет</div>`}
    <div class="value-panel"><div><span>Потенциальная цена</span><strong>${money(getItemValue(item))}</strong></div><div><span>Потенциальная прибыль</span><strong class="${getItemValue(item) - item.purchasePrice - item.expenses >= 0 ? 'positive' : 'negative'}">${money(getItemValue(item) - item.purchasePrice - item.expenses)}</strong></div></div><h3>Подготовка к продаже</h3>
    <div class="upgrade-list">${UPGRADES.map((upgrade) => { const applied = item.upgrades.includes(upgrade.id); const cost = getUpgradeCost(item, upgrade.id); const lockReason = getUpgradeLockReason(item, upgrade.id); const unavailable = Boolean(lockReason) || state.cash < cost || item.status === 'listed'; return `<button data-action="upgrade" data-id="${item.id}" data-upgrade="${upgrade.id}" ${unavailable ? 'disabled' : ''} class="upgrade-button ${applied ? 'applied' : ''}"><span>${upgrade.emoji}</span><div><b>${upgrade.name}</b><small>${applied ? 'Готово' : lockReason || upgrade.desc}</small></div><strong>${applied ? '✓' : lockReason ? '—' : money(cost)}</strong></button>`; }).join('')}</div>
    <button class="primary-button jumbo" data-action="open-list" data-id="${item.id}" ${item.status === 'listed' ? 'disabled' : ''}>${item.status === 'listed' ? `Выставлено за ${money(item.listPrice)}` : 'Выставить на продажу'}</button>
  </section></div>`;
}

function renderModal() {
  if (!modal) return '';
  if (modal.type === 'welcome') return `<div class="modal-backdrop"><section class="modal-card welcome-card" role="dialog" aria-modal="true" aria-label="Начало игры"><div class="welcome-art"><span class="coin coin-one">₽</span><span class="coin coin-two">₽</span><div>500</div></div><span class="eyebrow">ТВОЙ СТАРТОВЫЙ КАПИТАЛ</span><h2>Из пятисот<br>сделай миллион.</h2><p>Ищи недооценённые вещи, торгуйся и перепродавай дороже. Первая выгодная сделка уже в ленте.</p><button class="primary-button jumbo" data-action="start-game">Начать охоту <span>→</span></button></section></div>`;
  if (modal.type === 'listing') { const item = state.listings.find((listing) => listing.id === modal.id); return item ? renderListingModal(item) : ''; }
  if (modal.type === 'purchase-result') { const item = state.inventory.find((candidate) => candidate.id === modal.itemId); return item ? `<div class="modal-backdrop"><section class="modal-card result-card" role="dialog" aria-modal="true"><div class="result-icon ${item.defect ? 'warning' : 'success'}">${item.defect ? item.defect.emoji : '✓'}</div><span class="eyebrow">ПОКУПКА ЗАВЕРШЕНА</span><h2>${item.defect ? 'Есть нюанс…' : 'Товар твой!'}</h2><p>${item.defect ? `После покупки обнаружилось: <b>${escapeHtml(item.defect.label)}</b>. Это снизит цену, пока не исправишь.` : 'Скрытых дефектов не обнаружено. Теперь подготовь товар к продаже.'}</p><div class="receipt-row"><span>Списано с баланса</span><b>−${money(item.purchasePrice)}</b></div><button class="primary-button jumbo" data-action="go-inventory">К товару <span>→</span></button></section></div>` : ''; }
  if (modal.type === 'item') { const item = state.inventory.find((candidate) => candidate.id === modal.id); return item ? renderItemModal(item) : ''; }
  if (modal.type === 'list') { const item = state.inventory.find((candidate) => candidate.id === modal.id); if (!item) return ''; const suggested = roundPrice(getItemValue(item) * 1.08); return `<div class="modal-backdrop"><section class="modal-card list-modal" role="dialog" aria-modal="true"><button class="modal-close" data-action="close-modal" aria-label="Закрыть">×</button><span class="big-emoji">${item.emoji}</span><span class="eyebrow">НОВОЕ ОБЪЯВЛЕНИЕ</span><h2>За сколько продаём?</h2><p>${escapeHtml(item.name)}</p><div class="price-input"><input id="list-price" type="number" inputmode="numeric" min="50" step="10" value="${suggested}" /><span>₽</span></div><div class="price-guide"><div><span>Быстрая продажа</span><b>${money(roundPrice(getItemValue(item) * .9))}</b></div><div class="recommended"><span>Рекомендуем</span><b>${money(suggested)}</b></div><div><span>Смелая цена</span><b>${money(roundPrice(getItemValue(item) * 1.25))}</b></div></div><p class="fine-print">Высокая цена может отпугнуть покупателей. Предложения начнут приходить через несколько секунд.</p><button class="primary-button jumbo" data-action="publish-item" data-id="${item.id}">Опубликовать</button></section></div>`; }
  if (modal.type === 'counter') { const offer = state.offers.find((candidate) => candidate.id === modal.offerId); const item = offer && state.inventory.find((candidate) => candidate.id === offer.itemId); return offer && item ? `<div class="modal-backdrop"><section class="modal-card counter-modal" role="dialog" aria-modal="true"><button class="modal-close" data-action="close-modal" aria-label="Закрыть">×</button><span class="buyer-avatar large">${offer.avatar}</span><span class="eyebrow">ВСТРЕЧНАЯ ЦЕНА ДЛЯ ${escapeHtml(offer.buyerName).toUpperCase()}</span><h2>Не перегни с торгом</h2><p>Покупатель предложил ${money(offer.amount)}. Твоя цена в объявлении — ${money(item.listPrice)}.</p><div class="price-input"><input id="counter-price" type="number" inputmode="numeric" min="${offer.amount}" step="10" value="${roundPrice((offer.amount + item.listPrice) / 2)}" /><span>₽</span></div><button class="primary-button jumbo" data-action="submit-counter" data-id="${offer.id}">Отправить предложение</button></section></div>` : ''; }
  if (modal.type === 'sale-result') { const sale = modal.sale; return `<div class="modal-backdrop"><section class="modal-card result-card sale-result" role="dialog" aria-modal="true"><div class="confetti">✦ <i>●</i> ✦ <i>●</i></div><div class="result-icon ${sale.profit >= 0 ? 'success' : 'warning'}">${sale.profit >= 0 ? '₽' : '!'}</div><span class="eyebrow">СДЕЛКА ЗАКРЫТА</span><h2>${sale.profit >= 0 ? `Прибыль ${money(sale.profit)}` : `Убыток ${money(Math.abs(sale.profit))}`}</h2><div class="receipt"><div><span>Цена покупки</span><b>${money(sale.purchasePrice)}</b></div><div><span>Расходы</span><b>${money(sale.expenses)}</b></div><div><span>Цена продажи</span><b>${money(sale.salePrice)}</b></div><div class="total"><span>Чистая прибыль</span><b class="${sale.profit >= 0 ? 'positive' : 'negative'}">${sale.profit >= 0 ? '+' : ''}${money(sale.profit)}</b></div><div><span>ROI</span><b>${sale.roi.toFixed(1).replace('.', ',')}%</b></div></div><button class="primary-button jumbo" data-action="finish-sale">Искать следующую сделку <span>→</span></button></section></div>`; }
  if (modal.type === 'reward') { const copy = { expert: ['Экспертная оценка', 'Узнай реальную рыночную стоимость до покупки.', '💡'], inspect: ['Проверка товара', 'Обнаружь скрытый дефект до того, как отдашь деньги.', '🔍'], urgent: ['Срочная находка', 'Добавь в ленту одно выгодное объявление с таймером.', '⚡'], refresh: ['Свежая лента', 'Полностью обнови объявления и поищи новую выгоду.', '↻'], fast: ['Быстрый покупатель', 'Следующее предложение придёт почти сразу.', '🏃'] }[modal.kind]; return `<div class="modal-backdrop"><section class="modal-card reward-modal" role="dialog" aria-modal="true"><button class="modal-close" data-action="close-modal" aria-label="Закрыть">×</button><div class="ad-badge">AD</div><div class="reward-icon">${copy[2]}</div><span class="eyebrow">ЗДЕСЬ БУДЕТ REWARDED-РЕКЛАМА</span><h2>${copy[0]}</h2><p>${copy[1]}</p><button class="primary-button jumbo" data-action="claim-reward">Получить бонус</button><small>В MVP бонус выдаётся сразу без настоящей рекламы</small></section></div>`; }
  if (modal.type === 'confirm-reset') return `<div class="modal-backdrop"><section class="modal-card confirm-card" role="dialog" aria-modal="true"><span class="big-emoji">🧨</span><h2>Сбросить прогресс?</h2><p>Баланс, товары, сделки и обучение начнутся заново. Это действие нельзя отменить.</p><div class="modal-actions"><button class="ghost-button" data-action="close-modal">Оставить</button><button class="primary-button danger-fill" data-action="reset-game">Сбросить</button></div></section></div>`;
  return '';
}

function render() {
  const screens = { feed: renderFeed, inventory: renderInventory, messages: renderMessages, profile: renderProfile };
  app.innerHTML = `<main class="game-shell">${renderTopbar()}<div class="screen">${screens[activeTab]()}</div></main>${coachBanner()}${navBar()}${renderModal()}<div class="toast" id="toast" role="status"></div>`;
  updateCountdowns();
}

function setTutorialStep(step) {
  if (!state.tutorial.complete) state.tutorial.step = Math.max(state.tutorial.step, step);
}

function completePurchase(listing, price) {
  if (listing.expiresAt && listing.expiresAt <= Date.now()) { state.listings = state.listings.filter((item) => item.id !== listing.id); modal = null; commit(); showToast('Объявление уже забрали', 'loss'); return; }
  if (state.cash < price) { showToast(`Не хватает ${money(price - state.cash)}`, 'loss'); return; }
  const item = { ...listing, id: uid('item'), listingId: listing.id, purchasePrice: price, purchasedAt: Date.now(), expenses: 0, upgrades: [], defect: listing.latentDefect, defectFixed: false, status: 'owned' };
  delete item.latentDefect;
  state.cash -= price;
  state.inventory.unshift(item);
  state.listings = state.listings.filter((candidate) => candidate.id !== listing.id);
  setTutorialStep(3);
  modal = { type: 'purchase-result', itemId: item.id };
  commit();
  animateMoney(-price);
}

function completeSale(item, offer, price) {
  const profit = price - item.purchasePrice - item.expenses;
  const roi = item.purchasePrice + item.expenses > 0 ? profit / (item.purchasePrice + item.expenses) * 100 : 0;
  const sale = { id: uid('sale'), itemId: item.id, name: item.name, emoji: item.emoji, purchasePrice: item.purchasePrice, expenses: item.expenses, salePrice: price, profit, roi, soldAt: Date.now() };
  state.cash += price;
  state.earned += Math.max(0, profit);
  state.stats.deals += 1;
  state.stats.bestProfit = Math.max(state.stats.bestProfit, profit);
  state.inventory = state.inventory.filter((candidate) => candidate.id !== item.id);
  state.offers.forEach((candidate) => { if (candidate.itemId === item.id) candidate.status = candidate.id === offer?.id ? 'accepted' : 'closed'; });
  state.saleHistory.unshift(sale);
  if (!state.tutorial.complete) { state.tutorial.complete = true; state.tutorial.step = 0; }
  modal = { type: 'sale-result', sale };
  commit();
  animateMoney(price);
}

function rewardModal(kind, targetId) { modal = { type: 'reward', kind, targetId }; render(); }

async function claimReward() {
  const { kind, targetId } = modal;
  await platform.showRewarded();
  if (kind === 'expert' || kind === 'inspect') {
    const listing = state.listings.find((item) => item.id === targetId);
    if (listing) listing[kind === 'expert' ? 'expertKnown' : 'inspected'] = true;
    modal = listing ? { type: 'listing', id: listing.id, chat: [] } : null;
  } else if (kind === 'urgent') {
    state.listings.unshift(...generateListings(state, 1, { forceUrgent: true })); modal = null; activeTab = 'feed';
  } else if (kind === 'refresh') {
    state.listings = generateListings(state, 10); state.refreshedAt = Date.now(); modal = null; activeTab = 'feed';
  } else if (kind === 'fast') {
    const target = state.inventory.filter((item) => item.status === 'listed').sort((a, b) => (a.nextOfferAt || 0) - (b.nextOfferAt || 0))[0];
    if (target) target.nextOfferAt = Date.now() + 250;
    modal = null; activeTab = 'messages';
  }
  commit(); showToast('Бонус получен!', 'gain'); setTimeout(tick, 350);
}

function sendSellerOffer() {
  const listing = state.listings.find((item) => item.id === modal.id);
  const input = document.querySelector('#seller-offer');
  if (!listing || !input) return;
  const amount = roundPrice(Number(input.value));
  if (!Number.isFinite(amount) || amount < 20 || amount > listing.price * 1.2) { showToast('Укажи разумную цену', 'loss'); return; }
  modal.chat ||= [];
  modal.chat.push({ from: 'player', text: `Готов забрать за ${money(amount)}. Как вам?` });
  const decision = decideSeller(listing, amount, modal.round || 0);
  modal.chat.push({ from: 'seller', text: decision.text });
  modal.round = (modal.round || 0) + 1;
  modal.lastOffer = decision.type === 'counter' ? decision.price : amount;
  if (decision.type === 'accept' || decision.type === 'counter') {
    modal.sellerAgreed = decision.price;
    modal.sellerDecision = decision.type;
  }
  render();
}

function applyItemUpgrade(itemId, upgradeId) {
  const index = state.inventory.findIndex((item) => item.id === itemId);
  if (index < 0) return;
  const item = state.inventory[index];
  if (item.upgrades.includes(upgradeId)) return;
  if (!canApplyUpgrade(item, upgradeId)) { showToast(getUpgradeLockReason(item, upgradeId)); return; }
  const cost = getUpgradeCost(item, upgradeId);
  if (state.cash < cost) { showToast('Не хватает денег на улучшение', 'loss'); return; }
  state.cash -= cost;
  state.inventory[index] = { ...applyUpgrade(item, upgradeId), expenses: item.expenses + cost };
  commit(); animateMoney(-cost); showToast('Товар стал привлекательнее', 'gain');
}

function publishItem(itemId) {
  const item = state.inventory.find((candidate) => candidate.id === itemId);
  const price = roundPrice(Number(document.querySelector('#list-price')?.value));
  if (!item || !Number.isFinite(price) || price < 50) { showToast('Укажи цену продажи', 'loss'); return; }
  item.status = 'listed'; item.listPrice = price; item.listedAt = Date.now(); item.nextOfferAt = Date.now() + 4500 + Math.random() * 4500; item.offerCount = 0;
  setTutorialStep(4); modal = null; commit(); showToast('Объявление опубликовано', 'gain');
}

function declineOffer(offerId) {
  const offer = state.offers.find((candidate) => candidate.id === offerId);
  const item = offer && state.inventory.find((candidate) => candidate.id === offer.itemId);
  if (!offer || !item) return;
  offer.status = 'declined'; item.nextOfferAt = Date.now() + 3500 + Math.random() * 5000; commit(); showToast('Предложение отклонено');
}

function submitCounter(offerId) {
  const offer = state.offers.find((candidate) => candidate.id === offerId);
  const item = offer && state.inventory.find((candidate) => candidate.id === offer.itemId);
  const price = roundPrice(Number(document.querySelector('#counter-price')?.value));
  if (!offer || !item || !Number.isFinite(price) || price < offer.amount) { showToast('Цена должна быть не ниже предложения', 'loss'); return; }
  if (decideBuyer(item, offer, price)) completeSale(item, offer, price);
  else { offer.status = 'counter-rejected'; item.nextOfferAt = Date.now() + 4000 + Math.random() * 5000; modal = null; commit(); showToast(`${offer.buyerName} отказался от встречной цены`, 'loss'); }
}

function updateCountdowns() {
  document.querySelectorAll('[data-countdown]').forEach((node) => { const seconds = Math.max(0, Math.ceil((Number(node.dataset.countdown) - Date.now()) / 1000)); node.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; });
}

function tick() {
  const now = Date.now();
  const before = state.listings.length;
  state.listings = state.listings.filter((listing) => !listing.expiresAt || listing.expiresAt > now);
  let changed = state.listings.length !== before;
  let newOffer = false;
  state.inventory.filter((item) => item.status === 'listed').forEach((item) => {
    const hasActive = state.offers.some((offer) => offer.itemId === item.id && offer.status === 'active');
    if (!hasActive && item.nextOfferAt && item.nextOfferAt <= now) {
      const offer = generateBuyerOffer(item, Math.random, item.lastBuyerId);
      state.offers.unshift(offer);
      item.lastBuyerId = offer.buyerId;
      item.offerCount = (item.offerCount || 0) + 1;
      item.nextOfferAt = null;
      changed = true;
      newOffer = true;
    }
  });
  if (changed) { commit(); if (newOffer) showToast('Новое предложение от покупателя!', 'gain'); } else updateCountdowns();
}

app.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id, tab, kind, upgrade, price } = button.dataset;
  if (action === 'nav') { activeTab = tab; modal = null; render(); }
  else if (action === 'start-game') { state.tutorial.started = true; state.tutorial.step = 1; modal = null; commit(); }
  else if (action === 'skip-tutorial') { state.tutorial.complete = true; state.tutorial.step = 0; commit(); }
  else if (action === 'open-listing') { modal = { type: 'listing', id, chat: [] }; setTutorialStep(2); commit(); }
  else if (action === 'send-seller-offer') sendSellerOffer();
  else if (action === 'buy-listing') { const listing = state.listings.find((item) => item.id === id); if (listing) completePurchase(listing, Number(price)); }
  else if (action === 'close-modal') { modal = null; render(); }
  else if (action === 'go-inventory') { activeTab = 'inventory'; modal = null; render(); }
  else if (action === 'open-item') { modal = { type: 'item', id }; render(); }
  else if (action === 'upgrade') applyItemUpgrade(id, upgrade);
  else if (action === 'open-list') { modal = { type: 'list', id }; render(); }
  else if (action === 'publish-item') publishItem(id);
  else if (action === 'decline-offer') declineOffer(id);
  else if (action === 'counter-offer') { modal = { type: 'counter', offerId: id }; render(); }
  else if (action === 'submit-counter') submitCounter(id);
  else if (action === 'accept-offer') { const offer = state.offers.find((candidate) => candidate.id === id); const item = offer && state.inventory.find((candidate) => candidate.id === offer.itemId); if (offer && item) completeSale(item, offer, offer.amount); }
  else if (action === 'finish-sale') { modal = null; activeTab = 'feed'; state.listings = [...generateListings(state, 4), ...state.listings].slice(0, 10); commit(); }
  else if (action === 'reward') rewardModal(kind, id);
  else if (action === 'locked-teaser') {
    const unlock = TIER_UNLOCKS.find((candidate) => candidate.tier === Number(button.dataset.tier));
    showToast(`Нужно: ${unlockRequirement(unlock)}`);
  }
  else if (action === 'claim-reward') claimReward();
  else if (action === 'confirm-reset') { modal = { type: 'confirm-reset' }; render(); }
  else if (action === 'reset-game') { state = createInitialState(); activeTab = 'feed'; modal = { type: 'welcome' }; commit(); }
});

document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && modal?.type !== 'welcome') { modal = null; render(); } });

await platform.init();
syncState();
render();
setInterval(tick, 1000);

window.__PEREKUP__ = { getState: () => structuredClone(state), forceTick: tick };
