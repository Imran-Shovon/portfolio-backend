import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ownedFilePath } from "@/lib/storage";
import { loggedInAgent, PNG_BYTES, projectInput, siteInput, useTestDb } from "./helpers";

useTestDb();

async function setup() {
  const { agent, app } = await loggedInAgent();
  const site = (await agent.post("/api/v1/admin/sites").send(siteInput("files")).expect(201)).body.data;
  return { agent, app, base: `/api/v1/admin/sites/${site.id}`, siteId: site.id as string };
}

const png = (name = "a.png") => ({ filename: name, contentType: "image/png" });

describe("uploads", () => {
  it("stores a file under the site's folder and serves it cross-origin", async () => {
    const { agent, base, siteId } = await setup();
    const res = await agent.post(`${base}/uploads`).attach("file", PNG_BYTES, png("../../evil name.png")).expect(201);

    const url: string = res.body.data.url;
    expect(url).toMatch(new RegExp(`^http://api\\.test/uploads/${siteId}/[\\w-]{16}\\.png$`));

    const served = await agent.get(new URL(url).pathname).expect(200);
    expect(served.headers["content-type"]).toBe("image/png");
    expect(served.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    expect(served.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("rejects unsupported types, mismatched contents and oversized files", async () => {
    const { agent, base } = await setup();
    await agent.post(`${base}/uploads`).attach("file", Buffer.from("<html>"), { filename: "x.html", contentType: "text/html" }).expect(415);
    await agent.post(`${base}/uploads`).attach("file", Buffer.from("<svg onload=alert(1)>"), png("fake.png")).expect(415);

    const big = Buffer.concat([PNG_BYTES, Buffer.alloc(5 * 1024 * 1024)]);
    await agent.post(`${base}/uploads`).attach("file", big, png("big.png")).expect(413);

    await agent.post(`${base}/uploads`).expect(400);
  });

  it("deletes the old file when an item's image is replaced or the item is deleted", async () => {
    const { agent, base } = await setup();
    const upload = async () => (await agent.post(`${base}/uploads`).attach("file", PNG_BYTES, png()).expect(201)).body.data.url as string;

    const first = await upload();
    const project = (await agent.post(`${base}/projects`).send(projectInput("P", { image: first })).expect(201)).body.data;

    const second = await upload();
    await agent.patch(`${base}/projects/${project.id}`).send({ image: second }).expect(200);
    expect(existsSync(ownedFilePath(first)!)).toBe(false);
    expect(existsSync(ownedFilePath(second)!)).toBe(true);

    await agent.delete(`${base}/projects/${project.id}`).expect(204);
    expect(existsSync(ownedFilePath(second)!)).toBe(false);
  });

  it("never deletes files it doesn't own", async () => {
    expect(ownedFilePath("/image/project/ekyc.png")).toBeNull();
    expect(ownedFilePath("https://elsewhere.example/uploads/x.png")).toBeNull();
    expect(ownedFilePath("/uploads/../../etc/passwd")).toBeNull();
  });

  it("removes a replaced profile photo", async () => {
    const { agent, base } = await setup();
    const url = (await agent.post(`${base}/uploads`).attach("file", PNG_BYTES, png()).expect(201)).body.data.url as string;
    await agent.put(`${base}/profile`).send({ photo: url }).expect(200);
    await agent.put(`${base}/profile`).send({ photo: "/image/shovon.jpeg" }).expect(200);
    expect(existsSync(ownedFilePath(url)!)).toBe(false);
  });
});
