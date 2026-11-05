window.Cases = (() => {
  const problems=[];
  const bySceneAll=id=>CaseStore.list().filter(c=>c.sceneId===id).sort((a,b)=>Number(!!b.imported)-Number(!!a.imported));
  function register(def){
    if(!def||!def.id||!def.sceneId){problems.push('案例缺少id或sceneId');return null;}
    try{return CaseStore.register({...def,plugin:true});}catch(e){problems.push(e.message);return null;}
  }
  function validate(c){
    const rows=[];
    for(const [valid,label] of [[/^[a-z0-9]+(-[a-z0-9]+)*$/.test(c?.id),'案例ID'],[!!ATLAS.index.byScene[c?.sceneId],'所属场景'],[!!c?.title,'案例标题'],[!!c?.tabs?.background,'专业背景']])rows.push({level:valid?'ok':'error',label});
    for(const key of ['workflow','demo'])rows.push({level:c?.tabs?.[key]?'ok':'warn',label:key==='workflow'?'案例流程':'案例演示'});
    return rows;
  }
  function stats(){const list=CaseStore.list();return {registered:list.length,ready:list.filter(c=>c.status==='ready').length,withDemo:list.filter(c=>c.tabs?.demo).length,totalScenes:ATLAS.allScenes.length,coveredScenes:new Set(list.map(c=>c.sceneId)).size};}
  return {register,get:CaseStore.get,list:CaseStore.list,unregister:CaseStore.unregister,bySceneAll,byScene:id=>bySceneAll(id)[0]||null,validate,validateAll:()=>Object.fromEntries(CaseStore.list().map(c=>[c.id,validate(c)])),stats,problems:()=>problems.slice()};
})();
