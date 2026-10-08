// Data model of the user's API profiles (stored as JSON in the `llmApis`
// preference). Pure functions only, so the logic is unit-testable in Node.

export interface LLMApiData {
    key: string;
    /** Optional display name chosen by the user. */
    name?: string;
    service: string;
    apiKey: string;
    apiUrl: string;
    model: string;
    /** The profile sent to the server when its service is selected. */
    activate: boolean;
    extraData?: Record<string, any>;
}

export const emptyLLMApi: LLMApiData = {
    key: "",
    name: "",
    service: "",
    apiKey: "",
    apiUrl: "",
    model: "",
    activate: false,
    extraData: {},
};

const DEEPSEEK_V4_MODEL = /^deepseek-v4-(pro|flash)$/;

export function migrateLegacyDeepSeekConfig(llmApi: LLMApiData): boolean {
    if (llmApi.service !== "deepseek") return false;
    if (
        llmApi.model !== "deepseek-chat" &&
        llmApi.model !== "deepseek-reasoner"
    ) {
        return false;
    }

    const legacyModel = llmApi.model;
    llmApi.model = "deepseek-v4-flash";
    llmApi.extraData = llmApi.extraData || {};

    // Preserve an explicitly saved thinking choice. Otherwise map the retired
    // aliases to their V4 Flash semantics.
    if (!("deepseek_thinking_mode" in llmApi.extraData)) {
        if (legacyModel === "deepseek-reasoner") {
            llmApi.extraData.deepseek_thinking_mode = "enabled";
            llmApi.extraData.deepseek_reasoning_effort = "high";
        } else {
            llmApi.extraData.deepseek_thinking_mode = "disabled";
            delete llmApi.extraData.deepseek_reasoning_effort;
        }
    }
    return true;
}

/**
 * DeepSeek V4 bills thinking tokens, so the choice is always stored
 * explicitly: thinking defaults to off, and the effort only exists while
 * thinking is on.
 */
export function normalizeDeepSeekThinking(llmApi: LLMApiData): void {
    if (llmApi.service !== "deepseek") return;
    const extra = (llmApi.extraData = llmApi.extraData || {});
    if (!DEEPSEEK_V4_MODEL.test(llmApi.model)) {
        delete extra.deepseek_thinking_mode;
        delete extra.deepseek_reasoning_effort;
        return;
    }
    if (extra.deepseek_thinking_mode !== "enabled") {
        extra.deepseek_thinking_mode = "disabled";
        delete extra.deepseek_reasoning_effort;
        return;
    }
    if (extra.deepseek_reasoning_effort !== "max") {
        extra.deepseek_reasoning_effort = "high";
    }
}

/**
 * Turn whatever is stored in the preference into a clean profile list.
 * `changed` tells the caller the stored value should be rewritten.
 */
export function parseLLMApis(
    raw: unknown,
    generateKey: () => string,
): { profiles: LLMApiData[]; changed: boolean } {
    let parsed: unknown = raw;
    if (typeof raw === "string") {
        try {
            parsed = raw.trim() ? JSON.parse(raw) : [];
        } catch {
            return { profiles: [], changed: false };
        }
    }
    if (!Array.isArray(parsed)) return { profiles: [], changed: false };

    let changed = false;
    const seen = new Set<string>();
    const profiles: LLMApiData[] = [];
    for (const entry of parsed) {
        if (!entry || typeof entry !== "object") continue;
        const source = entry as Record<string, unknown>;
        const service = String(source.service ?? "").trim();
        if (!service) continue;

        let key = String(source.key ?? "");
        if (!key || seen.has(key)) {
            key = generateKey();
            changed = true;
        }
        seen.add(key);

        const extraData =
            source.extraData && typeof source.extraData === "object"
                ? { ...(source.extraData as Record<string, any>) }
                : {};
        const llmApi: LLMApiData = {
            key,
            name: typeof source.name === "string" ? source.name : "",
            service,
            apiKey: String(source.apiKey ?? ""),
            apiUrl: String(source.apiUrl ?? ""),
            model: String(source.model ?? ""),
            activate: source.activate === true,
            extraData,
        };
        if (migrateLegacyDeepSeekConfig(llmApi)) changed = true;
        profiles.push(llmApi);
    }

    // Older builds could leave several active entries for one service.
    const active = new Set<string>();
    for (const llmApi of profiles) {
        if (!llmApi.activate) continue;
        if (active.has(llmApi.service)) {
            llmApi.activate = false;
            changed = true;
        }
        active.add(llmApi.service);
    }
    return { profiles, changed };
}

/** Make `key` the active profile of its service. */
export function activateLLMApi(profiles: LLMApiData[], key: string): boolean {
    const target = profiles.find((llmApi) => llmApi.key === key);
    if (!target) return false;
    for (const llmApi of profiles) {
        if (llmApi.service === target.service) {
            llmApi.activate = llmApi.key === key;
        }
    }
    return true;
}

export function getActiveLLMApiByService(
    profiles: LLMApiData[],
    service: string,
): LLMApiData | undefined {
    return profiles.find(
        (llmApi) => llmApi.activate && llmApi.service === service,
    );
}

/** Insert or replace a profile, keeping one active profile per service. */
export function upsertLLMApi(profiles: LLMApiData[], llmApi: LLMApiData): void {
    const index = profiles.findIndex((item) => item.key === llmApi.key);
    if (index === -1) {
        profiles.push(llmApi);
    } else {
        profiles[index] = llmApi;
    }
    if (llmApi.activate) activateLLMApi(profiles, llmApi.key);
}

/** Name shown wherever a profile is listed or selected. */
export function llmApiDisplayName(
    llmApi: LLMApiData,
    serviceName: string,
): string {
    const name = (llmApi.name || "").trim();
    if (name) return name;
    return llmApi.model ? `${serviceName} · ${llmApi.model}` : serviceName;
}

/** Never show a full secret in the UI. */
export function maskApiKey(apiKey: string): string {
    const value = (apiKey || "").trim();
    if (!value) return "";
    if (value.length <= 8) return "•".repeat(value.length);
    return `${value.slice(0, 3)}••••${value.slice(-4)}`;
}

/** Drop empty entries so they never override the engine's defaults. */
export function cleanExtraData(
    extraData: Record<string, any> | undefined,
): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(extraData || {})) {
        const name = key.trim();
        if (!name) continue;
        if (value === undefined || value === null) continue;
        if (typeof value === "string" && !value.trim()) continue;
        result[name] = typeof value === "string" ? value.trim() : value;
    }
    return result;
}
