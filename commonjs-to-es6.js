const { parse } = require('recast');
const { visit } = require('ast-types');

module.exports = function (fileInfo, api, options) {
    const j = api.jscodeshift;
    const root = j(fileInfo.source);

    // Transform require() to import statements
    root.find(j.CallExpression, { callee: { name: 'require' } })
        .filter(path => path.parent.value.type === 'VariableDeclarator')
        .forEach(path => {
            const variableDeclarator = path.parent.value;
            const importDeclaration = j.importDeclaration(
                [j.importDefaultSpecifier(variableDeclarator.id)],
                j.literal(variableDeclarator.init.arguments[0].value)
            );
            j(path.parent.parent).replaceWith(importDeclaration);
        });

    // Transform module.exports to export default
    root.find(j.AssignmentExpression, {
        left: {
            type: 'MemberExpression',
            object: { name: 'module' },
            property: { name: 'exports' }
        }
    }).forEach(path => {
        const exportDefaultDeclaration = j.exportDefaultDeclaration(path.value.right);
        j(path.parent).replaceWith(exportDefaultDeclaration);
    });

    return root.toSource();
};