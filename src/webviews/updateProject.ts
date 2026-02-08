import * as vscode from "vscode";

export function updateProjectHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
) {
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "stylesheet.css"),
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Update Project</title>
        <link rel="stylesheet" href="${styleUri}">
</head>
<body>
    <h2>Updated current Project</h2>
    <h3>Name:</h3>
        <input id="name" type="text" placeholder="Give your project a name"></textarea>
    <h3>Description:</h3>
        <textarea id="description" type="text" placeholder="Share what the project does, who's working on it and what's new."></textarea>
    <h4>Demo Url(optional) </h4>
        <input id="demo" type="text" placeholder="https://orosemo.de"></textarea>
    <h4>Repository Url: (optional)</h4>
        <input id="repo" type="text" placeholder="https://github.com/Joko-26/flavorcode"></textarea>
    <h4>Ai declaration: (optional)</h4>
        <textarea id="ai" type="text" placeholder="I didn't use ai to generate my code because im cool :D"></textarea>
        <p>Please set the Hackatime project manually on the <a href="https://flavortown.hackclub.com/projects">Flavortown website</a> as the api doesnt support it. :(</p>
    <div class="button-row">
        <button onclick="Update()" >Update</button>
        <button class="cancel" onclick="Cancel()">Cancel</button>
    </div>
    <script>

        const vscode = acquireVsCodeApi();

        // send inputs to extension
        function Update() {
            const name = document.getElementById("name").value
            const description = document.getElementById("description").value
            const demo = document.getElementById("demo").value
            const repo = document.getElementById("repo").value
            const ai = document.getElementById("ai").value
            const createData = { name: name, description: description, demo: demo, repo: repo, ai:ai }
            vscode.postMessage({ command: "update", value: createData })
        }

        // set default values to current project info
        function passProjectInfo(projectInfo){
            document.getElementById("name").value = projectInfo.name || ""
            document.getElementById("description").value = projectInfo.description || ""
            document.getElementById("demo").value = projectInfo.demo || ""
            document.getElementById("repo").value = projectInfo.repo || ""
            document.getElementById("ai").value = projectInfo.ai || ""
        }

        // cancels the update
        function Cancel() {
            vscode.postMessage({command:"cancel"})
        }

        // listens for messages from the extentsion
        window.addEventListener("message", event => {
            const message = event.data

            switch (message.command) {
                case "project-info":
                    passProjectInfo(message.value)
            }
        })
    </script>
</body>
</html>`;
}
