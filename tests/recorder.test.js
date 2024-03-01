/* global test, expect */

const recorder = require('../libraries/recorder.js');
const objects = {
    a: [1, 2, 3, 4],
    b: [5, 6, 7, 8],
};

const timeObject = {
    "1": {
        "a": [
            1,
            2,
            3,
            4
        ],
        "b": [
            5,
            6,
            7,
            8
        ]
    },
    "2": {
        "a": [
            null,
            12
        ]
    },
    "3": {
        "c": [
            1,
            2,
            null,
            3
        ]
    }
};

test('recorder diff and replay', async () => {
    recorder.initRecorder(objects);
    recorder.clearIntervals();

    // Initial state
    recorder.saveState(0);
    const expectedTimeObject = {
        '0': { a: [ 1, 2, 3, 4 ], b: [ 5, 6, 7, 8 ] }
    };
    expect(recorder.timeObject).toEqual(expectedTimeObject);

    // 2 -> 12
    objects.a[1] = 12;
    recorder.saveState(1);

    expectedTimeObject[1] = { a: [ undefined, 12 ] };
    expect(recorder.timeObject).toEqual(expectedTimeObject);

    // Delete b
    delete objects.b;
    recorder.saveState(2);
    // No modification, deletions aren't reflected in diff
    expect(recorder.timeObject).toEqual(expectedTimeObject);

    // Delete a, create c
    delete objects.a;
    objects.c = [1, 2, null, 3, {asdf: {fdsa: 2, qwer: ['huh'], wer: 'yes'}}];
    recorder.saveState(3);

    expectedTimeObject[3] = {
        c: [
            1,
            2,
            undefined, // notably not null (expected behavior of recorder :/ )
            3,
            { asdf: { fdsa: 2, qwer: [ 'huh' ], wer: 'yes' } }
        ]
    };
    expect(recorder.timeObject).toEqual(expectedTimeObject);

    // Do nothing
    recorder.saveState(4);
    expect(recorder.timeObject).toEqual(expectedTimeObject);

    // Round-trip (sans deletion) through replay
    const replayedObjects = recorder.replay(recorder.timeObject, 10, null);
    expect(replayedObjects).toEqual({
        a: [1, 12, 3, 4],
        b: [5, 6, 7, 8],
        c: [
            1,
            2,
            undefined,
            3,
            { asdf: { fdsa: 2, qwer: [ 'huh' ], wer: 'yes' } }
        ],
    });
});

test('recorder replay', async () => {
    let replayedObjects = recorder.replay(timeObject, 10, null);
    console.dir(replayedObjects, {depth: null});
    expect(replayedObjects).toEqual({
        a: [ 1, 12, 3, 4 ],
        b: [ 5, 6, 7, 8 ],
        c: [ 1, 2, undefined, 3 ]
    });
});
