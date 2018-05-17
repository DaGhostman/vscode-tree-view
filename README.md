# File Tree View

Completely standalone file symbol viewer, that does not depend on any other plugins being installed in order to support a language,
making it ideal for cases where the complete language toolset is not available locally.

## Features

- No extension dependencies
- Preview file imports
- Auto-update on file changes
- Color-coded to speed up navigation
- Go To definition when clicking on leaf node*
- Extract Interfaces from class
- Generate implementations from interfaces

\* Note there might be slight variation in feature's behavior, but those mainly
come from external library limitations/behavior and will be fixed/normalized ASAP

## Languages

- [ExC-Family (C, C++, C#)*
- CSS & Less CSS (note that Less is a little experimental)
- JAVA
- Javascript (ES6 is the target and while most of ES5 should be compatible)
- JSON
- openHAB
- PHP
- Python
- TypeScript

_* Note that C-Family require their respective official extensions to be present, although others might be fine as well_
_Also they are disabled by default and need to be enabled by using `cfamily` in the `treeview.allowedProviders` array._
_Please note the support if highly experimental_

## Attributions

- Contributors:
  - [Kuba Wolanin](https://github.com/kubawolanin) - openHAB support

- Libraries:
  - PHP Parser - [php-parsers](https://github.com/glayzzle/php-parser)
  - TypeScript/JavaScript parser - [typescript-parser](https://github.com/TypeScript-Heroes/node-typescript-parser)
  - JSON parser - [jsonc-parser](https://www.npmjs.com/package/jsonc-parser)
  - Python parser - [filbert](https://www.npmjs.com/package/filbert)
  - Java Parser - [java-parser](https://github.com/mazko/jsjavaparser)
  - CSS Parser - [css](https://github.com/reworkcss/css)
  - Less Parser [less](https://github.com/less/less.js)
  - Icons used in Tree View [Google Material Icons](https://material.io/icons/) [Apache License Version 2.0] with slight color-coding modification

## Screenshots

A simple extension that adds an explorer view outlining the main symbols of the currently open file

![PHP-editing](https://github.com/DaGhostman/vscode-tree-view/blob/master/images/php.treeview.gif?raw=true)

![JSON-navigation](https://github.com/DaGhostman/vscode-tree-view/blob/master/images/json.treeview.gif?raw=true)

![JS/TS](https://github.com/DaGhostman/vscode-tree-view/blob/master/images/js_ts.treeview.gif?raw=true)

![openHAB](https://github.com/DaGhostman/vscode-tree-view/blob/master/images/openhab.treeview.gif?raw=true)

## Contributions

See [CONTRIBUTING.md](https://github.com/DaGhostman/vscode-tree-view/blob/develop/CONTRIBUTING.md)
