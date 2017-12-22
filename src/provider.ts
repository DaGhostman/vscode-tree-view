import * as vscode from "vscode";
import { TreeItem } from "vscode";
import { IBaseProvider } from "./providers/base";
import * as token from "./tokens";

export class Provider implements vscode.TreeDataProvider<TreeItem> {
    public static readonly config: vscode.WorkspaceConfiguration;

    public static getIcon(node: vscode.TreeItem, key: string, visibility: string = "public" ) {
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
            return this.getProvider().getChildren(element) as Thenable<vscode.TreeItem[]>;
        } catch (ex) {
            return Promise.resolve([]);
        }
    }
}
