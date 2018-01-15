import { IBaseToken } from "./base";
import { IMemberToken } from "./member";

export interface IVariableToken extends IBaseToken, IMemberToken {
    value: string;
    type?: string;
}
