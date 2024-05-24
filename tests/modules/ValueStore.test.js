import {expect, test, describe} from "@jest/globals";
import ValueStore from "../../libraries/objectDefaultFiles/scene/ValueStore.js";

describe("ValueStore", () => {
    test("Constructor", () => {
        expect(() => {new ValueStore(0);}).not.toThrow();
    });
    test("Constructor sets value", () => {
        const store = new ValueStore(1);

        expect(store.get()).toBe(1);
    });
    test("set sets value", () => {
        const store = new ValueStore(0);

        store.set(1);

        expect(store.get()).toBe(1);
    });
});
