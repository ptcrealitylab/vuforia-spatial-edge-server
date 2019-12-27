exports.properties = {
    name: 'sphere',
    showInPocket: true,
    tags: ['3d', 'output'],
    nodes: [
        { name: 'hue', type: 'node', x: -50, y: -50, defaultValue: 0 },
        { name: 'saturation', type: 'node', x: 0, y: 0, defaultValue: 0.75 },
        { name: 'lightness', type: 'node', x: 50, y: 50, defaultValue: 0.6 }
    ]
};
