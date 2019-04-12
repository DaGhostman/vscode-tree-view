"use strict";

import * as vscode from "vscode";
import { Provider } from "./provider";
import {
    CssProvider,
    IBaseProvider,
    ItemsProvider,
    JavaProvider,
    JsonProvider,
    LessProvider,
    PhpProvider,
    PythonProvider,
    RuleProvider,
    TypescriptProvider,
} from "./providers";
import { CFamilyProvider } from "./providers/cfamily";
import { RapidProvider } from "./providers/rapid";

function goToDefinition(editor: vscode.TextEditor, range: vscode.Range) {
    // Swap the focus to the editor
    vscode.window.showTextDocument(editor.document, editor.viewColumn, false)
        .then((active: vscode.TextEditor) => {
            active.revealRange(range, vscode.TextEditorRevealType.InCenter);
            active.selection = new vscode.Selection(range.start, range.end);
        });
}

export function activate(context: vscode.ExtensionContext) {
    const providers: Array<IBaseProvider<string | vscode.TreeItem>> = [];
    const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("treeview");

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

    if (allowedProviders.length === 0 || allowedProviders.indexOf("css") !== -1) {
        providers.push(new CssProvider());
    }

    if (allowedProviders.length === 0 || allowedProviders.indexOf("less") !== -1) {
        providers.push(new LessProvider());
    }

    if (allowedProviders.length === 0 || allowedProviders.indexOf("cfamily") !== -1) {
        providers.push(new CFamilyProvider());
    }

    if (allowedProviders.length === 0 || allowedProviders.indexOf("rapid") !== -1) {
        providers.push(new RapidProvider());
    }

    const provider = new Provider(providers as Array<IBaseProvider<string | vscode.TreeItem>>);

    if (vscode.window.activeTextEditor.document !== null) {
        provider.refresh(vscode.window.activeTextEditor.document);
    }

    vscode.commands.registerCommand("extension.treeview.refresh", () => {
        if (vscode.window.activeTextEditor.document) {
            provider.refresh(vscode.window.activeTextEditor.document);
        }
    });

    vscode.commands.registerCommand("extension.treeview.goto", goToDefinition);
    vscode.window.registerTreeDataProvider(`sidebar-outline`, provider);
    vscode.window.registerTreeDataProvider(`explorer-outline`, provider);
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

    vscode.commands.registerCommand("extension.treeview.pin", () => {
        vscode.commands.executeCommand("setContext", "treeview.pinned", true);
        provider.pin(true);
    });

    vscode.commands.registerCommand("extension.treeview.unpin", () => {
        vscode.commands.executeCommand("setContext", "treeview.pinned", false);
        provider.pin(false);
        vscode.commands.executeCommand("extension.treeview.refresh");
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
