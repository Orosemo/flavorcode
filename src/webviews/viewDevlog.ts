import * as vscode from "vscode";
import * as fs from "fs";

export function viewDevlogtHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
) {
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "stylesheet.css"),
  );

  const codiconUri = webview.asWebviewUri(
    vscode.Uri.joinPath(
      extensionUri,
      "node_modules",
      "@vscode",
      "codicons",
      "dist",
      "codicon.css",
    ),
  );

  const htmlPath = vscode.Uri.joinPath(
    extensionUri,
    "src",
    "webviews",
    "viewDevlog.html",
  );
  const rawHtml = fs.readFileSync(htmlPath.fsPath, "utf8");
  const iconHtml = rawHtml.replace("${codiconUri}", String(codiconUri));
  return iconHtml.replace("${styleUri}", String(styleUri));
}
