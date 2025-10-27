export interface DiffOptions {
    ignoreKeys?: string[];
    deepCompare?: boolean;
}

const isPlainObject = (val: unknown): val is Record<string, unknown> => {
    return Object.prototype.toString.call(val) === '[object Object]';
};

const valuesEqual = (a: unknown, b: unknown, deepCompare: boolean): boolean => {
    if (Object.is(a, b)) {
        return true;
    }
    if (!deepCompare) {
        return false;
    }
    const isObjLike = (value: unknown) => isPlainObject(value) || Array.isArray(value);
    if (isObjLike(a) && isObjLike(b)) {
        try {
            return JSON.stringify(a) === JSON.stringify(b);
        } catch (error) {
            console.warn('Failed to stringify values for comparison', error);
            return false;
        }
    }
    return false;
};

export const getChangedFields = <T extends Record<string, unknown>>(
    current: Partial<T>,
    original?: Partial<T> | null,
    options?: DiffOptions
): Partial<T> => {
    const result: Partial<T> = {};
    if (!current || typeof current !== 'object') {
        return result;
    }
    const deepCompare = options?.deepCompare ?? true;
    const ignoreSet = new Set(options?.ignoreKeys ?? []);
    const originalData = original ?? {};

    Object.keys(current).forEach((key) => {
        if (ignoreSet.has(key)) {
            return;
        }
        const currentValue = current[key as keyof typeof current];
        const originalValue = originalData[key as keyof typeof originalData];
        if (!valuesEqual(currentValue, originalValue, deepCompare)) {
            if (currentValue !== undefined) {
                result[key as keyof T] = currentValue;
            }
        }
    });

    return result;
};
