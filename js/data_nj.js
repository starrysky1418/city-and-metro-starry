'use strict';
// 南京社区场景。建设窗口、人口分布与造价为游戏参数。
(function (CM) {
  const geo = CM.GEOS.nj;
  const { lon0, lat0, kx, ky } = geo.proj;
  const point = (lon, lat) => [(lon - lon0) * kx, (lat0 - lat) * ky];
  const box = (west, south, east, north) => [point(west,north), point(east,north), point(east,south), point(west,south)];
  const anchors = [
    ['新街口',118.783,32.041], ['南京站',118.797,32.088], ['迈皋桥',118.818,32.103],
    ['鼓楼',118.783,32.062], ['玄武门',118.786,32.073], ['三山街',118.779,32.024],
    ['夫子庙',118.791,32.027], ['中华门',118.773,32.007], ['大行宫',118.795,32.041],
    ['下马坊',118.852,32.038], ['马群',118.906,32.051], ['仙林中心',118.925,32.103],
    ['奥体中心',118.716,32.005], ['元通',118.724,31.993], ['雨花台',118.779,31.994],
    ['南京南站',118.797,31.969], ['百家湖',118.821,31.922], ['东山',118.850,31.950],
    ['软件大道',118.781,31.975], ['江宁大学城',118.899,31.904], ['禄口机场',118.861,31.739],
    ['禄口',118.854,31.848], ['中华门站',118.769,32.005], ['油坊桥',118.717,31.961],
    ['浦口',118.627,32.063], ['江浦',118.625,32.055], ['南京工业大学',118.644,32.058],
    ['泰山新村',118.713,32.148], ['大厂',118.751,32.228], ['葛塘',118.766,32.253],
    ['龙池',118.830,32.318], ['燕子矶',118.821,32.132], ['五塘广场',118.788,32.109],
    ['板桥',118.654,31.921], ['铜井',118.558,31.847], ['麒麟门',118.938,32.023],
    ['南京博物院',118.826,32.043], ['中山陵',118.849,32.062], ['明孝陵',118.831,32.057],
    ['玄武湖',118.802,32.074], ['中华门城堡',118.782,32.015], ['总统府',118.797,32.045],
    ['长江大桥南',118.747,32.101], ['长江大桥北',118.719,32.127], ['江心洲',118.686,31.992],
    ['南京西站',118.744,32.100], ['老山',118.580,32.100], ['汤山',119.020,32.051],
  ];
  const sites = new Map(anchors.map(([n,lon,lat]) => [n,point(lon,lat)]));
  geo.places = anchors.map(([n,lon,lat]) => [n,...point(lon,lat),2]).concat(geo.places);
  const where = (name, r = 3.5) => { const [x,y] = sites.get(name); return { name,x,y,r }; };
  const zone = (id,name,plan,pop,open,bounds) => ({ id,name,plan,pop,open,poly:box(...bounds) });
  const historic = (id, from, by, title, stops, reward) => ({
    id, appear:[from,1], deadline:[by,12], type:'connect', title, reward,
    desc:'用运营中的地铁网络连通' + stops.join('、') + '。', anchors:stops.map(n => where(n)),
  });
  const lm = (id,name,kind,year,w,d,h) => ({ id, ...where(name), kind, year,w,d,h });
  const landmarks = [
    lm('nj-rail','南京站','rail',1968,260,125,20), lm('nj-south','南京南站','rail',2011,465,260,35),
    lm('nj-olympic','奥体中心','stadium',2005,280,220,38), lm('nj-museum','南京博物院','museum',1948,150,110,21),
    lm('nj-sun','中山陵','monument',1929,105,80,22), lm('nj-ming','明孝陵','monument',1405,98,70,16),
    lm('nj-wall','中华门城堡','monument',1386,155,105,19), lm('nj-palace','总统府','monument',1870,118,105,16),
  ];
  const data = {
    city:'南京', riverName:'长江', seaName:'长江', lineColorsNice:CM.DATA.lineColorsNice, plans:CM.DATA.plans,
    places:geo.places, mapLabels:anchors.filter(([n]) => ['新街口','浦口','仙林中心','百家湖','大厂','玄武湖','老山','禄口机场'].includes(n)).map(([n]) => [n,...sites.get(n)]),
    rural:{pop:230,jobs:100}, hsrYear:2010, stageLast:'模拟未来',
    stages:[[2005,'首线筹建'],[2010,'十字骨干'],[2014,'高铁与河西'],[2020,'跨江连网'],[2030,'都市圈']],
    briefing:{ lead:'从 2000 年的新街口与南京站起步。紫金山、玄武湖和长江切开了建设走廊，河西、江宁和江北会分期增长。', modes:[
      ['metro','首期','先把城北、老城和河西连起来。'], ['wave','跨江','早期可以在江北预留走廊，等客流成熟再跨江。'], ['plane','枢纽','禄口机场开局有客流，南京南站在 2011 年启用。'],
    ] },
    regions:[
      {id:'purple',name:'钟山风景区',scenic:true,open:null,relief:400,poly:[point(118.811,32.052),point(118.833,32.084),point(118.878,32.078),point(118.893,32.053),point(118.852,32.048)]},
      {id:'laoshan',name:'老山森林保护区',scenic:true,open:null,relief:290,poly:[point(118.505,32.076),point(118.548,32.133),point(118.629,32.143),point(118.641,32.110),point(118.551,32.070)]},
      zone('airport','禄口机场','port',70000,2000,[118.821,31.728,118.914,31.794]),
      zone('hexinew','河西南','newtown',280000,2005,[118.686,31.946,118.748,31.994]),
      zone('hexi','河西与奥体','cbd',530000,2000,[118.689,31.994,118.753,32.051]),
      zone('old','鼓楼与秦淮老城','cbd',1100000,2000,[118.749,32.009,118.817,32.094]),
      zone('south','雨花台与南京南站','mix',630000,2000,[118.727,31.953,118.833,32.009]),
      zone('east','城东与马群','mix',480000,2000,[118.814,32.001,118.936,32.058]),
      zone('xianlin','仙林大学城','newtown',570000,2000,[118.883,32.061,119.041,32.143]),
      zone('qixia','栖霞与燕子矶','ind',500000,2000,[118.775,32.093,118.904,32.171]),
      zone('jiangning','东山与百家湖','newtown',850000,2000,[118.778,31.871,118.951,31.953]),
      zone('pukou','江浦与浦口','newtown',480000,2000,[118.563,32.014,118.719,32.126]),
      zone('jiangbei','泰山新村与大厂','mix',480000,2000,[118.656,32.126,118.799,32.267]),
      zone('liuhe','六合与龙池','newtown',330000,2008,[118.756,32.265,118.896,32.339]),
      zone('binjiang','板桥与滨江','ind',280000,2000,[118.512,31.819,118.723,31.951]),
    ],
    defaultRegion:{ id:'outer',name:'都市外围',open:2000,plan:'res',pop:620000 },
    centers:[
      ['新街口',52000,145000],['南京站',48000,42000],['鼓楼',52000,66000],['迈皋桥',72000,34000],
      ['夫子庙',62000,42000],['奥体中心',12000,8000],['元通',8000,6000],['南京南站',15000,12000],
      ['东山',61000,28000],['百家湖',34000,18000],['软件大道',24000,30000],['仙林中心',15000,9000],
      ['马群',42000,17000],['泰山新村',46000,22000],['大厂',43000,27000],['江浦',28000,16000],
      ['龙池',12000,9000],['板桥',14000,15000],['禄口机场',2000,15000],
    ].map(([n,pop,jobs]) => ({ ...where(n,3),pop,jobs })),
    // 江心洲的岸线整治采用独立的、很小的示意填筑区，主航道保持开放。
    reclaim:[{ id:'nj-island-edge', name:'江心洲南端岸线整治', year:2014, tag:'模拟',
      poly:[point(118.663,31.981),point(118.676,31.984),point(118.679,31.988),point(118.667,31.986)],
      desc:'用小范围岸线变化模拟江心洲开发，边界与年份为游戏近似。' }],
    landmarks,
    facilities:[
      {id:'nj-rail',n:'南京站',t:'rail',lm:'nj-rail',pax:[[2000,7],[2011,11],[2020,13]]},
      {id:'nj-south',n:'南京南站',t:'rail',lm:'nj-south',y0:[2011,6],pax:[[2011,7],[2020,20]]},
      {id:'nj-air',n:'禄口机场',t:'air',at:sites.get('禄口机场'),y0:1997,pax:[[2000,1.5],[2014,4.2],[2019,8],[2020,4],[2025,8.5]]},
      {id:'nj-core',n:'新街口商圈',t:'cbd',at:sites.get('新街口'),w:0.06},
      {id:'nj-qinhuai',n:'夫子庙秦淮风光带',t:'scenic',at:sites.get('夫子庙'),w:0.04},
      {id:'nj-campus',n:'仙林大学城',t:'uni',at:sites.get('仙林中心'),w:[[2000,0.009],[2010,0.04]]},
      {id:'nj-olympic',n:'南京奥体中心',t:'venue',lm:'nj-olympic',w:0.028},
      {id:'nj-museum',n:'南京博物院',t:'scenic',lm:'nj-museum',w:0.024},
    ],
    runways:geo.runways.slice().sort((a,b) => (a.a[1]+a.b[1]) - (b.a[1]+b.b[1]))
      .map((r,i) => Object.assign({ from:i ? 2014 : 1997 }, r)),
    roadYears:{'南京江心洲长江大桥':2020,'新生圩长江大桥':2025},
    bridgeYears:{'南京长江大桥':1968,'南京长江第二大桥':2001,'八卦洲长江大桥':2001,'南京长江第三大桥':2005,'南京大胜关长江大桥':2005,'大胜关长江大桥':2011,'南京长江第四大桥':2012,'栖霞山长江大桥':2012,'应天大街长江隧道':2010},
    bridgeDefaultYear:2000,simRoads:[],
    eras:[
      {id:'nj-first',from:2000,name:'首线筹建',tag:'模拟',summary:'老城与城北已形成成熟走廊。',grow:{jobs:{old:1.25}}},
      {id:'nj-hexi',from:2005,name:'十字骨干',tag:'模拟',summary:'河西奥体与仙林逐渐成熟。',grow:{jobs:{hexi:1.6},pop:{xianlin:1.35}}},
      {id:'nj-hub',from:2010,name:'高铁与河西',tag:'模拟',summary:'南京南站与江宁形成南向客流。',grow:{jobs:{south:1.5},pop:{jiangning:1.4}}},
      {id:'nj-river',from:2014,name:'跨江连网',tag:'模拟',summary:'江北增长带动过江通勤。',grow:{pop:{pukou:1.45,jiangbei:1.35},jobs:{pukou:1.4}}},
      {id:'nj-next',from:2020,name:'都市圈',tag:'模拟',summary:'按游戏规则推演后续增长。',grow:{pop:{liuhe:1.3,jiangning:1.2}}},
    ],
    events:[
      {y:2000,m:12,tag:'史实',title:'南京地铁一号线工程开工',desc:'现实中地铁首线开工。本局的线路由玩家决定。'},
      {y:2005,m:9,tag:'史实',title:'南京进入地铁时代',desc:'首条线路连接迈皋桥、老城与河西。'},
      {y:2010,m:5,tag:'史实',title:'东西骨干与江宁延伸',desc:'现实中二号线与一号线南延开通。'},
      {y:2011,m:6,tag:'史实',title:'南京南站投用',desc:'高铁枢纽带来南向接驳客流。',fx:{grow:{region:'south',jobs:1.18,years:4}}},
      {y:2014,m:7,tag:'史实',title:'机场与江北轨道接驳',desc:'现实中的机场线与首条过江地铁开通。'},
      {y:2015,m:4,tag:'史实',title:'三号线跨越长江',desc:'江北和主城区增加一条地铁通道。',fx:{grow:{region:['pukou','jiangbei'],pop:1.2,years:6}}},
      {y:2014,m:8,tag:'史实',title:'南京举办夏季青年奥林匹克运动会',desc:'奥体中心举办开闭幕式，青奥村位于河西南。赛时休闲出行增加，赛后河西继续发展。',fx:{demand:{lz:1.15,months:1},grow:{region:['hexi','hexinew'],jobs:1.1,years:4}}},
      {y:2015,m:6,tag:'史实',title:'南京江北新区获批',desc:'江北新区获批为国家级新区，游戏中逐步提升浦口和江北的就业增长。',fx:{grow:{region:['pukou','jiangbei'],jobs:1.2,years:8}}},
    ],
    histTasks:[
      historic('nj-first',2000,2007,'先连老城与城北',['迈皋桥','南京站','新街口'],45000),
      historic('nj-hexi',2005,2012,'河西接入老城',['奥体中心','新街口'],40000),
      historic('nj-east',2007,2016,'东西骨干连向仙林',['新街口','马群','仙林中心'],55000),
      historic('nj-south',2011,2018,'高铁与江宁接驳',['新街口','南京南站','百家湖'],54000),
      historic('nj-cross',2013,2021,'长江两岸通勤',['南京工业大学','奥体中心'],65000),
      historic('nj-airport',2014,2023,'禄口机场接入高铁枢纽',['南京南站','禄口机场'],76000),
    ],
    taskNote:'历史任务以可接驳的主要走廊为目标。景区保护和江面约束仍适用。',
  };
  (CM.MAP_LIST = CM.MAP_LIST || []).push({
    id:'nj',name:'南京',title:'南京 · 2000',sub:'社区地图 · 2000 年起 · 人民币',kind:'real',
    desc:'从新街口起步，沿南北主城进入河西、仙林和江宁，最终跨江并接入禄口。',intro:data.briefing.lead,
    region:'中国内地',tagline:'从紫金山下的老城接向长江两岸',difficulty:3,tags:['社区版','长江过江','枢纽接驳'],
    modes:['challenge','free'],mapVersion:1,scenario:'nj-2000',
    facts:[['范围',geo.w/4+' km × '+geo.h/4+' km'],['起始','2000 年'],['人口','约 590 万'],['货币','人民币']],
    features:[['wave','长江过江','主航道与江心洲把主城和江北分开'],['park','历史与自然保护','紫金山、老山和老城地标'],['building','枢纽接驳','南京站、南京南站与禄口机场']],
    highlights:[[2005,'首线开通'],[2010,'十字骨干'],[2011,'南京南站启用'],[2015,'三号线过江']],
    geo,data,cam:{cx:127,cy:114,zoom:14},econ:{devOffset:7,money:1},
    cfg:{
      W:geo.w,H:geo.h,START:{y:2000,m:1,d:1,minute:360},econBase:2000,
      growth:Object.assign({},CM.CFG.growth,{histEnd:2020,popCurve:[[2000,5.9e6],[2010,7.5e6],[2020,9.1e6],[2050,10.7e6],[2300,11.5e6]],jobsRatio:[[2000,0.51],[2020,0.57]]}),
      economy:Object.assign({},CM.CFG.economy,{startFunds:460000,grantBase:[[2000,31000],[2010,50000],[2020,89000],[2050,140000]]}),
      macro:{area:'南京社区地图范围',region:'中国内地',gdp0:10500000,revRatio:[[2000,0.16],[2020,0.20]],revElastic:1.3,
        prod:[[2000,0.092],[2008,0.085],[2020,0.05],[2050,0.021]],infl:'cn',ref:'cn',histEnd:2020,longRun:{infl:0.02},
        struct:{trade:0.6,fin:0.55,ind:0.9,tour:0.5,prop:0.7},
        events:[{id:'wto2001',y:2001,m:12},{id:'sars2003',y:2003,m:4},{id:'gfc2008',y:2008,m:9},{id:'stim2008',y:2008,m:11},{id:'cnstock2015',y:2015,m:6},{id:'covid2020',y:2020,m:1}]},
    },
  });
})(window.CM);
