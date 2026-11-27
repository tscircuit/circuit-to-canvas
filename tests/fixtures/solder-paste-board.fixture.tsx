import { pcb_solder_paste } from "circuit-json"
import { type AnyCircuitElement, Circuit } from "tscircuit"

export async function createSolderPasteBoardElements(): Promise<
  AnyCircuitElement[]
> {
  const circuit = new Circuit({ platform: { drcChecksDisabled: true } })
  circuit.add(
    <board width={14} height={6} routingDisabled>
      <chip
        name="U1"
        pcbX={-4.2}
        pcbY={0}
        pcbRotation={35}
        footprint={
          <footprint>
            <smtpad
              shape="pill"
              width="2.6mm"
              height="1.1mm"
              radius="0.55mm"
              portHints={["pin1"]}
              pcbX={0}
              pcbY={0.95}
            />
            <smtpad
              shape="pill"
              width="2.6mm"
              height="1.1mm"
              radius="0.55mm"
              portHints={["pin2"]}
              pcbX={0}
              pcbY={-0.95}
            />
          </footprint>
        }
      />
      <chip
        name="U2"
        pcbX={0}
        pcbY={0}
        footprint={
          <footprint>
            <smtpad
              shape="polygon"
              portHints={["pin1"]}
              points={[
                { x: -1.4, y: -1.4 },
                { x: 1.4, y: -1.4 },
                { x: 1.4, y: 0.6 },
                { x: 0.5, y: 1.4 },
                { x: -1.4, y: 1.4 },
              ]}
            />
          </footprint>
        }
      />
      <chip
        name="U3"
        pcbX={4.2}
        pcbY={0}
        footprint={
          <footprint>
            <smtpad
              shape="rect"
              width="2.8mm"
              height="2.8mm"
              portHints={["pin1"]}
              pcbX={0}
              pcbY={0}
            />
          </footprint>
        }
      />
    </board>,
  )
  await circuit.renderUntilSettled()

  const windowedThermalPaste = pcb_solder_paste.parse({
    type: "pcb_solder_paste",
    pcb_solder_paste_id: "windowed_thermal_paste",
    shape: "polygon",
    layer: "top",
    points: [
      { x: 3.1, y: -1.1 },
      { x: 5.3, y: -1.1 },
      { x: 5.3, y: 1.1 },
      { x: 3.1, y: 1.1 },
    ],
    holes: [
      [
        { x: 3.75, y: -0.45 },
        { x: 4.65, y: -0.45 },
        { x: 4.65, y: 0.45 },
        { x: 3.75, y: 0.45 },
      ],
    ],
  })

  const filteredElements: AnyCircuitElement[] = []
  for (const element of circuit.getCircuitJson()) {
    if (
      element.type === "pcb_solder_paste" &&
      "x" in element &&
      Math.abs(element.x - 4.2) < 0.5
    ) {
      continue
    }
    filteredElements.push(element)
  }
  filteredElements.push(windowedThermalPaste)
  return filteredElements
}
