import * as THREE from "three";

export function toScreenPosition(obj, camera, renderer)
{
    var vector = new THREE.Vector3();

    var widthHalf = 0.5 * renderer.context.canvas.width;
    var heightHalf = 0.5 * renderer.context.canvas.height;

    obj.updateMatrixWorld();
    vector.setFromMatrixPosition(obj.matrixWorld);
    vector.project(camera);

    vector.x = ( vector.x * widthHalf ) + widthHalf;
    vector.y = - ( vector.y * heightHalf ) + heightHalf;

    return {
        x: vector.x,
        y: vector.y
    };

}

export function setMatrixFromArray(matrix, array) {
    matrix.set( array[0], array[4], array[8], array[12],
        array[1], array[5], array[9], array[13],
        array[2], array[6], array[10], array[14],
        array[3], array[7], array[11], array[15]);
}

const lerp = (a, b, t) =>
    t * (b - a) + a;

/**
 * loop through a series of numbers where the center of each value is where the value is reached
 * @param {number[]} arr
 */
export const binLerp = (arr) => {
    const bins = arr.reduce((mem, value) => {
        const last = mem[mem.length - 1];
        if (last && last.value === value) {
            last.count++;
        } else {
            mem.push({ value, count: 1 });
        }
        return mem;
    }, []);
    //console.log(bins);

    const centers = bins.map((bin, i) => {
        const centerLocal = Math.floor(bin.count / 2);
        const previousLengths = bins.slice(0, i).reduce((sum, bin) => sum + bin.count, 0);
        return previousLengths + centerLocal;
    });
    centers.unshift(0);
    centers.push(arr.length - 1);
    //console.log(centers);

    return arr.map((value, index) => {
        if (centers.filter((center) => center === index).length) {
            return value;
        }
        const allLower = centers.filter((center) => center <= index);
        const prevCenter = allLower[allLower.length - 1];
        const nextCenter = centers.filter((center) => center > index)[0];
        const progress = (index - prevCenter) / (nextCenter - prevCenter);
        ////////////////console.log(`${progress}%, current: ${index}, prev: ${prevCenter}, next: ${nextCenter}`);
        const lerpedValue = lerp(arr[prevCenter], arr[nextCenter], progress);
        //console.log(lerpedValue);
        return lerpedValue;
    });
}

/**
 * Returns the closest point in the ray to the point provided
 * @param {Ray} ray
 * @param {Vector3} point
 */
export function closestPointInRay(ray, point){

    let closestPoint = new THREE.Vector3();
    closestPoint.subVectors( point, ray.origin );

    let raydirectionNorm = new THREE.Vector3();
    raydirectionNorm.copy(ray.direction).normalize();

    var directionDistance = closestPoint.dot( raydirectionNorm );

    return closestPoint.copy( raydirectionNorm ).multiplyScalar( directionDistance ).add( ray.origin );

}

/*
* This will parse the config file and apply the parameters to the interface
*/
function readConfigFile(file) {

    fetch(file)
        .then(response => {
            if (!response.ok) {
                throw new Error("HTTP error " + response.status);
            }
            return response.json();
        })
        .then(json => {
            this.config = json;
        })
        .catch(function () {
            this.dataError = true;
        })
}