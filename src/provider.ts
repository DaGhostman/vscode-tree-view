import * as vscode from "vscode";
import { TreeItem } from "vscode";
import { IBaseProvider } from "./providers/base";
import {
    ClassItem,
    ConstantItem,
    FunctionItem,
    IClassToken,
    IInterfaceToken,
    ImportItem,
    InterfaceItem,
    ITokenTree,
    ITraitToken,
    IVariableToken,
    MethodItem,
    PropertyItem,
    SectionItem,
    TraitItem,
    VariableItem,
} from "./tokens";

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
            interface: {
                private: vscode.Uri.file(__dirname + "/../assets/ic_interface_private_24px.svg"),
                public: vscode.Uri.file(__dirname + "/../assets/ic_interface_public_24px.svg"),
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
                public: vscode.Uri.file(__dirname + "/../assets/ic_trait_public_24px.svg"),
            },
            use: {
                public: vscode.Uri.file(__dirname + "/../assets/ic_trait_24px.svg"),
            },
        };

        node.iconPath = icons[key][visibility];

        return node;
    }

    public static sort(a: IVariableToken, b: IVariableToken): number {
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
        vscode.window.onDidChangeActiveTextEditor((ev: vscode.TextEditor) => {
            this.refresh(ev.document);
        });
        vscode.workspace.onDidSaveTextDocument((document) => this.refresh(document));
        vscode.workspace.onDidOpenTextDocument((document) => this.refresh(document));
        vscode.workspace.onDidCloseTextDocument((document) => this.refresh(document));
    }

    public refresh(document: vscode.TextDocument) {
        if (!document.isClosed && !document.isDirty) {
            try {
                this.getProvider(document).refresh(document);
            } catch (ex) {
                // Don't do anything
            }
        }

        this.onDidChangeTreeDataEmitter.fire(void 0);
    }

    public getTreeItem(element: TreeItem): TreeItem | Thenable<TreeItem> {
        try {
            if (vscode.window.activeTextEditor.document !== undefined) {
                return this.getProvider(vscode.window.activeTextEditor.document)
                    .getTreeItem(element);
            }
        } catch (ex) {
            return Promise.resolve({} as vscode.TreeItem);
        }

        return Promise.resolve({} as vscode.TreeItem);
    }

    public getChildren(element?: TreeItem): Thenable<TreeItem[]> {
        try {
            if (vscode.window.activeTextEditor.document !== undefined) {
                const provider: IBaseProvider<any> =
                    this.getProvider(vscode.window.activeTextEditor.document);

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
            }
        } catch (ex) {
            vscode.window.showErrorMessage(ex);
            // console.error(ex);
            return Promise.resolve([]);
        }
    }

    protected getProvider(document: vscode.TextDocument): IBaseProvider<(vscode.TreeItem|string)> {
        if (!document.isClosed) {
            for (const provider of this.langProviders) {
                if (provider.hasSupport(document.languageId)) {
                    return provider;
                }
            }
        }

        throw new Error(`No provider available to handle "${document.languageId}"`);
    }

    private getBaseChildren(tree: ITokenTree, element?: TreeItem): TreeItem[] {
        let items: TreeItem[] = [];
        if (element === undefined) {
            items.push(new vscode.TreeItem(
                `Strict: ${tree.strict !== undefined && tree.strict ? "Yes" : "No"}`,
            ));

            if (tree.imports !== undefined) {
                items.push(new SectionItem(
                    `Imports`,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    "import-section",
                ));
            }

            if (tree.variables !== undefined) {
                items.push(new SectionItem(
                    `Variables`,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    "variables-section",
                ));
            }

            if (tree.functions !== undefined) {
                items.push(new SectionItem(
                    `Functions`,
                    (tree.interfaces === undefined || tree.interfaces.length === 0) &&
                    (tree.traits === undefined || tree.traits.length === 0) &&
                    (tree.classes === undefined || tree.classes.length === 0) &&
                    (tree.functions.length !== 0) ?
                        vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed,
                    "functions-section",
                ));
            }

            if (tree.interfaces !== undefined) {
                for (const cls of tree.interfaces) {
                    const collapsed: number =
                    (tree.traits === undefined || tree.traits.length === 0) &&
                    (tree.classes === undefined || tree.classes.length === 0) &&
                    tree.interfaces.indexOf(cls) === 0 ?
                        vscode.TreeItemCollapsibleState.Expanded :
                        vscode.TreeItemCollapsibleState.Collapsed;

                    items.push(
                        Provider.addItemIcon(
                            new InterfaceItem(cls.name, collapsed),
                            "interface",
                            cls.visibility,
                        ),
                    );
                }
            }

            if (tree.traits !== undefined) {
                for (const cls of tree.traits) {
                    const collapsed: number =
                    (tree.classes === undefined || tree.classes.length === 0) &&
                    tree.traits.indexOf(cls) === 0 ?
                        vscode.TreeItemCollapsibleState.Expanded :
                        vscode.TreeItemCollapsibleState.Collapsed;

                    items.push(
                        Provider.addItemIcon(
                            new TraitItem(cls.name, collapsed),
                            "trait",
                            cls.visibility,
                        ),
                    );
                }
            }

            if (tree.classes !== undefined) {
                for (const cls of tree.classes) {
                    const collapsed: number = tree.classes.indexOf(cls) === 0 ?
                        vscode.TreeItemCollapsibleState.Expanded :
                        vscode.TreeItemCollapsibleState.Collapsed;

                    items.push(
                        Provider.addItemIcon(
                            new ClassItem(cls.name, collapsed),
                            "class",
                            cls.visibility,
                        ),
                    );
                }
            }
        } else {
            if (element.contextValue === "import-section") {
                for (const imp of tree.imports.sort(Provider.sort)) {
                    const t = new ImportItem(
                        `${imp.name}${imp.alias !== undefined && imp.alias !== null ? ` as ${imp.alias}` : ""}`,
                        vscode.TreeItemCollapsibleState.None,
                    );
                    items.push(Provider.addItemCommand(t, "extension.treeview.goto", [ imp.position ]));
                }
            }

            if (element.contextValue === "variables-section") {
                for (const variable of tree.variables.sort(Provider.sort)) {
                    const t = new VariableItem(
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

            if (element.contextValue === "functions-section") {
                for (const func of tree.functions.sort(Provider.sort)) {
                    const args = [];
                    for (const arg of func.arguments) {
                        args.push(
                            `${arg.type !== undefined ? `${arg.type} ` : ""}` +
                            `${arg.name}${(arg.value !== "" ? ` = ${arg.value}` : "")}`,
                        );
                    }
                    const t = new FunctionItem(
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

            if (element.contextValue === "interface") {
                const cls = tree.interfaces.find((t: IInterfaceToken) => t.name === element.label);

                items = items.concat(this.handleInterface(cls));
            }

            if (element.contextValue === "trait") {
                const cls = tree.traits.find((t: ITraitToken) => t.name === element.label);

                items = items.concat(this.handleInterface(cls));
            }

            if (element.contextValue === "class") {
                const cls = tree.classes.find((t: IInterfaceToken) => t.name === element.label);

                items = items.concat(this.handleClass(cls));
            }
        }

        return items;
    }

    private handleInterface(cls: IInterfaceToken): TreeItem[] {
        const items: TreeItem[] = [];

        if (cls.constants !== undefined) {
            for (const constant of cls.constants.sort(Provider.sort)) {
                const t = new ConstantItem(
                    `${constant.name} = ${constant.value}`,
                    vscode.TreeItemCollapsibleState.None,
                );
                items.push(Provider.addItemIcon(t, "constant"));
            }
        }

        if (cls.methods !== undefined) {
            for (const method of cls.methods.sort(Provider.sort)) {
                const args = [];
                for (const arg of method.arguments) {
                    args.push(
                        `${arg.type !== undefined ? `${arg.type} ` : ""}${arg.name}` +
                            `${(arg.value !== "" ? ` = ${arg.value}` : "")}`,
                    );
                }
                const t = new MethodItem(
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

        return items;
    }

    private handleTrait(cls: ITraitToken): TreeItem[] {
        const items: TreeItem[] = this.handleInterface(cls);

        if (cls.properties !== undefined) {
            for (const property of cls.properties.sort(Provider.sort)) {
                const t = new PropertyItem(
                    `${property.name}: ${property.type}` +
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

        return items;
    }

    private handleClass(cls: IClassToken): TreeItem[] {
        const items: TreeItem[] = this.handleTrait(cls);

        if (cls.traits !== undefined) {
            for (const trait of cls.traits.sort(Provider.sort)) {
                const t = new TraitItem(`${trait.name}`, vscode.TreeItemCollapsibleState.None);
                items.push(Provider.addItemIcon(t, "use"));
            }
        }

        return items;
    }
}
