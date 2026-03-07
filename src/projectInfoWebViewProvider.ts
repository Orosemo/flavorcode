import * as vscode from "vscode";
import { overviewProjectHtml } from "./webviews/projectOverview";
import {
  connectDiscordGateway,
  getProject,
  updateProject,
  createProject,
  getUserSelf,
  getProjectDevlogs,
  disconnectDiscordGateway,
  getUser,
  getHackatimeUserStats,
} from "./apiCalls";
import { validateHeaderValue } from "http";

export class projectInfoProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "flavorcode.infoView";
  private _view?: vscode.WebviewView;
  private messageCallback?: (message: any) => void;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private devlogProvider: any,
  ) {}

  public postmessage(message: any) {
    this._view?.webview.postMessage(message);
  }

  public onMessage(callback: (message: any) => void) {
    this.messageCallback = callback;
  }

  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken,
  ): Promise<void> {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, "media"),
        vscode.Uri.joinPath(
          this.extensionUri,
          "node_modules",
          "@vscode",
          "codicons",
          "dist",
        ),
      ],
    };

    webviewView.webview.html = overviewProjectHtml(
      webviewView.webview,
      this.extensionUri,
    );

    this._view = webviewView;

    let config = vscode.workspace.getConfiguration("flavorcode");
    let projectId = Number(config.get<string>("projectId"));
    let apiKey = config.get<string>("flavortownApiKey");
    let userId = config.get<string>("userId");

    async function getUserId() {
      try {
        const userId = (await getUserSelf(String(apiKey))).id;
        config = vscode.workspace.getConfiguration("flavorcode");
        await config.update(
          "userId",
          String(userId),
          vscode.ConfigurationTarget.Global,
        );
        return userId;
      } catch (error) {
        const errorMessage =
        error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(errorMessage);
      }

    }

    const populateWebview = async () => {
      config = vscode.workspace.getConfiguration("flavorcode");
      projectId = Number(config.get<number>("projectId"));
      apiKey = config.get<string>("flavortownApiKey");
      userId = String(config.get<string>("userId"));

      try {
        const projectInfo = await getProject("", projectId);

        webviewView.webview.postMessage({
          command: "project-info",
          value: projectInfo,
          scope: "local",
        });

        const userId = await getUserId();
        const userInfo = await getUser(String(apiKey), String(userId));

        webviewView.webview.postMessage({
          command: "user-data",
          value: userInfo,
          scope: "local",
        });

        const hackatimeStats = await getHackatimeUserStats("", String(userId));

        webviewView.webview.postMessage({command: "set-hackatime", value: hackatimeStats, scope:"local"});
        
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (!projectId || errorMessage.includes("404")) {
          webviewView.webview.postMessage({
            command: "setup",
            value: apiKey,
            scope: "local",
          });
        } else {
          vscode.window.showErrorMessage(errorMessage);
        }
      }
    };

    const populateWebviewId = async (id: string) => {
      try {
        const projectInfo = await getProject("", Number(id));

        webviewView.webview.postMessage({
          command: "project-info",
          value: projectInfo,
          scope: "local",
        });

        const userId = await getUserId();
        const userInfo = await getUser(String(apiKey), String(userId));

        webviewView.webview.postMessage({
          command: "set-user",
          value: userInfo,
          scope: "local",
        });

        const hackatimeStats = await getHackatimeUserStats("", String(userId));

        webviewView.webview.postMessage({command: "set-hackatime", value: hackatimeStats, scope:"local"});

      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (!projectId || errorMessage.includes("404")) {
          webviewView.webview.postMessage({
            command: "setup",
            value: apiKey,
            scope: "local",
          });
        } else {
          vscode.window.showErrorMessage(errorMessage);
        }
      }
    }

    function setTheme() {
      config = vscode.workspace.getConfiguration("flavorcode");
      const theme = config.get<string>("theme");
      webviewView.webview.postMessage({
        command: "set-theme",
        value: theme,
        scope: "local",
      });
    }

    setTheme();
    populateWebview();

    webviewView.onDidChangeVisibility(async () => {
      setTheme();
      populateWebview();
    });

    try {
      config = vscode.workspace.getConfiguration("flavorcode");
      if (config.get<Boolean>("useDiscord")) {
        const projectInfo = await getProject("", projectId);
        await connectDiscordGateway(
          projectInfo.title,
          String(projectId),
          projectInfo.devlog_ids.length,
        );
      } else {
        disconnectDiscordGateway();
      }
    } catch {}

    webviewView.webview.onDidReceiveMessage(async (message) => {
      config = vscode.workspace.getConfiguration("flavorcode");
      projectId = Number(config.get<number>("projectId"));
      apiKey = config.get<string>("flavortownApiKey");
      this.messageCallback?.(message);
      try {
        const messageContent = message.value;
        if (message.scope === "local") {
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

                webviewView.webview.postMessage({
                  command: "updated-project-info",
                  value: updatedProject,
                  scope: "local",
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
                  await getUserId();
                  await config.update(
                    "projectId",
                    newProject.id,
                    vscode.ConfigurationTarget.Workspace,
                  );

                  webviewView.webview.postMessage({
                    command: "project-info",
                    value: newProject,
                    scope: "local",
                  });
                }
                this.devlogProvider.refreshDevlogs();
              } catch (error) {
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(errorMessage);
              }
              break;
            }
            case "get-projects": {
              const userSelf = await getUserSelf(messageContent.value);

              vscode.window.showInformationMessage(
                `Fetching projects for ${userSelf.display_name}, this may take a while.`,
              );

              const userProjects = [];

              for (const projectId of userSelf.project_ids) {
                const project = await getProject(
                  messageContent.value,
                  projectId,
                );
                userProjects.push({ label: project.title, value: project.id });
              }

              webviewView.webview.postMessage({
                command: "existing-projects",
                value: userProjects,
                scope: "local",
              });

              break;
            }
            case "selected": {
              const selectedProjectId = messageContent;
              await getUserId();
              await config.update(
                "projectId",
                selectedProjectId,
                vscode.ConfigurationTarget.Workspace,
              );
              populateWebviewId(selectedProjectId);
              this.devlogProvider.refreshDevlogs();
              break;
            }
            case "reload": {
              config = vscode.workspace.getConfiguration("flavorcode");
              if (config.get<Boolean>("useDiscord")) {
                const projectInfo = await getProject("", projectId);
                await connectDiscordGateway(
                  projectInfo.title,
                  String(projectId),
                  projectInfo.devlog_ids.length,
                );
              } else {
                disconnectDiscordGateway();
              }
              this.devlogProvider.refreshDevlogs();
              populateWebview();
              break;
            }
            case "openThemes": {
              vscode.commands.executeCommand("flavorcode.theme");
              break;
            }
            case "open-setup": {
              config = vscode.workspace.getConfiguration("flavorcode");
              apiKey = config.get<string>("flavortownApiKey");
              await getUserId();
              webviewView.webview.postMessage({
                command: "settings",
                value: apiKey,
                scope: "local",
              });
              break;
            }
            case "set-user": {
              await getUserId();
              break;
            }
            case "hackatime-key": {
              config = vscode.workspace.getConfiguration("flavorcode");       
              config.update("hackatimeApiKey", message.value);
              populateWebview();       
              break;
            }
          }
        }
      } catch (error) {
        console.error("Error in onDidReceiveMessage:", error);
      }
    });
  }
}
