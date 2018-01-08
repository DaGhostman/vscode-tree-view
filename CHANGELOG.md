# Change Log

_[BC]_ Stands for *B*reaking *C*hange
## [Unreleased]

### Added

- [ALL] - Make providers loadable on-demand through `treeview.allowedProviders`
- [PHP] - Make namespace presentation configurable
- [TS/JS] - `readonly` identifier character is now configurable

### Changes

- [PHP] - Fix `undefined` when no namespace is defined for class
- [TS/JS] - Fix missing types for variables and properties
- [ALL] - Improvements for sections handling and ordering

## [1.0.0]

### Added

- [ALL] - Support for globally(file-level) defined variables in separate
 expandable section (collapsed by default)

### Changed

- [ALL] - Renamed `Provider` method `getIcon` to `addItemIcon` (arguments are
 the same) [BC]
- [ALL] - Extracted a a method to register a command to an item
 `Provider.addItemCommand`
- [ALL] - Providers must expose a public method `getTokenTree` that returns
 a promise of `ITokenTree` [BC]
- [ALL] - Providers' `getChildren` should now return only the nodes that
 are not included in the 'generic' support [BC]
- [TS/JS] - The symbol for `read-only` and `const` definitions is now `@`
 (previously `!`)
- [TS/JS] - Align the TS/JS symbol selection when a node is clicked, to *attempt* to surround only the symbol instead of the whole line (offsets provided by the parser)

## [0.2.0]

### Added

- [openHAB](http://www.openhab.org/) Support

## [0.1.1] - 2017-12-30

### Changed

- [TS/JS] - Include interface definitions in the tree

## [0.1.0] - 2017-12-27

### Changed

- [ALL] - Fix race condition that triggers the tree retrieval when there is no active document
- [ALL] - Remove duplication of returned items (possible issue)

### Added

- [PHP/JS/TS] - Support for function definitions inside active document
- [TS/JS] - Add support for `"use strict"` declarations similar to PHP's `Strict Types` section

## [0.0.5] - 2017-12-21

### Changed

- [ALL] - Changed the icon marking methods
- [ALL] - Icons for method and properties are now filled, outlines are used for static

### Added

- [PHP] Add `&` prefix to by-reference methods and method arguments
- [PHP] Add `...` to variadic arguments
- [PHP/TS/JS] Differentiate between static and regular declarations
- [TS] Prefix `readonly` properties with `!`

## [0.0.4] - 2017-12-21

### Changed

- [ALL] Removed some unused imports in `providers/`
- [TS/JS] Go To definition now jumps to 1st line of definition without any selection to prevent selection of large methods, etc.

### Added

- [WEB] GIFs to provide a basic idea about the interface and functionality

## [0.0.3] - 2017-12-21

### Changed

- [ALL] Small changes to the base provider interface
- [ALL] Add icon to represent lists

### Added

- (Preview) JSON tree explorer, a modified version of `vscode-extension-samples`

## [0.0.2] - 2017-12-18

### Changed

- [PHP] Removed leading `\` where `array` typehint would show as `\array`
- [PHP] Show `null` where null is used as value of arguments instead of `undefined`
- [TS/JS] Initial (go to _line only_) 'GoTo definition' on node click (@ToDo calculate the proper character offset to find the exact match)
- [TS/JS] Remove `$` from property names
- [PHP] Properly handle default value of `[]`
- [ALL] Show all imports X times, where X is the number of classes/interfaces/traits defined in the current file
- [PHP] Fix constant visibility always being public

### Added

- [TS/JS] 'Imports' section
- [General] Use TSLint

## [0.0.1] - 2017-12-17

### Added

- Initial release

### Changed

- Supported Languages: PHP, Javascript/Typescript
