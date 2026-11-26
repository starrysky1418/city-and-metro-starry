'use strict';
(function (CM) {
  const names = { housing: '居住', jobs: '就业', mixed: '混合' };
  const stages = [0.25, 0.35, 0.40];
  const maxSide = 12, maxArea = 96, observation = 12, occupancy = 0.6;
  const walkLimit = 800, tripLimit = 45, loadLimit = 0.85;
  const amount = n => Math.floor(n + 0.001).toLocaleString('zh-CN');

  function enabled(g) {
    return !!(g && !g.tutorial && !g.preview && g.econ && g.city);
  }

  function parcel(city, bounds, legacy = false) {
    if (!Array.isArray(bounds) || bounds.length !== 4 || !bounds.every(Number.isInteger)) return [];
    const [x0, y0, x1, y1] = bounds;
    if (x0 < 0 || x1 >= city.W || y0 < 0 || y1 >= city.H ||
        x1 <= x0 || y1 <= y0 || x1 - x0 >= (legacy ? 20 : maxSide) || y1 - y0 >= (legacy ? 20 : maxSide) ||
        (!legacy && (x1 - x0 + 1) * (y1 - y0 + 1) > maxArea)) return [];
    const cells = [];
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const c = y * city.W + x;
        const region = city.region[c], zone = city.regions[region];
        if (!city.regionOpen[region] || zone.backgroundGrowth != null) continue;
        if (city.landFrac[c] >= 0.5 && city.taken[c] < 0.5 && !city.cellLocked(c) &&
            !zone.scenic && !zone.mapBackground && !city.isPark[c] &&
            ![5, 6, 7, 8, 9, 10].includes(city.lu[c]) &&
            ![5, 6, 7, 8, 9, 10].includes(city.plan[c])) cells.push(c);
      }
    }
    return cells.length >= 4 ? cells : [];
  }

  function targets(size, phase, type, renewal = false) {
    const area = size * stages[phase] * (renewal ? 0.7 : 1);
    return {
      pop: type === 'jobs' ? 0 : Math.ceil(area * (type === 'mixed' ? 240 : 420)),
      jobs: type === 'housing' ? 0 : Math.ceil(area * (type === 'mixed' ? 170 : 320))
    };
  }

  // Use the weekday peak network. Keep boarding, riding and walking transfers separate
  // so that a waiting penalty applies once per train boarded.
  function network(model) {
    const net = model.net, peak = model.resultsFor('wd').per[0];
    const graph = net.C.stations.map(() => []);
    const reverse = net.C.stations.map(() => []);
    const edge = (a, b, time, load = 0, ride = false) => {
      graph[a].push({ b, time, load, ride });
      reverse[b].push({ b: a, time, load, ride });
    };
    for (const { a, b, m } of net.acc.transfers) {
      edge(a, b, m / 75);
      edge(b, a, m / 75);
    }
    net.C.routes.forEach((route, r) => {
      const cap = model.capOf(r, net);
      const stops = route.stIdx;
      for (let d = 0; d < 2; d++) {
        const freq = peak.freqDir?.[2 * r + d] ?? peak.freq[r];
        if (!(freq > 0 && cap > 0)) continue;
        const start = graph.length;
        for (const station of stops) {
          const platform = graph.length;
          graph.push([]);
          reverse.push([]);
          edge(station, platform, 30 / freq);
          edge(platform, station, 0);
        }
        route.legSec.forEach((seconds, k) => {
          const a = start + k, b = start + ((k + 1) % stops.length);
          const load = (peak.load[net.rideEdge[r][2 * k + d]] || 0) / (freq * cap);
          edge(d ? b : a, d ? a : b, seconds / 60 + 0.5, load, true);
        });
      }
    });
    return { graph, reverse };
  }

  function reach(graph, source, limit) {
    const n = graph.length;
    const dist = new Float64Array(2 * n).fill(Infinity);
    const heap = new CM.U.Heap(64);
    dist[source] = 0;
    heap.push(0, source);
    while (heap.n) {
      const a = heap.pop(), current = heap.lastKey;
      if (current !== dist[a]) continue;
      for (const { b, time, load, ride } of graph[a % n]) {
        const target = a >= n || ride ? b + n : b;
        const next = current + time;
        if (load > limit || next >= dist[target] || next > tripLimit) continue;
        dist[target] = next;
        heap.push(next, target);
      }
    }
    return dist.subarray(n);
  }

  function service(g, cells, type, phase) {
    const model = g.model, net = model?.net;
    const result = { cells: [], covered: 0, linked: 0, room: 0, status: '等待交通数据' };
    if (!cells.length) return { ...result, status: '地块暂无可用土地' };
    if (!net?.acc || !model.trafficReady()) return result;
    const city = g.city, acc = net.acc;
    const outside = new Map(), stationCells = new Map();
    for (const c of cells) {
      const z = city.zoneOf(c);
      const inside = outside.get(z) || { pop: 0, jobs: 0 };
      inside.pop += city.pop[c];
      inside.jobs += city.jobs[c];
      outside.set(z, inside);
      const s = acc.cellStation[c];
      if (s < 0 || acc.cellWalk[c] > walkLimit) continue;
      if (!stationCells.has(s)) stationCells.set(s, []);
      stationCells.get(s).push(c);
      result.covered++;
    }
    if (result.covered * 2 < cells.length) return { ...result, status: '至少一半地块需在车站步行 800 米内' };

    const { graph, reverse } = network(model);
    const connects = (adj, s, limit, kind, totals) => {
      const dist = reach(adj, s, limit);
      let connected = 0;
      for (let z = 0; z < totals.length; z++) {
        const links = acc.zl[z];
        if (!links) continue;
        const reachable = links.reduce((share, link) =>
          share + (link.s !== s && dist[link.s] + link.w + 6 <= tripLimit ? link.share : 0), 0);
        connected += Math.max(0, totals[z] - (outside.get(z)?.[kind] || 0)) * Math.min(reachable, acc.zCov[z]);
        }
      return connected;
    };
    const served = (s, limit) => {
      const jobs = type === 'jobs' ? Infinity : connects(graph, s, limit, 'jobs', model.zJobs);
      const workers = type === 'housing' ? Infinity : connects(reverse, s, limit, 'pop', model.zPop);
      return { linked: jobs >= 8000 && workers >= 8000, workers };
    };
    for (const [station, nearby] of stationCells) {
      const connection = served(station, Infinity);
      if (!connection.linked) continue;
      result.linked += nearby.length;
      const spare = phase > 0 ? served(station, loadLimit) : connection;
      if (!spare.linked) continue;
      if (Number.isFinite(spare.workers)) result.workers = (result.workers || 0) + spare.workers * nearby.length;
      result.room += nearby.length;
      result.cells.push(...nearby);
    }
    if (result.linked * 2 < cells.length) result.status = '需要接入 45 分钟内有足够居民或岗位的片区';
    else if (result.room * 2 < cells.length) result.status = '可达线路的高峰运力不足，后续开发暂停';
    else result.status = '分期投资条件已满足';
    if (result.room * 2 < cells.length) result.cells = [];
    result.workers = (result.workers || 0) / Math.max(1, result.room);
    return result;
  }

  function restore(saved, city) {
    if (!saved || !Object.hasOwn(names, saved.type) || !Number.isInteger(saved.phase) ||
        saved.phase < 0 || saved.phase > stages.length || !Array.isArray(saved.bounds) ||
        saved.bounds.length !== 4 || !saved.bounds.every(Number.isInteger)) return null;
    const [x0, y0, x1, y1] = saved.bounds;
    if (x0 < 0 || y0 < 0 || x1 >= city.W || y1 >= city.H || x1 <= x0 || y1 <= y0 ||
        x1 - x0 >= 20 || y1 - y0 >= 20 || !Number.isInteger(saved.size) ||
        saved.size < 4 || saved.size > (x1 - x0 + 1) * (y1 - y0 + 1)) return null;
    const renewal = saved.renewal === true;
    const cap = saved.phase < stages.length ? targets(saved.size, saved.phase, saved.type, renewal) : { pop: 0, jobs: 0 };
    const clamp = (n, max) => Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0;
    return {
      bounds: saved.bounds.slice(), size: saved.size, phase: saved.phase, type: saved.type, renewal,
      opened: Number.isInteger(saved.opened) ? saved.opened : null,
      carryPop: clamp(saved.carryPop, saved.size * 421), carryJobs: clamp(saved.carryJobs, saved.size * 321),
      netJobs: clamp(saved.netJobs, saved.size * 321), movedJobs: clamp(saved.movedJobs, saved.size * 321),
      source: typeof saved.source === 'string' ? saved.source.slice(0, 80) : null,
      rate: clamp(saved.rate, saved.size * 100),
      propertyId: Number.isInteger(saved.propertyId) && saved.propertyId > 0 ? saved.propertyId : undefined,
      next: Object.hasOwn(names, saved.next) ? saved.next : saved.type,
      pop: clamp(saved.pop, cap.pop), jobs: clamp(saved.jobs, cap.jobs),
      totalPop: clamp(saved.totalPop, saved.size * 421),
      totalJobs: clamp(saved.totalJobs, saved.size * 321),
      held: saved.held === true, stopped: saved.stopped === true
    };
  }

  function phaseTarget(p) {
    return targets(p.size, p.phase, p.type, p.renewal);
  }

  function demandType(pop, jobs) {
    return pop > 0.001 && jobs > 0.001 ? 'mixed' : jobs > 0.001 ? 'jobs' : 'housing';
  }

  function advance(g, paid = false) {
    const p = g.development, target = phaseTarget(p);
    p.carryPop = Math.max(0, (p.carryPop || 0) + target.pop - p.pop);
    p.carryJobs = Math.max(0, (p.carryJobs || 0) + target.jobs - p.jobs);
    p.phase++;
    p.type = p.next;
    p.pop = p.jobs = 0;
    p.opened = p.phase < stages.length ? g.ym() : null;
    const title = p.phase === stages.length ? '城市发展项目完成' : '城市发展第 ' + (p.phase + 1) + ' 期启动';
    g.logEvent({ tag: '模拟', title, desc: paid ? '由玩家出资提前启动。' : '已满足本期入驻与运营条件。' });
    g.emit('toast', { kind: 'good', text: title });
  }

  function monthPlan(g) {
    const p = g.development;
    if (!p || p.stopped || p.held || p.phase === stages.length) return null;
    const land = parcel(g.city, p.bounds, true), target = phaseTarget(p);
    const pop = target.pop - p.pop + (p.carryPop || 0), jobs = target.jobs - p.jobs + (p.carryJobs || 0);
    const type = pop > 0.001 || jobs > 0.001 ? demandType(pop, jobs) : p.type;
    const report = service(g, land, type, p.phase);
    if (!report.cells.length) return null;
    return { cells: report.cells, bounds: p.bounds, pop, jobs, workers: report.workers,
      type, renewal: p.renewal, share: p.phase === 0 ? 0.22 : 0.15 };
  }

  function record(g, plan) {
    if (!plan) return;
    const p = g.development, target = phaseTarget(p);
    if (p.opened == null) p.opened = g.ym();
    const ap = plan.addedPop || 0, aj = plan.addedJobs || 0;
    const fillPop = Math.min(p.carryPop || 0, ap), fillJobs = Math.min(p.carryJobs || 0, aj);
    p.carryPop = (p.carryPop || 0) - fillPop;
    p.carryJobs = (p.carryJobs || 0) - fillJobs;
    p.totalPop += ap;
    p.totalJobs += aj;
    p.pop += ap - fillPop;
    p.jobs += aj - fillJobs;
    p.netJobs = (p.netJobs || 0) + (plan.netJobs || 0);
    p.movedJobs = (p.movedJobs || 0) + (plan.movedJobs || 0);
    if (plan.source) p.source = plan.source;
    p.rate = (p.rate || 0) * 0.8 + (ap + aj) * 0.2;
    const final = p.phase === stages.length - 1;
    const threshold = final ? 1 : occupancy;
    if (p.pop + 0.001 < threshold * target.pop || p.jobs + 0.001 < threshold * target.jobs) return;
    if (final ? (p.carryPop + p.carryJobs > 0.002) : (g.ym() - p.opened + 1 < observation)) return;
    if (!final) {
      const upcoming = targets(p.size, p.phase + 1, p.next, p.renewal);
      const nextType = demandType(upcoming.pop + p.carryPop + target.pop - p.pop,
        upcoming.jobs + p.carryJobs + target.jobs - p.jobs);
      if (!service(g, parcel(g.city, p.bounds, true), nextType, p.phase + 1).cells.length) return;
    }
    advance(g);
  }

  function panel(ui, g) {
    const h = CM.U.h;
    const button = (name, onclick, primary = false) => h('button', { class: 'btn sm ' + (primary ? 'primary' : 'ghost'), onclick }, name);
    const refresh = () => ui.rerenderPage();
    const save = () => { g.touch(); ui.markUnsaved(); ui.scheduleAutosave(); refresh(); };
    const draft = ui.developmentDraft?.game === g ? ui.developmentDraft : null;
    const p = g.development;
    const active = p && !p.stopped && p.phase < stages.length;
    const picking = ui.tools.developmentPick?.game === g;
    const card = h('div', { class: 'tk-card' });
    const line = (s, tag = 'div') => card.appendChild(h(tag, null, s));
    const locate = b => {
      ui.R.developmentArea = { game: g, bounds: b };
      ui.locatePoint((b[0] + b[2] + 1) / 2, (b[1] + b[3] + 1) / 2,
        '城市发展地块', Math.max(b[2] - b[0] + 1, b[3] - b[1] + 1) / 2);
    };
    const row = (...items) => card.appendChild(h('div', { class: 'row' }, ...items));
    const options = (value, update) => Object.keys(names).map(type =>
      button(names[type], () => update(type), type === value));

    if (p) {
      line(p.renewal ? '片区更新' : '新区开发', 'strong');
      line('累计引入 ' + amount(p.totalPop) + ' 名居民 · ' + amount(p.totalJobs) + ' 个岗位');
      line('岗位来源 · 全市净增 ' + amount(p.netJobs || 0) + ' · 跨区搬迁 ' + amount(p.movedJobs || 0) + ' · 全市常规增量 ' + amount(Math.max(0, p.totalJobs - (p.netJobs || 0) - (p.movedJobs || 0))));
      if (p.source) line('最近主要搬迁来源 · ' + p.source);
      row(button('定位项目', () => locate(p.bounds)),
        button('站城开发', () => ui.openPage('development', 'property', { replaceTop: true })));
      if (!active) line(p.stopped ? '项目已停止，已引入的居民和岗位保留。' : '三期开发已完成。');
      else {
        const t = phaseTarget(p), cells = parcel(g.city, p.bounds, true);
        const openPop = t.pop - p.pop + (p.carryPop || 0), openJobs = t.jobs - p.jobs + (p.carryJobs || 0);
        const report = service(g, cells, openPop > 0.001 || openJobs > 0.001 ? demandType(openPop, openJobs) : p.type, p.phase);
        line('第 ' + (p.phase + 1) + ' / 3 期 · ' + names[p.type], 'strong');
        line('居民 ' + amount(p.pop) + ' / ' + amount(t.pop) + ' · 岗位 ' + amount(p.jobs) + ' / ' + amount(t.jobs));
        line(p.held ? '已暂停投资。' : report.status);
        line('步行覆盖 ' + report.covered + ' / ' + cells.length + ' 格 · 有效连接 ' + report.linked + ' 格' +
          (p.phase ? ' · 高峰有余量 ' + report.room + ' 格' : ''));
        const months = p.opened == null ? 0 : Math.max(0, g.ym() - p.opened + 1);
        const left = openPop + openJobs;
        if (p.carryPop || p.carryJobs) line('往期尚有 ' + amount(p.carryPop || 0) + ' 名居民与 ' + amount(p.carryJobs || 0) + ' 个岗位的容量。');
        if (!p.held && report.cells.length && months >= 6 && left > 1) line(p.rate > 1 ? '按近期速度，填满已开放容量约需 ' + Math.ceil(left / p.rate) + ' 个月。' : '近期入驻很少，已开放容量可能长期空置。');
        if (p.phase > 0 && report.linked * 2 >= cells.length && report.room < report.linked) line('可增加班次、换用更大编组，或增加分流线路。');
        if (p.phase < stages.length - 1) {
          line('下一期发展方向');
          row(...options(p.next, type => { p.next = type; save(); }));
          line('政府启动下一期要求观察满 12 个月、当期各项入驻达 60%，且下一期所需的地铁服务有运力余量。当前观察 ' + Math.min(months, observation) + ' / 12 个月。');
          if (p.opened != null && !p.held) {
            const cost = Math.ceil(p.size * stages[p.phase + 1] * (p.renewal ? 1100 : 800));
            const free = g.econ.isFree();
            row(button('提前建设下一期' + (free ? '' : ' · ' + CM.U.fmtMoney(cost)), () => {
              if (g.jumping || !free && g.econ.funds < cost) { ui.toast('可用建设资金不足或正在推进时间。', 'info'); return; }
              if (!window.confirm('提前开放下一期容量？后续入驻仍取决于实际需求。')) return;
              if (!free) g.econ.payFromFunds('construction', cost, '城市发展提前建设', g.clock);
              advance(g, true); save();
            }));
          }
        }
        row(button(p.held ? '恢复投资' : '暂缓投资', () => { p.held = !p.held; save(); }),
          button('结束项目', () => {
            if (!window.confirm('结束后停止后续专项投资，已引入的人口及岗位保留。确定结束？')) return;
            p.stopped = true; save();
          }));
        return card;
      }
    }
    line('圈选已开放的用地，可开发新区，也可更新西塱这类既有片区。项目只记录新增入驻，已有居民和岗位会保留。');
    if (picking) {
      row(button('取消选地', () => {
        ui.tools.developmentPick = null;
        ui.R.developmentArea = null;
        refresh();
      }));
      return card;
    }
    row(button(draft ? '重新选地' : '在地图上选地', () => {
      ui.developmentDraft = null;
      ui.R.developmentArea = null;
      ui.closePanel();
      ui.tools.setTool('select');
      ui.tools.developmentPick = { game: g, first: null };
      ui.toast('点击地块的第一个角，按 Esc 取消', 'info');
    }, !draft));
    if (!draft) return card;
    const cells = parcel(g.city, draft.bounds);
    if (!cells.length) {
      line('选区每边最多 12 格，总计最多 96 格，至少要有 4 格可用。当前地图面积上限约 ' + (maxArea * (CM.CFG.CELL_M / 1000) ** 2).toFixed(1) + ' 平方公里。');
      return card;
    }
    line('可开发用地 ' + cells.length + ' 格');
    row(button('定位选区', () => locate(draft.bounds)));
    row(...options(draft.type, type => { draft.type = type; refresh(); }));
    const existing = cells.reduce((sum, c) => { sum.pop += g.city.pop[c]; sum.jobs += g.city.jobs[c]; return sum; }, { pop: 0, jobs: 0 });
    const occupied = cells.some(c => g.city.lu[c] !== 0 && g.city.pop[c] + g.city.jobs[c] >= 160);
    const renewal = draft.renewal ?? occupied;
    row(button('新区开发', () => { draft.renewal = false; refresh(); }, !renewal),
      button('片区更新', () => { draft.renewal = true; refresh(); }, renewal));
    if (renewal) line('现有居民 ' + amount(existing.pop) + ' 名 · 岗位 ' + amount(existing.jobs) + ' 个。更新计划统计新增量。');
    const t = targets(cells.length, 0, draft.type, renewal);
    line('第一期计划新增居民 ' + amount(t.pop) + '、岗位 ' + amount(t.jobs) + '。');
    line('可先签承诺，通车达标后开始投资。后续两期可继续沿用原有线网，并调整发展方向。');
    line('一期要求半数用地距车站步行 800 米以内，并在约 45 分钟内连到已有城区。居住区需连到至少 8,000 个岗位，就业区需连到至少 8,000 名居民，混合区需同时满足。后两期还要求可达线路高峰载客率不超过 85%。');
    line(service(g, cells, draft.type, 0).status);
    row(button('签署发展承诺', () => {
      g.development = { bounds: draft.bounds.slice(), size: cells.length, phase: 0, type: draft.type, renewal,
        next: draft.type, pop: 0, jobs: 0, totalPop: 0, totalJobs: 0, held: false, stopped: false };
      ui.developmentDraft = null;
      g.logEvent({ tag: '模拟', title: '签署城市发展承诺', desc: '发展方向：' + names[draft.type] + '。' });
      save();
    }, true));
    return card;
  }


  const contractMonths = 240, parcelMax = 16;
  const propertyFmt = n => CM.U.fmtMoney(n);
  const fraction = n => Math.max(0, Math.min(1, n));
  const propertyRate = n => (n * 100).toFixed(0) + '%';

  function stationMarket(g, id) {
    const model = g.model, network = model?.net?.C;
    const i = network?.sIndex.get(id);
    if (i == null || !network.serviced?.[i]) return null;
    const d = model.stDailyWk;
    const flow = (d?.inn[i] || 0) + (d?.out[i] || 0) + (d?.xfer[i] || 0) * 0.4;
    return { flow, access: flow / (flow + 18000) };
  }

  function propertyOffer(g, p, cells, report) {
    if (p.propertyId || p.held || p.stopped || !report.cells.length || g.model.dailyStale) return null;
    const network = g.model.net.C, access = g.model.net.acc;
    const candidates = new Map();
    for (const c of report.cells) {
      const i = access.cellStation[c];
      if (i >= 0) candidates.set(i, (candidates.get(i) || 0) + 1);
    }
    const [x0, y0, x1, y1] = p.bounds;
    let anchor = null;
    for (const [i, count] of candidates) {
      const s = network.stations[i], market = stationMarket(g, s.id);
      if (!market || s.x < x0 - 2 || s.x > x1 + 3 || s.y < y0 - 2 || s.y > y1 + 3) continue;
      if ((g.propertyContracts || []).some(q => q.station === s.id || Math.hypot(q.x - s.x, q.y - s.y) < 4)) continue;
      if (!anchor || count > anchor.count) anchor = { s, count, market };
    }
    if (!anchor) return null;
    const units = Math.min(parcelMax, anchor.count, Math.max(2, Math.ceil(cells.length / 3)));
    const target = phaseTarget(p);
    const price = g.econ.costIndex(g.clock.y);
    const housing = p.type === 'housing' ? 1 : p.type === 'mixed' ? 0.55 : 0;
    const relief = p.renewal ? 0.08 : 0.15, share = 0.3;
    const base = CM.CFG.cost.station.underground.M * price * (0.014 + units * 0.003) * (p.renewal ? 1.22 : 1);
    const stake = Math.ceil(base * (1 - 0.25 * relief));
    const workers = Number.isFinite(report.workers) ? report.workers : 0;
    const demand = fraction(workers / Math.max(20000, target.jobs * 7));
    return {
      station: anchor.s.id, name: anchor.s.name, x: anchor.s.x, y: anchor.s.y, units,
      stake, delay: p.renewal ? 12 : 18, housing, share, relief,
      // Building and land are funded by the partner. These are the company's
      // proceeds after its agreed share, with management charged separately.
      salesCap: base * 4.5 * share * housing,
      rentCap: base * share * (0.0083 + 0.05 * (1 - housing)),
      upkeep: stake * (p.renewal ? 0.0022 : 0.0018),
      needPop: Math.max(1, target.pop), needJobs: Math.max(1, target.jobs),
      basePop: p.totalPop, baseJobs: p.totalJobs,
      demand, footfall: anchor.market.access
    };
  }

  function propertyCash(q, sold, pop, jobs, footfall, cycle) {
    const newSold = Math.max(sold, fraction(pop));
    const sale = (newSold - sold) * q.salesCap;
    const commercial = fraction(pop * q.housing + jobs * (1 - q.housing));
    const occupancy = fraction((0.82 * commercial + 0.18 * footfall) * cycle);
    const rent = q.rentCap * occupancy;
    return { sale, rent, upkeep: q.upkeep, sold: newSold, occupancy };
  }

  function propertyForecast(q, stress) {
    const residential = (0.52 + 0.43 * q.footfall) * stress;
    const commercial = (0.22 + 0.67 * q.demand + 0.11 * q.footfall) * stress;
    let net = 0, sold = 0, payback = null, ten = 0;
    for (let month = q.delay; month <= contractMonths; month++) {
      const ramp = 1 - Math.exp(-(month - q.delay + 1) / 24);
      const cash = propertyCash(q, sold, residential * ramp, commercial * ramp, q.footfall, 1);
      sold = cash.sold;
      net += cash.sale + cash.rent - cash.upkeep;
      if (month <= 120) ten = net;
      if (payback == null && net >= q.stake) payback = month;
    }
    return { net: ten, roi: (ten - q.stake) / q.stake, payback };
  }

  function restoreContracts(saved, city) {
    if (!Array.isArray(saved)) return [];
    const ids = new Set();
    return saved.filter(q => {
      if (!q || !Number.isInteger(q.id) || q.id < 1 || ids.has(q.id) ||
          typeof q.station !== 'string' || !Number.isInteger(q.signed) ||
          !Number.isInteger(q.last) || q.last < q.signed || q.last > q.signed + contractMonths ||
          typeof q.name !== 'string' || !Number.isFinite(q.x) || !Number.isFinite(q.y) ||
          q.x < 0 || q.x >= city.W || q.y < 0 || q.y >= city.H ||
          !(q.stake > 0) || !(q.needPop >= 1) || !(q.needJobs >= 1) ||
          ![12, 18].includes(q.delay) || !Number.isInteger(q.units) || q.units < 1 || q.units > parcelMax ||
          !['stake', 'needPop', 'needJobs', 'salesCap', 'rentCap', 'upkeep', 'basePop', 'baseJobs', 'sale', 'rent', 'maintenance',
            'housing', 'share', 'relief', 'sold', 'pop', 'jobs', 'occupancy'].every(k => Number.isFinite(q[k]) && q[k] >= 0) ||
          q.housing > 1 || q.share > 1 || q.relief > 1 ||
          ['sold', 'pop', 'jobs', 'occupancy'].some(k => q[k] > 1)) return false;
      ids.add(q.id);
      return true;
    });
  }

  function signProperty(g, p) {
    if (p !== g.development || g.jumping || p.phase >= stages.length) return false;
    const cells = parcel(g.city, p.bounds, true);
    const offer = propertyOffer(g, p, cells, service(g, cells, p.type, p.phase));
    if (!offer || !g.econ.canAfford(offer.stake)) return false;
    const contracts = g.propertyContracts || (g.propertyContracts = []);
    const signed = g.ym(), id = contracts.reduce((max, q) => Math.max(max, q.id), 0) + 1;
    g.econ.spend('propertyInvest', offer.stake);
    if (!g.econ.isFree()) g.econ.log('property', -offer.stake, 'gen', '站城开发出资 · ' + offer.name, g.clock);
    contracts.push({ ...offer, id, signed, last: signed, sold: 0, pop: 0, jobs: 0, occupancy: 0, sale: 0, rent: 0, maintenance: 0 });
    p.propertyId = id;
    g.logEvent({ tag: '模拟', title: '签署站城开发合同 · ' + offer.name, desc: '公司出资 ' + propertyFmt(offer.stake) + '，分享住宅销售和实际租赁收益。' });
    return true;
  }

  function settleProperty(g) {
    const now = g.ym();
    for (const q of g.propertyContracts || []) {
      if (q.last >= now || now > q.signed + contractMonths) continue;
      q.last = now;
      const p = g.development;
      if (p?.propertyId === q.id) {
        q.pop = fraction((p.totalPop - q.basePop) / q.needPop);
        q.jobs = fraction((p.totalJobs - q.baseJobs) / q.needJobs);
      }
      if (now - q.signed < q.delay) continue;
      const market = stationMarket(g, q.station);
      const cycle = CM.TOD.cycle(g, 3);
      const cash = propertyCash(q, q.sold, q.pop, q.jobs, market?.access || 0, cycle);
      q.sold = cash.sold;
      q.occupancy = cash.occupancy;
      q.sale += cash.sale;
      q.rent += cash.rent;
      q.maintenance += cash.upkeep;
      if (cash.sale + cash.rent > 0) g.econ.income('propertyIncome', cash.sale + cash.rent);
      g.econ.spend('propertyCost', cash.upkeep);
    }
  }

  function propertyPanel(ui, g, redraw) {
    const h = CM.U.h, p = g.development;
    const el = h('div', { class: 'tk-page' });
    const line = (card, s, tag = 'div') => card.appendChild(h(tag, null, s));
    const card = h('div', { class: 'tk-card' });
    line(card, '站城开发合同', 'strong');
    line(card, '地铁公司用一般资金参与车站周边的一小块开发，开发商承担其余地价和楼宇建设，政府提供地价优惠。票款与原有车站商业仍单独记账。');
    const active = p && !p.stopped && p.phase < stages.length;
    const cells = active ? parcel(g.city, p.bounds, true) : [];
    const report = cells.length ? service(g, cells, p.type, p.phase) : null;
    const offer = report ? propertyOffer(g, p, cells, report) : null;
    if (offer) {
      const standard = propertyForecast(offer, 1), weak = propertyForecast(offer, 0.48);
      line(card, offer.name + ' · ' + (p.renewal ? '更新项目' : '新区项目') + ' · 物业规模 ' + offer.units + ' 格');
      line(card, '公司投入 ' + propertyFmt(offer.stake) + ' · 约 ' + offer.delay + ' 个月交付 · 合同期 20 年');
      line(card, '住宅销售与租赁分成 ' + propertyRate(offer.share) + ' · 地价优惠 ' + propertyRate(offer.relief));
      for (const [label, result] of [['基准', standard], ['入驻偏弱', weak]]) {
        line(card, label + ' · 十年预计净回款 ' + propertyFmt(result.net) + ' · 回报率 ' + propertyRate(result.roi) +
          ' · ' + (result.payback == null ? '合同期内未回本' : '约 ' + (result.payback / 12).toFixed(1) + ' 年回本'));
      }
      line(card, '估算按当前通勤范围和车站客流计算。住宅成交只结算一次，租金按实际入驻和客流逐月结算，净回款已扣维护。');
      const affordable = g.econ.canAfford(offer.stake);
      if (!affordable) line(card, '一般资金不足。地铁建设专项资金不用于物业投资。');
      card.appendChild(h('button', { class: 'btn sm primary', disabled: !affordable, onclick: () => {
        if (!window.confirm('确认投入 ' + propertyFmt(offer.stake) + '？物业回报随实际入驻浮动。')) return;
        if (!signProperty(g, p)) { ui.toast('合同条件或资金已经变化，请重新查看。', 'info'); redraw(); return; }
        g.touch();
        ui.markUnsaved();
        ui.scheduleAutosave();
        redraw();
      } }, '签署站城开发合同'));
    } else if (!active) line(card, '先在「发展项目」中签署片区发展承诺。');
    else if (p.propertyId) line(card, '当前片区已经有一份物业合同。');
    else if (p.held) line(card, '恢复片区投资后可申请物业合同。');
    else if (!report?.cells.length || g.model.dailyStale) line(card, '片区达到地铁服务条件、客流更新后可评估物业。');
    else line(card, '没有可绑定的运营车站，或相邻地块已有物业合同。');
    el.appendChild(card);
    for (const q of [...(g.propertyContracts || [])].reverse()) {
      const box = h('div', { class: 'tk-card' });
      const age = g.ym() - q.signed, net = q.sale + q.rent - q.maintenance;
      line(box, q.name + ' · ' + (age >= contractMonths ? '已到期' : age < q.delay ? '建设中 · 剩余 ' + (q.delay - age) + ' 个月' : '运营中'), 'strong');
      line(box, '实际投入 ' + propertyFmt(q.stake) + ' · 累计净回款 ' + propertyFmt(net) + ' · 累计回报率 ' + propertyRate((net - q.stake) / q.stake));
      line(box, '住宅销售分成 ' + propertyFmt(q.sale) + ' · 累计租金 ' + propertyFmt(q.rent) + ' · 维护支出 ' + propertyFmt(q.maintenance));
      if (age >= q.delay && age < contractMonths) line(box, '最近结算租赁利用率 ' + propertyRate(q.occupancy));
      box.appendChild(h('button', { class: 'btn sm ghost', onclick: () => ui.locatePoint(q.x, q.y, q.name, 2) }, '定位车站'));
      el.appendChild(box);
    }
    return el;
  }

  CM.Development = { enabled, parcel, panel, propertyPanel, restore, restoreContracts, monthPlan, record, settleProperty };
})(window.CM);
