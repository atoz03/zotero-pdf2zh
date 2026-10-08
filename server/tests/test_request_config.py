import json
import os
import stat
import tempfile
import unittest
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path

import toml

from utils.config import Config


def _next_request(**overrides):
    request = {
        "engine": "pdf2zh_next",
        "next_service": "openailiked",
        "qps": 10,
        "llm_api": {
            "apiKey": "sk-test-123456",
            "apiUrl": "https://api.example.com/v1",
            "model": "model-a",
            "extraData": {},
        },
    }
    request.update(overrides)
    return request


def _apply(request, config_file, job_file=None):
    with redirect_stdout(StringIO()):
        config = Config(request)
        used = config.update_config_file(str(config_file), job_file and str(job_file))
    return config, used


class Pdf2zhNextRequestSettingsTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.root = Path(self._tmp.name)
        self.config_file = self.root / "config.toml"
        with self.config_file.open("w", encoding="utf-8") as handle:
            toml.dump(
                {
                    "translation": {
                        "pool_max_workers": 50,
                        "term_qps": "null",
                        "term_pool_max_workers": 7,
                        "ignore_cache": True,
                        "custom_system_prompt": "hand written",
                    },
                    "pdf": {"only_include_translated_page": True},
                },
                handle,
            )

    def _translation(self, path=None):
        return toml.load(path or self.config_file)["translation"]

    def test_term_workers_follow_the_request(self):
        _apply(_next_request(termPoolSize=4), self.config_file)
        self.assertEqual(self._translation()["term_pool_max_workers"], 4)
        # term_qps does nothing without a dedicated term engine: never touched.
        self.assertEqual(self._translation()["term_qps"], "null")

    def test_term_workers_never_exceed_translation_concurrency(self):
        _apply(_next_request(termPoolSize=8, qps=2), self.config_file)
        self.assertEqual(self._translation()["term_pool_max_workers"], 2)
        _apply(_next_request(termPoolSize=8, qps=2, poolSize=6), self.config_file)
        self.assertEqual(self._translation()["term_pool_max_workers"], 6)
        _apply(_next_request(termPoolSize=1, qps=20), self.config_file)
        self.assertEqual(self._translation()["term_pool_max_workers"], 1)

    def test_zero_restores_the_engine_default(self):
        _apply(_next_request(termPoolSize=0), self.config_file)
        self.assertEqual(self._translation()["term_pool_max_workers"], "null")
        _apply(_next_request(termPoolSize="not a number"), self.config_file)
        self.assertEqual(self._translation()["term_pool_max_workers"], "null")

    def test_older_plugin_keeps_hand_edited_values(self):
        _apply(_next_request(), self.config_file)
        translation = self._translation()
        self.assertEqual(translation["term_pool_max_workers"], 7)
        self.assertIs(translation["ignore_cache"], True)
        self.assertEqual(translation["custom_system_prompt"], "hand written")

    def test_cache_and_prompt_options(self):
        _apply(
            _next_request(ignoreCache="false", customSystemPrompt="  Keep LLM as is.  "),
            self.config_file,
        )
        translation = self._translation()
        self.assertIs(translation["ignore_cache"], False)
        self.assertEqual(translation["custom_system_prompt"], "Keep LLM as is.")
        _apply(_next_request(customSystemPrompt=""), self.config_file)
        self.assertEqual(self._translation()["custom_system_prompt"], "null")

    def test_service_without_mapping_still_gets_request_settings(self):
        # bing/google have no config_map entry; the previous request's worker
        # count and page option used to stay in the file for them.
        _apply(
            _next_request(next_service="bing", poolSize=0, termPoolSize=3, llm_api={}),
            self.config_file,
        )
        loaded = toml.load(self.config_file)
        self.assertEqual(loaded["translation"]["pool_max_workers"], "null")
        self.assertEqual(loaded["translation"]["term_pool_max_workers"], 3)
        self.assertIs(loaded["pdf"]["only_include_translated_page"], False)

    def test_job_copy_is_private_and_complete(self):
        job_file = self.root / "job.toml"
        _, used = _apply(_next_request(termPoolSize=2), self.config_file, job_file)
        self.assertEqual(used, str(job_file))
        self.assertEqual(toml.load(job_file), toml.load(self.config_file))
        self.assertEqual(
            toml.load(job_file)["openaicompatible_detail"]["openai_compatible_api_key"],
            "sk-test-123456",
        )
        if os.name == "posix":
            self.assertEqual(stat.S_IMODE(job_file.stat().st_mode), 0o600)

    def test_without_job_copy_the_shared_file_is_used(self):
        _, used = _apply(_next_request(), self.config_file)
        self.assertEqual(used, str(self.config_file))

    def test_a_running_job_is_not_affected_by_the_next_request(self):
        first_job = self.root / "first.toml"
        _apply(_next_request(), self.config_file, first_job)
        other = _next_request()
        other["llm_api"] = dict(other["llm_api"], apiKey="sk-other", model="model-b")
        _apply(other, self.config_file, self.root / "second.toml")
        detail = toml.load(first_job)["openaicompatible_detail"]
        self.assertEqual(detail["openai_compatible_model"], "model-a")
        self.assertEqual(detail["openai_compatible_api_key"], "sk-test-123456")


class Pdf2zhLegacyConfigTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.root = Path(self._tmp.name)
        self.config_file = self.root / "config.json"
        self.config_file.write_text(json.dumps({"translators": []}), encoding="utf-8")
        self.font = self.root / "font.ttf"
        self.font.write_bytes(b"font")

    def _request(self, service, **overrides):
        request = {
            "engine": "pdf2zh",
            "service": service,
            "llm_api": {"apiKey": "key-123456", "model": "m", "extraData": {}},
        }
        request.update(overrides)
        return request

    def test_font_is_written_for_services_without_mapping(self):
        _apply(self._request("bing", fontFile=str(self.font)), self.config_file)
        loaded = json.loads(self.config_file.read_text(encoding="utf-8"))
        self.assertEqual(loaded["NOTO_FONT_PATH"], str(self.font))

    def test_modelscope_name_and_keys(self):
        for sent in ("ModelScope", "modelscope"):
            with self.subTest(sent=sent):
                config, _ = _apply(self._request(sent), self.config_file)
                self.assertEqual(config.service, "modelscope")
                loaded = json.loads(self.config_file.read_text(encoding="utf-8"))
                entry = next(t for t in loaded["translators"] if t["name"] == "modelscope")
                self.assertEqual(entry["envs"]["MODELSCOPE_API_KEY"], "key-123456")
                self.assertEqual(entry["envs"]["MODELSCOPE_MODEL"], "m")

    def test_config_without_translators_list(self):
        self.config_file.write_text("{}", encoding="utf-8")
        _apply(self._request("openai"), self.config_file)
        loaded = json.loads(self.config_file.read_text(encoding="utf-8"))
        self.assertEqual(loaded["translators"][0]["name"], "openai")


if __name__ == "__main__":
    unittest.main()
