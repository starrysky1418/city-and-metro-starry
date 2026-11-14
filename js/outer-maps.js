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
  function mergeNames(geo, old, dx, dy, expandedDistricts) {
    const names = new Map(geo.names.map((name,i) => [name,i]));
    const key = row => row[0] + ':' + geo.names[row[1]];
    const mapped = new Set();
    const admin = [];
    for (const [level,n,...rings] of old.admin || []) {
      const name = old.names[n];
      if (expandedDistricts?.has(name) && geo.admin.some(row => row[0] === level && geo.names[row[1]] === name)) continue;
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
    const expandedDistricts = m.id === 'gz' ? new Set([
      '禅城区','南海区','顺德区','桂城街道','大沥镇','里水镇','狮山镇',
      '陈村镇','北滘镇','伦教街道','大良街道','容桂街道','乐从镇','龙江镇','勒流街道','杏坛镇','均安镇',
    ]) : null;
    mergeNames(geo,old,dx,dy,expandedDistricts);
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
      // 场景人口按地图内的广州、佛山与东莞等片区估算。
      d.terrainRevision = 2;
      m.facts.find(f => f[0] === '人口')[1] = '约 470 万';
      m.cfg.growth = { ...m.cfg.growth, popCurve: [[1990,4.7e6],[1995,5.9e6],[2000,8.0e6],[2005,9.6e6],[2010,11.7e6],[2015,14.4e6],[2020,17.4e6],[2030,19.2e6],[2050,20.5e6],[2300,21e6]] };
      m.cfg.economy = { ...m.cfg.economy, startFunds:360000, grantBase:[[1990,17500],[2000,39000],[2010,85000],[2015,112000],[2020,135000],[2050,210000]] };
      m.cfg.macro = { ...m.cfg.macro, area:'广州主要城区、外围组团及佛山部分城区', gdp0:3050000,
        ref:{label:'广州市实际 GDP 增速',src:'广州统计年鉴，地区生产总值指数（上年＝100）',
          data:[11.3,16.3,23.3,26.4,18.8,16.5,12.5,13.5,13.2,13.3,13.4,12.8,13.3,15.2,15.1,13,15,15.5,12.6,11.7,13,11.4,10.4,11.5,8.5,8.3,7.6,6.7,6,6.92,2.71,8.14,0.97,4.55].map((rate,i)=>[1990+i,rate/100])} };
      addZones([
        ['gz-foshan','佛山禅桂中心城区',2010,'mix',11.5e6,[113.082,22.977,113.196,23.112], { initial: 0.53, early: 0.72, mature: 0.95, from: 1996 }],
        ['gz-huadu','花都新华与广州北站',2017,'newtown',14.6e6,[113.143,23.318,113.284,23.446]],
        ['gz-airport-new','广州白云国际机场与人和',2004,'port',9.2e6,[113.270,23.235,113.349,23.436]],
        ['gz-conghua','从化街口与江埔',2020,'newtown',16.8e6,[113.505,23.492,113.664,23.569]],
        ['gz-xintang','新塘、永宁与增城南部',2017,'mix',14.8e6,[113.571,23.077,113.727,23.217]],
        ['gz-zengcheng','增城荔城',2018,'newtown',15.6e6,[113.753,23.239,113.855,23.351]],
        ['gz-nansha','南沙蕉门与金洲',2007,'port',10.1e6,[113.465,22.762,113.649,22.865]],
      ]);
      // Preserve the original Nanhai region ID for saves, but assign both districts before the generic expansion strips.
      const core = d.regions.find(r => r.id === 'gz-foshan');
      core.geo = {adminNames:['禅城区','桂城街道']};
      delete core.poly;
      const nanhai = d.regions.find(r => r.id === 'foshan');
      Object.assign(nanhai,{name:'佛山南海',open:2014,pop:13.6e6,geo:{adminNames:['南海区','大沥镇','里水镇','狮山镇']},
        demography:{initial:0.48,early:0.70,mature:0.98,from:1998}});
      delete nanhai.streets;
      delete nanhai.district;
      d.regions.splice(d.regions.indexOf(nanhai)+1,0,
        {id:'gz-shunde',name:'佛山顺德',open:2021,plan:'mix',pop:17.6e6,
          geo:{adminNames:['顺德区','陈村镇','北滘镇','伦教街道','大良街道','容桂街道','乐从镇','龙江镇','勒流街道','杏坛镇','均安镇']},
          roadStart:1990,demography:{initial:0.43,early:0.34,mature:0.41,from:1998}});
      const background = { open:null, lockNote:'此片区作为地图背景，不开放地铁建设', plan:'mix', mapBackground:true };
      d.regions.unshift(
        {id:'gz-dg-west',name:'东莞西部 · 麻涌与中堂',...background,
          geo:{adminNames:['麻涌镇','中堂镇']},demography:{initial:0.30,early:0.42,mature:0.62}},
        {id:'gz-dg-core',name:'东莞主城区',...background,
          geo:{adminNames:['莞城街道','东城街道','南城街道','万江街道']},
          demography:{initial:0.42,early:0.46,mature:0.70}},
        {id:'gz-dg-background',name:'东莞其余片区',...background,
          geo:{adminNames:['虎门镇','厚街镇','沙田镇','长安镇','高埗镇','石碣镇','洪梅镇','望牛墩镇','道滘镇',
            '石龙镇','茶山镇','寮步镇','大岭山镇','大朗镇','松山湖园区']},
          demography:{initial:0.22,early:0.30,mature:0.48}},
        {id:'gz-sz-background',name:'深圳西北部',...background,
          geo:{adminNames:['宝安区','光明区','沙井街道','新桥街道','松岗街道']},
          demography:{initial:0.16,early:0.26,mature:0.43}},
      );
      d.localRoadStarts = (d.localRoadStarts || []).concat([
        {...at(113.252,22.835),radius:15,year:1990}, // 大良
        {...at(113.208,22.930),radius:13,year:1990}, // 北滘
        {...at(113.275,22.766),radius:12,year:1990}, // 容桂
        {...at(113.236,22.965),radius:10,year:1990}, // 陈村
      ]);
      // Keep the Huangpu–Zengcheng approaches together without overriding the town centres.
      d.regions.push({
        id:'gz-zengcheng-corridor',name:'黄埔至增城走廊',open:2013,plan:'res',pop:13.2e6,demography:corridorGrowth,
        poly:[[113.49,23.12],[113.61,23.12],[113.74,23.224],[113.815,23.232],
          [113.815,23.284],[113.68,23.288],[113.49,23.233]].map(([lon,lat]) => xy(lon,lat)),
      });
      // Some clipped Dongguan town boundaries are missing or incomplete in the source.
      d.regions.push({id:'gz-dg-east-edge',name:'东莞东部 · 地图边缘',...background,
        poly:[[232,218],[270,207],[geo.w,211],[geo.w,geo.h],[272,geo.h],[272,294],[247,294],[247,263],[232,250]],
        demography:{initial:0.22,early:0.30,mature:0.48}});
      addPlaces([
        ['祖庙',113.110,23.028,46000,39000],['季华园',113.111,23.007,34000,26000],
        ['千灯湖',113.155,23.055,26000,18000],['桂城',113.144,23.041,33000,24000],
        ['大沥',113.118,23.107,22000,17000],['里水',113.150,23.199,18000,11500],
        ['罗村',113.085,23.063,18000,12000],['陈村',113.236,22.965,20000,14000],
        ['北滘',113.208,22.930,34000,31000],['伦教',113.212,22.866,21000,15000],
        ['大良',113.252,22.835,47000,32000],['容桂',113.275,22.766,44000,29000],
        ['乐从',113.086,22.958,18000,16000],['勒流',113.119,22.856,18000,12000],
        ['狮山',113.093,23.133,20500,18500],['杏坛',113.143,22.789,14500,15500],
        ['麻涌',113.574,23.051,12000,11000],['中堂',113.659,23.095,14000,10000],
        ['莞城',113.750,23.045,25000,20000],['东城',113.778,23.034,22000,16000],
        ['南城',113.745,23.014,20000,17000],['万江',113.726,23.047,15000,12000],
        ['厚街',113.674,22.940,14000,14000],['虎门',113.672,22.815,17000,14000],
        ['寮步',113.838,22.998,14000,12000],['茶山',113.854,23.079,11000,8500],
        ['大岭山',113.846,22.900,12000,10500],
        ['长安',113.804,22.817,14000,15000],['松岗',113.837,22.769,10000,9000],
        ['广州北站',113.201,23.378,24000,10000],['花都广场',113.227,23.403,21000,15000],['人和',113.294,23.337,17000,9500],
        ['从化客运站',113.590,23.548,22000,10000],['街口',113.580,23.551,22000,12000],['太平',113.484,23.446,12000,6000],
        ['新塘',113.600,23.125,34000,25000],['增城广场',113.810,23.264,23000,15000],['朱村',113.690,23.267,12000,5500],
        ['蕉门',113.522,22.799,17000,14000],['金洲',113.540,22.792,17000,12000],['白云机场',113.308,23.392,1000,16000],
      ]);
      d.facilities.push(
        {id:'gz-fs-zumiao',n:'佛山祖庙商圈',t:'shop',at:xy(113.110,23.028),w:0.025},
        {id:'gz-fs-jihua',n:'佛山季华路商务区',t:'cbd',at:xy(113.119,23.008),y0:1995,w:[[1995,0.008],[2010,0.020]]},
        {id:'gz-fs-qiandeng',n:'千灯湖金融商务区',t:'cbd',at:xy(113.155,23.055),y0:2001,w:[[2001,0.006],[2015,0.026]]},
        {id:'gz-fs-dali',n:'大沥商贸区',t:'shop',at:xy(113.118,23.107),w:0.012},
        {id:'gz-fs-beijiao',n:'北滘产业区',t:'cbd',at:xy(113.208,22.930),w:[[1990,0.005],[2010,0.015]]},
        {id:'gz-fs-daliang',n:'顺德大良商圈',t:'shop',at:xy(113.252,22.835),w:0.021},
        {id:'gz-fs-ronggui',n:'容桂商圈',t:'shop',at:xy(113.275,22.766),w:0.012},
      );
      d.mapLabels = (d.mapLabels || []).concat([
        ['佛山禅城', ...xy(113.105,23.017)],
        ['南海', ...xy(113.118,23.107)],
        ['顺德', ...xy(113.252,22.835)],
        ['东莞主城区', ...xy(113.760,23.025)],
        ['深圳宝安', ...xy(113.836,22.759)],
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
    const edgeYears = m.id === 'gz' ? [2017,2010,2013,2021] : [1997,1997,1997,1997];
    for (const [i,poly] of edge.entries()) d.regions.push({id:m.id+'-outer-'+i,name:'外围走廊',open:edgeYears[i],plan:'res',pop:m.id === 'gz' ? null : 15e6,poly,demography:corridorGrowth});
    if (m.id === 'gz') for (const region of d.regions) {
      if (region.id.startsWith('gz-') || region.id === 'foshan') region.earlyYears = 2;
    }
  };
})(window.CM);
