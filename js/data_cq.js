'use strict';
// 地理使用 Geofabrik 重庆提取包中的 OpenStreetMap 数据（ODbL 1.0）。
// 地图范围内的人口、岗位、客流和财政为情景估算；开通年份与设施参考公开年表。
//
// 一次定死的参数（改剧本前先对照，本文件与 geo_cq.js 分开迭代）：
//   边界 106.10–106.77°E / 29.28–30.00°N，256×320 格（64×80 km，250 m/格），投影见 geo_cq.js；
//   起始 2004-01（2 号线 2005-06 才通车，无地铁开局）；首线走廊 较场口—大坪—新山村；
//   统计口径 人口与 GDP 均按本地图范围估算：开局 570 万人、GDP 1800 亿元（gdp0 为万元口径）；
//   对照模板 同年代/跨江山地 → 南京 nj（2000 起），财政造价 → 苏州 su，机场时序 → 深圳 sz；
//   关键历史节点 见下方 events 的 y/m/d 与 src（node scripts/check-map.mjs cq --facts）。
// 地理范围与原始 PBF 不变时，改事件、票价或任务直接复用底图，不重新生成 geo_cq.js。
(function (CM) {
  const geo = CM.GEOS.cq;
  const { lon0, lat0, kx, ky } = geo.proj;
  const point = (lon, lat) => [(lon - lon0) * kx, (lat0 - lat) * ky];
  const sites = [
    ['较场口',106.571,29.557,30000,90000], ['解放碑',106.577,29.558,26000,88000],
    ['朝天门',106.584,29.570,14000,32000], ['小什字',106.588,29.562,18000,46000],
    ['两路口',106.556,29.554,24000,42000], ['李子坝',106.534,29.556,16000,18000],
    ['大坪',106.521,29.543,42000,56000], ['动物园',106.506,29.508,28000,24000],
    ['新山村',106.485,29.487,34000,30000], ['鱼洞',106.502,29.379,46000,34000],
    ['沙坪坝',106.457,29.559,52000,68000], ['磁器口',106.446,29.583,12000,16000],
    ['大学城',106.302,29.605,58000,52000], ['璧山',106.221,29.507,62000,40000],
    ['重庆北站',106.549,29.611,30000,58000], ['重庆西站',106.472,29.502,26000,50000],
    ['重庆站',106.548,29.549,22000,34000], ['江北机场',106.652,29.710,4000,46000],
    ['观音桥',106.531,29.586,48000,76000], ['南坪',106.566,29.510,44000,52000],
    ['四公里',106.574,29.494,32000,26000], ['茶园',106.635,29.490,36000,44000],
    ['北碚',106.434,29.828,54000,42000], ['蔡家',106.490,29.720,34000,30000],
    ['悦来',106.585,29.680,22000,28000], ['礼嘉',106.560,29.660,28000,34000],
    ['大竹林',106.533,29.635,40000,38000], ['南山',106.620,29.520,10000,12000],
    ['洪崖洞',106.580,29.565,8000,20000], ['龙兴',106.730,29.700,28000,36000],
    ['鱼嘴',106.720,29.630,30000,40000], ['广阳岛',106.700,29.560,12000,14000],
    ['江津',106.260,29.290,66000,48000], ['双福',106.310,29.370,38000,44000],
    ['跳磴',106.430,29.440,26000,22000], ['龙洲湾',106.540,29.420,40000,28000],
    ['歌乐山',106.430,29.610,8000,9000], ['缙云山',106.380,29.830,6000,6000],
  ].filter(([, lon, lat]) => {
    const [x, y] = point(lon, lat);
    return x >= 0 && x < geo.w && y >= 0 && y < geo.h;
  });
  const positions = new Map(sites.map(([n, lon, lat]) => [n, point(lon, lat)]));
  const where = (name, r = 4) => {
    const [x, y] = positions.get(name);
    return { name, x, y, r };
  };
  const box = ([w, s, e, n]) => [point(w, n), point(e, n), point(e, s), point(w, s)];
  // scenic 片区用不规则轮廓：box() 的四条直角边会被整块涂成山体色，在地图上形成突兀的长方形。
  const blob = ([w, s, e, n]) => {
    const dx = e - w, dy = n - s, q = (u, v) => point(w + u * dx, s + v * dy);
    return [q(0.10, 0.96), q(0.38, 1.00), q(0.72, 0.94), q(0.96, 0.78), q(1.00, 0.48),
      q(0.90, 0.16), q(0.62, 0.02), q(0.28, 0.06), q(0.02, 0.34), q(0.06, 0.68)];
  };
  const zone = (id, name, plan, pop, open, bounds) => ({ id, name, plan, pop, open, poly: box(bounds) });
  const landmark = (id, name, kind, year, w, d, h) => ({ id, ...where(name), kind, year, w, d, h });
  const task = (id, from, by, title, stops, reward) => ({
    id, appear: [from, 1], deadline: [by, 12], type: 'connect', title, reward,
    desc: '用运营中的地铁网络连接' + stops.join('、') + '。', anchors: stops.map(n => where(n)),
  });
  // 自定义站点加入可搜索地名；站名一律中文（社区版约定）。
  geo.places = sites.map(([name, lon, lat]) => [name, ...point(lon, lat), 2]).concat(geo.places);
  // 跑道按机场分组：江北机场老跑道开局即有，东侧两条随 2017 年 T3A 启用。
  const air = positions.get('江北机场');
  const near = radius => geo.runways.filter(r =>
    Math.hypot((r.a[0] + r.b[0]) / 2 - air[0], (r.a[1] + r.b[1]) / 2 - air[1]) < radius);
  const clip = r => {
    const hi = [geo.w - 0.5, geo.h - 0.5], lo = 0.5;
    const cut = (p, q) => {
      const d = [q[0] - p[0], q[1] - p[1]];
      let t = 1;
      for (const [i, top, bottom] of [[0, hi[0], lo], [1, hi[1], lo]]) {
        if (q[i] > top && d[i]) t = Math.min(t, (top - p[i]) / d[i]);
        if (q[i] < bottom && d[i]) t = Math.min(t, (bottom - p[i]) / d[i]);
      }
      return t >= 1 ? q.slice() : [p[0] + d[0] * t, p[1] + d[1] * t];
    };
    const a = cut(r.b, r.a);
    return { ...r, a, b: cut(a, r.b) };
  };
  const pair = (from, east) => near(22)
    .filter(r => east ? (r.a[0] + r.b[0]) / 2 >= 214 : (r.a[0] + r.b[0]) / 2 < 214)
    .map(r => ({ ...clip(r), from }));
  const data = {
    city: '重庆', riverName: '长江', lineColorsNice: CM.DATA.lineColorsNice, plans: CM.DATA.plans,
    places: geo.places, rural: { pop: 150, jobs: 90 }, hsrYear: 2015,
    mapLabels: ['较场口', '沙坪坝', '重庆北站', '江北机场', '大学城', '鱼洞', '茶园', '北碚', '璧山']
      .map(n => [n, ...positions.get(n)]),
    stages: [[2004, '首线筹建'], [2011, '跨江成网'], [2018, '环线与枢纽'], [2030, '市域连网']],
    stageLast: '模拟未来',
    briefing: {
      lead: '2004 年的重庆还没有一条运营轨道。长江与嘉陵江把渝中半岛夹在中间，山脊又把城区切成几块。你要沿较场口、大坪到新山村画出第一条跨座式单轨走廊，再让线网跨江、翻山，接上江北机场与大学城。',
      modes: [
        ['metro', '首线', '沿较场口、大坪到新山村，串起渝中半岛与大渡口。'],
        ['building', '两江与山脊', '跨江通道与中梁山隧道决定线路走向。'],
        ['plane', '江北机场', '机场开局可接，T3A 航站楼于 2017 年启用。'],
      ],
    },
    regions: [
      // 南山先用不规则轮廓占位，避免被下面按林地划定的山地片区吞掉（region 按数组顺序先到先得）。
      { id: 'nanshan', name: '南山森林公园', scenic: true, open: null, relief: 110, poly: blob([106.60, 29.51, 106.66, 29.56]) },
      // 中梁山、歌乐山与缙云山按 OSM 真实林地覆盖率划定：山体边界随地形起伏，
      // 不再用 box() 画成 31×133 格的直角长方形（1.2 版重庆地图的绿色色块）。
      { id: 'geleshan', name: '中梁山、歌乐山与缙云山林地', scenic: true, open: null, relief: 160, woodMin: 0.65, woodBounds: [[106.36,29.48,106.45,29.70], [106.31,29.70,106.42,29.89]].map(([w,s,e,n]) => [...point(w,n), ...point(e,s)]) },
      zone('yuzhong', '渝中半岛老城', 'cbd', 760000, 2004, [106.53, 29.54, 106.60, 29.58]),
      zone('jiangbei', '江北与观音桥', 'mix', 700000, 2004, [106.50, 29.58, 106.55, 29.63]),
      zone('nanan', '南岸与南坪', 'mix', 620000, 2004, [106.55, 29.48, 106.62, 29.54]),
      zone('shapingba', '沙坪坝与磁器口', 'mix', 680000, 2004, [106.44, 29.55, 106.50, 29.61]),
      zone('jiulongpo', '大坪与九龙坡', 'mix', 720000, 2004, [106.47, 29.50, 106.55, 29.56]),
      zone('dadukou', '大渡口与鱼洞', 'ind', 560000, 2004, [106.44, 29.36, 106.53, 29.505]),
      zone('liangjiang', '两江新区与重庆北站', 'cbd', 520000, 2006, [106.52, 29.60, 106.62, 29.68]),
      zone('beibu', '北部新区与礼嘉', 'newtown', 420000, 2008, [106.50, 29.65, 106.60, 29.73]),
      zone('konggang', '空港与江北机场', 'ind', 240000, 2004, [106.60, 29.68, 106.70, 29.76]),
      zone('beibei', '北碚与蔡家', 'newtown', 480000, 2010, [106.38, 29.75, 106.50, 29.90]),
      zone('daxuecheng', '大学城与科学城', 'newtown', 440000, 2010, [106.25, 29.55, 106.38, 29.68]),
      zone('bishan', '璧山城区', 'newtown', 380000, 2010, [106.18, 29.46, 106.28, 29.56]),
      zone('chayuan', '茶园与广阳岛', 'newtown', 360000, 2014, [106.62, 29.46, 106.72, 29.56]),
      zone('jiangjin', '江津与双福', 'ind', 520000, 2014, [106.20, 29.28, 106.36, 29.42]),
      zone('longxing', '龙兴与鱼嘴', 'ind', 320000, 2018, [106.68, 29.62, 106.77, 29.76]),
      zone('banan', '巴南与龙洲湾', 'res', 400000, 2010, [106.50, 29.38, 106.60, 29.48]),
    ],
    defaultRegion: { id: 'outer', name: '外围镇区', open: 2004, plan: 'res', pop: 520000 },
    centers: sites.map(([name, , , pop, jobs]) => ({ ...where(name, 5), pop, jobs })),
    landmarks: [
      landmark('cq-air', '江北机场', 'airport', 1990, 230, 100, 19),
      landmark('cq-t3a', '江北机场', 'airport', 2017, 280, 130, 22),
      landmark('cq-north', '重庆北站', 'rail', 2006, 240, 120, 20),
      landmark('cq-west', '重庆西站', 'rail', 2018, 250, 120, 20),
      { ...landmark('cq-station', '重庆站', 'rail', 1952, 200, 100, 18), x: 170.5, y: 199.5 },
      landmark('cq-liziba', '李子坝', 'monument', 2005, 110, 80, 9),
      landmark('cq-hongya', '洪崖洞', 'monument', 2006, 120, 90, 9),
      landmark('cq-ciqikou', '磁器口', 'monument', 1998, 110, 80, 8),
      landmark('cq-chaotian', '朝天门', 'monument', 1998, 130, 90, 10),
    ],
    facilities: [
      { id: 'cq-air', n: '江北机场', t: 'air', lm: 'cq-air', pax: [[2004, 1.2], [2016, 2.6], [2018, 1.6], [2025, 2.2]] },
      { id: 'cq-t3a', n: '江北机场 T3A 航站楼', t: 'air', lm: 'cq-t3a', y0: [2017, 8], pax: [[2017, 1.8], [2025, 3.6], [2035, 5.0]] },
      { id: 'cq-north', n: '重庆北站', t: 'rail', lm: 'cq-north', y0: [2006, 10], pax: [[2006, 3], [2020, 12]] },
      { id: 'cq-west', n: '重庆西站', t: 'rail', lm: 'cq-west', y0: [2018, 1], pax: [[2018, 2], [2025, 7]] },
      { id: 'cq-station', n: '重庆站', t: 'rail', at: [170.5, 199.5], y1: [2022, 6], pax: [[2004, 5], [2007, 4], [2018, 1.8], [2022, 0.5]] },
      { id: 'cq-jfb', n: '解放碑商圈', t: 'cbd', at: positions.get('解放碑'), w: 0.058 },
      { id: 'cq-gyq', n: '观音桥商圈', t: 'cbd', at: positions.get('观音桥'), w: 0.052 },
      { id: 'cq-uni', n: '大学城', t: 'uni', at: positions.get('大学城'), w: 0.034 },
      { id: 'cq-ciqikou', n: '磁器口', t: 'scenic', lm: 'cq-ciqikou', w: 0.026 },
      { id: 'cq-hongya', n: '洪崖洞', t: 'scenic', lm: 'cq-hongya', w: 0.03 },
      { id: 'cq-nanshan', n: '南山', t: 'scenic', at: positions.get('南山'), w: 0.022 },
    ],
    runways: [...pair(2004, false), ...pair(2017, true)],
    roadYears: {}, bridgeYears: {}, bridgeDefaultYear: 2004, simRoads: [],
    eras: [
      { id: 'cq-start', from: 2004, name: '首线筹建', tag: '模拟', summary: '渝中半岛与大坪、大渡口形成首条走廊需求。', grow: { jobs: { yuzhong: 1.2, jiulongpo: 1.25 } } },
      { id: 'cq-network', from: 2011, name: '跨江成网', tag: '模拟', summary: '一号线与三号线把江北、南岸和机场串起来。', grow: { pop: { jiangbei: 1.3, nanan: 1.25 }, jobs: { liangjiang: 1.4 } } },
      { id: 'cq-loop', from: 2018, name: '环线与枢纽', tag: '模拟', summary: '环线、重庆西站与 T3A 带来新的换乘需求。', grow: { jobs: { shapingba: 1.3, konggang: 1.35 } } },
      { id: 'cq-region', from: 2030, name: '市域连网', tag: '模拟', summary: '科学城、龙兴与江津方向继续加密。', grow: { jobs: { daxuecheng: 1.3, longxing: 1.25 } } },
    ],
    // 关键史实表：真实日期 y/m/d、游戏内效果 fx、资料来源 src，逐条用 `check-map.mjs cq --facts` 核对。
    // events[0] 必须是开局当月的开场说明（game.js 用它写开局日志，milestones.js 用它的 desc 作开场描述）。
    events: [
      { y: 2004, m: 1, d: 1, tag: '开局', title: '2004 年 · 重庆，从这里开始', src: '剧本起点（非史实事件）',
        desc: '2004 年的重庆还没有运营轨道。两江与山脊把城区分成几块，2 号线正在试运行；本局的线路走向由你决定。' },
      { y: 2005, m: 6, d: 18, tag: '史实', title: '二号线较场口至动物园开通', src: '重庆轨道集团《一图速览丨重庆轨道交通20年轨迹》（2005-06-18）',
        desc: '国内首条跨座式单轨通车，较场口至动物园段约 14 km。本局可自行选择首线走向。' },
      { y: 2006, m: 7, d: 1, tag: '史实', title: '二号线延伸至新山村', src: '重庆轨道集团 20 周年大事记（2006-07-01）',
        desc: '2 号线全线贯通，大渡口方向接入线网。' },
      { y: 2006, m: 10, tag: '史实', title: '重庆北站启用', src: '重庆铁路枢纽公开年表（2006 年 10 月投用）',
        desc: '新的铁路客运枢纽带来两江新区方向的接驳客流。', fx: { grow: { region: 'liangjiang', jobs: 1.15, years: 5 } } },
      { y: 2011, m: 7, d: 28, tag: '史实', title: '一号线小什字至沙坪坝开通', src: '重庆轨道集团 20 周年大事记 / 新浪《跨越500公里线路》',
        desc: '重庆首条钢轮钢轨地铁通车，向西穿过中梁山方向。' },
      { y: 2011, m: 12, d: 30, tag: '史实', title: '三号线接入江北机场', src: '重庆轨道集团 20 周年大事记（2011-12-30 二塘—江北机场全线）',
        desc: '3 号线跨两江直抵机场，线网从单线进入网络化运营。', fx: { grow: { region: 'konggang', jobs: 1.2, years: 6 } } },
      { y: 2014, m: 12, d: 30, tag: '史实', title: '三线齐发，里程突破 200 公里', src: '新浪《跨越500公里线路 "织"就轨道上的新重庆》',
        desc: '6 号线茶园段、2 号线鱼洞段与 1 号线尖顶坡段同日开通。', fx: { grow: { region: 'chayuan', pop: 1.3, years: 6 } } },
      { y: 2017, m: 8, d: 29, tag: '史实', title: '江北机场 T3A 航站楼启用', src: '重庆江北国际机场 T3A 启用公开报道（2017-08）',
        desc: '新航站楼与东侧跑道投用，空侧接驳客流按南京青奥会的短脉冲写法临时抬升。',
        fx: { demand: { hub: 1.15, months: 3 }, grow: { region: 'konggang', pop: 1.35, years: 8 } } },
      { y: 2018, m: 12, d: 28, tag: '史实', title: '环线东北半环与四号线一期开通', src: '新浪《跨越500公里线路》（2018-12-28 里程突破 300 公里）',
        desc: '环线把放射线与重庆西站、重庆北站串成一体。', fx: { grow: { region: 'shapingba', jobs: 1.2, years: 5 } } },
      { y: 2022, m: 1, d: 25, tag: '史实', title: '九号线一期，里程突破 400 公里', src: '新浪《跨越500公里线路》（2022-01-25）',
        desc: '线网继续向西北与空港方向加密。', fx: { grow: { region: 'beibu', jobs: 1.15, years: 5 } } },
    ],
    // 判定统一是 type:'connect'：只检查锚点是否被运营中的地铁网络连通，标题一律写「连通…」。
    histTasks: [
      task('cq-first', 2004, 2010, '连通较场口、大坪与新山村', ['较场口', '大坪', '新山村'], 36000),
      task('cq-river', 2007, 2014, '连通小什字、两路口与沙坪坝', ['小什字', '两路口', '沙坪坝'], 50000),
      task('cq-air', 2008, 2016, '连通观音桥、重庆北站与江北机场', ['观音桥', '重庆北站', '江北机场'], 56000),
      task('cq-west', 2011, 2020, '连通沙坪坝、大学城与璧山', ['沙坪坝', '大学城', '璧山'], 62000),
      task('cq-loop', 2015, 2025, '连通重庆西站、重庆北站、茶园与鱼洞', ['重庆西站', '重庆北站', '茶园', '鱼洞'], 72000),
    ],
    // 远期设想（龙兴、鱼嘴、广阳岛）不占主线，放进可选挑战。
    scenarios: [{
      id: 'cq-sc-east', theme: '重庆：东部生态城', title: '用有限预算连通龙兴、鱼嘴与广阳岛', type: 'budgetConnect',
      from: [2020, 1], to: [2032, 12], months: 60, rewardMonths: 3, budgetX: 1.3,
      anchors: [['龙兴', 4], ['鱼嘴', 4], ['广阳岛', 4]],
      desc: '远期设想：把两江新区的龙兴、鱼嘴与广阳岛纳入同一张网。',
      tips: ['跨江与绕山成本高，先接龙兴，再沿江向广阳岛延伸。'],
    }],
    taskNote: '任务只判定锚点是否被运营中的地铁网络连通，不要求按真实线路走向或建成环线；龙兴、鱼嘴等远期设想放在可选挑战里。跨江与翻山造价较高，建议预留较长周期。',
  };
  (CM.MAP_LIST = CM.MAP_LIST || []).push({
    id: 'cq', name: '重庆', title: '重庆 · 2004', sub: '社区地图 · 2004 年起 · 人民币', kind: 'real',
    desc: '从渝中半岛起步，沿两江与山脊铺开线网，向西进大学城与璧山，向北接江北机场，向东进入茶园与龙兴。',
    intro: data.briefing.lead,
    region: '中国内地', tagline: '两江夹一城，从第一条单轨开始', difficulty: 3,
    tags: ['社区版', '无地铁开局', '山城跨江', '跨座式单轨'],
    modes: ['challenge', 'free'], mapVersion: 1, scenario: 'cq-2004',
    facts: [['范围', geo.w / 4 + ' km × ' + geo.h / 4 + ' km'], ['起始', '2004 年'], ['人口', '约 570 万'], ['货币', '人民币']],
    features: [
      ['wave', '两江与山脊', '长江、嘉陵江与中梁山把城区分成几块，跨江通道决定走向'],
      ['map', '跨座式单轨', '2 号线是国内首条跨座式单轨，适合爬坡与沿江'],
      ['plane', '两代航站楼', '江北机场开局可接，T3A 与东侧跑道 2017 年启用'],
      ['building', '铁路枢纽', '重庆站开局可接，重庆北站 2006、重庆西站 2018 陆续投用'],
    ],
    highlights: [[2005, '二号线开通'], [2011, '一号线与三号线'], [2014, '里程破 200 公里'], [2017, 'T3A 启用'], [2018, '环线东北半环']],
    geo, data, cam: { cx: 150, cy: 190, zoom: 14 },
    cfg: {
      W: geo.w, H: geo.h, START: { y: 2004, m: 1, d: 1, minute: 360 }, econBase: 2000,
      // 2004 年重庆轨道起步价 2 元，与社区城市一致，故沿用默认 fareDefault 作起步价。
      // v2.7 引擎新开局默认按里程计费，fareDefault 不再代表全程统一票价。
      // 人口 570 万与 GDP 1800 亿元（gdp0 万元口径）都用同一张 64×80 km 地图范围估算。
      growth: Object.assign({}, CM.CFG.growth, {
        histEnd: 2020,
        popCurve: [[2004, 5.7e6], [2010, 7.2e6], [2015, 8.85e6], [2020, 10.3e6], [2040, 12.5e6], [2300, 13.5e6]],
        metroBoostMax: 0.04,
        jobsRatio: [[2004, 0.52], [2020, 0.58]],
      }),
      // 预算给跨江与山体隧道留出余量，工程附加费仍按实际穿越长度结算。
      economy: Object.assign({}, CM.CFG.economy, {
        startFunds: 1050000, grantBase: [[2004, 47000], [2010, 62000], [2015, 75000], [2020, 86000], [2050, 120000]],
      }),
      macro: {
        area: '重庆社区地图范围（含江北国际机场片区）', region: '中国内地', gdp0: 18000000,
        revRatio: [[2004, 0.15], [2020, 0.19]], revElastic: 1.3,
        prod: [[2004, 0.075], [2020, 0.040], [2050, 0.021]],
        infl: 'cn', ref: 'cn', histEnd: 2020, longRun: { infl: 0.02 },
        struct: { trade: 0.7, fin: 0.6, ind: 0.9, tour: 1.0, prop: 0.7 },
        events: [{ id: 'trade2018', y: 2018, m: 7 }, { id: 'covid2020', y: 2020, m: 1 }],
      },
    },
  });

  // 补充热点地区（2026-11-12）：知名但此前未列入「重要设施」的地点。
  // 坐标取自 OSM 底图同名点，缺失时按经纬度投影；规模按同城同类设施的中低档取值。
  // 追加在数组末尾，不打乱既有设施顺序；引擎按 id 生成缓存键，旧存档不受影响。
  (function (data) {
    data.facilities.push(
      { id: 'cq_hot_1', n: '朝天门', t: 'scenic', at: [184.3, 192.1], w: 0.028, note: '长江与嘉陵江交汇处的老城门与码头' },
      { id: 'cq_hot_2', n: '重庆人民大礼堂', t: 'scenic', at: [171.1, 192.7], w: 0.02, note: '1950 年代建成的标志性建筑，对面为三峡博物馆' },
      { id: 'cq_hot_3', n: '长江索道', t: 'scenic', at: [186.5, 197.5], w: 0.016, note: '1987 年通车的跨江客运索道' },
      { id: 'cq_hot_4', n: '湖广会馆', t: 'scenic', at: [186, 194.9], w: 0.012, note: '清代移民会馆建筑群' },
      { id: 'cq_hot_5', n: '重庆动物园', t: 'scenic', at: [153.2, 220.2], w: 0.015, note: '1955 年开放的市区动物园' },
      { id: 'cq_hot_6', n: '李子坝', t: 'scenic', at: [165.8, 197.1], y0: 2005, w: 0.012, note: '2 号线穿楼景观，2005 年后成为热门观景点' },
    );
  })(CM.MAP_LIST.find(function (m) { return m.id === 'cq'; }).data);

  // 热点地区调整（2026-11-12）：市中心合并 + 外围补充。
  // 代表设施保留原 id；被合并设施从数组移除，需求按 w/pax 叠加。
  // 市中心按传统老城中心半径 24 格聚类，3 格内相邻设施并入代表设施；
  // 接驳口 / 跑道 / 有停用年 / 铁路与机场枢纽不参与合并；外围补充见下方 push。
  (function (data) {
    var fs = data.facilities, drop = {'cq-hongya':1,'cq_hot_4':1};
    for (var i = fs.length - 1; i >= 0; i--) if (drop[fs[i].id]) fs.splice(i, 1);
    var upd = {
      'cq_hot_1': { w: 0.052, note: "长江与嘉陵江交汇处的老城门与码头；市中心热点合并：含 洪崖洞（需求并入本设施，位置以本设施为准）" },
      'cq_hot_3': { w: 0.026, note: "1987 年通车的跨江客运索道；市中心热点合并：含 湖广会馆（需求并入本设施，位置以本设施为准）" },
    };
    for (var j = 0; j < fs.length; j++) { var u = upd[fs[j].id]; if (u) for (var k in u) fs[j][k] = u[k]; }
    data.facilities.push(
      { id: 'cq_outer_1', n: '缙云山·北温泉', t: 'scenic', at: [108.3, 71.5], w: 0.014, note: '北碚嘉陵江畔的缙云山与温泉' },
      { id: 'cq_outer_2', n: '重庆园博园', t: 'park', at: [175.7, 143.2], y0: 2011, w: 0.012, note: '2011 年第八届园博会园区' },
      { id: 'cq_outer_3', n: '钓鱼城', t: 'scenic', at: [63.6, 1.5], w: 0.012, note: '合川南宋抗蒙山城' },
      { id: 'cq_outer_4', n: '广阳岛', t: 'park', at: [244.5, 235.3], w: 0.01, note: '长江江心岛与生态修复示范区' },
      { id: 'cq_outer_5', n: '龙兴古镇', t: 'scenic', at: [248.3, 133.2], w: 0.01, note: '两江新区龙兴明代场镇' },
    );
  })(CM.MAP_LIST.find(function (m) { return m.id === 'cq'; }).data);
})(window.CM);
