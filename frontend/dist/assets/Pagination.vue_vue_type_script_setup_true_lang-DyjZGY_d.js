import{q as o,d as v,c as x,b as s,t as i,h as c,g as h,p as d,o as f}from"./index-CjBSbw_o.js";/**
 * @license lucide-vue-next v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=o("ChevronLeftIcon",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);/**
 * @license lucide-vue-next v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=o("ChevronRightIcon",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-vue-next v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q=o("TrendingUpIcon",[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17",key:"126l90"}],["polyline",{points:"16 7 22 7 22 13",key:"kwv8wd"}]]);/**
 * @license lucide-vue-next v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B=o("WalletIcon",[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",key:"18etb6"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",key:"xoc0q4"}]]),w={class:"flex items-center justify-between gap-3 flex-wrap text-sm"},C={class:"text-xs text-muted-foreground"},I={class:"flex items-center gap-2"},M=["disabled"],_=["disabled"],L=v({__name:"Pagination",props:{page:{},pageSize:{},total:{}},emits:["change"],setup(e,{emit:p}){const t=e,g=p,r=d(()=>Math.max(1,Math.ceil(t.total/Math.max(1,t.pageSize)))),m=d(()=>t.page>1),u=d(()=>t.page<r.value);function l(a){a<1||a>r.value||a===t.page||g("change",a)}return(a,n)=>(f(),x("div",w,[s("span",C,"共 "+i(e.total)+" 条 · 第 "+i(e.page)+"/"+i(r.value)+" 页",1),s("div",I,[s("button",{type:"button",class:"h-9 w-9 grid place-items-center bg-muted text-foreground border border-ring shadow-hard-muted transition-transform hover:-translate-x-px hover:-translate-y-px disabled:opacity-40 disabled:translate-x-0 disabled:translate-y-0",disabled:!m.value,onClick:n[0]||(n[0]=b=>l(e.page-1)),"aria-label":"上一页"},[c(h(y),{size:16})],8,M),s("button",{type:"button",class:"h-9 w-9 grid place-items-center bg-muted text-foreground border border-ring shadow-hard-muted transition-transform hover:-translate-x-px hover:-translate-y-px disabled:opacity-40 disabled:translate-x-0 disabled:translate-y-0",disabled:!u.value,onClick:n[1]||(n[1]=b=>l(e.page+1)),"aria-label":"下一页"},[c(h(k),{size:16})],8,_)])]))}});export{q as T,B as W,L as _};
