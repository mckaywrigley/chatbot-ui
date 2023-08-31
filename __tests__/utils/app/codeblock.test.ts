import { programmingLanguages, generateRandomString } from '@/utils/app/codeblock';
import { vi, afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('programmingLanguages map', () => {
    it('should correctly map languages to extension', () => {
        expect(programmingLanguages['javascript']).toBe('.js');
        expect(programmingLanguages['python']).toBe('.py');
        expect(programmingLanguages['typescript']).toBe('.ts');
        expect(programmingLanguages['c#']).toBe('.cs');
        expect(programmingLanguages['cpp']).toBe('.cpp');
        expect(programmingLanguages['c++']).toBe('.cpp');
        expect(programmingLanguages['java']).toBe('.java');
        expect(programmingLanguages['ruby']).toBe('.rb');
        expect(programmingLanguages['perl']).toBe('.pl');
        expect(programmingLanguages['objective-c']).toBe('.m');
        expect(programmingLanguages['c']).toBe('.c');
        expect(programmingLanguages['go']).toBe('.go');
        expect(programmingLanguages['rust']).toBe('.rs');
        expect(programmingLanguages['php']).toBe('.php');
        expect(programmingLanguages['swift']).toBe('.swift');
        expect(programmingLanguages['kotlin']).toBe('.kt');
        expect(programmingLanguages['scala']).toBe('.scala');
        // expect(programmingLanguages['r']).toBe('.r');
        expect(programmingLanguages['haskell']).toBe('.hs');
        expect(programmingLanguages['lua']).toBe('.lua');
        expect(programmingLanguages['shell']).toBe('.sh');
        expect(programmingLanguages['sql']).toBe('.sql');
        expect(programmingLanguages['html']).toBe('.html');
        expect(programmingLanguages['css']).toBe('.css');
    });

    it('should return undefined for languages not in map', () => {
        expect(programmingLanguages['not-a-language']).toBeUndefined();
    });
});

describe('generateRandomString function', () => {
    let originalMathRandom: () => number;

    beforeEach(() => {
        originalMathRandom = Math.random;
        Math.random = vi.fn().mockReturnValue(0);
    });

    afterEach(() => {
        Math.random = originalMathRandom;
    });

    it('should generate string of correct length', () => {
        const len = 7;
        const result = generateRandomString(len);
        expect(result.length).toBe(len);
    });

    it('should generate string with uppercase characters by default', () => {
        const result = generateRandomString(5);
        expect(result).toEqual(result.toUpperCase());
    });

    it('should generate string with lowercase characters when lowercase argument is true', () => {
        const result = generateRandomString(5, true);
        expect(result).toEqual(result.toLowerCase());
    });

    it('should generate an empty string when length is 0', () => {
        const result = generateRandomString(0);
        expect(result).toEqual('');
    });
});
