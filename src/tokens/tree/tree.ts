import {
    IClassToken,
    IFunctionToken,
    IInterfaceToken,
    IMethodToken,
    ImportToken,
    ITraitToken,
    IVariableToken,
} from "./";

export interface ITokenTree {
    strict?: boolean;
    namespace?: string;
    imports?: ImportToken[];
    interfaces?: IInterfaceToken[];
    traits?: ITraitToken[];
    types?: ITypeToken[];
    classes?: IClassToken[];
    functions?: IFunctionToken[];
    variables?: IVariableToken[];
}
