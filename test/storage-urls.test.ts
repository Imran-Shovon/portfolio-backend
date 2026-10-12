import { describe, expect, it } from "vitest";
import { parseCloudinaryUrl } from "@/lib/storage/cloudinary";

const CLOUD = "demo-cloud";
const FOLDER = "portfolio";
const base = `https://res.cloudinary.com/${CLOUD}`;

describe("parseCloudinaryUrl (decides which files may be deleted)", () => {
  it("parses image URLs without the extension in the public id", () => {
    expect(parseCloudinaryUrl(`${base}/image/upload/v1712345678/portfolio/64b0/abc123.png`, CLOUD, FOLDER)).toEqual({
      publicId: "portfolio/64b0/abc123",
      resourceType: "image",
    });
  });

  it("keeps the extension for raw (PDF) files", () => {
    expect(parseCloudinaryUrl(`${base}/raw/upload/v1/portfolio/64b0/cv.pdf`, CLOUD, FOLDER)).toEqual({
      publicId: "portfolio/64b0/cv.pdf",
      resourceType: "raw",
    });
  });

  it("ignores other clouds, other folders, traversal and non-Cloudinary URLs", () => {
    expect(parseCloudinaryUrl("https://res.cloudinary.com/other/image/upload/v1/portfolio/x/y.png", CLOUD, FOLDER)).toBeNull();
    expect(parseCloudinaryUrl(`${base}/image/upload/v1/someone-else/x/y.png`, CLOUD, FOLDER)).toBeNull();
    expect(parseCloudinaryUrl(`${base}/image/upload/v1/portfolio/../secret/y.png`, CLOUD, FOLDER)).toBeNull();
    expect(parseCloudinaryUrl("/image/project/ekyc.png", CLOUD, FOLDER)).toBeNull();
    expect(parseCloudinaryUrl("http://localhost:4000/uploads/x/y.png", CLOUD, FOLDER)).toBeNull();
  });
});

describe("isOwnedBlobUrl (decides which Vercel Blob files may be deleted)", () => {
  it("accepts this folder on Vercel Blob and nothing else", async () => {
    const { isOwnedBlobUrl } = await import("@/lib/storage/vercelBlob");
    const host = "https://abc123.public.blob.vercel-storage.com";
    expect(isOwnedBlobUrl(`${host}/portfolio/64b0/x.png`, "portfolio")).toBe(true);
    expect(isOwnedBlobUrl(`${host}/other/64b0/x.png`, "portfolio")).toBe(false);
    expect(isOwnedBlobUrl(`${host}/portfolio/../x.png`, "portfolio")).toBe(false);
    expect(isOwnedBlobUrl("https://evil.example/portfolio/x.png", "portfolio")).toBe(false);
    expect(isOwnedBlobUrl("/image/project/ekyc.png", "portfolio")).toBe(false);
  });
});
