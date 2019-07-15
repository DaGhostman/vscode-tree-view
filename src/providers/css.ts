import * as vscode from "vscode";
import { Provider } from "../provider";
import * as token from "../tokens";
import { IBaseProvider } from "./base";

export class CssProvider implements IBaseProvider<vscode.TreeItem> {
    private tree: INodeTree = {} as INodeTree;

    public hasSupport(lang: string) {
        return lang === "css";
    }

    public refresh(document: vscode.TextDocument) {
        const raw = require("css").parse(document.getText(), {
            source: document.uri.fsPath.toString(),
        }).stylesheet;

        const variables: token.IVariableToken[] = [];
        this.tree.nodes = {};
        for (const rule of raw.rules.filter((x) => x.type === "rule")) {
            const [r, defs] = this.handleRule(rule);
            if (this.tree.nodes[r.name] === undefined) {
                this.tree.nodes[r.name] = defs;
            } else {
                this.tree.nodes[r.name] = this.tree.nodes[r.name].concat(defs);
            }
        }

        this.tree.media = {};
        for (const media of raw.rules.filter((x) => x.type === "media")) {
            if (this.tree.media[media.media] === undefined) {
                this.tree.media[media.media] = {};
            }
            for (const rule of media.rules.filter((y) => y.type === "rule")) {
                const [r, defs] = this.handleRule(rule);
                if (this.tree.media[media.media][r.name] === undefined) {
                    this.tree.media[media.media][r.name] = defs;
                } else {
                    this.tree.media[media.media][r.name] = this.tree.media[media.media][r.name].concat(defs);
                }
            }
        }

    }

    public getTokenTree(): Thenable<token.ITokenTree> {
        return Promise.resolve(this.tree);
    }

    public isDynamic(): boolean {
        return false;
    }

    public generate(
        entityName: string,
        node: (token.IInterfaceToken | token.IClassToken),
        includeBody: boolean,
        options?: any,
    ): vscode.TextEdit[] {
        return [];
    }

    public getDocumentName(entityName: string, includeBody: boolean): Thenable<string> {
        return Promise.resolve(entityName);
    }

    public getTreeItem(element: vscode.TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    public getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        const list = [];
        if (element === undefined) {
            let i = 0;
            for (const media in this.tree.media) {
                if (this.tree.media.hasOwnProperty(media)) {
                    const item = new vscode.TreeItem(
                        media,
                        i === 0 ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed,
                    );

                    // Provider.addItemCommand(item, "extension.treeview.goto", [this.tree.media[media].position]);
                    Provider.addItemIcon(item, "list", "public");

                    list.push(item);
                    i++;
                }
            }

            for (const selector in this.tree.nodes) {
                if (this.tree.nodes[selector] !== undefined) {
                    const item = new vscode.TreeItem(
                        selector,
                        vscode.TreeItemCollapsibleState.Collapsed,
                    );
                    Provider.addItemIcon(item, "list", "public");
                    list.push(item);
                }
            }
        } else {
            if (this.tree.media[element.label] !== undefined) {
                for (const selector in this.tree.media[element.label]) {
                    if (this.tree.media[element.label].hasOwnProperty(selector)) {
                        const item = new vscode.TreeItem(
                            selector,
                            vscode.TreeItemCollapsibleState.Collapsed,
                        );
                        Provider.addItemIcon(item, "list", "public");
                        item.contextValue = element.label;
                        list.push(item);
                    }
                }
            } else if (element.contextValue !== undefined && this.tree.media[element.contextValue] !== undefined) {
                for (const selector of this.tree.media[element.contextValue][element.label]) {
                    const item = new vscode.TreeItem(
                        `${selector.name}: ${selector.value}`,
                        vscode.TreeItemCollapsibleState.None,
                    );

                    Provider.addItemCommand(item, "extension.treeview.goto", [selector.position]);
                    Provider.addItemIcon(item, "property", "public");
                    list.push(item);
                }
            } else {
                for (const selector of this.tree.nodes[element.label]) {
                    const item = new vscode.TreeItem(
                        `${selector.name}: ${selector.value}`,
                        vscode.TreeItemCollapsibleState.None,
                    );

                    Provider.addItemCommand(item, "extension.treeview.goto", [selector.position]);
                    Provider.addItemIcon(item, "property", "public");
                    list.push(item);
                }
            }
        }

        return Promise.resolve(list);
    }

    private handleRule(rule): [token.IVariableToken, token.IVariableToken[]] {
        const name = rule.selectors.join(",");
        const variable: token.IVariableToken = {
                name,
                position: new vscode.Range(
                    new vscode.Position(rule.position.start.line - 1, rule.position.start.column - 1),
                    new vscode.Position(rule.position.start.line - 1, rule.position.start.column - 1 + name.length),
                ),
                static: true,
                visibility: "public",
            } as token.IVariableToken;

            const rules = [];
            for (const def of rule.declarations) {
                const prop = def.property;
                rules.push({
                    name: prop,
                    position: new vscode.Range(
                        new vscode.Position(def.position.end.line - 1, def.position.end.column - 1),
                        new vscode.Position(def.position.end.line - 1, def.position.end.column - 1 - def.value.length),
                    ),
                    value: def.value,
                } as token.IVariableToken);
            }

            return [variable, rules];
    }
}

export interface INodeTree extends token.ITokenTree {
    media: {
        [key: string]: {
            [key: string]: token.IVariableToken[];
        };
    };
    nodes: {
        [key: string]: token.IVariableToken[];
    };
}
