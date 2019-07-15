import * as os from "os";
import * as vscode from "vscode";
import * as token from "../tokens";
import { IBaseProvider } from "./base";

export class JavaProvider implements IBaseProvider<vscode.TreeItem> {
    private tree: token.ITokenTree = {};
    private config: vscode.WorkspaceConfiguration;

    public constructor() {
        this.config = vscode.workspace.getConfiguration("treeview.java");
    }

    public hasSupport(langId: string): boolean {
        return langId === "java";
    }

    public refresh(document: vscode.TextDocument): void {
        this.config = vscode.workspace.getConfiguration("treeview.java");
        this.tree = {} as token.ITokenTree;
        const raw = require("java-parser").parse(document.getText());
        const lines = document.getText().split("\n");
        if (raw.package) {
            const nsParts: string[] = [];
            let ns = raw.package.name;
            while (ns.qualifier !== undefined) {
                nsParts.push(ns.name.identifier);
                ns = ns.qualifier;
            }

            nsParts.push(ns.identifier);
            this.tree.namespace = nsParts.reverse().join(".");
        }
        if (raw.imports.length !== 0) {
            this.tree.imports = [];

            let importName = null;
            for (const imp of raw.imports) {
                const parts: string[] = [];
                importName = imp.name;

                while (importName.qualifier !== undefined) {
                    parts.push(importName.name.identifier);
                    importName = importName.qualifier;
                }
                parts.push(importName.identifier);

                const importDeclaration = parts.reverse().join(".");

                let position = null;
                for (const line of lines) {
                    if (line === `import ${importDeclaration};`) {
                        position = new vscode.Range(
                            new vscode.Position(lines.indexOf(line), 0),
                            new vscode.Position(lines.indexOf(line), importDeclaration.length + 8),
                        );
                        break;
                    }
                }
                this.tree.imports.push({
                    name: importDeclaration,
                    position: (position === null ? undefined : position),
                });
            }
        }

        if (raw.types.length !== 0) {
            this.tree.classes = [];
            this.tree.interfaces = [];

            for (const entity of raw.types) {
                const entityDefinition: token.IInterfaceToken = {} as token.IInterfaceToken;

                entityDefinition.name = (this.tree.namespace !== undefined ? `${this.tree.namespace}.` : "") +
                    `${entity.name.identifier}`;
                if (this.config.has("namespacePosition")) {
                    if (this.config.get("namespacePosition") === "suffix") {
                        entityDefinition.name =
                            `${entity.name.identifier}` +
                                `${this.tree.namespace !== undefined ? `: ${this.tree.namespace}` : ""}`;
                    }

                    if (this.config.get("namespacePosition") === "none") {
                        entityDefinition.name = `${entity.name.identifier}`;
                    }
                }

                entityDefinition.visibility = entity.modifiers
                    .filter((m) => ["public", "protected", "private"].indexOf(m.keyword) !== -1).pop().keyword;
                entityDefinition.abstract = entity.modifiers
                    .filter((m) => "abstract" === m.keyword).length > 0;

                entityDefinition.methods = entity.bodyDeclarations
                    .filter((m) => m.node === "MethodDeclaration")
                    .map((m) => {
                        const visibility: string = m.modifiers
                            .filter((v) => ["public", "protected", "private"].indexOf(v.keyword) !== -1).pop().keyword;

                        const type = (m.returnType2.primitiveTypeCode || m.returnType2.componentType.name.identifier)
                            + (m.returnType2.node === "ArrayType" ? "[]" : "");
                        const position = lines.map((line) => {
                            const expr = m.modifiers.map((a) => a.keyword).join(" ") +
                                ` ${type} ${m.name.identifier}(`;

                            if (line.trim().indexOf(expr) === 0) {
                                const start = line.indexOf(m.name.identifier);
                                return new vscode.Range(
                                    new vscode.Position(lines.indexOf(line), start),
                                    new vscode.Position(lines.indexOf(line), start + m.name.identifier.length),
                                );
                            }

                            return undefined;
                        }).filter((p) => p instanceof vscode.Range).pop();

                        return {
                            arguments: m.parameters.map((p) => {
                                const s = document.lineAt(position.start).text.indexOf(p.name.identifier);
                                const pos = new vscode.Range(
                                    new vscode.Position(position.start.line, s),
                                    new vscode.Position(position.start.line, s + p.name.identifier.length),
                                );
                                const t = (p.type.primitiveTypeCode ||
                                    (p.type.componentType !== undefined
                                        ? p.type.componentType.name.identifier : undefined
                                    ) ||
                                    p.type.name.identifier)
                                    + (p.type.node === "ArrayType" ? "[]" : "");

                                return {
                                    name: p.name.identifier,
                                    position: pos,
                                    static: false,
                                    type: t,
                                    value: "",
                                    visibility: "public",
                                } as token.IVariableToken;
                            }),
                            name: m.name.identifier,
                            position,
                            readonly: m.modifiers.filter((s) => s.keyword === "final").length !== 0,
                            static: m.modifiers.filter((s) => s.keyword === "static").length !== 0,
                            type,
                            value: undefined,
                            visibility,
                        } as token.IMethodToken;
                    });
                entityDefinition.properties = entity.bodyDeclarations
                    .filter((m) => m.node === "FieldDeclaration" &&
                        !(m.modifiers.filter((mm) => mm.keyword === "static").length !== 0 &&
                            m.modifiers.filter((mm) => mm.keyword === "final").length !== 0))
                    .map((p) => {

                        const type = (p.type.primitiveTypeCode ||
                            (p.type.componentType ? p.type.componentType.name.identifier : undefined) ||
                            p.type.name.identifier)
                            + (p.type.node === "ArrayType" ? "[]" : "");

                        const name = p.fragments[0].name.identifier;
                        const position = lines.map((line) => {
                            const expr = p.modifiers.map((a) => a.keyword).join(" ") +
                                ` ${type} ${name}`;

                            if (line.trim().indexOf(expr) === 0) {
                                const start = line.indexOf(` ${type} ${name}`) + 2 + type.length;
                                return new vscode.Range(
                                    new vscode.Position(lines.indexOf(line), start),
                                    new vscode.Position(lines.indexOf(line), start + name.length),
                                );
                            }

                            return undefined;
                        }).filter((po) => po instanceof vscode.Range).pop();

                        const value = this.getValue(p);

                        return {
                            name,
                            position,
                            readonly: p.modifiers.filter((m) => m.keyword === "final").length !== 0,
                            static: p.modifiers.filter((m) => m.keyword === "static").length !== 0,
                            type,
                            value,
                            visibility: p.modifiers
                                .filter((v) => ["public", "protected", "private"].indexOf(v.keyword) !== -1)
                                .pop()
                                .keyword,
                        } as token.IPropertyToken;
                    });

                entityDefinition.constants = entity.bodyDeclarations
                    .filter((m) => m.node === "FieldDeclaration" &&
                        (m.modifiers.filter((mm) => mm.keyword === "static").length !== 0 &&
                            m.modifiers.filter((mm) => mm.keyword === "final").length !== 0))
                    .map((p) => {

                        const type = (p.type.primitiveTypeCode ||
                            (p.type.componentType ? p.type.componentType.name.identifier : undefined) ||
                            p.type.name.identifier)
                            + (p.type.node === "ArrayType" ? "[]" : "");

                        const name = p.fragments[0].name.identifier;
                        const position = lines.map((line) => {
                            const expr = p.modifiers.map((a) => a.keyword).join(" ") +
                                ` ${type} ${name}`;

                            if (line.trim().indexOf(expr) === 0) {
                                const start = line.indexOf(` ${type} ${name}`) + 2 + type.length;
                                return new vscode.Range(
                                    new vscode.Position(lines.indexOf(line), start),
                                    new vscode.Position(lines.indexOf(line), start + name.length),
                                );
                            }

                            return undefined;
                        }).filter((po) => po instanceof vscode.Range).pop();

                        const value = this.getValue(p);

                        return {
                            name,
                            position,
                            readonly: false,
                            static: p.modifiers.filter((m) => m.keyword === "static").length !== 0,
                            type,
                            value,
                            visibility: p.modifiers
                                .filter((v) => ["public", "protected", "private"].indexOf(v.keyword) !== -1)
                                .pop()
                                .keyword,
                        } as token.IConstantToken;
                    });

                if (entity.interface) {
                    this.tree.interfaces.push(entityDefinition);
                } else {
                    const cls = entityDefinition as token.IClassToken;
                    cls.readonly = entity.modifiers.filter((m) => "final" === m.keyword).length !== 0;
                    this.tree.classes.push(cls);
                }
            }
        }
        // code
    }

    public getTokenTree(): Thenable<token.ITokenTree> {
        return Promise.resolve(this.tree);
    }

    public generate(
        entityName: string,
        node: (token.IClassToken | token.IInterfaceToken),
        includeBody: boolean,
        options?: any,
    ): vscode.TextEdit[] {
        if (entityName.indexOf(".") !== -1) {
            const nsSplit = entityName.split(".");
            entityName = nsSplit.pop();
            options.ns = nsSplit.join(".");
        }
        const edits: vscode.TextEdit[] = [];
        if (options.ns !== undefined) {
            edits.push(new vscode.TextEdit(
                new vscode.Range(
                    new vscode.Position(edits.length, 0),
                    new vscode.Position(edits.length, 1024),
                ),
                `package ${options.ns};${os.EOL}${os.EOL};`,
            ));
        }

        if (includeBody && node.name.indexOf(":")) {
            // Attempt to import the interface
            edits.push(new vscode.TextEdit(
                new vscode.Range(
                    new vscode.Position(edits.length, 0),
                    new vscode.Position(edits.length, 1024),
                ),
                `import ${node.name.split(":").reverse().join(".")};${os.EOL}${os.EOL};`,
            ));
        }

        let definitionLine = `${node.visibility} ${includeBody && node.abstract ? "abstract " : ""}` +
            `${node.readonly ? "final " : ""}` +
            `${!includeBody ? "interface" : "class"} ${entityName}`;
        if (includeBody) {
            definitionLine += " implements " + node.name.split(":").shift().split(".").pop();
        }
        edits.push(new vscode.TextEdit(
            new vscode.Range(
                new vscode.Position(edits.length, 0),
                new vscode.Position(edits.length, 1024),
            ),
             `${definitionLine} {${os.EOL}`,
        ));

        if (node.constants !== undefined) {
            const constants = node.constants.filter((c) => c.visibility === "public");
            for (const constant of constants) {
                const line = `    ` +
                    `public static final ${constant.type} ${constant.name} = ${constant.value};`;

                edits.push(new vscode.TextEdit(
                    new vscode.Range(
                        new vscode.Position(edits.length, 0),
                        new vscode.Position(edits.length, line.length),
                    ),
                    line + os.EOL,
                ));

                if (constants.indexOf(constant) === constants.length - 1 &&
                    node.methods.length !== 0) {
                    const constantPosition = node.constants.indexOf(constant);
                    edits.push(new vscode.TextEdit(
                        new vscode.Range(
                            new vscode.Position(edits.length, 0),
                            new vscode.Position(edits.length, 1),
                        ),
                        os.EOL,
                    ));
                }
            }
        }

        if (node.methods !== undefined) {
            const methods = node.methods.filter((m) => m.visibility === "public");
            for (const method of methods) {
                let body = ";";
                if (includeBody) {
                    body = ` {${os.EOL}` +
                        `        throw new java.lang.IllegalStateException(\"Not implemented\");${os.EOL}` +
                        `    }` + (methods.indexOf(method) === methods.length - 1 ? "" : os.EOL);
                }

                const args: string[] = [];
                for (const arg of method.arguments) {
                    args.push(`${arg.type} ${arg.name}`);
                }
                const returnType: string = method.type !== undefined && method.type !== "mixed" ?
                    method.type : "";

                const line = `    public ${includeBody && method.abstract ? "abstract " : ""}` +
                    `${method.static ? "static " : ""}` +
                    `${!method.abstract && method.readonly ? "final " : ""}` +
                    `${returnType} ${method.name}(${args.join(", ")})${body}`;

                edits.push(new vscode.TextEdit(
                    new vscode.Range(
                        new vscode.Position(edits.length + (includeBody ? 3 : 0), 0),
                        new vscode.Position(edits.length + (includeBody ? 3 : 0), line.length),
                    ),
                    line + os.EOL,
                ));
            }
        }

        edits.push(new vscode.TextEdit(
            new vscode.Range(
                new vscode.Position(edits.length + (includeBody ? 3 : 0), 0),
                new vscode.Position(edits.length + (includeBody ? 3 : 0), 1),
            ),
            `}`,
        ));

        return edits as vscode.TextEdit[];
    }

    public getDocumentName(entityName: string, includeBody: boolean): Thenable<string> {
        return Promise.resolve(`${entityName}.java`);
    }

    public getTreeItem(element: vscode.TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    public getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        return Promise.resolve([]);
    }

    public isDynamic(): boolean {
        return true;
    }

    private getValue(p): string {
        if (p.fragments[0].initializer === null) {
            return "";
        }

        if (p.fragments[0].initializer.node === "ArrayInitializer") {
            const v = p.fragments[0].initializer.expressions.map((a) => a.escapedValue).join(", ");
            return `[${v.length > 32 ? v.substr(0, 32) : v}]`;

        }

        return p.fragments[0].initializer.escapedValue ||
        ("new" + p.fragments[0].initializer.type.name.identifier +
            "(" + p.fragments[0].initializer.arguments.map((a) => {
                return a.escapedValue;
            }).join(", ") + ")");
    }
}
