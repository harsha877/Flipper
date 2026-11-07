import { parsePageTxt, RetundaPage } from './flatFileEngine';

export interface GitHubRepoConfig {
  owner: string;
  repo: string;
  branch: string;
  baseFolder: string;
  token?: string;
}

export interface GitHubFileEntry {
  name: string;
  path: string;
  sha: string;
  type: 'file' | 'dir';
  slugPath: string;
}

function encodeUtf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function decodeBase64ToUtf8(base64: string): string {
  const cleaned = base64.replace(/\s+/g, '');
  const binary = window.atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function normalizeRepoPath(folder: string, fileOrSubpath?: string): string {
  const cleanFolder = folder.trim().replace(/^\/+|\/+$/g, '');
  if (!fileOrSubpath) return cleanFolder;
  const cleanSub = fileOrSubpath.trim().replace(/^\/+|\/+$/g, '');
  return cleanFolder ? `${cleanFolder}/${cleanSub}` : cleanSub;
}

function buildHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token && token.trim()) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }
  return headers;
}

/**
 * Fetches a single .txt page from GitHub on demand when a visitor opens /?page=<slug>
 * Supports both top-level slugs (?page=cozy-linen-living-room) and subfolder slugs (?page=living-room/cozy-linen).
 */
export async function fetchPageFromGitHub(
  config: GitHubRepoConfig,
  pageSlugPath: string
): Promise<RetundaPage | null> {
  if (!config.owner || !config.repo) return null;

  const cleanSlug = pageSlugPath.trim().replace(/^\/+|\/+$/g, '').replace(/\.txt$/i, '');
  if (!cleanSlug) return null;

  const fullFilePath = normalizeRepoPath(config.baseFolder, `${cleanSlug}.txt`);
  const encodedPath = fullFilePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(
    config.owner
  )}/${encodeURIComponent(config.repo)}/contents/${encodedPath}?ref=${encodeURIComponent(
    config.branch || 'main'
  )}`;

  try {
    const res = await fetch(apiUrl, {
      headers: buildHeaders(config.token),
      cache: 'no-store',
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as {
      content?: string;
      encoding?: string;
      path?: string;
    };

    if (!data.content) return null;

    const rawTxt = decodeBase64ToUtf8(data.content);
    const parsed = parsePageTxt(rawTxt, data.path || fullFilePath);
    // Preserve subfolder slug path if nested
    parsed.slug = cleanSlug;
    parsed.fileName = `${cleanSlug}.txt`;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Lists all .txt page files and directories inside the configured GitHub folder
 */
export async function listGitHubDirectory(
  config: GitHubRepoConfig,
  subFolder = ''
): Promise<{
  ok: boolean;
  files: GitHubFileEntry[];
  directories: string[];
  error?: string;
}> {
  if (!config.owner || !config.repo) {
    return {
      ok: false,
      files: [],
      directories: [],
      error: 'GitHub Owner and Repository are not configured yet.',
    };
  }

  const targetDir = normalizeRepoPath(config.baseFolder, subFolder);
  const encodedPath = targetDir
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(
    config.owner
  )}/${encodeURIComponent(config.repo)}/contents/${encodedPath}?ref=${encodeURIComponent(
    config.branch || 'main'
  )}`;

  try {
    const res = await fetch(apiUrl, {
      headers: buildHeaders(config.token),
      cache: 'no-store',
    });

    if (!res.ok) {
      return {
        ok: false,
        files: [],
        directories: [],
        error: `GitHub API returned ${res.status} (${res.statusText}) for ${targetDir}`,
      };
    }

    const items = (await res.json()) as Array<{
      name: string;
      path: string;
      sha: string;
      type: 'file' | 'dir';
    }>;

    if (!Array.isArray(items)) {
      return { ok: true, files: [], directories: [] };
    }

    const basePrefix = config.baseFolder.trim().replace(/^\/+|\/+$/g, '');
    const files: GitHubFileEntry[] = [];
    const directories: string[] = [];

    for (const item of items) {
      if (item.type === 'dir') {
        directories.push(item.path);
      } else if (item.type === 'file' && item.name.toLowerCase().endsWith('.txt')) {
        const relativePath = basePrefix && item.path.startsWith(basePrefix + '/')
          ? item.path.slice(basePrefix.length + 1)
          : item.name;
        const slugPath = relativePath.replace(/\.txt$/i, '');
        files.push({
          name: item.name,
          path: item.path,
          sha: item.sha,
          type: 'file',
          slugPath,
        });
      }
    }

    return { ok: true, files, directories };
  } catch (err) {
    return {
      ok: false,
      files: [],
      directories: [],
      error: err instanceof Error ? err.message : 'Failed to connect to GitHub API',
    };
  }
}

/**
 * Commits (creates or updates) a .txt page file directly to the chosen directory in GitHub
 */
export async function savePageToGitHub(
  config: GitHubRepoConfig,
  targetDirectory: string,
  fileName: string,
  rawTxtContent: string
): Promise<{
  ok: boolean;
  path?: string;
  pageQuerySlug?: string;
  commitUrl?: string;
  error?: string;
}> {
  if (!config.owner || !config.repo) {
    return {
      ok: false,
      error: 'Please configure your GitHub Owner and Repository Name first.',
    };
  }
  if (!config.token || !config.token.trim()) {
    return {
      ok: false,
      error:
        'A GitHub Personal Access Token (with repo Contents write permission) is required to commit files to GitHub.',
    };
  }

  const cleanFileName = fileName.trim().endsWith('.txt')
    ? fileName.trim()
    : `${fileName.trim()}.txt`;

  const fullPath = normalizeRepoPath(targetDirectory, cleanFileName);
  const encodedPath = fullPath
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(
    config.owner
  )}/${encodeURIComponent(config.repo)}/contents/${encodedPath}`;

  try {
    // 1. Check if file already exists so we can pass its SHA to update it
    let existingSha: string | undefined;
    const checkRes = await fetch(
      `${apiUrl}?ref=${encodeURIComponent(config.branch || 'main')}`,
      {
        headers: buildHeaders(config.token),
        cache: 'no-store',
      }
    );
    if (checkRes.ok) {
      const existingData = (await checkRes.json()) as { sha?: string };
      existingSha = existingData.sha;
    }

    // 2. PUT file contents to GitHub
    const bodyPayload: Record<string, string> = {
      message: `${existingSha ? 'Update' : 'Add'} Retunda page: ${fullPath}`,
      content: encodeUtf8ToBase64(rawTxtContent),
      branch: config.branch || 'main',
    };
    if (existingSha) {
      bodyPayload.sha = existingSha;
    }

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        ...buildHeaders(config.token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!putRes.ok) {
      const errBody = (await putRes.json().catch(() => ({}))) as {
        message?: string;
      };
      return {
        ok: false,
        error:
          errBody.message ||
          `GitHub API error (${putRes.status}): Could not save ${fullPath}`,
      };
    }

    const putData = (await putRes.json()) as {
      commit?: { html_url?: string };
    };

    // Compute the ?page=<slug> parameter relative to config.baseFolder
    const cleanBase = config.baseFolder.trim().replace(/^\/+|\/+$/g, '');
    const relativeFromBase =
      cleanBase && fullPath.startsWith(cleanBase + '/')
        ? fullPath.slice(cleanBase.length + 1)
        : cleanFileName;
    const pageQuerySlug = relativeFromBase.replace(/\.txt$/i, '');

    return {
      ok: true,
      path: fullPath,
      pageQuerySlug,
      commitUrl: putData.commit?.html_url,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error committing to GitHub',
    };
  }
}
