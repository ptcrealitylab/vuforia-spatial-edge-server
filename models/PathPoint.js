/**
 * @constructor
 */
function PathPoint() {
    this.address = {
        object: '',
        tool: '',
        node: ''
    };
    this.points = [];
    this.worldObject = null;
}

module.exports = PathPoint;
