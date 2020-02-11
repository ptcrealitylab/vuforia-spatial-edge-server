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
    level: 'debug',
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

console.log = function() {
    return logger.debug.apply(logger, arguments);
};

for (const level of ['debug', 'error', 'info', 'warn']) {
    console[level] = function() {
        return logger[level].apply(logger, arguments);
    };
}

module.exports = logger;
