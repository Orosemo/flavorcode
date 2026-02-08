import * as vscode from "vscode";
import { getContext } from "./context";
import { promises } from "dns";

// gets api key from the vscode settings
function getApiKey() {
  const config = vscode.workspace.getConfiguration("flavorcode");
  const apiKey = config.get<string>("flavortownApiKey");

  if (!apiKey) {
    throw new Error(
      "Flavortown api key not set: please set it in the settings",
    );
  }
  return apiKey;
}

// USERS:
// get the user the api key belongs to
export async function getUserSelf(givenApiKey: string) {
  let apiKey = givenApiKey;
  if (getApiKey()) {
    apiKey = getApiKey();
  }

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
  let apiKey = givenApiKey;
  if (getApiKey()) {
    apiKey = getApiKey();
  }

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
  let apiKey = givenApiKey;
  if (getApiKey()) {
    apiKey = getApiKey();
  }

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
  let apiKey = givenApiKey;
  if (getApiKey()) {
    apiKey = getApiKey();
  }

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
  title: string,
  description: string,
  repoUrl: string,
  demo?: string,
  aiDeclaration?: string,
) {
  const config = vscode.workspace.getConfiguration("flavorcode");

  let apiKey = givenApiKey;
  if (getApiKey()) {
    apiKey = getApiKey();
  }

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
    repo_url: repoUrl,
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
  config.update("projectId", newProject.id);

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
  let apiKey = givenApiKey;
  if (getApiKey()) {
    apiKey = getApiKey();
  }

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
