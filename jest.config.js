const config = {
    coveragePathIgnorePatterns: ["/node_modules/", "/addons/"],
    transformIgnorePatterns: ["/node_modules/", "/addons/", "\\.pnp\\.[^\\/]+$"],
    moduleNameMapper: {
        "@libraries/(.*)$": "<rootDir>/libraries/$1",
    },
};

module.exports = config;
