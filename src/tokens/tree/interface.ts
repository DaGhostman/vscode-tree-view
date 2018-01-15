import { IBaseToken } from "./base";
import { IConstantToken } from "./constant";
import { IMemberToken } from "./member";
import { IMethodToken } from "./method";

export interface IInterfaceToken extends IBaseToken, IMemberToken {
    constants?: IConstantToken[];
    methods?: IMethodToken[];
}
