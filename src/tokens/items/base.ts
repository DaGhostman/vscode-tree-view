import { Range, TreeItem, TreeItemCollapsibleState } from "vscode";

export class BaseItem extends TreeItem {
    constructor(
        label: string,
        collapsibleState?: TreeItemCollapsibleState,
        contextValue?: string,
        public readonly position?: Range,
        public readonly visibility?: string,
    ) {
        super(label, collapsibleState);

        this.contextValue = contextValue === undefined ? this.contextValue : contextValue;
    }
}
