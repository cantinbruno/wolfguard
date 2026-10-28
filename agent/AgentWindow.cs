using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Reflection;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Markup;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;
using System.Xml;
using Microsoft.Win32;

[assembly: AssemblyTitle("WolfGuard Agent")]
[assembly: AssemblyProduct("WolfGuard Agent")]
[assembly: AssemblyVersion("2.0.0.0")]

namespace WolfGuard {
  public sealed class AgentWindow : Window {
    const string Site = "https://wolfguard.wavetools.fr/";
    const string NodeUrl = "https://nodejs.org/dist/v22.23.4/node-v22.23.4-win-x64.zip";
    const string NodeHash = "cbc74b5e0982c9dbb41525fd8fb5dcd32fbee237863f7829072f4639a1ce5f20";
    readonly string home = System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "WolfGuardAgent");
    readonly JavaScriptSerializer json = new JavaScriptSerializer();
    readonly Grid root;
    readonly TextBlock statusTitle, detail, contact, lastScan;
    readonly Ellipse dot;
    readonly ProgressBar progress;
    readonly StackPanel pairing;
    readonly TextBox code;
    readonly Button pairButton, mainButton, retryButton, repairButton;
    readonly CheckBox startup;
    Process child;
    WebClient download;
    string currentState = "preparing", nodePath, agentPath;
    bool closing, canClose, preparing, preview;
    public bool RequestPair { get; set; }

    public AgentWindow(bool previewMode) {
      preview = previewMode;
      Title = "WolfGuard Agent";
      Width = 620; Height = 760; MinWidth = 520; MinHeight = 520;
      WindowStartupLocation = WindowStartupLocation.CenterScreen;
      Background = Brush("#0e1928"); Foreground = Brush("#edf2f7");
      FontFamily = new FontFamily("Segoe UI");
      string xaml = @"<Grid xmlns='http://schemas.microsoft.com/winfx/2006/xaml/presentation' xmlns:x='http://schemas.microsoft.com/winfx/2006/xaml' Background='#0e1928'>
<Grid.Resources>
 <Style TargetType='TextBlock'><Setter Property='Foreground' Value='#edf2f7'/></Style>
 <Style TargetType='Button'><Setter Property='Foreground' Value='#e7edf6'/><Setter Property='Background' Value='#21344a'/><Setter Property='Padding' Value='18,11'/><Setter Property='Margin' Value='0,0,8,0'/><Setter Property='BorderThickness' Value='0'/><Setter Property='Cursor' Value='Hand'/><Setter Property='FontSize' Value='13'/><Setter Property='Template'><Setter.Value><ControlTemplate TargetType='Button'><Border Background='{TemplateBinding Background}' Padding='{TemplateBinding Padding}' CornerRadius='8'><ContentPresenter HorizontalAlignment='Center' VerticalAlignment='Center'/></Border><ControlTemplate.Triggers><Trigger Property='IsMouseOver' Value='True'><Setter Property='Opacity' Value='0.82'/></Trigger><Trigger Property='IsEnabled' Value='False'><Setter Property='Opacity' Value='0.45'/></Trigger></ControlTemplate.Triggers></ControlTemplate></Setter.Value></Setter></Style>
</Grid.Resources>
<ScrollViewer VerticalScrollBarVisibility='Auto' HorizontalScrollBarVisibility='Disabled'>
 <StackPanel Margin='30,22,30,24'>
  <TextBlock Text='AGENT WINDOWS' Foreground='#f6aa5d' FontSize='11' FontWeight='SemiBold' HorizontalAlignment='Center' Margin='0,0,0,14'/>
  <Viewbox x:Name='LogoHost' Height='156' Width='156'/>
  <TextBlock Text='WolfGuard' FontSize='34' FontWeight='Bold' HorizontalAlignment='Center' Margin='0,10,0,2'/>
  <TextBlock Text='Ton poste, connecté à tes scans.' Foreground='#9aadc3' FontSize='14' HorizontalAlignment='Center' Margin='0,0,0,24'/>
  <Border Background='#17273b' BorderBrush='#30465e' BorderThickness='1' CornerRadius='13' Padding='21,18'>
   <StackPanel>
    <StackPanel Orientation='Horizontal'><Ellipse x:Name='StateDot' Width='13' Height='13' Fill='#f6aa5d' Margin='0,0,12,0'/><TextBlock x:Name='StateTitle' Text='Préparation…' FontSize='25' FontWeight='SemiBold'/></StackPanel>
    <TextBlock x:Name='StateDetail' Text='L’agent se prépare pour son premier lancement.' FontSize='13' Foreground='#b4c2d4' TextWrapping='Wrap' Margin='0,9,0,0'/>
    <ProgressBar x:Name='StateProgress' Height='6' Margin='0,16,0,0' Minimum='0' Maximum='100' Foreground='#f6aa5d' Background='#263d56' BorderThickness='0' IsIndeterminate='True'/>
    <TextBlock x:Name='Contact' Foreground='#8fa5bd' FontSize='11' Margin='0,11,0,0'/>
   </StackPanel>
  </Border>
  <StackPanel x:Name='Pairing' Margin='0,20,0,0' Visibility='Collapsed'>
   <TextBlock Text='Code temporaire d’association' FontSize='13' FontWeight='SemiBold'/>
   <TextBlock Text='Sur le site : Scan → Connecter un poste → Générer un code.' FontSize='12' Foreground='#9aadc3' TextWrapping='Wrap' Margin='0,5,0,10'/>
   <TextBox x:Name='PairCode' MaxLength='32' FontFamily='Consolas' FontSize='17' Padding='11' Foreground='#edf2f7' Background='#0b1420' BorderBrush='#405b77' SelectionBrush='#936037' AutomationProperties.Name='Code temporaire d’association'/>
   <Button x:Name='PairButton' Content='Associer ce poste' Background='#f6aa5d' Foreground='#132033' FontWeight='SemiBold' HorizontalAlignment='Left' Margin='0,10,0,0'/>
  </StackPanel>
  <TextBlock x:Name='LastScan' TextWrapping='Wrap' Foreground='#9aadc3' FontSize='12' Margin='0,16,0,0'/>
  <WrapPanel Margin='0,18,0,0'>
   <Button x:Name='MainButton' Content='Arrêter l’agent' Visibility='Collapsed'/>
   <Button x:Name='RetryButton' Content='Réessayer' Visibility='Collapsed'/>
   <Button x:Name='SiteButton' Content='Ouvrir WolfGuard'/>
  </WrapPanel>
  <Button x:Name='RepairButton' Content='Nouvelle association' FontSize='12' HorizontalAlignment='Left' Background='Transparent' Foreground='#a9bbd1' Padding='0,12' Margin='0' Visibility='Collapsed'/>
  <Border BorderBrush='#263a51' BorderThickness='0,1,0,0' Margin='0,18,0,0' Padding='0,16,0,0'>
   <StackPanel>
    <CheckBox x:Name='Startup' Content='Ouvrir l’agent avec ma session Windows' Foreground='#b4c2d4' FontSize='12' IsEnabled='False'/>
    <TextBlock x:Name='Machine' Foreground='#70879f' FontSize='11' Margin='0,12,0,0' TextTrimming='CharacterEllipsis'/>
   </StackPanel>
  </Border>
 </StackPanel>
</ScrollViewer></Grid>";
      root = (Grid)XamlReader.Parse(xaml); Content = root;
      ((Viewbox)root.FindName("LogoHost")).Child = Logo();
      statusTitle = (TextBlock)root.FindName("StateTitle"); detail = (TextBlock)root.FindName("StateDetail");
      contact = (TextBlock)root.FindName("Contact"); lastScan = (TextBlock)root.FindName("LastScan");
      dot = (Ellipse)root.FindName("StateDot"); progress = (ProgressBar)root.FindName("StateProgress");
      pairing = (StackPanel)root.FindName("Pairing"); code = (TextBox)root.FindName("PairCode");
      pairButton = (Button)root.FindName("PairButton"); mainButton = (Button)root.FindName("MainButton");
      retryButton = (Button)root.FindName("RetryButton"); repairButton = (Button)root.FindName("RepairButton");
      startup = (CheckBox)root.FindName("Startup");
      ((TextBlock)root.FindName("Machine")).Text = Environment.MachineName + "  ·  WolfGuard Agent 2.0";
      Icon = LogoBitmap(64);
      ((Button)root.FindName("SiteButton")).Click += delegate { if (!preview) Process.Start(new ProcessStartInfo(Site) { UseShellExecute = true }); };
      pairButton.Click += delegate {
        string value = code.Text.Trim().ToLowerInvariant();
        if (!System.Text.RegularExpressions.Regex.IsMatch(value, "^[a-f0-9]{32}$")) { SetState("pairing", "Copie le code temporaire de 32 caractères généré sur le site.", 0, 0); return; }
        if (Send(new { type = "pair", code = value })) { code.Clear(); SetState("enrolling", "Association du poste…", 0, 0); }
      };
      mainButton.Click += async delegate {
        if (child == null || child.HasExited) { await Prepare(); return; }
        bool start = currentState == "stopped" || currentState == "error";
        if (Send(new { type = start ? "start" : "stop" })) SetState(start ? "connecting" : "stopping", start ? "Connexion à WolfGuard…" : "Arrêt du scan et de la connexion…", 0, 0);
      };
      repairButton.Click += delegate { if (Send(new { type = "repair" })) SetState("stopping", "Arrêt de l’ancienne connexion avant association…", 0, 0); };
      retryButton.Click += async delegate { await Prepare(); };
      if (!preview) using (RegistryKey key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run")) startup.IsChecked = (key != null && key.GetValue("WolfGuardAgent") != null) || LegacyStartup(false);
      startup.Click += delegate {
        if (preview) return;
        try {
          using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run")) {
            if (startup.IsChecked == true) key.SetValue("WolfGuardAgent", "\"" + System.IO.Path.Combine(home, "WolfGuard-Agent.exe") + "\"");
            else key.DeleteValue("WolfGuardAgent", false);
          }
          LegacyStartup(true);
        } catch { startup.IsChecked = !startup.IsChecked; MessageBox.Show(this, "Le démarrage automatique n’a pas pu être modifié.", "WolfGuard", MessageBoxButton.OK, MessageBoxImage.Information); }
      };
      Closing += async delegate(object sender, System.ComponentModel.CancelEventArgs e) {
        if (preview || canClose) return;
        e.Cancel = true; if (closing) return; closing = true;
        if (download != null) download.CancelAsync();
        SetState("stopping", "Fermeture de l’agent et arrêt des scans…", 0, 0);
        await StopChild(); canClose = true; Close();
      };
      if (!preview) Loaded += async delegate { Height = Math.Min(Height, SystemParameters.WorkArea.Height - 32); await Prepare(); };
    }

    static SolidColorBrush Brush(string color) { return (SolidColorBrush)new BrushConverter().ConvertFromString(color); }
    static bool LegacyStartup(bool remove) {
      object service = null, folder = null, task = null;
      try {
        dynamic scheduler = Activator.CreateInstance(Type.GetTypeFromProgID("Schedule.Service")); service = scheduler; scheduler.Connect();
        dynamic root = scheduler.GetFolder(@"\"); folder = root;
        try { task = root.GetTask("WolfGuard-Scan-Agent"); } catch { return false; }
        dynamic previous = task;
        WindowsIdentity user = WindowsIdentity.GetCurrent();
        string owner = Convert.ToString(previous.Definition.Principal.UserId);
        if (!String.Equals(owner, user.Name, StringComparison.OrdinalIgnoreCase) && !String.Equals(owner, user.User.Value, StringComparison.OrdinalIgnoreCase)) return false;
        bool enabled = previous.Enabled;
        if (remove) root.DeleteTask("WolfGuard-Scan-Agent", 0);
        return enabled;
      } catch { if (remove) throw; return false; }
      finally {
        foreach (object value in new object[] {task, folder, service}) if (value != null && System.Runtime.InteropServices.Marshal.IsComObject(value)) System.Runtime.InteropServices.Marshal.FinalReleaseComObject(value);
      }
    }
    public static Canvas Logo() {
      Canvas canvas = new Canvas { Width = 64, Height = 64 };
      XmlDocument svg = new XmlDocument(); svg.XmlResolver = null;
      using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("WolfGuard.Logo.svg")) svg.Load(stream);
      foreach (XmlNode node in svg.DocumentElement.ChildNodes) {
        if (node.LocalName != "path") continue;
        System.Windows.Shapes.Path shape = new System.Windows.Shapes.Path { Data = Geometry.Parse(node.Attributes["d"].Value) };
        XmlAttribute fill = node.Attributes["fill"], stroke = node.Attributes["stroke"];
        if (fill != null && fill.Value != "none") shape.Fill = Brush(fill.Value);
        if (stroke != null) { shape.Stroke = Brush(stroke.Value); shape.StrokeThickness = 2; shape.StrokeStartLineCap = PenLineCap.Round; shape.StrokeEndLineCap = PenLineCap.Round; shape.StrokeLineJoin = PenLineJoin.Round; }
        canvas.Children.Add(shape);
      }
      return canvas;
    }
    public static BitmapSource LogoBitmap(int size) {
      Viewbox view = new Viewbox { Width = size, Height = size, Child = Logo() };
      return Render(view, size, size);
    }
    static BitmapSource Render(FrameworkElement element, int width, int height) {
      element.Measure(new Size(width, height)); element.Arrange(new Rect(0, 0, width, height)); element.UpdateLayout();
      RenderTargetBitmap image = new RenderTargetBitmap(width, height, 96, 96, PixelFormats.Pbgra32); image.Render(element); return image;
    }
    public static void SavePng(BitmapSource image, string file) {
      PngBitmapEncoder encoder = new PngBitmapEncoder(); encoder.Frames.Add(BitmapFrame.Create(image));
      using (FileStream stream = File.Create(file)) encoder.Save(stream);
    }
    public void Preview(string state, string file) {
      string message = state == "scanning" ? "Scan actif en cours. Les résultats remontent sur le site." : state == "connected" ? "Prêt à recevoir un scan depuis WolfGuard." : state == "offline" ? "Connexion interrompue. Nouvelle tentative automatique." : "Colle le code temporaire généré dans WolfGuard.";
      SetState(state, message, state == "scanning" ? 37 : 0, state == "scanning" ? 100 : 0);
      SavePng(Render(root, 620, state == "pairing" ? 820 : 730), file);
    }
    void SetState(string state, string message, int completed, int total) {
      currentState = state;
      Dictionary<string, string> names = new Dictionary<string, string> {
        {"preparing","Préparation…"},{"pairing","À associer"},{"enrolling","Association…"},{"connecting","Connexion…"},
        {"connected","Connecté"},{"scanning","Scan en cours"},{"completed","Scan terminé"},{"cancelled","Scan arrêté"},
        {"failed","Échec du scan"},{"offline","Hors ligne"},{"revoked","Association requise"},{"stopping","Arrêt en cours…"},{"stopped","Agent arrêté"},{"error","Action nécessaire"}
      };
      statusTitle.Text = names.ContainsKey(state) ? names[state] : "Action nécessaire";
      detail.Text = message.Length > 500 ? message.Substring(0, 500) : message;
      dot.Fill = Brush(state == "connected" || state == "completed" ? "#6bd5ac" : state == "offline" || state == "error" || state == "failed" || state == "revoked" ? "#ff978d" : "#f6aa5d");
      bool pair = state == "pairing" || state == "revoked" || state == "enrolling";
      pairing.Visibility = pair ? Visibility.Visible : Visibility.Collapsed;
      pairButton.IsEnabled = state != "enrolling";
      code.IsEnabled = state != "enrolling";
      bool running = state == "connected" || state == "scanning" || state == "offline" || state == "completed" || state == "cancelled" || state == "failed" || state == "connecting";
      mainButton.Visibility = running || state == "stopped" || (state == "error" && child != null && !child.HasExited) ? Visibility.Visible : Visibility.Collapsed;
      mainButton.Content = state == "stopped" || state == "error" ? "Démarrer l’agent" : "Arrêter l’agent";
      retryButton.Visibility = state == "error" && (child == null || child.HasExited) ? Visibility.Visible : Visibility.Collapsed;
      repairButton.Visibility = running || state == "stopped" ? Visibility.Visible : Visibility.Collapsed;
      progress.Visibility = state == "preparing" || state == "enrolling" || state == "connecting" || state == "scanning" || state == "stopping" ? Visibility.Visible : Visibility.Collapsed;
      progress.IsIndeterminate = total <= 0; progress.Maximum = Math.Max(1, total); progress.Value = Math.Max(0, Math.Min(completed, total));
      if (state == "scanning" && total > 0) contact.Text = completed + " / " + total + " tests";
      else if (state == "connected") contact.Text = "Dernier contact : " + DateTime.Now.ToString("HH:mm:ss", CultureInfo.InvariantCulture);
      else contact.Text = "";
      if (state == "completed" || state == "cancelled" || state == "failed") lastScan.Text = statusTitle.Text + " à " + DateTime.Now.ToString("HH:mm", CultureInfo.InvariantCulture) + (total > 0 ? " · " + completed + " / " + total + " tests" : "");
    }
    bool Send(object command) {
      if (preview) return false;
      try { if (child == null || child.HasExited) throw new IOException(); child.StandardInput.WriteLine(json.Serialize(command)); child.StandardInput.Flush(); return true; }
      catch { SetState("error", "Le moteur n’est pas disponible. Clique sur Réessayer.", 0, 0); return false; }
    }
    static bool RuntimeReady(string executable) {
      if (!File.Exists(executable)) return false;
      try {
        using (Process process = Process.Start(new ProcessStartInfo(executable, "--version") { UseShellExecute = false, CreateNoWindow = true, WindowStyle = ProcessWindowStyle.Hidden, RedirectStandardOutput = true, RedirectStandardError = true })) {
          if (!process.WaitForExit(5000)) { process.Kill(); return false; }
          return process.ExitCode == 0 && process.StandardOutput.ReadToEnd().Trim() == "v22.23.4";
        }
      } catch { return false; }
    }
    static string Hash(byte[] bytes) { using (SHA256 sha = SHA256.Create()) return BitConverter.ToString(sha.ComputeHash(bytes)).Replace("-", "").ToLowerInvariant(); }
    static void Extract(Stream archive, string destination) {
      string prefix = System.IO.Path.GetFullPath(destination).TrimEnd(System.IO.Path.DirectorySeparatorChar) + System.IO.Path.DirectorySeparatorChar;
      Directory.CreateDirectory(prefix); long size = 0; int count = 0;
      using (ZipArchive zip = new ZipArchive(archive, ZipArchiveMode.Read)) foreach (ZipArchiveEntry entry in zip.Entries) {
        string target = System.IO.Path.GetFullPath(System.IO.Path.Combine(prefix, entry.FullName));
        if (!target.StartsWith(prefix, StringComparison.OrdinalIgnoreCase) || ++count > 20000 || (size += entry.Length) > 500L * 1024 * 1024) throw new InvalidDataException();
        if (String.IsNullOrEmpty(entry.Name)) { Directory.CreateDirectory(target); continue; }
        Directory.CreateDirectory(System.IO.Path.GetDirectoryName(target));
        using (Stream input = entry.Open()) using (FileStream output = File.Create(target)) input.CopyTo(output);
      }
    }
    public static void VerifyExtraction(string destination) {
      using (Stream input = Assembly.GetExecutingAssembly().GetManifestResourceStream("WolfGuard.Payload.zip")) using (MemoryStream memory = new MemoryStream()) {
        input.CopyTo(memory); byte[] payload = memory.ToArray(); if (Hash(payload) != BuildInfo.PayloadHash) throw new InvalidDataException();
        using (MemoryStream archive = new MemoryStream(payload)) Extract(archive, destination);
      }
      using (MemoryStream malformed = new MemoryStream()) {
        using (ZipArchive zip = new ZipArchive(malformed, ZipArchiveMode.Create, true)) zip.CreateEntry("../outside-test.txt");
        malformed.Position = 0; bool rejected = false;
        try { Extract(malformed, destination); } catch (InvalidDataException) { rejected = true; }
        if (!rejected) throw new InvalidDataException("Unsafe archive path was not rejected");
      }
    }
    async Task Prepare() {
      if (preparing || closing || preview) return; preparing = true;
      try {
        if (child != null && child.HasExited) { child.Dispose(); child = null; }
        SetState("preparing", "Installation dans ta session Windows. Aucun droit administrateur n’est demandé.", 0, 0);
        string appDirectory = System.IO.Path.Combine(home, "app", BuildInfo.PayloadHash.Substring(0, 16));
        await Task.Run(delegate {
          Directory.CreateDirectory(home);
          string installed = System.IO.Path.Combine(home, "WolfGuard-Agent.exe"), self = Assembly.GetExecutingAssembly().Location;
          if (!String.Equals(System.IO.Path.GetFullPath(self), System.IO.Path.GetFullPath(installed), StringComparison.OrdinalIgnoreCase)) File.Copy(self, installed, true);
          using (Stream input = Assembly.GetExecutingAssembly().GetManifestResourceStream("WolfGuard.Payload.zip")) using (MemoryStream memory = new MemoryStream()) {
            input.CopyTo(memory); byte[] payload = memory.ToArray(); if (Hash(payload) != BuildInfo.PayloadHash) throw new InvalidDataException();
            using (MemoryStream archive = new MemoryStream(payload)) Extract(archive, appDirectory);
          }
        });
        if (closing) return;
        nodePath = System.IO.Path.Combine(home, "runtime", "node-v22.23.4-win-x64", "node.exe");
        agentPath = System.IO.Path.Combine(appDirectory, "agent", "agent.mjs");
        if (!await Task.Run(delegate { return RuntimeReady(nodePath); })) {
          string runtime = System.IO.Path.Combine(home, "runtime"); Directory.CreateDirectory(runtime);
          string archive = System.IO.Path.Combine(runtime, "node-v22.23.4-win-x64.zip.download");
          SetState("preparing", "Premier lancement : téléchargement des composants nécessaires. Cette étape ne sera faite qu’une fois.", 0, 0);
          ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
          using (download = new WebClient()) {
            download.DownloadProgressChanged += delegate(object sender, DownloadProgressChangedEventArgs e) {
              progress.IsIndeterminate = e.TotalBytesToReceive <= 0; progress.Maximum = 100; progress.Value = e.ProgressPercentage;
              contact.Text = (e.BytesReceived / (1024 * 1024)) + " Mo téléchargés";
            };
            await download.DownloadFileTaskAsync(new Uri(NodeUrl), archive);
          }
          download = null; if (closing) return;
          SetState("preparing", "Vérification et préparation des composants…", 0, 0);
          await Task.Run(delegate {
            byte[] bytes = File.ReadAllBytes(archive); if (Hash(bytes) != NodeHash) { File.Delete(archive); throw new InvalidDataException(); }
            using (MemoryStream stream = new MemoryStream(bytes)) Extract(stream, runtime); File.Delete(archive);
          });
        }
        if (closing) return;
        StartChild(); startup.IsEnabled = true;
      } catch {
        if (!closing) SetState("error", "La préparation n’a pas pu se terminer. Vérifie ta connexion Internet et l’espace disponible, puis réessaie.", 0, 0);
      } finally { download = null; preparing = false; }
    }
    void StartChild() {
      SetState("connecting", "Lecture de l’association de ce poste…", 0, 0);
      ProcessStartInfo info = new ProcessStartInfo(nodePath, "\"" + agentPath + "\" --gui") {
        UseShellExecute = false, CreateNoWindow = true, WindowStyle = ProcessWindowStyle.Hidden,
        RedirectStandardInput = true, RedirectStandardOutput = true, RedirectStandardError = true,
        StandardOutputEncoding = Encoding.UTF8, StandardErrorEncoding = Encoding.UTF8,
        WorkingDirectory = System.IO.Path.GetDirectoryName(agentPath)
      };
      Process process = new Process { StartInfo = info, EnableRaisingEvents = true }; child = process;
      process.OutputDataReceived += delegate(object sender, DataReceivedEventArgs e) {
        if (e.Data == null || e.Data.Length > 4096) return;
        Dispatcher.BeginInvoke(new Action(delegate {
          if (closing || child != process) return;
          try {
            Dictionary<string, object> value = json.Deserialize<Dictionary<string, object>>(e.Data);
            if (!value.ContainsKey("type") || Convert.ToString(value["type"]) != "state") return;
            string state = Convert.ToString(value["state"]), message = Convert.ToString(value["message"]);
            SetState(state, message, value.ContainsKey("completed") ? Convert.ToInt32(value["completed"]) : 0, value.ContainsKey("total") ? Convert.ToInt32(value["total"]) : 0);
          } catch { SetState("error", "L’état reçu du moteur est illisible. Redémarre l’agent.", 0, 0); }
        }));
      };
      process.ErrorDataReceived += delegate { /* Never display raw process output or credentials. */ };
      process.Exited += delegate { Dispatcher.BeginInvoke(new Action(delegate { if (!closing && child == process) SetState("error", "Le moteur s’est arrêté. Clique sur Réessayer pour le relancer.", 0, 0); })); };
      try { process.Start(); process.StandardInput.AutoFlush = true; process.BeginOutputReadLine(); process.BeginErrorReadLine(); }
      catch { if (child == process) child = null; process.Dispose(); throw; }
      if (RequestPair) { RequestPair = false; Send(new {type = "repair"}); }
    }
    async Task StopChild() {
      Process process = child;
      if (process == null) return;
      try {
        if (!process.HasExited) { process.StandardInput.WriteLine(json.Serialize(new { type = "shutdown" })); process.StandardInput.Flush(); }
        bool exited = await Task.Run(delegate { return process.WaitForExit(6000); });
        if (!exited) process.Kill();
      } catch { try { if (!process.HasExited) process.Kill(); } catch { } }
      finally { process.Dispose(); child = null; }
    }
  }

  public static class Program {
    [System.Runtime.InteropServices.DllImport("user32.dll")] static extern IntPtr FindWindow(string className, string title);
    [System.Runtime.InteropServices.DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr handle);
    [System.Runtime.InteropServices.DllImport("user32.dll")] static extern bool ShowWindow(IntPtr handle, int command);
    [STAThread] public static int Main(string[] args) {
      try {
        if (args.Length == 2 && args[0] == "--render-logo") { AgentWindow.SavePng(AgentWindow.LogoBitmap(256), args[1]); return 0; }
        if (args.Length == 2 && args[0] == "--verify-extraction") { AgentWindow.VerifyExtraction(args[1]); return 0; }
        if (args.Length == 2 && args[0] == "--preview-dir") {
          Directory.CreateDirectory(args[1]);
          foreach (string state in new string[] { "pairing", "connected", "scanning", "offline" }) new AgentWindow(true).Preview(state, System.IO.Path.Combine(args[1], state + ".png"));
          return 0;
        }
        string sid = WindowsIdentity.GetCurrent().User.Value; bool created;
        using (Mutex mutex = new Mutex(true, @"Local\WolfGuardAgent-" + sid, out created)) {
          if (!created) { IntPtr window = FindWindow(null, "WolfGuard Agent"); if (window != IntPtr.Zero) { ShowWindow(window, 9); SetForegroundWindow(window); } return 0; }
          try { Application app = new Application(); AgentWindow window = new AgentWindow(false); window.RequestPair = args.Length == 1 && args[0] == "--pair"; app.Run(window); }
          finally { mutex.ReleaseMutex(); }
        }
        return 0;
      } catch { MessageBox.Show("WolfGuard Agent n’a pas pu démarrer. Télécharge de nouveau l’agent depuis le site.", "WolfGuard Agent", MessageBoxButton.OK, MessageBoxImage.Error); return 1; }
    }
  }
}
