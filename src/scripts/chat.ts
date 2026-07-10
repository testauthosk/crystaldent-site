/**
 * Чат поддержки.
 *
 * Раскрытие и сворачивание живут на CSS-переходах (см. ChatPanel.astro):
 * панель растёт из угла кнопки сначала вширь, потом ввысь; закрытие идёт тем
 * же путём назад. Сама кнопка никуда не уезжает — её иконка на месте
 * превращается в крестик, он же и закрывает панель.
 */
import { lockScroll } from "./scroll";

export function initChat() {
  const panel = document.getElementById("chatPanel");
  const backdrop = document.getElementById("chatBackdrop");
  const toggle = document.getElementById("fabChat");
  const form = document.getElementById("chatForm") as HTMLFormElement | null;
  const input = document.getElementById("chatInput") as HTMLInputElement | null;
  const msgs = document.getElementById("chatMsgs");
  if (!panel || !backdrop || !toggle) return;

  let open = false;
  let focusTimer = 0;

  const setOpen = (next: boolean) => {
    if (next === open) return;
    open = next;

    panel.classList.toggle("is-open", open);
    backdrop.classList.toggle("is-open", open);
    panel.setAttribute("aria-hidden", String(!open));
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Закрыть чат" : "Открыть чат");
    lockScroll(open);

    window.clearTimeout(focusTimer);
    if (open) {
      // ждём, пока панель дорастёт, и только потом ставим фокус
      focusTimer = window.setTimeout(() => input?.focus(), 1100);
    } else {
      (toggle as HTMLButtonElement).focus();
    }
  };

  toggle.addEventListener("click", () => setOpen(!open));
  backdrop.addEventListener("click", () => setOpen(false));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) setOpen(false);
  });

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input?.value.trim();
    if (!text || !msgs) return;

    const own = document.createElement("p");
    own.className = "cp-m cp-m--own";
    own.textContent = text;
    msgs.appendChild(own);

    input!.value = "";
    msgs.scrollTop = msgs.scrollHeight;

    // TODO: подключить реальный канал. Пока честная заглушка, чтобы отправка
    // не выглядела «в пустоту».
    window.setTimeout(() => {
      const reply = document.createElement("p");
      reply.className = "cp-m";
      reply.textContent = "Сообщение получено. Администратор ответит в рабочие часы клиники.";
      msgs.appendChild(reply);
      msgs.scrollTop = msgs.scrollHeight;
    }, 900);
  });
}
