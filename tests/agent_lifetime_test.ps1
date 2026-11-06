param(
  [Parameter(Mandatory=$true)][string]$Executable,
  [Parameter(Mandatory=$true)][string]$Node,
  [Parameter(Mandatory=$true)][string]$WorkingDirectory
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$source = @'
using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Interop;
using System.Windows.Forms;

public static class AgentLifetimeTest {
  [DllImport("user32.dll")] static extern bool PostMessage(IntPtr handle,int message,IntPtr wParam,IntPtr lParam);
  static void Check(bool value,string message) { if(!value)throw new Exception(message); }
  public static void Run(string executable,string node,string worker,string log) {
    Assembly assembly=Assembly.LoadFrom(executable);
    Type type=assembly.GetType("WolfGuard.AgentWindow",true);
    BindingFlags flags=BindingFlags.Instance|BindingFlags.NonPublic;
    ConstructorInfo constructor=type.GetConstructor(flags,null,new Type[]{typeof(bool),typeof(bool)},null);
    MethodInfo quit=type.GetMethod("Quit",flags);
    System.Windows.Application app=new System.Windows.Application();
    // Use the real window and tray, without installing, pairing or connecting.
    Window window=(Window)constructor.Invoke(new object[]{false,false});
    Process engine=Process.Start(new ProcessStartInfo(node,"\""+worker+"\" \""+log+"\"") {
      UseShellExecute=false,CreateNoWindow=true,RedirectStandardInput=true,RedirectStandardOutput=true,RedirectStandardError=true
    });
    Exception failure=null;
    try {
      Check(engine.StandardOutput.ReadLine()=="ready","Test engine did not start");
      int engineId=engine.Id;
      type.GetField("child",flags).SetValue(window,engine);
      NotifyIcon tray=(NotifyIcon)type.GetField("tray",flags).GetValue(window);
      bool exercised=false;
      window.Loaded+=async delegate {
        if(exercised)return;exercised=true;
        try {
          await Task.Delay(150);
          Check(window.IsVisible&&tray.Visible,"Initial window and tray must be visible");
          IntPtr handle=new WindowInteropHelper(window).Handle;
          System.Windows.Controls.Button hide=(System.Windows.Controls.Button)type.GetField("hideButton",flags).GetValue(window);
          hide.RaiseEvent(new RoutedEventArgs(System.Windows.Controls.Button.ClickEvent));
          Check(!window.IsVisible&&!engine.HasExited,"Hide must preserve the running engine");
          tray.ContextMenuStrip.Items[0].PerformClick();
          Check(window.IsVisible,"Tray Open must restore a hidden window");
          System.Windows.Controls.TextBox pairCode=(System.Windows.Controls.TextBox)type.GetField("code",flags).GetValue(window);
          System.Windows.Controls.Button pair=(System.Windows.Controls.Button)type.GetField("pairButton",flags).GetValue(window);
          type.GetMethod("SetState",flags).Invoke(window,new object[]{"pairing","Pairing fixture",0,0});
          pairCode.Text="invalid";Check(!pair.IsEnabled,"Invalid association input must disable submission");
          pairCode.Text=new string('a',32);Check(pair.IsEnabled,"A full hexadecimal association code must enable submission");
          type.GetMethod("SetState",flags).Invoke(window,new object[]{"enrolling","Enrolling fixture",0,0});
          Check(!pair.IsEnabled&&!pairCode.IsEnabled,"Enrollment must prevent duplicate association requests");
          pairCode.Clear();
          type.GetMethod("SetState",flags).Invoke(window,new object[]{"connected","Connected fixture",0,0});
          PostMessage(handle,0x0010,IntPtr.Zero,IntPtr.Zero);
          await Task.Delay(200);
          Check(!window.IsVisible&&!window.ShowInTaskbar,"The title-bar close must hide the window");
          Check(!engine.HasExited&&engine.Id==engineId,"Close stopped or replaced the engine");
          Check(File.ReadAllText(log)=="started\n","Close sent a shutdown command");
          Check(tray.Visible,"Tray must remain visible after closing the window");
          int restore=(int)assembly.GetType("WolfGuard.Program").GetField("RestoreWindowMessage",BindingFlags.Static|BindingFlags.NonPublic).GetRawConstantValue();
          PostMessage(handle,restore,IntPtr.Zero,IntPtr.Zero);
          await Task.Delay(200);
          Check(window.IsVisible&&window.ShowInTaskbar,"Relaunch message did not restore the window and taskbar");
          Check(!engine.HasExited&&engine.Id==engineId,"Reopening replaced the engine");
          PostMessage(handle,0x0010,IntPtr.Zero,IntPtr.Zero);
          await Task.Delay(100);
          tray.ContextMenuStrip.Items[0].PerformClick();
          Check(window.IsVisible,"Tray Open did not restore the window");
          Check(File.ReadAllText(log)=="started\n","Hiding or restoring affected the engine");
          Check(!tray.ContextMenuStrip.Items[1].Enabled,"Remote Stop must be disabled while idle");
          type.GetMethod("SetState",flags).Invoke(window,new object[]{"remote","Remote test",0,0});
          Check(tray.ContextMenuStrip.Items[1].Enabled,"Remote Stop must be available while sharing");
          tray.ContextMenuStrip.Items[1].PerformClick();
          await Task.Delay(100);
          Check(!engine.HasExited&&File.ReadAllText(log)=="started\nremote-stopped\n","Remote Stop must target sharing without quitting the agent");
          System.Windows.Controls.Button main=(System.Windows.Controls.Button)type.GetField("mainButton",flags).GetValue(window);
          main.RaiseEvent(new RoutedEventArgs(System.Windows.Controls.Button.ClickEvent));
          await Task.Delay(100);
          Check(!main.IsEnabled,"The local stop button must wait for sharing to close");
          Check(!engine.HasExited&&File.ReadAllText(log)=="started\nremote-stopped\nremote-stopped\n","Window Stop must only stop remote sharing");
          type.GetMethod("SetState",flags).Invoke(window,new object[]{"remote-preparing","Preparing test",0,0});
          Check(main.IsEnabled&&tray.ContextMenuStrip.Items[1].Enabled,"Sharing must also be stoppable during preparation");
          main.RaiseEvent(new RoutedEventArgs(System.Windows.Controls.Button.ClickEvent));
          await Task.Delay(100);
          Check(!engine.HasExited&&File.ReadAllText(log)=="started\nremote-stopped\nremote-stopped\nremote-stopped\n","Stopping preparation must keep the agent running");
          // Exercise the same explicit exit action exposed to the user.
          tray.ContextMenuStrip.Items[tray.ContextMenuStrip.Items.Count-1].PerformClick();
        } catch(Exception error) {
          failure=error;
        }
        if(failure!=null)await (Task)quit.Invoke(window,null);
      };
      app.Run(window);
      if(failure!=null)throw failure;
      Check(File.ReadAllText(log)=="started\nremote-stopped\nremote-stopped\nremote-stopped\nshutdown\n","Quit did not stop the engine gracefully");
      Check(type.GetField("child",flags).GetValue(window)==null,"Quit retained the child process");
      Check(type.GetField("tray",flags).GetValue(window)==null,"Quit retained the tray icon");
    } finally {
      try { if(!engine.HasExited)engine.Kill(); }catch(InvalidOperationException){}
      engine.Dispose();
      if(type.GetField("tray",flags).GetValue(window)!=null)type.GetMethod("DisposeTray",flags).Invoke(window,null);
      app.Shutdown();
    }
  }
}
'@
$references = @(
  [System.Windows.Window].Assembly.Location,
  [System.Windows.Media.Brush].Assembly.Location,
  [System.Windows.Threading.Dispatcher].Assembly.Location,
  [System.Windows.Forms.NotifyIcon].Assembly.Location,
  [System.Drawing.Icon].Assembly.Location,
  'System.dll', 'System.Core.dll', 'System.Xaml.dll'
)
Add-Type -TypeDefinition $source -ReferencedAssemblies $references
$worker = Join-Path $WorkingDirectory 'lifetime-worker.mjs'
$log = Join-Path $WorkingDirectory 'lifetime-worker.log'
$workerSource = @'
import {appendFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
const log=process.argv[2];
appendFileSync(log,'started\n');
process.stdout.write('ready\n');
const input=createInterface({input:process.stdin});
input.on('line',line=>{const command=JSON.parse(line);if(command.type==='stop-remote')appendFileSync(log,'remote-stopped\n');if(command.type==='shutdown'){appendFileSync(log,'shutdown\n');process.exit(0);}});
input.on('close',()=>process.exit(1));
'@
[IO.File]::WriteAllText($worker,$workerSource,[Text.UTF8Encoding]::new($false))
[AgentLifetimeTest]::Run($Executable,$Node,$worker,$log)
Write-Output 'PASS: close hides the real window without stopping the engine; tray Open and relaunch restore it; Quit shuts down the engine and removes the tray'
