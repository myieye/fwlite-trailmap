# FW Lite product structure + issue mapping (Sonnet Explore agent; counts approximate)

Districts/nodes (maturity guesses):
A. Dictionary editing: entry browser/list (working, collation active), entry+sense editor (working, most active), complex forms (partial, Epic #1302, bug #2742), search (working, bug #2659), history/activity (working, bug #1369), custom fields/views (not done, Epics #1302/#1049).
B. Data, lists, writing systems: writing systems + collation (in progress), Keyman integration (planned, Epic #1336), lists (POS, semantic domains, publications; working), project dashboard (working).
C. Collaboration: comments (in progress, Epic #1765), tasks/review (early, Epic #1763), pictures+audio (in progress, Epic #1764, High Priority bugs #2700 #2693).
D. Platforms: Windows (released), Android (released, Play), Linux (released), Mac (early-tester dmg, notarized, no auto-update), iOS (scaffolding: no device signing, simulator-only CI, FAQ says no iPhone version yet), Web/FwLiteWeb (dev/demo host, unclear), Paratext/Platform.Bible extension (early, 17 labeled items).
E. Sync/data engine: Harmony (working, safety-critical bug backlog harmony#79 #89 #90 #104 #7), LcmCrdt local storage (working, #1391 data lost on uninstall, #2169), MiniLcm API (stable core), FwData bridge + project sync (working, collation import one-way).
F. Lexbox server: server + web UI (production), auth/accounts (#1941, #2491), FwHeadless (working, bugs #2506 #2512), hgweb/Mercurial S&R (production, legacy), deployment/observability (mature).
G. Plumbing (optional): localization (Crowdin), installers/auto-update, troubleshooting/logs, docs site, dev tooling/CI.
H. External: FieldWorks Classic (FLEx), far end of sync chain: Lite -> Lexbox -> FwHeadless -> Mercurial -> FLEx.

Edges: platforms -> shared viewer UI/FwLiteShared; Paratext ext -> FW Lite local API/MiniLcm; viewer -> MiniLcm -> LcmCrdt -> Harmony; Harmony client <-> Lexbox server + auth; Lexbox -> FwHeadless -> hgweb -> FLEx; FwData bridge between FwHeadless and Harmony/MiniLcm; media -> LcmCrdt + Lexbox file storage (cross-cutting weak spot); comments/tasks -> Harmony. Docs/CI/l10n cross-cutting.

Issue mapping (446 items: 251 PRs, 195 issues; 389 lexbox, 57 harmony; 123 open):
- Product labels are path-based (labeler.yml) and coarse: FW Lite 226, Lexbox 105, FW Lite Core 17, MiniLcm 19, Platform.Bible 17. No platform/feature labels.
- Other labels: bug 41, Data bug 17, High Priority 9, Epic 7, UI Design 12, S&R 3, DX 6.
- Epics as anchors: #1765 comments, #1764 media, #1763 tasks, #1241 beta, #1302 custom fields, #1049 custom views, #1336 Keyman.
- plain-words "area" (backstage/feature/data/fix/devices) is a user-facing theme, tiebreaker only.
- Keyword regexes: 81% matched something, 39% matched exactly one node. Estimate ~40% clean, ~40% ambiguous, ~20% manual. Suggest explicit `nodes:` overrides in config for ~30 open fires + 7 epics; rules for the rest. Drop PRs from fire signal.

Fires (open bug/Data bug/High Priority, ~30 unique):
- Harmony + sync/local data: ~10-12 (harmony#7 #79 #89 #90 #104; lexbox#2498 #2431 #2292 #2169 #1391 #2229)
- Lexbox server/auth/hgweb ~5; FwHeadless 2; Media 2 (both High Priority, #2693 also iOS); complex forms/history 3; search 1; shell/nav 1; FwData bridge 1; Win/Mac/Linux/Android 0.
