import * as vscode from "vscode";
import RPC from "discord-rpc";

// Discord Rich Prensence

let rpc: RPC.Client | null = null;
let rpcReady = false;
let lastActivity: { title: string; projectId: string, devlogs: number } | null = null;

async function updateActivity() {
  if (!rpc || !rpcReady || !lastActivity) {
    return;
  }
  const { title, projectId, devlogs } = lastActivity;

  console.log("updated activity")

  const payload = {
    details: `Working on: ${title}`,
    state: `Devlogs so far: ${devlogs}`,
    largeImageKey: "flavortown",
    largeImageText: "Flavortown",
    buttons: [
      {
        label: "To the Project".slice(0, 32),
        url: `https://flavortown.hackclub.com/projects/${projectId}`.slice(0, 512),
      },
    ],
  }
  console.log(payload)
  await rpc?.setActivity(payload as any);
}

export async function connectDiscordGateway(title: string, projectId: string, devlogs: number) {
  const clientId = "1469410921704194090";

  RPC.register(clientId);
  lastActivity = {title, projectId, devlogs}

  if (!rpc) {

    rpc = new RPC.Client({ transport: "ipc" });

    rpc.on("ready", async () => {
      rpcReady = true;
      console.log("dc ready");
      await updateActivity();
    });

    const maxEntries = 5;

    const attemptLogin = (retry: number) => {
      rpc?.login({ clientId }).catch((err) => {
        const message = err instanceof Error ? err.message : String(err);

        if (message.includes("RPC_CONNECTION_TIMEOUT") && retry < maxEntries) {
          const delayMs = Math.min(1000 * Math.pow(2, retry), 10000);
          setTimeout(() => attemptLogin(retry + 1), delayMs);
          return;
        }
        vscode.window.showErrorMessage(
          `Flavortown discord richpresence: ${message}`,
        );
      });
    };

    attemptLogin(0);
    return;
  }

  await updateActivity();
}

export async function disconnectDiscordGateway() {
  if (!rpc) {
    return;
  }

  try {
    rpc.clearActivity?.();
    rpc.destroy?.();
  } finally {
    rpc = null;
    rpcReady = false;
    lastActivity = null;
  }
}

// gets api key from the vscode settings
function getApiKeyFromSettings(): string {
  const config = vscode.workspace.getConfiguration("flavorcode");
  const apiKey = config.get<string>("flavortownApiKey");

  if (!apiKey) {
    throw new Error(
      "Flavortown api key not set: please set it in the settings",
    );
  }
  return apiKey;
}

// resolves api key: uses given key first, then tries settings
function resolveApiKey(givenApiKey: string): string {
  if (givenApiKey && givenApiKey.trim()) {
    return givenApiKey;
  }
  return getApiKeyFromSettings();
}

// USERS:
// get the user the api key belongs to
export async function getUserSelf(givenApiKey: string) {
  const apiKey = resolveApiKey(givenApiKey);

  interface UserResponse {
    id: number;
    slack_id: string;
    display_name: string;
    avatar: string;
    project_ids: [number];
    cookies: number | null;
  }

  const res = await fetch(`https://flavortown.hackclub.com/api/v1/users/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      [`X-Flavortown-Ext-${11154}`]: "true",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to get Users: ${res.status} ${await res.text()}`);
  }

  return (await res.json()) as UserResponse;
}

// get a list of all users
export async function getAllUsers(givenApiKey: string) {
  const apiKey = resolveApiKey(givenApiKey);

  interface UserResponse {
    users: User[];
    pagination: Pagination;
  }

  interface User {
    id: number;
    slack_id: string;
    display_name: string;
    avatar: string;
    project_ids: [number];
    cookies: number | null;
  }

  interface Pagination {
    current_page: number;
    total_pages: number;
    total_count: number;
    next_page: number | null;
  }

  const res = await fetch(`https://flavortown.hackclub.com/api/v1/users`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      [`X-Flavortown-Ext-${11154}`]: "true",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to get Users: ${res.status} ${await res.text()}`);
  }

  return (await res.json()) as UserResponse;
}

// PROJECTS:
// get project by id
export async function getProject(givenApiKey: string, id: number) {
  const apiKey = resolveApiKey(givenApiKey);

  interface getProjectResponse {
    id: number;
    title: string;
    description: string;
    repo_url: string;
    demo_url: string;
    readme_url: string;
    ai_declaration: string;
    ship_status: string;
    devlog_ids: [number];
    created_at: string;
    updated_at: string;
  }

  const res = await fetch(
    `https://flavortown.hackclub.com/api/v1/projects/${id}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to get Project: ${res.status} ${await res.text()}`);
  }

  return (await res.json()) as getProjectResponse;
}

// get a list of all Projects
export async function getAllProjects(givenApiKey: string) {
  const apiKey = resolveApiKey(givenApiKey);

  interface ProjectsResponse {
    projects: Project[];
    pagination: Pagination;
  }

  interface Project {
    id: number;
    title: string;
    description: string;
    repo_url: string;
    demo_url: string;
    readme_url: string;
    ai_declaration: string;
    ship_status: string;
    devlog_ids: number[];
    created_at: string; // ISO date string
    updated_at: string; // ISO date string
  }

  interface Pagination {
    current_page: number;
    total_pages: number;
    total_count: number;
    next_page: number | null;
  }

  const res = await fetch(`https://flavortown.hackclub.com/api/v1/projects`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      [`X-Flavortown-Ext-${11154}`]: "true",
    },
  });

  if (!res.ok) {
    throw new Error(
      `Failed to get Projects: ${res.status} ${await res.text()}`,
    );
  }

  return (await res.json()) as ProjectsResponse;
}

// create new project with passed data
export async function createProject(
  givenApiKey: string,
  setAsCurrent: boolean,
  title: string,
  description: string,
  repoUrl: string,
  demo?: string,
  aiDeclaration?: string,
) {
  const config = vscode.workspace.getConfiguration("flavorcode");
  const apiKey = resolveApiKey(givenApiKey);

  interface createProjectResponse {
    id: number;
    title: string;
    description: string;
    repo_url?: string;
    demo_url?: string;
    readme_url?: string;
    ai_declaration?: string;
    ship_status: string;
    devlog_ids: [number];
    created_at: string;
    updated_at: string;
  }

  const body = new URLSearchParams({
    title: title,
    description: description,
  });

  if (demo) {
    body.set("demo_url", demo);
  }

  if (aiDeclaration) {
    body.set("ai_declaration", aiDeclaration);
  }

  if (repoUrl) {
    body.set("repo_url", repoUrl);
  }

  const res = await fetch("https://flavortown.hackclub.com/api/v1/projects", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      [`X-Flavortown-Ext-${11154}`]: "true",
    },
    body,
  });

  if (!res.ok) {
    vscode.window.showErrorMessage(
      `Failed to create Project: ${res.status} ${await res.text()}`,
    );
    throw new Error(
      `Failed to create Project: ${res.status} ${await res.text()}`,
    );
  }

  const newProject = (await res.json()) as createProjectResponse;

  // set project id in the config
  if (setAsCurrent) {
    config.update("projectId", newProject.id);
  }

  return newProject;
}

// update an existing project with passed data
export async function updateProject(
  givenApiKey: string,
  id: number,
  title: string,
  description: string,
  repoUrl?: string,
  demo?: string,
  aiDeclaration?: string,
) {
  const apiKey = resolveApiKey(givenApiKey);

  interface updateProjectResponse {
    id: number;
    title: string;
    description: string;
    repo_url?: string;
    demo_url?: string;
    readme_url?: string;
    ai_declaration?: string;
    ship_status: string;
    devlog_ids: [number];
    created_at: string;
    updated_at: string;
  }

  const body = new URLSearchParams({
    title: title,
    description: description,
  });

  if (repoUrl) {
    body.set("repo_url", repoUrl);
  }

  if (demo) {
    body.set("demo_url", demo);
  }

  if (aiDeclaration) {
    body.set("ai_declaration", aiDeclaration);
  }

  const res = await fetch(
    `https://flavortown.hackclub.com/api/v1/projects/${id}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        [`X-Flavortown-Ext-${11154}`]: "true",
      },
      body,
    },
  );

  if (!res.ok) {
    throw new Error(
      `Failed to update Project: ${res.status} ${await res.text()}`,
    );
  }

  return (await res.json()) as updateProjectResponse;
}

// DEVLOGS:

// create a new devlog of the current project with the passed data
export async function createDevlog() {}

// get all devlogs assouciated with one project
export async function getProjectDevlogs(givenApiKey: string) {
  // get api key
  const apiKey = resolveApiKey(givenApiKey);

  // get project id
  const config = vscode.workspace.getConfiguration("flavorcode");
  const projectId = config.get<Number>("projectId");

  if (!projectId || projectId === 0) {
    vscode.window.showErrorMessage(
      "No project set: please use the setup command to initialise the exentsion.",
    );
    return;
  }

  // reply interface
  interface DevlogsResponse {
    devlogs: Devlog[];
    pagination: Pagination;
  }

  interface Devlog {
    id: number;
    body: string;
    comments_count: number;
    duration_seconds: number;
    likes_count: number;
    scrapbook_url: string;
    created_at: string;
    updated_at: string;
    media: DevlogMedia[];
    comments: DevlogComment[];
  }

  interface DevlogMedia {
    url: string;
    content_type: string;
  }

  interface DevlogComment {
    id: number;
    author: CommentAuthor;
    body: string;
    created_at: string;
    updated_at: string;
  }

  interface CommentAuthor {
    id: number;
    display_name: string;
    avatar: string;
  }

  interface Pagination {
    current_page: number;
    total_pages: number;
    total_count: number;
    next_page: number | null;
  }

  const res = await fetch(
    `https://flavortown.hackclub.com/api/v1/projects/${projectId}/devlogs`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        [`X-Flavortown-Ext-${11154}`]: "true",
      },
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to get devlogs: ${res.status} ${await res.text()}`);
  }

  return (await res.json()) as DevlogsResponse;
}

export async function getDevlog(givenApiKey: string, id: number) {
  // get api key
  const apiKey = resolveApiKey(givenApiKey);

  // get project id
  const config = vscode.workspace.getConfiguration("flavorcode");
  const projectId = config.get<Number>("projectId");

  if (!projectId || projectId === 0) {
    vscode.window.showErrorMessage(
      "No project set: please use the setup command to initialise the exentsion.",
    );
    return;
  }

  interface DevlogsResponse {
    id: number;
    body: string;
    comments_count: number;
    duration_seconds: number;
    likes_count: number;
    scrapbook_url: string;
    created_at: string;
    updated_at: string;
    comments: DevlogComment[];
  }

  interface DevlogComment {
    id: number;
    author: CommentAuthor;
    body: string;
    created_at: string;
    updated_at: string;
  }

  interface CommentAuthor {
    id: number;
    dispaly_name: string;
    avatar: string;
  }

  const res = await fetch(
    `https://flavortown.hackclub.com/api/v1/devlogs/${id}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        [`X-Flavortown-Ext-${11154}`]: "true",
      },
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to get devlogs: ${res.status} ${await res.text()}`);
  }

  return (await res.json()) as DevlogsResponse;
}
