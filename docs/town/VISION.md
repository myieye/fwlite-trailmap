# The town: vision and decisions

A full-screen map that shows a product as a small town: each feature, platform or piece of infrastructure is a building, and you can see at a glance what's open, what's being built, what's in beta and what's on fire. Separate from the trail map (which answers "how far to 1.0"); this answers "what state is everything in". FW Lite is the first town. Research behind these choices is in `research/`.

## Decided

- **Audience:** product managers, management and funders. Not end users.
- **Theme:** a town on an island, cut through by the Harmony river. Districts are named by function, never by geography. No flags, places of worship or military buildings.
- **Full screen** on phone and desktop. Fixed camera angle, pan and pinch zoom, no rotation. Zoomed out shows districts; zoomed in shows buildings with labels and badges. Tapping a building opens a bottom sheet (phone) or side panel (desktop). A list view carries the same data as text.
- **Building states** (exactly one each):

  | State | Looks like | Source |
  |---|---|---|
  | Planned | Signposted empty lot | In config, nothing done yet |
  | Under construction | Scaffold, fence | Counted from issues and PRs |
  | Beta | Finished, ribbon across the door: usable, not ready for the public | Declared in config with a date and a link |
  | Open | Lit and alive | Declared in config with a release link |

- **Overlays** (stack on any building): broken window = open `bug`; fire = open `Data bug` or `High Priority`; hard hats = someone is working on it ("improving" when the building is open). Each has a count badge. The badge carries the facts; the 3D is mood.
- **Honesty:** progress is counted, never estimated. No half-built towers, no dates except a declared `since`.
- **On the FW Lite map:** user-facing features, platforms (Windows, Mac, Linux, Android, iOS, Paratext), Harmony, local storage, Lexbox with sign-in, FwHeadless (first class: it's a feature we ship), FieldWorks Classic as the old town across the river. Docs and translation are secondary buildings. Not on the map: CI, hgweb.
- **History:** record a dated snapshot every sync from now on, so playback is possible later. GitHub doesn't keep history for labels, milestones or assignees.

## Later (not building yet)

| Idea | Data it needs |
|---|---|
| Residents: users per building | LT analytics (Mixpanel): active users, downloads, per-feature usage |
| Workers: developer counts and assignments | Assignees per node from GitHub, or a hand-kept staffing list |
| Funder view: "N fires affecting M users" | Fires per node joined with users per node |
| Other products' towns, starting with Keyman | Same grammar and state rules; a config per product |
| History playback: watch the town grow | Daily snapshots, config status changelog, committed layout |
| Link the town and the trail map | Shared node ids |
| Fog for "nobody has looked here yet" | A declared `unknown` status |

## Open risks

- Does a low-poly town read as serious to management, or as a toy? The look check is meant to answer this.
- Can outsiders tell the states apart at phone size? Test the legend with five people, including non-Western SIL staff.
- Phone performance and battery.
- Mapping issues to buildings: about 40% map cleanly by rules; the rest need pins in config.
