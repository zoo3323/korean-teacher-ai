---
name: CanvasEditor component — Fabric.js v6 integration
description: Key decisions and gotchas for the Fabric.js canvas editor in the Korean language teacher app
type: project
---

Fabric.js 6.9.1 was manually extracted into node_modules (npm ENOTEMPTY prevents normal install on this WSL environment). It is declared in package.json as `"fabric": "^6.9.1"`.

**Why:** The project uses a virtual/symlink node_modules store where empty directory shells exist but npm can't rename during installs. A future `npm install` run in a clean environment will resolve it correctly from package.json.

**How to apply:** If fabric needs updating or any other package install fails with ENOTEMPTY, use `npm pack <pkg>` into /tmp then `tar -xzf` into node_modules manually. Always update package.json as the source of truth.

## Fabric v6 API notes (verified against installed types)

- Import: `import * as fabric from 'fabric'` — default import changed in v6
- Image loading: `fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' })` — returns a Promise
- Background: assign directly to `canvas.backgroundImage = img` (not a method call)
- Brush: `new fabric.PencilBrush(canvas)` — pass canvas as constructor argument
- Brush color is a plain string property: `brush.color = 'rgba(...)'`
- `canvas.freeDrawingBrush` — typed as `BaseBrush | undefined` in SelectableCanvas
- `canvas.loadFromJSON(json)` — returns a Promise, does NOT preserve canvas dimensions
- Dynamic import (`import('fabric')`) is required to avoid SSR crashes
