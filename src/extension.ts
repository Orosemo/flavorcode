import * as vscode from "vscode";
import {
  getUserSelf,
  getProject,
  createProject,
  updateProject,
  disconnectDiscordGateway,
  getAllProjects,
  getAllUsers,
  getAllStoreItems,
  getGoals,
  postGoals,
} from "./apiCalls";
import { openDevlogHtml } from "./webviews/openDevlog";
import * as emoji from "node-emoji";
import { projectInfoProvider } from "./projectInfoWebViewProvider";
import { viewDevlogProvider } from "./devlogViewWebviewProvider";
import { chooseThemeHtml } from "./webviews/chooseTheme";
import { exploretHtml } from "./webviews/explore";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  let currentDevlogViewPanel: vscode.WebviewPanel | undefined = undefined;
  let currentThemeViewPanel: vscode.WebviewPanel | undefined = undefined;
  let currentExploreViewPanel: vscode.WebviewPanel | undefined = undefined;

  // handler functions for the webview commands 
  let lastOpenedDevlog: any;

  let settings = vscode.workspace.getConfiguration("flavorcode");

  function getCurrentTheme() {
    const config = vscode.workspace.getConfiguration("flavorcode");
    return config.get<string>("theme");
  }

  // handler functions for the explore webview
  async function sendAllProjects(query: string) {
    if (!currentExploreViewPanel) {
      return;
    }

    const rawProjects = await getAllProjects("", query);
    const projects =
      rawProjects?.projects?.reduce(
        (acc: { [key: string]: any }, project: any) => {
          acc[project.id] = project;
          return acc;
        },
        {},
      ) ?? {};

    console.log("send project (extension)")

    currentExploreViewPanel.webview.postMessage({
      command: "projects",
      value: projects,
    });
  }

  async function sendAllUsers(query: string) {
    if (!currentExploreViewPanel) {
      return;
    }

    const rawUsers = await getAllUsers("", query);
    const users =
      rawUsers?.users?.reduce((acc: { [key: string]: any }, project: any) => {
        acc[project.id] = project;
        return acc;
      }, {}) ?? {};

    currentExploreViewPanel.webview.postMessage({
      command: "users",
      value: users,
    });
  }

  async function sendStoreItems() {
    if (!currentExploreViewPanel) {
      return;
    }

    const rawstoreItems = await getAllStoreItems("");
    const storeItemList = Array.isArray((rawstoreItems as any)?.storeItems)
      ? (rawstoreItems as any).storeItems
      : Array.isArray(rawstoreItems)
        ? rawstoreItems
        : [];
    const storeItems =
      storeItemList.reduce((acc: { [key: string]: any }, project: any) => {
        acc[project.id] = project;
        return acc;
      }, {}) ?? {};
    currentExploreViewPanel.webview.postMessage({
      command: "storeItems",
      value: storeItems,
    });
  }

  // get goals from logpheus or local
  async function getGoalsHandler() {
    if (!currentExploreViewPanel) {
      return;
    }

    settings = vscode.workspace.getConfiguration("flavorcode");
    const rawUseLocalGoals = settings.get<boolean | string>(
      "useLocalGoals",
      false,
    );
    const useLocalGoals =
      rawUseLocalGoals === true || rawUseLocalGoals === "true";

    if (useLocalGoals) {
      const rawLocalGoals = settings.get<number[] | unknown>("localGoals", []);
      const goals = Array.isArray(rawLocalGoals) ? rawLocalGoals : [];
      currentExploreViewPanel.webview.postMessage({
        command: "goals",
        value: goals ?? [],
      });
    } else {
      const goals = await getGoals("");
      currentExploreViewPanel.webview.postMessage({
        command: "goals",
        value: goals?.goals ?? [],
      });
    }
  }

  // send goals to logpheus or save locally
  async function putGoalsHandler(giveGoals: number[]) {
    if (!currentExploreViewPanel) {
      return;
    }

    settings = vscode.workspace.getConfiguration("flavorcode");
    const rawUseLocalGoals = settings.get<boolean | string>(
      "useLocalGoals",
      false,
    );
    const useLocalGoals =
      rawUseLocalGoals === true || rawUseLocalGoals === "true";

    if (useLocalGoals) {
      const nextGoals = Array.isArray(giveGoals) ? giveGoals : [];
      await settings.update(
        "localGoals",
        nextGoals,
        vscode.ConfigurationTarget.Global,
      );

      currentExploreViewPanel.webview.postMessage({
        command: "goals",
        value: nextGoals,
      });
    } else {
      const goals = await postGoals("", giveGoals);

      currentExploreViewPanel.webview.postMessage({
        command: "goals",
        value: goals?.goals ?? [],
      });
    }
  }

  async function refreshExplore() {
    if (!currentExploreViewPanel) {
      return;
    }

    console.log("refresh");

    currentExploreViewPanel.webview.html = exploretHtml(
      currentExploreViewPanel.webview,
      context.extensionUri,
    );

    // send current theme
    currentExploreViewPanel.webview.postMessage({
      command: "set-theme",
      value: getCurrentTheme(),
    });


    // send current user
    try {
      const currentUser = await getUserSelf("");
      currentExploreViewPanel.webview.postMessage({
        command: "user-data",
        value: currentUser,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(errorMessage);
      currentExploreViewPanel.webview.postMessage({
        command: "user-data",
        value: {},
      });
    }

    await sendAllProjects("");
    await sendAllUsers("");
    await sendStoreItems();
    await getGoalsHandler();
  }

  //  handler functions for the devlog webview
  function refreshOpenDevlogWebview() {
    if (!currentDevlogViewPanel) {
      return;
    }

    currentDevlogViewPanel.webview.html = openDevlogHtml(
      currentDevlogViewPanel.webview,
      context.extensionUri,
    );

    if (lastOpenedDevlog) {
      currentDevlogViewPanel.webview.postMessage({
        command: "devlog-info",
        value: lastOpenedDevlog,
      });
    }

    currentDevlogViewPanel.webview.postMessage({
      command: "set-theme",
      value: getCurrentTheme(),
    });
  }

  function prepareDevlogRecord(devlog: any) {
    const recordBody = devlog?.body ?? "";
    const mediaBaseUrl = "https://flavortown.hackclub.com";
    const normalizedMedia = Array.isArray(devlog?.media)
      ? devlog.media.map((item: { url?: string }) => {
          const mediaUrl = String(item?.url ?? "");
          const isAbsolute = /^https?:\/\//i.test(mediaUrl);

          return {
            ...item,
            url:
              mediaUrl && !isAbsolute
                ? `${mediaBaseUrl}${mediaUrl.startsWith("/") ? "" : "/"}${mediaUrl}`
                : mediaUrl,
          };
        })
      : devlog?.media;

    return devlog
      ? {
          ...devlog,
          body: emoji.emojify(String(recordBody)),
          media: normalizedMedia,
        }
      : devlog;
  }

  //  handler functions for the them webview
  function refreshThemeWebview() {
    if (!currentThemeViewPanel) {
      return;
    }

    currentThemeViewPanel.webview.html = chooseThemeHtml(
      currentThemeViewPanel.webview,
      context.extensionUri,
    );

    currentThemeViewPanel.webview.postMessage({
      command: "set-theme",
      value: getCurrentTheme(),
    });
  }

  // Commands

  const disposable = vscode.commands.registerCommand(
    "flavorcode.helloWorld",
    async () => {
      vscode.window.showInformationMessage("Hello World from Flavorcode!");
    },
  );

  /*
  // delete current Project
  const deleteCurrentProject = vscode.commands.registerCommand(
    "flavorcode.deletCurrentProject",
    async () => {
      // get config (vscode settigs)
      const config = vscode.workspace.getConfiguration("flavorcode");

      // inteface for quickpick choices
      interface Options extends vscode.QuickPickItem {
        value: number | string;
      }

      if (
        config.get<string>("flavortownApiKey") === "none" ||
        config.get<string>("flavortownApiKey") === ""
      ) {
        vscode.window.showErrorMessage(
          "Flavortown api key not set properly please  use the setup command to set it or set it in the settings.",
        );
      }

      if (
        config.get<string>("projectId") === "0" ||
        config.get<string>("projectId") === undefined
      ) {
        vscode.window.showErrorMessage(
          "Flavortown Project not set properly please use the setup command to set it.",
        );
      }

      const currentProject = await getProject("", Number(config.get<string>("projectId")));

      const enteredName = await vscode.window.showInputBox({placeHolder:`"${currentProject.title}"`, prompt: `Please enter ${currentProject.title} to confirm`});

      if (currentProject.title === enteredName) {
        // if there was an endpoint to delete projects that would be its place
      } else {
        vscode.window.showErrorMessage(`Project deletion canceled: ${currentProject.title} and ${enteredName} dont match.`)
      }
    },
  );
  */

  // opens webview to explore users, projects and the ft shop

  const explore = vscode.commands.registerCommand("flavorcode.explore", () => {
    const columToShowIn = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (currentExploreViewPanel) {
      currentExploreViewPanel.reveal(columToShowIn);
    } else {
      currentExploreViewPanel = vscode.window.createWebviewPanel(
        "explore",
        "Explore",
        columToShowIn || vscode.ViewColumn.One,
        {
          // permissions
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.joinPath(context.extensionUri, "media"),
            vscode.Uri.joinPath(
              context.extensionUri,
              "node_modules",
              "chart.js",
              "dist",
            ),
            vscode.Uri.joinPath(
              context.extensionUri,
              "node_modules",
              "@vscode",
              "codicons",
              "dist",
            ),
          ],
        },
      );
      currentExploreViewPanel.webview.html = exploretHtml(
        currentExploreViewPanel.webview,
        context.extensionUri,
      );

      refreshExplore();

      currentExploreViewPanel.onDidChangeViewState((event) => {
        if (event.webviewPanel.visible) {
          refreshExplore();
        }
      });

      currentExploreViewPanel.webview.onDidReceiveMessage((message) => {
        switch (message.command) {
          case "get-goals": {
            getGoalsHandler();
            break;
          }
          case "post-goals": {
            putGoalsHandler(message.value);
            break;
          } case "search-user": {
            sendAllUsers(message.value);
            break;
          } case "search-project": {
            sendAllProjects(message.value);
            console.log("search projects (extension)")
            break;
          }
        }
      });

      currentExploreViewPanel.onDidDispose(() => {
        currentExploreViewPanel = undefined;
      });
    }
  });

  // opens webview with devlog details
  const openDevlog = vscode.commands.registerCommand(
    "flavorcode.openDevlog",
    (devlog) => {
      const columToShowIn = vscode.window.activeTextEditor
        ? vscode.window.activeTextEditor.viewColumn
        : undefined;

      if (currentDevlogViewPanel) {
        currentDevlogViewPanel.reveal(columToShowIn);
      } else {
        currentDevlogViewPanel = vscode.window.createWebviewPanel(
          "ViewDevlog",
          "view Devlog",
          columToShowIn || vscode.ViewColumn.One,
          {
            // permissions
            enableScripts: true,
            localResourceRoots: [
              vscode.Uri.joinPath(context.extensionUri, "media"),
              vscode.Uri.joinPath(context.extensionUri, "devlogProvider.ts"),
              vscode.Uri.joinPath(
                context.extensionUri,
                "node_modules",
                "@vscode",
                "codicons",
                "dist",
              ),
            ],
          },
        );
        currentDevlogViewPanel.webview.html = openDevlogHtml(
          currentDevlogViewPanel.webview,
          context.extensionUri,
        );

        currentDevlogViewPanel.onDidChangeViewState((event) => {
          if (event.webviewPanel.visible) {
            refreshOpenDevlogWebview();
          }
        });

        currentDevlogViewPanel.onDidDispose(() => {
          currentDevlogViewPanel = undefined;
        });
      }

      const preparedDevlog = prepareDevlogRecord(devlog);
      if (preparedDevlog) {
        lastOpenedDevlog = preparedDevlog;
      }

      refreshOpenDevlogWebview();
    },
  );

  // activity bar webviews
  const devlogProvider = new viewDevlogProvider(context.extensionUri);
  const projectProvider = new projectInfoProvider(
    context.extensionUri,
    devlogProvider,
  );

  const projectInfo = vscode.window.registerWebviewViewProvider(
    projectInfoProvider.viewType,
    projectProvider,
  );

  const devlogView = vscode.window.registerWebviewViewProvider(
    viewDevlogProvider.viewType,
    devlogProvider,
  );

  // messages from devlog provider to project webview and vice verca :) (not used rn but maybe in the future)
  projectProvider.onMessage((message) => {
    if (message.scope === "global") {
      devlogProvider.postmessage(message);
    }
  });

  devlogProvider.onMessage((message) => {
    if (message.scope === "global") {
      projectProvider.postmessage(message);
    }
  });

  const chooseTheme = vscode.commands.registerCommand(
    "flavorcode.theme",
    () => {
      let config = vscode.workspace.getConfiguration("flavorcode");

      const columToShowIn = vscode.window.activeTextEditor
        ? vscode.window.activeTextEditor.viewColumn
        : undefined;

      if (currentThemeViewPanel) {
        currentThemeViewPanel.reveal(columToShowIn);
      } else {
        currentThemeViewPanel = vscode.window.createWebviewPanel(
          "ChooseTheme",
          "choose Theme",
          columToShowIn || vscode.ViewColumn.One,
          {
            // permissions
            enableScripts: true,
            localResourceRoots: [
              vscode.Uri.joinPath(context.extensionUri, "media"),
              vscode.Uri.joinPath(context.extensionUri, "devlogProvider.ts"),
              vscode.Uri.joinPath(
                context.extensionUri,
                "node_modules",
                "@vscode",
                "codicons",
                "dist",
              ),
            ],
          },
        );
        currentThemeViewPanel.webview.html = chooseThemeHtml(
          currentThemeViewPanel.webview,
          context.extensionUri,
        );

        currentThemeViewPanel.onDidChangeViewState((event) => {
          if (event.webviewPanel.visible) {
            refreshThemeWebview();
          }
        });

        currentThemeViewPanel.webview.onDidReceiveMessage((message) => {
          switch (message.command) {
            case "set-theme": {
              config = vscode.workspace.getConfiguration("flavorcode");
              config.update(
                "theme",
                message.value,
                vscode.ConfigurationTarget.Global,
              );
              devlogProvider.postmessage({
                command: "set-theme",
                value: message.value,
                scope: "global",
              });
              projectProvider.postmessage({
                command: "set-theme",
                value: message.value,
                scope: "global",
              });
            }
          }
        });

        currentThemeViewPanel.onDidDispose(() => {
          currentThemeViewPanel = undefined;
        });
      }

      refreshThemeWebview();
    },
  );

  context.subscriptions.push(
    disposable,
    explore,
    openDevlog,
    projectInfo,
    devlogView,
    chooseTheme,
  );
}

// This method is called when your extension is deactivated
export async function deactivate() {
  await disconnectDiscordGateway();
}
