import * as ts from "typescript-parser";
import * as vscode from "vscode";
import { Provider } from "./../provider";
import * as token from "./../tokens";
import { IBaseProvider } from "./base";

export class TypescriptProvider implements IBaseProvider<vscode.TreeItem> {
    private parser: ts.TypescriptParser;
    private tree: token.ITokenTree = {} as token.ITokenTree;

    private readonly VISIBILITY = [
        "private", "protected", "public",
    ];

    public constructor() {
        this.parser = new ts.TypescriptParser();
    }

    public hasSupport(langId: string): boolean {
        return langId.toLowerCase() === "typescript" ||
            langId.toLowerCase() === "javascript";
    }

    public refresh(event?: vscode.TextDocumentChangeEvent): void {
        // console.log("TypeScript/JavaScript Tree View provider refresh triggered")
    }

    public getTokenTree(raw?: ts.File): token.ITokenTree {
        for (const dec of raw.declarations) {
            if (this.tree.nodes === undefined) {
                this.tree.nodes = [];
            }

            if (dec instanceof ts.ClassDeclaration || dec instanceof ts.InterfaceDeclaration) {
                if (dec instanceof ts.ClassDeclaration && dec.ctor !== undefined) {
                    dec.ctor.name = "constructor";
                    dec.methods.unshift(dec.ctor as ts.MethodDeclaration);
                }

                this.tree.nodes.push({
                    methods: this.handleMethods(dec.methods),
                    name: dec.name,
                    properties: this.handleProperties(dec.properties),
                    visibility: dec.isExported === true ? "public" : "protected",
                } as token.IEntityToken);
            }

            if (dec instanceof ts.FunctionDeclaration) {
                const startPosition = vscode.window.activeTextEditor.document.positionAt(dec.start);

                if (this.tree.functions === undefined) {
                    this.tree.functions = [];
                }

                this.tree.functions.push({
                    arguments: this.handleArguments(dec.parameters),
                    name: dec.name,
                    position: new vscode.Range(
                        startPosition,
                        new vscode.Position(startPosition.line, startPosition.character),
                    ),
                    static: true,
                    type: dec.type === null ? "any" : dec.type,
                    visibility: dec.isExported === true ? "public" : "protected",
                } as token.IMethodToken);
            }
        }

        for (const imp of raw.imports) {
            if (this.tree.imports === undefined) {
                this.tree.imports = [];
            }

            if (imp instanceof ts.NamedImport && imp.specifiers !== undefined) {
                const classes: string[] = [];
                for (const spec of imp.specifiers) {
                    classes.push(spec.specifier);
                }

                this.tree.imports.push({
                    name: `${imp.libraryName}: ${classes.join(", ")}`,
                    position: new vscode.Range(
                        this.offsetToPosition(imp.start),
                        this.offsetToPosition(imp.start),
                    ),
                } as token.ImportToken);
            }

            if (imp instanceof ts.NamespaceImport) {
                this.tree.imports.push({
                    alias: imp.alias,
                    name: imp.libraryName,
                    position: new vscode.Range(
                        this.offsetToPosition(imp.start),
                        this.offsetToPosition(imp.start),
                    ),
                } as token.ImportToken);
            }
        }

        return this.tree;
    }

    public getTreeItem(element: vscode.TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    public getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        const text = vscode.window.activeTextEditor.document.getText();
        const useStrict = text.toString().substr(1, 10) === "use strict";

        return this.parser.parseSource(text).then((f: any) => {
            this.tree = {
                strict: useStrict,
            };

            this.tree = this.getTokenTree(f);

            const items: vscode.TreeItem[] = [];
            const tree = this.tree;
            if (element === undefined) {
                if (tree.strict !== undefined) {
                    items.push(new vscode.TreeItem(
                        `Strict: ${tree.strict ? "Yes" : "No"}`,
                    ));
                }

                if (tree.imports !== undefined) {
                    items.push(new vscode.TreeItem(`Imports`, vscode.TreeItemCollapsibleState.Collapsed));
                }

                if (tree.functions !== undefined) {
                    items.push(new vscode.TreeItem(
                        `Functions`,
                        tree.nodes === undefined && tree.functions !== undefined ?
                            vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed,
                    ));
                }

                if (tree.nodes !== undefined) {
                    for (const cls of tree.nodes) {
                        const collapsed: number = tree.nodes.indexOf(cls) === 0 ?
                            vscode.TreeItemCollapsibleState.Expanded :
                            vscode.TreeItemCollapsibleState.Collapsed;

                        items.push(
                            Provider.addItemIcon(
                                new vscode.TreeItem(cls.name, collapsed),
                                "class",
                                cls.visibility,
                            ),
                        );
                    }
                }
            } else {
                if (element.label === "Imports") {
                    for (const imp of tree.imports) {
                        const t = new vscode.TreeItem(
                            `${imp.name}${imp.alias !== undefined ? ` as ${imp.alias}` : ""}`,
                            vscode.TreeItemCollapsibleState.None,
                        );
                        items.push(Provider.addItemCommand(t, "extension.treeview.goto", [ imp.position ]));
                    }
                }

                if (element.label.toLowerCase() === "functions" && tree.functions !== undefined) {
                    for (const func of tree.functions) {
                        const args = [];
                        for (const arg of func.arguments) {
                            args.push(
                                `${arg.type !== undefined ? `${arg.type} ` : ""}` +
                                `${arg.name}${(arg.value !== "" ? ` = ${arg.value}` : "")}`,
                            );
                        }
                        const t = new vscode.TreeItem(
                            `${func.name}(${args.join(", ")})` +
                            `${func.type !== undefined ? `: ${func.type}` : ""}`,
                            vscode.TreeItemCollapsibleState.None,
                        );

                        items.push(Provider.addItemCommand(Provider.addItemIcon(
                            t,
                            `method${func.static ? "_static" : ""}`,
                            func.visibility,
                        ), "extension.treeview.goto", [func.position]));
                    }
                }

                for (const cls of tree.nodes) {
                    if (cls.name === element.label) {
                        if (cls.constants) {
                            for (const constant of cls.constants) {
                                const t = new vscode.TreeItem(
                                    `${constant.name} = ${constant.value}`,
                                    vscode.TreeItemCollapsibleState.None,
                                );
                                items.push(Provider.addItemIcon(t, "constant"));
                            }
                        }

                        if (cls.properties) {
                            for (const property of cls.properties) {
                                const t = new vscode.TreeItem(
                                    `${property.readonly ? "!" : ""}${property.name}` +
                                        `${property.value !== "" ? ` = ${property.value}` : ""}`,
                                    vscode.TreeItemCollapsibleState.None,
                                );

                                items.push(Provider.addItemCommand(Provider.addItemIcon(
                                    t,
                                    `property${property.static ? "_static" : ""}`,
                                    property.visibility,
                                ), "extension.treeview.goto", [property.position]));
                            }
                        }

                        if (cls.traits) {
                            for (const trait of cls.traits) {
                                const t = new vscode.TreeItem(`${trait.name}`, vscode.TreeItemCollapsibleState.None);
                                items.push(Provider.addItemIcon(t, "trait"));
                            }
                        }

                        if (cls.methods) {
                            for (const method of cls.methods) {
                                const args = [];
                                for (const arg of method.arguments) {
                                    args.push(
                                        `${arg.type !== undefined ? `${arg.type} ` : ""}${arg.name}` +
                                            `${(arg.value !== "" ? ` = ${arg.value}` : "")}`,
                                    );
                                }
                                const t = new vscode.TreeItem(
                                    `${method.name}(${args.join(", ")})` +
                                        `${method.type !== undefined ? `: ${method.type}` : ""}`,
                                    vscode.TreeItemCollapsibleState.None,
                                );

                                items.push(Provider.addItemCommand(Provider.addItemIcon(
                                    t,
                                    `method${method.static ? "_static" : ""}`,
                                    method.visibility,
                                ), "extension.treeview.goto", [method.position]));
                            }
                        }
                    }
                }
            }

            return Promise.resolve(items);
        });
    }

    private handleProperties(children: any[]): token.IPropertyToken[] {
        const properties: token.IPropertyToken[] = [];

        for (const property of children) {
            const def = vscode.window.activeTextEditor.document.getText(new vscode.Range(
                this.offsetToPosition(property.start),
                this.offsetToPosition(property.end),
            )).split(" ").slice(0, 5);

            properties.push({
                name: property.name,
                position: new vscode.Range(
                    this.offsetToPosition(property.start),
                    this.offsetToPosition(property.start),
                ),
                readonly: (def.indexOf("readonly") > -1),
                static: (def.indexOf("static") > -1),
                type: property.type === undefined ? "any" : property.type,
                value: this.normalizeType(property.value, property.type),
                visibility: this.VISIBILITY[property.visibility === undefined ? 2 : property.visibility],
            } as token.IPropertyToken);
        }

        return properties.sort(Provider.sort);
    }

    private normalizeType(value, type): string {
        if (value === null || value === undefined) { return ""; }

        let val;
        switch (type) {
            case "array":
                let arr: any;
                for (const x of value.items) {
                    if (x.key === null) {
                        if (arr === undefined) { arr = []; }
                        arr.push(x.value.value);
                    } else {
                        if (arr === undefined) { arr = {}; }
                        arr[x.key] = x.value.value;
                    }
                }

                val = JSON.stringify(arr);
                break;
            case "string":
                val = `"${value}"`;
                break;
            default:
                val = value;
                break;
        }
        return val;
    }

    private handleMethods(children: any[]): token.IMethodToken[] {
        const methods: token.IMethodToken[] = [];

        for (const method of children) {
            const def = vscode.window.activeTextEditor.document.getText(new vscode.Range(
                this.offsetToPosition(method.start),
                this.offsetToPosition(method.end),
            )).split(" ").slice(0, 5);

            methods.push({
                arguments: this.handleArguments(method.parameters),
                name: method.name,
                position: new vscode.Range(
                    this.offsetToPosition(method.start),
                    this.offsetToPosition(method.start),
                ),
                static: (def.indexOf("static") > -1),
                type: method.type === null ? "any" : method.type,
                visibility: this.VISIBILITY[method.visibility === undefined ? 2 : method.visibility],
            } as token.IMethodToken);
        }

        return methods.sort(Provider.sort);
    }

    private handleArguments(children: any[]): token.IVariableToken[] {
        const variables: token.IVariableToken[] = [];

        for (const variable of children) {
            variables.push({
                name: variable.name,
                type: variable.type === null ? "any" : variable.type,
                value: variable.value === undefined ? "" : this.normalizeType(variable.value, variable.type),
                visibility: variable.visibility === undefined ? "public" : variable.visibility,
            } as token.IVariableToken);
        }

        return variables;
    }

    private offsetToPosition(offset: number): vscode.Position {
        return vscode.window.activeTextEditor.document.positionAt(offset);
    }
}
