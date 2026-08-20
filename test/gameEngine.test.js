import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCT_TEMPLATES } from '../src/data.js';
import {
  applyUpgrade,
  canApplyUpgrade,
  createInitialState,
  decideBuyer,
  decideSeller,
  generateBuyerOffer,
  generateListing,
  generateListings,
  getCapital,
  getDefectPool,
  getItemValue,
  getPeakProgress,
  getUnlockedTier,
  migrateState,
  roundPrice,
} from '../src/gameEngine.js';

test('каталог содержит не меньше 30 разных шаблонов', () => {
  assert.ok(PRODUCT_TEMPLATES.length >= 30);
  assert.equal(new Set(PRODUCT_TEMPLATES.map((item) => item.id)).size, PRODUCT_TEMPLATES.length);
});

test('новая игра начинается с 500 рублей и выгодного стартового объявления', () => {
  const state = createInitialState();
  assert.equal(state.cash, 500);
  assert.ok(state.listings.length >= 10);
  assert.ok(state.listings.some((item) => item.onboarding && item.price <= state.cash && item.marketValue > item.price));
  assert.equal(new Set(state.listings.map((item) => item.templateId)).size, state.listings.length);
});

test('генератор создаёт плохие и выгодные сделки в зависимости от случайного броска', () => {
  const template = PRODUCT_TEMPLATES[0];
  const lucky = generateListing(template, { random: () => 0.01, now: 1 });
  const expensive = generateListing(template, { random: () => 0.99, now: 1 });
  assert.ok(lucky.price < lucky.marketValue);
  assert.ok(expensive.price > expensive.marketValue);
});

test('разумное стартовое предложение принимается продавцом из обучения', () => {
  const state = createInitialState();
  const listing = state.listings.find((item) => item.onboarding);
  const result = decideSeller(listing, 260, 0, () => 0.99);
  assert.equal(result.type, 'accept');
  assert.equal(result.price, 260);
});

test('продавец никогда не принимает абсурдно низкую цену', () => {
  const listing = { price: 228430, tier: 5 };
  for (let round = 0; round < 100; round += 1) {
    const result = decideSeller(listing, 20, round, () => 0);
    assert.equal(result.type, 'reject');
  }
});

test('ремонт увеличивает стоимость и исправляет дефект', () => {
  const item = {
    marketValue: 1000,
    condition: 'Нормальное',
    conditionClass: 'normal',
    upgrades: [],
    defect: { id: 'button', label: 'проблема с кнопкой', penalty: 0.18, light: false },
    defectFixed: false,
  };
  const before = getItemValue(item);
  const after = applyUpgrade(item, 'repair');
  assert.equal(after.defectFixed, true);
  assert.ok(getItemValue(after) > before);
});

test('ремонты нельзя складывать или применять без подходящего дефекта', () => {
  const cleanItem = { marketValue: 1000, upgrades: [], defect: null, defectFixed: false };
  assert.equal(canApplyUpgrade(cleanItem, 'repair'), false);
  assert.equal(canApplyUpgrade(cleanItem, 'minor'), false);
  assert.equal(canApplyUpgrade(cleanItem, 'photos'), true);

  const lightItem = { ...cleanItem, defect: { id: 'scuffs', penalty: 0.08, light: true } };
  assert.equal(canApplyUpgrade(lightItem, 'minor'), true);
  assert.equal(canApplyUpgrade(lightItem, 'repair'), false);
  const fixed = applyUpgrade(lightItem, 'minor');
  assert.equal(fixed.defectFixed, true);
  assert.equal(canApplyUpgrade(fixed, 'repair'), false);

  const dirtyItem = { ...cleanItem, defect: { id: 'dirty', penalty: 0.07, light: true } };
  assert.equal(canApplyUpgrade(dirtyItem, 'minor'), false);
  assert.equal(canApplyUpgrade(dirtyItem, 'repair'), false);
  assert.equal(canApplyUpgrade(dirtyItem, 'clean'), true);
});

test('кроссовкам выпадают только подходящие дефекты', () => {
  const sneakers = PRODUCT_TEMPLATES.find((item) => item.category === 'Дорогие кроссовки');
  assert.deepEqual(getDefectPool(sneakers).map((defect) => defect.id), ['dirty', 'scuffs', 'package']);
});

test('прогресс уровня совпадает с реальным рекордом капитала', () => {
  const state = createInitialState();
  state.cash = 533450;
  state.earned = 532990;
  state.maxCapital = 533450;
  assert.equal(getPeakProgress(state), 533450);
});

test('дорогие категории открываются с ростом капитала', () => {
  const state = createInitialState();
  state.cash = 180000;
  state.maxCapital = 180000;
  state.stats.deals = 24;
  assert.equal(getUnlockedTier(state), 4);
  const listings = generateListings(state, 30);
  assert.ok(listings.some((item) => item.tier > 0));
  assert.equal(getCapital(state), 180000);
});

test('дорогая электроника открывается с 400 тысяч и 32 сделок', () => {
  const state = createInitialState();
  state.cash = 399990;
  state.maxCapital = 399990;
  state.stats.deals = 32;
  assert.equal(getUnlockedTier(state), 4);
  state.cash = 400000;
  state.maxCapital = 400000;
  assert.equal(getUnlockedTier(state), 5);
});

test('капитал без нужного опыта не позволяет перескочить сразу в эндгейм', () => {
  const state = createInitialState();
  state.cash = 500000;
  state.maxCapital = 500000;
  state.stats.deals = 14;
  assert.equal(getUnlockedTier(state), 2);
  state.stats.deals = 32;
  assert.equal(getUnlockedTier(state), 5);
});

test('срочные сделки поздних тиров больше не дают экстремальную скидку', () => {
  const laptop = PRODUCT_TEMPLATES.find((item) => item.tier === 4);
  const workstation = PRODUCT_TEMPLATES.find((item) => item.tier === 5);
  const laptopDeal = generateListing(laptop, { forceUrgent: true, random: () => 0, now: 1 });
  const workstationDeal = generateListing(workstation, { forceUrgent: true, random: () => 0, now: 1 });
  assert.ok(laptopDeal.price / laptopDeal.marketValue >= 0.71);
  assert.ok(workstationDeal.price / workstationDeal.marketValue >= 0.74);
});

test('новый уровень заметно представлен в ленте и товары не повторяются без необходимости', () => {
  const state = createInitialState();
  state.cash = 25000;
  state.maxCapital = 25000;
  state.stats.deals = 12;
  const listings = generateListings(state, 10);
  assert.ok(listings.filter((item) => item.tier === 2).length >= 4);
  assert.equal(new Set(listings.map((item) => item.templateId)).size, listings.length);
});

test('покупатель принимает выгодную встречную цену при хорошем броске', () => {
  const item = { marketValue: 1000, upgrades: [], defect: null, listPrice: 1050 };
  const offer = { amount: 800, patience: 0.7 };
  assert.equal(decideBuyer(item, offer, 900, () => 0.1), true);
});

test('один тип покупателя не приходит два раза подряд', () => {
  const item = { marketValue: 1000, upgrades: [], defect: null, listPrice: 1050 };
  const offer = generateBuyerOffer(item, () => 0.15, 'lowball');
  assert.notEqual(offer.buyerId, 'lowball');
});

test('в поздней игре коллекционер не приходит в первых трёх предложениях', () => {
  const item = { tier: 5, offerCount: 2, marketValue: 100000, upgrades: [], defect: null, listPrice: 108000 };
  const earlyOffer = generateBuyerOffer(item, () => 0, null);
  assert.notEqual(earlyOffer.buyerId, 'collector');
  item.offerCount = 3;
  const laterOffer = generateBuyerOffer(item, () => 0, null);
  assert.equal(laterOffer.buyerId, 'collector');
});

test('старый прогресс не показывает стартовое обучение повторно', () => {
  const saved = createInitialState();
  saved.cash = 1170;
  saved.tutorial = { started: false, step: 0, complete: false };
  const migrated = migrateState(saved);
  assert.equal(migrated.cash, 1170);
  assert.equal(migrated.tutorial.started, true);
  assert.equal(migrated.tutorial.complete, true);
  assert.equal(migrated.listings.length, 10);
  assert.equal(new Set(migrated.listings.map((item) => item.templateId)).size, 10);
});

test('миграция сохраняет уже открытые категории', () => {
  const saved = createInitialState();
  saved.cash = 601630;
  saved.maxCapital = 601630;
  saved.stats.deals = 22;
  saved.feedRevision = 3;
  delete saved.maxUnlockedTier;
  const migrated = migrateState(saved);
  assert.equal(migrated.maxUnlockedTier, 5);
  assert.equal(getUnlockedTier(migrated), 5);
  assert.equal(migrated.cash, 601630);
});

test('ускоренная 30-минутная сессия даёт развитие, но не миллион', () => {
  let seed = 73129;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const state = createInitialState();
  let capitalAtThreeMinutes = state.cash;

  for (let minute = 0; minute < 30; minute += 1) {
    state.listings = generateListings(state, 12, { random });
    const deal = state.listings
      .filter((item) => item.price <= state.cash && item.price < item.marketValue * 0.94)
      .sort((a, b) => (b.marketValue - b.price) - (a.marketValue - a.price))[0];
    if (deal) {
      const salePrice = roundPrice(deal.marketValue * 0.94);
      const profit = salePrice - deal.price;
      state.cash += profit;
      state.earned += Math.max(0, profit);
      state.stats.deals += 1;
      state.maxCapital = Math.max(state.maxCapital, state.cash);
    }
    if (minute === 2) capitalAtThreeMinutes = state.cash;
  }

  assert.ok(capitalAtThreeMinutes < 1000000);
  assert.ok(state.cash >= 5000);
  assert.ok(state.cash < 1000000);
  assert.ok(state.stats.deals >= 8);
});
