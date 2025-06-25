# Rolldown Plugin for SpacetimeDB Reducer Syntax

[中文](./README.md#chinese-version)

This is a [Rolldown](https://rolldown.rs/) (and Rollup-compatible) plugin that transforms an intuitive, TypeScript-first syntax for SpacetimeDB reducers into the verbose code required by the underlying SpacetimeDB library.

## Motivation

Writing reducers for SpacetimeDB often involves boilerplate code, such as manually registering types with `registerType` and constructing type arrays for `registerReducer`. This plugin aims to improve the developer experience by allowing you to write reducers in a more natural and idiomatic TypeScript style.

The key benefits are:
- **Reduced Boilerplate**: Eliminates the need for manual `registerType` and `registerReducer` calls.
- **Improved Readability**: Code becomes cleaner and easier to understand.
- **Enhanced Type Safety**: Leverages standard TypeScript `type` aliases and function parameter types.

## How It Works

The plugin performs the following transformations at build time:

1.  **Type Alias to `registerType`**: Converts standard TypeScript `type` aliases into `registerType` calls.
2.  **`useReducer` to `registerReducer`**: Transforms a simplified `useReducer` function call into the full `registerReducer` call.
3.  **Automatic Type Extraction**: Parses the TypeScript type annotations from the reducer's arrow function parameters and automatically generates the required type array for `registerReducer`.
4.  **Import Management**: Automatically removes the developer-facing imports (e.g., from `spacetimedb/composable`) and adds the necessary low-level imports (e.g., `registerReducer`, `registerType`, `type` from `spacetimedb`).

## Usage

You write your reducer code in a simple, declarative way.

### Before Transformation (What you write)

This code is more intuitive and leverages standard TypeScript features.

```typescript
// src/index.ts
import { useReducer, F32, Bool, String } from 'spacetimedb/composable';

type Foo = {
    bar: F32,
    baz: String
}

useReducer('beepboop', (x: F32[], y: Bool, z: Foo) => {
    // Reducer logic here...
});
```

### After Transformation (What the plugin generates)

The plugin processes the code above and generates the following production-ready code that the SpacetimeDB runtime expects.

```typescript
// dist/index.ts
import { registerReducer, registerType, type } from "spacetimedb";

const Foo = registerType("Foo", type.product({
	bar: type.f32,
	baz: type.string
}));

registerReducer("beepboop", [
	type.array(type.f32),
	type.bool,
	Foo
], (x, y, z) => {});
```

---

<a name="chinese-version"></a>

## 中文版本 (Chinese Version)

这是一个 [Rolldown](https://rolldown.rs/) (兼容 Rollup) 插件，用于转换 SpacetimeDB Reducer 的代码。

### 目的

我们的目标是，通过 Rolldown 插件，让开发者可以使用更符合直觉的 TypeScript 语法来编写 SpacetimeDB 的 Reducer，最终由插件编译为适用于生产环境、调用底层库的 TypeScript 代码。这样可以显著改善开发体验，减少样板代码。

### 编译前的优化代码 (开发者编写的代码)

代码更符合 TypeScript 语法，减少了不必要的类型定义，更加简洁易读。

```typescript
// src/index.ts
import { useReducer, F32, Bool, String } from 'spacetimedb/composable';

type Foo = {
    bar: F32,
    baz: String
}

useReducer('beepboop', (x: F32[], y: Bool, z: Foo) => {
    // Reducer 逻辑...
});
```

### 最终生成的 TS 代码 (插件编译后的代码)

插件会自动处理类型别名和 `useReducer` 调用，生成 SpacetimeDB 运行时所期望的代码。

```typescript
// dist/index.ts
import { registerReducer, registerType, type } from 'spacetimedb';

const Foo = registerType(
    'Foo',
    type.product({
        bar: type.f32,
        baz: type.string,
    })
);

registerReducer('beepboop', [type.array(type.f32), type.bool, Foo], (x, y, z) => {
    // z.bar;
});
