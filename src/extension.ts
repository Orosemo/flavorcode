// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { setContext } from "./context";
import { getAllProjects, getAllUsers, getProject, getUserSelf } from "./apiCalls";
import { getconfig, setconfig } from "./utils/configs";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  setContext(context);

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
      const config = vscode.workspace.getConfiguration("flavorcode");

      if (
        config.get<string>("flavortownApiKey") === "none" ||
        config.get<string>("flavortownApiKey") === ""
      ) {
        const enteredApiKey = await vscode.window.showInputBox({
          placeHolder: "your Flavortown api key from the website",
          prompt: "Go into the Flavortown settings and copy your api key",
        });

        if (!enteredApiKey) {
          return;
        }

        config.update(
          "flavortownApiKey",
          enteredApiKey,
          vscode.ConfigurationTarget.Global,
        );
      }

      const userSelf = await getUserSelf();

      if (
        config.get<string>("userName") === "your username" ||
        config.get<string>("userName") === ""
      ) {
        config.update(
            "userName",
            userSelf.id,
            vscode.ConfigurationTarget.Global,
        );
      };

      vscode.window.showInformationMessage(`Fetching projects for ${userSelf.display_name}, this may take a while.`)

      interface ProjectOptions extends vscode.QuickPickItem {
        value: number
      }

      const userProjects: ProjectOptions[] = [];

      for (const projectId of userSelf.project_ids) {
        const project = await getProject(projectId);
        userProjects.push({label:project.title, value:project.id});
      }

      const selectProjectId = await vscode.window.showQuickPick(
        userProjects,
        { placeHolder: "Choose Flavortown project" },
      );

      if (!selectProjectId) {
        return;
      }

      config.update("projectId", selectProjectId.value);
    },
  );


  context.subscriptions.push(disposable, setupProject);
}

// This method is called when your extension is deactivated
export function deactivate() {}