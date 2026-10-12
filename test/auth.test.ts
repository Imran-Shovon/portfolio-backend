import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "@/app";
import { upsertAdmin } from "@/modules/auth/auth.service";
import { ADMIN, loggedInAgent, useTestDb } from "./helpers";

useTestDb();

describe("auth", () => {
  it("logs in, sets an httpOnly cookie, and never returns the password hash", async () => {
    await upsertAdmin(ADMIN.email, ADMIN.password, "Test Admin");
    const res = await request(createApp()).post("/api/v1/auth/login").send(ADMIN).expect(200);

    expect(res.body.data).toMatchObject({ email: ADMIN.email, name: "Test Admin" });
    expect(res.body.data.passwordHash).toBeUndefined();
    const cookie = res.headers["set-cookie"]?.[0] ?? "";
    expect(cookie).toMatch(/^portfolio_admin=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it("gives the same 401 for a wrong password and an unknown email", async () => {
    await upsertAdmin(ADMIN.email, ADMIN.password);
    const app = createApp();
    const wrongPassword = await request(app).post("/api/v1/auth/login").send({ ...ADMIN, password: "nope" }).expect(401);
    const unknownEmail = await request(app).post("/api/v1/auth/login").send({ ...ADMIN, email: "who@example.com" }).expect(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  it("rejects protected routes without a valid cookie", async () => {
    const app = createApp();
    await request(app).get("/api/v1/auth/me").expect(401);
    await request(app).get("/api/v1/admin/sites").expect(401);
    await request(app).get("/api/v1/admin/sites").set("Cookie", "portfolio_admin=forged.token.value").expect(401);
  });

  it("returns the current admin and logs out", async () => {
    const { agent } = await loggedInAgent();
    const me = await agent.get("/api/v1/auth/me").expect(200);
    expect(me.body.data.email).toBe(ADMIN.email);

    await agent.post("/api/v1/auth/logout").expect(204);
    await agent.get("/api/v1/auth/me").expect(401);
  });

  it("changes the password only with the correct current password", async () => {
    const { agent, app } = await loggedInAgent();

    const wrong = await agent.patch("/api/v1/auth/password").send({ currentPassword: "nope", newPassword: "a-new-password-123" }).expect(400);
    expect(wrong.body.error.details).toEqual([{ path: ["currentPassword"], message: "Current password is incorrect" }]);

    const short = await agent.patch("/api/v1/auth/password").send({ currentPassword: ADMIN.password, newPassword: "short" }).expect(400);
    expect(short.body.error.details[0].path).toEqual(["newPassword"]);

    await agent.patch("/api/v1/auth/password").send({ currentPassword: ADMIN.password, newPassword: "a-new-password-123" }).expect(204);
    await request(app).post("/api/v1/auth/login").send(ADMIN).expect(401);
    await request(app).post("/api/v1/auth/login").send({ ...ADMIN, password: "a-new-password-123" }).expect(200);
  });

  it("rate-limits repeated failed logins", async () => {
    await upsertAdmin(ADMIN.email, ADMIN.password);
    const app = createApp();
    for (let i = 0; i < 10; i++) {
      await request(app).post("/api/v1/auth/login").send({ ...ADMIN, password: "nope" }).expect(401);
    }
    await request(app).post("/api/v1/auth/login").send({ ...ADMIN, password: "nope" }).expect(429);
  });
});
