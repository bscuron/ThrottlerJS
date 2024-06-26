class Throttler {

    #total;
    #finished;
    #queued;
    #verbose;

    constructor(functions=[], verbose=false) {
        if (functions.some(fn => typeof fn !== 'function')) {
            throw new Error('Invalid function provided to Throttler constructor');
        }

        this.#total = functions.length;
        this.#finished = 0;
        this.#queued = [...functions];
        this.#verbose = verbose;
    }

    async batch(n) {

        if (this.#queued.length === 0) {
            return;
        }

        const active = this.#queued.splice(0, n);

        if (this.#verbose) {
            console.log(`Throttler: Creating batch of ${active.length} (${this.#finished}/${this.#total} complete)`);
        }

        const startTime = performance.now();
        await Promise.all(active.map(fn => fn()));
        this.#finished += active.length;

        if (this.#verbose) {
            const deltaTime = (performance.now() - startTime) / 1e3;
            console.log(`Throttler: ${this.#finished}/${this.#total} (Batch Time: ${deltaTime}s)`);
        }

        await this.batch(n);
    }

    async queue(n) {
        let active = 0;
        await new Promise((resolve, _) => {
            const queuePrime = async (fn) => {
                active++;

                if (this.#verbose) {
                    console.log(`Throttler: Queue Capacity ${active}/${n}`);
                }

                const startTime = performance.now();
                await fn();
                this.#finished++;
                active--;

                if (this.#verbose) {
                    const deltaTime = (performance.now() - startTime) / 1e3;
                    console.log(`Throttler: ${this.#finished}/${this.#total} (Job Time: ${deltaTime}s)`);
                }

                if (this.#queued.length > 0 && active < n) {
                    queuePrime(this.#queued.shift());
                }

                if (this.#total === this.#finished) {
                    resolve();
                }
            };

            while (this.#queued.length > 0 && active < n) {
                queuePrime(this.#queued.shift());
            }
        });
    }
}
