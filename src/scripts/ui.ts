/** Интерактив: мобильное меню, FAQ-аккордеон, дропдаун услуги, календарь записи. */
import gsap from "gsap";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

/** Календарь: 21 день вперёд, выделение «плавает» между числами. */
function initBooking() {
  const strip = document.getElementById("dayStrip");
  const track = document.getElementById("dayTrack");
  const ind = document.getElementById("dayInd");
  const slotWrap = document.getElementById("slotWrap");
  const summary = document.getElementById("bookingSummary");
  const monthEl = document.getElementById("calMonth");
  if (!strip || !track || !ind || !slotWrap) return;

  const wd = new Intl.DateTimeFormat("ru-RU", { weekday: "short" });
  const md = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });
  const mo = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" });
  /** «июль 2026 г.» → «Июль 2026» */
  const monthLabel = (d: Date) => {
    const s = mo.format(d).replace(/\s*г\.?$/, "");
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
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

  /** Двигает подложку под выбранный день. Плавает, а не перескакивает. */
  const moveIndicator = (btn: HTMLElement, instant = false) => {
    const x = btn.offsetLeft;
    const w = btn.offsetWidth;
    if (instant || reduced) {
      gsap.set(ind, { x, width: w, opacity: 1 });
      return;
    }
    gsap.to(ind, { x, width: w, opacity: 1, duration: 0.55, ease: "expo.out", overwrite: "auto" });
  };

  const days: HTMLButtonElement[] = [];

  for (let i = 0; i < 21; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const isSunday = d.getDay() === 0;

    const b = document.createElement("button");
    b.type = "button";
    b.className = "day" + (i === 0 ? " is-today" : "");
    b.disabled = isSunday; // TODO: подставить реальное расписание клиники
    b.innerHTML = `
      <span class="day__wd">${wd.format(d).replace(".", "")}</span>
      <span class="day__n tnum">${d.getDate()}</span>
    `;

    if (!isSunday) {
      b.addEventListener("click", () => {
        track.querySelectorAll(".day").forEach((x) => x.classList.remove("is-active"));
        b.classList.add("is-active");
        chosenDay = d;
        moveIndicator(b);
        if (monthEl) monthEl.textContent = monthLabel(d);
        paint();
      });
    }
    track.appendChild(b);
    days.push(b);
  }

  // первый рабочий день выбран сразу, подложка встаёт под него без анимации
  const first = days.find((d) => !d.disabled);
  if (first) {
    first.classList.add("is-active");
    chosenDay = new Date(today);
    chosenDay.setDate(today.getDate() + days.indexOf(first));
    if (monthEl) monthEl.textContent = monthLabel(chosenDay);
    requestAnimationFrame(() => moveIndicator(first, true));
    paint();
  }

  // подложка не должна «уезжать» при ресайзе
  window.addEventListener("resize", () => {
    const active = track.querySelector<HTMLElement>(".day.is-active");
    if (active) moveIndicator(active, true);
  });

  // стрелки прокрутки ленты
  const step = () => Math.max(strip.clientWidth * 0.7, 140);
  document.getElementById("calPrev")?.addEventListener("click", () => {
    strip.scrollBy({ left: -step(), behavior: reduced ? "auto" : "smooth" });
  });
  document.getElementById("calNext")?.addEventListener("click", () => {
    strip.scrollBy({ left: step(), behavior: reduced ? "auto" : "smooth" });
  });

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
  initSelect();
  initBooking();
  initYear();
}
