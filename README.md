# File Tree View

Completely standalone file symbol viewer that does not depend on any other
language-specific plugins, making it ideal for cases where the complete
language toolset is not available locally.

## Features

- No extension dependencies
- Preview file imports
- Auto-update on file changes
- Color-coded to speed up navigation
- Go to definition when clicking on leaf node*
- Extract Interfaces from class
- Generate implementations from interfaces

***\* Note:** there might be slight variation in feature's behavior,
but those mainly come from external library limitations/behavior
and will be fixed/normalized ASAP.*

## Languages

- C family (C, C++, C#)*
- CSS, LESS (note that LESS support is a little experimental)
- Java
- JavaScript (ES6 is the target, most of ES5 should be compatible too)
- JSON
- openHAB
- PHP
- Python
- TypeScript

***\* Note:** C family languages require their respective official extensions
to be present, although others might be fine as well. They are also disabled
by default and need to be enabled by adding
`cfamily` to the `treeview.allowedProviders` array.
Please note the support is highly experimental.*

## Attribution

- Contributors:
  - [Kuba Wolanin](https://github.com/kubawolanin) - openHAB support

- Libraries:
  - PHP parser - [php-parsers](https://github.com/glayzzle/php-parser)
  - TypeScript/JavaScript parser -
    [typescript-parser](https://github.com/TypeScript-Heroes/node-typescript-parser)
  - JSON parser - [jsonc-parser](https://www.npmjs.com/package/jsonc-parser)
  - Python parser - [filbert](https://www.npmjs.com/package/filbert)
  - Java parser - [java-parser](https://github.com/mazko/jsjavaparser)
  - CSS parser - [css](https://github.com/reworkcss/css)
  - LESS parser - [less](https://github.com/less/less.js)
  - Icons used in Tree View -
    [Google Material Icons](https://material.io/icons/) with slight
    color-coding modifications

## Screenshots

A simple extension that adds an explorer view outlining the main symbols
of the currently opened file.

![PHP editing](https://github.com/DaGhostman/vscode-tree-view/blob/master/images/php.treeview.gif?raw=true)

![JSON navigation](https://github.com/DaGhostman/vscode-tree-view/blob/master/images/json.treeview.gif?raw=true)

![JavaScript/TypeScript](https://github.com/DaGhostman/vscode-tree-view/blob/master/images/js_ts.treeview.gif?raw=true)

![openHAB](https://github.com/DaGhostman/vscode-tree-view/blob/master/images/openhab.treeview.gif?raw=true)

## Contributing

See [CONTRIBUTING.md](https://github.com/DaGhostman/vscode-tree-view/blob/develop/CONTRIBUTING.md).
