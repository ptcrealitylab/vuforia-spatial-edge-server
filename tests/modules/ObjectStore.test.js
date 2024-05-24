import {expect, jest, test, describe} from "@jest/globals";
import ObjectStore from "../../libraries/objectDefaultFiles/scene/ObjectStore.js";

describe("ObjectStore", () => {
    test("Constructor", () => {
        expect(() => {new ObjectStore();}).not.toThrow();
    });
    test("getProperties returns empty dictionary", () => {
        const store = new ObjectStore();

        expect(store.getProperties(null)).toStrictEqual({});
    });
    test("applyChanges event calls default handler", () => {
        const store = new ObjectStore();
        const mockCallback = jest.fn((_state) => {});
        const mockState = {type: "test"};

        store.applyChanges(mockState, mockCallback);

        expect(mockCallback).toHaveBeenCalled();
        expect(mockCallback.mock.calls[0][0]).toBe(mockState);
    });
});
