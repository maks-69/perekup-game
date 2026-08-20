export const PRODUCT_TEMPLATES = [
  { id: 'earbuds-basic', category: 'Наушники', tier: 0, name: 'Беспроводные наушники', emoji: '🎧', base: 620 },
  { id: 'earbuds-wired', category: 'Наушники', tier: 0, name: 'Проводные наушники', emoji: '🎧', base: 280 },
  { id: 'earbuds-gaming', category: 'Наушники', tier: 0, name: 'Игровая гарнитура', emoji: '🎧', base: 980 },
  { id: 'earbuds-case', category: 'Наушники', tier: 0, name: 'TWS-наушники с кейсом', emoji: '🎶', base: 1350 },
  { id: 'mouse-office', category: 'Мышки', tier: 0, name: 'Беспроводная мышка', emoji: '🖱️', base: 430 },
  { id: 'mouse-gaming', category: 'Мышки', tier: 0, name: 'Игровая RGB-мышка', emoji: '🖱️', base: 1050 },
  { id: 'mouse-vertical', category: 'Мышки', tier: 0, name: 'Вертикальная мышка', emoji: '🖱️', base: 780 },
  { id: 'keyboard-office', category: 'Клавиатуры', tier: 0, name: 'Компактная клавиатура', emoji: '⌨️', base: 650 },
  { id: 'keyboard-mech', category: 'Клавиатуры', tier: 0, name: 'Механическая клавиатура', emoji: '⌨️', base: 1750 },
  { id: 'keyboard-mini', category: 'Клавиатуры', tier: 0, name: 'Мини-клавиатура 60%', emoji: '⌨️', base: 1450 },
  { id: 'speaker-mini', category: 'Колонки', tier: 0, name: 'Портативная колонка', emoji: '🔊', base: 920 },
  { id: 'speaker-pair', category: 'Колонки', tier: 0, name: 'Компьютерные колонки', emoji: '🔈', base: 1250 },
  { id: 'speaker-party', category: 'Колонки', tier: 0, name: 'Колонка с подсветкой', emoji: '🔊', base: 1850 },
  { id: 'gamepad-pc', category: 'Геймпады', tier: 0, name: 'Геймпад для ПК', emoji: '🎮', base: 1100 },
  { id: 'gamepad-mobile', category: 'Геймпады', tier: 0, name: 'Мобильный геймпад', emoji: '🎮', base: 720 },
  { id: 'gamepad-pro', category: 'Геймпады', tier: 0, name: 'Беспроводной геймпад', emoji: '🎮', base: 2100 },
  { id: 'sneakers-canvas', category: 'Кроссовки', tier: 0, name: 'Текстильные кеды', emoji: '👟', base: 1400 },
  { id: 'sneakers-running', category: 'Кроссовки', tier: 0, name: 'Беговые кроссовки', emoji: '👟', base: 2300 },
  { id: 'sneakers-retro', category: 'Кроссовки', tier: 0, name: 'Ретро-кроссовки', emoji: '👟', base: 2900 },
  { id: 'watch-digital', category: 'Часы', tier: 0, name: 'Электронные часы', emoji: '⌚', base: 850 },
  { id: 'watch-smart-basic', category: 'Часы', tier: 0, name: 'Фитнес-часы', emoji: '⌚', base: 1900 },
  { id: 'watch-classic', category: 'Часы', tier: 0, name: 'Классические часы', emoji: '⌚', base: 2600 },
  { id: 'mic-lavalier', category: 'Аудио', tier: 0, name: 'Петличный микрофон', emoji: '🎙️', base: 720 },
  { id: 'mic-usb', category: 'Аудио', tier: 0, name: 'USB-микрофон для стримов', emoji: '🎙️', base: 2400 },
  { id: 'webcam-basic', category: 'Гаджеты', tier: 0, name: 'Веб-камера Full HD', emoji: '📹', base: 1250 },
  { id: 'powerbank-fast', category: 'Гаджеты', tier: 0, name: 'Быстрый пауэрбанк', emoji: '🔋', base: 1650 },
  { id: 'router-wifi', category: 'Гаджеты', tier: 0, name: 'Wi-Fi роутер', emoji: '📡', base: 2100 },
  { id: 'ssd-portable', category: 'Гаджеты', tier: 0, name: 'Портативный SSD', emoji: '💾', base: 3200 },
  { id: 'action-camera', category: 'Гаджеты', tier: 0, name: 'Экшн-камера', emoji: '📷', base: 3900 },
  { id: 'ebook-reader', category: 'Гаджеты', tier: 0, name: 'Электронная книга', emoji: '📖', base: 4500 },

  { id: 'phone-android-old', category: 'Смартфоны', tier: 1, name: 'Смартфон Android 64 ГБ', emoji: '📱', base: 8200 },
  { id: 'phone-compact', category: 'Смартфоны', tier: 1, name: 'Компактный смартфон', emoji: '📱', base: 11500 },
  { id: 'phone-camera', category: 'Смартфоны', tier: 1, name: 'Смартфон с хорошей камерой', emoji: '📱', base: 15800 },
  { id: 'phone-flagship-old', category: 'Смартфоны', tier: 1, name: 'Флагман прошлых лет', emoji: '📱', base: 22500 },
  { id: 'console-portable', category: 'Приставки', tier: 2, name: 'Портативная приставка', emoji: '🕹️', base: 14500 },
  { id: 'console-lastgen', category: 'Приставки', tier: 2, name: 'Игровая приставка', emoji: '🎮', base: 27000 },
  { id: 'console-bundle', category: 'Приставки', tier: 2, name: 'Приставка с двумя геймпадами', emoji: '🎮', base: 36000 },
  { id: 'sneakers-hype', category: 'Дорогие кроссовки', tier: 2, name: 'Лимитированные кроссовки', emoji: '👟', base: 24000 },
  { id: 'sneakers-designer', category: 'Дорогие кроссовки', tier: 2, name: 'Дизайнерские кроссовки', emoji: '👟', base: 39000 },
  { id: 'tablet-mini', category: 'Планшеты', tier: 3, name: 'Компактный планшет', emoji: '📲', base: 31000 },
  { id: 'tablet-pencil', category: 'Планшеты', tier: 3, name: 'Планшет со стилусом', emoji: '📲', base: 48000 },
  { id: 'tablet-pro', category: 'Планшеты', tier: 3, name: 'Планшет Pro 256 ГБ', emoji: '📲', base: 76000 },
  { id: 'laptop-office', category: 'Ноутбуки', tier: 4, name: 'Офисный ноутбук', emoji: '💻', base: 54000 },
  { id: 'laptop-ultra', category: 'Ноутбуки', tier: 4, name: 'Тонкий ультрабук', emoji: '💻', base: 88000 },
  { id: 'laptop-gaming', category: 'Ноутбуки', tier: 4, name: 'Игровой ноутбук', emoji: '💻', base: 135000 },
  { id: 'camera-mirrorless', category: 'Дорогая электроника', tier: 5, name: 'Беззеркальная камера', emoji: '📷', base: 115000 },
  { id: 'lens-pro', category: 'Дорогая электроника', tier: 5, name: 'Профессиональный объектив', emoji: '📸', base: 155000 },
  { id: 'projector-4k', category: 'Дорогая электроника', tier: 5, name: 'Домашний 4K-проектор', emoji: '📽️', base: 190000 },
  { id: 'drone-camera', category: 'Дорогая электроника', tier: 5, name: 'Дрон с камерой', emoji: '🚁', base: 245000 },
  { id: 'desktop-pro', category: 'Дорогая электроника', tier: 5, name: 'Рабочая станция', emoji: '🖥️', base: 320000 },
];

export const CONDITIONS = [
  { name: 'Отличное', factor: 1.08, className: 'great' },
  { name: 'Хорошее', factor: 1, className: 'good' },
  { name: 'Нормальное', factor: 0.86, className: 'normal' },
  { name: 'Плохое', factor: 0.68, className: 'poor' },
];

export const DEFECTS = [
  { id: 'dirty', label: 'грязный', emoji: '🧽', penalty: 0.07, light: true },
  { id: 'scuffs', label: 'потёртости', emoji: '🔎', penalty: 0.08, light: true },
  { id: 'battery', label: 'нужна новая батарея', emoji: '🔋', penalty: 0.15, light: false },
  { id: 'cable', label: 'сломан кабель', emoji: '🔌', penalty: 0.13, light: false },
  { id: 'button', label: 'проблема с кнопкой', emoji: '🛠️', penalty: 0.18, light: false },
  { id: 'package', label: 'повреждена упаковка', emoji: '📦', penalty: 0.05, light: true },
];

export const SELLERS = ['Артём', 'Марина', 'Денис', 'Лера', 'Илья', 'Настя', 'Михаил', 'Олег', 'Саша', 'Кирилл', 'Алёна', 'Вадим'];

export const DESCRIPTIONS = [
  'Лежит без дела, всё основное работает. Можно проверить при встрече.',
  'Пользовались аккуратно. Продаю, потому что купил новое.',
  'Есть следы использования, на работу не влияют.',
  'Нашёл при переезде. Комплект как на фото, без торга у подъезда.',
  'Состояние видно на фото. Самовывоз сегодня будет удобнее.',
  'Подарили, но не пригодилось. Хочется продать без долгих переписок.',
  'Рабочая вещь, просто занимает место. Разумный торг возможен.',
];

export const LEVELS = [
  { name: 'Новичок', min: 0, emoji: '🌱' },
  { name: 'Барахольщик', min: 1000, emoji: '🧢' },
  { name: 'Перекуп', min: 5000, emoji: '🤝' },
  { name: 'Опытный перекуп', min: 10000, emoji: '🦊' },
  { name: 'Дилер', min: 50000, emoji: '💼' },
  { name: 'Владелец магазина', min: 100000, emoji: '🏪' },
  { name: 'Миллионер', min: 1000000, emoji: '👑' },
];

export const TIER_UNLOCKS = [
  { tier: 0, capital: 0, deals: 0, label: 'Аксессуары, кроссовки, часы, аудио и недорогие гаджеты' },
  { tier: 1, capital: 5000, deals: 6, label: 'Смартфоны' },
  { tier: 2, capital: 25000, deals: 12, label: 'Приставки и дорогие кроссовки' },
  { tier: 3, capital: 85000, deals: 18, label: 'Планшеты' },
  { tier: 4, capital: 180000, deals: 24, label: 'Ноутбуки' },
  { tier: 5, capital: 400000, deals: 32, label: 'Дорогая электроника' },
];

export const MILESTONES = [500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];

export const BUYERS = [
  { id: 'dealer', name: 'Ринат', title: 'Наглый перекуп', avatar: '😎', min: 0.55, max: 0.76, patience: 0.5, intro: 'Заберу сегодня, но цена должна быть оптовая.' },
  { id: 'regular', name: 'Ксения', title: 'Обычный покупатель', avatar: '🙂', min: 0.8, max: 0.95, patience: 0.7, intro: 'Здравствуйте! Немного уступите?' },
  { id: 'fast', name: 'Павел', title: 'Готов купить', avatar: '🏃', min: 0.9, max: 1, patience: 0.82, intro: 'Если всё как в описании, могу забрать прямо сейчас.' },
  { id: 'lowball', name: 'Макс', title: 'Любитель скидок', avatar: '🪙', min: 0.42, max: 0.62, patience: 0.35, intro: 'Моя цена без лишних разговоров.' },
  { id: 'collector', name: 'Антон', title: 'Редкий ценитель', avatar: '✨', min: 0.98, max: 1.12, patience: 0.9, intro: 'Давно ищу именно такую вещь. Готов обсудить цену.' },
];

export const UPGRADES = [
  { id: 'clean', emoji: '🧽', name: 'Чистка', desc: 'Убирает грязь и добавляет товарный вид', boost: 0.05 },
  { id: 'minor', emoji: '🔧', name: 'Мелкий ремонт', desc: 'Исправляет лёгкий дефект и повышает доверие', boost: 0.07 },
  { id: 'repair', emoji: '🛠️', name: 'Хороший ремонт', desc: 'Устраняет серьёзный дефект и улучшает состояние', boost: 0.13 },
  { id: 'photos', emoji: '📸', name: 'Хорошие фото', desc: 'Привлекают больше покупателей', boost: 0.05 },
];
