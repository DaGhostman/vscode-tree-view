import * as json from "jsonc-parser";
import * as vscode from "vscode";
import { Provider } from "./../../provider";
import {
    ITokenTree,
    SectionItem,
    TraitItem,
} from "./../../tokens";
import { IBaseProvider } from "./../base";
import { IRuleTree, RuleParser } from "./ruleParser";

export class RuleProvider implements IBaseProvider<vscode.TreeItem> {
    private tree: Thenable<ITokenTree>;
    private parser: RuleParser;
    private text: string;
    private editor: vscode.TextEditor;

    public constructor() {
        this.parser = new RuleParser();
    }
    public hasSupport(langId: string) {
        return langId.toLowerCase() === "openhab" &&
            vscode.window.activeTextEditor.document.fileName.endsWith("rules");
    }

    public refresh(document: vscode.TextDocument): void {
        this.tree = this.parser.parseSource(document.getText()).then((parsed) => {
            return Promise.resolve(parsed);
        });
    }

    public getTokenTree(): Thenable<IRuleTree> {
        return this.tree;
    }

    public getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        // return Promise.resolve([]);
        const items = [];

        return this.getTokenTree().then((tree) => {
            if (element === undefined) {
                if (tree.rules && tree.rules.length) {
                    items.push(new SectionItem(
                        `Rules`,
                        tree.rules !== undefined ?
                            vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed,
                        "rule-section",
                    ));
                }
            } else {
                if (element.contextValue === "rule-section") {
                    for (const rule of tree.rules) {
                        const t = new TraitItem(
                            `${rule.name}`,
                            vscode.TreeItemCollapsibleState.None,
                        );

                        items.push(Provider.addItemCommand(Provider.addItemIcon(
                            t,
                            `use`,
                        ), "extension.treeview.goto", [rule.position]));
                    }
                }
            }

            return Promise.resolve(items);
        });
    }

    public getTreeItem(element: vscode.TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
    }
}
