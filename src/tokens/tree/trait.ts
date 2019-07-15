import { IInterfaceToken } from "./interface";

export interface ITraitToken extends IInterfaceToken {
    traits?: ITraitToken[];
}
