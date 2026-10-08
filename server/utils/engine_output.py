"""Read a translation engine's terminal output so failures can be explained.

The exit code alone says very little: pdf2zh_next logs a failed translation
through rich and still exits 0, and it downgrades terminology-extraction
errors to warnings. This module keeps a small, progress-bar-free copy of what
the engine printed and pulls the useful parts back out of it.
"""
import re
import unicodedata
from collections import deque

_ANSI_RE = re.compile(
    r"\x1B\][^\x07\x1B]*(?:\x07|\x1B\\)"  # OSC ... BEL/ST (rich hyperlinks)
    r"|\x1B\[[0-?]*[ -/]*[@-~]"  # CSI
    r"|\x1B[@-Z\\-_]"  # two-byte escapes
)

# rich.logging.RichHandler: "[time] LEVEL    message            file.py:123".
# The time column is blank when it repeats. The message column is as wide as
# what the other columns leave; longer messages continue on lines indented to
# that column, and a word longer than the column is cut in the middle.
_LOG_HEAD_RE = re.compile(
    r"^(\s*(?:\[[^\]]*\]\s+)?(DEBUG|INFO|WARNING|ERROR|CRITICAL)\s+)(.*)$"
)
_LOG_PATH_RE = re.compile(r"\s+(?:[\w.\-]+:\d+|[\w.\-:]*…)$")
# Below this the message column is a few characters per line: not worth reading.
MIN_MESSAGE_COLUMNS = 8
# pdf2zh_next calls logging.basicConfig() without a format, so every message
# also carries the stdlib "LEVEL:logger.name:" prefix.
_LOG_PREFIX_RE = re.compile(r"^(?:DEBUG|INFO|WARNING|ERROR|CRITICAL):[\w.\-]+:")
_PROGRESS_LINE_RE = re.compile(r"[━╸╺█▏▎▍▌▋▊▉]|\d+%\|")
_TRACEBACK_LAST_LINE_RE = re.compile(
    r"^(?:[\w.]+\.)?\w*(?:Error|Exception|Exit|Interrupt|Timeout)\w*(?::\s.*)?$"
)


def _phrase(text):
    """Regex for a phrase whose spacing terminal wrapping may have changed."""
    return r"\s*".join(re.escape(ch) for ch in text if not ch.isspace())


_FILE_ERROR_RE = re.compile(
    "^" + _phrase("Error translating file") + r"\s+.*?p\s*d\s*f\s*:\s+(?P<msg>.+)$",
    re.IGNORECASE | re.DOTALL,
)
_ERROR_TYPE_RE = re.compile("^" + _phrase("Error type:") + r"\s*(?P<type>\S+)")
_TRANSLATION_ERROR_RE = re.compile(
    "^" + _phrase("Translation error:") + r"\s*(?P<msg>.+)$", re.DOTALL
)
_TERM_EXTRACT_RE = re.compile(
    _phrase("Error during automatic terms extract") + r"\s*:?\s*(?P<reason>.*)$",
    re.DOTALL,
)
_ORIGINAL_ERROR_RE = re.compile(r"\s-\sOriginal error:\s*(?P<msg>.+)$", re.DOTALL)

MAX_LINE_CHARS = 2000
MAX_PENDING_CHARS = 8192
MAX_MESSAGE_CHARS = 600

_HINT_PATTERNS = (
    (
        "auth",
        r"\b401\b|unauthori[sz]ed|invalid[ _-]?api[ _-]?key|incorrect api key"
        r"|authentication|invalid[ _]token|api key not valid",
    ),
    (
        "rate-limit",
        r"\b429\b|rate.?limit|too many requests|quota|insufficient[ _]balance"
        r"|余额不足",
    ),
    (
        "timeout",
        r"timed out|timeouterror|readtimeout|connecttimeout|request timeout"
        r"|gateway time-?out|\b504\b|\b408\b",
    ),
    (
        "network",
        r"connection (?:error|refused|reset|aborted)|connecterror"
        r"|apiconnectionerror|name or service not known|getaddrinfo"
        r"|nodename nor servname|temporary failure in name resolution"
        r"|\bssl\b|sslerror|certificate verify failed|proxyerror"
        r"|max retries exceeded",
    ),
    (
        "model",
        r"model[ _]not[ _]found|model .{0,80}does not exist|no such model"
        r"|model .{0,80}not found|invalid model",
    ),
)


def strip_ansi(text):
    return _ANSI_RE.sub("", text)


def _cut_mid_word(piece, width):
    """True when rich cut a word in the middle at the end of this line.

    Only a word longer than the whole column is cut, so such a line is one
    unbroken run of characters that fills the column. A line that wrapped at a
    space contains spaces or ends short of the column edge.
    """
    if width is None or not piece or any(ch.isspace() for ch in piece):
        return False
    wide = sum(1 for ch in piece if unicodedata.east_asian_width(ch) in ("W", "F"))
    cells = len(piece) + wide
    # A double-width character that does not fit leaves one cell unused.
    return cells >= width or (wide > 0 and cells == width - 1)


def classify_error(text):
    """Map an engine error message to a hint code the plugin can localise."""
    blob = str(text or "").lower()
    if not blob:
        return None
    for code, pattern in _HINT_PATTERNS:
        if re.search(pattern, blob):
            return code
    return None


def _shorten(message):
    message = " ".join(str(message or "").split())
    if len(message) > MAX_MESSAGE_CHARS:
        message = message[: MAX_MESSAGE_CHARS - 1].rstrip() + "…"
    return message


class EngineOutput:
    """Rolling view of an engine's output, fed with decoded terminal text."""

    def __init__(self, max_lines=400, max_errors=20):
        self.lines = deque(maxlen=max_lines)
        self.errors = deque(maxlen=max_errors)
        self.term_extract_failures = 0
        self.term_extract_reason = ""
        self._pending = ""
        self._record = None

    def feed(self, text):
        if not text:
            return
        self._pending += text
        if "\n" not in self._pending:
            self._trim_pending()
            return
        *complete, self._pending = self._pending.split("\n")
        for raw in complete:
            self._add_line(raw)
        self._trim_pending()

    def finish(self):
        """Flush a last line that had no newline and close the open record."""
        if self._pending:
            raw, self._pending = self._pending, ""
            self._add_line(raw)
        self._close_record()

    def text(self):
        return "\n".join(self.lines)

    def _trim_pending(self):
        # Progress bars redraw with a bare CR; only what follows the last
        # redraw can still become part of a real line.
        cut = self._pending.rfind("\r", 0, max(len(self._pending) - 1, 0))
        if cut >= 0:
            self._pending = self._pending[cut + 1 :]
        if len(self._pending) > MAX_PENDING_CHARS:
            self._pending = self._pending[-MAX_PENDING_CHARS:]

    def _add_line(self, raw):
        segments = [seg for seg in strip_ansi(raw).split("\r") if seg.strip()]
        if not segments:
            return
        line = segments[-1].rstrip()[:MAX_LINE_CHARS]
        if _PROGRESS_LINE_RE.search(line):
            return
        self.lines.append(line)

        head = _LOG_HEAD_RE.match(line)
        if head:
            self._close_record()
            indent = len(head.group(1))
            body = head.group(3)
            width = None
            path = _LOG_PATH_RE.search(body)
            if path:
                # One space separates the message column from the path column;
                # any further spaces are the message column's own padding.
                gap = len(path.group(0)) - len(path.group(0).lstrip())
                width = path.start() + gap - 1
                body = body[: path.start()]
            self._record = {
                "level": head.group(2),
                "indent": indent,
                "width": width,
                "text": body,
                "glue": _cut_mid_word(body, width),
            }
            return

        record = self._record
        if record is not None and line[: record["indent"]].strip() == "" and len(line) > record["indent"]:
            piece = line[record["indent"] :]
            record["text"] += piece if record["glue"] else " " + piece
            record["glue"] = _cut_mid_word(piece, record["width"])
            return
        self._close_record()

    def _close_record(self):
        record, self._record = self._record, None
        if record is None:
            return
        readable = record["width"] is None or record["width"] >= MIN_MESSAGE_COLUMNS
        level = record["level"]
        message = _LOG_PREFIX_RE.sub("", record["text"].strip()).strip()
        if not message:
            return
        if level in ("ERROR", "CRITICAL"):
            if readable:
                self.errors.append(message)
        elif level == "WARNING":
            # The marker is matched whatever the wrapping did to its spacing,
            # so failures are still counted in a very narrow terminal.
            match = _TERM_EXTRACT_RE.search(message)
            if match:
                self.term_extract_failures += 1
                reason = match.group("reason").strip()
                if reason and readable:
                    self.term_extract_reason = _shorten(reason)[:200]

    def describe_failure(self):
        """Best available one-line reason for a failed run, or None."""
        self.finish()
        message = ""
        error_type = ""
        for entry in reversed(self.errors):
            type_match = _ERROR_TYPE_RE.match(entry)
            if type_match:
                error_type = error_type or type_match.group("type")
                continue
            if not message:
                match = _FILE_ERROR_RE.match(entry)
                if match:
                    message = match.group("msg")
        if not message:
            for entry in reversed(self.errors):
                match = _TRANSLATION_ERROR_RE.match(entry)
                if match:
                    message = match.group("msg")
                    break
        if not message:
            message, traceback_type = self._traceback_reason()
            error_type = error_type or traceback_type
        if not message and self.errors:
            message = self.errors[-1]
        if not message:
            return None

        # SubprocessError appends the whole traceback to its message, and
        # BabeldocError repeats the root cause after "Original error:".
        message = re.split(r"\s+Traceback(?: \(most recent call last\))?:", message)[0]
        original = _ORIGINAL_ERROR_RE.search(message)
        if original:
            message = original.group("msg")
        message = _shorten(message)
        if not message:
            return None
        return {
            "message": message,
            "errorType": error_type or "EngineError",
            "hint": classify_error(f"{error_type} {message}"),
        }

    def _traceback_reason(self):
        for line in reversed(self.lines):
            stripped = line.strip()
            if not stripped or line[:1] in (" ", "\t"):
                continue
            if _TRACEBACK_LAST_LINE_RE.match(stripped):
                name, _, detail = stripped.partition(":")
                return (detail.strip() or name.strip()), name.strip().rsplit(".", 1)[-1]
        return "", ""

    def warnings(self):
        """Non-fatal problems worth telling the user about after a success."""
        self.finish()
        found = []
        if self.term_extract_failures:
            found.append(
                {
                    "code": "term-extract-failed",
                    "count": self.term_extract_failures,
                    "detail": self.term_extract_reason,
                    "hint": classify_error(self.term_extract_reason),
                }
            )
        return found
