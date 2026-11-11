'use strict';
// Align the scenario data with its OSM basemap before the map registry is built.
(function (CM) {
  const specs = {
    sz: {
      fallback: ([x,y]) => [x*1.24-10,y*1.32+36],
      aliases: { '前海':'前湾', '科技园':'高新园', '南头':'南头古城', '龙岗中心城':'龙城广场', '宝安机场':'机场', '蛇口':'蛇口港', '盐田':'盐田路', '坪山站':'深圳坪山站' },
      fixed: {
        '罗湖口岸':[158.1,154.5], '深圳站':[157.5,153.9], '文锦渡口岸':[164.3,151.5],
        '沙头角口岸':[203,146], '蛇口客运码头':[72.6,178.4], '葵涌':[285.6,108.8],
        '大鹏':[304.1,128.4], '南澳':[310.78,152.19], '深圳坪山站':[239,72],
      },
      protected: [['福田红树林自然保护区',18],['广东内伶仃福田国家级自然保护区',18],['大鹏半岛国家地质公园',520],['梧桐山风景名胜区',944]],
      reclaim: {
        'sz-qianhai':[[62,149],[69,149],[72,153],[71,162],[66,162],[63,156]],
        'sz-houhai':[[87,155],[93,154],[97,157],[94,165],[90,166],[87,161]],
        'sz-airport':[[20.5,99],[29.5,99],[31.5,108],[33,111],[33,116],[30,118],[26.5,118]],
      },
      labels:['松岗','光明','石岩','观澜','平湖','龙岗中心城','横岗','坪山','坑梓','葵涌','大鹏','南澳','盐田','龙华','布吉','西乡','宝安中心','前海','南头','科技园','市民中心','华强北','罗湖','蛇口'],
      cam:{cx:130,cy:143,zoom:12},
    },
    sg: {
      fallback: ([x,y]) => [x*0.9+4,y*0.97+4],
      aliases: { '莱佛士坊':'萊佛士坊', '市政厅':'政府大厦', '小印度':'小印度' },
      fixed: {
        '市政厅':[111.5,88], '港湾':[99.1,99.2], '圣淘沙':[103.3,106.5],
        '新加坡国立大学':[81.9,89.2], '裕廊岛':[35,98.3], '兀兰':[82.1,22.8],
      },
      protected:[['中央集水区自然保护区',140],['武吉知马自然保护区',164],['双溪布洛湿地保护区',14],['克兰芝沼泽',12]],
      reclaim:{
        'sg-bayfront':[[112,94],[117,91],[121,93],[120,100],[116,102],[112,98]],
        'sg-jurong':[[24,94],[35,92],[47,93],[49,102],[40,106],[28,104]],
      },
      labels:['大士','裕廊西','裕廊东','金文泰','蔡厝港','登加','兀兰','三巴旺','义顺','宏茂桥','碧山','大巴窑','实龙岗','后港','盛港','榜鹅','淡滨尼','巴西立','勿洛','樟宜机场','乌节','莱佛士坊','滨海湾','港湾','圣淘沙'],
      cam:{cx:101,cy:67,zoom:13},
    },
  };

  CM.alignCommunityMap = function (map) {
    const { geo, data } = map, spec = specs[map.id];
    const byName = new Map();
    for (const p of geo.places) {
      const group = byName.get(p[0]) || [];
      group.push(p);
      byName.set(p[0], group);
    }
    const named = new Map(), controls = [];
    for (const [name,x,y] of geo.scenarioPlaces) {
      const approx = spec.fallback([x,y]);
      const options = byName.get(spec.aliases[name] || name) || [];
      const score = p => Math.hypot(p[1]-approx[0],p[2]-approx[1]) + (p[3] === 0 ? 0 : 4);
      const nearest = options.slice().sort((a,b) => score(a)-score(b))[0];
      const actual = spec.fixed[name] || (nearest && score(nearest)<40 ? nearest.slice(1,3) : null);
      if (!actual) continue;
      named.set(name, actual);
      controls.push({x,y,dx:actual[0]-approx[0],dy:actual[1]-approx[1]});
    }
    for (const [name,pos] of Object.entries(spec.fixed)) named.set(name,pos);
    const move = ([x,y], name) => {
      if (named.has(name)) return named.get(name).slice();
      const base = spec.fallback([x,y]);
      let total=0, dx=0, dy=0;
      for (const p of controls) {
        const distance = Math.hypot(x-p.x,y-p.y), weight = 1 / Math.pow(distance+2,3);
        dx += p.dx*weight; dy += p.dy*weight; total += weight;
      }
      return [base[0]+dx/total,base[1]+dy/total];
    };
    const moved = new Set();
    const update = (item, name) => {
      if (moved.has(item)) return;
      moved.add(item);
      [item.x,item.y] = move([item.x,item.y],name);
    };
    for (const r of data.regions) if (r.poly) r.poly = r.poly.map(p => move(p));
    data.regions = spec.protected.map(([name,relief],i) => ({id:'osm-protected-'+i,name,open:null,scenic:true,relief,geo:{reserve:name}}))
      .concat(data.regions.filter(r => r.id !== 'catchment'));
    for (const r of data.reclaim) r.poly = spec.reclaim[r.id] || r.poly.map(p => move(p));
    for (const p of data.centers) update(p);
    for (const p of data.landmarks) update(p,p.name);
    for (const f of data.facilities) if (f.at) f.at = move(f.at,f.n);
    for (const t of data.histTasks) for (const a of t.anchors || []) update(a,a.name);

    // Preserve game-authored names and exact hubs; OSM supplies street-level names.
    const scenarioPlaces = geo.scenarioPlaces.map(([name,x,y,type]) => [name,...move([x,y],name),type]);
    geo.places = scenarioPlaces.concat(geo.places.filter(p => !named.has(p[0])));
    data.places = geo.places;
    data.mapLabels = scenarioPlaces.filter(p => spec.labels.includes(p[0])).map(p => p.slice(0,3));
    data.landmarks.push(...geo.heritage);
    if (map.id === 'sg') {
      // Keep the scenario's task anchors separate from station naming coordinates.
      // LTA Chinese system map: https://www.lta.gov.sg/content/dam/ltagov/getting_around/public_transport/rail_network/pdf/SM_TEL4_Ch.pdf
      data.stationNameAliases = { '萊佛士坊':'莱佛士坊', '莱福士坊':'莱佛士坊', 'Raffles Place':'莱佛士坊', '政府大廈':'政府大厦', '市政厅':'政府大厦', 'City Hall':'政府大厦' };
      const stationName = name => Object.hasOwn(data.stationNameAliases, name) ? data.stationNameAliases[name] : name;
      data.stationPlaces = scenarioPlaces.map(([name, x, y]) => [stationName(name), x, y, 2]);
      // Keep the actual coordinates when an OSM MRT stop and a scenario anchor share a name.
      for (const p of byName.values()) for (const [name, x, y, type] of p) {
        const label = stationName(name);
        if (/[\u3400-\u9fff]/.test(label)) data.stationPlaces.push([label, x, y, type]);
      }
    }
    if (map.id === 'sz') {
      for (const name of ['西丽','塘朗']) {
        const place = byName.get(name)?.find(p => p[3] === 0);
        if (place) data.mapLabels.push(place.slice(0,3));
      }
      data.bridgeYears['深圳湾公路大桥'] = 2007;
      const { lon0, lat0, kx, ky } = geo.proj;
      const at = (lon, lat) => [(lon - lon0) * kx, (lat0 - lat) * ky];
      const east = [at(113.8030,22.6530), at(113.8170,22.6251)];
      const west = [at(113.7849,22.6545), at(113.8007,22.6238)];
      data.runways = [
        { a:east[0], b:east[1], from:1991, airfieldWidth:1.35 },
        { a:west[0], b:west[1], from:2011, airfieldWidth:1.75 },
      ];
      const old = at(113.817,22.646);
      const terminal = [31.2,111.1];
      const t3 = 2013 + 10/12;
      const rename = [2001,9];
      Object.assign(data.facilities.find(f => f.id === 'sz-air'), {
        n:'宝安机场 T3', lm:'sz-terminal-3', y0:[2013,11],
      });
      data.facilities.push(
        { id:'sz-huangtian', n:'深圳黄田国际机场', t:'air', at:old, rw:east, y0:1991, y1:rename, pax:[[2000,2],[2013,4]] },
        { id:'sz-air-ab', n:'宝安机场 A/B 航站楼', t:'air', at:old, rw:east, y0:rename, y1:[2013,11], pax:[[2000,2],[2013,4]] },
      );
      const [anchor] = data.histTasks.find(t => t.id === 'sz-air').anchors;
      [anchor.x, anchor.y] = terminal;
      anchor.name = '宝安机场 T3';
      data.landmarks.push(
        { id:'sz-terminal-3', name:'宝安机场 T3 航站楼', kind:'airport', x:terminal[0], y:terminal[1], year:t3, rot:-65, w:650, d:330, T:520, h:26 },
        { id:'sz-air-satellite', name:'宝安机场卫星厅', kind:'airport', x:29.3, y:106.8, year:2021+11/12, rot:-65, w:420, d:240, T:340, h:19 },
      );
      data.terrainRevision = 2;
    }
    if (map.id === 'sg') data.bridgeYears['Malaysia–Singapore Second Link'] = 1998;
    map.cfg.W = geo.w; map.cfg.H = geo.h; delete map.cfg.ZONE;
    map.facts[0][1] = geo.w/4 + ' km × ' + geo.h/4 + ' km';
    map.cam = spec.cam;
    map.mapVersion++;
    delete map.extent;
    return map;
  };
})(window.CM);
