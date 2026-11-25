import type { PcbPath } from "@tscircuit/props"
import type { CircuitJson } from "circuit-json"
import { Fragment, type ReactElement } from "react"
import { Circuit } from "@tscircuit/core"

function Pair({
  name,
  y = 0,
  positivePath = [],
  negativePath = [],
  loadLayer = "top",
  padDiameter = 0.65,
}: {
  name: string
  y?: number
  positivePath?: PcbPath
  negativePath?: PcbPath
  loadLayer?: "top" | "bottom"
  padDiameter?: number
}): ReactElement {
  const legs = [
    { name: `${name}_P`, y: y + 0.6, path: positivePath },
    { name: `${name}_N`, y: y - 0.6, path: negativePath },
  ]
  return (
    <>
      {legs.map(({ name, y, path }) => (
        <Fragment key={name}>
          <testpoint
            name={`${name}_SRC`}
            footprintVariant="pad"
            padDiameter={padDiameter}
            doNotPlace
            pcbX={-12}
            pcbY={y}
          />
          <testpoint
            name={`${name}_LOAD`}
            footprintVariant="pad"
            padDiameter={padDiameter}
            doNotPlace
            pcbX={12}
            pcbY={y}
            layer={loadLayer}
          />
          <trace
            name={name}
            from={`.${name}_SRC > .pin1`}
            to={`.${name}_LOAD > .pin1`}
            thickness="0.24mm"
            pcbPath={path}
          />
        </Fragment>
      ))}
      <differentialpair
        name={name}
        positiveConnection={`${name}_P`}
        negativeConnection={`${name}_N`}
        pcbTraceGap="0.96mm"
      />
    </>
  )
}

/** A 45° detour measured from the source pad, with its height signed by direction. */
function detour({ x, height }: { x: number; height: number }): PcbPath {
  const run = Math.abs(height)
  return [
    { x, y: 0 },
    { x: x + run, y: height },
    { x: x + run + 0.8, y: height },
    { x: x + 2 * run + 0.8, y: 0 },
  ]
}

/** Renders TSX through core and removes generated test point labels. */
export function renderBoard({ board }: { board: ReactElement }): CircuitJson {
  const circuit = new Circuit({ platform: { drcChecksDisabled: true } })
  circuit.add(board)
  return circuit
    .getCircuitJson()
    .filter(
      (element) =>
        element.type !== "pcb_silkscreen_text" || !element.pcb_component_id,
    )
}

/** A pair of equal-length, straight traces. */
export function MatchedPairBoard(): ReactElement {
  return (
    <board width={28} height={8} routeRemaining={false}>
      <Pair name="MATCHED" />
    </board>
  )
}

/** A pair with a tuning bump and two later compensating detours. */
export function LoadEndMeanderBoard(): ReactElement {
  return (
    <board width={28} height={9} routeRemaining={false}>
      <Pair
        name="MEANDER"
        positivePath={detour({ x: 2, height: 2.2 })}
        negativePath={[
          ...detour({ x: 16, height: -1.1 }),
          ...detour({ x: 20, height: -1.1 }),
        ]}
      />
    </board>
  )
}

/** A pair with top and bottom routes joined by vias. */
export function LayerChangeBoard(): ReactElement {
  const via: PcbPath = [{ x: 12, y: 0, via: true, toLayer: "bottom" }]
  return (
    <board
      width={28}
      height={9}
      fabricatorPreset="jlcpcb_economy"
      routeRemaining={false}
    >
      <Pair
        name="LAYER_CHANGE"
        loadLayer="bottom"
        positivePath={[...detour({ x: 3, height: 1.1 }), ...via]}
        negativePath={[...via, ...detour({ x: 17, height: -1.1 })]}
      />
    </board>
  )
}
