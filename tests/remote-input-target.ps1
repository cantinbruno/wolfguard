$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Web.Extensions
$source = @'
using System;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
public static class RemoteInputTarget {
  [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
  public static void Run() {
    SetProcessDPIAware();
    Console.SetOut(new StreamWriter(Console.OpenStandardOutput(),new UTF8Encoding(false)) {AutoFlush=true});
    Console.SetIn(new StreamReader(Console.OpenStandardInput(),new UTF8Encoding(false)));
    JavaScriptSerializer json=new JavaScriptSerializer();
    Form form=new Form {Text="WolfGuard input test",Width=370,Height=160,TopMost=true,ShowInTaskbar=false,StartPosition=FormStartPosition.CenterScreen};
    TextBox text=new TextBox {Location=new Point(20,20),Width=310};
    Button button=new Button {Text="Test click",Location=new Point(20,60),Width=310};
    form.Controls.Add(text);form.Controls.Add(button);
    button.Click+=delegate {Console.WriteLine(json.Serialize(new { @event="clicked",text=text.Text }));};
    form.Shown+=delegate {
      form.Activate();text.Focus();
      Point a=text.PointToScreen(new Point(20,text.Height/2)),b=button.PointToScreen(new Point(20,button.Height/2));
      Console.WriteLine(json.Serialize(new { @event="ready",handle=form.Handle.ToInt64(),text=new {x=a.X,y=a.Y},button=new {x=b.X,y=b.Y} }));
    };
    Task.Run(delegate {try {while(Console.ReadLine()!=null){}form.BeginInvoke(new Action(delegate {form.Close();}));}catch{} });
    Application.Run(form);form.Dispose();
  }
}
'@
Add-Type -TypeDefinition $source -ReferencedAssemblies System.Windows.Forms,System.Drawing,System.Web.Extensions
[RemoteInputTarget]::Run()
