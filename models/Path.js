/**
 * @constructor
 */
function Path() {
    this.address = {
        object: '',
        tool: '',
        node: ''
    },
    this.mode = '', 
    this.path = [],
    this.worldObject = null;
}

module.exports = Path;
