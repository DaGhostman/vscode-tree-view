import { IVariableToken } from "../";

export interface IFunctionToken extends IVariableToken {
    arguments?: IVariableToken[];
}
