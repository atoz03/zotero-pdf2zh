// Ask a provider which models an API key can use.

import { getService } from "../serviceCatalog";

export class ModelFetchError extends Error {
    constructor(
        readonly reason: "need-key" | "need-url" | "empty" | "request",
        message = "",
    ) {
        super(message || reason);
    }
}

function normalizeBaseUrl(value: string): string {
    return String(value || "")
        .trim()
        .replace(/\/+$/, "");
}

export function modelRequestSpec(
    service: string,
    baseUrl: string,
    apiKey: string,
): { url: string; headers: Record<string, string> } {
    const defaultBase = getService(service)?.urls?.[0] || "";
    const base = normalizeBaseUrl(baseUrl || defaultBase);
    const bearer: Record<string, string> = apiKey
        ? { Authorization: `Bearer ${apiKey}` }
        : {};

    if (service === "deepseek") {
        if (!apiKey) throw new ModelFetchError("need-key");
        return { url: "https://api.deepseek.com/models", headers: bearer };
    }
    if (service === "openai") {
        if (!apiKey) throw new ModelFetchError("need-key");
        return {
            url: `${base || "https://api.openai.com/v1"}/models`,
            headers: bearer,
        };
    }
    if (service === "gemini") {
        if (!apiKey) throw new ModelFetchError("need-key");
        const geminiBase =
            base || "https://generativelanguage.googleapis.com/v1beta";
        return {
            url: `${geminiBase}/models?key=${encodeURIComponent(apiKey)}`,
            headers: {},
        };
    }
    if (service === "ollama") {
        return {
            url: `${base || "http://localhost:11434"}/api/tags`,
            headers: {},
        };
    }
    if (!base) throw new ModelFetchError("need-url");
    return {
        url: base.endsWith("/models") ? base : `${base}/models`,
        headers: bearer,
    };
}

export function extractModelIds(payload: any): string[] {
    let list: any[] = [];
    if (Array.isArray(payload)) list = payload;
    else if (Array.isArray(payload?.data)) list = payload.data;
    else if (Array.isArray(payload?.models)) list = payload.models;
    else if (Array.isArray(payload?.result?.data)) list = payload.result.data;
    else if (Array.isArray(payload?.result)) list = payload.result;

    const ids = list
        .map((item) =>
            typeof item === "string"
                ? item
                : item?.id || item?.name || item?.model || item?.model_name,
        )
        .map((value) => String(value || ""))
        .map((value) =>
            value.startsWith("models/") ? value.slice("models/".length) : value,
        )
        .filter(Boolean);
    return [...new Set(ids)];
}

export async function fetchModelIds(
    service: string,
    baseUrl: string,
    apiKey: string,
): Promise<string[]> {
    const { url, headers } = modelRequestSpec(service, baseUrl, apiKey);
    let payload: unknown;
    try {
        const xhr = await Zotero.HTTP.request("GET", url, {
            headers,
            responseType: "json",
            timeout: 20000,
        });
        payload =
            xhr.response && typeof xhr.response === "object"
                ? xhr.response
                : JSON.parse(xhr.responseText || "null");
    } catch (error: any) {
        const status = error?.status ? `HTTP ${error.status}` : "";
        throw new ModelFetchError(
            "request",
            status || error?.message || String(error),
        );
    }
    const ids = extractModelIds(payload);
    if (ids.length === 0) throw new ModelFetchError("empty");
    return ids;
}
