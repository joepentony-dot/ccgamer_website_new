using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace CheekyCommodoreGamer.C64DungeonCarnage;

internal sealed class MainForm : Form
{
    private const string ApplicationId = "uk.co.cheekycommodoregamer.c64-dungeon-carnage";
    private const string StableProfileId = "ccg-c64-dungeon-carnage";
    private const string VirtualHost = "ccg-local";
    private const string ExpectedSchema = "ccg-c64-dungeon-carnage-desktop-staging-v1";
    private const string ExpectedEntryPoint = "application/arcade/lost-sizzler/index.html";
    private const string ExpectedVersionManifest = "application/arcade/lost-sizzler/version.json";
    private const string ExpectedCatalogue = "application/games/games.json";
    private const string ExpectedOnlineGate = "application/arcade/lost-sizzler/js/online-services-gate.js";

    private static readonly HashSet<string> ExternalHostAllowlist = new(StringComparer.OrdinalIgnoreCase)
    {
        "cheekycommodoregamer.co.uk",
        "www.cheekycommodoregamer.co.uk",
        "patreon.com",
        "www.patreon.com",
        "youtube.com",
        "www.youtube.com",
        "youtu.be",
        "paypal.com",
        "www.paypal.com",
    };

    private readonly string[] _arguments;
    private readonly WebView2 _webView;
    private string _applicationRoot = string.Empty;

    public MainForm(string[] arguments)
    {
        _arguments = arguments;
        Text = "C64 Dungeon Carnage";
        StartPosition = FormStartPosition.CenterScreen;
        MinimumSize = new Size(960, 640);
        ClientSize = new Size(1280, 800);

        _webView = new WebView2
        {
            Dock = DockStyle.Fill,
            AllowExternalDrop = false,
            DefaultBackgroundColor = Color.Black,
        };
        Controls.Add(_webView);
        Shown += OnShown;
    }

    private async void OnShown(object? sender, EventArgs e)
    {
        Shown -= OnShown;
        try
        {
            await InitializeGameAsync();
        }
        catch (Exception error)
        {
            MessageBox.Show(
                this,
                $"C64 Dungeon Carnage could not start.\n\n{error.Message}",
                "C64 Dungeon Carnage",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            Close();
        }
    }

    private async Task InitializeGameAsync()
    {
        var stagingRoot = ResolveStagingRoot(_arguments);
        var configPath = RequireFileInside(stagingRoot, "desktop-staging.json", "desktop staging configuration");
        var config = ReadAndValidateStagingConfig(configPath, stagingRoot);
        _applicationRoot = config.ApplicationRoot;

        var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        if (string.IsNullOrWhiteSpace(localAppData))
        {
            throw new InvalidOperationException("Windows LocalApplicationData is unavailable.");
        }

        var profileRoot = Path.Combine(
            localAppData,
            "Cheeky Commodore Gamer",
            "C64 Dungeon Carnage",
            "WebView2",
            StableProfileId);
        Directory.CreateDirectory(profileRoot);

        var environment = await CoreWebView2Environment.CreateAsync(userDataFolder: profileRoot);
        await _webView.EnsureCoreWebView2Async(environment);
        var core = _webView.CoreWebView2 ?? throw new InvalidOperationException("WebView2 failed to initialise.");

        ConfigureRenderer(core);
        core.SetVirtualHostNameToFolderMapping(
            VirtualHost,
            _applicationRoot,
            CoreWebView2HostResourceAccessKind.Allow);

        await core.AddScriptToExecuteOnDocumentCreatedAsync(BuildDeliveryInjection());
        core.Navigate($"https://{VirtualHost}/arcade/lost-sizzler/index.html");
    }

    private static string ResolveStagingRoot(IReadOnlyList<string> arguments)
    {
        string? configured = null;
        for (var index = 0; index < arguments.Count; index += 1)
        {
            var token = arguments[index];
            if (!string.Equals(token, "--staging-root", StringComparison.Ordinal))
            {
                throw new ArgumentException($"Unsupported argument: {token}");
            }
            if (configured is not null || index + 1 >= arguments.Count)
            {
                throw new ArgumentException("--staging-root requires exactly one directory value.");
            }
            configured = arguments[++index];
        }

        var root = Path.GetFullPath(configured ?? Path.Combine(AppContext.BaseDirectory, "staging"));
        if (!Directory.Exists(root))
        {
            throw new DirectoryNotFoundException($"Desktop staging directory is missing: {root}");
        }
        var info = new DirectoryInfo(root);
        if ((info.Attributes & FileAttributes.ReparsePoint) != 0)
        {
            throw new InvalidOperationException("Desktop staging root must not be a symbolic link/reparse point.");
        }
        return root;
    }

    private static StagingConfiguration ReadAndValidateStagingConfig(string configPath, string stagingRoot)
    {
        using var document = JsonDocument.Parse(File.ReadAllText(configPath, Encoding.UTF8));
        var root = document.RootElement;
        RequireString(root, "schema", ExpectedSchema);
        RequireString(root, "applicationId", ApplicationId);
        RequireString(root, "stableProfileId", StableProfileId);

        var delivery = RequireObject(root, "delivery");
        RequireString(delivery, "mode", "desktop-offline");
        RequireString(delivery, "entrypoint", ExpectedEntryPoint);
        RequireString(delivery, "versionManifest", ExpectedVersionManifest);
        RequireString(delivery, "catalogue", ExpectedCatalogue);
        RequireString(delivery, "injectBefore", ExpectedOnlineGate);
        if (!delivery.TryGetProperty("onlineScripts", out var onlineScripts) || onlineScripts.ValueKind != JsonValueKind.Null)
        {
            throw new InvalidDataException("Desktop staging must not configure online scripts in desktop-offline mode.");
        }

        var acceptance = RequireObject(root, "acceptance");
        RequireBoolean(acceptance, "networkingRequired", false);
        RequireBoolean(acceptance, "websiteRootSupabaseBootstrapAllowed", false);
        RequireBoolean(acceptance, "rendererArbitraryFilesystemAccessAllowed", false);
        RequireBoolean(acceptance, "rendererArbitraryProcessExecutionAllowed", false);
        RequireString(acceptance, "externalNavigation", "system-browser-allowlist");
        RequireString(acceptance, "nativeBridge", "narrow-capabilities-only");

        var applicationRoot = RequireDirectoryInside(stagingRoot, "application", "packaged application");
        RequireFileInside(stagingRoot, ExpectedEntryPoint, "packaged game entrypoint");
        RequireFileInside(stagingRoot, ExpectedVersionManifest, "packaged version manifest");
        RequireFileInside(stagingRoot, ExpectedCatalogue, "packaged C64 catalogue");
        RequireFileInside(stagingRoot, ExpectedOnlineGate, "packaged online-services gate");
        RequireFileInside(stagingRoot, "metadata/package-manifest.json", "package manifest");
        RequireFileInside(stagingRoot, "metadata/package-provenance.json", "package provenance");

        return new StagingConfiguration(applicationRoot);
    }

    private void ConfigureRenderer(CoreWebView2 core)
    {
        core.Settings.AreDevToolsEnabled = false;
        core.Settings.AreDefaultContextMenusEnabled = false;
        core.Settings.IsStatusBarEnabled = false;
        core.Settings.IsZoomControlEnabled = false;
        core.Settings.AreHostObjectsAllowed = false;
        core.Settings.IsWebMessageEnabled = true;

        core.NavigationStarting += (_, args) =>
        {
            if (IsLocalRendererUri(args.Uri)) return;
            args.Cancel = true;
            TryOpenExternal(args.Uri);
        };

        core.NewWindowRequested += (_, args) =>
        {
            args.Handled = true;
            TryOpenExternal(args.Uri);
        };

        core.DownloadStarting += (_, args) => args.Cancel = true;
        core.WebMessageReceived += OnWebMessageReceived;
        core.AddWebResourceRequestedFilter("*", CoreWebView2WebResourceContext.All);
        core.WebResourceRequested += (_, args) =>
        {
            if (IsAllowedOfflineResource(args.Request.Uri)) return;
            var body = new MemoryStream(Encoding.UTF8.GetBytes("Offline desktop build: remote network request blocked."));
            args.Response = core.Environment.CreateWebResourceResponse(
                body,
                403,
                "Offline",
                "Content-Type: text/plain; charset=utf-8\r\nCache-Control: no-store");
        };
    }

    private void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs args)
    {
        try
        {
            using var document = JsonDocument.Parse(args.WebMessageAsJson);
            var root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Object || !root.TryGetProperty("type", out var typeProperty)) return;
            var type = typeProperty.GetString();
            switch (type)
            {
                case "openExternal":
                    if (root.TryGetProperty("url", out var urlProperty)) TryOpenExternal(urlProperty.GetString());
                    break;
                case "exitGame":
                    BeginInvoke(Close);
                    break;
            }
        }
        catch (JsonException)
        {
            // Ignore malformed renderer messages. The renderer receives no general-purpose native bridge.
        }
    }

    private static string BuildDeliveryInjection()
    {
        return """
            (() => {
              'use strict';
              const LOCAL_ORIGIN = 'https://ccg-local/';
              const VERSION_URL = LOCAL_ORIGIN + 'arcade/lost-sizzler/version.json';
              const CATALOGUE_URL = LOCAL_ORIGIN + 'games/games.json';
              const resolveLocalAsset = (relativePath, meta) => {
                const value = String(relativePath || '').replace(/^\/+/, '');
                const kind = String(meta && meta.kind || '');
                if (value === 'version.json' && kind === 'version-manifest') return VERSION_URL;
                if (value === 'games/games.json' && kind === 'collectible-catalogue') return CATALOGUE_URL;
                throw new Error('Unsupported packaged asset request.');
              };
              const post = (message) => {
                if (!window.chrome || !window.chrome.webview) throw new Error('Native bridge unavailable.');
                window.chrome.webview.postMessage(message);
              };
              Object.defineProperty(window, '__CCG_LOST_SIZZLER_DELIVERY__', {
                configurable: false,
                enumerable: false,
                writable: false,
                value: Object.freeze({
                  mode: 'desktop-offline',
                  resolveLocalAsset,
                  versionManifestUrl: VERSION_URL,
                  catalogueUrl: CATALOGUE_URL,
                  openExternal(url, meta) {
                    post({ type: 'openExternal', url: String(url || ''), reason: String(meta && meta.reason || '') });
                    return true;
                  },
                  exitGame() {
                    post({ type: 'exitGame' });
                    return true;
                  },
                  onlineScripts: null
                })
              });
            })();
            """;
    }

    private static bool IsLocalRendererUri(string? value)
    {
        return Uri.TryCreate(value, UriKind.Absolute, out var uri)
            && uri.Scheme == Uri.UriSchemeHttps
            && string.Equals(uri.Host, VirtualHost, StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsAllowedOfflineResource(string? value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri)) return false;
        if (uri.Scheme is "data" or "blob") return true;
        return uri.Scheme == Uri.UriSchemeHttps
            && string.Equals(uri.Host, VirtualHost, StringComparison.OrdinalIgnoreCase);
    }

    private static bool TryOpenExternal(string? value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri)) return false;
        if (uri.Scheme != Uri.UriSchemeHttps || !ExternalHostAllowlist.Contains(uri.Host)) return false;
        try
        {
            Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true });
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static JsonElement RequireObject(JsonElement parent, string name)
    {
        if (!parent.TryGetProperty(name, out var value) || value.ValueKind != JsonValueKind.Object)
        {
            throw new InvalidDataException($"Desktop staging property {name} must be an object.");
        }
        return value;
    }

    private static void RequireString(JsonElement parent, string name, string expected)
    {
        if (!parent.TryGetProperty(name, out var value)
            || value.ValueKind != JsonValueKind.String
            || !string.Equals(value.GetString(), expected, StringComparison.Ordinal))
        {
            throw new InvalidDataException($"Desktop staging property {name} must equal {expected}.");
        }
    }

    private static void RequireBoolean(JsonElement parent, string name, bool expected)
    {
        if (!parent.TryGetProperty(name, out var value)
            || value.ValueKind is not (JsonValueKind.True or JsonValueKind.False)
            || value.GetBoolean() != expected)
        {
            throw new InvalidDataException($"Desktop staging property {name} must equal {expected.ToString().ToLowerInvariant()}.");
        }
    }

    private static string RequireDirectoryInside(string root, string relativePath, string label)
    {
        var resolved = ResolveInside(root, relativePath, label);
        if (!Directory.Exists(resolved)) throw new DirectoryNotFoundException($"{label} is missing: {resolved}");
        var info = new DirectoryInfo(resolved);
        if ((info.Attributes & FileAttributes.ReparsePoint) != 0) throw new InvalidDataException($"{label} must not be a reparse point.");
        return resolved;
    }

    private static string RequireFileInside(string root, string relativePath, string label)
    {
        var resolved = ResolveInside(root, relativePath, label);
        if (!File.Exists(resolved)) throw new FileNotFoundException($"{label} is missing.", resolved);
        var info = new FileInfo(resolved);
        if ((info.Attributes & FileAttributes.ReparsePoint) != 0) throw new InvalidDataException($"{label} must not be a reparse point.");
        return resolved;
    }

    private static string ResolveInside(string root, string relativePath, string label)
    {
        if (string.IsNullOrWhiteSpace(relativePath) || Path.IsPathRooted(relativePath))
        {
            throw new InvalidDataException($"{label} path is invalid.");
        }
        var fullRoot = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        var resolved = Path.GetFullPath(Path.Combine(root, relativePath.Replace('/', Path.DirectorySeparatorChar)));
        if (!resolved.StartsWith(fullRoot, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidDataException($"{label} escapes the staging root.");
        }
        return resolved;
    }

    private sealed record StagingConfiguration(string ApplicationRoot);
}
