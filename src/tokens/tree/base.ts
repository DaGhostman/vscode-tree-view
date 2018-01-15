import { Range } from "vscode";

export interface IBaseToken {
    name: string;
    position?: Range;
    contextName?: string;
}
