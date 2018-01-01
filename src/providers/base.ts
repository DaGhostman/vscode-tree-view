import * as vscode from "vscode";
import * as token from "../tokens";
export * from "../tokens";

export interface IBaseProvider<T> extends vscode.TreeDataProvider<T> {
    hasSupport(langId: string): boolean;
    refresh(event?: vscode.TextDocumentChangeEvent): void;

    getTokenTree(raw?: any): token.ITokenTree;
}
