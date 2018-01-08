import * as vscode from "vscode";
import { TreeItem } from "vscode";
import { IBaseProvider, ITokenTree } from "./providers/base";
import * as token from "./tokens";

export class Provider implements vscode.TreeDataProvider<TreeItem> {
    public static readonly config: vscode.WorkspaceConfiguration;

    public static addItemCommand(item: vscode.TreeItem, commandName: string, args?: any[]): vscode.TreeItem {
        item.command = {
            arguments: args,
            command: commandName,
            title: "",
        };

        return item;
    }

    public static addItemIcon(node: vscode.TreeItem, key: string, visibility: string = "public" ) {
        const icons = {
            class: {
                private: vscode.Uri.file(__dirname + "/../assets/ic_class_private_24px.svg"),
                protected: vscode.Uri.file(__dirname + "/../assets/ic_class_private_24px.svg"),
                public: vscode.Uri.file(__dirname + "/../assets/ic_class_public_24px.svg"),
            },
            constant: {
                private: vscode.Uri.file(__dirname + "/../assets/ic_constant_private_24px.svg"),
                protected: vscode.Uri.file(__dirname + "/../assets/ic_constant_protected_24px.svg"),
                public: vscode.Uri.file(__dirname + "/../assets/ic_constant_public_24px.svg"),
            },
            list: {
                public: vscode.Uri.file(__dirname + "/../assets/ic_list_24px.svg"),
            },
            method: {
                private: vscode.Uri.file(__dirname + "/../assets/ic_method_private_24px.svg"),
                protected: vscode.Uri.file(__dirname + "/../assets/ic_method_protected_24px.svg"),
                public: vscode.Uri.file(__dirname + "/../assets/ic_method_public_24px.svg"),
            },
            method_static: {
                private: vscode.Uri.file(__dirname + "/../assets/ic_static_method_private_24px.svg"),
                protected: vscode.Uri.file(__dirname + "/../assets/ic_static_method_protected_24px.svg"),
                public: vscode.Uri.file(__dirname + "/../assets/ic_static_method_public_24px.svg"),
            },
            property: {
                private: vscode.Uri.file(__dirname + "/../assets/ic_property_private_24px.svg"),
                protected: vscode.Uri.file(__dirname + "/../assets/ic_property_protected_24px.svg"),
                public: vscode.Uri.file(__dirname + "/../assets/ic_property_public_24px.svg"),
            },
            property_static: {
                private: vscode.Uri.file(__dirname + "/../assets/ic_static_property_private_24px.svg"),
                protected: vscode.Uri.file(__dirname + "/../assets/ic_static_property_protected_24px.svg"),
                public: vscode.Uri.file(__dirname + "/../assets/ic_static_property_public_24px.svg"),
            },
            trait: {
                public: vscode.Uri.file(__dirname + "/../assets/ic_trait_24px.svg"),
            },
        };

        node.iconPath = icons[key][visibility];

        return node;
    }

    public static sort(a: token.IVariableToken, b: token.IVariableToken): number {
        let vis: number = 0;
        if (a.visibility && b.visibility) {
            vis = a.visibility.localeCompare(b.visibility);
        }

        return  vis === 0 ? a.name.localeCompare(b.name) : vis;
    }

    public readonly onDidChangeTreeDataEmitter: vscode.EventEmitter <TreeItem | null> =
        new vscode.EventEmitter<TreeItem | null>();
    public readonly onDidChangeTreeData: vscode.Event<TreeItem | null> = this.onDidChangeTreeDataEmitter.event;

    private langProviders: Array<IBaseProvider<any>>;

    public constructor(langProviders: Array<IBaseProvider<any>>) {
        this.langProviders = langProviders;
        vscode.window.onDidChangeActiveTextEditor((ev) => {
            this.refresh();
        });
        vscode.workspace.onDidChangeTextDocument((ev) => this.refresh(ev));
        vscode.workspace.onDidOpenTextDocument((ev) => this.refresh());
    }

    public refresh(event?: vscode.TextDocumentChangeEvent) {
        if (!vscode.window.activeTextEditor.document) {
            // prevent event triggering when there is no active window
            // available or the event gets triggered/raced while the editor
            // is switching between open windows
            return void 0;
        }

        try {
            this.getProvider().refresh(event);
        } catch (ex) {
            // Don't do anything
        }
        this.onDidChangeTreeDataEmitter.fire(void 0);
    }

    public getProvider(): IBaseProvider<(vscode.TreeItem|string)> {
        let lang = "none";
        if (vscode.window.activeTextEditor !== undefined) {
            lang = vscode.window.activeTextEditor.document.languageId;
            for (const provider of this.langProviders) {
                if (provider.hasSupport(lang)) {
                    return provider;
                }
            }
        }

        throw new Error(`No provider available to handle "${lang}"`);
    }

    public getTreeItem(element: TreeItem): TreeItem | Thenable<TreeItem> {
        try {
            return this.getProvider().getTreeItem(element);
        } catch (ex) {
            return Promise.resolve({} as vscode.TreeItem);
        }
    }

    public getChildren(element?: TreeItem): Thenable<TreeItem[]> {
        try {
            const provider: IBaseProvider<any> = this.getProvider();

            return provider.getTokenTree().then((tree) => {
                if (Object.keys(tree).length !== 0) {
                    const items = this.getBaseChildren(tree, element);
                    const providerItems = provider.getChildren(element) as Thenable<vscode.TreeItem[]>;

                    return providerItems.then((x) => {
                        return items.concat(x).filter((y) => {
                            return items.indexOf(y) === items.lastIndexOf(y);
                        });
                    });
                }

                return provider.getChildren(element);
            });
        } catch (ex) {
            vscode.window.showErrorMessage(ex);
            return Promise.resolve([]);
        }
    }

    private getBaseChildren(tree: ITokenTree, element?: TreeItem): TreeItem[] {
        const items: TreeItem[] = [];
        if (element === undefined) {
            if (tree.strict !== undefined) {
                items.push(new vscode.TreeItem(
                    `Strict: ${tree.strict ? "Yes" : "No"}`,
                ));
            }

            if (tree.imports !== undefined) {
                items.push(new vscode.TreeItem(`Imports`, vscode.TreeItemCollapsibleState.Collapsed));
            }

            if (tree.variables !== undefined) {
                items.push(new vscode.TreeItem(
                    `Variables`,
                    (tree.nodes === undefined || tree.nodes.length === 0) &&
                    (tree.functions === undefined || tree.functions.length === 0) &&
                    (tree.variables.length !== 0) ?
                        vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed,
                ));
            }

            if (tree.functions !== undefined) {
                items.push(new vscode.TreeItem(
                    `Functions`,
                    (tree.nodes === undefined || tree.nodes.length === 0) &&
                    (tree.functions.length !== 0) ?
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
            if (tree.imports !== undefined && element.label.toLowerCase() === "imports") {
                for (const imp of tree.imports.sort(Provider.sort)) {
                    const t = new vscode.TreeItem(
                        `${imp.name}${imp.alias !== undefined && imp.alias !== null ? ` as ${imp.alias}` : ""}`,
                        vscode.TreeItemCollapsibleState.None,
                    );
                    items.push(Provider.addItemCommand(t, "extension.treeview.goto", [ imp.position ]));
                }
            }

            if (tree.variables !== undefined && element.label.toLowerCase() === "variables") {
                for (const variable of tree.variables.sort(Provider.sort)) {
                    const t = new vscode.TreeItem(
                        `${variable.name}` +
                        `${variable.type !== undefined ? `: ${variable.type}` : ""}` +
                        `${variable.value !== undefined ? ` = ${variable.value}` : ""}`,
                        vscode.TreeItemCollapsibleState.None,
                    );

                    items.push(Provider.addItemCommand(Provider.addItemIcon(
                        t,
                        `property_static`,
                        variable.visibility === undefined ? variable.visibility : "public",
                    ), "extension.treeview.goto", [variable.position]));
                }
            }

            if (tree.functions !== undefined && element.label.toLowerCase() === "functions") {
                for (const func of tree.functions.sort(Provider.sort)) {
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

            if (tree.nodes !== undefined) {
                for (const cls of tree.nodes.sort(Provider.sort)) {
                    if (cls.name === element.label) {
                        if (cls.constants) {
                            for (const constant of cls.constants.sort(Provider.sort)) {
                                const t = new vscode.TreeItem(
                                    `${constant.name} = ${constant.value}`,
                                    vscode.TreeItemCollapsibleState.None,
                                );
                                items.push(Provider.addItemIcon(t, "constant"));
                            }
                        }

                        if (cls.properties) {
                            for (const property of cls.properties.sort(Provider.sort)) {
                                const t = new vscode.TreeItem(
                                    `${property.readonly ? "@" : ""}${property.name}: ${property.type}` +
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
                            for (const trait of cls.traits.sort(Provider.sort)) {
                                const t = new vscode.TreeItem(`${trait.name}`, vscode.TreeItemCollapsibleState.None);
                                items.push(Provider.addItemIcon(t, "trait"));
                            }
                        }

                        if (cls.methods) {
                            for (const method of cls.methods.sort(Provider.sort)) {
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
        }

        return items;
    }
}
