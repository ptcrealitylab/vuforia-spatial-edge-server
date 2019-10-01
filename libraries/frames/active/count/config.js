exports.properties = {
    name: 'count',
    showInPocket: true,
    tags: ['output', 'integer'],
    nodes: [
        { name: 'count', type: 'count', x: -50, y: 0 },
        { name: 'reset', type: 'node', x: 50, y: 0 }
    ]
};
