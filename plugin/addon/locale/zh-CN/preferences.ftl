pref-title = Zotero PDF2zh
pref-help = v{ $version }
pref-tagline = 在 Zotero 里翻译 PDF，保留公式、图表和排版

# 服务器
pref-sec-server = 翻译服务器
pref-sec-server-desc = 插件把 PDF 交给 PDF2zh Server 处理。翻译期间请保持 Server 的终端窗口开启。
pref-serverip = 服务器地址
pref-serverip-desc = 与 Server 终端里显示的地址和端口保持一致
pref-check-connection = 测试连接

# 翻译
pref-sec-translate = 翻译
pref-engine = 翻译引擎
pref-engine-desc = pdf2zh_next 排版还原更好，推荐使用；1.x 仅为兼容旧环境保留
pref-engine-next = pdf2zh_next（推荐）
pref-engine-legacy = pdf2zh 1.x
pref-service = 翻译服务
pref-service-desc = 可直接选择下方保存的 API 配置
pref-languages = 语言
pref-languages-desc = 源语言 → 目标语言
pref-sourceLang =
    .title = 源语言
pref-targetLang =
    .title = 目标语言
pref-lang-custom =
    .placeholder = 语言代码
pref-swapLang =
    .title = 交换源语言和目标语言
pref-skipLastPages = 跳过末尾页数
pref-skipLastPages-desc = 例如不翻译参考文献；0 表示翻译全文

# API 配置
pref-sec-profiles = API 配置
pref-sec-profiles-desc = 保存自己的大模型或翻译 API，可以为每个配置起名字
pref-llmapi-add = 添加配置

# 生成文件
pref-gen = 生成文件
pref-gen-desc = 翻译完成后添加到条目下的附件。只勾选需要的文件可以缩短处理时间。
pref-col-file = 文件
pref-col-generate = 生成
pref-open = 完成后打开
pref-mono = 译文（mono）
pref-mono-desc = 只包含译文
pref-dual = 双语对照（dual）
pref-dual-desc = 原文与译文对照
pref-mono-cut = 单栏译文（mono-cut）
pref-mono-cut-desc = 把双栏译文裁成单栏，适合手机阅读
pref-dual-cut = 单栏双语（dual-cut）
pref-dual-cut-desc = 把双栏双语文件裁成单栏，适合手机阅读
pref-crop-compare = 裁剪对照（crop-compare）
pref-crop-compare-desc = 逐栏裁开后，原文与译文左右拼接
pref-compare = 整页对照（compare）
pref-compare-desc = 原文页与译文页左右拼成一张宽页
pref-output-none = 至少要选择一种生成文件，否则翻译会失败。
pref-dualMode = 双语文件排版
pref-dualMode-desc = dual 文件中原文与译文的排列方式
pref-dualMode-lr = 左右并排
pref-dualMode-tb = 原文页 / 译文页交替
pref-transFirst = 译文在前
pref-transFirst-desc = 左右并排时译文在左，交替页时译文页在前
pref-rename = 用短标题命名附件
pref-rename-desc = 附件显示为“短标题-dual”等，磁盘上的文件名不变
pref-showProgress = 显示翻译进度
pref-showProgress-desc = 在 Zotero 右下角显示进度弹窗

# 速度
pref-sec-speed = 速度与并发
pref-sec-speed-desc = 并发越高越快，但更容易触发服务商限流或超时
pref-qps = 每秒请求数（QPS）
pref-qps-desc = 免费服务和本地模型建议 2–4；付费 API 可按限额调高
pref-poolSize = 并发 Worker 数
pref-poolSize-desc = 0 表示跟随 QPS
pref-threadNum = 翻译线程数
pref-threadNum-desc = pdf2zh 1.x 同时发起的请求数
pref-sec-glossary = 术语提取
pref-autoGlossary = 自动提取术语
pref-autoGlossary-desc = 翻译前先让模型通读全文、整理术语表，使术语前后一致。会多花一些时间和请求；如果总在这一步超时，可以调低下面的并发，或直接关闭。
pref-termPoolSize = 术语提取并发数
pref-termPoolSize-desc = 同时发出的术语提取请求数，不会超过上面的翻译并发。这类请求比普通翻译更大更慢：超时就调到 1–2；0 表示与翻译并发相同
pref-saveGlossary = 保存提取到的术语表
pref-saveGlossary-desc = 在 Server 的 translated 目录下生成 CSV 文件

# pdf2zh_next
pref-pdf2x-config-title = 高级选项
pref-pdf2x-config-desc = 字体、水印、扫描件、兼容性等 pdf2zh_next 选项
pref-fontFamily = 译文字体
pref-fontFamily-desc = 译文优先使用的字体类型
pref-fontFamily-auto = 自动
pref-fontFamily-serif = 衬线
pref-fontFamily-sans = 无衬线
pref-fontFamily-script = 手写体
pref-noWatermark = 去除水印
pref-noWatermark-desc = 不在生成的 PDF 上添加 BabelDOC 水印
pref-autoOcr = 自动处理扫描件
pref-autoOcr-desc = 检测到扫描版 PDF 时自动启用 OCR 兼容方案
pref-ocr = 强制 OCR 兼容方案
pref-ocr-desc = 对所有文件启用，仅建议在扫描件效果不佳时尝试
pref-translateTableText = 翻译表格文字
pref-translateTableText-desc = 实验性功能
pref-onlyIncludeTranslatedPage = 只保留翻译过的页面
pref-onlyIncludeTranslatedPage-desc = 跳过的页面不会出现在生成的文件中
pref-ignoreCache = 忽略翻译缓存
pref-ignoreCache-desc = 强制重新翻译，不复用之前的结果
pref-customSystemPrompt = 自定义系统提示词
pref-customSystemPrompt-desc = 留空则使用默认提示词。例如给 Qwen3 加上 /no_think 以关闭思考。
pref-sec-compat = 兼容性
pref-sec-compat-desc = 生成的 PDF 在某些阅读器里显示异常时再开启
pref-enhanceCompatibility = 增强兼容性
pref-enhanceCompatibility-desc = 相当于同时开启下面两项，并可能使译文在前
pref-skipClean = 跳过清理步骤
pref-skipClean-desc = 文件会更大，但兼容性更好
pref-disableRichTextTranslate = 禁用富文本翻译
pref-disableRichTextTranslate-desc = 不保留加粗、斜体等行内样式

# pdf2zh 1.x
pref-pdf1x-config-title = 高级选项
pref-pdf1x-config-desc = pdf2zh 1.x 的字体与渲染选项
pref-skipSubsetFonts = 跳过字体子集化
pref-skipSubsetFonts-desc = 渲染失败时尝试；生成的文件会更大
pref-babeldoc = 启用 BabelDOC
pref-babeldoc-desc = 实验性功能；需要 BabelDOC 时建议直接使用 pdf2zh_next
pref-fontFile = 自定义字体文件
pref-fontFile-desc = Server 所在机器上的字体路径（.ttf / .otf / .woff / .woff2）
pref-browse = 选择文件…
pref-clear = 清除

# 页脚
pref-about-note = 本插件免费开源，请勿从其他渠道购买。使用教程和常见问题见项目主页。
pref-link-docs = 使用文档
pref-link-github = GitHub
pref-link-gitee = Gitee 镜像
pref-link-monitor = 打开 Server 进度页
