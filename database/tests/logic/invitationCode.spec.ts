import { describe, expect, test } from "@jest/globals";
import {
  CreateNewInvitationCodeParams,
  InvitationCodeLogic,
  UserLogic,
} from "../../src";
import { testInvitationCodeDAL, testUserDAL } from "../client";

describe("InvitationCodeLogic", () => {
  const invitationCodeLogic = new InvitationCodeLogic(
    testUserDAL,
    testInvitationCodeDAL,
  );
  const userLogic = new UserLogic(testUserDAL);

  test("create a new invitation code", async () => {
    await userLogic.register("test@example.com", "password");
    const createNewInvitationCodeParams: CreateNewInvitationCodeParams = {
      email: "test@example.com",
      type: "normal",
    };
    const result = await invitationCodeLogic.newCode(
      createNewInvitationCodeParams,
    );
    expect(result).not.toBeNull();
  });

  test("accept a valid invitation code", async () => {
    await userLogic.register("inviter@example.com", "password");
    await userLogic.register("invitee@example.com", "password");
    const createNewInvitationCodeParams: CreateNewInvitationCodeParams = {
      email: "inviter@example.com",
      type: "normal",
    };
    const code = await invitationCodeLogic.newCode(
      createNewInvitationCodeParams,
    );
    const result = await invitationCodeLogic.acceptCode(
      "invitee@example.com",
      code!,
    );
    expect(result).not.toBeNull();
    expect(result!.inviteeEmails).toContain("invitee@example.com");
  });

  test("accept an invalid invitation code", async () => {
    await userLogic.register("invitee@example.com", "password");
    const result = await invitationCodeLogic.acceptCode(
      "invitee@example.com",
      "invalid_code",
    );
    expect(result).toBeNull();
  });

  test("accept an invitation code with reached limit", async () => {
    await userLogic.register("inviter@example.com", "password");
    await userLogic.register("invitee1@example.com", "password");
    await userLogic.register("invitee2@example.com", "password");
    const createNewInvitationCodeParams: CreateNewInvitationCodeParams = {
      email: "inviter@example.com",
      type: "normal",
      limit: 1,
    };
    const code = await invitationCodeLogic.newCode(
      createNewInvitationCodeParams,
    );
    await invitationCodeLogic.acceptCode("invitee1@example.com", code!);
    const result = await invitationCodeLogic.acceptCode(
      "invitee2@example.com",
      code!,
    );
    expect(result).toBeNull();
  });
});
