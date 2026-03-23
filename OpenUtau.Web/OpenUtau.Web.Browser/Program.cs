using System.Runtime.Versioning;
using System.Threading.Tasks;
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
        await BuildAvaloniaApp()
            .StartBrowserAppAsync("out");
    }

    public static AppBuilder BuildAvaloniaApp()
        => AppBuilder.Configure<App>()
            .AfterSetup(_ => {
                if (Application.Current?.ApplicationLifetime is ISingleViewApplicationLifetime singleView) {
                    singleView.MainView = new MainWindow { DataContext = new MainWindowViewModel() };
                }
            })
            .UseReactiveUI();
}
