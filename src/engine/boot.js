/**
 * Start-up progress, reported to the loader screen in index.html
 * (window.fluxLoader). Everything the catalog needs before it's worth
 * showing registers here as it starts loading; once seal() has been called
 * and every registered asset has finished - or failed, which still counts,
 * so a missing file can't hold the page hostage - the loader is told to
 * leave.
 */
export function createBoot() {
    const assets = [];
    let sealed = false;
    let finished = false;

    function report() {
        const fraction = assets.length
            ? assets.reduce((sum, entry) => sum + entry.fraction, 0) / assets.length
            : 0;

        window.fluxLoader?.progress(fraction);

        if (sealed && !finished && assets.every((entry) => entry.done)) {
            finished = true;

            // Two frames on, so the catalog has actually been drawn behind the
            // loader by the time it starts to fade
            requestAnimationFrame(() => requestAnimationFrame(() => window.fluxLoader?.finish()));
        }
    }

    return {
        /**
         * One asset's share of the progress bar. `progress` takes an XHR
         * progress event; `done` counts it finished, success or not.
         */
        asset() {
            const entry = { fraction: 0, done: false };
            assets.push(entry);
            report();

            return {
                progress: (event) => {
                    if (event && event.lengthComputable && event.total) {
                        entry.fraction = Math.min(event.loaded / event.total, 1);
                        report();
                    }
                },
                done: () => {
                    entry.fraction = 1;
                    entry.done = true;
                    report();
                },
            };
        },

        // Everything the catalog loads at start-up has registered by now
        seal() {
            sealed = true;
            report();
        },
    };
}
