using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Threading;

namespace WolfGuard {
  // This separate, visible window owns consent. No image or input is produced here.
  public sealed class RemotePermission : Window {
    bool accepted;
    readonly TextBlock heading, description;
    readonly Button allow, deny;
    readonly DispatcherTimer timer;
    public RemotePermission(bool preview) {
      Title="WolfGuard · Autoriser la prise en main";Width=470;Height=265;ResizeMode=ResizeMode.NoResize;
      WindowStartupLocation=WindowStartupLocation.CenterScreen;Topmost=true;
      Background=new SolidColorBrush(Color.FromRgb(14,25,40));Foreground=Brushes.White;FontFamily=new FontFamily("Segoe UI");
      Icon=AgentWindow.LogoBitmap(64);
      StackPanel content=new StackPanel();Content=new Border {Background=Background,Padding=new Thickness(24),Child=content};
      heading=new TextBlock {Text="Autoriser la prise en main ?",FontSize=21,FontWeight=FontWeights.SemiBold,TextWrapping=TextWrapping.Wrap};content.Children.Add(heading);
      description=new TextBlock {Text="WolfGuard demande à afficher ce bureau et à utiliser la souris et le clavier. Tu gardes un bouton d’arrêt sur ce poste pendant toute la session.",FontSize=13,Foreground=new SolidColorBrush(Color.FromRgb(180,194,212)),TextWrapping=TextWrapping.Wrap,Margin=new Thickness(0,13,0,19)};content.Children.Add(description);
      StackPanel actions=new StackPanel {Orientation=Orientation.Horizontal};content.Children.Add(actions);
      deny=new Button {Content="Refuser",Padding=new Thickness(18,10,18,10),Margin=new Thickness(0,0,10,0),IsDefault=true};
      allow=new Button {Content="Autoriser cette session",Padding=new Thickness(18,10,18,10)};actions.Children.Add(deny);actions.Children.Add(allow);
      deny.Background=new SolidColorBrush(Color.FromRgb(33,52,74));deny.Foreground=Brushes.White;deny.BorderThickness=new Thickness(0);
      allow.Background=new SolidColorBrush(Color.FromRgb(140,186,232));allow.Foreground=new SolidColorBrush(Color.FromRgb(14,25,40));allow.BorderThickness=new Thickness(0);
      deny.Click+=delegate {Close();};allow.Click+=delegate {if(accepted)Close();else {ActivateSharing();Console.Out.WriteLine("{\"status\":\"accepted\"}");Console.Out.Flush();}};
      timer=new DispatcherTimer {Interval=TimeSpan.FromSeconds(60)};timer.Tick+=delegate {Close();};
      if(!preview){timer.Start();Closed+=delegate {timer.Stop();Console.Out.WriteLine(accepted?"{\"status\":\"closed\"}":"{\"status\":\"denied\"}");Console.Out.Flush();};Task.Run(delegate {try {while(Console.In.ReadLine()!=null){} }catch{}Dispatcher.BeginInvoke(new Action(delegate {Close();}));});}
    }
    void ActivateSharing(){
      accepted=true;Title="WolfGuard · Bureau partagé";heading.Text="Partage à distance actif";
      description.Text="L’écran, la souris et le clavier sont partagés avec WolfGuard. Clique ci-dessous pour interrompre immédiatement la session.";
      deny.Visibility=Visibility.Collapsed;allow.Content="Arrêter le partage";allow.IsDefault=true;
      Width=365;Height=240;Left=SystemParameters.WorkArea.Right-Width-14;Top=SystemParameters.WorkArea.Top+14;
      timer.Stop();timer.Interval=TimeSpan.FromMinutes(20);timer.Start();
    }
    public static void Preview(string directory){
      Directory.CreateDirectory(directory);
      foreach(bool active in new bool[]{false,true}){
        RemotePermission window=new RemotePermission(true);if(active)window.ActivateSharing();
        FrameworkElement element=(FrameworkElement)window.Content;element.Measure(new Size(window.Width,window.Height));element.Arrange(new Rect(0,0,window.Width,window.Height));element.UpdateLayout();
        RenderTargetBitmap bitmap=new RenderTargetBitmap((int)window.Width,(int)window.Height,96,96,PixelFormats.Pbgra32);bitmap.Render(element);
        AgentWindow.SavePng(bitmap,Path.Combine(directory,active?"active.png":"consent.png"));window.timer.Stop();
      }
    }
    public static int Run(bool immediate=false){
      // This GUI executable has redirected pipes, without a Windows console.
      // Console.OutputEncoding calls SetConsoleOutputCP and fails in that context.
      Console.SetOut(new StreamWriter(Console.OpenStandardOutput(),new UTF8Encoding(false)) {AutoFlush=true});
      Console.SetIn(new StreamReader(Console.OpenStandardInput(),new UTF8Encoding(false)));
      Application app=new Application();RemotePermission window=new RemotePermission(false);
      if(immediate){
        window.ActivateSharing();
        window.Loaded+=delegate {Console.Out.WriteLine("{\"status\":\"ready\"}");Console.Out.Flush();};
      }
      app.Run(window);return 0;
    }
  }
}
