class Throttler {

    /**
     * The total number of async functions provided to the throttler
     * instance.
     * @type {number}
     */
    #total;

    /**
     * The total number of async functions that have completed.
     * @type {number}
     */
    #finished;

    /**
     * Function values (instances) that are queued to either be ran in
     * a batch or queue.
     * @type {Array<function>}
     */
    #queued;

    /**
     * Whether or not to print verbose logs.
     * @type {boolean}
     */
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

    /**
     * Function to start running the queued functions in batches of
     * size n.
     * @param {number} n
     */
    async batch(n) {

        if (this.#queued.length === 0) {
            return;
        }

        const active = this.#queued.splice(0, n);

        if (this.#verbose) {
            console.log('[THROTTLER] Batch Start'
                        + `\n\t[SIZE] ${active.length}`
                        + `\n\t[PROGRESS] ${this.#finished}/${this.#total}`);
        }

        const startTime = performance.now();
        await Promise.all(active.map(fn => fn()));
        this.#finished += active.length;

        if (this.#verbose) {
            const deltaTime = (performance.now() - startTime) / 1e3;
            console.log('[THROTTLER] Batch End'
                        + `\n\t[SIZE] ${active.length}`
                        + `\n\t[PROGRESS] ${this.#finished}/${this.#total}`
                        + `\n\t[BATCH TIME] ${deltaTime}`);
        }

        await this.batch(n);
    }

    /**
     * Function to start running the queued functions in a queue of
     * max capacity of size n. When one function terminates, another
     * is added to the group of running functions (if there are any
     * functions left in the queue).
     * size n.
     * @param {number} n
     */
    async queue(n) {
        let active = 0;
        await new Promise((resolve, _) => {
            const queuePrime = async (fn) => {
                active++;

                if (this.#verbose) {
                    console.log('[THROTTLER] Enqueue'
                                + `\n\t[CAPACITY] ${active}/${n}`
                                + `\n\t[STATUS] ${this.#finished}/${this.#total}`);
                }

                const startTime = performance.now();
                await fn();
                this.#finished++;
                active--;

                if (this.#verbose) {
                    const deltaTime = (performance.now() - startTime) / 1e3;
                    console.log('[THROTTLER] Dequeue'
                                + `\n\t[CAPACITY] ${active}/${n}`
                                + `\n\t[PROGRESS] ${this.#finished}/${this.#total}`
                                + `\n\t[JOB Time] ${deltaTime}s`);
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
