import * as vscode from 'vscode';

type VISIBILITY_PUBLIC = 'public';
type VISIBILITY_PROTECTED = 'protected';
type VISIBILITY_PRIVATE = 'private';

export interface BaseToken {
    name: string
    position?: vscode.Range
}

export interface VariableToken extends BaseToken {
    value: string
    visibility?: VISIBILITY_PRIVATE | VISIBILITY_PROTECTED | VISIBILITY_PUBLIC
    type?: string
}

export interface PropertyToken extends VariableToken {}
export interface ConstantToken extends VariableToken {}

export interface MethodToken extends VariableToken {
    arguments?: VariableToken[]
}

export interface EntityToken extends BaseToken {
    constants?: ConstantToken[]
    methods?: MethodToken[]
    properties?: PropertyToken[]
    traits?: EntityToken[],
    visibility?: VISIBILITY_PRIVATE | VISIBILITY_PROTECTED | VISIBILITY_PUBLIC
}

export interface ImportToken extends BaseToken {
    alias?: string
}

export interface TokenTree {
    strict?: boolean
    namespace?: string
    imports?: ImportToken[]
    nodes?: EntityToken[]
}
