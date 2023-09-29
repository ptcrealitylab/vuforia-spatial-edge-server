const os = require('os');

module.exports.isLightweightMobile = os.platform() === 'android' || process.env.FORCE_MOBILE;
module.exports.isStandaloneMobile = os.platform() === 'ios';
