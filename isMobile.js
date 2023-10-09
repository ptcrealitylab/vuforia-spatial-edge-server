const os = require('os');

const isLightweightMobile = os.platform() === 'android' || process.env.FORCE_MOBILE;
const isStandaloneMobile = os.platform() === 'ios';
exports.isLightweightMobile = isLightweightMobile;
exports.isStandaloneMobile = isStandaloneMobile;
exports.isMobile = isLightweightMobile || isStandaloneMobile;
