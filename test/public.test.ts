import request from "supertest";
import { describe, expect, it } from "vitest";
import { loggedInAgent, projectInput, siteInput, useTestDb } from "./helpers";

useTestDb();

async function setup() {
  const { agent, app } = await loggedInAgent();
  const site = (await agent.post("/api/v1/admin/sites").send(siteInput("pub")).expect(201)).body.data;
  const base = `/api/v1/admin/sites/${site.id}`;
  await agent.put(`${base}/profile`).send({ fullName: "Jane", headline: "Engineer" }).expect(200);
  await agent.post(`${base}/projects`).send(projectInput("Visible")).expect(201);
  await agent.post(`${base}/projects`).send(projectInput("Hidden", { published: false })).expect(201);
  await agent
    .post(`${base}/education`)
    .send({ degree: "BSc", institution: "Uni", grade: "4/4", gradeLabel: "GPA", description: "d", accent: "#06b6d4" })
    .expect(201);
  return { agent, app, site, base };
}

describe("public site endpoint", () => {
  it("returns only published items, without admin fields, with cache headers", async () => {
    const { app } = await setup();
    const res = await request(app).get("/api/v1/public/sites/pub").expect(200);

    expect(res.headers["cache-control"]).toBe("public, max-age=60, stale-while-revalidate=300");
    expect(res.headers["access-control-allow-origin"]).toBe("*");

    const { data } = res.body;
    expect(data.site).toEqual({ name: "Site pub", slug: "pub", sections: { skills: true, experience: true, projects: true, education: true, publications: true } });
    expect(data.profile).toMatchObject({ fullName: "Jane", headline: "Engineer" });
    expect(data.projects.map((p: { title: string }) => p.title)).toEqual(["Visible"]);

    const project = data.projects[0];
    for (const field of ["siteId", "published", "order", "_id", "createdAt"]) expect(project).not.toHaveProperty(field);
    expect(JSON.stringify(data)).not.toMatch(/revalidateSecret|siteId/);
  });

  it("returns disabled sections as empty arrays", async () => {
    const { agent, app, base, site } = await setup();
    await agent
      .patch(base)
      .send({ sections: { ...site.sections, education: false } })
      .expect(200);

    const { body } = await request(app).get("/api/v1/public/sites/pub").expect(200);
    expect(body.data.education).toEqual([]);
    expect(body.data.site.sections.education).toBe(false);
  });

  it("404s for unknown and inactive sites", async () => {
    const { agent, app, base } = await setup();
    await request(app).get("/api/v1/public/sites/nope").expect(404);

    await agent.patch(base).send({ active: false }).expect(200);
    await request(app).get("/api/v1/public/sites/pub").expect(404);
  });
});
