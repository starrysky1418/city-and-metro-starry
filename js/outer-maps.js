'use strict';
// The original scenario coordinates are shifted only after the original map has been authored.
(function (CM) {
  const spec = {
    sh:{ dx:144, dy:48, title:'嘉定、昆山、青浦、松江、金山、奉贤、临港与浦东机场' },
    gz:{ dx:48, dy:144, title:'佛山核心区、花都、白云机场、从化城区、增城与南沙' },
  };
  // 外围地铁建设开放前已有居民。新城与沿线乡镇使用不同的开局密度和增量权重。
  const townGrowth = { initial: 0.22, early: 0.28, mature: 0.72 };
  const corridorGrowth = { initial: 0.10, early: 0.08, mature: 0.20 };
  function shiftData(data, dx, dy) {
    const moved = new WeakSet();
    const shift = v => {
      if (!v || typeof v !== 'object' || moved.has(v)) return;
      moved.add(v);
      if (Number.isFinite(v.x) && Number.isFinite(v.y)) { v.x += dx; v.y += dy; }
      for (const o of Object.values(v)) shift(o);
    };
    for (const key of ['centers','landmarks','histTasks','dynTasks','scenarios','localRoadStarts']) shift(data[key]);
    for (const era of data.eras || []) shift(era.goals);
    const point = p => [p[0]+dx,p[1]+dy];
    const poly = p => typeof p[0][0] === 'number' ? p.map(point) : p.map(poly);
    for (const r of [...data.regions,...(data.reclaim || [])]) if (r.poly) r.poly = poly(r.poly);
    for (const f of data.facilities) {
      if (f.at) f.at = point(f.at);
      if (f.rw) f.rw = f.rw.map(point);
    }
    for (const r of data.runways || []) { r.a = point(r.a); r.b = point(r.b); }
    if (data.airport?.runway) data.airport.runway = data.airport.runway.map(point);
    for (const r of data.simRoads || []) r.p = r.p.map(point);
  }
  function mergeNames(geo, old, dx, dy) {
    const names = new Map(geo.names.map((name,i) => [name,i]));
    const key = row => row[0] + ':' + geo.names[row[1]];
    const mapped = new Set();
    const admin = [];
    for (const [level,n,...rings] of old.admin || []) {
      const name = old.names[n];
      if (!names.has(name)) { names.set(name,geo.names.length); geo.names.push(name); }
      const row = [level,names.get(name),...rings.map(r => {
        const p = CM.Geo.dec(r,1);
        return r[0] + CM.Geo.enc(Array.from(p,(v,i) => v + (i%2 ? dy : dx)));
      })];
      mapped.add(key(row)); admin.push(row);
    }
    geo.admin = admin.concat(geo.admin.filter(row => !mapped.has(key(row))));
    const points = new Set((old.places || []).map(p=>p[0]));
    geo.places = geo.places.filter(p=>!points.has(p[0])).concat((old.places || []).map(([n,x,y,t])=>[n,x+dx,y+dy,t]));
  }
  CM.expandOriginalMap = function (m) {
    const geo = CM.GEO_OUTER?.[m.id];
    if (!geo) return;
    const d = m.data, old = m.geo, {dx,dy,title} = spec[m.id], {lon0,lat0,kx,ky} = geo.proj;
    const xy = (lon,lat) => [(lon-lon0)*kx,(lat0-lat)*ky];
    const at = (lon,lat) => { const [x,y] = xy(lon,lat); return {x,y}; };
    const box = (w,s,e,n) => [xy(w,n),xy(e,n),xy(e,s),xy(w,s)];
    const oldW = m.cfg.W, oldH = m.cfg.H;
    const portal = m.id === 'sh' ? 'sh_pvgair' : 'gz_newair';
    m.extent = [
      Object.assign({},m.extent,{newW:oldW,newH:oldH}),
      { from:2, dx,dy, oldW,oldH, newZone:8, retirePortal:portal, note:'外围扩展至' + title,
        oldRegionIds:[...d.regions.map(r=>r.id),d.defaultRegion.id], oldLandmarkIds:d.landmarks.map(l=>l.id) },
    ];
    m.mapVersion = 3;
    m.cfg = Object.assign({},m.cfg,{W:geo.w,H:geo.h,ZONE:8});
    m.cam = Object.assign({},m.cam,{cx:m.cam.cx+dx,cy:m.cam.cy+dy});
    m.facts[0][1] = geo.w/4 + ' km × ' + geo.h/4 + ' km';
    m.features.push(['map','外围扩展',title]);
    shiftData(d,dx,dy);
    mergeNames(geo,old,dx,dy);
    m.geo = geo; d.places = geo.places;
    const addPlaces = (rows) => {
      for (const [name,lon,lat,pop,jobs] of rows) {
        const pos=at(lon,lat);
        if (!d.places.some(p => p[0]===name && Math.hypot(p[1]-pos.x,p[2]-pos.y)<2)) d.places.unshift([name,pos.x,pos.y,2]);
        if (pop || jobs) d.centers.push({...pos,pop,jobs,r:3});
      }
    };
    const addZones = rows => {
      d.regions.unshift(...rows.map(([id,name,open,plan,pop,bounds,demography]) =>
        ({id,name,open,plan,pop,poly:box(...bounds),demography:demography || townGrowth})));
    };
    const hub = (id,name,type,lon,lat,year,pax,w=225,depth=120) => {
      d.landmarks.push({id,name,kind:type==='air'?'airport':'rail',year,w,d:depth,h:22,...at(lon,lat)});
      d.facilities.push({id,n:name,t:type,lm:id,pax});
    };
    const replaceAirport = (name,lon,lat,years) => {
      const f = d.facilities.find(o=>o.id===portal);
      delete f.ext; f.n=name; f.at=xy(lon,lat);
      f.note='机场现在位于地图内，客流需要接驳航站楼。';
      const candidates = geo.runways.filter(r => Math.hypot((r.a[0]+r.b[0])/2-f.at[0],(r.a[1]+r.b[1])/2-f.at[1])<25);
      candidates.sort((a,b) => (a.a[0]+a.b[0])-(b.a[0]+b.b[0]));
      d.runways = (d.runways || []).concat(candidates.map((r,i) => ({...r,from:years[i] ?? years.at(-1)})));
    };
    if (m.id === 'sh') {
      addZones([
        ['sh-kunshan','昆山与花桥',2006,'newtown',18e6,[120.94,31.30,121.16,31.45], { initial: 0.15, early: 0.23, mature: 0.65 }],
        ['sh-jiading','嘉定与安亭',1997,'newtown',13.1e6,[121.15,31.24,121.35,31.46], { initial: 0.17, early: 0.25, mature: 0.70 }],
        ['sh-qingpu','青浦、朱家角与赵巷',2000,'newtown',15e6,[121.00,31.05,121.30,31.23], { initial: 0.10, early: 0.20, mature: 0.60 }],
        ['sh-songjiang','松江新城与九亭',1997,'newtown',13.5e6,[121.15,30.99,121.32,31.16]],
        ['sh-jinshan','金山卫与石化',2000,'ind',17e6,[121.21,30.706,121.44,30.83]],
        ['sh-fengxian','奉贤南桥',2000,'newtown',15.5e6,[121.40,30.88,121.59,31.02]],
        ['sh-lingang','临港新城与滴水湖',2003,'newtown',18e6,[121.75,30.86,121.95,31.02]],
        ['sh-pvg','浦东国际机场',1999,'port',11e6,[121.77,31.10,121.87,31.19]],
      ]);
      addPlaces([
        ['嘉定北',121.235,31.391,16000,6500],['嘉定新城',121.255,31.330,19000,13000],['安亭',121.160,31.290,17000,18000],
        ['花桥',121.098,31.292,12000,9000],['昆山南站',120.957,31.353,20000,12000],['昆山城西',120.943,31.389,16000,13000],
        ['青浦新城',121.111,31.159,21000,11000],['朱家角',121.045,31.099,12000,7500],['赵巷',121.188,31.162,13000,8000],
        ['松江新城',121.230,31.031,24000,14000],['松江大学城',121.234,31.054,17000,6500],['上海松江站',121.226,30.984,5000,6000],
        ['金山卫',121.349,30.731,13000,16000],['金山石化',121.294,30.718,14000,17000],['奉贤新城',121.482,30.925,17000,12000],
        ['惠南',121.761,31.054,22000,10000],['滴水湖',121.930,30.909,10000,12000],['浦东机场',121.804,31.152,2000,25000],
      ].filter(([,lon,lat]) => { const [x,y]=xy(lon,lat); return x>=0 && x<geo.w && y>=0 && y<geo.h; }));
      // 人民广场缺少原底图的独立站名点，复用已随扩图平移的任务位置。
      const square = d.histTasks.find(t => t.id === 'sh1').anchors.find(a => a.name === '人民广场');
      if (!d.places.some(p => p[0] === square.name && p[3] === 0)) d.places.unshift([square.name, square.x, square.y, 0]);
      const railStation = d.landmarks.find(lm => lm.id === 'sh_station');
      const railPlace = d.places.findIndex(p => p[0] === '上海' && p[3] === 1 && Math.hypot(p[1] - railStation.x, p[2] - railStation.y) <= 3.2);
      if (railPlace >= 0) d.places.splice(railPlace, 1, ['上海火车站', d.places[railPlace][1], d.places[railPlace][2], 0]);
      else d.places.unshift(['上海火车站', railStation.x, railStation.y, 0]);
      d.stationPlaces = d.places;
      hub('sh-kunshan-hub','昆山南站','rail',120.957,31.353,2010,[[2010,2],[2020,5]]);
      d.placeYears = Object.assign({}, d.placeYears, { '松江大学城': 2001 });
      hub('sh-songjiang-hub','上海松江站','rail',121.226,30.984,2010,[[2010,1.8],[2025,6]]);
      replaceAirport('浦东机场',121.804,31.152,[2005,1999,2008,2015,2017]);
      const event = d.events.find(e => e.title==='浦东国际机场启用');
      if (event) event.desc='浦东机场开始运营，国际航线逐步由虹桥转入。';
      d.events.push(
        {y:2007,m:12,tag:'史实',title:'九号线伸向松江',desc:'现实中九号线一期接入松江方向；本局可以自行选择西南走廊。'},
        {y:2017,m:12,tag:'史实',title:'青浦与虹桥的轨道走廊',desc:'现实中十七号线开通，连接虹桥枢纽与青浦。'},
      );
    } else {
      addZones([
        ['gz-foshan','佛山祖庙、千灯湖与桂城',1998,'mix',7.8e6,[113.086,23.005,113.196,23.112], { initial: 0.42, early: 0.44, mature: 0.80 }],
        ['gz-huadu','花都新华与广州北站',1998,'newtown',8.3e6,[113.143,23.318,113.284,23.446]],
        ['gz-airport-new','白云机场与人和',2004,'port',9.0e6,[113.270,23.325,113.349,23.436]],
        ['gz-conghua','从化街口与江埔',2006,'newtown',10.1e6,[113.505,23.492,113.664,23.569]],
        ['gz-xintang','新塘、永宁与增城南部',2000,'mix',9.2e6,[113.571,23.077,113.727,23.217]],
        ['gz-zengcheng','增城荔城',2006,'newtown',10.1e6,[113.753,23.239,113.855,23.351]],
        ['gz-nansha','南沙蕉门与金洲',2004,'port',10.1e6,[113.465,22.762,113.649,22.865]],
      ]);
      // Keep the Huangpu–Zengcheng approaches together without overriding the town centres.
      d.regions.push({
        id:'gz-zengcheng-corridor',name:'黄埔至增城走廊',open:1997,plan:'res',pop:9.2e6,demography:corridorGrowth,
        poly:[[113.49,23.12],[113.61,23.12],[113.74,23.224],[113.815,23.232],
          [113.815,23.284],[113.68,23.288],[113.49,23.233]].map(([lon,lat]) => xy(lon,lat)),
      });
      addPlaces([
        ['祖庙',113.110,23.028,38000,24000],['千灯湖',113.155,23.055,19000,18000],['桂城',113.144,23.041,24000,20000],
        ['广州北站',113.201,23.378,24000,10000],['花都广场',113.227,23.403,21000,15000],['人和',113.294,23.337,17000,9500],
        ['从化客运站',113.590,23.548,22000,10000],['街口',113.580,23.551,22000,12000],['太平',113.484,23.446,12000,6000],
        ['新塘',113.600,23.125,34000,25000],['增城广场',113.810,23.264,23000,15000],['朱村',113.690,23.267,12000,5500],
        ['蕉门',113.522,22.799,17000,14000],['金洲',113.540,22.792,17000,12000],['白云机场',113.308,23.392,1000,16000],
      ]);
      hub('gz-huadu-rail','广州北站','rail',113.201,23.378,1999,[[1999,1.5],[2010,3],[2020,5]]);
      hub('gz-xintang-rail','新塘站','rail',113.600,23.125,2023,[[2023,4],[2030,7]]);
      replaceAirport('广州白云国际机场',113.308,23.392,[2004,2004,2015,2025,2025]);
      d.events.push({y:2004,m:8,tag:'模拟',title:'白云机场接驳重心北移',desc:'新白云机场启用后，航空客流移至花都一侧的航站楼；原北向接驳点变为普通车站。'});
    }
    const edge = [
      [[0,0],[geo.w,0],[geo.w,dy],[0,dy]],
      [[0,dy],[dx,dy],[dx,dy+oldH],[0,dy+oldH]],
      [[dx+oldW,dy],[geo.w,dy],[geo.w,dy+oldH],[dx+oldW,dy+oldH]],
      [[0,dy+oldH],[geo.w,dy+oldH],[geo.w,geo.h],[0,geo.h]],
    ];
    for (const [i,poly] of edge.entries()) d.regions.push({id:m.id+'-outer-'+i,name:'外围走廊',open:1997,plan:'res',pop:15e6,poly,demography:corridorGrowth});
  };
})(window.CM);
