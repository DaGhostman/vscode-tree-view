import * as vscode from "vscode";
import { Provider } from "./../provider";
import * as token from "./../tokens";
import { IBaseProvider } from "./base";

export class PhpProvider implements IBaseProvider<vscode.TreeItem> {
    private config;
    private readonly tokens: string[] = [
        "declare",
        "namespace",
        "class",
        "interface",
        "trait",
        "usegroup",
        "function",
        "variable",
        "assign",
    ];

    public hasSupport(language: string) { return language.toLowerCase() === "php"; }

    public refresh(event?): void {
        if (event !== undefined) {
            this.getTree();
        }
    }

    public getTokenTree(): Thenable<token.ITokenTree> {
        return Promise.resolve(this.getTree());
    }

    public getTreeItem(element: vscode.TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> { return element; }
    public getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        return Promise.resolve([]);
    }

    private getTree(): token.ITokenTree {
        if (vscode.window.activeTextEditor.document !== undefined) {
            return this.walk(
                require("php-parser").create({ ast: { withPositions: true } })
                    .parseCode(vscode.window.activeTextEditor.document.getText()).children,
            );
        }

        return {} as token.ITokenTree;
    }

    private walk(ast: any, parentNode?: token.ITokenTree): token.ITokenTree {
        let tree: token.ITokenTree = (parentNode === undefined ? {} as token.ITokenTree : parentNode);

        if (ast.length === 0) {
            return tree;
        }

        for (const node of ast) {
            if (this.tokens.indexOf(node.kind) === -1) {
                continue;
            }

            switch (node.kind) {
                case "interface":
                case "class":
                case "trait":
                    if (tree.nodes === undefined) {
                        tree.nodes = [] as token.IEntityToken[];
                    }
                    const entity: token.IEntityToken = {} as token.IEntityToken;
                    const constants = node.body.filter((x) => x.kind === "classconstant");
                    const properties = node.body.filter((x) => x.kind === "property");
                    const methods = node.body.filter((x) => x.kind === "method");
                    const traits = node.body.filter((x) => x.kind === "traituse");

                    entity.name = (tree.namespace || "") + `\\${node.name}`;
                    entity.traits = traits.length === 0 ? undefined : this.handleUseTraits(traits);
                    entity.constants = constants.length === 0 ? undefined : this.handleConstants(constants);
                    entity.properties = properties.length === 0 ? undefined : this.handleProperties(properties);
                    entity.methods = methods.length === 0 ? undefined : this.handleMethods(methods);

                    tree.nodes.push(entity);
                    break;
                case "namespace":
                    tree.namespace = node.kind === "namespace" ? node.name : "\\";
                    tree = this.walk(node.children, tree);
                    break;
                case "declare":
                    const strict = node.what.strict_types;
                    tree.strict = (strict !== undefined ? (strict.value === "1" ? true : false) : false);
                    tree = this.walk(node.children, tree);
                    break;
                case "usegroup":
                    if (tree.imports === undefined) {
                        tree.imports = [] as token.ImportToken[];
                    }
                    const imp = {
                        alias: node.items[0].alias,
                        name: node.items[0].name,
                        position: new vscode.Range(
                            new vscode.Position(node.loc.start.line - 1, node.loc.start.column),
                            new vscode.Position(node.loc.end.line - 1, node.loc.end.column),
                        ),
                    } as token.ImportToken;

                    tree.imports.push(imp);
                    break;
                case "function":
                    if (tree.functions === undefined) {
                        tree.functions = [];
                    }

                    let ty: string = node.type === null ? "mixed" : node.type.name;
                    if (ty.substr(0, 1) === "\\") {
                        ty = ty.substr(1);
                    }
                    const func = {
                        arguments: this.handleArguments(node.arguments),
                        name: node.name,
                        position: new vscode.Range(
                            new vscode.Position(
                                node.loc.start.line - 1,
                                node.loc.start.column + 9,
                            ),
                            new vscode.Position(
                                node.loc.start.line - 1,
                                node.loc.end.column + 9 + node.name.length,
                            ),
                        ),
                        static: true,
                        type: ty,
                        visibility: "public",
                    } as token.IMethodToken;

                    tree.functions.push(func);
                    break;
                case "assign":
                case "variable":
                    if (tree.variables === undefined) {
                        tree.variables = [];
                    }

                    const val = node.right !== undefined ?
                        (node.right.value === undefined ? node.right.name : node.right) : "null";

                    const v = node.left !== undefined ? node.left : node;

                    tree.variables.push({
                        name: v.name,
                        position: new vscode.Range(
                            new vscode.Position(v.loc.start.line, v.loc.start.column),
                            new vscode.Position(v.loc.end.line, v.loc.end.column),
                        ),
                        type: "mixed",
                        value: this.normalizeType(val),
                        visibility: "public",
                    } as token.IVariableToken);
                    break;
            }
        }

        return tree;
    }

    private normalizeType(value): string {
        if (value === null) { return ""; }

        let val;
        switch (value.kind) {
            case "array":
                let arr: any = [];
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
                val = `"${value.value}"`;
                break;
            case "constref":
                val = value.name.name;
                break;
            default:
                val = value.value;
                break;
        }
        return val;
    }

    private handleUseTraits(children: any[]): token.IEntityToken[] {
        const traits: token.IEntityToken[] = [];

        for (const trait of children) {
            for (const i in trait.traits) {
                if (trait.traits[i] === undefined) {
                    continue;
                }

                traits.push({
                    name: trait.traits[i].name,
                    position: new vscode.Range(
                        new vscode.Position(trait.loc.start.line - 1, trait.loc.start.column),
                        new vscode.Position(trait.loc.end.line - 1, trait.loc.end.column - 1),
                    ),
                } as token.IEntityToken);
            }
        }

        return traits;
    }

    private handleConstants(children: any[]): token.IConstantToken[] {
        const constants: token.IConstantToken[] = [];

        for (const constant of children) {
            constants.push({
                name: constant.name,
                position: new vscode.Range(
                    new vscode.Position(constant.loc.start.line - 1, constant.loc.start.column),
                    new vscode.Position(constant.loc.end.line - 1, constant.loc.start.column + constant.name.length),
                ),
                value: this.normalizeType(constant.value),
                visibility: constant.visibility === undefined ? "public" : constant.visibility,
            } as token.IConstantToken);
        }

        return constants;
    }

    private handleProperties(children: any[]): token.IPropertyToken[] {
        const properties: token.IPropertyToken[] = [];

        for (const property of children) {
            properties.push({
                name: property.name,
                position: new vscode.Range(
                    new vscode.Position(
                        property.loc.start.line - 1,
                        property.loc.start.column,
                    ),
                    new vscode.Position(
                        property.loc.end.line - 1,
                        property.loc.start.column + property.name.length + 1,
                    ),
                ),
                static: property.isStatic,
                type: "mixed",
                value: this.normalizeType(property.value),
                visibility: property.visibility === undefined ? "public" : property.visibility,
            } as token.IPropertyToken);
        }

        return properties;
    }

    private handleMethods(children: any[]): token.IMethodToken[] {
        const methods: token.IMethodToken[] = [];

        for (const method of children) {
            let ty: string = method.type === null ? "mixed" : method.type.name;
            if (ty.substr(0, 1) === "\\") {
                ty = ty.substr(1);
            }

            methods.push({
                arguments: this.handleArguments(method.arguments),
                name: (method.byref ? "&" : "") + method.name,
                position: new vscode.Range(
                    new vscode.Position(
                        method.loc.start.line - 1,
                        method.loc.start.column + 9,
                    ),
                    new vscode.Position(
                        method.loc.start.line - 1,
                        method.loc.start.column + 9 + method.name.length,
                    ),
                ),
                static: method.isStatic,
                type: ["__construct", "__destruct"].indexOf(method.name) === -1 ?
                    (method.nullable ? "?" : "") + ty : undefined,
                visibility: method.visibility,
            } as token.IMethodToken);
        }

        return methods;
    }

    private handleArguments(children: any[]): token.IVariableToken[] {
        const variables: token.IVariableToken[] = [];

        for (const variable of children) {
            let ty: string = variable.type === null ? "mixed" : variable.type.name;
            if (ty.substr(0, 1) === "\\") {
                ty = ty.substr(1);
            }
            variables.push({
                name: (variable.byref ? "&" : "") +
                    (variable.variadic ? "..." : "") +
                    `$${variable.name}`,
                position: new vscode.Range(
                    new vscode.Position(
                        variable.loc.start.line - 1,
                        variable.loc.start.column,
                    ),
                    new vscode.Position(
                        variable.loc.end.line - 1,
                        variable.loc.start.column + variable.name.length,
                    ),
                ),
                type: (variable.nullable ? "?" : "") + ty,
                value: (variable.value === undefined ? "" : this.normalizeType(variable.value)),
                visibility: variable.visibility === undefined ? "public" : variable.visibility,
            } as token.IVariableToken);
        }

        return variables;
    }
}
