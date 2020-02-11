/*
*  Custom Math operations
*/
class customMaths {

    constructor() {

    }

    radians_to_degrees(radians = 0)
    {
        var pi = Math.PI;
        return radians * (180/pi);
    }

    degrees_to_radians(degrees = 0)
    {
        var pi = Math.PI;
        return degrees * (pi/180);
    }

    distance( a, b )
    {

        //console.log('a: ', a);
        //console.log('b: ', b);

        var dx = a[0] - b[0];
        var dy = a[1] - b[1];

        var distance = Math.sqrt( dx * dx + dy * dy );

        return distance;
    }

    signed_angle(vector1, vector2){

        let angle = Math.atan2(vector2[1], vector2[0]) - Math.atan2(vector1[1], vector1[0]);

        if (angle > Math.PI)        { angle -= 2 * Math.PI; }
        else if (angle <= -Math.PI) { angle += 2 * Math.PI; }

        return angle;

    }
}

exports.CustomMaths = customMaths;