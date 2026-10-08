// Inline form for creating or editing one API profile.

import { getString } from "../../utils/locale";
import {
    LLMApiData,
    cleanExtraData,
    migrateLegacyDeepSeekConfig,
    normalizeDeepSeekThinking,
} from "../llmApiManager";
import {
    EngineId,
    ExtraFieldMeta,
    ProfileField,
    SERVICES,
    extraFieldsFor,
    getService,
    serviceFields,
    serviceSupportsEngine,
} from "../serviceCatalog";
import { Combobox, clear, h, icon, uiLanguage } from "./dom";
import { ModelFetchError, fetchModelIds } from "./modelFetch";

const CUSTOM_SERVICE = "__custom__";
// The id is passed to the engine as a command-line flag.
const SERVICE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

// DeepSeek thinking is always stored explicitly, so it has no "default" entry.
const ALWAYS_EXPLICIT = new Set([
    "deepseek_thinking_mode",
    "deepseek_reasoning_effort",
]);

export interface ProfileEditorOptions {
    doc: Document;
    profile: LLMApiData;
    isNew: boolean;
    engine: EngineId;
    onSave(profile: LLMApiData, use: boolean): void;
    onCancel(): void;
}

const t = (key: string, args?: Record<string, unknown>) =>
    getString(`prefs-editor-${key}`, { args });

export class ProfileEditor {
    readonly root: HTMLElement;
    private readonly doc: Document;
    private readonly nameInput: HTMLInputElement;
    private readonly serviceSelect: HTMLSelectElement;
    private readonly customServiceInput: HTMLInputElement;
    private readonly serviceHint: HTMLElement;
    private readonly model: Combobox;
    private readonly apiUrl: Combobox;
    private readonly apiKeyInput: HTMLInputElement;
    private readonly fetchButton: HTMLButtonElement;
    private readonly modelHint: HTMLElement;
    private readonly fields: Record<ProfileField, HTMLElement>;
    private readonly fieldLabels: Record<ProfileField, HTMLElement>;
    private readonly extraBody: HTMLElement;
    private readonly docLink: HTMLButtonElement;
    private readonly useButton: HTMLButtonElement;
    private extraValues: Record<string, string> = {};
    private lastService = "";

    constructor(private readonly options: ProfileEditorOptions) {
        const { doc, profile } = options;
        this.doc = doc;
        for (const [key, value] of Object.entries(profile.extraData || {})) {
            this.extraValues[key] = String(value ?? "");
        }

        this.nameInput = h(doc, "input", {
            class: "p2z-input",
            type: "text",
            maxlength: "60",
            placeholder: t("name-placeholder"),
            value: profile.name || "",
        });

        const known = !!getService(profile.service);
        this.serviceSelect = h(
            doc,
            "select",
            {
                class: "p2z-select",
                onchange: () => this.onServiceChange(),
            },
            ...SERVICES.filter((service) => !service.builtin).map((service) =>
                h(doc, "option", { value: service.id, text: service.name }),
            ),
            h(doc, "option", {
                value: CUSTOM_SERVICE,
                text: t("service-custom"),
            }),
        );
        this.serviceSelect.value =
            known || !profile.service
                ? profile.service || "deepseek"
                : CUSTOM_SERVICE;
        this.customServiceInput = h(doc, "input", {
            class: "p2z-input",
            type: "text",
            spellcheck: "false",
            placeholder: t("service-custom-placeholder"),
            value: known ? "" : profile.service,
            oninput: () => this.onServiceChange(),
        });
        this.serviceHint = h(doc, "span", { class: "p2z-field-hint" });

        this.model = new Combobox(doc, { value: profile.model });
        this.apiUrl = new Combobox(doc, { value: profile.apiUrl });
        this.apiKeyInput = h(doc, "input", {
            class: "p2z-input",
            type: "password",
            spellcheck: "false",
            autocomplete: "off",
            value: profile.apiKey,
        });
        this.fetchButton = h(doc, "button", {
            class: "p2z-btn",
            type: "button",
            text: t("fetch-models"),
            onclick: () => this.fetchModels(),
        });
        this.modelHint = h(doc, "span", { class: "p2z-field-hint" });

        this.fieldLabels = {
            model: h(doc, "label"),
            apiUrl: h(doc, "label"),
            apiKey: h(doc, "label"),
        };
        this.fields = {
            model: h(
                doc,
                "div",
                { class: "p2z-field" },
                this.fieldLabels.model,
                h(
                    doc,
                    "div",
                    { class: "p2z-field-ctl" },
                    this.model.root,
                    this.fetchButton,
                ),
                this.modelHint,
            ),
            apiUrl: h(
                doc,
                "div",
                { class: "p2z-field" },
                this.fieldLabels.apiUrl,
                this.apiUrl.root,
            ),
            apiKey: h(
                doc,
                "div",
                { class: "p2z-field p2z-field-wide" },
                this.fieldLabels.apiKey,
                h(
                    doc,
                    "div",
                    { class: "p2z-field-ctl" },
                    this.apiKeyInput,
                    h(
                        doc,
                        "button",
                        {
                            class: "p2z-btn p2z-btn-icon",
                            type: "button",
                            title: t("toggle-key"),
                            onclick: () => {
                                this.apiKeyInput.type =
                                    this.apiKeyInput.type === "password"
                                        ? "text"
                                        : "password";
                            },
                        },
                        icon(doc, "eye"),
                    ),
                ),
            ),
        };

        this.extraBody = h(doc, "div", { class: "p2z-extra-body" });
        this.docLink = h(doc, "button", {
            class: "p2z-link",
            type: "button",
            text: t("docs"),
            onclick: () => {
                const url = getService(this.service)?.docUrl;
                if (url) Zotero.launchURL(url);
            },
        });
        this.useButton = h(doc, "button", {
            class: "p2z-btn p2z-btn-primary",
            type: "button",
            text: t("save-use"),
            onclick: () => this.save(true),
        });

        this.root = h(
            doc,
            "form",
            {
                class: "p2z-editor",
                onsubmit: (event: Event) => {
                    event.preventDefault();
                    this.save(false);
                },
                onkeydown: (event: KeyboardEvent) => {
                    if (event.key === "Escape") {
                        // Do not let Escape close the whole settings window.
                        event.preventDefault();
                        event.stopPropagation();
                        options.onCancel();
                    }
                },
            },
            h(doc, "h3", {
                text: t(options.isNew ? "title-new" : "title-edit"),
            }),
            h(
                doc,
                "div",
                { class: "p2z-form" },
                h(
                    doc,
                    "div",
                    { class: "p2z-field" },
                    h(doc, "label", { text: t("name") }),
                    this.nameInput,
                ),
                h(
                    doc,
                    "div",
                    { class: "p2z-field" },
                    h(doc, "label", { text: t("service") }),
                    h(
                        doc,
                        "div",
                        { class: "p2z-field-ctl" },
                        this.serviceSelect,
                        this.customServiceInput,
                    ),
                    this.serviceHint,
                ),
                this.fields.model,
                this.fields.apiUrl,
                this.fields.apiKey,
            ),
            h(
                doc,
                "details",
                { class: "p2z-extra" },
                h(doc, "summary", { text: t("advanced") }),
                this.extraBody,
            ),
            h(
                doc,
                "div",
                { class: "p2z-editor-foot" },
                this.docLink,
                h(doc, "span", { class: "p2z-spacer" }),
                h(doc, "button", {
                    class: "p2z-btn p2z-btn-ghost",
                    type: "button",
                    text: t("cancel"),
                    onclick: () => options.onCancel(),
                }),
                h(doc, "button", {
                    class: "p2z-btn",
                    type: "submit",
                    text: t("save"),
                }),
                this.useButton,
            ),
        );

        this.lastService = this.service;
        this.applyService(false);
        if (Object.keys(this.extraValues).length > 0) {
            (this.root.querySelector(".p2z-extra") as any).open = true;
        }
    }

    focus() {
        this.nameInput.focus();
    }

    private get service(): string {
        return this.serviceSelect.value === CUSTOM_SERVICE
            ? this.customServiceInput.value.trim()
            : this.serviceSelect.value;
    }

    private onServiceChange() {
        this.captureExtraValues();
        this.applyService(true);
        this.lastService = this.service;
    }

    /** Adapt labels, suggestions and extra parameters to the service. */
    private applyService(serviceChanged: boolean) {
        const service = this.service;
        const meta = getService(service);
        const lang = uiLanguage();
        const isCustom = this.serviceSelect.value === CUSTOM_SERVICE;
        this.customServiceInput.hidden = !isCustom;
        this.setServiceError("");

        const visible = serviceFields(service);
        for (const field of ["model", "apiUrl", "apiKey"] as ProfileField[]) {
            this.fields[field].hidden = !visible.includes(field);
            this.fieldLabels[field].textContent =
                meta?.labels?.[field]?.[lang] ?? t(`field-${field}`);
        }
        // "Model" is a credential for some services (e.g. Tencent Secret ID).
        this.fetchButton.hidden = !!meta?.labels?.model || !meta;
        this.modelHint.textContent = "";

        if (serviceChanged) {
            const previous = getService(this.lastService);
            // Replace values that were only suggestions of the old service.
            if (
                !this.model.value ||
                previous?.models?.includes(this.model.value)
            ) {
                this.model.value = meta?.models?.[0] || "";
            }
            if (
                !this.apiUrl.value ||
                previous?.urls?.includes(this.apiUrl.value)
            ) {
                this.apiUrl.value = meta?.urls?.[0] || "";
            }
        }
        this.model.setOptions(meta?.models || []);
        this.apiUrl.setOptions(meta?.urls || []);
        this.model.input.placeholder = meta?.models?.[0] || "";
        this.apiUrl.input.placeholder = meta?.urls?.[0] || "";

        this.docLink.hidden = !meta?.docUrl;
        const usable =
            !service || serviceSupportsEngine(service, this.options.engine);
        this.useButton.disabled = !usable;
        if (meta && !usable) {
            this.serviceHint.textContent = t("engine-mismatch", {
                engines: meta.engines.join(" / "),
            });
        } else {
            this.serviceHint.textContent = "";
        }
        this.serviceHint.removeAttribute("data-tone");
        this.renderExtraFields();
    }

    private setServiceError(message: string) {
        this.customServiceInput.toggleAttribute("aria-invalid", !!message);
        if (message) {
            this.customServiceInput.setAttribute("aria-invalid", "true");
            this.serviceHint.textContent = message;
            this.serviceHint.setAttribute("data-tone", "error");
        }
    }

    // ------------------------------------------------------------------
    // Extra parameters
    // ------------------------------------------------------------------

    private renderExtraFields() {
        const doc = this.doc;
        const lang = uiLanguage();
        const typed = extraFieldsFor(this.service);
        const typedKeys = new Set(typed.map((field) => field.key));
        clear(this.extraBody);

        if (typed.length === 0) {
            this.extraBody.append(
                h(doc, "span", {
                    class: "p2z-field-hint",
                    text: t("advanced-none"),
                }),
            );
        } else {
            this.extraBody.append(
                h(doc, "span", {
                    class: "p2z-field-hint",
                    text: t("advanced-hint"),
                }),
            );
        }
        for (const field of typed) {
            const control = this.createTypedControl(field);
            this.extraBody.append(
                h(
                    doc,
                    "div",
                    { class: "p2z-extra-row" },
                    h(
                        doc,
                        "label",
                        {},
                        field[lang],
                        h(doc, "code", { text: field.key }),
                    ),
                    control,
                ),
            );
        }
        for (const [key, value] of Object.entries(this.extraValues)) {
            if (!typedKeys.has(key)) this.addCustomRow(key, value);
        }
        this.extraBody.append(
            h(
                doc,
                "div",
                {},
                h(
                    doc,
                    "button",
                    {
                        class: "p2z-btn",
                        type: "button",
                        "data-role": "add-param",
                        onclick: () => {
                            const row = this.addCustomRow("", "");
                            (row.firstElementChild as HTMLElement)?.focus();
                        },
                    },
                    icon(doc, "plus"),
                    t("add-param"),
                ),
            ),
        );
        this.syncDeepSeekEffort();
    }

    private createTypedControl(field: ExtraFieldMeta): HTMLElement {
        const doc = this.doc;
        const current = this.extraValues[field.key] ?? "";
        if (field.type === "string") {
            return h(doc, "input", {
                class: "p2z-input",
                type: "text",
                spellcheck: "false",
                placeholder: t("default"),
                "data-extra-key": field.key,
                value: current,
            });
        }
        const values =
            field.type === "bool" ? ["true", "false"] : field.values || [];
        const explicit = ALWAYS_EXPLICIT.has(field.key);
        const label = (value: string) => {
            if (field.type === "bool")
                return t(value === "true" ? "on" : "off");
            if (ALWAYS_EXPLICIT.has(field.key)) return t(`value-${value}`);
            return value;
        };
        const select = h(
            doc,
            "select",
            {
                class: "p2z-select",
                "data-extra-key": field.key,
                onchange: () => this.syncDeepSeekEffort(),
            },
            !explicit && h(doc, "option", { value: "", text: t("default") }),
            ...values.map((value) =>
                h(doc, "option", { value, text: label(value) }),
            ),
        );
        const normalized = String(current).toLowerCase();
        select.value = values.includes(normalized)
            ? normalized
            : explicit
              ? values[0]
              : "";
        return select;
    }

    private addCustomRow(key: string, value: string): HTMLElement {
        const doc = this.doc;
        const row = h(
            doc,
            "div",
            { class: "p2z-extra-row", "data-custom-row": true },
            h(doc, "input", {
                class: "p2z-input",
                type: "text",
                spellcheck: "false",
                placeholder: t("param-key"),
                value: key,
            }),
            h(doc, "input", {
                class: "p2z-input",
                type: "text",
                spellcheck: "false",
                placeholder: t("param-value"),
                value,
            }),
            h(
                doc,
                "button",
                {
                    class: "p2z-btn p2z-btn-icon p2z-btn-ghost",
                    type: "button",
                    title: t("param-remove"),
                    onclick: () => row.remove(),
                },
                icon(doc, "close"),
            ),
        );
        const addButton = this.extraBody.querySelector(
            '[data-role="add-param"]',
        )?.parentElement;
        if (addButton) {
            this.extraBody.insertBefore(row, addButton);
        } else {
            this.extraBody.append(row);
        }
        return row;
    }

    /** Reasoning effort only matters while DeepSeek thinking is enabled. */
    private syncDeepSeekEffort() {
        const mode = this.extraBody.querySelector(
            '[data-extra-key="deepseek_thinking_mode"]',
        ) as HTMLSelectElement | null;
        const effort = this.extraBody.querySelector(
            '[data-extra-key="deepseek_reasoning_effort"]',
        ) as HTMLSelectElement | null;
        if (mode && effort) effort.disabled = mode.value !== "enabled";
    }

    private captureExtraValues() {
        const values: Record<string, string> = {};
        this.extraBody
            .querySelectorAll("[data-extra-key]")
            .forEach((element) => {
                const control = element as HTMLInputElement;
                const key = control.getAttribute("data-extra-key") || "";
                if (control.value.trim()) values[key] = control.value.trim();
            });
        this.extraBody.querySelectorAll("[data-custom-row]").forEach((row) => {
            const [key, value] = Array.from(
                row.querySelectorAll("input"),
            ) as HTMLInputElement[];
            if (key.value.trim()) values[key.value.trim()] = value.value;
        });
        this.extraValues = values;
    }

    // ------------------------------------------------------------------
    // Actions
    // ------------------------------------------------------------------

    private async fetchModels() {
        const setHint = (text: string, tone = "") => {
            this.modelHint.textContent = text;
            if (tone) this.modelHint.setAttribute("data-tone", tone);
            else this.modelHint.removeAttribute("data-tone");
        };
        this.fetchButton.disabled = true;
        setHint(t("fetching"));
        try {
            const ids = await fetchModelIds(
                this.service,
                this.apiUrl.value,
                this.apiKeyInput.value.trim(),
            );
            this.model.setOptions([
                ...ids,
                ...(getService(this.service)?.models || []),
            ]);
            setHint(t("fetched", { count: ids.length }), "ok");
            this.model.input.focus();
            this.model.open(false);
        } catch (error) {
            const reason =
                error instanceof ModelFetchError ? error.reason : "request";
            const message = error instanceof Error ? error.message : "";
            setHint(t(`fetch-${reason}`, { message }), "error");
        } finally {
            this.fetchButton.disabled = false;
        }
    }

    private save(use: boolean) {
        const service = this.service;
        if (!service || !SERVICE_ID_PATTERN.test(service)) {
            this.setServiceError(t("error-service"));
            this.customServiceInput.focus();
            return;
        }
        this.captureExtraValues();
        const visible = serviceFields(service);
        const original = this.options.profile;
        const profile: LLMApiData = {
            key: original.key,
            name: this.nameInput.value.trim(),
            service,
            // Hidden fields keep whatever was stored before.
            model: visible.includes("model")
                ? this.model.value
                : original.model,
            apiUrl: visible.includes("apiUrl")
                ? this.apiUrl.value
                : original.apiUrl,
            apiKey: visible.includes("apiKey")
                ? this.apiKeyInput.value.trim()
                : original.apiKey,
            // A service change must not silently displace another profile.
            activate: original.activate && original.service === service,
            extraData: cleanExtraData(this.extraValues),
        };
        migrateLegacyDeepSeekConfig(profile);
        normalizeDeepSeekThinking(profile);
        this.options.onSave(profile, use);
    }
}
