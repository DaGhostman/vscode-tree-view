import * as vscode from 'vscode';
import { TreeItem } from 'vscode';
import { BaseProvider } from './providers/base';
import * as token from './tokens';

export class Provider implements vscode.TreeDataProvider<TreeItem>
{
    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | null> = new vscode.EventEmitter<TreeItem | null>();
    readonly onDidChangeTreeData: vscode.Event<TreeItem | null> = this._onDidChangeTreeData.event;

    private langProviders: BaseProvider[]
    public static readonly config: vscode.WorkspaceConfiguration;

    public constructor(langProviders: BaseProvider[]) {
        let config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('treeview');
        this.langProviders = langProviders;

        vscode.window.onDidChangeActiveTextEditor((ev) => {
            // if (ev.document !== undefined) {
                this.refresh();
            // }
        })
        // vscode.window.onDidChangeTextEditorSelection(() => this.refresh());
        vscode.workspace.onDidChangeTextDocument((ev) => this.refresh(ev))
        // vscode.workspace.onWillSaveTextDocument(() => this.refresh());
    }

    public refresh(event?: vscode.TextDocumentChangeEvent) {
        try {
            this.getProvider().refresh(event);
            this._onDidChangeTreeData.fire(void 0);
        } catch (ex) {
            console.info(ex);
        }
    }

    public getProvider(): BaseProvider {
        let lang = 'none'
        if (vscode.window.activeTextEditor !== undefined) {
            lang = vscode.window.activeTextEditor.document.languageId;
            for (let provider of this.langProviders) {
                if (provider.hasSupport(lang)) {
                    return provider;
                }
            }
        }

        throw `No provider available to handle '${lang}'`;
    }

    public getTreeItem(element: TreeItem): TreeItem | Thenable<TreeItem> {
        try {
            return this.getProvider().getTreeItem(element);
        } catch (ex) {
            console.error(ex);
            return Promise.resolve(<TreeItem>{})
        }
    }

    public getChildren(element?: TreeItem): Thenable<TreeItem[]> {
        try {
            return this.getProvider().getChildren(element)
        } catch (ex) {
            console.error(ex);
            return Promise.resolve([])
        }
    }

    public static getIcon(node: vscode.TreeItem, key: string, visibility: string = 'public' ) {
        const icons = {
            class: {
                private: vscode.Uri.file(__dirname + '/../assets/ic_class_private_24px.svg'),
                protected: vscode.Uri.file(__dirname + '/../assets/ic_class_private_24px.svg'),
                public: vscode.Uri.file(__dirname + '/../assets/ic_class_public_24px.svg'),
            },
            method: {
                private: vscode.Uri.file(__dirname + '/../assets/ic_method_private_24px.svg'),
                protected: vscode.Uri.file(__dirname + '/../assets/ic_method_protected_24px.svg'),
                public: vscode.Uri.file(__dirname + '/../assets/ic_method_public_24px.svg'),
            },
            property: {
                private: vscode.Uri.file(__dirname + '/../assets/ic_property_private_24px.svg'),
                protected: vscode.Uri.file(__dirname + '/../assets/ic_property_protected_24px.svg'),
                public: vscode.Uri.file(__dirname + '/../assets/ic_property_public_24px.svg'),
            },
            constant: {
                private: vscode.Uri.file(__dirname + '/../assets/ic_constant_private_24px.svg'),
                protected: vscode.Uri.file(__dirname + '/../assets/ic_constant_protected_24px.svg'),
                public: vscode.Uri.file(__dirname + '/../assets/ic_constant_public_24px.svg'),
            },
            trait: {
                public: vscode.Uri.file(__dirname + '/../assets/ic_trait_24px.svg')
            }
        };

        node.iconPath = icons[key][visibility];

        return node;
    }

    public static sort(a: token.VariableToken, b: token.VariableToken): number {
        let vis:number = 0;
        if (a.visibility && b.visibility) {
            vis = a.visibility.localeCompare(b.visibility);
        }
        return  vis === 0 ? a.name.localeCompare(b.name) : vis;
    }
}
