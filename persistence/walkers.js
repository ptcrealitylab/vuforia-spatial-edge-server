/* global expect */

async function synchronize(fsBase, fsTarget, root) {
    let ents = await fsBase.readdir(root, {
        withFileTypes: true,
    });

    for (let ent of ents) {
        const path = root + '/' + ent.name;
        if (ent.isDirectory()) {
            await fsTarget.mkdir(path, {recursive: true});
            await synchronize(fsBase, fsTarget, path);
            continue;
        }
        const contents = await fsBase.readFile(path);
        await fsTarget.writeFile(path, contents);
    }
}

exports.synchronize = synchronize;

function entsToObj(ents) {
    return ents.map(ent => {
        return {
            name: ent.name,
            isFile: ent.isFile(),
            isDirectory: ent.isDirectory(),
        };
    });
}

async function verifyEqual(fsBase, fsTarget, root) {
    let entsBase = entsToObj(await fsBase.readdir(root, {
        withFileTypes: true,
    }));
    let entsTarget = entsToObj(await fsBase.readdir(root, {
        withFileTypes: true,
    }));

    expect(entsTarget).toEqual(entsBase);

    for (let ent of entsBase) {
        const path = root + '/' + ent.name;
        if (ent.isDirectory()) {
            await verifyEqual(fsBase, fsTarget, path);
            continue;
        }
        const contentsBase = await fsBase.readFile(path);
        const contentsTarget = await fsTarget.readFile(path);
        expect(contentsTarget).toEqual(contentsBase);
    }
}

exports.verifyEqual = verifyEqual;
