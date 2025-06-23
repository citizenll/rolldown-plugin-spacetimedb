import { parse } from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { Plugin } from 'rolldown';

/**
 * 一个 Rollup 插件，用于转换 `registerReducer` 调用。
 * 它会从 Reducer 函数的参数中提取 TypeScript 类型注解，
 * 创建一个 `type` 表达式数组，并用无类型的参数替换原始的带类型参数，
 * 将类型数组作为单独的参数传递。
 *
 * 例如，以下代码：
 * ```typescript
 * registerReducer("myReducer", (a: string, b: number, c: boolean[]) => { ... });
 * ```
 *
 * 将被转换为：
 * ```javascript
 * registerReducer("myReducer", [string, number, type.array(boolean)], (a, b, c) => { ... });
 * ```
 * @returns {Plugin} Rollup 插件对象。
 */
export default function spacetimeDbReducerPlugin(): Plugin {
    return {
        name: 'spacetimedb-reducer-transformer',

        /**
         * 转换模块的代码。
         * @param {string} code 模块的源代码。
         * @param {string} id 模块的 ID。
         * @returns {import('rollup').TransformResult} 转换后的代码，如果未进行转换则返回 null。
         */
        transform(code: string, id: string) {
            // 为提高效率，仅处理包含 'registerReducer' 的文件。
            if (!code.includes('registerReducer')) {
                return null;
            }

            const ast = parse(code, {
                sourceType: 'module',
                plugins: ['typescript'], // 启用 TypeScript 解析
            });

            let modified = false;

            traverse(ast, {
                CallExpression(path) {
                    const callee = path.get('callee');

                    // 检查是否是 'registerReducer' 调用。
                    if (!callee.isIdentifier({ name: 'registerReducer' })) {
                        return;
                    }

                    const args = path.get('arguments');

                    // 检查是否是我们期望的 (name, arrowFunction) 形式。
                    if (args.length !== 2 || !args[1].isArrowFunctionExpression()) {
                        return;
                    }

                    const reducerNameNode = args[0].node;
                    const arrowFuncPath = args[1];
                    const arrowFuncNode = arrowFuncPath.node;

                    const paramTypes: (t.Identifier | t.CallExpression)[] = [];
                    const newFuncParams: t.Identifier[] = [];

                    // 遍历箭头函数的参数，提取类型，
                    // 并创建一个新的无类型参数列表。
                    for (const param of arrowFuncNode.params) {
                        if (!t.isIdentifier(param) || !param.typeAnnotation || !t.isTSTypeAnnotation(param.typeAnnotation)) {
                            // 如果参数不是带类型注解的标识符，则无法处理。
                            // 我们也可以选择保留原样，但这里我们选择跳过此调用的转换。
                            return;
                        }

                        const typeAnnotation = param.typeAnnotation.typeAnnotation;

                        let typeExpression: t.Identifier | t.CallExpression;
                        // 检查 T[] 数组类型
                        if (t.isTSArrayType(typeAnnotation)) {
                            const elementType = typeAnnotation.elementType;
                            // 创建 `type.array(elementType)`
                            typeExpression = t.callExpression(
                                t.memberExpression(t.identifier('type'), t.identifier('array')),
                                [t.identifier(generate(elementType).code)]
                            );
                        }
                        // 检查 Array<T> 数组类型
                        else if (
                            t.isTSTypeReference(typeAnnotation) &&
                            t.isIdentifier(typeAnnotation.typeName) &&
                            typeAnnotation.typeName.name === 'Array' &&
                            typeAnnotation.typeParameters &&
                            typeAnnotation.typeParameters.params.length === 1
                        ) {
                            const elementType = typeAnnotation.typeParameters.params[0];
                            // 创建 `type.array(elementType)`
                            typeExpression = t.callExpression(
                                t.memberExpression(t.identifier('type'), t.identifier('array')),
                                [t.identifier(generate(elementType).code)]
                            );
                        }
                        // 非数组类型
                        else {
                            typeExpression = t.identifier(generate(typeAnnotation).code);
                        }

                        paramTypes.push(typeExpression);

                        // 创建一个没有类型注解的新参数。
                        newFuncParams.push(t.identifier(param.name));
                    }

                    // 如果没有处理任何参数，则不执行任何操作。
                    if (newFuncParams.length === 0 && arrowFuncNode.params.length > 0) {
                        return;
                    }

                    // 创建类型数组节点。
                    const typesArrayNode = t.arrayExpression(paramTypes);

                    // 创建一个新的没有类型注解的箭头函数。
                    const newArrowFuncNode = t.arrowFunctionExpression(
                        newFuncParams,
                        arrowFuncNode.body,
                        arrowFuncNode.async
                    );

                    // 用新的参数列表替换旧的参数。
                    path.node.arguments = [reducerNameNode, typesArrayNode, newArrowFuncNode];
                    modified = true;
                },
            });

            if (!modified) {
                return null;
            }

            const { code: outputCode, map: sourceMap } = generate(ast, {
                sourceMaps: true,
                sourceFileName: id,
            });

            return {
                code: outputCode,
                map: sourceMap as any, // generator 的 map 类型与 rollup 的不完全兼容
            };
        },
    };
}
