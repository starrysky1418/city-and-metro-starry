'use strict';
// OSM/OpenFreeMap geography. Population, demand and budgets are scenario estimates.
(function (CM) {
  const geo = CM.GEOS.nb;
  const year = 2009;
  const { lon0, lat0, kx, ky } = geo.proj;
  const point = (lon, lat) => [(lon - lon0) * kx, (lat0 - lat) * ky];
  const box = ([w, s, e, n]) => [[w,n], [e,n], [e,s], [w,s]].map(([lon,lat]) => point(lon,lat));
  const source = 'https://static.sse.com.cn/bond/bridge2/disclosure/announcement/c/202501/5d8406_20250102_GV6V.pdf';
  const sites = [
    ['西门口',121.536,29.879,44,39],
    ['鼓楼',121.545,29.874,38,90,'cbd',[2009,1],0.052],
    ['东门口',121.556,29.875,38,70,'shop',[2009,1],0.041],
    ['江厦桥东',121.568,29.870,50,45],
    ['海晏北路',121.616,29.861,35,70],
    ['东部新城',121.622,29.860,31,85,'cbd',[2012,1],0.042],
    ['宁波火车站',121.535,29.862,39,59,'rail',[2013,12],[[2013,5],[2019,10],[2035,16]]],
    ['栎社国际机场',121.465,29.825,7,25,'air',[2009,1],[[2009,1.2],[2019,3.5],[2035,6]]],
    ['石碶',121.501,29.814,43,42],
    ['高桥',121.457,29.889,41,27],
    ['洪塘',121.489,29.942,48,30],
    ['庄桥',121.536,29.925,48,31],
    ['大通桥',121.586,29.918,52,38],
    ['宁波大学',121.644,29.910,38,29,'uni',[2009,1],0.034],
    ['镇海中学',121.717,29.948,23,19],
    ['红联',121.748,29.930,44,32],
    ['大碶',121.815,29.895,48,58],
    ['长江路',121.849,29.902,45,62],
    ['北仑港',121.826,29.953,14,88],
    ['鄞州万达',121.546,29.823,56,62,'shop',[2009,1],0.032],
    ['南部商务区',121.543,29.802,34,76,'cbd',[2012,1],0.043],
    ['东钱湖',121.641,29.781,19,24,'scenic',[2009,1],0.022],
    ['姜山',121.543,29.764,43,27],
    ['方桥',121.473,29.730,34,26],
    ['奉化金海路',121.454,29.654,54,44],
    ['奉化站',121.455,29.601,16,23,'rail',[2009,9],[[2009,0.3],[2035,2]]],
  ].map(([name,lon,lat,pop,jobs,type,open,demand]) => {
    const [x,y] = point(lon,lat);
    const actual = geo.places.filter(p => p[0] === name && p[3] === 0 && Math.hypot(x-p[1],y-p[2]) < 7)
      .sort((a,b) => Math.hypot(x-a[1],y-a[2])-Math.hypot(x-b[1],y-b[2]))[0];
    return { name, x: actual?.[1] ?? x, y: actual?.[2] ?? y, pop, jobs, type, open, demand };
  });
  const find = name => sites.find(s => s.name === name);
  const anchors = labels => labels.map(name => {
    const { x,y } = find(name);
    return { name,x,y,r:3.2 };
  });
  const rows = [
    ['old','海曙与三江口','mix',690,2009,[121.49,29.841,121.567,29.910]],
    ['jiangdong','江东','mix',540,2009,[121.567,29.844,121.61,29.91]],
    ['jiangbei','江北与外滩','mix',470,2009,[121.49,29.91,121.62,29.978]],
    ['gao','高桥与城西','res',430,2009,[121.407,29.844,121.49,29.93]],
    ['airport','栎社与石碶','mix',350,2009,[121.417,29.784,121.511,29.844]],
    ['yinzhou','鄞州中心','mix',560,2009,[121.511,29.779,121.61,29.844]],
    ['east','东部新城','cbd',390,2012,[121.61,29.82,121.677,29.905]],
    ['college','宁波大学与庄市','mix',310,2011,[121.62,29.884,121.696,29.958]],
    ['zhenhai','镇海与红联','ind',430,2014,[121.696,29.90,121.779,29.991]],
    ['beilun','北仑与港区','ind',590,2016,[121.779,29.846,121.859,29.985]],
    ['dongqian','东钱湖西岸','res',180,2015,[121.605,29.74,121.685,29.82]],
    ['jiangshan','姜山与方桥','newtown',370,2015,[121.447,29.697,121.611,29.784]],
    ['fenghua','奉化主城','mix',390,2019,[121.354,29.573,121.5,29.697]],
  ];
  const regions = rows.map(([id,name,plan,pop,open,bounds]) => ({id,name,plan,pop:pop*1000,open,poly:box(bounds)}));
  const hubs = sites.filter(s => s.type);
  const [ax,ay] = point(121.46,29.826);
  const runwayParts = geo.runways.filter(r => Math.hypot((r.a[0]+r.b[0])/2-ax,(r.a[1]+r.b[1])/2-ay)<9);
  const runwayPoints = runwayParts.flatMap(r => [r.a,r.b]).sort((a,b)=>a[1]-b[1]);
  const runways = runwayPoints.length ? [{a:runwayPoints[0],b:runwayPoints.at(-1),from:year,airfieldWidth:0.7}] : [];
  const events = [
    {y:2009,m:1,tag:'模拟',title:'三江口等待第一条地铁',desc:'在海曙和江东之间搭起骨干，然后接向机场与港区。'},
    {y:2014,m:5,tag:'史实',src:source,title:'宁波进入地铁时代',desc:'现实中的轨道交通1号线一期投入运营。'},
    {y:2015,m:9,tag:'史实',src:source,title:'机场与铁路站接入地铁',desc:'现实中的2号线一期投入运营，与1号线形成换乘。'},
    {y:2016,m:3,tag:'史实',src:source,title:'轨道向北仑延伸',desc:'现实中的1号线二期开通，东部走廊伸向北仑。'},
    {y:2019,m:9,tag:'史实',src:source,title:'宁奉城际首通',desc:'轨道服务向奉化方向延伸，首通段开始载客。'},
  ];
  const histTasks = [
    [2009,2016,'三江口东西骨干',['西门口','鼓楼','东门口','江厦桥东']],
    [2012,2021,'东部新城接入主城',['鼓楼','江厦桥东','海晏北路']],
    [2013,2022,'铁路与航空换乘',['栎社国际机场','石碶','宁波火车站','鼓楼']],
    [2015,2025,'沿甬江连接镇海',['大通桥','宁波大学','红联']],
    [2016,2028,'北仑通勤走廊',['海晏北路','大碶','长江路']],
    [2019,2032,'宁奉城际走廊',['南部商务区','姜山','方桥','奉化金海路']],
  ].map(([open,end,title,names],i) => ({
    id:'nb-'+(i+1), appear:[open,1], deadline:[end,12], type:'connect', title,
    desc:'用运营中的轨道线网连接'+names.join('、')+'。', anchors:anchors(names), reward:46000+i*8000,
  }));
  const data = {
    city:'宁波', riverName:'甬江', seaName:'东海', overlappingWater:true, hsrYear:2013,
    lineColorsNice:CM.DATA.lineColorsNice, plans:CM.DATA.plans,
    places:geo.places.filter(p=>p[3]!==4).concat(sites.map(s=>[s.name,s.x,s.y,2])),
    stationPlaces:geo.places.concat(sites.map(s=>[s.name,s.x,s.y,2])),
    rural:{pop:130,jobs:65}, regions, defaultRegion:{id:'outer',name:'外围镇区',plan:'res',open:2022,pop:230000},
    centers:sites.map(s=>({name:s.name,x:s.x,y:s.y,pop:s.pop*1000,jobs:s.jobs*1000,r:5})),
    landmarks:hubs.map((s,i)=>({id:'nb-hub-'+i,name:s.name,x:s.x,y:s.y,year:s.open[0]+(s.open[1]-1)/12,kind:s.type==='air'?'airport':s.type,w:s.type==='air'?300:165,d:100,h:16})),
    facilities:hubs.map((s,i)=>({id:'nb-hub-'+i,lm:'nb-hub-'+i,n:s.name,t:s.type,y0:s.open,...(s.type==='rail'||s.type==='air'?{pax:s.demand}:{w:s.demand})})),
    runways, histTasks, events, roadYears:{}, bridgeYears:{}, simRoads:[],
    stages:[[2014,'三江口骨干'],[2019,'环甬江与机场'],[2030,'市域成网']],
    briefing:{lead:'从三江口起步，跨过甬江、姚江和奉化江，再把轨道铺向栎社机场、镇海、北仑和奉化。',modes:[['metro','地铁','从零规划宁波的轨道交通。']]},
  };
  (CM.MAP_LIST=CM.MAP_LIST||[]).push({
    id:'nb', name:'宁波', title:'宁波 · 2009', sub:'社区地图 · 2009 年起 · 人民币', kind:'real', region:'中国内地',
    difficulty:3, modes:['challenge','free'], mapVersion:1, scenario:'nb-2009', tagline:'三江口起步，向港区与奉化延伸',
    tags:['三江口','港区','机场'], intro:data.briefing.lead, desc:data.briefing.lead,
    facts:[['范围',geo.w/4+' km × '+geo.h/4+' km'],['起始','2009 年'],['人口','约 420 万']],
    features:[['wave','三江汇流','接通三江口两岸，串联海曙、江东与江北'],['plane','铁路与机场','宁波站与栎社机场是两处独立客流枢纽'],['map','市域走廊','向东延伸北仑、向南修到奉化']],
    highlights:events.slice(1).map(e=>[e.y,e.title]), geo,data, cam:{cx:point(121.553,29.876)[0],cy:point(121.553,29.876)[1],zoom:14},
    cfg:{
      W:geo.w,H:geo.h,START:{y:year,m:1,d:1,minute:360},econBase:year,
      growth:{...CM.CFG.growth,histEnd:2030,popCurve:[[2009,4.2e6],[2020,5.7e6],[2040,7e6]],jobsRatio:[[2009,0.51],[2030,0.56]]},
      economy:{...CM.CFG.economy,startFunds:890000,grantBase:[[2009,42000],[2020,62000],[2050,96000]]},
    },
  });
})(window.CM);
