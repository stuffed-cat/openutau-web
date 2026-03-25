using System;
using System.Threading.Tasks;
using System.Runtime.Versioning;
using Avalonia;
using Avalonia.Browser;
using Avalonia.ReactiveUI;
using Avalonia.Controls.ApplicationLifetimes;
using OpenUtau.App;
using OpenUtau.App.Views;
using OpenUtau.App.ViewModels;

[assembly: SupportedOSPlatform("browser")]

internal partial class Program
{
    private static async Task Main(string[] args)
    {
        AppDomain.CurrentDomain.AssemblyResolve += (sender, args) => {
            if (args.Name.Contains("mscorlib")) {
                return typeof(object).Assembly; // System.Private.CoreLib
            }
            return null;
        };

        try {
            await BuildAvaloniaApp().StartBrowserAppAsync("out");
        } catch (Exception ex) {
            Console.WriteLine($"[WASM CRASH] Main Exception: {ex}");
        }
    }

    public static AppBuilder BuildAvaloniaApp()
        => AppBuilder.Configure<App>()
            .AfterSetup(_ => {
                // 接管底层核心系统与网络路由API
                OpenUtau.Web.Browser.CoreApiBridge.Initialize();
                // 劫持 Window 生命周期并通讯给 Vue，恢复窗口管理器的路由代理系统逻辑
                OpenUtau.Web.Browser.HarmonyInstaller.ApplyPatches(); 

                if (Application.Current?.ApplicationLifetime is ISingleViewApplicationLifetime singleView) {
                    try {
                        // 在 WASM (SingleView) 模式下，底层是一块关联着 AvaloniaView 的 HTML Canvas。
                        // Avalonia 严禁将 Window (TopLevel) 直接放入 SingleView 的 MainView。
                        // 由于 OpenUtau 强耦合了 MainWindow，我们将提取它的 Content (主界面的 Grid) 来渲染进 Canvas 中，
                        // 作为一个 "显示器" (Monitor) 的背景层。这里我们放一个空面板，保持 Avalonia SingleView 的合法性。
                        // 就像 GNOME 一样，SingleView (Canvas) 只是显示器桌面，真正的组件都是独立的 Windows。
                        // 真正的修复：将主界面的 Content 抽取出来直接挂载到 SingleView 的表面引擎上
                        // 这将使得 WASM 内部的主 Canvas 真正渲染出内容，而不是依靠残缺的 Proxy
                        var win = new MainWindow { DataContext = new MainWindowViewModel() };
                        var content = (Avalonia.Controls.Control)win.Content;
                        win.Content = null; // 切断原生 Window 的物理层级绑定
                        singleView.MainView = content;

                    } catch (Exception e) {
                        Console.WriteLine($"[WASM CRASH] MainWindow Instantiation Exception: {e}");
                    }
                }
            })
            .UseReactiveUI();
}
