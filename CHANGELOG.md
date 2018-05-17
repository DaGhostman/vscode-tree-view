# Change Log

_[BC]_ Stands for *B*reaking *C*hange

## [2.5.0]

### Added

- _*HIGHLY EXPERIMENTAL*_ Support for C, C++, C#. Disabled by default (Require Language Support Extensions)
- Configuration to prevent updating of view if file contains errors (Depends on VSCode Problems)

### Changes

- [ALL] Fix Ctrl + Mouse Over on symbol updates tree with data from symbol file (#77)
- [ALL] Functions section expanded by default
- [ALL] First item in Classes, Interfaces, Traits is always expanded by default (#76)
- [LESS] Now under own configuration under "treeview.allowedProviders"

## [2.4.0]

### Added

- [JS/TS] - Show default values for params

### Changes

- [PHP] - Fix nested arrays as default values output
- [JAVA] - Add handling for arrays default value

## [2.3.1]

### Changes

- [JS/TS] - Fix wrong calculation of position
- [ALL] - Fix document change event, that makes the open document `undefined` (race condition when closing files & when closing the last file)

## [2.3.0]

### Added

- [CSS] - Support
- [LESS] - Initial (a bit experimental) support for less

## [2.2.0]

### Added

- [ALL] - Duplicate command to duplicate classes and traits

### Changes

- [ALL] - Show notification instead of opening a generated file (file conflicts with WS copy)
- [ALL] - Remove wrong filename suffix
- [ALL] - Fix invalid code generation
- [ALL] - Allow generation of interface from trait in files which do not have classes defined in them
- [ALL] - Updated Extract and Generate commands' icons to not be oversized
- [PHP] - Correct type resolution that showed `= null` in signatures without default values
- [PHP] - Fix handling of `abstract` classes

## [2.1.0]

### Added

- [ALL] - Execute 'Extract interface' and 'Implement Interface' commands from palette
- [ALL] - Inline actions for Extract/Implement commands (With new icons)
- [openHAB] - Add base support for "Items"

### Changes

- [PHP] - Fix wrong handling of PHP traits
- [PHP] - Fix default values always being null, event when not set
- [ALL] - 'Extract Interface' now properly supports traits

## [2.0.4]

### Changes

- [PHP] - Fix issues with trait handling

## [2.0.3]

### Added

- [ALL] - GUI warnings when invoking the "generate" commands from palette
- [PHP] - Attempt to fetch type of untyped variables instead of showing all of them as `mixed`

### Changes

- [PHP] - Add missing logic for `abstract` PHP classes
- [ALL] - Fix sorting of class members to properly handle statics
- [ALL] - Changed the command group to `TreeView` from `Generate`
- [PHP] - Handle constants as default values for methods/functions
- [PHP] - Improve variable value handling
- [PHP] - Fix cases where assigning to external variable will be shown in the list as `unknown`

## [2.0.2]

### Changes

- [JAVA] - Include `java-parser` in list of dependencies (prevented)

## [2.0.1]

### Changes

- [ALL] - Remove leftover import that prevented building

## [2.0.0]

### Notes

- If you have configured a list of enabled providers, you must update your configuration to include `java` if you want to enable support for it

### Added

- [JAVA] - Initial Java support
- [ALL] - Add context menu for interface creation and skeleton creation
- [PHP/JS/TS] - Add handling for `abstract` and `final` keyword
- [CONFIG] - Add `treeview.abstractCharacter` for consistent global configuration of `abstract` prefix
- [JAVA] - Add `treeview.java.namespacePosition` for namespace positioning

### Changes

- [ALL] - Switch value objects for different tree items
- [ALL] - Address issues with tree ghosting when all windows are closed or unsupported document is active
- [ALL] - Centralized common code parts (icon, command, character prefixes)
- [CONFIG] - Replaced `treeview.js.readonlyCharacter` with `treeview.readonlyCharacter` to consistently configure global symbols

## [1.2.0]

### Added

- [PY] - Initial python support

## [1.1.0]

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
