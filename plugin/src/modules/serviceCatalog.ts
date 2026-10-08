// Static description of every translation service the two engines accept.
// This module is intentionally free of Zotero globals and imports so it can be
// unit-tested with plain Node.

export type EngineId = "pdf2zh" | "pdf2zh_next";

export const ENGINES: EngineId[] = ["pdf2zh_next", "pdf2zh"];

export type ProfileField = "model" | "apiUrl" | "apiKey";

export interface LocalizedText {
    zh: string;
    en: string;
}

export interface ServiceMeta {
    /** Value stored in the `service` / `next_service` preference. */
    id: string;
    name: string;
    engines: EngineId[];
    /** Works out of the box, without any API profile. */
    builtin?: boolean;
    /** Profile fields the server actually forwards for this service. */
    fields: ProfileField[];
    /** Per-field label overrides (e.g. Tencent stores its Secret ID as model). */
    labels?: Partial<Record<ProfileField, LocalizedText>>;
    models?: string[];
    urls?: string[];
    /** Page listing the models / keys of this provider. */
    docUrl?: string;
}

export type ExtraFieldType = "string" | "bool" | "enum";

export interface ExtraFieldMeta {
    key: string;
    type: ExtraFieldType;
    values?: string[];
    zh: string;
    en: string;
}

const BOTH: EngineId[] = ["pdf2zh", "pdf2zh_next"];
const NEXT: EngineId[] = ["pdf2zh_next"];
const LEGACY: EngineId[] = ["pdf2zh"];

const GPT_MODELS = ["gpt-5", "gpt-5-mini", "gpt-4o", "gpt-4o-mini", "gpt-4"];

export const SERVICES: ServiceMeta[] = [
    // ---- No configuration needed ----
    {
        id: "siliconflowfree",
        name: "SiliconFlow Free",
        engines: NEXT,
        builtin: true,
        fields: [],
    },
    { id: "bing", name: "Bing", engines: BOTH, builtin: true, fields: [] },
    { id: "google", name: "Google", engines: BOTH, builtin: true, fields: [] },
    { id: "argos", name: "Argos", engines: LEGACY, builtin: true, fields: [] },

    // ---- LLM providers ----
    {
        id: "deepseek",
        name: "DeepSeek",
        engines: BOTH,
        fields: ["apiKey", "model"],
        models: ["deepseek-v4-flash", "deepseek-v4-pro"],
        docUrl: "https://platform.deepseek.com/",
    },
    {
        id: "openai",
        name: "OpenAI",
        engines: BOTH,
        fields: ["apiKey", "model", "apiUrl"],
        models: GPT_MODELS,
        urls: ["https://api.openai.com/v1"],
        docUrl: "https://platform.openai.com/docs/models",
    },
    {
        id: "openailiked",
        name: "OpenAI-compatible",
        engines: BOTH,
        fields: ["apiKey", "model", "apiUrl"],
        models: [
            "deepseek-v3-2-251201",
            "deepseek-v3-1-terminus",
            "deepseek-v3-250324",
            "deepseek-r1-250528",
            "kimi-k2-250905",
            "glm-4-7-251222",
            "doubao-seed-2-0-pro-260215",
            "doubao-seed-2-0-lite-260215",
            "doubao-seed-2-0-mini-260215",
            "doubao-seed-1-8-251228",
            "doubao-seed-1-6-251015",
            "doubao-seed-1-6-flash-250615",
            "doubao-seed-translation-250915",
            "doubao-1-5-lite-32k-250115",
        ],
        urls: ["https://ark.cn-beijing.volces.com/api/v3"],
        docUrl: "https://console.volcengine.com/ark/region:ark+cn-beijing/openManagement?LLM=%7B%7D&advancedActiveKey=model",
    },
    {
        id: "gemini",
        name: "Gemini",
        engines: BOTH,
        fields: ["apiKey", "model"],
        models: [
            "gemini-2.5-flash",
            "gemini-2.5-pro",
            "gemini-3.0-flash-preview",
            "gemini-3.0-pro-preview",
        ],
        docUrl: "https://ai.google.dev/gemini-api/docs/models",
    },
    {
        id: "silicon",
        name: "SiliconFlow",
        engines: BOTH,
        fields: ["apiKey", "model", "apiUrl"],
        models: [
            "deepseek-ai/DeepSeek-V3.2",
            "deepseek-ai/DeepSeek-V3.1-Terminus",
            "deepseek-ai/DeepSeek-R1",
            "Pro/deepseek-ai/DeepSeek-V3.2",
            "Pro/deepseek-ai/DeepSeek-V3.1-Terminus",
            "Pro/deepseek-ai/DeepSeek-R1",
            "Qwen/Qwen3-8B",
            "Qwen/Qwen2.5-72B-Instruct",
            "moonshotai/Kimi-K2-Thinking",
            "Pro/zai-org/GLM-4.7",
        ],
        urls: ["https://api.siliconflow.cn/v1"],
        docUrl: "https://cloud.siliconflow.cn/me/models",
    },
    {
        id: "AliyunDashScope",
        name: "Aliyun DashScope",
        engines: NEXT,
        fields: ["apiKey", "model", "apiUrl"],
        models: [
            "qwen3.5-plus",
            "qwen3.5-flash",
            "qwen3.5-35b-a3b",
            "qwen3-max",
            "qwen-plus",
            "qwen-flash",
            "qwen-mt-plus",
            "qwen-mt-flash",
        ],
        urls: ["https://dashscope.aliyuncs.com/compatible-mode/v1"],
        docUrl: "https://bailian.console.aliyun.com/",
    },
    {
        id: "zhipu",
        name: "Zhipu GLM",
        engines: BOTH,
        fields: ["apiKey", "model"],
        models: [
            "glm-4-flash",
            "glm-4.5",
            "glm-4.5-x",
            "glm-4.5-air",
            "glm-4.5-airx",
        ],
        docUrl: "https://open.bigmodel.cn/",
    },
    {
        id: "qwen-mt",
        name: "Qwen-MT",
        engines: BOTH,
        fields: ["apiKey", "model", "apiUrl"],
        models: [
            "qwen-mt-plus",
            "qwen-mt-flash",
            "qwen-plus-latest",
            "qwen-max-latest",
            "qwen-max",
            "qwen-plus",
        ],
    },
    {
        id: "modelscope",
        name: "ModelScope",
        engines: BOTH,
        fields: ["apiKey", "model"],
        models: ["openai-mirror/gpt-oss-120b", "openai-mirror/gpt-oss-20b"],
        docUrl: "https://modelscope.cn/models",
    },
    {
        id: "grok",
        name: "Grok",
        engines: BOTH,
        fields: ["apiKey", "model"],
        models: ["grok-4-0709", "grok-3", "grok-3-mini"],
    },
    {
        id: "groq",
        name: "Groq",
        engines: BOTH,
        fields: ["apiKey", "model"],
    },
    {
        id: "azure-openai",
        name: "Azure OpenAI",
        engines: BOTH,
        fields: ["apiKey", "model", "apiUrl"],
        models: GPT_MODELS,
    },

    // ---- Local runtimes ----
    {
        id: "ollama",
        name: "Ollama",
        engines: BOTH,
        fields: ["model", "apiUrl"],
        models: ["gemma3:12b", "qwen3:8b"],
        urls: ["http://localhost:11434"],
        docUrl: "https://ollama.com/library",
    },
    {
        id: "xinference",
        name: "Xinference",
        engines: BOTH,
        fields: ["model", "apiUrl"],
        models: ["gemma-2-it"],
        urls: ["http://127.0.0.1:9997"],
    },
    {
        id: "claudecode",
        name: "Claude Code",
        engines: NEXT,
        fields: ["model", "apiUrl"],
        labels: {
            apiUrl: { zh: "Claude 命令路径", en: "Claude CLI path" },
        },
        models: ["sonnet", "opus", "haiku"],
        urls: ["claude"],
    },

    // ---- Classic machine translation ----
    { id: "deepl", name: "DeepL", engines: BOTH, fields: ["apiKey"] },
    {
        id: "deeplx",
        name: "DeepLX",
        engines: LEGACY,
        fields: ["apiUrl", "apiKey"],
        labels: {
            apiKey: {
                zh: "Access Token（可选）",
                en: "Access token (optional)",
            },
        },
    },
    {
        id: "tencent",
        name: "Tencent Translate",
        engines: BOTH,
        fields: ["model", "apiKey"],
        labels: {
            model: { zh: "Secret ID", en: "Secret ID" },
            apiKey: { zh: "Secret Key", en: "Secret Key" },
        },
    },
    {
        id: "azure",
        name: "Azure Translator",
        engines: BOTH,
        fields: ["apiKey", "apiUrl"],
        labels: { apiUrl: { zh: "Endpoint", en: "Endpoint" } },
    },
    {
        id: "dify",
        name: "Dify",
        engines: BOTH,
        fields: ["apiKey", "apiUrl"],
    },
    {
        id: "anythingllm",
        name: "AnythingLLM",
        engines: BOTH,
        fields: ["apiKey", "apiUrl"],
    },
];

const SERVICE_BY_ID = new Map(SERVICES.map((service) => [service.id, service]));

export function getService(id: string): ServiceMeta | undefined {
    return SERVICE_BY_ID.get(id);
}

/** Display label of a service id; unknown (custom) ids are shown verbatim. */
export function serviceLabel(id: string): string {
    return SERVICE_BY_ID.get(id)?.name ?? id;
}

export function serviceSupportsEngine(id: string, engine: EngineId): boolean {
    const meta = SERVICE_BY_ID.get(id);
    // A custom id is passed straight to the engine; let the user try it.
    return meta ? meta.engines.includes(engine) : true;
}

/** Fields worth showing for a service; custom services get all three. */
export function serviceFields(id: string): ProfileField[] {
    return SERVICE_BY_ID.get(id)?.fields ?? ["apiKey", "model", "apiUrl"];
}

export function servicePrefKey(engine: EngineId): "service" | "next_service" {
    return engine === "pdf2zh" ? "service" : "next_service";
}

// Keep in sync with server/utils/config_map.py pdf2zh_next_service_aliases.
const PDF2ZH_NEXT_SERVICE_ALIASES: Record<string, string> = {
    ModelScope: "modelscope",
    openailiked: "openaicompatible",
    tencent: "tencentmechinetranslation",
    silicon: "siliconflow",
    "qwen-mt": "qwenmt",
    AliyunDashScope: "aliyundashscope",
    "azure-openai": "azureopenai",
};

const REASONING_EFFORT_VALUES = ["minimal", "low", "medium", "high"];

const JSON_MODE: LocalizedText = {
    zh: "JSON 模式（默认关闭）",
    en: "JSON mode (off by default)",
};
const TIMEOUT: LocalizedText = {
    zh: "单次请求超时（秒）",
    en: "Request timeout (seconds)",
};
const TEMPERATURE: LocalizedText = { zh: "温度", en: "Temperature" };

// Keep in sync with server/utils/config_map.py pdf2zh_next extraData.
const PDF2ZH_NEXT_EXTRA_FIELDS: Record<string, ExtraFieldMeta[]> = {
    openai: [
        { key: "openai_timeout", type: "string", ...TIMEOUT },
        { key: "openai_temperature", type: "string", ...TEMPERATURE },
        {
            key: "openai_reasoning_effort",
            type: "enum",
            values: REASONING_EFFORT_VALUES,
            zh: "推理强度",
            en: "Reasoning effort",
        },
        { key: "openai_enable_json_mode", type: "bool", ...JSON_MODE },
        {
            // pdf2zh_next keeps this historical spelling.
            key: "openai_send_temprature",
            type: "bool",
            zh: "发送 temperature",
            en: "Send temperature",
        },
        {
            key: "openai_send_reasoning_effort",
            type: "bool",
            zh: "发送 reasoning effort",
            en: "Send reasoning effort",
        },
    ],
    aliyundashscope: [
        { key: "aliyun_dashscope_timeout", type: "string", ...TIMEOUT },
        {
            key: "aliyun_dashscope_temperature",
            type: "string",
            ...TEMPERATURE,
        },
        {
            key: "aliyun_dashscope_send_temperature",
            type: "bool",
            zh: "发送 temperature",
            en: "Send temperature",
        },
        {
            key: "aliyun_dashscope_enable_json_mode",
            type: "bool",
            ...JSON_MODE,
        },
    ],
    ollama: [
        {
            key: "num_predict",
            type: "string",
            zh: "最大预测 token 数",
            en: "Max predicted tokens",
        },
    ],
    azureopenai: [
        {
            key: "azure_openai_api_version",
            type: "string",
            zh: "API 版本",
            en: "API version",
        },
    ],
    modelscope: [
        { key: "modelscope_enable_json_mode", type: "bool", ...JSON_MODE },
    ],
    zhipu: [{ key: "zhipu_enable_json_mode", type: "bool", ...JSON_MODE }],
    siliconflow: [
        {
            key: "siliconflow_enable_thinking",
            type: "bool",
            zh: "启用思考",
            en: "Enable thinking",
        },
        {
            key: "siliconflow_send_enable_thinking_param",
            type: "bool",
            zh: "发送思考参数",
            en: "Send thinking parameter",
        },
        { key: "siliconflow_enable_json_mode", type: "bool", ...JSON_MODE },
    ],
    siliconflowfree: [
        {
            key: "siliconflow_free_enable_json_mode",
            type: "bool",
            ...JSON_MODE,
        },
    ],
    gemini: [{ key: "gemini_enable_json_mode", type: "bool", ...JSON_MODE }],
    grok: [{ key: "grok_enable_json_mode", type: "bool", ...JSON_MODE }],
    groq: [{ key: "groq_enable_json_mode", type: "bool", ...JSON_MODE }],
    deepseek: [
        {
            key: "deepseek_thinking_mode",
            type: "enum",
            values: ["disabled", "enabled"],
            zh: "思考模式（默认关闭以控制费用）",
            en: "Thinking mode (off by default to control cost)",
        },
        {
            key: "deepseek_reasoning_effort",
            type: "enum",
            values: ["high", "max"],
            zh: "思考强度（仅思考模式开启时生效）",
            en: "Reasoning effort (only when thinking is enabled)",
        },
        { key: "deepseek_enable_json_mode", type: "bool", ...JSON_MODE },
    ],
    qwenmt: [
        {
            key: "ali_domains",
            type: "string",
            zh: "领域提示",
            en: "Domain hint",
        },
    ],
    openaicompatible: [
        { key: "openai_compatible_timeout", type: "string", ...TIMEOUT },
        {
            key: "openai_compatible_temperature",
            type: "string",
            ...TEMPERATURE,
        },
        {
            key: "openai_compatible_reasoning_effort",
            type: "enum",
            values: REASONING_EFFORT_VALUES,
            zh: "推理强度",
            en: "Reasoning effort",
        },
        {
            key: "openai_compatible_send_temperature",
            type: "bool",
            zh: "发送 temperature",
            en: "Send temperature",
        },
        {
            key: "openai_compatible_send_reasoning_effort",
            type: "bool",
            zh: "发送 reasoning effort",
            en: "Send reasoning effort",
        },
        {
            key: "openai_compatible_enable_json_mode",
            type: "bool",
            ...JSON_MODE,
        },
    ],
};

/** Typed extra parameters pdf2zh_next understands for a service. */
export function extraFieldsFor(serviceId: string): ExtraFieldMeta[] {
    const canonical = PDF2ZH_NEXT_SERVICE_ALIASES[serviceId] || serviceId;
    return PDF2ZH_NEXT_EXTRA_FIELDS[canonical] || [];
}

// ---------------------------------------------------------------------------
// Languages
// ---------------------------------------------------------------------------

export const COMMON_LANGUAGES = [
    "en",
    "zh-CN",
    "zh-TW",
    "zh-HK",
    "ja",
    "ko",
    "fr",
    "de",
    "es",
    "ru",
    "pt",
    "it",
];

// Names Intl.DisplayNames renders awkwardly ("Chinese (China)").
const LANGUAGE_NAME_OVERRIDES: Record<string, LocalizedText> = {
    "zh-CN": { zh: "简体中文", en: "Chinese (Simplified)" },
    "zh-TW": { zh: "繁体中文（台湾）", en: "Chinese (Traditional, Taiwan)" },
    "zh-HK": {
        zh: "繁体中文（香港）",
        en: "Chinese (Traditional, Hong Kong)",
    },
};

// Language code -> English name; also the fallback when Intl has no data.
export const LANGUAGES: Record<string, string> = {
    en: "English",
    "zh-CN": "Simplified Chinese",
    "zh-HK": "Traditional Chinese - Hong Kong",
    "zh-TW": "Traditional Chinese - Taiwan",
    ja: "Japanese",
    ko: "Korean",
    pl: "Polish",
    ru: "Russian",
    es: "Spanish",
    pt: "Portuguese",
    "pt-BR": "Brazilian Portuguese",
    fr: "French",
    ms: "Malay",
    id: "Indonesian",
    tk: "Turkmen",
    tl: "Filipino (Tagalog)",
    vi: "Vietnamese",
    kk: "Kazakh (Latin)",
    de: "German",
    nl: "Dutch",
    ga: "Irish",
    it: "Italian",
    el: "Greek",
    sv: "Swedish",
    da: "Danish",
    no: "Norwegian",
    is: "Icelandic",
    fi: "Finnish",
    uk: "Ukrainian",
    cs: "Czech",
    ro: "Romanian",
    hu: "Hungarian",
    sk: "Slovak",
    hr: "Croatian",
    et: "Estonian",
    lv: "Latvian",
    lt: "Lithuanian",
    be: "Belarusian",
    mk: "Macedonian",
    sq: "Albanian",
    sr: "Serbian (Cyrillic)",
    sl: "Slovenian",
    ca: "Catalan",
    bg: "Bulgarian",
    mt: "Maltese",
    sw: "Swahili",
    am: "Amharic",
    om: "Oromo",
    ti: "Tigrinya",
    ht: "Haitian Creole",
    la: "Latin",
    lo: "Lao",
    ml: "Malayalam",
    gu: "Gujarati",
    th: "Thai",
    my: "Burmese",
    ta: "Tamil",
    te: "Telugu",
    or: "Oriya",
    hy: "Armenian",
    mn: "Mongolian (Cyrillic)",
    ka: "Georgian",
    km: "Khmer",
    bs: "Bosnian",
    lb: "Luxembourgish",
    rm: "Romansh",
    tr: "Turkish",
    si: "Sinhala",
    uz: "Uzbek",
    ky: "Kyrgyz",
    tg: "Tajik",
    ab: "Abkhazian",
    aa: "Afar",
    af: "Afrikaans",
    ak: "Akan",
    an: "Aragonese",
    av: "Avaric",
    ee: "Ewe",
    ay: "Aymara",
    oj: "Ojibwa",
    oc: "Occitan",
    os: "Ossetian",
    pi: "Pali",
    ba: "Bashkir",
    eu: "Basque",
    br: "Breton",
    ch: "Chamorro",
    ce: "Chechen",
    cv: "Chuvash",
    tn: "Tswana",
    nr: "Ndebele, South",
    ng: "Ndonga",
    fo: "Faroese",
    fj: "Fijian",
    fy: "Frisian, Western",
    lg: "Ganda",
    kg: "Kongo",
    kl: "Kalaallisut",
    cu: "Church Slavic",
    gn: "Guarani",
    ia: "Interlingua",
    hz: "Herero",
    ki: "Kikuyu",
    rn: "Rundi",
    rw: "Kinyarwanda",
    gl: "Galician",
    kr: "Kanuri",
    kw: "Cornish",
    kv: "Komi",
    xh: "Xhosa",
    co: "Corsican",
    cr: "Cree",
    qu: "Quechua",
    ku: "Kurdish (Latin)",
    kj: "Kuanyama",
    li: "Limburgan",
    ln: "Lingala",
    gv: "Manx",
    mg: "Malagasy",
    mh: "Marshallese",
    mi: "Maori",
    nv: "Navajo",
    na: "Nauru",
    ny: "Nyanja",
    nn: "Norwegian Nynorsk",
    sc: "Sardinian",
    se: "Northern Sami",
    sm: "Samoan",
    sg: "Sango",
    sn: "Shona",
    eo: "Esperanto",
    gd: "Scottish Gaelic",
    so: "Somali",
    st: "Southern Sotho",
    tt: "Tatar",
    ty: "Tahitian",
    to: "Tongan",
    tw: "Twi",
    wa: "Walloon",
    cy: "Welsh",
    ve: "Venda",
    vo: "Volapük",
    ie: "Interlingue",
    ho: "Hiri Motu",
    ig: "Igbo",
    io: "Ido",
    iu: "Inuktitut",
    ik: "Inupiaq",
    ii: "Sichuan Yi",
    yo: "Yoruba",
    za: "Zhuang",
    ts: "Tsonga",
    zu: "Zulu",
};

/** Human-readable name of a language code in the UI language. */
export function languageName(code: string, uiLocale: string): string {
    const lang = uiLocale.toLowerCase().startsWith("zh") ? "zh" : "en";
    const override = LANGUAGE_NAME_OVERRIDES[code];
    if (override) return override[lang];
    const fallback = LANGUAGES[code] || code;
    if (lang === "en") return fallback;
    try {
        const localized = new Intl.DisplayNames([uiLocale], {
            type: "language",
        }).of(code);
        // Intl echoes the code back when it has no name for it.
        return localized && localized !== code ? localized : fallback;
    } catch {
        return fallback;
    }
}
