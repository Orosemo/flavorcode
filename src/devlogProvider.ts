import * as vscode from "vscode";
import { getProjectDevlogs } from "./apiCalls";
import { SrvRecord } from "dns";

interface DevlogRecord {
  id: number;
  body: string;
  created_at: string;
  updated_at: string;
  comments_count: number;
  likes_count: number;
  duration_seconds: number;
}

interface DevlogsResponse {
  devlogs: DevlogRecord[];
}

export class devlogProvider implements vscode.TreeDataProvider<devlog> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<
    devlog | undefined | null | void
  >();

  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  refresh(): void {
    this.onDidChangeTreeDataEmitter.fire();
  }

  getTreeItem(element: devlog): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: devlog): Promise<devlog[]> {
    if (element) {
      return [];
    }

    try {
      const response = (await getProjectDevlogs("")) as
        | DevlogsResponse
        | undefined;
      if (!response || !response.devlogs) {
        return [];
      }

      return response.devlogs.map((record) => this.toTreeItem(record));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to load devlogs: ${message}`);
      return [];
    }
  }

  private toTreeItem(record: DevlogRecord): devlog {
    const { headline, content } = this.splitHeadline(record.body);
    const devlogHeadline = this.trimHeadline(headline);
    const duration = this.formatDuration(record.duration_seconds);
    const description = `${duration}`;

    const item = new devlog(
      devlogHeadline || `Devlog ${record.id}`,
      description,
      vscode.TreeItemCollapsibleState.None,
      record,
    );

    item.command = {
      command: "flavorcode.openDevlog",
      title: "Open Devlog",
      arguments: [record],
    };

    return item;
  }

  private trimHeadline(headline: string): string {
    const normalized = headline.replace(/[#+]/g, "●");

    if (!normalized) {
      return "";
    }

    return normalized;
  }

  private trimBody(body: string, maxLength: number): string {
    const normalized = body.replace(/\s+/g, " ").trim();
    if (!normalized) {
      return "";
    }

    if (normalized.length <= maxLength) {
      return normalized;
    }

    return `${normalized.slice(0, maxLength - 3)}...`;
  }

  private formatDuration(value: number): string {
    const secondsIn = value;
    if (secondsIn < 3600) {
      let minutesOut = Math.floor(secondsIn / 60);
      let secondsOut = secondsIn % 60;
      return `${minutesOut} min; ${secondsOut} sec`;
    } else {
      let hoursOut = Math.floor(secondsIn / 3600);
      let secondsInMin = secondsIn % 3600;
      let minutesOut = Math.floor(secondsInMin / 60);
      let secondsOut = secondsInMin % 60;
      return `${hoursOut} h; ${minutesOut} min; ${secondsOut} sec`;
    }
  }

  private formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString();
  }

  private splitHeadline(body: string): { headline: string; content: string } {
    const lines = body.split(/\r?\n/).map((line) => line.trim());
    const nonEmpty = lines.filter((line) => line.length > 0);

    if (nonEmpty.length === 0) {
      return { headline: "", content: "" };
    }

    const [headline, ...rest] = nonEmpty;
    return { headline, content: rest.join(" ") };
  }
}

class devlog extends vscode.TreeItem {
  constructor(
    public readonly title: string,
    public description: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly data?: DevlogRecord,
  ) {
    super(title, collapsibleState);
    this.tooltip = this.title;
    this.description = this.description;
  }
}
