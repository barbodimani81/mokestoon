/** A shared native dialog keeps focus, Escape and background taps consistent. */
export class Popup {
  readonly element = document.createElement("dialog");
  readonly title = document.createElement("h2");
  readonly body = document.createElement("div");
  readonly back = document.createElement("button");
  constructor(label: string, onClose?: () => void) {
    this.element.className = "game-popup";
    this.element.setAttribute("aria-label", label);
    this.back.type = "button";
    this.back.textContent = label;
    this.back.onclick = () => this.close();
    this.element.append(this.title, this.body, this.back);
    document.body.append(this.element);
    this.element.addEventListener("close", () => {
      if (!this.element.open) onClose?.();
    });
  }
  open(title: string) {
    this.title.textContent = title;
    this.element.setAttribute("aria-label", title);
    this.body.replaceChildren();
    if (!this.element.open) this.element.showModal();
  }
  close() {
    if (this.element.open) this.element.close();
  }
}
