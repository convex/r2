import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `@convex-dev/r2/browser` is for apps on other frameworks, so it must load
// without the frameworks of the other entries and without the server's SDK.
for (const name of [
  "react",
  "convex/react",
  "convex-svelte",
  "convex-vue",
  "@aws-sdk/client-s3",
]) {
  vi.doMock(name, () => {
    throw new Error(`the entry imported ${name}`);
  });
}

const { uploadWithProgress } = await import("./index.js");

/** Stands in for the browser's `XMLHttpRequest`, which this runtime lacks. */
class FakeRequest {
  static last: FakeRequest;
  method = "";
  url = "";
  headers: Record<string, string> = {};
  body: unknown;
  status = 0;
  statusText = "";
  upload: { onprogress?: (event: { loaded: number; total: number }) => void } =
    {};
  onload?: () => void;
  onerror?: () => void;
  constructor() {
    FakeRequest.last = this;
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send(body: unknown) {
    this.body = body;
  }
  respond(status: number, statusText = "") {
    this.status = status;
    this.statusText = statusText;
    this.onload?.();
  }
}

const url = "https://upload.example.com";
const file = new File(["content"], "test.txt", { type: "text/plain" });

describe("uploadWithProgress", () => {
  beforeEach(() => {
    vi.stubGlobal("XMLHttpRequest", FakeRequest);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("puts the file to the signed URL with its content type", async () => {
    const upload = uploadWithProgress(url, file);
    const request = FakeRequest.last;
    request.respond(200);
    await upload;

    expect(request.method).toBe("PUT");
    expect(request.url).toBe(url);
    expect(request.headers).toEqual({ "Content-Type": "text/plain" });
    expect(request.body).toBe(file);
  });

  it("reports progress in bytes", async () => {
    const onProgress = vi.fn();
    const upload = uploadWithProgress(url, file, onProgress);
    const request = FakeRequest.last;
    request.upload.onprogress?.({ loaded: 3, total: 7 });
    request.respond(200);
    await upload;

    expect(onProgress).toHaveBeenCalledWith({ loaded: 3, total: 7 });
  });

  it("rejects when the storage answers with an error status", async () => {
    const upload = uploadWithProgress(url, file);
    FakeRequest.last.respond(403, "Forbidden");

    await expect(upload).rejects.toThrow("Failed to upload file: Forbidden");
  });

  it("rejects when the request fails", async () => {
    const upload = uploadWithProgress(url, file);
    FakeRequest.last.onerror?.();

    await expect(upload).rejects.toThrow("Failed to upload file");
  });
});
