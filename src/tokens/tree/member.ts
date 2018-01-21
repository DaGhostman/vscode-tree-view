import {
    VISIBILITY_PRIVATE,
    VISIBILITY_PROTECTED,
    VISIBILITY_PUBLIC,
} from "./visibility";

export interface IMemberToken {
    static?: boolean;
    visibility?: VISIBILITY_PRIVATE | VISIBILITY_PROTECTED | VISIBILITY_PUBLIC;
}
