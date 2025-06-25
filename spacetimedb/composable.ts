import { registerReducer, type as spacetimedbType, AlgebraicType, ArgsToType, console } from './index';

// Exporting the raw spacetimedb types for advanced use cases
export const type = spacetimedbType;

// --- Composable-friendly Branded Type Aliases ---
// We use branded types to create distinct types that are still assignable to their base types (number, bigint, etc.).
// This provides a great developer experience (e.g., direct math operations) while allowing our build plugin to identify them.
// We also export a value (`const`) with the same name to satisfy module resolvers.

export const str = null;
export type str = string & { __brand: 'string' };

export const bool = null;
export type bool = boolean & { __brand: 'bool' };

export const i8 = null;
export type i8 = number & { __brand: 'i8' };
export const u8 = null;
export type u8 = number & { __brand: 'u8' };
export const i16 = null;
export type i16 = number & { __brand: 'i16' };
export const u16 = null;
export type u16 = number & { __brand: 'u16' };
export const i32 = null;
export type i32 = number & { __brand: 'i32' };
export const u32 = null;
export type u32 = number & { __brand: 'u32' };
export const f32 = null;
export type f32 = number & { __brand: 'f32' };
export const f64 = null;
export type f64 = number & { __brand: 'f64' };

export const i64 = null;
export type i64 = bigint & { __brand: 'i64' };
export const u64 = null;
export type u64 = bigint & { __brand: 'u64' };
export const i128 = null;
export type i128 = bigint & { __brand: 'i128' };
export const u128 = null;
export type u128 = bigint & { __brand: 'u128' };
export const i256 = null;
export type i256 = bigint & { __brand: 'i256' };
export const u256 = null;
export type u256 = bigint & { __brand: 'u256' };

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