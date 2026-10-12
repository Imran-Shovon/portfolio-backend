import { describe, expect, it } from "vitest";
import { loggedInAgent, projectInput, siteInput, useTestDb } from "./helpers";

useTestDb();

async function setup() {
  const { agent } = await loggedInAgent();
  const site = await agent.post("/api/v1/admin/sites").send(siteInput("alpha")).expect(201);
  const base = `/api/v1/admin/sites/${site.body.data.id}/projects`;
  return { agent, base };
}

describe("list resource CRUD (projects)", () => {
  it("creates items at the end of the list with a unique slug", async () => {
    const { agent, base } = await setup();

    const a = await agent.post(base).send(projectInput("e-KYC Portal")).expect(201);
    const b = await agent.post(base).send(projectInput("e-KYC Portal")).expect(201);

    expect(a.body.data).toMatchObject({ slug: "e-kyc-portal", order: 0, published: true });
    expect(b.body.data).toMatchObject({ slug: "e-kyc-portal-2", order: 1 });
    expect(a.body.data.id).toBeTypeOf("string");
    expect(a.body.data._id).toBeUndefined();
    expect(a.body.data.siteId).toBeUndefined();
  });

  it("lists in order, gets, updates and deletes", async () => {
    const { agent, base } = await setup();
    const { body: created } = await agent.post(base).send(projectInput("First")).expect(201);
    await agent.post(base).send(projectInput("Second")).expect(201);

    const list = await agent.get(base).expect(200);
    expect(list.body.data.map((p: { title: string }) => p.title)).toEqual(["First", "Second"]);

    await agent.get(`${base}/${created.data.id}`).expect(200);

    const updated = await agent.patch(`${base}/${created.data.id}`).send({ title: "Renamed", published: false }).expect(200);
    expect(updated.body.data).toMatchObject({ title: "Renamed", slug: "renamed", published: false, summary: "Summary" });

    await agent.delete(`${base}/${created.data.id}`).expect(204);
    await agent.get(`${base}/${created.data.id}`).expect(404);
  });

  it("reorders when every id is listed exactly once", async () => {
    const { agent, base } = await setup();
    const ids: string[] = [];
    for (const t of ["A", "B", "C"]) ids.push((await agent.post(base).send(projectInput(t))).body.data.id);

    await agent.patch(`${base}/reorder`).send({ ids: [ids[2], ids[0], ids[1]] }).expect(204);
    const list = await agent.get(base).expect(200);
    expect(list.body.data.map((p: { title: string }) => p.title)).toEqual(["C", "A", "B"]);

    await agent.patch(`${base}/reorder`).send({ ids: [ids[0], ids[1]] }).expect(400);
    await agent.patch(`${base}/reorder`).send({ ids: [ids[0], ids[0], ids[1]] }).expect(400);
  });

  it("validates input and reports the failing field", async () => {
    const { agent, base } = await setup();

    const badAccent = await agent.post(base).send(projectInput("X", { accent: "var(--color-accent-blue)" })).expect(400);
    expect(badAccent.body.error).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(badAccent.body.error.details.map((d: { path: string[] }) => d.path)).toContainEqual(["accent"]);

    const hashUrl = await agent.post(base).send(projectInput("X", { liveUrl: "#" })).expect(400);
    expect(hashUrl.body.error.details[0].path).toEqual(["liveUrl"]);

    await agent.post(base).send(projectInput("X", { liveUrl: "/relative/path", githubUrl: "https://github.com/x" })).expect(201);
  });

  it("rejects unknown fields, including an attempt to set siteId or slug", async () => {
    const { agent, base } = await setup();
    await agent.post(base).send(projectInput("X", { siteId: "64b000000000000000000000" })).expect(400);
    await agent.post(base).send(projectInput("X", { slug: "custom" })).expect(400);
  });

  it("returns 400 (not 500) for a malformed id", async () => {
    const { agent, base } = await setup();
    await agent.get(`${base}/not-an-id`).expect(400);
  });
});
