// Patched DB bridge
export const getPool = () => {
    return {
        query: async () => ({ rows: [] }),
        connect: async () => ({ release: () => {}, query: async () => ({ rows: [] }) })
    } as any;
};
