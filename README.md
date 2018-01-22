# File Tree View

## Features

- Preview file imports
- Auto-update on file changes
- Color-coded to speed up navigation
- Go To definition when clicking on leaf node*
- Extract Interfaces from class
- Generate implementations from interfaces

\* Note there might be slight variation in feature's behavior, but those mainly
come from external library limitations/behavior and will be fixed/normalized ASAP

## Languages:

- JAVA
- Javascript (ES6 is the target and while most of ES5 should be compatible)
- JSON
- openHAB
- PHP
- Python (Still experimental)
- TypeScript

## Known issues

- Having 2 classes with the exact same name in the exact file but with different namespace will the second one to mirror the first one when the `namespacePosition` configuration is set to `none` (although it might be only applicable to PHP files, others langs might also be affected)

## Attributions

- Contributors:
  - [Kuba Wolanin](https://github.com/kubawolanin) - openHAB support

- Libraries:
  - PHP Parser - [php-parsers](https://github.com/glayzzle/php-parser)
  - TypeScript/JavaScript parser - [typescript-parser](https://github.com/TypeScript-Heroes/node-typescript-parser)
  - JSON parser - [jsonc-parser](https://www.npmjs.com/package/jsonc-parser)
  - Python parser - [filbert](https://www.npmjs.com/package/filbert)
  - Java Parser - [java-parser](https://github.com/mazko/jsjavaparser)
  - Icons used in Tree View [Google Material Icons](https://material.io/icons/) [Apache License Version 2.0] with slight color-coding modification

## Screenshots

A simple extension that adds an explorer view outlining the main symbols of the currently open file

![PHP-editing](https://github.com/DaGhostman/vscode-tree-view/blob/master/images/php.treeview.gif?raw=true)

![JSON-navigation](https://github.com/DaGhostman/vscode-tree-view/blob/master/images/json.treeview.gif?raw=true)

![JS/TS](https://github.com/DaGhostman/vscode-tree-view/blob/master/images/js_ts.treeview.gif?raw=true)

![openHAB](https://github.com/DaGhostman/vscode-tree-view/blob/master/images/openhab.treeview.gif?raw=true)

## Contributions

See [CONTRIBUTING.md](https://github.com/DaGhostman/vscode-tree-view/blob/develop/CONTRIBUTING.md)
