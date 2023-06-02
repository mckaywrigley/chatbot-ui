import { InvitationCodeDAL, UserDAL } from "../dal";
import { CreateNewInvitationCodeParams, InvitationCode } from "../types";
import md5 from "spark-md5";

export class InvitationCodeLogic {
  constructor(
    private readonly userDAL = new UserDAL(),
    private readonly invitationCodeDAL = new InvitationCodeDAL(),
  ) {}

  /**
   * Generate a new invitation code, create related key in Redis, and append the code to the user's invitationCodes.
   * Please make sure the user exists before calling this method!
   * TODO: avoid data pollution when failed
   * @returns the invitation code or null when any of it not exist
   */
  async newCode(
    { code, email, type, limit = 0 }: CreateNewInvitationCodeParams,
  ): Promise<string | null> {
    code ??= md5.hash(email + Date.now()).slice(0, 6);

    const createCode = this.invitationCodeDAL.create(
      code,
      {
        type,
        limit,
        inviterEmail: email,
        inviteeEmails: [],
      },
    );
    const appendCode = this.userDAL.appendInvitationCode(email, code);

    await Promise.all([createCode, appendCode]);

    return code;
  }

  /**
   * The following method does the following:
   * 1. Check if the inviter code is valid
   * 2. Set the inviter code to the user
   * 3. Append the email of invitee to the list in the code's inviteeEmails
   * 4. Increase inviter's reset chance by 1
   * 5. Return the info of invitation code
   * Please make sure the user exists before calling this method!
   * @param inviteeEmail
   * @param code
   * @returns the info of invitation code
   */
  async acceptCode(
    inviteeEmail: string,
    code: string,
  ): Promise<InvitationCode | null> {
    const invitationCode = await this.invitationCodeDAL.read(code);

    if (!invitationCode) return null;

    if (
      invitationCode.limit &&
      invitationCode.inviteeEmails.length >= invitationCode.limit
    ) {
      return null;
    }

    const setInviterCode = this.userDAL.update(inviteeEmail, {
      inviterCode: code,
    });

    invitationCode.inviteeEmails.push(inviteeEmail);
    const appendInviteeEmail = this.invitationCodeDAL.appendInviteeEmail(
      code,
      inviteeEmail,
    );

    const increaseResetChance = this.userDAL.incrResetChances(
      invitationCode.inviterEmail,
      1,
    );

    await Promise.all([
      setInviterCode,
      appendInviteeEmail,
      increaseResetChance,
    ]);

    return invitationCode;
  }
}
