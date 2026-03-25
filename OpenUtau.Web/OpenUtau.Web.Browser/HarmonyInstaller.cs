using System;
using System.Linq;
using System.Reflection;
using System.Collections.Generic;
using Avalonia;
using Avalonia.Platform;
using Avalonia.Controls;
using System.Runtime.InteropServices.JavaScript;
using Avalonia.Rendering;
using Avalonia.Rendering.Composition;

namespace OpenUtau.Web.Browser
{
    public partial class WebWMBridge {
        [JSExport]
        public static void WindowClosedByUI(string windowId) {
            if (WindowImplProxy.Instances.TryGetValue(windowId, out var proxy)) {
                proxy.SimulateClose();
                WindowImplProxy.Instances.Remove(windowId);
            }
        }
        [JSExport]
        public static void WindowResizedByUI(string windowId, double width, double height) {}
        public static void CallVue(string action, params object[] args) {
            string payload = string.Join("|", args);
            Console.WriteLine($"[WM-VUE-NOTIFY]=>{action}=>{payload}");
        }
    }

    public class WindowImplProxy : DispatchProxy {
        public static Dictionary<string, WindowImplProxy> Instances = new();

        public string WindowId { get; set; } = "unknown";
        public MulticastDelegate? ClosedCallback;
        private object? _mockCompositor;

        public void SimulateClose() {
            ClosedCallback?.DynamicInvoke();
        }

        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args) {
            if (targetMethod == null) return null;
            
            if (targetMethod.Name == "get_Compositor") {
                 if (_mockCompositor == null) {
                      try {
                           var type = typeof(Compositor);
                           var loopType = typeof(AvaloniaLocator).Assembly.GetType("Avalonia.Rendering.IRenderLoop");
                           object? loop = null;
                           
                           var locatorProp = typeof(AvaloniaLocator).GetProperty("Current", BindingFlags.Public | BindingFlags.Static);
                           var locator = locatorProp?.GetValue(null);
                           
                           // Ensure IRenderTimer exists before Compositor requests it
                           if (locator != null) {
                               var regField = typeof(AvaloniaLocator).GetField("_registry", BindingFlags.NonPublic | BindingFlags.Instance);
                               var reg = (System.Collections.IDictionary?)regField?.GetValue(locator);
                               if (reg != null && !reg.Contains(typeof(IRenderTimer))) {
                                   var a = typeof(IRenderTimer).Assembly;
                                   var timerType = a.GetTypes().FirstOrDefault(t => t.Name == "DefaultRenderTimer" || t.Name.Contains("RenderTimer") && !t.IsInterface);
                                   if (timerType != null) {
                                       var timerInstance = Activator.CreateInstance(timerType, new object[] { 60 });
                                       reg[typeof(IRenderTimer)] = new Func<object>(() => timerInstance);
                                       Console.WriteLine($"[WebUI-Hijack] Instantiated internal timer: {timerType.FullName}");
                                   } else {
                                        // Some other fallback or just log
                                        Console.WriteLine("[WebUI-Hijack] Failed to find IRenderTimer implementation.");
                                   }
                               }
                               
                               if (loopType != null) {
                                   var getService = typeof(AvaloniaLocator).GetMethod("GetService", new[] { typeof(Type) });
                                   if (getService != null) {
                                        loop = getService.Invoke(locator, new object[] { loopType });
                                   }
                               }
                           }
                           
                           var ctors = type.GetConstructors(BindingFlags.Public | BindingFlags.Instance);
                           if (ctors.Length > 0) {
                                var ctor = ctors.OrderByDescending(c => c.GetParameters().Length).First();
                                foreach(var c in ctors) {
                                    if(c.GetParameters().Length == 2) ctor = c; 
                                }
                                var pars = ctor.GetParameters();
                                var cArgs = new object?[pars.Length];
                                for(int i=0;i<pars.Length;i++) {
                                    if (pars[i].ParameterType.Name.Contains("IRenderLoop")) cArgs[i] = loop;
                                    else if (pars[i].ParameterType == typeof(bool)) cArgs[i] = true;
                                    else cArgs[i] = null;
                                }
                                _mockCompositor = ctor.Invoke(cArgs);
                           }
                      } catch (Exception ex) {
                          Console.WriteLine($"[Compositor Construct Error] {ex}");
                      }
                 }
                 return _mockCompositor;
            }

            if (targetMethod.Name == "get_RenderScaling") return 1.0;
            if (targetMethod.Name == "get_DesktopScaling") return 1.0;
            if (targetMethod.Name == "get_ClientSize") return new Size(1280, 720);
            if (targetMethod.Name == "get_FrameSize") return new Size(1280, 720);
            if (targetMethod.Name == "get_MaxAutoSizeHint") return new Size(9999, 9999);
            
            if (targetMethod.Name == "Show") {
                WebWMBridge.CallVue("SHOW", WindowId);
                return null;
            }
            if (targetMethod.Name == "Hide") {
                WebWMBridge.CallVue("HIDE", WindowId);
                return null;
            }
            if (targetMethod.Name == "SetTitle" && args != null && args.Length > 0) {
                WebWMBridge.CallVue("SET_TITLE", WindowId, args[0]?.ToString() ?? "");
            }
            if (targetMethod.Name == "add_Closed" && args != null && args.Length > 0) {
                ClosedCallback = (MulticastDelegate?)args[0];
            }
            if (targetMethod.Name == "createPopup") {
                return null;
            }

            if (targetMethod.ReturnType == typeof(void)) return null;
            if (targetMethod.ReturnType == typeof(System.Double)) return 1.0;
            if (targetMethod.ReturnType == typeof(System.Int32)) return 0;
            if (targetMethod.ReturnType.IsValueType) return Activator.CreateInstance(targetMethod.ReturnType);
            return null; 
        }
    }

    public class WindowingPlatformProxy : DispatchProxy {
        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args) {
            if (targetMethod == null) return null;
            
            if (targetMethod.Name.StartsWith("Create") && targetMethod.ReturnType == typeof(IWindowImpl)) {
                string wid = "win_" + Guid.NewGuid().ToString("N").Substring(0, 8);
                Console.WriteLine($"[Web-Window-Manager] 代理捕获新窗口请求({targetMethod.Name})！分配局管 ID: {wid}");
                
                var fakeImpl = DispatchProxy.Create<IWindowImpl, WindowImplProxy>();
                var proxyInst = (WindowImplProxy)(object)fakeImpl;
                proxyInst.WindowId = wid;
                WindowImplProxy.Instances[wid] = proxyInst; 
                
                WebWMBridge.CallVue("CREATE", wid);
                return fakeImpl; 
            }
            if (targetMethod.Name.StartsWith("Create") && targetMethod.ReturnType == typeof(IWindowBaseImpl)) {
                 var fakeImpl = DispatchProxy.Create<IWindowBaseImpl, WindowImplProxy>();
                 var proxyInst = (WindowImplProxy)(object)fakeImpl;
                 proxyInst.WindowId = "base_" + Guid.NewGuid().ToString("N").Substring(0, 8);
                 return fakeImpl; 
            }
            if (targetMethod.Name.StartsWith("Create") && targetMethod.ReturnType == typeof(ITopLevelImpl)) {
                 var fakeImpl = DispatchProxy.Create<ITopLevelImpl, WindowImplProxy>();
                 var proxyInst = (WindowImplProxy)(object)fakeImpl;
                 proxyInst.WindowId = "top_" + Guid.NewGuid().ToString("N").Substring(0, 8);
                 return fakeImpl; 
            }
            
            if (targetMethod.ReturnType == typeof(void)) return null;
            if (targetMethod.ReturnType.IsValueType) return Activator.CreateInstance(targetMethod.ReturnType);
            return null;
        }
    }

    public partial class HarmonyInstaller
    {
        public static void ApplyPatches()
        {
            Console.WriteLine("[WebUI-Hijack] 加载窗口管理器...");

            try {
                var t = typeof(AvaloniaLocator);
                var locatorProp = t.GetProperty("Current", BindingFlags.Public | BindingFlags.Static);
                var locator = locatorProp?.GetValue(null);
                
                if (locator != null) {
                    var regField = t.GetField("_registry", BindingFlags.NonPublic | BindingFlags.Instance);
                    if (regField != null) {
                        var reg = (System.Collections.IDictionary?)regField.GetValue(locator);
                        if (reg != null) {
                            var proxy = DispatchProxy.Create<IWindowingPlatform, WindowingPlatformProxy>();
                            reg[typeof(IWindowingPlatform)] = new Func<object>(() => proxy);

                            Console.WriteLine("[WebUI-Hijack] 接触windows运行时 ");
                        }
                    }
                }
            } catch (Exception e) {
                Console.WriteLine($"[WebUI-Hijack] 运行 Proxy 劫持时发生异常: {e}");
            }
        }
    }
}
