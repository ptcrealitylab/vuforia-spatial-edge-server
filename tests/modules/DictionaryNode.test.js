import {expect, jest, test, describe} from "@jest/globals";
import BaseNode from "../../libraries/objectDefaultFiles/scene/BaseNode.js";
import DictionaryNode from "../../libraries/objectDefaultFiles/scene/DictionaryNode.js";
import DeleteNode from "../../libraries/objectDefaultFiles/scene/DeleteNode.js";

class MockDictionaryStore {
    mockCreate = jest.fn((_key, _state) => {return new BaseNode("test");});
    mockCast = jest.fn((_key, _old, _state) => {return new BaseNode("test");});
    mockDelete = jest.fn((_key, _old) => {return true;});
    mockApplyChanges = jest.fn((delta, defaultApplyChanges) => {defaultApplyChanges(delta);});

    constructor() {
    }

    create(key, state) {
        return this.mockCreate(key, state);
    }

    cast(key, old, state) {
        return this.mockCast(key, old, state);
    }

    delete(key, old) {
        return this.mockDelete(key, old);
    }

    applyChanges(delta, defaultApplyChanges) {
        this.mockApplyChanges(delta, defaultApplyChanges);
    }
}

class MockFailDictionaryStore {
    mockCreate = jest.fn((_key, _state) => {return undefined;});
    mockCast = jest.fn((_key, _old, _state) => {return undefined;});
    mockDelete = jest.fn((_key, _old) => {return false;});
    mockApplyChanges = jest.fn((delta, defaultApplyChanges) => {defaultApplyChanges(delta);});

    constructor() {
    }

    create(key, state) {
        return this.mockCreate(key, state);
    }

    cast(key, old, state) {
        return this.mockCast(key, old, state);
    }

    delete(key, old) {
        return this.mockDelete(key, old);
    }

    applyChanges(delta, defaultApplyChanges) {
        this.mockApplyChanges(delta, defaultApplyChanges);
    }
}

describe("DictionaryNode", () => {
    const emptyState = {type: "Object.Dictionary", properties: {}};
    const emptyState2Deleted = {type: "Object.Dictionary", properties: {test1: {type: "Deleted"}, test2: {type: "Deleted"}}};
    const state1 = {type: "Object.Dictionary", properties: {test1: {type: "test"}}};
    const state2 = {type: "Object.Dictionary", properties: {test1: {type: "test"}, test2: {type: "test"}}};
    const state1of2deleted = {type: "Object.Dictionary", properties: {test1: {type: "Deleted"}, test2: {type: "test"}}};
    test("constructor", () => {
        expect(() => {new DictionaryNode(new MockDictionaryStore());}).not.toThrow();
    });
    test("constructor sets correct custom type", () => {
        const node = new DictionaryNode(new MockDictionaryStore(), "test");

        expect(node.getType()).toBe("test");
    });
    test("constructor sets listener", () => {
        const listener = new MockDictionaryStore({});
        const node = new DictionaryNode(listener, "test");

        expect(node.getListener()).toBe(listener);
    });
    test("clear with empty properties", () => {
        const node = new DictionaryNode(new MockDictionaryStore());

        node.clear();

        expect(node.getState()).toStrictEqual(emptyState);
    });
    test("clear with empty properties does not set node dirty", () => {
        const node = new DictionaryNode(new MockDictionaryStore());

        node.clear();

        expect(node.isDirty()).toBe(false);
    });
    test("clear with properties", () => {
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", new BaseNode("test"));
        node.set("test2", new BaseNode("test"));

        node.clear();

        expect(node.getState()).toStrictEqual(emptyState2Deleted);
    });
    test("clear with properties sets node dirty", () => {
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", new BaseNode("test"));
        node.set("test2", new BaseNode("test"));
        node.getChanges();

        node.clear();

        expect(node.isDirty()).toBe(true);
    });
    test("delete with empty properties", () => {
        const node = new DictionaryNode(new MockDictionaryStore());

        node.delete("test");

        expect(node.getState()).toStrictEqual(emptyState);
    });
    test("delete with empty properties does not set node dirty", () => {
        const node = new DictionaryNode(new MockDictionaryStore());

        node.delete("test");

        expect(node.isDirty()).toBe(false);
    });
    test("delete with missing property", () => {
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", new BaseNode("test"));
        node.set("test2", new BaseNode("test"));

        node.delete("test");

        expect(node.getState()).toStrictEqual(state2);
    });
    test("delete with properties", () => {
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", new BaseNode("test"));
        node.set("test2", new BaseNode("test"));

        node.delete("test1");

        expect(node.getState()).toStrictEqual(state1of2deleted);
    });
    test("delete with properties previously deleted", () => {
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", new BaseNode("test"));
        node.set("test2", new BaseNode("test"));
        node.delete("test1");

        node.delete("test1");

        expect(node.getState()).toStrictEqual(state1of2deleted);
    });
    test("delete with properties sets node dirty", () => {
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", new BaseNode("test"));
        node.set("test2", new BaseNode("test"));
        node.getChanges();

        node.delete("test1");

        expect(node.isDirty()).toBe(true);
    });
    test("entries with no properties", () => {
        const node = new DictionaryNode(new MockDictionaryStore());

        expect(node.entries()).toHaveLength(0);
    });
    test("entries with properties", () => {
        const child = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test", child);

        expect(node.entries()).toStrictEqual([["test", child]]);
    });
    test("entries with deleted properties", () => {
        const child = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test", child);
        node.set("deleted", new DeleteNode());

        expect(node.entries()).toStrictEqual([["test", child]]);
    });
    test("forEach with no properties", () => {
        const node = new DictionaryNode(new MockDictionaryStore());
        const mockCallback = jest.fn((_value, _key, _map) => {});

        node.forEach(mockCallback);

        expect(mockCallback).not.toHaveBeenCalled();
    });
    test("forEach with properties", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child1);
        node.set("test2", child2);
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
    test("forEach with deleted properties", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child1);
        node.set("test2", child2);
        node.set("deleted", new DeleteNode());
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
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child1);
        node.set("test2", child2);
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
        const node = new DictionaryNode(new MockDictionaryStore());

        expect(node.has("test2")).toBe(false);
    });
    test("has with properties but missing property", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child1);
        node.set("test2", child2);

        expect(node.has("test3")).toBe(false);
    });
    test("has with properties", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child1);
        node.set("test2", child2);

        expect(node.has("test2")).toBe(true);
    });
    test("has with property deleted", () => {
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", new DeleteNode());

        expect(node.has("test1")).toBe(false);
    });
    test("keys with no properties", () => {
        const node = new DictionaryNode(new MockDictionaryStore());

        expect(node.keys()).toStrictEqual([]);
    });
    test("keys with properties", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child1);
        node.set("test2", child2);

        expect(node.keys()).toStrictEqual(["test1", "test2"]);
    });
    test("keys with property deleted", () => {
        const child1 = new BaseNode("test");
        const child2 = new DeleteNode();
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child1);
        node.set("test2", child2);

        expect(node.keys()).toStrictEqual(["test1"]);
    });
    test("set new property", () => {
        const child1 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());

        node.set("test1", child1);

        expect(node.getState()).toStrictEqual(state1);
    });
    test("set new property sets node dirty", () => {
        const child1 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());

        node.set("test1", child1);

        expect(node.isDirty()).toBe(true);
    });
    test("set new property sets child dirty", () => {
        const child1 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());

        node.set("test1", child1);

        expect(child1.isDirty()).toBe(true);
    });
    test("set new property (makeDirty false) doesn't set node dirty", () => {
        const child1 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());

        node.set("test1", child1, false);

        expect(node.isDirty()).toBe(false);
    });
    test("set new property (makeDirty false) deosn't set child dirty", () => {
        const child1 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());

        node.set("test1", child1, false);

        expect(child1.isDirty()).toBe(false);
    });
    test("set existing property", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child2);

        node.set("test1", child1);

        expect(node.getState()).toStrictEqual(state1);
    });
    test("set existing property sets node dirty", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child2);
        node.getChanges();

        node.set("test1", child1);

        expect(node.isDirty()).toBe(true);
    });
    test("set existing property sets child dirty", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child2);
        node.getChanges();

        node.set("test1", child1);

        expect(child1.isDirty()).toBe(true);
    });
    test("values with no properties", () => {
        const node = new DictionaryNode(new MockDictionaryStore());

        expect(node.values()).toStrictEqual([]);
    });
    test("values with properties", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child1);
        node.set("test2", child2);

        expect(node.values()).toStrictEqual([child1, child2]);
    });
    test("values with property deleted", () => {
        const child1 = new BaseNode("test");
        const child2 = new DeleteNode();
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child1);
        node.set("test2", child2);

        expect(node.values()).toStrictEqual([child1]);
    });
    test("get state when node dirty", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child1);
        node.set("test2", child2);

        expect(node.getState()).toStrictEqual(state2);
    });
    test("get state includes delete node", () => {
        const child1 = new DeleteNode();
        const child2 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child1);
        node.set("test2", child2);

        expect(node.getState()).toStrictEqual(state1of2deleted);
    });
    test("get state when node not dirty", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child1);
        node.set("test2", child2);
        node.getChanges();

        expect(node.getState()).toStrictEqual(state2);
    });
    test("set state empty, clears dictionary", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child1);
        node.set("test2", child2);

        node.setState({type: DictionaryNode.TYPE, properties: {}});

        expect(node.getState()).toStrictEqual(emptyState);
    });
    test("set state with new properties", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());

        node.setState({type: DictionaryNode.TYPE, properties: {"test1": child1.getState(), "test2": child2.getState()}});

        expect(node.getState()).toStrictEqual(state2);
    });
    test("set state with property cast", () => {
        const child1 = new BaseNode("test1");
        const child2 = new BaseNode("test1");
        const newChild1 = new BaseNode("test");
        const newChild2 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child1);
        node.set("test2", child2);

        node.setState({type: DictionaryNode.TYPE, properties: {"test1": newChild1.getState(), "test2": newChild2.getState()}});

        expect(node.getState()).toStrictEqual(state2);
    });
    test("set state with property with same types", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const newChild1 = new BaseNode("test");
        const newChild2 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child1);
        node.set("test2", child2);

        node.setState({type: DictionaryNode.TYPE, properties: {"test1": newChild1.getState(), "test2": newChild2.getState()}});

        expect(node.getState()).toStrictEqual(state2);
        expect(node.get("test1")).toBe(child1);
        expect(node.get("test2")).toBe(child2);
    });
    test("set state with property without type updates properties", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child1);
        node.set("test2", child2);

        node.setState({type: DictionaryNode.TYPE, properties: {"test1": {}, "test2": {}}});

        expect(node.getState()).toStrictEqual(state2);
        expect(node.get("test1")).toBe(child1);
        expect(node.get("test2")).toBe(child2);
    });
    test("get changes when node dirty", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child1);
        node.set("test2", child2);
        node.setTypeDirty();

        expect(node.getChanges()).toStrictEqual(state2);
    });
    test("get changes includes delete node", () => {
        const child1 = new DeleteNode();
        const child2 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child1);
        node.set("test2", child2);
        node.setTypeDirty();

        expect(node.getChanges()).toStrictEqual(state1of2deleted);
    });
    test("get changes when node not dirty", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child1);
        node.set("test2", child2);
        node.getChanges();

        expect(node.getChanges()).toStrictEqual({});
    });
    test("get changes with one child dirty", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child1);
        node.set("test2", child2);
        node.getChanges();
        child1.setTypeDirty();

        expect(node.getChanges()).toStrictEqual({properties: {"test1": {type: "test"}}});
    });
    test("set changes with empty changeset changes nothing", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child1);
        node.set("test2", child2);

        node.setChanges({type: DictionaryNode.TYPE, properties: {}});

        expect(node.getState()).toStrictEqual(state2);
    });
    test("set changes with new properties", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());

        node.setChanges({type: DictionaryNode.TYPE, properties: {test1: child1.getState(), test2: child2.getState()}});

        expect(node.getState()).toStrictEqual(state2);
    });
    test("set changes with property cast", () => {
        const child1 = new BaseNode("test1");
        const child2 = new BaseNode("test1");
        const newChild1 = new BaseNode("test");
        const newChild2 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child1);
        node.set("test2", child2);

        node.setChanges({type: DictionaryNode.TYPE, properties: {test1: newChild1.getState(), test2: newChild2.getState()}});

        expect(node.getState()).toStrictEqual(state2);
    });
    test("set changes of existing properties with same type", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const newChild1 = new BaseNode("test");
        const newChild2 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child1);
        node.set("test2", child2);

        node.setChanges({type: DictionaryNode.TYPE, properties: {test1: newChild1.getState(), test2: newChild2.getState()}});

        expect(node.getState()).toStrictEqual(state2);
        expect(node.get("test1")).toBe(child1);
        expect(node.get("test2")).toBe(child2);
    });
    test("set changes of existing properties without type info", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child1);
        node.set("test2", child2);

        node.setChanges({type: DictionaryNode.TYPE, properties: {test1: {}, test2: {}}});

        expect(node.getState()).toStrictEqual(state2);
        expect(node.get("test1")).toBe(child1);
        expect(node.get("test2")).toBe(child2);
    });
    test("set changes with deleted properties", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child1);
        node.set("test2", child2);

        node.setChanges({type: DictionaryNode.TYPE, properties: {test2: new DeleteNode().getState()}});

        expect(node.getState()).toStrictEqual(state1);
    });
    test("set changes with no properties", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new DictionaryNode(new MockDictionaryStore());
        node.set("test1", child1);
        node.set("test2", child2);

        node.setChanges({type: DictionaryNode.TYPE});

        expect(node.getState()).toStrictEqual(state2);
    });
    test("set changes with deleted properties, fail", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new DictionaryNode(new MockFailDictionaryStore());
        node.set("test1", child1);
        node.set("test2", child2);

        node.setChanges({type: DictionaryNode.TYPE, properties: {"test1": new DeleteNode().getState()}});

        expect(node.getState()).toStrictEqual(state2);
    });
    test("set changes with property cast, fail", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const newChild1 = new BaseNode("test1");
        const newChild2 = new BaseNode("test1");
        const node = new DictionaryNode(new MockFailDictionaryStore());
        node.set("test1", child1);
        node.set("test2", child2);

        node.setChanges({type: DictionaryNode.TYPE, properties: {test1: newChild1.getState(), test2: newChild2.getState()}});

        expect(node.getState()).toStrictEqual(state2);
    });
    test("set changes with new properties, fail", () => {
        const child1 = new BaseNode("test");
        const child2 = new BaseNode("test");
        const node = new DictionaryNode(new MockFailDictionaryStore());

        node.setChanges({type: DictionaryNode.TYPE, properties: {test1: child1.getState(), test2: child2.getState()}});

        expect(node.getState()).toStrictEqual({type: DictionaryNode.TYPE, properties: {}});
    });
    test("set changes with new delete properties, doesn't create new properties", () => {
        const node = new DictionaryNode(new MockFailDictionaryStore());

        node.setChanges({type: DictionaryNode.TYPE, properties: {test1: {type: DeleteNode.TYPE}, test2: {type: DeleteNode.TYPE}}});

        expect(node.getState()).toStrictEqual({type: DictionaryNode.TYPE, properties: {}});
    });
});
