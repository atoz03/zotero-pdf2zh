// Probe the PDF2zh Server's /health endpoint from the settings pane.

export type ServerProbe =
    | { ok: true; version: string; features: string[] }
    | {
          ok: false;
          reason: "empty" | "timeout" | "unreachable" | "not-pdf2zh" | "http";
          status?: number;
      };

const PROBE_TIMEOUT_MS = 6000;

export function normalizeServerUrl(value: string): string {
    return String(value || "")
        .trim()
        .replace(/\/+$/, "");
}

export async function probeServer(
    win: Window,
    serverUrl: string,
): Promise<ServerProbe> {
    const base = normalizeServerUrl(serverUrl);
    if (!base) return { ok: false, reason: "empty" };

    const controller = new (win as any).AbortController();
    const timer = win.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
        const response = await win.fetch(`${base}/health`, {
            cache: "no-store",
            signal: controller.signal,
        });
        const text = await response.text();
        let data: any = null;
        try {
            data = JSON.parse(text);
        } catch {
            // Something answered, but not with PDF2zh's JSON.
        }
        const isPdf2zh =
            data &&
            typeof data === "object" &&
            (data.status === "ok" || typeof data.version === "string");
        if (!isPdf2zh) {
            // Another program on this port usually answers 401/403/404 or HTML.
            return response.ok || [401, 403, 404].includes(response.status)
                ? { ok: false, reason: "not-pdf2zh" }
                : { ok: false, reason: "http", status: response.status };
        }
        return {
            ok: true,
            version: String(data.version || ""),
            features: Array.isArray(data.features)
                ? data.features.map(String)
                : [],
        };
    } catch (error: any) {
        return {
            ok: false,
            reason: error?.name === "AbortError" ? "timeout" : "unreachable",
        };
    } finally {
        win.clearTimeout(timer);
    }
}
