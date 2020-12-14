function newIdentityMatrix() {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
}

/**
 * @desc This function multiplies one m16 matrix with a second m16 matrix
 * @param {Array.<number>} m2 - origin matrix to be multiplied with
 * @param {Array.<number>} m1 - second matrix that multiplies.
 * @return {Array.<number>} m16 matrix result of the multiplication
 */
function multiplyMatrix(m2, m1, r) {
    // var r = [];
    // Cm1che only the current line of the second mm1trix
    r[0] = m2[0] * m1[0] + m2[1] * m1[4] + m2[2] * m1[8] + m2[3] * m1[12];
    r[1] = m2[0] * m1[1] + m2[1] * m1[5] + m2[2] * m1[9] + m2[3] * m1[13];
    r[2] = m2[0] * m1[2] + m2[1] * m1[6] + m2[2] * m1[10] + m2[3] * m1[14];
    r[3] = m2[0] * m1[3] + m2[1] * m1[7] + m2[2] * m1[11] + m2[3] * m1[15];

    r[4] = m2[4] * m1[0] + m2[5] * m1[4] + m2[6] * m1[8] + m2[7] * m1[12];
    r[5] = m2[4] * m1[1] + m2[5] * m1[5] + m2[6] * m1[9] + m2[7] * m1[13];
    r[6] = m2[4] * m1[2] + m2[5] * m1[6] + m2[6] * m1[10] + m2[7] * m1[14];
    r[7] = m2[4] * m1[3] + m2[5] * m1[7] + m2[6] * m1[11] + m2[7] * m1[15];

    r[8] = m2[8] * m1[0] + m2[9] * m1[4] + m2[10] * m1[8] + m2[11] * m1[12];
    r[9] = m2[8] * m1[1] + m2[9] * m1[5] + m2[10] * m1[9] + m2[11] * m1[13];
    r[10] = m2[8] * m1[2] + m2[9] * m1[6] + m2[10] * m1[10] + m2[11] * m1[14];
    r[11] = m2[8] * m1[3] + m2[9] * m1[7] + m2[10] * m1[11] + m2[11] * m1[15];

    r[12] = m2[12] * m1[0] + m2[13] * m1[4] + m2[14] * m1[8] + m2[15] * m1[12];
    r[13] = m2[12] * m1[1] + m2[13] * m1[5] + m2[14] * m1[9] + m2[15] * m1[13];
    r[14] = m2[12] * m1[2] + m2[13] * m1[6] + m2[14] * m1[10] + m2[15] * m1[14];
    r[15] = m2[12] * m1[3] + m2[13] * m1[7] + m2[14] * m1[11] + m2[15] * m1[15];
}

/**
 * @desc inverting a matrix
 * @param {Array.<number>} a origin matrix
 * @return {Array.<number>} a inverted copy of the origin matrix
 */
function invertMatrix(a) {
    var b = [];
    var c = a[0], d = a[1], e = a[2], g = a[3], f = a[4], h = a[5], i = a[6], j = a[7], k = a[8], l = a[9], o = a[10], m = a[11], n = a[12], p = a[13], r = a[14], s = a[15], A = c * h - d * f, B = c * i - e * f, t = c * j - g * f, u = d * i - e * h, v = d * j - g * h, w = e * j - g * i, x = k * p - l * n, y = k * r - o * n, z = k * s - m * n, C = l * r - o * p, D = l * s - m * p, E = o * s - m * r, q = 1 / (A * E - B * D + t * C + u * z - v * y + w * x);
    b[0] = (h * E - i * D + j * C) * q;
    b[1] = ( -d * E + e * D - g * C) * q;
    b[2] = (p * w - r * v + s * u) * q;
    b[3] = ( -l * w + o * v - m * u) * q;
    b[4] = ( -f * E + i * z - j * y) * q;
    b[5] = (c * E - e * z + g * y) * q;
    b[6] = ( -n * w + r * t - s * B) * q;
    b[7] = (k * w - o * t + m * B) * q;
    b[8] = (f * D - h * z + j * x) * q;
    b[9] = ( -c * D + d * z - g * x) * q;
    b[10] = (n * v - p * t + s * A) * q;
    b[11] = ( -k * v + l * t - m * A) * q;
    b[12] = ( -f * C + h * y - i * x) * q;
    b[13] = (c * C - d * y + e * x) * q;
    b[14] = ( -n * u + p * B - r * A) * q;
    b[15] = (k * u - l * B + o * A) * q;
    return b;
}


/**
 * @desc copies one m16 matrix in to another m16 matrix
 * Use instead of copyMatrix function when speed is very important - this is faster
 * @param {Array.<number>} m1 - source matrix
 * @param {Array.<number>} m2 - resulting copy of the matrix
 */
function copyMatrixInPlace(m1, m2) {
    m2[0] = m1[0];
    m2[1] = m1[1];
    m2[2] = m1[2];
    m2[3] = m1[3];
    m2[4] = m1[4];
    m2[5] = m1[5];
    m2[6] = m1[6];
    m2[7] = m1[7];
    m2[8] = m1[8];
    m2[9] = m1[9];
    m2[10] = m1[10];
    m2[11] = m1[11];
    m2[12] = m1[12];
    m2[13] = m1[13];
    m2[14] = m1[14];
    m2[15] = m1[15];
}

function distance(matrix) {
    return Math.sqrt(Math.pow(matrix[12], 2) + Math.pow(matrix[13], 2) + Math.pow(matrix[14], 2));
}

function positionDistance(pos1, pos2) {
    let dx = pos2.x - pos1.x;
    let dy = pos2.y - pos1.y;
    let dz = pos2.z - pos1.z;
    return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2) + Math.pow(dz, 2));
}

function makeGroundPlaneRotationX(theta) {
    var c = Math.cos(theta), s = Math.sin(theta);
    return [  1, 0, 0, 0,
        0, c, -s, 0,
        0, s, c, 0,
        0, 0, 0, 1];
}

exports.newIdentityMatrix = newIdentityMatrix;
exports.multiplyMatrix = multiplyMatrix;
exports.invertMatrix = invertMatrix;
exports.copyMatrixInPlace = copyMatrixInPlace;
exports.positionDistance = positionDistance;
exports.distance = distance;
exports.makeGroundPlaneRotationX = makeGroundPlaneRotationX;
