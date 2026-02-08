// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { setContext } from "./context";
import { getUserSelf, getProject, createProject, updateProject } from "./apiCalls";
import { createProjectHtml } from "./webviews/createProject";
import { measureMemory } from "vm";
import { title } from "process";
import { updateProjectHtml } from "./webviews/updateProject";
import common from "mocha/lib/interfaces/common";

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
      // get config (vscode settigs)
      const config = vscode.workspace.getConfiguration("flavorcode");

      let enteredApiKey = "";

      // inteface for quickpick choices
      interface Options extends vscode.QuickPickItem {
        value: number | string;
      }

      // if there is no api key set ask the user to enter it
      if (
        config.get<string>("flavortownApiKey") === "none" ||
        config.get<string>("flavortownApiKey") === ""
      ) {
        enteredApiKey = String(
          await vscode.window.showInputBox({
            placeHolder: "your Flavortown api key from the website",
            prompt: "Go into the Flavortown settings and copy your api key",
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
      }

      // get user by api key
      const userSelf = await getUserSelf(enteredApiKey);
      // set in vscode settings if not set
      if (
        config.get<string>("userName") === "your username" ||
        config.get<string>("userName") === ""
      ) {
        config.update(
          "userName",
          userSelf.id,
          vscode.ConfigurationTarget.Global,
        );
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

  // create project Command
  const createNewProject = vscode.commands.registerCommand(
    "flavorcode.createProject",
    async () => {
      const panel = vscode.window.createWebviewPanel(
        "createProject",
        "create new Project",
        vscode.ViewColumn.One,
        {
          // permissions
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.joinPath(context.extensionUri, "media"),
          ],
        },
      );

      // create webview
      panel.webview.html = createProjectHtml(
        panel.webview,
        context.extensionUri,
      );

      // handle webview interactions
      panel.webview.onDidReceiveMessage(async (message) => {
        const messageContent = message.value;
        switch (message.command) {
          case "create":
            const newProject = await createProject(
              "",
              messageContent.name,
              messageContent.description,
              messageContent.repo,
              messageContent.demo,
              messageContent.ai,
            );
            panel.dispose();
            if (newProject instanceof Error) {
              vscode.window.showErrorMessage(newProject.message);
            } else {
              vscode.window.showInformationMessage(
                `Created new project "${newProject.title}" succesfully`,
              );
            }
            return;
        }
      });
    },
  );

  const updateCurrentProject = vscode.commands.registerCommand(
    "flavorcode.updateProject", async () => {
      const config = vscode.workspace.getConfiguration("flavorcode");
      const projectId = config.get<number>("projectId");
      if (!projectId || projectId === 0) {
        vscode.window.showErrorMessage("No project set: please use the setup command to initialise the exentsion.");
        return;
      }

      const panel = vscode.window.createWebviewPanel(
        "updateProject", 
        "Modify current Project",
        vscode.ViewColumn.One,
        {
          // permissions
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.joinPath(context.extensionUri, "media"),
          ]
        }
      );

      panel.webview.html = updateProjectHtml(panel.webview, context.extensionUri);

      // handle project messages from webview
      panel.webview.onDidReceiveMessage(async (message) => {
        const messageContent = message.value;
        switch (message.command) {
          // update project (get data from webview and make api call)
          case "update":
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
              panel.dispose();
              // error
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              vscode.window.showErrorMessage(errorMessage);
            }
            return;
          // cancel
          case "cancel":
            panel.dispose();
            return;
        }
      });

      // populate form
      const projectInfo = await getProject("", projectId);

      const projectInfoData = {
        name: projectInfo.title,
        description: projectInfo.description,
        demo: projectInfo.demo_url,
        repo: projectInfo.repo_url,
        ai: projectInfo.ai_declaration,
      };

      // send date to webview
      panel.webview.postMessage({ command: "project-info", value: projectInfoData });
    }
  );

  context.subscriptions.push(disposable, setupProject, createNewProject, updateCurrentProject);
}

// This method is called when your extension is deactivated
export function deactivate() {}
