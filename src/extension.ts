"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { Provider } from "./provider";
import { PhpProvider, TypescriptProvider } from "./providers";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const provider = new Provider([
        new PhpProvider(),
        new TypescriptProvider(),
    ]);

    vscode.window.registerTreeDataProvider("tree-outline", provider);
    vscode.commands.registerCommand("extension.treeview.goto", (range: vscode.Range) => {
        const editor: vscode.TextEditor = vscode.window.activeTextEditor;

        // Center the method in the document
        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
        // Select the method name
        editor.selection = new vscode.Selection(range.start, range.end);
        // Swap the focus to the editor
        vscode.window.showTextDocument(editor.document, editor.viewColumn, false);
    });
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    // let disposable = vscode.commands.registerCommand('extension.sayHello', () => {
    //     // The code you place here will be executed every time your command is executed

    //     // Display a message box to the user
    //     vscode.window.showInformationMessage('Hello World!');
    // });

    // context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
    return undefined;
}
