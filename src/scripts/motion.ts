import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
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

/* ── Прелоадер: заливка знака + счётчик ─────────────────── */
function runPreloader(onDone: () => void) {
  const pre = document.getElementById("preloader");
  const mark = document.getElementById("preMark");
  const count = document.getElementById("preCount");
  if (!pre || !mark || !count) {
    onDone();
    return;
  }

  if (reduced) {
    pre.remove();
    onDone();
    return;
  }

  const state = { v: 0 };
  gsap
    .timeline()
    .to(state, {
      v: 100,
      duration: 1.15,
      ease: "power2.inOut",
      onUpdate: () => {
        const v = Math.round(state.v);
        count.textContent = String(v);
        mark.style.setProperty("--fill", `${v}%`);
      },
    })
    .to(".pre-inner", { opacity: 0, y: -14, duration: 0.35, ease: "power2.in" }, "+=0.12")
    .to(pre, {
      yPercent: -100,
      duration: 0.9,
      ease: "expo.inOut",
      onComplete: () => {
        pre.remove();
        onDone();
      },
    });
}

/* ── Hero: построчный вылет из-под маски ────────────────── */
function heroIntro() {
  const lines = gsap.utils.toArray<HTMLElement>("[data-hero-line] .line-inner");
  const tl = gsap.timeline();

  if (reduced) {
    gsap.set("[data-hero-fade]", { opacity: 1, y: 0 });
    return tl;
  }

  tl.from(lines, {
    yPercent: 112,
    duration: 1.05,
    ease: "expo.out",
    stagger: 0.075,
  })
    .to(
      "[data-hero-fade]",
      { opacity: 1, y: 0, duration: 0.7, ease: "expo.out", stagger: 0.07 },
      "-=0.7",
    )
    .from(
      "[data-hero-rule]",
      { scaleX: 0, transformOrigin: "left center", duration: 0.9, ease: "expo.out" },
      "-=0.75",
    );

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
        duration: 0.65,
        ease: "expo.out",
        stagger: 0.07,
        overwrite: true,
      }),
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
  initLenis();
  initUI();
  initReveals();
  initParallax();
  initDraw();
  initSpin();
  initCounters();
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
