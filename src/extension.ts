// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import {
  getUserSelf,
  getProject,
  createProject,
  updateProject,
  disconnectDiscordGateway,
} from "./apiCalls";
import { openDevlogHtml } from "./webviews/openDevlog";
import * as emoji from "node-emoji";
import { projectInfoProvider } from "./projectInfoWebViewProvider";
import { viewDevlogProvider } from "./devlogViewWebviewProvider";
import { chooseThemeHtml } from "./webviews/chooseTheme";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  let currentDevlogViewPanel: vscode.WebviewPanel | undefined = undefined;
  let currentThemeViewPanel: vscode.WebviewPanel | undefined = undefined;

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "flavorcode" is now active!');

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

  const setupProject = vscode.commands.registerCommand(
    "flavorcode.setupProject",
    async () => {
      // get config (vscode settigs)
      const config = vscode.workspace.getConfiguration("flavorcode");

      let enteredApiKey = "";

      // inteface for quickpick choices
      interface Options extends vscode.QuickPickItem {
        value: number | string;
      }

      // ask the user to set or confirm their api key

      const currentApiKey = config.get<string>("flavortownApiKey");

      enteredApiKey = String(
        await vscode.window.showInputBox({
          placeHolder: "your Flavortown api key from the website",
          prompt: "Go into the Flavortown settings and copy your api key",
          value: currentApiKey,
        }),
      );

      if (!enteredApiKey) {
        return;
      }

      config.update(
        "flavortownApiKey",
        enteredApiKey,
        vscode.ConfigurationTarget.Global,
      );

      // get user by api key
      const userSelf = await getUserSelf(enteredApiKey);
      // set in vscode settings if not set
      if (
        config.get<string>("userId") === "your username" ||
        config.get<string>("userId") === ""
      ) {
        config.update("userId", userSelf.id, vscode.ConfigurationTarget.Global);
      }

      // ask if user wants to choose a existing project or create a new one
      const projectCreationOptions: Options[] = [
        { label: "create new Project", value: "new" },
        { label: "choose existing Project", value: "existing" },
      ];

      const projectCreationChoice = await vscode.window.showQuickPick(
        projectCreationOptions,
        {
          placeHolder:
            "Do you want to create a new project or an existing one?",
        },
      );

      // if user wants to choose new one fetch all projects and show them in a selection
      if (projectCreationChoice?.value === "existing") {
        vscode.window.showInformationMessage(
          `Fetching projects for ${userSelf.display_name}, this may take a while.`,
        );

        const userProjects: Options[] = [];

        for (const projectId of userSelf.project_ids) {
          const project = await getProject(enteredApiKey, projectId);
          userProjects.push({ label: project.title, value: project.id });
        }

        const selectProjectId = await vscode.window.showQuickPick(
          userProjects,
          { placeHolder: "Choose Flavortown project" },
        );

        if (!selectProjectId) {
          return;
        }

        // set in vscode settings
        config.update("projectId", selectProjectId.value);
      } else {
        vscode.commands.executeCommand("flavorcode.createProject");
      }
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

  // opens webview with devlog details
  const openDevlog = vscode.commands.registerCommand(
    "flavorcode.openDevlog",
    (record) => {
      let config = vscode.workspace.getConfiguration("flavorcode");
      const theme = config.get<string>("theme")

      let pendingRecord = record;
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

        currentDevlogViewPanel.onDidDispose(() => {
          currentDevlogViewPanel = undefined;
        });
      }

      const recordBody = pendingRecord?.body ?? "";
      const emojifiedRecord = pendingRecord
        ? { ...pendingRecord, body: emoji.emojify(String(recordBody)) }
        : pendingRecord;

      currentDevlogViewPanel.webview.postMessage({
        command: "devlog-info",
        value: emojifiedRecord,
      });
      currentDevlogViewPanel.webview.postMessage({
        command:"set-theme",
        value: theme
      })
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
    const theme = config.get<string>("theme")
    
    const columToShowIn = vscode.window.activeTextEditor
        ? vscode.window.activeTextEditor.viewColumn
        : undefined;

    if (currentThemeViewPanel) {
      currentThemeViewPanel.reveal(columToShowIn);
    } else {
      currentThemeViewPanel = vscode.window.createWebviewPanel(
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
      currentThemeViewPanel.webview.html = openDevlogHtml(
        currentThemeViewPanel.webview,
        context.extensionUri,
      );

      currentThemeViewPanel.onDidDispose(() => {
        currentThemeViewPanel = undefined;
      });
    }

    currentThemeViewPanel.webview.html = chooseThemeHtml(currentThemeViewPanel.webview, context.extensionUri);

    currentThemeViewPanel.webview.postMessage({command:"set-theme", value:theme});

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
  });


  context.subscriptions.push(
    disposable,
    setupProject,
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
