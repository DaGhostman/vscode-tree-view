import * as json from "jsonc-parser";
import * as vscode from "vscode";
import { Provider } from "./../provider";
import * as token from "./../tokens";
import { IBaseProvider } from "./base";

export class PythonProvider implements IBaseProvider<string> {

    private static handleArgument(a, m) {
        const line = vscode.window.activeTextEditor.
            document.lineAt(m.loc.start.line - 1).text;

        const ptr = line.substr(a.loc.start.column);
        const matches: string[] = ptr.split(/[(,)]{1}/i, 1);
        let val = "";
        if (matches.length > 0) {
            val = matches[0].split("=", 2)[1] || "";
        }

        const n = a.name || a.id.name;

        return {
            name: n,
            position: new vscode.Range(
                new vscode.Position(a.loc.start.line - 1, a.loc.start.column),
                new vscode.Position(a.loc.start.line - 1, a.loc.start.column + n.length),
            ),
            type: PythonProvider.getType(val.trim()),
            value: val.trim(),
            visibility: "public",
        } as token.IVariableToken;
    }

    private static getType(value: string) {
        const numMatch = value.match(/^\d+$/);
        if (numMatch !== null && numMatch.length > 0) {
            return "number";
        }

        if (value.indexOf("\"") === 0 || value.indexOf("'") === 0) {
            return "string";
        }

        if (value.indexOf("{") === 0) { return "dict"; }
        if (value.indexOf("[") === 0) { return "list"; }

        return value.match(/^[A-Z]/i) !== null ? value : "any";
    }

    private tree: token.ITokenTree;
    private text: string;
    private editor: vscode.TextEditor;

    public hasSupport(langId: string) {
        return langId.toLowerCase() === "python";
    }

    public refresh(event?: vscode.TextDocumentChangeEvent): void {
        // Lol
    }

    public getTokenTree(): Thenable<token.ITokenTree> {
        this.tree = {} as token.ITokenTree;

        const py = require("filbert")
            .parse(vscode.window.activeTextEditor.document.getText(), {
                locations: true,
            });

        for (const node of py.body) {
            switch (node.type) {
                case "BlockStatement":
                    if (this.tree.nodes === undefined) {
                        this.tree.nodes = [];
                    }

                    this.tree.nodes.push({
                        methods: node.body.map((fu) =>
                            this.handleFunction(fu, node.body[0].id.name)).filter((m) => m !== undefined),
                        name: node.body[0].id.name,
                    } as token.IEntityToken);

                    break;

                case "FunctionDeclaration":
                    const f = this.handleFunction(node);
                    if (f && this.tree.nodes !== undefined) {
                        if (this.tree.functions === undefined) {
                            this.tree.functions = [];
                        }

                        this.tree.functions.push(f);
                    }
                    break;
                case "VariableDeclaration":
                    if (this.tree.variables === undefined) {
                        this.tree.variables = [];
                    }

                    this.tree.variables.push(PythonProvider.handleArgument(node.declarations[0], node));
                    break;
            }
        }

        if (py.body.length > 0 && py.body[0].loc.start.line > 1) {
            // const line = vscode.window.activeTextEditor.document.lineAt(node.loc.start.line-1);
            for (let i = 0; i < py.body[0].loc.start.line; i++) {
                const line = vscode.window.activeTextEditor.document.lineAt(i).text;

                if (line.indexOf("import ") !== -1) {
                    if (this.tree.imports === undefined) {
                        this.tree.imports = [];
                    }

                    let importName = line.trim().indexOf("import") === 0 ? line.substr(6).trim() : line.trim();
                    const importAlias = importName.indexOf(" as ") !== -1 ?
                        importName.substr(importName.indexOf(" as ") + 4) : undefined;

                    if (importAlias !== undefined) {
                        importName = importName.substr(0, importName.length - (importName.indexOf(importAlias) + 4));
                    }

                    if (importName.indexOf("from ") === 0) {
                        let n = importName.slice(5, importName.lastIndexOf(" import "));

                        n += `: ` + (importAlias === undefined ?
                            importName.substr(importName.indexOf(" import ") + 8) : (
                                importName.slice(importName.indexOf(" import ") + 8, importName.indexOf(" as "))
                            )).split(",").map((item) => item.trim()).join(", ");

                        importName = n;
                    }

                    this.tree.imports.push({
                        alias: importAlias,
                        name: importName,
                        position: new vscode.Range(
                            new vscode.Position(i, 0),
                            new vscode.Position(i, line.length),
                        ),
                    } as token.ImportToken);
                }
            }
        }

        return Promise.resolve(this.tree as token.ITokenTree);
    }

    public getChildren(offset?: string): Thenable<string[]> {
        return Promise.resolve([]);
    }

    public getTreeItem(offset: any): vscode.TreeItem {
        return offset;
    }

    private handleFunction(m, className?: string) {
        let functionName: string;
        let args: any[];
        switch (m.type) {
            case "ExpressionStatement":
                const expr = m.expression;

                args = expr.right.params.map((a) => {
                    return PythonProvider.handleArgument(a, m);
                });

                functionName = expr.left.property.name;
                break;
            case "FunctionDeclaration":
                functionName = m.id.name;
                args = m.params.map((a) => {
                    return PythonProvider.handleArgument(a, m);
                });
                break;

            default:
                return undefined;
        }

        if (className !== undefined && className === functionName && args.length === 0) {
            return undefined;
        }

        const typeOffset: number = className !== functionName ?
            4 : 6;

        return {
            arguments: args,
            name: functionName,
            position: new vscode.Range(
                new vscode.Position(m.loc.start.line - 1, m.loc.start.column + typeOffset),
                new vscode.Position(
                    m.loc.start.line - 1,
                    m.loc.start.column + functionName.length + typeOffset,
                ),
            ),
        } as token.IMethodToken;
    }
}
