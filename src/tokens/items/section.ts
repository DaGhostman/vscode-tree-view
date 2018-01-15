import { TreeItem, TreeItemCollapsibleState } from "vscode";

export class SectionItem extends TreeItem {
    constructor(label: string, collapsibleState?: TreeItemCollapsibleState, contextValue: string = "section") {
        super(label, collapsibleState);

        this.contextValue = contextValue;
    }
}
