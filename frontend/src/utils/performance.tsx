export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return function (...args: Parameters<T>): void {
        const later = () => {
            timeout = null;
            func(...args);
        };

        if (timeout !== null) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(later, wait);
    };
}

export function throttle<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let previous = 0;

    return function (...args: Parameters<T>): void {
        const now = Date.now();
        const remaining = wait - (now - previous);

        if (remaining <= 0 || remaining > wait) {
            if (timeout !== null) {
                clearTimeout(timeout);
                timeout = null;
            }
            previous = now;
            func(...args);
        } else if (timeout === null) {
            timeout = setTimeout(() => {
                previous = Date.now();
                timeout = null;
                func(...args);
            }, remaining);
        }
    };
}
