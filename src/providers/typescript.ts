import { BaseProvider } from './base';
import * as vscode from 'vscode'
import * as ts from 'typescript-parser'
import * as token from './../tokens'
import { Provider } from './../provider'
import { TreeItem, Range } from 'vscode';

export class TypescriptProvider implements BaseProvider {
    private parser: ts.TypescriptParser;
    private tree: token.TokenTree = <token.TokenTree>{}

    private readonly VISIBILITY = [
        'private', 'protected', 'public'
    ];

    public constructor() {
        this.parser = new ts.TypescriptParser();
    }

    hasSupport(langId: string): boolean {
        return langId.toLowerCase() === 'typescript' ||
            langId.toLowerCase() === 'javascript'
    }

    refresh(event?: vscode.TextDocumentChangeEvent): void {
        console.log('TypeScript/JavaScript Tree View provider refresh triggered')
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element
    }

    getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        this.tree = {};
        return this.parser.parseSource(
            vscode.window.activeTextEditor.document.getText()
        ).then((f: any) => {
            for (let dec of f.declarations) {
                if (this.tree.nodes === undefined) {
                    this.tree.nodes = [];
                }


                if (dec.properties === undefined && dec.methods === undefined) {
                    continue;
                }

                if (dec.ctor !== undefined) {
                    dec.ctor.name = 'constructor'
                    dec.methods.unshift(dec.ctor)
                }

                this.tree.nodes.push(<token.EntityToken>{
                    name: dec.name,
                    methods: this.handleMethods(dec.methods),
                    properties: this.handleProperties(dec.properties),
                    visibility: dec.isExported === true ? 'public' : 'private'
                })
            }

            let items: TreeItem[] = []
            let tree = this.tree;
            if (element === undefined) {
                if (tree.strict !== undefined) {
                    items.push(new vscode.TreeItem(
                        `Strict Types: ${tree.strict ? 'Yes' : 'No'}`
                    ))
                }

                if (tree.imports !== undefined) {
                    items.push(new vscode.TreeItem(`Imports`, vscode.TreeItemCollapsibleState.Collapsed))
                }

                if (tree.nodes !== undefined) {
                    for (let cls of tree.nodes) {
                        let collapsed: number = tree.nodes.indexOf(cls) === 0 ?
                            vscode.TreeItemCollapsibleState.Expanded :
                            vscode.TreeItemCollapsibleState.Collapsed

                        items.push(
                            Provider.getIcon(
                                new vscode.TreeItem(cls.name, collapsed),
                                'class',
                                cls.visibility
                            )
                        )
                    }
                }
            } else {
                for (let cls of tree.nodes) {
                    if (element.label === 'Imports') {
                        for (let imp of tree.imports) {
                            let t = new vscode.TreeItem(
                                `${imp.name}${imp.alias !== null ? ` as ${imp.alias}` : ''}`,
                                vscode.TreeItemCollapsibleState.None
                            );
                            t.command = {
                                command: 'extension.treeview.goto',
                                title: '',
                                arguments: [imp.position]
                            };
                            items.push(t);
                        }
                    }

                    if (cls.name === element.label) {
                        if (cls.constants) {
                            for (let constant of cls.constants) {
                                let t = new TreeItem(`${constant.name} = ${constant.value}`, vscode.TreeItemCollapsibleState.None)
                                items.push(Provider.getIcon(t, 'constant'))
                            }
                        }

                        if (cls.properties) {
                            for (let property of cls.properties) {
                                let t = new TreeItem(`$${property.name}${property.value !== '' ? ` = ${property.value}` : ''}`, vscode.TreeItemCollapsibleState.None)
                                t.command = {
                                    command: 'extension.treeview.goto',
                                    title: '',
                                    arguments: [property.position]
                                };
                                items.push(Provider.getIcon(
                                    t,
                                    'property',
                                    property.visibility
                                ))
                            }
                        }

                        if (cls.traits) {
                            for (let trait of cls.traits) {
                                let t = new TreeItem(`${trait.name}`, vscode.TreeItemCollapsibleState.None)
                                items.push(Provider.getIcon(t, 'trait'))
                            }
                        }

                        if (cls.methods) {
                            for (let method of cls.methods) {
                                let args = [];
                                for (let arg of method.arguments) {
                                    args.push(`${arg.type !== undefined ? `${arg.type} ` : ''}${arg.name}${(arg.value !== '' ? ` = ${arg.value}` : '')}`)
                                }
                                let t = new TreeItem(
                                    `${method.name}(${args.join(', ')})${method.type !== undefined ? `: ${method.type}` : ''}`,
                                    vscode.TreeItemCollapsibleState.None
                                )
                                t.command = {
                                    command: 'extension.treeview.goto',
                                    title: '',
                                    arguments: [method.position]
                                };
                                items.push(Provider.getIcon(
                                    t,
                                    'method',
                                    method.visibility
                                ))
                            }
                        }
                    }
                }
            }

            return Promise.resolve(items);
        });
    }

    private handleProperties(children: any[]): token.PropertyToken[] {
        let properties: token.PropertyToken[] = [];

        for (let property of children) {
            let start = this.offsetToPosition(property.start);
            properties.push(<token.PropertyToken>{
                name: property.name,
                type: property.type === undefined ? 'any' : property.type,
                visibility: this.VISIBILITY[property.visibility === undefined ? 2 : property.visibility],
                value: this.normalizeType(property.value, property.type),
                position: new vscode.Range(start, start)
            });
        }

        return properties.sort(Provider.sort);
    }

    private normalizeType(value, type): string {
        if (value === null || value === undefined) { return ''; }

        let val;
        switch (type) {
            case 'array':
                let arr: any;
                for (let x of value.items) {
                    if (x.key === null) {
                        if (arr === undefined) { arr = []; }
                        arr.push(x.value.value);
                    } else {
                        if (arr === undefined) { arr = {}; }
                        arr[x.key] = x.value.value
                    }
                }

                val = JSON.stringify(arr);
                break;
            case 'string':
                val = `"${value}"`
                break
            default:
                val = value;
                break;
        }
        return val;
    }

    private handleMethods(children: any[]): token.MethodToken[] {
        let methods: token.MethodToken[] = [];

        for (let method of children) {
            let start = this.offsetToPosition(method.start);
            methods.push(<token.MethodToken>{
                name: method.name,
                type: method.type === null ? 'any' : method.type,
                arguments: this.handleArguments(method.parameters),
                position: new vscode.Range(start, start),
                visibility: this.VISIBILITY[method.visibility === undefined ? 2 : method.visibility],
            })
        }

        return methods.sort(Provider.sort);
    }

    private handleArguments(children: any[]): token.VariableToken[] {
        let variables: token.VariableToken[] = [];

        for (let variable of children) {
            variables.push(<token.VariableToken>{
                name: variable.name,
                type: variable.type === null ? 'any' : variable.type,
                value: variable.value === undefined ? '' : this.normalizeType(variable.value, variable.type),
                visibility: variable.visibility === undefined ? 'public' : variable.visibility,
            });
        }

        return variables;
    }

    private offsetToPosition(offset: number): vscode.Position
    {
        let document = vscode.window.activeTextEditor.document;
        let lines = document.getText().split('\n');
        let char: number = 0
        let line: number = 0;

        for (let l in lines) {
            if (offset > 0) {
                char = 0;
                offset -= lines[line].length;
                if (offset <= 0) { break; }
                // @todo: Implement column localization within the line
                line++;
            }
            offset--;
        }
        return new vscode.Position(line, char);
    }
}
