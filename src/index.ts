import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import _generate from '@babel/generator';
import * as t from '@babel/types';
import { Plugin } from 'rolldown';

const traverse = (_traverse as any).default || _traverse;
const generate = (_generate as any).default || _generate;

const typePlaceholderMap: Record<string, string> = {
    str: 'string',
    bool: 'bool',
    i8: 'i8',
    u8: 'u8',
    i16: 'i16',
    u16: 'u16',
    i32: 'i32',
    u32: 'u32',
    i64: 'i64',
    u64: 'u64',
    i128: 'i128',
    u128: 'u128',
    i256: 'i256',
    u256: 'u256',
    f32: 'f32',
    f64: 'f64',
};

/**
 * Converts a TypeScript type node into a JavaScript expression node.
 * e.g., `type.string` (TSTypeReference) becomes `type.string` (MemberExpression)
 * e.g., `Foo` (TSTypeReference) becomes `Foo` (Identifier)
 * e.g., `string[]` (TSArrayType) becomes `type.array(string)` (CallExpression)
 * @param typeNode The TSType node to convert.
 * @returns An Expression node.
 */
function tsTypeToExpression(typeNode: t.TSType): t.Expression {
    if (t.isTSArrayType(typeNode)) {
        return t.callExpression(
            t.memberExpression(t.identifier('type'), t.identifier('array')),
            [tsTypeToExpression(typeNode.elementType)]
        );
    }

    if (t.isTSTypeReference(typeNode)) {
        if (
            t.isIdentifier(typeNode.typeName) &&
            typeNode.typeName.name === 'Array' &&
            typeNode.typeParameters &&
            typeNode.typeParameters.params.length === 1
        ) {
            return t.callExpression(
                t.memberExpression(t.identifier('type'), t.identifier('array')),
                [tsTypeToExpression(typeNode.typeParameters.params[0])]
            );
        }
        return tsIdentifierToExpression(typeNode.typeName);
    }

    if (t.isTSBooleanKeyword(typeNode)) {
        return t.memberExpression(t.identifier('type'), t.identifier('bool'));
    }

    throw new Error(`Unsupported type node for conversion: ${typeNode.type}`);
}

/**
 * Converts a TypeScript identifier or qualified name into a JavaScript expression.
 * e.g., `Foo` (Identifier) becomes `Foo` (Identifier)
 * e.g., `type.string` (TSQualifiedName) becomes `type.string` (MemberExpression)
 * @param idNode The Identifier or TSQualifiedName node.
 * @returns An Expression node.
 */
function tsIdentifierToExpression(idNode: t.Identifier | t.TSQualifiedName): t.Expression {
    if (t.isIdentifier(idNode)) {
        const typeName = idNode.name;
        if (typeName in typePlaceholderMap) {
            return t.memberExpression(t.identifier('type'), t.identifier(typePlaceholderMap[typeName]));
        }
        return t.identifier(typeName);
    }

    if (t.isTSQualifiedName(idNode)) {
        const left = tsIdentifierToExpression(idNode.left);
        const right = t.identifier(idNode.right.name);
        return t.memberExpression(left, right);
    }

    const _exhaustiveCheck: never = idNode;
    throw new Error(`Unsupported identifier node for conversion: ${(_exhaustiveCheck as any).type}`);
}

export default function spacetimeDbReducerPlugin(): Plugin {
    return {
        name: 'spacetimedb-reducer-transformer',

        transform(code: string, id: string) {
            if (!code.includes('useReducer') && !code.includes('type')) {
                return null;
            }

            const ast = parse(code, {
                sourceType: 'module',
                plugins: ['typescript'],
            });

            let modified = false;
            let needsRegisterReducerImport = false;
            let needsRegisterTypeImport = false;
            const registeredTypeNames = new Set<string>();

            traverse(ast, {
                // First, transform type aliases to registerType calls
                TSTypeAliasDeclaration(path) {
                    const { node } = path;
                    if (t.isTSTypeLiteral(node.typeAnnotation)) {
                        const properties = node.typeAnnotation.members.map(member => {
                            if (t.isTSPropertySignature(member) && t.isIdentifier(member.key) && member.typeAnnotation) {
                                const key = t.identifier(member.key.name);
                                const value = tsTypeToExpression(member.typeAnnotation.typeAnnotation);
                                return t.objectProperty(key, value);
                            }
                            throw new Error('Unsupported member in type alias.');
                        });

                        const productCall = t.callExpression(
                            t.memberExpression(t.identifier('type'), t.identifier('product')),
                            [t.objectExpression(properties)]
                        );

                        const registerCall = t.callExpression(
                            t.identifier('registerType'),
                            [t.stringLiteral(node.id.name), productCall]
                        );

                        const newVar = t.variableDeclaration('const', [
                            t.variableDeclarator(t.identifier(node.id.name), registerCall)
                        ]);

                        path.replaceWith(newVar);
                        modified = true;
                        needsRegisterTypeImport = true;
                        registeredTypeNames.add(node.id.name);
                    }
                },
            });

            traverse(ast, {
                // Second, transform useReducer calls
                CallExpression(path) {
                    const callee = path.get('callee');
                    if (!callee.isIdentifier({ name: 'useReducer' })) {
                        return;
                    }

                    const args = path.get('arguments');
                    if (args.length !== 2 || !args[1].isArrowFunctionExpression()) {
                        return;
                    }

                    callee.node.name = 'registerReducer';
                    needsRegisterReducerImport = true;

                    const reducerNameNode = args[0].node;
                    const arrowFuncPath = args[1];
                    const arrowFuncNode = arrowFuncPath.node;

                    const paramTypes: t.Expression[] = [];
                    const newFuncParams: t.Identifier[] = [];

                    for (const param of arrowFuncNode.params) {
                        if (t.isIdentifier(param) && param.typeAnnotation && t.isTSTypeAnnotation(param.typeAnnotation)) {
                            const typeAnnotation = param.typeAnnotation.typeAnnotation;
                            paramTypes.push(tsTypeToExpression(typeAnnotation));
                            newFuncParams.push(t.identifier(param.name));
                        } else {
                            // Cannot handle this parameter, so skip transformation of this call
                            return;
                        }
                    }

                    const typesArrayNode = t.arrayExpression(paramTypes);
                    const newArrowFuncNode = t.arrowFunctionExpression(
                        newFuncParams,
                        arrowFuncNode.body,
                        arrowFuncNode.async
                    );

                    path.node.arguments = [reducerNameNode, typesArrayNode, newArrowFuncNode];
                    modified = true;
                },

                // Finally, manage imports
                Program: {
                    exit(path) {
                        if (!modified) return;

                        const programPath = path;
                        const programNode = programPath.node;

                        // Remove all imports from 'spacetimedb/composable'
                        programPath.get('body').forEach(p => {
                            if (p.isImportDeclaration() && p.node.source.value === 'spacetimedb/composable') {
                                p.remove();
                            }
                        });

                        // Remove existing 'spacetimedb' import to avoid duplicates, we'll add a clean one.
                        programPath.get('body').forEach(p => {
                            if (p.isImportDeclaration() && p.node.source.value === 'spacetimedb') {
                                p.remove();
                            }
                        });

                        // Add the necessary imports for 'spacetimedb'
                        const importsToAdd = new Set<string>();
                        if (needsRegisterReducerImport) {
                            importsToAdd.add('registerReducer');
                        }
                        if (needsRegisterTypeImport) {
                            importsToAdd.add('registerType');
                        }

                        // If we transformed anything, we likely need `type`
                        if (importsToAdd.size > 0) {
                            importsToAdd.add('type');
                        }

                        if (importsToAdd.size > 0) {
                            const newSpecifiers = Array.from(importsToAdd).sort().map(name =>
                                t.importSpecifier(t.identifier(name), t.identifier(name))
                            );
                            const newImport = t.importDeclaration(newSpecifiers, t.stringLiteral('spacetimedb'));
                            programNode.body.unshift(newImport);
                        }
                    }
                }
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
                map: sourceMap as any,
            };
        },
    };
}
