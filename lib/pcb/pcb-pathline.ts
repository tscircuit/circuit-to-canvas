// pcb-pathline.ts

export interface PCBPathLine {
  start: { x: number; y: number }
  end: { x: number; y: number }
  width: number
  style?: string
}

export class PCBPathLineComponent {
  private pathLine: PCBPathLine

  constructor(pathLine: PCBPathLine) {
    this.pathLine = pathLine
  }

  public render(): string {
    const { start, end, width, style } = this.pathLine
    // Example SVG representation
    return `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke-width="${width}" style="stroke:${style || "black"};" />`
  }
}
