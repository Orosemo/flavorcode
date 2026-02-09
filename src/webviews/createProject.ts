import * as vscode from "vscode";
import * as fs from "fs";

export function createProjectHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
) {
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "stylesheet.css"),
  );

  const htmlPath = vscode.Uri.joinPath(
    extensionUri,
    "src",
    "webviews",
    "createProject.htm",
  );
  const rawHtml = fs.readFileSync(htmlPath.fsPath, "utf8");

  return rawHtml.replace("${styleUri}", String(styleUri));
}
