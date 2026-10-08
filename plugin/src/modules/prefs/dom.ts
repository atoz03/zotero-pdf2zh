// Small DOM helpers for the settings pane. The pane lives in a XUL document,
// so HTML elements must be created with an explicit namespace.

const HTML_NS = "http://www.w3.org/1999/xhtml";
const SVG_NS = "http://www.w3.org/2000/svg";

type Child = Node | string | null | undefined | false;
type AttrValue =
    | string
    | number
    | boolean
    | null
    | undefined
    | ((event: any) => void);

/**
 * Create an HTML element. `on*` attributes become event listeners, `text`
 * sets textContent and `value` is assigned after the children exist (a
 * `<select>` can only take a value once its options are in place).
 */
export function h<K extends keyof HTMLElementTagNameMap>(
    doc: Document,
    tag: K,
    attrs: Record<string, AttrValue> = {},
    ...children: Child[]
): HTMLElementTagNameMap[K] {
    const element = doc.createElementNS(HTML_NS, tag) as any;
    let value: AttrValue;
    for (const [name, attr] of Object.entries(attrs)) {
        if (attr === null || attr === undefined || attr === false) continue;
        if (typeof attr === "function") {
            element.addEventListener(name.slice(2), attr);
        } else if (name === "value") {
            value = attr;
        } else if (name === "text") {
            element.textContent = String(attr);
        } else if (name === "class") {
            element.className = String(attr);
        } else {
            element.setAttribute(name, attr === true ? "" : String(attr));
        }
    }
    for (const child of children) {
        if (child === null || child === undefined || child === false) continue;
        element.append(child);
    }
    if (value !== undefined) element.value = String(value);
    return element;
}

export function clear(element: Element) {
    element.replaceChildren();
}

const ICON_PATHS = {
    plus: "M8 3.5v9M3.5 8h9",
    edit: "M10.8 2.7l2.5 2.5L5.5 13H3v-2.5l7.8-7.8z",
    trash: "M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.5 8.5h6l.5-8.5M6.8 7v4M9.2 7v4",
    copy: "M5.5 5.5v-2h7v7h-2M3.5 5.5h7v7h-7z",
    eye: "M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8s-2.4 4.5-6.5 4.5S1.5 8 1.5 8zM8 10a2 2 0 100-4 2 2 0 000 4z",
    down: "M4 6l4 4 4-4",
    close: "M4 4l8 8M12 4l-8 8",
};

export type IconName = keyof typeof ICON_PATHS;

export function icon(doc: Document, name: IconName): SVGSVGElement {
    const svg = doc.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.4");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    const path = doc.createElementNS(SVG_NS, "path");
    path.setAttribute("d", ICON_PATHS[name]);
    svg.append(path);
    return svg;
}

/** "zh" for any Chinese Zotero locale, otherwise "en". */
export function uiLanguage(): "zh" | "en" {
    return String(Zotero.locale || "en-US")
        .toLowerCase()
        .startsWith("zh")
        ? "zh"
        : "en";
}

/**
 * Text input with a filterable suggestion list. HTML `<datalist>` popups do
 * not open in Zotero's chrome windows, so the list is rendered inline.
 */
export class Combobox {
    readonly root: HTMLDivElement;
    readonly input: HTMLInputElement;
    private readonly menu: HTMLDivElement;
    private readonly toggle: HTMLButtonElement;
    private options: string[] = [];
    private active = -1;

    constructor(
        private readonly doc: Document,
        attrs: Record<string, AttrValue> = {},
    ) {
        this.input = h(doc, "input", {
            class: "p2z-input",
            type: "text",
            spellcheck: "false",
            autocomplete: "off",
            role: "combobox",
            "aria-expanded": "false",
            ...attrs,
            oninput: () => this.open(true),
            onkeydown: (event: KeyboardEvent) => this.onKeyDown(event),
            onblur: () => this.close(),
        });
        this.toggle = h(
            doc,
            "button",
            {
                class: "p2z-combo-toggle",
                type: "button",
                tabindex: "-1",
                // Keep focus in the input so blur does not close the list.
                onmousedown: (event: Event) => event.preventDefault(),
                onclick: () => {
                    if (this.menu.hidden) {
                        this.input.focus();
                        this.open(false);
                    } else {
                        this.close();
                    }
                },
            },
            icon(doc, "down"),
        );
        this.menu = h(doc, "div", {
            class: "p2z-menu",
            role: "listbox",
            hidden: true,
            onmousedown: (event: Event) => event.preventDefault(),
        });
        this.root = h(
            doc,
            "div",
            { class: "p2z-combo" },
            this.input,
            this.toggle,
            this.menu,
        );
        this.setOptions([]);
    }

    get value(): string {
        return this.input.value.trim();
    }

    set value(value: string) {
        this.input.value = value;
    }

    setOptions(options: string[]) {
        this.options = [...new Set(options.filter(Boolean))];
        this.toggle.hidden = this.options.length === 0;
        if (!this.menu.hidden) this.open(false);
    }

    open(filter: boolean) {
        const query = filter ? this.input.value.trim().toLowerCase() : "";
        const matches = this.options.filter(
            (option) => !query || option.toLowerCase().includes(query),
        );
        clear(this.menu);
        this.active = -1;
        if (matches.length === 0) {
            this.close();
            return;
        }
        for (const option of matches) {
            this.menu.append(
                h(this.doc, "button", {
                    class: "p2z-menu-item",
                    type: "button",
                    role: "option",
                    tabindex: "-1",
                    title: option,
                    text: option,
                    onclick: () => this.pick(option),
                }),
            );
        }
        this.menu.hidden = false;
        this.input.setAttribute("aria-expanded", "true");
    }

    close() {
        this.menu.hidden = true;
        this.active = -1;
        this.input.setAttribute("aria-expanded", "false");
    }

    private pick(option: string) {
        this.input.value = option;
        this.close();
        this.input.dispatchEvent(
            new (this.doc.defaultView as any).Event("change", {
                bubbles: true,
            }),
        );
    }

    private onKeyDown(event: KeyboardEvent) {
        const items = Array.from(this.menu.children) as HTMLElement[];
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (this.menu.hidden) {
                this.open(false);
                return;
            }
            const step = event.key === "ArrowDown" ? 1 : -1;
            this.active =
                (this.active + step + items.length) % (items.length || 1);
            items.forEach((item, index) => {
                item.toggleAttribute("data-active", index === this.active);
            });
            items[this.active]?.scrollIntoView({ block: "nearest" });
        } else if (event.key === "Enter" && !this.menu.hidden) {
            const item = items[this.active];
            if (item) {
                event.preventDefault();
                this.pick(item.textContent || "");
            }
        } else if (event.key === "Escape" && !this.menu.hidden) {
            event.preventDefault();
            event.stopPropagation();
            this.close();
        }
    }
}
