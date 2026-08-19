import{q as g,d as x,c as f,b as n,t as r,h as l,g as c,p as i,o as v}from"./index-CwmQCW6b.js";/**
 * @license lucide-vue-next v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=g("ChevronLeftIcon",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);/**
 * @license lucide-vue-next v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w=g("ChevronRightIcon",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]),C={class:"flex items-center justify-between gap-3 flex-wrap text-sm"},k={class:"text-xs text-muted-foreground"},_={class:"flex items-center gap-2"},z=["disabled"],B=["disabled"],L=x({__name:"Pagination",props:{page:{},pageSize:{},total:{}},emits:["change"],setup(e,{emit:h}){const t=e,m=h,o=i(()=>Math.max(1,Math.ceil(t.total/Math.max(1,t.pageSize)))),p=i(()=>t.page>1),u=i(()=>t.page<o.value);function d(a){a<1||a>o.value||a===t.page||m("change",a)}return(a,s)=>(v(),f("div",C,[n("span",k,"共 "+r(e.total)+" 条 · 第 "+r(e.page)+"/"+r(o.value)+" 页",1),n("div",_,[n("button",{type:"button",class:"h-9 w-9 grid place-items-center bg-muted text-foreground border border-ring shadow-hard-muted transition-transform hover:-translate-x-px hover:-translate-y-px disabled:opacity-40 disabled:translate-x-0 disabled:translate-y-0",disabled:!p.value,onClick:s[0]||(s[0]=b=>d(e.page-1)),"aria-label":"上一页"},[l(c(y),{size:16})],8,z),n("button",{type:"button",class:"h-9 w-9 grid place-items-center bg-muted text-foreground border border-ring shadow-hard-muted transition-transform hover:-translate-x-px hover:-translate-y-px disabled:opacity-40 disabled:translate-x-0 disabled:translate-y-0",disabled:!u.value,onClick:s[1]||(s[1]=b=>d(e.page+1)),"aria-label":"下一页"},[l(c(w),{size:16})],8,B)])]))}});export{L as _};
