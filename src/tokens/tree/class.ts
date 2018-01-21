import { ITraitToken } from "./trait";

export interface IClassToken extends ITraitToken {
    traits?: ITraitToken[];
    readonly?: boolean;
}
