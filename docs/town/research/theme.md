# Theme research (Sonnet subagent, only 2 web searches; prior-art claims partly from memory)

Bottom line from agent: metro/transit map as structural grammar, campus (or town) as the "place" skin; skip theme park, zoo, space, LEGO; don't use fire/fog as primary vocabulary.

Ratings (structure fit / 6 states / cross-cutting / reuse+overlays / intl+funder fit, gimmick risk):
- City/town: Good/Good/OK/Good/Good. Sync = roads/rail/power; server = power plant. "Planned" better as zoned lot than fog. Implies residents ("who lives here?"). Medium gimmick risk.
- Campus: Good/Good/Good/Good/Good. Grand opening is native. Shared services (library, power, IT) = cross-cutting. Lowest gimmick risk of place metaphors.
- Village/market town: cramped past ~40 nodes; can read patronizing re minority-language work.
- Harbor: few building states; colonial/trade overtones.
- Metro map: Good/OK/Good/Good/Good. Station glyph states; weak place feel / "wow". Easiest reuse across products. Station size = users, line width = devs.
- Blueprint: good but dry.
- Garden/farm: gentle, growth playback lovely, hard to show locked/fire.
- Archipelago, workshop, library: poor.
- Theme park: states native, crowds native, but reads flippant to mission-driven funders. High gimmick risk.
- Zoo: bad idea (continent regions, exhibits of living things).
- Space: sci-fi/childish to execs. LEGO: bad idea for execs.

Prior art:
- CodeCity controlled experiment (Wettel/Lanza/Robbes ICSE 2011, 41 participants): more correct + faster than baseline, but subjects were developers, not execs. Minelli & Lanza 2022 VR city: faster, similar accuracy.
- Oslo master's thesis 2022 tech-debt visualizations helped non-technical stakeholders' monitoring/communication.
- CodeScene: show business impact, not code metrics. Fit metaphor to audience.
- Status pages: boring green/yellow/red works because consistent.
- General: stable layout, few encodings, redundant encoding (shape+color), legend. Decoration without data and 3D that hides labels distract. Metaphor aids recall/conversation, not accuracy.

Pitfalls:
- Fire = emergency; if everything burns nothing does. Smashed window default for serious bugs; fire only for critical/user-blocking.
- Fog reads "unknown", not "planned". Planned = dashed outline / blueprint ghost / signed empty lot. Fog could be a genuine separate state: "nobody has investigated yet".
- City implies residents: overlay users from day one.
- Locked can read broken/restricted: pair with ribbon + "Opening soon".
- Improving vs under construction easily confused: small crane on an open, lit building.
- Scaffold vs built-not-open confusable: test with real viewers.
- Avoid military language, religious buildings, geography-named districts.
- Sync: closer to a utility (power/water: hidden dependency that fails everywhere) than roads.
- Distance will be read as meaningful: make adjacency meaningful.
- Fix the visual grammar across products; vary only the map.

Campus sketch for FW Lite: districts Editing, Find, Media, Collaboration, Access, Data safety, Learn, Admin (Lexbox web). Platforms = gates around the edge (iOS a ghost lot). Harmony = utility tunnel/power line under all. Lexbox server = central plant. FLEx interop = bridge/gatehouse. Auth = ID desk at main gate. Overlays: people on paths = users, hard hats = devs, funder flag on building.

Suggested validation: test the six-state legend with 5-10 outsiders (incl. intl staff, one funder): "point to what's broken / what's coming".
