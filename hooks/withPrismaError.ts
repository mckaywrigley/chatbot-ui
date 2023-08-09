import { NextApiRequest, NextApiResponse } from "next";
import { Prisma } from "@prisma/client";
import { IResponse } from "@/types/response";
import { PrismaError } from '@/utils/prisma';

export const withPrismaError = (request: (req: NextApiRequest, res: NextApiResponse) => unknown) => {
  return async function (req: NextApiRequest, res: NextApiResponse) {
    try {
      await request(req, res);
    } catch (e) {
      let message = '请求失败';
      let error = {
        code: '',
        detail: e,
      };
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        error = {
          code: e.code,
          detail: e,
        };
        message = `${e.code} ${e.message}`;
        if (e.code === PrismaError.UniqueConstraintViolation && (e.meta as any).target[0] === 'email') {
          message = '邮箱已经被注册，请重新填写';
        }
      } else if (e instanceof Prisma.PrismaClientUnknownRequestError) {
        error = {
          code: '-1',
          detail: e,
        }
        message = e.message;
      }

      return res.status(200).json({
        success: false,
        message,
        error,
      } as IResponse);
    }
  };
}