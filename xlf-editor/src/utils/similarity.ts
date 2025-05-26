const similarityCache = new Map<string, number>();

export function similarity(a: string, b: string): number {
    if (!a || !b) return 0;
    
    // Create cache key
    const cacheKey = `${a}|||${b}`;
    if (similarityCache.has(cacheKey)) {
        return similarityCache.get(cacheKey)!;
    }

    // Quick checks before expensive computation
    if (a === b) return 100;
    if (Math.abs(a.length - b.length) / Math.max(a.length, b.length) > 0.5) {
        return 0; // Too different in length
    }

    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    const longerLength = longer.length;
    
    const result = ((longerLength - editDistance(longer, shorter)) / longerLength) * 100;
    similarityCache.set(cacheKey, result);
    
    return result;
}

function editDistance(s1: string, s2: string): number {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i === 0)
                costs[j] = j;
            else {
                if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) !== s2.charAt(j - 1))
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0)
            costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}