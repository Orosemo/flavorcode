import * as vscode from "vscode";
import * as fs from "fs";

export function exploretHtml(
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

  const chartJsUri = webview.asWebviewUri(
  vscode.Uri.joinPath(extensionUri, 'node_modules', 'chart.js', 'dist', 'chart.umd.js')
);

  const htmlPath = vscode.Uri.joinPath(
    extensionUri,
    "src",
    "webviews",
    "explore.html",
  );

  const rawHtml = fs.readFileSync(htmlPath.fsPath, "utf8");
  const iconHtml = rawHtml
    .replace("${codiconUri}", String(codiconUri))
    .replace("${chartUri}", String(chartJsUri));
  return iconHtml.replace("${styleUri}", String(styleUri));
}
