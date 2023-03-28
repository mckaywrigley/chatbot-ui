export function throttle<T extends (...args: any[]) => any>(func: T, limit: number): T {
    let lastFunc: ReturnType<typeof setTimeout>;
    let lastRan: number;

    return ((...args) => {
        if (!lastRan) {
            func(...args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(() => {
                if (Date.now() - lastRan >= limit) {
                    func(...args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    }) as T;
}