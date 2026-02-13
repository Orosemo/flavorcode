import * as vscode from "vscode";
import { getDevlog, getProject, getProjectDevlogs, updateProject } from "./apiCalls";
import { viewDevlogtHtml } from "./webviews/viewDevlog";

export class viewDevlogProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "flavorcode.devlogView";

  constructor(private readonly extensionUri: vscode.Uri) {}

  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken,
  ): Promise<void> {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "media")],
    };

    webviewView.webview.html = viewDevlogtHtml(
      webviewView.webview,
      this.extensionUri,
    );

    const config = vscode.workspace.getConfiguration("flavorcode");
    const projectId = Number(config.get<number>("projectId"));

    async function populateWebview() {
      //  const devlogs = await getProjectDevlogs("")

      const devlogs = [];
      const project = await getProject("", projectId);

      for (let devlogId of project.devlog_ids) {
        devlogs.push(await getDevlog("", devlogId))
      }

      //webviewView.webview.postMessage({command: "devlog-info", value:devlogs?.devlogs});

      webviewView.webview.postMessage({command: "devlog-info", value:devlogs});
    }

    populateWebview();

    webviewView.onDidChangeVisibility(async () => {
      populateWebview();
    });

    webviewView.webview.onDidReceiveMessage(async (message) => {
        const messageContent = message.value;
        switch (message.command) {
            case "open-devlog": {
                await vscode.commands.executeCommand("flavorcode.openDevlog", messageContent);
            }
        }
    });

  }
}
