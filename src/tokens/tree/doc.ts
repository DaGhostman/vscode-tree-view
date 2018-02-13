export interface IDocToken {
    description?: string;
    variables?: {
        [key: string]: string;
    };
    return?: string;
}
