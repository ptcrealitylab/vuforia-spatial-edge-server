var realityElements = [

    // {
    //     name: 'background',
    //     width: 660,
    //     height: 430,
    //     nodes: [
    //     ]
    // },

    /*{
        name: 'sensor-graph',
        width: 304,
        height: 304,
        nodes: [
            'value'
        ]
    },
    {
        name: 'sensor-linear',
        width: 204,
        height: 52,
        nodes: [
            'value'
        ]
    },
    {
        name: 'sensor-digital',
        width: 100,
        height: 100,
        nodes: [
            'value'
        ]
    },*/
    // {
    //     name: 'dancer',
    //     width: 568,
    //     height: 320,
    //     nodes: [
    //     ]
    // },
    // {
    //     name: 'machine-gltf',
    //     width: 568,
    //     height: 320,
    //     nodes: [
    //     ]
    // },
    // {
    //     name: 'sphere',
    //     width: 568,
    //     height: 320,
    //     nodes: [
    //         // {name: 'hue', type: "node"},
    //         // {name: 'saturation', type: "node"},
    //         // {name: 'lightness', type: "node"}
    //     ]
    // },
    // {
    //     name: 'turtle',
    //     width: 568,
    //     height: 320,
    //     nodes: [
    //     ]
    // },
    // {
    //     name: 'videoCapture',
    //     width: 568,
    //     height: 320,
    //     nodes: [
    //         {name: 'play', type: 'node', x: 0, y: -27, scaleFactor: 0.75},
    //         // {name: 'progress', type: 'node'},
    //         // {name: 'next', type: 'node', x: 0, y: 100},
    //         {name: 'next', type: 'node', x: 50, y: 100, scaleFactor: 0.6},
    //         {name: 'prev', type: 'node', x: -50, y: 100, scaleFactor: 0.6},
    //
    //         // {name: 'show', type: 'node', x: 0, y: -200},
    //         // {name: 'hide', type: 'node', x: 0, y: -100},
    //
    //         {name: 'storage', type: 'storeData'}
    //     ]
    // },
    {
        name: 'twoSidedLimiter',
        width: 600,
        height: 505,
        nodes: [
            {name: 'in_out', type: "twoSidedLimiter"}
        ]
    },
    // {
    //     name: 'limiter',
    //     width: 510,
    //     height: 540,
    //     nodes: [
    //         {name: 'in_out', type: "limiter"}
    //     ]
    // },
    {
        name: 'progress',
        width: 275,
        height: 415,
        nodes: [
            {name: 'value', type: "node"}
        ]
    },
    {
        name: 'draw',
        width: 600,
        height: 650,
        nodes: [
            {name: 'storage', type: "storeData"}
        ]
    },
    {
        name: 'switch',
        width: 570,
        height: 270,
        nodes: [
            {name: 'value', type: "node"}
        ]
    },
    // {
    //     name: 'buttonOn',
    //     width: 270,
    //     height: 270,
    //     nodes: [
    //         {name: 'value', type: "node"}
    //     ]
    // },
    // {
    //     name: 'buttonOff',
    //     width: 270,
    //     height: 270,
    //     nodes: [
    //         {name: 'value', type: "node"}
    //     ]
    // },
    {
        name: 'graphUI',
        width: 690,
        height: 410,
        nodes: [
            {name: 'value', type: "node"}
        ]
    },
    // /*
    // {
    //     name: 'skyNews',
    //     width: 660,
    //     height: 430,
    //     nodes: [
    //         {name: 'play', type: "node"}
    //     ]
    // },
    // {
    //     name: 'ptcStockUI',
    //     width: 600,
    //     height: 500,
    //     nodes: [
    //     ]
    // },
    // {
    //     name: 'ptcTwitter',
    //     width: 400,
    //     height: 400,
    //     nodes: [
    //     ]
    // },
    // // */
    // {
    //     name: 'label',
    //     width: 450,
    //     height: 150,
    //     nodes: [
    //         {name: 'storage', type: "storeData"}
    //     ]
    // },
    {
        name: 'count',
        width: 515,
        height: 400,
        nodes: [
            {name: 'count', type: "count"}
        ]
    },
    {
        name: 'slider',
        width: 206,
        height: 526,
        nodes: [
            {name: 'value', type: "node"}
        ]
    },
    // {
    //     name: 'slider-2d',
    //     width: 526,
    //     height: 526,
    //     nodes: [
    //         {name: 'valueX', type: "node"},
    //         {name: 'valueY', type: "node"}
    //     ]
    // },
    {
        name: 'memoryFrame',
        width: 568,
        height: 320,
        nodes: [
            {
                name: 'storage',
                type: "storeData",
                publicData: {
                    memoryInformation: {
                        projectionMatrix: [-1140.395936, 0, 0, 0, 0, -1140.3961199999999, 0, 0, 4.073024, -8.595468, 2.004004, 2, 0, 0, -4.004004, 0],
                        modelViewMatrix: [-0.9880483095065227, -0.0728421900055229, -0.13585026435566017, 0, 0.05879001785290355, -0.9927616034709436, 0.1047322703881485, 0, 0.142495820465779, -0.09549354201547097, -0.985178377649512, 0, 64.7624112284307, -7.980369677572119, 664.8658928307367, 1],
                        objectID: 'stoneTestrmix4u3rq5ve',
                        objectIP: '10.10.10.109'
                    }
                }
            }
        ]
    }
    // {
    //     name: 'pushMe',
    //     width: 600,
    //     height: 600,
    //     nodes: [
    //     ]
    // }
];
