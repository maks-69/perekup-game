import {
  BUYERS,
  CONDITIONS,
  DEFECTS,
  DESCRIPTIONS,
  LEVELS,
  PRODUCT_TEMPLATES,
  SELLERS,
  TIER_UNLOCKS,
  UPGRADES,
} from './data.js';

export const SAVE_VERSION = 1;
export const FEED_REVISION = 5;

export const pick = (items, random = Math.random) => items[Math.floor(random() * items.length)];
export const between = (min, max, random = Math.random) => min + (max - min) * random();
export const roundPrice = (value) => Math.max(20, Math.round(value / 10) * 10);
export const uid = (prefix = 'id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function getItemValue(item) {
  const boost = (item.upgrades || []).reduce((sum, upgradeId) => {
    return sum + (UPGRADES.find((upgrade) => upgrade.id === upgradeId)?.boost || 0);
  }, 0);
  const defectPenalty = item.defect && !item.defectFixed ? item.defect.penalty : 0;
  return roundPrice(item.marketValue * (1 + boost - defectPenalty));
}

export function getCapital(state) {
  return Math.max(0, Math.round(state.cash + state.inventory.reduce((sum, item) => sum + getItemValue(item), 0)));
}

export function getPeakProgress(state) {
  return Math.max(state.maxCapital || 0, getCapital(state));
}

export function getUnlockedTier(state) {
  const progress = getPeakProgress(state);
  const deals = state.stats?.deals || 0;
  const qualifiedTier = TIER_UNLOCKS.filter((unlock) => progress >= unlock.capital && deals >= (unlock.deals || 0)).at(-1)?.tier || 0;
  return Math.max(state.maxUnlockedTier || 0, qualifiedTier);
}

export function getLevel(state) {
  const progress = getPeakProgress(state);
  return LEVELS.filter((level) => progress >= level.min).at(-1) || LEVELS[0];
}

export function getDefectPool(template) {
  const footwear = template.category === 'Кроссовки' || template.category === 'Дорогие кроссовки';
  if (footwear) return DEFECTS.filter((defect) => ['dirty', 'scuffs', 'package'].includes(defect.id));
  return DEFECTS;
}

export function generateListing(template, options = {}) {
  const { random = Math.random, forceUrgent = false, now = Date.now() } = options;
  const condition = pick(CONDITIONS, random);
  const marketValue = roundPrice(template.base * condition.factor * between(0.91, 1.11, random));
  const urgent = forceUrgent || random() < 0.12;
  const luck = random();
  let ratio;
  if (luck < 0.02) ratio = between(0.48, 0.62, random);
  else if (luck < 0.26) ratio = between(0.7, 0.89, random);
  else if (luck < 0.73) ratio = between(0.91, 1.06, random);
  else ratio = between(1.08, 1.3, random);
  if (urgent) {
    const ranges = [[0.55, 0.78], [0.62, 0.82], [0.66, 0.84], [0.69, 0.86], [0.72, 0.87], [0.75, 0.88]];
    ratio = between(...ranges[template.tier], random);
  }
  const hasDefect = random() < (urgent ? 0.52 : condition.name === 'Плохое' ? 0.45 : 0.22);
  const defectPool = getDefectPool(template);

  return {
    id: uid('listing'),
    templateId: template.id,
    category: template.category,
    name: template.name,
    emoji: template.emoji,
    tier: template.tier,
    condition: condition.name,
    conditionClass: condition.className,
    price: roundPrice(marketValue * ratio),
    marketValue,
    description: pick(DESCRIPTIONS, random),
    seller: pick(SELLERS, random),
    postedMinutes: Math.floor(between(1, 58, random)),
    urgent,
    expiresAt: urgent ? now + Math.floor(between(65000, 145000, random)) : null,
    latentDefect: hasDefect ? pick(defectPool, random) : null,
    expertKnown: false,
    inspected: false,
  };
}

export function generateListings(state, count = 10, options = {}) {
  const tier = getUnlockedTier(state);
  const available = PRODUCT_TEMPLATES.filter((template) => template.tier <= tier);
  const random = options.random || Math.random;
  const needsStarter = tier === 0 && getPeakProgress(state) < 1000 && !options.forceUrgent;
  const uniquePool = needsStarter ? available.filter((template) => template.id !== PRODUCT_TEMPLATES[0].id) : available;
  const currentTier = shuffle(uniquePool.filter((template) => template.tier === tier), random);
  const olderTiers = shuffle(uniquePool.filter((template) => template.tier !== tier), random);
  const currentTierTarget = tier === 0 ? count : Math.ceil(count * 0.45);
  const chosen = [
    ...currentTier.slice(0, currentTierTarget),
    ...olderTiers,
    ...currentTier.slice(currentTierTarget),
  ].slice(0, count);
  while (chosen.length < count) chosen.push(pick(uniquePool, random));

  const listings = chosen.map((template, index) => generateListing(template, {
    ...options,
    forceUrgent: Boolean(options.forceUrgent && index === 0),
  }));

  if (needsStarter) {
    const starter = generateListing(PRODUCT_TEMPLATES[0], options);
    starter.id = uid('starter');
    starter.name = 'Наушники JBL Tune';
    starter.price = 320;
    starter.marketValue = 520;
    starter.condition = 'Хорошее';
    starter.conditionClass = 'good';
    starter.description = 'Работают отлично, срочно нужны деньги. Без коробки.';
    starter.seller = 'Артём';
    starter.postedMinutes = 3;
    starter.urgent = true;
    starter.expiresAt = Date.now() + 180000;
    starter.latentDefect = null;
    starter.onboarding = true;
    listings[0] = starter;
  }
  return listings;
}

export function createInitialState() {
  const state = {
    version: SAVE_VERSION,
    createdAt: Date.now(),
    cash: 500,
    earned: 0,
    maxCapital: 500,
    maxUnlockedTier: 0,
    inventory: [],
    listings: [],
    offers: [],
    saleHistory: [],
    stats: { deals: 0, bestProfit: 0 },
    tutorial: { started: false, step: 0, complete: false },
    feedRevision: FEED_REVISION,
    refreshedAt: Date.now(),
  };
  state.listings = generateListings(state, 10);
  return state;
}

export function migrateState(saved) {
  if (!saved || saved.version !== SAVE_VERSION) return createInitialState();
  const inventory = Array.isArray(saved.inventory) ? saved.inventory : [];
  const saleHistory = Array.isArray(saved.saleHistory) ? saved.saleHistory : [];
  const hasProgress = saved.cash !== 500
    || (saved.earned || 0) > 0
    || inventory.length > 0
    || saleHistory.length > 0
    || (saved.stats?.deals || 0) > 0;
  const tutorial = { started: true, step: 0, complete: true, ...saved.tutorial };
  if (hasProgress && !tutorial.started) Object.assign(tutorial, { started: true, step: 0, complete: true });
  const legacyProgress = getPeakProgress({ ...saved, inventory });
  const legacyTier = [0, 5000, 15000, 50000, 100000, 300000].filter((capital) => legacyProgress >= capital).length - 1;
  const migrated = {
    ...createInitialState(),
    ...saved,
    inventory,
    listings: Array.isArray(saved.listings) && saved.listings.length ? saved.listings : generateListings(saved, 10),
    offers: Array.isArray(saved.offers) ? saved.offers : [],
    saleHistory,
    stats: { deals: 0, bestProfit: 0, ...saved.stats },
    tutorial,
    maxUnlockedTier: saved.maxUnlockedTier ?? Math.max(0, legacyTier),
  };
  if ((saved.feedRevision || 0) < FEED_REVISION) {
    migrated.listings = generateListings(migrated, 10);
    migrated.feedRevision = FEED_REVISION;
    migrated.refreshedAt = Date.now();
  }
  return migrated;
}

export function decideSeller(listing, offer, round = 0, random = Math.random) {
  const ratio = offer / listing.price;
  if (listing.onboarding && offer >= 250) {
    return { type: 'accept', price: offer, text: 'Ладно, договорились. Забирайте сегодня 👍' };
  }
  const chance = ratio >= 0.97 ? 0.94 : ratio >= 0.9 ? 0.7 : ratio >= 0.82 ? 0.38 : ratio >= 0.72 ? 0.13 : 0;
  const tierPenalty = [0, 0.03, 0.07, 0.1, 0.14, 0.17][listing.tier || 0];
  if (random() < Math.max(0, chance - tierPenalty - round * 0.08)) {
    return { type: 'accept', price: offer, text: pick(['Хорошо, по рукам.', 'Договорились. Когда сможете забрать?', 'Ладно, пусть будет по-вашему 👍'], random) };
  }
  if (ratio >= 0.67 && round < 2 && random() < 0.8) {
    const counterRanges = [[0.25, 0.55], [0.25, 0.55], [0.2, 0.42], [0.2, 0.42], [0.15, 0.32], [0.15, 0.32]];
    const counter = roundPrice(Math.max(offer + 20, listing.price - (listing.price - offer) * between(...counterRanges[listing.tier || 0], random)));
    return { type: 'counter', price: counter, text: `За ${counter.toLocaleString('ru-RU')} ₽ отдам. Ниже уже не могу.` };
  }
  return { type: 'reject', text: pick(['Нет, это слишком мало.', 'Спасибо, но за такую цену оставлю себе.', 'Не, столько точно не скину.', 'Уже есть предложение повыше.'], random) };
}

export const MAX_SAME_SELLER_OFFER_ATTEMPTS = 3;

export function getSellerOfferAttempt(negotiation, amount) {
  if (negotiation.lastRejectedOffer != null && amount < negotiation.lastRejectedOffer) {
    return { allowed: false, reason: 'lower' };
  }
  const repeated = negotiation.lastSentOffer === amount;
  const attempt = repeated ? (negotiation.sameOfferAttempts || 0) + 1 : 1;
  if (attempt > MAX_SAME_SELLER_OFFER_ATTEMPTS) {
    return { allowed: false, reason: 'exhausted' };
  }
  return { allowed: true, repeated, attempt };
}

export function publishInventoryItem(state, itemId, rawPrice, options = {}) {
  const { now = Date.now(), random = Math.random } = options;
  const item = state.inventory.find((candidate) => candidate.id === itemId);
  const numericPrice = Number(rawPrice);
  if (!item || !Number.isFinite(numericPrice) || numericPrice < 50) return { ok: false, editing: false };

  const price = roundPrice(numericPrice);
  const editing = item.status === 'listed';
  if (editing) {
    state.offers.forEach((offer) => {
      if (offer.itemId === item.id && offer.status === 'active') offer.status = 'price-changed';
    });
  }
  item.status = 'listed';
  item.listPrice = price;
  item.listedAt = now;
  item.nextOfferAt = now + (editing ? 6500 + random() * 5000 : 4500 + random() * 4500);
  if (!editing) item.offerCount = 0;
  return { ok: true, editing, price };
}

export function getUpgradeCost(item, upgradeId) {
  const base = { clean: 25, minor: 55, repair: 110, photos: 20 }[upgradeId] || 20;
  const rate = { clean: 0.022, minor: 0.055, repair: 0.13, photos: 0.018 }[upgradeId] || 0.02;
  return roundPrice(base + item.marketValue * rate);
}

export function getUpgradeLockReason(item, upgradeId) {
  if ((item.upgrades || []).includes(upgradeId)) return 'Готово';
  if (upgradeId !== 'minor' && upgradeId !== 'repair') return '';
  if (!item.defect) return 'Ремонт не нужен';
  if (item.defectFixed) return 'Дефект уже исправлен';
  if (item.defect.id === 'dirty') return 'Достаточно чистки';
  if (upgradeId === 'minor' && !item.defect.light) return 'Нужен хороший ремонт';
  if (upgradeId === 'repair' && item.defect.light) return 'Достаточно мелкого ремонта';
  return '';
}

export function canApplyUpgrade(item, upgradeId) {
  return !getUpgradeLockReason(item, upgradeId);
}

export function applyUpgrade(item, upgradeId) {
  if (!canApplyUpgrade(item, upgradeId)) return item;
  const upgraded = { ...item, upgrades: [...(item.upgrades || []), upgradeId] };
  if (upgradeId === 'repair') upgraded.defectFixed = true;
  if (upgradeId === 'minor' && item.defect?.light) upgraded.defectFixed = true;
  if (upgradeId === 'clean' && item.defect?.id === 'dirty') upgraded.defectFixed = true;
  if (upgradeId === 'repair') {
    const conditionIndex = CONDITIONS.findIndex((condition) => condition.name === item.condition);
    if (conditionIndex > 0) {
      upgraded.condition = CONDITIONS[conditionIndex - 1].name;
      upgraded.conditionClass = CONDITIONS[conditionIndex - 1].className;
    }
  }
  return upgraded;
}

export function generateBuyerOffer(item, random = Math.random, excludeBuyerId = null) {
  const variedPool = BUYERS.filter((buyer) => buyer.id !== excludeBuyerId);
  let pool = variedPool.length ? variedPool : BUYERS;
  const roll = random();
  const lateGame = item.tier >= 3;
  const collectorChance = item.tier >= 4 ? 0.035 : lateGame ? 0.055 : 0.08;
  const collectorAvailable = !lateGame || (item.offerCount || 0) >= 3;
  if (roll < collectorChance && collectorAvailable && excludeBuyerId !== 'collector') pool = BUYERS.filter((buyer) => buyer.id === 'collector');
  else if (roll < 0.24 && excludeBuyerId !== 'lowball') pool = BUYERS.filter((buyer) => buyer.id === 'lowball');
  const buyer = pick(pool, random);
  const effectiveValue = getItemValue(item);
  const askRatio = between(buyer.min, buyer.max, random);
  const valueCeiling = effectiveValue * (buyer.id === 'collector'
    ? between(1.02, item.tier >= 4 ? 1.05 : lateGame ? 1.09 : 1.14, random)
    : between(0.82, lateGame ? 0.99 : 1.03, random));
  const amount = roundPrice(Math.min(item.listPrice * askRatio, valueCeiling));
  return {
    id: uid('offer'),
    itemId: item.id,
    buyerId: buyer.id,
    buyerName: buyer.name,
    buyerTitle: buyer.title,
    avatar: buyer.avatar,
    patience: buyer.patience,
    text: buyer.intro,
    amount,
    createdAt: Date.now(),
    status: 'active',
  };
}

export function decideBuyer(item, offer, counterPrice, random = Math.random) {
  const effectiveValue = getItemValue(item);
  const jump = counterPrice / offer.amount;
  const valueRatio = counterPrice / effectiveValue;
  let chance = offer.patience;
  if (jump > 1.25) chance -= 0.35;
  else if (jump > 1.12) chance -= 0.16;
  if (valueRatio > 1.08) chance -= 0.34;
  else if (valueRatio <= 0.96) chance += 0.18;
  return random() < Math.max(0.08, Math.min(0.95, chance));
}
