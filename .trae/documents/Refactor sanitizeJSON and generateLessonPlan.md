I will refactor `src/services/geminiService.ts` to strictly align with your specifications.

### Plan:

1. **Refactor** **`sanitizeJSON`**:

   * Remove the redundant JSON block extraction (substring logic) from within `sanitizeJSON`, as `generateLessonPlan` handles this.

   * Implement the exact character filtering regex: `replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')`.

   * Ensure the trailing comma fix regex is present: `replace(/,(\s*[}\]])/g, '$1')`.

   * Add clear comments explaining the logic.

2. **Verify** **`generateLessonPlan`**:

   * Confirm strict JSON extraction using `lastIndexOf('}')`.

   * Confirm the debug mechanism `(window as any).lastFailedJSON = jsonStr` is in place.

3. **Verification**:

   * Run `npm test src/services/geminiService.test.ts` to ensure all tests (including edge cases for sanitization) pass.

   * (Note: I will use `npm test` as I cannot interactively use the browser for `npm run dev` verification, but the unit tests cover the logic).

4. **Documentation**:

   * Ensure code is clean and commented.

