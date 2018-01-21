import { IMemberToken } from "./member";
import { IVariableToken } from "./variable";

export interface IPropertyToken extends IVariableToken, IMemberToken {
    readonly?: boolean;
}
