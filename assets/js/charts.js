function initDoughnut(id,value,label){
  const ctx=document.getElementById(id);
  if(!ctx || typeof Chart==="undefined") return;
  new Chart(ctx,{type:"doughnut",data:{labels:[label,"Sisa"],datasets:[{data:[value,100-value]}]},options:{plugins:{legend:{display:false}},cutout:"72%"}});
}
