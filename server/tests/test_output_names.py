import runpy
import tempfile
import unittest
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[2]
SERVER = runpy.run_path(str(ROOT / "server" / "server.py"))
PDFTranslator = SERVER["PDFTranslator"]
EngineError = SERVER["EngineError"]


def _translator():
    # Name helpers only need the instance, not Flask or the environment manager.
    return PDFTranslator.__new__(PDFTranslator)


class OutputNameTest(unittest.TestCase):
    def test_only_the_suffix_changes(self):
        translator = _translator()
        cases = [
            ("/data/my.pdfs/paper.pdf", "mono-cut", "pdf2zh_next", "/data/my.pdfs/paper.mono-cut.pdf"),
            ("/data/notes.pdf.final.pdf", "compare", "pdf2zh_next", "/data/notes.pdf.final.compare.pdf"),
            ("/data/notes.pdf.final.pdf", "origin-cut", "pdf2zh", "/data/notes.pdf.final-cut.pdf"),
            ("/data/paper.pdf", "dual-cut", "pdf2zh", "/data/paper-dual-cut.pdf"),
            ("/data/a.zh-CN.mono.pdf", "mono-cut", "pdf2zh_next", "/data/a.zh-CN.mono-cut.pdf"),
            ("/data/a-dual.pdf", "compare", "pdf2zh", "/data/a-compare.pdf"),
            ("/data/a.zh-CN.LR_dual.pdf", "compare", "pdf2zh_next", "/data/a.zh-CN.compare.pdf"),
            ("/data/a.TB_dual.pdf", "dual-cut", "pdf2zh", "/data/a-dual-cut.pdf"),
        ]
        for source, out_type, engine, expected in cases:
            with self.subTest(source=source, out_type=out_type, engine=engine):
                self.assertEqual(
                    translator.get_filename_after_process(source, out_type, engine),
                    expected,
                )


class PageRangeTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.pdf = str(Path(self._tmp.name) / "three.pdf")
        document = pymupdf.open()
        for _ in range(3):
            document.new_page()
        document.save(self.pdf)
        document.close()

    def test_skipping_last_pages(self):
        self.assertIsNone(PDFTranslator._page_range(self.pdf, 0))
        self.assertEqual(PDFTranslator._page_range(self.pdf, 1), "1-2")
        self.assertEqual(PDFTranslator._page_range(self.pdf, 2), "1-1")

    def test_skipping_everything_is_refused(self):
        for skip in (3, 9):
            with self.subTest(skip=skip):
                with self.assertRaises(ValueError):
                    PDFTranslator._page_range(self.pdf, skip)


class ErrorPayloadTest(unittest.TestCase):
    def test_engine_error_keeps_its_reason_and_hint(self):
        info = _translator()._derive_error_info(
            EngineError("Incorrect API key provided", "BabeldocError", "auth")
        )
        self.assertEqual(
            info,
            {
                "errorType": "BabeldocError",
                "message": "Incorrect API key provided",
                "hint": "auth",
            },
        )

    def test_process_exit_without_output_does_not_dump_the_command(self):
        import subprocess

        error = subprocess.CalledProcessError(3, ["pdf2zh_next", "/secret/path.pdf"])
        info = _translator()._derive_error_info(error)
        self.assertNotIn("/secret/path.pdf", info["message"])
        self.assertIn("exit code 3", info["message"])


if __name__ == "__main__":
    unittest.main()
