import * as vscode from "vscode";

type VISIBILITY_PUBLIC = "public";
type VISIBILITY_PROTECTED = "protected";
type VISIBILITY_PRIVATE = "private";

export interface IBaseToken {
    name: string;
    position?: vscode.Range;
}

export interface IVariableToken extends IBaseToken {
    value: string;
    visibility?: VISIBILITY_PRIVATE | VISIBILITY_PROTECTED | VISIBILITY_PUBLIC;
    type?: string;
}

export interface IPropertyToken extends IVariableToken {
    name: string;
}
export interface IConstantToken extends IVariableToken {
    name: string;
}

export interface IMethodToken extends IVariableToken {
    arguments?: IVariableToken[];
}

export interface IEntityToken extends IBaseToken {
    constants?: IConstantToken[];
    methods?: IMethodToken[];
    properties?: IPropertyToken[];
    traits?: IEntityToken[];
    visibility?: VISIBILITY_PRIVATE | VISIBILITY_PROTECTED | VISIBILITY_PUBLIC;
}

export interface ImportToken extends IBaseToken {
    alias?: string;
}

export interface ITokenTree {
    strict?: boolean;
    namespace?: string;
    imports?: ImportToken[];
    nodes?: IEntityToken[];
}
