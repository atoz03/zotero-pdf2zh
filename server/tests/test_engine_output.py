import unittest

from utils.engine_output import EngineOutput, classify_error, strip_ansi

API_ERROR = (
    "Error code: 401 - {'error': {'message': 'Incorrect API key provided. "
    "See https://platform.example.com/account/api-keys.', "
    "'type': 'invalid_request_error'}}"
)

# What pdf2zh_next 2.9 prints through rich's RichHandler in an 80-column
# terminal (colours removed). Long words are cut mid-word at the column edge.
FAILED_RUN_80 = """\
[10/08/26 12:00:00] INFO     INFO:pdf2zh_next.high_level:trans high_level.py:766
                             late in subprocess
                    ERROR    ERROR:pdf2zh_next.high_level:Tran high_level.py:766
                             slation error: Babeldoc
                             translation error: Error code:
                             401 - {'error': {'message':
                             'Incorrect API key provided. See
                             https://platform.example.com/acco
                             unt/api-keys.', 'type':
                             'invalid_request_error'}} -
                             Original error: Error code: 401 -
                             {'error': {'message': 'Incorrect
                             API key provided. See
                             https://platform.example.com/acco
                             unt/api-keys.', 'type':
                             'invalid_request_error'}}
                    ERROR    ERROR:pdf2zh_next.high_level:Orig high_level.py:766
                             inal babeldoc error: Error code:
                             401 - {'error': {'message':
                             'Incorrect API key provided. See
                             https://platform.example.com/acco
                             unt/api-keys.', 'type':
                             'invalid_request_error'}}
                    ERROR    ERROR:pdf2zh_next.high_level:Erro high_level.py:766
                             r translating file
                             /Users/me/zotero-pdf2zh/server/tr
                             anslated/Smith 2024 -
                             Attention.pdf: Babeldoc
                             translation error: Error code:
                             401 - {'error': {'message':
                             'Incorrect API key provided. See
                             https://platform.example.com/acco
                             unt/api-keys.', 'type':
                             'invalid_request_error'}} -
                             Original error: Error code: 401 -
                             {'error': {'message': 'Incorrect
                             API key provided. See
                             https://platform.example.com/acco
                             unt/api-keys.', 'type':
                             'invalid_request_error'}}
                    ERROR    ERROR:pdf2zh_next.high_level:Erro high_level.py:766
                             r type: BabeldocError
                    ERROR    ERROR:pdf2zh_next.high_level:Erro high_level.py:766
                             r details: Error code: 401 -
                             {'error': {'message': 'Incorrect
                             API key provided. See
                             https://platform.example.com/acco
                             unt/api-keys.', 'type':
                             'invalid_request_error'}}
"""

TERM_WARNINGS_80 = """\
[10/08/26 12:00:00] INFO     INFO:pdf2zh_next.high_level:trans high_level.py:766
                             late in subprocess
                    WARNING  WARNING:babeldoc.fo automatic_term_extractor.py:352
                             rmat.pdf.document_i
                             l.midend.automatic_
                             term_extractor:Erro
                             r during automatic
                             terms extract:
                             Request timed out.
                    WARNING  WARNING:babeldoc.fo automatic_term_extractor.py:352
                             rmat.pdf.document_i
                             l.midend.automatic_
                             term_extractor:Erro
                             r during automatic
                             terms extract:
                             Request timed out.
                    INFO     INFO:pdf2zh_next.high_level:Trans high_level.py:766
                             lation completed.
"""


def _feed(text, chunk=None):
    output = EngineOutput()
    data = text.replace("\n", "\r\n")
    if chunk:
        for start in range(0, len(data), chunk):
            output.feed(data[start : start + chunk])
    else:
        output.feed(data)
    output.finish()
    return output


class FailureReasonTest(unittest.TestCase):
    def test_reason_is_rebuilt_from_wrapped_rich_log(self):
        for chunk in (None, 1, 7, 64):
            with self.subTest(chunk=chunk):
                info = _feed(FAILED_RUN_80, chunk).describe_failure()
                self.assertEqual(info["message"], API_ERROR)
                self.assertEqual(info["errorType"], "BabeldocError")
                self.assertEqual(info["hint"], "auth")

    def test_subprocess_error_drops_the_traceback(self):
        output = _feed(
            "[10/08/26 12:00:00] ERROR    ERROR:pdf2zh_next.high_level:Translation error: "
            "Error during translation process: Connection error.   high_level.py:670\n"
            "                             Traceback: Traceback (most recent call last):\n"
            '                               File "/x/high_level.py", line 250, in run\n'
            "                             RuntimeError: boom\n"
        )
        info = output.describe_failure()
        self.assertEqual(
            info["message"], "Error during translation process: Connection error."
        )
        self.assertEqual(info["hint"], "network")

    def test_plain_python_traceback(self):
        output = _feed(
            "Traceback (most recent call last):\n"
            '  File "/venv/bin/pdf2zh", line 8, in <module>\n'
            "    sys.exit(main())\n"
            "openai.APITimeoutError: Request timed out.\n"
        )
        info = output.describe_failure()
        self.assertEqual(info["message"], "Request timed out.")
        self.assertEqual(info["errorType"], "APITimeoutError")
        self.assertEqual(info["hint"], "timeout")

    def test_nothing_useful_means_no_guess(self):
        output = _feed("INFO     Warmup babeldoc assets...   main.py:88\nall good\n")
        self.assertIsNone(output.describe_failure())

    def test_unreadably_narrow_log_is_ignored(self):
        output = _feed(
            "[10/08/26 12:00:00] ERROR    E high_level.py:…\n"
            + "".join(f"                             {ch}\n" for ch in "RROR:x:boom")
        )
        self.assertIsNone(output.describe_failure())


class TermExtractionWarningTest(unittest.TestCase):
    def test_failures_are_counted_with_their_reason(self):
        for chunk in (None, 5):
            with self.subTest(chunk=chunk):
                warnings = _feed(TERM_WARNINGS_80, chunk).warnings()
                self.assertEqual(
                    warnings,
                    [
                        {
                            "code": "term-extract-failed",
                            "count": 2,
                            "detail": "Request timed out.",
                            "hint": "timeout",
                        }
                    ],
                )

    def test_clean_run_has_no_warnings(self):
        self.assertEqual(_feed(FAILED_RUN_80).warnings(), [])


class TerminalNoiseTest(unittest.TestCase):
    def test_colours_and_hyperlinks_are_removed(self):
        raw = (
            "\x1b[33mWARNING \x1b[0m hello "
            "\x1b]8;id=1;file:///x/main.py\x1b\\main.py\x1b]8;;\x1b\\:\x1b[2m42\x1b[0m"
        )
        self.assertEqual(strip_ansi(raw), "WARNING  hello main.py:42")

    def test_progress_redraws_do_not_fill_the_buffer(self):
        output = EngineOutput(max_lines=5)
        for step in range(500):
            output.feed(f"\rtranslate \u2501\u2501\u2501\u2501 {step}/500")
            output.feed(f"\r 18%|\u2588\u258a        | {step}/500 [00:10<00:40]\r\n")
        output.feed("\rValueError: bad page range\r\n")
        output.finish()
        self.assertEqual(list(output.lines), ["ValueError: bad page range"])
        self.assertEqual(output.describe_failure()["message"], "bad page range")


class HintTest(unittest.TestCase):
    def test_known_error_families(self):
        cases = {
            "Error code: 401 - Incorrect API key provided": "auth",
            "Error code: 429 - Rate limit reached": "rate-limit",
            "账户余额不足": "rate-limit",
            "Request timed out.": "timeout",
            "httpx.ConnectError: [Errno 61] Connection refused": "network",
            "The model `gpt-9` does not exist": "model",
            "term_qps must be greater than 0": None,
            "": None,
        }
        for message, expected in cases.items():
            with self.subTest(message=message):
                self.assertEqual(classify_error(message), expected)


if __name__ == "__main__":
    unittest.main()
