import type { AxiosProgressEvent } from 'axios';
import * as http from 'http';
import chalk from 'chalk';

const RAINBOW_COLORS = [
    chalk.red,
    chalk.hex('#FF7F00'), // orange
    chalk.yellow,
    chalk.green,
    chalk.blue,
    chalk.hex('#8B00FF') // violet
];

const NYAN_CAT = '🐱🍞✨';

export default class ProgressBar {
    max: number;
    value: number;
    name: string;

    refreshMethod: 'interval' | 'event' = 'interval';
    refreshInterval: number;
    interval: NodeJS.Timeout;

    trailOffset: number = 0;

    constructor(name: string, max: number) {
        this.name = name;
        this.max = max;
        this.value = 0;

        process.stdout.on('resize', () => {
            // no-op for now, can be extended for dynamic barLength
        });
    }

    setRefreshMethod(method: 'interval' | 'event') {
        this.refreshMethod = method;
    }

    update(value: number) {
        this.value = Math.min(value, this.max);

        if (this.refreshMethod === 'event') {
            this.render();
        } else if (this.value === this.max) {
            this.stop();
        }
    }

    private render() {
        process.stdout.cursorTo(0);
        process.stdout.write(this.getLine());
    }

    private getLine(): string {
        const width = process.stdout.columns;
        const percent = this.value / this.max;
        const progress = Math.floor(percent * 100);
        const trailLength = Math.max(0, width - this.name.length - 10 - NYAN_CAT.length - 5);

        const rainbow = this.getRainbowTrail(Math.floor(trailLength * percent));
        return `${this.name} ${rainbow}${NYAN_CAT} ${progress}%`;
    }

    private getRainbowTrail(length: number): string {
        let trail = '';
        for (let i = 0; i < length; i++) {
            const colorFn = RAINBOW_COLORS[(i + this.trailOffset) % RAINBOW_COLORS.length];
            trail += colorFn('~');
        }
        this.trailOffset++;
        return trail;
    }

    axiosProgress() {
        let fetchedMax = false;

        return (progressEvent: AxiosProgressEvent) => {
            if (!fetchedMax) {
                this.max = progressEvent.total!;
                fetchedMax = true;
            }

            this.update(progressEvent.loaded);
        };
    }

    httpProgress() {
        let fetchedMax = false;

        return (res: http.IncomingMessage) => {
            if (!fetchedMax) {
                this.max = Number(res.headers['content-length']);
                fetchedMax = true;
            }

            res.on('data', (chunk) => {
                this.update(this.value + chunk.length);
            });
        };
    }

    start(refreshInterval: number) {
        if (this.interval) {
            this.stop();
        }

        this.interval = setInterval(() => {
            this.render();
        }, refreshInterval);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;

            this.render();
            process.stdout.write('\n');
        }
    }
}
