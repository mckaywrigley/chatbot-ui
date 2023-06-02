import { CreateRegisterCodeReturnValue, RegisterReturnStatus } from "../types";
import { RegisterCodeDAL } from "../dal";
import { generateRandomSixDigitNumber } from "./utils";

export class RegisterCodeLogic {
  constructor(private readonly dal = new RegisterCodeDAL()) {}

  async newCode(phoneOrEmail: string): Promise<CreateRegisterCodeReturnValue> {
    const code = generateRandomSixDigitNumber().toString();

    if (await this.dal.create(phoneOrEmail, code)) {
      await this.dal.setExpire(phoneOrEmail, 300);
      return {
        status: RegisterReturnStatus.Success,
        code,
        ttl: 300,
      };
    }

    // code already exists
    const ttl = await this.dal.getExpire(phoneOrEmail);
    if (ttl >= 60 * 4) return { status: RegisterReturnStatus.TooFast, ttl };

    // update code
    if (await this.dal.update(phoneOrEmail, code)) {
      await this.dal.setExpire(phoneOrEmail, 300);
      return {
        status: RegisterReturnStatus.Success,
        code,
        ttl: 300,
      };
    }

    return { status: RegisterReturnStatus.UnknownError };
  }

  /**
   * BREAKING CHANGE: This method will not update the user's phone number.
   * use UserLogic.update({ phone }) instead.
   */
  async activateCode(phoneOrEmail: string, code: string): Promise<boolean> {
    const remoteCode = await this.dal.read(phoneOrEmail);

    if (remoteCode === code) {
      return this.dal.delete(phoneOrEmail);
    }
    return false;
  }
}
