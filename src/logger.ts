import pino from "pino";

const logger = pino({
    level: process.env.LOG_LEVEL ?? "info",
    base: null,
    formatters: {
        level: (label) => ({
            level: label.toUpperCase(),
        }),
    },
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
});

export default logger;