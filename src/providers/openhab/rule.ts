import * as json from "jsonc-parser";
import * as vscode from "vscode";
import { Provider } from "./../../provider";
import * as token from "./../../tokens";
import { IBaseProvider } from "./../base";
import { IRuleTree, RuleParser } from "./ruleParser";

export class RuleProvider implements IBaseProvider<vscode.TreeItem> {
    private tree: any;
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

    public refresh(event?: vscode.TextDocumentChangeEvent): void {
        // refresh
    }

    public getTokenTree(): Thenable<IRuleTree> {
        const text = vscode.window.activeTextEditor.document.getText();
        return this.parser.parseSource(text).then((parsed) => {
            // const tree = {} as IRuleTree;

            // for (const imp of parsed.imports) {

            // }

            // for (const variable of parsed.variables) {
            //     if (tree.variables === undefined) {
            //         tree.variables = [];
            //     }
            //     tree.variables.push(variable);
            // }

            // for (const rule of parsed.rules) {
            //     if (tree.rules === undefined) {
            //         tree.rules = [];
            //     }
            //     tree.rules.push({
            //         name: rule,
            //         position: this.parser.getPosition(rule),
            //     });
            // }

            return Promise.resolve(parsed);
        });
    }

    public getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        const items: vscode.TreeItem[] = [];

        return this.getTokenTree().then((tree) => {
            if (element === undefined) {
                if (tree.variables && tree.variables.length) {
                    items.push(new vscode.TreeItem(`Variables`, vscode.TreeItemCollapsibleState.Collapsed));
                }

                if (tree.rules && tree.rules.length) {
                    items.push(new vscode.TreeItem(
                        `Rules`,
                        tree.nodes === undefined && tree.rules !== undefined ?
                            vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed,
                    ));
                }
            } else {
                if (element.label === "Variables") {
                    for (const variable of tree.variables) {
                        const t = new vscode.TreeItem(
                            `${variable.name}`,
                            vscode.TreeItemCollapsibleState.None,
                        );
                        items.push(Provider.addItemCommand(t, "extension.treeview.goto", [variable.position]));
                    }
                }

                if (element.label === "Rules" && tree.rules !== undefined) {
                    for (const rule of tree.rules) {
                        const t = new vscode.TreeItem(
                            `${rule.name}`,
                            vscode.TreeItemCollapsibleState.None,
                        );

                        items.push(Provider.addItemCommand(Provider.addItemIcon(
                            t,
                            `method`,
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
