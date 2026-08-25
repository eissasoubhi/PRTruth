import { describe, expect, it, vi } from "vitest";
import { fetchExactHeadTextFile, inspectExactHeadPath } from "../src/exact-head-file.js";

const HEAD_SHA = "0123456789abcdef0123456789abcdef01234567";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("exact-head repository file state", () => {
  it("fetches and decodes a text file only at the exact full PR-head SHA", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      expect(String(url)).toContain(`/contents/.eslintrc.json?ref=${HEAD_SHA}`);
      return jsonResponse({
        type: "file",
        path: ".eslintrc.json",
        sha: "blob-sha",
        encoding: "base64",
        content: Buffer.from('{"extends":["next/core-web-vitals"]}\n').toString("base64"),
        html_url: "https://github.com/example/repo/blob/head/.eslintrc.json"
      });
    }) as typeof fetch;

    const file = await fetchExactHeadTextFile({
      repository: "example/repo",
      path: ".eslintrc.json",
      headSha: HEAD_SHA,
      fetchImpl
    });

    expect(file).toEqual({
      path: ".eslintrc.json",
      sha: "blob-sha",
      text: '{"extends":["next/core-web-vitals"]}\n',
      htmlUrl: "https://github.com/example/repo/blob/head/.eslintrc.json"
    });
  });

  it("distinguishes a true 404 absence from a present binary file", async () => {
    const absentFetch = vi.fn(async () => jsonResponse({ message: "Not Found" }, 404)) as typeof fetch;
    await expect(inspectExactHeadPath({
      repository: "example/repo",
      path: "model/checkpoint.zip",
      headSha: HEAD_SHA,
      fetchImpl: absentFetch
    })).resolves.toEqual({
      state: "absent",
      path: "model/checkpoint.zip"
    });

    const binaryFetch = vi.fn(async () => jsonResponse({
      type: "file",
      path: "model/checkpoint.zip",
      sha: "binary-blob-sha",
      encoding: "base64",
      content: Buffer.from([1, 0, 2]).toString("base64"),
      html_url: "https://github.com/example/repo/blob/head/model/checkpoint.zip"
    })) as typeof fetch;
    await expect(inspectExactHeadPath({
      repository: "example/repo",
      path: "model/checkpoint.zip",
      headSha: HEAD_SHA,
      fetchImpl: binaryFetch
    })).resolves.toEqual({
      state: "present",
      path: "model/checkpoint.zip",
      sha: "binary-blob-sha",
      kind: "file",
      htmlUrl: "https://github.com/example/repo/blob/head/model/checkpoint.zip"
    });

    await expect(fetchExactHeadTextFile({
      repository: "example/repo",
      path: "model/checkpoint.zip",
      headSha: HEAD_SHA,
      fetchImpl: binaryFetch
    })).resolves.toBeNull();
  });

  it("treats the GitHub directory-array response as present, never absent", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse([
      {
        type: "file",
        path: "config/example.json",
        sha: "child-blob-sha"
      }
    ])) as typeof fetch;

    await expect(inspectExactHeadPath({
      repository: "example/repo",
      path: "config",
      headSha: HEAD_SHA,
      fetchImpl
    })).resolves.toEqual({
      state: "present",
      path: "config",
      kind: "dir"
    });
  });

  it("returns null from the text reader when the file does not exist at the exact head", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ message: "Not Found" }, 404)) as typeof fetch;

    await expect(fetchExactHeadTextFile({
      repository: "example/repo",
      path: ".eslintrc.json",
      headSha: HEAD_SHA,
      fetchImpl
    })).resolves.toBeNull();
  });

  it("fails closed on directories, unsupported encodings, binary content, or invalid UTF-8", async () => {
    const directoryFetch = vi.fn(async () => jsonResponse({
      type: "dir",
      path: "config",
      sha: "tree-sha"
    })) as typeof fetch;
    await expect(fetchExactHeadTextFile({
      repository: "example/repo",
      path: "config",
      headSha: HEAD_SHA,
      fetchImpl: directoryFetch
    })).resolves.toBeNull();

    const encodingFetch = vi.fn(async () => jsonResponse({
      type: "file",
      path: "config.txt",
      sha: "blob-sha",
      encoding: "none",
      content: "plain"
    })) as typeof fetch;
    await expect(fetchExactHeadTextFile({
      repository: "example/repo",
      path: "config.txt",
      headSha: HEAD_SHA,
      fetchImpl: encodingFetch
    })).resolves.toBeNull();

    const binaryFetch = vi.fn(async () => jsonResponse({
      type: "file",
      path: "image.bin",
      sha: "blob-sha",
      encoding: "base64",
      content: Buffer.from([1, 0, 2]).toString("base64")
    })) as typeof fetch;
    await expect(fetchExactHeadTextFile({
      repository: "example/repo",
      path: "image.bin",
      headSha: HEAD_SHA,
      fetchImpl: binaryFetch
    })).resolves.toBeNull();

    const invalidUtf8Fetch = vi.fn(async () => jsonResponse({
      type: "file",
      path: "config.txt",
      sha: "blob-sha",
      encoding: "base64",
      content: Buffer.from([0xc3, 0x28]).toString("base64")
    })) as typeof fetch;
    await expect(fetchExactHeadTextFile({
      repository: "example/repo",
      path: "config.txt",
      headSha: HEAD_SHA,
      fetchImpl: invalidUtf8Fetch
    })).resolves.toBeNull();
  });

  it("does not reinterpret malformed GitHub payloads as path absence", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({
      type: "file",
      path: "other.txt",
      sha: "blob-sha",
      encoding: "base64",
      content: Buffer.from("hello").toString("base64")
    })) as typeof fetch;

    await expect(inspectExactHeadPath({
      repository: "example/repo",
      path: "expected.txt",
      headSha: HEAD_SHA,
      fetchImpl
    })).rejects.toThrow(/ambiguous exact-head path state/i);
  });

  it("rejects symbolic refs and path traversal instead of weakening exact-head binding", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;

    await expect(fetchExactHeadTextFile({
      repository: "example/repo",
      path: "config.txt",
      headSha: "main",
      fetchImpl
    })).rejects.toThrow(/full 40-character commit SHA/i);

    await expect(inspectExactHeadPath({
      repository: "example/repo",
      path: "../config.txt",
      headSha: HEAD_SHA,
      fetchImpl
    })).rejects.toThrow(/Invalid repository file path/);

    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
