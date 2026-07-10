/**
 * Единая точка знания о том, кто скроллер.
 *
 * На мобильных body зафиксирован, а страница скроллится внутри #scrollRoot
 * (см. global.css). Так браузер не сворачивает адресную строку, вьюпорт не
 * меняет высоту — и сайт не дёргается при прокрутке вверх. Значит и Lenis,
 * и ScrollTrigger, и слушатели должны читать прокрутку у этого контейнера,
 * а не у окна.
 */

export const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const finePointer = window.matchMedia("(pointer: fine)").matches;

const lockedScroll = window.matchMedia("(max-width: 900px)").matches;

export const scrollRoot = document.getElementById("scrollRoot");
export const scrollContent = document.getElementById("scrollContent");
export const useRoot = lockedScroll && !!scrollRoot && !!scrollContent;

export const scrollTarget: HTMLElement | Window = useRoot ? scrollRoot! : window;

/** Текущая прокрутка. */
export const scrollPos = () => (useRoot ? scrollRoot!.scrollTop : window.scrollY);
/** Высота видимой области скроллера. */
export const viewH = () => (useRoot ? scrollRoot!.clientHeight : window.innerHeight);
/** Полная высота содержимого скроллера. */
export const fullH = () =>
  useRoot ? scrollRoot!.scrollHeight : document.documentElement.scrollHeight;

/** Прокрутить наверх. Медленно — резкий рывок читается дёшево. */
export function scrollToTop(fallbackSmooth = true) {
  if (useRoot) scrollRoot!.scrollTo({ top: 0, behavior: fallbackSmooth ? "smooth" : "auto" });
  else window.scrollTo({ top: 0, behavior: fallbackSmooth ? "smooth" : "auto" });
}

/** Блокировка прокрутки: при scroll-lock замок вешается на контейнер. */
export function lockScroll(on: boolean) {
  if (useRoot) scrollRoot!.classList.toggle("is-locked", on);
  else document.body.style.overflow = on ? "hidden" : "";
}
