import {expect, jest, test, describe} from "@jest/globals";
import DictionaryNode from "../../libraries/objectDefaultFiles/scene/DictionaryNode.js";
import DictionaryStore from "../../libraries/objectDefaultFiles/scene/DictionaryStore.js";
import ValueNode from "../../libraries/objectDefaultFiles/scene/ValueNode.js";
import ValueStore from "../../libraries/objectDefaultFiles/scene/ValueStore.js";
import VersionedNode from "../../libraries/objectDefaultFiles/scene/VersionedNode.js";

describe("DictionaryStore", () => {
    test("Constructor", () => {
        expect(() => {new DictionaryStore();}).not.toThrow();
    });
    test("Create without type", () => {
        const store = new DictionaryStore();
        expect(() => {store.create("test", {});}).toThrow();
    });
    test("Create with unknown type", () => {
        const store = new DictionaryStore();
        expect(() => {store.create("test", {type: "test"});}).toThrow();
    });
    test("Create Dictionary", () => {
        const store = new DictionaryStore();
        const correctNode = new DictionaryNode(new DictionaryStore(), "Object.test");

        const node = store.create("test", {type: "Object.test", properties: {}});

        expect(node).toStrictEqual(correctNode);
    });
    // test with properties
    test("Create Value", () => {
        const store = new DictionaryStore();
        const correctNode = new ValueNode(new ValueStore(0), "Value.test");

        const node = store.create("test", {type: "Value.test", value: 0});

        expect(node).toStrictEqual(correctNode);
    });
    test("Create Value without value throws", () => {
        const store = new DictionaryStore();

        expect(() => {store.create("test", {type: "Value.test"});}).toThrow();
    });
    test("Create Versioned", () => {
        const store = new DictionaryStore();
        const correctNode = new VersionedNode(new ValueStore(0), "Versioned.test");
        correctNode.incrementVersion();

        const node = store.create("test", {type: "Versioned.test", value: 0, version: 0});

        expect(node).toStrictEqual(correctNode);
    });
    test("Create Versioned without value throws", () => {
        const store = new DictionaryStore();

        expect(() => {store.create("test", {type: "Versioned.test", version: 0});}).toThrow();
    });
    test("Create Versioned without version throws", () => {
        const store = new DictionaryStore();

        expect(() => {store.create("test", {type: "Versioned.test", value: 0});}).toThrow();
    });
    test("Cast value to versioned node", () => {
        const store = new DictionaryStore();
        const correctNode = new VersionedNode(new ValueStore(0), "Versioned.test");
        correctNode.incrementVersion();

        const node = store.cast("test", new ValueNode(new ValueStore(0), "Value.test"), {type: "Versioned.test", value: 0, version: 0});

        expect(node).toStrictEqual(correctNode);
    });
    test("Delete doesn't throw", () => {
        const store = new DictionaryStore();

        expect(() => {store.delete("test", new ValueNode(new ValueStore(0), "Value.test"));}).not.toThrow();
    });
    test("applyChanges event calls default handler", () => {
        const store = new DictionaryStore();
        const mockCallback = jest.fn((_state) => {});
        const mockState = {type: "test"};

        store.applyChanges(mockState, mockCallback);

        expect(mockCallback).toHaveBeenCalled();
        expect(mockCallback.mock.calls[0][0]).toBe(mockState);
    });
});
