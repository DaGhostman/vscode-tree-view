import * as json from "jsonc-parser";
import * as vscode from "vscode";
import { Provider } from "./../provider";
import { IBaseProvider } from "./base";

export class JsonProvider implements IBaseProvider<string> {
    private tree: json.Node;
    private text: string;
    private editor: vscode.TextEditor;

    public hasSupport(langId: string) {
        return langId.toLowerCase() === "json";
    }

    public refresh(event?: vscode.TextDocumentChangeEvent): void {
        this.parseTree(event ? event.document : vscode.window.activeTextEditor.document);
    }

    public getChildren(offset?: string): Thenable<string[]> {
        if (!this.tree) {
            this.refresh();
        }
        if (offset) {
            const p = json.getLocation(this.text, parseInt(offset, 10)).path;
            const node = json.findNodeAtLocation(this.tree, p);
            return Promise.resolve(this.getChildrenOffsets(node));
        } else {
            return Promise.resolve(this.tree ? this.getChildrenOffsets(this.tree) : []);
        }
    }

    public getTreeItem(offset: string): vscode.TreeItem {
        const p = json.getLocation(this.text, parseInt(offset, 10)).path;
        const valueNode = json.findNodeAtLocation(this.tree, p);
        if (valueNode) {
            const hasChildren = valueNode.type === "object" || valueNode.type === "array";
            let treeItem: vscode.TreeItem = new vscode.TreeItem(
                this.getLabel(valueNode),
                hasChildren ? vscode.TreeItemCollapsibleState.Collapsed :
                    vscode.TreeItemCollapsibleState.None,
            );

            treeItem.contextValue = valueNode.type;
            if (!hasChildren) {
                const start = vscode.window.activeTextEditor.document.positionAt(valueNode.offset);
                const end = new vscode.Position(start.line, start.character + valueNode.length);

                treeItem = Provider.addItemCommand(
                    treeItem,
                    "extension.treeview.goto",
                    [new vscode.Range(start, end)],
                );
            }

            return Provider.addItemIcon(
                treeItem,
                hasChildren ? "list" : "property",
            );
        }

        return null;
    }

    public select(range: vscode.Range) {
        this.editor.selection = new vscode.Selection(range.start, range.end);
    }

    private parseTree(document?: vscode.TextDocument): void {
        document = document !== undefined ? document : vscode.window.activeTextEditor.document;
        if (document) {
            this.text = document.getText();
            this.tree = json.parseTree(this.text);
        }
    }

    private getChildrenOffsets(node: json.Node): string[] {
        const offsets = [];
        for (const child of node.children) {
            const childPath = json.getLocation(this.text, child.offset).path;
            const childNode = json.findNodeAtLocation(this.tree, childPath);
            if (childNode) {
                offsets.push(childNode.offset.toString());
            }
        }
        return offsets;
    }

    private getLabel(node: json.Node): string {
        if (node.parent.type === "array") {
            const prefix = node.parent.children.indexOf(node).toString();
            if (node.type === "object" || node.type === "array") {
                return prefix;
            }
            return prefix.match(/^\d+$/).length === 0 ?
                prefix + ":" + node.value.toString() : node.value.toString();
        } else {
            const property = node.parent.children[0].value.toString();
            if (node.type === "array" || node.type === "object") {
                if (node.type === "object" || node.type === "array") {
                    return property;
                }
            }
            const value = vscode.window.activeTextEditor.document.getText(new vscode.Range(
                vscode.window.activeTextEditor.document.positionAt(node.offset),
                vscode.window.activeTextEditor.document.positionAt(node.offset + node.length),
            ));

            return `${property}: ${value}`;
        }
    }
}
