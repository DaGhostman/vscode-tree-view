"use strict";

import * as vscode from "vscode";
import { Provider } from "./provider";
import { IBaseProvider, JsonProvider, PhpProvider, RuleProvider, TypescriptProvider } from "./providers";

function goToDefinition(range: vscode.Range) {
    const editor: vscode.TextEditor = vscode.window.activeTextEditor;

        // Center the method in the document
        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
        // Select the method name
        editor.selection = new vscode.Selection(range.start, range.end);
        // Swap the focus to the editor
        vscode.window.showTextDocument(editor.document, editor.viewColumn, false);
}

export function activate(context: vscode.ExtensionContext) {
    const provider = new Provider([
        new PhpProvider(),
        new TypescriptProvider(),
        new JsonProvider(),
        new RuleProvider(),
    ] as Array<IBaseProvider<any>>);

    vscode.window.registerTreeDataProvider("tree-outline", provider);
    vscode.commands.registerCommand("extension.treeview.goto", (range: vscode.Range) => goToDefinition(range));
}

export function deactivate() {
    return undefined;
}
