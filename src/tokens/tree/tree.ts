import {
    IClassToken,
    IFunctionToken,
    IImportToken,
    IInterfaceToken,
    IMethodToken,
    ITraitToken,
    ITypeToken,
    IVariableToken,
} from "./";

export interface ITokenTree {
    strict?: boolean;
    namespace?: string;
    imports?: IImportToken[];
    interfaces?: IInterfaceToken[];
    traits?: ITraitToken[];
    types?: ITypeToken[];
    classes?: IClassToken[];
    functions?: IFunctionToken[];
    variables?: IVariableToken[];
}
