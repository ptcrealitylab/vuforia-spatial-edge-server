const winston = require('winston');
const os = require('os');
const { createLogger, format, transports } = require('winston');
const { inspect } = require('util');
const hasAnsi = require('has-ansi');

const isMobile = os.platform() === 'android' || os.platform() === 'ios';

// From https://github.com/winstonjs/winston/issues/1427#issuecomment-535297716
function isPrimitive(val) {
    return val === null || (typeof val !== 'object' && typeof val !== 'function');
}
function formatWithInspect(val, colorize) {
    const prefix = isPrimitive(val) ? '' : '\n';
    const shouldFormat = typeof val !== 'string' || !hasAnsi(val);

    return prefix + (shouldFormat ? inspect(val, { depth: null, colors: colorize }) : val);
}
function fancyPrintf(colorize) {
    return function(info) {
        const msg = formatWithInspect(info.message, colorize);
        const splatArgs = info[Symbol.for('splat')] || [];
        const rest = splatArgs.map(data => formatWithInspect(data)).join(' ');

        return `${info.timestamp} - ${info.level}: ${msg} ${rest}`;
    };
}

const monochromeFormat = format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.printf(fancyPrintf(!isMobile))
);

const colorizedFormat = format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.colorize(),
    format.printf(fancyPrintf(!isMobile))
);

const logger = createLogger({
    level: process.env.LOG_LEVEL || 'debug',
    format: isMobile ? monochromeFormat : colorizedFormat,
    transports: [new transports.Console()]
});

if (process.env.NODE_ENV === 'production') {
    logger.level = 'info';
    if (!isMobile) {
        logger.add(new winston.transports.File({
            filename: 'error.log',
            level: 'error'
        }));
    }
}

/**
 * Allows filtering log messages out if they don't come from a file listed in
 * the LOG_MODULES environment variable.
 * @return {boolean} True if we want to keep the log message
 */
function checkLogModules() {
    if (!process.env.LOG_MODULES) {
        return true;
    }

    const logModules = process.env.LOG_MODULES.split(',');

    const stack = new Error().stack;
    const filesAt = stack.split('\n');
    if (filesAt.length < 4 || !filesAt[3]) {
        return true;
    }

    // 0 -> "Error"
    // 1 -> this function
    // 2 -> console.log
    // 3 -> caller

    const callerParts = filesAt[3].split('(');
    if (callerParts.length < 2) {
        return true;
    }

    // there will be some line number junk included
    const callerFile = callerParts[1];

    for (const logModule of logModules) {
        if (callerFile.includes(logModule)) {
            return true;
        }
    }

    return false;
}

console.log = function() {
    if (!checkLogModules()) {
        return;
    }
    return logger.debug.apply(logger, arguments);
};

for (const level of ['debug', 'error', 'info', 'warn']) {
    console[level] = function() {
        if (!checkLogModules()) {
            return;
        }
        return logger[level].apply(logger, arguments);
    };
}

module.exports = logger;
