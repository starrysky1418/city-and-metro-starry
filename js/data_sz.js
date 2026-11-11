'use strict';
// 深圳社区地图：地形、分期填海、需求、经济和造价均为可玩性近似。
(function (CM) {
  const G = CM.GEOS.sz;
  const box = (x0, y0, x1, y1) => [[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
  const region = (id, name, open, plan, pop, bounds) => ({ id, name, open, plan, pop, poly: box(...bounds) });
  const anchor = (name, x, y, r = 4) => ({ name, x, y, r });
  const center = (x, y, pop, jobs, r = 2) => ({ x, y, pop, jobs, r });
  const task = (id, from, to, title, desc, anchors, reward) =>
    ({ id, appear: [from, 1], deadline: [to, 12], type: 'connect', title, desc, anchors, reward });
  const luohu = anchor('罗湖',135,86), civic = anchor('市民中心',108,76), tech = anchor('科技园',72,76);
  const north = anchor('深圳北站',103,53), qianhai = anchor('前海',47,82), baoan = anchor('宝安中心',47,73);
  const airport = anchor('宝安机场',32,32), longgang = anchor('龙岗中心城',180,38);
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
      { ...region('nanshan','南山与科技园',2000,'mix',780000,[50,66,93,105]), streets:['西丽街道','桃源街道'] },
      region('baoan','宝安与西乡',2000,'mix',850000,[28,43,59,82]),
      region('airport','宝安机场与福永',2000,'mix',380000,[26,25,49,47]),
      region('shajing','沙井与松岗',2004,'res',660000,[28,0,55,26]),
      region('guangming','光明科学城',2007,'mix',560000,[55,6,90,38]),
      region('longhua','龙华与民治',2000,'mix',780000,[91,24,120,64]),
      region('bantian','坂田与布吉',2000,'mix',680000,[120,35,151,67]),
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
      { y:2004,m:12,tag:'史实',title:'深圳进入地铁时代',desc:'现实中的深圳地铁首期在这一年开通。本局线路由玩家建设。' },
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
    histTasks: [
      task('sz-eastwest',2000,2006,'深南大道骨干','连接罗湖、市民中心与南山科技园。',[luohu,civic,tech],65000),
      task('sz-longgang',2005,2013,'龙岗进入线网','连接龙岗中心城、布吉和罗湖。',[longgang,anchor('布吉',143,62),luohu],60000),
      task('sz-bay',2007,2014,'深圳湾口岸接驳','连接深圳湾口岸、科技园与市民中心。',[anchor('深圳湾口岸',76,94),tech,civic],60000),
      task('sz-north',2011,2016,'深圳北站枢纽','连接深圳北站、市民中心与深圳站。',[north,civic,luohu],65000),
      task('sz-qianhai',2010,2019,'前海与宝安','把新成陆的前海接入宝安中心和科技园。',[qianhai,baoan,tech],65000),
      task('sz-air',2013,2020,'机场走廊','连接宝安机场、宝安中心和市民中心。',[airport,baoan,civic],70000),
    ],
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
    desc:'从深南大道起步，随填海、新区、铁路枢纽与经济周期扩展深圳地铁。',
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
fareDefault:{mode:'flat',flat:2},fareRange:{min:0,max:12,step:0.1,scale:true},
      fareDist:{km0:4,step:5,inc:0.5,cap:2.5},
      economy:Object.assign({},CM.CFG.economy,{startFunds:560000,grantBase:[[2000,32000],[2005,51000],[2010,85000],[2020,150000],[2050,220000]]}),
      macro:{
        area:'深圳社区地图范围',region:'中国内地',gdp0:16600000,revRatio:[[2000,0.16],[2010,0.19],[2020,0.21],[2040,0.2]],revElastic:1.4,
        prod:[[2000,0.095],[2008,0.082],[2015,0.065],[2020,0.045],[2050,0.018]],infl:'cn',ref:'cn',histEnd:2020,longRun:{infl:0.02},
        struct:{trade:0.9,fin:0.65,ind:0.8,tour:0.25,prop:0.7},
        events:[{id:'wto2001',y:2001,m:12},{id:'sars2003',y:2003,m:4},{id:'gfc2008',y:2008,m:9,desc:'外需下滑，出口制造业订单承压。'},{id:'stim2008',y:2008,m:11},{id:'cnstock2015',y:2015,m:6},{id:'trade2018',y:2018,m:7},{id:'covid2020',y:2020,m:1}],
      },
    },
  }));
})(window.CM);


