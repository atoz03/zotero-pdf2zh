## server.py v4.0.0
# guaguastandup
# zotero-pdf2zh
import json, toml
import os
import threading

from utils.config_map import (
    pdf2zh_config_map,
    pdf2zh_next_config_map,
    pdf2zh_next_service_aliases,
)
from utils.deepseek_thinking import (
    is_deepseek_v4_model,
    normalize_deepseek_extra_data,
    remove_stale_thinking_fields,
    validate_winexe_runtime_if_selected,
)

pdf2zh = 'pdf2zh'
pdf2zh_next = 'pdf2zh_next'

# config.json / config.toml are shared by every request: serialise the
# read-modify-write so two jobs starting together cannot interleave.
_CONFIG_FILE_LOCK = threading.Lock()

MAX_POOL_WORKERS = 1000
MAX_CUSTOM_PROMPT_CHARS = 8000

_OPENAI_SEND_TEMPERATURE_ALIAS = 'openai_send_temperature'
_OPENAI_SEND_TEMPERATURE_UPSTREAM = 'openai_send_temprature'


def _normalize_openai_send_temperature_key(values):
    """Map this project's old spelling to pdf2zh_next's compatibility key."""
    if not isinstance(values, dict):
        return
    if (
        _OPENAI_SEND_TEMPERATURE_ALIAS in values
        and _OPENAI_SEND_TEMPERATURE_UPSTREAM not in values
    ):
        values[_OPENAI_SEND_TEMPERATURE_UPSTREAM] = values[
            _OPENAI_SEND_TEMPERATURE_ALIAS
        ]
    values.pop(_OPENAI_SEND_TEMPERATURE_ALIAS, None)


def _safe_log_value(key, value):
    name = str(key or '').lower()
    if any(token in name for token in ('key', 'token', 'secret', 'password', 'auth')):
        raw = str(value or '')
        if not raw:
            return ''
        return ('*' * 8 + raw[-4:]) if len(raw) > 4 else ('*' * len(raw))
    return value


def stringToBoolean(value):
    if value == 'true' or value == 'True' or value == True or value == 1:
        return True
    return False


def _bounded_int(value, default, minimum, maximum):
    try:
        number = int(value)
    except (ValueError, TypeError):
        return default
    return max(minimum, min(maximum, number))


def _write_private(path, dump):
    """Write a per-job config copy; it holds API keys, so keep it owner-only."""
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w', encoding='utf-8') as f:
        dump(f)


_TRUE_VALUES = {'true', '1', 'yes', 'on'}
_FALSE_VALUES = {'false', '0', 'no', 'off'}


def resolve_pdf2zh_next_service(service):
    return pdf2zh_next_service_aliases.get(service, service)


def _is_pdf2zh_next_bool_extra_key(key):
    name = str(key or '')
    return (
        name.endswith('_enable_json_mode')
        or name.endswith('_send_temprature')
        or name.endswith('_send_temperature')
        or name.endswith('_send_reasoning_effort')
        or name.endswith('_enable_thinking')
        or name.endswith('_send_enable_thinking_param')
    )


def coerce_pdf2zh_next_extra_value(key, value):
    """Keep extraData types compatible with pdf2zh_next pydantic fields.

    The plugin always sends extraData values as strings. toml needs native
    bool/int so fields like openai_enable_json_mode=false actually work.
    Empty values are skipped by the caller; False and 0 must still be written.
    """
    if isinstance(value, bool):
        return value
    if _is_pdf2zh_next_bool_extra_key(key):
        if isinstance(value, (int, float)) and value in (0, 1):
            return bool(value)
        text = str(value).strip().lower()
        if text in _TRUE_VALUES:
            return True
        if text in _FALSE_VALUES:
            return False
        return value
    if str(key) == 'num_predict':
        if isinstance(value, int) and not isinstance(value, bool):
            return value
        try:
            return int(str(value).strip())
        except (TypeError, ValueError):
            return value
    return value


class Config:
    def __init__(self, request_data):
        self.engine = request_data.get('engine', 'pdf2zh')
        if self.engine not in [pdf2zh, pdf2zh_next]:
            self.engine = pdf2zh

        if self.engine == pdf2zh:
            self.service = request_data.get('service', 'bing')
            if self.service in [None, ''] or len(self.service) < 3:
                self.service = 'bing'
            if self.service == 'ModelScope': # pdf2zh 1.x 的服务名是小写
                self.service = 'modelscope'
        else:
            if not request_data.get('next_service') or request_data.get('next_service') in [None, '']:
                self.service = request_data.get('service', 'siliconflowfree')
            else:
                self.service = request_data.get('next_service', 'siliconflowfree')
            if self.service in [None, ''] or len(self.service) < 3:
                self.service = 'siliconflowfree'

        self.sourceLang = request_data.get('sourceLang', 'en')
        if self.sourceLang in [None, ''] or len(self.sourceLang) < 2:
            self.sourceLang = 'en'
        self.targetLang = request_data.get('targetLang', 'zh-CN')
        if self.targetLang in [None, ''] or len(self.targetLang) < 2:
            self.targetLang = 'zh-CN'

        self.skip_last_pages = request_data.get('skipLastPages', 0)
        try:
            self.skip_last_pages = int(self.skip_last_pages)
        except (ValueError, TypeError):
            self.skip_last_pages = 0
        if self.skip_last_pages < 0:
            self.skip_last_pages = 0

        self.thread_num = request_data.get('threadNum', 8)
        try: 
            self.thread_num = int(self.thread_num)
            if self.thread_num < 1:
                self.thread_num = 8
        except (ValueError, TypeError):
            self.thread_num = 8
        
        self.qps = request_data.get('qps', 4)
        try:
            self.qps = int(self.qps)
        except (ValueError, TypeError):
            self.qps = 4
        if self.qps < 1:
            self.qps = 4
        
        self.pool_size = request_data.get('poolSize', 0)
        try:
            self.pool_size = int(self.pool_size)
        except (ValueError, TypeError):
            self.pool_size = 0

        # pdf2zh_next uses qps as the worker count when pool_max_workers is unset.
        # Keep 0 as "unset/follow qps" instead of the legacy qps * 10 expansion.
        if self.pool_size < 0:
            self.pool_size = 0
        if self.pool_size > MAX_POOL_WORKERS:
            self.pool_size = MAX_POOL_WORKERS

        # Workers used by pdf2zh_next's automatic term extraction. 0 keeps the
        # upstream default (same as the translation worker count).
        self.term_pool_size = _bounded_int(
            request_data.get('termPoolSize', 0), 0, 0, MAX_POOL_WORKERS
        )

        # 如果左右留白部分裁剪太多了, 可以调整pdf_w_offset和pdf_offset_ratio, 宽边裁剪值pdf_w_offset, 窄边裁剪值pdf_w_offset/pdf_offset_ratio
        # TODO: 将裁剪的逻辑添加到zotero配置页面
        self.pdf_w_offset = int(request_data.get('pdf_w_offset', 40))
        self.pdf_h_offset = int(request_data.get('pdf_h_offset', 20))
        self.pdf_offset_ratio = float(request_data.get('pdf_offset_ratio', 5))
        self.pdf_white_margin = int(request_data.get('pdf_white_margin', 0))

        self.mono = stringToBoolean(request_data.get('mono', True))
        self.dual = stringToBoolean(request_data.get('dual', True))
        self.mono_cut = stringToBoolean(request_data.get('mono_cut', False))
        self.dual_cut = stringToBoolean(request_data.get('dual_cut', False))
        self.crop_compare = stringToBoolean(request_data.get('crop_compare', False))
        self.compare = stringToBoolean(request_data.get('compare', False))
        # pdf2zh 1.x
        self.babeldoc = stringToBoolean(request_data.get('babeldoc', False))
        self.skip_font_subsets = stringToBoolean(request_data.get('skipSubsetFonts', False))
        self.font_file = request_data.get('fontFile', '') # pdf2zh 对应的字体路径
        # pdf2zh 2.x
        self.font_family = request_data.get('fontFamily', 'auto') # pdf2zh_next对应的字体选择
        self.dual_mode = request_data.get('dualMode', 'LR')
        self.trans_first = stringToBoolean(request_data.get('transFirst', False))
        self.ocr = stringToBoolean(request_data.get('ocr', False))
        self.auto_ocr = stringToBoolean(request_data.get('autoOcr', False))
        self.no_watermark = stringToBoolean(request_data.get('noWatermark', True))
        self.save_auto_extracted_glossary = stringToBoolean(request_data.get('saveGlossary', False))
        self.disable_glossary = stringToBoolean(request_data.get('disableGlossary', False))
        self.no_dual = stringToBoolean(request_data.get('noDual', False))
        self.no_mono = stringToBoolean(request_data.get('noMono', False))
        self.skip_clean = stringToBoolean(request_data.get('skipClean', False))
        self.enhance_compatibility = stringToBoolean(request_data.get('enhanceCompatibility', False))
        self.disable_rich_text_translate = stringToBoolean(request_data.get('disableRichTextTranslate', False))
        self.translate_table_text = stringToBoolean(request_data.get('translateTableText', False))
        self.only_include_translated_page = stringToBoolean(request_data.get('onlyIncludeTranslatedPage', False))
        # Only override these config.toml values when the plugin actually sends
        # them, so an older plugin leaves hand-edited settings alone.
        self.sends_term_pool_size = 'termPoolSize' in request_data
        self.sends_cache_options = 'ignoreCache' in request_data
        self.sends_custom_prompt = 'customSystemPrompt' in request_data
        self.ignore_cache = stringToBoolean(request_data.get('ignoreCache', False))
        self.custom_system_prompt = str(request_data.get('customSystemPrompt') or '').strip()[:MAX_CUSTOM_PROMPT_CHARS]
        # Non-fatal problems collected while the job runs, returned with the result.
        self.warnings = []

        print("\n🔍 Config without llm_api: ", self.__dict__)

        self.llm_api = {
            'apiKey': request_data.get('llm_api', {}).get('apiKey', ''),
            'apiUrl': request_data.get('llm_api', {}).get('apiUrl', ''),
            'model': request_data.get('llm_api', {}).get('model', ''),
            'threadnum': request_data.get('llm_api', {}).get('threadNum', self.thread_num), # TODO, 为每个服务单独配置线程数, 暂时不实现
            'extraData': request_data.get('llm_api', {}).get('extraData', {})
        }

    def effective_term_workers(self):
        """Workers for pdf2zh_next term extraction, or None for its default."""
        if self.term_pool_size <= 0:
            return None
        # Never run more extraction requests at once than the user allows for
        # translation itself (a local model with qps=1 must stay at 1).
        ceiling = self.pool_size if self.pool_size > 0 else self.qps
        return max(1, min(self.term_pool_size, ceiling))

    def update_config_file(self, config_file, job_config_file=None):
        """Apply this request to the engine's config file.

        config_file is the shared file that remembers each service's settings.
        When job_config_file is given, the same content is also written there
        and that private copy is what the engine should be started with, so a
        second job cannot rewrite the config under a job that is still starting.
        Returns the path to hand to the engine.
        """
        if self.engine not in (pdf2zh, pdf2zh_next):
            print(f"✏️ 不支持的引擎类型: {self.engine}")
            return config_file
        with _CONFIG_FILE_LOCK:
            if self.engine == pdf2zh:
                self._update_pdf2zh_config(config_file, job_config_file)
            else:
                self._update_pdf2zh_next_config(config_file, job_config_file)
        return job_config_file or config_file

    def _update_pdf2zh_config(self, config_file, job_config_file):
        service = self.service
        config_map = pdf2zh_config_map.get(service, {})

        with open(config_file, 'r', encoding='utf-8') as f:
            old_config = json.load(f)

        new_config = old_config.copy()

        # 更新字体 (与服务无关, 没有config_map的服务也需要)
        if self.font_file and os.path.exists(self.font_file):
            new_config['NOTO_FONT_PATH'] = self.font_file
            print(f"✏️ 更新字体路径: {self.font_file}")

        if config_map:
            self._apply_pdf2zh_translator(new_config, service, config_map)
        else: # 无需映射, 只写入与服务无关的设置
            print(f"🔍 No config_map found for service: {service}, 如果是新的服务, 请联系开发者更新config_map, 如果不是请忽略")

        def dump(f):
            json.dump(new_config, f, indent=4, ensure_ascii=False)

        with open(config_file, 'w', encoding='utf-8') as f:
            dump(f)
            print(f"✏️ 更新 config file: {config_file}")
        if job_config_file:
            _write_private(job_config_file, dump)

    def _apply_pdf2zh_translator(self, new_config, service, config_map):
        translators = new_config.get('translators')
        if not isinstance(translators, list):
            translators = []
            new_config['translators'] = translators

        translator = None
        for t in translators:
            if isinstance(t, dict) and t.get('name') == service:
                translator = t
                break

        if translator is None:
            print(f"✏️ 服务 '{service}' 在先前配置中不存在, 创建新配置")
            translator = {'name': service, 'envs': {}}
            translators.append(translator)
        else:
            if not isinstance(translator.get('envs'), dict):
                translator['envs'] = {}

        translator_keys = []
        if 'extraData' in config_map:
            for key in config_map['extraData']:
                translator_keys.append(key)

        # 先对三个基本的参数进行映射, 如果存在映射关系, 则更新
        keys = ['apiKey', 'apiUrl', 'model']
        for key in keys:
            if key in self.llm_api and key in config_map:
                value = self.llm_api[key]
                mapped_key = config_map[key]
                if value not in (None, "", [], {}):  # 跳过空值
                    translator['envs'][mapped_key] = value
                    translator_keys.append(mapped_key)
                    print(f"✏️ 更新 {key}: {mapped_key} = {_safe_log_value(f'{key}:{mapped_key}', value)}")
                else:
                    print(f"✏️ 跳过 {key}: {mapped_key} = {value} (empty or null)")

        # 将用户设置的extraData也进行映射, 如果存在映射关系, 则更新
        if 'extraData' in self.llm_api and isinstance(self.llm_api['extraData'], dict):
            for key, value in self.llm_api['extraData'].items():
                if value not in (None, "", [], {}):
                    translator['envs'][key] = value
                    translator_keys.append(key)
                    print(f"✏️ 更新 extraData: {key} = {_safe_log_value(key, value)}")
                else:
                    print(f"✏️ 跳过 extraData: {key} = {value} (empty or null)")

        # 将所有不在translator_keys中的key删除
        for key in list(translator['envs']):
            if key not in translator_keys:
                del translator['envs'][key]
                print(f"✏️ 删除旧 {key}")

    def _update_pdf2zh_next_config(self, config_file, job_config_file):
        # toml文件, 格式参考server/config/config.toml.example
        service = resolve_pdf2zh_next_service(self.service)
        config_map = pdf2zh_next_config_map.get(service, {})

        with open(config_file, 'r', encoding='utf-8') as f:
            old_config = toml.load(f)

        # A previous DeepSeek V4 attempt may have written 2.9-only fields.
        # For every non-DeepSeek request, scrub those fields before an older
        # runtime gets a chance to parse the shared config.toml.
        if service != 'deepseek':
            old_deepseek_detail = old_config.get('deepseek_detail')
            if isinstance(old_deepseek_detail, dict):
                remove_stale_thinking_fields(old_deepseek_detail, '')

        # extraData is the generic plugin transport. DeepSeek V4 uses it to
        # carry the user's intent, but the server normalizes the values here
        # and execute.py later maps them to the exact upstream CLI flags.
        effective_deepseek_model = ''
        if service == 'deepseek':
            effective_deepseek_model = normalize_deepseek_extra_data(
                self.llm_api,
                old_config,
            )
            if is_deepseek_v4_model(effective_deepseek_model):
                extra_data = self.llm_api.get("extraData") or {}
                thinking_mode = extra_data.get(
                    "deepseek_thinking_mode", "disabled"
                )
                # winexe bypasses execute_with_progress(), so protect that
                # execution path here. uv/conda/system runtimes are checked
                # against the exact executable immediately before launch.
                write_thinking_fields = validate_winexe_runtime_if_selected(
                    config_file,
                    effective_deepseek_model,
                    thinking_mode=thinking_mode,
                )
                if not write_thinking_fields:
                    extra_data.pop("deepseek_thinking_mode", None)
                    extra_data.pop("deepseek_reasoning_effort", None)
                    self.llm_api["extraData"] = extra_data

        new_config = old_config.copy() # 我们假设config.toml文件的格式没有问题

        # Request-scoped pdf2zh_next options live in config.toml. They are
        # written for every service, including the ones without a config_map
        # (bing, google, ...), otherwise the previous request's values stick.
        translation_config = new_config.setdefault('translation', {})
        translation_config['pool_max_workers'] = self.pool_size if self.pool_size > 0 else 'null'
        if self.sends_term_pool_size:
            # term_qps is deliberately left alone: without a dedicated
            # --term-<service> engine pdf2zh_next ignores it, and the worker
            # count is what actually bounds concurrent extraction requests.
            term_workers = self.effective_term_workers()
            translation_config['term_pool_max_workers'] = term_workers if term_workers else 'null'
            print(f"✏️ 术语提取并发: {term_workers if term_workers else '跟随翻译并发'}")
        if self.sends_cache_options:
            translation_config['ignore_cache'] = self.ignore_cache
        if self.sends_custom_prompt:
            translation_config['custom_system_prompt'] = self.custom_system_prompt or 'null'
        pdf_config = new_config.setdefault('pdf', {})
        pdf_config['only_include_translated_page'] = self.only_include_translated_page

        if config_map:
            self._apply_pdf2zh_next_translator(
                new_config, service, config_map, effective_deepseek_model
            )
        else:
            print(f"✏️ No config_map found for service: {service}, 如果是新的服务, 请联系开发者更新config_map")

        def dump(f):
            toml.dump(new_config, f)

        with open(config_file, 'w', encoding='utf-8') as f:
            dump(f)
            print(f"✏️ 更新 config file: {config_file}")
        if job_config_file:
            _write_private(job_config_file, dump)

    def _apply_pdf2zh_next_translator(self, new_config, service, config_map, effective_deepseek_model):
        translator = None
        if f'{service}_detail' in new_config:
            translator = new_config[f'{service}_detail']
        else:
            print(f"✏️ 服务 '{service}' 在先前配置中不存在, 创建新配置")
            translator = {}
            new_config[f'{service}_detail'] = translator

        if service == 'deepseek':
            remove_stale_thinking_fields(translator, effective_deepseek_model)
        elif service == 'openai':
            # Older zotero-pdf2zh releases exposed the correctly spelled
            # key, while pdf2zh_next intentionally retains the historical
            # "temprature" typo. Migrate both saved TOML and persisted
            # plugin extraData without affecting OpenAI-compatible services.
            _normalize_openai_send_temperature_key(translator)
            _normalize_openai_send_temperature_key(
                self.llm_api.get('extraData')
            )

        translator_keys = ['translate_engine_type', 'support_llm']
        if 'extraData' in config_map:
            for key in config_map['extraData']:
                translator_keys.append(key)

        keys = ['apiKey', 'apiUrl', 'model']
        for key in keys:
            if key in self.llm_api and key in config_map:
                value = self.llm_api[key]
                mapped_key = config_map[key]
                if value not in (None, "", [], {}):
                    translator[mapped_key] = value
                    translator_keys.append(mapped_key)
                    print(f"✏️ 更新 {key}: {mapped_key} = {_safe_log_value(f'{key}:{mapped_key}', value)}")
                else:
                    translator_keys.append(mapped_key)
                    print(f"✏️ 跳过 {key}: {mapped_key} = {value} (empty or null)")

        # 将用户设置的extraData也进行映射, 如果存在映射关系, 则更新
        if 'extraData' in self.llm_api and isinstance(self.llm_api['extraData'], dict):
            for key, value in self.llm_api['extraData'].items():
                coerced = coerce_pdf2zh_next_extra_value(key, value)
                if coerced not in (None, "", [], {}):
                    translator[key] = coerced
                    translator_keys.append(key)
                    print(f"✏️ 更新 extraData: {key} = {_safe_log_value(key, coerced)}")
                else:
                    print(f"✏️ 跳过 extraData: {key} = {value} (empty or null)")

        # 将translator中, 所有不在translator_keys中的key删除
        for key in list(translator.keys()):
            if key not in translator_keys:
                del translator[key]
                print(f"✏️ 删除旧 {key}")
