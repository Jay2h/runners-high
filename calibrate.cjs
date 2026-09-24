const E=require('./dist/engine.js'),fs=require('node:fs');
const results=Array.from({length:50},(_,i)=>E.progressRun(E.DEFAULT,{seed:100+i*100,maxRaces:150}));
const success=results.filter(r=>r.success).sort((a,b)=>a.minutes-b.minutes),n=success.length;
const summary={samples:results.length,successes:n,playback:4,betweenSeconds:15,distance:800,policy:'record',medianMinutes:(success[Math.floor((n-1)/2)].minutes+success[Math.ceil((n-1)/2)].minutes)/2,minMinutes:success[0].minutes,maxMinutes:success.at(-1).minutes,medianRaces:success[Math.floor(n/2)].races,config:E.DEFAULT};
fs.writeFileSync('calibration.json',JSON.stringify({summary,results:results.map(({logs,...rest})=>rest)},null,2));console.log(JSON.stringify(summary,null,2));
