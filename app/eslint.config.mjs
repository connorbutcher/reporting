import tseslint from 'typescript-eslint';

/**
 * Lints the member-visibility and member-ordering policy for the app.
 *
 * Policy (see also the team convention docs):
 *  - Every class member carries an explicit accessibility keyword. A member is
 *    `public` unless it is used only by its own class — templates and subclasses
 *    count as outside use, so anything they touch is `public`. Purely internal
 *    members are `private`. `protected` is not used.
 *  - Members are ordered: fields (public before private), then the constructor,
 *    then methods and getters (public methods, public getters, private methods,
 *    private getters).
 *  - Within a field group, `readonly` fields come before mutable ones. This last
 *    rule can't be machine-checked (typescript-eslint has no accessibility-scoped
 *    `readonly` member type), so it is a hand-applied convention, not a lint error.
 *
 * Only `.ts` sources are linted; this config intentionally skips template linting.
 */
export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', '.angular/**'],
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.spec.ts'],
    languageOptions: { parser: tseslint.parser },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      // Every member states its accessibility; constructors stay bare (a `public`
      // constructor reads as noise).
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        { accessibility: 'explicit', overrides: { constructors: 'no-public' } },
      ],

      // Fields → constructor → methods/getters, public before private throughout.
      '@typescript-eslint/member-ordering': [
        'error',
        {
          default: [
            'public-static-field',
            'private-static-field',
            'public-instance-field',
            'private-instance-field',
            'constructor',
            'public-static-method',
            'private-static-method',
            'public-instance-method',
            'public-instance-get',
            'public-instance-set',
            'private-instance-method',
            'private-instance-get',
            'private-instance-set',
          ],
        },
      ],

      // The policy allows only public/private.
      'no-restricted-syntax': [
        'error',
        {
          selector: "[accessibility='protected']",
          message: 'Use public or private, not protected — see the member-visibility policy.',
        },
      ],
    },
  },
);
