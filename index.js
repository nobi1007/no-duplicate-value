/**
 * @fileoverview Rule to flag use of variables before they are defined
 * @author Shyam Mittal
 */

"use strict";
const jscodeshift = require('jscodeshift');


const resolveMemberExpressionValue = (memExpNode) => {
    const suffix = '-' + memExpNode?.property?.name;
    if (memExpNode?.object?.type === 'Identifier') {
        return memExpNode?.object?.name + suffix
    } else {
        return resolveMemberExpressionValue(memExpNode?.object) + suffix
    }
}


const reportError = (context, memoValues, val, node) => {
    if (memoValues?.[val]) {
        context.report({
            message: `Object with value ${val} is already defined for ${memoValues?.[val]}`,
            node: node
        })
    }
    else {
        memoValues[val] = node?.key?.name
    }
}


module.exports = {
    rules: {
        "no-duplicate-values": {
            meta: {
                type: "suggestion",
                docs: {
                    description:
                        "flagging use or definition of duplicate values in an object",
                },
                schema: [
                    {
                        type: "array",
                    },
                ],
            },
            create(context) {
                const validFileNames = context.options[0] || [""]
                function findDuplicateValues() {
                    const sourceCode = context.getSourceCode().text;
                    const currentFileName = context.getFilename();
                    let parsingAllowed = false;
                    validFileNames.forEach(_ => {
                        if (currentFileName.endsWith(_)) {
                            parsingAllowed = true;
                            return;
                        }
                    })
                    if (parsingAllowed) {
                        const validExpressions = jscodeshift(sourceCode).find(jscodeshift.ObjectExpression)
                        validExpressions.forEach(({ value: node }) => {
                            const memoValues = {};
                            if (node.properties.length) {
                                node.properties.forEach(eachPropertyNode => {
                                    const propertyNodeType = eachPropertyNode?.value?.type;
                                    if (propertyNodeType === 'MemberExpression') {
                                        const memVal = resolveMemberExpressionValue(eachPropertyNode?.value);
                                        reportError(context, memoValues, memVal, eachPropertyNode)
                                    }
                                    else if (propertyNodeType === 'ChainExpression') {
                                        const memVal = resolveMemberExpressionValue(eachPropertyNode?.value?.expression);
                                        reportError(context, memoValues, memVal, eachPropertyNode)
                                    } else if (propertyNodeType === 'Identifier' || propertyNodeType === 'Literal') {
                                        const nodeVal = propertyNodeType === 'Identifier' ? eachPropertyNode?.value?.name : eachPropertyNode?.value?.value;
                                        reportError(context, memoValues, nodeVal, eachPropertyNode)
                                    }
                                })
                            }
                        })
                    }
                }

                return {
                    Program() {
                        findDuplicateValues();
                    },
                };
            },
        },
    },
};
