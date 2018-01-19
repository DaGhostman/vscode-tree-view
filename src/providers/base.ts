import * as vscode from "vscode";
import * as token from "../tokens";

export interface IBaseProvider<T> extends vscode.TreeDataProvider<T> {
    hasSupport(langId: string): boolean;
    refresh(document: vscode.TextDocument): void;

    getTokenTree(): Thenable<token.ITokenTree>;

    generate(
        entityName: string,
        node: (token.IInterfaceToken | token.IClassToken),
        includeBody: boolean,
        options?: any,
    ): vscode.TextEdit[];
    getDocumentName(entityName: string, includeBody: boolean): Thenable<string>;
}
