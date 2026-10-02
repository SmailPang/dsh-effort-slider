import { mountDshEffortSliderWidget } from '../../web/widget.js'

export const name = 'effort-slider'
export const inject = []

export function apply(ctx) {
  const dispose = mountDshEffortSliderWidget()
  ctx.effect(() => dispose)
}
