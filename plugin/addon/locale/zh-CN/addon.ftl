startup-begin = 插件加载中
startup-finish = 插件已就绪

prefs-title = PDF2zh

prefs-menu-translate = 翻译PDF
prefs-menu-cut = 裁剪PDF
prefs-menu-compare = 双语对照
prefs-menu-crop-compare = 双语对照(裁剪后拼接)

operation-progress-title = PDF2zh
operation-progress-processing = 正在准备请求...
operation-progress-submitting = 正在提交「{ $fileName }」...
operation-progress-accepted = 已提交，正在{ $action }「{ $fileName }」
operation-progress-running = 正在{ $action }「{ $fileName }」{ $suffix }
operation-progress-importing = 服务器已完成，正在导入「{ $fileName }」的附件...
operation-progress-file-done = 「{ $fileName }」已导入
operation-progress-file-failed = 「{ $fileName }」失败：{ $message }
operation-progress-waiting = 等待处理「{ $fileName }」
operation-progress-summary = 正在处理 { $done }/{ $total } 个文件
operation-action-translate = 翻译
operation-action-crop = 裁剪
operation-action-compare = 生成双语对照
operation-action-crop-compare = 生成裁剪双语对照
operation-batch-progress = 第 { $current }/{ $total } 个：{ $text }
operation-error-translate = “翻译 PDF”只支持原始 PDF。请选择原文附件或论文条目。
operation-error-crop = 当前文件不能再次裁剪。请选择原文、mono 或 dual 附件。
operation-error-compare = 当前文件不能执行“双语对照”。请选择原文或 dual 附件。
operation-error-crop-compare = 当前文件不能执行“双语对照（裁剪）”。请选择原文、dual 或 dual-cut 附件。
operation-error-crop-compare-terminal = 该 PDF 已经是“双语对照（裁剪）”结果，无需再次处理。请选择原文或 dual 附件。
operation-error-compare-terminal = 该 PDF 已经是“双语对照”结果，无需再次处理。请选择原文或 dual 附件。

operation-error-no-selection = 请先选择一个条目或 PDF 附件。
operation-error-unknown = 未知错误
operation-error-prefix = 错误：{ $message }
operation-error-single-file = 处理文件 { $fileName } 失败：{ $message }
operation-batch-started = 已开始处理 { $count } 个文件，请稍候
operation-batch-completed =
    { $kind ->
        [failed] 处理失败。失败 { $failed } 个
        [mixed] 处理结束。成功 { $succeeded } 个，失败 { $failed } 个
       *[success] 全部完成。成功 { $succeeded } 个
    }
operation-error-no-files = 服务器未返回可导入的文件
operation-error-completed-no-files = 任务已完成，但 Server 未返回任何文件
operation-error-partial-attachments = 仅导入 { $attached }/{ $total } 个附件：{ $message }

operation-error-no-attachment = 这个条目下没有可用的 PDF 附件。
operation-error-not-pdf = 请选择 PDF 附件。
operation-error-file-missing = 找不到 PDF 文件，附件可能尚未下载到本地。
operation-error-server-unreachable = 无法连接到 PDF2zh Server（{ $url }）。请确认 Server 已启动，且设置中的服务器地址与 Server 终端里显示的一致。
operation-error-no-output = 设置里没有勾选任何要生成的文件，请至少选择一种。
operation-error-more = ……另有 { $count } 个文件失败，详见进度弹窗。
operation-hint-auth = API Key 无效或没有权限。请在「设置 → API 配置」中检查这个服务的 Key 和接口地址。
operation-hint-rate-limit = 触发了服务商的限流，或账户额度不足。请调低「每秒请求数」和并发，或检查账户余额。
operation-hint-timeout = 请求超时。请调低并发，检查网络或代理；OpenAI 兼容服务还可以在 API 配置的高级参数里把超时时间调长。
operation-hint-network = 无法连接到翻译服务。请检查接口地址、网络和代理设置。
operation-hint-model = 模型名称不存在或当前账户不可用。请在 API 配置里检查模型名称。
operation-warning-term-extract = 「{ $fileName }」已翻译完成，但自动术语提取有 { $count } 次请求失败{ $detail }，这部分术语没有统一译法。可以在设置里调低「术语提取并发数」，或关闭自动提取术语。
operation-warning-detail = （{ $detail }）

# ---- 设置页（动态文本）----
prefs-lang-common = 常用
prefs-lang-all = 全部语言
prefs-lang-custom = 其他（输入语言代码）…
prefs-group-profiles = 我的 API 配置
prefs-group-builtin = 免配置
prefs-group-other = 其他服务（需要 API 配置）
prefs-service-unsupported = { $name }（当前引擎不支持）
prefs-service-hint-unsupported = 「{ $name }」不能用于 { $engine }，请换一个翻译服务。
prefs-service-hint-free = 免费服务，无需 API Key；速度和稳定性有限，适合试用。
prefs-service-hint-builtin = 无需配置即可使用。
prefs-service-hint-missing = 还没有「{ $name }」的 API 配置，将使用 Server 配置文件里的设置。
prefs-service-create = 创建配置
prefs-service-edit = 编辑
prefs-profile-empty = 还没有 API 配置。添加一个，就可以用自己的 DeepSeek、OpenAI、Gemini 等账号翻译。
prefs-profile-in-use = 使用中
prefs-profile-use = 使用
prefs-profile-edit = 编辑
prefs-profile-duplicate = 复制
prefs-profile-delete = 删除
prefs-profile-delete-confirm = 确认删除
prefs-profile-no-key = 未填 API Key
prefs-profile-copy-name = { $name } 副本
prefs-font-title = 选择字体文件
prefs-font-filter = 字体文件
prefs-server-checking = 正在检查连接…
prefs-server-ok = 已连接 · Server { $version }
prefs-server-unknown-version = 版本未知
prefs-server-mismatch = Server（{ $server }）与插件（{ $plugin }）版本不同，建议更新到同一版本。
prefs-server-outdated = 这个 Server 较旧：「术语提取并发数」等新设置不会生效，翻译出错时也无法显示具体原因。请更新 Server。
prefs-server-empty = 请先填写服务器地址。
prefs-server-timeout = 连接超时。请确认 Server 已启动，且地址、端口与终端里显示的一致。
prefs-server-unreachable = 无法连接到 { $url }。请确认 Server 正在运行，且地址、端口与终端里显示的一致。
prefs-server-not-pdf2zh = { $url } 有响应，但不是 PDF2zh Server，端口可能被其他程序占用。请换成 Server 终端里显示的地址。
prefs-server-http = Server 返回了错误（HTTP { $status }），请查看 Server 终端里的日志。

prefs-editor-title-new = 添加 API 配置
prefs-editor-title-edit = 编辑 API 配置
prefs-editor-name = 名称
prefs-editor-name-placeholder = 可选，例如“实验室 DeepSeek”
prefs-editor-service = 服务
prefs-editor-service-custom = 自定义服务…
prefs-editor-service-custom-placeholder = 引擎的服务名，如 openai
prefs-editor-field-model = 模型
prefs-editor-field-apiUrl = Base URL
prefs-editor-field-apiKey = API Key
prefs-editor-engine-mismatch = 这个服务只支持 { $engines }。
prefs-editor-toggle-key = 显示 / 隐藏
prefs-editor-fetch-models = 获取模型列表
prefs-editor-fetching = 正在获取模型列表…
prefs-editor-fetched = 已获取 { $count } 个模型，请在列表中选择。
prefs-editor-fetch-need-key = 请先填写 API Key。
prefs-editor-fetch-need-url = 请先填写 Base URL。
prefs-editor-fetch-empty = 服务商没有返回任何模型。
prefs-editor-fetch-request = 获取失败：{ $message }
prefs-editor-advanced = 高级参数
prefs-editor-advanced-hint = 留空或选“默认”即使用引擎的默认值。
prefs-editor-advanced-none = 这个服务没有预置的高级参数，如有需要可以手动添加。
prefs-editor-default = 默认
prefs-editor-on = 开启
prefs-editor-off = 关闭
prefs-editor-value-disabled = 关闭
prefs-editor-value-enabled = 开启
prefs-editor-value-high = 高
prefs-editor-value-max = 最高
prefs-editor-add-param = 添加自定义参数
prefs-editor-param-key = 参数名
prefs-editor-param-value = 参数值
prefs-editor-param-remove = 移除
prefs-editor-docs = 查看模型和 API Key 说明
prefs-editor-cancel = 取消
prefs-editor-save = 保存
prefs-editor-save-use = 保存并使用
prefs-editor-error-service = 请填写服务名（只能包含字母、数字、- 和 _）。
