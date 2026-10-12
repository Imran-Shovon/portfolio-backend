import request from "supertest";
import { describe, expect, it } from "vitest";
import { MessageModel } from "@/modules/messages/message.model";
import { loggedInAgent, siteInput, useTestDb } from "./helpers";

useTestDb();

const ORIGIN = "https://contact.example.com";
const URL = "/api/v1/public/sites/contact/messages";
const message = { name: "Visitor", email: "visitor@example.com", subject: "Hi", message: "Hello there" };

async function setup() {
  const { agent, app } = await loggedInAgent();
  const site = (await agent.post("/api/v1/admin/sites").send(siteInput("contact")).expect(201)).body.data;
  return { agent, app, site };
}

describe("contact form endpoint", () => {
  it("stores a valid message from an allowed origin and answers CORS for it", async () => {
    const { agent, app, site } = await setup();
    const res = await request(app).post(URL).set("Origin", ORIGIN).send(message).expect(201);
    expect(res.headers["access-control-allow-origin"]).toBe(ORIGIN);

    const list = await agent.get(`/api/v1/admin/sites/${site.id}/messages?status=unread`).expect(200);
    expect(list.body.meta.total).toBe(1);
    expect(list.body.data[0]).toMatchObject({ ...message, read: false });
    expect(list.body.data[0].ip).toBeUndefined();

    const id = list.body.data[0].id;
    await agent.patch(`/api/v1/admin/sites/${site.id}/messages/${id}`).send({ read: true }).expect(200);
    const unread = await agent.get(`/api/v1/admin/sites/${site.id}/messages?status=unread`).expect(200);
    expect(unread.body.meta.total).toBe(0);
  });

  it("answers the CORS preflight only for allowed origins", async () => {
    const { app } = await setup();
    const ok = await request(app).options(URL).set("Origin", ORIGIN).set("Access-Control-Request-Method", "POST");
    expect(ok.headers["access-control-allow-origin"]).toBe(ORIGIN);

    const evil = await request(app).options(URL).set("Origin", "https://evil.example").set("Access-Control-Request-Method", "POST");
    expect(evil.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("rejects missing and foreign origins", async () => {
    const { app } = await setup();
    await request(app).post(URL).send(message).expect(403);
    await request(app).post(URL).set("Origin", "https://evil.example").send(message).expect(403);
    expect(await MessageModel.countDocuments({ siteId: { $exists: true } })).toBe(0);
  });

  it("validates fields", async () => {
    const { app } = await setup();
    const res = await request(app).post(URL).set("Origin", ORIGIN).send({ ...message, email: "not-an-email", message: "" }).expect(400);
    const paths = res.body.error.details.map((d: { path: string[] }) => d.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["email", "message"]));
  });

  it("silently drops honeypot submissions", async () => {
    const { app } = await setup();
    await request(app).post(URL).set("Origin", ORIGIN).send({ ...message, website: "http://spam.example" }).expect(201);
    expect(await MessageModel.countDocuments({ siteId: { $exists: true } })).toBe(0);
  });

  it("rate-limits to 5 messages per 15 minutes per IP", async () => {
    const { app } = await setup();
    for (let i = 0; i < 5; i++) await request(app).post(URL).set("Origin", ORIGIN).send(message).expect(201);
    await request(app).post(URL).set("Origin", ORIGIN).send(message).expect(429);
  });
});
