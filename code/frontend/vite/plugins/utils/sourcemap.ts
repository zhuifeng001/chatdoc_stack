import type MagicString from 'magic-string'

export const getTransformResult = (s: MagicString, id?: string) => {
  // if (s?.hasChanged()) {
  return {
    code: s.toString(),
    get map() {
      return s.generateMap({
        source: id,
        includeContent: true,
        hires: true
      })
    }
  }
  // }
}
