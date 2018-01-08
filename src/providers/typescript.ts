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

    public getTokenTree(): Thenable<token.ITokenTree> {
        const text = vscode.window.activeTextEditor.document.getText();
        const useStrict = text.toString().substr(1, 10) === "use strict";

        return this.parser.parseSource(text).then((raw: ts.File) => {
            const tree = {} as token.ITokenTree;
            tree.strict = useStrict;

            for (const dec of raw.declarations) {
                if (tree.nodes === undefined) {
                    tree.nodes = [];
                }

                if (dec instanceof ts.ClassDeclaration || dec instanceof ts.InterfaceDeclaration) {
                    if (dec instanceof ts.ClassDeclaration && dec.ctor !== undefined) {
                        dec.ctor.name = "constructor";
                        dec.methods.unshift(dec.ctor as ts.MethodDeclaration);
                    }

                    tree.nodes.push({
                        methods: this.handleMethods(dec.methods),
                        name: dec.name,
                        properties: this.handleProperties(dec.properties),
                        visibility: dec.isExported === true ? "public" : "protected",
                    } as token.IEntityToken);
                }

                if (dec instanceof ts.VariableDeclaration) {
                    const startPosition = vscode.window.activeTextEditor.document.positionAt(dec.start);

                    if (tree.variables === undefined) {
                        tree.variables = [];
                    }

                    tree.variables.push({
                        name: `${dec.isConst ? "@" : ""}${dec.name}`,
                        position: this.generateRangeForSelection(dec.name, dec.start),
                        type: dec.type === undefined ? "any" : dec.type,
                        visibility: dec.isExported === true ? "public" : "protected",
                    } as token.IVariableToken);
                }

                if (dec instanceof ts.FunctionDeclaration) {
                    const startPosition = vscode.window.activeTextEditor.document.positionAt(dec.start);

                    if (tree.functions === undefined) {
                        tree.functions = [];
                    }

                    tree.functions.push({
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
                if (tree.imports === undefined) {
                    tree.imports = [];
                }

                if (imp instanceof ts.NamedImport && imp.specifiers !== undefined) {
                    const classes: string[] = [];
                    for (const spec of imp.specifiers) {
                        classes.push(spec.specifier);
                    }

                    tree.imports.push({
                        name: `${imp.libraryName}: ${classes.join(", ")}`,
                        position: new vscode.Range(
                            this.offsetToPosition(imp.start),
                            this.offsetToPosition(imp.start),
                        ),
                    } as token.ImportToken);
                }

                if (imp instanceof ts.NamespaceImport) {
                    tree.imports.push({
                        alias: imp.alias,
                        name: imp.libraryName,
                        position: new vscode.Range(
                            this.offsetToPosition(imp.start),
                            this.offsetToPosition(imp.start),
                        ),
                    } as token.ImportToken);
                }
            }

            return Promise.resolve(tree);
        });
    }

    public getTreeItem(element: vscode.TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    public getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        return Promise.resolve([]);
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
                position: this.generateRangeForSelection(property.name, property.start),
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

    private handleMethods(children: ts.MethodDeclaration[]): token.IMethodToken[] {
        const methods: token.IMethodToken[] = [];

        for (const method of children) {
            const def = vscode.window.activeTextEditor.document.getText(new vscode.Range(
                this.offsetToPosition(method.start),
                this.offsetToPosition(method.end),
            )).split(" ").slice(0, 5);

            methods.push({
                arguments: this.handleArguments(method.parameters),
                name: method.name,
                position: this.generateRangeForSelection(method.name, method.start),
                static: (def.indexOf("static") > -1),
                type: method.name !== "constructor" ? (method.type === undefined ? "any" : method.type) : undefined,
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

    private generateRangeForSelection(name: string, offset: number): vscode.Range {
        const startPosition = this.offsetToPosition(offset);
        const line = vscode.window.activeTextEditor.document.lineAt(startPosition.line).text;

        const startIndex = line.indexOf(name);
        if (startIndex === line.lastIndexOf(name)) {
            return new vscode.Range(
                new vscode.Position(startPosition.line, startIndex),
                new vscode.Position(startPosition.line, startIndex + name.length),
            );
        }

        return new vscode.Range(
            new vscode.Position(startPosition.line, startIndex),
            new vscode.Position(startPosition.line, startIndex),
        );
    }
}
