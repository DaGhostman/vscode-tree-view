"use strict";

import * as vscode from "vscode";
import { PhpGenerator } from "../out/generators/php";
import { Provider } from "./provider";
import {
    IBaseProvider,
    JsonProvider,
    PhpProvider,
    PythonProvider,
    RuleProvider,
    TypescriptProvider,
} from "./providers";

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
    const providers: Array<IBaseProvider<string | vscode.TreeItem>> = [];
    const config = vscode.workspace.getConfiguration("treeview");

    const allowedProviders: string[] = config.has("allowedProviders") ?
        config.get("allowedProviders") : [];

    if (allowedProviders.length === 0 || allowedProviders.indexOf("php") !== -1) {
        providers.push(new PhpProvider());
    }

    if (allowedProviders.length === 0 || allowedProviders.indexOf("javascript") !== -1) {
        providers.push(new TypescriptProvider());
    }

    if (allowedProviders.length === 0 || allowedProviders.indexOf("json") !== -1) {
        providers.push(new JsonProvider());
    }

    if (allowedProviders.length === 0 || allowedProviders.indexOf("openhab") !== -1) {
        providers.push(new RuleProvider());
    }

    if (allowedProviders.length === 0 || allowedProviders.indexOf("python") !== -1) {
        providers.push(new PythonProvider());
    }

    const provider = new Provider(providers as Array<IBaseProvider<string | vscode.TreeItem>>);

    if (vscode.window.activeTextEditor.document !== null) {
        provider.refresh(vscode.window.activeTextEditor.document);
    }

    vscode.window.registerTreeDataProvider("tree-outline", provider);
    vscode.commands.registerCommand("extension.treeview.goto", (range: vscode.Range) => goToDefinition(range));
    vscode.commands.registerCommand("extension.treeview.extractInterface", (a: vscode.TreeItem) => {
        provider.getTokenTree().then((tokenTree) => {
            tokenTree.classes.map((t) => {
                if (t.name === a.label) {
                    provider.generateEntity(t, false, tokenTree.strict);
                }
            });
        });
    });

    vscode.commands.registerCommand("extension.treeview.implementInterface", (a: vscode.TreeItem) => {
        provider.getTokenTree().then((tokenTree) => {
            tokenTree.interfaces.map((t) => {
                if (t.name === a.label) {
                    provider.generateEntity(t, true, tokenTree.strict);
                }
            });
        });
    });
}

export function deactivate() {
    return undefined;
}
