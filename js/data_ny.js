'use strict';
// 1990 年都会区剧本。初始线网保留骨干走向，站距、需求与财政采用游戏近似值。
(function (CM) {
  const geo = CM.GEOS.ny;
  const {lon0,lat0,kx,ky} = geo.proj;
  const point = (lon,lat) => [(lon-lon0)*kx,(lat0-lat)*ky];
  const sites = new Map(Object.entries({
    '南码头':[-74.013,40.702], '世贸中心':[-74.012,40.712], '钱伯斯街':[-74.009,40.715],
    '克里斯托弗街':[-74.002,40.733], '宾夕法尼亚车站':[-73.993,40.751], '时报广场':[-73.987,40.755],
    '哥伦布圆环':[-73.984,40.767], '72 街':[-73.982,40.779], '96 街':[-73.972,40.794],
    '哥伦比亚大学':[-73.964,40.808], '137 街':[-73.954,40.823], '168 街':[-73.940,40.841],
    '迪克曼街':[-73.926,40.861], '因伍德 207 街':[-73.918,40.868], '范科特兰公园':[-73.899,40.889],
    '联合广场':[-73.990,40.735], '中央车站':[-73.977,40.752], '59 街':[-73.967,40.762],
    '86 街':[-73.956,40.779], '125 街':[-73.937,40.805], '洋基体育场':[-73.925,40.828],
    '福德姆路':[-73.901,40.862], '伍德劳恩':[-73.878,40.886],
    '法院广场':[-73.946,40.747], '皇后广场':[-73.940,40.750], '阳光村':[-73.924,40.743],
    '杰克逊高地':[-73.891,40.747], '科罗纳':[-73.861,40.750], '法拉盛':[-73.831,40.760],
    '森林小丘':[-73.844,40.721], '邱园':[-73.831,40.714], '牙买加中心':[-73.800,40.702],
    '牙买加站':[-73.807,40.700], '西四街':[-74.001,40.732], '福尔顿街':[-74.007,40.710],
    '高街':[-73.991,40.700], '杰伊街':[-73.987,40.692], '大西洋大道':[-73.978,40.684],
    '富兰克林大道':[-73.957,40.681], '东纽约':[-73.904,40.679], '欧几里得大道':[-73.872,40.675],
    '霍华德海滩':[-73.830,40.661], '远洛克威':[-73.755,40.604], '展望公园':[-73.962,40.661],
    '国王公路':[-73.958,40.609], '布莱顿海滩':[-73.961,40.578], '康尼岛':[-73.982,40.577],
    '第八大道 14 街':[-74.003,40.739], '威廉斯堡':[-73.957,40.717], '布什维克':[-73.921,40.705], '布朗斯维尔':[-73.902,40.669],
    '卡纳西':[-73.901,40.646], '圣乔治':[-74.075,40.643], '汤普金斯维尔':[-74.075,40.636],
    '斯台普尔顿':[-74.074,40.627], '格拉斯米尔':[-74.084,40.603], '新多普':[-74.117,40.573],
    '大杀溪':[-74.151,40.552], '托滕维尔':[-74.251,40.512],
    '霍博肯':[-74.029,40.735], '纽波特':[-74.034,40.727], '交换广场':[-74.034,40.717],
    '格罗夫街':[-74.043,40.719], '期刊广场':[-74.063,40.733], '哈里森':[-74.156,40.739],
    '纽瓦克宾州站':[-74.164,40.734], '哈德逊广场':[-74.002,40.755], '上东区 96 街':[-73.947,40.784],
    '肯尼迪机场':[-73.789,40.647], '拉瓜迪亚机场':[-73.875,40.773], '纽瓦克机场':[-74.176,40.691],
    '帝国大厦':[-73.986,40.748], '布鲁克林大桥':[-73.996,40.706], '中央公园':[-73.966,40.781],
    '麦迪逊广场花园':[-73.993,40.750], '巴克莱中心':[-73.975,40.683],
  }).map(([name,[lon,lat]]) => [name,point(lon,lat)]));
  const at = (name,r=4) => {
    const [x,y] = sites.get(name);
    return {name,x,y,r};
  };
  const box = ([w,s,e,n]) => [point(w,n),point(e,n),point(e,s),point(w,s)];
  const region = (id,name,plan,pop,bounds) => ({id,name,plan,pop,open:1990,poly:box(bounds)});
  const line = (name,color,stops,type='underground') => ({
    name,color,type,stations:stops.split('|').map(n => [n,...sites.get(n),
      ['时报广场','福尔顿街','大西洋大道','中央车站','世贸中心'].includes(n) ? 'L' : 'M']),
  });
  const task = (id,y,deadline,title,stops,reward) => ({
    id,appear:[y,1],deadline:[deadline,12],type:'connect',title,reward,
    desc:'用运营线网连通' + stops.join('、') + '。',anchors:stops.map(n=>at(n)),
  });
  const landmark = (id,name,kind,year,w,d,h) => ({id,...at(name),kind,year,w,d,h});
  const hub = (id,n,t,y0,pax) => ({id,n,t,y0,pax,at:sites.get(n)});
  const stationNameAliases = {
    'Grand Central–42nd Street':'中央车站', 'Times Sq–42 St':'时报广场',
    'Penn Station':'宾夕法尼亚车站', '34th Street–Penn Station':'宾夕法尼亚车站',
    '14th Street–Union Square':'联合广场', '59th Street–Columbus Circle':'哥伦布圆环',
    '42nd Street–Bryant Park':'布莱恩特公园', 'Court Square':'法院广场',
    'South Ferry':'南码头', 'Bowling Green':'鲍灵格林', 'Wall Street':'华尔街',
    'Chambers Street':'钱伯斯街', 'Canal Street':'坚尼街', 'Fulton Street':'福尔顿街',
    'Atlantic Avenue–Barclays Center':'大西洋大道—巴克莱中心',
    'Jackson Heights–Roosevelt Avenue':'杰克逊高地—罗斯福大道',
    'Flushing–Main Street':'法拉盛缅街', 'Fordham Road':'福德姆路',
    'Journal Square Transportation Center':'期刊广场', 'Exchange Place':'交换广场',
    'Hoboken':'霍博肯', 'Newport':'纽波特', 'Grove Street':'格罗夫街',
    'Newark Penn Station':'纽瓦克宾州站', 'St. George':'圣乔治', 'Tottenville':'托滕维尔',
  };
  function chineseStationName(name) {
    if (Object.hasOwn(stationNameAliases, name)) return stationNameAliases[name];
    if (/^[\d\s\u3400-\u9fff·—-]+$/.test(name) && /[\u3400-\u9fff]/.test(name)) return name;
    const numbered = /^(?:(East|West) )?(\d+)(?:st|nd|rd|th) (Street|Avenue)$/.exec(name);
    if (!numbered) return null;
    const [, direction, number, type] = numbered;
    const prefix = direction === 'East' ? '东' : direction === 'West' ? '西' : '';
    return stationNameAliases[name] = prefix + number + (type === 'Street' ? ' 街' : ' 大道');
  }
  const stationPlaces = geo.places.flatMap(([name,x,y,type]) => {
    const label = chineseStationName(name);
    return label ? [[label,x,y,type]] : [];
  });
  geo.places = Array.from(sites,([n,p])=>[n,...p,2]).concat(geo.places);
  const data = {
    city:'纽约都会区',riverName:'哈德逊河',seaName:'纽约湾',places:geo.places,
    stationNameAliases, stationPlaces:Array.from(sites,([n,p]) => [n,...p,2]).concat(stationPlaces),
    overlappingWater:true, emptyStartFunds:2000000,
    lineColorsNice:CM.DATA.lineColorsNice,plans:CM.DATA.plans,rural:{pop:75,jobs:40},
    stages:[[2001,'既有线网扩建'],[2010,'枢纽重建'],[2020,'西区与上东区延伸']],stageLast:'都会区连网',
    mapLabels:[
      ['曼哈顿',-73.966,40.789], ['布朗克斯',-73.873,40.855], ['皇后区',-73.843,40.721],
      ['布鲁克林',-73.950,40.650], ['斯塔滕岛',-74.147,40.585],
      ['泽西市',-74.068,40.721], ['纽瓦克',-74.175,40.739],
    ].map(([name,lon,lat]) => [name,...point(lon,lat)]),
    neighborhoodLabels:[
      ['曼哈顿中城',-73.982,40.759], ['地狱厨房',-73.993,40.764], ['切尔西',-74.000,40.746],
      ['熨斗区',-73.989,40.741], ['格林尼治村',-74.001,40.731], ['苏豪区',-74.000,40.724],
      ['金融区',-74.009,40.706], ['上西区',-73.982,40.786], ['上东区',-73.958,40.776],
      ['哈莱姆',-73.946,40.813], ['福德姆',-73.894,40.862],
      ['长岛市',-73.948,40.744], ['阿斯托里亚',-73.920,40.765], ['杰克逊高地',-73.886,40.754],
      ['法拉盛',-73.827,40.760], ['牙买加',-73.795,40.702],
      ['布鲁克林市中心',-73.985,40.694], ['威廉斯堡',-73.955,40.714],
      ['日落公园',-74.007,40.645], ['康尼岛',-73.982,40.576],
      ['圣乔治',-74.078,40.642], ['霍博肯',-74.031,40.745],
      ['泽西市市中心',-74.045,40.722], ['纽瓦克市中心',-74.173,40.737],
    ].map(([name,lon,lat]) => [name,...point(lon,lat)]),
    briefing:{lead:'接手 1990 年纽约都会区的简化骨干线网。在曼哈顿继续织网，向皇后区、布鲁克林和新泽西增加服务。',modes:[
      ['metro','既有线网','地铁骨干、PATH 和斯塔滕岛铁路均已运营，可继续延伸或改造。'],
      ['wave','跨河走廊','哈德逊河和东河两岸有独立的居住与就业中心。'],
      ['plane','机场与铁路','三座机场和主要铁路站都有接驳需求。'],
    ]},
    regions:[
      {id:'central-park',name:'中央公园',scenic:true,open:null,poly:[
        point(-73.981,40.768),point(-73.973,40.764),point(-73.949,40.796),point(-73.958,40.800),
      ]},
      region('midtown','曼哈顿中城','cbd',480000,[-74.014,40.727,-73.952,40.785]),
      region('downtown','曼哈顿下城','cbd',330000,[-74.022,40.695,-73.974,40.727]),
      region('uptown','上城与哈莱姆','mix',650000,[-74.008,40.785,-73.918,40.861]),
      region('bronx','布朗克斯','res',1100000,[-73.942,40.807,-73.775,40.914]),
      region('queens-west','长岛市与杰克逊高地','mix',760000,[-73.963,40.716,-73.866,40.785]),
      region('queens-east','法拉盛与牙买加','mix',1250000,[-73.866,40.674,-73.731,40.805]),
      region('brooklyn-north','布鲁克林中心与威廉斯堡','mix',1100000,[-74.018,40.650,-73.866,40.736]),
      region('brooklyn-south','布鲁克林南部','res',990000,[-74.047,40.570,-73.866,40.650]),
      region('staten','斯塔滕岛','res',395000,[-74.267,40.497,-74.052,40.654]),
      region('jersey','泽西市与霍博肯','mix',395000,[-74.112,40.665,-74.017,40.779]),
      region('newark','纽瓦克与哈里森','mix',430000,[-74.241,40.670,-74.112,40.789]),
    ],
    defaultRegion:{id:'outer',name:'都会区外围',open:1990,plan:'res',pop:280000},
    centers:[
      ['时报广场',50000,230000],['中央车站',48000,190000],['世贸中心',41000,180000],
      ['联合广场',75000,72000],['86 街',130000,40000],['125 街',130000,43000],
      ['168 街',110000,33000],['福德姆路',140000,52000],['杰伊街',110000,110000],
      ['大西洋大道',99000,59000],['威廉斯堡',120000,40000],['康尼岛',65000,20000],
      ['杰克逊高地',140000,50000],['法拉盛',125000,64000],['牙买加站',110000,60000],
      ['交换广场',50000,84000],['期刊广场',89000,45000],['纽瓦克宾州站',85000,78000],
      ['圣乔治',45000,17000],['新多普',55000,15000],
    ].map(([n,pop,jobs])=>({...at(n,6),pop,jobs})),
    initialNetwork:{year:1990,note:'1990 年简化运营线网',lines:[
      line('1 号线','#ee352e','南码头|钱伯斯街|克里斯托弗街|宾夕法尼亚车站|时报广场|哥伦布圆环|72 街|96 街|哥伦比亚大学|137 街|168 街|迪克曼街|范科特兰公园'),
      line('4 号线','#00933c','大西洋大道|福尔顿街|联合广场|中央车站|59 街|86 街|125 街|洋基体育场|福德姆路|伍德劳恩'),
      line('7 号线','#b933ad','时报广场|中央车站|法院广场|阳光村|杰克逊高地|科罗纳|法拉盛'),
      line('A 线','#0039a6','因伍德 207 街|168 街|哥伦布圆环|宾夕法尼亚车站|西四街|福尔顿街|高街|杰伊街|富兰克林大道|东纽约|欧几里得大道|霍华德海滩|远洛克威'),
      line('E 线','#0039a6','世贸中心|西四街|宾夕法尼亚车站|皇后广场|杰克逊高地|森林小丘|邱园|牙买加中心'),
      line('D 线','#ff6319','西四街|大西洋大道|展望公园|国王公路|布莱顿海滩|康尼岛'),
      line('L 线','#a7a9ac','第八大道 14 街|联合广场|威廉斯堡|布什维克|布朗斯维尔|卡纳西'),
      line('PATH 纽瓦克线','#d5272e','纽瓦克宾州站|哈里森|期刊广场|格罗夫街|交换广场|世贸中心'),
      line('PATH 霍博肯线','#326cc3','霍博肯|纽波特|格罗夫街|交换广场|世贸中心'),
      line('斯塔滕岛铁路','#2575a9','圣乔治|汤普金斯维尔|斯台普尔顿|格拉斯米尔|新多普|大杀溪|托滕维尔','surface'),
    ]},
    landmarks:[
      landmark('ny-empire','帝国大厦','skyscraper',1931,129,58,381),
      landmark('ny-grand','中央车站','rail',1913,180,108,27),
      landmark('ny-penn','宾夕法尼亚车站','rail',1968,220,140,18),
      landmark('ny-msg','麦迪逊广场花园','stadium',1968,131,131,46),
      landmark('ny-barclays','巴克莱中心','stadium',2012,155,115,35),
    ],
    facilities:[
      {id:'ny-penn',n:'宾夕法尼亚车站',t:'rail',lm:'ny-penn',y0:1990,pax:[[1990,16],[2019,26]]},
      {id:'ny-grand',n:'中央车站',t:'rail',lm:'ny-grand',y0:1990,pax:[[1990,12],[2019,22]]},
      hub('ny-jamaica','牙买加站','rail',1990,[[1990,5],[2019,9]]),
      hub('ny-newark','纽瓦克宾州站','rail',1990,[[1990,5],[2019,8]]),
      hub('ny-jfk','肯尼迪机场','air',1990,[[1990,8],[2019,17],[2020,5],[2024,17]]),
      hub('ny-lga','拉瓜迪亚机场','air',1990,[[1990,5],[2019,8],[2020,2],[2024,9]]),
      hub('ny-ewr','纽瓦克机场','air',1990,[[1990,5],[2019,13],[2020,4],[2024,13]]),
      {id:'ny-midtown',n:'时报广场与剧院区',t:'cbd',at:sites.get('时报广场'),w:0.06},
      {id:'ny-park',n:'中央公园',t:'scenic',at:sites.get('中央公园'),w:0.035},
      {id:'ny-columbia',n:'哥伦比亚大学',t:'uni',at:sites.get('哥伦比亚大学'),w:0.028},
    ],
    runways:geo.runways.filter(r=>['肯尼迪机场','拉瓜迪亚机场','纽瓦克机场'].some(n=>{
      const [x,y]=sites.get(n);
      return Math.hypot((r.a[0]+r.b[0])/2-x,(r.a[1]+r.b[1])/2-y)<16;
    })).map(r=>({...r,from:1990})),
    bridgeDefaultYear:1990,roadYears:{},bridgeYears:{},simRoads:[],
    eras:[
      {id:'ny-1990',from:1990,name:'既有线网扩建',tag:'模拟',summary:'中城和下城吸引两岸通勤。',grow:{jobs:{midtown:1.3,downtown:1.2}}},
      {id:'ny-2010',from:2010,name:'两岸再开发',tag:'模拟',summary:'西区与哈德逊河西岸的就业逐渐增长。',grow:{jobs:{midtown:1.45,jersey:1.3},pop:{'brooklyn-north':1.3,'queens-west':1.25}}},
    ],
    events:[
      {y:1990,m:1,tag:'模拟',title:'1990 年的纽约都会区',desc:'曼哈顿中城和下城吸引哈德逊河与东河两岸的通勤。'},
      {y:2003,m:11,tag:'史实',title:'世贸中心 PATH 车站恢复服务',desc:'临时车站启用，曼哈顿下城恢复跨哈德逊河的 PATH 服务。本局的线路运营由玩家决定。'},
      {y:2003,m:12,tag:'史实',title:'肯尼迪机场 AirTrain 启用',desc:'现实中机场通过 AirTrain 接驳牙买加与霍华德海滩。',fx:{demand:{hub:1.12,months:12}}},
      {y:2015,m:9,tag:'史实',title:'7 号线延伸至哈德逊广场',desc:'曼哈顿西区新增地铁站。',fx:{grow:{region:'midtown',jobs:1.12,years:6}}},
      {y:2017,m:1,tag:'史实',title:'第二大道地铁首期开通',desc:'上东区获得新的南北向地铁服务。'},
      {y:2023,m:1,tag:'史实',title:'中央车站接入长岛铁路',desc:'中央车站下方的 Grand Central Madison 开始运营。',fx:{demand:{hub:1.08,months:12}}},
    ],
    histTasks:[
      task('ny-jfk',2001,2010,'改善肯尼迪机场接驳',['牙买加站','肯尼迪机场'],98000),
      task('ny-west',2008,2021,'向曼哈顿西区延伸',['时报广场','哈德逊广场'],83000),
      task('ny-east',2010,2024,'服务上东区',['59 街','上东区 96 街'],95000),
    ],
    taskNote:'历史任务以新增服务为目标，线路走向由玩家决定。PATH 和斯塔滕岛铁路在本局归玩家调度。',
  };
  data.stationPlaces.push(...data.neighborhoodLabels.map(([name,x,y]) => [name,x,y,2]));
  (CM.MAP_LIST = CM.MAP_LIST || []).push({
    id:'ny',name:'纽约',title:'纽约都会区 · 1990',sub:'社区地图 · 1990 年起 · 美元',
    kind:'real',region:'美国',difficulty:3,tags:['继承线网','跨河建设','社区版'],
    desc:data.briefing.lead,intro:data.briefing.lead,tagline:'接手纽约骨干线网，连接哈德逊河两岸',
    modes:['challenge','free'],mapVersion:1,scenario:'ny-1990',
    facts:[['范围',geo.w/4+' km × '+geo.h/4+' km'],['起始','1990 年'],['人口','约 810 万'],['货币','美元']],
    features:[['metro','继承既有线网','纽约地铁骨干、PATH 和斯塔滕岛铁路'],['wave','跨河运营','哈德逊河、东河与纽约湾'],['plane','三座机场','肯尼迪、拉瓜迪亚、纽瓦克']],
    highlights:[[2003,'肯尼迪机场 AirTrain'],[2015,'哈德逊广场延伸'],[2017,'第二大道地铁']],
    geo,data,econ:{devOffset:23,money:0.25},cam:{cx:102,cy:83,zoom:16},
    cfg:{
      W:geo.w,H:geo.h,START:{y:1990,m:1,d:1,minute:360},econBase:1990,
      money:{code:'USD',unit:'美元',wan:'万美元',yi:'亿美元',sym:'$'},
      growth:Object.assign({},CM.CFG.growth,{histEnd:2020,popCurve:[[1990,8.1e6],[2000,8.9e6],[2010,9.1e6],[2020,9.8e6],[2050,10.5e6],[2300,11e6]],jobsRatio:[[1990,0.48],[2020,0.54]]}),
      fareDefault:{mode:'flat',flat:1.15,dist:false},fareRange:{min:0,max:5,step:0.05,scale:true},
      // 以开局可建里程为基准，按建设成本上涨调整中期基础拨款。
      economy:Object.assign({},CM.CFG.economy,{startFunds:850000,grantBase:[[1990,28000],[2010,55000],[2020,78000],[2050,100000]],debtLimit:-320000}),
      macro:{area:'纽约五区及新泽西近郊地图范围',region:'美国',gdp0:35000000,
        revRatio:[[1990,0.16],[2020,0.18]],revElastic:1.3,prod:[[1990,0.02],[2010,0.014],[2050,0.013]],
        infl:[[1990,0.047],[2000,0.027],[2010,0.02],[2020,0.02]],histEnd:2020,longRun:{infl:0.022},
        struct:{trade:0.6,fin:0.95,ind:0.35,tour:0.75,prop:0.85},
        events:[{id:'gfc2008',y:2008,m:9},{id:'covid2020',y:2020,m:3}]},
    },
  });
})(window.CM);
