import { ZodSchema } from "zod";

export interface DataAccessLayer<T> {
  readonly schema: ZodSchema<T>;
  readonly namespace: `${string}:`;

  create(id: string, data: T): Promise<boolean>;
  read(id: string): Promise<T | null>;
  update(
    id: string,
    data: Partial<T>,
  ): Promise<boolean>;
  delete(id: string): Promise<boolean>;

  exists(id: string): Promise<boolean>;
}
