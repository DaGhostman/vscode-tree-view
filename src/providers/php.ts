import * as vscode from 'vscode'
import * as token from './../tokens'
import { BaseProvider } from './base'
import { Provider } from './../provider'
import { BaseToken, VariableToken } from './../tokens';
import { TreeItem, Range } from 'vscode';

export class PhpProvider implements BaseProvider {
    private config;

    public hasSupport(language: string) { return language.toLowerCase() === 'php' }
    private getTree(): token.TokenTree {
        if (vscode.window.activeTextEditor.document !== undefined) {
            return this.walk(
                require('php-parser').create({ ast: {withPositions: true } })
                    .parseCode(vscode.window.activeTextEditor.document.getText()).children
            )
        }

        return <token.TokenTree>{}
    }

    public withConfiguration(config: any): void {
        this.config = config;
    }

    public refresh(event?): void {
        if (event !== undefined) {
            this.getTree()
        }
        console.log('PHP Tree View provider refresh triggered')
    }

    public getTreeItem(element: vscode.TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> { return element; }
    public getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        let resolution: Thenable<TreeItem[]> = Promise.resolve([]);
        let tree = this.getTree();

        try {
            let items: vscode.TreeItem[] = [];

            if (tree !== {}) {
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
                                    'class'
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
                                    t.command = {
                                        command: 'extension.treeview.goto',
                                        title: '',
                                        arguments: [constant.position]
                                    };

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
                                    t.command = {
                                        command: 'extension.treeview.goto',
                                        title: '',
                                        arguments: [trait.position]
                                    };
                                    items.push(Provider.getIcon(t, 'trait'))
                                }
                            }

                            if (cls.methods) {
                                for (let method of cls.methods) {
                                    let args = [];
                                    for (let arg of method.arguments) {
                                        args.push(`${arg.type !== undefined ? `${arg.type} ` : ''}$${arg.name}${(arg.value !== '' ? ` = ${arg.value}` : '')}`)
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
            }

            resolution = Promise.resolve(items);
        } catch (err) {
            console.error(err);
        }

        return resolution
    }

    private walk(ast: any, parentNode?: token.TokenTree): token.TokenTree {
        let tree: token.TokenTree = (parentNode === undefined ? <token.TokenTree>{} : parentNode);

        if (ast.length === 0) {
            return tree;
        }

        for (let node of ast) {
            if (['declare', 'namespace', 'class', 'interface', 'trait', 'usegroup'].indexOf(node.kind) === -1) {
                continue;
            }

            switch (node.kind) {
                case 'interface':
                case 'class':
                case 'trait':
                    if (tree.nodes === undefined) {
                        tree.nodes = <token.EntityToken[]>[];
                    }
                    let entity: token.EntityToken = <token.EntityToken>{}

                    let constants = node.body.filter((x) => x.kind === 'classconstant')
                    let properties = node.body.filter((x) => x.kind === 'property')
                    let methods = node.body.filter((x) => x.kind === 'method')
                    let traits = node.body.filter((x) => x.kind === 'traituse')

                    entity.name = `${tree.namespace}\\${node.name}`
                    entity.traits = traits.length === 0 ? undefined : this.handleUseTraits(traits)
                    entity.constants = constants.length === 0 ? undefined : this.handleConstants(constants)
                    entity.properties = properties.length === 0 ? undefined : this.handleProperties(properties)
                    entity.methods = methods.length === 0 ? undefined : this.handleMethods(methods)

                    tree.nodes.push(entity);
                    break;
                case 'namespace':
                    tree.namespace = node.kind === 'namespace' ? node.name : '\\'
                    tree = this.walk(node.children, tree)
                    break;
                case 'declare':
                    let strict = node.what.strict_types;
                    tree.strict = (strict !== undefined ? (strict.value === '1' ? true : false) : false)
                    tree = this.walk(node.children, tree)
                    break;
                case 'usegroup':
                    if (tree.imports === undefined) {
                        tree.imports = <token.ImportToken[]>[];
                    }
                    let imp = <token.ImportToken>{
                        name: node.items[0].name,
                        alias: node.items[0].alias,
                        position: new vscode.Range(
                            new vscode.Position(node.loc.start.line-1, node.loc.start.column),
                            new vscode.Position(node.loc.end.line-1, node.loc.end.column)
                        )
                    };

                    tree.imports.push(imp);
                    break;
            }
        }

        return tree;
    }

    private normalizeType(value): string {
        if (value === null) { return ''; }

        let val;
        switch (value.kind) {
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
                val = `"${value.value}"`
                break
            default:
                val = value.value;
                break;
        }
        return val;
    }

    private handleUseTraits(children: any[]): token.EntityToken[] {
        let traits: token.EntityToken[] = [];

        for (let trait of children) {
            for (let i in trait.traits) {
                traits.push(<token.EntityToken>{
                    name: trait.traits[i].name,
                    position: new vscode.Range(
                        new vscode.Position(trait.loc.start.line-1, trait.loc.start.column),
                        new vscode.Position(trait.loc.end.line-1, trait.loc.end.column-1),
                    )
                })
            }
        }

        return traits;
    }

    private handleConstants(children: any[]): token.ConstantToken[] {
        let constants: token.ConstantToken[] = [];

        for (let constant of children) {
            constants.push(<token.ConstantToken>{
                name: constant.name,
                visibility: constant.visibility === undefined ? 'public' : constant.visibility,
                value: this.normalizeType(constant.value),
                position: new vscode.Range(
                    new vscode.Position(constant.loc.start.line-1, constant.loc.start.column),
                    new vscode.Position(constant.loc.end.line-1, constant.loc.start.column+constant.name.length),
                )
            })
        }

        return constants.sort(Provider.sort);
    }

    private handleProperties(children: any[]): token.PropertyToken[] {
        let properties: token.PropertyToken[] = [];

        for (let property of children) {
            properties.push(<token.PropertyToken>{
                name: property.name,
                type: 'mixed',
                visibility: property.visibility === undefined ? 'public' : property.visibility,
                value: this.normalizeType(property.value),
                position: new vscode.Range(
                    new vscode.Position(property.loc.start.line-1, property.loc.start.column),
                    new vscode.Position(property.loc.end.line-1, property.loc.start.column+property.name.length+1),
                )
            });
        }

        return properties.sort(Provider.sort);
    }

    private handleMethods(children: any[]): token.MethodToken[] {
        let methods: token.MethodToken[] = [];

        for (let method of children) {
            methods.push(<token.MethodToken>{
                name: method.name,
                type: method.type === null ? 'mixed' : method.type.name,
                arguments: this.handleArguments(method.arguments),
                visibility: method.visibility,
                position: new vscode.Range(
                    new vscode.Position(method.loc.start.line-1, method.loc.start.column+9),
                    new vscode.Position(method.loc.start.line-1, method.loc.start.column+9+method.name.length),
                )
            })
        }

        return methods.sort(Provider.sort);
    }

    private handleArguments(children: any[]): token.VariableToken[] {
        let variables: token.VariableToken[] = [];

        for (let variable of children) {
            variables.push(<token.VariableToken>{
                name: variable.name,
                type: variable.type === null ? 'mixed' : variable.type.name,
                value: variable.value === undefined ? '' : this.normalizeType(variable.value),
                visibility: variable.visibility === undefined ? 'public' : variable.visibility,
                position: new vscode.Range(
                    new vscode.Position(variable.loc.start.line-1, variable.loc.start.column),
                    new vscode.Position(variable.loc.end.line-1, variable.loc.start.column+variable.name.length),
                )
            });
        }

        return variables;
    }
}
