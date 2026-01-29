import request from "supertest";
import app from "../src/app.js";
import { initDb } from "../src/db.js";

beforeAll(async () => {
  process.env.SQLITE_PATH = ":memory:";
  await initDb();
});

describe("auth endpoints", () => {
  it("registers and logs in a user", async () => {
    const email = "tester@example.com";
    const password = "password123";

    const registerRes = await request(app)
      .post("/auth/register")
      .send({ email, password });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.token).toBeTruthy();

    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email, password });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeTruthy();
  });

  it("rejects unauthorized access", async () => {
    const res = await request(app).post("/extract").send({});
    expect(res.status).toBe(401);
  });
});
