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

    public getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        const text = vscode.window.activeTextEditor.document.getText();

        return this.parser.parseSource(text).then((parsed: IRuleTree) => {
            this.tree = {
                imports: [],
                variables: [],
                rules: [],
            };

            for (const imp of parsed.imports) {
                this.tree.imports.push({
                    name: imp,
                    position: this.parser.getPosition(imp),
                } as token.ImportToken);
            }

            for (const variable of parsed.variables) {
                this.tree.variables.push({
                    name: variable,
                    position: this.parser.getPosition(variable),
                });
            }

            for (const rule of parsed.rules) {
                this.tree.rules.push({
                    name: rule,
                    position: this.parser.getPosition(rule),
                });
            }

            const items: vscode.TreeItem[] = [];
            const tree = this.tree;
            if (element === undefined) {
                if (tree.imports && tree.imports.length) {
                    items.push(new vscode.TreeItem(`Imports`, vscode.TreeItemCollapsibleState.Collapsed));
                }

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
                if (element.label === "Imports") {
                    for (const imp of tree.imports) {
                        const t = new vscode.TreeItem(
                            `${imp.name}`,
                            vscode.TreeItemCollapsibleState.None,
                        );

                        items.push(Provider.addItemCommand(t, "extension.treeview.goto", [imp.position]));
                    }
                }

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
