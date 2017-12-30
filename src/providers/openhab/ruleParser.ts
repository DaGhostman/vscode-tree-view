import * as vscode from "vscode";
import { ImportToken } from "../base";

export class RuleParser {
    private text: string;

    public parseSource(text: string): Thenable<IRuleTree> {
        this.text = text;
        // Remove comments
        text = text.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, "$1");
        const lines = text.split("\n");
        const imports = lines
            .filter((line) => line.trim().startsWith("import"))
            .map((line) => line.replace(/import/, "").trim()) || [];

        const rules = lines
            .filter((line) => line.trim().startsWith("rule"))
            .map((line) => line.replace(/rule/, "").trim()) || [];

        // Remove lambdas
        text = text.replace(/(\[)([\s\S]*?)(\s])/gm, "$1");
        const lastImport = imports[imports.length - 1] || "";
        const vars = text.slice(text.search(lastImport) + lastImport.length, text.search(rules[0]) || text.length);
        const variables = vars
            .split("\n")
            .filter((line) => /val|var/.test(line.trim()))
            .map((line) => line.split("=")[0].replace(/val |var /, "").trim()) || [];

        return new Promise((resolve) => {
            resolve({ imports, variables, rules });
        });
    }

    public getPosition(text: string): vscode.Range {
        const query = (q) => q.includes(text);
        const lines = this.text.split("\n");
        const line = lines.find(query);
        const lineIndex = lines.findIndex(query);

        return new vscode.Range(
            new vscode.Position(lineIndex, line.indexOf(text)),
            new vscode.Position(lineIndex, line.indexOf(text) + text.length),
        );
    }
}

export interface IRuleTree {
    variables?: string[];

    imports?: string[];

    rules?: any[];
}
