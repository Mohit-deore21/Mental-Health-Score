const API_URL = "https://mental-health-score-6-vjpl.onrender.com";
// The model's score scale. The common student-habits dataset uses 1–10, higher = better.
// Change these two if your training data differs.
const SCORE_MAX = 10;
const HIGHER_IS_BETTER = true;

const $ = id => document.getElementById(id);
const show = name => ["empty","loading","result","error"].forEach(s => $("s-"+s).classList.toggle("on", s===name));
const fail = m => { $("err-msg").textContent = m; show("error"); };

// live values next to sliders
document.querySelectorAll("input[type=range]").forEach(r=>{
  r.addEventListener("input",()=> r.nextElementSibling.textContent = r.value + " h");
});

function buildPayload(){
  const num = id => $(id).valueAsNumber;
  return {
    age: Math.trunc(num("age")),
    gender: $("gender").value,
    country: $("country").value.trim(),
    academic_level: $("academic_level").value,
    most_used_platform: $("most_used_platform").value,
    purpose_of_use: $("purpose_of_use").value,
    avg_daily_usage_hours: num("avg_daily_usage_hours"),
    daily_unlocks: Math.trunc(num("daily_unlocks")),
    study_hours: num("study_hours"),
    physical_activity_hours: num("physical_activity_hours"),
    sleep_hours_per_night: num("sleep_hours_per_night"),
    stress_level: document.querySelector("input[name=stress_level]:checked").value
  };
}

$("form").addEventListener("submit", async e=>{
  e.preventDefault();
  if(!e.target.reportValidity()) return;
  const btn = $("submit"); btn.disabled = true; btn.textContent = "Predicting…";
  show("loading");
  const t0 = Date.now();
  try{
    const res = await fetch(API_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(buildPayload())});
    const data = await res.json().catch(()=>({}));
    if(!res.ok){
      const d = data.detail;
      throw new Error(Array.isArray(d) ? d.map(x=>`${x.loc.slice(-1)[0]}: ${x.msg}`).join("; ") : (d || "Server returned "+res.status));
    }
    await new Promise(r=>setTimeout(r, Math.max(0, 700-(Date.now()-t0)))); // let the loader be seen
    showResult(data.predicted_mental_health_score);
  }catch(err){
    fail(err.message==="Failed to fetch" ? "Can't reach the API. Make sure uvicorn is running on port 8000." : err.message);
  }finally{
    btn.disabled = false; btn.textContent = "Predict score";
  }
});

function showResult(score){
  const pct = Math.max(0, Math.min(1, score/SCORE_MAX));
  const wellbeing = HIGHER_IS_BETTER ? pct : 1-pct;
  let label="Needs attention", color="var(--low)", msg="This score suggests the student may benefit from support. Talking to a counsellor could help.";
  if(wellbeing>=.7){label="Healthy range";color="var(--good)";msg="This score is in a healthy range. The current routines seem to be working.";}
  else if(wellbeing>=.5){label="Moderate";color="var(--mid)";msg="This score is in the middle. Small changes to sleep, activity or screen time could help.";}
  $("score").textContent = score.toFixed(2);
  const b = $("badge"); b.textContent = label; b.style.background = color;
  $("msg").textContent = msg + " This is a model estimate, not a diagnosis.";
  show("result");
  const bar = $("bar"); bar.style.stroke = color; bar.style.strokeDashoffset = 326.7;
  requestAnimationFrame(()=>requestAnimationFrame(()=>bar.style.strokeDashoffset = 326.7*(1-pct)));
}

$("retry").addEventListener("click",()=>show("empty"));
