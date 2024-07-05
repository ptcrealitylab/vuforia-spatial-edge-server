import {expect, jest, test, describe} from "@jest/globals";
import BaseNode from "../../libraries/objectDefaultFiles/scene/BaseNode.js";
import ValueNode from "../../libraries/objectDefaultFiles/scene/ValueNode.js";

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

describe("ValueNode", () => {
    const valueState = {type: ValueNode.TYPE, value: 0};
    const valueStateNoType = {value: 0};
    const emptyState = {};
    test("constructor", () => {
        expect(() => {new ValueNode(0);}).not.toThrow();
    });
    test("constructor with type", () => {
        expect(() => {new ValueNode(0, "test");}).not.toThrow();
    });
    test("constructor sets correct value", () => {
        const node = new ValueNode(0);

        expect(node.value).toBe(0);
    });
    test("constructor sets correct type", () => {
        const node = new ValueNode(0);

        expect(node.getType()).toBe(ValueNode.TYPE);
    });
    test("constructor sets correct custom type", () => {
        const node = new ValueNode(0, "test");

        expect(node.getType()).toBe("test");
    });
    test("constructor set onChanged to null", () => {
        const node = new ValueNode(0);

        expect(node.onChanged).toBeNull();
    });
    test("setValue sets value", () => {
        const node = new ValueNode(0);

        node.value = 1;

        expect(node.value).toBe(1);
    });
    test("setValue sets node dirty", () => {
        const node = new ValueNode(0);

        node.value = 1;

        expect(node.isDirty()).toBe(true);
    });
    test("setValue sets parent node dirty", () => {
        const parent = new MockNode();
        const node = new ValueNode(0);
        node.parent = parent;

        node.value = 1;

        expect(parent.mockSetInternalDirty).toHaveBeenCalled();
    });
    test("return correct state when dirty", () => {
        const node = new ValueNode(0);

        expect(node.getState()).toStrictEqual(valueState);
    });
    test("return correct state when not dirty", () => {
        const node = new ValueNode(0);

        expect(node.getState()).toStrictEqual(valueState);
    });
    test("set correct state when dirty", () => {
        const node = new ValueNode(1);

        node.setState(valueState);

        expect(node.getState()).toStrictEqual(valueState);
    });
    test("set correct state when not dirty", () => {
        const node = new ValueNode(1);
        node.getChanges();

        node.setState(valueState);

        expect(node.getState()).toStrictEqual(valueState);
    });
    test("return correct state when only value dirty", () => {
        const node = new ValueNode(0);
        node.setDirty();

        expect(node.getState()).toStrictEqual(valueState);
    });
    test("return correct changes when dirty", () => {
        const node = new ValueNode(0);
        node.setTypeDirty();
        node.setDirty();

        expect(node.getChanges()).toStrictEqual(valueState);
    });
    test("return correct changes when not dirty", () => {
        const node = new ValueNode(0);

        expect(node.getChanges()).toStrictEqual(emptyState);
    });
    test("return correct changes when only value dirty", () => {
        const node = new ValueNode(0);
        node.setDirty();

        expect(node.getChanges()).toStrictEqual(valueStateNoType);
    });
    test("get changes sets dirty false", () => {
        const node = new ValueNode(0);

        node.getChanges();

        expect(node.isDirty()).toBe(false);
    });
    test("set correct changes", () => {
        const node = new ValueNode(1);

        node.setChanges(valueState);

        expect(node.getState()).toStrictEqual(valueState);
    });
    test("set correct changes empty", () => {
        const node = new ValueNode(0);
        node.getChanges();

        node.setChanges(emptyState);

        expect(node.getState()).toStrictEqual(valueState);
    });
    test("set changes does not set dirty true", () => {
        const node = new ValueNode(1);
        node.getChanges();

        node.setChanges(valueState);

        expect(node.isDirty()).toBe(false);
    });
    test("set internal dirty sets dirty true", () => {
        const node = new ValueNode(1);

        node.setInternalDirty();

        expect(node.isDirty()).toBe(true);
    });
    test("set dirty sets internal dirty true", () => {
        const node = new ValueNode(1);

        node.setDirty();

        expect(node.isInternalDirty()).toBe(true);
    });
    test("set onChanged callback sets callback", () => {
        const node = new ValueNode(0);
        const func = jest.fn((_node) => {});

        node.onChanged = func;

        expect(node.onChanged).toBe(func);
    });
    test("set value calls onChanged", () => {
        const node = new ValueNode(0);
        const func = jest.fn((_node) => {});
        node.onChanged = func;

        node.value = 1;

        expect(func).toBeCalledTimes(1);
        expect(func).toBeCalledWith(node);
    });
    test("set changes calls onChanged", () => {
        const node = new ValueNode(1);
        const func = jest.fn((_node) => {});
        node.onChanged = func;

        node.setChanges(valueState);

        expect(func).toBeCalledTimes(1);
        expect(func).toBeCalledWith(node);
    });
    test("set state calls onChanged", () => {
        const node = new ValueNode(1);
        const func = jest.fn((_node) => {});
        node.onChanged = func;

        node.setState(valueState);

        expect(func).toBeCalledTimes(1);
        expect(func).toBeCalledWith(node);
    });
});
