export type State = 'planned' | 'building' | 'beta' | 'open'
export type DistrictId = 'dictionary' | 'arrivals' | 'riverside'

export interface Building {
  id: string
  name: string
  district: DistrictId
  state: State
  broken?: number
  fire?: number
  working?: boolean
  blurb: string
  issues: string[]
}

export const districts: Record<DistrictId, { name: string; blurb: string }> = {
  dictionary: { name: 'Dictionary quarter', blurb: 'Where people write and find entries.' },
  arrivals: { name: 'Arrivals', blurb: 'How people get in: one gate per device.' },
  riverside: { name: 'Riverside', blurb: 'Sync, and the bridge to FieldWorks Classic.' },
}

export const stateInfo: Record<State, { label: string; meaning: string }> = {
  planned: { label: 'Planned', meaning: 'On the plan. Nobody is building it yet.' },
  building: { label: 'Being built', meaning: 'The team is building it now. Not usable yet.' },
  beta: { label: 'Beta', meaning: 'Built and usable, but not open to everyone yet.' },
  open: { label: 'Open', meaning: 'Done and open to everyone.' },
}

export const buildings: Building[] = [
  {
    id: 'entry-editor',
    name: 'Entry editor',
    district: 'dictionary',
    state: 'open',
    broken: 2,
    working: true,
    blurb: 'Where people write and fix dictionary entries.',
    issues: [
      'Being improved: faster typing in long entries',
      'Broken: undo sometimes skips a change in examples',
      'Broken: pasted text keeps its old font',
    ],
  },
  {
    id: 'entry-list',
    name: 'Entry list & search',
    district: 'dictionary',
    state: 'open',
    broken: 1,
    blurb: 'Browse and search every entry in a project.',
    issues: ['Broken: search misses words with some accents'],
  },
  {
    id: 'complex-forms',
    name: 'Complex forms',
    district: 'dictionary',
    state: 'building',
    blurb: 'Link phrases and compounds to the words they are made of.',
    issues: ['Being built: picking the parts of a compound', 'Next: showing complex forms in the entry list'],
  },
  {
    id: 'history',
    name: 'History',
    district: 'dictionary',
    state: 'open',
    broken: 1,
    blurb: 'See who changed what, and when.',
    issues: ['Broken: some old changes show no author'],
  },
  {
    id: 'custom-fields',
    name: 'Custom fields & views',
    district: 'dictionary',
    state: 'planned',
    blurb: 'Let each team add its own fields and pick what to show.',
    issues: ['Planned after 1.0'],
  },
  {
    id: 'windows',
    name: 'Windows',
    district: 'arrivals',
    state: 'open',
    blurb: 'FW Lite for Windows computers.',
    issues: ['No open problems'],
  },
  {
    id: 'android',
    name: 'Android',
    district: 'arrivals',
    state: 'open',
    blurb: 'FW Lite for Android phones and tablets.',
    issues: ['No open problems'],
  },
  {
    id: 'linux',
    name: 'Linux',
    district: 'arrivals',
    state: 'open',
    blurb: 'FW Lite for Linux computers.',
    issues: ['No open problems'],
  },
  {
    id: 'mac',
    name: 'Mac',
    district: 'arrivals',
    state: 'beta',
    blurb: 'FW Lite for Mac computers.',
    issues: ['Beta: testers are trying it now', 'Next: sign the app so Macs trust it'],
  },
  {
    id: 'ios',
    name: 'iOS',
    district: 'arrivals',
    state: 'building',
    blurb: 'FW Lite for iPhone and iPad.',
    issues: ['Being built: first test version for iPad'],
  },
  {
    id: 'paratext',
    name: 'Paratext extension',
    district: 'arrivals',
    state: 'building',
    blurb: 'Look up and add words without leaving Paratext.',
    issues: ['Being built: find a word from the Paratext window'],
  },
  {
    id: 'harmony',
    name: 'Harmony waterworks',
    district: 'riverside',
    state: 'open',
    fire: 5,
    blurb: 'Harmony, the sync engine that keeps everyone’s copy the same.',
    issues: [
      'Urgent: a change made offline can be lost in rare cases',
      'Urgent: sync stops when two people rename the same thing',
      'Urgent: deleted senses come back after sync',
      'Urgent: very large projects time out on first sync',
      'Urgent: pictures can go missing after sync',
    ],
  },
  {
    id: 'fw-classic',
    name: 'FieldWorks Classic',
    district: 'riverside',
    state: 'open',
    broken: 1,
    blurb: 'The old town: FieldWorks, reached by the FwHeadless bridge.',
    issues: ['Broken: some custom lists don’t cross the bridge'],
  },
]
