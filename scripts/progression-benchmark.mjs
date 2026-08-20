import { CONDITIONS, PRODUCT_TEMPLATES } from '../src/data.js';
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
  getPeakProgress,
  getUnlockedTier,
  getUpgradeCost,
  roundPrice,
} from '../src/gameEngine.js';

const NORMAL_SEEDS = [73129, 20260820, 99173, 41777, 88211, 135791, 246802, 77031, 51987, 66047];
const REWARDED_SEEDS = [314159, 271828, 161803, 424242, 8675309];
const TARGETS = [5000, 25000, 100000, 300000, 500000, 1000000];
const MAX_DEALS = 140;

function seededRandom(initialSeed) {
  let seed = initialSeed >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function syncProgress(state) {
  state.maxCapital = Math.max(state.maxCapital || 500, getCapital(state));
  state.maxUnlockedTier = Math.max(state.maxUnlockedTier || 0, getUnlockedTier(state));
}

function projectedItem(listing, purchasePrice) {
  return {
    ...listing,
    purchasePrice,
    expenses: 0,
    upgrades: [],
    defect: listing.latentDefect,
    defectFixed: false,
    status: 'owned',
  };
}

function upgradeOrder(item) {
  if (item.defect?.id === 'dirty') return ['clean', 'photos'];
  if (item.defect?.light) return ['minor', 'clean', 'photos'];
  if (item.defect) return ['repair', 'clean', 'photos'];
  return ['clean', 'photos'];
}

function prepareItem(listing, purchasePrice, availableCash) {
  let item = projectedItem(listing, purchasePrice);
  let remainingCash = availableCash - purchasePrice;
  let upgrades = 0;

  for (const upgradeId of upgradeOrder(item)) {
    if (!canApplyUpgrade(item, upgradeId)) continue;
    const cost = getUpgradeCost(item, upgradeId);
    const upgraded = applyUpgrade(item, upgradeId);
    const addedValue = getItemValue(upgraded) - getItemValue(item);
    if (cost > remainingCash || addedValue < cost * 1.12) continue;
    item = { ...upgraded, expenses: item.expenses + cost };
    remainingCash -= cost;
    upgrades += 1;
  }
  return { item, upgrades };
}

function knownMarketValue(listing) {
  const template = PRODUCT_TEMPLATES.find((item) => item.id === listing.templateId);
  const condition = CONDITIONS.find((item) => item.name === listing.condition);
  return roundPrice(template.base * condition.factor);
}

function estimateProfit(listing, price, cash, rewarded) {
  if (price > cash) return -Infinity;
  if (rewarded) {
    const { item } = prepareItem(listing, price, cash);
    return roundPrice(getItemValue(item) * 0.9) - price - item.expenses;
  }
  const visibleValue = knownMarketValue(listing);
  const riskPenalty = listing.urgent ? 0.075 : listing.condition === 'Плохое' ? 0.06 : 0.025;
  return roundPrice(visibleValue * (0.9 - riskPenalty)) - price;
}

function chooseCandidate(state, rewarded, random) {
  if (state.stats.deals === 0) {
    const starter = state.listings.find((listing) => listing.onboarding);
    if (starter) return { listing: starter, seconds: 8 };
  }

  let seconds = rewarded ? 10 : 9;
  if (rewarded && state.stats.deals % 2 === 0) {
    state.listings.unshift(...generateListings(state, 1, { forceUrgent: true, random }));
    seconds += 2;
  }

  const candidates = state.listings
    .filter((listing) => listing.price <= state.cash * 0.97)
    .map((listing) => {
      const profit = estimateProfit(listing, listing.price, state.cash, rewarded);
      const roi = profit / Math.max(1, listing.price);
      const capitalUse = listing.price / Math.max(1, state.cash);
      return { listing, profit, score: profit * (0.72 + Math.min(0.28, capitalUse)) + roi * 150 };
    })
    .filter(({ profit }) => profit > 20)
    .sort((a, b) => b.score - a.score);

  if (rewarded && candidates.length) seconds += 4;
  return { listing: candidates[0]?.listing || null, seconds };
}

function negotiatePurchase(listing, cash, rewarded, random) {
  if (listing.onboarding) return { price: 260, seconds: 3 };
  const firstOffer = roundPrice(listing.price * (listing.tier >= 3 ? 0.89 : 0.86));
  let decision = decideSeller(listing, firstOffer, 0, random);
  let seconds = 4;
  if (decision.type === 'accept' || decision.type === 'counter') return { price: decision.price, seconds };

  const secondOffer = roundPrice(listing.price * 0.94);
  decision = decideSeller(listing, secondOffer, 1, random);
  seconds += 3;
  if (decision.type === 'accept' || decision.type === 'counter') return { price: decision.price, seconds };

  const profitable = estimateProfit(listing, listing.price, cash, rewarded) > 20;
  return { price: listing.price <= cash && profitable ? listing.price : null, seconds: seconds + 2 };
}

function sellItem(item, rewarded, random) {
  item.listPrice = roundPrice(getItemValue(item) * 1.08);
  item.offerCount = 0;
  let lastBuyerId = null;
  let seconds = 4;
  let bestOffer = null;

  for (let attempt = 0; attempt < 14; attempt += 1) {
    const offer = generateBuyerOffer(item, random, lastBuyerId);
    item.offerCount += 1;
    lastBuyerId = offer.buyerId;
    if (!bestOffer || offer.amount > bestOffer.amount) bestOffer = offer;

    const naturalWait = 4.5 + random() * 4.5;
    seconds += (rewarded ? 0.8 : naturalWait) + 2;
    const value = getItemValue(item);
    const totalCost = item.purchasePrice + item.expenses;
    const acceptable = offer.amount >= value * (item.tier >= 3 ? 0.88 : 0.86) && offer.amount > totalCost;
    if (!acceptable) continue;

    const counterPrice = roundPrice(Math.min(item.listPrice, value * (item.tier >= 3 ? 0.93 : 0.95)));
    if (counterPrice > offer.amount * 1.025 && counterPrice <= offer.amount * 1.16) {
      seconds += 3;
      if (decideBuyer(item, offer, counterPrice, random)) return { price: counterPrice, seconds, offers: attempt + 1 };
      continue;
    }
    return { price: offer.amount, seconds: seconds + 2, offers: attempt + 1 };
  }

  return { price: bestOffer.amount, seconds: seconds + 2, offers: 14 };
}

function recordMilestones(state, seconds, milestones) {
  const progress = getPeakProgress(state);
  for (const target of TARGETS) {
    if (progress >= target && milestones[target] == null) milestones[target] = seconds;
  }
}

function refreshNaturalFeed(state, random) {
  const fresh = generateListings(state, 4, { random });
  state.listings = [...fresh, ...state.listings].slice(0, 10);
}

function run(seed, mode) {
  const rewarded = mode === 'rewarded';
  const random = seededRandom(seed);
  const state = createInitialState();
  state.listings = generateListings(state, 10, { random });
  const milestones = {};
  const profits = [];
  let seconds = 12;
  let candidateMisses = 0;

  for (let dealIndex = 0; dealIndex < MAX_DEALS && state.cash < 1000000; dealIndex += 1) {
    syncProgress(state);
    const chosen = chooseCandidate(state, rewarded, random);
    seconds += chosen.seconds;
    if (!chosen.listing) {
      candidateMisses += 1;
      state.listings = generateListings(state, 10, { random });
      seconds += 10;
      dealIndex -= 1;
      if (candidateMisses > 80) break;
      continue;
    }

    const purchase = negotiatePurchase(chosen.listing, state.cash, rewarded, random);
    seconds += purchase.seconds;
    if (purchase.price == null || purchase.price > state.cash) {
      state.listings = state.listings.filter((item) => item.id !== chosen.listing.id);
      seconds += 4;
      dealIndex -= 1;
      continue;
    }

    const prepared = prepareItem(chosen.listing, purchase.price, state.cash);
    const item = prepared.item;
    state.cash -= purchase.price + item.expenses;
    state.inventory = [item];
    state.listings = state.listings.filter((listing) => listing.id !== chosen.listing.id);
    seconds += 8 + prepared.upgrades * 2;
    syncProgress(state);
    recordMilestones(state, seconds, milestones);

    const sale = sellItem(item, rewarded, random);
    seconds += sale.seconds + 3;
    const profit = sale.price - item.purchasePrice - item.expenses;
    state.cash += sale.price;
    state.inventory = [];
    state.earned += Math.max(0, profit);
    state.stats.deals += 1;
    state.stats.bestProfit = Math.max(state.stats.bestProfit, profit);
    profits.push(profit);
    syncProgress(state);
    recordMilestones(state, seconds, milestones);
    refreshNaturalFeed(state, random);
  }

  return {
    mode,
    seed,
    completed: state.cash >= 1000000,
    times: Object.fromEntries(TARGETS.map((target) => [target, milestones[target] == null ? null : Number((milestones[target] / 60).toFixed(1))])),
    deals: state.stats.deals,
    averageProfit: Math.round(profits.reduce((sum, profit) => sum + profit, 0) / Math.max(1, profits.length)),
    maxProfit: Math.max(...profits),
    candidateMisses,
    finalCash: Math.round(state.cash),
  };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function summarize(results) {
  const completed = results.filter((result) => result.completed);
  const times = completed.map((result) => result.times[1000000]);
  return {
    completed: `${completed.length}/${results.length}`,
    averageMinutes: Number((times.reduce((sum, value) => sum + value, 0) / times.length).toFixed(1)),
    medianMinutes: Number(median(times).toFixed(1)),
    minMinutes: Math.min(...times),
    maxMinutes: Math.max(...times),
    averageDeals: Number((completed.reduce((sum, result) => sum + result.deals, 0) / completed.length).toFixed(1)),
    maxSingleProfit: Math.max(...completed.map((result) => result.maxProfit)),
  };
}

const normal = NORMAL_SEEDS.map((seed) => run(seed, 'normal'));
const rewarded = REWARDED_SEEDS.map((seed) => run(seed, 'rewarded'));

console.log(JSON.stringify({
  balanceRevision: 1,
  targets: TARGETS,
  normal,
  rewarded,
  summary: { normal: summarize(normal), rewarded: summarize(rewarded) },
}, null, 2));
