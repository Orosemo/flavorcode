import * as vscode from "vscode";
import { overviewProjectHtml } from "./webviews/projectOverview";
import { getProject, updateProject } from "./apiCalls";
import { create } from "domain";

export class projectInfoProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "flavorcode.infoView";

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

    webviewView.webview.html = overviewProjectHtml(
      webviewView.webview,
      this.extensionUri,
    );

    const config = vscode.workspace.getConfiguration("flavorcode");
    const projectId = Number(config.get<number>("projectId"));

    async function populateWebview() {
      const projectInfo = await getProject("", projectId);

      const projectInfoData = {
        projectId: projectId,
        name: projectInfo.title,
        description: projectInfo.description,
        demo: projectInfo.demo_url,
        repo: projectInfo.repo_url,
        ai: projectInfo.ai_declaration,
        ship: projectInfo.ship_status,
        readme: projectInfo.readme_url,
        created: projectInfo.created_at,
        updated: projectInfo.updated_at



      };

      webviewView.webview.postMessage({
        command: "project-info",
        value: projectInfoData,
      });
    }

    populateWebview();

    webviewView.onDidChangeVisibility(async () => {
      populateWebview();
    });

    webviewView.webview.onDidReceiveMessage(async (message) => {
      const messageContent = message.value;
      switch (message.command) {
        case "update": {
          try {
            const updatedProject = await updateProject(
              "",
              projectId,
              messageContent.name,
              messageContent.description,
              messageContent.repo,
              messageContent.demo,
              messageContent.ai,
            );
            // message
            vscode.window.showInformationMessage(
              `Updated project "${updatedProject.title}" succesfully`,
            );

            const projectInfoData = {
              projectId: projectId,
              name: updatedProject.title,
              description: updatedProject.description,
              demo: updatedProject.demo_url,
              repo: updatedProject.repo_url,
              ai: updatedProject.ai_declaration,
              ship: updatedProject.ship_status,
              created: updatedProject.created_at,
              updated: updatedProject.updated_at
            };

            webviewView.webview.postMessage({
              command: "updated-project-info",
              value: projectInfoData,
            });

            // error
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(errorMessage);
          }
        } case "open-settings": {
          vscode.commands.executeCommand('workbench.action.openSettings', 'flavorcode');
        }
      }
    });
  }
}
