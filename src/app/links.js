/**
 * A link to each project: the page's address gets `#<project id>` while a
 * project is open (`#rock-print`), so it can be copied and shared, and an
 * address with one opens that project - straight through the loader,
 * without the landing page (index.html checks for it too). A hash, not a
 * path, so GitHub Pages serves the one page whatever follows it.
 *
 * Opening one from the playground adds a step to the browser's history, so
 * Back closes it again; closing it with the page's own way back takes that
 * step back off rather than adding another.
 *
 * The path has one the same way, `#path` (PATH_VIEW's id): there while the
 * filter has it chosen.
 */

// The project the address names, or null
export function linkedProject() {
    const id = decodeURIComponent(window.location.hash.slice(1));
    return id || null;
}

// A project has opened: put it in the address, unless it's there already
export function showProjectLink(id) {
    if (linkedProject() === id) return;
    window.history.pushState({ project: id }, '', `#${encodeURIComponent(id)}`);
}

// Back to the playground: the address without the project
export function clearProjectLink() {
    if (!linkedProject()) return;
    if (window.history.state?.project) {
        window.history.back();
        return;
    }
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
}
