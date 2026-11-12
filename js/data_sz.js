'use strict';
// 深圳社区地图：地形、分期填海、需求、经济和造价均为可玩性近似。
(function (CM) {
  const G = CM.GEOS.sz;
  const box = (x0, y0, x1, y1) => [[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
  const region = (id, name, open, plan, pop, bounds) => ({ id, name, open, plan, pop, poly: box(...bounds) });
  const center = (x, y, pop, jobs, r = 2) => ({ x, y, pop, jobs, r });
  // Port travellers use the existing passenger-hub model. Volumes are gameplay estimates.
  const ports = [
    { id:'sz-luohu-port',name:'罗湖口岸',x:135,y:92,year:1985,pax:[[2000,10],[2007,13],[2020,9]] },
    { id:'sz-futian-port',name:'福田口岸',x:111,y:91,year:2007,y0:[2007,8],pax:[[2007.58,4],[2015,8]] },
    { id:'sz-huanggang-port',name:'皇岗口岸',x:115,y:91,year:1991,pax:[[2000,4],[2015,5]] },
    { id:'sz-wenjindu-port',name:'文锦渡口岸',x:144,y:90,year:1978,pax:[[2000,0.8],[2015,1.4]] },
    { id:'sz-liantang-port',name:'莲塘口岸',x:154,y:88,year:2020,y0:[2023,2],pax:[[2023.08,2],[2030,4]] },
    { id:'sz-shatoujiao-port',name:'沙头角口岸',x:171,y:87,year:1984,pax:[[2000,0.5],[2015,0.8]] },
    { id:'sz-bay',name:'深圳湾口岸',x:76,y:94,year:2007,y0:[2007,7],pax:[[2007.5,3],[2015,6]] },
    { id:'sz-shekou-pier',name:'蛇口客运码头',x:58,y:101,year:2000,pax:[[2000,1],[2015,2]] },
  ];
  const data = {
    lineColorsNice: CM.DATA.lineColorsNice,
    city: '深圳', riverName: '深圳河', seaName: '深圳湾', hsrYear: 2011,
    stages: [[2004,'特区起步'],[2010,'多中心扩张'],[2020,'湾区联动']], stageLast: '模拟未来',
    briefing: {
      lead: '2000 年深圳尚无地铁。罗湖、华强北、福田与南山沿东西向走廊分布，北部组团被山体隔开。前海和后海的部分土地将在游戏内分期成陆。',
      modes: [['metro','地铁','从零建设线网。'],['bus','地面交通','深南大道贯穿东西，外围组团需要接入。'],['rail','铁路与口岸','深圳站和罗湖口岸产生接驳需求，深圳北站稍后启用。']],
    },
    regions: [
      region('qianhai','前海合作区',2010,'mix',320000,[37,76,51,92]),
      region('houhai','后海总部基地',2007,'cbd',250000,[65,87,80,99]),
      region('luohu','罗湖与东门',2000,'mix',730000,[125,67,149,95]),
      region('futian','福田与华强北',2000,'mix',950000,[93,64,125,94]),
      { ...region('nanshan','南山与科技园',2000,'mix',780000,[50,66,93,105]), geo:{admin:'西丽街道'}, streets:['西丽街道','桃源街道'] },
      region('baoan','宝安与西乡',2000,'mix',850000,[28,43,59,82]),
      region('airport','宝安机场与福永',2000,'mix',380000,[26,25,49,47]),
      region('shajing','沙井与松岗',2004,'res',660000,[28,0,55,26]),
      { ...region('guangming','光明科学城',2007,'mix',560000,[55,6,90,38]), geo:{admin:'光明区'} },
      { ...region('bantian','坂田与布吉',2000,'mix',680000,[120,35,151,67]), geo:{admin:'坂田街道'} },
      region('longhua','龙华与民治',2000,'mix',780000,[91,24,120,64]),
      region('longgang','横岗与龙岗中心城',2000,'mix',950000,[151,20,192,65]),
      region('yantian','盐田港与沙头角',2000,'mix',260000,[165,75,200,94]),
      region('pingshan','坪山',2009,'mix',490000,[192,32,219,67]),
      region('guanlan','观澜',2004,'mix',350000,[92,0,128,24]),
      region('pinghu','平湖',2004,'mix',280000,[128,14,159,35]),
      region('shiyan','石岩',2004,'resind',270000,[48,26,77,50]),
      region('kengzi','坑梓',2009,'resind',250000,[210,15,237,49]),
      region('dapeng','葵涌与大鹏',2011,'mix',185000,[209,65,250,95]),
      region('nanao','南澳',2011,'res',85000,[236,95,266,125]),
    ],
    places: G.places,
    plans: CM.DATA.plans,
    rural: { pop: 450, jobs: 130 }, simRoads: [],
    defaultRegion: { id: 'outer', name: '外围组团', open: 2010, plan: 'res', pop: 1800000 },
    reclaim: [
      { id:'sz-houhai', tag:'模拟', name:'后海沿岸', year:2007, poly:box(68,89,79,97), desc:'后海滨水开发地块分期成陆，边界和开放年份为游戏近似。' },
      { id:'sz-qianhai', tag:'模拟', name:'前海湾沿岸', year:2010, poly:box(39,77,49,87), desc:'前海沿岸开发地块成陆，为轨道枢纽和商务区预留空间。' },
      { id:'sz-airport', tag:'模拟', name:'机场西侧平台', year:2011, poly:box(25,28,31,41), desc:'机场西侧扩建平台成陆，范围为游戏近似。' },
    ],
    centers: [
      center(135,79,42000,59000),center(119,74,42000,75000),center(108,76,38000,68000),center(94,79,32000,35000),
      center(72,76,35000,66000),center(59,74,48000,38000),center(59,99,27000,32000),center(47,73,54000,33000),
      center(43,59,48000,35000),center(32,32,12000,35000),center(40,17,33000,30000),center(68,22,25000,23000),
      center(103,53,42000,21000),center(104,39,51000,26000),center(127,48,41000,50000),center(143,62,54000,29000),
      center(162,51,43000,30000),center(180,38,55000,38000),center(181,83,21000,30000),center(195,51,27000,23000),
      center(47,82,20000,63000),center(74,91,24000,58000),
      center(113,14,24000,18000),center(145,28,24000,17000),center(61,32,22000,16000),
      center(217,38,22000,19000),center(222,69,15000,12000),center(235,72,12000,8000),center(248,100,9000,5000),
    ],
    landmarks: [
      { id:'sz-station',name:'深圳站',kind:'rail',x:135,y:87,w:180,d:100,year:1990 },
      { id:'sz-north',name:'深圳北站',kind:'rail',x:103,y:53,w:240,d:160,year:2011 },
      { id:'sz-civic',name:'市民中心',kind:'cbd',x:108,y:76,w:200,d:115,year:2004 },
      { id:'sz-window',name:'世界之窗',kind:'scenic',x:80,y:78,w:110,d:85,year:1994 },
      { id:'sz-pingshan',name:'深圳坪山站',kind:'rail',x:202,y:44,w:210,d:115,year:2013 },
    ].concat(ports.map(({ id, name, x, y, year }) => ({ id, name, x, y, year, kind:'rail', w:130, d:85 }))),
    facilities: [
      { id:'sz-station',n:'深圳站',t:'rail',at:[135,87],pax:[[2000,5],[2020,7]] },
      { id:'sz-north',n:'深圳北站',t:'rail',at:[103,53],y0:[2011,12],pax:[[2011.9,5],[2020,17]] },
      { id:'sz-air',n:'宝安机场',t:'air',at:[32,32],pax:[[2000,2],[2013,6],[2020,10]] },
      { id:'sz-window',n:'世界之窗',t:'scenic',at:[80,78],w:0.035 },
      { id:'sz-pingshan',n:'深圳坪山站',t:'rail',lm:'sz-pingshan',y0:[2013,12],pax:[[2013.92,1.2],[2030,4]] },
    ].concat(ports.map(({ id, name, y0, pax }) => ({ id, n:name, t:'rail', lm:id, y0, pax, note:'口岸接驳量为游戏估算。' }))),
    roadYears: {}, bridgeDefaultYear: 2000, bridgeYears: { '深圳湾大桥':2007 },
    events: [
      { y:2000,m:1,tag:'史实',title:'2000 年的深圳',desc:'罗湖、福田与南山组成狭长的中心走廊，深圳尚无地铁。' },
      { y:2004,m:12,tag:'史实',title:'深圳进入地铁时代',desc:'12 月 28 日，1 号线罗湖至世界之窗、4 号线福民至少年宫开通。本局线路由玩家建设。',src:'https://www.sz.gov.cn/cn/xxgk/zfxxgj/zwdt/content/post_10280298.html' },
      { y:2007,m:7,tag:'史实',title:'深圳湾口岸开放',desc:'深圳湾口岸正式启用，西部沿海走廊出现新的接驳需求。',fx:{grow:{region:['nanshan','houhai'],jobs:1.18,years:4}} },
      { y:2007,m:8,tag:'史实',title:'福田口岸开放',desc:'新的陆路口岸分担深港通关需求。',fx:{grow:{region:'futian',jobs:1.12,years:3}} },
      { y:2011,m:12,tag:'史实',title:'深圳北站启用',desc:'龙华出现新的铁路换乘中心。',fx:{grow:{region:'longhua',pop:1.24,jobs:1.2,years:5}} },
      { y:2020,m:8,tag:'史实',title:'莲塘口岸开通货检',desc:'深港东部新增跨境通道。旅检接驳客流在 2023 年 2 月启用。' },
      { y:2023,m:2,tag:'史实',title:'莲塘口岸启用旅检',desc:'莲塘新增跨境旅客接驳需求。' },
      { y:2013,m:11,tag:'史实',title:'宝安机场 T3 投入使用',desc:'11 月 28 日，客运从机场东一侧的 A/B 航站楼转到 T3。接驳客流随之迁移。',fx:{demand:{hub:1.15,months:12}} },
      { y:2001,m:9,tag:'史实',title:'黄田机场更名',desc:'9 月 18 日，深圳黄田国际机场更名为深圳宝安国际机场，航站楼位置不变。' },
      { y:2021,m:12,tag:'史实',title:'宝安机场卫星厅启用',desc:'12 月 7 日，T3 北侧卫星厅投入使用，通过空侧捷运连接 T3，公共交通仍在 T3 一侧接驳。' },
      {y:2011,m:8,tag:'史实',title:'深圳举办世界大学生运动会',desc:'深圳湾体育中心举办开幕式，龙岗大运中心承办多项赛事。赛时休闲出行增加，场馆赛后继续使用。',fx:{demand:{lz:1.15,months:1},grow:{region:['houhai','longgang'],jobs:1.08,years:3}}},
      {y:2018,m:9,tag:'史实',title:'广深港高铁香港段开通',desc:'福田、深圳北接入通往香港西九龙的跨境高铁服务。',fx:{demand:{hub:1.08,months:12}}},
    ],
    eras: [
      { id:'sz-e1',from:2000,name:'特区起步',tag:'史实',summary:'沿深南大道形成东西走廊，外围组团发展参数为估算。',grow:{jobs:{futian:1.4,nanshan:1.35},pop:{baoan:1.3,longhua:1.25}} },
      { id:'sz-e2',from:2004,name:'多中心扩张',tag:'史实',summary:'地铁、口岸和新城区陆续发展。增长倾向为模拟参数。',grow:{jobs:{nanshan:1.5,houhai:1.6,longgang:1.2},pop:{baoan:1.4,longhua:1.45,longgang:1.3}} },
      { id:'sz-e3',from:2010,name:'湾区联动',tag:'史实',summary:'前海、深圳北站与机场成为新的出行节点。',grow:{jobs:{qianhai:2,houhai:1.6,bantian:1.4},pop:{longhua:1.35,guangming:1.4,pingshan:1.4}} },
      { id:'sz-e4',from:2020,name:'模拟未来',tag:'模拟',summary:'人口、岗位和经济变化由模型推演。',grow:{jobs:{qianhai:1.5,guangming:1.35,pingshan:1.35},pop:{guangming:1.3,pingshan:1.3}} },
    ],
    histTasks: [],
    taskNote:'历史任务参考深圳各发展阶段的交通需求，允许自行选择线路与换乘。',
    scenarios: [{
      id:'sz-sc1',theme:'深圳：沿海与新城',title:'用有限预算打通深南走廊',type:'budgetConnect',
      from:[2000,1],to:[2006,12],months:60,rewardMonths:3,budgetX:1.3,
      anchors:[['罗湖',4],['市民中心',4],['科技园',4]],
      desc:'用有限预算打通东西向通勤走廊。',tips:['先连成熟街区，再延伸到填海新城。'],
    }],
  };
  (CM.MAP_LIST = CM.MAP_LIST || []).push(CM.alignCommunityMap({
    id:'sz',name:'深圳',title:'深圳 · 2000',sub:'社区地图 · 2000 年起 · 人民币',
    desc:'从罗湖到福田起步，随就业西移、双航站楼接驳和填海扩展深圳地铁，向东可修至大鹏。',
    intro:data.briefing.lead,region:'中国内地',tagline:'从深南大道到前海与龙岗',difficulty:3,
    tags:['社区版','填海造陆','口岸与枢纽'],kind:'real',mapVersion:2,scenario:'sz-2000',modes:['challenge','free'],
    extent: { from:1, dx:0, dy:0, oldW:208, oldH:128, note:'向东扩展至大鹏半岛，既有站线坐标不变',
      oldRegionIds:['qianhai','houhai','luohu','futian','nanshan','baoan','airport','shajing','guangming','longhua','bantian','longgang','yantian','pingshan','outer'],
      oldLandmarkIds:['sz-station','sz-north','sz-civic','sz-window','sz-bay'] },
    facts:[['范围','68 km × 32 km'],['起始','2000 年'],['人口','约 650 万'],['模式','经营挑战 / 自由建造']],
    features:[['wave','历史海岸线','前海、后海与机场分期成陆'],['flag','城市任务','连接特区与外围组团'],['building','枢纽启用','口岸、机场与深圳北站带来新客流']],
    highlights:[[2004,'深圳地铁首期开通'],[2007,'深圳湾口岸开放'],[2011,'深圳北站启用'],[2013,'机场 T3 启用']],
    geo:G,data,econ:{devOffset:5,money:1},cam:{cx:119,cy:66,zoom:12},
    cfg:{
      W:272,H:128,ZONE:4,START:{y:2000,m:1,d:1,minute:360},econBase:2000,
      growth:Object.assign({},CM.CFG.growth,{histEnd:2020,popCurve:[[2000,6.5e6],[2005,8.2e6],[2010,10.3e6],[2020,15.5e6],[2040,17e6],[2300,18e6]],jobsRatio:[[2000,0.56],[2010,0.59],[2020,0.61]]}),
      // 2004 年首期 2 元起、全程 5 元。用等距区段近似当年的按站间区间收费。
      fareDefault:{mode:'flat',flat:2},fareRange:{min:0,max:12,step:0.1,scale:true},
      fareDist:{km0:3.5,step:4.5,inc:0.5,cap:2.5},
      economy:Object.assign({},CM.CFG.economy,{startFunds:560000,grantBase:[[2000,32000],[2005,51000],[2010,85000],[2020,150000],[2050,220000]]}),
      macro:{
        area:'深圳社区地图范围',region:'中国内地',gdp0:16600000,revRatio:[[2000,0.16],[2010,0.19],[2020,0.21],[2040,0.2]],revElastic:1.4,
        prod:[[2000,0.095],[2008,0.082],[2015,0.065],[2020,0.045],[2050,0.018]],infl:'cn',ref:'cn',histEnd:2020,longRun:{infl:0.02},
        struct:{trade:0.9,fin:0.65,ind:0.8,tour:0.25,prop:0.7},
        events:[{id:'wto2001',y:2001,m:12},{id:'sars2003',y:2003,m:4},{id:'gfc2008',y:2008,m:9,desc:'外需下滑，出口制造业订单承压。'},{id:'stim2008',y:2008,m:11},{id:'cnstock2015',y:2015,m:6},{id:'trade2018',y:2018,m:7},{id:'covid2020',y:2020,m:1}],
      },
    },
  }));

  // 补充热点地区（2026-11-12）：知名但此前未列入「重要设施」的地点。
  // 坐标取自 OSM 底图同名点，缺失时按经纬度投影；规模按同城同类设施的中低档取值。
  // 追加在数组末尾，不打乱既有设施顺序；引擎按 id 生成缓存键，旧存档不受影响。
  (function (data) {
    data.facilities.push(
      { id: 'sz_hot_1', n: '锦绣中华·中国民俗文化村', t: 'scenic', at: [101.1, 155.4], y0: 1989, w: 0.024, note: '1989 年锦绣中华开园，1991 年民俗村开放' },
      { id: 'sz_hot_2', n: '欢乐谷', t: 'scenic', at: [101.9, 151], y0: 1998, w: 0.022, note: '1998 年开园' },
      { id: 'sz_hot_3', n: '华强北商圈', t: 'shop', at: [147, 147.5], w: 0.045, note: '电子与零售商业街' },
      { id: 'sz_hot_4', n: '东门老街', t: 'shop', at: [157.8, 147.7], w: 0.036, note: '罗湖老城传统商业街' },
      { id: 'sz_hot_5', n: '莲花山公园', t: 'park', at: [135.2, 142.1], w: 0.016, note: '福田中心区城市公园' },
      { id: 'sz_hot_6', n: '深圳大学', t: 'uni', at: [84.3, 153.2], w: 0.028, note: '1983 年创办，南山后海' },
      { id: 'sz_hot_7', n: '深圳会展中心', t: 'venue', at: [134.1, 152.1], y0: 2004, w: 0.02, note: '2004 年启用，福田中心区' },
      { id: 'sz_hot_8', n: '大梅沙海滨公园', t: 'park', at: [235.5, 125.7], w: 0.014, note: '盐田东部海滨' },
      { id: 'sz_hot_9', n: '深圳野生动物园', t: 'scenic', at: [98.2, 131.9], y0: 1993, w: 0.014, note: '1993 年开园，西丽' },
      { id: 'sz_hot_10', n: '深圳湾体育中心', t: 'stadium', at: [87.5, 158.5], y0: 2011, w: 0.016, note: '2011 年大运会场馆' },
    );
  })(CM.MAP_LIST.find(function (m) { return m.id === 'sz'; }).data);

  // 原版 v2.7.0 的历史设施、任务及机场资料按本图投影重定位。
  const { lon0, lat0, kx, ky } = G.proj;
  const ll = (lat, lon) => [+((lon - lon0) * kx).toFixed(2), +((lat0 - lat) * ky).toFixed(2)];
  const exactAnchor = (name, lat, lon, r) => { const [x, y] = ll(lat, lon); return { name, x, y, r }; };
  const houhai = data.regions.find(r => r.id === 'houhai');
  houhai.poly = [houhai.poly, [
    ll(22.528, 113.933), ll(22.528, 113.954),
    ll(22.513, 113.954), ll(22.513, 113.933),
  ]];

  data.facilities.push(
      { id: 'sz_east', n: '深圳东站（布吉）', t: 'rail', at: ll(22.6049, 114.1144), pax: [[2000, 0.6], [2006, 1.5], [2011, 3], [2019, 4], [2030, 4]], note: '原布吉站，承担大量普速列车（旅客量为估算）。' },
      { id: 'sz_futian', n: '福田站', t: 'rail', at: ll(22.5423, 114.0497), y0: [2015, 12], pax: [[2016, 1], [2019, 3], [2030, 4]], note: '2015 年底启用的地下高铁车站。' },
      { id: 'sz_gmc', n: '光明城站', t: 'rail', at: ll(22.7356, 113.9499), y0: [2011, 12], pax: [[2012, 0.2], [2019, 0.8], [2030, 1.5]] },
      { id: 'sz_unicity', n: '深圳大学城', t: 'uni', at: ll(22.5930, 113.9680), r: 1.6, y0: [2003, 9], w: [[2003.7, 0.006], [2010, 0.02]] },
      { id: 'sz_sustech', n: '南方科技大学', t: 'uni', at: ll(22.6034, 113.9975), y0: [2011, 3], w: [[2011.2, 0.003], [2020, 0.015]] },
      { id: 'sz_cuhk', n: '香港中文大学（深圳）', t: 'uni', at: ll(22.6914, 114.2035), y0: [2014, 9], w: 0.008 },
      { id: 'sz_rmyy', n: '深圳市人民医院', t: 'hosp', at: ll(22.5599, 114.1229), w: 0.05 },
      { id: 'sz_pku', n: '北京大学深圳医院', t: 'hosp', at: ll(22.5591, 114.0440), w: 0.045 },
      { id: 'sz_hku', n: '香港大学深圳医院', t: 'hosp', at: ll(22.5281, 113.9911), y0: [2012, 7], w: 0.04 },
      { id: 'sz_nsyy', n: '南山区人民医院', t: 'hosp', at: ll(22.5337, 113.9178), w: 0.03 },
      { id: 'sz_bayy', n: '宝安区人民医院', t: 'hosp', at: ll(22.5649, 113.9094), w: 0.03 },
      { id: 'sz_lgyy', n: '龙岗中心医院', t: 'hosp', at: ll(22.7388, 114.2785), w: 0.03 },
      { id: 'sz_coastal', n: '海岸城·南山商圈', t: 'shop', at: ll(22.5203, 113.9309), y0: [2007, 12], w: [[2008, 0.015], [2015, 0.04]] },
      { id: 'sz_bacs', n: '宝安中心商圈', t: 'shop', at: ll(22.5554, 113.8829), y0: [2012, 1], w: [[2012, 0.008], [2018, 0.03]] },
      { id: 'sz_lcgc', n: '龙城广场商圈', t: 'shop', at: ll(22.7197, 114.2498), w: [[2000, 0.008], [2015, 0.025]] },
      { id: 'sz_lhcs', n: '龙华商圈', t: 'shop', at: ll(22.6543, 114.0173), y0: 2005, w: 0.015 },
      { id: 'sz_bjcs', n: '布吉商圈', t: 'shop', at: ll(22.6044, 114.1165), w: 0.012 },
      { id: 'sz_chegong', n: '车公庙', t: 'cbd', at: ll(22.5388, 114.0227), w: [[2000, 0.008], [2015, 0.02]] },
      { id: 'sz_foxconn', n: '富士康龙华科技园', t: 'cbd', at: ll(22.6540, 114.0440), w: [[2000, 0.012], [2010, 0.022], [2015, 0.015]] },
      { id: 'sz_keji', n: '南山科技园', t: 'cbd', at: ll(22.5440, 113.9480), w: [[2000, 0.006], [2010, 0.03], [2020, 0.05]] },
      { id: 'sz_bantian', n: '坂田华为基地', t: 'cbd', at: ll(22.6528, 114.0557), y0: [2003, 1], w: [[2003, 0.004], [2012, 0.018]] },
      { id: 'sz_hqbase', n: '后海总部基地', t: 'cbd', at: ll(22.5205, 113.9420), y0: [2012, 1], w: [[2012, 0.004], [2020, 0.03]] },
      { id: 'sz_liuxian', n: '留仙洞总部基地', t: 'cbd', at: ll(22.5805, 113.9345), y0: [2015, 1], w: [[2015, 0.002], [2020, 0.012]] },
      { id: 'sz_qh', n: '前海商务区', t: 'cbd', at: ll(22.5335, 113.8930), y0: [2013, 1], w: [[2013, 0.001], [2017, 0.012], [2020, 0.03], [2030, 0.05]] },
      { id: 'sz_uni', n: '大运中心', t: 'stadium', at: ll(22.6975, 114.212), y0: [2011, 8], w: [[2011.5833, 0.03], [2011.6667, 0.008]], note: '2011 年 8 月第 26 届世界大学生夏季运动会主会场。' },
      { id: 'sz_iec', n: '深圳国际会展中心', t: 'venue', at: ll(22.7012, 113.7693), y0: [2019, 9], w: 0.012 },
  );
  // 延用现有 ID，保留已有设施引用并更新老城商圈随年代的变化。
  Object.assign(data.facilities.find(f => f.id === 'sz_hot_3'), {
    at: ll(22.5475, 114.0825), w: [[2000, 0.045], [2012, 0.052], [2014, 0.028], [2018, 0.040]],
  });
  Object.assign(data.facilities.find(f => f.id === 'sz_hot_4'), {
    at: ll(22.5482, 114.1137), w: [[2000, 0.036], [2020, 0.028]],
  });
  Object.assign(data.facilities.find(f => f.id === 'sz-air'), {
    pax: [[2013.84, 3.8], [2016, 4.6], [2019, 6.2], [2020, 4.5], [2030, 8]],
  });

  // 用 Starry 现有片区 ID，保持原图的行政分区和大鹏覆盖。
  data.eras[0].corridors = [{ a:'luohu', b:'futian', f:1.18 }, { a:'bantian', b:'luohu', f:1.15 }];
  data.eras[1].corridors = [{ a:'baoan', b:'nanshan', f:1.22 }, { a:'longhua', b:'futian', f:1.20 }, { a:'futian', b:'nanshan', f:1.20 }, { a:'bantian', b:'futian', f:1.15 }];
  data.eras[2].corridors = [{ a:'longhua', b:'nanshan', f:1.25 }, { a:'bantian', b:'futian', f:1.18 }, { a:'baoan', b:'qianhai', f:1.18 }, { a:'futian', b:'houhai', f:1.15 }];
  data.eras[3].corridors = [{ a:'guangming', b:'nanshan', f:1.16 }, { a:'baoan', b:'qianhai', f:1.22 }, { a:'qianhai', b:'futian', f:1.15 }, { a:'pingshan', b:'longgang', f:1.20 }];

  data.histTasks = [
      { id: 'sz-eastwest', appear: [2000, 1], deadline: [2006, 12], type: 'connect', reward: 80000, title: '首线走廊：罗湖到福田', desc: '连接罗湖口岸、华强路与会展中心，把最繁忙的东西走廊接起来。', anchors: [exactAnchor('罗湖', 22.5333, 114.1132, 3), exactAnchor('华强路', 22.5431, 114.0800, 3), exactAnchor('会展中心', 22.5375, 114.0563, 3)] },
      { id: 'sz-futian-port', appear: [2004, 1], deadline: [2009, 12], type: 'connect', reward: 60000, title: '福田口岸接入中心区', desc: '落马洲支线即将开通，连接福田口岸、福民与市民中心。', anchors: [exactAnchor('福田口岸', 22.5184, 114.0641, 3), exactAnchor('福民', 22.5279, 114.0631, 3), exactAnchor('市民中心', 22.5433, 114.0567, 3)] },
      { id: 'sz-tech', appear: [2004, 1], deadline: [2011, 7], type: 'connect', reward: 70000, title: '通往南山科技园', desc: '岗位向西转移，连接车公庙、世界之窗与高新园。', anchors: [exactAnchor('车公庙', 22.5388, 114.0227, 3), exactAnchor('世界之窗', 22.5399, 113.9693, 3), exactAnchor('高新园', 22.5432, 113.9491, 3)] },
      { id: 'sz-old-air', appear: [2006, 1], deadline: [2011, 6], type: 'connect', reward: 70000, title: '机场接入市区', desc: '连接机场东、西乡和宝安中心，服务第一代航站楼。', anchors: [exactAnchor('机场东', 22.6500, 113.8176, 3), exactAnchor('宝安中心', 22.5576, 113.8823, 3), exactAnchor('西乡', 22.5791, 113.8570, 3)] },
      { id: 'sz-longgang', appear: [2007, 1], deadline: [2011, 7], type: 'connect', reward: 80000, title: '大运会：通到龙岗', desc: '2011 年 8 月大运会开幕前，连接大运中心、布吉与老街。', anchors: [exactAnchor('大运', 22.6885, 114.2233, 3), exactAnchor('布吉', 22.6044, 114.1165, 3), exactAnchor('老街', 22.5473, 114.1109, 3)] },
      { id: 'sz-north', appear: [2009, 1], deadline: [2014, 12], type: 'connect', reward: 70000, title: '深圳北站枢纽', desc: '高铁开进深圳北站后，连接深圳北站、民治与福田中心区。', anchors: [exactAnchor('深圳北站', 22.6135, 114.0257, 3), exactAnchor('民治', 22.6204, 114.0361, 3), exactAnchor('市民中心', 22.5433, 114.0567, 3)] },
      { id: 'sz-qianhai', appear: [2011, 1], deadline: [2017, 12], type: 'connect', reward: 80000, title: '前海与后海', desc: '两片填海新城都在盖楼，连接前海湾、南山与后海。', anchors: [exactAnchor('前海湾', 22.5403, 113.8928, 3), exactAnchor('南山', 22.5272, 113.9187, 3), exactAnchor('后海', 22.5213, 113.9382, 3)] },
      { id: 'sz-bantian', appear: [2012, 1], deadline: [2019, 12], type: 'connect', reward: 80000, title: '坂田上班路', desc: '华为基地周边的通勤需求很大，连接坂田、岗厦北与福田口岸。', anchors: [exactAnchor('坂田', 22.6300, 114.0651, 3), exactAnchor('岗厦北', 22.5434, 114.0643, 3), exactAnchor('福田口岸', 22.5184, 114.0641, 3)] },
      { id: 'sz-air', appear: [2014, 1], deadline: [2016, 12], type: 'connect', reward: 90000, title: 'T3 接入市区', desc: 'T3 启用后，连接机场、前海湾与车公庙，复现后来机场线所服务的走廊，任意运营线路连通即可。', anchors: [exactAnchor('机场', 22.6264, 113.8090, 3), exactAnchor('前海湾', 22.5403, 113.8928, 3), exactAnchor('车公庙', 22.5388, 114.0227, 3)] },
      { id: 'sz-guangming', appear: [2015, 1], deadline: [2022, 12], type: 'connect', reward: 80000, title: '光明接入南山', desc: '光明的新产业区要和南山连起来，连接光明、西丽与高新园。', anchors: [exactAnchor('光明', 22.7748, 113.9403, 3), exactAnchor('西丽', 22.5837, 113.9494, 3), exactAnchor('高新园', 22.5432, 113.9491, 3)] },
  ];
  data.scenarios.push({
    id:'sz-dapeng-optional', theme:'深圳东部', title:'大鹏接入东部线网', type:'budgetConnect', budgetX:1.5,
    from:[2015,1], to:[2050,12], months:96, rewardMonths:3,
    anchors:[{ name:'葵涌', x:285.6, y:108.8, r:5 }, { name:'大鹏所城', x:308.3, y:125.2, r:5 }],
    desc:'连接葵涌与大鹏所城，探索深圳东部的轨道接驳方案。',
  });
  const air3Poly = [[22.6760, 113.7690], [22.6660, 113.7756], [22.6090, 113.8080], [22.6030, 113.7990], [22.6680, 113.7620]];
  data.reclaim.push({ id:'sz-airport-third', name:'机场第三跑道填海', year:2024, sea:'伶仃洋',
    poly:air3Poly.map(([lat, lon]) => ll(lat, lon)), desc:'第三跑道填海平台在 2024 年成陆。' });
  data.runways.push({ a:ll(22.6301, 113.7922), b:ll(22.6591, 113.7763), from:2025 + 10/12, airfieldWidth:1.35 });
  data.terrainRevision = 3;
  data.events.push(
      { y: 2003, m: 1, tag: '史实', title: '华为基地迁入坂田', desc: '2000 年代初华为把研发和生产基地集中到坂田，关外开始出现高科技就业中心。', fx: { grow: { region: 'bantian', jobs: 1.4, years: 6 } } },
      { y: 2019, m: 9, tag: '史实', title: '深圳国际会展中心启用', desc: '世界最大规模的会展中心之一在宝安海边的新土地上启用。', fx: { grow: { region: 'shajing', jobs: 1.4, years: 6 } } },
      { y: 2025, m: 11, tag: '史实', title: '宝安机场第三跑道投运', desc: '11 月 29 日，深圳机场第三跑道正式投运。', src: 'https://www.sz.gov.cn/cn/xxgk/zfxxgj/bmdt/content/post_12527447.html' },
  );
  data.events.push(
    { y:2010, m:12, tag:'史实', title:'深圳轨道线网向龙岗扩展', desc:'3 号线首通段由草埔至双龙。同日 2 号线开通赤湾至世界之窗段。', src:'https://www.sz.gov.cn/cn/xxgk/zfxxgj/zwdt/content/post_10280298.html' },
    { y:2013, m:3, tag:'史实', title:'华强北路封闭施工', desc:'地铁施工期间商街分段围挡，购物热点吸引力暂时回落。' },
    { y:2017, m:1, tag:'史实', title:'华强北步行街重新开放', desc:'施工围挡结束，商业街重新开放，购物出行逐步恢复。' },
  );
  data.events.sort((a, b) => a.y - b.y || a.m - b.m);

  // 热点地区调整（2026-11-12）：市中心合并 + 外围补充。
  // 代表设施保留原 id；被合并设施从数组移除，需求按 w/pax 叠加。
  // 市中心按传统老城中心半径 22 格聚类，3 格内相邻设施并入代表设施；
  // 接驳口 / 跑道 / 有停用年 / 铁路与机场枢纽不参与合并；外围补充见下方 push。
  (function (data) {
    data.facilities.push(
      { id: 'sz_outer_1', n: '大芬油画村', t: 'shop', at: [165.8, 116.8], w: 0.016, note: '1990 年代形成的油画产业村落' },
      { id: 'sz_outer_2', n: '甘坑古镇', t: 'scenic', at: [152.5, 102], w: 0.014, note: '龙岗甘坑客家小镇' },
      { id: 'sz_outer_3', n: '东部华侨城', t: 'scenic', at: [227.5, 114.2], y0: 2007, w: 0.018, note: '2007 年开放的盐田山地度假区' },
      { id: 'sz_outer_4', n: '观澜版画基地', t: 'scenic', at: [131.5, 71.9], w: 0.012, note: '观澜客家墟市与版画工坊' },
      { id: 'sz_outer_5', n: '光明小镇', t: 'park', at: [82.2, 57], w: 0.01, note: '光明区田园与农场片区' },
      { id: 'sz_outer_6', n: '大鹏所城', t: 'scenic', at: [308.3, 125.2], w: 0.012, note: '明代海防军事所城' },
    );
  })(CM.MAP_LIST.find(function (m) { return m.id === 'sz'; }).data);

})(window.CM);


