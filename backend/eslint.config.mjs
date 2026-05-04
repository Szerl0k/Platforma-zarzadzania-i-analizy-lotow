import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(

    eslint.configs.recommended,
    ...tseslint.configs.recommended,

    {
        files: ['src/**/*.ts'],
        languageOptions: {
            parserOptions: {
                project: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/explicit-function-return-type': 'warn',
            'no-console': 'warn',
            '@typescript-eslint/no-unused-vars': 'warn'
        },
    },
    {
        files: ['src/**/__tests__/**/*.ts'],
        rules: {
            '@typescript-eslint/explicit-function-return-type': 'off',
        },
    },
    {
        ignores: ['dist/**', 'node_modules/**', 'eslint.config.mjs'],
    }
);