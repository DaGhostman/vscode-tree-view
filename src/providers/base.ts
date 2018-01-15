import * as vscode from "vscode";
import * as token from "../tokens";

export interface IBaseProvider<T> extends vscode.TreeDataProvider<T> {
    hasSupport(langId: string): boolean;
    refresh(document: vscode.TextDocument): void;

    getTokenTree(): Thenable<token.ITokenTree>;
}
