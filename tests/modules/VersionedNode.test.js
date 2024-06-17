import {expect, jest, test, describe} from "@jest/globals";
import BaseNode from "../../libraries/objectDefaultFiles/scene/BaseNode.js";
import VersionedNode from "../../libraries/objectDefaultFiles/scene/VersionedNode.js";

class MockNode extends BaseNode {
    mockSetDirty = jest.fn(() => {});
    mockSetInternalDirty = jest.fn(() => {});

    #properties;

    constructor() {
        super("mock");
        this.#properties = {};
    }

    setProperties(properties) {
        this.#properties = properties;
    }

    entries() {
        return Object.entries(this.#properties);
    }

    /**
     * @override
     */
    setDirty() {
        this.mockSetDirty();
    }

    /**
     * @override
     */
    setInternalDirty() {
        this.mockSetInternalDirty();
    }
}

describe("VersionedNode", () => {
    const valueState = {type: VersionedNode.TYPE, value: 0, version: 0};
    const valueState1 = {type: VersionedNode.TYPE, value: 1, version: 1};
    const valueStateNoType = {value: 0, version: 0};
    const emptyState = {};
    test("constructor", () => {
        expect(() => {new VersionedNode(0);}).not.toThrow();
    });
    test("constructor with type", () => {
        expect(() => {new VersionedNode(0, "test");}).not.toThrow();
    });
    test("constructor sets correct value", () => {
        const node = new VersionedNode(0);

        expect(node.value).toBe(0);
    });
    test("constructor sets correct type", () => {
        const node = new VersionedNode(0);

        expect(node.getType()).toBe(VersionedNode.TYPE);
    });
    test("constructor sets correct custom type", () => {
        const node = new VersionedNode(0, "test");

        expect(node.getType()).toBe("test");
    });
    test("constructor initializes version", () => {
        const node = new VersionedNode(0, "test");

        expect(node.getState().version).toBe(-1);
    });
    test("setValue sets value", () => {
        const node = new VersionedNode(0);

        node.value = 1;

        expect(node.value).toBe(1);
    });
    test("setValue sets node dirty", () => {
        const node = new VersionedNode(0);

        node.value = 1;

        expect(node.isDirty()).toBe(true);
    });
    test("setValue sets parent node dirty", () => {
        const parent = new MockNode();
        const node = new VersionedNode(0, "test");
        node.setParent(parent);

        node.value = 1;

        expect(parent.mockSetInternalDirty).toHaveBeenCalled();
    });
    test("setValue increments version", () => {
        const node = new VersionedNode(0);

        node.value = 1;

        expect(node.getState().version).toBe(0);
    });
    test("incrementVersion increments version", () => {
        const node = new VersionedNode(0);

        node.incrementVersion();

        expect(node.getState().version).toBe(0);
    });
    test("incrementVersion sets node dirty", () => {
        const node = new VersionedNode(0);

        node.incrementVersion();

        expect(node.isDirty()).toBe(true);
    });
    test("return correct state when dirty", () => {
        const node = new VersionedNode(0);
        node.incrementVersion();

        expect(node.getState()).toStrictEqual(valueState);
    });
    test("return correct state when not dirty", () => {
        const node = new VersionedNode(0, VersionedNode.TYPE, 0);

        expect(node.getState()).toStrictEqual(valueState);
    });
    test("set correct state when dirty", () => {
        const node = new VersionedNode(0);
        node.incrementVersion();

        node.setState(valueState);

        expect(node.getState()).toStrictEqual(valueState);
    });
    test("set correct state when not dirty", () => {
        const node = new VersionedNode(1);
        node.getChanges();

        node.setState(valueState);

        expect(node.getState()).toStrictEqual(valueState);
    });
    test("return correct state when only value dirty", () => {
        const node = new VersionedNode(0, VersionedNode.TYPE, 0);
        node.setDirty();

        expect(node.getState()).toStrictEqual(valueState);
    });
    test("return correct changes when dirty", () => {
        const node = new VersionedNode(0);
        node.incrementVersion();
        node.setTypeDirty();

        expect(node.getChanges()).toStrictEqual(valueState);
    });
    test("return correct changes when not dirty", () => {
        const node = new VersionedNode(0);

        expect(node.getChanges()).toStrictEqual(emptyState);
    });
    test("return correct changes when only value dirty", () => {
        const node = new VersionedNode(0, VersionedNode.TYPE, 0);
        node.setDirty();

        expect(node.getChanges()).toStrictEqual(valueStateNoType);
    });
    test("get changes sets dirty false", () => {
        const node = new VersionedNode(0);

        node.getChanges();

        expect(node.isDirty()).toBe(false);
    });
    test("set correct changes", () => {
        const node = new VersionedNode(1);

        node.setChanges(valueState);

        expect(node.getState()).toStrictEqual(valueState);
    });
    test("skip changes version is not higher", () => {
        const node = new VersionedNode(1);
        node.incrementVersion();
        node.incrementVersion();

        node.setChanges(valueState);

        expect(node.getState()).toStrictEqual(valueState1);
    });
    test("set correct changes empty", () => {
        const node = new VersionedNode(0);
        node.setTypeDirty();
        node.incrementVersion();

        node.setChanges(emptyState);

        expect(node.getState()).toStrictEqual(valueState);
    });
    test("set changes does not set dirty true", () => {
        const node = new VersionedNode(1);
        node.getChanges();

        node.setChanges(valueState);

        expect(node.isDirty()).toBe(false);
    });
});
