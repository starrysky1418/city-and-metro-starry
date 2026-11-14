'use strict';
// Fixed regional rail concessions. Physical alignments are simplified; the same
// routes feed passenger assignment before and after a concession is signed.
(function (CM) {
  const R = CM.RailConcessions = {};
  const east = { id:'east', name:'九广铁路／东铁线', from:1970, color:'#648ab1', start:4, max:12, fee:40, entry:600, share:0.08, speed:100, stations:[
    ['尖沙咀总站',22.2941,114.1703,1910,1975], ['红磡',22.3028,114.1817,1975],
    ['旺角东',22.3222,114.1721], ['九龙塘',22.3371,114.1761],
    ['大围',22.3727,114.1788,1983], ['沙田',22.3833,114.1877],
    ['火炭',22.395,114.198,1985], ['大学',22.413,114.210],
    ['大埔墟',22.4446,114.1708], ['太和',22.4512,114.161,1989],
    ['粉岭',22.492,114.138], ['上水',22.501,114.128], ['罗湖',22.527,114.113],
  ]};
  const jin = { id:'jin', name:'金山铁路', from:2012, month:9, color:'#8e6c40', start:2, max:4, fee:75, entry:1800, speed:160, stations:[
    ['上海南站',31.1553,121.4266], ['莘庄',31.111,121.385,2025],
    ['春申',31.091,121.355], ['新桥',31.061,121.307], ['车墩',31.007,121.313],
    ['叶榭',30.942,121.318], ['亭林',30.890,121.344], ['金山园区',30.826,121.351], ['金山卫',30.727,121.345],
  ]};
  R.definition = g => ({hk:east, sh:jin})[g.mapId];
  R.phaseDates = { east:[1975,1983,1985,1989,2007,2022], jin:[2025] };
  R.available = (g,d) => g.clock.y > d.from || (g.clock.y === d.from && g.clock.m >= (d.month || 1));
  R.terms = (g,d,state=g.railConcession) => {
    const local = state?.local ?? (d.id === 'east' && g.clock.y >= 1983 ? 8 : d.start);
    const express = state?.express ?? (d.id === 'jin' ? 1 : 0);
    const scale = CM.Metro.costIndex(g.clock.y);
    return { local, express, entry:d.entry*scale, monthly:d.fee*scale*(d.id === 'jin' ? local+express : 1) };
  };
  R.overlay = (net,g,state) => {
    const d=R.definition(g);
    if (!d || !R.available(g,d)) return net;
    const {local,express}=R.terms(g,d,state);
    const n={...net, stations:{...net.stations}, segments:{...net.segments}, lines:{...net.lines}};
    const line={id:'l900000',name:d.name,color:d.color,speed:d.speed,rail:d.id,railOwned:!!state,rootSet:true,railFreq:local,railShare:d.share || 0};
    n.lines[line.id]=line;
    const p=CM.curMap().geo.proj, stops=[];
    const stations = d.id === 'east' ? [['金钟',22.279,114.165,2022],['会展',22.282,114.175,2022],...d.stations] : d.stations;
    for (const [i,[name,lat,lon,from,to]] of stations.entries()) {
      if (from && g.clock.y < from || to && g.clock.y >= to) continue;
      const point=d.id==='jin' && name!=='上海南站' ? CM.curMap().geo.places.find(row=>row[0]===name && row[3]===1) : null;
      const x=point?.[1] ?? (lon-p.lon0)*p.kx;
      const y=point?.[2] ?? (name==='罗湖' ? Math.max(0.6,(p.lat0-lat)*p.ky) : (p.lat0-lat)*p.ky);
      if (g.city.cellAt(x,y)<0) continue;
      const id='s'+(900000+i), type=name==='金钟'||name==='会展'?'underground':'surface';
      n.stations[id]={id,name,x,y,type,size:'L',rail:d.id,inherited:true};
      const prev=stops.at(-1);
      if (prev) {
        const sid='g'+(900000+i), underground=d.id==='east' && (type==='underground'||n.stations[prev].type==='underground'||name==='沙田'||name==='大围');
        n.segments[sid]={id:sid,a:prev,b:id,line:line.id,pts:[],type:underground?'underground':'surface',inherited:true};
      }
      stops.push(id);
    }
    line.root=stops[0];
    if (d.id==='east' && g.clock.y>=2007 && stops.length>2) {
      const [lat,lon]=[22.5145,114.0656], id='s900099', x=(lon-p.lon0)*p.kx,y=Math.max(0.6,(p.lat0-lat)*p.ky);
      if (g.city.cellAt(x,y)>=0) {
        n.stations[id]={id,name:'落马洲',x,y,type:'surface',size:'L',rail:d.id,inherited:true};
        n.segments.g900099={id:'g900099',a:stops.find(s=>n.stations[s].name==='上水'),b:id,line:line.id,pts:[],type:'surface',inherited:true};
        line.railSplit=true;
      }
    }
    if (express && stops.length>2) line.svcs=[{id:'rail-express',name:'直达',skip:stops.slice(1,-1),railFreq:express}];
    return n;
  };
  R.compile=(net,g,state=g.railConcession)=>CM.Metro.compile(R.overlay(net,g,state),g.city);
  R.due = (g,d,plan) => {
    const q=R.terms(g,d,plan), first=!g.railConcession;
    const days=CM.U.daysInMonth(g.clock.y,g.clock.m);
    const remaining=(days-g.clock.d+1)/days;
    const current=first?0:R.terms(g,d).monthly;
    return (first?q.entry:0)+Math.max(0,q.monthly-current)*remaining;
  };
  R.change=(g,local,express)=>{
    const d=R.definition(g);
    if (!d || !R.available(g,d) || g.pending || g.jumping || g.draft?.liveSnap || g.model.predJob) return '当前不能调整铁路合同';
    if (!Number.isInteger(local)||!Number.isInteger(express)||local<1||express<0||local+express>d.max||(d.id==='east'&&express)) return '班次超出合同允许范围';
    const first=!g.railConcession, due=R.due(g,d,{local,express});
    if (!g.econ.canAfford(due)) return '可用资金不足';
    g.econ.spend('pppOut',due);
    g.railConcession={local,express};
    g.logEvent({tag:'运营',title:(first?'签约接管：':'调整铁路班次：')+d.name,
      desc:'每方向每小时站站停 '+local+' 班'+(express?'，直达 '+express+' 班':'')+'。'});
    g.refreshOperations();
    return null;
  };
  R.monthly=g=>{
    const d=R.definition(g);
    if (d&&g.railConcession) g.econ.spend('pppOut',R.terms(g,d).monthly);
  };
})(window.CM);
