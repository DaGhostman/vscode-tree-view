import { IPropertyToken } from "./property";

export interface IAccessorToken extends IPropertyToken {
    abstract?: boolean;
    direction?: "get" | "set";
}
