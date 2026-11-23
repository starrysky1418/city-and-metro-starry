'use strict';
// OpenStreetMap geography © contributors, ODbL 1.0. Scenario population, demand and finance are gameplay estimates.
(function (CM) {
  const geo = CM.GEOS.xa;
  const year = 2006;
  const { lon0, lat0, kx, ky } = geo.proj;
  const point = (lon, lat) => [(lon - lon0) * kx, (lat0 - lat) * ky];
  const box = ([w, s, e, n]) => [[w, n], [e, n], [e, s], [w, s]].map(([lon, lat]) => point(lon, lat));
  // Key interchange pins use actual station locations in the OSM snapshot.
  const interchangePins = {"咸阳西站":[24.913,82.005],"沣河森林公园":[57.909,88.012],"奥体中心":[155.992,64.497],"纺织城":[173.784,106.35],"机场T5":[69.521,28.559]};
  const sites = [
    ["钟楼",108.947,34.259,48,94,"cbd",2006,0.058],
    ["北大街",108.947,34.273,62,63],
    ["永宁门",108.947,34.248,58,52,"scenic",2006,0.023],
    ["小寨",108.945,34.222,62,83,"shop",2006,0.044],
    ["西安站",108.962,34.281,35,60,"rail",2006,[[2006,9],[2025,8]]],
    ["西安北站",108.938,34.377,39,67,"rail",2011,[[2011,5],[2025,17]]],
    ["行政中心",108.943,34.343,67,51],
    ["大明宫",108.967,34.3,40,37,"scenic",2010,0.026],
    ["大雁塔",108.965,34.219,35,43,"scenic",2006,0.033],
    ["曲江新区",109.013,34.191,66,46],
    ["高新区",108.879,34.2,54,94],
    ["三桥",108.833,34.29,61,38],
    ["沣河森林公园",108.759,34.298,28,21],
    ["咸阳西站",108.668,34.32,36,49,"rail",2021,[[2021,1.5],[2035,4]]],
    ["咸阳人民广场",108.708,34.33,70,67],
    ["咸阳湖",108.728,34.322,28,24,"scenic",2006,0.017],
    ["咸阳机场",108.756,34.439,11,59,"air",2006,[[2006,2],[2019,10],[2040,17]]],
    ["机场T5",108.775,34.451,4,30,"air",[2025,2],[[2025,4],[2040,8]]],
    ["韦曲南",108.954,34.145,71,36],
    ["纺织城",109.098,34.273,57,40],
    ["浐灞",109.041,34.328,38,40],
    ["奥体中心",109.052,34.371,17,28,"venue",2021,0.027],
    ["临潼",109.174,34.37,41,28],
    ["西安电子科技大学南校区",108.838,34.124,38,21,"uni",2006,0.026],
  ].map(([name, lon, lat, pop, jobs, kind, open, demand, close]) => {
    const [x, y] = interchangePins[name] || point(lon, lat);
    return { name, x, y, pop, jobs, kind, open, demand, close };
  });
  const byName = new Map(sites.map(site => [site.name, site]));
  const anchor = name => {
    const { x, y } = byName.get(name);
    return { name, x, y, r: 3.2 };
  };
  const regions = [
    ["walled","西安城墙内","oldmix",520,2006,[108.914,34.25,108.974,34.281]],
    ["north","未央与经开","mix",900,2006,[108.88,34.281,109,34.38]],
    ["west","莲湖西部与三桥","mix",810,2006,[108.79,34.22,108.914,34.32]],
    ["south","雁塔与高新区","cbd",1490,2006,[108.82,34.14,109.015,34.25]],
    ["east","新城与灞桥","mix",970,2006,[108.975,34.22,109.18,34.33]],
    ["xianyang","咸阳主城","mix",780,2011,[108.59,34.28,108.79,34.39]],
    ["fengdong","西咸新区与沣东","newtown",500,2012,[108.65,34.16,108.82,34.28]],
    ["airport","空港新城与咸阳机场","ind",235,2006,[108.68,34.39,108.865,34.48]],
    ["chanba","浐灞与国际港务区","newtown",460,2012,[109,34.325,109.13,34.45]],
    ["changan","长安与韦曲","res",700,2009,[108.795,34.075,109.025,34.16]],
    ["qinling","秦岭北麓","res",0,null,[108.59,34.068,108.86,34.115],380],
  ].map(([id, name, plan, pop, open, bounds, relief]) => ({
    id, name, plan, pop: pop * 1000, open, poly: box(bounds), scenic: open === null, relief, ...(id === 'walled' && { heritage: true }),
  }));
  const hubs = sites.filter(s => s.kind);
  const terminal = open => Array.isArray(open) ? open[0] + (open[1] - 1) / 12 : open;
  // Approximate runway endpoints, joined across tile boundaries and staged by scenario year.
  const runways = [
    { a: [53.29, 34.55], b: [64.17, 24.98], from: year, airfieldWidth: 0.7 },
    { a: [58.95, 43.97], b: [70.33, 33.96], from: 2012, airfieldWidth: 0.7 },
    { a: [54.87, 36.37], b: [65.90, 26.69], from: terminal([2025, 2]), airfieldWidth: 0.7 },
  ];
  const events = [
    [2011,9,"西安进入地铁时代","现实中的2号线开始载客，形成穿越古城的南北骨干。","https://www.sse.com.cn/disclosure/bond/announcement/corporate/c/new/2025-05-29/184359_20250529_EFQ2.pdf"],
    [2019,9,"机场城际开通","现实中的机场城际连接西安北站和咸阳机场。","https://www.camet.org.cn/sy/xydt/8120.shtml"],
    [2021,6,"14号线贯通运营","机场城际与港务区方向贯通。","https://www.camet.org.cn/sy/xydt/8120.shtml"],
    [2023,9,"西安、咸阳主城通地铁","现实中的1号线三期延伸至咸阳西站。","https://www.xa.gov.cn/xw/xayw/650c08f9f8fd1c1a703968c0.html"],
  ].map(([y, m, title, desc, src]) => ({ y, m, title, desc, src, tag: '史实' }));
  events.unshift({ y: year, m: 1, tag: '模拟', title: '西安开局', desc: '先建设一条服务主要居住区和就业区的地铁骨干。' });
  const histTasks = [
    [2006,2014,"古城南北骨干",["北大街","钟楼","永宁门","小寨"]],
    [2011,2019,"高铁北站接入",["西安北站","行政中心","北大街"]],
    [2012,2024,"东部居住走廊",["纺织城","西安站","北大街"]],
    [2017,2027,"空港快线",["西安北站","咸阳机场"]],
    [2019,2031,"西咸双城",["三桥","沣河森林公园","咸阳人民广场","咸阳西站"]],
    [2021,2032,"轨道接入奥体",["奥体中心","西安北站","浐灞"]],
  ].map(([open, end, title, names], i) => ({
    id: 'xa-' + (i + 1), appear: [open, 1], deadline: [end, 12], type: 'connect', title,
    desc: '用运营中的地铁连接' + names.join('、') + '。', anchors: names.map(anchor), reward: 40000 + i * 7500,
  }));
  const data = {
    city: "西安", riverName: "渭河", hsrYear: 2011,
    lineColorsNice: CM.DATA.lineColorsNice, plans: CM.DATA.plans,
    places: geo.places.filter(p => p[3] !== 4).concat(sites.map(({ name, x, y }) => [name, x, y, 2])),
    stationPlaces: geo.places.concat(sites.filter(s => !s.kind || s.kind !== "rail").map(({ name, x, y }) => [name, x, y, 2])),
    rural: { pop: 180, jobs: 75 },
    regions, defaultRegion: { id: 'outer', name: '外围镇区', plan: 'res', open: 2020, pop: 240000 },
    centers: sites.map(({ name, x, y, pop, jobs }) => ({ name, x, y, pop: pop * 1000, jobs: jobs * 1000, r: 5 })),
    landmarks: hubs.map(({ name, x, y, kind, open }, i) => ({
      id: 'xa-hub-' + i, name, x, y, year: terminal(open),
      kind: kind === 'air' ? 'airport' : kind, w: kind === 'air' ? 250 : 175, d: 90, h: 16,
    })),
    facilities: hubs.map(({ name, kind, open, demand, close }, i) => ({
      id: 'xa-hub-' + i, lm: 'xa-hub-' + i, n: name, t: kind, y0: Array.isArray(open) ? open : [open, 1], y1: close,
      ...(kind === 'air' || kind === 'rail' ? { pax: demand } : { w: demand }),
    })),
    runways, roadYears: {}, bridgeYears: {}, simRoads: [], events, histTasks,
    traits: [{ use: 'finance', flavor: 'cn' }],
    heritage: { regions: ['walled'], guards: [{ lm: 'xa-hub-0', r: 1.1, name: '钟楼' }] },
    stages: [[2011, '古城骨干'], [2019, '空港城际'], [2030, '西咸成网']],
    briefing: { lead: "沿古城南北轴起步，向西穿过西咸新区接入咸阳，向北连接机场和高铁。", modes: [['metro', '地铁', '从零铺设地铁线网。']] },
  };
  (CM.MAP_LIST = CM.MAP_LIST || []).push({
    id: 'xa', name: "西安", title: '西安 · 2006', sub: '社区地图 · 2006 年起 · 人民币',
    kind: 'real', region: '中国内地', mapVersion: 1, scenario: 'xa-2006', difficulty: 3,
    modes: ['challenge', 'free'], desc: data.briefing.lead, intro: data.briefing.lead,
    tagline: '从古城到西咸双城',
    tags: ['古城保护', '渭河', '西咸双城'],
    facts: [['范围', geo.w / 4 + ' km × ' + geo.h / 4 + ' km'], ['起始', year + ' 年'], ['人口', '约 550 万']],
    features: [['map', '西安与咸阳', '向西穿过西咸新区连接咸阳主城'], ['plane', '咸阳机场', '从北站接入空港，之后服务 T5 航站楼']],
    highlights: events.slice(1).map(({ y, title }) => [y, title]),
    geo, data,
    cam: { cx: point(108.95, 34.275)[0], cy: point(108.95, 34.275)[1], zoom: 15 },
    cfg: {
      W: geo.w, H: geo.h, START: { y: year, m: 1, d: 1, minute: 360 }, econBase: year,
      growth: { ...CM.CFG.growth, histEnd: 2030, popCurve: [[2006,5500000],[2020,9600000],[2040,12700000]], jobsRatio: [[year, 0.50], [2030, 0.56]] },
      economy: { ...CM.CFG.economy, startFunds: 1030000, grantBase: [[year, 48000], [2025, 74000], [2050, 108000]] },
    },
  });
})(window.CM);
