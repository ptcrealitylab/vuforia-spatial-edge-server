import {expect, jest, test, describe} from "@jest/globals";
import BaseNode from "../../libraries/objectDefaultFiles/scene/BaseNode.js";


class MockNode extends BaseNode {
    mockSetDirty = jest.fn(() => {});
    mockSetInternalDirty = jest.fn(() => {});

    #properties;

    constructor(parent = null) {
        super("mock", parent);
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

describe("BaseNode", () => {
    const typeState = {type: "test"};
    const emptyState = {};
    test("Constructor", () => {
        expect(() => {new BaseNode("test");}).not.toThrow();
    });
    test("Not dirty after constructor", () => {
        const node = new BaseNode("test");

        expect(node.isDirty()).toBe(false);
    });
    test("No parent set after constructor", () => {
        const node = new BaseNode("test");

        expect(node.parent).toBeNull();
    });
    test("No parent set after setParent null", () => {
        const parent = new BaseNode("test");
        const node = new BaseNode("test");
        node.parent = parent;

        node.parent = null;

        expect(node.parent).toBeNull();
    });
    test("Parent set after setParent", () => {
        const parent = new BaseNode("test");
        const node = new BaseNode("test");

        node.parent = parent;

        expect(node.parent).toBe(parent);
    });
    test("Type set after constructor", () => {
        const node = new BaseNode("test");

        expect(node.getType()).toBe("test");
    });
    test("No type changes during set state", () => {
        const node = new BaseNode("test");

        node.setState({type: "wrong"});

        expect(node.getType()).toBe("test");
    });
    test("Return state when not dirty", () => {
        const node = new BaseNode("test");

        const state = node.getState();

        expect(state).toStrictEqual(typeState);
    });
    test("Return state when dirty", () => {
        const node = new BaseNode("test");
        node.setDirty();

        const state = node.getState();

        expect(state).toStrictEqual(typeState);
    });
    test("No type changes during set changes", () => {
        const node = new BaseNode("test");

        node.setChanges({type: "wrong"});

        expect(node.getType()).toBe("test");
    });
    test("Return no changes when not dirty", () => {
        const node = new BaseNode("test");

        const state = node.getChanges();

        expect(state).toStrictEqual(emptyState);
    });
    test("Return no changes when dirty", () => {
        const node = new BaseNode("test");
        node.setDirty();

        const state = node.getChanges();

        expect(state).toStrictEqual(emptyState);
    });
    test("Return changes when type is dirty", () => {
        const node = new BaseNode("test");
        node.setTypeDirty();

        const state = node.getChanges();

        expect(state).toStrictEqual(typeState);
    });
    test("general set dirty does not cause type to be come dirty", () => {
        const node = new BaseNode("test");

        node.setDirty();

        expect(node.isDirty()).toBe(false);
    });
    test("node becomes dirty when type are set dirty", () => {
        const node = new BaseNode("test");

        node.setTypeDirty();

        expect(node.isDirty()).toBe(true);
    });
    test("setParentDirty walker stops when no parent", () => {
        const node = new BaseNode("test");

        expect(() => {BaseNode.setParentDirty(node);}).not.toThrow();
    });
    test("setParentDirty walker sets parent dirty", () => {
        const mockNode = new MockNode();
        const node = new BaseNode("test");
        node.parent = mockNode;

        BaseNode.setParentDirty(node);

        expect(mockNode.mockSetInternalDirty.mock.calls).toHaveLength(1);
    });
    test("setParentDirty walker early exit when parent is already dirty", () => {
        const mockNode2 = new MockNode();
        const mockNode = new MockNode();
        const node = new BaseNode("test");
        node.parent = mockNode;
        mockNode.setTypeDirty();
        mockNode.parent = mockNode2;

        BaseNode.setParentDirty(node);

        expect(mockNode2.mockSetDirty).not.toHaveBeenCalled();
    });
    test("getName without parent", () => {
        const node = new BaseNode("test");

        expect(node.getName()).toBeNull();
    });
    test("getName with parent", () => {
        const parent = new MockNode();
        const node = new BaseNode("test");
        node.parent = parent;
        const test2 = new BaseNode("test");
        test2.parent = parent;
        parent.setProperties({test: node, test2: test2});

        expect(node.getName()).toBe("test");
    });
    test("getName with corrupt parent", () => {
        const parent = new MockNode();
        const node = new BaseNode("test");
        node.parent = parent;
        const test1 = new BaseNode("test");
        test1.parent = parent;
        const test2 = new BaseNode("test");
        test2.parent = parent;
        parent.setProperties({test: test1, test2: test2});

        expect(node.getName()).toBeNull();
    });
});
