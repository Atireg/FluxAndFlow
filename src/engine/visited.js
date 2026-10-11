/**
 * Which projects have been opened, remembered in the browser so their
 * pebbles are still darker on the next visit. A nicety, not state anything
 * depends on: private browsing or blocked storage just means darker for
 * this visit only.
 */
const VISITED_KEY = 'fluxandflow.visited';

export function createVisited() {
    let ids;

    try {
        ids = new Set(JSON.parse(window.localStorage.getItem(VISITED_KEY)) || []);
    } catch {
        ids = new Set();
    }

    return {
        has(id) {
            return Boolean(id) && ids.has(id);
        },

        add(id) {
            if (!id || ids.has(id)) return;

            ids.add(id);

            try {
                window.localStorage.setItem(VISITED_KEY, JSON.stringify([...ids]));
            } catch {
                // Private browsing or blocked storage: darker for this visit only
            }
        },
    };
}
