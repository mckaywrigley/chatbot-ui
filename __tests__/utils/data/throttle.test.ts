import { throttle } from '../../../utils/data/throttle'; // replace with correct path where your throttle function is present
import { vi, describe, expect, it, beforeEach } from 'vitest';

vi.useFakeTimers();

describe('throttle function', () => {
    let counter = 0
    let fn = vi.fn().mockImplementation(() => { counter += 1; });
    let throttledFn = throttle(fn, 500);

    beforeEach(() => {
        counter = 0;
        fn = vi.fn().mockImplementation(() => { counter += 1; });
        throttledFn = throttle(fn, 500);
    });

    it('should call the given function immediately if called for the first time', () => {
        throttledFn();

        expect(counter).toBe(1);
        expect(fn).toBeCalledTimes(1);
    });

    it('should not call the function if called again within the limit', () => {
        throttledFn();
        throttledFn();

        expect(counter).toBe(1);
        expect(fn).toBeCalledTimes(1);

        vi.runOnlyPendingTimers(); // this clears the timer for future tests
    });

    it('should call the function again after the limit has passed', () => {
        throttledFn();
        throttledFn();
        vi.runOnlyPendingTimers();

        expect(counter).toBe(2);
        expect(fn).toBeCalledTimes(2);
    });
});
