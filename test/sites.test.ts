import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ownedFilePath } from "@/lib/storage";
import { MessageModel } from "@/modules/messages/message.model";
import { ProfileModel } from "@/modules/profile/profile.model";
import { ProjectModel } from "@/modules/projects/project.model";
import { SiteModel } from "@/modules/sites/site.model";
import { loggedInAgent, PNG_BYTES, projectInput, siteInput, useTestDb } from "./helpers";

useTestDb();

describe("sites", () => {
  it("returns the revalidate secret on create only, and creates an empty profile", async () => {
    const { agent } = await loggedInAgent();
    const created = await agent.post("/api/v1/admin/sites").send(siteInput("one")).expect(201);
    expect(created.body.data.revalidateSecret).toMatch(/^[a-f0-9]{64}$/);
    expect(created.body.data.sections).toEqual({ skills: true, experience: true, projects: true, education: true, publications: true });

    const id = created.body.data.id;
    const got = await agent.get(`/api/v1/admin/sites/${id}`).expect(200);
    expect(got.body.data.revalidateSecret).toBeUndefined();

    const profile = await agent.get(`/api/v1/admin/sites/${id}/profile`).expect(200);
    expect(profile.body.data).toMatchObject({ fullName: "", socials: [], contact: { email: "" } });

    const rotated = await agent.post(`/api/v1/admin/sites/${id}/rotate-secret`).expect(200);
    expect(rotated.body.data.revalidateSecret).not.toBe(created.body.data.revalidateSecret);
  });

  it("lists sites with counts and unread messages", async () => {
    const { agent } = await loggedInAgent();
    const site = (await agent.post("/api/v1/admin/sites").send(siteInput("two")).expect(201)).body.data;
    await agent.post(`/api/v1/admin/sites/${site.id}/projects`).send(projectInput("P")).expect(201);
    await MessageModel.create({ siteId: site.id, name: "a", email: "a@b.c", message: "m" });

    const list = await agent.get("/api/v1/admin/sites").expect(200);
    expect(list.body.data[0]).toMatchObject({
      slug: "two",
      unreadMessages: 1,
      counts: { "skill-categories": 0, experiences: 0, projects: 1, education: 0, publications: 0 },
    });
    expect(list.body.data[0].revalidateSecret).toBeUndefined();
  });

  it("PATCH only changes the fields it sends", async () => {
    const { agent } = await loggedInAgent();
    const site = (await agent.post("/api/v1/admin/sites").send(siteInput("three", { revalidateUrl: "https://three.example.com/api/revalidate" })).expect(201)).body.data;

    const updated = await agent.patch(`/api/v1/admin/sites/${site.id}`).send({ name: "Renamed" }).expect(200);
    expect(updated.body.data).toMatchObject({
      name: "Renamed",
      allowedOrigins: ["https://three.example.com"],
      revalidateUrl: "https://three.example.com/api/revalidate",
      active: true,
    });
  });

  it("reports a taken slug on the slug field", async () => {
    const { agent } = await loggedInAgent();
    await agent.post("/api/v1/admin/sites").send(siteInput("taken")).expect(201);
    const res = await agent.post("/api/v1/admin/sites").send(siteInput("taken")).expect(409);
    expect(res.body.error.details).toEqual([{ path: ["slug"], message: "This value is already in use" }]);

    const bad = await agent.post("/api/v1/admin/sites").send(siteInput("Bad Slug!")).expect(400);
    expect(bad.body.error.details[0].path).toEqual(["slug"]);
  });

  it("deletes a site with all its content, messages and files, but only with the right confirmation", async () => {
    const { agent } = await loggedInAgent();
    const keep = (await agent.post("/api/v1/admin/sites").send(siteInput("keep")).expect(201)).body.data;
    const doomed = (await agent.post("/api/v1/admin/sites").send(siteInput("doomed")).expect(201)).body.data;
    const base = `/api/v1/admin/sites/${doomed.id}`;

    const upload = await agent.post(`${base}/uploads`).attach("file", PNG_BYTES, { filename: "a.png", contentType: "image/png" }).expect(201);
    await agent.post(`${base}/projects`).send(projectInput("P", { image: upload.body.data.url })).expect(201);
    await agent.post(`/api/v1/admin/sites/${keep.id}/projects`).send(projectInput("Kept")).expect(201);
    await MessageModel.create({ siteId: doomed.id, name: "a", email: "a@b.c", message: "m" });
    const file = ownedFilePath(upload.body.data.url)!;
    expect(existsSync(file)).toBe(true);

    await agent.delete(`${base}?confirm=wrong`).expect(400);
    await agent.delete(`${base}?confirm=doomed`).expect(204);

    expect(await SiteModel.exists({ _id: doomed.id })).toBeNull();
    expect(await ProjectModel.countDocuments({ siteId: doomed.id })).toBe(0);
    expect(await ProfileModel.countDocuments({ siteId: doomed.id })).toBe(0);
    expect(await MessageModel.countDocuments({ siteId: doomed.id })).toBe(0);
    expect(existsSync(file)).toBe(false);
    expect(await ProjectModel.countDocuments({ siteId: keep.id })).toBe(1);
  });
});
