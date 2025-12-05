# circuit-to-canvas

Draw [Circuit JSON](https://github.com/tscircuit/circuit-json) into a Canvas- works with any canvas object (Node/Vanilla)

```tsx
const drawer = new CircuitToCanvasDrawer(canvasOrCanvasRenderingContext2d)

// Sets the internal transformation matrix for all operations
drawer.setCameraBounds({ minX: 0, maxX: 100, minY: 0, maxY: 100 })

drawer.configure({
  colorOverrides: {
    topCopper: "#ff0000"
  }
})

drawer.drawPlatedHole(pcbPlatedHole, {
  layers: ["copper"]
})



drawer.drawCopper(circuitJsonArray, { layers: ["top"] })

// Draws all layers by default, soldermask etc.
drawer.drawCircuitJson(circuitJsonArray)
```
