import * as vscode from "vscode";
import { overviewProjectHtml } from "./webviews/projectOverview";
import {
  connectDiscordGateway,
  getProject,
  updateProject,
  createProject,
  getUserSelf,
} from "./apiCalls";

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
    const apiKey = config.get<string>("flavortownApiKey");

    async function populateWebview() {
      try {
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
          updated: projectInfo.updated_at,
        };

        webviewView.webview.postMessage({
          command: "project-info",
          value: projectInfoData,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!projectId || errorMessage.includes("404")) {
          webviewView.webview.postMessage({ command: "setup", value: apiKey});  
        }
      }
    }

    async function populateWebviewId(id:string) {
      try {
        const projectInfo = await getProject("", Number(id));

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
          updated: projectInfo.updated_at,
        };

        webviewView.webview.postMessage({
          command: "project-info",
          value: projectInfoData,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!projectId || errorMessage.includes("404")) {
          webviewView.webview.postMessage({ command: "setup", value: apiKey});  
        }
      }
    }

    populateWebview();

    webviewView.webview.onDidReceiveMessage(async (message) => {
      try {
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
                updated: updatedProject.updated_at,
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
            break;
          }
          case "open-settings": {
            vscode.commands.executeCommand(
              "workbench.action.openSettings",
              "flavorcode",
            );
            break;
          }
          case "create": {
            try {
              const newProject = await createProject(
                messageContent.apiKey,
                messageContent.currenProject,
                messageContent.name,
                messageContent.description,
                messageContent.repo,
                messageContent.demo,
                messageContent.ai,
              );
              vscode.window.showInformationMessage(
                `Created new project "${newProject.title}" succesfully`,
              );

              if (messageContent.currenProject) {
                const projectInfoData = {
                  projectId: newProject.id,
                  name: newProject.title,
                  description: newProject.description,
                  demo: newProject.demo_url,
                  repo: newProject.repo_url,
                  ai: newProject.ai_declaration,
                  ship: newProject.ship_status,
                  readme: newProject.readme_url,
                  created: newProject.created_at,
                  updated: newProject.updated_at,
                };

                webviewView.webview.postMessage({
                  command: "project-info",
                  value: projectInfoData,
                });
              }
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              vscode.window.showErrorMessage(errorMessage);
            }
            break;
          }
          case "get-projects": {
            const userSelf =  await getUserSelf(messageContent.value);

            vscode.window.showInformationMessage(
              `Fetching projects for ${userSelf.display_name}, this may take a while.`,
            );
            
            const userProjects = [];
    
            for (const projectId of userSelf.project_ids) {
              const project = await getProject(messageContent.value, projectId);
              userProjects.push({ label: project.title, value: project.id });
            }
            console.log("fetched projects" + userProjects)
            webviewView.webview.postMessage({command:"existing-projects", value:userProjects});

            break;
          }
          case "selected": {
            const selectedProjectId = messageContent;
            console.log(selectedProjectId)
            await config.update("projectId", selectedProjectId, vscode.ConfigurationTarget.Workspace);
            populateWebviewId(selectedProjectId);
            break;
          }
        }

      } catch (error) {
        console.error("Error in onDidReceiveMessage:", error);
      }
    });

    try {
      const projectInfo = await getProject("", projectId);
      await connectDiscordGateway(
        projectInfo.title,
        String(projectId),
        projectInfo.devlog_ids.length,
      );
    } catch {}

    webviewView.onDidChangeVisibility(async () => {
      populateWebview();
    });
  }
}
