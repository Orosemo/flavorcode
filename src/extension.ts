import * as vscode from "vscode";
import {
  getUserSelf,
  getProject,
  createProject,
  updateProject,
  disconnectDiscordGateway,
  getAllProjects,
  getAllUsers,
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

  // functions to refresh the devlog and themes page when the user clicks back into them
  let lastOpenedDevlog: any;

  function getCurrentTheme() {
    const config = vscode.workspace.getConfiguration("flavorcode");
    return config.get<string>("theme");
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

  async function refreshExplore() {
    if (!currentExploreViewPanel) {
      return;
    }

    currentExploreViewPanel.webview.html = exploretHtml(
      currentExploreViewPanel.webview, 
      context.extensionUri
    );

    // send current theme
    currentExploreViewPanel.webview.postMessage({comamnd:"current-theme", value:getCurrentTheme()});

    const rawProjects = await getAllProjects("");

    const rawUsers = await getAllUsers("");

  }

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

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activates

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand(
    "flavorcode.helloWorld",
    async () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
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
        config.get<number>("projectId") === 0 ||
        config.get<number>("projectId") === undefined
      ) {
        vscode.window.showErrorMessage(
          "Flavortown Project not set properly please use the setup command to set it.",
        );
      }

      const currentProject = await getProject("", Number(config.get<number>("projectId")));

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

  const explore = vscode.commands.registerCommand(
    "flavorcode.explore",
    () => {
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

        currentExploreViewPanel.onDidDispose(() => {
          currentExploreViewPanel = undefined;
        });
      }
    },
  );

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


  const chooseTheme = vscode.commands.registerCommand("flavorcode.theme", () => {
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
            config.update("theme", message.value, vscode.ConfigurationTarget.Global);
            devlogProvider.postmessage({command: "set-theme", value:message.value, scope:"global"});
            projectProvider.postmessage({command: "set-theme", value:message.value, scope:"global"});
          }
        }
      });

      currentThemeViewPanel.onDidDispose(() => {
        currentThemeViewPanel = undefined;
      });
    }

    refreshThemeWebview();
  });


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