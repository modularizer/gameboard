# 🎲 Adding Your Own Game to Gameboard

Adding a new game to Gameboard is **surprisingly simple** - no programming required! Every game is defined by a single JSON configuration file that describes the 3D scene, game pieces, and interaction rules.

---

## Quick Start (5 Steps)

**1. Create a game directory:**

```bash
mkdir -p assets/games/mygame
```

**2. Add your assets (optional):**
- 3D models (`.obj` files) for custom pieces
- Textures/images (`.jpg`, `.png`) for boards or pieces

**3. Create `spec.json`:**

Start with this minimal template:

```json
{
  "scene": {
    "camera": { "position": { "x": 10, "y": 10, "z": 10 } }
  },
  "snaps": {
    "grid": { "y": 1, "step": 2 }
  },
  "models": {
    "board": {
      "src": { 
        "top": "#8B4513",
        "dimensions": { "width": 10, "height": 0.5, "depth": 10 }
      },
      "position": { "x": 0, "y": 0, "z": 0 },
      "moveable": false
    }
  }
}
```

**4. Register your game:**

Add your game name to `/src/js/config.js`:

```javascript
export const gameNames = ["lobby", "chess", "quoridor", "mygame"];
```

**5. Test it:**

Open `http://localhost:8080/#mygame` and see your game!

---

## Deep Dive: Building a Complete Game

Let's build **Tic-Tac-Toe** from scratch to understand all the features.

### Step 1: Design Your Game Space

```json
{
  "scene": {
    "camera": {
      "position": { "x": 5, "y": 8, "z": 5 }
    },
    "renderer": {
      "shadows": true
    }
  }
}
```

**Scene Options:**
- `camera.position` - Where the camera starts (x, y, z)
- `camera.target` - What the camera looks at
- `renderer.shadows` - Enable THREE.js shadows

### Step 2: Define Snap Points

Snap controllers make pieces align to grids or zones:

```json
{
  "snaps": {
    "tictactoe": {
      "y": 0.5,              // Fixed Y position (height)
      "step": 2,             // Grid spacing
      "offset": 0,           // Grid offset from origin
      "lockedAxes": ["y"],   // Lock Y axis movement
      "rotationNodes": 4     // Number of rotation snap angles
    }
  }
}
```

**Snap Options:**
- `step` - Grid cell size
- `offset` - Shift grid from origin
- `lockedAxes` - Array of axes to lock (`["x"]`, `["y"]`, `["z"]`)
- `rotationNodes` - Snap rotations (e.g., 4 = 90° increments)

### Step 3: Create Templates

Templates are reusable piece definitions:

```json
{
  "templates": {
    "cell": {
      "src": {
        "top": "$color",
        "dimensions": { "width": 1.9, "height": 0.1, "depth": 1.9 }
      },
      "position": { "x": "$x", "y": 0, "z": "$z" },
      "moveable": false
    },
    "piece": {
      "src": {
        "text": "$symbol",
        "size": 1.5
      },
      "position": { "x": "$x", "y": 0.5, "z": "$z" },
      "rotation": { "x": -1.57, "y": 0, "z": 0 },
      "color": "$color",
      "moveable": true,
      "snap": "tictactoe",
      "metadata": { "player": "$player" }
    }
  }
}
```

**Model Sources:**

1. **Procedural Cubes:**
```json
{
  "src": {
    "top": "#FF0000",      // Color (hex or CSS)
    "bottom": "#00FF00",   // Optional different colors per face
    "front": "GAME/texture.jpg",
    "dimensions": { "width": 2, "height": 1, "depth": 2 }
  }
}
```

2. **Procedural Cylinders:**
```json
{
  "src": {
    "top": "#FFD700",
    "dimensions": { "radius": 1, "height": 0.5 }
  }
}
```

3. **3D Models (OBJ):**
```json
{
  "src": "GAME/piece.obj"  // GAME/ = /assets/games/mygame/
}
```

4. **Text:**
```json
{
  "src": {
    "text": "Hello World",
    "size": 1.0
  }
}
```

### Step 4: Use Aliases for Reusable Values

```json
{
  "aliases": {
    "xColor": "#FF0000",
    "oColor": "#0000FF",
    "cellDark": "#8B4513",
    "cellLight": "#CD853F"
  },
  "templates": {
    "xPiece": {
      "template": "piece",
      "symbol": "X",
      "color": "$$xColor",   // $$ references aliases
      "player": "p1"
    }
  }
}
```

**Variable Substitution:**
- `$variable` - Direct substitution from parent
- `$$alias` - Lookup in `aliases` section
- `$$$nestedAlias` - Lookup alias, then lookup that result

### Step 5: Generate Multiple Pieces with Loops

```json
{
  "repeatedModels": {
    "cell$i": {
      "template": "cell",
      "x": {
        "start": -2,
        "stop": 2,
        "step": 2
      },
      "z": {
        "start": -2,
        "stop": 2,
        "step": 2
      },
      "color": ["#8B4513", "#CD853F", "#8B4513",
                "#CD853F", "#8B4513", "#CD853F",
                "#8B4513", "#CD853F", "#8B4513"]
    },
    "xPiece$i": {
      "template": "xPiece",
      "x": -4,                    // Start position (off-board)
      "z": { "start": -2, "stop": 2, "step": 1 }
    }
  }
}
```

**Loop Syntax:**
- `"start"` - Starting value
- `"stop"` - Ending value (exclusive)
- `"step"` - Increment
- Arrays cycle through values
- `$i` in name becomes the index

### Step 6: Add Static Models

```json
{
  "models": {
    "board": {
      "src": {
        "top": "#D2B48C",
        "dimensions": { "width": 10, "height": 0.2, "depth": 10 }
      },
      "position": { "x": 0, "y": -0.1, "z": 0 },
      "moveable": false
    },
    "gridLine1": {
      "src": {
        "top": "#000000",
        "dimensions": { "width": 0.1, "height": 0.15, "depth": 6 }
      },
      "position": { "x": -1, "y": 0, "z": 0 },
      "moveable": false
    }
  }
}
```

**Piece Properties:**
- `src` - Model source (see above)
- `position` - `{ x, y, z }`
- `rotation` - `{ x, y, z }` in radians
- `color` - Hex color or CSS name (overrides material)
- `moveable` - `true` = players can interact, `false` = static
- `snap` - Name of snap controller from `snaps` section
- `metadata` - Custom data (stored but not used by engine)

### Step 7: Player-Specific Configurations

Different players can see different camera angles:

```json
{
  "scene": {
    "camera": {
      "position": {
        "players": {
          "p1": { "x": 5, "y": 8, "z": -5 },
          "p2": { "x": 5, "y": 8, "z": 5 },
          "pub": { "x": 10, "y": 10, "z": 0 }
        }
      }
    }
  }
}
```

You can also hide pieces from certain players:

```json
{
  "models": {
    "secretCard": {
      "src": "GAME/card.obj",
      "position": { "x": 0, "y": 1, "z": 0 },
      "moveable": true,
      "visible": {
        "players": {
          "p1": true,
          "p2": false,
          "pub": false
        }
      }
    }
  }
}
```

### Step 8: Add Instructions & Scorecard

```json
{
  "metadata": {
    "instructions": "Click a piece and drag it to a cell.\nFirst to get 3 in a row wins!",
    "scorecard": "Player 1,Player 2\n0,0"
  }
}
```

The scorecard uses CSV format and syncs in real-time.

---

## 📚 Complete Tic-Tac-Toe Example

Here's a complete, working game you can use as a reference:

```json
{
  "scene": {
    "camera": { "position": { "x": 5, "y": 8, "z": 5 } }
  },
  "snaps": {
    "grid": { "y": 0.5, "step": 2, "lockedAxes": ["y"] }
  },
  "aliases": {
    "xColor": "#FF4444",
    "oColor": "#4444FF"
  },
  "templates": {
    "piece": {
      "src": { "text": "$symbol", "size": 1.5 },
      "position": { "x": "$x", "y": 0.5, "z": "$z" },
      "rotation": { "x": -1.57, "y": 0, "z": 0 },
      "color": "$$color",
      "moveable": true,
      "snap": "grid"
    }
  },
  "repeatedModels": {
    "xPiece$i": {
      "template": "piece",
      "symbol": "X",
      "color": "xColor",
      "x": -6,
      "z": { "start": -2, "stop": 3, "step": 1 }
    },
    "oPiece$i": {
      "template": "piece",
      "symbol": "O",
      "color": "oColor",
      "x": 6,
      "z": { "start": -2, "stop": 3, "step": 1 }
    }
  },
  "models": {
    "board": {
      "src": { 
        "top": "#D2B48C",
        "dimensions": { "width": 10, "height": 0.2, "depth": 10 }
      },
      "position": { "x": 0, "y": -0.1, "z": 0 },
      "moveable": false
    }
  },
  "metadata": {
    "instructions": "Drag X or O to the grid.\nFirst to 3 in a row wins!"
  }
}
```

Save this to `/assets/games/tictactoe/spec.json` and you're done!

---

## 🔍 Debugging Tips

1. **Check the browser console** - JSON parsing errors show up immediately
2. **Start simple** - Add one piece at a time
3. **Use `?timestamp` in URL** - Bypasses cache: `#mygame.room1?1234567890`
4. **Inspect existing games** - Check `/assets/games/chess/spec.json` for examples
5. **Test with multiple players** - Open game in two browser windows with different player roles

### Common Issues

**Problem: Pieces don't snap to grid**
- Check that `snap` property matches a key in `snaps` section
- Verify `moveable: true` is set

**Problem: 3D model doesn't load**
- Ensure `.obj` file is in `/assets/games/yourgame/` directory
- Use `GAME/filename.obj` (not a relative path)
- Check browser console for 404 errors

**Problem: Template variables not substituting**
- Single `$` for direct parent properties
- Double `$$` for alias lookups
- Make sure property exists in parent object

**Problem: Game doesn't appear in selector**
- Verify game name is in `/src/js/config.js` `gameNames` array
- Clear browser cache or add `?timestamp` to URL
- Check that `spec.json` is valid JSON (use a validator)

---

## 🎨 Finding 3D Models

Free sources for `.obj` models:

- **[GrabCAD](https://grabcad.com)** - Engineering models, great for game pieces
- **[Thingiverse](https://www.thingiverse.com)** - 3D printable models
- **[Free3D](https://free3d.com)** - Mixed library with game assets
- **[Blender](https://www.blender.org)** - Create your own (free 3D software)
- **[Sketchfab](https://sketchfab.com)** - Many free models (check license)

**Tips for 3D Models:**
- Keep models under 1MB for fast loading
- OBJ format only (most common, widely supported)
- Simplify complex models in Blender before using
- Center your model at origin (0,0,0) for easier positioning
- Y-axis should be "up" for consistent orientation

---

## 🎮 Advanced Techniques

### Drop Zones

Create areas where pieces can be placed:

```json
{
  "zones": {
    "discard": {
      "type": "dropzone",
      "position": { "x": 10, "y": 0, "z": 0 },
      "size": { "width": 4, "height": 4 }
    }
  }
}
```

### Move Zones

Restrict where pieces can move:

```json
{
  "models": {
    "restrictedPiece": {
      "src": "GAME/piece.obj",
      "moveable": true,
      "movezone": "playerArea"
    }
  },
  "zones": {
    "playerArea": {
      "type": "movezone",
      "bounds": {
        "x": { "min": -10, "max": 0 },
        "z": { "min": -10, "max": 10 }
      }
    }
  }
}
```

### Nested Templating

Templates can inherit from other templates:

```json
{
  "templates": {
    "basePiece": {
      "moveable": true,
      "snap": "grid"
    },
    "coloredPiece": {
      "template": "basePiece",
      "color": "$color"
    },
    "redPiece": {
      "template": "coloredPiece",
      "color": "#FF0000"
    }
  }
}
```

### Complex Loops

Loop over multiple variables simultaneously:

```json
{
  "repeatedModels": {
    "$colorPiece$i": {
      "template": "piece",
      "color": ["#FF0000", "#00FF00", "#0000FF"],
      "name": ["red", "green", "blue"],
      "x": { "start": 0, "stop": 6, "step": 2 }
    }
  }
}
```

This creates: `redPiece0`, `greenPiece1`, `bluePiece2` with colors cycling through the array.

---

## 🚀 Publishing Your Game

Once your game works locally:

### Option 1: Contribute to Main Repo

1. **Fork the repo** at [github.com/modularizer/gameboard](https://github.com/modularizer/gameboard)
2. **Clone your fork:**
   ```bash
   git clone https://github.com/yourusername/gameboard.git
   ```
3. **Add your game** to `assets/games/yourgame/`
4. **Update `config.js`** with your game name
5. **Test locally** to ensure it works
6. **Commit and push:**
   ```bash
   git add assets/games/yourgame/
   git add src/js/config.js
   git commit -m "Add [Your Game Name] game"
   git push origin main
   ```
7. **Create a Pull Request** on GitHub
8. Your game will be live at `modularizer.github.io/gameboard/#yourgame`

### Option 2: Host Your Own

1. **Fork and clone** as above
2. **Add your games** without worrying about pull requests
3. **Enable GitHub Pages** in your repo settings
4. Your version will be at `yourusername.github.io/gameboard/#yourgame`

### Option 3: Self-Host

Deploy anywhere that serves static files:
- Netlify
- Vercel
- AWS S3 + CloudFront
- Your own web server

Just upload the entire `gameboard/` directory!

---

## 📖 JSON Schema Reference

### Root Level

```json
{
  "scene": { /* Scene configuration */ },
  "snaps": { /* Snap controllers */ },
  "aliases": { /* Reusable values */ },
  "templates": { /* Reusable piece definitions */ },
  "repeatedModels": { /* Loops for generating pieces */ },
  "models": { /* Actual game pieces */ },
  "zones": { /* Drop zones and move zones */ },
  "metadata": { /* Instructions and scorecard */ }
}
```

### Scene Object

```json
{
  "scene": {
    "camera": {
      "position": { "x": 10, "y": 10, "z": 10 },
      "target": { "x": 0, "y": 0, "z": 0 }
    },
    "renderer": {
      "shadows": true,
      "backgroundColor": "#000000"
    },
    "lights": {
      "ambient": { "color": "#FFFFFF", "intensity": 0.5 },
      "directional": { "color": "#FFFFFF", "intensity": 1.0 }
    }
  }
}
```

### Model Object (Full Options)

```json
{
  "models": {
    "pieceName": {
      "src": "GAME/model.obj" | { /* procedural shape */ },
      "position": { "x": 0, "y": 0, "z": 0 },
      "rotation": { "x": 0, "y": 0, "z": 0 },
      "scale": { "x": 1, "y": 1, "z": 1 },
      "color": "#FFFFFF",
      "moveable": true | false,
      "snap": "snapControllerName",
      "movezone": "movezoneControllerName",
      "visible": true | false | { "players": { "p1": true, "p2": false } },
      "metadata": { /* any custom data */ }
    }
  }
}
```

---

## 🤝 Need Help?

- **Check existing games** in `/assets/games/` for examples
- **Open an issue** on GitHub if you find bugs
- **Join discussions** to share your creations
- **Read the main README** for architecture details

Happy game building! 🎮

