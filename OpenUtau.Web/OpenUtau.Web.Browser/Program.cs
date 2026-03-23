using System;
using System.Threading;
using System.Threading.Tasks;
using System.Runtime.Versioning;
using Avalonia;
using Avalonia.Browser;
using Avalonia.ReactiveUI;
using Avalonia.Controls.ApplicationLifetimes;
using OpenUtau.App;
using OpenUtau.App.Views;
using OpenUtau.App.ViewModels;
using Serilog;

[assembly: SupportedOSPlatform("browser")]

internal partial class Program
{
    private static async Task Main(string[] args)
    {
        Log.Logger = new LoggerConfiguration()
            .MinimumLevel.Information()
            .WriteTo.Console()
            .CreateLogger();

        await BuildAvaloniaApp()
            .StartBrowserAppAsync("out");
    }

    public static AppBuilder BuildAvaloniaApp()
        => AppBuilder.Configure<App>()
            .AfterSetup(_ => {
                if (Application.Current?.ApplicationLifetime is ISingleViewApplicationLifetime singleView) {
                    var mainWindow = new MainWindow { DataContext = new MainWindowViewModel() };
                    singleView.MainView = mainWindow;
                }
            })
            .UseReactiveUI();
}
