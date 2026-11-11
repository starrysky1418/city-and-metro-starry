'use strict';
// 地理使用 OSM。地图范围内的人口、岗位、客流和财政为情景估算。
(function (CM) {
  const geo = CM.GEOS.su;
  const { lon0, lat0, kx, ky } = geo.proj;
  const point = (lon, lat) => [(lon - lon0) * kx, (lat0 - lat) * ky];
  const sites = [
    ['木渎',120.520,31.278,42000,23000], ['狮山',120.550,31.297,64000,63000],
    ['苏州新区站',120.514,31.381,17000,14000], ['石路',120.599,31.308,45000,55000],
    ['乐桥',120.623,31.309,36000,73000], ['观前街',120.625,31.314,22000,67000],
    ['苏州站',120.606,31.326,24000,36000], ['拙政园',120.628,31.325,12000,13000],
    ['虎丘',120.578,31.336,11000,8000], ['金鸡湖西',120.678,31.319,43000,54000],
    ['时代广场',120.709,31.322,52000,65000], ['钟南街',120.752,31.332,58000,33000],
    ['苏州园区站',120.710,31.359,24000,31000], ['独墅湖科教区',120.734,31.266,45000,37000],
    ['元和',120.638,31.374,63000,27000], ['苏州北站',120.641,31.421,17000,23000],
    ['吴中城区',120.630,31.270,69000,31000], ['越溪',120.604,31.207,41000,23000],
    ['松陵',120.632,31.160,68000,40000], ['吴江太湖新城',120.615,31.132,20000,13000],
    ['同里',120.713,31.153,27000,12000], ['盛泽',120.644,30.904,48000,41000],
    ['唯亭',120.792,31.367,36000,35000], ['阳澄湖东',120.852,31.391,15000,15000],
    ['昆山城区',120.961,31.386,71000,62000], ['昆山南站',120.948,31.353,29000,25000],
    ['硕放',120.443,31.499,34000,28000], ['苏南硕放机场',120.426,31.495,3000,14000],
    ['新吴区',120.367,31.536,58000,56000], ['无锡新区站',120.390,31.491,19000,18000],
    ['浒墅关',120.506,31.401,40000,30000], ['望亭',120.457,31.437,26000,21000],
  ].filter(([,lon,lat]) => {
    const [x,y] = point(lon,lat);
    return x >= 0 && x < geo.w && y >= 0 && y < geo.h;
  });
  const positions = new Map(sites.map(([n,lon,lat]) => [n,point(lon,lat)]));
  const where = (name, r=4) => {
    const [x,y] = positions.get(name);
    return {name,x,y,r};
  };
  const box = ([w,s,e,n]) => [point(w,n),point(e,n),point(e,s),point(w,s)];
  const zone = (id,name,plan,pop,open,bounds) => ({id,name,plan,pop,open,poly:box(bounds)});
  const landmark = (id,name,kind,year,w,d,h) => ({id,...where(name),kind,year,w,d,h});
  const task = (id,from,by,title,stops,reward) => ({
    id,appear:[from,1],deadline:[by,12],type:'connect',title,reward,
    desc:'用运营中的地铁网络连接' + stops.join('、') + '。',anchors:stops.map(n => where(n)),
  });
  geo.places = sites.map(([name,lon,lat]) => [name,...point(lon,lat),2]).concat(geo.places);
  const data = {
    city:'苏州',riverName:'京杭大运河',seaName:'太湖',lineColorsNice:CM.DATA.lineColorsNice,plans:CM.DATA.plans,
    places:geo.places,rural:{pop:140,jobs:85},hsrYear:2010,
    mapLabels:['狮山','乐桥','金鸡湖西','吴中城区','松陵','唯亭','昆山城区','苏南硕放机场','新吴区'].map(n => [n,...positions.get(n)]),
    stages:[[2012,'首线筹建'],[2017,'东西与南北骨干'],[2023,'向吴江与园区延伸'],[2030,'市域连网']],stageLast:'模拟未来',
    briefing:{lead:'2010 年的苏州尚无运营地铁。先连狮山、姑苏老城和工业园区，再接铁路枢纽、吴江与昆山。',modes:[
      ['metro','首线','东西走廊串联狮山、老城和金鸡湖两岸。'],
      ['building','铁路枢纽','苏州站开局可接，苏州北站于 2011 年增加高铁接驳。'],
      ['plane','北向扩张','地图含无锡新吴区和硕放机场，后期可自行建设跨市接驳。'],
    ]},
    regions:[
      {id:'tiger',name:'虎丘保护区',scenic:true,open:null,relief:35,poly:box([120.572,31.331,120.585,31.344])},
      {id:'hill',name:'灵岩山风景区',scenic:true,open:null,relief:150,poly:box([120.474,31.235,120.502,31.270])},
      zone('old','姑苏老城','cbd',680000,2010,[120.580,31.275,120.655,31.345]),
      zone('west','狮山与木渎','mix',650000,2010,[120.473,31.238,120.580,31.353]),
      zone('park','工业园区与金鸡湖','cbd',690000,2010,[120.655,31.284,120.781,31.381]),
      zone('university','独墅湖科教区','mix',380000,2010,[120.676,31.220,120.797,31.284]),
      zone('xiangcheng','相城与高铁新城','newtown',430000,2010,[120.565,31.345,120.715,31.458]),
      zone('wuzhong','吴中与越溪','mix',550000,2010,[120.555,31.178,120.676,31.275]),
      zone('wujiang','松陵与同里','newtown',400000,2010,[120.577,31.091,120.754,31.178]),
      zone('xushuguan','浒墅关与望亭','ind',285000,2010,[120.432,31.353,120.565,31.478]),
      zone('weiting','唯亭与阳澄湖南岸','mix',250000,2010,[120.781,31.308,120.878,31.420]),
      zone('kunshan','昆山城区与昆山南站','newtown',650000,2010,[120.878,31.300,121.0,31.461]),
      zone('wuxi','无锡新吴与硕放','ind',370000,2010,[120.32,31.470,120.500,31.595]),
    ],
    defaultRegion:{id:'outer',name:'外围镇区',open:2010,plan:'res',pop:650000},
    centers:sites.map(([name,,,pop,jobs]) => ({...where(name,5),pop,jobs})),
    landmarks:[
      landmark('su-rail','苏州站','rail',1958,230,110,19),
      landmark('su-north','苏州北站','rail',2011,180,100,19),
      landmark('su-kunshan','昆山南站','rail',2010,200,110,18),
      landmark('su-garden','拙政园','monument',1513,140,100,9),
      landmark('su-tiger','虎丘','monument',961,25,25,48),
      landmark('su-airport','苏南硕放机场','airport',2010,210,95,19),
    ],
    facilities:[
      {id:'su-rail',n:'苏州站',t:'rail',lm:'su-rail',pax:[[2010,9],[2020,15]]},
      {id:'su-north',n:'苏州北站',t:'rail',lm:'su-north',y0:[2011,6],pax:[[2011,2.5],[2020,7]]},
      {id:'su-kunshan',n:'昆山南站',t:'rail',lm:'su-kunshan',y0:[2010,7],pax:[[2010,2.5],[2020,6]]},
      {id:'su-airport',n:'苏南硕放机场',t:'air',lm:'su-airport',pax:[[2010,0.7],[2019,2.3],[2020,1.3],[2025,2.8]]},
      {id:'su-old',n:'观前街商圈',t:'cbd',at:positions.get('观前街'),w:0.055},
      {id:'su-lake',n:'金鸡湖商圈',t:'cbd',at:positions.get('时代广场'),w:0.053},
      {id:'su-campus',n:'独墅湖科教区',t:'uni',at:positions.get('独墅湖科教区'),w:0.033},
      {id:'su-garden',n:'拙政园',t:'scenic',lm:'su-garden',w:0.025},
    ],
    runways:geo.runways.filter(r => {
      const [x,y] = positions.get('苏南硕放机场');
      return Math.hypot((r.a[0]+r.b[0])/2-x,(r.a[1]+r.b[1])/2-y) < 15;
    }).map(r => ({...r,from:2010})),
    roadYears:{},bridgeYears:{},bridgeDefaultYear:2010,simRoads:[],
    eras:[
      {id:'su-start',from:2010,name:'首线筹建',tag:'模拟',summary:'老城、高新区与园区形成东西向需求。',grow:{jobs:{west:1.2,park:1.35}}},
      {id:'su-expand',from:2017,name:'向南扩张',tag:'模拟',summary:'吴江与独墅湖逐步形成新的需求。',grow:{pop:{wujiang:1.5,university:1.3},jobs:{park:1.45}}},
      {id:'su-regional',from:2023,name:'市域连网',tag:'模拟',summary:'园区以东和高铁新城继续发展。',grow:{jobs:{kunshan:1.3,xiangcheng:1.35}}},
    ],
    events:[
      {y:2010,m:1,tag:'史实',title:'苏州首线在建',desc:'现实中一号线已开工。本局可自行选择首线走向。'},
      {y:2010,m:7,tag:'史实',title:'沪宁城际开通',desc:'苏州站、昆山南站等沿线枢纽承担新的铁路接驳需求。'},
      {y:2011,m:6,tag:'史实',title:'苏州北站启用',desc:'京沪高铁带来相城方向的接驳客流。',fx:{grow:{region:'xiangcheng',jobs:1.15,years:5}}},
      {y:2012,m:4,tag:'史实',title:'苏州进入地铁时代',desc:'现实中一号线开通，串联高新区、老城与工业园区。'},
      {y:2017,m:4,tag:'史实',title:'地铁延伸至吴江',desc:'现实中四号线开通，松陵与中心城区之间新增轨道通勤走廊。',fx:{grow:{region:'wujiang',pop:1.2,years:5}}},
      {y:2023,m:6,tag:'史实',title:'苏州地铁接入昆山',desc:'现实中十一号线开通。本局的东向轨道走廊由玩家决定。',fx:{grow:{region:['weiting','kunshan'],jobs:1.12,years:5}}},
    ],
    histTasks:[
      task('su-first',2010,2016,'东西骨干',['狮山','乐桥','金鸡湖西'],36000),
      task('su-rail',2011,2018,'老城接上两座铁路站',['乐桥','苏州站','苏州北站'],52000),
      task('su-south',2015,2023,'通往吴江',['吴中城区','松陵'],55000),
      task('su-east',2019,2029,'园区向昆山延伸',['唯亭','昆山城区'],65000),
    ],
    taskNote:'历史目标以苏州本地的骨干走廊为主。硕放机场可自行接入。',
  };
  (CM.MAP_LIST = CM.MAP_LIST || []).push({
    id:'su',name:'苏州',title:'苏州 · 2010',sub:'社区地图 · 2010 年起 · 人民币',kind:'real',
    desc:'从姑苏老城开始，向西连高新区，向东接工业园区和昆山，向南进入吴江。',intro:data.briefing.lead,
    region:'中国内地',tagline:'从运河古城到金鸡湖两岸',difficulty:3,tags:['社区版','东西走廊','市域延伸'],
    modes:['challenge','free'],mapVersion:1,scenario:'su-2010',
    facts:[['范围',geo.w/4+' km × '+geo.h/4+' km'],['起始','2010 年'],['人口','约 590 万'],['货币','人民币']],
    features:[['wave','水网与湖岸','太湖、金鸡湖与运河约束线路走向'],['building','三座铁路枢纽','苏州站、苏州北站与昆山南站'],['plane','硕放机场','可向无锡新吴区建设接驳']],
    highlights:[[2012,'苏州首线开通'],[2017,'地铁进入吴江'],[2023,'地铁接入昆山']],
    geo,data,cam:{cx:119,cy:152,zoom:14},
    cfg:{
      W:geo.w,H:geo.h,START:{y:2010,m:1,d:1,minute:360},econBase:1990,
      growth:Object.assign({},CM.CFG.growth,{histEnd:2020,popCurve:[[2010,5.9e6],[2020,7.65e6],[2040,9.1e6],[2300,9.8e6]],jobsRatio:[[2010,0.54],[2020,0.58]]}),
      economy:Object.assign({},CM.CFG.economy,{startFunds:1400000,grantBase:[[2010,31000],[2020,49000],[2050,70000]]}),
      macro:{area:'苏州社区地图范围（含无锡新吴局部）',region:'中国内地',gdp0:73000000,
        revRatio:[[2010,0.17],[2020,0.19]],revElastic:1.3,prod:[[2010,0.06],[2020,0.037],[2050,0.02]],
        infl:'cn',ref:'cn',histEnd:2020,longRun:{infl:0.02},struct:{trade:0.85,fin:0.55,ind:0.95,tour:0.55,prop:0.7},
        events:[{id:'trade2018',y:2018,m:7},{id:'covid2020',y:2020,m:1}]},
    },
  });
})(window.CM);
