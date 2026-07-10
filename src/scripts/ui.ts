/** Интерактив: мобильное меню, FAQ-аккордеон, виджет записи. */

function initMenu() {
  const btn = document.getElementById("menuBtn");
  const panel = document.getElementById("menuPanel");
  if (!btn || !panel) return;

  const setOpen = (open: boolean) => {
    panel.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  };

  btn.addEventListener("click", () => setOpen(!panel.classList.contains("is-open")));
  panel.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
}

function initFaq() {
  document.querySelectorAll<HTMLButtonElement>("[data-faq-trigger]").forEach((trigger) => {
    const panel = trigger.nextElementSibling as HTMLElement | null;
    if (!panel) return;

    trigger.addEventListener("click", () => {
      const isOpen = trigger.getAttribute("aria-expanded") === "true";

      // закрыть остальные — одна открытая строка за раз
      document.querySelectorAll<HTMLButtonElement>("[data-faq-trigger]").forEach((t) => {
        if (t === trigger) return;
        t.setAttribute("aria-expanded", "false");
        const p = t.nextElementSibling as HTMLElement | null;
        if (p) p.style.maxHeight = "0px";
      });

      trigger.setAttribute("aria-expanded", String(!isOpen));
      // max-height, а не grid-fr: в Chromium fr не анимируется надёжно
      panel.style.maxHeight = isOpen ? "0px" : `${panel.scrollHeight}px`;
    });
  });

  // пересчёт при ресайзе, иначе открытая панель обрежется
  window.addEventListener("resize", () => {
    document.querySelectorAll<HTMLButtonElement>("[data-faq-trigger]").forEach((t) => {
      if (t.getAttribute("aria-expanded") !== "true") return;
      const p = t.nextElementSibling as HTMLElement | null;
      if (p) p.style.maxHeight = `${p.scrollHeight}px`;
    });
  });
}

/** Строит 14 ближайших дней от сегодня и связывает выбор дня/слота. */
function initBooking() {
  const strip = document.getElementById("dayStrip");
  const slotWrap = document.getElementById("slotWrap");
  const summary = document.getElementById("bookingSummary");
  if (!strip || !slotWrap) return;

  const wd = new Intl.DateTimeFormat("ru-RU", { weekday: "short" });
  const md = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });

  const today = new Date();
  let chosenDay: Date | null = null;
  let chosenSlot: string | null = null;

  const paint = () => {
    if (!summary) return;
    if (chosenDay && chosenSlot) {
      summary.textContent = `${md.format(chosenDay)}, ${chosenSlot}`;
      summary.dataset.state = "filled";
    } else if (chosenDay) {
      summary.textContent = `${md.format(chosenDay)} — выберите время`;
      summary.dataset.state = "partial";
    }
  };

  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const isSunday = d.getDay() === 0;

    const b = document.createElement("button");
    b.type = "button";
    b.className = "day";
    b.disabled = isSunday; // воскресенье — выходной (TODO: реальное расписание)
    b.innerHTML = `
      <span class="day__wd">${wd.format(d).replace(".", "")}</span>
      <span class="day__n tnum">${d.getDate()}</span>
    `;

    if (!isSunday) {
      b.addEventListener("click", () => {
        strip.querySelectorAll(".day").forEach((x) => x.classList.remove("is-active"));
        b.classList.add("is-active");
        chosenDay = d;
        paint();
      });
    }
    strip.appendChild(b);
  }

  // первый рабочий день выбран по умолчанию
  const first = strip.querySelector<HTMLButtonElement>(".day:not([disabled])");
  first?.click();

  slotWrap.querySelectorAll<HTMLButtonElement>(".slot").forEach((s) => {
    s.addEventListener("click", () => {
      slotWrap.querySelectorAll(".slot").forEach((x) => x.classList.remove("is-active"));
      s.classList.add("is-active");
      chosenSlot = s.dataset.slot ?? s.textContent?.trim() ?? null;
      paint();
    });
  });
}

/** Год в подвале — без хардкода. */
function initYear() {
  const y = document.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());
}

export function initUI() {
  initMenu();
  initFaq();
  initBooking();
  initYear();
}
