import * as vscode from "vscode";
import { IInterfaceToken as InterfaceToken, ImportToken, ITokenTree, IVariableToken } from "../../tokens";

export class ItemsParser {
    private text: string;

    public parseSource(text: string): Thenable<ITokenTree> {
        this.text = text;
        // Remove comments
        text = text.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, "$1");
        const lines = text.split("\n");

        const types = [
            "Color",
            "Contact",
            "DateTime",
            "Dimmer",
            "Group",
            "Image",
            "Location",
            "Number",
            "Player",
            "Rollershutter",
            "String",
            "Switch",
        ];

        const items = lines
            .filter((line) => {
                const arr = line.split(/\s+/);
                return types.includes(arr[0]);
            })
            .map((line) => {
                const arr = line.split(/\s+/);
                return {
                    name: arr[1],
                    position: this.getPosition(arr[1]),
                } as IVariableToken;
            }) || [];

        return Promise.resolve({ items } as IItemsTree);
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

export interface IItemsTree extends ITokenTree {
    items?: IVariableToken[];
}
