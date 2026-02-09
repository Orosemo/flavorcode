import * as vscode from "vscode";

export class projectInfoProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = "flavorcode.infoView";

    constructor(private readonly extensionUri: vscode.Uri) {}

    resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, token: vscode.CancellationToken): Thenable<void> | void {
        webviewView.webview.options = {
            enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "media")],
        };

        const nonce = this.getNonce
    }

    private getNonce(): string {
        let text = "";
        const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i=0; i < 32; i += 1) {

        }
    }
}
