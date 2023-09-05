/**
 * @preserve
 *
 *                                                                            .,,,;;,'''..
 *                                                                    .'','...         ..',,,.
 *                                                                .,,,,,,',,',;;:;,.    .,l,
 *                                                             .,',.         ...         ,;,     :l.
 *                                                            ':;.        .'.:do;;.        .c     ol;'.
 *             ';;'                                     ;.;        ', .dkl';,        .c     :; .'.',::,,'''.
 *            ',,;;;,.                                ; .,'         .'''.        .'.     .d;''.''''.
 *         .oxddl;::,,.                         ',    .'''.     .... .'.     ,:;..
 *            .'cOX0OOkdoc.                        .,'.     .. .....         'lc.
 *         .:;,,::co0XOko'                            ....''..'.'''''''.
 *         .dxk0KKdc:cdOXKl............. .. ..,c....
 *            .',lxOOxl:'':xkl,',......'....        ,'.
 *                     .';:oo:...                                                .
 *                                .cd,            ╔═╗┌┬┐┬┌┬┐┌─┐┬─┐        .
 *                                    .l;         ║╣    │││ │ │ │├┬┘        '
 *                                        'l.     ╚═╝─┴┘┴ ┴ └─┘┴└─     '.
 *                                         .o.                                     ...
 *                                            .''''','.;:''.........
 *                                                     .'    .l
 *                                                    .:.     l'
 *                                                 .:.        .l.
 *                                                .x:            :k;,.
 *                                                cxlc;        cdc,,;;.
 *                                             'l :..     .c    ,
 *                                             o.
 *                                            .,
 *
 *            ╦═╗┌─┐┌─┐┬    ┬┌┬┐┬ ┬    ╔═╗┌┬┐┬┌┬┐┌─┐┬─┐    ╔═╗┬─┐┌─┐ ┬┌─┐┌─┐┌┬┐
 *            ╠╦╝├┤ ├─┤│    │ │ └┬┘    ║╣    │││ │ │ │├┬┘    ╠═╝├┬┘│ │ │├┤ │     │
 *            ╩╚═└─┘┴ ┴┴─┘┴ ┴    ┴     ╚═╝─┴┘┴ ┴ └─┘┴└─    ╩    ┴└─└─┘└┘└─┘└─┘ ┴
 *
 *
 * Created by Valentin on 10/22/14.
 *
 * Copyright (c) 2015 Valentin Heun
 * Modified by Valentin Heun 2014, 2015, 2016, 2017
 * Modified by Benjamin Reynholds 2016, 2017
 * Modified by James Hobin 2016, 2017
 *
 * All ascii characters above must be included in any redistribution.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * @fileOverview js
 * Various utility functions, mostly mathematical, for calculating AR geometry.
 * Includes simply utilities like multiplying and inverting a matrix,
 * as well as sophisticated algorithms for marker-plane intersections and raycasting points onto a plane.
 */

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
    // return r;
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

/**
 * @desc inverting a matrix
 * @param {Array.<number>} a origin matrix
 * @return {Array.<number>} a inverted copy of the origin matrix
 */
function invertMatrix (a) {
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
 * Helper method for creating a new 4x4 identity matrix
 * @return {Array.<number>}
 */
function newIdentityMatrix() {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
}

module.exports = {
    newIdentityMatrix,
    multiplyMatrix,
    copyMatrixInPlace,
    invertMatrix,
};
