# Change Log

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
