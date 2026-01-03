import type {
  AnyCircuitElement,
  PcbSmtPad,
  PcbHole,
  PcbPlatedHole,
} from "circuit-json"

export function hasSoldermaskElements(elements: AnyCircuitElement[]): {
  hasSoldermaskPads: boolean
  hasSoldermaskHoles: boolean
  hasSoldermaskPlatedHoles: boolean
} {
  const hasSoldermaskPads = elements.some(
    (el) =>
      el.type === "pcb_smtpad" &&
      (el as PcbSmtPad).is_covered_with_solder_mask === true,
  )
  const hasSoldermaskHoles = elements.some(
    (el) =>
      el.type === "pcb_hole" &&
      (el as PcbHole & { is_covered_with_solder_mask?: boolean })
        .is_covered_with_solder_mask === true,
  )
  const hasSoldermaskPlatedHoles = elements.some(
    (el) =>
      el.type === "pcb_plated_hole" &&
      (el as PcbPlatedHole & { is_covered_with_solder_mask?: boolean })
        .is_covered_with_solder_mask === true,
  )

  return { hasSoldermaskPads, hasSoldermaskHoles, hasSoldermaskPlatedHoles }
}
