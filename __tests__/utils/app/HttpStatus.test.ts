
import HttpStatusCode from "@/utils/app/HttpStatusCode";
import { describe, expect, it } from 'vitest';

describe('HttpStatusCodes', () => {
    it('should return true if CONTINUE is equal to 100', () => {
        expect(HttpStatusCode.CONTINUE).toBe(100);
      });

    it('should return true if status OK is equal to 200', () => {
    expect(HttpStatusCode.OK).toBe(200);
    });

    it('should return true if status ACCEPTED is equal to 202', () => {
      expect(HttpStatusCode.ACCEPTED).toBe(202);
    });

    it('should return true if status NOT_FOUND is equal to 404', () => {
        expect(HttpStatusCode.NOT_FOUND).toBe(404);
      });
      it('should return true if status FORBIDDEN is equal to 403', () => {
        expect(HttpStatusCode.FORBIDDEN).toBe(403);
      });
    it('should return true if status UNAUTHORIZED is equal to 401', () => {
        expect(HttpStatusCode.UNAUTHORIZED).toBe(401);
      });
});