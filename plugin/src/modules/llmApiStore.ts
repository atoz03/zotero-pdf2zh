// Reads and writes the API profiles kept in the `llmApis` preference.

import { getPref, setPref } from "../utils/prefs";
import {
    LLMApiData,
    getActiveLLMApiByService,
    parseLLMApis,
} from "./llmApiManager";

export function saveLLMApisToPrefs(profiles: LLMApiData[]) {
    setPref("llmApis", JSON.stringify(profiles));
}

export function loadLLMApisFromPrefs(): LLMApiData[] {
    const { profiles, changed } = parseLLMApis(getPref("llmApis"), () =>
        Zotero.Utilities.generateObjectKey(),
    );
    if (changed) {
        // Persist one-off migrations (retired DeepSeek aliases, missing keys).
        saveLLMApisToPrefs(profiles);
    }
    return profiles;
}

/** The profile the server should use for `service`, if the user has one. */
export function getActiveLLMApi(service: string): LLMApiData | undefined {
    return getActiveLLMApiByService(loadLLMApisFromPrefs(), service);
}
