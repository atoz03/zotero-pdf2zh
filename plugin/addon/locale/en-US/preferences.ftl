pref-title = Zotero PDF2zh
pref-help = v{ $version }
pref-tagline = Translate PDFs inside Zotero and keep formulas, figures and layout

# Server
pref-sec-server = Translation server
pref-sec-server-desc = The plugin hands PDFs to a PDF2zh Server. Keep the server terminal open while translating.
pref-serverip = Server address
pref-serverip-desc = Use the exact address and port printed in the server terminal
pref-check-connection = Test connection

# Translation
pref-sec-translate = Translation
pref-engine = Engine
pref-engine-desc = pdf2zh_next preserves layout better and is recommended; 1.x is kept for older setups
pref-engine-next = pdf2zh_next (recommended)
pref-engine-legacy = pdf2zh 1.x
pref-service = Translation service
pref-service-desc = Pick one of the API profiles saved below, or a built-in service
pref-languages = Languages
pref-languages-desc = Source → target
pref-sourceLang =
    .title = Source language
pref-targetLang =
    .title = Target language
pref-lang-custom =
    .placeholder = Language code
pref-swapLang =
    .title = Swap source and target language
pref-skipLastPages = Skip last pages
pref-skipLastPages-desc = For example, to leave the references untranslated; 0 translates everything

# API profiles
pref-sec-profiles = API profiles
pref-sec-profiles-desc = Save your own LLM or translation API accounts and give each one a name
pref-llmapi-add = Add profile

# Output files
pref-gen = Output files
pref-gen-desc = Attached to the item when a translation finishes. Selecting only what you need shortens processing.
pref-col-file = File
pref-col-generate = Generate
pref-open = Open when done
pref-mono = Translation (mono)
pref-mono-desc = Translated text only
pref-dual = Bilingual (dual)
pref-dual-desc = Original and translation together
pref-mono-cut = Single-column translation (mono-cut)
pref-mono-cut-desc = Two-column pages cut into one column, for phones
pref-dual-cut = Single-column bilingual (dual-cut)
pref-dual-cut-desc = The bilingual file cut into one column, for phones
pref-crop-compare = Cropped comparison (crop-compare)
pref-crop-compare-desc = Each column cut out, original and translation side by side
pref-compare = Full-page comparison (compare)
pref-compare-desc = Original page and translated page joined into one wide page
pref-output-none = Select at least one output file, otherwise translation fails.
pref-dualMode = Bilingual layout
pref-dualMode-desc = How original and translation are arranged in the dual file
pref-dualMode-lr = Side by side
pref-dualMode-tb = Alternating pages
pref-transFirst = Translation first
pref-transFirst-desc = Translation on the left when side by side, or on the first page when alternating
pref-rename = Name attachments by short title
pref-rename-desc = Attachments show as “ShortTitle-dual” and so on; file names on disk stay unchanged
pref-showProgress = Show translation progress
pref-showProgress-desc = A progress popup at the bottom right of Zotero

# Speed
pref-sec-speed = Speed and concurrency
pref-sec-speed-desc = Higher values are faster but more likely to hit provider rate limits or timeouts
pref-qps = Requests per second (QPS)
pref-qps-desc = Use 2–4 for free services and local models; raise it for paid APIs within your quota
pref-poolSize = Concurrent workers
pref-poolSize-desc = 0 follows QPS
pref-threadNum = Translation threads
pref-threadNum-desc = Number of simultaneous requests in pdf2zh 1.x
pref-sec-glossary = Terminology extraction
pref-autoGlossary = Extract terminology automatically
pref-autoGlossary-desc = Before translating, the model reads the document and builds a glossary so terms stay consistent. This costs extra time and requests; if it keeps timing out at this step, lower the concurrency below or turn it off.
pref-termPoolSize = Extraction concurrency
pref-termPoolSize-desc = Simultaneous terminology requests, never more than the translation concurrency above. These requests are larger and slower than normal ones: use 1–2 if they time out; 0 means the same as translation
pref-saveGlossary = Save the extracted glossary
pref-saveGlossary-desc = Writes a CSV file into the server's translated folder

# pdf2zh_next
pref-pdf2x-config-title = Advanced options
pref-pdf2x-config-desc = Fonts, watermark, scanned documents and compatibility options of pdf2zh_next
pref-fontFamily = Translation font
pref-fontFamily-desc = Preferred font style for translated text
pref-fontFamily-auto = Automatic
pref-fontFamily-serif = Serif
pref-fontFamily-sans = Sans-serif
pref-fontFamily-script = Script
pref-noWatermark = Remove watermark
pref-noWatermark-desc = Do not add the BabelDOC watermark to generated PDFs
pref-autoOcr = Handle scanned PDFs automatically
pref-autoOcr-desc = Turns on the OCR workaround when a scanned document is detected
pref-ocr = Force the OCR workaround
pref-ocr-desc = Applies to every file; only try this when scanned documents come out badly
pref-translateTableText = Translate text in tables
pref-translateTableText-desc = Experimental
pref-onlyIncludeTranslatedPage = Keep only translated pages
pref-onlyIncludeTranslatedPage-desc = Skipped pages are left out of the generated files
pref-ignoreCache = Ignore the translation cache
pref-ignoreCache-desc = Translate again instead of reusing earlier results
pref-customSystemPrompt = Custom system prompt
pref-customSystemPrompt-desc = Leave empty for the default prompt. For example, add /no_think to turn off thinking in Qwen3.
pref-sec-compat = Compatibility
pref-sec-compat-desc = Turn these on only when a generated PDF displays incorrectly in some reader
pref-enhanceCompatibility = Enhance compatibility
pref-enhanceCompatibility-desc = Same as enabling both options below; may also put the translation first
pref-skipClean = Skip the clean-up step
pref-skipClean-desc = Larger files, better compatibility
pref-disableRichTextTranslate = Disable rich-text translation
pref-disableRichTextTranslate-desc = Bold, italics and other inline styles are not preserved

# pdf2zh 1.x
pref-pdf1x-config-title = Advanced options
pref-pdf1x-config-desc = Font and rendering options of pdf2zh 1.x
pref-skipSubsetFonts = Skip font subsetting
pref-skipSubsetFonts-desc = Try this when rendering fails; files get larger
pref-babeldoc = Enable BabelDOC
pref-babeldoc-desc = Experimental; if you need BabelDOC, use pdf2zh_next instead
pref-fontFile = Custom font file
pref-fontFile-desc = Path of a font on the server machine (.ttf / .otf / .woff / .woff2)
pref-browse = Choose file…
pref-clear = Clear

# Footer
pref-about-note = This plugin is free and open source. Guides and troubleshooting are on the project pages.
pref-link-docs = Documentation
pref-link-github = GitHub
pref-link-gitee = Gitee mirror
pref-link-monitor = Open server progress page
