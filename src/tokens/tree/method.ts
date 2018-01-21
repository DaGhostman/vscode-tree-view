import { IFunctionToken } from "./function";
import { IMemberToken } from "./member";
import { IVariableToken } from "./variable";

export interface IMethodToken extends IFunctionToken, IMemberToken {
    arguments?: IVariableToken[];
    readonly?: boolean;
    abstract?: boolean;
}
