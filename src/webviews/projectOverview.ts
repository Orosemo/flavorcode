import * as vscode from "vscode";
import * as fs from "fs";

export function overviewProjectHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
) {
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "stylesheet.css"),
  );

  function getNonce(): string {
      let text = "";
      const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      for (let i=0; i < 32; i += 1) {
          text += possible.charAt(Math.floor(Math.random() *  possible.length));
      }
      return text;
    }

  const htmlPath = vscode.Uri.joinPath(
    extensionUri,
    "src",
    "webviews",
    "projectOverview.htm",
  );
  const rawHtml = fs.readFileSync(htmlPath.fsPath, "utf8");
  const noncedHtml = rawHtml.replace("${nonce}", getNonce())
  return noncedHtml.replace("${styleUri}", String(styleUri));
  
}
