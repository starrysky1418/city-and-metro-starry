'use strict';
// OpenStreetMap geography © contributors, ODbL 1.0. Scenario population, demand and finance are gameplay estimates.
(function (CM) {
  const geo = CM.GEOS.qd;
  const year = 2010;
  const { lon0, lat0, kx, ky } = geo.proj;
  const point = (lon, lat) => [(lon - lon0) * kx, (lat0 - lat) * ky];
  const box = ([w, s, e, n]) => [[w, n], [e, n], [e, s], [w, s]].map(([lon, lat]) => point(lon, lat));
  // Key interchange pins use actual station locations in the OSM snapshot.
  const interchangePins = {"青岛站":[125.431,175.955],"五四广场":[149.119,175.57],"青岛北站":[147.902,128.992],"红岛站":[81.195,94.115],"井冈山路":[79.755,224.712]};
  const sites = [
    ["青岛站",120.312,36.064,28,67,"rail",2010,[[2010,5],[2025,8]]],
    ["中山公园",120.356,36.062,32,30,"scenic",2010,0.02],
    ["台东",120.354,36.084,60,65,"shop",2010,0.039],
    ["五四广场",120.383,36.064,40,95,"cbd",2010,0.059],
    ["浮山所",120.393,36.069,55,70],
    ["市北区",120.375,36.104,62,46],
    ["四方",120.355,36.119,63,28],
    ["李村",120.421,36.158,78,53],
    ["青岛北站",120.378,36.169,37,55,"rail",2014,[[2014,4],[2025,10]]],
    ["苗岭路",120.466,36.101,39,46],
    ["石老人",120.466,36.092,20,27,"scenic",2010,0.017],
    ["城阳",120.397,36.307,67,52],
    ["流亭机场",120.384,36.267,18,47,"air",2010,[[2010,3],[2019,7]],[2021,8]],
    ["红岛",120.257,36.244,24,27],
    ["红岛站",120.198,36.267,10,29,"rail",2023,[[2023,1],[2035,3]]],
    ["胶州",120.022,36.264,63,35],
    ["胶东机场",120.099,36.364,14,60,"air",[2021,8],[[2021,4],[2025,8],[2040,13]]],
    ["黄岛",120.211,36.026,56,60],
    ["井冈山路",120.174,35.956,62,56],
    ["唐岛湾",120.19,35.944,36,39],
    ["灵山湾",120.047,35.917,35,32],
    ["金沙滩",120.238,35.968,12,21,"scenic",2010,0.02],
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
    ["old","市南与老城","mix",660,2010,[120.29,36.00,120.39,36.093]],
    ["east","浮山湾与崂山城区","cbd",590,2010,[120.39,36.025,120.53,36.13]],
    ["central","市北与四方","mix",900,2010,[120.24,36.093,120.43,36.155]],
    ["licang","李沧与青岛北站","mix",590,2010,[120.28,36.155,120.48,36.225]],
    ["liuting","流亭机场","ind",60,2010,[120.355,36.245,120.39,36.286]],
    ["chengyang","城阳与流亭","mix",650,2013,[120.31,36.225,120.51,36.39]],
    ["hongdao","红岛与高新区","newtown",220,2015,[120.18,36.17,120.31,36.32]],
    ["huangdao","黄岛与唐岛湾","mix",620,2014,[120.07,35.91,120.33,36.105]],
    ["west","灵山湾与西海岸","newtown",400,2018,[119.96,35.91,120.2,36]],
    ["jiaozhou","胶州与临空新区","newtown",480,2018,[119.98,36.19,120.21,36.43]],
    ["laoshan","崂山山区","res",0,null,[120.52,36.08,120.66,36.3],400],
  ].map(([id, name, plan, pop, open, bounds, relief]) => ({
    id, name, plan, pop: pop * 1000, open, poly: box(bounds), scenic: open === null, relief, ...(id === 'walled' && { heritage: true }),
  }));
  const hubs = sites.filter(s => s.kind);
  const terminal = open => Array.isArray(open) ? open[0] + (open[1] - 1) / 12 : open;
  // Approximate runway endpoints, joined across tile boundaries and staged by scenario year.
  const runways = [
    { a: point(120.370, 36.280), b: point(120.380, 36.250), from: year, airfieldWidth: 0.7 },
    { a: [40.11, 39.51], b: [44.46, 53.24], from: terminal([2021, 8]), airfieldWidth: 0.7 },
    { a: [47.82, 34.95], b: [52.19, 48.70], from: terminal([2021, 8]), airfieldWidth: 0.7 },
  ];
  const events = [
    [2014,1,"青岛北站投用","北部铁路枢纽开始吸引到发客流。","https://www.qingdao.gov.cn/ywdt/tpxw/202512/t20251216_10407127.shtml"],
    [2015,12,"青岛进入地铁时代","现实中的3号线北段开通。","https://www.qingdao.gov.cn/ywdt/tpxw/202512/t20251216_10407127.shtml"],
    [2021,8,"民航转场胶东机场","流亭停止民航客运，机场接驳需求转往胶东。","https://www.qingdao.gov.cn/zwgk/xxgk/jtys/ywfl/ysgl/202107/t20210712_3171203.shtml"],
    [2021,12,"跨海地铁贯通","现实中的1号线将西海岸接入东岸线网。","https://www.qd-metro.com/informationInfo.php?id=5211"],
    [2026,9,"机场快线进入主城","现实中的8号线南段接入五四广场。","https://jtt.shandong.gov.cn/art/2026/9/22/art_12459_10334095.html"],
  ].map(([y, m, title, desc, src]) => ({ y, m, title, desc, src, tag: '史实' }));
  events.unshift({ y: year, m: 1, tag: '模拟', title: '青岛开局', desc: '先建设一条服务主要居住区和就业区的地铁骨干。' });
  const histTasks = [
    [2010,2017,"主城第一条骨干",["青岛站","中山公园","五四广场"]],
    [2014,2020,"接入北站",["青岛北站","李村","台东"]],
    [2016,2026,"青黄跨海",["青岛站","井冈山路"]],
    [2019,2030,"北岸机场走廊",["青岛北站","红岛","胶东机场"]],
    [2021,2035,"西海岸串联",["黄岛","井冈山路","灵山湾"]],
  ].map(([open, end, title, names], i) => ({
    id: 'qd-' + (i + 1), appear: [open, 1], deadline: [end, 12], type: 'connect', title,
    desc: '用运营中的地铁连接' + names.join('、') + '。', anchors: names.map(anchor), reward: 40000 + i * 7500,
  }));
  histTasks.push({
    id: 'qd-airport-relocation', appear: [2021, 8], deadline: [2028, 12], type: 'connect',
    title: '机场转场：从市中心接入胶东',
    desc: '民航客流已由流亭转往胶东。用运营中的地铁连接五四广场、青岛北站与胶东机场，换乘也可达成。',
    anchors: ['五四广场', '青岛北站', '胶东机场'].map(anchor), reward: 70000,
  });
  const data = {
    city: "青岛", riverName: "胶州湾", seaName: '黄海', hsrYear: 2014,
    lineColorsNice: CM.DATA.lineColorsNice, plans: CM.DATA.plans,
    places: geo.places.filter(p => p[3] !== 4).concat(sites.map(({ name, x, y }) => [name, x, y, 2])),
    stationPlaces: geo.places.concat(sites.filter(s => !s.kind || s.kind !== "rail").map(({ name, x, y }) => [name, x, y, 2])),
    rural: { pop: 180, jobs: 75 },
    regions, defaultRegion: { id: 'outer', name: '外围镇区', plan: 'res', open: 2022, pop: 240000 },
    centers: sites.map(({ name, x, y, pop, jobs }) => ({ name, x, y, pop: pop * 1000, jobs: jobs * 1000, r: 5 })),
    landmarks: hubs.map(({ name, x, y, kind, open }, i) => ({
      id: 'qd-hub-' + i, name, x, y, year: terminal(open),
      kind: kind === 'air' ? 'airport' : kind, w: kind === 'air' ? 250 : 175, d: 90, h: 16,
    })),
    facilities: hubs.map(({ name, kind, open, demand, close }, i) => ({
      id: 'qd-hub-' + i, lm: 'qd-hub-' + i, n: name, t: kind, y0: Array.isArray(open) ? open : [open, 1], y1: close,
      ...(kind === 'air' || kind === 'rail' ? { pax: demand } : { w: demand }),
    })),
    runways, roadYears: {}, bridgeYears: {}, simRoads: [], events, histTasks,
    traits: [{ use: 'finance', flavor: 'cn' }],
    
    stages: [[2015, '东岸起步'], [2021, '跨海与空港'], [2030, '环湾成网']],
    briefing: { lead: "从东岸主城铺出骨干，再跨胶州湾接入黄岛和胶东机场。", modes: [['metro', '地铁', '从零铺设地铁线网。']] },
  };
  (CM.MAP_LIST = CM.MAP_LIST || []).push({
    id: 'qd', name: "青岛", title: '青岛 · 2010', sub: '社区地图 · 2010 年起 · 人民币',
    kind: 'real', region: '中国内地', mapVersion: 1, scenario: 'qd-2010', difficulty: 3,
    modes: ['challenge', 'free'], desc: data.briefing.lead, intro: data.briefing.lead,
    tagline: '从东岸到西海岸',
    tags: ['胶州湾', '跨海', '机场转场'],
    facts: [['范围', geo.w / 4 + ' km × ' + geo.h / 4 + ' km'], ['起始', year + ' 年'], ['人口', '约 460 万']],
    features: [['wave', '跨越胶州湾', '先织密东岸，再连接黄岛与西海岸'], ['plane', '机场迁移', '2021 年民航客流由流亭转到胶东']],
    highlights: events.slice(1).map(({ y, title }) => [y, title]),
    geo, data,
    cam: { cx: point(120.35, 36.105)[0], cy: point(120.35, 36.105)[1], zoom: 15 },
    cfg: {
      W: geo.w, H: geo.h, START: { y: year, m: 1, d: 1, minute: 360 }, econBase: year,
      growth: { ...CM.CFG.growth, histEnd: 2030, popCurve: [[2010,4600000],[2020,6300000],[2040,7700000]], jobsRatio: [[year, 0.50], [2030, 0.56]] },
      economy: { ...CM.CFG.economy, startFunds: 1080000, grantBase: [[year, 51000], [2025, 74000], [2050, 108000]] },
    },
  });
})(window.CM);
