import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import SplitType from "split-type";
import { initUI } from "./ui";
import { initChat } from "./chat";
import {
  reduced,
  finePointer,
  scrollRoot,
  scrollContent,
  useRoot,
  scrollTarget,
  scrollPos,
  viewH,
  fullH,
  lockScroll,
  registerLenis,
} from "./scroll";

gsap.registerPlugin(ScrollTrigger);

let lenisInstance: Lenis | null = null;

/* ── Инерционный скролл ─────────────────────────────────── */
function initLenis() {
  if (reduced) return null;

  const lenis = new Lenis({
    duration: 1.05,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    // на тач-устройствах нативный скролл — трогать momentum нельзя
    syncTouch: false,
    ...(useRoot ? { wrapper: scrollRoot!, content: scrollContent! } : {}),
  });

  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Якорные ссылки через Lenis
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -80 });
    });
  });

  lenisInstance = lenis;
  registerLenis(lenis);
  return lenis;
}

/* ── Плавающие кнопки у краёв окна ──────────────────────── */
function initFloating() {
  const chat = document.getElementById("fabChat");
  const stack = document.getElementById("fabStack");
  const top = document.getElementById("fabTop");
  const call = stack?.querySelector<HTMLElement>(".fab-call");
  if (!chat || !stack || !top || !call) return;

  // «Наверх» выезжает снизу и приподнимает кнопку звонка
  const size = () => call.offsetHeight;
  let shown = false;

  const toggleTop = (show: boolean) => {
    if (show === shown) return;
    shown = show;
    stack.classList.toggle("is-up", show);
    top.tabIndex = show ? 0 : -1;

    if (reduced) {
      top.style.height = show ? `${size()}px` : "0px";
      top.style.opacity = show ? "1" : "0";
      return;
    }
    gsap.to(top, {
      height: show ? size() : 0,
      opacity: show ? 1 : 0,
      duration: show ? 0.5 : 0.35,
      ease: show ? "expo.out" : "power2.in",
      overwrite: "auto",
    });
  };

  // Пока страница стоит на самом верху, кнопки убраны за нижний край —
  // первый экран остаётся чистым. Выезжают с первого же пикселя прокрутки.
  const toggleShown = (show: boolean) => {
    chat.classList.toggle("is-shown", show);
    stack.classList.toggle("is-shown", show);
  };

  // Прямой слушатель, а не ScrollTrigger без триггер-элемента: с Lenis такой
  // триггер не всегда переключается на мобильных.
  const onScroll = () => {
    const y = scrollPos();
    toggleShown(y > 0);
    toggleTop(y > viewH() * 0.8);
  };
  scrollTarget.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  top.addEventListener("click", () => {
    // подъём наверх намеренно неспешный — резкий рывок читается дёшево
    if (lenisInstance) lenisInstance.scrollTo(0, { duration: 2.2 });
    else if (useRoot) scrollRoot!.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    else window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  });

  // лёгкая пульсация рамкой — квадрат расходится и гаснет
  if (!reduced) {
    const pulse = chat.querySelector(".pulse");
    if (pulse) {
      gsap.fromTo(
        pulse,
        { scale: 1, opacity: 0.55 },
        {
          scale: 1.45,
          opacity: 0,
          duration: 1.6,
          ease: "power2.out",
          repeat: -1,
          repeatDelay: 1.1,
        },
      );
    }
  }
}

/* ── Прелоадер: 3D-волна плиток из четырёх углов к центру ── */
function runPreloader(onDone: () => void) {
  const pre = document.getElementById("preloader");
  const grid = document.getElementById("preTiles");
  const mark = document.getElementById("preMark");

  if (!pre || !grid || !mark) {
    onDone();
    return;
  }

  if (reduced) {
    pre.remove();
    onDone();
    return;
  }

  lockScroll(true);

  // Сетку уже построил inline-скрипт в Preloader.astro — забираем размеры оттуда
  const cols = Number(grid.dataset.cols);
  const rows = Number(grid.dataset.rows);
  const tiles = grid.children;

  if (!cols || !rows || !tiles.length) {
    pre.remove();
    lockScroll(false);
    onDone();
    return;
  }

  // Концентрические кольца, сходящиеся в центр: задержка тем больше, чем ближе
  // плитка к центру, поэтому фронт стартует в углах (они дальше всех) и
  // сходится в точку — как круги на воде, только в обратную сторону.
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const maxDist = Math.hypot(cx, cy);
  const SPREAD = 1.25;

  const delayFor = (index: number) => {
    const r = Math.floor(index / cols);
    const c = index % cols;
    const d = Math.hypot(c - cx, r - cy);
    return (1 - Math.min(d / maxDist, 1)) * SPREAD; // 0 в углах, SPREAD в центре
  };

  const markLit = document.getElementById("preMarkLit");

  // Метафора: чёрные зубы становятся белыми.
  // Гребень волны — вспышка белой окантовки, следом кубик схлопывается и
  // обнажает белое. Никаких градиентов: у кубика два состояния, чёрный и белый.
  gsap
    .timeline({
      onComplete: () => {
        pre.remove();
        lockScroll(false);
      },
    })
    .to(tiles, {
      keyframes: [
        { borderColor: "#f2f6f5", scale: 1.16, duration: 0.18, ease: "power2.out" },
        { scale: 0, duration: 0.34, ease: "power3.in" },
      ],
      stagger: (i) => delayFor(i),
    })
    // последний островок черноты — знак-зуб. Отбеливаем его снизу вверх.
    // Он не растворяется: у белого слоя есть тёмный контур, зуб остаётся виден.
    .to(markLit, { clipPath: "inset(0% 0 0 0)", duration: 0.75, ease: "power2.inOut" }, "+=0.35")
    // держим отбеленный зуб — это финальный кадр метафоры
    .to(
      pre,
      { clipPath: "inset(0% 0% 100% 0%)", duration: 0.75, ease: "expo.inOut", onStart: onDone },
      "+=0.55",
    );
}

/** Прячем hero заранее, иначе заголовок просвечивает сквозь уходящие плитки. */
function armHero() {
  if (reduced) return;
  gsap.set("[data-hero-line] .line-inner", { yPercent: 112 });
  gsap.set("[data-hero-rule]", { scaleX: 0, transformOrigin: "left center" });
}

/* ── Hero: построчный вылет из-под маски ────────────────── */
function heroIntro() {
  const lines = gsap.utils.toArray<HTMLElement>("[data-hero-line] .line-inner");
  const tl = gsap.timeline();

  if (reduced) {
    gsap.set("[data-hero-fade]", { opacity: 1, y: 0 });
    return tl;
  }

  tl.to(lines, {
    yPercent: 0,
    duration: 1.05,
    ease: "expo.out",
    stagger: 0.075,
  })
    .to(
      "[data-hero-fade]",
      { opacity: 1, y: 0, duration: 0.7, ease: "expo.out", stagger: 0.07 },
      "-=0.7",
    )
    .to("[data-hero-rule]", { scaleX: 1, duration: 0.9, ease: "expo.out" }, "-=0.75");

  return tl;
}

/* ── Общий reveal по скроллу ────────────────────────────── */
function initReveals() {
  if (reduced) return;

  ScrollTrigger.batch(".reveal", {
    start: "top 88%",
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.95,
        ease: "expo.out",
        stagger: 0.08,
        overwrite: true,
      }),
  });
}

/* ── Заголовки: построчный вылет из-под маски ───────────── */
function initSplitTitles() {
  const targets = gsap.utils.toArray<HTMLElement>("[data-split]");
  if (!targets.length) return;

  targets.forEach((el) => {
    const split = new SplitType(el, { types: "lines", lineClass: "s-line" });
    const lines = (split.lines ?? []) as HTMLElement[];

    // SplitType кладёт текст прямо в .s-line — заворачиваем во внутренний слой,
    // иначе маску не сделать: overflow нужен на родителе, transform на потомке
    lines.forEach((line) => {
      const inner = document.createElement("span");
      inner.className = "s-inner";
      while (line.firstChild) inner.appendChild(line.firstChild);
      line.appendChild(inner);
    });

    if (reduced) return;

    gsap.fromTo(
      lines.map((l) => l.querySelector(".s-inner")),
      { yPercent: 108 },
      {
        yPercent: 0,
        duration: 1.05,
        ease: "expo.out",
        stagger: 0.08,
        scrollTrigger: { trigger: el, start: "top 86%", once: true },
      },
    );
  });
}

/* ── Изображения: раскрытие маской, а не fade ───────────── */
function initImageReveals() {
  if (reduced) return;

  gsap.utils.toArray<HTMLElement>("[data-img-reveal]").forEach((wrap) => {
    const img = wrap.querySelector("img");
    const tl = gsap.timeline({
      scrollTrigger: { trigger: wrap, start: "top 88%", once: true },
    });
    tl.fromTo(
      wrap,
      { clipPath: "inset(0% 0% 100% 0%)" },
      { clipPath: "inset(0% 0% 0% 0%)", duration: 1.15, ease: "expo.out" },
    );
    if (img) tl.fromTo(img, { scale: 1.14 }, { scale: 1, duration: 1.4, ease: "expo.out" }, 0);
  });
}

/* ── Параллакс изображений/плашек ───────────────────────── */
function initParallax() {
  if (reduced) return;

  gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
    const strength = Number(el.dataset.parallax || 12);
    gsap.fromTo(
      el,
      { yPercent: -strength / 2 },
      {
        yPercent: strength / 2,
        ease: "none",
        scrollTrigger: { trigger: el, scrub: true, start: "top bottom", end: "bottom top" },
      },
    );
  });
}

/* ── Blueprint: линии-выноски дорисовываются ────────────── */
function initDraw() {
  gsap.utils.toArray<SVGGeometryElement>("[data-draw]").forEach((path) => {
    const len = path.getTotalLength?.() ?? 0;
    if (!len) return;
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: reduced ? 0 : len });
    if (reduced) return;
    gsap.to(path, {
      strokeDashoffset: 0,
      duration: 1.1,
      ease: "power2.out",
      scrollTrigger: { trigger: path, start: "top 85%", once: true },
    });
  });
}

/* ── Счётчик осмотра 0→360° по скроллу панели ───────────── */
function initSpin() {
  const readout = document.querySelector<HTMLElement>("[data-spin-readout]");
  const scope = readout?.closest<HTMLElement>("[data-spin-scope]");
  if (!readout || !scope) return;

  if (reduced) {
    readout.textContent = "360°";
    return;
  }

  const st = { deg: 0 };
  gsap.to(st, {
    deg: 360,
    ease: "none",
    scrollTrigger: { trigger: scope, start: "top 85%", end: "bottom 25%", scrub: 0.6 },
    onUpdate: () => {
      readout.textContent = `${Math.round(st.deg)}°`;
    },
  });
}

/* ── Счётчики (tabular) ─────────────────────────────────── */
function initCounters() {
  gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target)) return; // «—» плейсхолдер — не трогаем
    if (reduced) {
      el.textContent = String(target);
      return;
    }
    const obj = { v: 0 };
    gsap.to(obj, {
      v: target,
      duration: 1.4,
      ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
      onUpdate: () => {
        el.textContent = String(Math.round(obj.v));
      },
    });
  });
}

/* ── Список услуг: превью летит за курсором ─────────────── */
function initServicePreview() {
  const preview = document.getElementById("srvPreview");
  const list = document.getElementById("srvList");
  if (!preview || !list || reduced || !finePointer) return;

  const imgs = new Map<string, HTMLImageElement>();
  preview.querySelectorAll<HTMLImageElement>("[data-preview]").forEach((img) => {
    imgs.set(img.dataset.preview!, img);
  });

  // квадратные «шторки» вместо fade — та же пластика, что у прелоадера
  const xTo = gsap.quickTo(preview, "x", { duration: 0.55, ease: "power3.out" });
  const yTo = gsap.quickTo(preview, "y", { duration: 0.55, ease: "power3.out" });
  let active: HTMLImageElement | null = null;

  const w = () => preview.offsetWidth / 2;
  const h = () => preview.offsetHeight / 2;

  list.addEventListener("pointermove", (e) => {
    xTo(e.clientX - w());
    yTo(e.clientY - h());
  });

  list.querySelectorAll<HTMLElement>("[data-srv]").forEach((row) => {
    row.addEventListener("pointerenter", (e) => {
      const img = imgs.get(row.dataset.srv!);
      if (!img) return;
      // без анимации позиции при первом входе — иначе превью «прилетает» через экран
      gsap.set(preview, { x: e.clientX - w(), y: e.clientY - h() });
      if (active && active !== img) gsap.to(active, { opacity: 0, duration: 0.25 });
      active = img;
      gsap.to(img, { opacity: 1, duration: 0.3 });
      gsap.to(preview, { opacity: 1, duration: 0.3, ease: "power2.out" });
      gsap.fromTo(
        preview,
        { clipPath: "inset(50% 0% 50% 0%)" },
        { clipPath: "inset(0% 0% 0% 0%)", duration: 0.55, ease: "expo.out" },
      );
    });
  });

  list.addEventListener("pointerleave", () => {
    gsap.to(preview, { opacity: 0, duration: 0.3, ease: "power2.out" });
    if (active) gsap.to(active, { opacity: 0, duration: 0.3 });
    active = null;
  });
}

/* ── Шапка: фон появляется после отрыва от верха ────────── */
function initNav() {
  const nav = document.getElementById("nav");
  if (!nav) return;
  ScrollTrigger.create({
    start: 40,
    end: "max",
    onToggle: (self) => nav.classList.toggle("is-stuck", self.isActive),
  });
}

/* ── Подпись в подвале засвечивается по мере упора в низ ── */
function initWordmarkGlow() {
  const wrap = document.getElementById("fWordmark");
  const lit = document.getElementById("fWordLit");
  if (!wrap || !lit) return;

  if (reduced) {
    lit.style.clipPath = "inset(0 0 0 0)";
    wrap.classList.add("is-lit");
    return;
  }

  const tween = gsap.fromTo(
    lit,
    { clipPath: "inset(0 100% 0 0)" },
    {
      clipPath: "inset(0 0% 0 0)",
      ease: "none",
      scrollTrigger: {
        trigger: wrap,
        start: "top bottom",
        // конец привязан к низу контента: свет заполняет надпись ровно в тот
        // момент, когда упёрлись в самый низ. При scroll-lock body имеет
        // высоту вьюпорта, поэтому меряем по реальному контейнеру контента.
        endTrigger: scrollContent ?? document.body,
        end: "bottom bottom",
        scrub: 0.5,
        invalidateOnRefresh: true,
        onUpdate: (self) => wrap.classList.toggle("is-lit", self.progress > 0.98),
      },
    },
  );

  // Страховка: дожигаем свет по факту достижения дна. Даже со scroll-lock
  // scrub может не дотянуть progress до единицы из-за округлений.
  const atBottom = () => viewH() + scrollPos() >= fullH() - 2;

  const check = () => {
    if (!atBottom()) return;
    tween.scrollTrigger?.refresh();
    gsap.to(lit, { clipPath: "inset(0 0% 0 0)", duration: 0.35, ease: "power2.out", overwrite: "auto" });
    wrap.classList.add("is-lit");
  };

  scrollTarget.addEventListener("scroll", check, { passive: true });
  window.addEventListener("resize", () => ScrollTrigger.refresh());
}

/* ── Прогресс-полоса чтения ─────────────────────────────── */
function initProgress() {
  const bar = document.getElementById("progress");
  if (!bar || reduced) return;
  gsap.to(bar, {
    scaleX: 1,
    ease: "none",
    scrollTrigger: { start: 0, end: "max", scrub: 0.2 },
  });
}

/* ── Старт ──────────────────────────────────────────────── */
function boot() {
  // ScrollTrigger должен смотреть в тот же скроллер, что и Lenis
  if (useRoot) ScrollTrigger.defaults({ scroller: scrollRoot! });

  armHero();
  initLenis();
  initUI();
  initChat();
  initSplitTitles();
  initImageReveals();
  initReveals();
  initParallax();
  initDraw();
  initSpin();
  initCounters();
  initServicePreview();
  initNav();
  initFloating();
  initWordmarkGlow();
  initProgress();

  runPreloader(() => {
    heroIntro();
    ScrollTrigger.refresh();
  });

  // шрифты меняют метрику — пересчитать триггеры
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
