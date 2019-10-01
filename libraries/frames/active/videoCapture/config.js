exports.properties = {
    name: 'videoCapture',
    showInPocket: true,
    tags: ['annotation', 'step', 'video'],
    nodes: [
        { name: 'play', type: 'node', x: 18, y: 11, scaleFactor: 0.75 }, 
        { name: 'next', type: 'node', x: 63, y: 110, scaleFactor: 0.6 },
        { name: 'prev', type: 'node', x: -25, y: 110, scaleFactor: 0.6 },
        { name: 'storage', type: 'storeData' }
    ]
};
