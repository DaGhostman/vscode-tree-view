import * as vscode from "vscode";
import { Provider } from "./../provider";
import * as token from "./../tokens";
import { IBaseProvider } from "./base";

export class PhpProvider implements IBaseProvider<vscode.TreeItem> {
    private config;

    public hasSupport(language: string) { return language.toLowerCase() === "php"; }

    public refresh(event?): void {
        if (event !== undefined) {
            this.getTree();
        }
    }

    public getTreeItem(element: vscode.TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> { return element; }
    public getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        let resolution: Thenable<vscode.TreeItem[]> = Promise.resolve([]);
        const tree = this.getTree();

        try {
            const items: vscode.TreeItem[] = [];

            if (tree !== {}) {
                if (element === undefined) {
                    if (tree.strict !== undefined) {
                        items.push(new vscode.TreeItem(
                            `Strict Types: ${tree.strict ? "Yes" : "No"}`,
                            vscode.TreeItemCollapsibleState.None,
                        ));
                    }

                    if (tree.imports !== undefined) {
                        items.push(new vscode.TreeItem(`Imports`, vscode.TreeItemCollapsibleState.Collapsed));
                    }

                    if (tree.nodes !== undefined) {
                        for (const cls of tree.nodes) {
                            const collapsed: number = tree.nodes.indexOf(cls) === 0 ?
                                vscode.TreeItemCollapsibleState.Expanded :
                                vscode.TreeItemCollapsibleState.Collapsed;

                            items.push(
                                Provider.getIcon(
                                    new vscode.TreeItem(cls.name, collapsed),
                                    "class",
                                ),
                            );
                        }
                    }
                } else {
                    if (element.label === "Imports") {
                        for (const imp of tree.imports) {
                            const t = new vscode.TreeItem(
                                `${imp.name}${imp.alias !== null ? ` as ${imp.alias}` : ""}`,
                                vscode.TreeItemCollapsibleState.None,
                            );
                            t.command = {
                                arguments: [imp.position],
                                command: "extension.treeview.goto",
                                title: "",
                            };
                            items.push(t);
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

                                    t.command = {
                                        arguments: [constant.position],
                                        command: "extension.treeview.goto",
                                        title: "",
                                    };

                                    items.push(Provider.getIcon(t, "constant", constant.visibility.toString()));
                                }
                            }

                            if (cls.properties) {
                                for (const property of cls.properties) {
                                    const t = new vscode.TreeItem(
                                        `$${property.name}${property.value !== "" ? ` = ${property.value}` : ""}`,
                                        vscode.TreeItemCollapsibleState.None,
                                    );
                                    t.command = {
                                        arguments: [property.position],
                                        command: "extension.treeview.goto",
                                        title: "",
                                    };
                                    items.push(Provider.getIcon(
                                        t,
                                        `property${property.static ? "_static" : ""}`,
                                        property.visibility,
                                    ));
                                }
                            }

                            if (cls.traits) {
                                for (const trait of cls.traits) {
                                    const t = new vscode.TreeItem(
                                        `${trait.name}`,
                                        vscode.TreeItemCollapsibleState.None,
                                    );
                                    t.command = {
                                        arguments: [trait.position],
                                        command: "extension.treeview.goto",
                                        title: "",
                                    };
                                    items.push(Provider.getIcon(t, "trait"));
                                }
                            }

                            if (cls.methods) {
                                for (const method of cls.methods) {
                                    const args = [];
                                    for (const arg of method.arguments) {
                                        args.push(
                                            `${arg.type !== undefined ? `${arg.type} ` : ""}` +
                                            `${arg.name}${(arg.value !== "" ? ` = ${arg.value}` : "")}`,
                                        );
                                    }
                                    const t = new vscode.TreeItem(
                                        `${method.name}(${args.join(", ")})` +
                                        `${method.type !== undefined ? `: ${method.type}` : ""}`,
                                        vscode.TreeItemCollapsibleState.None,
                                    );
                                    t.command = {
                                        arguments: [method.position],
                                        command: "extension.treeview.goto",
                                        title: "",
                                    };
                                    items.push(Provider.getIcon(
                                        t,
                                        `method${method.static ? "_static" : ""}`,
                                        method.visibility,
                                    ));
                                }
                            }
                        }
                    }
                }
            }

            resolution = Promise.resolve(items);
        } catch (err) {
            // console.error(err);
        }

        return resolution;
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
            if (["declare", "namespace", "class", "interface", "trait", "usegroup"].indexOf(node.kind) === -1) {
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

                    entity.name = `${tree.namespace}\\${node.name}`;
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

        return constants.sort(Provider.sort);
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

        return properties.sort(Provider.sort);
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
                type: (method.nullable ? "?" : "") + ty,
                visibility: method.visibility,
            } as token.IMethodToken);
        }

        return methods.sort(Provider.sort);
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
