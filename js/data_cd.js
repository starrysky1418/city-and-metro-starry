'use strict';
// 地理使用 Geofabrik 四川提取包中的 OpenStreetMap 数据（ODbL 1.0）。
// 地图范围内的人口、岗位、客流和财政为情景估算；开通年份与设施参考公开年表。
//
// 一次定死的参数（改剧本前先对照，本文件与 geo_cd.js 分开迭代）：
//   边界 103.80–104.47°E / 30.22–30.94°N，256×320 格（64×80 km，250 m/格），投影见 geo_cd.js；
//   起始 2010-01；首线走廊 成都站—天府广场—世纪城（人民路南北向，直线 15.91 km）；
//   统计口径 人口与 GDP 均按本地图范围估算：开局 1150 万人、GDP 5500 亿元（gdp0 为万元口径）；
//   对照模板 财政/造价 → 苏州 su，机场时序 → 深圳 sz，活动客流 → 南京 nj；
//   关键历史节点 见下方 events 的 y/m/d 与 src（node scripts/check-map.mjs cd --facts）。
// 地理范围与原始 PBF 不变时，改事件、票价或任务直接复用底图，不重新生成 geo_cd.js。
(function (CM) {
  const geo = CM.GEOS.cd;
  const { lon0, lat0, kx, ky } = geo.proj;
  const point = (lon, lat) => [(lon - lon0) * kx, (lat0 - lat) * ky];
  const sites = [
    ['天府广场',104.0665,30.6570,36000,92000], ['春熙路',104.0810,30.6580,28000,88000],
    ['宽窄巷子',104.0550,30.6690,14000,26000], ['武侯祠',104.0480,30.6450,10000,19000],
    ['杜甫草堂',104.0250,30.6600,9000,14000], ['成都站',104.0720,30.6950,30000,52000],
    ['成都东站',104.1420,30.6380,26000,61000], ['成都南站',104.0680,30.6100,18000,33000],
    ['成都西站',103.9720,30.6880,16000,27000], ['双流机场',103.9470,30.5780,6000,42000],
    ['天府机场',104.4430,30.3100,3000,38000], ['犀浦',103.9730,30.7290,62000,38000],
    ['郫都',103.8790,30.8080,68000,46000], ['高新西区',103.9300,30.7200,54000,72000],
    ['温江',103.8530,30.6870,70000,39000], ['新都',104.1600,30.8260,66000,43000],
    ['青白江',104.2500,30.8800,52000,48000], ['龙泉驿',104.2550,30.5670,72000,52000],
    ['东安湖',104.2300,30.5700,24000,20000], ['青龙湖',104.1900,30.6100,18000,12000],
    ['大面',104.1900,30.6000,48000,26000], ['十陵',104.1750,30.6600,42000,24000],
    ['龙潭寺',104.1650,30.7000,38000,30000], ['熊猫基地',104.1450,30.7330,6000,9000],
    ['东郊记忆',104.1350,30.6700,16000,22000], ['茶店子',104.0200,30.6900,44000,31000],
    ['金融城',104.0700,30.5850,40000,98000], ['世纪城',104.0750,30.5600,48000,72000],
    ['环球中心',104.0680,30.5730,22000,58000], ['麓湖',104.0600,30.4700,28000,24000],
    ['兴隆湖',104.0700,30.4100,32000,47000], ['科学城',104.0800,30.3900,26000,52000],
    ['双流城区',103.9200,30.5600,58000,34000], ['蛟龙港',103.9500,30.6000,36000,44000],
    ['黄龙溪',103.9800,30.3200,22000,12000], ['三圣乡',104.1450,30.5950,30000,18000],
    ['昭觉寺',104.0950,30.7150,34000,21000],
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
  const zone = (id, name, plan, pop, open, bounds) => ({ id, name, plan, pop, open, poly: box(bounds) });
  const landmark = (id, name, kind, year, w, d, h) => ({ id, ...where(name), kind, year, w, d, h });
  const task = (id, from, by, title, stops, reward) => ({
    id, appear: [from, 1], deadline: [by, 12], type: 'connect', title, reward,
    desc: '用运营中的地铁网络连接' + stops.join('、') + '。', anchors: stops.map(n => where(n)),
  });
  // 自定义站点加入可搜索地名；站名一律中文（社区版约定）。
  geo.places = sites.map(([name, lon, lat]) => [name, ...point(lon, lat), 2]).concat(geo.places);
  // 跑道按机场分组：双流开局即有，天府机场 2021 年 6 月启用。
  // OSM 里天府机场的一条横向跑道越过地图东缘，按原线段方向把端点裁到边界内；geo_cd.js 原始数据不动。
  // geo.runways 另有 4 条散布全图的短线段被误标为跑道，距两座机场都超出下面的归属半径，不分组。
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
  const group = (name, radius, from) => {
    const [x, y] = positions.get(name);
    return geo.runways
      .filter(r => Math.hypot((r.a[0] + r.b[0]) / 2 - x, (r.a[1] + r.b[1]) / 2 - y) < radius)
      .map(r => ({ ...clip(r), from }));
  };
  const data = {
    city: '成都', riverName: '锦江', lineColorsNice: CM.DATA.lineColorsNice, plans: CM.DATA.plans,
    places: geo.places, rural: { pop: 150, jobs: 90 }, hsrYear: 2011,
    mapLabels: ['天府广场', '成都东站', '双流机场', '兴隆湖', '龙泉驿', '新都', '温江', '天府机场', '郫都']
      .map(n => [n, ...positions.get(n)]),
    stages: [[2010, '首线筹建'], [2015, '十字骨干'], [2021, '环线与双机场'], [2030, '公园城市与市域连网']],
    stageLast: '模拟未来',
    briefing: {
      lead: '2010 年的成都还没有一条运营地铁。老城被一环、二环层层围住，城南的高新区才刚起步，天府新区尚在图纸上。你要在环路与锦江水系之间画下第一条南北线，再让轨道向双流、龙泉、新都和天府新区铺开。',
      modes: [
        ['metro', '首线', '沿人民路南北走廊串联火车北站、天府广场与世纪城。'],
        ['building', '环路与枢纽', '环线可把成都站、成都东站、成都南站和成都西站串成一体。'],
        ['plane', '两座机场', '双流机场开局可接，天府国际机场于 2021 年在东南方向启用。'],
      ],
    },
    regions: [
      { id: 'longquan_hill', name: '龙泉山城市森林公园', scenic: true, open: null, relief: 130, poly: box([104.280, 30.420, 104.400, 30.880]) },
      { id: 'panda', name: '大熊猫繁育研究基地', scenic: true, open: null, relief: 25, poly: box([104.135, 30.725, 104.160, 30.745]) },
      zone('old', '一环内老城', 'cbd', 980000, 2010, [104.030, 30.630, 104.100, 30.690]),
      zone('north', '城北与火车北站', 'mix', 620000, 2010, [104.020, 30.690, 104.140, 30.750]),
      zone('east', '城东与东郊', 'mix', 700000, 2010, [104.100, 30.620, 104.190, 30.710]),
      zone('west', '城西与青羊', 'mix', 560000, 2010, [103.960, 30.630, 104.030, 30.720]),
      zone('gaoxin', '高新区与金融城', 'cbd', 720000, 2010, [104.030, 30.550, 104.120, 30.630]),
      zone('shiling', '十陵与龙潭', 'mix', 340000, 2010, [104.140, 30.650, 104.200, 30.730]),
      zone('tianfu', '天府新区与麓湖', 'newtown', 480000, 2014, [104.020, 30.430, 104.140, 30.550]),
      zone('science', '兴隆湖与科学城', 'newtown', 340000, 2014, [104.020, 30.360, 104.140, 30.430]),
      zone('shuangliu', '双流与机场', 'ind', 620000, 2010, [103.870, 30.530, 104.020, 30.630]),
      zone('wenjiang', '温江城区', 'newtown', 460000, 2010, [103.800, 30.640, 103.920, 30.740]),
      zone('pidu', '郫都与犀浦', 'ind', 580000, 2010, [103.850, 30.710, 104.000, 30.830]),
      zone('xindu', '新都城区', 'newtown', 480000, 2010, [104.100, 30.770, 104.200, 30.860]),
      zone('qbj', '青白江', 'ind', 380000, 2010, [104.190, 30.840, 104.330, 30.920]),
      zone('longquanyi', '龙泉驿与东安湖', 'newtown', 540000, 2010, [104.190, 30.520, 104.290, 30.640]),
      zone('south', '黄龙溪与南部镇区', 'res', 260000, 2010, [103.920, 30.270, 104.100, 30.400]),
      zone('airport', '天府国际机场片区', 'newtown', 180000, 2021, [104.380, 30.270, 104.470, 30.360]),
    ],
    defaultRegion: { id: 'outer', name: '外围镇区', open: 2010, plan: 'res', pop: 720000 },
    centers: sites.map(([name, , , pop, jobs]) => ({ ...where(name, 5), pop, jobs })),
    landmarks: [
      landmark('cd-north', '成都站', 'rail', 1952, 240, 110, 19),
      landmark('cd-east', '成都东站', 'rail', 2011, 260, 130, 21),
      landmark('cd-south', '成都南站', 'rail', 2010, 190, 100, 18),
      landmark('cd-west', '成都西站', 'rail', 2018, 180, 100, 18),
      landmark('cd-shuangliu', '双流机场', 'airport', 1957, 230, 100, 19),
      landmark('cd-tianfu-air', '天府机场', 'airport', 2021, 300, 140, 22),
      landmark('cd-wuhou', '武侯祠', 'monument', 223, 120, 90, 9),
      landmark('cd-dufu', '杜甫草堂', 'monument', 759, 130, 90, 8),
      landmark('cd-kuanzhai', '宽窄巷子', 'monument', 1718, 110, 80, 8),
      landmark('cd-dongan', '东安湖', 'monument', 2021, 190, 140, 24),
    ],
    facilities: [
      { id: 'cd-north', n: '成都站', t: 'rail', lm: 'cd-north', pax: [[2010, 9], [2020, 12]] },
      { id: 'cd-east', n: '成都东站', t: 'rail', lm: 'cd-east', y0: [2011, 5], pax: [[2011, 4], [2020, 18]] },
      { id: 'cd-south', n: '成都南站', t: 'rail', lm: 'cd-south', pax: [[2010, 3], [2020, 8]] },
      { id: 'cd-west', n: '成都西站', t: 'rail', lm: 'cd-west', y0: [2018, 12], pax: [[2019, 2], [2025, 6]] },
      { id: 'cd-shuangliu', n: '双流机场', t: 'air', lm: 'cd-shuangliu', pax: [[2010, 2.6], [2019, 5.0], [2020, 3.2], [2025, 5.5]] },
      { id: 'cd-tianfu-air', n: '天府机场', t: 'air', lm: 'cd-tianfu-air', y0: [2021, 6], pax: [[2021, 1.2], [2025, 4.0], [2035, 6.0]] },
      { id: 'cd-chunxi', n: '春熙路商圈', t: 'cbd', at: positions.get('春熙路'), w: 0.058 },
      { id: 'cd-finance', n: '金融城', t: 'cbd', at: positions.get('金融城'), w: 0.055 },
      { id: 'cd-campus', n: '兴隆湖科学城', t: 'uni', at: positions.get('科学城'), w: 0.034 },
      { id: 'cd-panda', n: '大熊猫繁育研究基地', t: 'scenic', at: positions.get('熊猫基地'), w: 0.028 },
      { id: 'cd-wuhou', n: '武侯祠', t: 'scenic', lm: 'cd-wuhou', w: 0.024 },
      { id: 'cd-dongan', n: '东安湖体育公园', t: 'scenic', lm: 'cd-dongan', y0: [2023, 7], w: 0.036 },
    ],
    runways: [
      ...group('双流机场', 22, 2010),
      ...group('天府机场', 20, 2021),
    ],
    roadYears: {}, bridgeYears: {}, bridgeDefaultYear: 2010, simRoads: [],
    eras: [
      { id: 'cd-start', from: 2010, name: '首线筹建', tag: '模拟', summary: '老城与高新区形成南北向需求。', grow: { jobs: { west: 1.2, gaoxin: 1.35 } } },
      { id: 'cd-cross', from: 2015, name: '十字骨干', tag: '模拟', summary: '城北、温江与新都的通勤需求上升。', grow: { pop: { xindu: 1.4, wenjiang: 1.3 }, jobs: { gaoxin: 1.4 } } },
      { id: 'cd-airports', from: 2021, name: '双机场时代', tag: '模拟', summary: '天府新区与天府机场成为新的增长极。', grow: { pop: { tianfu: 1.6, airport: 1.5 }, jobs: { science: 1.5 } } },
      { id: 'cd-parkcity', from: 2030, name: '公园城市与市域连网', tag: '模拟', summary: '东翼与西北片区继续加密。', grow: { jobs: { longquanyi: 1.3, pidu: 1.25 } } },
    ],
    // 关键史实表：真实日期 y/m/d、游戏内效果 fx、资料来源 src，逐条用 `check-map.mjs cd --facts` 核对。
    // events[0] 必须是开局当月的开场说明：game.js 用它写开局日志并置 firedEvents[0]=1，
    // milestones.js 用它的 desc 作「2010 年 · 成都，从这里开始」的描述；未来事件不能占这个位置。
    events: [
      { y: 2010, m: 1, d: 1, tag: '开局', title: '2010 年 · 成都，从这里开始', src: '剧本起点（非史实事件）',
        desc: '2010 年的成都还没有运营地铁。老城被环路围住，高新区刚起步，天府新区尚在图纸上；本局的线路走向由你决定。' },
      { y: 2010, m: 9, d: 27, tag: '史实', title: '地铁一号线开通', src: '成都轨道集团《12月18日五线齐发，成都轨道交通运营里程突破500公里》',
        desc: '现实中一号线一期自升仙湖至世纪城开通试运营。本局可自行选择首线走向。' },
      { y: 2011, m: 5, tag: '史实', title: '成都东站启用', src: '成都铁路枢纽公开年表（2011 年 5 月投用）',
        desc: '新的铁路客运枢纽带来城东方向的接驳客流。', fx: { grow: { region: 'east', jobs: 1.15, years: 5 } } },
      { y: 2012, m: 9, d: 16, tag: '史实', title: '地铁二号线开通', src: '成都轨道集团线路年表（2 号线 2012-09-16）',
        desc: '现实中二号线串联犀浦与龙泉驿，形成东西向走廊。' },
      { y: 2014, m: 10, d: 2, tag: '史实', title: '天府新区获批', src: '国务院国函〔2014〕133 号《关于同意设立四川天府新区的批复》（2014-10-02）',
        desc: '国家级新区设立，城南开始成片开发。', fx: { grow: { region: 'tianfu', pop: 1.3, years: 8 } } },
      { y: 2017, m: 9, d: 6, tag: '史实', title: '十号线接入双流机场', src: '成都轨道集团线路年表（10 号线一期 2017-09-06）',
        desc: '机场首次有轨道直达。本局的机场线由玩家决定。' },
      { y: 2017, m: 12, d: 6, tag: '史实', title: '七号线环线开通', src: '成都轨道集团线路年表（7 号线 2017-12-06；原草案误写 2018-12，已修正）',
        desc: '环线把多条放射线与铁路枢纽串在一起。' },
      { y: 2020, m: 12, d: 18, tag: '史实', title: '五线齐发，线网突破 500 公里', src: '成都轨道集团《12月18日五线齐发，成都轨道交通运营里程突破500公里》',
        desc: '6、8、9、17 号线与 18 号线三岔至天府机场北段同日开通（18 号线首开段已在 2020-09-27 通车）。高新区岗位继续集聚。', fx: { grow: { region: 'gaoxin', jobs: 1.12, years: 5 } } },
      { y: 2021, m: 6, d: 27, tag: '史实', title: '天府国际机场启用', src: '光明网/新华社《成都天府国际机场正式启用》（2021-06-27 首航）',
        desc: '成都成为双国际机场城市，东南方向产生新的长距离接驳需求。', fx: { grow: { region: 'airport', pop: 1.5, years: 8 } } },
      { y: 2023, m: 7, d: 28, tag: '史实', title: '成都大运会', src: '成都第 31 届世界大学生夏季运动会开幕报道（2023-07-28）',
        desc: '东安湖体育公园带动龙泉驿方向的建设；赛时休闲出行按南京青奥会的写法给一个短脉冲。',
        fx: { demand: { lz: 1.18, months: 1 }, grow: { region: 'longquanyi', jobs: 1.2, years: 5 } } },
      { y: 2024, m: 9, d: 29, tag: '史实', title: '轨道交通资阳线开通', src: '成都轨道集团《今日，轨道交通资阳线正式开通!》（2024-09-29）',
        desc: '四川首条跨市域轨道线接入 18、19 号线，串联东部新区与天府国际机场，东南方向的接驳需求继续放大。',
        fx: { grow: { region: 'airport', jobs: 1.2, years: 6 } } },
    ],
    // 判定统一是 type:'connect'：只检查锚点是否被运营中的地铁网络连通，不检查走向、环线形状或线路编号。
    // 因此标题一律写「连通…」，不用「南北首线」「环线串起…」这类暗示走向的史实名，避免名实不符。
    histTasks: [
      task('cd-first', 2010, 2016, '连通成都站、天府广场与世纪城', ['成都站', '天府广场', '世纪城'], 38000),
      task('cd-cross', 2012, 2018, '连通犀浦、春熙路与龙泉驿', ['犀浦', '春熙路', '龙泉驿'], 52000),
      task('cd-air', 2015, 2022, '连通天府广场、双流机场与金融城', ['天府广场', '双流机场', '金融城'], 56000),
      task('cd-ring', 2017, 2025, '连通成都站、成都东站、成都南站与成都西站', ['成都站', '成都东站', '成都南站', '成都西站'], 68000),
      task('cd-newair', 2021, 2031, '连通天府广场、天府机场与兴隆湖', ['天府广场', '天府机场', '兴隆湖'], 82000),
    ],
    // 远期设想（公园城市东翼）不占主线任务，放进可选挑战，玩家自行接受或忽略。
    scenarios: [{
      id: 'cd-sc-park', theme: '成都：公园城市东翼', title: '用有限预算连通东安湖与兴隆湖', type: 'budgetConnect',
      from: [2023, 1], to: [2033, 12], months: 60, rewardMonths: 3, budgetX: 1.3,
      anchors: [['东安湖', 4], ['青龙湖', 4], ['兴隆湖', 4]],
      desc: '远期设想：把龙泉驿的东安湖、青龙湖与天府新区的兴隆湖纳入同一张网。',
      tips: ['距离较远，先接客流成熟的东安湖，再向兴隆湖延伸。'],
    }],
    taskNote: '任务只判定锚点是否被运营中的地铁网络连通，不要求按真实线路走向或建成环线；公园城市东翼等远期设想放在可选挑战里。天府机场方向距离较远，建议预留较长的建设周期。',
  };
  (CM.MAP_LIST = CM.MAP_LIST || []).push({
    id: 'cd', name: '成都', title: '成都 · 2010', sub: '社区地图 · 2010 年起 · 人民币', kind: 'real',
    desc: '从一环内老城起步，沿环路与锦江水系铺开线网，向西接双流机场，向东进龙泉驿，向南进入天府新区与天府国际机场。',
    intro: data.briefing.lead,
    region: '中国内地', tagline: '环路围城，从第一条南北线开始', difficulty: 3,
    tags: ['社区版', '无地铁开局', '环形路网', '双机场'],
    modes: ['challenge', 'free'], mapVersion: 1, scenario: 'cd-2010',
    facts: [['范围', geo.w / 4 + ' km × ' + geo.h / 4 + ' km'], ['起始', '2010 年'], ['人口', '约 1150 万'], ['货币', '人民币']],
    features: [
      ['map', '环形路网', '一环、二环、三环与绕城高速构成典型的放射加环形城市'],
      ['wave', '锦江水系', '府河、南河、沙河与江安河约束线路走向'],
      ['plane', '两座国际机场', '双流开局可接，天府机场 2021 年在东南启用'],
      ['building', '四座铁路枢纽', '成都站、成都东站、成都南站、成都西站可用环线串联'],
    ],
    highlights: [[2010, '首线开通'], [2014, '天府新区获批'], [2017, '七号线环线'], [2020, '五线齐发'], [2021, '天府国际机场启用'], [2023, '大运会']],
    geo, data, cam: { cx: 105, cy: 140, zoom: 14 },
    cfg: {
      W: geo.w, H: geo.h, START: { y: 2010, m: 1, d: 1, minute: 360 }, econBase: 1990,
      // 2010 年成都地铁起步价 2 元，与广州样本一致，故沿用默认 fareDefault 作起步价。
      // v2.7 引擎新开局默认按里程计费，fareDefault 不再代表全程统一票价。
      // 人口 1150 万（popCurve[0] / facts）与 GDP 5500 亿元（gdp0 万元口径）都用同一张 64×80 km 地图范围估算。
      growth: Object.assign({}, CM.CFG.growth, {
        histEnd: 2020,
        popCurve: [[2010, 11.5e6], [2020, 20.9e6], [2040, 23.5e6], [2300, 24.5e6]],
        jobsRatio: [[2010, 0.53], [2020, 0.58]],
      }),
      // 财政与造价以苏州 su 为对照、拨款用首线草案报价校准：
      // 苏州首线 12.4 km → 草案 889,604，起始资金 1,400,000（报价占 63.5%），2010 月拨款 60,000（≈14.8 个月报价）；
      // 成都首线 15.91 km → 草案 1,098,683，按同一比值取起始资金 1,700,000、2010 月拨款 74,000，后两档同比例上调。
      economy: Object.assign({}, CM.CFG.economy, {
        startFunds: 1700000, grantBase: [[2010, 74000], [2020, 120000], [2050, 185000]],
      }),
      macro: {
        area: '成都社区地图范围（含天府国际机场片区）', region: '中国内地', gdp0: 55000000,
        revRatio: [[2010, 0.16], [2020, 0.19]], revElastic: 1.3,
        prod: [[2010, 0.075], [2020, 0.040], [2050, 0.021]],
        infl: 'cn', ref: 'cn', histEnd: 2020, longRun: { infl: 0.02 },
        struct: { trade: 0.7, fin: 0.6, ind: 0.9, tour: 0.8, prop: 0.7 },
        events: [{ id: 'trade2018', y: 2018, m: 7 }, { id: 'covid2020', y: 2020, m: 1 }],
      },
    },
  });

  // 补充热点地区（2026-11-12）：知名但此前未列入「重要设施」的地点。
  // 坐标取自 OSM 底图同名点，缺失时按经纬度投影；规模按同城同类设施的中低档取值。
  // 追加在数组末尾，不打乱既有设施顺序；引擎按 id 生成缓存键，旧存档不受影响。
  (function (data) {
    data.facilities.push(
      { id: 'cd_hot_1', n: '宽窄巷子', t: 'shop', at: [97.4, 120.3], w: 0.026, note: '清代少城遗存改造的历史街区' },
      { id: 'cd_hot_2', n: '锦里', t: 'scenic', at: [95.1, 131.4], w: 0.022, note: '武侯祠东侧的传统商业街' },
      { id: 'cd_hot_3', n: '杜甫草堂', t: 'scenic', at: [86, 124.3], w: 0.018, note: '唐代诗人杜甫流寓成都故居' },
      { id: 'cd_hot_4', n: '青羊宫', t: 'scenic', at: [91.1, 123], w: 0.014, note: '川西著名道观' },
      { id: 'cd_hot_5', n: '文殊院', t: 'scenic', at: [103.9, 114.1], w: 0.014, note: '成都城区保存完整的佛教寺院' },
      { id: 'cd_hot_6', n: '金沙遗址博物馆', t: 'scenic', at: [79.4, 113.1], y0: 2007, w: 0.016, note: '2007 年建成开放' },
      { id: 'cd_hot_7', n: '三圣乡', t: 'park', at: [131.8, 153.2], w: 0.012, note: '城东花卉与乡村旅游片区' },
    );
  })(CM.MAP_LIST.find(function (m) { return m.id === 'cd'; }).data);

  // 热点地区调整（2026-11-12）：市中心合并 + 外围补充。
  // 代表设施保留原 id；被合并设施从数组移除，需求按 w/pax 叠加。
  // 市中心按传统老城中心半径 24 格聚类，3 格内相邻设施并入代表设施；
  // 接驳口 / 跑道 / 有停用年 / 铁路与机场枢纽不参与合并；外围补充见下方 push。
  (function (data) {
    var fs = data.facilities, drop = {'cd_hot_2':1};
    for (var i = fs.length - 1; i >= 0; i--) if (drop[fs[i].id]) fs.splice(i, 1);
    var upd = {
      'cd-wuhou': { w: 0.042, note: "市中心热点合并：含 锦里（需求并入本设施，位置以本设施为准）" },
    };
    for (var j = 0; j < fs.length; j++) { var u = upd[fs[j].id]; if (u) for (var k in u) fs[j][k] = u[k]; }
    data.facilities.push(
      { id: 'cd_outer_1', n: '望丛祠', t: 'scenic', at: [28.9, 57.6], w: 0.012, note: '郫都纪念古蜀望帝丛帝的祠庙' },
      { id: 'cd_outer_2', n: '宝光寺', t: 'scenic', at: [139.4, 50.6], w: 0.012, note: '新都唐代名刹与罗汉堂' },
      { id: 'cd_outer_3', n: '洛带古镇', t: 'scenic', at: [201.3, 133.5], w: 0.014, note: '龙泉驿客家古镇与会馆群' },
      { id: 'cd_outer_4', n: '黄龙溪古镇', t: 'scenic', at: [64.5, 275.1], w: 0.014, note: '双流南部千年水乡码头' },
      { id: 'cd_outer_5', n: '青白江凤凰湖', t: 'park', at: [173.9, 23.5], w: 0.01, note: '青白江城区湿地公园' },
      { id: 'cd_outer_6', n: '国色天乡', t: 'scenic', at: [19.1, 111], y0: 2005, w: 0.012, note: '温江 2005 年开园的主题乐园' },
    );
  })(CM.MAP_LIST.find(function (m) { return m.id === 'cd'; }).data);
})(window.CM);
