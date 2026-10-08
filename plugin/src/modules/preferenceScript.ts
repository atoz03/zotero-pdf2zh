// Controller of the settings pane (addon/content/preferences.xhtml).

import { config, version as pluginVersion } from "../../package.json";
import { getString } from "../utils/locale";
import { getPref, setPref } from "../utils/prefs";
import {
    LLMApiData,
    activateLLMApi,
    emptyLLMApi,
    getActiveLLMApiByService,
    llmApiDisplayName,
    maskApiKey,
    upsertLLMApi,
} from "./llmApiManager";
import { loadLLMApisFromPrefs, saveLLMApisToPrefs } from "./llmApiStore";
import {
    COMMON_LANGUAGES,
    ENGINES,
    EngineId,
    LANGUAGES,
    SERVICES,
    getService,
    languageName,
    serviceFields,
    serviceLabel,
    servicePrefKey,
    serviceSupportsEngine,
} from "./serviceCatalog";
import { IconName, clear, h, icon } from "./prefs/dom";
import { ProfileEditor } from "./prefs/profileEditor";
import { normalizeServerUrl, probeServer } from "./prefs/serverCheck";

const CUSTOM_LANGUAGE = "__custom__";
const DEFAULT_SERVICE: Record<EngineId, string> = {
    pdf2zh: "bing",
    pdf2zh_next: "siliconflowfree",
};
// Server capability advertised by /health once it honours termPoolSize.
const FEATURE_TERM_CONCURRENCY = "term-concurrency";
const DELETE_CONFIRM_MS = 3000;

const t = (key: string, args?: Record<string, unknown>) =>
    getString(`prefs-${key}`, { args });

export async function registerPrefsScripts(win: Window) {
    addon.data.prefs = { window: win };
    const root = win.document
        .getElementById(`${config.addonRef}-prefs`)
        ?.querySelector(".p2z");
    if (!root) return;
    new PreferencePane(win, root as HTMLElement).init();
}

class PreferencePane {
    private readonly doc: Document;
    private profiles: LLMApiData[] = [];
    // The open editor; key is "" while creating a new profile.
    private editor: { key: string; form: ProfileEditor } | null = null;
    private probeToken = 0;

    constructor(
        private readonly win: Window,
        private readonly root: HTMLElement,
    ) {
        this.doc = win.document;
    }

    init() {
        this.profiles = loadLLMApisFromPrefs();
        this.bindPrefControls();
        this.initEngine();
        this.initLanguages();
        this.initService();
        this.initProfiles();
        this.initOutputs();
        this.initFontFile();
        this.initLinks();
        this.initServer();
        this.syncDerivedState();
    }

    private $<T extends HTMLElement = HTMLElement>(id: string): T {
        return this.doc.getElementById(`${config.addonRef}-${id}`) as T;
    }

    // ------------------------------------------------------------------
    // Plain preference controls: every element with data-pref
    // ------------------------------------------------------------------

    private bindPrefControls() {
        this.root.querySelectorAll("[data-pref]").forEach((node) => {
            const control = node as HTMLInputElement;
            const key = control.getAttribute("data-pref")!;
            const stored = getPref(key);

            if (control.type === "checkbox") {
                // data-invert: the switch reads as the opposite of the pref.
                const invert = control.hasAttribute("data-invert");
                control.checked = Boolean(stored) !== invert;
                control.addEventListener("change", () => {
                    setPref(key, control.checked !== invert);
                    this.syncDerivedState();
                });
            } else if (control.type === "number") {
                control.value = String(stored ?? control.min ?? 0);
                control.addEventListener("change", () => {
                    const min = Number(control.min || 0);
                    const max = Number(control.max || Number.MAX_SAFE_INTEGER);
                    let value = Math.round(Number(control.value));
                    if (
                        control.value.trim() === "" ||
                        !Number.isFinite(value)
                    ) {
                        value = Number(getPref(key)) || min;
                    }
                    value = Math.min(max, Math.max(min, value));
                    control.value = String(value);
                    setPref(key, value);
                });
            } else {
                control.value = String(stored ?? "");
                const save = () => setPref(key, control.value.trim());
                control.addEventListener("input", save);
                control.addEventListener("change", save);
            }
        });
    }

    /** UI state that follows from preferences rather than being stored. */
    private syncDerivedState() {
        this.root.setAttribute(
            "data-glossary",
            getPref("disableGlossary") ? "off" : "on",
        );
    }

    // ------------------------------------------------------------------
    // Engine
    // ------------------------------------------------------------------

    private get engine(): EngineId {
        return getPref("engine") === "pdf2zh" ? "pdf2zh" : "pdf2zh_next";
    }

    private get currentService(): string {
        const engine = this.engine;
        const value = String(getPref(servicePrefKey(engine)) || "").trim();
        return value || DEFAULT_SERVICE[engine];
    }

    private initEngine() {
        // Older versions had a free-text engine box; repair anything unknown.
        if (!ENGINES.includes(String(getPref("engine")) as EngineId)) {
            setPref("engine", "pdf2zh_next");
        }
        const buttons = Array.from(
            this.$("engine").querySelectorAll("button"),
        ) as HTMLButtonElement[];
        const apply = () => {
            const engine = this.engine;
            this.root.setAttribute("data-engine", engine);
            for (const button of buttons) {
                button.setAttribute(
                    "aria-checked",
                    String(button.getAttribute("data-engine-value") === engine),
                );
            }
        };
        for (const button of buttons) {
            button.addEventListener("click", () => {
                setPref("engine", button.getAttribute("data-engine-value")!);
                apply();
                this.renderService();
                this.renderProfiles();
            });
        }
        apply();
    }

    // ------------------------------------------------------------------
    // Languages
    // ------------------------------------------------------------------

    private initLanguages() {
        const doc = this.doc;
        const locale = String(Zotero.locale || "en-US");
        const option = (code: string) =>
            h(doc, "option", {
                value: code,
                text: `${languageName(code, locale)} (${code})`,
            });
        const others = Object.keys(LANGUAGES)
            .filter((code) => !COMMON_LANGUAGES.includes(code))
            .map((code) => ({ code, name: languageName(code, locale) }))
            .sort((a, b) => a.name.localeCompare(b.name, locale));

        const setup = (key: "sourceLang" | "targetLang", fallback: string) => {
            const select = this.$<HTMLSelectElement>(key);
            const custom = this.$<HTMLInputElement>(`${key}-custom`);
            select.append(
                h(
                    doc,
                    "optgroup",
                    { label: t("lang-common") },
                    ...COMMON_LANGUAGES.map(option),
                ),
                h(
                    doc,
                    "optgroup",
                    { label: t("lang-all") },
                    ...others.map(({ code }) => option(code)),
                ),
                h(doc, "option", {
                    value: CUSTOM_LANGUAGE,
                    text: t("lang-custom"),
                }),
            );
            const show = (code: string) => {
                const known = code in LANGUAGES;
                select.value = known ? code : CUSTOM_LANGUAGE;
                custom.hidden = known;
                custom.value = known ? "" : code;
            };
            select.addEventListener("change", () => {
                if (select.value === CUSTOM_LANGUAGE) {
                    // Nothing is saved until a code has been typed.
                    custom.hidden = false;
                    custom.value = "";
                    custom.focus();
                    return;
                }
                setPref(key, select.value);
                show(select.value);
            });
            custom.addEventListener("change", () => {
                const code = custom.value.trim();
                if (code.length >= 2) setPref(key, code);
                show(String(getPref(key) || fallback));
            });
            show(String(getPref(key) || fallback));
            return show;
        };

        const showSource = setup("sourceLang", "en");
        const showTarget = setup("targetLang", "zh-CN");
        this.$("swapLang").addEventListener("click", () => {
            const source = String(getPref("sourceLang") || "en");
            const target = String(getPref("targetLang") || "zh-CN");
            setPref("sourceLang", target);
            setPref("targetLang", source);
            showSource(target);
            showTarget(source);
        });
    }

    // ------------------------------------------------------------------
    // Translation service
    // ------------------------------------------------------------------

    private displayName(profile: LLMApiData): string {
        return llmApiDisplayName(profile, serviceLabel(profile.service));
    }

    private initService() {
        const select = this.$<HTMLSelectElement>("serviceSelect");
        select.addEventListener("change", () => {
            const value = select.value;
            if (value.startsWith("p:")) {
                this.useProfile(value.slice(2));
                return;
            }
            setPref(servicePrefKey(this.engine), value.slice(2));
            this.renderService();
            this.renderProfiles();
        });
        this.renderService();
    }

    /**
     * One list for everything that can translate: the user's named profiles
     * first, then services that need no setup, then the remaining providers.
     */
    private renderService() {
        const doc = this.doc;
        const select = this.$<HTMLSelectElement>("serviceSelect");
        const engine = this.engine;
        const current = this.currentService;
        const active = getActiveLLMApiByService(this.profiles, current);
        const group = (label: string, options: HTMLOptionElement[]) =>
            options.length > 0 &&
            select.append(h(doc, "optgroup", { label }, ...options));
        clear(select);

        group(
            t("group-profiles"),
            this.profiles.map((profile) => {
                const supported = serviceSupportsEngine(
                    profile.service,
                    engine,
                );
                const name = this.displayName(profile);
                return h(doc, "option", {
                    value: `p:${profile.key}`,
                    text: supported ? name : t("service-unsupported", { name }),
                    disabled: !supported,
                });
            }),
        );

        const builtin = SERVICES.filter(
            (service) => service.builtin && service.engines.includes(engine),
        );
        group(
            t("group-builtin"),
            builtin.map((service) =>
                h(doc, "option", {
                    value: `s:${service.id}`,
                    text: service.name,
                }),
            ),
        );

        const withProfile = new Set(
            this.profiles.map((profile) => profile.service),
        );
        const others = SERVICES.filter(
            (service) =>
                !service.builtin &&
                service.engines.includes(engine) &&
                !withProfile.has(service.id),
        ).map((service) => service.id);
        // Keep whatever is stored selectable, even a custom or legacy id.
        if (
            !active &&
            !others.includes(current) &&
            !builtin.some((service) => service.id === current)
        ) {
            others.unshift(current);
        }
        group(
            t("group-other"),
            others.map((id) =>
                h(doc, "option", { value: `s:${id}`, text: serviceLabel(id) }),
            ),
        );

        select.value = active ? `p:${active.key}` : `s:${current}`;
        this.renderServiceHint();
    }

    private renderServiceHint() {
        const doc = this.doc;
        const hint = this.$("service-hint");
        const engine = this.engine;
        const service = this.currentService;
        const name = serviceLabel(service);
        const meta = getService(service);
        const active = getActiveLLMApiByService(this.profiles, service);
        const link = (text: string, onclick: () => void) =>
            h(doc, "button", {
                class: "p2z-link",
                type: "button",
                text,
                onclick,
            });
        let tone = "info";
        clear(hint);

        if (!serviceSupportsEngine(service, engine)) {
            tone = "warn";
            hint.append(t("service-hint-unsupported", { name, engine }));
        } else if (active) {
            const missingKey = this.needsApiKey(active) && !active.apiKey;
            if (missingKey) tone = "warn";
            hint.append(
                [
                    name,
                    active.model,
                    hostOf(active.apiUrl),
                    missingKey
                        ? t("profile-no-key")
                        : maskApiKey(active.apiKey),
                ]
                    .filter(Boolean)
                    .join(" · "),
                link(t("service-edit"), () => this.openEditor(active.key)),
            );
        } else if (meta?.builtin) {
            hint.append(
                t(
                    service === "siliconflowfree"
                        ? "service-hint-free"
                        : "service-hint-builtin",
                ),
            );
        } else {
            tone = "warn";
            hint.append(
                t("service-hint-missing", { name }),
                link(t("service-create"), () => this.openEditor("", service)),
            );
        }
        hint.setAttribute("data-tone", tone);
    }

    private needsApiKey(profile: LLMApiData): boolean {
        return (
            serviceFields(profile.service).includes("apiKey") &&
            // DeepLX works without an access token.
            profile.service !== "deeplx"
        );
    }

    // ------------------------------------------------------------------
    // API profiles
    // ------------------------------------------------------------------

    private initProfiles() {
        this.$("llmapi-add").addEventListener("click", () => {
            const current = this.currentService;
            const meta = getService(current);
            const hasProfile = this.profiles.some(
                (profile) => profile.service === current,
            );
            // Offer the selected service first when it still lacks a profile.
            this.openEditor(
                "",
                meta && !meta.builtin && !hasProfile ? current : "",
            );
        });
        this.renderProfiles();
    }

    private saveProfiles() {
        saveLLMApisToPrefs(this.profiles);
    }

    private useProfile(key: string) {
        const profile = this.profiles.find((item) => item.key === key);
        if (!profile || !serviceSupportsEngine(profile.service, this.engine)) {
            this.renderService();
            return;
        }
        activateLLMApi(this.profiles, key);
        this.saveProfiles();
        setPref(servicePrefKey(this.engine), profile.service);
        this.renderService();
        this.renderProfiles();
    }

    private openEditor(key: string, service = "") {
        let draft: LLMApiData;
        if (key) {
            const existing = this.profiles.find((item) => item.key === key);
            if (!existing) return;
            draft = JSON.parse(JSON.stringify(existing));
        } else {
            const meta = getService(service || "deepseek");
            draft = {
                ...emptyLLMApi,
                service: meta?.id || "deepseek",
                model: meta?.models?.[0] || "",
                apiUrl: meta?.urls?.[0] || "",
                extraData: {},
            };
        }
        const form = new ProfileEditor({
            doc: this.doc,
            profile: draft,
            isNew: !key,
            engine: this.engine,
            onSave: (profile, use) => this.saveProfile(profile, use),
            onCancel: () => {
                this.editor = null;
                this.renderProfiles();
            },
        });
        this.editor = { key, form };
        this.renderProfiles();
        form.root.scrollIntoView({ block: "nearest", behavior: "smooth" });
        form.focus();
    }

    private saveProfile(profile: LLMApiData, use: boolean) {
        const engine = this.engine;
        if (!profile.key) profile.key = Zotero.Utilities.generateObjectKey();
        upsertLLMApi(this.profiles, profile);
        // The first profile of a service is the one that service should use.
        if (!getActiveLLMApiByService(this.profiles, profile.service)) {
            activateLLMApi(this.profiles, profile.key);
        }
        if (use && serviceSupportsEngine(profile.service, engine)) {
            activateLLMApi(this.profiles, profile.key);
            setPref(servicePrefKey(engine), profile.service);
        }
        this.saveProfiles();
        this.editor = null;
        this.renderService();
        this.renderProfiles();
    }

    private duplicateProfile(key: string) {
        const index = this.profiles.findIndex((item) => item.key === key);
        if (index === -1) return;
        const source = this.profiles[index];
        const copy: LLMApiData = {
            ...JSON.parse(JSON.stringify(source)),
            key: Zotero.Utilities.generateObjectKey(),
            name: t("profile-copy-name", { name: this.displayName(source) }),
            activate: false,
        };
        this.profiles.splice(index + 1, 0, copy);
        this.saveProfiles();
        this.renderService();
        this.openEditor(copy.key);
    }

    private deleteProfile(key: string) {
        this.profiles = this.profiles.filter((item) => item.key !== key);
        this.saveProfiles();
        if (this.editor?.key === key) this.editor = null;
        this.renderService();
        this.renderProfiles();
    }

    private renderProfiles() {
        const doc = this.doc;
        const list = this.$("profiles");
        clear(list);
        if (this.profiles.length === 0) {
            list.append(
                h(doc, "div", {
                    class: "p2z-empty",
                    text: t("profile-empty"),
                }),
            );
        }
        for (const profile of this.profiles) {
            list.append(
                this.editor?.key === profile.key
                    ? this.editor.form.root
                    : this.createProfileRow(profile),
            );
        }
        if (this.editor?.key === "") list.append(this.editor.form.root);
    }

    private createProfileRow(profile: LLMApiData): HTMLElement {
        const doc = this.doc;
        const supported = serviceSupportsEngine(profile.service, this.engine);
        const inUse =
            supported &&
            profile.activate &&
            profile.service === this.currentService;
        const named = !!(profile.name || "").trim();
        const name = this.displayName(profile);
        const missingKey = this.needsApiKey(profile) && !profile.apiKey;
        const iconButton = (
            iconName: IconName,
            title: string,
            onclick: (event: Event) => void,
            extraClass = "",
        ) =>
            h(
                doc,
                "button",
                {
                    class: `p2z-btn p2z-btn-icon ${extraClass}`,
                    type: "button",
                    title,
                    "aria-label": title,
                    onclick,
                },
                icon(doc, iconName),
            );

        return h(
            doc,
            "div",
            { class: "p2z-profile", "data-in-use": inUse },
            h(
                doc,
                "div",
                { class: "p2z-profile-title" },
                h(doc, "span", {
                    class: "p2z-profile-name",
                    title: name,
                    text: name,
                }),
                // An unnamed profile already shows its service as the name.
                named &&
                    h(doc, "span", {
                        class: "p2z-badge",
                        text: serviceLabel(profile.service),
                    }),
                inUse &&
                    h(doc, "span", {
                        class: "p2z-badge",
                        "data-tone": "accent",
                        text: t("profile-in-use"),
                    }),
                missingKey &&
                    h(doc, "span", {
                        class: "p2z-badge",
                        "data-tone": "warn",
                        text: t("profile-no-key"),
                    }),
            ),
            h(doc, "div", {
                class: "p2z-profile-meta",
                text: [
                    named ? profile.model : "",
                    hostOf(profile.apiUrl),
                    maskApiKey(profile.apiKey),
                ]
                    .filter(Boolean)
                    .join(" · "),
            }),
            h(
                doc,
                "div",
                { class: "p2z-profile-actions" },
                !inUse &&
                    h(doc, "button", {
                        class: "p2z-btn",
                        type: "button",
                        text: t("profile-use"),
                        disabled: !supported,
                        title: supported
                            ? null
                            : t("service-unsupported", { name }),
                        onclick: () => this.useProfile(profile.key),
                    }),
                iconButton("edit", t("profile-edit"), () =>
                    this.openEditor(profile.key),
                ),
                iconButton("copy", t("profile-duplicate"), () =>
                    this.duplicateProfile(profile.key),
                ),
                iconButton(
                    "trash",
                    t("profile-delete"),
                    (event) =>
                        this.confirmDelete(
                            event.currentTarget as HTMLButtonElement,
                            profile.key,
                        ),
                    "p2z-btn-danger",
                ),
            ),
        );
    }

    /** Deleting takes a second click on the same button within a moment. */
    private confirmDelete(button: HTMLButtonElement, key: string) {
        if (button.hasAttribute("data-armed")) {
            this.deleteProfile(key);
            return;
        }
        button.setAttribute("data-armed", "");
        button.textContent = t("profile-delete-confirm");
        this.win.setTimeout(() => {
            if (!button.isConnected) return;
            button.removeAttribute("data-armed");
            button.replaceChildren(icon(this.doc, "trash"));
        }, DELETE_CONFIRM_MS);
    }

    // ------------------------------------------------------------------
    // Output files
    // ------------------------------------------------------------------

    private initOutputs() {
        const rows = Array.from(
            this.root.querySelectorAll(".p2z-table-row"),
        ) as HTMLElement[];
        const update = () => {
            let any = false;
            for (const row of rows) {
                const [generate, open] = Array.from(
                    row.querySelectorAll("input"),
                ) as HTMLInputElement[];
                open.disabled = !generate.checked;
                any = any || generate.checked;
            }
            this.$("output-warning").hidden = any;
        };
        for (const row of rows) row.addEventListener("change", update);
        update();
    }

    // ------------------------------------------------------------------
    // Font file (pdf2zh 1.x)
    // ------------------------------------------------------------------

    private initFontFile() {
        const input = this.$<HTMLInputElement>("fontFile");
        const set = (path: string) => {
            input.value = path;
            setPref("fontFile", path);
        };
        this.$("fontFile-browse").addEventListener("click", async () => {
            const path = await new ztoolkit.FilePicker(
                t("font-title"),
                "open",
                [[t("font-filter"), "*.ttf; *.otf; *.woff; *.woff2"]],
                undefined,
                this.win,
            ).open();
            if (path) set(path);
        });
        this.$("fontFile-clear").addEventListener("click", () => set(""));
    }

    // ------------------------------------------------------------------
    // Links and server status
    // ------------------------------------------------------------------

    private get serverUrl(): string {
        return normalizeServerUrl(String(getPref("new_serverip") || ""));
    }

    private initLinks() {
        this.root.querySelectorAll("[data-url]").forEach((node) => {
            node.addEventListener("click", () =>
                Zotero.launchURL(node.getAttribute("data-url")!),
            );
        });
        this.$("open-monitor").addEventListener("click", () => {
            if (this.serverUrl) Zotero.launchURL(`${this.serverUrl}/`);
        });
    }

    private initServer() {
        const input = this.$<HTMLInputElement>("serverUrl");
        input.addEventListener("change", () => {
            // Store the address the way requests are built from it.
            const url = normalizeServerUrl(input.value);
            input.value = url;
            setPref("new_serverip", url);
            this.checkServer();
        });
        this.$("checkConnection").addEventListener("click", () =>
            this.checkServer(),
        );
        this.checkServer();
    }

    private async checkServer() {
        const status = this.$("server-status");
        const text = status.querySelector(".p2z-status-text")!;
        const show = (state: string, message: string) => {
            status.setAttribute("data-state", state);
            text.textContent = message;
        };
        const token = ++this.probeToken;
        const url = this.serverUrl;
        show("checking", t("server-checking"));
        const probe = await probeServer(this.win, url);
        // A newer check (or a closed window) supersedes this one.
        if (token !== this.probeToken || this.win.closed) return;

        if (!probe.ok) {
            show(
                "error",
                t(`server-${probe.reason}`, { url, status: probe.status }),
            );
            return;
        }
        const version = probe.version || t("server-unknown-version");
        const lines = [t("server-ok", { version })];
        let state = "ok";
        if (probe.version && probe.version !== pluginVersion) {
            state = "warn";
            lines.push(
                t("server-mismatch", {
                    server: probe.version,
                    plugin: pluginVersion,
                }),
            );
        }
        if (!probe.features.includes(FEATURE_TERM_CONCURRENCY)) {
            state = "warn";
            lines.push(t("server-outdated"));
        }
        show(state, lines.join("\n"));
    }
}

/** Host part of a URL, or the raw value when it is not a URL. */
function hostOf(url: string): string {
    return String(url || "")
        .trim()
        .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
        .replace(/\/.*$/, "");
}
