// Places points along the map's hand-written paths (M, C and S commands only) without the DOM:
// SVGPathElement.getPointAtLength took most of the page's start-up script time on a phone.
export function measurePath(d: string) {
  const tokens = d.match(/[MCS]|-?[\d.]+/g)!
  const pts: { x: number; y: number }[] = []
  let x = 0
  let y = 0
  let ctrl: [number, number] | undefined
  let cmd = ''
  for (let i = 0; i < tokens.length; ) {
    if (/[MCS]/.test(tokens[i])) cmd = tokens[i++]
    const n = (k: number) => Number(tokens[i + k])
    if (cmd === 'M') {
      ;[x, y] = [n(0), n(1)]
      ctrl = undefined
      pts.push({ x, y })
      i += 2
      continue
    }
    const [x1, y1] = cmd === 'C' ? [n(0), n(1)] : ctrl ? [2 * x - ctrl[0], 2 * y - ctrl[1]] : [x, y]
    if (cmd === 'C') i += 2
    const [x2, y2, x3, y3] = [n(0), n(1), n(2), n(3)]
    i += 4
    for (let t = 1 / 32; t <= 1.0001; t += 1 / 32) {
      const u = 1 - t
      pts.push({
        x: u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
        y: u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
      })
    }
    ctrl = [x2, y2]
    ;[x, y] = [x3, y3]
  }
  const at = [0]
  for (let i = 1; i < pts.length; i++) at.push(at[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
  const length = at[at.length - 1]

  // Past either end it carries on in a straight line.
  const point = (s: number) => {
    let i = 1
    while (i < pts.length - 1 && at[i] < s) i++
    const [a, b] = [pts[i - 1], pts[i]]
    const f = (s - at[i - 1]) / (at[i] - at[i - 1])
    const [dx, dy] = [b.x - a.x, b.y - a.y]
    return { x: a.x + dx * f, y: a.y + dy * f, deg: (Math.atan2(dy, dx) * 180) / Math.PI }
  }
  return { length, point }
}
