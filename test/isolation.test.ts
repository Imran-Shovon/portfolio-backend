import request from "supertest";
import { describe, expect, it } from "vitest";
import { ProjectModel } from "@/modules/projects/project.model";
import { loggedInAgent, projectInput, siteInput, useTestDb } from "./helpers";

useTestDb();

async function twoSites() {
  const { agent, app } = await loggedInAgent();
  const a = (await agent.post("/api/v1/admin/sites").send(siteInput("site-a")).expect(201)).body.data;
  const b = (await agent.post("/api/v1/admin/sites").send(siteInput("site-b")).expect(201)).body.data;
  const aProject = (await agent.post(`/api/v1/admin/sites/${a.id}/projects`).send(projectInput("A project")).expect(201)).body.data;
  const bProject = (await agent.post(`/api/v1/admin/sites/${b.id}/projects`).send(projectInput("B project")).expect(201)).body.data;
  return { agent, app, a, b, aProject, bProject };
}

describe("site isolation", () => {
  it("can't read, update or delete another site's item through this site's routes", async () => {
    const { agent, a, bProject } = await twoSites();
    const viaA = `/api/v1/admin/sites/${a.id}/projects/${bProject.id}`;

    await agent.get(viaA).expect(404);
    await agent.patch(viaA).send({ title: "Hijacked" }).expect(404);
    await agent.delete(viaA).expect(404);

    const still = await ProjectModel.findOne({ _id: bProject.id, siteId: { $exists: true } });
    expect(still?.title).toBe("B project");
  });

  it("can't reorder using another site's ids", async () => {
    const { agent, a, aProject, bProject } = await twoSites();
    await agent.patch(`/api/v1/admin/sites/${a.id}/projects/reorder`).send({ ids: [bProject.id] }).expect(400);
    await agent.patch(`/api/v1/admin/sites/${a.id}/projects/reorder`).send({ ids: [aProject.id, bProject.id] }).expect(400);
  });

  it("lists, counts and publishes only this site's content", async () => {
    const { agent, app, a, b } = await twoSites();

    const list = await agent.get(`/api/v1/admin/sites/${a.id}/projects`).expect(200);
    expect(list.body.data.map((p: { title: string }) => p.title)).toEqual(["A project"]);

    const stats = await agent.get(`/api/v1/admin/sites/${b.id}/stats`).expect(200);
    expect(stats.body.data.counts.projects).toBe(1);

    const pub = await request(app).get("/api/v1/public/sites/site-a").expect(200);
    expect(pub.body.data.projects.map((p: { title: string }) => p.title)).toEqual(["A project"]);
  });

  it("guards queries that forget the siteId filter", async () => {
    await expect(ProjectModel.find({ title: "anything" })).rejects.toThrow(/without a siteId filter/);
    await expect(ProjectModel.aggregate([{ $match: {} }])).rejects.toThrow(/siteId/);
  });
});
