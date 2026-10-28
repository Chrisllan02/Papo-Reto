const getStorage = (): Storage | null => {
    try {
        return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
        return null;
    }
};

export const safeGetItem = (key: string): string | null => {
    try {
        return getStorage()?.getItem(key) ?? null;
    } catch {
        return null;
    }
};

export const safeSetItem = (key: string, value: string): boolean => {
    try {
        const storage = getStorage();
        if (!storage) return false;
        storage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
};

export const safeRemoveItem = (key: string): void => {
    try {
        getStorage()?.removeItem(key);
    } catch {
        // Storage indisponível: nada a remover.
    }
};

const listKeys = (): string[] => {
    try {
        const storage = getStorage();
        if (!storage) return [];
        const keys: string[] = [];
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (key) keys.push(key);
        }
        return keys;
    } catch {
        return [];
    }
};

const entryTimestamp = (key: string): number => {
    try {
        const parsed = JSON.parse(safeGetItem(key) || 'null');
        return Number(parsed?.timestamp) || 0;
    } catch {
        return 0;
    }
};

// Grava o valor; se a cota estourar, libera as entradas mais antigas com o prefixo e tenta de novo.
export const safeSetItemWithEviction = (key: string, value: string, evictPrefix: string): boolean => {
    if (safeSetItem(key, value)) return true;

    const candidates = listKeys()
        .filter(candidate => candidate !== key && candidate.startsWith(evictPrefix))
        .map(candidate => ({ key: candidate, timestamp: entryTimestamp(candidate) }))
        .sort((a, b) => a.timestamp - b.timestamp);

    for (const candidate of candidates) {
        safeRemoveItem(candidate.key);
        if (safeSetItem(key, value)) return true;
    }
    return false;
};

// Remove chaves de uma família de caches (ex.: versões antigas) que não são mais a atual.
export const purgeStaleKeys = (family: RegExp, isCurrent: (key: string) => boolean): void => {
    for (const key of listKeys()) {
        if (family.test(key) && !isCurrent(key)) safeRemoveItem(key);
    }
};
