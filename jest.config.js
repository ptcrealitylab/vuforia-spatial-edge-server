const config = {
    coveragePathIgnorePatterns: ["/node_modules/", "/addons/"],
    transformIgnorePatterns: ["/node_modules/", "/addons/", "\\.pnp\\.[^\\/]+$"],
    testPathIgnorePatterns: ["vuforia-spatial-toolbox-userinterface"],
    moduleNameMapper: {
        "@libraries/(.*)$": "<rootDir>/libraries/$1",
    },
};

module.exports = config;
