import * as vscode from "vscode";
import * as token from "../tokens";
import { IBaseProvider } from "./base";

export class CFamilyProvider implements IBaseProvider<vscode.TreeItem> {
    private tree: token.ITokenTree = {};
    private config: vscode.WorkspaceConfiguration;

    public hasSupport(langId: string): boolean {
        return ["csharp", "c", "cpp"].indexOf(langId) !== -1;
    }

    public refresh(document: vscode.TextDocument): void {
        this.config = vscode.workspace.getConfiguration("treeview.csharp");

        vscode.commands.executeCommand<vscode.SymbolInformation[]>(
                "vscode.executeDocumentSymbolProvider",
                document.uri,
            ).then((symbols: vscode.SymbolInformation[]) => {
                this.tree = {};
                for (const symbol of symbols) {
                    const namespace: string = this.tree.namespace;
                    const startLine = symbol.location.range.start.line;
                    const def: string = vscode.window.activeTextEditor.document.getText(new vscode.Range(
                        new vscode.Position(startLine, 0),
                        new vscode.Position(startLine, 2048),
                    )).trim().slice(0, -1);

                    switch (symbol.kind) {
                        case vscode.SymbolKind.Namespace:
                            this.tree.namespace = symbol.name;
                            break;
                        case vscode.SymbolKind.Module:
                        case vscode.SymbolKind.Package:
                            this.tree.imports = this.tree.imports || [];
                            this.tree.imports.push({
                                name: symbol.name,
                                position: symbol.location.range,
                            } as token.ImportToken);
                            break;
                        case vscode.SymbolKind.Class:
                            if (namespace) {
                                symbol.name = `${namespace}.${symbol.name}`;
                                if (this.config.has("namespacePosition")) {
                                    if (this.config.get("namespacePosition") === "suffix") {
                                        symbol.name = `${symbol.name}${this.tree.namespace !== undefined ?
                                                `: ${this.tree.namespace}` : ""}`;
                                    }

                                    if (this.config.get("namespacePosition") === "none") {
                                        symbol.name = `${symbol.name}`;
                                    }
                                }
                            }

                            const classKeys = def.split(" ").slice(0, 20);

                            this.tree.classes = this.tree.classes || [];
                            this.tree.classes.push({
                                abstract: (classKeys.indexOf("abstract") !== -1),
                                name: symbol.name,
                                position: symbol.location.range,
                                readonly: (classKeys.indexOf("final") !== -1),
                                visibility: "public",
                            } as token.IClassToken);
                            break;
                        case vscode.SymbolKind.Interface:
                            if (namespace) {
                                symbol.name = `${namespace}.${symbol.name}`;
                                if (this.config.has("namespacePosition")) {
                                    if (this.config.get("namespacePosition") === "suffix") {
                                        symbol.name = `${symbol.name}${this.tree.namespace !== undefined ?
                                                `: ${this.tree.namespace}` : ""}`;
                                    }

                                    if (this.config.get("namespacePosition") === "none") {
                                        symbol.name = `${symbol.name}`;
                                    }
                                }
                            }

                            this.tree.interfaces = this.tree.interfaces || [];
                            this.tree.interfaces.push({
                                name: `${this.tree.namespace}.${symbol.name}`,
                                position: symbol.location.range,
                                visibility: "public",
                            } as token.IInterfaceToken);
                            break;
                        case vscode.SymbolKind.Property:
                        case vscode.SymbolKind.Field:
                            const propertyParent = this.tree.classes.find((c) => c.name === symbol.containerName) ||
                                this.tree.interfaces.find((i) => i.name === symbol.containerName);

                            if (propertyParent) {
                                const propKeys = def.split(" ").filter((i) => i.trim().length > 0).slice(0, 20);

                                propertyParent.properties = propertyParent.properties || [];
                                propertyParent.properties.push(this.handleVar(def, symbol));
                            }
                            break;
                        case vscode.SymbolKind.Constructor:
                        case vscode.SymbolKind.Method:
                            const methodParent = this.tree.classes.find((c) => c.name === symbol.containerName) ||
                                this.tree.interfaces.find((i) => i.name === symbol.containerName);

                            if (methodParent) {
                                methodParent.methods = methodParent.methods || [];
                                methodParent.methods.push(this.handleFunc(def, symbol) as token.IMethodToken);
                            }
                            break;
                        case vscode.SymbolKind.Variable:
                            this.tree.variables = this.tree.variables || [];
                            const v = this.handleVar(def, symbol);
                            if (v.value === "") {
                                v.value = undefined;
                            }
                            this.tree.variables.push(v);
                            break;
                        case vscode.SymbolKind.Function:
                            this.tree.functions = this.tree.functions || [];
                            this.tree.functions.push(this.handleFunc(def, symbol) as token.IFunctionToken);
                            break;
                    }
                }
            });
    }

    public getTokenTree(): Thenable<token.ITokenTree> {
        return Promise.resolve(this.tree);
    }

    public getTreeItem(item: vscode.TreeItem): vscode.TreeItem {
        return item;
    }

    public getChildren(item?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        return Promise.resolve([]);
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
        return Promise.resolve(includeBody ? `${entityName}.cs` : `I${entityName}.cs`);
    }

    private handleVar(def: string, symbol: vscode.SymbolInformation) {
        const propKeys = def.split(" ").filter((i) => i.trim().length > 0).slice(0, 20);

        return {
            name: symbol.name,
            position: symbol.location.range,
            readonly: (propKeys.indexOf("readonly") !== -1),
            static: (propKeys.indexOf("static") !== -1),
            type: propKeys.indexOf("=") !== -1 ?
                propKeys[propKeys.indexOf(symbol.name) - 1] :
                propKeys[propKeys.indexOf(propKeys.find((x) => x.substr(0, symbol.name.length) === symbol.name)) - 1],
            value: (propKeys.indexOf("=") !== -1) ? propKeys.slice(propKeys.indexOf("=") + 1)
                .join(" ")
                .trim() : "",
            visibility: propKeys.find((v) => {
                return v === "public" || v === "protected" || v === "private";
            }) || "public",
        } as token.IPropertyToken;
    }

    private handleFunc(def: string, symbol: vscode.SymbolInformation) {
        const propKeys = def.split(" ").filter((i) => i.trim().length > 0).slice(0, 20);
        const type = propKeys.indexOf(symbol.name) !== -1 ?
            propKeys[propKeys.indexOf(symbol.name) - 1] :
            propKeys[propKeys.indexOf(propKeys.find((x) => {
                x = x.indexOf("(") !== -1 ?
                    x.substr(0, x.indexOf("(")) : x;

                const d = symbol.name.indexOf("(");
                return x === symbol.name.substr(0, d !== -1 ? d : undefined);
            })) - 1];

        const dest = symbol.name.indexOf("(");

        return {
            abstract: (propKeys.indexOf("abstract") !== -1),
            arguments: def.slice(def.indexOf("(") + 1, def.indexOf(")") !== -1 ? def.indexOf(")") : def.length)
                .split(",")
                .filter((x) => x.trim().length > 0).map((a) => {
                    const split = a.trim().split("=");
                    const p = split[0].trim().split(" ").filter((i) => i.trim().length > 0);
                    return {
                        name: p[1],
                        type: p[0],
                        value: split[1] || "",
                    } as token.IVariableToken;
                }) || [],
            name: symbol.name.slice(0, dest !== -1 ? dest : undefined),
            position: symbol.location.range,
            readonly: (propKeys.indexOf("final") !== -1),
            static: (propKeys.indexOf("static") !== -1),
            type,
            value: (propKeys.indexOf("=") !== -1) ? propKeys.slice(propKeys.indexOf("=") + 1)
                .join(" ")
                .trim() : "",
            visibility: propKeys.find((v) => {
                return v === "public" || v === "protected" || v === "private";
            }) || "public",
        } as token.IMethodToken;
    }
}
