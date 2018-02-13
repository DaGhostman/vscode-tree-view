import { IInterfaceToken } from "./interface";
import { IPropertyToken } from "./property";

export interface ITraitToken extends IInterfaceToken {
    traits?: ITraitToken[];
}
