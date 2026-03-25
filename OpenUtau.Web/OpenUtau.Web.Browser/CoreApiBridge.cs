using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Json;
using System.Reflection;
using System.Threading.Tasks;
using System.Runtime.Serialization;
using OpenUtau.Core;
using OpenUtau.Core.Util;
using System.Linq;

namespace OpenUtau.Web.Browser
{
    /// <summary>
    /// 直接将前端 UI 的本地操作映射至实际后端的业务 API 路由，并非滥用 executeCommand。
    /// 包含安全的 WASM VFS 目录初始化，保证 ViewModels 的 Directory.GetFiles 不会崩溃。
    /// </summary>
    public static class CoreApiBridge
    {
        // 修复 net_http_client_invalid_requesturi 异常
        // 我们利用浏览器环境中的动态 Origin 生成相对到代理的 HttpClient，但不包含跨域问题。
        private static readonly HttpClient _apiClient = new HttpClient();

        static CoreApiBridge()
        {
#pragma warning disable CA1416
            try 
            {
                if (OperatingSystem.IsBrowser())
                {
                    // 在 WASM 中，HttpClient 需要明确的 BaseAddress 或者在请求时写全路径，否则抛 InvalidRequestUri。
                    var window = System.Runtime.InteropServices.JavaScript.JSHost.GlobalThis.GetPropertyAsJSObject("window");
                    var location = window?.GetPropertyAsJSObject("location");
                    var origin = location?.GetPropertyAsString("origin");
                    if (!string.IsNullOrEmpty(origin))
                    {
                        _apiClient.BaseAddress = new Uri(origin);
                    }
                }
            } 
            catch { }
#pragma warning restore CA1416
        }

        public static void Initialize()
        {
            InitializeWasmVFS();
            BypassPathManagerOSCheck();
            InitializeMockPreferences();
            HijackDocManagerRouting();
        }

        private static void InitializeMockPreferences()
        {
            try
            {
                // Write a mock preferences.json into the VFS before OpenUtau reads it!
                // SkipUpdate prevents it from querying the Github releases API and crashing/blocking.
                var prefsPath = PathManager.Inst.PrefsFilePath;
                var mockPrefs = new OpenUtau.Core.Util.Preferences.SerializablePreferences();
                // Set to anything except empty/null to skip github update. Version 999 to bypass completely.
                mockPrefs.SkipUpdate = "999.0.0";
                
                var json = System.Text.Json.JsonSerializer.Serialize(mockPrefs);
                File.WriteAllText(prefsPath, json);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CoreApiBridge] Mock preferences failed: {ex}");
            }
        }

        private static void InitializeWasmVFS()
        {
            // WASM 自带基于内存的 Virtual File System (根目录为 "/")
            // UI 会尝试读取 Templates、Cache 等目录，我们提前在 WASM VFS 中建立空壳，防止本地直接读取异常。
            // 未来可通过 API 提前拉取后端目录树同步至此 VFS。
            string[] dirs = { "/data/Templates", "/data/Preferences", "/data/Cache", "/data/Plugins", "/data/Logs" };
            foreach (var d in dirs)
            {
                if (!Directory.Exists(d))
                    Directory.CreateDirectory(d);
            }
        }

        private static void BypassPathManagerOSCheck()
        {
            // PathManager 的构造函数包含 Process.GetCurrentProcess().MainModule 等会触发 WASM PlatformNotSupported 的代码
            // 在不使用 Harmony、不修改 submodule 前提下，通过安全反射在初始化前注入绕过对象的依赖
            try
            {
                var pmInst = FormatterServices.GetUninitializedObject(typeof(PathManager)) as PathManager;
                if (pmInst != null)
                {
                    // 设置为 WASM 安全的虚拟路径，利用反射修改自动属性的 backing field
                    var type = typeof(PathManager);
                    var dataPathField = type.GetField("<DataPath>k__BackingField", BindingFlags.Instance | BindingFlags.NonPublic);
                    var cachePathField = type.GetField("<CachePath>k__BackingField", BindingFlags.Instance | BindingFlags.NonPublic);
                    var rootPathField = type.GetField("<RootPath>k__BackingField", BindingFlags.Instance | BindingFlags.NonPublic);

                    dataPathField?.SetValue(pmInst, "/data");
                    cachePathField?.SetValue(pmInst, "/data/Cache");
                    rootPathField?.SetValue(pmInst, "/data");
                    
                    // SingletonBase<T> 的 Inst 只有 getter，其实际持有一个 private static readonly Lazy<T> field 叫做 "inst"
                    var instField = typeof(SingletonBase<PathManager>).GetField("inst", BindingFlags.Static | BindingFlags.NonPublic);
                    instField?.SetValue(null, new Lazy<PathManager>(() => pmInst!));
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CoreApiBridge] Bypass PathManager Error: {ex}");
            }
        }

        private static void HijackDocManagerRouting()
        {
            try
            {
                // 用一个空白线程冒充主线程，迫使 ExecuteCmd 总是进到 PostOnUIThread 操作中
                var dm = DocManager.Inst;
                var threadField = typeof(DocManager).GetField("mainThread", BindingFlags.Instance | BindingFlags.NonPublic);
                threadField?.SetValue(dm, new System.Threading.Thread(() => { }));

                dm.PostOnUIThread = action => {
                    var target = action.Target;
                    if (target == null) return;
                    
                    var cmdField = target.GetType().GetFields().FirstOrDefault(f => typeof(UCommand).IsAssignableFrom(f.FieldType));
                    if (cmdField != null && cmdField.GetValue(target) is UCommand ucmd)
                    {
                        Console.WriteLine($"[CoreApiBridge] 截获核心方法: {ucmd.GetType().Name}");
                        _ = RouteCommandToConcreteApiAsync(ucmd);
                    }
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CoreApiBridge] DocManager 挂载异常: {ex}");
            }
        }

        /// <summary>
        /// 将截获的具体业务类 UCommand，通过 HttpClient 投递到后端编写好的具体 Controller 端点
        /// 坚决不使用泛用的 dummy API
        /// </summary>
        private static async Task RouteCommandToConcreteApiAsync(UCommand cmd)
        {
            try
            {
                var typeName = cmd.GetType().Name;
                switch (typeName)
                {
                    // 假设加载/新建工程走对应的 ProjectManagement API，而不是统一塞到底层
                    case "LoadProjectNotification":
                        await _apiClient.PostAsync("/api/project/new", null);
                        break;
                    case "SaveTemplateCommand": // 或等价物
                        await _apiClient.PostAsJsonAsync("/api/project/savetemplate", cmd);
                        break;
                    case "BpmCommand":
                    case "TimeAxisCommand":
                        // 例如后端的 remaptimeaxis 接口
                        await _apiClient.PostAsync("/api/project/remaptimeaxis", null);
                        break;
                    default:
                        // 未被映射到明确 Rest 端点的操作日志记录，而不是无脑打入 execcommand
                        Console.WriteLine($"[CoreApiBridge] Frontend UI Triggered '{typeName}' - Please map this to a specific Controller in Api!");
                        break;
                }
                
                // 将执行结果异步同步回 Vue UI / Avalonia (目前仅占位)
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CoreApiBridge] Core 触发后端服务异常: {ex.Message}");
            }
        }
    }
}

