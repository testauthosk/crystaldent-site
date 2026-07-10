/** Интерактив: мобильное меню, FAQ-аккордеон, дропдаун услуги, календарь записи. */
import gsap from "gsap";
import { reduced, lockScroll } from "./scroll";

function initMenu() {
  const btn = document.getElementById("menuBtn");
  const panel = document.getElementById("menuPanel");
  if (!btn || !panel) return;

  const setOpen = (open: boolean) => {
    panel.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", String(open));
    lockScroll(open);
  };

  btn.addEventListener("click", () => setOpen(!panel.classList.contains("is-open")));
  panel.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
}

function initFaq() {
  const triggers = document.querySelectorAll<HTMLButtonElement>("[data-faq-trigger]");

  triggers.forEach((trigger) => {
    const panel = trigger.nextElementSibling as HTMLElement | null;
    if (!panel) return;

    trigger.addEventListener("click", () => {
      const isOpen = trigger.getAttribute("aria-expanded") === "true";

      triggers.forEach((t) => {
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

  window.addEventListener("resize", () => {
    triggers.forEach((t) => {
      if (t.getAttribute("aria-expanded") !== "true") return;
      const p = t.nextElementSibling as HTMLElement | null;
      if (p) p.style.maxHeight = `${p.scrollHeight}px`;
    });
  });
}

/** Свой дропдаун вместо системного select — в стилистике сайта. */
function initSelect() {
  const root = document.getElementById("srvSelect");
  const btn = document.getElementById("srvBtn");
  const list = document.getElementById("srvList2");
  const value = document.getElementById("srvValue");
  if (!root || !btn || !list || !value) return;

  const options = [...list.querySelectorAll<HTMLLIElement>('[role="option"]')];
  let open = false;
  let cursor = options.findIndex((o) => o.getAttribute("aria-selected") === "true");

  const paintCursor = () => {
    options.forEach((o, i) => o.classList.toggle("is-active", i === cursor));
  };

  const setOpen = (next: boolean) => {
    open = next;
    btn.setAttribute("aria-expanded", String(open));
    list.classList.toggle("is-open", open);

    if (reduced) {
      list.style.clipPath = open ? "inset(0 0 0 0)" : "inset(0 0 100% 0)";
      return;
    }
    gsap.to(list, {
      clipPath: open ? "inset(0 0 0% 0)" : "inset(0 0 100% 0)",
      duration: open ? 0.42 : 0.28,
      ease: open ? "expo.out" : "power2.in",
    });
    if (open) {
      gsap.fromTo(
        options,
        { y: -8, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.34, ease: "expo.out", stagger: 0.03, delay: 0.05 },
      );
    }
  };

  const choose = (i: number) => {
    options.forEach((o, k) => o.setAttribute("aria-selected", String(k === i)));
    value.textContent = options[i].dataset.value ?? "";
    cursor = i;
    paintCursor();
    setOpen(false);
    btn.focus();
  };

  btn.addEventListener("click", () => setOpen(!open));
  options.forEach((o, i) => {
    o.addEventListener("click", () => choose(i));
    o.addEventListener("pointerenter", () => {
      cursor = i;
      paintCursor();
    });
  });

  document.addEventListener("click", (e) => {
    if (open && !root.contains(e.target as Node)) setOpen(false);
  });

  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) {
      setOpen(false);
      btn.focus();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return setOpen(true);
      cursor = (cursor + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
      paintCursor();
      options[cursor].scrollIntoView({ block: "nearest" });
      return;
    }
    if ((e.key === "Enter" || e.key === " ") && open) {
      e.preventDefault();
      choose(cursor);
    }
  });

  paintCursor();
}

/** Подложка выделения «плавает» между элементами, а не перескакивает. */
function floatTo(ind: HTMLElement | null, el: HTMLElement | null, instant = false) {
  if (!ind || !el) return;
  const x = el.offsetLeft;
  const y = el.offsetTop;
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  if (instant || reduced) {
    gsap.set(ind, { x, y, width: w, height: h, opacity: 1 });
    return;
  }
  gsap.to(ind, {
    x,
    y,
    width: w,
    height: h,
    opacity: 1,
    duration: 0.5,
    ease: "expo.out",
    overwrite: "auto",
  });
}

/**
 * Запись. Инлайн-виджет (лента дней + слоты) и модальный календарь работают
 * с общим состоянием: выбор в одном отражается в другом. Выделение у дат и у
 * времени плавает одинаковой подложкой.
 */
function initBooking() {
  const strip = document.getElementById("dayStrip");
  const track = document.getElementById("dayTrack");
  const dayInd = document.getElementById("dayInd");
  const slotWrap = document.getElementById("slotWrap");
  const slotInd = document.getElementById("slotInd");
  const summary = document.getElementById("bookingSummary");
  const monthEl = document.getElementById("calMonth");
  if (!strip || !track || !dayInd || !slotWrap) return;

  const wd = new Intl.DateTimeFormat("ru-RU", { weekday: "short" });
  const md = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });
  const mo = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" });
  const monthLabel = (d: Date) => {
    const s = mo.format(d).replace(/\s*г\.?$/, "");
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  // TODO: подставить реальное расписание клиники. Пока выходной — воскресенье.
  const isClosed = (d: Date) => d.getDay() === 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const state = {
    day: null as Date | null,
    slot: null as string | null,
    listeners: [] as (() => void)[],
  };
  const notify = () => state.listeners.forEach((fn) => fn());

  const setDay = (d: Date) => {
    state.day = d;
    notify();
  };
  const setSlot = (s: string) => {
    state.slot = s;
    notify();
  };

  // ── сводка ──
  const paintSummary = () => {
    if (!summary) return;
    if (state.day && state.slot) {
      summary.textContent = `${md.format(state.day)}, ${state.slot}`;
      summary.dataset.state = "filled";
    } else if (state.day) {
      summary.textContent = `${md.format(state.day)} — выберите время`;
      summary.dataset.state = "partial";
    } else {
      summary.textContent = "Выберите дату и время";
      summary.dataset.state = "empty";
    }
  };
  state.listeners.push(paintSummary);

  // ── инлайн-лента дней ──
  const days: { btn: HTMLButtonElement; date: Date }[] = [];
  for (let i = 0; i < 21; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const b = document.createElement("button");
    b.type = "button";
    b.className = "day" + (i === 0 ? " is-today" : "");
    b.disabled = isClosed(d);
    b.innerHTML = `
      <span class="day__wd">${wd.format(d).replace(".", "")}</span>
      <span class="day__n tnum">${d.getDate()}</span>
    `;
    if (!b.disabled) b.addEventListener("click", () => setDay(d));
    track.appendChild(b);
    days.push({ btn: b, date: d });
  }

  const paintDays = (instant = false) => {
    let active: HTMLButtonElement | null = null;
    days.forEach(({ btn, date }) => {
      const on = !!state.day && key(date) === key(state.day);
      btn.classList.toggle("is-active", on);
      if (on) active = btn;
    });
    if (active) {
      floatTo(dayInd, active, instant);
      if (monthEl && state.day) monthEl.textContent = monthLabel(state.day);
    }
  };
  state.listeners.push(() => paintDays(false));

  // ── инлайн-слоты ──
  const slots = [...slotWrap.querySelectorAll<HTMLButtonElement>(".slot")];
  slots.forEach((s) => {
    s.addEventListener("click", () => setSlot(s.dataset.slot ?? s.textContent?.trim() ?? ""));
  });
  const paintSlots = (instant = false) => {
    let active: HTMLButtonElement | null = null;
    slots.forEach((s) => {
      const on = (s.dataset.slot ?? "") === state.slot;
      s.classList.toggle("is-active", on);
      if (on) active = s;
    });
    if (active) floatTo(slotInd, active, instant);
    else gsap.set(slotInd, { opacity: 0 });
  };
  state.listeners.push(() => paintSlots(false));

  // первый рабочий день выбран сразу
  const firstOpen = days.find((d) => !d.btn.disabled);
  if (firstOpen) {
    state.day = firstOpen.date;
    if (monthEl) monthEl.textContent = monthLabel(firstOpen.date);
    requestAnimationFrame(() => {
      paintDays(true);
      paintSummary();
    });
  }

  // подложки не должны «уезжать» при ресайзе
  window.addEventListener("resize", () => {
    paintDays(true);
    paintSlots(true);
  });

  // стрелки прокрутки ленты
  const step = () => Math.max(strip.clientWidth * 0.7, 140);
  document.getElementById("calPrev")?.addEventListener("click", () => {
    strip.scrollBy({ left: -step(), behavior: reduced ? "auto" : "smooth" });
  });
  document.getElementById("calNext")?.addEventListener("click", () => {
    strip.scrollBy({ left: step(), behavior: reduced ? "auto" : "smooth" });
  });

  // ── модальный календарь ──
  initCalendarModal({
    today,
    monthLabel,
    md,
    isClosed,
    key,
    state,
    setDay,
    setSlot,
  });
}

interface CalCtx {
  today: Date;
  monthLabel: (d: Date) => string;
  md: Intl.DateTimeFormat;
  isClosed: (d: Date) => boolean;
  key: (d: Date) => string;
  state: { day: Date | null; slot: string | null; listeners: (() => void)[] };
  setDay: (d: Date) => void;
  setSlot: (s: string) => void;
}

/** Большой плавающий календарь-модалка, синхронный с инлайн-виджетом. */
function initCalendarModal(ctx: CalCtx) {
  const modal = document.getElementById("calModal");
  const backdrop = document.getElementById("calBackdrop");
  const openBtn = document.getElementById("calOpen");
  const closeBtn = document.getElementById("cmClose");
  const grid = document.getElementById("cmGrid");
  const dayInd = document.getElementById("cmDayInd");
  const slotWrap = document.getElementById("cmSlots");
  const slotInd = document.getElementById("cmSlotInd");
  const monthLabelEl = document.getElementById("cmMonth");
  const prev = document.getElementById("cmPrev");
  const next = document.getElementById("cmNext");
  const summary = document.getElementById("cmSummary");
  const apply = document.getElementById("cmApply") as HTMLButtonElement | null;
  if (!modal || !backdrop || !openBtn || !grid || !slotWrap) return;

  // показываем месяц выбранного дня, иначе текущий
  let view = new Date(ctx.state.day ?? ctx.today);
  view.setDate(1);

  const monthStart = new Date(ctx.today.getFullYear(), ctx.today.getMonth(), 1);
  const atFloor = () => view.getFullYear() === monthStart.getFullYear() && view.getMonth() === monthStart.getMonth();

  const renderMonth = () => {
    if (monthLabelEl) monthLabelEl.textContent = ctx.monthLabel(view);
    if (prev) (prev as HTMLButtonElement).disabled = atFloor();

    grid.querySelectorAll(".cm-day").forEach((n) => n.remove());

    const year = view.getFullYear();
    const month = view.getMonth();
    // пн=0 … вс=6
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDow; i++) {
      const empty = document.createElement("span");
      empty.className = "cm-day is-empty";
      grid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      date.setHours(0, 0, 0, 0);
      const past = date < ctx.today;
      const closed = ctx.isClosed(date);

      const b = document.createElement("button");
      b.type = "button";
      b.className = "cm-day";
      if (ctx.key(date) === ctx.key(ctx.today)) b.classList.add("is-today");
      b.disabled = past || closed;
      b.textContent = String(d);
      if (!b.disabled) b.addEventListener("click", () => ctx.setDay(date));
      grid.appendChild(b);
    }

    paintModalDays(true);
  };

  const paintModalDays = (instant = false) => {
    let active: HTMLElement | null = null;
    grid.querySelectorAll<HTMLButtonElement>(".cm-day:not(.is-empty)").forEach((b, idx) => {
      const date = new Date(view.getFullYear(), view.getMonth(), idx + 1);
      // idx здесь не совпадает с числом из-за пустых ячеек — берём из textContent
      const dayNum = Number(b.textContent);
      const real = new Date(view.getFullYear(), view.getMonth(), dayNum);
      real.setHours(0, 0, 0, 0);
      const on = !!ctx.state.day && ctx.key(real) === ctx.key(ctx.state.day);
      b.classList.toggle("is-active", on);
      if (on) active = b;
    });
    if (active) floatTo(dayInd, active, instant);
    else gsap.set(dayInd, { opacity: 0 });
  };

  const slots = [...slotWrap.querySelectorAll<HTMLButtonElement>(".cm-slot")];
  slots.forEach((s) => {
    s.addEventListener("click", () => ctx.setSlot(s.dataset.slot ?? ""));
  });
  const paintModalSlots = (instant = false) => {
    let active: HTMLElement | null = null;
    slots.forEach((s) => {
      const on = (s.dataset.slot ?? "") === ctx.state.slot;
      s.classList.toggle("is-active", on);
      if (on) active = s;
    });
    if (active) floatTo(slotInd, active, instant);
    else gsap.set(slotInd, { opacity: 0 });
  };

  const paintModalSummary = () => {
    if (!summary) return;
    if (ctx.state.day && ctx.state.slot) {
      summary.textContent = `${ctx.md.format(ctx.state.day)}, ${ctx.state.slot}`;
      summary.dataset.state = "filled";
      if (apply) apply.disabled = false;
    } else {
      summary.textContent = ctx.state.day
        ? `${ctx.md.format(ctx.state.day)} — выберите время`
        : "Выберите дату и время";
      summary.dataset.state = "partial";
      if (apply) apply.disabled = true;
    }
  };

  // модалка реагирует на общее состояние
  ctx.state.listeners.push(() => {
    if (modal.classList.contains("is-open")) {
      paintModalDays(false);
      paintModalSlots(false);
      paintModalSummary();
    }
  });

  prev?.addEventListener("click", () => {
    if (atFloor()) return;
    view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
    renderMonth();
  });
  next?.addEventListener("click", () => {
    view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
    renderMonth();
  });

  let open = false;
  const setOpen = (nextOpen: boolean) => {
    if (nextOpen === open) return;
    open = nextOpen;
    modal.classList.toggle("is-open", open);
    backdrop.classList.toggle("is-open", open);
    modal.setAttribute("aria-hidden", String(!open));
    openBtn.setAttribute("aria-expanded", String(open));
    lockScroll(open);

    if (open) {
      view = new Date(ctx.state.day ?? ctx.today);
      view.setDate(1);
      renderMonth();
      paintModalSlots(true);
      paintModalSummary();
    } else {
      (openBtn as HTMLButtonElement).focus();
    }
  };

  openBtn.addEventListener("click", () => setOpen(true));
  closeBtn?.addEventListener("click", () => setOpen(false));
  backdrop.addEventListener("click", () => setOpen(false));
  apply?.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) setOpen(false);
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
  initSelect();
  initBooking();
  initYear();
}
