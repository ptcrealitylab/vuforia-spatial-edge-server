function DependencyInjector() {}
/**
 *
 * @param {Object.<string, *>} injectedDependencies
 * @example dependencies.inject({ protocol: protocol, version: "3.1.0", Frame: Frame, Node: Node})
 */
DependencyInjector.prototype.inject = function(injectedDependencies) {
    for (var variableName in injectedDependencies) {
        this[variableName] = injectedDependencies[variableName];
    }
};

module.exports = DependencyInjector;
