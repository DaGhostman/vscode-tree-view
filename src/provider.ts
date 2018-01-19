import * as fs from "fs";
import * as vscode from "vscode";
import { TreeItem } from "vscode";
import { IBaseProvider } from "./providers/base";
import {
    BaseItem,
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

    public static addItemIcon(node: vscode.TreeItem, key: string, visibility: string = "public") {
        const aliases = {
            function: "method",
            variable: "property",
        };

        if (aliases[key] !== undefined) {
            key = aliases[key];
        }

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
                private_static: vscode.Uri.file(__dirname + "/../assets/ic_static_method_private_24px.svg"),
                protected: vscode.Uri.file(__dirname + "/../assets/ic_method_protected_24px.svg"),
                protected_static: vscode.Uri.file(__dirname + "/../assets/ic_static_method_protected_24px.svg"),
                public: vscode.Uri.file(__dirname + "/../assets/ic_method_public_24px.svg"),
                public_static: vscode.Uri.file(__dirname + "/../assets/ic_static_method_public_24px.svg"),
            },
            property: {
                private: vscode.Uri.file(__dirname + "/../assets/ic_property_private_24px.svg"),
                private_static: vscode.Uri.file(__dirname + "/../assets/ic_static_property_private_24px.svg"),
                protected: vscode.Uri.file(__dirname + "/../assets/ic_property_protected_24px.svg"),
                protected_static: vscode.Uri.file(__dirname + "/../assets/ic_static_property_protected_24px.svg"),
                public: vscode.Uri.file(__dirname + "/../assets/ic_property_public_24px.svg"),
                public_static: vscode.Uri.file(__dirname + "/../assets/ic_static_property_public_24px.svg"),
            },
            trait: {
                public: vscode.Uri.file(__dirname + "/../assets/ic_trait_public_24px.svg"),
            },
            use: {
                public: vscode.Uri.file(__dirname + "/../assets/ic_trait_24px.svg"),
            },
        };

        if (icons[key] !== undefined) {
            node.iconPath = icons[key][visibility];
        }

        return node;
    }

    public static sort(a: IVariableToken, b: IVariableToken): number {
        let vis: number = 0;
        if (a.visibility && b.visibility) {
            vis = a.visibility.localeCompare(b.visibility);
        }

        if (vis === 0 && (!a.static || !b.static)) {
            vis = b.static && !a.static ? 1 : -1;
        }

        return vis === 0 ? a.name.localeCompare(b.name) : vis;
    }

    public readonly onDidChangeTreeDataEmitter: vscode.EventEmitter<TreeItem | null> =
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

    public hasSupport(languageId: string) {
        for (const provider of this.langProviders) {
            if (provider.hasSupport(languageId)) {
                return true;
            }
        }

        return false;
    }

    public getTokenTree(): Thenable<ITokenTree> {
        if (vscode.window.activeTextEditor.document !== undefined) {
            const document: vscode.TextDocument = vscode.window.activeTextEditor.document;

            if (this.hasSupport(document.languageId)) {
                const provider = this.getProvider(document);
                provider.refresh(document);

                return provider.getTokenTree();
            }
        }

        return Promise.resolve({} as ITokenTree);
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

    public getTreeItem(element: BaseItem): TreeItem | Thenable<TreeItem> {
        try {
            if (element !== undefined && vscode.window.activeTextEditor.document !== undefined) {
                if (element.position !== undefined) {
                    element = Provider.addItemCommand(element, "extension.treeview.goto", [element.position]);
                }

                if (element.contextValue !== undefined && element.contextValue.indexOf("section") === -1) {
                    element = Provider.addItemIcon(
                        element,
                        element.contextValue,
                        element.visibility || "public",
                    );
                }

                return this.getProvider(vscode.window.activeTextEditor.document)
                    .getTreeItem(element);
            }
        } catch (ex) {
            return Promise.resolve(element as vscode.TreeItem);
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
            return Promise.resolve([]);
        }
    }

    public generateEntity(node: IInterfaceToken, includeBody: boolean = false) {
        const provider: IBaseProvider<any> = this.getProvider(vscode.window.activeTextEditor.document);
        if (vscode.workspace.workspaceFolders.length === 0) {
            throw new Error(
                "Not available outside of workspace",
            );
        }

        vscode.window.showInputBox({
            prompt: "Name of the entity to generate(if namespaced use `EntityName : Namespace` notation)",
            value: node.name.replace("Interface", ""),
        }).then((entityName?: string) => {
            if (entityName === undefined) {
                vscode.window.showInformationMessage(
                    "Entity creation canceled",
                );
                return false;
            }
            let ns: string = "";

            if (entityName.indexOf(":") !== -1) {
                const dotSplit = entityName.split(":", 2);
                entityName = dotSplit[0].trim();
                ns = dotSplit[1].trim();
            }

            if (entityName === undefined || entityName.trim() === "") {
                vscode.window.showWarningMessage("Class name cannot be empty");
                return false;
            }

            vscode.window.showInputBox({
                placeHolder: "Directory in which to save the generated file (relative to the workspace root)",
            }).then((locationInput?: string) => {
                const cwd: string = vscode.workspace.workspaceFolders[0].uri.path;

                // if (locationInput !== "" && fs.statSync(`${cwd}/${locationInput}`)) {
                //     vscode.window.showErrorMessage(
                //         `Directory "${locationInput}" does not exist`,
                //     );
                //     return false;
                // }

                provider.getDocumentName(entityName, includeBody).then((documentName) => {

                    const location: vscode.Uri = vscode.Uri.file(
                        `${cwd}/${locationInput}/${documentName}`,
                    );

                    fs.open(location.fsPath, "wx", (err, fd) => {
                        if (err === null) {
                            fs.closeSync(fd);

                            const workspaceEdits: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
                            workspaceEdits.set(location, provider.generate(
                                entityName,
                                node,
                                includeBody,
                                { ns },
                            ));

                            vscode.workspace.applyEdit(workspaceEdits);
                            vscode.workspace.openTextDocument(vscode.workspace.asRelativePath(location))
                                .then((document) =>
                                    vscode.window.showTextDocument(document, vscode.ViewColumn.Active, true));

                            return void 0;
                        }

                        vscode.window.showErrorMessage(
                            `File "${vscode.workspace.asRelativePath(location, false)}" already exists.`,
                        );
                    });
                });

            });
        });
    }

    protected getProvider(document: vscode.TextDocument): IBaseProvider<(vscode.TreeItem | string)> {
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
                        new InterfaceItem(
                            cls.name,
                            collapsed,
                            undefined,
                            cls.position,
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
                        new TraitItem(
                            cls.name,
                            collapsed,
                            undefined,
                            cls.position,
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
                        new ClassItem(
                            cls.name,
                            collapsed,
                            undefined,
                            cls.position,
                            `${cls.visibility || "public"}`,
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
                        undefined,
                        imp.position,
                    );
                    items.push(t);
                }
            }

            if (element.contextValue === "variables-section") {
                for (const variable of tree.variables.sort(Provider.sort)) {
                    const vName: string = `${variable.name}` +
                        `${variable.type !== undefined ? `: ${variable.type}` : ""}` +
                        `${variable.value !== undefined ? ` = ${variable.value}` : ""}`;

                    items.push(new VariableItem(
                        vName,
                        vscode.TreeItemCollapsibleState.None,
                        undefined,
                        variable.position,
                        `${variable.visibility}_static`,
                    ));
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

                    items.push(new FunctionItem(
                        `${func.name}(${args.join(", ")})` +
                        `${func.type !== undefined ? `: ${func.type}` : ""}`,
                        vscode.TreeItemCollapsibleState.None,
                        undefined,
                        func.position,
                        `${func.visibility}_static`,
                    ));
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
                const cls = tree.classes.find((t: IClassToken) => t.name === element.label);

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
                    undefined,
                    constant.position,
                    constant.visibility,
                );
                items.push(t);
            }
        }

        if (cls.properties !== undefined) {
            for (const property of cls.properties.sort(Provider.sort)) {
                const t = new PropertyItem(
                    `${property.name}: ${property.type}` +
                    `${property.value !== "" ? ` = ${property.value}` : ""}`,
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    property.position,
                    `${property.visibility}${property.static ? "_static" : ""}`,
                );

                items.push(t);
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
                    undefined,
                    method.position,
                    `${method.visibility}${method.static ? "_static" : ""}`,
                );

                items.push(t);
            }
        }

        return items;
    }

    private handleTrait(cls: ITraitToken): TreeItem[] {
        const items: TreeItem[] = [];

        if (cls.constants !== undefined) {
            for (const constant of cls.constants.sort(Provider.sort)) {
                const t = new ConstantItem(
                    `${constant.name} = ${constant.value}`,
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    constant.position,
                    constant.visibility,
                );
                items.push(t);
            }
        }

        if (cls.properties !== undefined) {
            for (const property of cls.properties.sort(Provider.sort)) {
                const t = new PropertyItem(
                    `${property.name}: ${property.type}` +
                    `${property.value !== "" ? ` = ${property.value}` : ""}`,
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    property.position,
                    `${property.visibility}${property.static ? "_static" : ""}`,
                );

                items.push(t);
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
                    undefined,
                    method.position,
                    `${method.visibility}${method.static ? "_static" : ""}`,
                );

                items.push(t);
            }
        }

        return items;
    }

    private handleClass(cls: IClassToken): TreeItem[] {
        const items: TreeItem[] = [];

        if (cls.constants !== undefined) {
            for (const constant of cls.constants.sort(Provider.sort)) {
                const t = new ConstantItem(
                    `${constant.name} = ${constant.value}`,
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    constant.position,
                    constant.visibility,
                );
                items.push(t);
            }
        }

        if (cls.properties !== undefined) {
            for (const property of cls.properties.sort(Provider.sort)) {
                const t = new PropertyItem(
                    `${property.name}: ${property.type}` +
                    `${property.value !== "" ? ` = ${property.value}` : ""}`,
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    property.position,
                    `${property.visibility}${property.static ? "_static" : ""}`,
                );

                items.push(t);
            }
        }

        if (cls.traits !== undefined) {
            for (const trait of cls.traits.sort(Provider.sort)) {
                const t = new TraitItem(
                    `${trait.name}`,
                    vscode.TreeItemCollapsibleState.None,
                    "use",
                    trait.position,
                    "public",
                );
                items.push(t);
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
                    undefined,
                    method.position,
                    `${method.visibility}${method.static ? "_static" : ""}`,
                );

                items.push(t);
            }
        }

        return items;
    }
}
