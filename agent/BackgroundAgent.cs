using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.IO.Pipes;
using System.Net;
using System.Reflection;
using System.Security.AccessControl;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Web.Script.Serialization;
using Microsoft.Win32;

namespace WolfGuard {
  public static class BackgroundAgent {
    const string NodeUrl="https://nodejs.org/dist/v22.23.4/node-v22.23.4-win-x64.zip";
    const string NodeHash="cbc74b5e0982c9dbb41525fd8fb5dcd32fbee237863f7829072f4639a1ce5f20";
    static readonly bool Elevated=new WindowsPrincipal(WindowsIdentity.GetCurrent()).IsInRole(WindowsBuiltInRole.Administrator);
    static readonly string UserHome=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"WolfGuardAgent");
    static readonly string Home=Elevated?Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),"WolfGuardAgent",WindowsIdentity.GetCurrent().User.Value):UserHome;
    static readonly string Sid=WindowsIdentity.GetCurrent().User.Value;
    static readonly string PipeName="WolfGuardBackground-"+Sid;
    static readonly object Sync=new object();
    static readonly JavaScriptSerializer Json=new JavaScriptSerializer();
    static Process child;
    static volatile bool closing;
    static string Hash(byte[] value){using(SHA256 hash=SHA256.Create())return BitConverter.ToString(hash.ComputeHash(value)).Replace("-","").ToLowerInvariant();}
    static void Log(string message){try{Directory.CreateDirectory(Home);string log=Path.Combine(Home,"agent.log");lock(Sync){if(File.Exists(log)&&new FileInfo(log).Length>1024*1024){string previous=log+".1";if(File.Exists(previous))File.Delete(previous);File.Move(log,previous);}File.AppendAllText(log,DateTime.UtcNow.ToString("o")+" "+message+Environment.NewLine,new UTF8Encoding(false));}}catch{}}
    internal static void Extract(Stream archive,string destination){
      string root=Path.GetFullPath(destination).TrimEnd(Path.DirectorySeparatorChar)+Path.DirectorySeparatorChar;int count=0;long bytes=0;
      Directory.CreateDirectory(root);
      using(ZipArchive zip=new ZipArchive(archive,ZipArchiveMode.Read,true))foreach(ZipArchiveEntry entry in zip.Entries){
        string target=Path.GetFullPath(Path.Combine(root,entry.FullName.Replace('/',Path.DirectorySeparatorChar)));
        if(!target.StartsWith(root,StringComparison.OrdinalIgnoreCase)||++count>20000||(bytes+=entry.Length)>500L*1024*1024)throw new InvalidDataException("Archive path rejected");
        if(String.IsNullOrEmpty(entry.Name)){Directory.CreateDirectory(target);continue;}
        Directory.CreateDirectory(Path.GetDirectoryName(target));using(Stream source=entry.Open())using(FileStream output=new FileStream(target,FileMode.Create,FileAccess.Write,FileShare.None))source.CopyTo(output);
      }
    }
    internal static string PairCode(string[] args){
      if(args.Length==0||args.Length==1&&args[0]=="--background")return null;
      if(args.Length==2&&args[0]=="--pair-code"&&Regex.IsMatch(args[1],"\\A[a-fA-F0-9]{32}\\z"))return args[1].ToLowerInvariant();
      Uri uri;if(args.Length==1&&Uri.TryCreate(args[0],UriKind.Absolute,out uri)&&uri.Scheme=="wolfguard-agent"&&uri.Host=="pair"&&(uri.AbsolutePath=="/"||uri.AbsolutePath=="")&&String.IsNullOrEmpty(uri.Fragment)&&String.IsNullOrEmpty(uri.UserInfo)){
        Match code=Regex.Match(uri.Query,"\\A\\?code=([a-fA-F0-9]{32})\\z");if(code.Success)return code.Groups[1].Value.ToLowerInvariant();
      }
      throw new ArgumentException("Utilise l’association depuis le site WolfGuard.");
    }
    static bool Send(string command){
      try{using(NamedPipeClientStream pipe=new NamedPipeClientStream(".",PipeName,PipeDirection.Out)){pipe.Connect(800);using(StreamWriter writer=new StreamWriter(pipe,new UTF8Encoding(false))){writer.WriteLine(command);writer.Flush();}}return true;}catch{return false;}
    }
    static void Command(string command){
      lock(Sync){if(child!=null&&!child.HasExited){child.StandardInput.WriteLine(command);child.StandardInput.Flush();}}
    }
    static void Listen(){
      while(!closing)try{
        PipeSecurity acl=new PipeSecurity();acl.SetAccessRuleProtection(true,false);acl.AddAccessRule(new PipeAccessRule(Elevated?new SecurityIdentifier(WellKnownSidType.BuiltinAdministratorsSid,null):new SecurityIdentifier(Sid),PipeAccessRights.FullControl,AccessControlType.Allow));
        using(NamedPipeServerStream pipe=new NamedPipeServerStream(PipeName,PipeDirection.In,1,PipeTransmissionMode.Byte,PipeOptions.None,4096,4096,acl)){
          pipe.WaitForConnection();using(StreamReader reader=new StreamReader(pipe,Encoding.UTF8)){StringBuilder input=new StringBuilder();int character;while(input.Length<2048&&(character=reader.Read())>=0&&character!='\n')input.Append((char)character);string value=input.ToString().Trim();
            if(value=="stop"){closing=true;Command("{\"type\":\"shutdown\"}");continue;}
            if(Regex.IsMatch(value,"\\A[a-f0-9]{32}\\z"))Command("{\"type\":\"pair\",\"code\":\""+value+"\"}");
          }
        }
      }catch{if(!closing)Thread.Sleep(500);}
    }
    static void StopLegacyWindow(){
      foreach(Process process in Process.GetProcesses())try{
        if(process.Id==Process.GetCurrentProcess().Id||process.SessionId!=Process.GetCurrentProcess().SessionId||process.MainWindowTitle!="WolfGuard Agent")continue;
        if(FileVersionInfo.GetVersionInfo(process.MainModule.FileName).ProductName!="WolfGuard Agent")continue;
        // Closing the old GUI's stdin also stops its Node worker. Only replace
        // this application's old foreground window in the current session.
        process.Kill();process.WaitForExit(5000);
      }catch{}
    }
    static bool NeedsUpgrade(){
      try{
        string path=Path.Combine(Home,"launcher.path");
        if(!File.Exists(path))return true;
        string installed=File.ReadAllText(path).Trim(),self=Assembly.GetExecutingAssembly().Location;
        if(!File.Exists(installed))return true;
        if(String.Equals(Path.GetFullPath(installed),Path.GetFullPath(self),StringComparison.OrdinalIgnoreCase))return false;
        return Hash(File.ReadAllBytes(installed))!=Hash(File.ReadAllBytes(self));
      }catch{return true;}
    }
    static void Register(string executable){
      if(Elevated){
        dynamic scheduler=Activator.CreateInstance(Type.GetTypeFromProgID("Schedule.Service"));scheduler.Connect();dynamic task=scheduler.NewTask(0);task.RegistrationInfo.Description="WolfGuard : protection du poste et gestion en arrière-plan";task.Principal.UserId=Sid;task.Principal.LogonType=3;task.Principal.RunLevel=1;task.Settings.ExecutionTimeLimit="PT0S";task.Settings.DisallowStartIfOnBatteries=false;task.Settings.StopIfGoingOnBatteries=false;task.Settings.StartWhenAvailable=true;dynamic trigger=task.Triggers.Create(9);trigger.UserId=Sid;dynamic action=task.Actions.Create(0);action.Path=executable;action.Arguments="--background";scheduler.GetFolder("\\").RegisterTaskDefinition("WolfGuard-Endpoint-"+Sid,task,6,null,null,3,null);
        using(RegistryKey startup=Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run"))startup.DeleteValue("WolfGuardAgent",false);
      }else using(RegistryKey startup=Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run"))startup.SetValue("WolfGuardAgent","\""+executable+"\" --background");
      // Autostart is applied by default at installation time; the site offers
      // a standalone uninstaller instead of an opt-in checkbox.
      using(RegistryKey protocol=Registry.CurrentUser.CreateSubKey(@"Software\Classes\wolfguard-agent")){
        protocol.SetValue("","URL:WolfGuard Agent");protocol.SetValue("URL Protocol","");using(RegistryKey command=protocol.CreateSubKey(@"shell\open\command"))command.SetValue("","\""+executable+"\" \"%1\"");
      }
      File.WriteAllText(Path.Combine(Home,"launcher.path"),executable,new UTF8Encoding(false));
    }
    static void SecureMachineDirectory(string directory){
      SecurityIdentifier admins=new SecurityIdentifier(WellKnownSidType.BuiltinAdministratorsSid,null),system=new SecurityIdentifier(WellKnownSidType.LocalSystemSid,null);
      bool existed=Directory.Exists(directory);
      if(existed){if((File.GetAttributes(directory)&FileAttributes.ReparsePoint)!=0)throw new InvalidDataException("Unsafe agent directory");IdentityReference owner=Directory.GetAccessControl(directory).GetOwner(typeof(SecurityIdentifier));if(!owner.Equals(admins)&&!owner.Equals(system))throw new UnauthorizedAccessException("Untrusted machine directory owner");}
      else Directory.CreateDirectory(directory);
      DirectorySecurity permissions=new DirectorySecurity();permissions.SetAccessRuleProtection(true,false);permissions.SetOwner(admins);permissions.AddAccessRule(new FileSystemAccessRule(admins,FileSystemRights.FullControl,InheritanceFlags.ContainerInherit|InheritanceFlags.ObjectInherit,PropagationFlags.None,AccessControlType.Allow));permissions.AddAccessRule(new FileSystemAccessRule(system,FileSystemRights.FullControl,InheritanceFlags.ContainerInherit|InheritanceFlags.ObjectInherit,PropagationFlags.None,AccessControlType.Allow));Directory.SetAccessControl(directory,permissions);
    }
    static void Prepare(out string node,out string worker){
      if(Elevated){SecureMachineDirectory(Path.GetDirectoryName(Home));SecureMachineDirectory(Home);string old=Path.Combine(UserHome,"credential.dpapi"),next=Path.Combine(Home,"credential.dpapi");if(!File.Exists(next)&&File.Exists(old))File.Copy(old,next,false);}else Directory.CreateDirectory(Home);
      string app=Path.Combine(Home,"app",BuildInfo.PayloadHash.Substring(0,16));
      using(Stream source=Assembly.GetExecutingAssembly().GetManifestResourceStream("WolfGuard.Payload.zip"))using(MemoryStream memory=new MemoryStream()){
        source.CopyTo(memory);byte[] bytes=memory.ToArray();if(Hash(bytes)!=BuildInfo.PayloadHash)throw new InvalidDataException("Agent payload checksum failed");
        using(MemoryStream archive=new MemoryStream(bytes))Extract(archive,app);
      }
      string binaryDirectory=Path.Combine(Home,"bin",BuildInfo.PayloadHash.Substring(0,16));Directory.CreateDirectory(binaryDirectory);
      string installed=Path.Combine(binaryDirectory,"WolfGuard-Agent.exe"),self=Assembly.GetExecutingAssembly().Location;
      if(!String.Equals(Path.GetFullPath(self),Path.GetFullPath(installed),StringComparison.OrdinalIgnoreCase))File.Copy(self,installed,true);
      node=Path.Combine(Home,"runtime","node-v22.23.4-win-x64","node.exe");worker=Path.Combine(app,"agent","agent.mjs");
      if(!File.Exists(node)){
        ServicePointManager.SecurityProtocol=SecurityProtocolType.Tls12;
        using(WebClient client=new WebClient()){byte[] bytes=client.DownloadData(NodeUrl);if(Hash(bytes)!=NodeHash)throw new InvalidDataException("Node checksum failed");using(MemoryStream archive=new MemoryStream(bytes))Extract(archive,Path.Combine(Home,"runtime"));}
      }
      Register(installed);
    }
    internal static Process StartWorker(string node,string worker){
      Process process=new Process{StartInfo=new ProcessStartInfo(node,"\""+worker+"\" --gui"){UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden,RedirectStandardInput=true,RedirectStandardOutput=true,RedirectStandardError=true,WorkingDirectory=Path.GetDirectoryName(worker)}};
      process.OutputDataReceived+=delegate(object sender,DataReceivedEventArgs args){
        if(String.IsNullOrEmpty(args.Data)||args.Data.Length>4096)return;
        try{var value=Json.DeserializeObject(args.Data) as System.Collections.Generic.Dictionary<string,object>;if(value!=null&&value.ContainsKey("state"))Log(Convert.ToString(value["state"]));}catch{}
      };
      process.ErrorDataReceived+=delegate(object sender,DataReceivedEventArgs args){if(!String.IsNullOrEmpty(args.Data))Log("Erreur moteur : consulte les diagnostics du poste.");};
      process.StartInfo.EnvironmentVariables["WOLFGUARD_AGENT_HOME"]=Home;process.StartInfo.EnvironmentVariables.Remove("NODE_OPTIONS");process.StartInfo.EnvironmentVariables.Remove("NODE_PATH");if(Elevated){string system=Environment.GetFolderPath(Environment.SpecialFolder.System);process.StartInfo.EnvironmentVariables["PATH"]=system+";"+Path.Combine(system,"WindowsPowerShell","v1.0");process.StartInfo.EnvironmentVariables["PSModulePath"]=Path.Combine(system,"WindowsPowerShell","v1.0","Modules");}process.Start();process.StandardInput.AutoFlush=true;process.BeginOutputReadLine();process.BeginErrorReadLine();return process;
    }
    static void Stop(){closing=true;try{Command("{\"type\":\"shutdown\"}");if(child!=null&&!child.WaitForExit(8000))child.Kill();}catch{}}
    [STAThread] public static int Main(string[] args){
      try{
        if(args.Length==1&&args[0]=="--desktop-encoder")return DesktopEncoder.Run();
        if(args.Length==2&&args[0]=="--render-logo"){AgentWindow.SavePng(AgentWindow.LogoBitmap(256),args[1]);return 0;}
        if(args.Length==2&&args[0]=="--verify-extraction"){AgentWindow.VerifyExtraction(args[1]);return 0;}
        if(args.Length==1&&args[0]=="--stop")return Send("stop")?0:1;
        string code=PairCode(args);if(Elevated||NeedsUpgrade()){if(Send("stop"))Thread.Sleep(1500);}else if(Send(code??"status"))return 0;
        using(Mutex mutex=new Mutex(false,@"Local\WolfGuardAgent-"+Sid)){
          bool acquired=false;try{acquired=mutex.WaitOne(0);}catch(AbandonedMutexException){acquired=true;}
          if(!acquired){StopLegacyWindow();try{acquired=mutex.WaitOne(8000);}catch(AbandonedMutexException){acquired=true;}}
          if(!acquired)return code==null?0:1;
          try{
            string node,worker;Prepare(out node,out worker);AppDomain.CurrentDomain.ProcessExit+=delegate{Stop();};
            child=StartWorker(node,worker);Thread pipe=new Thread(Listen){IsBackground=true};pipe.Start();
            if(code!=null)Command("{\"type\":\"pair\",\"code\":\""+code+"\"}");
            Log("Agent en arrière-plan. Gestion et association depuis WolfGuard.");
            int restarts=0;
            while(!closing){child.WaitForExit();if(closing)break;if(++restarts>10){Log("Le moteur nécessite une réparation depuis le site.");return 1;}Thread.Sleep(Math.Min(60000,restarts*3000));child.Dispose();child=StartWorker(node,worker);}
          }finally{Stop();mutex.ReleaseMutex();}
        }
        return 0;
      }catch{Log("Démarrage impossible. Vérifie la connexion et les composants de l’agent.");return 1;}
    }
  }
}
