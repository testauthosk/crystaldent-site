/**
 * Чат поддержки. Раскрытие и сворачивание сделаны на CSS-переходах
 * (см. ChatPanel.astro): панель растёт из угла сначала вширь, потом ввысь.
 * Здесь — только состояние, фокус и отправка сообщений.
 */
import { lockScroll } from "./scroll";

export function initChat() {
  const panel = document.getElementById("chatPanel");
  const backdrop = document.getElementById("chatBackdrop");
  const openBtn = document.getElementById("fabChat");
  const closeBtn = document.getElementById("chatClose");
  const form = document.getElementById("chatForm") as HTMLFormElement | null;
  const input = document.getElementById("chatInput") as HTMLInputElement | null;
  const msgs = document.getElementById("chatMsgs");
  if (!panel || !backdrop || !openBtn) return;

  let open = false;

  const setOpen = (next: boolean) => {
    if (next === open) return;
    open = next;

    panel.classList.toggle("is-open", open);
    backdrop.classList.toggle("is-open", open);
    panel.setAttribute("aria-hidden", String(!open));
    openBtn.setAttribute("aria-expanded", String(open));
    // кнопка прячется, пока панель развёрнута: она буквально стала панелью
    openBtn.style.opacity = open ? "0" : "";
    openBtn.style.pointerEvents = open ? "none" : "";
    lockScroll(open);

    if (open) {
      // ждём, пока панель дорастёт, и только потом ставим фокус
      window.setTimeout(() => input?.focus(), 900);
    } else {
      (openBtn as HTMLButtonElement).focus();
    }
  };

  openBtn.addEventListener("click", () => setOpen(true));
  closeBtn?.addEventListener("click", () => setOpen(false));
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
