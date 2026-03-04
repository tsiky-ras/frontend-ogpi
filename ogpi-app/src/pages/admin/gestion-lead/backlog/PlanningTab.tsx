import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { BacklogLot, BacklogLine, BacklogLineProfil, BacklogDeliverable } from "../../../../types/lead/Backlog/Backlog.tsx";
import { BacklogPlanningService, UpsertPlanningRequest } from "../../../../services/lead/backlog/BacklogPlanningService.tsx";

// ─── CONSTANTES MÉTIER ────────────────────────────────────────────────────────
const WORK_START_H = 9;
const WORK_END_H   = 18;

const SLOT_MINUTES = 30;
const SLOTS_PER_HOUR = 60 / SLOT_MINUTES; // 2
const TOTAL_DAY_HOURS = WORK_END_H - WORK_START_H; // 9h
const WORK_SLOTS_PER_DAY = TOTAL_DAY_HOURS * SLOTS_PER_HOUR; // 18 slots

const HOURS_PER_DAY   = TOTAL_DAY_HOURS;
const DAYS_PER_WEEK   = 5;
const WEEKS_PER_MONTH = 4;
const HOURS_PER_WEEK  = HOURS_PER_DAY * DAYS_PER_WEEK;
const HOURS_PER_MONTH = HOURS_PER_WEEK * WEEKS_PER_MONTH;
const SPRINT_HOURS    = HOURS_PER_WEEK * 2;


const VISUAL_SLOTS_PER_DAY = 9;
const WEEK_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven"];

type TimeUnit = "hour" | "day" | "week" | "month";
const COL_PX: Record<TimeUnit, number> = { hour: 34, day: 40, week: 72, month: 128 };

const ROW_H    = 38;
const LABEL_W  = 230;   // largeur colonne labels (fixe, non scrollable)
const HDR_H    = 80;    // hauteur totale header (sticky)
const HDR_ROW1 = 36;    // ligne 1 : nom du jour
const HDR_ROW2 = 44;    // ligne 2 : créneaux horaires
const MIN_BAR  = 4;
const HANDLE_W = 8;



const COLOR = {
  lotBar: "#223A46", phaseAuto: "#28a745", phaseManual: "#0e8f82",
  delivManual: "#6ec997", delivAuto: "#007975",
  sprintBar: "#7c4dbe", sprintAlt: "#5c3a9e", sprintBg: "rgba(124,77,190,0.06)",
  ghost: "#c8e6c9", lotBg: "#f0f7f1", phaseBg: "#fafffe",
  selectedBg: "#f0e8ff", grid: "#e4eae4", gridMajor: "#c5d5c5",
  headerBg: "#284350", headerSub: "#223A46", headerText: "#ffffff",
  warning: "#e67e22", danger: "#e74c3c", success: "#27ae60",
  holiday: "rgba(255,100,100,0.08)",
  pauseBg: "rgba(255,180,0,0.15)", pauseBorder: "#c8960a", pauseText: "#8a6200",
};

interface PhaseOverride { heures: number; }

interface GRow {
  id: string; kind: "lot"|"phase"|"sprint"|"deliverable";
  label: string; phaseId?: number; delivId?: number; lotId?: number; sprintIdx?: number;
  startH: number; endH: number; autoStartH: number; autoEndH: number;
  isOverridden: boolean; color: string; depth: number; totalJH: number;
  realDateDebut?: string|null; realDateFin?: string|null;
}

interface PlanningTabProps {
  lots: BacklogLot[]; lines: BacklogLine[]; lineProfils: BacklogLineProfil[];
  deliverables: Map<number, BacklogDeliverable[]>; selectedBacklogId: number|null;
  planningService: BacklogPlanningService; initialOverrides?: Map<string,{heures:number}>;
  projectStartDate?: string|null; projectEndDate?: string|null;
  onUpdateProjectDates?: (s:string,e:string)=>Promise<void>;
}

// ─── JOURS FÉRIÉS MADAGASCAR ─────────────────────────────────────────────────
function easterSunday(y:number):Date {
  const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25);
  const g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4;
  const l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
  return new Date(y,Math.floor((h+l-7*m+114)/31)-1,((h+l-7*m+114)%31)+1);
}
function getMalagasyHolidays(y:number):Set<string> {
  const tk=(d:Date)=>d.toISOString().slice(0,10);
  const add=(d:Date,n:number)=>{const r=new Date(d);r.setDate(r.getDate()+n);return r;};
  const e=easterSunday(y);
  const list=[new Date(y,0,1),new Date(y,2,29),add(e,1),new Date(y,4,1),add(e,39),add(e,50),new Date(y,5,26),new Date(y,7,15),new Date(y,10,1),new Date(y,11,25)];
  const s=new Set<string>();
  list.forEach(d=>{s.add(tk(d));if(d.getDay()===0){const r=new Date(d);r.setDate(d.getDate()+1);s.add(tk(r));}});
  return s;
}
const hCache=new Map<number,Set<string>>();
const getHS=(y:number)=>{if(!hCache.has(y))hCache.set(y,getMalagasyHolidays(y));return hCache.get(y)!;};
const isHoliday=(d:Date)=>getHS(d.getFullYear()).has(d.toISOString().slice(0,10));
const isWeekend=(d:Date)=>{const w=d.getDay();return w===0||w===6;};
const isWorkDay=(d:Date)=>!isWeekend(d)&&!isHoliday(d);
function addWorkDays(base:Date,days:number):Date {
  if(days<=0)return new Date(base);
  const d=new Date(base);let a=0;
  while(a<Math.floor(days)){d.setDate(d.getDate()+1);if(isWorkDay(d))a++;}
  return d;
}
function nextWorkDay(d:Date):Date{const r=new Date(d);while(!isWorkDay(r))r.setDate(r.getDate()+1);return r;}
function countWorkDaysBetween(s:Date,e:Date):number{let n=0;const d=new Date(s);while(d<=e){if(isWorkDay(d))n++;d.setDate(d.getDate()+1);}return n;}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const sn=(v:number,fb=0)=>isFinite(v)?v:fb;
const jhToH=(jh:number,p:number)=>Math.max(HOURS_PER_DAY,sn((jh/Math.max(1,p)/HOURS_PER_DAY)*HOURS_PER_DAY,HOURS_PER_DAY));
const unitH = (u: TimeUnit) =>
  u === "hour"
    ? 0.5
    : u === "day"
    ? HOURS_PER_DAY
    : u === "week"
    ? HOURS_PER_WEEK
    : HOURS_PER_MONTH;  
const snapH=(h:number,u:TimeUnit)=>Math.max(1,Math.round(sn(h,1)/unitH(u))*unitH(u));
const mPM=(u:TimeUnit)=>u==="hour"?VISUAL_SLOTS_PER_DAY:u==="day"?DAYS_PER_WEEK:u==="week"?WEEKS_PER_MONTH:3;
const fmtDur=(h:number)=>{const v=sn(h,0);if(v===0)return"0h";if(v<HOURS_PER_DAY)return`${v}h`;if(v<HOURS_PER_WEEK)return`${(v/HOURS_PER_DAY).toFixed(1)}j`;if(v<HOURS_PER_MONTH)return`${(v/HOURS_PER_WEEK).toFixed(1)} sem.`;return`${(v/HOURS_PER_MONTH).toFixed(1)} mois`;};
const owDate=(base:Date,h:number)=>addWorkDays(base,Math.floor(h/HOURS_PER_DAY));
const toISO=(d:Date)=>d.toISOString().slice(0,10);
const fd=(d:Date)=>d.toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"2-digit"});
const fdl=(d:Date)=>d.toLocaleDateString("fr-FR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
const fds=(d:Date)=>d.toLocaleDateString("fr-FR",{day:"2-digit",month:"short"});
const fdr=(iso:string)=>{const d=new Date(iso);return d.toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});};

// ─── CONVERSION h→px ─────────────────────────────────────────────────────────
// En mode heure, les positions sont relatives à la zone scrollable (sans LABEL_W)
function hToScrollX(offsetH:number,unit:TimeUnit,colW:number):number {
  if(unit!=="hour") return sn(offsetH/unitH(unit),0)*colW;
  return sn(offsetH / unitH(unit), 0) * colW;
}

function hToW(dh:number,unit:TimeUnit,colW:number):number {
  return Math.max(MIN_BAR, sn(dh / unitH(unit), 0) * colW);
}
// Ancien h2x conservé pour compatibilité (ajoute LABEL_W)
function h2x(offsetH:number,unit:TimeUnit,colW:number):number {
  return LABEL_W + hToScrollX(offsetH,unit,colW);
}
function h2w(dh:number,unit:TimeUnit,colW:number):number {
  return hToW(dh,unit,colW);
}

// ─── LABELS ──────────────────────────────────────────────────────────────────
const mlbl=(u:TimeUnit,g:number,base:Date|null)=>{
  if(!base)return u==="hour"?`Jour ${g+1}`:u==="day"?`Sem. ${g+1}`:u==="week"?`Mois ${g+1}`:`Trim. ${g+1}`;
  if(u==="hour")return fds(addWorkDays(base,g));
  if(u==="day")return`Sem. ${fds(addWorkDays(base,g*DAYS_PER_WEEK))}`;
  if(u==="week"){const d=addWorkDays(base,g*WEEKS_PER_MONTH*DAYS_PER_WEEK);return d.toLocaleDateString("fr-FR",{month:"long",year:"numeric"});}
  const d=addWorkDays(base,g*3*WEEKS_PER_MONTH*DAYS_PER_WEEK);
  return`T${Math.floor(d.getMonth()/3)+1} ${d.getFullYear()}`;
};
const slbl=(u:TimeUnit,i:number,base:Date|null)=>{
  if(!base)return u==="hour"?`H${i+1}`:u==="day"?`J${i+1}`:u==="week"?`S${i+1}`:`M${i+1}`;
  if(u==="day")return fds(addWorkDays(base,i));
  if(u==="week")return fds(addWorkDays(base,i*DAYS_PER_WEEK));
  if(u==="month")return addWorkDays(base,i*WEEKS_PER_MONTH*DAYS_PER_WEEK).toLocaleDateString("fr-FR",{month:"short"});
  return"";
};

// ─────────────────────────────────────────────────────────────────────────────
//  COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
const PlanningTab:React.FC<PlanningTabProps>=({
  lots,lines,lineProfils,deliverables,selectedBacklogId,planningService,
  initialOverrides,projectStartDate,projectEndDate,onUpdateProjectDates,
})=>{
  const isPM=!!projectStartDate;
  const [unit,setUnit]=useState<TimeUnit>("week");
  const [overrides,setOverrides]=useState<Map<string,PhaseOverride>>(()=>initialOverrides?new Map(initialOverrides):new Map());
  const [pending,setPending]=useState<Map<string,PhaseOverride>>(new Map());
  const [loadingOv,setLoadingOv]=useState(false);
  const [saving,setSaving]=useState(false);
  const [saveOk,setSaveOk]=useState(false);
  const [saveErr,setSaveErr]=useState<string|null>(null);
  const [showGhosts,setShowGhosts]=useState(true);
  const [showHolidays,setShowHolidays]=useState(true);
  const [showSprints,setShowSprints]=useState(true);
  const [collapsed,setCollapsed]=useState<Set<string>>(new Set());
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [updatingDates,setUpdatingDates]=useState(false);
  const [datesUpdated,setDatesUpdated]=useState(false);
  const [drag,setDrag]=useState<{rowId:string;type:"move"|"resizeL"|"resizeR";startX:number;origStart:number;origEnd:number}|null>(null);
  const [liveOv,setLiveOv]=useState<{rowId:string;h:number}|null>(null);
  // ── refs pour scroll synchronisé ──────────────────────────────────────────
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef   = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  const baseDate=useMemo<Date|null>(()=>{if(!projectStartDate)return null;const d=new Date(projectStartDate);return isNaN(d.getTime())?null:nextWorkDay(d);},[projectStartDate]);
  const contractEndDate=useMemo<Date|null>(()=>{if(!projectEndDate)return null;const d=new Date(projectEndDate);return isNaN(d.getTime())?null:d;},[projectEndDate]);

  // ── Synchronisation scroll header ↔ body ──────────────────────────────────
  useEffect(()=>{
    const hEl = headerScrollRef.current;
    const bEl = bodyScrollRef.current;
    if(!hEl||!bEl) return;
    const onBodyScroll = ()=>{
      if(isSyncingScroll.current) return;
      isSyncingScroll.current = true;
      hEl.scrollLeft = bEl.scrollLeft;
      isSyncingScroll.current = false;
    };
    const onHeaderScroll = ()=>{
      if(isSyncingScroll.current) return;
      isSyncingScroll.current = true;
      bEl.scrollLeft = hEl.scrollLeft;
      isSyncingScroll.current = false;
    };
    bEl.addEventListener("scroll", onBodyScroll);
    hEl.addEventListener("scroll", onHeaderScroll);
    return()=>{bEl.removeEventListener("scroll",onBodyScroll);hEl.removeEventListener("scroll",onHeaderScroll);};
  },[]);

  useEffect(()=>{
    if(!selectedBacklogId)return;
    (async()=>{
      setLoadingOv(true);
      try{
        const ex=await planningService.hasPlanning(selectedBacklogId);
        if(ex){const ents=await planningService.getByBacklogId(selectedBacklogId);const m=new Map<string,PhaseOverride>();ents.forEach(e=>{const h=(e as any).heures??(e as any).heure;m.set(`phase-${e.phaseId}`,{heures:h});});setOverrides(m);}
        else setOverrides(new Map());
        setPending(new Map());
      }catch{setOverrides(new Map());}
      finally{setLoadingOv(false);}
    })();
  },[selectedBacklogId]);

  const apc=useMemo(()=>{const ids=new Set(lineProfils.filter(lp=>lp.volume>0).map(lp=>lp.profil.id));return Math.max(1,ids.size);},[lineProfils]);
  const getJH=useCallback((ids:number[])=>lineProfils.filter(lp=>ids.includes(lp.lineId)).reduce((s,lp)=>s+lp.volume,0),[lineProfils]);
  const getAutoH=useCallback((phaseId:number)=>{const ids=lines.filter(l=>l.phaseId===phaseId).map(l=>l.id);const jh=getJH(ids);return jh===0?0:jhToH(jh,apc);},[lines,getJH,apc]);
  const getEffH=useCallback((k:string,aH:number)=>{
    if(liveOv?.rowId===k&&isFinite(liveOv.h)&&liveOv.h>0)return Math.max(1,liveOv.h);
    const p=pending.get(k);if(p&&isFinite(p.heures)&&p.heures>0)return Math.max(1,p.heures);
    const s=overrides.get(k);if(s&&isFinite(s.heures)&&s.heures>0)return Math.max(1,s.heures);
    return isFinite(aH)&&aH>0?aH:1;
  },[liveOv,pending,overrides]);
  const hasOv=useCallback((k:string)=>overrides.has(k)||pending.has(k),[overrides,pending]);

  const rows=useMemo(():GRow[]=>{
    const res:GRow[]=[];let cur=0;
    lots.forEach(lot=>{
      const phases=[...(lot.phases||[])].sort((a,b)=>a.order-b.order);
      const ls=cur;const ch:GRow[]=[];let pc=cur;
      phases.forEach(ph=>{
        const pk=`phase-${ph.id}`;
        const jh=getJH(lines.filter(l=>l.phaseId===ph.id).map(l=>l.id));
        const aH=jh>0?getAutoH(ph.id):0;const eH=jh>0?getEffH(pk,aH):0;const ov=hasOv(pk);
        const ps=pc,pe=ps+eH;
        ch.push({id:pk,kind:"phase",label:ph.name,phaseId:ph.id,lotId:lot.id,startH:ps,endH:pe,autoStartH:ps,autoEndH:ps+aH,isOverridden:ov,color:ov?COLOR.phaseManual:COLOR.phaseAuto,depth:1,totalJH:jh,realDateDebut:(ph as any).dateDebut??(ph as any).date_debut??null,realDateFin:(ph as any).dateFin??(ph as any).date_fin??null});
        if(showSprints&&eH>0){
          const ns=Math.ceil(eH/SPRINT_HOURS);
          for(let si=0;si<ns;si++){
            const ss=ps+si*SPRINT_HOURS,se=Math.min(pe,ss+SPRINT_HOURS);
            ch.push({id:`sprint-${ph.id}-${si}`,kind:"sprint",label:`Sprint ${si+1}`,phaseId:ph.id,lotId:lot.id,sprintIdx:si,startH:ss,endH:se,autoStartH:ss,autoEndH:se,isOverridden:false,color:si%2===0?COLOR.sprintBar:COLOR.sprintAlt,depth:2,totalJH:0,realDateDebut:null,realDateFin:null});
          }
        }
        const devs=(deliverables.get(ph.id)||[]).sort((a,b)=>(a.order??0)-(b.order??0));
        if(devs.length>0){const ee=eH/devs.length,ae=aH/devs.length;let dc=ps;devs.forEach(d=>{ch.push({id:`deliv-${d.id}`,kind:"deliverable",label:d.name,delivId:d.id,phaseId:ph.id,lotId:lot.id,startH:dc,endH:dc+ee,autoStartH:dc,autoEndH:dc+ae,isOverridden:ov,color:ov?COLOR.delivManual:COLOR.delivAuto,depth:showSprints?3:2,totalJH:0,realDateDebut:(d as any).dateLivraison??null,realDateFin:(d as any).dateLivraison??null});dc+=ee;});}
        pc=pe;
      });
      res.push({id:`lot-${lot.id}`,kind:"lot",label:lot.name,lotId:lot.id,startH:ls,endH:pc,autoStartH:ls,autoEndH:pc,isOverridden:false,color:COLOR.lotBar,depth:0,totalJH:ch.filter(r=>r.kind==="phase").reduce((s,r)=>s+r.totalJH,0),realDateDebut:(lot as any).dateDebut??(lot as any).date_debut??null,realDateFin:(lot as any).dateFin??(lot as any).date_fin??null});
      if(!collapsed.has(`lot-${lot.id}`))res.push(...ch);
      cur=pc;
    });
    return res;
  },[lots,lines,getJH,getAutoH,getEffH,hasOv,deliverables,collapsed,showSprints]);

  const totalHours=rows.filter(r=>r.kind==="lot").reduce((s,r)=>s+sn(r.endH-r.startH),0);
  const maxH=Math.max(...rows.map(r=>sn(r.endH)),1);
  const planEnd=useMemo<Date|null>(()=>{if(!baseDate||totalHours===0)return null;return owDate(baseDate,totalHours);},[baseDate,totalHours]);
  const isOD=useMemo(()=>!!(planEnd&&contractEndDate&&planEnd>contractEndDate),[planEnd,contractEndDate]);

  const colW=COL_PX[unit];
  const nCols = useMemo(() => {
      if (unit === "hour") {
        return Math.ceil(maxH / unitH("hour")) + 4;
      }
    return Math.ceil(sn(maxH / unitH(unit), 1)) + 2;
  }, [maxH, unit]);
  
  // ── Largeur de la zone scrollable (sans LABEL_W) ──────────────────────────
  const scrollW = useMemo(() => {
    return nCols * colW;
  }, [nCols, colW]);

  const svgBodyH = Math.max(1,rows.length)*ROW_H;

  // getBx / getBw opèrent maintenant dans l'espace scrollable (sans LABEL_W)
  const getBx=useCallback((h:number)=>hToScrollX(h,unit,colW),[unit,colW]);
  const getBw=useCallback((s:number,e:number)=>hToW(e-s,unit,colW),[unit,colW]);
  const pxToH=useCallback((px:number)=>sn((px/colW)*unitH(unit),0),[colW,unit]);

  const startDrag=useCallback((e:React.MouseEvent,rowId:string,type:"move"|"resizeL"|"resizeR",sH:number,eH:number)=>{e.preventDefault();e.stopPropagation();setDrag({rowId,type,startX:e.clientX,origStart:sH,origEnd:eH});},[]);
  useEffect(()=>{
    if(!drag)return;
    const om=(e:MouseEvent)=>{const dh=pxToH(e.clientX-drag.startX);const dur=drag.origEnd-drag.origStart;const nh=drag.type==="resizeR"?Math.max(1,sn(dur+dh,1)):drag.type==="resizeL"?Math.max(1,sn(dur-dh,1)):sn(dur,1);const s=snapH(nh,unit);if(isFinite(s)&&s>0)setLiveOv({rowId:drag.rowId,h:s});};
    const ou=()=>{if(liveOv&&isFinite(liveOv.h)&&liveOv.h>0)setPending(p=>{const n=new Map(p);n.set(liveOv.rowId,{heures:liveOv.h});return n;});setLiveOv(null);setDrag(null);};
    window.addEventListener("mousemove",om);window.addEventListener("mouseup",ou);
    return()=>{window.removeEventListener("mousemove",om);window.removeEventListener("mouseup",ou);};
  },[drag,liveOv,pxToH,unit]);
  useEffect(()=>{
    if(!selectedId)return;
    const ok=(e:KeyboardEvent)=>{if(!["ArrowLeft","ArrowRight","+","-"].includes(e.key))return;e.preventDefault();const row=rows.find(r=>r.id===selectedId);if(!row||row.kind==="lot"||row.kind==="sprint")return;const st=unitH(unit);const cH=sn(row.endH-row.startH,st);const nh=(e.key==="ArrowRight"||e.key==="+")? cH+st:Math.max(1,cH-st);if(isFinite(nh)&&nh>0)setPending(p=>{const n=new Map(p);n.set(selectedId,{heures:nh});return n;});};
    window.addEventListener("keydown",ok);return()=>window.removeEventListener("keydown",ok);
  },[selectedId,rows,unit]);

  const handleSave=async()=>{
    if(pending.size===0)return;setSaving(true);setSaveErr(null);setSaveOk(false);
    try{
      const ap:{phaseId:number;key:string;autoH:number}[]=[];
      lots.forEach(lot=>(lot.phases||[]).forEach(ph=>ap.push({phaseId:ph.id,key:`phase-${ph.id}`,autoH:getAutoH(ph.id)})));
      const sn2=new Map<string,PhaseOverride>();const ents:UpsertPlanningRequest[]=[];
      ap.forEach(({phaseId,key,autoH})=>{const h=pending.get(key)?.heures??overrides.get(key)?.heures??autoH;const fH=Math.max(1,isFinite(h)?h:autoH);sn2.set(key,{heures:fH});ents.push({phaseId,heures:fH,startDate:null});});
      if(ents.length>0)await planningService.bulkUpsert(ents);
      setOverrides(sn2);setPending(new Map());setSaveOk(true);setTimeout(()=>setSaveOk(false),3000);
    }catch(err:any){setSaveErr(err?.message??"Erreur de sauvegarde.");}
    finally{setSaving(false);}
  };
  const handleUpdateDates=async()=>{
    if(!onUpdateProjectDates||!baseDate||!planEnd)return;setUpdatingDates(true);
    try{await onUpdateProjectDates(toISO(baseDate),toISO(planEnd));setDatesUpdated(true);setTimeout(()=>setDatesUpdated(false),3000);}
    catch{}finally{setUpdatingDates(false);}
  };
  const handleReset=async(key:string)=>{
    const m=key.match(/^phase-(\d+)$/);if(m){try{await planningService.deleteByPhaseId(Number(m[1]));}catch{}}
    setOverrides(p=>{const n=new Map(p);n.delete(key);return n;});
    setPending(p=>{const n=new Map(p);n.delete(key);return n;});
    if(selectedId===key)setSelectedId(null);
  };
  const mc=new Set([...overrides.keys(),...pending.keys()]).size;

  if(!selectedBacklogId)return<div className="text-center text-muted py-5">Veuillez sélectionner un backlog pour voir le planning prévisionnel.</div>;
  if(loadingOv)return<div className="d-flex justify-content-center align-items-center py-5"><span className="spinner-border spinner-border-sm me-2"/>Chargement du planning…</div>;

  // ─── HEADER SVG (scrollable, sans LABEL_W) ───────────────────────────────
  const renderHeaderSVG=()=>{
    const el:React.ReactNode[]=[];
if (unit === "hour") {
  const dayWidth = WORK_SLOTS_PER_DAY * colW;
  const days = Math.ceil(scrollW / dayWidth);

  for (let d = 0; d < days; d++) {
    const dayX = d * dayWidth;
    const dayDate = baseDate ? addWorkDays(baseDate, d) : null;

    el.push(
      <rect
        key={`daybg-${d}`}
        x={dayX}
        y={0}
        width={dayWidth}
        height={HDR_ROW1}
        fill={d % 2 === 0 ? COLOR.headerBg : COLOR.headerSub}
        
      />,
      
      <text
        key={`daylabel-${d}`}
        x={dayX + dayWidth / 2}
        y={HDR_ROW1 / 2 + 5}
        textAnchor="middle"
        fill="#fff"
        fontSize={11}
        fontWeight={700}
      >
        {dayDate
          ? dayDate.toLocaleDateString("fr-FR", {
              weekday: "short",
              day: "2-digit",
              month: "short",
            })
          : `Jour ${d + 1}`}
      </text>
    );

        // Fond ligne heures
    el.push(
      <rect
        key={`hourbg-${d}`}
        x={dayX}
        y={HDR_ROW1}
        width={dayWidth}
        height={HDR_ROW2}
        fill={COLOR.headerSub}
      />
    );

    for (let s = 0; s < WORK_SLOTS_PER_DAY; s++) {
      const slotX = dayX + s * colW;
      const hour = WORK_START_H + s / 2;
      const label =
        s % 2 === 0
          ? `${Math.floor(hour)}:00`
          : `${Math.floor(hour)}:30`;

      el.push(
        <line
          key={`grid-${d}-${s}`}
          x1={slotX}
          y1={HDR_ROW1}
          x2={slotX}
          y2={HDR_H}
          stroke={COLOR.grid}
          strokeWidth={0.5}
        />,
        <text
          key={`label-${d}-${s}`}
          x={slotX + colW / 2}
          y={HDR_ROW1 + 16}
          textAnchor="middle"
          fontSize={10}
          fontWeight={600}          
          fill="#fff"
        >
          {label}
        </text>
      );
    }
  }
}else {
      const ng=Math.ceil(nCols/mPM(unit));
      for(let g=0;g<ng;g++){
        const gx=g*mPM(unit)*colW;const gw=Math.min(mPM(unit),nCols-g*mPM(unit))*colW;
        if(!isFinite(gx)||gw<=0)continue;
        el.push(
          <rect key={`gh-${g}`} x={gx} y={0} width={gw} height={28} fill={g%2===0?COLOR.headerBg:COLOR.headerSub}/>,
          <text key={`gt-${g}`} x={gx+gw/2} y={18} textAnchor="middle" fill={COLOR.headerText} fontSize={9} fontWeight={700} fontFamily="inherit">{mlbl(unit,g,baseDate)}</text>,
        );
      }
      for(let i=0;i<nCols;i++){
        const cx=i*colW;if(!isFinite(cx))continue;
        let bg=i%2===0?"#f0f7f0":"#e4f0e4";
        if(isPM&&baseDate&&showHolidays&&unit==="day"){const sd=addWorkDays(baseDate,i);if(isHoliday(sd))bg="#ffe0e0";}
        el.push(
          <rect key={`sh-${i}`} x={cx} y={28} width={colW} height={32} fill={bg} stroke={COLOR.grid} strokeWidth={0.5}/>,
          <text key={`st-${i}`} x={cx+colW/2} y={47} textAnchor="middle" fill="#3a5c3a" fontSize={isPM?7.5:9} fontFamily="inherit">{slbl(unit,i,baseDate)}</text>,
        );
        if(isPM&&baseDate&&showHolidays&&unit==="day"){const sd=addWorkDays(baseDate,i);if(isHoliday(sd)){el.push(<rect key={`hh-${i}`} x={cx} y={28} width={colW} height={32} fill="rgba(220,50,50,0.12)"/>);}}
      }
    }
    // Ligne de fin contrat
    if(contractEndDate&&baseDate){
      const cH=countWorkDaysBetween(baseDate,contractEndDate)*HOURS_PER_DAY;
      const cx=hToScrollX(cH,unit,colW);
      if(isFinite(cx)&&cx>0){
        el.push(
          <line key="cl" x1={cx} y1={0} x2={cx} y2={HDR_H} stroke={isOD?COLOR.danger:COLOR.success} strokeWidth={2} strokeDasharray="6,3" opacity={0.8}/>,
          <rect key="clb" x={cx-48} y={2} width={96} height={16} rx={3} fill={isOD?COLOR.danger:COLOR.success} opacity={0.9}/>,
          <text key="clt" x={cx} y={13} textAnchor="middle" fill="#fff" fontSize={8} fontWeight={700} fontFamily="inherit">Fin prévue contrat</text>,
        );
      }
    }
    el.push(<line key="hs" x1={0} y1={HDR_H} x2={scrollW} y2={HDR_H} stroke={COLOR.gridMajor} strokeWidth={1.5}/>);
    return el;
  };

  // ─── GRILLE + BARRES GANTT (scrollable) ──────────────────────────────────
  const renderBodySVG=()=>{
    const el:React.ReactNode[]=[];

    // Grille verticale
      if (unit === "hour") {
        const dayWidth = WORK_SLOTS_PER_DAY * colW;
        const days = Math.ceil(scrollW / dayWidth);

        for (let d = 0; d < days; d++) {
          const dayX = d * dayWidth;

          for (let s = 0; s <= WORK_SLOTS_PER_DAY; s++) {
            const x = dayX + s * colW;

            el.push(
              <line
                key={`vg-${d}-${s}`}
                x1={x}
                y1={0}
                x2={x}
                y2={svgBodyH}
                stroke={s % 2 === 0 ? COLOR.gridMajor : COLOR.grid}
                strokeWidth={s % 2 === 0 ? 1 : 0.5}
              />
            );
          }
        }
      } else {
      for(let i=0;i<=nCols;i++){
        const x=i*colW;if(!isFinite(x))continue;
        el.push(<line key={`vg-${i}`} x1={x} y1={0} x2={x} y2={svgBodyH} stroke={i%mPM(unit)===0?COLOR.gridMajor:COLOR.grid} strokeWidth={i%mPM(unit)===0?1:0.5}/>);
      }
    }
    // Grille horizontale
    rows.forEach((_,ri)=>{
      const y=ri*ROW_H;
      el.push(<line key={`hg-${ri}`} x1={0} y1={y} x2={scrollW} y2={y} stroke={COLOR.grid} strokeWidth={0.5}/>);
    });
    // Ligne de fin contrat dans le corps
    if(contractEndDate&&baseDate){
      const cH=countWorkDaysBetween(baseDate,contractEndDate)*HOURS_PER_DAY;
      const cx=hToScrollX(cH,unit,colW);
      if(isFinite(cx)&&cx>0){
        el.push(<line key="clb" x1={cx} y1={0} x2={cx} y2={svgBodyH} stroke={isOD?COLOR.danger:COLOR.success} strokeWidth={2} strokeDasharray="6,3" opacity={0.6}/>);
      }
    }
    // Jours fériés (mode day)
    if(isPM&&baseDate&&showHolidays&&unit==="day"){
      for(let i=0;i<nCols;i++){
        const sd=addWorkDays(baseDate,i);
        if(isHoliday(sd)){const cx=i*colW;el.push(<rect key={`hb-${i}`} x={cx} y={0} width={colW} height={svgBodyH} fill={COLOR.holiday} style={{pointerEvents:"none"}}/>);}
      }
    }
    // Barres Gantt
    rows.forEach((row,ri)=>{
      const y=ri*ROW_H;const cy=y+ROW_H/2;
      const bx=getBx(row.startH),bw=getBw(row.startH,row.endH);
      const br=row.kind==="lot"?5:4;
      const bH=row.kind==="lot"?5:row.kind==="phase"?ROW_H*0.65:row.kind==="sprint"?ROW_H*0.42:ROW_H*0.5;
      const bY=cy-bH/2;
      const isSel=selectedId===row.id,isPend=pending.has(row.id);
      const isOv2=row.isOverridden,isLive=liveOv?.rowId===row.id;
      let bc=row.color;if(isLive)bc=row.kind==="deliverable"?"#4a9c4a":row.kind==="sprint"?"#9c27b0":"#5a2d8c";
      const rf=isSel?COLOR.selectedBg:row.kind==="lot"?COLOR.lotBg:row.kind==="sprint"?COLOR.sprintBg:isOv2?"#f8f2ff":COLOR.phaseBg;

      el.push(<rect key={`rb-${row.id}`} x={0} y={y} width={scrollW} height={ROW_H} fill={rf} style={{cursor:"pointer"}} onClick={()=>setSelectedId(isSel?null:row.id)}/>);

      if(showGhosts&&isOv2&&row.kind!=="lot"&&row.kind!=="sprint"){
        const gx=getBx(row.autoStartH),gw=getBw(row.autoStartH,row.autoEndH);
        el.push(<rect key={`ghost-${row.id}`} x={gx} y={cy-(bH*0.45)/2} width={gw} height={bH*0.45} rx={br} fill={COLOR.ghost} opacity={0.8}/>);
      }
      if(row.kind==="lot"){
        el.push(<rect key={`lot-${row.id}`} x={bx} y={cy-2.5} width={bw} height={5} rx={2} fill={COLOR.lotBar} opacity={0.7}/>);
      }
      if(row.kind==="sprint"){
        el.push(
          <g key={`sprint-${row.id}`}>
            <rect x={0} y={bY} width={scrollW} height={bH} rx={3} fill="rgba(124,77,190,0.04)"/>
            <rect x={bx} y={bY} width={bw} height={bH} rx={3} fill={bc} opacity={0.82}/>
            <rect x={bx} y={bY} width={bw} height={bH} rx={3} fill="url(#sprintStripe)" style={{pointerEvents:"none"}}/>
            {bw>50&&<text x={bx+bw/2} y={cy+2.5} textAnchor="middle" fill="#fff" fontSize={8} fontWeight={700} fontFamily="inherit" style={{pointerEvents:"none"}}>{row.label}{isPM&&baseDate?` · fin ${fds(owDate(baseDate,row.endH))}`:` · ${fmtDur(row.endH-row.startH)}`}</text>}
          </g>
        );
      }
      if(row.kind==="phase"||row.kind==="deliverable"){
        el.push(
          <g key={`bar-${row.id}`} onClick={e=>{e.stopPropagation();setSelectedId(isSel?null:row.id);}}>
            {isSel&&<rect x={bx-2} y={bY-2} width={bw+4} height={bH+4} rx={br+1} fill="rgba(123,63,190,0.18)"/>}
            <rect x={bx} y={bY} width={bw} height={bH} rx={br} fill={bc} opacity={isLive?0.8:1}
              style={{cursor:drag?"grabbing":"grab"}} onMouseDown={e=>startDrag(e,row.id,"move",row.startH,row.endH)}/>
            {isPend&&<rect x={bx} y={bY} width={bw} height={bH} rx={br} fill="url(#pendingStripe)" style={{pointerEvents:"none"}}/>}
            {bw>HANDLE_W*2+4&&<>
              <rect x={bx} y={bY} width={HANDLE_W} height={bH} rx={br} fill="rgba(0,0,0,0.22)" style={{cursor:"ew-resize"}} onMouseDown={e=>startDrag(e,row.id,"resizeL",row.startH,row.endH)}/>
              <rect x={bx+bw-HANDLE_W} y={bY} width={HANDLE_W} height={bH} rx={br} fill="rgba(0,0,0,0.22)" style={{cursor:"ew-resize"}} onMouseDown={e=>startDrag(e,row.id,"resizeR",row.startH,row.endH)}/>
            </>}
            {bw>52&&<text x={bx+bw/2} y={cy+3.5} textAnchor="middle" fill="#fff" fontSize={8.5} fontWeight={700} fontFamily="inherit" style={{pointerEvents:"none",userSelect:"none"}}>{isPM&&baseDate?fds(owDate(baseDate,row.endH)):fmtDur(row.endH-row.startH)}</text>}
          </g>
        );
        if(isLive&&liveOv){
          const tt=isPM&&baseDate?`→ ${fd(owDate(baseDate,row.startH+liveOv.h))}`:fmtDur(liveOv.h);
          el.push(
            <rect key={`tt-r-${row.id}`} x={bx} y={bY-24} width={130} height={19} rx={4} fill={COLOR.phaseManual} opacity={0.95}/>,
            <text key={`tt-t-${row.id}`} x={bx+65} y={bY-11} textAnchor="middle" fill="#fff" fontSize={8.5} fontWeight={700} fontFamily="inherit">{fmtDur(liveOv.h)} {tt}</text>
          );
        }
      }
    });
    return el;
  };

  // ─── COLONNE LABELS (fixe, non scrollable) ────────────────────────────────
  const renderLabelsSVG=()=>{
    const el:React.ReactNode[]=[];
    rows.forEach((row,ri)=>{
      const y=ri*ROW_H;
      const isSel=selectedId===row.id;
      const isPend=pending.has(row.id);
      const isSav=overrides.has(row.id)&&!isPend;
      const isOv2=row.isOverridden;
      let bc=row.color;
      const rf=isSel?COLOR.selectedBg:row.kind==="lot"?COLOR.lotBg:row.kind==="sprint"?COLOR.sprintBg:isOv2?"#f8f2ff":COLOR.phaseBg;
      const rs=isPM&&baseDate?(row.realDateDebut?fdr(row.realDateDebut):fd(owDate(baseDate,row.startH))):null;
      const re2=isPM&&baseDate?(row.realDateFin?fdr(row.realDateFin):fd(owDate(baseDate,row.endH))):null;
      el.push(
        <foreignObject key={`lbl-${row.id}`} x={0} y={y} width={LABEL_W} height={ROW_H}>
          <div xmlns="http://www.w3.org/1999/xhtml"
            style={{height:ROW_H,display:"flex",alignItems:"center",paddingLeft:8+row.depth*11,paddingRight:6,gap:4,overflow:"hidden",boxSizing:"border-box",background:rf,cursor:row.kind==="lot"?"pointer":"default",borderBottom:`1px solid ${COLOR.grid}`}}
            onClick={e=>{e.stopPropagation();
              if(row.kind==="lot")setCollapsed(prev=>{const n=new Set(prev);n.has(row.id)?n.delete(row.id):n.add(row.id);return n;});
              else setSelectedId(isSel?null:row.id);
            }}>
            {row.kind==="lot"&&<span style={{fontSize:9,color:"#666",flexShrink:0,width:10}}>{collapsed.has(row.id)?"▸":"▾"}</span>}
            {row.kind==="sprint"&&<span style={{fontSize:8,color:COLOR.sprintBar,flexShrink:0}}></span>}
            <div style={{width:8,height:8,borderRadius:"50%",background:bc,flexShrink:0}}/>
            <div style={{flex:1,overflow:"hidden",minWidth:0}}>
              <div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:row.kind==="lot"?11.5:row.kind==="phase"?10.5:row.kind==="sprint"?9.5:9,fontWeight:row.kind==="lot"?700:row.kind==="phase"?600:row.kind==="sprint"?600:400,fontStyle:row.kind==="deliverable"?"italic":"normal",color:row.kind==="lot"?COLOR.lotBar:row.kind==="sprint"?COLOR.sprintBar:isOv2?COLOR.phaseManual:"#2d3748",lineHeight:1.1}} title={row.label}>{row.label}</div>
              {row.kind==="sprint"&&isPM&&baseDate&&<div style={{fontSize:7,color:COLOR.sprintBar,opacity:0.7,whiteSpace:"nowrap",lineHeight:1.1}}>{fd(owDate(baseDate,row.startH))} → {fd(owDate(baseDate,row.endH))}</div>}
              {row.kind!=="sprint"&&(rs||re2)&&<div style={{fontSize:7.5,color:"#888",whiteSpace:"nowrap",lineHeight:1.1}}>{rs}{re2&&re2!==rs?` → ${re2}`:""}</div>}
            </div>
            {isPend&&<span title="Non sauvegardé" style={{fontSize:7,color:COLOR.phaseManual,flexShrink:0}}>●</span>}
            {isSav&&row.kind!=="lot"&&row.kind!=="sprint"&&<span title="Réinitialiser" style={{fontSize:9,color:"#aaa",cursor:"pointer",flexShrink:0}} onClick={e2=>{e2.stopPropagation();handleReset(row.id);}}>↺</span>}
            {row.totalJH>0&&<span style={{fontSize:8.5,color:"#999",flexShrink:0}}>{row.totalJH.toFixed(1)}JH</span>}
            {row.kind==="sprint"&&<span style={{fontSize:7.5,color:COLOR.sprintBar,flexShrink:0,opacity:0.8}}>{fmtDur(row.endH-row.startH)}</span>}
          </div>
        </foreignObject>
      );
    });
    return el;
  };

  const selRow=selectedId?rows.find(r=>r.id===selectedId):null;

  return(
    <div style={{fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif"}}>
      {/* Métriques */}
      <div className="d-flex align-items-center gap-3 flex-wrap px-3 py-2 mb-2 rounded" style={{background:"#e8f5e9",border:"1px solid #a5d6a7",fontSize:"0.82rem"}}>
        <strong style={{color:COLOR.lotBar}}>{apc} profil{apc>1?"s":""} actif{apc>1?"s":""}</strong>
        <span className="text-muted">|</span>
        <span title="9h00–12h30 · Pause déj. 12h30–13h30 · 13h30–18h00 · Lun–Ven hors fériés MG" style={{fontSize:"0.75rem",color:"#555",cursor:"help"}}>9h–12h30 🍽 13h30–18h · Lun–Ven · J.fériés MG</span>
        <span className="text-muted">|</span>
        {isPM&&baseDate?(
          <>
            <span>Durée : <strong>{fmtDur(totalHours)}</strong><span className="text-muted" style={{fontSize:"0.75rem",marginLeft:4}}>({(totalHours/HOURS_PER_WEEK).toFixed(1)} sem. · {(totalHours/HOURS_PER_DAY).toFixed(0)} j.ouv.)</span></span>
            <span className="text-muted">|</span>
            <span><strong>{fd(baseDate)}</strong>{planEnd&&<>{" → "}<strong style={{color:isOD?COLOR.danger:"inherit"}}>{fd(planEnd)}</strong></>}</span>
            {contractEndDate&&<><span className="text-muted">|</span><span style={{fontSize:"0.78rem"}}>Contrat : <strong style={{color:isOD?COLOR.danger:COLOR.success}}>{fd(contractEndDate)}</strong>{isOD&&planEnd&&<span style={{color:COLOR.danger,marginLeft:4,fontWeight:700}}>⚠ +{countWorkDaysBetween(contractEndDate,planEnd)} j.ouv.</span>}</span></>}
          </>
        ):(
          <>
            <span>Durée totale : <strong>{fmtDur(totalHours)}</strong></span>
            <span className="text-muted">|</span>
            <span>{(totalHours/HOURS_PER_WEEK).toFixed(1)} sem. · {(totalHours/HOURS_PER_MONTH).toFixed(1)} mois</span>
          </>
        )}
        {mc>0&&<><span className="text-muted">|</span><span style={{color:COLOR.phaseManual,fontWeight:700}}>{mc} phase{mc>1?"s":""} modifiée{mc>1?"s":""}</span></>}
        <small className="ms-auto text-muted">◁▷ Resize · ←→ ou +/- · min:1h</small>
      </div>

      {isPM&&onUpdateProjectDates&&planEnd&&baseDate&&(
        <div className="d-flex align-items-center gap-3 px-3 py-2 mb-2 rounded" style={{background:isOD?"#fdf0f0":"#f0fdf4",border:`1px solid ${isOD?"#f5c6cb":"#a5d6a7"}`,fontSize:"0.8rem"}}>
          <span>{isOD?<span style={{color:COLOR.danger}}>⚠ Dépassement de {countWorkDaysBetween(contractEndDate!,planEnd)} j.ouv.</span>:<span style={{color:COLOR.success}}>✓ Planning dans les délais</span>}</span>
          <span className="text-muted" style={{fontSize:"0.75rem"}}>Fin calculée : <strong>{fdl(planEnd)}</strong></span>
          {datesUpdated?<span style={{color:COLOR.success,fontWeight:700}}>✓ Dates mises à jour</span>
            :<button className="btn btn-sm ms-auto" style={{background:isOD?COLOR.danger:COLOR.success,color:"#fff",fontSize:"0.75rem",fontWeight:600}} onClick={handleUpdateDates} disabled={updatingDates}>
              {updatingDates?<><span className="spinner-border spinner-border-sm me-1" style={{width:10,height:10}}/>…</>:`Mettre à jour → ${fd(planEnd)}`}
            </button>}
        </div>
      )}

      {saveOk&&<div className="alert alert-success py-2 mb-2 small">✓ Planning sauvegardé.</div>}
      {saveErr&&<div className="alert alert-danger py-2 mb-2 small">✗ {saveErr}</div>}

      <div className="card shadow-sm mb-3" style={{border:pending.size>0?`2px solid ${COLOR.phaseManual}`:"1px solid #dee2e6"}}>
        {/* Card header */}
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2" style={{background:COLOR.lotBar,padding:"10px 16px"}}>
          <div>
            <h5 className="mb-0" style={{color:"#fff",fontSize:"1rem"}}>Planning Prévisionnel</h5>
            {isPM&&baseDate&&planEnd&&<small style={{color:"rgba(255,255,255,0.65)",fontSize:"0.72rem"}}>{fd(baseDate)} → {fd(planEnd)} · {(totalHours/HOURS_PER_DAY).toFixed(0)} j.ouv.{isOD&&<span style={{color:"#ffcccc",marginLeft:6}}>⚠ Dépassement</span>}</small>}
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <div className="btn-group btn-group-sm">
              {(["hour","day","week","month"] as TimeUnit[]).map(u=>(
                <button key={u} type="button" className={`btn ${unit===u?"btn-light":"btn-outline-light"}`}
                  style={{fontSize:"0.72rem",fontWeight:unit===u?700:400,padding:"3px 8px"}} onClick={()=>setUnit(u)}>
                  {u==="hour"?"H":u==="day"?"Jour":u==="week"?"Sem.":"Mois"}
                </button>
              ))}
            </div>
            <button type="button" className={`btn btn-sm ${showSprints?"btn-light":"btn-outline-light"}`}
              style={{fontSize:"0.72rem",padding:"3px 8px"}} onClick={()=>setShowSprints(v=>!v)}> Sprints</button>
            <button type="button" className={`btn btn-sm ${showGhosts?"btn-light":"btn-outline-light"}`}
              style={{fontSize:"0.72rem",padding:"3px 8px"}} onClick={()=>setShowGhosts(v=>!v)}>Orig.</button>
            {isPM&&<button type="button" className={`btn btn-sm ${showHolidays?"btn-light":"btn-outline-light"}`}
              style={{fontSize:"0.72rem",padding:"3px 8px"}} onClick={()=>setShowHolidays(v=>!v)}>J.fériés</button>}
            {pending.size>0&&<>
              <button className="btn btn-sm btn-outline-light" style={{fontSize:"0.72rem",padding:"3px 10px"}} onClick={()=>setPending(new Map())} disabled={saving}>Annuler</button>
              <button className="btn btn-sm btn-light" style={{fontSize:"0.72rem",fontWeight:700,color:COLOR.phaseManual,padding:"3px 10px"}} onClick={handleSave} disabled={saving}>
                {saving?<><span className="spinner-border spinner-border-sm me-1" style={{width:10,height:10}}/>…</>:`✓ Valider (${pending.size} modif.)`}
              </button>
            </>}
          </div>
        </div>

        {/* Légende */}
        <div className="d-flex gap-3 flex-wrap align-items-center px-3 py-2" style={{background:"#f4faf4",borderBottom:"1px solid #dee2e6",fontSize:"0.74rem"}}>
          <LDot color={COLOR.phaseAuto} label="Planning auto."/>
          <LDot color={COLOR.phaseManual} label="Modifié manuellement"/>
          <LDot color={COLOR.delivAuto} label="Livrable"/>
          {showSprints&&<LDot color={COLOR.sprintBar} label="Sprint (2 sem. · 80h)"/>}
          <LDot color={COLOR.ghost} label="Durée auto (ref.)"/>
          <LDot color={COLOR.pauseBg} label="🍽 Pause 12h30–13h30" square/>
          {isPM&&showHolidays&&<LDot color="rgba(220,50,50,0.3)" label="Jour férié" square/>}
          {isPM&&contractEndDate&&<LDot color={isOD?COLOR.danger:COLOR.success} label="Fin contrat"/>}
          {pending.size>0&&<span className="ms-auto" style={{color:COLOR.phaseManual,fontWeight:700}}>⚠ {pending.size} modif. non sauvegardée{pending.size>1?"s":""}</span>}
        </div>

        {/* ── GANTT LAYOUT ────────────────────────────────────────────────── */}
        {rows.length===0
          ?<div className="text-center text-muted py-5">Aucune phase. Ajoutez des lots et phases dans l'onglet Backlog.</div>
          :<div style={{display:"flex",flexDirection:"column",maxHeight:580,position:"relative"}}>

            {/* ── Ligne HEADER : label fixe + header scrollable (invisible overflow) */}
            <div style={{display:"flex",flexShrink:0,position:"sticky",top:0,zIndex:10,boxShadow:"0 2px 4px rgba(0,0,0,0.15)"}}>
              {/* Cellule label fixe */}
              <div style={{width:LABEL_W,flexShrink:0,height:HDR_H,background:COLOR.headerBg,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 12px",borderRight:`1.5px solid ${COLOR.gridMajor}`}}>
                <div style={{color:COLOR.headerText,fontSize:11,fontWeight:700}}>Lot / Phase / Livrable</div>
                {baseDate&&<div style={{color:"rgba(255,255,255,0.55)",fontSize:7.5,marginTop:4}}>
                  Début : {fd(baseDate)}{contractEndDate?`  →  ${fd(contractEndDate)}`:""}<br/>9h–12h30 · 13h30–18h
                </div>}
              </div>
              {/* Header scrollable (overflow hidden, synchronisé) */}
                  <div
                    ref={headerScrollRef}
                    style={{
                      flex: 1,
                      overflowX: "auto",   
                      overflowY: "hidden"
                    }}
                  >                
                  <svg width={scrollW} height={HDR_H} style={{display:"block"}}>
                  {renderHeaderSVG()}
                </svg>
              </div>
            </div>

            {/* ── Corps scrollable : labels fixes + barres scrollables ── */}
            <div style={{display:"flex",flex:1,overflow:"hidden",minHeight:0}}>
              {/* Colonne labels fixe (scroll vertical uniquement) */}
              <div style={{width:LABEL_W,flexShrink:0,overflowY:"auto",overflowX:"hidden",borderRight:`1.5px solid ${COLOR.gridMajor}`}}
                onScroll={e=>{if(bodyScrollRef.current)bodyScrollRef.current.scrollTop=(e.target as HTMLElement).scrollTop;}}>
                <svg width={LABEL_W} height={svgBodyH} style={{display:"block",userSelect:"none"}}>
                  <defs>
                    <pattern id="pendingStripe" patternUnits="userSpaceOnUse" width={8} height={8} patternTransform="rotate(45)"><line x1={0} y1={0} x2={0} y2={8} stroke="rgba(255,255,255,0.25)" strokeWidth={4}/></pattern>
                    <pattern id="sprintStripe"  patternUnits="userSpaceOnUse" width={10} height={10} patternTransform="rotate(45)"><line x1={0} y1={0} x2={0} y2={10} stroke="rgba(255,255,255,0.15)" strokeWidth={5}/></pattern>
                  </defs>
                  {renderLabelsSVG()}
                </svg>
              </div>
              {/* Zone barres scrollable dans les deux axes */}
              <div ref={bodyScrollRef} style={{flex:1,overflowX:"auto",overflowY:"auto",maxHeight:500,cursor:drag?"grabbing":"default"}}>
                <svg width={scrollW} height={svgBodyH} style={{display:"block",userSelect:"none"}}>
                  <defs>
                    <pattern id="pendingStripe2" patternUnits="userSpaceOnUse" width={8} height={8} patternTransform="rotate(45)"><line x1={0} y1={0} x2={0} y2={8} stroke="rgba(255,255,255,0.25)" strokeWidth={4}/></pattern>
                    <pattern id="sprintStripe2"  patternUnits="userSpaceOnUse" width={10} height={10} patternTransform="rotate(45)"><line x1={0} y1={0} x2={0} y2={10} stroke="rgba(255,255,255,0.15)" strokeWidth={5}/></pattern>
                  </defs>
                  <rect width={scrollW} height={svgBodyH} fill="#f8fbf8"/>
                  {renderBodySVG()}
                </svg>
              </div>
            </div>
          </div>
        }

        {/* Détail sélection */}
        {selRow&&selRow.kind!=="lot"&&(
          <div style={{borderTop:`2px solid ${selRow.kind==="sprint"?COLOR.sprintBar:COLOR.phaseManual}`,background:selRow.kind==="sprint"?"#f3eeff":"#f5f0ff"}}>
            <div className="d-flex align-items-center gap-3 flex-wrap px-3 py-2" style={{fontSize:"0.8rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                {selRow.kind==="sprint"&&<span style={{color:COLOR.sprintBar}}></span>}
                <div style={{width:10,height:10,borderRadius:"50%",background:selRow.color}}/>
                <strong style={{color:selRow.kind==="sprint"?COLOR.sprintBar:COLOR.phaseManual}}>{selRow.kind==="deliverable"?"• ":""}{selRow.label}</strong>
              </div>
              <span>Durée : <strong>{fmtDur(selRow.endH-selRow.startH)}</strong></span>
              {isPM&&baseDate?(
                <>
                  <span style={{color:COLOR.lotBar}}><strong>{fd(owDate(baseDate,selRow.startH))}</strong>{" → "}<strong>{fd(owDate(baseDate,selRow.endH))}</strong></span>
                  {selRow.isOverridden&&<span className="text-muted" style={{fontSize:"0.72rem"}}>(auto : {fd(owDate(baseDate,selRow.autoStartH))} → {fd(owDate(baseDate,selRow.autoEndH))})</span>}
                  <span className="text-muted" style={{fontSize:"0.72rem"}}>{countWorkDaysBetween(owDate(baseDate,selRow.startH),owDate(baseDate,selRow.endH))} j.ouv.</span>
                </>
              ):(
                <>
                  {selRow.kind!=="sprint"&&<span className="text-muted">Auto : {fmtDur(selRow.autoEndH-selRow.autoStartH)}</span>}
                  <span className="text-muted">JH : {selRow.totalJH.toFixed(1)}</span>
                </>
              )}
              {selRow.realDateDebut&&<span style={{background:"#e8f5e9",padding:"2px 6px",borderRadius:4,fontSize:"0.72rem",color:"#2d6a4f"}}>BDD : {fdr(selRow.realDateDebut)}{selRow.realDateFin?` → ${fdr(selRow.realDateFin)}`:""}</span>}
              {selRow.isOverridden&&selRow.kind!=="sprint"&&<button className="btn btn-link btn-sm p-0 ms-auto text-muted" onClick={()=>handleReset(selRow.id)}>↺ Réinitialiser</button>}
            </div>
            <div className="px-3 pb-2" style={{fontSize:"0.72rem",color:"#999"}}>
              {selRow.kind==="sprint"?`Sprint de ${SPRINT_HOURS}h (2 sem. ouvrées) · 9h–12h30 🍽 13h30–18h · ${HOURS_PER_DAY}h/j`:`←→ ou +/- · pas : ${unit==="hour"?"1h":unit==="day"?"1j":unit==="week"?"1 sem.":"1 mois"} · min:1h`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const LDot:React.FC<{color:string;label:string;square?:boolean}>=({color,label,square})=>(
  <div className="d-flex align-items-center gap-1">
    <div style={{width:10,height:10,background:color,borderRadius:square?2:2,flexShrink:0,border:"1px solid rgba(0,0,0,0.1)"}}/>
    <span className="text-muted">{label}</span>
  </div>
);

export default PlanningTab;