# CrystalDent — Viena Dental Clinic

Сайт стоматологической клиники. Astro (статическая сборка) + Tailwind 4 + GSAP/Lenis.

## Запуск

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # сборка в dist/
npm start          # прод-режим, его использует Railway
```

## Структура

```
src/
  components/   секции страницы (Nav, Hero, TriPanels, Services, Doctors, Booking, Faq, Footer)
  data/site.ts  весь текстовый контент и данные — правки контента только здесь
  scripts/      motion.ts (GSAP + Lenis), ui.ts (меню, FAQ, виджет записи)
  styles/       global.css — дизайн-токены (OKLCH), типографика, кнопки
  brand/        логотип в SVG (mark, wordmark, lockup)
public/
  brand/        логотип для favicon и CSS-масок
  img/          фотографии
```

## Дизайн-система

- Тёмная база `ink-*` (глубокий сине-зелёный), светлая плита `paper` в hero.
- **Один** акцент — мятно-бирюзовый. Тёплый бордо только как атмосферный градиент
  фона, никогда как UI-цвет.
- Радиусы 0 везде, границы 1px, без размытых теней.
- Шрифты: Unbounded (заголовки, uppercase) + Jost (текст). Самохост, с кириллицей.
- Все цифры — `tabular-nums`.

## Контент-заглушки

В `src/data/site.ts` есть константа `PLACEHOLDER = "—"`. Клиника — реальное юрлицо,
поэтому имена врачей, телефон, адрес и статистика **не выдумываются**.
Заменить перед публикацией:

- `brand.phone`, `brand.email`, `brand.address`, `brand.hours` — незаполненные поля
  просто не рендерятся в подвале;
- `doctors[].name` и `doctors[].photo` — плейсхолдеры и стоковые фото;
- `stats` — секция отключена в `src/pages/index.astro`, включить после получения цифр;
- `slots` — демо-расписание, подключить к реальному.

## Фотографии

Стоковые (Pexels, свободная лицензия для коммерческого использования). Предметные
снимки вырезаны из фона и приведены к палитре. Подлежат замене на фото клиники.

## Доступность

Lighthouse (desktop): accessibility 100, best practices 100, SEO 100.
Контраст всех текстовых пар — не ниже 5.38:1 (WCAG AA).
Уважается `prefers-reduced-motion` — анимации отключаются.

## Деплой

GitHub → Railway, авто-деплой по push в `main`. Скрипт `start` поднимает
`astro preview` на `$PORT`.
