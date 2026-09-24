(function(root){
'use strict';
const KEYS=['stamina','endurance','speed','efficiency','acceleration','tactics'];
const LABELS={stamina:'체력',endurance:'지구력',speed:'최고 속도',efficiency:'주행 효율',acceleration:'가속력',tactics:'전술 판단'};
const DISTANCES=[800,1000,5000,10000];
const STRATEGIES={steady:{name:'일정 페이스',desc:'속도와 소모의 균형'},safe:{name:'완주 우선',desc:'속도 −10% · 기본 소모 −20%'},front:{name:'초반 선두',desc:'첫 200m 속도 +8% · 소모 증가'},late:{name:'후반 승부',desc:'초반 절약 · 마지막 200m 페이스 상승'}};
const DEFAULT={staminaGain:15,speedGain:.004,enduranceGain:.0075,efficiencyCap:.25,baseDrain:.1,boostCost:8,boostCostGain:.3,boostDuration:8,boostGain:.25,trainingReward:50,finishReward:100,costScale:1,costGrowth:1.085,opponentLevel:12,distanceWeights:{800:1,1000:1.2,5000:5,10000:9},prices:{stamina:120,endurance:160,speed:180,efficiency:180,acceleration:130,tactics:100}};
const LIMITS={staminaGain:[5,30],speedGain:[.001,.009],enduranceGain:[.002,.009],efficiencyCap:[0,.5],baseDrain:[.05,.2],boostCost:[2,20],boostCostGain:[0,1],boostDuration:[2,15],boostGain:[.05,.5],trainingReward:[10,200],finishReward:[20,400],costScale:[.25,4],costGrowth:[1.01,1.2],opponentLevel:[1,70]};
const bands={800:[210,190,170,150],1000:[285,255,225,195],5000:[1800,1620,1440,1260],10000:[3840,3480,3120,2760]};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const clone=o=>JSON.parse(JSON.stringify(o));
function levels(value=1){return Object.fromEntries(KEYS.map(k=>[k,value]));}
function config(input={}){const c=clone(DEFAULT);for(const [k,[a,b]] of Object.entries(LIMITS))if(Number.isFinite(input[k]))c[k]=clamp(input[k],a,b);c.opponentLevel=Math.round(c.opponentLevel);for(const d of DISTANCES)if(Number.isFinite(input.distanceWeights?.[d]))c.distanceWeights[d]=clamp(input.distanceWeights[d],.1,20);return c;}
function cleanLevels(l){return Object.fromEntries(KEYS.map(k=>[k,clamp(Math.round(Number(l?.[k])||1),1,100)]));}
function rng(seed){let s=seed>>>0;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function maxStamina(l,c){return 100+(l.stamina-1)*c.staminaGain;}
function boosts(l){return l.acceleration<=10?1:l.acceleration<=20?2:l.acceleration<=40?3:l.acceleration<=60?4:l.acceleration<=80?5:6;}
function boostCost(l,c){return c.boostCost+(l.acceleration-1)*c.boostCostGain;}
function price(l,k,c){return Math.ceil(c.prices[k]*c.costScale*Math.pow(c.costGrowth,l[k]-1));}
function drain(l,c){return c.baseDrain*(1-c.efficiencyCap*(l.efficiency-1)/99);}
function pace(strategy,d,D){if(strategy==='safe')return {speed:.9,cost:.8};if(strategy==='front')return d<200?{speed:1.08,cost:1.5}:{speed:1,cost:1.05};if(strategy==='late')return d<D-200?{speed:.95,cost:.85}:{speed:1.07,cost:1.45};return {speed:1,cost:1};}
function estimate(l,D,strategy,c){let cost=0;for(let d=0;d<D;d+=10)cost+=Math.min(10,D-d)*drain(l,c)*pace(strategy,d,D).cost;return {capacity:maxStamina(l,c),baseCost:cost,withBoost:cost+boostCost(l,c),boostCost:boostCost(l,c),maxDistance:maxStamina(l,c)/(drain(l,c)*(strategy==='safe'?.8:1))};}
function athlete(l,id,c,random,strategy){return {id,name:['YOU','민준','서윤','도현','지안','준서','하린','태오'][id],levels:cleanLevels(l),distance:0,speed:0,stamina:maxStamina(l,c),capacity:maxStamina(l,c),boosts:boosts(l),boostUntil:0,cooldownUntil:0,boosted:0,finish:null,dnf:false,fatigue:0,strategy,form:.992+random()*.016,lane:id*.22,laneTarget:id*.22,actualDistance:0};}
function createRace({levels:l=levels(),distance=800,strategy='steady',mode='training',seed=1,settings=DEFAULT}={}){
const c=config(settings);if(!DISTANCES.includes(distance))throw Error('Invalid distance');if(!STRATEGIES[strategy])throw Error('Invalid strategy');const r=rng(seed),my=cleanLevels(l),racers=[athlete(my,0,c,r,strategy)];
for(let i=1;i<8;i++){
 let opp;
 if(mode==='training'){
  opp=Object.fromEntries(KEYS.map(k=>[k,clamp(my[k]+Math.round((r()-.5)*4)+(i<5?0:i<7?3:6),1,100)]));
 }else {let strength=c.opponentLevel+[-9,-6,-3,0,3,5,8][i-1];opp=Object.fromEntries(KEYS.map(k=>[k,clamp(Math.round(strength+(r()-.5)*3),1,100)]));opp.stamina=Math.max(opp.stamina,Math.ceil((distance*c.baseDrain*1.12-100)/c.staminaGain)+1);opp.stamina=clamp(opp.stamina,1,100);}
 racers.push(athlete(opp,i,c,r,['steady','late','steady','front','steady','late','steady'][i-1]));
}
return {distance,mode,strategy,seed,c,racers,time:0,done:false,settled:false};}
function boost(r,id=0){const a=r.racers[id];if(r.done||a.dnf||a.finish!==null||a.boosts<=0||r.time<a.cooldownUntil||a.stamina<=boostCost(a.levels,r.c))return false;a.stamina-=boostCost(a.levels,r.c);a.boosts--;a.boosted++;a.boostUntil=r.time+r.c.boostDuration;a.cooldownUntil=a.boostUntil+10;return true;}
function desiredSpeed(a,r){const l=a.levels,c=r.c,p=clamp(a.distance/r.distance,0,1),idx=DISTANCES.indexOf(r.distance);a.fatigue=[.16,.19,.35,.42][idx]*p*p*(1-c.enduranceGain*(l.endurance-1));const base=(100/15.5)*(1+(l.speed-1)*c.speedGain)*[.66,.60,.53,.49][idx];const bonus=r.time<a.boostUntil?1+c.boostGain+(l.acceleration-1)*.0015:1;return base*(1-a.fatigue)*pace(a.strategy,a.distance,r.distance).speed*bonus*a.form;}
function step(r,dt=.2){if(r.done)return r;
for(const a of r.racers){if(a.finish!==null||a.dnf)continue;
 if(a.id!==0&&a.boosts>0&&r.time>=a.cooldownUntil){const remaining=r.distance-a.distance;if(remaining<=140+Math.max(0,a.boosts-1)*110&&a.stamina>remaining*drain(a.levels,r.c)*1.12+boostCost(a.levels,r.c))boost(r,a.id);}
 const ahead=r.racers.find(b=>b.id!==a.id&&!b.dnf&&b.finish===null&&b.distance-a.distance>0&&b.distance-a.distance<5&&Math.abs(b.lane-a.lane)<.5);
 a.laneTarget=ahead?clamp(ahead.lane+.7,0,3):0;a.lane+=(a.laneTarget-a.lane)*Math.min(1,dt*(.7+a.levels.tactics*.018));
 let target=desiredSpeed(a,r);if(ahead&&Math.abs(a.lane-ahead.lane)<.4)target*=.94+(a.levels.tactics-1)*.0005;
 const accel=r.time<a.boostUntil?2+(a.levels.acceleration-1)*.04:.9;
 a.speed+=clamp(target-a.speed,-1.5*dt,accel*dt);
 const outerFactor=1+Math.max(0,a.lane)*.013;
 const possible=a.speed*dt;
 const rate=drain(a.levels,r.c)*pace(a.strategy,a.distance,r.distance).cost;
 const actual=Math.min(possible,a.stamina/rate,(r.distance-a.distance)*outerFactor);
 a.actualDistance+=actual;a.distance=Math.min(r.distance,a.distance+actual/outerFactor);a.stamina=Math.max(0,a.stamina-actual*rate);
 if(a.distance>=r.distance-1e-7){a.distance=r.distance;a.finish=r.time+(a.speed>0?actual/a.speed:dt);}
 else if(a.stamina<1e-7){a.dnf=true;a.speed=0;}
}
r.time+=dt;r.done=r.racers.every(a=>a.finish!==null||a.dnf);return r;}
function ranking(r){return [...r.racers].sort((a,b)=>{if(a.finish!==null&&b.finish!==null)return a.finish-b.finish;if(a.finish!==null)return -1;if(b.finish!==null)return 1;return b.distance-a.distance||a.id-b.id;});}
function tier(time,D){let t=-1;bands[D].forEach((limit,i)=>{if(time<=limit)t=i;});return t;}
function reward(r){const a=r.racers[0];if(!r.done||a.finish===null)return {total:0,finish:0,podium:0,record:0,reserve:0,tier:'기권',rank:null};const rank=ranking(r).findIndex(x=>x.id===0)+1,w=r.c.distanceWeights[r.distance];if(r.mode==='training')return {total:Math.round(r.c.trainingReward*w),finish:Math.round(r.c.trainingReward*w),podium:0,record:0,reserve:0,tier:'훈련 완주',rank};const t=tier(a.finish,r.distance),ratio=a.stamina/a.capacity,rate=ratio>=.5?.15:ratio>=.25?.1:ratio>=.1?.05:0;const parts={finish:Math.round(r.c.finishReward*w),podium:Math.round(([0,100,60,30][rank]||0)*w),record:Math.round(([20,50,90,140][t]||0)*w),reserve:Math.round(r.c.finishReward*rate*w)};return {...parts,total:Object.values(parts).reduce((a,b)=>a+b,0),tier:['브론즈','실버','골드','플래티넘'][t]||'완주',rank};}
function fresh(){return {version:1,coins:0,levels:levels(),training:0,races:0,podiums:0,pbs:{},history:[],settings:config(),activeRace:null,played:0};}
function buy(p,k){if(!KEYS.includes(k)||p.levels[k]>=100||p.activeRace)return false;const cost=price(p.levels,k,p.settings);if(p.coins<cost)return false;p.coins-=cost;p.levels[k]++;return true;}
function settle(p,r){if(!r.done||r.settled)return false;r.settled=true;const a=r.racers[0],rew=reward(r);p.coins+=rew.total;p.races++;if(a.finish!==null){if(r.mode==='training')p.training++;if(r.mode==='stadium'&&rew.rank<=3)p.podiums++;const key=r.mode+'-'+r.distance;p.pbs[key]=Math.min(p.pbs[key]||Infinity,a.finish);}p.history.unshift({distance:r.distance,mode:r.mode,time:a.finish,rank:rew.rank,coins:rew.total,stamina:a.stamina,at:Date.now()});p.history=p.history.slice(0,40);p.activeRace=null;return true;}
function autoBoost(r){const a=r.racers[0],left=r.distance-a.distance;if(left<=140+Math.max(0,a.boosts-1)*110&&a.stamina>left*drain(a.levels,r.c)*1.1+boostCost(a.levels,r.c))boost(r);}
function simulate(options,auto=true){const r=createRace(options);for(let i=0;i<150000&&!r.done;i++){if(auto)autoBoost(r);step(r,.2);}if(!r.done)throw Error('Simulation timeout');return r;}
function purchasePlan(p,policy='record'){const c=p.settings;let order=policy==='balanced'?['speed','endurance','stamina','efficiency','acceleration','tactics']:['speed','speed','endurance','speed','acceleration','efficiency','tactics'];let purchases=[];for(let i=0;i<100;i++){
 const candidates=[...new Set(order)].filter(k=>p.levels[k]<100);if(!candidates.length)break;
 const weights=policy==='balanced'?{speed:1,endurance:1,stamina:.6,efficiency:.6,acceleration:.5,tactics:.4}:{speed:1,endurance:.35,stamina:0,efficiency:.12,acceleration:.1,tactics:.05};
 candidates.sort((a,b)=>weights[b]/price(p.levels,b,c)-weights[a]/price(p.levels,a,c));const k=candidates[0];if(!weights[k])break;const amount=price(p.levels,k,c);if(!buy(p,k))break;purchases.push({stat:k,level:p.levels[k],cost:amount});
}return purchases;}
function progressRun(c,{seed=1,playback=4,between=15,maxRaces=100,policy='record'}={}){const p=fresh();p.settings=config(c);const logs=[];let seconds=0;for(let n=0;n<maxRaces;n++){
 const upgrades=purchasePlan(p,policy),mode=p.training<5?'training':'stadium';const r=simulate({levels:p.levels,distance:800,mode,seed:seed+n*7919,settings:p.settings});const rew=reward(r);seconds+=r.time/playback+between;settle(p,r);logs.push({race:n+1,mode,seconds,time:r.racers[0].finish,rank:rew.rank,reward:rew.total,coins:p.coins,upgrades,levels:clone(p.levels)});if(mode==='stadium'&&rew.rank!==null&&rew.rank<=3)return {success:true,minutes:seconds/60,races:n+1,levels:p.levels,logs};}
return {success:false,minutes:seconds/60,races:maxRaces,levels:p.levels,logs};}
function validProgress(p){return !!(p&&p.version===1&&Number.isFinite(p.coins)&&p.coins>=0&&Number.isInteger(p.training)&&p.training>=0&&KEYS.every(k=>Number.isInteger(p.levels?.[k])&&p.levels[k]>=1&&p.levels[k]<=100)&&Array.isArray(p.history)&&p.pbs&&typeof p.pbs==='object');}
const api={KEYS,LABELS,DISTANCES,STRATEGIES,DEFAULT,LIMITS,bands,clamp,clone,levels,config,cleanLevels,rng,maxStamina,boosts,boostCost,price,drain,estimate,createRace,boost,step,ranking,tier,reward,fresh,buy,settle,simulate,progressRun,validProgress};root.RH=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);



