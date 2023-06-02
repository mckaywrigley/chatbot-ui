import { afterAll, describe, expect, test } from "@jest/globals";
import { testUserDAL } from "../client";
import { UserDAL, UserLogic } from "../../src";

describe("UserLogic", () => {
  const userLogic = new UserLogic(testUserDAL);

  test("register a new user", async () => {
    const result = await userLogic.register("test@example.com", "password");
    expect(result).toBe(true);
  });

  test("register an existing user", async () => {
    await userLogic.register("test@example.com", "password");
    const result = await userLogic.register("test@example.com", "password");
    expect(result).toBe(false);
  });

  test("login with correct credentials", async () => {
    await userLogic.register("test@example.com", "password");
    const result = await userLogic.login("test@example.com", "password");
    expect(result).toBe(true);
  });

  test("login with incorrect password", async () => {
    await userLogic.register("test@example.com", "password");
    const result = await userLogic.login("test@example.com", "wrongpassword");
    expect(result).toBe(false);
  });

  test("login with non-existent user", async () => {
    const result = await userLogic.login("nonexistent@example.com", "password");
    expect(result).toBe(false);
  });

  test("update an existing user", async () => {
    await userLogic.register("test@example.com", "password");
    const result = await userLogic.update("test@example.com", {
      name: "John Doe",
    });
    expect(result).toBe(true);
  });

  test("update a non-existent user", async () => {
    const result = await userLogic.update("nonexistent@example.com", {
      name: "John Doe",
    });
    expect(result).toBe(false);
  });

  test("get role of an existing user", async () => {
    await userLogic.register("test@example.com", "password");
    const result = await userLogic.getRoleOf("test@example.com");
    expect(result).toBe("user");
  });

  test("get role of a non-existent user", async () => {
    const result = await userLogic.getRoleOf("nonexistent@example.com");
    expect(result).toBeNull();
  });

  test("get invitation codes of an existing user", async () => {
    await userLogic.register("test@example.com", "password");
    const result = await userLogic.getInvitationCodesOf("test@example.com");
    expect(result).toEqual([]);
  });

  test("get invitation codes of a non-existent user", async () => {
    const result = await userLogic.getInvitationCodesOf(
      "nonexistent@example.com",
    );
    expect(result).toBeNull();
  });

  test("get reset chances of an existing user", async () => {
    await userLogic.register("test@example.com", "password");
    const result = await userLogic.getResetChancesOf("test@example.com");
    expect(result).toBe(0);
  });

  test("get reset chances of a non-existent user", async () => {
    const result = await userLogic.getResetChancesOf("nonexistent@example.com");
    expect(result).toBeNull();
  });
});

// CLEAN UP: del user:test@example.com
