'use strict';
// Singapore community scenario. Buildability dates are gameplay choices.
(function (CM) {
  const geo = CM.GEOS.sg;
  const box = (x0,y0,x1,y1) => [[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
  const region = (id,name,plan,pop,bounds) => ({id,name,plan,pop,open:1985,poly:box(...bounds)});
  const point = (name,r=4) => {
    const [,x,y] = geo.scenarioPlaces.find(p => p[0] === name);
    return {name,x,y,r};
  };
  const facility = (id,name,type,year,extra) => {
    const {x,y} = point(name);
    return {id,name,x,y,year,type,...extra};
  };
  const hubs = [
    facility('sg-changi','樟宜机场','air',1981,{pax:[[1985,3],[2002,7],[2019,16],[2020,6],[2030,18]]}),
    facility('sg-raffles','莱佛士坊','cbd',1980,{w:0.04}),
    facility('sg-orchard','乌节','shop',1980,{w:0.05}),
    facility('sg-sentosa','圣淘沙','scenic',1980,{w:0.035}),
    facility('sg-nus','新加坡国立大学','uni',1980,{w:0.04}),
    facility('sg-marina','滨海湾','venue',2010,{w:0.045}),
  ];
  const connect = (id,year,deadline,title,names,reward) => ({
    id,appear:[year,1],deadline:[deadline,12],type:'connect',title,
    desc:'用地铁连接' + names.join('、') + '。',anchors:names.map(name => point(name)),reward,
  });
  const data = {
    lineColorsNice: CM.DATA.lineColorsNice,
    city:'新加坡',riverName:'新加坡河',seaName:'新加坡海峡',hsrYear:2300,
    places:geo.places,plans:CM.DATA.plans,rural:{pop:260,jobs:90},
    stages:[[1987,'地铁前夜'],[1996,'新镇连网'],[2010,'东北与机场'],[2020,'滨海与西部发展']],stageLast:'模拟未来',
    briefing:{
      lead:'1985 年的新加坡仍靠巴士承担大部分公共交通。开局可在所有陆上组团预建线路，新镇入住和填海仍随年份推进。',
      modes:[['metro','地铁','玩家从零建设，可先搭市区到大巴窑和宏茂桥的主干。'],['bus','巴士','成熟新镇已遍布全岛。'],['plane','机场','樟宜机场在开局即可接入。']],
    },
    regions:[
      {id:'catchment',name:'中央集水区',scenic:true,open:null,woodMin:0.5,relief:95},
      region('marina','滨海湾','cbd',190000,[131,86,147,97]),
      region('jurong-island','裕廊岛','ind',55000,[37,88,62,99]),
      region('cbd','市中心与港湾','cbd',450000,[104,72,137,97]),
      region('central','大巴窑、碧山与宏茂桥','mix',660000,[99,40,132,72]),
      region('west','裕廊与金文泰','mix',690000,[12,53,98,88]),
      region('tengah','登加与蔡厝港','res',290000,[33,34,65,57]),
      region('north','兀兰、三巴旺与义顺','mix',460000,[54,17,110,40]),
      region('northeast','实龙岗、后港、盛港与榜鹅','newtown',530000,[126,24,163,65]),
      region('east','巴耶利峇、勿洛与淡滨尼','mix',690000,[137,45,177,86]),
      region('airport','樟宜与巴西立','mix',240000,[174,40,192,79]),
      region('sentosa','圣淘沙','port',35000,[102,98,118,106]),
    ],
    defaultRegion:{id:'outer',name:'外围陆地',open:1985,plan:'res',pop:450000},
    centers:[
      [128,86,28000,65000],[111,78,26000,44000],[116,66,45000,28000],[111,48,48000,24000],
      [57,67,48000,33000],[47,66,39000,27000],[72,72,38000,27000],[56,54,30000,16000],
      [50,43,27000,13000],[72,22,28000,17000],[100,29,33000,15000],[143,52,30000,14000],
      [148,41,12000,7000],[157,34,6000,4000],[159,70,42000,20000],[169,57,45000,28000],
      [176,46,24000,14000],[184,65,6000,24000],[136,92,4000,32000],[42,51,5000,3500],
      [20,73,9000,22000],[49,93,2500,17000],
    ].map(([x,y,pop,jobs]) => ({x,y,pop,jobs,r:2})),
    reclaim:[
      {id:'sg-bayfront',name:'滨海湾南岸',year:1994,tag:'模拟',poly:box(132,89,143,96),desc:'参考滨海湾填海历史，游戏边界为近似。'},
      {id:'sg-jurong',name:'裕廊岛工业平台',year:2000,tag:'模拟',poly:box(39,89,59,97),desc:'用一次地形变化概括裕廊岛的分期填海。'},
    ],
    landmarks:hubs.map(({id,name,x,y,year,type}) => ({id,name,x,y,year,kind:type==='air'?'rail':type,w:145,d:95})),
    facilities:hubs.map(({id,name,type,pax,w}) => ({id,n:name,t:type,lm:id,pax,w,note:'客流规模为游戏估算。'})),
    roadYears:{},bridgeYears:{},bridgeDefaultYear:1985,simRoads:[],
    eras:[
      {id:'sg-e1',from:1985,name:'地铁前夜',tag:'模拟',summary:'成熟新镇和就业节点已能连线。',grow:{pop:{central:1.3,west:1.25,east:1.25},jobs:{cbd:1.5,west:1.3}}},
      {id:'sg-e2',from:1987,name:'新镇连网',tag:'模拟',summary:'优先连接成熟住宅区和市区。',grow:{pop:{north:1.4,tengah:1.35,east:1.35}}},
      {id:'sg-e3',from:1996,name:'东北与机场',tag:'模拟',summary:'盛港与榜鹅逐渐集聚住宅，机场接驳增长。',grow:{pop:{northeast:1.85},jobs:{airport:1.45,'jurong-island':1.4}}},
      {id:'sg-e4',from:2010,name:'滨海与西部发展',tag:'模拟',summary:'滨海湾、裕廊与登加带来新的出行方向。',grow:{jobs:{marina:1.7,west:1.3},pop:{tengah:1.55,northeast:1.35}}},
      {id:'sg-e5',from:2020,name:'模拟未来',tag:'模拟',summary:'城市增长按游戏规则推演。',grow:{pop:{tengah:1.45,northeast:1.3}}},
    ],
    events:[
      {y:1987,m:11,tag:'史实',title:'新加坡进入地铁时代',desc:'现实中首段地铁连接大巴窑与杨厝港。本局由玩家决定线路。'},
      {y:1996,m:1,tag:'史实',title:'榜鹅 21 规划',desc:'榜鹅转向新镇开发。游戏的增长效果为近似。',fx:{grow:{region:'northeast',pop:1.4,years:8}}},
      {y:2002,m:2,tag:'史实',title:'樟宜机场地铁接驳',desc:'现实中机场获得地铁接驳，游戏中机场早已可建线。',fx:{demand:{hub:1.12,months:12}}},
      {y:2011,m:10,tag:'史实',title:'榜鹅水道开放',desc:'东北部新增滨水休闲节点。',fx:{grow:{region:'northeast',pop:1.15,years:5}}},
      {y:2016,m:9,tag:'模拟',title:'登加新镇开发阶段',desc:'逐步增加西部住宅需求，已建线路继续运行。',fx:{grow:{region:'tengah',pop:1.45,years:12}}},
      {y:1996,m:2,tag:'史实',title:'兀兰地铁延长线开通',desc:'南北线经兀兰连通原有北段与蔡厝港，北部与西部之间新增直达走廊。',fx:{grow:{region:'north',jobs:1.12,years:4}}},
      {y:2008,m:9,tag:'史实',title:'新加坡首次举办 F1 夜赛',desc:'滨海湾街道赛道迎来首届新加坡大奖赛，观赛带来短期休闲出行。',fx:{demand:{lz:1.15,months:1}}},
      {y:2010,m:1,tag:'史实',title:'圣淘沙名胜世界分阶段开放',desc:'综合度假区从酒店开业起陆续启用，圣淘沙新增旅游目的地。',fx:{grow:{region:'sentosa',jobs:1.2,years:4}}},
      {y:2010,m:4,tag:'史实',title:'滨海湾金沙分阶段开放',desc:'滨海湾新增酒店、会展和休闲目的地。',fx:{grow:{region:'marina',jobs:1.2,years:4}}},
    ],
    histTasks:[
      connect('sg-first',1985,1991,'第一条南北骨干',['宏茂桥','大巴窑','市政厅'],28000),
      connect('sg-west',1987,1995,'裕廊连上中心区',['文礼','裕廊东','莱佛士坊'],33000),
      connect('sg-north',1990,2000,'北部新镇接入',['兀兰','义顺','宏茂桥'],35000),
      connect('sg-airport',1996,2006,'樟宜机场接驳',['淡滨尼','樟宜机场','市政厅'],37000),
      connect('sg-ne',1996,2010,'东北新镇',['榜鹅','盛港','实龙岗','多美歌'],40000),
      connect('sg-marina',2010,2018,'滨海湾新中心',['滨海湾','莱佛士坊','港湾'],42000),
      connect('sg-tengah',2016,2030,'登加与西部就业区',['登加','裕廊东','文礼'],44000),
    ],
    taskNote:'组团可在需求成熟前建设。任务按年代出现，不要求复刻现实线路。',
  };
  (CM.MAP_LIST = CM.MAP_LIST || []).push(CM.alignCommunityMap({
    id:'sg',name:'新加坡',title:'新加坡 · 1985',sub:'社区地图 · 1985 年起 · 新加坡元',
    desc:'从成熟新镇到滨海湾、樟宜机场和榜鹅，建设横跨全岛的地铁。',
    intro:data.briefing.lead,region:'新加坡',tagline:'新镇可以先接，需求随后成长',difficulty:2,
    tags:['社区版','全岛规划','填海造陆'],kind:'real',mapVersion:1,scenario:'sg-1985',modes:['challenge','free'],
    facts:[['范围','48 km × 28 km'],['起始','1985 年'],['人口','约 270 万'],['模式','经营挑战 / 自由建造']],
    features:[['map','陆上走廊开局可建','樟宜、兀兰、裕廊、榜鹅都可以提前接入'],['wave','分期填海','滨海湾与裕廊岛分期成陆'],['flag','七项历史任务','按需求和枢纽发展逐年出现']],
    highlights:[[1987,'首段地铁开通'],[1996,'榜鹅 21 规划'],[2002,'樟宜机场地铁接驳'],[2011,'榜鹅水道开放']],
    geo,data,econ:{devOffset:16,money:0.45},cam:{cx:105,cy:65,zoom:13},
    cfg:{
      W:192,H:112,START:{y:1985,m:1,d:1,minute:360},econBase:1985,
      money:{code:'SGD',unit:'新元',wan:'万新元',yi:'亿新元',sym:'S$'},
      growth:Object.assign({},CM.CFG.growth,{histEnd:2020,popCurve:[[1985,2.7e6],[1995,3.5e6],[2005,4.3e6],[2020,5.7e6],[2050,6.6e6],[2300,7e6]],jobsRatio:[[1985,0.46],[2005,0.53],[2020,0.57]]}),
      cost:Object.assign({},CM.CFG.cost,{trackPerKm:{underground:11500,surface:2400,elevated:4900},station:{underground:{S:4900,M:8200,L:13000},surface:{S:1500,M:2400,L:4200},elevated:{S:2600,M:4100,L:6500}},riverPerKm:{underground:8000,surface:5500,elevated:5500}}),
      fareDefault:{mode:'flat',flat:0.50},fareRange:{min:0,max:4,step:0.05,scale:true},
      fareDist:{km0:4,step:4,inc:0.3,cap:2.2},
      ops:Object.assign({},CM.CFG.ops,{carKmCost:0.00042,stationDaily:{S:0.5,M:1,L:1.8}}),
      economy:Object.assign({},CM.CFG.economy,{startFunds:210000,grantBase:[[1985,9500],[1995,15000],[2005,22000],[2020,31000],[2050,46000]],debtLimit:-120000}),
      macro:{
        area:'新加坡主岛与近岸岛屿',region:'新加坡',gdp0:3900000,revRatio:[[1985,0.15],[2020,0.18]],revElastic:1.3,
        prod:[[1985,0.07],[1997,0.058],[2008,0.04],[2020,0.029],[2050,0.018]],infl:[[1985,0.01],[1990,0.03],[1998,0],[2008,0.055],[2020,0.01],[2030,0.02]],histEnd:2020,longRun:{infl:0.02},
        struct:{trade:1,fin:0.85,ind:0.65,tour:0.7,prop:0.55},
        events:[{id:'asia1997',y:1997,m:7},{id:'sars2003',y:2003,m:4},{id:'gfc2008',y:2008,m:9},{id:'covid2020',y:2020,m:1}],
      },
    },
  }));
})(window.CM);
