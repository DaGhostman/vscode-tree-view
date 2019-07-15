import { IAccessorToken } from "./accessor";
import { ITraitToken } from "./trait";

export interface IClassToken extends ITraitToken {
    accessors?: IAccessorToken[];
}
