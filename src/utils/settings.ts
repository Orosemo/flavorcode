import { readFile, writeFile, access, copyFile } from "fs/promises";
import path from "path";
import * as vscode from "vscode";
import { getContext } from "../context";
import { json } from "stream/consumers";
import { config } from "process";

// creates new configs.json inside .vscode folder if there is no present
async function initConfigJson(): Promise<string> {
  const context = getContext();
  const workspaceFolders = vscode.workspace.workspaceFolders?.[0].uri;
  if (!workspaceFolders) {
    throw new Error("No folder open");
  }

  try {
    await access(
      path.join(workspaceFolders.fsPath, ".vscode", "flavorcode.config.json"),
    );
    vscode.window.showInformationMessage("settings json already exists");
    return readFile(
      path.join(workspaceFolders.fsPath, ".vscode", "flavorcode.config.json"),
      "utf-8",
    );
  } catch {
    await vscode.workspace.fs.copy(
      vscode.Uri.joinPath(
        context.extensionUri,
        "resources",
        "flavorcode.config.json",
      ),
      vscode.Uri.joinPath(
        workspaceFolders,
        "/.vscode/",
        "flavorcode.config.json",
      ),
      { overwrite: false },
    );
    vscode.window.showInformationMessage("settings json created");
    return readFile(
      path.join(workspaceFolders.fsPath, ".vscode", "flavorcode.config.json"),
      "utf-8",
    );
  }
}

// gets the value of a specific config
export async function getconfig(config: string) {
  const rawConfig = await initConfigJson();
  const jsonConfig = JSON.parse(rawConfig);
  if (!jsonConfig[config]) {
    throw new Error(`Unable to get ${config}: not in config`);
  }
  return jsonConfig[config];
}

// sets the value of a specific config
export async function setconfig(config: string, value: string | number) {
  // get current folder path
  const workspaceFolders = vscode.workspace.workspaceFolders?.[0].uri;
  if (!workspaceFolders) {
    throw new Error("No folder open");
  }

  // get json content
  const rawConfig = await initConfigJson();
  const jsonConfig = JSON.parse(rawConfig);
  if (!jsonConfig[config]) {
    throw new Error(`Unable to set ${config}: not in config`);
  }
  jsonConfig[config] = value;

  // write to JSON to file
  await writeFile(
    path.join(workspaceFolders.fsPath, ".vscode", "flavorcode.config.json"),
    JSON.stringify(jsonConfig),
  );
}
