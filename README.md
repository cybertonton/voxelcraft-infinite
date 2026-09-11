# VoxelCraft ∞ — Endless WebGL Voxel Sandbox

A single-file Minecraft-like voxel sandbox that runs entirely in the browser.
No build step, no assets to download — just open it and play.

**[▶ Play it live via GitHub Pages](../../..)** _(enable Pages on `main` → `index.html`)_
or simply double-click `index.html` (internet needed once for the Three.js CDN).

![Three.js](https://img.shields.io/badge/Three.js-r128-black)
![Single file](https://img.shields.io/badge/single%20file-550KB-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- ♾️ **Infinite world** — chunks stream in/out around the player with seeded RNG
- 🧱 **Place & break blocks**, progressive block breaking
- 🎒 **Inventory system** — left-click take/place/swap, right-click half-stack, Shift-click quick move
- 💧 **Water simulation**, lava, swimming
- 🖥️ **In-game terminal** with commands: `/fly` `/gamemode` `/give` `/heal` `/home` `/sethome` `/spawn` `/kill` `/seed` `/clear` `/fill`
- ❤️ **Survival elements** — health, fall damage, death screen, day/night + fast-time
- 🐑 **Mobs** — pet/shear animals
- ⚙️ **Adaptive quality** scaling to keep FPS smooth
- 💾 **Auto-save** to `localStorage` (survives reloads)

## Controls

| Input | Action |
|---|---|
| WASD + mouse | Move / look |
| Space | Jump (double-tap for fly when enabled) |
| Left click | Break block / pick up |
| Right click | Place block / interact |
| 1–9 / wheel | Hotbar select |
| E | Inventory |
| T or `/` | Terminal |

## Run locally

```bash
# any static server (recommended —avoids file:// worker limits)
npx serve .
# then open http://localhost:3000
```

Or just open `index.html` directly in a browser.

## Tech

- Three.js (r128) via CDN — the only dependency
- Procedural in-code textures (no image assets)
- Vanilla JS, ~13k lines in one file

## License

MIT — see [LICENSE](LICENSE).
