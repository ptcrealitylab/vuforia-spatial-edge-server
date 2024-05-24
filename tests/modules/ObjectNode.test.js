import {expect, jest, test, describe} from "@jest/globals";
import BaseNode from "../../libraries/objectDefaultFiles/scene/BaseNode.js";
import ObjectNode from "../../libraries/objectDefaultFiles/scene/ObjectNode.js";

class MockObjectStore {
    mockGetProperties = jest.fn((_thisNode) => {return this.#properties;});
    mockApplyChanges = jest.fn((delta, defaultApplyChanges) => {defaultApplyChanges(delta);});

    #properties;

    constructor(properties) {
        this.#properties = properties;
    }

    getProperties(thisNode) {
        return this.mockGetProperties(thisNode);
    }

    applyChanges(delta, defaultApplyChanges) {
        this.mockApplyChanges(delta, defaultApplyChanges);
    }
}

describe("ObjectNode", () => {
    const objectStateNoProp = {type: "test", properties: {}};
    const objectState2 = {type: "test", properties: {test1: {type: "test"}, test2: {type: "test"}}};
    const objectStateNoPropDelta = {properties: {}};
    const objectState2Delta = {properties: {test1: {type: "test"}, test2: {type: "test"}}};
    const objectState1of2Delta = {properties: {test1: {type: "test"}}};
    const objectState2ChangedTypeDelta = {properties: {test1: {type: "test1"}, test2: {type: "test1"}}};
    test("constructor", () => {
        expect(() => {new ObjectNode(new MockObjectStore({}), "test");}).not.toThrow();
    });
    test("constructor calls getproperties with correct thisNode", () => {
        const listener = new MockObjectStore({});

        const node = new ObjectNode(listener, "test");

        expect(listener.mockGetProperties).toBeCalled();
        expect(listener.mockGetProperties.mock.calls[0][0]).toBe(node);
    });
    test("constructor sets properties", () => {
        const child = new BaseNode("test");
        const node = new ObjectNode(new MockObjectStore({test: child}), "test");

        expect(node.get("test")).toBe(child);
    });
    test("constructor sets property's parent", () => {
        const child = new BaseNode("test");
        const node = new ObjectNode(new MockObjectStore({test: child}), "test");

        expect(node.get("test").getParent()).toBe(node);
    });
    test("constructor sets listener", () => {
        const listener = new MockObjectStore({});
        const node = new ObjectNode(listener, "test");

        expect(node.getListener()).toBe(listener);
    });
    test("constructor sets correct custom type", () => {
        const node = new ObjectNode(new MockObjectStore({}), "test");

        expect(node.getType()).toBe("test");
    });
    test("entries with no properties", () => {
        const node = new ObjectNode(new MockObjectStore({}), "test");

        expect(node.entries()).toHaveLength(0);
    });
    test("entries with properties", () => {
        const child = new BaseNode("test");
        const node = new ObjectNode(new MockObjectStore({test: child}), "test");

        expect(node.entries()).toStrictEqual([["test", child]]);
    });
    test("forEach with no properties", () => {
        const node = new ObjectNode(new MockObjectStore({}), "test");
        const mockCallback = jest.fn((_value, _key, _map) => {});

        node.forEach(mockCallback);

        expect(mockCallback).not.toHaveBeenCalled();
    });
    test("forEach with properties", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new ObjectNode(new MockObjectStore({test1: child1, test2: child2}), "test");
        const mockCallback = jest.fn((_value, _key, _map) => {});

        node.forEach(mockCallback);

        expect(mockCallback.mock.calls).toHaveLength(2);
        expect(mockCallback.mock.calls[0][0]).toBe(child1);
        expect(mockCallback.mock.calls[0][1]).toBe("test1");
        expect(mockCallback.mock.calls[0][2]).toBe(node);
        expect(mockCallback.mock.calls[1][0]).toBe(child2);
        expect(mockCallback.mock.calls[1][1]).toBe("test2");
        expect(mockCallback.mock.calls[1][2]).toBe(node);
    });
    test("forEach with properties with custom this", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new ObjectNode(new MockObjectStore({test1: child1, test2: child2}), "test");
        const obj = {func: jest.fn((_value, _key, _map) => {})};

        node.forEach(obj.func, obj);

        expect(obj.func.mock.calls).toHaveLength(2);
        expect(obj.func.mock.calls[0][0]).toBe(child1);
        expect(obj.func.mock.calls[0][1]).toBe("test1");
        expect(obj.func.mock.calls[0][2]).toBe(node);
        expect(obj.func.mock.calls[1][0]).toBe(child2);
        expect(obj.func.mock.calls[1][1]).toBe("test2");
        expect(obj.func.mock.calls[1][2]).toBe(node);
    });
    test("has with no properties", () => {
        const node = new ObjectNode(new MockObjectStore({}), "test");

        expect(node.has("test2")).toBe(false);
    });
    test("has with properties but missing property", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new ObjectNode(new MockObjectStore({test1: child1, test2: child2}), "test");

        expect(node.has("test3")).toBe(false);
    });
    test("has with properties", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new ObjectNode(new MockObjectStore({test1: child1, test2: child2}), "test");

        expect(node.has("test2")).toBe(true);
    });
    test("keys with no properties", () => {
        const node = new ObjectNode(new MockObjectStore({}), "test");

        expect(node.keys()).toStrictEqual([]);
    });
    test("keys with properties", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new ObjectNode(new MockObjectStore({test1: child1, test2: child2}), "test");

        expect(node.keys()).toStrictEqual(["test1", "test2"]);
    });
    test("values with no properties", () => {
        const node = new ObjectNode(new MockObjectStore({}), "test");

        expect(node.values()).toStrictEqual([]);
    });
    test("values with properties", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new ObjectNode(new MockObjectStore({test1: child1, test2: child2}), "test");

        expect(node.values()).toStrictEqual([child1, child2]);
    });
    test("set dirty sets node dirty", () => {
        const node = new ObjectNode(new MockObjectStore({}), "test");

        node.setDirty();

        expect(node.isDirty()).toBe(true);
    });
    test("getState with no properties", () => {
        const node = new ObjectNode(new MockObjectStore({}), "test");
        node.setDirty();

        const state = node.getState();

        expect(state).toStrictEqual(objectStateNoProp);
    });
    test("getState with properties", () => {
        const node = new ObjectNode(new MockObjectStore({test1: new BaseNode("test"), test2: new BaseNode("test")}), "test");
        node.setDirty();

        const state = node.getState();

        expect(state).toStrictEqual(objectState2);
    });
    test("getState with properties while node not dirty", () => {
        const node = new ObjectNode(new MockObjectStore({test1: new BaseNode("test"), test2: new BaseNode("test")}), "test");

        const state = node.getState();

        expect(state).toStrictEqual(objectState2);
    });
    test("setState can't add properties", () => {
        const node = new ObjectNode(new MockObjectStore({}), "test");

        expect(() => {node.setState(objectState2);}).toThrow();
    });
    test("setState can't change property type", () => {
        const node = new ObjectNode(new MockObjectStore({test1: new BaseNode("test"), test2: new BaseNode("test")}), "test");

        expect(() => {node.setState(objectState2ChangedTypeDelta);}).toThrow();
    });
    test("setState can't remove property", () => {
        const node = new ObjectNode(new MockObjectStore({test1: new BaseNode("test"), test2: new BaseNode("test"), test3: new BaseNode("test")}), "test");

        expect(() => {node.setState(objectState2Delta);}).toThrow();
    });
    test("setState changes properties", () => {
        const mock1 = new MockObjectStore({});
        const mock2 = new MockObjectStore({});
        const child1 = new ObjectNode(mock1, "test");
        const child2 = new ObjectNode(mock2, "test");
        const node = new ObjectNode(new MockObjectStore({test1: child1, test2: child2}), "test");

        node.setState(objectState2);

        expect(mock1.mockApplyChanges).toHaveBeenCalled();
        expect(mock2.mockApplyChanges).toHaveBeenCalled();
    });
    test("getChanges with no properties", () => {
        const node = new ObjectNode(new MockObjectStore({}), "test");
        node.setDirty();

        const delta = node.getChanges();

        expect(delta).toStrictEqual(objectStateNoPropDelta);
    });
    test("getChanges with properties", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new ObjectNode(new MockObjectStore({test1: child1, test2: child2}), "test");
        child1.setParent(node);
        child2.setParent(node);
        child1.setTypeDirty();
        child2.setTypeDirty();

        const delta = node.getChanges();

        expect(delta).toStrictEqual(objectState2Delta);
    });
    test("getChanges only returns changes", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new ObjectNode(new MockObjectStore({test1: child1, test2: child2}), "test");
        child1.setParent(node);
        child2.setParent(node);
        child1.setTypeDirty();

        const delta = node.getChanges();

        expect(delta).toStrictEqual(objectState1of2Delta);
    });
    test("getChanges with properties while node not dirty", () => {
        const node = new ObjectNode(new MockObjectStore({test1: new BaseNode("test"), test2: new BaseNode("test")}), "test");

        const delta = node.getChanges();

        expect(delta).toStrictEqual({});
    });
    test("setChanges can't add properties", () => {
        const node = new ObjectNode(new MockObjectStore({}), "test");

        expect(() => {node.setChanges(objectState2);}).toThrow();
    });
    test("setChanges can't change property type", () => {
        const node = new ObjectNode(new MockObjectStore({test1: new BaseNode("test"), test2: new BaseNode("test")}), "test");

        expect(() => {node.setChanges(objectState2ChangedTypeDelta);}).toThrow();
    });
    test("setChanges changes properties", () => {
        const mock1 = new MockObjectStore({});
        const mock2 = new MockObjectStore({});
        const child1 = new ObjectNode(mock1, "test");
        const child2 = new ObjectNode(mock2, "test");
        const node = new ObjectNode(new MockObjectStore({test1: child1, test2: child2}), "test");

        node.setChanges(objectState2);

        expect(mock1.mockApplyChanges).toHaveBeenCalled();
        expect(mock2.mockApplyChanges).toHaveBeenCalled();
    });
    test("setChildrenDirty sets children dirty", () => {
        const mock1 = new MockObjectStore({});
        const mock2 = new MockObjectStore({});
        const child1 = new ObjectNode(mock1, "test");
        const child2 = new ObjectNode(mock2, "test");
        const node = new ObjectNode(new MockObjectStore({test1: child1, test2: child2}), "test");

        ObjectNode.setChildrenDirty(node);

        expect(child1.isDirty()).toBe(true);
        expect(child2.isDirty()).toBe(true);
    });
    test("setChildrenDirty sets children without forEach dirty", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new ObjectNode(new MockObjectStore({test1: child1, test2: child2}), "test");

        ObjectNode.setChildrenDirty(node);

        expect(child1.isDirty()).toBe(true);
        expect(child2.isDirty()).toBe(true);
    });
    test("setChildrenDirty sets children's children dirty", () => {
        const mock1 = new MockObjectStore({});
        const child1 = new ObjectNode(mock1, "test");
        const mock2 = new MockObjectStore({test1: child1});
        const child2 = new ObjectNode(mock2, "test");
        const node = new ObjectNode(new MockObjectStore({test2: child2}), "test");

        ObjectNode.setChildrenDirty(node);

        expect(child1.isDirty()).toBe(true);
        expect(child2.isDirty()).toBe(true);
    });
    test("setChildrenDirty sets children type dirty", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new ObjectNode(new MockObjectStore({test1: child1, test2: child2}), "test");

        node.setDirty();
        ObjectNode.setChildrenDirty(node);

        expect(node.getState()).toStrictEqual(objectState2);
    });
});
