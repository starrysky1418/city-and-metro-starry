---
name: city-metro-map
description: Build or revise real-city scenarios in this City and Metro repository. Use for geography, historical land changes, facilities, city economy, openings, and map-specific tasks.
---

# City and Metro maps

1. Choose the bounds, start date, money, first viable metro corridor, and a comparable original scenario. Guangzhou shows how a facility closes and its land changes use. Hong Kong shows runway extensions and reclamation. Use official timelines for opening dates and document estimates for demand, prices and geometry.
2. Prepare real geography in `js/geo_<id>.js`. Use a consistent WGS84 projection and retain attribution. Include coastline, inland water, bridges, road classes, above-ground rail, reserves and searchable names. Verify both the loading preview and the actual 2D/2.5D game. Preview assets can look correct when runtime layers are missing. Keep cell dimensions compatible with the traffic zone sizing in `js/maps.js`.
3. Put playable history in `js/data_<id>.js`. Define population and jobs centers, growth curves, city economy and shocks, protected buildings, dated facilities and their demand, region access, reclamation and tasks. Register geography before scenario data in `index.html`. With `community-geography.js`, distinguish schematic anchors that need warping from measured points that are already projected.
4. For historically changing sites, model the land, buildings and demand separately. Draw the pre-change and post-change ground footprints. Check both runway endpoints and midpoint against actual land and use dated airport or railway facilities for trip demand. Keep operating infrastructure when only a terminal closes, and avoid assigning a second public demand point to an airside concourse.
5. Test early expansion on the starting budget. Check that areas become available before tasks ask players to serve them. Use historical objectives for credible metro corridors, and put speculative expansions in reward-only challenges. Keep remote reserves and scenic spots out of automatic facility tasks.
6. Validate a fresh game and each major milestone. For major map expansions or rewrites, target fresh saves and skip legacy migration unless requested. Inspect actual roads, terrain, landmarks, residential and employment heatmaps, direction of travel and draft impact prediction. Use `scripts/test-community-ground.mjs` and the city-specific tests. Refresh the simulation stamp and run `node scripts/verify-game.mjs --write` when shipping source changes.

## Map revisions and release checks

- Establish the playable urban footprint before generating the background. Treat locked background, historically gated buildable land and permanent reserves as separate layers. Verify boundaries at the grid level, especially city edges, bay crossings and reclaimed land.
- Calibrate the population for the area actually modeled. Use the same geographic coverage when comparing years, and distribute population and jobs across the established center and later growth areas. Check several named districts in the early and late heatmaps.
- Try one representative corridor before processing the whole city. Compare the visible road layer with the walking graph and check access on both sides of major barriers. On a connected operating line, inspect actual boardings at a residential stop and a facility stop.
- Keep the visual opening, trip-demand opening, and construction access dates distinct. Verify facility and task pins in the playable map and check that future or locked locations do not create premature complaints.
- Match starter funding and recurring grants against an executable first phase. Compare actual draft prices for excavation, tunnels and crossings. Give each verified historical event a source and identify modeled estimates.
- Keep attribution for upstream maps and geographic data. Record what came from upstream and what the community changed. Use the published map roster to catch accidental inclusion of in-progress scenarios.
- At the project root run `node scripts/check-map.mjs <id>`, then `node scripts/build.mjs` and `node scripts/verify-game.mjs --dist` when publishing. Verify actual gameplay after selecting the city. Include a pre- and post-event check for dated geography or major demand changes.
