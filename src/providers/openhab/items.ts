import * as json from "jsonc-parser";
import * as vscode from "vscode";
import { Provider } from "./../../provider";
import {
    ITokenTree,
    SectionItem,
    TraitItem,
} from "./../../tokens";
import { IBaseProvider } from "./../base";
import { IItemsTree, ItemsParser } from "./itemsParser";

export class ItemsProvider implements IBaseProvider<vscode.TreeItem> {
    private tree: Thenable<ITokenTree>;
    private parser: ItemsParser;
    private text: string;
    private editor: vscode.TextEditor;

    public constructor() {
        this.parser = new ItemsParser();
    }
    public hasSupport(langId: string) {
        return langId.toLowerCase() === "openhab" &&
            vscode.window.activeTextEditor.document.fileName.endsWith("items");
    }

    public refresh(document: vscode.TextDocument): void {
        this.tree = this.parser.parseSource(document.getText()).then((parsed) => {
            return Promise.resolve(parsed);
        });
    }

    public getTokenTree(): Thenable<IItemsTree> {
        return this.tree;
    }

    public getDocumentName(name: string, include: boolean = false): Thenable<string> {
        throw new Error("Unsupported action");
    }

    public generate(name: string, node: any, include: boolean, options: any = {}): vscode.TextEdit[] {
        throw new Error("Unsupported action");
    }

    public getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        const items = [];

        return this.getTokenTree().then((tree) => {
            if (element === undefined) {
                if (tree.items && tree.items.length) {
                    items.push(new SectionItem(
                        `Items`,
                        tree.items !== undefined ?
                            vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed,
                        "items-section",
                    ));
                }
            } else {
                if (element.contextValue === "items-section") {
                    for (const item of tree.items) {
                        const t = new TraitItem(
                            `${item.name}`,
                            vscode.TreeItemCollapsibleState.None,
                        );

                        items.push(Provider.addItemCommand(Provider.addItemIcon(
                            t,
                            `use`,
                        ), "extension.treeview.goto", [item.position]));
                    }
                }
            }

            return Promise.resolve(items);
        });
    }

    public getTreeItem(element: vscode.TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    public isDynamic(): boolean {
        return false;
    }
}
