import assert from "node:assert/strict";
import test from "node:test";
import {
    activateLLMApi,
    cleanExtraData,
    getActiveLLMApiByService,
    llmApiDisplayName,
    maskApiKey,
    normalizeDeepSeekThinking,
    parseLLMApis,
    upsertLLMApi,
    type LLMApiData,
} from "../src/modules/llmApiManager.ts";

function keyGenerator() {
    let next = 0;
    return () => `GEN${++next}`;
}

function profile(overrides: Partial<LLMApiData>): LLMApiData {
    return {
        key: "K1",
        name: "",
        service: "openai",
        apiKey: "",
        apiUrl: "",
        model: "",
        activate: false,
        extraData: {},
        ...overrides,
    };
}

test("a named profile is shown by its name, an unnamed one by service and model", () => {
    assert.equal(
        llmApiDisplayName(
            profile({ name: "  Work key  ", model: "gpt-4o" }),
            "OpenAI",
        ),
        "Work key",
    );
    assert.equal(
        llmApiDisplayName(profile({ model: "gpt-4o" }), "OpenAI"),
        "OpenAI · gpt-4o",
    );
    assert.equal(llmApiDisplayName(profile({}), "OpenAI"), "OpenAI");
});

test("stored profiles survive a round trip untouched", () => {
    const stored = [
        profile({
            key: "A",
            name: "Mine",
            apiKey: "sk-1",
            model: "gpt-4o",
            activate: true,
            extraData: { openai_timeout: "120" },
        }),
    ];
    const { profiles, changed } = parseLLMApis(
        JSON.stringify(stored),
        keyGenerator(),
    );
    assert.equal(changed, false);
    assert.deepEqual(profiles, stored);
});

test("broken or foreign preference values become an empty list", () => {
    for (const raw of [
        "",
        "   ",
        "{not json",
        '{"a":1}',
        null,
        undefined,
        42,
    ]) {
        assert.deepEqual(parseLLMApis(raw, keyGenerator()), {
            profiles: [],
            changed: false,
        });
    }
});

test("entries from older versions are repaired", () => {
    const raw = JSON.stringify([
        { service: "openai", apiKey: "a", activate: true },
        { key: "DUP", service: "openai", apiKey: "b", activate: true },
        { key: "DUP", service: "gemini", activate: true },
        { key: "X", service: "  " },
        "junk",
        null,
    ]);
    const { profiles, changed } = parseLLMApis(raw, keyGenerator());
    assert.equal(changed, true);
    assert.deepEqual(
        profiles.map((item) => [item.key, item.service, item.activate]),
        [
            ["GEN1", "openai", true],
            ["DUP", "openai", false],
            ["GEN2", "gemini", true],
        ],
    );
    assert.equal(profiles[0].name, "");
    assert.deepEqual(profiles[0].extraData, {});
});

test("retired DeepSeek aliases move to V4 Flash with the matching thinking mode", () => {
    const { profiles, changed } = parseLLMApis(
        [
            { key: "R", service: "deepseek", model: "deepseek-reasoner" },
            { key: "C", service: "deepseek", model: "deepseek-chat" },
            {
                key: "E",
                service: "deepseek",
                model: "deepseek-chat",
                extraData: { deepseek_thinking_mode: "enabled" },
            },
            { key: "O", service: "openai", model: "deepseek-chat" },
        ],
        keyGenerator(),
    );
    assert.equal(changed, true);
    const byKey = Object.fromEntries(profiles.map((item) => [item.key, item]));
    assert.equal(byKey.R.model, "deepseek-v4-flash");
    assert.deepEqual(byKey.R.extraData, {
        deepseek_thinking_mode: "enabled",
        deepseek_reasoning_effort: "high",
    });
    assert.deepEqual(byKey.C.extraData, { deepseek_thinking_mode: "disabled" });
    // An explicit choice is kept, and other services are left alone.
    assert.deepEqual(byKey.E.extraData, { deepseek_thinking_mode: "enabled" });
    assert.equal(byKey.O.model, "deepseek-chat");
});

test("DeepSeek V4 thinking is always stored explicitly", () => {
    const off = profile({ service: "deepseek", model: "deepseek-v4-pro" });
    normalizeDeepSeekThinking(off);
    assert.deepEqual(off.extraData, { deepseek_thinking_mode: "disabled" });

    const stale = profile({
        service: "deepseek",
        model: "deepseek-v4-flash",
        extraData: {
            deepseek_thinking_mode: "disabled",
            deepseek_reasoning_effort: "max",
        },
    });
    normalizeDeepSeekThinking(stale);
    assert.deepEqual(stale.extraData, { deepseek_thinking_mode: "disabled" });

    const on = profile({
        service: "deepseek",
        model: "deepseek-v4-flash",
        extraData: { deepseek_thinking_mode: "enabled" },
    });
    normalizeDeepSeekThinking(on);
    assert.deepEqual(on.extraData, {
        deepseek_thinking_mode: "enabled",
        deepseek_reasoning_effort: "high",
    });

    const other = profile({
        service: "deepseek",
        model: "custom-model",
        extraData: {
            deepseek_thinking_mode: "enabled",
            deepseek_enable_json_mode: "true",
        },
    });
    normalizeDeepSeekThinking(other);
    assert.deepEqual(other.extraData, { deepseek_enable_json_mode: "true" });
});

test("exactly one profile per service is in use", () => {
    const profiles = [
        profile({ key: "A", activate: true }),
        profile({ key: "B" }),
        profile({ key: "G", service: "gemini", activate: true }),
    ];
    assert.equal(activateLLMApi(profiles, "B"), true);
    assert.equal(getActiveLLMApiByService(profiles, "openai")?.key, "B");
    assert.equal(getActiveLLMApiByService(profiles, "gemini")?.key, "G");
    assert.equal(activateLLMApi(profiles, "missing"), false);

    upsertLLMApi(profiles, profile({ key: "C", activate: true }));
    assert.deepEqual(
        profiles.filter((item) => item.activate).map((item) => item.key),
        ["G", "C"],
    );
    // Saving an edit without "use" must not steal the active slot.
    upsertLLMApi(profiles, profile({ key: "A", model: "edited" }));
    assert.equal(getActiveLLMApiByService(profiles, "openai")?.key, "C");
    assert.equal(profiles.length, 4);
    assert.equal(getActiveLLMApiByService(profiles, "deepl"), undefined);
});

test("secrets are never shown in full", () => {
    assert.equal(maskApiKey(""), "");
    assert.equal(maskApiKey("  "), "");
    assert.equal(maskApiKey("12345678"), "••••••••");
    assert.equal(maskApiKey("sk-abcdefghijklmnop"), "sk-••••mnop");
    assert.ok(!maskApiKey("sk-abcdefghijklmnop").includes("abcdefgh"));
});

test("empty extra parameters are not sent to the server", () => {
    assert.deepEqual(
        cleanExtraData({
            " openai_timeout ": " 120 ",
            empty: "",
            blank: "   ",
            nothing: null,
            missing: undefined,
            "": "x",
            flag: false,
            zero: 0,
        }),
        { openai_timeout: "120", flag: false, zero: 0 },
    );
    assert.deepEqual(cleanExtraData(undefined), {});
});
