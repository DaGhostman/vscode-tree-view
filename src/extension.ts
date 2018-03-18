"use strict";

import * as vscode from "vscode";
import { Provider } from "./provider";
import {
    IBaseProvider,
    ItemsProvider,
    JavaProvider,
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

    if (allowedProviders.length === 0 || allowedProviders.indexOf("java") !== -1) {
        providers.push(new JavaProvider());
    }

    if (allowedProviders.length === 0 || allowedProviders.indexOf("openhab") !== -1) {
        providers.push(new RuleProvider());
        providers.push(new ItemsProvider());
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
    vscode.commands.registerCommand("extension.treeview.extractInterface", (a?: vscode.TreeItem) => {
        const conf = vscode.workspace.getConfiguration("treeview");
        provider.getTokenTree().then((tokenTree) => {
            const entities = (tokenTree.classes || []).concat(tokenTree.traits || []);

            if (entities.length === 0) {
                vscode.window.showWarningMessage("No suitable entities found in file");
                return false;
            }

            if (a === undefined) {
                if (entities.length === 1) {
                    entities.map((t) => {
                        provider.generateEntity(t, false, tokenTree.namespace, tokenTree.strict);
                    });

                    return true;
                } else {
                    vscode.window.showQuickPick(entities.map((e) => e.name))
                        .then((label) => {
                            label = label
                                .replace(conf.get("readonlyCharacter"), "")
                                .replace(conf.get("abstractCharacter"), "");

                            entities.map((t) => {
                                if (t.name === label) {
                                    provider.generateEntity(t, false, tokenTree.namespace, tokenTree.strict);
                                }
                            });
                        });
                }

                return true;
            }

            entities.map((t) => {
                const label = a.label
                    .replace(conf.get("readonlyCharacter"), "")
                    .replace(conf.get("abstractCharacter"), "");

                if (t.name === label) {
                    provider.generateEntity(t, false, tokenTree.namespace, tokenTree.strict);
                }
            });
        });
    });

    vscode.commands.registerCommand("extension.treeview.duplicateEntity", (a?: vscode.TreeItem) => {
        const conf = vscode.workspace.getConfiguration("treeview");
        provider.getTokenTree().then((tokenTree) => {
            const entities = (tokenTree.classes || []).concat(tokenTree.traits || []);
            if (entities.length === 0) {
                vscode.window.showWarningMessage("No suitable entities found in file");
                return false;
            }

            if (a === undefined) {
                if (entities.length === 1) {
                    entities.map((t) => {
                        provider.generateEntity(t, true, tokenTree.namespace, tokenTree.strict);
                    });

                    return true;
                } else {
                    vscode.window.showQuickPick(entities.map((e) => e.name))
                        .then((label) => {
                            label = label
                                .replace(conf.get("readonlyCharacter"), "")
                                .replace(conf.get("abstractCharacter"), "");

                            entities.map((t) => {
                                if (t.name === label) {
                                    provider.generateEntity(t, true, tokenTree.namespace, tokenTree.strict);
                                }
                            });
                        });
                }

                return true;
            }

            entities.map((t) => {
                const label = a.label
                    .replace(conf.get("readonlyCharacter"), "")
                    .replace(conf.get("abstractCharacter"), "");

                if (t.name === label) {
                    provider.generateEntity(t, true, tokenTree.namespace, tokenTree.strict);
                }
            });
        });
    });

    vscode.commands.registerCommand("extension.treeview.implementInterface", (a?: vscode.TreeItem) => {
        provider.getTokenTree().then((tokenTree) => {
            const conf = vscode.workspace.getConfiguration("treeview");
            if (tokenTree.interfaces.length === 0) {
                vscode.window.showWarningMessage("No interfaces found in file");
                return false;
            }

            if (a === undefined) {
                if (tokenTree.interfaces.length === 1) {
                    tokenTree.interfaces.map((t) => {
                        provider.generateEntity(t, true, tokenTree.namespace, tokenTree.strict);
                    });

                } else {
                    vscode.window.showQuickPick(tokenTree.interfaces.map((e) => e.name))
                        .then((label) => {
                            tokenTree.interfaces.map((t) => {
                                if (t.name === label) {
                                    provider.generateEntity(t, true, tokenTree.namespace, tokenTree.strict);
                                }
                            });
                        });
                }

                return true;
            }

            tokenTree.interfaces.map((t) => {
                const label = a.label
                    .replace(conf.get("readonlyCharacter"), "")
                    .replace(conf.get("abstractCharacter"), "");

                if (t.name === label) {
                    provider.generateEntity(t, true, tokenTree.namespace, tokenTree.strict);
                }
            });
        });
    });
}

export function deactivate() {
    return undefined;
}
