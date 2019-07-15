import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { TreeItem } from "vscode";
import { IBaseProvider } from "./providers/base";
import {
    AccessorItem,
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
            accessor_get: {
                private: vscode.Uri.file(__dirname + "/../assets/ic_arrow_back_private_24px.svg"),
                protected: vscode.Uri.file(__dirname + "/../assets/ic_arrow_back_protected_24px.svg"),
                public: vscode.Uri.file(__dirname + "/../assets/ic_arrow_back_public_24px.svg"),
            },
            accessor_set: {
                private: vscode.Uri.file(__dirname + "/../assets/ic_arrow_forward_private_24px.svg"),
                protected: vscode.Uri.file(__dirname + "/../assets/ic_arrow_forward_protected_24px.svg"),
                public: vscode.Uri.file(__dirname + "/../assets/ic_arrow_forward_public_24px.svg"),
            },
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
                protected: vscode.Uri.file(__dirname + "/../assets/ic_interface_protected_24px.svg"),
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
        if (a.visibility && b.visibility && a.visibility !== b.visibility) {
            vis = a.visibility.localeCompare(b.visibility);
        }

        if (vis === 0 && (a.static || b.static) && !(a.static && b.static)) {
            vis = b.static && !a.static ? 1 : -1;
        }

        return vis === 0 ? a.name.localeCompare(b.name) : vis;
    }

    public readonly onDidChangeTreeDataEmitter: vscode.EventEmitter<TreeItem | null> =
        new vscode.EventEmitter<TreeItem | null>();
    public readonly onDidChangeTreeData: vscode.Event<TreeItem | null> = this.onDidChangeTreeDataEmitter.event;

    private langProviders: Array<IBaseProvider<any>>;

    protected get roChar(): string {
        return vscode.workspace.getConfiguration("treeview")
            .get("readonlyCharacter") as string;
    }

    protected get absChar(): string {
        return vscode.workspace.getConfiguration("treeview")
            .get("abstractCharacter") as string;
    }

    protected get updateOnError(): boolean {
        return vscode.workspace.getConfiguration("treeview")
            .get("updateOnError") as boolean;
    }

    private pinnedEditor: vscode.TextEditor;
    private pinned: boolean = false;

    public constructor(langProviders: Array<IBaseProvider<any>>) {
        this.langProviders = langProviders;
        vscode.window.onDidChangeActiveTextEditor((ev?: vscode.TextEditor) => {
            if ((ev && ev.document) || (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document)) {
                this.refresh((ev || vscode.window.activeTextEditor).document);
            }
        });
        vscode.workspace.onDidSaveTextDocument((document) => {
            if (!this.updateOnError && this.hasErrorsInDiagnostic(document)) {
                return void 0;
            }

            this.refresh(document);
        });
        vscode.window.onDidChangeVisibleTextEditors((ev?: vscode.TextEditor[]) => {
            if (ev.length > 0 && ev[0].document) {
                this.refresh(ev[0].document);
            }
        });
    }

    public pin(state: boolean) {
        delete this.pinnedEditor;
        if (state) {
            this.pinnedEditor = vscode.window.activeTextEditor;
        }
        this.pinned = state;
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
        let document = vscode.window.activeTextEditor.document;
        if (this.pinnedEditor) {
            document = this.pinnedEditor.document;
        }

        if (document !== undefined) {
            if (this.hasSupport(document.languageId)) {
                const provider = this.getProvider(document);
                provider.refresh(document);

                return provider.getTokenTree();
            }
        }

        return Promise.resolve({} as ITokenTree);
    }

    public refresh(document: vscode.TextDocument) {
        if (!this.pinned && !document.isClosed && !document.isDirty) {
            try {
                this.getProvider(document).refresh(document);
                vscode.commands.executeCommand(
                    "setContext",
                    "treeview.provider.dynamic",
                    this.getProvider(document).isDynamic(),
                );

            } catch (ex) {
                // console.log(ex);
            }
        }

        this.onDidChangeTreeDataEmitter.fire(void 0);
    }

    public async getTreeItem(element: BaseItem): Promise<TreeItem> {
        try {
            if (element !== undefined && vscode.window.activeTextEditor.document !== undefined) {
                if (element.position !== undefined) {
                    element = Provider.addItemCommand(element, "extension.treeview.goto", [
                        (this.pinnedEditor || vscode.window.activeTextEditor),
                        element.position,
                    ]);
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

    public async getChildren(element?: TreeItem): Promise<TreeItem[]> {
        try {
            if (vscode.window.activeTextEditor.document !== undefined) {
                const provider: IBaseProvider<any> =
                    this.getProvider(vscode.window.activeTextEditor.document);

                return this.getTokenTree().then((tree) => {
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
            return Promise.resolve([] as TreeItem[]);
        }
    }

    public generateEntity(
        node: IInterfaceToken,
        includeBody: boolean = false,
        ns: string = "",
        strict: boolean = false,
    ) {
        const provider: IBaseProvider<any> = this.getProvider(vscode.window.activeTextEditor.document);
        if (vscode.workspace.workspaceFolders.length === 0) {
            throw new Error(
                "Not available outside of workspace",
            );
        }

        vscode.window.showInputBox({
            prompt: "Name of the entity to generate(if namespaced use `EntityName : Namespace` notation)",
            value: node.name,
        }).then((entityName?: string) => {
            if (entityName === undefined) {
                vscode.window.showInformationMessage(
                    "Entity creation canceled",
                );
                return false;
            }

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
                provider.getDocumentName(entityName, includeBody).then((documentName) => {

                    const location: vscode.Uri = vscode.Uri.file(
                        `${cwd}/${locationInput}/${documentName}`,
                    );

                    fs.open(location.fsPath, "wx", (err, fd) => {
                        if (err !== null) {
                            vscode.window.showErrorMessage(
                                `File "${location.fsPath}" already exists. ${err.message}`,
                            );

                            return void 0;
                        }
                        fs.closeSync(fd);

                        const workspaceEdits: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
                        workspaceEdits.set(location, provider.generate(
                            entityName,
                            node,
                            includeBody,
                            {
                                ext: path.extname(documentName),
                                ns,
                                strict,
                            },
                        ));

                        vscode.workspace.applyEdit(workspaceEdits);
                        vscode.workspace.openTextDocument(location)
                            .then((document) => {
                                document.save().then((saved) => {
                                    const loc = location.fsPath.substr(cwd.length).replace(/\\/, "/");
                                    if (saved) {
                                        vscode.window.showInformationMessage(`Successfully created "${loc}"`);
                                    } else {
                                        vscode.window.showErrorMessage(`Unable to save "${loc}".`);
                                    }

                                });
                            });
                    });
                }, (err) => {
                    vscode.window.showWarningMessage(err);
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
            if (tree.strict) {
                items.push(new vscode.TreeItem(
                    `Strict: ${tree.strict !== undefined && tree.strict ? "Yes" : "No"}`,
                ));
            }

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
                    vscode.TreeItemCollapsibleState.Expanded,
                    "functions-section",
                ));
            }

            if (tree.interfaces !== undefined) {
                for (const cls of tree.interfaces) {
                    const collapsed: number = tree.interfaces.indexOf(cls) === 0 ?
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
                            (cls.readonly ? this.roChar : (cls.abstract ? this.absChar : "")) + cls.name,
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
                    for (const arg of (func.arguments || [])) {
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

                items = items.concat(this.handleTrait(cls));
            }

            if (element.contextValue === "class") {
                const cls = tree.classes.find((t: IClassToken) =>
                    t.name === element.label
                    .replace(this.roChar, "")
                    .replace(this.absChar, ""),
                );

                items = items.concat(this.handleClass(cls));
            }
        }

        return items;
    }

    private handleInterface(cls: IInterfaceToken): TreeItem[] {
        const items: TreeItem[] = [];

        if (cls.constants !== undefined) {
            for (const constant of cls.constants.sort(Provider.sort)) {
                const valueType = constant.type !== undefined ? `: ${constant.type}` : "";
                const t = new ConstantItem(
                    `${constant.name}${valueType} = ${constant.value}`,
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
                const propertyType = property.type !== undefined ? `: ${property.type}` : "";
                const t = new PropertyItem(
                    `${property.name}${propertyType}` +
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
                for (const arg of (method.arguments || [])) {
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
                    `${method.visibility || "public"}${method.static ? "_static" : ""}`,
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
                const valueType = constant.type !== undefined ? `: ${constant.type}` : "";
                const t = new ConstantItem(
                    `${constant.name}${valueType} = ${constant.value}`,
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
                const propertyType = property.type !== undefined ? `: ${property.type}` : "";
                const t = new PropertyItem(
                    `${property.name}${propertyType}` +
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
                    (method.readonly ? this.roChar : "") +
                    `${method.name}(${args.join(", ")})` +
                    `${method.type !== undefined ? `: ${method.type}` : ""}`,
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    method.position,
                    `${method.visibility || "public"}${method.static ? "_static" : ""}`,
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
                const valueType = constant.type !== undefined ? `: ${constant.type}` : "";
                const t = new ConstantItem(
                    `${constant.name}${valueType} = ${constant.value}`,
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    constant.position,
                    constant.visibility,
                );
                items.push(t);
            }
        }

        if (cls.accessors !== undefined) {
            for (const accessor of cls.accessors.sort(Provider.sort)) {
                const accessorType = accessor.type !== undefined ? `: ${accessor.type}` : "";
                const t = new AccessorItem(
                    `${accessor.name}${accessorType}` + `${accessor.value !== "" ? ` = ${accessor.value}` : ""}`,
                    vscode.TreeItemCollapsibleState.None,
                    null,
                    accessor.position,
                    `${accessor.visibility}`,
                );
                t.contextValue = `accessor_${accessor.direction}`;

                items.push(t);
            }
        }

        if (cls.properties !== undefined) {
            for (const property of cls.properties.sort(Provider.sort)) {
                const propertyType = property.type !== undefined ? `: ${property.type}` : "";
                const t = new PropertyItem(
                    (property.readonly ? this.roChar : "") +
                    `${property.name}${propertyType}` +
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
                for (const arg of (method.arguments || [])) {
                    args.push(
                        `${arg.type !== undefined ? `${arg.type} ` : ""}${arg.name}` +
                        `${(arg.value !== "" ? ` = ${arg.value}` : "")}`,
                    );
                }

                const t = new MethodItem(
                    (method.readonly ? this.roChar : (method.abstract ? this.absChar : "")) +
                    `${method.name}(${args.join(", ")})` +
                    `${method.type !== undefined ? `: ${method.type}` : ""}`,
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    method.position,
                    `${method.visibility || "public"}${method.static ? "_static" : ""}`,
                );

                items.push(t);
            }
        }

        return items;
    }

    private hasErrorsInDiagnostic(document: vscode.TextDocument): boolean {
        const halt = vscode.languages.getDiagnostics().find((x) => {
            if (x[0].fsPath === document.uri.fsPath) {
                const diag = x[1].find((y) => {
                    if (y.severity === vscode.DiagnosticSeverity.Error) {
                        return true;
                    }
                });

                return (diag !== undefined);
            }
            return false;
        });

        return halt !== undefined;
    }
}
