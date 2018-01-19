import { IBaseToken } from "./base";
import { IConstantToken } from "./constant";
import { IMemberToken } from "./member";
import { IMethodToken } from "./method";
import { IPropertyToken } from "./property";

export interface IInterfaceToken extends IBaseToken, IMemberToken {
    constants?: IConstantToken[];
    properties?: IPropertyToken[];
    methods?: IMethodToken[];
}
