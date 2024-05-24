import {expect, test, describe} from "@jest/globals";
import DeleteNode from "../../libraries/objectDefaultFiles/scene/DeleteNode.js";

describe("DeleteNode", () => {
    const deleteState = {type: DeleteNode.TYPE};
    test("Constructor", () => {
        expect(() => {new DeleteNode();}).not.toThrow();
    });
    test("Constructor sets correct type", () => {
        const node = new DeleteNode();

        expect(node.getType()).toBe(DeleteNode.TYPE);
    });
    test("Return changes when dirty", () => {
        const node = new DeleteNode();

        const changes = node.getChanges();

        expect(changes).toStrictEqual(deleteState);
    });
    test("isInternalDirty returns true", () => {
        const node = new DeleteNode();

        expect(node.isInternalDirty()).toBe(true);
    });
    test("isDirty returns true when type is not dirty", () => {
        const node = new DeleteNode();

        expect(node.isDirty()).toBe(true);
    });
    test("isDirty returns true when type is dirty", () => {
        const node = new DeleteNode();
        node.setTypeDirty();

        expect(node.isDirty()).toBe(true);
    });
});
