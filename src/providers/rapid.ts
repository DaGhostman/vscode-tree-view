import * as vscode from "vscode";
import * as token from "../tokens";
import { IBaseProvider } from "./base";

export class RapidProvider implements IBaseProvider<vscode.TreeItem> {
    private readonly PATTERNS: Map<string, RegExp> = new Map([
        ["method", /^((?:LOCAL)?\s?PROC)\s?(?:(?:(\w+)\s)?([^\(]+)|[^\(]+)\((.*)?\)$/],
        ["function", /^(TRAP|(?:LOCAL)\s+?FUNC|RECORD)\s?(?:(?:(\w+)\s)?([^\(]+)|[^\(]+)\((.*)?\)$/],
        ["class", /^(MODULE)\s+?(.*)$/],
    ]);
    private tree: token.ITokenTree = {};

    public hasSupport(langId: string): boolean {
        return langId === "rapid";
    }

    public getTreeItem(element: vscode.TreeItem) {
        return element;
    }

    public getChildren(element?: vscode.TreeItem) {
        return Promise.resolve([]);
    }

    public refresh(document: vscode.TextDocument): void {

        this.tree = {};
        const lines: string[] = document.getText()
            .split(vscode.workspace.getConfiguration("files").get("eol", "\n"));

        lines.forEach((line: string, index: number) => {
            for (const row of this.PATTERNS) {
                const [section, pattern] = row;
                const matches = line.trim().match(pattern);

                if (!matches || matches.length === 0 || matches[0] === "") {
                    continue;
                }

                let args = [];
                switch (section) {
                    case "function":
                        if (!this.tree.functions) {
                            this.tree.functions = [];
                        }

                        if (matches[4]) {
                            args = (matches[4]).split(",").map((val: string) => {
                                const [type, name] = val.trim().split(" ");
                                return {
                                    name: (name || type),
                                    type,
                                    value: "",
                                } as token.IVariableToken;
                            });
                        }

                        this.tree.functions.push({
                            arguments: args,
                            name: matches[3],
                            position: new vscode.Range(
                                new vscode.Position(lines.indexOf(line), line.indexOf(matches[3])),
                                new vscode.Position(lines.indexOf(line), line.indexOf(matches[3]) + matches[3].length),
                            ),
                            type: (matches[2] || "void"),
                        } as token.IFunctionToken);
                        break;
                    case "class":
                        if (!this.tree.classes) {
                            this.tree.classes = [];
                        }

                        this.tree.classes.push({
                            name: matches[2],
                        } as token.IClassToken);
                        break;
                    case "method":
                        if (!this.tree.classes[0].methods) {
                            this.tree.classes[0].methods = [];
                        }
                        let visibility = "public";
                        if (matches[0].search("LOCAL") !== -1) {
                            visibility = "private";
                        }

                        if (matches[4]) {
                            args = (matches[4]).split(",").map((val: string) => {
                                const [type, name] = val.trim().split(" ");
                                return {
                                    name: (name || type),
                                    type,
                                    value: "",
                                } as token.IVariableToken;
                            });
                        }

                        this.tree.classes[0].methods.push({
                            arguments: args,
                            name:  matches[3],
                            position: new vscode.Range(
                                new vscode.Position(lines.indexOf(line), line.indexOf(matches[3])),
                                new vscode.Position(lines.indexOf(line), line.indexOf(matches[3]) + matches[3].length),
                            ),
                            type: (matches[2] || "void"),
                            value: "",
                            visibility,
                        } as token.IMethodToken);
                        break;
                }
            }
        });
    }

    public getTokenTree(): Thenable<token.ITokenTree> {
        return Promise.resolve(this.tree as token.ITokenTree);
    }

    public generate(
        entityName: string,
        node: (token.IInterfaceToken | token.IClassToken),
        includeBody: boolean,
        options?: any,
    ): vscode.TextEdit[] {
        // @ToDo
        return [];
    }

    public getDocumentName(entityName: string, includeBody: boolean): Thenable<string> {
        return Promise.resolve("todo");
    }
}
