startup-begin = Addon is loading
startup-finish = Addon is ready

prefs-title = PDF2zh

prefs-menu-translate = Translate PDF
prefs-menu-cut = Cut PDF
prefs-menu-crop-compare = Bilingual PDF(After Cropping)
prefs-menu-compare = Bilingual PDF

operation-progress-title = PDF2zh
operation-progress-processing = Preparing request...
operation-progress-submitting = Submitting “{ $fileName }”...
operation-progress-accepted = Submitted. { $action } “{ $fileName }” now
operation-progress-running = { $action } “{ $fileName }”{ $suffix }
operation-progress-importing = Server finished. Importing attachments for “{ $fileName }”...
operation-progress-file-done = Imported “{ $fileName }”
operation-progress-file-failed = “{ $fileName }” failed: { $message }
operation-progress-waiting = Waiting to process “{ $fileName }”
operation-progress-summary = Processing { $done }/{ $total } file(s)
operation-action-translate = Translating
operation-action-crop = Cropping
operation-action-compare = Building bilingual PDF
operation-action-crop-compare = Building cropped bilingual PDF
operation-batch-progress = { $current }/{ $total }: { $text }
operation-error-translate = “Translate PDF” only accepts an original PDF. Select the original attachment or its parent item.
operation-error-crop = This file cannot be cropped again. Select an original, mono, or dual attachment.
operation-error-compare = This file cannot be used for Bilingual Compare. Select an original or dual attachment.
operation-error-crop-compare = This file cannot be used for Cropped Bilingual Compare. Select an original, dual, or dual-cut attachment.
operation-error-crop-compare-terminal = This PDF is already a Cropped Bilingual Compare result. Select the original or a dual attachment instead.
operation-error-compare-terminal = This PDF is already a Bilingual Compare result. Select the original or a dual attachment instead.

operation-error-no-selection = Select an item or PDF attachment first.
operation-error-unknown = Unknown error
operation-error-prefix = Error: { $message }
operation-error-single-file = Failed to process { $fileName }: { $message }
operation-batch-started = Started { $count } file(s). Please wait.
operation-batch-completed =
    { $kind ->
        [failed] Failed. { $failed } file(s) failed
        [mixed] Finished. Succeeded: { $succeeded }, failed: { $failed }
       *[success] All done. Succeeded: { $succeeded }
    }
operation-error-no-files = The server did not return any files to import.
operation-error-completed-no-files = The task completed, but the Server returned no files.
operation-error-partial-attachments = Imported only { $attached }/{ $total } attachment(s): { $message }

operation-error-no-attachment = This item has no usable PDF attachment.
operation-error-not-pdf = Select a PDF attachment.
operation-error-file-missing = The PDF file was not found; the attachment may not be downloaded yet.
operation-error-server-unreachable = Cannot connect to the PDF2zh Server ({ $url }). Check that the server is running and that the server address in the settings matches the server terminal.
operation-error-no-output = No output file is selected in the settings. Select at least one.
operation-error-more = …and { $count } more failed file(s); see the progress popup.
operation-hint-auth = The API key is invalid or not allowed. Check this service's key and base URL under Settings → API profiles.
operation-hint-rate-limit = The provider is rate limiting you, or the account is out of quota. Lower “Requests per second” and concurrency, or check your balance.
operation-hint-timeout = The request timed out. Lower the concurrency and check your network or proxy; for OpenAI-compatible services you can also raise the timeout in the profile's advanced parameters.
operation-hint-network = Could not reach the translation service. Check the base URL, your network and proxy settings.
operation-hint-model = The model name does not exist or is not available to this account. Check the model name in the API profile.
operation-warning-term-extract = “{ $fileName }” was translated, but { $count } terminology extraction request(s) failed{ $detail }, so those terms are not kept consistent. Lower “Extraction concurrency” in the settings, or turn automatic extraction off.
operation-warning-detail = { " " }({ $detail })

# ---- Settings pane (dynamic text) ----
prefs-lang-common = Common
prefs-lang-all = All languages
prefs-lang-custom = Other (enter a language code)…
prefs-group-profiles = My API profiles
prefs-group-builtin = No setup needed
prefs-group-other = Other services (need an API profile)
prefs-service-unsupported = { $name } (not supported by this engine)
prefs-service-hint-unsupported = “{ $name }” cannot be used with { $engine }. Choose another translation service.
prefs-service-hint-free = Free service, no API key needed. Speed and reliability are limited; good for trying things out.
prefs-service-hint-builtin = Works without any setup.
prefs-service-hint-missing = There is no API profile for “{ $name }” yet, so the settings in the server's config file will be used.
prefs-service-create = Create profile
prefs-service-edit = Edit
prefs-profile-empty = No API profiles yet. Add one to translate with your own DeepSeek, OpenAI, Gemini or other account.
prefs-profile-in-use = In use
prefs-profile-use = Use
prefs-profile-edit = Edit
prefs-profile-duplicate = Duplicate
prefs-profile-delete = Delete
prefs-profile-delete-confirm = Confirm delete
prefs-profile-no-key = No API key
prefs-profile-copy-name = { $name } copy
prefs-font-title = Choose a font file
prefs-font-filter = Font files
prefs-server-checking = Checking the connection…
prefs-server-ok = Connected · Server { $version }
prefs-server-unknown-version = unknown version
prefs-server-mismatch = Server ({ $server }) and plugin ({ $plugin }) are different versions. Update both to the same version.
prefs-server-outdated = This server is older: newer settings such as “Extraction concurrency” have no effect, and it cannot report why a translation failed. Update the server.
prefs-server-empty = Enter the server address first.
prefs-server-timeout = The connection timed out. Check that the server is running and that the address and port match the server terminal.
prefs-server-unreachable = Cannot connect to { $url }. Check that the server is running and that the address and port match the server terminal.
prefs-server-not-pdf2zh = { $url } answered, but it is not a PDF2zh Server; another program may be using this port. Use the address printed in the server terminal.
prefs-server-http = The server returned an error (HTTP { $status }). Check the log in the server terminal.

prefs-editor-title-new = Add API profile
prefs-editor-title-edit = Edit API profile
prefs-editor-name = Name
prefs-editor-name-placeholder = Optional, e.g. “Lab DeepSeek”
prefs-editor-service = Service
prefs-editor-service-custom = Custom service…
prefs-editor-service-custom-placeholder = Engine service name, e.g. openai
prefs-editor-field-model = Model
prefs-editor-field-apiUrl = Base URL
prefs-editor-field-apiKey = API key
prefs-editor-engine-mismatch = This service only works with { $engines }.
prefs-editor-toggle-key = Show / hide
prefs-editor-fetch-models = Fetch models
prefs-editor-fetching = Fetching the model list…
prefs-editor-fetched = Found { $count } models. Pick one from the list.
prefs-editor-fetch-need-key = Enter the API key first.
prefs-editor-fetch-need-url = Enter the base URL first.
prefs-editor-fetch-empty = The provider returned no models.
prefs-editor-fetch-request = Could not fetch models: { $message }
prefs-editor-advanced = Advanced parameters
prefs-editor-advanced-hint = Leave a field empty or on “Default” to use the engine's default.
prefs-editor-advanced-none = This service has no preset advanced parameters. Add one manually if you need it.
prefs-editor-default = Default
prefs-editor-on = On
prefs-editor-off = Off
prefs-editor-value-disabled = Off
prefs-editor-value-enabled = On
prefs-editor-value-high = High
prefs-editor-value-max = Max
prefs-editor-add-param = Add custom parameter
prefs-editor-param-key = Parameter name
prefs-editor-param-value = Value
prefs-editor-param-remove = Remove
prefs-editor-docs = Where to find models and API keys
prefs-editor-cancel = Cancel
prefs-editor-save = Save
prefs-editor-save-use = Save and use
prefs-editor-error-service = Enter a service name (letters, digits, - and _ only).
