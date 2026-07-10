import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import SplitType from "split-type";
import { initUI } from "./ui";

gsap.registerPlugin(ScrollTrigger);

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

/* ── Инерционный скролл ─────────────────────────────────── */
function initLenis() {
  if (reduced) return null;

  const lenis = new Lenis({
    duration: 1.05,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    // на тач-устройствах нативный скролл — трогать momentum нельзя
    syncTouch: false,
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

  return lenis;
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

  document.body.style.overflow = "hidden";

  // Крупный квадрат на десктопе, мелкий на мобиле — по ТЗ.
  const vw = window.innerWidth;
  const tile = vw >= 1024 ? 68 : vw >= 640 ? 48 : 32;
  const cols = Math.ceil(vw / tile);
  const rows = Math.ceil(window.innerHeight / tile);

  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

  const frag = document.createDocumentFragment();
  for (let i = 0; i < rows * cols; i++) {
    const d = document.createElement("div");
    d.className = "tile";
    frag.appendChild(d);
  }
  grid.appendChild(frag);
  // экран теперь держат сами плитки — страховочный фон убираем,
  // иначе он останется сплошным после того, как они погаснут
  pre.style.background = "transparent";

  const tiles = grid.children;

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

  // Плитки НЕ вращаются. Волна — это подъём к зрителю плюс подсветка гребня;
  // сверху это читается как рябь на воде. Цвет задаём в hex, чтобы GSAP мог
  // его интерполировать (oklch он не смешивает).
  gsap.set(tiles, { backgroundColor: "#080f13", z: 0, transformPerspective: 1200 });

  gsap
    .timeline({
      onComplete: () => {
        pre.remove();
        document.body.style.overflow = "";
      },
    })
    // знак проявляется поверх сплошной сетки
    .to(mark, { opacity: 1, scale: 1, duration: 0.75, ease: "expo.out" })
    // гребень волны бежит к центру, следом плитка гаснет
    .to(
      tiles,
      {
        keyframes: [
          { z: 96, scale: 1.05, backgroundColor: "#1d2b33", duration: 0.3, ease: "sine.out" },
          { z: 12, scale: 1, backgroundColor: "#0d161b", duration: 0.28, ease: "sine.inOut" },
          { z: -24, scale: 0.94, opacity: 0, duration: 0.42, ease: "power2.out" },
        ],
        stagger: (i) => delayFor(i),
      },
      "+=0.2",
    )
    // знак остаётся один на открывшемся сайте, затем исчезает.
    // hero стартует вместе с его уходом — иначе повисает пустая белая плита.
    .to(
      mark,
      { opacity: 0, scale: 1.1, duration: 0.55, ease: "power2.inOut", onStart: onDone },
      ">-0.2",
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

/* ── Magnetic-кнопки ────────────────────────────────────── */
function initMagnetic() {
  if (reduced || !finePointer) return;

  document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
    const label = el.querySelector<HTMLElement>(".btn__label") ?? el;
    const xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "expo.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "expo.out" });
    const lxTo = gsap.quickTo(label, "x", { duration: 0.6, ease: "expo.out" });
    const lyTo = gsap.quickTo(label, "y", { duration: 0.6, ease: "expo.out" });

    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      xTo(dx * 0.28);
      yTo(dy * 0.4);
      lxTo(dx * 0.1);
      lyTo(dy * 0.14);
    });

    el.addEventListener("pointerleave", () => {
      xTo(0);
      yTo(0);
      lxTo(0);
      lyTo(0);
    });
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
  armHero();
  initLenis();
  initUI();
  initSplitTitles();
  initImageReveals();
  initReveals();
  initParallax();
  initDraw();
  initSpin();
  initCounters();
  initServicePreview();
  initMagnetic();
  initNav();
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
