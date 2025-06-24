import { registerReducer, type as spacetimedbType, AlgebraicType, ArgsToType, console } from './index';

// Exporting the raw spacetimedb types for advanced use cases
export const type = spacetimedbType;

// --- Composable-friendly Type Placeholders ---
// Using empty classes to export both a type and a value with the same name.
// This provides correct type information in the editor while also being resolvable by the bundler.
export class String {}
export class Bool {}
export class I8 {}
export class U8 {}
export class I16 {}
export class U16 {}
export class I32 {}
export class U32 {}
export class I64 {}
export class U64 {}
export class I128 {}
export class U128 {}
export class I256 {}
export class U256 {}
export class F32 {}
export class F64 {}
// The Array type is special and can be handled by the plugin without a placeholder class.

/**
 * A composable-friendly way to register a reducer.
 */
export function useReducer<const Args extends readonly AlgebraicType[]>(
    name: string,
    params: Args,
    func: (...args: ArgsToType<Args>) => void
): void;
export function useReducer(name:string, func: (...args: any[]) => void): void;
export function useReducer(name: string, paramsOrFunc: any, func?: any): void {
    if (typeof paramsOrFunc === 'function') {
        console.warn(`'useReducer' called with function signature directly. This is likely not what you want without the build plugin.`);
    } else {
        registerReducer(name, paramsOrFunc, func);
    }
}