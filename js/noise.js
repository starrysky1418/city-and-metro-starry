'use strict';
(function (CM) {
  const N = CM.Noise = {}, M = CM.Metro, U = CM.U;
  const LIMIT = 0.16, BARRIER = 0.25;

  function exposedParts(seg, geom) {
    return (geom.parts || [{ type: seg.type, g: geom }]).filter(part => part.type !== 'underground');
  }
  N.cost = function (seg, geom, year) {
    return exposedParts(seg, geom).reduce((sum, part) =>
      sum + part.g.lenM / 1000 * CM.CFG.cost.trackPerKm[part.type] * 0.07, 0) * M.costIndex(year);
  };

  function cellsNear(city, seg, geom) {
    const cells = new Map(), radius = 260 / CM.CFG.CELL_M, width = city.W;
    for (const { g } of exposedParts(seg, geom)) {
      const pts = g.pts;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1];
        const d2 = dx * dx + dy * dy;
        if (!d2) continue;
        const lx = Math.max(0, Math.floor(Math.min(a[0], b[0]) - radius));
        const hx = Math.min(width - 1, Math.floor(Math.max(a[0], b[0]) + radius));
        const ly = Math.max(0, Math.floor(Math.min(a[1], b[1]) - radius));
        const hy = Math.min(city.H - 1, Math.floor(Math.max(a[1], b[1]) + radius));
        for (let y = ly; y <= hy; y++) for (let x = lx; x <= hx; x++) {
          const cell = y * width + x;
          if (city.landFrac[cell] < 0.5) continue;
          const ox = x + 0.5 - a[0], oy = y + 0.5 - a[1];
          const t = U.clamp((ox * dx + oy * dy) / d2, 0, 1);
          const d = Math.hypot(ox - t * dx, oy - t * dy);
          if (d >= radius) continue;
          const strength = (1 - d / radius) ** 2;
          if (strength > (cells.get(cell) || 0)) cells.set(cell, strength);
        }
      }
    }
    return cells;
  }

  function passings(model, compiled, weekday, weekend) {
    const sums = new Map(), weights = CM.CFG.trips.weekWeights;
    for (const r of compiled.routes) {
      let units = 0, night = 0;
      for (let p = 0; p < model.pHours.length; p++) {
        const a = weekday[p], b = weekend[p];
        const freq = row => row?.freqDir ? (row.freqDir[2 * r.id] || 0) + (row.freqDir[2 * r.id + 1] || 0) : 2 * (row?.freq?.[r.id] || 0);
        const frequency = freq(a) * weights.wd + freq(b) * weights.we;
        if (p === 3) night = frequency * 5 * 3;
        units += p === 3 ? night : frequency * model.pHours[p];
      }
      if (!(units > 0)) continue;
      const tracks = new Set();
      for (const leg of r.legSegs) for (const ref of leg) {
        const cs = compiled.segs.get(ref.id);
        if (cs) tracks.add(M.trackKey(cs.seg));
      }
      for (const key of tracks) {
        const entry = sums.get(key) || { total: 0, night: 0 };
        entry.total += units; entry.night += night;
        sums.set(key, entry);
      }
    }
    return sums;
  }

  N.assess = function (model, compiled, weekday, weekend) {
    const out = { people: 0, severity: 0, segments: [] };
    if (!compiled || !weekday || !weekend || !compiled.segs.size) return out;
    const city = model.city, tracks = new Map(), totals = new Map();
    const passing = passings(model, compiled, weekday, weekend);
    for (const item of compiled.segs.values()) {
      const key = M.trackKey(item.seg), track = tracks.get(key);
      if (track) track.barrier ||= !!item.seg.noiseBarrier;
      else if (passing.has(key) && exposedParts(item.seg, item.g).length)
        tracks.set(key, { ...item, barrier: !!item.seg.noiseBarrier });
    }
    for (const [key, track] of tracks) {
      const { seg, g, barrier } = track, runs = passing.get(key), factor = runs.total / 200;
      const cells = cellsNear(city, seg, g);
      let people = 0, protectedPeople = 0;
      for (const [cell, strength] of cells) {
        const pop = city.pop[cell];
        if (!pop) continue;
        const raw = factor * strength, exposure = raw * (barrier ? BARRIER : 1);
        totals.set(cell, (totals.get(cell) || 0) + exposure);
        if (exposure >= LIMIT) people += pop;
        if (raw * BARRIER >= LIMIT) protectedPeople += pop;
      }
      const mid = g.pts[Math.floor(g.pts.length / 2)];
      out.segments.push({ id: seg.id, line: seg.line, key, people, protectedPeople, factor, nightShare: runs.night / runs.total, x: mid[0], y: mid[1] });
    }
    for (const [cell, load] of totals) if (load >= LIMIT) {
      out.people += city.pop[cell];
      out.severity += city.pop[cell] * Math.min(1, load);
    }
    return out;
  };

  N.current = function (model) {
    const cache = model._noise, compiled = model.net?.C, version = model.version, cityVersion = model.city.version;
    if (cache && cache.compiled === compiled && cache.version === version && cache.cityVersion === cityVersion) return cache.result;
    const result = N.assess(model, compiled, model.resultsFor('wd').per, model.resultsFor('we').per);
    model._noise = { compiled, version, cityVersion, result };
    return result;
  };

  N.previewSegment = function (city, seg, geom, factor, barrier) {
    const value = { people: 0, protectedPeople: 0 };
    for (const [cell, strength] of cellsNear(city, seg, geom)) {
      const raw = strength * factor, pop = city.pop[cell];
      if (raw * (barrier ? BARRIER : 1) >= LIMIT) value.people += pop;
      if (raw * BARRIER >= LIMIT) value.protectedPeople += pop;
    }
    return value;
  };
})(window.CM);
