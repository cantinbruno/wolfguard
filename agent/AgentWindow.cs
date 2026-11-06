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
using System.Windows.Interop;
using System.Windows.Markup;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;
using System.Xml;

[assembly: AssemblyTitle("WolfGuard Agent")]
[assembly: AssemblyProduct("WolfGuard Agent")]
[assembly: AssemblyVersion("2.0.0.0")]

namespace WolfGuard {
  public sealed class AgentWindow : Window {
    const string NodeUrl = "https://nodejs.org/dist/v22.23.4/node-v22.23.4-win-x64.zip";
    const string NodeHash = "cbc74b5e0982c9dbb41525fd8fb5dcd32fbee237863f7829072f4639a1ce5f20";
    readonly string home = System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "WolfGuardAgent");
    readonly JavaScriptSerializer json = new JavaScriptSerializer();
    readonly Grid root;
    readonly TextBlock statusTitle, detail, progressLabel, lastActivity, stateBadge, actionHint, scanStatus, remoteStatus, machineName, footerHint;
    readonly Ellipse dot;
    readonly Border stateCard, badgeSurface, activitySection;
    readonly Grid capabilities;
    readonly StackPanel activityList;
    readonly List<ActivityEntry> activity = new List<ActivityEntry>();
    readonly ProgressBar progress;
    readonly StackPanel pairing;
    readonly TextBox code;
    readonly Button pairButton, mainButton, hideButton, optionsButton, pasteButton;
    readonly MenuItem repairMenu;
    System.Windows.Forms.NotifyIcon tray;
    System.Windows.Forms.ToolStripMenuItem remoteStop;
    System.Drawing.Icon trayIcon;
    Process child;
    WebClient download;
    string currentState = "preparing", nodePath, agentPath;
    string lastActivityMessage;
    bool closing, canClose, preparing, preview;
    public bool RequestPair { get; set; }
    sealed class ActivityEntry { public string Time, Message, Color; }

    public AgentWindow(bool previewMode) : this(previewMode, true) { }
    internal AgentWindow(bool previewMode, bool prepareEngine) {
      preview = previewMode;
      Title = "WolfGuard Agent";
      Width = 720; Height = 680; MinWidth = 600; MinHeight = 560;
      WindowStartupLocation = WindowStartupLocation.CenterScreen;
      Background = Brush("#0b111c"); Foreground = Brush("#edf3fb");
      FontFamily = new FontFamily("Segoe UI");
      UseLayoutRounding = true; SnapsToDevicePixels = true;
      string xaml = @"<Grid xmlns='http://schemas.microsoft.com/winfx/2006/xaml/presentation' xmlns:x='http://schemas.microsoft.com/winfx/2006/xaml' Background='#0b111c'>
<Grid.Resources>
 <Style TargetType='TextBlock'><Setter Property='Foreground' Value='#edf3fb'/><Setter Property='FontSize' Value='13'/></Style>
 <Style TargetType='Button'><Setter Property='Foreground' Value='#dce7f5'/><Setter Property='Background' Value='#1a293c'/><Setter Property='BorderBrush' Value='#364961'/><Setter Property='BorderThickness' Value='1'/><Setter Property='Padding' Value='18,11'/><Setter Property='MinHeight' Value='44'/><Setter Property='Cursor' Value='Hand'/><Setter Property='FontSize' Value='13'/><Setter Property='FontWeight' Value='SemiBold'/><Setter Property='FocusVisualStyle' Value='{x:Null}'/><Setter Property='Template'><Setter.Value><ControlTemplate TargetType='Button'><Border x:Name='Surface' Background='{TemplateBinding Background}' BorderBrush='{TemplateBinding BorderBrush}' BorderThickness='{TemplateBinding BorderThickness}' Padding='{TemplateBinding Padding}' CornerRadius='8'><ContentPresenter HorizontalAlignment='Center' VerticalAlignment='Center' RecognizesAccessKey='True'/></Border><ControlTemplate.Triggers><Trigger Property='IsMouseOver' Value='True'><Setter TargetName='Surface' Property='BorderBrush' Value='#a6c4e3'/></Trigger><Trigger Property='IsPressed' Value='True'><Setter TargetName='Surface' Property='Opacity' Value='0.72'/></Trigger><Trigger Property='IsKeyboardFocused' Value='True'><Setter TargetName='Surface' Property='BorderBrush' Value='#ffffff'/><Setter TargetName='Surface' Property='BorderThickness' Value='2'/></Trigger><Trigger Property='IsEnabled' Value='False'><Setter Property='Opacity' Value='0.4'/></Trigger></ControlTemplate.Triggers></ControlTemplate></Setter.Value></Setter></Style>
 <Style TargetType='TextBox'><Setter Property='Foreground' Value='#edf3fb'/><Setter Property='Background' Value='#0b1320'/><Setter Property='CaretBrush' Value='#c8e1fa'/><Setter Property='BorderBrush' Value='#425a77'/><Setter Property='BorderThickness' Value='1'/><Setter Property='Padding' Value='12,11'/><Setter Property='VerticalContentAlignment' Value='Center'/><Setter Property='SelectionBrush' Value='#385a7d'/><Style.Triggers><Trigger Property='IsKeyboardFocused' Value='True'><Setter Property='BorderBrush' Value='#bed7ef'/><Setter Property='BorderThickness' Value='2'/></Trigger><Trigger Property='IsEnabled' Value='False'><Setter Property='Opacity' Value='0.5'/></Trigger></Style.Triggers></Style>
 <Style TargetType='ProgressBar'><Setter Property='Height' Value='6'/><Setter Property='Foreground' Value='#bed7ef'/><Setter Property='Background' Value='#26374c'/><Setter Property='BorderThickness' Value='0'/></Style>
 <Style TargetType='ScrollBar'><Setter Property='Width' Value='8'/><Setter Property='Background' Value='#0b111c'/><Setter Property='Template'><Setter.Value><ControlTemplate TargetType='ScrollBar'><Grid Background='{TemplateBinding Background}'><Track x:Name='PART_Track' Orientation='Vertical' IsDirectionReversed='True' Minimum='{TemplateBinding Minimum}' Maximum='{TemplateBinding Maximum}' Value='{TemplateBinding Value}' ViewportSize='{TemplateBinding ViewportSize}'><Track.DecreaseRepeatButton><RepeatButton Command='ScrollBar.PageUpCommand' Opacity='0' IsTabStop='False'/></Track.DecreaseRepeatButton><Track.Thumb><Thumb Background='#405570'><Thumb.Template><ControlTemplate TargetType='Thumb'><Border Background='{TemplateBinding Background}' CornerRadius='3' Margin='2,0'/></ControlTemplate></Thumb.Template></Thumb></Track.Thumb><Track.IncreaseRepeatButton><RepeatButton Command='ScrollBar.PageDownCommand' Opacity='0' IsTabStop='False'/></Track.IncreaseRepeatButton></Track></Grid></ControlTemplate></Setter.Value></Setter></Style>
</Grid.Resources>
<Grid Margin='28'>
 <Grid.RowDefinitions><RowDefinition Height='Auto'/><RowDefinition Height='*'/><RowDefinition Height='Auto'/></Grid.RowDefinitions>
 <Grid Margin='0,0,0,20'>
  <Grid.ColumnDefinitions><ColumnDefinition Width='Auto'/><ColumnDefinition Width='*'/><ColumnDefinition Width='Auto'/></Grid.ColumnDefinitions>
  <Border Width='52' Height='52' Background='#142236' CornerRadius='12' Margin='0,0,14,0'><Viewbox x:Name='LogoHost' Width='38' Height='38'/></Border>
  <StackPanel Grid.Column='1' VerticalAlignment='Center'><TextBlock Text='WolfGuard' FontSize='23' FontWeight='SemiBold'/><TextBlock Text='Agent de poste' FontSize='12' Foreground='#95a8c0' Margin='0,2,0,0'/></StackPanel>
  <Button x:Name='OptionsButton' Grid.Column='2' Content='•••' Width='44' Padding='8' Background='Transparent' BorderBrush='#2a3b51' FontSize='16' AutomationProperties.Name='Options de l’agent' ToolTip='Options de l’agent'/>
 </Grid>
 <ScrollViewer Grid.Row='1' VerticalScrollBarVisibility='Auto' HorizontalScrollBarVisibility='Disabled' Padding='0,0,4,0' CanContentScroll='False'>
  <StackPanel>
   <Border x:Name='StateCard' Background='#132032' BorderBrush='#30445e' BorderThickness='1' CornerRadius='14' Padding='20'>
    <StackPanel>
     <Grid Margin='0,0,0,12'><Grid.ColumnDefinitions><ColumnDefinition Width='*'/><ColumnDefinition Width='Auto'/></Grid.ColumnDefinitions><TextBlock Text='CONNEXION À WOLFGUARD' FontSize='10' FontWeight='SemiBold' Foreground='#93a9c2' VerticalAlignment='Center'/><Border x:Name='BadgeSurface' Grid.Column='1' Background='#26374b' CornerRadius='6' Padding='8,5'><StackPanel Orientation='Horizontal'><Ellipse x:Name='StateDot' Width='6' Height='6' Fill='#bed7ef' Margin='0,0,7,0'/><TextBlock x:Name='StateBadge' Text='EN COURS' FontSize='9' FontWeight='SemiBold'/></StackPanel></Border></Grid>
     <TextBlock x:Name='StateTitle' Text='Préparation…' FontSize='30' FontWeight='SemiBold' TextWrapping='Wrap'/>
     <TextBlock x:Name='StateDetail' Text='Préparation de l’agent.' FontSize='13' LineHeight='20' Foreground='#b2c2d6' TextWrapping='Wrap' Margin='0,8,0,0'/>
     <ProgressBar x:Name='StateProgress' Margin='0,14,0,0' Minimum='0' Maximum='100' IsIndeterminate='True'/>
     <TextBlock x:Name='ProgressLabel' FontSize='12' Foreground='#bed7ef' Margin='0,6,0,0' Visibility='Collapsed'/>
     <TextBlock x:Name='ActionHint' FontSize='11' LineHeight='18' Foreground='#8fa6bf' TextWrapping='Wrap' Margin='0,14,0,0'/>
     <StackPanel x:Name='Pairing' Margin='0,18,0,0' Visibility='Collapsed'>
      <Border BorderBrush='#2e435e' BorderThickness='0,1,0,0' Padding='0,16,0,0'><StackPanel>
       <TextBlock Text='Code temporaire d’association' FontSize='12' FontWeight='SemiBold'/>
       <Grid Margin='0,9,0,0'><Grid.ColumnDefinitions><ColumnDefinition Width='*'/><ColumnDefinition Width='Auto'/></Grid.ColumnDefinitions><TextBox x:Name='PairCode' MaxLength='64' FontFamily='Consolas' FontSize='14' SpellCheck.IsEnabled='False' AutomationProperties.Name='Code temporaire d’association'/><Button x:Name='PasteButton' Grid.Column='1' Content='Coller' Margin='8,0,0,0' Padding='13,8' AutomationProperties.Name='Coller le code d’association'/></Grid>
       <Button x:Name='PairButton' Content='Associer ce poste' Background='#bed7ef' Foreground='#102033' BorderBrush='#bed7ef' HorizontalAlignment='Left' Margin='0,12,0,0'/>
       <TextBlock Text='Code à usage unique généré dans le site · Agents → Ajouter un poste.' FontSize='11' Foreground='#8fa6bf' TextWrapping='Wrap' Margin='0,8,0,0'/>
      </StackPanel></Border>
     </StackPanel>
    </StackPanel>
   </Border>
   <Grid x:Name='Capabilities' Margin='0,14,0,0'>
    <Grid.ColumnDefinitions><ColumnDefinition Width='*'/><ColumnDefinition Width='16'/><ColumnDefinition Width='*'/></Grid.ColumnDefinitions>
    <Border Background='#101b2a' BorderBrush='#25364b' BorderThickness='1' CornerRadius='10' Padding='16'><Grid><Grid.ColumnDefinitions><ColumnDefinition Width='Auto'/><ColumnDefinition Width='*'/></Grid.ColumnDefinitions><Border Background='#1d3045' CornerRadius='7' Width='32' Height='32' VerticalAlignment='Top' Margin='0,0,11,0'><Path Stroke='#bed7ef' StrokeThickness='1.3' Stretch='Uniform' Width='17' Height='17' Data='M 3,2 L 13,2 13,8 3,8 Z M 8,8 L 8,12 M 2,15 L 2,12 14,12 14,15 M 0,15 L 4,15 4,18 0,18 Z M 6,15 L 10,15 10,18 6,18 Z M 12,15 L 16,15 16,18 12,18 Z'/></Border><StackPanel Grid.Column='1'><TextBlock Text='Scans et audit' FontWeight='SemiBold' FontSize='12'/><TextBlock x:Name='ScanStatus' Text='En attente' Foreground='#9fb4cb' FontSize='12' TextWrapping='Wrap' Margin='0,5,0,0'/><TextBlock Text='Réseau et sécurité du poste' FontSize='10' Foreground='#738ca8' TextWrapping='Wrap' Margin='0,5,0,0'/></StackPanel></Grid></Border>
    <Border Grid.Column='2' Background='#101b2a' BorderBrush='#25364b' BorderThickness='1' CornerRadius='10' Padding='16'><Grid><Grid.ColumnDefinitions><ColumnDefinition Width='Auto'/><ColumnDefinition Width='*'/></Grid.ColumnDefinitions><Border Background='#1d3045' CornerRadius='7' Width='32' Height='32' VerticalAlignment='Top' Margin='0,0,11,0'><Path Stroke='#bed7ef' StrokeThickness='1.3' Stretch='Uniform' Width='17' Height='17' Data='M 1,1 L 17,1 17,12 1,12 Z M 9,12 L 9,16 M 5,16 L 13,16 M 12,6 L 17,6 M 15,4 L 17,6 15,8'/></Border><StackPanel Grid.Column='1'><TextBlock Text='Prise en main' FontWeight='SemiBold' FontSize='12'/><TextBlock x:Name='RemoteStatus' Text='Inactive' Foreground='#9fb4cb' FontSize='12' TextWrapping='Wrap' Margin='0,5,0,0'/><TextBlock Text='Bureau, souris et clavier' FontSize='10' Foreground='#738ca8' TextWrapping='Wrap' Margin='0,5,0,0'/></StackPanel></Grid></Border>
   </Grid>
   <Border x:Name='ActivitySection' BorderBrush='#243449' BorderThickness='0,1,0,0' Margin='0,16,0,0' Padding='0,12,0,0'>
    <StackPanel><TextBlock Text='ACTIVITÉ RÉCENTE' FontSize='10' Foreground='#829bb6' FontWeight='SemiBold' Margin='0,0,0,10'/><TextBlock x:Name='LastActivity' FontSize='12' Text='Aucune opération depuis cette ouverture.' Foreground='#9dafc5' TextTrimming='CharacterEllipsis'/><StackPanel x:Name='ActivityList'/></StackPanel>
   </Border>
  </StackPanel>
 </ScrollViewer>
 <StackPanel Grid.Row='2' Margin='0,20,0,0'>
  <Border BorderBrush='#243449' BorderThickness='0,1,0,0' Padding='0,16,0,0'><Grid><Grid.ColumnDefinitions><ColumnDefinition Width='*'/><ColumnDefinition Width='Auto'/></Grid.ColumnDefinitions><StackPanel VerticalAlignment='Center' Margin='0,0,12,0'><TextBlock x:Name='MachineName' FontSize='12' FontWeight='SemiBold' TextTrimming='CharacterEllipsis'/><TextBlock Text='Cet ordinateur · Windows' Foreground='#738ca8' FontSize='10' Margin='0,4,0,0'/></StackPanel><StackPanel Grid.Column='1' Orientation='Horizontal'><Button x:Name='HideButton' Content='Masquer' Background='Transparent' BorderBrush='#2d4058' Padding='14,10' Margin='0,0,8,0' ToolTip='Garder l’agent près de l’horloge Windows'/><Button x:Name='MainButton' Content='Démarrer' MinWidth='138' IsEnabled='False'/></StackPanel></Grid></Border>
  <TextBlock x:Name='FooterHint' Text='Fermer cette fenêtre garde l’agent près de l’horloge Windows.' FontSize='10' Foreground='#738ca8' TextWrapping='Wrap' Margin='0,11,0,0'/>
 </StackPanel>
</Grid></Grid>";
      root = (Grid)XamlReader.Parse(xaml); Content = root;
      ((Viewbox)root.FindName("LogoHost")).Child = Logo();
      statusTitle = (TextBlock)root.FindName("StateTitle"); detail = (TextBlock)root.FindName("StateDetail");
      progressLabel = (TextBlock)root.FindName("ProgressLabel"); lastActivity = (TextBlock)root.FindName("LastActivity");
      dot = (Ellipse)root.FindName("StateDot"); progress = (ProgressBar)root.FindName("StateProgress");
      pairing = (StackPanel)root.FindName("Pairing"); code = (TextBox)root.FindName("PairCode");
      pairButton = (Button)root.FindName("PairButton"); mainButton = (Button)root.FindName("MainButton");
      stateBadge = (TextBlock)root.FindName("StateBadge"); actionHint = (TextBlock)root.FindName("ActionHint");
      scanStatus = (TextBlock)root.FindName("ScanStatus"); remoteStatus = (TextBlock)root.FindName("RemoteStatus");
      machineName = (TextBlock)root.FindName("MachineName"); footerHint = (TextBlock)root.FindName("FooterHint");
      stateCard = (Border)root.FindName("StateCard"); badgeSurface = (Border)root.FindName("BadgeSurface");
      capabilities = (Grid)root.FindName("Capabilities"); activityList = (StackPanel)root.FindName("ActivityList");
      activitySection = (Border)root.FindName("ActivitySection");
      hideButton = (Button)root.FindName("HideButton"); optionsButton = (Button)root.FindName("OptionsButton"); pasteButton = (Button)root.FindName("PasteButton");
      machineName.Text = preview ? "POSTE-WINDOWS" : Environment.MachineName;
      ContextMenu options = new ContextMenu { Background = Brush("#132032"), Foreground = Brush("#edf3fb"), BorderBrush = Brush("#3b516b"), BorderThickness = new Thickness(1), Padding = new Thickness(5), FontSize = 13 };
      repairMenu = new MenuItem { Header = "Associer à nouveau ce poste" };
      repairMenu.Click += delegate { if (MessageBox.Show(this, "La nouvelle association interrompt les scans et la prise en main en cours. Continuer ?", "Associer ce poste", MessageBoxButton.YesNo, MessageBoxImage.Question) == MessageBoxResult.Yes) Send(new {type = "repair"}); };
      options.Items.Add(repairMenu); options.Items.Add(new Separator());
      MenuItem quitMenu = new MenuItem { Header = "Quitter l’agent", Foreground = Brush("#efb4b0") }; quitMenu.Click += async delegate { await Quit(); }; options.Items.Add(quitMenu);
      optionsButton.ContextMenu = options;
      optionsButton.Click += delegate { options.PlacementTarget = optionsButton; options.IsOpen = true; };
      hideButton.Click += delegate { if (!preview) { ShowInTaskbar = false; Hide(); } };
      pasteButton.Click += delegate { try { if (Clipboard.ContainsText()) { string pasted = Clipboard.GetText().Trim(); if (!System.Text.RegularExpressions.Regex.IsMatch(pasted, "^[a-fA-F0-9]{32}$")) { detail.Text = "Copie le code temporaire de 32 caractères depuis la fenêtre Agents du site."; code.Focus(); return; } code.Text = pasted; code.Focus(); code.CaretIndex = code.Text.Length; } } catch { detail.Text = "Le presse-papiers est indisponible. Colle le code avec Ctrl+V."; } };
      code.KeyDown += delegate(object sender, System.Windows.Input.KeyEventArgs e) { if (e.Key == System.Windows.Input.Key.Enter && pairButton.IsEnabled) { e.Handled = true; pairButton.RaiseEvent(new RoutedEventArgs(Button.ClickEvent)); } };
      code.TextChanged += delegate { pairButton.IsEnabled = currentState != "enrolling" && ValidPairCode(); };
      Icon = LogoBitmap(64);
      pairButton.Click += delegate {
        string value = code.Text.Trim().ToLowerInvariant();
        if (!System.Text.RegularExpressions.Regex.IsMatch(value, "^[a-f0-9]{32}$")) { SetState("pairing", "Copie le code temporaire de 32 caractères généré sur le site.", 0, 0); return; }
        if (Send(new { type = "pair", code = value })) { code.Clear(); SetState("enrolling", "Association du poste…", 0, 0); }
      };
      mainButton.Click += async delegate {
        if (child == null || child.HasExited) { await Prepare(); return; }
        if (currentState == "remote" || currentState == "remote-preparing" || currentState == "terminal" || currentState == "terminal-preparing") {
          if (Send(new { type = "stop-remote" })) { detail.Text = "Arrêt de la prise en main…"; mainButton.IsEnabled = false; }
          return;
        }
        bool start = currentState == "stopped" || currentState == "error";
        if (Send(new { type = start ? "start" : "stop" })) SetState(start ? "connecting" : "stopping", start ? "Connexion à WolfGuard…" : "Arrêt du scan et de la connexion…", 0, 0);
      };
      Closing += delegate(object sender, System.ComponentModel.CancelEventArgs e) {
        if (preview || canClose) return;
        e.Cancel = true;
        if (!closing) { ShowInTaskbar = false; Hide(); }
      };
      if (!preview) {
        CreateTray();
        SourceInitialized += delegate { HwndSource.FromHwnd(new WindowInteropHelper(this).Handle).AddHook(WindowMessage); };
        Closed += delegate { DisposeTray(); if (Application.Current != null) Application.Current.SessionEnding -= SessionEnding; };
        if (Application.Current != null) Application.Current.SessionEnding += SessionEnding;
        if (prepareEngine) Loaded += async delegate {
          double availableHeight = Math.Max(320, SystemParameters.WorkArea.Height - 32), availableWidth = Math.Max(440, SystemParameters.WorkArea.Width - 32);
          MinHeight = Math.Min(MinHeight, availableHeight); MinWidth = Math.Min(MinWidth, availableWidth);
          Height = Math.Min(Height, availableHeight); Width = Math.Min(Width, availableWidth); await Prepare();
        };
      }
    }

    void CreateTray() {
      trayIcon = System.Drawing.Icon.ExtractAssociatedIcon(Assembly.GetExecutingAssembly().Location);
      tray = new System.Windows.Forms.NotifyIcon { Icon = trayIcon, Text = "WolfGuard Agent", Visible = true };
      System.Windows.Forms.ContextMenuStrip menu = new System.Windows.Forms.ContextMenuStrip();
      menu.Items.Add("Ouvrir WolfGuard Agent", null, delegate { RestoreWindow(); });
      remoteStop = (System.Windows.Forms.ToolStripMenuItem)menu.Items.Add("Arrêter la prise en main", null, delegate { Send(new { type = "stop-remote" }); });
      remoteStop.Enabled = false;
      menu.Items.Add(new System.Windows.Forms.ToolStripSeparator());
      menu.Items.Add("Quitter l’agent", null, async delegate { await Quit(); });
      tray.ContextMenuStrip = menu;
      tray.DoubleClick += delegate { RestoreWindow(); };
    }
    void DisposeTray() {
      if (tray != null) {
        tray.Visible = false;
        System.Windows.Forms.ContextMenuStrip menu = tray.ContextMenuStrip;
        tray.Dispose(); tray = null;
        if (menu != null) menu.Dispose();
      }
      if (trayIcon != null) { trayIcon.Dispose(); trayIcon = null; }
    }
    void RestoreWindow() {
      if (closing) return;
      ShowInTaskbar = true; Show();
      if (WindowState == WindowState.Minimized) WindowState = WindowState.Normal;
      Activate();
    }
    IntPtr WindowMessage(IntPtr handle, int message, IntPtr wParam, IntPtr lParam, ref bool handled) {
      if (message == Program.RestoreWindowMessage) { RestoreWindow(); handled = true; }
      return IntPtr.Zero;
    }
    async Task Quit() {
      if (closing) return; closing = true;
      if (download != null) download.CancelAsync();
      SetState("stopping", "Fermeture de l’agent et arrêt des scans…", 0, 0);
      await StopChild(); canClose = true; Close();
    }
    void SessionEnding(object sender, SessionEndingCancelEventArgs e) {
      closing = true; canClose = true;
      if (download != null) download.CancelAsync();
      Send(new { type = "shutdown" });
      DisposeTray();
    }

    static SolidColorBrush Brush(string color) { return (SolidColorBrush)new BrushConverter().ConvertFromString(color); }
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
    public void Preview(string state, string file) { Preview(state, file, 720, 640); }
    public void Preview(string state, string file, int width, int height) {
      Dictionary<string, string> messages = new Dictionary<string, string> {
        {"preparing", "Premier lancement : préparation des composants nécessaires."}, {"pairing", "Associe cet ordinateur à ton espace WolfGuard."}, {"enrolling", "Vérification du code temporaire et association du poste…"}, {"revoked", "L’association de ce poste n’est plus valide. Génère un nouveau code."},
        {"connecting", "Connexion sécurisée à WolfGuard…"}, {"connected", "Le poste est connecté et disponible pour tes opérations."}, {"scanning", "Scan actif en cours. Les résultats remontent sur le site."}, {"scanning-unknown", "Scan actif en cours. Les résultats remontent sur le site."},
        {"completed", "Scan terminé. Les résultats sont disponibles sur le site."}, {"failed", "Le scan a échoué. Consulte le rapport sur le site."}, {"cancelled", "Scan arrêté. Les observations reçues restent disponibles sur le site."}, {"remote-preparing", "Préparation de la prise en main. Chargement du bureau…"}, {"remote", "Le bureau, la souris et le clavier sont partagés."},
        {"offline", "Connexion interrompue. Nouvelle tentative automatique."}, {"stopping", "Arrêt des opérations et suspension de la connexion…"}, {"stopped", "La connexion est suspendue. Reprends-la pour rendre ce poste disponible."}, {"error", "La connexion n’a pas pu démarrer. Vérifie ton accès à Internet puis réessaie."}
      };
      string message = messages.ContainsKey(state) ? messages[state] : "";
      string renderedState = state == "scanning-unknown" ? "scanning" : state;
      if (state == "connected-after-scan") { SetState("completed", "Scan terminé. Les résultats sont disponibles sur le site.", 100, 100); renderedState = "connected"; message = "Agent connecté. Prêt à recevoir un scan ou une prise en main depuis le site."; }
      SetState(renderedState, message, state == "scanning" ? 37 : 0, state == "scanning" ? 100 : 0);
      SavePng(Render(root, width, height), file);
      List<string> buttons = new List<string>();
      VisibleButtons(root, buttons);
      File.WriteAllText(System.IO.Path.ChangeExtension(file, ".json"), json.Serialize(new {state, title = statusTitle.Text, detail = detail.Text, buttons, actionEnabled = mainButton.IsEnabled, progressVisible = progress.Visibility == Visibility.Visible, indeterminate = progress.IsIndeterminate, progress = progress.Value, progressLabel = progressLabel.Text, lastActivity = lastActivity.Text, badge = stateBadge.Text, scan = scanStatus.Text, remote = remoteStatus.Text, pairingVisible = pairing.Visibility == Visibility.Visible, pairEnabled = pairButton.IsEnabled, activityCount = activity.Count, primaryBounds = Bounds(mainButton), pairBounds = Bounds(pairButton), footerBounds = Bounds(footerHint)}), new UTF8Encoding(false));
    }
    object Bounds(FrameworkElement element) { Point point = element.TranslatePoint(new Point(0, 0), root); return new { x = point.X, y = point.Y, width = element.ActualWidth, height = element.ActualHeight, visible = element.Visibility == Visibility.Visible && element.ActualWidth > 0 && element.ActualHeight > 0 }; }
    bool ValidPairCode() { return System.Text.RegularExpressions.Regex.IsMatch(code.Text.Trim(), "^[a-fA-F0-9]{32}$"); }
    void RememberActivity(string message, string color) {
      activity.Insert(0, new ActivityEntry { Time = preview ? "14:32" : DateTime.Now.ToString("HH:mm"), Message = message, Color = color });
      if (activity.Count > 3) activity.RemoveAt(activity.Count - 1);
      lastActivityMessage = activity[0].Time + "  ·  " + activity[0].Message;
      lastActivity.Text = lastActivityMessage; lastActivity.ToolTip = activity[0].Message;
      lastActivity.Foreground = Brush(activity[0].Color); activityList.Children.Clear();
      for (int index = 1; index < activity.Count; index++) {
        ActivityEntry entry = activity[index]; activityList.Children.Add(new TextBlock { Text = entry.Time + "  ·  " + entry.Message, FontSize = 11, Foreground = Brush("#8097b1"), TextTrimming = TextTrimming.CharacterEllipsis, Margin = new Thickness(0, 7, 0, 0), ToolTip = entry.Message });
      }
    }
    static void VisibleButtons(DependencyObject parent, List<string> buttons) {
      UIElement element = parent as UIElement;
      if (element != null && element.Visibility != Visibility.Visible) return;
      Button button = parent as Button;
      if (button != null) { buttons.Add(Convert.ToString(button.Content)); return; }
      for (int index = 0; index < VisualTreeHelper.GetChildrenCount(parent); index++) VisibleButtons(VisualTreeHelper.GetChild(parent, index), buttons);
    }
    void SetState(string state, string message, int completed, int total) {
      string previousState = currentState;
      currentState = state;
      Dictionary<string, string> names = new Dictionary<string, string> {
        {"preparing","Préparation…"},{"pairing","À associer"},{"enrolling","Association…"},{"connecting","Connexion…"},
        {"terminal-preparing","Ouverture du terminal"},{"terminal","Terminal distant actif"},{"remote-preparing","Ouverture du bureau"},{"remote","Prise en main active"},{"connected","Prêt"},{"scanning","Scan en cours"},{"completed","Scan terminé"},{"cancelled","Scan arrêté"},
        {"failed","Échec du scan"},{"offline","Hors ligne"},{"revoked","Association requise"},{"stopping","Arrêt en cours…"},{"stopped","En pause"},{"error","Action nécessaire"}
      };
      statusTitle.Text = names.ContainsKey(state) ? names[state] : "Action nécessaire";
      if (tray != null) tray.Text = "WolfGuard Agent · " + statusTitle.Text;
      bool remote = state == "remote" || state == "remote-preparing" || state == "terminal" || state == "terminal-preparing";
      if (remoteStop != null) remoteStop.Enabled = remote;
      bool active = remote || state == "connected" || state == "scanning" || state == "completed" || state == "cancelled";
      detail.Text = message.Length > 500 ? message.Substring(0, 500) : message;
      string color = remote ? "#e7b97e" : state == "scanning" ? "#bed7ef" : active ? "#91cbb2" : state == "offline" || state == "error" || state == "failed" ? "#ef9e9c" : "#a4b9cf";
      dot.Fill = Brush(color); stateBadge.Foreground = Brush(color);
      stateBadge.Text = remote ? (state == "terminal" ? "TERMINAL ACTIF" : state == "remote" ? "BUREAU PARTAGÉ" : "OUVERTURE") : state == "scanning" ? "SCAN EN COURS" : active ? "EN LIGNE" : state == "stopped" ? "EN PAUSE" : state == "offline" ? "RECONNEXION" : state == "error" || state == "failed" ? "À VÉRIFIER" : state == "pairing" || state == "revoked" ? "À ASSOCIER" : "EN COURS";
      badgeSurface.Background = Brush(remote ? "#3a3025" : active && state != "scanning" ? "#20372f" : state == "offline" || state == "error" || state == "failed" ? "#3b2930" : "#22344a");
      stateCard.BorderBrush = Brush(remote ? "#8d7049" : state == "offline" || state == "error" || state == "failed" ? "#78505a" : "#30445e");
      scanStatus.Text = state == "scanning" ? "Collecte en cours" : remote ? "Poste occupé" : state == "connected" || state == "completed" || state == "cancelled" ? "Disponible depuis le site" : state == "stopped" ? "Suspendus" : "En attente de connexion";
      remoteStatus.Text = state == "terminal" ? "Terminal actif" : state == "terminal-preparing" ? "Ouverture du terminal…" : state == "remote" ? "Partage en cours" : state == "remote-preparing" ? "Ouverture du bureau…" : "Aucun partage actif";
      scanStatus.Foreground = Brush(state == "scanning" ? "#bed7ef" : active && !remote ? "#91cbb2" : "#9fb4cb");
      remoteStatus.Foreground = Brush(remote ? "#e7b97e" : "#9fb4cb");
      actionHint.Text = remote ? "Termine la session avec le bouton ci-dessous. L’agent restera connecté." : state == "connected" || state == "completed" || state == "cancelled" ? "Lance les scans ou la prise en main depuis le site WolfGuard." : state == "offline" ? "L’agent réessaie automatiquement. Tu peux le mettre en pause." : state == "stopped" ? "Les opérations sont suspendues, ton association reste enregistrée." : state == "failed" ? "Le rapport et les observations disponibles restent consultables sur le site." : state == "error" ? "Vérifie ta connexion puis réessaie avec le bouton ci-dessous." : "";
      actionHint.Visibility = actionHint.Text.Length == 0 ? Visibility.Collapsed : Visibility.Visible;
      string activityDetail = detail.Text.StartsWith(statusTitle.Text, StringComparison.CurrentCultureIgnoreCase) ? detail.Text.Substring(statusTitle.Text.Length).TrimStart(' ', '.', '…', '·', ':') : detail.Text;
      if (state != previousState && (state == "scanning" || state == "remote" || state == "terminal" || state == "completed" || state == "cancelled" || state == "failed" || state == "offline" || state == "error" || state == "stopped")) RememberActivity(statusTitle.Text + (activityDetail.Length > 0 ? " · " + activityDetail : ""), color);
      else if (state == "connected" && (previousState == "connecting" || previousState == "offline" || previousState == "preparing" || previousState == "enrolling" || previousState == "stopped")) RememberActivity(previousState == "offline" ? "Connexion rétablie" : "Connexion établie avec WolfGuard", "#91cbb2");
      else if (state == "connected" && (previousState == "remote" || previousState == "remote-preparing" || previousState == "terminal" || previousState == "terminal-preparing")) RememberActivity("Prise en main terminée · Le poste est à nouveau disponible.", "#91cbb2");
      if (!preview && tray != null && state != previousState && (state == "scanning" || state == "remote" || state == "terminal")) tray.ShowBalloonTip(4000, "WolfGuard · " + statusTitle.Text, detail.Text, System.Windows.Forms.ToolTipIcon.Info);
      bool pair = state == "pairing" || state == "revoked" || state == "enrolling";
      pairing.Visibility = pair ? Visibility.Visible : Visibility.Collapsed;
      capabilities.Visibility = pair ? Visibility.Collapsed : Visibility.Visible;
      activitySection.Visibility = pair ? Visibility.Collapsed : Visibility.Visible;
      pairButton.IsEnabled = state != "enrolling" && ValidPairCode(); pairButton.Content = state == "enrolling" ? "Association…" : "Associer ce poste";
      code.IsEnabled = state != "enrolling";
      pasteButton.IsEnabled = state != "enrolling";
      repairMenu.IsEnabled = !pair && state != "preparing" && state != "stopping" && !closing;
      bool start = state == "stopped" || state == "error" || state == "preparing";
      mainButton.Visibility = pair ? Visibility.Collapsed : Visibility.Visible;
      mainButton.IsEnabled = state != "preparing" && state != "stopping";
      mainButton.Content = remote ? "Arrêter la prise en main" : state == "error" ? "Réessayer" : state == "stopped" ? "Reprendre" : state == "preparing" ? "Préparation…" : "Mettre en pause";
      mainButton.Background = Brush(remote ? "#693f40" : start ? "#bed7ef" : "#1a293c");
      mainButton.BorderBrush = Brush(remote ? "#b77978" : start ? "#bed7ef" : "#3b516b");
      mainButton.Foreground = Brush(start ? "#102033" : "#edf3fb");
      mainButton.ToolTip = remote ? "Arrêter la session distante sans déconnecter l’agent" : start ? "Reconnecter ce poste avec son association enregistrée" : "Suspendre la connexion et interrompre le scan en cours";
      progress.Visibility = state == "scanning" || state == "terminal-preparing" || state == "remote-preparing" || state == "preparing" || state == "enrolling" || state == "connecting" || state == "stopping" ? Visibility.Visible : Visibility.Collapsed;
      progress.Foreground = Brush(remote ? "#e7b97e" : "#bed7ef");
      progress.IsIndeterminate = total <= 0; progress.Maximum = Math.Max(1, total); progress.Value = Math.Max(0, Math.Min(completed, total));
      progressLabel.Visibility = state == "scanning" && total > 0 ? Visibility.Visible : Visibility.Collapsed;
      progressLabel.Text = state == "scanning" && total > 0 ? progress.Value + " / " + total + " · " + Math.Round(progress.Value * 100 / total) + " %" : "";
    }
    bool Send(object command) {
      if (preview) return false;
      try { if (child == null || child.HasExited) throw new IOException(); child.StandardInput.WriteLine(json.Serialize(command)); child.StandardInput.Flush(); return true; }
      catch { SetState("error", "Le moteur n’est pas disponible. Clique sur Réessayer pour le relancer.", 0, 0); return false; }
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
      if (preparing || closing || preview || child != null && !child.HasExited) return; preparing = true;
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
              progressLabel.Visibility = e.TotalBytesToReceive > 0 ? Visibility.Visible : Visibility.Collapsed;
              progressLabel.Text = e.TotalBytesToReceive > 0 ? "Téléchargement des composants · " + e.ProgressPercentage + " %" : "";
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
        StartChild();
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
      info.EnvironmentVariables["WOLFGUARD_AGENT_EXE"] = Assembly.GetExecutingAssembly().Location;
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
    internal const int RestoreWindowMessage = 0x8000 + 71;
    [System.Runtime.InteropServices.DllImport("user32.dll")] static extern IntPtr FindWindow(string className, string title);
    [System.Runtime.InteropServices.DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr handle);
    [System.Runtime.InteropServices.DllImport("user32.dll")] static extern bool PostMessage(IntPtr handle, int message, IntPtr wParam, IntPtr lParam);
    static string StartupErrorMessage(Exception error) {
      string message = "WolfGuard Agent n’a pas pu démarrer. Ferme cette fenêtre puis réessaie. Si l’erreur revient, transmets le diagnostic pour identifier la cause.";
      string diagnostic = System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "WolfGuardAgent", "startup-error.log");
      try {
        Directory.CreateDirectory(System.IO.Path.GetDirectoryName(diagnostic));
        File.WriteAllText(diagnostic, DateTime.UtcNow.ToString("o", CultureInfo.InvariantCulture) + Environment.NewLine + error.ToString(), new UTF8Encoding(false));
        return message + "\n\nDiagnostic : " + diagnostic;
      } catch {
        return message + "\n\nErreur : " + error.GetType().Name + " (0x" + error.HResult.ToString("X8", CultureInfo.InvariantCulture) + "). Le diagnostic n’a pas pu être enregistré.";
      }
    }
    [STAThread] public static int Main(string[] args) {
      try {
        if (args.Length == 1 && args[0] == "--desktop-encoder") return DesktopEncoder.Run();
        if (args.Length == 2 && args[0] == "--render-logo") { AgentWindow.SavePng(AgentWindow.LogoBitmap(256), args[1]); return 0; }
        if (args.Length == 2 && args[0] == "--verify-extraction") { AgentWindow.VerifyExtraction(args[1]); return 0; }
        if (args.Length == 2 && args[0] == "--preview-dir") {
          Directory.CreateDirectory(args[1]);
          foreach (string state in new string[] { "preparing", "pairing", "enrolling", "revoked", "stopping", "connected", "scanning", "scanning-unknown", "offline", "stopped", "error", "connecting", "completed", "failed", "cancelled", "remote-preparing", "remote", "connected-after-scan" }) new AgentWindow(true).Preview(state, System.IO.Path.Combine(args[1], state + ".png"));
          foreach (string state in new string[] { "pairing", "connected", "remote" }) new AgentWindow(true).Preview(state, System.IO.Path.Combine(args[1], state + "-narrow.png"), 600, 560);
          return 0;
        }
        string sid = WindowsIdentity.GetCurrent().User.Value; bool created;
        using (Mutex mutex = new Mutex(true, @"Local\WolfGuardAgent-" + sid, out created)) {
          if (!created) { IntPtr window = FindWindow(null, "WolfGuard Agent"); if (window != IntPtr.Zero) { PostMessage(window, RestoreWindowMessage, IntPtr.Zero, IntPtr.Zero); SetForegroundWindow(window); } return 0; }
          try { Application app = new Application(); AgentWindow window = new AgentWindow(false); window.RequestPair = args.Length == 1 && args[0] == "--pair"; app.Run(window); }
          finally { mutex.ReleaseMutex(); }
        }
        return 0;
      } catch (Exception error) {
        MessageBox.Show(StartupErrorMessage(error), "WolfGuard Agent", MessageBoxButton.OK, MessageBoxImage.Error); return 1;
      }
    }
  }
}
