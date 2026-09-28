const {pathsToModuleNameMapper} = require('ts-jest')
const {compilerOptions} = require('./tsconfig')

module.exports = {
    preset: 'ts-jest',
    roots: ['<rootDir>/test'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {tsconfig: '<rootDir>/test/tsconfig.json'}]
    },
    moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths || {}, {prefix: '<rootDir>/'}),
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    setupFilesAfterEnv: [
        '<rootDir>/test/setup.ts'
    ],
    testEnvironment: "node"
}