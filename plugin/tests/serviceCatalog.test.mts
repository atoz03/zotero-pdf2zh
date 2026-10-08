import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
    COMMON_LANGUAGES,
    ENGINES,
    LANGUAGES,
    SERVICES,
    extraFieldsFor,
    getService,
    languageName,
    serviceFields,
    serviceLabel,
    servicePrefKey,
    serviceSupportsEngine,
} from "../src/modules/serviceCatalog.ts";

const serverConfigMap = readFileSync(
    new URL("../../server/utils/config_map.py", import.meta.url),
    "utf-8",
);
const serverTemplate = readFileSync(
    new URL("../../server/config/config.toml.example", import.meta.url),
    "utf-8",
);

function pythonDict(name: string): string {
    const start = serverConfigMap.indexOf(`${name} = {`);
    assert.ok(start >= 0, `${name} not found in config_map.py`);
    return serverConfigMap.slice(start, serverConfigMap.indexOf("\n}", start));
}

// Plugin service id -> pdf2zh_next section name, as the server resolves it.
const aliases = new Map(
    [
        ...pythonDict("pdf2zh_next_service_aliases").matchAll(
            /"([^"]+)":\s*"([^"]+)"/g,
        ),
    ].map((match) => [match[1], match[2]]),
);

// pdf2zh 1.x keys added as aliases of an existing entry:
// pdf2zh_config_map["modelscope"] = pdf2zh_config_map["ModelScope"]
const legacyAliases = new Map(
    [
        ...serverConfigMap.matchAll(
            /^pdf2zh_config_map\["([^"]+)"\] = pdf2zh_config_map\["([^"]+)"\]$/gm,
        ),
    ].map((match) => [match[1], match[2]]),
);

test("service ids are unique", () => {
    const ids = SERVICES.map((service) => service.id);
    assert.equal(new Set(ids).size, ids.length);
});

test("every service offered for pdf2zh_next exists in that engine", () => {
    for (const service of SERVICES) {
        if (!service.engines.includes("pdf2zh_next")) continue;
        const canonical = aliases.get(service.id) ?? service.id;
        assert.match(
            serverTemplate,
            new RegExp(`^${canonical} = (true|false)\\b`, "m"),
            `${service.id} -> ${canonical} is not a pdf2zh_next service`,
        );
    }
});

test("services pdf2zh_next does not have are not offered for it", () => {
    for (const id of ["argos", "deeplx"]) {
        assert.equal(serviceSupportsEngine(id, "pdf2zh_next"), false, id);
        assert.equal(serviceSupportsEngine(id, "pdf2zh"), true, id);
    }
    for (const id of ["siliconflowfree", "AliyunDashScope", "claudecode"]) {
        assert.equal(serviceSupportsEngine(id, "pdf2zh"), false, id);
    }
});

test("every profile field is stored by the server for some engine", () => {
    const next = pythonDict("pdf2zh_next_config_map");
    const legacy = pythonDict("pdf2zh_config_map");
    const section = (dict: string, id: string) => {
        const start = dict.search(new RegExp(`\\n    "${id}": \\{`));
        if (start < 0) return null;
        return dict.slice(start, dict.indexOf("\n    }", start));
    };
    for (const service of SERVICES) {
        if (service.builtin) {
            assert.deepEqual(service.fields, [], service.id);
            continue;
        }
        const bodies = service.engines.map((engine) => {
            const body =
                engine === "pdf2zh_next"
                    ? section(next, aliases.get(service.id) ?? service.id)
                    : section(
                          legacy,
                          legacyAliases.get(service.id) ?? service.id,
                      );
            assert.ok(body, `${service.id}: no server mapping for ${engine}`);
            return body;
        });
        // A field may exist for one engine only (pdf2zh 1.x has no base URL
        // for SiliconFlow, for example), but it must do something somewhere.
        for (const field of service.fields) {
            assert.ok(
                bodies.some((body) => new RegExp(`\\b${field}:`).test(body)),
                `${service.id}.${field} is ignored by the server`,
            );
        }
    }
});

test("typed extra parameters use names the server knows", () => {
    for (const service of SERVICES) {
        for (const field of extraFieldsFor(service.id)) {
            assert.ok(
                serverConfigMap.includes(`"${field.key}"`),
                `${service.id}: ${field.key} missing from config_map.py`,
            );
            if (field.type === "enum") {
                assert.ok(field.values && field.values.length > 0);
            }
        }
    }
    assert.ok(
        extraFieldsFor("openailiked").some(
            (field) => field.key === "openai_compatible_timeout",
        ),
    );
    assert.deepEqual(extraFieldsFor("bing"), []);
    assert.deepEqual(extraFieldsFor("my-custom-service"), []);
});

test("custom service ids are passed through", () => {
    assert.equal(getService("my-custom-service"), undefined);
    assert.equal(serviceLabel("my-custom-service"), "my-custom-service");
    assert.equal(serviceLabel("openailiked"), getService("openailiked")?.name);
    assert.deepEqual(serviceFields("my-custom-service"), [
        "apiKey",
        "model",
        "apiUrl",
    ]);
    for (const engine of ENGINES) {
        assert.equal(serviceSupportsEngine("my-custom-service", engine), true);
    }
    assert.deepEqual(serviceFields("ollama"), ["model", "apiUrl"]);
});

test("each engine keeps its own selected service", () => {
    assert.equal(servicePrefKey("pdf2zh"), "service");
    assert.equal(servicePrefKey("pdf2zh_next"), "next_service");
});

test("language names follow the UI language", () => {
    assert.equal(languageName("zh-CN", "zh-CN"), "简体中文");
    assert.equal(
        languageName("zh-TW", "en-US"),
        "Chinese (Traditional, Taiwan)",
    );
    assert.equal(languageName("en", "en-US"), "English");
    assert.equal(languageName("ja", "zh-CN"), "日语");
    assert.equal(languageName("x-unknown", "en-US"), "x-unknown");
    for (const code of COMMON_LANGUAGES) {
        assert.ok(
            code in LANGUAGES || languageName(code, "en-US") !== code,
            `${code} has no name`,
        );
    }
});
