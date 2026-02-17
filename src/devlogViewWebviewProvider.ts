import * as vscode from "vscode";
import {
  getDevlog,
  getProject,
  getProjectDevlogs,
  updateProject,
} from "./apiCalls";
import { viewDevlogtHtml } from "./webviews/viewDevlog";
import { measureMemory } from "vm";

export class viewDevlogProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "flavorcode.devlogView";
  private _view?: vscode.WebviewView;
  private messageCallback?: (message: any) => void;

  constructor(private readonly extensionUri: vscode.Uri) {}

  public postmessage(message: any) {
    this._view?.webview.postMessage(message);
  }

  public onMessage(callback: (message: any) => void) {
    this.messageCallback = callback;
  }

  public async refreshDevlogs() {
    console.log("refresh");
    const config = vscode.workspace.getConfiguration("flavorcode");
    const projectId = Number(config.get<string>("projectId"));

    // let devlogs = [];
    try {
      const devlogs = await getProjectDevlogs("");

      // depreciated
      /*const project = await getProject("", projectId);

      for (let devlogId of project.devlog_ids) {
        devlogs.push(await getDevlog("", devlogId));
      } */

      this._view?.webview.postMessage({command: "devlog-info", value:devlogs?.devlogs, scope: "local"});

      /* webviewView.webview.postMessage({
        command: "devlog-info",
        value: devlogs, scope: "local"
      });

      devlogs = [];
      */
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!projectId || errorMessage.includes("404")) {
        this._view?.webview.postMessage({ command: "setup", scope: "local" });  
      }
    }
  }

  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken,
  ): Promise<void> {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "media"), vscode.Uri.joinPath(this.extensionUri, "node_modules", "@vscode", "codicons", "dist")],
    };

    webviewView.webview.html = viewDevlogtHtml(
      webviewView.webview,
      this.extensionUri,
    );

    let config = vscode.workspace.getConfiguration("flavorcode");
    let projectId = Number(config.get<string>("projectId"));

    async function populateWebview() {
      config = vscode.workspace.getConfiguration("flavorcode");
      projectId = Number(config.get<string>("projectId"));

      // let devlogs = [];
      try {
        const devlogs = await getProjectDevlogs("");

        // depreciated
        /*const project = await getProject("", projectId);

         for (let devlogId of project.devlog_ids) {
          devlogs.push(await getDevlog("", devlogId));
        } */

        webviewView.webview.postMessage({command: "devlog-info", value:devlogs?.devlogs, scope: "local"});

        /* webviewView.webview.postMessage({
          command: "devlog-info",
          value: devlogs, scope: "local"
        });

        devlogs = [];
        */
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!projectId || errorMessage.includes("404")) {
          webviewView.webview.postMessage({ command: "setup", scope: "local" });  
        }
      }
    }

    populateWebview();

    webviewView.onDidChangeVisibility(async () => {
      populateWebview();
    });

    webviewView.webview.onDidReceiveMessage(async (message) => {
      config = vscode.workspace.getConfiguration("flavorcode");
      projectId = Number(config.get<string>("projectId"));
      this.messageCallback?.(message);
      const messageContent = message.value;
      if (message.scope === "local") {
        switch (message.command) {
          case "open-devlog": {
            await vscode.commands.executeCommand(
              "flavorcode.openDevlog",
              messageContent,
            );
          }
        }        
      }

    });
  }
}
