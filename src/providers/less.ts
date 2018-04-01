import * as vscode from "vscode";
import { Provider } from "../provider";
import * as token from "../tokens";
import { IBaseProvider } from "./base";
export class LessProvider implements IBaseProvider<vscode.TreeItem> {
    private tree: INodeTree = {} as INodeTree;

    public hasSupport(lang: string) {
        return lang === "less";
    }

    public refresh(document: vscode.TextDocument) {
        const less = require("less");
        let raw;
        less.parse(document.getText(), (err, tree) => {
            raw = tree;
        });

        const variables: token.IVariableToken[] = [];
        for (const v of raw.rules.filter((x) => x.selectors === undefined && x.params === undefined)) {
            variables.push({
                name: v.name,
                static: true,
                value: v.value.value,
                visibility: "public",
            } as token.IVariableToken);
        }

        this.tree.variables = variables;

        this.tree.nodes = {};
        for (const rule of raw.rules.filter((x) => x.selectors !== undefined && x.params === undefined)) {
            const [r, defs] = this.handleRule(rule);
            if (this.tree.nodes[r.name] === undefined) {
                this.tree.nodes[r.name] = defs;
            } else {
                this.tree.nodes[r.name] = this.tree.nodes[r.name].concat(defs);
            }
        }
    }

    public getTokenTree(): Thenable<token.ITokenTree> {
        return Promise.resolve(this.tree);
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
        } else if (this.tree.nodes[element.label] !== undefined) {
            for (const selector of this.tree.nodes[element.label]) {
                const sign = selector.name.indexOf("@") === 0 ?
                    " = " : ": ";
                const item = new vscode.TreeItem(
                    `${selector.name}${sign}${selector.value}`,
                    vscode.TreeItemCollapsibleState.None,
                );

                Provider.addItemIcon(item, "property", "public");
                list.push(item);
            }
        }

        return Promise.resolve(list);
    }

    private handleRule(rule): [token.IVariableToken, token.IVariableToken[]] {
        const name = rule.selectors.map((x) => {
            return x.elements.map((y) => {
                return y.value;
            }).join(" ");
        }).join(", ");
        const variable: token.IVariableToken = {
                name,
                static: true,
                visibility: "public",
            } as token.IVariableToken;

            const rules = [];
            for (const def of rule.rules) {
                if (def.rules !== undefined) {
                    continue;
                }

                if (def.name !== undefined) {
                    const prop = def.name;
                    rules.push({
                        name: prop,
                        value: `${def.value.value}`,
                    } as token.IVariableToken);
                } else {
                    const prop = def.selector.elements[0].value;
                    rules.push({
                        name: prop,
                        value: `(${def.arguments.map((x) => this.handleValue(x)).join(", ")})`,
                    } as token.IVariableToken);
                }
            }

            return [variable, rules];
    }

    private handleValue(x) {
        let v = x.name !== null ? x.name : `${x.value.value[0].value}`;
        if (x.value.value[0].unit) {
            v = `${v}${x.value.value[0].unit.backupUnit || ""}`;
        }

        if (x.value.value[0].rgb) {
            v = `{${x.value.value[0].rgb.join(", ")}@${x.value.value[0].alpha || ""}}`;
        }

        return v;
    }
}

export interface INodeTree extends token.ITokenTree {
    nodes: {
        [key: string]: token.IVariableToken[];
    };
}
