import * as vscode from "vscode";
import { getContext } from "./context";
import { promises } from "dns";
import { setconfig } from "./utils/settings";

// get project by id
export async function getProject(
  id: number,
) {
  // get api key from the vscode settings
  const config = vscode.workspace.getConfiguration("flavorcode");
  const apiKey = config.get<string>("flavortownApiKey");

  if (!apiKey) {
    throw new Error(
      "Flavortown api key not set: please set it in the settings",
    );
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
    `https://flavortown.hackclub.com//api/v1/projects/:${id}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      }
    },
  );

  if (!res.ok) {
    throw new Error(
      `Failed to update Project: ${res.status} ${await res.text()}`,
    );
  }

  return (await res.json()) as getProjectResponse;
}

// create new project with passed data
export async function createProject(
  title: string,
  description: string,
  repoUrl: string,
  demo: string,
  aiDeclaration: string,
) {
  // get api key from the vscode settings
  const config = vscode.workspace.getConfiguration("flavorcode");
  const apiKey = config.get<string>("flavortownApiKey");

  if (!apiKey) {
    throw new Error(
      "Flavortown api key not set: please set it in the settings",
    );
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
    demo_url: demo,
    ai_declaration: aiDeclaration,
  });

  const res = await fetch("https://flavortown.hackclub.com/api/v1/projects", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    throw new Error(
      `Failed to create Project: ${res.status} ${await res.text()}`,
    );
  }

  const newProject = await res.json() as createProjectResponse;

  // set project id in the config
  setconfig("flavortownProject", String(newProject.id));

  return newProject;
}

// update existing project with passed data
export async function updateProject(
  id: number,
  title: string,
  description: string,
  repoUrl: string,
  demo: string,
  aiDeclaration: string,
) {
  // get api key from the vscode settings
  const config = vscode.workspace.getConfiguration("flavorcode");
  const apiKey = config.get<string>("flavortownApiKey");

  if (!apiKey) {
    throw new Error(
      "Flavortown api key not set: please set it in the settings",
    );
  }

  interface updateProjectResponse {
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

  const body = new URLSearchParams({
    title: title,
    description: description,
    repo_url: repoUrl,
    demo_url: demo,
    ai_declaration: aiDeclaration,
  });

  const res = await fetch(
    `https://flavortown.hackclub.com/api/v1/projects/:${id}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
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


