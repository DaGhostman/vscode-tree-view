# Contributing info

## Overview

Contributions of any form are welcome, issue reports, PRs, feedback, etc.

## Requirements

All new providers MUST implement `IBaseProvider` as responsibly as possible and when the need arises
to provide a new tree structure, the newly implemented one MUST extend `ITokenTree` in order to be
compliant as much as possible with it, in order to allow future maintainability. When this is needed
all 'leaf' types should be based on one of the most types that is the most fitting or at least `IBaseToken`
to avoid duplication.

It is recommended to use typecasts whenever possible in order for TS to be able to analyse the code properly
and avoid hidden issues such as magically appearing object properties, etc.

All PRs must be based on and targeting the `develop` branch in order to have
an always stable branch, following the commonly known git flow in the naming of
the branches. It would also be helpful for `bugfix/*` branches to have a corresponding issue
open that provides information about the problem encountered.

## Attribution

All authors will be attributed either in the README file or in a separate
section that does not make the README too long and annoying to read. As for
`feature/*` branches, whenever bigger functionality is added a GIF that
demonstrates the changes in action would be greatly appreciated.
