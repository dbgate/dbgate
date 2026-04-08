# AGENTS

## Rules

- In newly added code, always use `DBGM-00000` for message/error codes; do not introduce new numbered DBGM codes such as `DBGM-00316`.
- GUI uses Svelte4 (packages/web)
- GUI is tested with E2E tests in `e2e-tests` folder, using Cypress. Use data-testid attribute in components to make them easier to test.  
- data-testid format: ComponentName_identifier. Use reasonable identifiers
- don't change content of storageModel.js - this is generated from table YAMLs with "yarn storage-json" command