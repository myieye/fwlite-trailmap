/** [light, dark] per district. Roofs, the ground tint, the territory outline and the swatches all use these, so they must stay apart on grass. */
const colors: Record<string, [string, string]> = {
  editing: ['#5f8fe0', '#2a4a9c'],
  collaboration: ['#d98aa0', '#96485f'],
  'project-setup': ['#a184b8', '#5d4373'],
  platforms: ['#d9a84a', '#99681f'],
  sync: ['#45b0c4', '#1f6f80'],
  help: ['#ece4cd', '#9c9175'],
  unsorted: ['#a29d92', '#66625a'],
  old: ['#d9744e', '#9c4029'],
}
const spare = Object.values(colors).slice(0, 6)
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

export const districtColor = (id: string) => colors[id] ?? spare[hash(id) % spare.length]
export const swatch = (id: string) => `--d: ${districtColor(id)[0]}; --dd: ${districtColor(id)[1]}`
