import * as vscode from 'vscode';
import * as token from '../tokens'
import { TreeItem } from 'vscode';

export interface BaseProvider
{
    hasSupport(langId: string): boolean
    refresh(event?: vscode.TextDocumentChangeEvent): void

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem>
    getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]>
}
