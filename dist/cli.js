#!/usr/bin/env node
"use strict";var _r=Object.create;var Je=Object.defineProperty;var Lr=Object.getOwnPropertyDescriptor;var Mr=Object.getOwnPropertyNames;var Dr=Object.getPrototypeOf,Fr=Object.prototype.hasOwnProperty;var Gr=(e,t,r,o)=>{if(t&&typeof t=="object"||typeof t=="function")for(let n of Mr(t))!Fr.call(e,n)&&n!==r&&Je(e,n,{get:()=>t[n],enumerable:!(o=Lr(t,n))||o.enumerable});return e};var be=(e,t,r)=>(r=e!=null?_r(Dr(e)):{},Gr(t||!e||!e.__esModule?Je(r,"default",{value:e,enumerable:!0}):r,e));var wr=be(require("fs")),ee=be(require("path")),Ir=be(require("readline"));var We=e=>e.replace(/(^\w|_\w)/g,t=>t.replace(/_/,"").toUpperCase()),Xe=(e,t,r)=>{if(e.type==="union"&&e.unionTypes)return{kind:"union",unionTypes:e.unionTypes};if(e.type==="string")return e.enumValues?{kind:"enum",enumValues:e.enumValues}:e.format==="date"?{kind:"date",format:"date"}:e.format==="datetime"?{kind:"datetime",format:"datetime"}:{kind:"string",format:e.format};if(e.type==="object")return{kind:"classRef",classRefName:e._sharedTypeName??t+"_"+r};if(e.type==="array"&&e.itemType){let i=t+"_"+r;if(e.itemType.type==="object"){let s=e.itemType._sharedTypeName;return s||(i.endsWith("ies")?s=i.slice(0,-3)+"y":i.endsWith("s")?s=i.slice(0,-1):i.endsWith("List")?s=i.slice(0,-4):s=i+"_Item"),{kind:"array",itemType:{kind:"classRef",classRefName:s}}}return{kind:"array",itemType:Xe(e.itemType,i,"Item")}}return{kind:{number:"number",boolean:"boolean",any:"any",union:"union"}[e.type]??"any",format:e.format}},Pr=(e,t={})=>{let r=e.map(i=>({...i,fields:[...i.fields],annotations:i.annotations?[...i.annotations]:void 0})),o=t.flattenWrappers!==!1;if(t.extractTimestamps!==!1){let i=["createdAt","updatedAt","deletedAt","created_at","updated_at","deleted_at"],s=!1,a=[];for(let l of r){let c=l.fields.filter(f=>i.includes(f.name));if(c.length>=2&&a.length===0){a=c.map(f=>({...f,docComment:"Audit timestamp metadata"}));break}}if(a.length>=2)for(let l of r){if(l.name==="TimestampModel")continue;let c=l.fields.filter(u=>i.includes(u.name)),f=c.length===a.length&&c.every(u=>a.some(p=>p.name===u.name));c.length>=2&&f&&(s||(r.push({name:"TimestampModel",fields:a,isShared:!0,docComment:"Base audit trail timestamp fields"}),s=!0),l.fields=l.fields.filter(u=>!i.includes(u.name)),l.annotations||(l.annotations=[]),l.annotations.push("extends TimestampModel"))}}if(o){let i=!0,s=new Set;for(;i;){i=!1;for(let a=0;a<r.length;a++){let l=r[a];if(l.name!=="Root"&&l.fields.length===1){let c=l.fields[0];if(c.fieldType.kind==="classRef"){let f=c.fieldType.classRefName;if(!f||f===l.name||s.has(f))continue;let u=r.find(p=>p.name===f);if(u){if(l.fields=u.fields.map(p=>({...p,docComment:`[Flattened from ${f}] ${p.docComment??""}`})),u.annotations&&u.annotations.length>0){l.annotations||(l.annotations=[]);for(let p of u.annotations)l.annotations.includes(p)||l.annotations.push(p)}r=r.filter(p=>p.name!==f),s.add(f),i=!0;break}}}}}}return r},k=(e,t="Root",r={})=>{let o=[],n=new Set,i=new Set,s=(a,l)=>{if(n.has(a))return;if(n.add(a),a.type==="array"&&a.itemType){let u=a.itemType._sharedTypeName;u||(l.endsWith("ies")?u=l.slice(0,-3)+"y":l.endsWith("s")?u=l.slice(0,-1):l.endsWith("List")?u=l.slice(0,-4):u=l+"Item"),s(a.itemType,u);return}if(a.type!=="object"||!a.fields||a._sharedTypeName&&i.has(a._sharedTypeName))return;let c=a._sharedTypeName??l;i.add(c);let f=[];for(let[u,p]of Object.entries(a.fields)){let m=Xe(p,c,u);f.push({name:u,fieldType:m,isOptional:!!p.optional,isNullable:!!p.nullable,annotations:[],docComment:""})}o.push({name:c,fields:f,annotations:[],isShared:!!a._sharedTypeName});for(let[u,p]of Object.entries(a.fields)){let m=p._sharedTypeName??c+"_"+u;if(p.type==="object"&&s(p,m),p.type==="array"&&p.itemType?.type==="object"){let d=p.itemType._sharedTypeName;d||(u.endsWith("ies")?d=m.slice(0,-3)+"y":u.endsWith("s")?d=m.slice(0,-1):u.endsWith("List")?d=m.slice(0,-4):d=m+"_Item"),s(p.itemType,d)}}};return s(e,t),Ur(Pr(o,r))},Ur=e=>{let t=new Map,r=new Map,o=new Map;for(let u of e){let p=u.name,m=p.includes("_")?p.split("_").map(d=>We(d)).join(""):We(p);if(p==="TimestampModel"&&(m="TimestampModel"),t.has(m)){let d=t.get(m)+1;t.set(m,d);let y=`${m}_v${d}`;r.set(u,y),o.set(p,y)}else t.set(m,1),r.set(u,m),o.set(p,m)}for(let[u,p]of r.entries())u.name=p;let n=u=>{if(u&&(u.kind==="classRef"&&u.classRefName&&o.has(u.classRefName)&&(u.classRefName=o.get(u.classRefName)),u.kind==="array"&&u.itemType&&n(u.itemType),u.kind==="union"&&u.unionTypes))for(let p of u.unionTypes)n(p)};for(let u of e)for(let p of u.fields)n(p.fieldType);let i=[],s=new Set,a=new Set,l=new Map(e.map(u=>[u.name,u])),c=u=>{if(s.has(u.name)||a.has(u.name))return;a.add(u.name);let p=u.annotations?.find(m=>m.startsWith("extends "));if(p){let m=p.slice(8),d=l.get(m);d&&c(d)}a.delete(u.name),s.add(u.name),i.push(u)},f=e.find(u=>u.name==="TimestampModel");f&&c(f);for(let u of e)c(u);return e.length=0,e.push(...i),e};var j=e=>e.replace(/(^\w|_\w)/g,t=>t.replace(/_/,"").toUpperCase()),R=e=>{let t=e.annotations?.find(r=>r.startsWith("extends "));return t?t.slice(8):null},Te=e=>{let t=j(e);return t.charAt(0).toLowerCase()+t.slice(1)},Ze=e=>{switch(e.kind){case"union":return e.unionTypes?e.unionTypes.join(" | "):"any";case"enum":return e.enumValues?e.enumValues.map(t=>`"${t}"`).join(" | "):"string";case"date":case"datetime":return"Date";case"classRef":return e.classRefName??"any";case"array":if(e.itemType){let t=Ze(e.itemType);return e.itemType.kind==="union"||e.itemType.kind==="enum"?`(${t})[]`:`${t}[]`}return"any[]";default:return e.kind}},en={generate:(e,t="Root",r={})=>{let o=k(e,t),n="";for(let i of o){let s=R(i),a=s?` extends ${s}`:"",l=r.exportDefault&&i.name==="Root"?`export default interface ${i.name}${a}`:`export interface ${i.name}${a}`;n+=`${l} {
`;let c=r.optionalFields;for(let f of i.fields){let u=c||f.isOptional?"?":"",p=`${i.name}.${f.name}`,m=r.customFieldNames?.[p]??f.name,d=Ze(f.fieldType);f.isNullable&&(d=`(${d}) | null`),n+=`  ${m}${u}: ${d};
`}n+=`}

`}return n}},qr=e=>{let t=new Map(e.map(l=>[l.name,l])),r=new Set,o=new Set,n=[],i=new Set,s=l=>l.kind==="classRef"&&l.classRefName?[l.classRefName]:l.kind==="array"&&l.itemType?s(l.itemType):l.kind==="union"&&l.unionTypes?[]:[],a=l=>{if(r.has(l.name)||o.has(l.name))return;o.add(l.name);let c=R(l);if(c){let f=t.get(c);f&&(o.has(c)||a(f))}for(let f of l.fields)for(let u of s(f.fieldType))if(o.has(u))i.add(u);else{let p=t.get(u);p&&a(p)}o.delete(l.name),r.add(l.name),n.push(l)};for(let l of e)a(l);return{sorted:n,cyclicClassRefs:i}},xe=(e,t,r={})=>{switch(e.kind){case"union":{if(!e.unionTypes||e.unionTypes.length===0)return"z.any()";let o=e.unionTypes.map(n=>xe({kind:n},t,r));return o.length===1?o[0]:`z.union([${o.join(", ")}])`}case"enum":return e.enumValues?`z.enum([${e.enumValues.map(o=>`"${o}"`).join(", ")}])`:"z.string()";case"date":return"z.coerce.date()";case"datetime":return"z.string().datetime()";case"classRef":{if(!e.classRefName)return"z.any()";let o=`${Te(e.classRefName)}Schema`;return t.has(e.classRefName)?`z.lazy(() => ${o})`:o}case"array":return e.itemType?`z.array(${xe(e.itemType,t,r)})`:"z.array(z.any())";case"string":return e.format==="email"?"z.string().email()":e.format==="url"?"z.string().url()":e.format==="uuid"?"z.string().uuid()":"z.string()";case"number":return"z.number()";case"boolean":return"z.boolean()";default:return"z.any()"}},nn={generate:(e,t="root",r={})=>{let o=k(e,j(t)),n="",{sorted:i,cyclicClassRefs:s}=qr(o);for(let a of i){let l=Te(a.name),c=R(a),f=c?Te(c):null;f?n+=`export const ${l}Schema = ${f}Schema.extend({
`:n+=`export const ${l}Schema = z.object({
`;for(let u of a.fields){let p=r.optionalFields||u.isOptional?".optional()":"",m=u.isNullable?".nullable()":"",d=xe(u.fieldType,s,r),y=`${a.name}.${u.name}`,$=r.customFieldNames?.[y]??u.name,b=$.toLowerCase();u.fieldType.kind==="number"&&(["age","price","amount","cost","fee","quantity","count","score","rating","rank"].some(g=>b.includes(g))&&(d=d+".min(0)"),(b.includes("rating")||b.includes("score"))&&(d=d+".max(100)")),u.fieldType.kind==="string"&&!u.fieldType.format&&(b.includes("email")?d="z.string().email()":b.includes("url")||b.includes("link")||b.includes("website")?d="z.string().url()":b.includes("uuid")||b==="id"||b.endsWith("_id")||/Id$/.test($)||/ID$/.test($)?d="z.string().uuid()":(b.includes("phone")||b.includes("tel"))&&(d="z.string().regex(/^\\+?[\\d\\s\\-\\.\\(\\)]{7,15}$/)")),n+=`  ${$}: ${d}${m}${p},
`}n+=`});
`,n+=`export type ${a.name} = z.infer<typeof ${l}Schema>;

`}return n}},tn=e=>{switch(e.kind){case"union":return"dynamic";case"enum":return"String";case"date":case"datetime":return"DateTime";case"classRef":return e.classRefName??"dynamic";case"array":return e.itemType?`List<${tn(e.itemType)}>`:"List<dynamic>";case"string":return"String";case"number":return e.format==="int"?"int":"double";case"boolean":return"bool";default:return"dynamic"}},rn={generate:(e,t="Root",r={})=>{let o=k(e,j(t),r),n="";for(let i of o){let s=R(i),a=s?` extends ${s}`:"";n+=`class ${i.name}${a} {
`;for(let l of i.fields){let c=tn(l.fieldType);n+=`  final ${c} ${l.name};
`}n+=`
  ${i.name}({
`;for(let l of i.fields)n+=`    required this.${l.name},
`;n+=`  });
`,n+=`}

`}return n}},Br=e=>{switch(e.kind){case"union":return"mixed";case"enum":return"string";case"date":case"datetime":return"DateTime";case"classRef":return e.classRefName??"mixed";case"array":return"array";case"string":return"string";case"number":return e.format==="int"?"int":"float";case"boolean":return"bool";default:return"mixed"}},on={generate:(e,t="Root",r={})=>{let o=k(e,j(t),r),n="";for(let i of o){let s=R(i),a=s?` extends ${s}`:"";n+=`class ${i.name}${a} {
`;for(let l of i.fields){let c=Br(l.fieldType);n+=`    public ${c} $${l.name};
`}n+=`}

`}return n}},sn=e=>{switch(e.kind){case"union":return"Any";case"enum":return"str";case"date":case"datetime":return"datetime";case"classRef":return e.classRefName??"Any";case"array":return e.itemType?`List[${sn(e.itemType)}]`:"List[Any]";case"string":return"str";case"number":return e.format==="int"?"int":"float";case"boolean":return"bool";default:return"Any"}},an={generate:(e,t="Root",r={})=>{let o=k(e,j(t),r),n="";for(let i of o){let s=R(i)??"BaseModel";if(n+=`class ${i.name}(${s}):
`,i.fields.length===0){n+=`    pass

`;continue}for(let a of i.fields){let l=sn(a.fieldType);(a.isOptional||a.isNullable)&&(l=`Optional[${l}] = None`),n+=`    ${a.name}: ${l}
`}n+=`
`}return n}},Se=e=>{switch(e.kind){case"union":return"string";case"enum":return"string";case"date":case"datetime":return"string";case"classRef":return e.classRefName??"string";case"array":return e.itemType?`repeated ${Se(e.itemType)}`:"repeated string";case"string":return"string";case"number":return e.format==="int"?"int32":"double";case"boolean":return"bool";default:return"string"}},ln={generate:(e,t="Message",r={})=>{let o=k(e,j(t),r),n="";for(let i of o){n+=`message ${i.name} {
`;let s=1,a=R(i);if(a){let l=o.find(c=>c.name===a);if(l)for(let c of l.fields){let f=Se(c.fieldType);n+=`  ${f} ${c.name} = ${s++};
`}}for(let l of i.fields){let c=Se(l.fieldType);n+=`  ${c} ${l.name} = ${s++};
`}n+=`}

`}return n}},$e=e=>{switch(e.kind){case"union":return"String";case"enum":return"String";case"date":case"datetime":return"String";case"classRef":return e.classRefName??"String";case"array":return e.itemType?`[${$e(e.itemType)}]`:"[String]";case"string":return"String";case"number":return e.format==="int"?"Int":"Float";case"boolean":return"Boolean";default:return"String"}},cn={generate:(e,t="Type",r={})=>{let o=k(e,j(t),r),n="";for(let i of o){n+=`type ${i.name} {
`;let s=R(i);if(s){let a=o.find(l=>l.name===s);if(a)for(let l of a.fields){let c=$e(l.fieldType);n+=`  ${l.name}: ${c}
`}}for(let a of i.fields){let l=$e(a.fieldType);n+=`  ${a.name}: ${l}
`}n+=`}

`}return n}},Qe=e=>e.replace(/([A-Z]+)([A-Z][a-z])/g,"$1_$2").replace(/([a-z\d])([A-Z])/g,"$1_$2").toLowerCase(),Vr=new Set(["type","struct","enum","match","use","mod","fn","let","pub","impl","trait","for","loop","while","if","else","return","break","continue","as","async","await","const","crate","dyn","extern","false","true","in","move","mut","ref","self","Self","static","super","unsafe","where"]),zr=e=>Vr.has(e)?`r#${e}`:e,un=e=>{switch(e.kind){case"union":return"serde_json::Value";case"enum":return"String";case"date":case"datetime":return"chrono::DateTime<chrono::Utc>";case"classRef":return e.classRefName??"serde_json::Value";case"array":return e.itemType?`Vec<${un(e.itemType)}>`:"Vec<serde_json::Value>";case"string":return"String";case"number":return e.format==="int"?"i64":"f64";case"boolean":return"bool";default:return"serde_json::Value"}},fn={generate:(e,t="Root",r={})=>{let o=k(e,j(t)),n=`use serde::{Serialize, Deserialize};

`;for(let i of o){let s=R(i);if(n+=`#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ${i.name} {
`,s){let a=Qe(s);n+=`  #[serde(flatten)]
  pub ${a}: ${s},
`}for(let a of i.fields){let l=un(a.fieldType);(a.isOptional||a.isNullable)&&(l=`Option<${l}>`);let c=zr(Qe(a.name));c!==a.name&&(n+=`  #[serde(rename = "${a.name}")]
`),n+=`  pub ${c}: ${l},
`}n+=`}

`}return n}},pn=e=>{switch(e.kind){case"union":return"interface{}";case"enum":return"string";case"date":case"datetime":return"time.Time";case"classRef":return e.classRefName??"interface{}";case"array":return e.itemType?`[]${pn(e.itemType)}`:"[]interface{}";case"string":return"string";case"number":return e.format==="int"?"int64":"float64";case"boolean":return"bool";default:return"interface{}"}},mn={generate:(e,t="Root",r={})=>{let o=k(e,j(t)),i=o.some(s=>s.fields.some(a=>a.fieldType.kind==="date"||a.fieldType.kind==="datetime"))?`package main

import "time"

`:`package main

`;for(let s of o){let a=R(s);i+=`type ${s.name} struct {
`,a&&(i+=`  ${a}
`);for(let l of s.fields){let c=pn(l.fieldType);(l.isNullable||l.isOptional)&&(c=`*${c}`);let f=j(l.name),u=l.isOptional?",omitempty":"";i+=`  ${f} ${c} \`json:"${l.name}${u}"\`
`}i+=`}

`}return i}},dn=e=>{switch(e.kind){case"union":return"Object";case"enum":return"String";case"date":case"datetime":return"Date";case"classRef":return e.classRefName??"Object";case"array":return e.itemType?`List<${dn(e.itemType)}>`:"List<Object>";case"string":return"String";case"number":return e.format==="int"?"Long":"Double";case"boolean":return"Boolean";default:return"Object"}},yn={generate:(e,t="Root",r={})=>{let o=k(e,j(t),r),n="";for(let i of o){let s=R(i),a=s?` extends ${s}`:"";n+=`public class ${i.name}${a} {
`;for(let l of i.fields){let c=dn(l.fieldType);n+=`  private ${c} ${l.name};
`}n+=`}

`}return n}},te=e=>{switch(e.kind){case"union":return"String";case"enum":return"String";case"string":return"String";case"number":return e.format==="int"?"Int":"Float";case"boolean":return"Boolean";case"date":case"datetime":return"DateTime";case"classRef":return e.classRefName??"String";case"array":return e.itemType?`${te(e.itemType)}[]`:"String[]";default:return"String"}},gn={generate:(e,t="Root",r={})=>{let o=k(e,j(t),r),n="";for(let i of o){n+=`model ${i.name} {
`,i.fields.some(l=>l.name==="id")||(n+=`  id String @id @default(uuid())
`);let a=R(i);if(a){let l=o.find(c=>c.name===a);if(l)for(let c of l.fields){let f=te(c.fieldType),u=c.name==="id"?" @id":"";n+=`  ${c.name} ${f}${u}
`}}for(let l of i.fields){let c=te(l.fieldType),f=l.fieldType.kind==="array",u=l.isOptional&&!f?"?":"",p=`${i.name}.${l.name}`,m=r.customFieldNames?.[p]??l.name,d=m==="id"?" @id":"";if(l.fieldType.kind==="classRef"){let y=l.fieldType.classRefName,$=`${l.name}Id`,g=o.find(E=>E.name===y)?.fields.find(E=>E.name==="id"),A=g?te(g.fieldType):"String";n+=`  ${m} ${y}${u} @relation(fields: [${m}Id], references: [id])
`,n+=`  ${m}Id ${A}${u}
`}else n+=`  ${m} ${c}${u}${d}
`}n+=`}

`}return n}},hn={generate:(e,t="Component")=>{let r=e.fields||{},o=Object.keys(r),n=`import React from 'react';

`;return n+=`export const ${t}Card = ({ data }: { data: any }) => (
`,n+=`  <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
`,n+=`    <h3 className="text-lg font-black mb-4 dark:text-white">${t}</h3>
`,n+=`    <div className="grid grid-cols-2 gap-4">
`,o.slice(0,8).forEach(i=>{n+=`      <div>
        <p className="text-[10px] text-slate-400 uppercase">${i}</p>
        <p className="text-sm font-bold dark:text-slate-200">{typeof data?.${i} === 'object' ? JSON.stringify(data?.${i}) : String(data?.${i} ?? '-')}</p>
      </div>
`}),n+=`    </div>
  </div>
);
`,n}},bn={generate:e=>{let t=0,r=(o,n="",i="")=>{if(o.type==="object"&&o.fields){let s={};for(let[a,l]of Object.entries(o.fields))s[a]=r(l,a,n);return s}if(o.type==="array"){let s=o.itemType||{type:"string"},a=t;t=0;let l=Array.from({length:50},(c,f)=>(t=f+1,r(s,n,i)));return t=a,l}if(o.type==="number")return n.toLowerCase().includes("id")||n.toLowerCase().includes("price")||n.toLowerCase().includes("amount")?t>0?t:1:n.toLowerCase().includes("age")?28:42;if(o.type==="boolean")return!0;if(o.type==="string"){if(o.format==="uuid")return`550e8400-e29b-41d4-a716-${String(t||1).padStart(12,"0")}`;if(o.format==="email")return"test@example.com";if(o.format==="url")return"https://example.com/api";if(o.format==="datetime")return new Date().toISOString();let s=n.toLowerCase(),a=i.toLowerCase(),l=a==="items"||a==="products"||a==="entries"||a==="records";if(s.includes("name")){if(l)return`Item ${String.fromCharCode(64+(t||1))}`;let c=["Alice Johnson","Bob Smith","Carol White","David Brown","Emma Davis","Frank Wilson","Grace Lee","Henry Taylor"];return c[((t||1)-1)%c.length]}if(s.includes("email")){let c=["example.com","test.org","demo.io","sample.net"];return`user${t||1}@${c[((t||1)-1)%c.length]}`}if(s.includes("url")||s.includes("link")||s.includes("avatar")||s.includes("image"))return"https://example.com/sample.png";if(s.includes("id"))return`550e8400-e29b-41d4-a716-${String(t||1).padStart(12,"0")}`;if(s.includes("date")||s.includes("time")||s.includes("created")||s.includes("updated"))return new Date().toISOString();if(s.includes("city")){let c=["Tokyo","New York","London","Paris","Sydney","Berlin","Singapore","Toronto"];return c[((t||1)-1)%c.length]}if(s.includes("street")||s.includes("address"))return"123 Main Street";if(s.includes("zip")||s.includes("postal"))return"100-0001";if(s.includes("phone")||s.includes("tel"))return"+81-90-1234-5678";if(s.includes("role")||s.includes("type")||s.includes("status")||s.includes("category")){let c=["admin","user","guest","moderator"];return c[((t||1)-1)%c.length]}return s.includes("desc")||s.includes("memo")||s.includes("text")||s.includes("bio")||s.includes("note")?"This is a sample generated text to simulate a realistic description or content block.":s.includes("title")?"Sample Title":s.includes("price")||s.includes("cost")?(19.99+(t||0)*10).toFixed(2):s.includes("color")?"#3366ff":s.includes("country")?"Japan":s.includes("lang")||s.includes("locale")?"en-US":"sample_"+n}return null};return JSON.stringify(r(e),null,2)}},Tn=e=>{switch(e.kind){case"union":return"object";case"enum":return"string";case"date":case"datetime":return"DateTime";case"classRef":return e.classRefName??"object";case"array":return e.itemType?`List<${Tn(e.itemType)}>`:"List<object>";case"string":return"string";case"number":return e.format==="int"?"long":"double";case"boolean":return"bool";default:return"object"}},xn={generate:(e,t="Root",r={})=>{let o=k(e,j(t),r),n="";for(let i of o){let s=R(i),a=s?` : ${s}`:"";n+=`public class ${i.name}${a}
{
`;for(let l of i.fields){let c=Tn(l.fieldType),f=l.isOptional||l.isNullable?"?":"";n+=`    public ${c}${f} ${j(l.name)} { get; set; }
`}n+=`}

`}return n}},Sn=e=>{switch(e.kind){case"union":return"AnyCodable";case"enum":return"String";case"date":case"datetime":return"Date";case"classRef":return e.classRefName??"AnyCodable";case"array":return e.itemType?`[${Sn(e.itemType)}]`:"[AnyCodable]";case"string":return"String";case"number":return e.format==="int"?"Int":"Double";case"boolean":return"Bool";default:return"AnyCodable"}},$n={generate:(e,t="Root",r={})=>{let o=k(e,j(t),r),n="";for(let i of o){let s=R(i),a=s?`: ${s}`:": Codable";n+=`struct ${i.name} ${a} {
`;for(let l of i.fields){let c=Sn(l.fieldType);(l.isOptional||l.isNullable)&&(c+="?"),n+=`    let ${l.name}: ${c}
`}n+=`}

`}return n}},An=e=>{switch(e.kind){case"union":return"Any";case"enum":return"String";case"date":case"datetime":return"String // ISO 8601";case"classRef":return e.classRefName??"Any";case"array":return e.itemType?`List<${An(e.itemType)}>`:"List<Any>";case"string":return"String";case"number":return e.format==="int"?"Int":"Double";case"boolean":return"Boolean";default:return"Any"}},Cn={generate:(e,t="Root",r={})=>{let o=k(e,j(t),r),n="";for(let i of o){let s=R(i),a=s?` : ${s}`:"";n+=`data class ${i.name}(
`;let l=i.fields.map(c=>{let f=An(c.fieldType);return(c.isOptional||c.isNullable)&&(f+="?"),`    val ${c.name}: ${f}`});n+=l.join(`,
`),n+=`
)${a}

`}return n}},On={generate:e=>{let t=r=>{if(r.type==="object"&&r.fields){let n=Object.keys(r.fields).filter(s=>!r.fields[s].optional),i={type:"object",properties:Object.keys(r.fields).reduce((s,a)=>({...s,[a]:t(r.fields[a])}),{})};return n.length>0&&(i.required=n),r.nullable&&(i.nullable=!0),i}if(r.type==="array"){let n={type:"array",items:t(r.itemType)};return r.nullable&&(n.nullable=!0),n}if(r.type==="union"&&r.unionTypes){let n={anyOf:r.unionTypes.map(i=>({type:i}))};return r.nullable&&(n.nullable=!0),n}let o={type:r.type};return r.format&&(o.format=r.format),r.enumValues&&r.enumValues.length>0&&(o.enum=r.enumValues),r.nullable&&(o.nullable=!0),o};return JSON.stringify({$schema:"http://json-schema.org/draft-07/schema#",...t(e)},null,2)}},re={generate:(e,t="Root")=>{if(e.type==="object"&&e.fields){let r=`# API Field Specifications: ${t}

`;r+=`| Field | Type | Required | Description |
`,r+=`| :--- | :--- | :--- | :--- |
`;for(let[o,n]of Object.entries(e.fields)){let i=n.type==="object"?"Object":n.type==="array"?`${n.itemType?.type||"any"}[]`:n.type;n.type==="union"&&n.unionTypes&&(i=n.unionTypes.join(" \\| ")),n.nullable&&(i+=" (nullable)");let s=n.optional?"No":"Yes",a="No description provided.",l=o.toLowerCase();l==="id"||l.endsWith("id")?a="Unique identifier for the record.":l==="username"?a="User's unique display name.":l==="name"||l==="fullname"?a="Full name of the user or entity.":l==="email"?a="Primary email address.":l==="status"?a="Operational or lifecycle state.":l==="role"?a="User privilege role or system role.":l==="avatarurl"||l==="avatar"?a="Public URL to the user's avatar image.":l==="stats"?a="Statistical metrics and counters.":l==="preferences"?a="User preference flags and custom configurations.":l.startsWith("is")||l.startsWith("has")?a="Boolean flag representing status.":l==="createdat"||l==="created_at"?a="Timestamp representing record creation time.":l==="updatedat"||l==="updated_at"?a="Timestamp representing the last update time.":l==="lastlogin"||l==="last_login"?a="Timestamp of the user's most recent session activity.":n.format==="uuid"?a="Universally Unique Identifier (UUID) format string.":n.format==="email"?a="Validated email format string.":n.format==="url"?a="Fully-qualified web URL (HTTP/HTTPS).":n.format==="datetime"&&(a="ISO 8601 compliant UTC date-time string."),r+=`| \`${o}\` | \`${i}\` | ${s} | ${a} |
`}r+=`
`;for(let[o,n]of Object.entries(e.fields))n.type==="object"&&(r+=`
---

`,r+=re.generate(n,o.charAt(0).toUpperCase()+o.slice(1))),n.type==="array"&&n.itemType?.type==="object"&&(r+=`
---

`,r+=re.generate(n.itemType,o.charAt(0).toUpperCase()+o.slice(1)+"Item"));return r}return""}};function Un(e){return typeof e>"u"||e===null}function Yr(e){return typeof e=="object"&&e!==null}function Hr(e){return Array.isArray(e)?e:Un(e)?[]:[e]}function Kr(e,t){var r,o,n,i;if(t)for(i=Object.keys(t),r=0,o=i.length;r<o;r+=1)n=i[r],e[n]=t[n];return e}function Jr(e,t){var r="",o;for(o=0;o<t;o+=1)r+=e;return r}function Wr(e){return e===0&&Number.NEGATIVE_INFINITY===1/e}var Xr=Un,Qr=Yr,Zr=Hr,ei=Jr,ni=Wr,ti=Kr,O={isNothing:Xr,isObject:Qr,toArray:Zr,repeat:ei,isNegativeZero:ni,extend:ti};function qn(e,t){var r="",o=e.reason||"(unknown reason)";return e.mark?(e.mark.name&&(r+='in "'+e.mark.name+'" '),r+="("+(e.mark.line+1)+":"+(e.mark.column+1)+")",!t&&e.mark.snippet&&(r+=`

`+e.mark.snippet),o+" "+r):o}function J(e,t){Error.call(this),this.name="YAMLException",this.reason=e,this.mark=t,this.message=qn(this,!1),Error.captureStackTrace?Error.captureStackTrace(this,this.constructor):this.stack=new Error().stack||""}J.prototype=Object.create(Error.prototype);J.prototype.constructor=J;J.prototype.toString=function(t){return this.name+": "+qn(this,t)};var w=J;function Ae(e,t,r,o,n){var i="",s="",a=Math.floor(n/2)-1;return o-t>a&&(i=" ... ",t=o-a+i.length),r-o>a&&(s=" ...",r=o+a-s.length),{str:i+e.slice(t,r).replace(/\t/g,"\u2192")+s,pos:o-t+i.length}}function Ce(e,t){return O.repeat(" ",t-e.length)+e}function ri(e,t){if(t=Object.create(t||null),!e.buffer)return null;t.maxLength||(t.maxLength=79),typeof t.indent!="number"&&(t.indent=1),typeof t.linesBefore!="number"&&(t.linesBefore=3),typeof t.linesAfter!="number"&&(t.linesAfter=2);for(var r=/\r?\n|\r|\0/g,o=[0],n=[],i,s=-1;i=r.exec(e.buffer);)n.push(i.index),o.push(i.index+i[0].length),e.position<=i.index&&s<0&&(s=o.length-2);s<0&&(s=o.length-1);var a="",l,c,f=Math.min(e.line+t.linesAfter,n.length).toString().length,u=t.maxLength-(t.indent+f+3);for(l=1;l<=t.linesBefore&&!(s-l<0);l++)c=Ae(e.buffer,o[s-l],n[s-l],e.position-(o[s]-o[s-l]),u),a=O.repeat(" ",t.indent)+Ce((e.line-l+1).toString(),f)+" | "+c.str+`
`+a;for(c=Ae(e.buffer,o[s],n[s],e.position,u),a+=O.repeat(" ",t.indent)+Ce((e.line+1).toString(),f)+" | "+c.str+`
`,a+=O.repeat("-",t.indent+f+3+c.pos)+`^
`,l=1;l<=t.linesAfter&&!(s+l>=n.length);l++)c=Ae(e.buffer,o[s+l],n[s+l],e.position-(o[s]-o[s+l]),u),a+=O.repeat(" ",t.indent)+Ce((e.line+l+1).toString(),f)+" | "+c.str+`
`;return a.replace(/\n$/,"")}var ii=ri,oi=["kind","multi","resolve","construct","instanceOf","predicate","represent","representName","defaultStyle","styleAliases"],si=["scalar","sequence","mapping"];function ai(e){var t={};return e!==null&&Object.keys(e).forEach(function(r){e[r].forEach(function(o){t[String(o)]=r})}),t}function li(e,t){if(t=t||{},Object.keys(t).forEach(function(r){if(oi.indexOf(r)===-1)throw new w('Unknown option "'+r+'" is met in definition of "'+e+'" YAML type.')}),this.options=t,this.tag=e,this.kind=t.kind||null,this.resolve=t.resolve||function(){return!0},this.construct=t.construct||function(r){return r},this.instanceOf=t.instanceOf||null,this.predicate=t.predicate||null,this.represent=t.represent||null,this.representName=t.representName||null,this.defaultStyle=t.defaultStyle||null,this.multi=t.multi||!1,this.styleAliases=ai(t.styleAliases||null),si.indexOf(this.kind)===-1)throw new w('Unknown kind "'+this.kind+'" is specified for "'+e+'" YAML type.')}var N=li;function Nn(e,t){var r=[];return e[t].forEach(function(o){var n=r.length;r.forEach(function(i,s){i.tag===o.tag&&i.kind===o.kind&&i.multi===o.multi&&(n=s)}),r[n]=o}),r}function ci(){var e={scalar:{},sequence:{},mapping:{},fallback:{},multi:{scalar:[],sequence:[],mapping:[],fallback:[]}},t,r;function o(n){n.multi?(e.multi[n.kind].push(n),e.multi.fallback.push(n)):e[n.kind][n.tag]=e.fallback[n.tag]=n}for(t=0,r=arguments.length;t<r;t+=1)arguments[t].forEach(o);return e}function Ne(e){return this.extend(e)}Ne.prototype.extend=function(t){var r=[],o=[];if(t instanceof N)o.push(t);else if(Array.isArray(t))o=o.concat(t);else if(t&&(Array.isArray(t.implicit)||Array.isArray(t.explicit)))t.implicit&&(r=r.concat(t.implicit)),t.explicit&&(o=o.concat(t.explicit));else throw new w("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");r.forEach(function(i){if(!(i instanceof N))throw new w("Specified list of YAML types (or a single Type object) contains a non-Type object.");if(i.loadKind&&i.loadKind!=="scalar")throw new w("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");if(i.multi)throw new w("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.")}),o.forEach(function(i){if(!(i instanceof N))throw new w("Specified list of YAML types (or a single Type object) contains a non-Type object.")});var n=Object.create(Ne.prototype);return n.implicit=(this.implicit||[]).concat(r),n.explicit=(this.explicit||[]).concat(o),n.compiledImplicit=Nn(n,"implicit"),n.compiledExplicit=Nn(n,"explicit"),n.compiledTypeMap=ci(n.compiledImplicit,n.compiledExplicit),n};var Bn=Ne,Vn=new N("tag:yaml.org,2002:str",{kind:"scalar",construct:function(e){return e!==null?e:""}}),zn=new N("tag:yaml.org,2002:seq",{kind:"sequence",construct:function(e){return e!==null?e:[]}}),Yn=new N("tag:yaml.org,2002:map",{kind:"mapping",construct:function(e){return e!==null?e:{}}}),Hn=new Bn({explicit:[Vn,zn,Yn]});function ui(e){if(e===null)return!0;var t=e.length;return t===1&&e==="~"||t===4&&(e==="null"||e==="Null"||e==="NULL")}function fi(){return null}function pi(e){return e===null}var Kn=new N("tag:yaml.org,2002:null",{kind:"scalar",resolve:ui,construct:fi,predicate:pi,represent:{canonical:function(){return"~"},lowercase:function(){return"null"},uppercase:function(){return"NULL"},camelcase:function(){return"Null"},empty:function(){return""}},defaultStyle:"lowercase"});function mi(e){if(e===null)return!1;var t=e.length;return t===4&&(e==="true"||e==="True"||e==="TRUE")||t===5&&(e==="false"||e==="False"||e==="FALSE")}function di(e){return e==="true"||e==="True"||e==="TRUE"}function yi(e){return Object.prototype.toString.call(e)==="[object Boolean]"}var Jn=new N("tag:yaml.org,2002:bool",{kind:"scalar",resolve:mi,construct:di,predicate:yi,represent:{lowercase:function(e){return e?"true":"false"},uppercase:function(e){return e?"TRUE":"FALSE"},camelcase:function(e){return e?"True":"False"}},defaultStyle:"lowercase"});function gi(e){return 48<=e&&e<=57||65<=e&&e<=70||97<=e&&e<=102}function hi(e){return 48<=e&&e<=55}function bi(e){return 48<=e&&e<=57}function Ti(e){if(e===null)return!1;var t=e.length,r=0,o=!1,n;if(!t)return!1;if(n=e[r],(n==="-"||n==="+")&&(n=e[++r]),n==="0"){if(r+1===t)return!0;if(n=e[++r],n==="b"){for(r++;r<t;r++)if(n=e[r],n!=="_"){if(n!=="0"&&n!=="1")return!1;o=!0}return o&&n!=="_"}if(n==="x"){for(r++;r<t;r++)if(n=e[r],n!=="_"){if(!gi(e.charCodeAt(r)))return!1;o=!0}return o&&n!=="_"}if(n==="o"){for(r++;r<t;r++)if(n=e[r],n!=="_"){if(!hi(e.charCodeAt(r)))return!1;o=!0}return o&&n!=="_"}}if(n==="_")return!1;for(;r<t;r++)if(n=e[r],n!=="_"){if(!bi(e.charCodeAt(r)))return!1;o=!0}return!(!o||n==="_")}function xi(e){var t=e,r=1,o;if(t.indexOf("_")!==-1&&(t=t.replace(/_/g,"")),o=t[0],(o==="-"||o==="+")&&(o==="-"&&(r=-1),t=t.slice(1),o=t[0]),t==="0")return 0;if(o==="0"){if(t[1]==="b")return r*parseInt(t.slice(2),2);if(t[1]==="x")return r*parseInt(t.slice(2),16);if(t[1]==="o")return r*parseInt(t.slice(2),8)}return r*parseInt(t,10)}function Si(e){return Object.prototype.toString.call(e)==="[object Number]"&&e%1===0&&!O.isNegativeZero(e)}var Wn=new N("tag:yaml.org,2002:int",{kind:"scalar",resolve:Ti,construct:xi,predicate:Si,represent:{binary:function(e){return e>=0?"0b"+e.toString(2):"-0b"+e.toString(2).slice(1)},octal:function(e){return e>=0?"0o"+e.toString(8):"-0o"+e.toString(8).slice(1)},decimal:function(e){return e.toString(10)},hexadecimal:function(e){return e>=0?"0x"+e.toString(16).toUpperCase():"-0x"+e.toString(16).toUpperCase().slice(1)}},defaultStyle:"decimal",styleAliases:{binary:[2,"bin"],octal:[8,"oct"],decimal:[10,"dec"],hexadecimal:[16,"hex"]}}),$i=new RegExp("^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");function Ai(e){return!(e===null||!$i.test(e)||e[e.length-1]==="_")}function Ci(e){var t,r;return t=e.replace(/_/g,"").toLowerCase(),r=t[0]==="-"?-1:1,"+-".indexOf(t[0])>=0&&(t=t.slice(1)),t===".inf"?r===1?Number.POSITIVE_INFINITY:Number.NEGATIVE_INFINITY:t===".nan"?NaN:r*parseFloat(t,10)}var Oi=/^[-+]?[0-9]+e/;function Ni(e,t){var r;if(isNaN(e))switch(t){case"lowercase":return".nan";case"uppercase":return".NAN";case"camelcase":return".NaN"}else if(Number.POSITIVE_INFINITY===e)switch(t){case"lowercase":return".inf";case"uppercase":return".INF";case"camelcase":return".Inf"}else if(Number.NEGATIVE_INFINITY===e)switch(t){case"lowercase":return"-.inf";case"uppercase":return"-.INF";case"camelcase":return"-.Inf"}else if(O.isNegativeZero(e))return"-0.0";return r=e.toString(10),Oi.test(r)?r.replace("e",".e"):r}function Ei(e){return Object.prototype.toString.call(e)==="[object Number]"&&(e%1!==0||O.isNegativeZero(e))}var Xn=new N("tag:yaml.org,2002:float",{kind:"scalar",resolve:Ai,construct:Ci,predicate:Ei,represent:Ni,defaultStyle:"lowercase"}),Qn=Hn.extend({implicit:[Kn,Jn,Wn,Xn]}),Zn=Qn,et=new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"),nt=new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$");function ji(e){return e===null?!1:et.exec(e)!==null||nt.exec(e)!==null}function vi(e){var t,r,o,n,i,s,a,l=0,c=null,f,u,p;if(t=et.exec(e),t===null&&(t=nt.exec(e)),t===null)throw new Error("Date resolve error");if(r=+t[1],o=+t[2]-1,n=+t[3],!t[4])return new Date(Date.UTC(r,o,n));if(i=+t[4],s=+t[5],a=+t[6],t[7]){for(l=t[7].slice(0,3);l.length<3;)l+="0";l=+l}return t[9]&&(f=+t[10],u=+(t[11]||0),c=(f*60+u)*6e4,t[9]==="-"&&(c=-c)),p=new Date(Date.UTC(r,o,n,i,s,a,l)),c&&p.setTime(p.getTime()-c),p}function ki(e){return e.toISOString()}var tt=new N("tag:yaml.org,2002:timestamp",{kind:"scalar",resolve:ji,construct:vi,instanceOf:Date,represent:ki});function Ri(e){return e==="<<"||e===null}var rt=new N("tag:yaml.org,2002:merge",{kind:"scalar",resolve:Ri}),Re=`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=
\r`;function wi(e){if(e===null)return!1;var t,r,o=0,n=e.length,i=Re;for(r=0;r<n;r++)if(t=i.indexOf(e.charAt(r)),!(t>64)){if(t<0)return!1;o+=6}return o%8===0}function Ii(e){var t,r,o=e.replace(/[\r\n=]/g,""),n=o.length,i=Re,s=0,a=[];for(t=0;t<n;t++)t%4===0&&t&&(a.push(s>>16&255),a.push(s>>8&255),a.push(s&255)),s=s<<6|i.indexOf(o.charAt(t));return r=n%4*6,r===0?(a.push(s>>16&255),a.push(s>>8&255),a.push(s&255)):r===18?(a.push(s>>10&255),a.push(s>>2&255)):r===12&&a.push(s>>4&255),new Uint8Array(a)}function _i(e){var t="",r=0,o,n,i=e.length,s=Re;for(o=0;o<i;o++)o%3===0&&o&&(t+=s[r>>18&63],t+=s[r>>12&63],t+=s[r>>6&63],t+=s[r&63]),r=(r<<8)+e[o];return n=i%3,n===0?(t+=s[r>>18&63],t+=s[r>>12&63],t+=s[r>>6&63],t+=s[r&63]):n===2?(t+=s[r>>10&63],t+=s[r>>4&63],t+=s[r<<2&63],t+=s[64]):n===1&&(t+=s[r>>2&63],t+=s[r<<4&63],t+=s[64],t+=s[64]),t}function Li(e){return Object.prototype.toString.call(e)==="[object Uint8Array]"}var it=new N("tag:yaml.org,2002:binary",{kind:"scalar",resolve:wi,construct:Ii,predicate:Li,represent:_i}),Mi=Object.prototype.hasOwnProperty,Di=Object.prototype.toString;function Fi(e){if(e===null)return!0;var t=[],r,o,n,i,s,a=e;for(r=0,o=a.length;r<o;r+=1){if(n=a[r],s=!1,Di.call(n)!=="[object Object]")return!1;for(i in n)if(Mi.call(n,i))if(!s)s=!0;else return!1;if(!s)return!1;if(t.indexOf(i)===-1)t.push(i);else return!1}return!0}function Gi(e){return e!==null?e:[]}var ot=new N("tag:yaml.org,2002:omap",{kind:"sequence",resolve:Fi,construct:Gi}),Pi=Object.prototype.toString;function Ui(e){if(e===null)return!0;var t,r,o,n,i,s=e;for(i=new Array(s.length),t=0,r=s.length;t<r;t+=1){if(o=s[t],Pi.call(o)!=="[object Object]"||(n=Object.keys(o),n.length!==1))return!1;i[t]=[n[0],o[n[0]]]}return!0}function qi(e){if(e===null)return[];var t,r,o,n,i,s=e;for(i=new Array(s.length),t=0,r=s.length;t<r;t+=1)o=s[t],n=Object.keys(o),i[t]=[n[0],o[n[0]]];return i}var st=new N("tag:yaml.org,2002:pairs",{kind:"sequence",resolve:Ui,construct:qi}),Bi=Object.prototype.hasOwnProperty;function Vi(e){if(e===null)return!0;var t,r=e;for(t in r)if(Bi.call(r,t)&&r[t]!==null)return!1;return!0}function zi(e){return e!==null?e:{}}var at=new N("tag:yaml.org,2002:set",{kind:"mapping",resolve:Vi,construct:zi}),we=Zn.extend({implicit:[tt,rt],explicit:[it,ot,st,at]}),D=Object.prototype.hasOwnProperty,ie=1,lt=2,ct=3,oe=4,Oe=1,Yi=2,En=3,Hi=/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/,Ki=/[\x85\u2028\u2029]/,Ji=/[,\[\]\{\}]/,ut=/^(?:!|!!|![a-z\-]+!)$/i,ft=/^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;function jn(e){return Object.prototype.toString.call(e)}function _(e){return e===10||e===13}function U(e){return e===9||e===32}function I(e){return e===9||e===32||e===10||e===13}function V(e){return e===44||e===91||e===93||e===123||e===125}function Wi(e){var t;return 48<=e&&e<=57?e-48:(t=e|32,97<=t&&t<=102?t-97+10:-1)}function Xi(e){return e===120?2:e===117?4:e===85?8:0}function Qi(e){return 48<=e&&e<=57?e-48:-1}function vn(e){return e===48?"\0":e===97?"\x07":e===98?"\b":e===116||e===9?"	":e===110?`
`:e===118?"\v":e===102?"\f":e===114?"\r":e===101?"\x1B":e===32?" ":e===34?'"':e===47?"/":e===92?"\\":e===78?"\x85":e===95?"\xA0":e===76?"\u2028":e===80?"\u2029":""}function Zi(e){return e<=65535?String.fromCharCode(e):String.fromCharCode((e-65536>>10)+55296,(e-65536&1023)+56320)}function pt(e,t,r){t==="__proto__"?Object.defineProperty(e,t,{configurable:!0,enumerable:!0,writable:!0,value:r}):e[t]=r}var mt=new Array(256),dt=new Array(256);for(P=0;P<256;P++)mt[P]=vn(P)?1:0,dt[P]=vn(P);var P;function eo(e,t){this.input=e,this.filename=t.filename||null,this.schema=t.schema||we,this.onWarning=t.onWarning||null,this.legacy=t.legacy||!1,this.json=t.json||!1,this.listener=t.listener||null,this.implicitTypes=this.schema.compiledImplicit,this.typeMap=this.schema.compiledTypeMap,this.length=e.length,this.position=0,this.line=0,this.lineStart=0,this.lineIndent=0,this.firstTabInLine=-1,this.documents=[]}function yt(e,t){var r={name:e.filename,buffer:e.input.slice(0,-1),position:e.position,line:e.line,column:e.position-e.lineStart};return r.snippet=ii(r),new w(t,r)}function h(e,t){throw yt(e,t)}function se(e,t){e.onWarning&&e.onWarning.call(null,yt(e,t))}var kn={YAML:function(t,r,o){var n,i,s;t.version!==null&&h(t,"duplication of %YAML directive"),o.length!==1&&h(t,"YAML directive accepts exactly one argument"),n=/^([0-9]+)\.([0-9]+)$/.exec(o[0]),n===null&&h(t,"ill-formed argument of the YAML directive"),i=parseInt(n[1],10),s=parseInt(n[2],10),i!==1&&h(t,"unacceptable YAML version of the document"),t.version=o[0],t.checkLineBreaks=s<2,s!==1&&s!==2&&se(t,"unsupported YAML version of the document")},TAG:function(t,r,o){var n,i;o.length!==2&&h(t,"TAG directive accepts exactly two arguments"),n=o[0],i=o[1],ut.test(n)||h(t,"ill-formed tag handle (first argument) of the TAG directive"),D.call(t.tagMap,n)&&h(t,'there is a previously declared suffix for "'+n+'" tag handle'),ft.test(i)||h(t,"ill-formed tag prefix (second argument) of the TAG directive");try{i=decodeURIComponent(i)}catch{h(t,"tag prefix is malformed: "+i)}t.tagMap[n]=i}};function M(e,t,r,o){var n,i,s,a;if(t<r){if(a=e.input.slice(t,r),o)for(n=0,i=a.length;n<i;n+=1)s=a.charCodeAt(n),s===9||32<=s&&s<=1114111||h(e,"expected valid JSON character");else Hi.test(a)&&h(e,"the stream contains non-printable characters");e.result+=a}}function Rn(e,t,r,o){var n,i,s,a;for(O.isObject(r)||h(e,"cannot merge mappings; the provided source object is unacceptable"),n=Object.keys(r),s=0,a=n.length;s<a;s+=1)i=n[s],D.call(t,i)||(pt(t,i,r[i]),o[i]=!0)}function z(e,t,r,o,n,i,s,a,l){var c,f;if(Array.isArray(n))for(n=Array.prototype.slice.call(n),c=0,f=n.length;c<f;c+=1)Array.isArray(n[c])&&h(e,"nested arrays are not supported inside keys"),typeof n=="object"&&jn(n[c])==="[object Object]"&&(n[c]="[object Object]");if(typeof n=="object"&&jn(n)==="[object Object]"&&(n="[object Object]"),n=String(n),t===null&&(t={}),o==="tag:yaml.org,2002:merge")if(Array.isArray(i))for(c=0,f=i.length;c<f;c+=1)Rn(e,t,i[c],r);else Rn(e,t,i,r);else!e.json&&!D.call(r,n)&&D.call(t,n)&&(e.line=s||e.line,e.lineStart=a||e.lineStart,e.position=l||e.position,h(e,"duplicated mapping key")),pt(t,n,i),delete r[n];return t}function Ie(e){var t;t=e.input.charCodeAt(e.position),t===10?e.position++:t===13?(e.position++,e.input.charCodeAt(e.position)===10&&e.position++):h(e,"a line break is expected"),e.line+=1,e.lineStart=e.position,e.firstTabInLine=-1}function C(e,t,r){for(var o=0,n=e.input.charCodeAt(e.position);n!==0;){for(;U(n);)n===9&&e.firstTabInLine===-1&&(e.firstTabInLine=e.position),n=e.input.charCodeAt(++e.position);if(t&&n===35)do n=e.input.charCodeAt(++e.position);while(n!==10&&n!==13&&n!==0);if(_(n))for(Ie(e),n=e.input.charCodeAt(e.position),o++,e.lineIndent=0;n===32;)e.lineIndent++,n=e.input.charCodeAt(++e.position);else break}return r!==-1&&o!==0&&e.lineIndent<r&&se(e,"deficient indentation"),o}function ce(e){var t=e.position,r;return r=e.input.charCodeAt(t),!!((r===45||r===46)&&r===e.input.charCodeAt(t+1)&&r===e.input.charCodeAt(t+2)&&(t+=3,r=e.input.charCodeAt(t),r===0||I(r)))}function _e(e,t){t===1?e.result+=" ":t>1&&(e.result+=O.repeat(`
`,t-1))}function no(e,t,r){var o,n,i,s,a,l,c,f,u=e.kind,p=e.result,m;if(m=e.input.charCodeAt(e.position),I(m)||V(m)||m===35||m===38||m===42||m===33||m===124||m===62||m===39||m===34||m===37||m===64||m===96||(m===63||m===45)&&(n=e.input.charCodeAt(e.position+1),I(n)||r&&V(n)))return!1;for(e.kind="scalar",e.result="",i=s=e.position,a=!1;m!==0;){if(m===58){if(n=e.input.charCodeAt(e.position+1),I(n)||r&&V(n))break}else if(m===35){if(o=e.input.charCodeAt(e.position-1),I(o))break}else{if(e.position===e.lineStart&&ce(e)||r&&V(m))break;if(_(m))if(l=e.line,c=e.lineStart,f=e.lineIndent,C(e,!1,-1),e.lineIndent>=t){a=!0,m=e.input.charCodeAt(e.position);continue}else{e.position=s,e.line=l,e.lineStart=c,e.lineIndent=f;break}}a&&(M(e,i,s,!1),_e(e,e.line-l),i=s=e.position,a=!1),U(m)||(s=e.position+1),m=e.input.charCodeAt(++e.position)}return M(e,i,s,!1),e.result?!0:(e.kind=u,e.result=p,!1)}function to(e,t){var r,o,n;if(r=e.input.charCodeAt(e.position),r!==39)return!1;for(e.kind="scalar",e.result="",e.position++,o=n=e.position;(r=e.input.charCodeAt(e.position))!==0;)if(r===39)if(M(e,o,e.position,!0),r=e.input.charCodeAt(++e.position),r===39)o=e.position,e.position++,n=e.position;else return!0;else _(r)?(M(e,o,n,!0),_e(e,C(e,!1,t)),o=n=e.position):e.position===e.lineStart&&ce(e)?h(e,"unexpected end of the document within a single quoted scalar"):(e.position++,n=e.position);h(e,"unexpected end of the stream within a single quoted scalar")}function ro(e,t){var r,o,n,i,s,a;if(a=e.input.charCodeAt(e.position),a!==34)return!1;for(e.kind="scalar",e.result="",e.position++,r=o=e.position;(a=e.input.charCodeAt(e.position))!==0;){if(a===34)return M(e,r,e.position,!0),e.position++,!0;if(a===92){if(M(e,r,e.position,!0),a=e.input.charCodeAt(++e.position),_(a))C(e,!1,t);else if(a<256&&mt[a])e.result+=dt[a],e.position++;else if((s=Xi(a))>0){for(n=s,i=0;n>0;n--)a=e.input.charCodeAt(++e.position),(s=Wi(a))>=0?i=(i<<4)+s:h(e,"expected hexadecimal character");e.result+=Zi(i),e.position++}else h(e,"unknown escape sequence");r=o=e.position}else _(a)?(M(e,r,o,!0),_e(e,C(e,!1,t)),r=o=e.position):e.position===e.lineStart&&ce(e)?h(e,"unexpected end of the document within a double quoted scalar"):(e.position++,o=e.position)}h(e,"unexpected end of the stream within a double quoted scalar")}function io(e,t){var r=!0,o,n,i,s=e.tag,a,l=e.anchor,c,f,u,p,m,d=Object.create(null),y,$,b,g;if(g=e.input.charCodeAt(e.position),g===91)f=93,m=!1,a=[];else if(g===123)f=125,m=!0,a={};else return!1;for(e.anchor!==null&&(e.anchorMap[e.anchor]=a),g=e.input.charCodeAt(++e.position);g!==0;){if(C(e,!0,t),g=e.input.charCodeAt(e.position),g===f)return e.position++,e.tag=s,e.anchor=l,e.kind=m?"mapping":"sequence",e.result=a,!0;r?g===44&&h(e,"expected the node content, but found ','"):h(e,"missed comma between flow collection entries"),$=y=b=null,u=p=!1,g===63&&(c=e.input.charCodeAt(e.position+1),I(c)&&(u=p=!0,e.position++,C(e,!0,t))),o=e.line,n=e.lineStart,i=e.position,Y(e,t,ie,!1,!0),$=e.tag,y=e.result,C(e,!0,t),g=e.input.charCodeAt(e.position),(p||e.line===o)&&g===58&&(u=!0,g=e.input.charCodeAt(++e.position),C(e,!0,t),Y(e,t,ie,!1,!0),b=e.result),m?z(e,a,d,$,y,b,o,n,i):u?a.push(z(e,null,d,$,y,b,o,n,i)):a.push(y),C(e,!0,t),g=e.input.charCodeAt(e.position),g===44?(r=!0,g=e.input.charCodeAt(++e.position)):r=!1}h(e,"unexpected end of the stream within a flow collection")}function oo(e,t){var r,o,n=Oe,i=!1,s=!1,a=t,l=0,c=!1,f,u;if(u=e.input.charCodeAt(e.position),u===124)o=!1;else if(u===62)o=!0;else return!1;for(e.kind="scalar",e.result="";u!==0;)if(u=e.input.charCodeAt(++e.position),u===43||u===45)Oe===n?n=u===43?En:Yi:h(e,"repeat of a chomping mode identifier");else if((f=Qi(u))>=0)f===0?h(e,"bad explicit indentation width of a block scalar; it cannot be less than one"):s?h(e,"repeat of an indentation width identifier"):(a=t+f-1,s=!0);else break;if(U(u)){do u=e.input.charCodeAt(++e.position);while(U(u));if(u===35)do u=e.input.charCodeAt(++e.position);while(!_(u)&&u!==0)}for(;u!==0;){for(Ie(e),e.lineIndent=0,u=e.input.charCodeAt(e.position);(!s||e.lineIndent<a)&&u===32;)e.lineIndent++,u=e.input.charCodeAt(++e.position);if(!s&&e.lineIndent>a&&(a=e.lineIndent),_(u)){l++;continue}if(e.lineIndent<a){n===En?e.result+=O.repeat(`
`,i?1+l:l):n===Oe&&i&&(e.result+=`
`);break}for(o?U(u)?(c=!0,e.result+=O.repeat(`
`,i?1+l:l)):c?(c=!1,e.result+=O.repeat(`
`,l+1)):l===0?i&&(e.result+=" "):e.result+=O.repeat(`
`,l):e.result+=O.repeat(`
`,i?1+l:l),i=!0,s=!0,l=0,r=e.position;!_(u)&&u!==0;)u=e.input.charCodeAt(++e.position);M(e,r,e.position,!1)}return!0}function wn(e,t){var r,o=e.tag,n=e.anchor,i=[],s,a=!1,l;if(e.firstTabInLine!==-1)return!1;for(e.anchor!==null&&(e.anchorMap[e.anchor]=i),l=e.input.charCodeAt(e.position);l!==0&&(e.firstTabInLine!==-1&&(e.position=e.firstTabInLine,h(e,"tab characters must not be used in indentation")),!(l!==45||(s=e.input.charCodeAt(e.position+1),!I(s))));){if(a=!0,e.position++,C(e,!0,-1)&&e.lineIndent<=t){i.push(null),l=e.input.charCodeAt(e.position);continue}if(r=e.line,Y(e,t,ct,!1,!0),i.push(e.result),C(e,!0,-1),l=e.input.charCodeAt(e.position),(e.line===r||e.lineIndent>t)&&l!==0)h(e,"bad indentation of a sequence entry");else if(e.lineIndent<t)break}return a?(e.tag=o,e.anchor=n,e.kind="sequence",e.result=i,!0):!1}function so(e,t,r){var o,n,i,s,a,l,c=e.tag,f=e.anchor,u={},p=Object.create(null),m=null,d=null,y=null,$=!1,b=!1,g;if(e.firstTabInLine!==-1)return!1;for(e.anchor!==null&&(e.anchorMap[e.anchor]=u),g=e.input.charCodeAt(e.position);g!==0;){if(!$&&e.firstTabInLine!==-1&&(e.position=e.firstTabInLine,h(e,"tab characters must not be used in indentation")),o=e.input.charCodeAt(e.position+1),i=e.line,(g===63||g===58)&&I(o))g===63?($&&(z(e,u,p,m,d,null,s,a,l),m=d=y=null),b=!0,$=!0,n=!0):$?($=!1,n=!0):h(e,"incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line"),e.position+=1,g=o;else{if(s=e.line,a=e.lineStart,l=e.position,!Y(e,r,lt,!1,!0))break;if(e.line===i){for(g=e.input.charCodeAt(e.position);U(g);)g=e.input.charCodeAt(++e.position);if(g===58)g=e.input.charCodeAt(++e.position),I(g)||h(e,"a whitespace character is expected after the key-value separator within a block mapping"),$&&(z(e,u,p,m,d,null,s,a,l),m=d=y=null),b=!0,$=!1,n=!1,m=e.tag,d=e.result;else if(b)h(e,"can not read an implicit mapping pair; a colon is missed");else return e.tag=c,e.anchor=f,!0}else if(b)h(e,"can not read a block mapping entry; a multiline key may not be an implicit key");else return e.tag=c,e.anchor=f,!0}if((e.line===i||e.lineIndent>t)&&($&&(s=e.line,a=e.lineStart,l=e.position),Y(e,t,oe,!0,n)&&($?d=e.result:y=e.result),$||(z(e,u,p,m,d,y,s,a,l),m=d=y=null),C(e,!0,-1),g=e.input.charCodeAt(e.position)),(e.line===i||e.lineIndent>t)&&g!==0)h(e,"bad indentation of a mapping entry");else if(e.lineIndent<t)break}return $&&z(e,u,p,m,d,null,s,a,l),b&&(e.tag=c,e.anchor=f,e.kind="mapping",e.result=u),b}function ao(e){var t,r=!1,o=!1,n,i,s;if(s=e.input.charCodeAt(e.position),s!==33)return!1;if(e.tag!==null&&h(e,"duplication of a tag property"),s=e.input.charCodeAt(++e.position),s===60?(r=!0,s=e.input.charCodeAt(++e.position)):s===33?(o=!0,n="!!",s=e.input.charCodeAt(++e.position)):n="!",t=e.position,r){do s=e.input.charCodeAt(++e.position);while(s!==0&&s!==62);e.position<e.length?(i=e.input.slice(t,e.position),s=e.input.charCodeAt(++e.position)):h(e,"unexpected end of the stream within a verbatim tag")}else{for(;s!==0&&!I(s);)s===33&&(o?h(e,"tag suffix cannot contain exclamation marks"):(n=e.input.slice(t-1,e.position+1),ut.test(n)||h(e,"named tag handle cannot contain such characters"),o=!0,t=e.position+1)),s=e.input.charCodeAt(++e.position);i=e.input.slice(t,e.position),Ji.test(i)&&h(e,"tag suffix cannot contain flow indicator characters")}i&&!ft.test(i)&&h(e,"tag name cannot contain such characters: "+i);try{i=decodeURIComponent(i)}catch{h(e,"tag name is malformed: "+i)}return r?e.tag=i:D.call(e.tagMap,n)?e.tag=e.tagMap[n]+i:n==="!"?e.tag="!"+i:n==="!!"?e.tag="tag:yaml.org,2002:"+i:h(e,'undeclared tag handle "'+n+'"'),!0}function lo(e){var t,r;if(r=e.input.charCodeAt(e.position),r!==38)return!1;for(e.anchor!==null&&h(e,"duplication of an anchor property"),r=e.input.charCodeAt(++e.position),t=e.position;r!==0&&!I(r)&&!V(r);)r=e.input.charCodeAt(++e.position);return e.position===t&&h(e,"name of an anchor node must contain at least one character"),e.anchor=e.input.slice(t,e.position),!0}function co(e){var t,r,o;if(o=e.input.charCodeAt(e.position),o!==42)return!1;for(o=e.input.charCodeAt(++e.position),t=e.position;o!==0&&!I(o)&&!V(o);)o=e.input.charCodeAt(++e.position);return e.position===t&&h(e,"name of an alias node must contain at least one character"),r=e.input.slice(t,e.position),D.call(e.anchorMap,r)||h(e,'unidentified alias "'+r+'"'),e.result=e.anchorMap[r],C(e,!0,-1),!0}function Y(e,t,r,o,n){var i,s,a,l=1,c=!1,f=!1,u,p,m,d,y,$;if(e.listener!==null&&e.listener("open",e),e.tag=null,e.anchor=null,e.kind=null,e.result=null,i=s=a=oe===r||ct===r,o&&C(e,!0,-1)&&(c=!0,e.lineIndent>t?l=1:e.lineIndent===t?l=0:e.lineIndent<t&&(l=-1)),l===1)for(;ao(e)||lo(e);)C(e,!0,-1)?(c=!0,a=i,e.lineIndent>t?l=1:e.lineIndent===t?l=0:e.lineIndent<t&&(l=-1)):a=!1;if(a&&(a=c||n),(l===1||oe===r)&&(ie===r||lt===r?y=t:y=t+1,$=e.position-e.lineStart,l===1?a&&(wn(e,$)||so(e,$,y))||io(e,y)?f=!0:(s&&oo(e,y)||to(e,y)||ro(e,y)?f=!0:co(e)?(f=!0,(e.tag!==null||e.anchor!==null)&&h(e,"alias node should not have any properties")):no(e,y,ie===r)&&(f=!0,e.tag===null&&(e.tag="?")),e.anchor!==null&&(e.anchorMap[e.anchor]=e.result)):l===0&&(f=a&&wn(e,$))),e.tag===null)e.anchor!==null&&(e.anchorMap[e.anchor]=e.result);else if(e.tag==="?"){for(e.result!==null&&e.kind!=="scalar"&&h(e,'unacceptable node kind for !<?> tag; it should be "scalar", not "'+e.kind+'"'),u=0,p=e.implicitTypes.length;u<p;u+=1)if(d=e.implicitTypes[u],d.resolve(e.result)){e.result=d.construct(e.result),e.tag=d.tag,e.anchor!==null&&(e.anchorMap[e.anchor]=e.result);break}}else if(e.tag!=="!"){if(D.call(e.typeMap[e.kind||"fallback"],e.tag))d=e.typeMap[e.kind||"fallback"][e.tag];else for(d=null,m=e.typeMap.multi[e.kind||"fallback"],u=0,p=m.length;u<p;u+=1)if(e.tag.slice(0,m[u].tag.length)===m[u].tag){d=m[u];break}d||h(e,"unknown tag !<"+e.tag+">"),e.result!==null&&d.kind!==e.kind&&h(e,"unacceptable node kind for !<"+e.tag+'> tag; it should be "'+d.kind+'", not "'+e.kind+'"'),d.resolve(e.result,e.tag)?(e.result=d.construct(e.result,e.tag),e.anchor!==null&&(e.anchorMap[e.anchor]=e.result)):h(e,"cannot resolve a node with !<"+e.tag+"> explicit tag")}return e.listener!==null&&e.listener("close",e),e.tag!==null||e.anchor!==null||f}function uo(e){var t=e.position,r,o,n,i=!1,s;for(e.version=null,e.checkLineBreaks=e.legacy,e.tagMap=Object.create(null),e.anchorMap=Object.create(null);(s=e.input.charCodeAt(e.position))!==0&&(C(e,!0,-1),s=e.input.charCodeAt(e.position),!(e.lineIndent>0||s!==37));){for(i=!0,s=e.input.charCodeAt(++e.position),r=e.position;s!==0&&!I(s);)s=e.input.charCodeAt(++e.position);for(o=e.input.slice(r,e.position),n=[],o.length<1&&h(e,"directive name must not be less than one character in length");s!==0;){for(;U(s);)s=e.input.charCodeAt(++e.position);if(s===35){do s=e.input.charCodeAt(++e.position);while(s!==0&&!_(s));break}if(_(s))break;for(r=e.position;s!==0&&!I(s);)s=e.input.charCodeAt(++e.position);n.push(e.input.slice(r,e.position))}s!==0&&Ie(e),D.call(kn,o)?kn[o](e,o,n):se(e,'unknown document directive "'+o+'"')}if(C(e,!0,-1),e.lineIndent===0&&e.input.charCodeAt(e.position)===45&&e.input.charCodeAt(e.position+1)===45&&e.input.charCodeAt(e.position+2)===45?(e.position+=3,C(e,!0,-1)):i&&h(e,"directives end mark is expected"),Y(e,e.lineIndent-1,oe,!1,!0),C(e,!0,-1),e.checkLineBreaks&&Ki.test(e.input.slice(t,e.position))&&se(e,"non-ASCII line breaks are interpreted as content"),e.documents.push(e.result),e.position===e.lineStart&&ce(e)){e.input.charCodeAt(e.position)===46&&(e.position+=3,C(e,!0,-1));return}if(e.position<e.length-1)h(e,"end of the stream or a document separator is expected");else return}function gt(e,t){e=String(e),t=t||{},e.length!==0&&(e.charCodeAt(e.length-1)!==10&&e.charCodeAt(e.length-1)!==13&&(e+=`
`),e.charCodeAt(0)===65279&&(e=e.slice(1)));var r=new eo(e,t),o=e.indexOf("\0");for(o!==-1&&(r.position=o,h(r,"null byte is not allowed in input")),r.input+="\0";r.input.charCodeAt(r.position)===32;)r.lineIndent+=1,r.position+=1;for(;r.position<r.length-1;)uo(r);return r.documents}function fo(e,t,r){t!==null&&typeof t=="object"&&typeof r>"u"&&(r=t,t=null);var o=gt(e,r);if(typeof t!="function")return o;for(var n=0,i=o.length;n<i;n+=1)t(o[n])}function po(e,t){var r=gt(e,t);if(r.length!==0){if(r.length===1)return r[0];throw new w("expected a single document in the stream, but found more")}}var mo=fo,yo=po,ht={loadAll:mo,load:yo},bt=Object.prototype.toString,Tt=Object.prototype.hasOwnProperty,Le=65279,go=9,W=10,ho=13,bo=32,To=33,xo=34,Ee=35,So=37,$o=38,Ao=39,Co=42,xt=44,Oo=45,ae=58,No=61,Eo=62,jo=63,vo=64,St=91,$t=93,ko=96,At=123,Ro=124,Ct=125,v={};v[0]="\\0";v[7]="\\a";v[8]="\\b";v[9]="\\t";v[10]="\\n";v[11]="\\v";v[12]="\\f";v[13]="\\r";v[27]="\\e";v[34]='\\"';v[92]="\\\\";v[133]="\\N";v[160]="\\_";v[8232]="\\L";v[8233]="\\P";var wo=["y","Y","yes","Yes","YES","on","On","ON","n","N","no","No","NO","off","Off","OFF"],Io=/^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;function _o(e,t){var r,o,n,i,s,a,l;if(t===null)return{};for(r={},o=Object.keys(t),n=0,i=o.length;n<i;n+=1)s=o[n],a=String(t[s]),s.slice(0,2)==="!!"&&(s="tag:yaml.org,2002:"+s.slice(2)),l=e.compiledTypeMap.fallback[s],l&&Tt.call(l.styleAliases,a)&&(a=l.styleAliases[a]),r[s]=a;return r}function Lo(e){var t,r,o;if(t=e.toString(16).toUpperCase(),e<=255)r="x",o=2;else if(e<=65535)r="u",o=4;else if(e<=4294967295)r="U",o=8;else throw new w("code point within a string may not be greater than 0xFFFFFFFF");return"\\"+r+O.repeat("0",o-t.length)+t}var Mo=1,X=2;function Do(e){this.schema=e.schema||we,this.indent=Math.max(1,e.indent||2),this.noArrayIndent=e.noArrayIndent||!1,this.skipInvalid=e.skipInvalid||!1,this.flowLevel=O.isNothing(e.flowLevel)?-1:e.flowLevel,this.styleMap=_o(this.schema,e.styles||null),this.sortKeys=e.sortKeys||!1,this.lineWidth=e.lineWidth||80,this.noRefs=e.noRefs||!1,this.noCompatMode=e.noCompatMode||!1,this.condenseFlow=e.condenseFlow||!1,this.quotingType=e.quotingType==='"'?X:Mo,this.forceQuotes=e.forceQuotes||!1,this.replacer=typeof e.replacer=="function"?e.replacer:null,this.implicitTypes=this.schema.compiledImplicit,this.explicitTypes=this.schema.compiledExplicit,this.tag=null,this.result="",this.duplicates=[],this.usedDuplicates=null}function In(e,t){for(var r=O.repeat(" ",t),o=0,n=-1,i="",s,a=e.length;o<a;)n=e.indexOf(`
`,o),n===-1?(s=e.slice(o),o=a):(s=e.slice(o,n+1),o=n+1),s.length&&s!==`
`&&(i+=r),i+=s;return i}function je(e,t){return`
`+O.repeat(" ",e.indent*t)}function Fo(e,t){var r,o,n;for(r=0,o=e.implicitTypes.length;r<o;r+=1)if(n=e.implicitTypes[r],n.resolve(t))return!0;return!1}function le(e){return e===bo||e===go}function Q(e){return 32<=e&&e<=126||161<=e&&e<=55295&&e!==8232&&e!==8233||57344<=e&&e<=65533&&e!==Le||65536<=e&&e<=1114111}function _n(e){return Q(e)&&e!==Le&&e!==ho&&e!==W}function Ln(e,t,r){var o=_n(e),n=o&&!le(e);return(r?o:o&&e!==xt&&e!==St&&e!==$t&&e!==At&&e!==Ct)&&e!==Ee&&!(t===ae&&!n)||_n(t)&&!le(t)&&e===Ee||t===ae&&n}function Go(e){return Q(e)&&e!==Le&&!le(e)&&e!==Oo&&e!==jo&&e!==ae&&e!==xt&&e!==St&&e!==$t&&e!==At&&e!==Ct&&e!==Ee&&e!==$o&&e!==Co&&e!==To&&e!==Ro&&e!==No&&e!==Eo&&e!==Ao&&e!==xo&&e!==So&&e!==vo&&e!==ko}function Po(e){return!le(e)&&e!==ae}function K(e,t){var r=e.charCodeAt(t),o;return r>=55296&&r<=56319&&t+1<e.length&&(o=e.charCodeAt(t+1),o>=56320&&o<=57343)?(r-55296)*1024+o-56320+65536:r}function Ot(e){var t=/^\n* /;return t.test(e)}var Nt=1,ve=2,Et=3,jt=4,B=5;function Uo(e,t,r,o,n,i,s,a){var l,c=0,f=null,u=!1,p=!1,m=o!==-1,d=-1,y=Go(K(e,0))&&Po(K(e,e.length-1));if(t||s)for(l=0;l<e.length;c>=65536?l+=2:l++){if(c=K(e,l),!Q(c))return B;y=y&&Ln(c,f,a),f=c}else{for(l=0;l<e.length;c>=65536?l+=2:l++){if(c=K(e,l),c===W)u=!0,m&&(p=p||l-d-1>o&&e[d+1]!==" ",d=l);else if(!Q(c))return B;y=y&&Ln(c,f,a),f=c}p=p||m&&l-d-1>o&&e[d+1]!==" "}return!u&&!p?y&&!s&&!n(e)?Nt:i===X?B:ve:r>9&&Ot(e)?B:s?i===X?B:ve:p?jt:Et}function qo(e,t,r,o,n){e.dump=(function(){if(t.length===0)return e.quotingType===X?'""':"''";if(!e.noCompatMode&&(wo.indexOf(t)!==-1||Io.test(t)))return e.quotingType===X?'"'+t+'"':"'"+t+"'";var i=e.indent*Math.max(1,r),s=e.lineWidth===-1?-1:Math.max(Math.min(e.lineWidth,40),e.lineWidth-i),a=o||e.flowLevel>-1&&r>=e.flowLevel;function l(c){return Fo(e,c)}switch(Uo(t,a,e.indent,s,l,e.quotingType,e.forceQuotes&&!o,n)){case Nt:return t;case ve:return"'"+t.replace(/'/g,"''")+"'";case Et:return"|"+Mn(t,e.indent)+Dn(In(t,i));case jt:return">"+Mn(t,e.indent)+Dn(In(Bo(t,s),i));case B:return'"'+Vo(t)+'"';default:throw new w("impossible error: invalid scalar style")}})()}function Mn(e,t){var r=Ot(e)?String(t):"",o=e[e.length-1]===`
`,n=o&&(e[e.length-2]===`
`||e===`
`),i=n?"+":o?"":"-";return r+i+`
`}function Dn(e){return e[e.length-1]===`
`?e.slice(0,-1):e}function Bo(e,t){for(var r=/(\n+)([^\n]*)/g,o=(function(){var c=e.indexOf(`
`);return c=c!==-1?c:e.length,r.lastIndex=c,Fn(e.slice(0,c),t)})(),n=e[0]===`
`||e[0]===" ",i,s;s=r.exec(e);){var a=s[1],l=s[2];i=l[0]===" ",o+=a+(!n&&!i&&l!==""?`
`:"")+Fn(l,t),n=i}return o}function Fn(e,t){if(e===""||e[0]===" ")return e;for(var r=/ [^ ]/g,o,n=0,i,s=0,a=0,l="";o=r.exec(e);)a=o.index,a-n>t&&(i=s>n?s:a,l+=`
`+e.slice(n,i),n=i+1),s=a;return l+=`
`,e.length-n>t&&s>n?l+=e.slice(n,s)+`
`+e.slice(s+1):l+=e.slice(n),l.slice(1)}function Vo(e){for(var t="",r=0,o,n=0;n<e.length;r>=65536?n+=2:n++)r=K(e,n),o=v[r],!o&&Q(r)?(t+=e[n],r>=65536&&(t+=e[n+1])):t+=o||Lo(r);return t}function zo(e,t,r){var o="",n=e.tag,i,s,a;for(i=0,s=r.length;i<s;i+=1)a=r[i],e.replacer&&(a=e.replacer.call(r,String(i),a)),(L(e,t,a,!1,!1)||typeof a>"u"&&L(e,t,null,!1,!1))&&(o!==""&&(o+=","+(e.condenseFlow?"":" ")),o+=e.dump);e.tag=n,e.dump="["+o+"]"}function Gn(e,t,r,o){var n="",i=e.tag,s,a,l;for(s=0,a=r.length;s<a;s+=1)l=r[s],e.replacer&&(l=e.replacer.call(r,String(s),l)),(L(e,t+1,l,!0,!0,!1,!0)||typeof l>"u"&&L(e,t+1,null,!0,!0,!1,!0))&&((!o||n!=="")&&(n+=je(e,t)),e.dump&&W===e.dump.charCodeAt(0)?n+="-":n+="- ",n+=e.dump);e.tag=i,e.dump=n||"[]"}function Yo(e,t,r){var o="",n=e.tag,i=Object.keys(r),s,a,l,c,f;for(s=0,a=i.length;s<a;s+=1)f="",o!==""&&(f+=", "),e.condenseFlow&&(f+='"'),l=i[s],c=r[l],e.replacer&&(c=e.replacer.call(r,l,c)),L(e,t,l,!1,!1)&&(e.dump.length>1024&&(f+="? "),f+=e.dump+(e.condenseFlow?'"':"")+":"+(e.condenseFlow?"":" "),L(e,t,c,!1,!1)&&(f+=e.dump,o+=f));e.tag=n,e.dump="{"+o+"}"}function Ho(e,t,r,o){var n="",i=e.tag,s=Object.keys(r),a,l,c,f,u,p;if(e.sortKeys===!0)s.sort();else if(typeof e.sortKeys=="function")s.sort(e.sortKeys);else if(e.sortKeys)throw new w("sortKeys must be a boolean or a function");for(a=0,l=s.length;a<l;a+=1)p="",(!o||n!=="")&&(p+=je(e,t)),c=s[a],f=r[c],e.replacer&&(f=e.replacer.call(r,c,f)),L(e,t+1,c,!0,!0,!0)&&(u=e.tag!==null&&e.tag!=="?"||e.dump&&e.dump.length>1024,u&&(e.dump&&W===e.dump.charCodeAt(0)?p+="?":p+="? "),p+=e.dump,u&&(p+=je(e,t)),L(e,t+1,f,!0,u)&&(e.dump&&W===e.dump.charCodeAt(0)?p+=":":p+=": ",p+=e.dump,n+=p));e.tag=i,e.dump=n||"{}"}function Pn(e,t,r){var o,n,i,s,a,l;for(n=r?e.explicitTypes:e.implicitTypes,i=0,s=n.length;i<s;i+=1)if(a=n[i],(a.instanceOf||a.predicate)&&(!a.instanceOf||typeof t=="object"&&t instanceof a.instanceOf)&&(!a.predicate||a.predicate(t))){if(r?a.multi&&a.representName?e.tag=a.representName(t):e.tag=a.tag:e.tag="?",a.represent){if(l=e.styleMap[a.tag]||a.defaultStyle,bt.call(a.represent)==="[object Function]")o=a.represent(t,l);else if(Tt.call(a.represent,l))o=a.represent[l](t,l);else throw new w("!<"+a.tag+'> tag resolver accepts not "'+l+'" style');e.dump=o}return!0}return!1}function L(e,t,r,o,n,i,s){e.tag=null,e.dump=r,Pn(e,r,!1)||Pn(e,r,!0);var a=bt.call(e.dump),l=o,c;o&&(o=e.flowLevel<0||e.flowLevel>t);var f=a==="[object Object]"||a==="[object Array]",u,p;if(f&&(u=e.duplicates.indexOf(r),p=u!==-1),(e.tag!==null&&e.tag!=="?"||p||e.indent!==2&&t>0)&&(n=!1),p&&e.usedDuplicates[u])e.dump="*ref_"+u;else{if(f&&p&&!e.usedDuplicates[u]&&(e.usedDuplicates[u]=!0),a==="[object Object]")o&&Object.keys(e.dump).length!==0?(Ho(e,t,e.dump,n),p&&(e.dump="&ref_"+u+e.dump)):(Yo(e,t,e.dump),p&&(e.dump="&ref_"+u+" "+e.dump));else if(a==="[object Array]")o&&e.dump.length!==0?(e.noArrayIndent&&!s&&t>0?Gn(e,t-1,e.dump,n):Gn(e,t,e.dump,n),p&&(e.dump="&ref_"+u+e.dump)):(zo(e,t,e.dump),p&&(e.dump="&ref_"+u+" "+e.dump));else if(a==="[object String]")e.tag!=="?"&&qo(e,e.dump,t,i,l);else{if(a==="[object Undefined]")return!1;if(e.skipInvalid)return!1;throw new w("unacceptable kind of an object to dump "+a)}e.tag!==null&&e.tag!=="?"&&(c=encodeURI(e.tag[0]==="!"?e.tag.slice(1):e.tag).replace(/!/g,"%21"),e.tag[0]==="!"?c="!"+c:c.slice(0,18)==="tag:yaml.org,2002:"?c="!!"+c.slice(18):c="!<"+c+">",e.dump=c+" "+e.dump)}return!0}function Ko(e,t){var r=[],o=[],n,i;for(ke(e,r,o),n=0,i=o.length;n<i;n+=1)t.duplicates.push(r[o[n]]);t.usedDuplicates=new Array(i)}function ke(e,t,r){var o,n,i;if(e!==null&&typeof e=="object")if(n=t.indexOf(e),n!==-1)r.indexOf(n)===-1&&r.push(n);else if(t.push(e),Array.isArray(e))for(n=0,i=e.length;n<i;n+=1)ke(e[n],t,r);else for(o=Object.keys(e),n=0,i=o.length;n<i;n+=1)ke(e[o[n]],t,r)}function Jo(e,t){t=t||{};var r=new Do(t);r.noRefs||Ko(e,r);var o=e;return r.replacer&&(o=r.replacer.call({"":o},"",o)),L(r,0,o,!0,!0)?r.dump+`
`:""}var Wo=Jo,Xo={dump:Wo};function Me(e,t){return function(){throw new Error("Function yaml."+e+" is removed in js-yaml 4. Use yaml."+t+" instead, which is now safe by default.")}}var Qo=N,Zo=Bn,es=Hn,ns=Qn,ts=Zn,rs=we,is=ht.load,os=ht.loadAll,ss=Xo.dump,as=w,ls={binary:it,float:Xn,map:Yn,null:Kn,pairs:st,set:at,timestamp:tt,bool:Jn,int:Wn,merge:rt,omap:ot,seq:zn,str:Vn},cs=Me("safeLoad","load"),us=Me("safeLoadAll","loadAll"),fs=Me("safeDump","dump"),ue={Type:Qo,Schema:Zo,FAILSAFE_SCHEMA:es,JSON_SCHEMA:ns,CORE_SCHEMA:ts,DEFAULT_SCHEMA:rs,load:is,loadAll:os,dump:ss,YAMLException:as,types:ls,safeLoad:cs,safeLoadAll:us,safeDump:fs};var S=e=>e.replace(/(^\w|[_\s-]\w)/g,t=>t.replace(/[_\s-]/,"").toUpperCase()),T=e=>e.replace(/([A-Z])/g,"_$1").toLowerCase().replace(/^_/,""),H=e=>T(e).toUpperCase(),x=e=>e.fields??{},Ge=(e,t="postgres")=>{if(e.type==="number"){let r=e.format==="int";return t==="sqlite"?r?"INTEGER":"REAL":t==="mysql"?r?"BIGINT":"DOUBLE":r?"BIGINT":"DOUBLE PRECISION"}return e.type==="boolean"?t==="mysql"?"TINYINT(1)":"BOOLEAN":e.type==="object"||e.type==="array"||e.type==="union"?t==="postgres"?"JSONB":"JSON":e.format==="uuid"?t==="mysql"?"CHAR(36)":"UUID":e.format==="email"?"VARCHAR(255)":e.format==="url"?"TEXT":e.format==="datetime"?"TIMESTAMP":"VARCHAR(255)"},kt={generate:e=>{let t=x(e);if(!Object.keys(t).length)return"";let r=Object.keys(t).join(","),o=Object.entries(t).map(([,n])=>n.type==="number"?"0":n.type==="boolean"?"true":n.format==="uuid"?"uuid-xxxx-xxxx":n.format==="email"?"user@example.com":n.format==="url"?"https://example.com":n.format==="datetime"?new Date().toISOString():n.type==="object"&&n.fields?`"${JSON.stringify(Object.fromEntries(Object.entries(n.fields).map(([i,s])=>[i,s.type==="number"?0:s.type==="boolean"?!1:"sample"]))).replace(/"/g,'""')}"`:n.type==="array"?'"[]"':'"sample_value"').join(",");return`${r}
${o}
`}},Rt={generate:(e,t="table_name")=>{let r=x(e);if(!Object.keys(r).length)return"";let o=Object.keys(r).map(i=>`"${i}"`).join(", "),n=Object.entries(r).map(([,i])=>{if(i.type==="number")return"0";if(i.type==="boolean")return"TRUE";if(i.format==="uuid")return"'uuid-xxxx-xxxx'";if(i.format==="email")return"'user@example.com'";if(i.format==="datetime")return`'${new Date().toISOString()}'`;if(i.type==="object"&&i.fields){let s=Object.fromEntries(Object.entries(i.fields).map(([a,l])=>[a,l.type==="number"?0:l.type==="boolean"?!1:"sample"]));return`'${JSON.stringify(s).replace(/'/g,"''")}'`}return i.type==="array"?"'[]'":"'sample_value'"}).join(", ");return`INSERT INTO "${T(t)}" (${o})
VALUES (${n});
`}},wt={generate:(e,t="Root")=>{let r=x(e);if(!Object.keys(r).length)return"";let o="id"in r,n="created_at"in r||"createdAt"in r,i="updated_at"in r||"updatedAt"in r,s=`CREATE TABLE \`${T(t)}\` (
`;o||(s+="  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,\n");for(let[a,l]of Object.entries(r)){let c=l.optional?" NULL":" NOT NULL",f=a.toLowerCase()==="id",u=f?" AUTO_INCREMENT":"",p=f?" PRIMARY KEY":"";s+=`  \`${T(a)}\` ${Ge(l,"mysql")}${c}${u}${p},
`}return n||(s+="  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n"),i?s=s.replace(/,\s*$/,`
`):s+="  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP\n",s+=`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`,s}},It={generate:(e,t="Root")=>{let r=x(e);if(!Object.keys(r).length)return"";let o="id"in r,n="created_at"in r||"createdAt"in r,i="updated_at"in r||"updatedAt"in r,a=`CREATE TABLE "${T(t)}" (
`;o||(a+=`  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
`);for(let[l,c]of Object.entries(r)){let f=c.optional?"":" NOT NULL",p=l.toLowerCase()==="id"?" PRIMARY KEY":"";a+=`  "${T(l)}" ${Ge(c,"postgres")}${f}${p},
`}return n||(a+=`  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
`),i?a=a.replace(/,\s*$/,`
`):a+=`  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
`,a+=`);
`,a}},_t={generate:(e,t="Root")=>{let r=x(e);if(!Object.keys(r).length)return"";let o="id"in r,n="created_at"in r||"createdAt"in r,i="updated_at"in r||"updatedAt"in r,s=`CREATE TABLE IF NOT EXISTS "${T(t)}" (
`;o||(s+=`  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
`);for(let[a,l]of Object.entries(r)){let c=l.optional?"":" NOT NULL",u=a.toLowerCase()==="id"?" PRIMARY KEY":"";s+=`  "${T(a)}" ${Ge(l,"sqlite")}${c}${u},
`}return n||(s+=`  "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
`),i?s=s.replace(/,\s*$/,`
`):s+=`  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
`,s+=`);
`,s}},Lt={generate:(e,t="Root")=>{let r=x(e);if(!Object.keys(r).length)return"";let o=`CREATE OR REPLACE TABLE ${H(t)} (
`;o+=`  ID VARCHAR(36) NOT NULL DEFAULT UUID_STRING(),
`;for(let[n,i]of Object.entries(r)){let s=H(n),a="VARCHAR";i.type==="number"?a="DOUBLE":i.type==="boolean"?a="BOOLEAN":i.type==="object"||i.type==="array"?a="VARIANT":i.format==="datetime"&&(a="TIMESTAMP_NTZ"),o+=`  ${s} ${a}${i.optional?"":" NOT NULL"},
`}return o+=`  CREATED_AT TIMESTAMP_NTZ NOT NULL DEFAULT CURRENT_TIMESTAMP()
`,o+=`);
`,o}},Mt={generate:(e,t="config")=>{let r=x(e);if(!Object.keys(r).length)return"";let o=`[${T(t)}]
`;for(let[n,i]of Object.entries(r))if(i.type==="object"&&i.fields){o+=`
[${T(t)}.${T(n)}]
`;for(let[s,a]of Object.entries(i.fields))o+=`${T(s)} = ${vt(a)}
`}else if(i.type==="array"){let s=i.itemType?.type,a=s==="number"?"0":s==="boolean"?"false":'"sample_value"';o+=`${T(n)} = [${a}]
`}else o+=`${T(n)} = ${vt(i)}
`;return o}},vt=e=>e.type==="number"?"0":e.type==="boolean"?"false":e.format==="datetime"?'"2024-01-01T00:00:00Z"':'"sample_value"',Dt={generate:e=>{let t=r=>r.type==="object"&&r.fields?Object.fromEntries(Object.entries(r.fields).map(([o,n])=>[o,t(n)])):r.type==="array"?[t(r.itemType??{type:"string"})]:r.type==="number"?0:r.type==="boolean"?!1:r.format==="uuid"?"uuid-xxxx-xxxx":r.format==="email"?"user@example.com":r.format==="url"?"https://example.com":r.format==="datetime"?"2024-01-01T00:00:00Z":"sample_value";return ue.dump(t(e),{indent:2})}},Ft={generate:e=>{let t=x(e);if(!Object.keys(t).length)return"";let r=(n,i)=>{let s="";for(let[a,l]of Object.entries(n)){let c=H(i?`${i}_${a}`:a);if(l.type==="object"&&l.fields)s+=r(l.fields,i?`${i}_${a}`:a);else if(l.type==="array")s+=`${c}=
`;else{let f="your_value_here";l.type==="number"?f="0":l.type==="boolean"?f="false":l.format==="uuid"?f="uuid-xxxx-xxxx-xxxx-xxxxxxxxxxxx":l.format==="email"?f="user@example.com":l.format==="url"?f="https://example.com":l.format==="datetime"&&(f="2024-01-01T00:00:00Z"),s+=`${c}=${f}
`}}return s},o=`# Generated by TypeMorph
`;return o+=r(t,""),o}},Gt={generate:e=>{let t=x(e);if(!Object.keys(t).length)return"";let r=(n,i)=>{let s="";for(let[a,l]of Object.entries(n)){let c=(i?`${i}.${T(a)}`:T(a)).replace(/_/g,".");if(l.type==="object"&&l.fields)s+=r(l.fields,c);else if(l.type==="array")s+=`${c}=
`;else{let f="sample_value";l.type==="number"?f="0":l.type==="boolean"?f="false":l.format==="datetime"&&(f="2024-01-01T00:00:00Z"),s+=`${c}=${f}
`}}return s},o=`# Generated by TypeMorph
`;return o+=r(t,""),o}},Pt={generate:e=>{let t=x(e);if(!Object.keys(t).length)return"";let r=Object.keys(t),o=`| ${r.join(" | ")} |`,n=`| ${r.map(()=>"---").join(" | ")} |`,i=`| ${Object.entries(t).map(([,s])=>s.type==="number"?"0":s.type==="boolean"?"true":s.format==="email"?"user@example.com":s.type==="object"&&s.fields?"`"+JSON.stringify(Object.fromEntries(Object.entries(s.fields).map(([a,l])=>[a,l.type==="number"?0:l.type==="boolean"?!1:"sample"])))+"`":s.type==="array"?"`[]`":"sample").join(" | ")} |`;return`${o}
${n}
${i}
`}},Ut={generate:e=>{let t=x(e);if(!Object.keys(t).length)return"";let r=Object.keys(t),o=`[cols="${r.map(()=>"1").join(",")}",options="header"]
|===
`;return o+=`| ${r.join(" | ")}
`,o+=`| ${Object.entries(t).map(([,n])=>n.type==="number"?"0":"sample").join(" | ")}
`,o+=`|===
`,o}},qt={generate:e=>{let t=x(e);if(!Object.keys(t).length)return"";let r=Object.keys(t),o=`\\begin{tabular}{${r.map(()=>"l").join("|")}}
`;return o+=`\\hline
`,o+=r.join(" & ")+` \\\\
\\hline
`,o+=Object.entries(t).map(([,n])=>n.type==="number"?"0":n.type==="boolean"?"false":n.type==="object"?"\\{...\\}":n.type==="array"?"[...]":n.format==="email"?"user@example.com":n.format==="datetime"?"2024-01-01T00:00:00Z":"sample\\_value").join(" & ")+` \\\\
`,o+=`\\hline
\\end{tabular}
`,o}},Bt={generate:(e,t="Root")=>{let r=x(e);if(!Object.keys(r).length)return"";let o=`erDiagram
`;o+=`  ${S(t)} {
`;for(let[n,i]of Object.entries(r)){let s="string";i.type==="number"?s="float":i.type==="boolean"?s="boolean":i.type==="object"?s="object":i.type==="array"&&(s="array"),o+=`    ${s} ${n}
`}o+=`  }
`;for(let[n,i]of Object.entries(r)){if(i.type==="object"&&i.fields){let s=S(n);o+=`  ${s} {
`;for(let[a,l]of Object.entries(i.fields)){let c="string";l.type==="number"?c="float":l.type==="boolean"&&(c="boolean"),o+=`    ${c} ${a}
`}o+=`  }
`,o+=`  ${S(t)} ||--o{ ${s} : "has"
`}if(i.type==="array"&&i.itemType?.type==="object"&&i.itemType.fields){let s=S(n)+"Item";o+=`  ${s} {
`;for(let[a,l]of Object.entries(i.itemType.fields))o+=`    ${l.type==="number"?"float":"string"} ${a}
`;o+=`  }
`,o+=`  ${S(t)} ||--o{ ${s} : "contains"
`}}return o}},Z=e=>e.type==="number"?"double":e.type==="boolean"?"boolean":e.type==="object"&&e.fields?{type:"record",name:"NestedRecord",fields:Object.entries(e.fields).map(([t,r])=>({name:t,type:r.optional?["null",Z(r)]:Z(r)}))}:e.type==="array"?{type:"array",items:Z(e.itemType??{type:"string"})}:e.type==="union"&&e.unionTypes?e.unionTypes.map(t=>t==="number"?"double":t):"string",Vt={generate:(e,t="Root")=>{let r=x(e);if(!Object.keys(r).length)return"";let o={type:"record",name:S(t),namespace:"com.example",fields:Object.entries(r).map(([n,i])=>({name:n,type:i.optional?["null",Z(i)]:Z(i),default:i.optional?null:void 0}))};return JSON.stringify(o,null,2)}},fe=(e,t)=>{let r=t.optional?"NULLABLE":"REQUIRED";if(t.type==="number")return{name:e,type:"FLOAT64",mode:r};if(t.type==="boolean")return{name:e,type:"BOOL",mode:r};if(t.format==="datetime")return{name:e,type:"TIMESTAMP",mode:r};if(t.type==="object"&&t.fields)return{name:e,type:"RECORD",mode:r,fields:Object.entries(t.fields).map(([o,n])=>fe(o,n))};if(t.type==="array"){let o=t.itemType??{type:"string"};return o.type==="object"&&o.fields?{name:e,type:"RECORD",mode:"REPEATED",fields:Object.entries(o.fields).map(([n,i])=>fe(n,i))}:{name:e,type:fe("_item",o).type,mode:"REPEATED"}}return{name:e,type:"STRING",mode:r}},zt={generate:e=>{let t=x(e);if(!Object.keys(t).length)return"";let r=Object.entries(t).map(([o,n])=>fe(o,n));return JSON.stringify(r,null,2)}},De=e=>{if(e.type==="number")return{N:"0"};if(e.type==="boolean")return{BOOL:!1};if(e.type==="array"){let t=e.itemType??{type:"string"};return{L:[De(t)]}}return e.type==="object"&&e.fields?{M:Object.fromEntries(Object.entries(e.fields).map(([t,r])=>[t,De(r)]))}:e.type==="object"?{M:{}}:e.format==="datetime"?{S:"2024-01-01T00:00:00Z"}:e.format==="uuid"?{S:"uuid-xxxx-xxxx"}:e.format==="email"?{S:"user@example.com"}:e.format==="url"?{S:"https://example.com"}:{S:"sample_value"}},Yt={generate:(e,t="Root")=>{let r=x(e);if(!Object.keys(r).length)return"";let o={TableName:T(t)+"s",Item:{id:{S:"uuid-xxxx-xxxx"},...Object.fromEntries(Object.entries(r).map(([n,i])=>[n,De(i)]))}};return JSON.stringify(o,null,2)}},Fe=e=>{if(e.type==="union"&&e.unionTypes){let r={anyOf:e.unionTypes.map(o=>({type:o}))};return e.nullable&&(r.nullable=!0),r}if(e.type==="number"){let r={type:"number",format:"double"};return e.enumValues&&e.enumValues.length&&(r.enum=e.enumValues),e.nullable&&(r.nullable=!0),r}if(e.type==="boolean")return e.nullable?{type:"boolean",nullable:!0}:{type:"boolean"};if(e.type==="array"){let r={type:"array",items:Fe(e.itemType??{type:"string"})};return e.nullable&&(r.nullable=!0),r}if(e.type==="object"&&e.fields){let r={type:"object",properties:Object.fromEntries(Object.entries(e.fields).map(([o,n])=>[o,Fe(n)]))};return e.nullable&&(r.nullable=!0),r}let t={type:"string"};return e.format==="uuid"?t.format="uuid":e.format==="email"?t.format="email":e.format==="url"?t.format="uri":e.format==="datetime"&&(t.type="string",t.format="date-time"),e.enumValues&&e.enumValues.length&&(t.enum=e.enumValues),e.nullable&&(t.nullable=!0),t},Ht={generate:(e,t="Root")=>{let r=x(e),o=S(t),n=Object.entries(r).filter(([,s])=>!s.optional).map(([s])=>s),i={openapi:"3.0.3",info:{title:`${o} API`,version:"1.0.0"},paths:{[`/${T(t)}s`]:{get:{summary:`List ${o}s`,responses:{200:{description:"Success",content:{"application/json":{schema:{type:"array",items:{$ref:`#/components/schemas/${o}`}}}}}}},post:{summary:`Create ${o}`,requestBody:{required:!0,content:{"application/json":{schema:{$ref:`#/components/schemas/${o}`}}}},responses:{201:{description:"Created"}}}}},components:{schemas:{[o]:{type:"object",...n.length?{required:n}:{},properties:Object.fromEntries(Object.entries(r).map(([s,a])=>[s,Fe(a)]))}}}};return ue.dump(i,{indent:2})}},Kt={generate:(e,t="Root")=>{let r=S(t),o=`https://api.example.com/${T(t)}s`,n={info:{name:`${r} API`,schema:"https://schema.getpostman.com/json/collection/v2.1.0/"},item:[{name:`GET all ${r}s`,request:{method:"GET",url:{raw:o}}},{name:`POST create ${r}`,request:{method:"POST",url:{raw:o},header:[{key:"Content-Type",value:"application/json"}],body:{mode:"raw",raw:"{}"}}},{name:`GET ${r} by ID`,request:{method:"GET",url:{raw:`${o}/:id`}}},{name:`PUT update ${r}`,request:{method:"PUT",url:{raw:`${o}/:id`}}},{name:`DELETE ${r}`,request:{method:"DELETE",url:{raw:`${o}/:id`}}}]};return JSON.stringify(n,null,2)}},Jt={generate:(e,t="Root")=>{let r=`https://api.example.com/${T(t)}s`,o=x(e),n=JSON.stringify(Object.fromEntries(Object.entries(o).map(([i,s])=>[i,s.type==="number"?0:s.type==="boolean"?!1:"sample"])),null,2);return[`### Get all ${t}s`,`GET ${r}`,"Accept: application/json","","###","",`### Create ${t}`,`POST ${r}`,"Content-Type: application/json","",n,"","###","",`### Get ${t} by ID`,`GET ${r}/{{id}}`,"","###"].join(`
`)}},Wt={generate:(e,t="Root")=>{let r=x(e),o=Object.keys(r),n=1,i=["{",...o.map(a=>{let l=r[a],c=l.type==="number"?"0":l.type==="boolean"?"false":`\${${n++}:${a}}`;return`  "${a}": ${l.type==="string"||l.format?`"${c}"`:c},`}),"}"],s={[`${S(t)} Scaffold`]:{prefix:`${t.toLowerCase()}-scaffold`,body:i,description:`Generated by TypeMorph: ${S(t)} scaffold`}};return JSON.stringify(s,null,2)}},Xt={generate:(e,t="Root")=>{let r=x(e),o=i=>i.type==="number"?0:i.type==="boolean"?!1:i.type==="object"&&i.fields?Object.fromEntries(Object.entries(i.fields).map(([s,a])=>[s,o(a)])):i.type==="array"?i.itemType?[o(i.itemType)]:[]:i.format==="uuid"?"uuid-xxxx-xxxx":i.format==="email"?"user@example.com":i.format==="url"?"https://example.com":i.format==="datetime"?"2024-01-01T00:00:00Z":"sample",n=JSON.stringify(Object.fromEntries(Object.entries(r).map(([i,s])=>[i,o(s)])),null,2);return`curl -X POST https://api.example.com/${T(t)}s \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -d '${n}'
`}},Qt={generate:(e,t="Root")=>{let r=S(t),o=`${r}Schema`,n=(i,s="  ")=>{let a=x(i),l=`{
`;for(let[c,f]of Object.entries(a))if(l+=`${s}  ${c}: `,f.type==="object")l+=n(f,s+"  ")+`,
`;else if(f.type==="array"){let u=f.itemType;if(u?.type==="object")l+=`[${n(u,s+"  ")}],
`;else{let p="String";u?.type==="number"?p="Number":u?.type==="boolean"?p="Boolean":u?.type==="union"||u?.type==="any"?p="Schema.Types.Mixed":u?.enumValues&&u.enumValues.length&&(p="String"),l+=`[${p}],
`}}else{let u="String";f.type==="number"?u="Number":f.type==="boolean"?u="Boolean":f.type==="union"&&(u="Schema.Types.Mixed");let p=`type: ${u}`;f.optional||(p+=", required: true"),f.enumValues&&f.enumValues.length&&(p+=`, enum: [${f.enumValues.map(m=>`"${m}"`).join(", ")}]`),l+=`{ ${p} },
`}return l+=`${s}}`,l};if(e.type==="object"){let i=`import mongoose, { Schema, Document } from 'mongoose';

`;return i+=`const ${o} = new Schema(${n(e)}, { timestamps: true });

`,i+=`export interface I${r} extends Document {}
`,i+=`export const ${r} = mongoose.models.${r} || mongoose.model<I${r}>('${r}', ${o});
`,i}return""}},Zt={generate:(e,t="Root")=>{let r=x(e);if(!Object.keys(r).length)return"";let o=S(t),n=`import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

`;n+=`export class ${o} extends Model {}

`,n+=`${o}.init({
`,n+=`  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
`;for(let[i,s]of Object.entries(r)){let a="DataTypes.STRING";s.type==="number"?a="DataTypes.DOUBLE":s.type==="boolean"?a="DataTypes.BOOLEAN":s.type==="object"||s.type==="array"||s.type==="union"?a="DataTypes.JSON":s.format==="datetime"&&(a="DataTypes.DATE"),s.enumValues&&s.enumValues.length&&(a=`DataTypes.ENUM(${s.enumValues.map(l=>`'${l}'`).join(", ")})`),n+=`  ${i}: {
    type: ${a},
    allowNull: ${!!s.optional||!!s.nullable}
  },
`}return n+=`}, {
  sequelize,
  modelName: '${o}',
  tableName: '${T(t)}s',
  timestamps: true
});
`,n}},er={generate:(e,t="Root")=>{let r=x(e);if(!Object.keys(r).length)return"";let o=S(t),n=`import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

`;n+=`@Entity('${T(t)}s')
`,n+=`export class ${o} {
`,r.id||(n+=`  @PrimaryGeneratedColumn('uuid')
  id!: string;

`);for(let[i,s]of Object.entries(r)){let a="string",l="@Column()";if(s.type==="number"?(a="number",l="@Column('double')"):s.type==="boolean"?(a="boolean",l="@Column('boolean')"):s.type==="object"||s.type==="array"||s.type==="union"?(a="any",l="@Column('jsonb')"):s.format==="datetime"&&(a="Date",l="@Column('timestamp')"),s.enumValues&&s.enumValues.length){let c=s.enumValues.map(u=>`'${u}'`).join(" | ");a=c;let f=["type: 'enum'",`enum: [${c}]`];s.nullable&&f.push("nullable: true"),l=`@Column({
    ${f.join(`,
    `)}
  })`}s.nullable&&!(s.enumValues&&s.enumValues.length)&&(l=l.replace(/\)$/,", nullable: true)")),n+=`  ${l}
  ${i}${s.optional?"?":"!"}: ${a}${s.nullable?" | null":""};

`}return!r.createdAt&&!r.created_at&&(n+=`  @CreateDateColumn()
  createdAt!: Date;

`),!r.updatedAt&&!r.updated_at&&(n+=`  @UpdateDateColumn()
  updatedAt!: Date;
`),n+=`}
`,n}},nr={generate:(e,t="Root")=>{let r=x(e);if(!Object.keys(r).length)return"";let o=`${T(t)}s`,n=`import { pgTable, uuid, varchar, doublePrecision, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';

`;n+=`export const ${T(t)} = pgTable('${o}', {
`,r.id||(n+=`  id: uuid('id').defaultRandom().primaryKey(),
`);for(let[i,s]of Object.entries(r)){let a=T(i),l=`varchar('${a}', { length: 255 })`;s.type==="number"?l=`doublePrecision('${a}')`:s.type==="boolean"?l=`boolean('${a}')`:s.type==="object"||s.type==="array"||s.type==="union"?l=`jsonb('${a}')`:s.format==="datetime"&&(l=`timestamp('${a}')`),s.enumValues&&s.enumValues.length&&(l=`varchar('${a}', { enum: [${s.enumValues.map(f=>`'${f}'`).join(", ")}] })`);let c=s.optional||s.nullable?"":".notNull()";n+=`  ${i}: ${l}${c},
`}return!r.createdAt&&!r.created_at&&(n+=`  createdAt: timestamp('created_at').defaultNow().notNull(),
`),!r.updatedAt&&!r.updated_at&&(n+=`  updatedAt: timestamp('updated_at').defaultNow().notNull()
`),n=n.replace(/,\n$/,`
`),n+=`});
`,n}},tr={generate:(e,t="Root")=>{let r=x(e);if(!Object.keys(r).length)return"";let o=S(t),n=`import { Generated, ColumnType } from 'kysely';

`;n+=`export interface ${o}Table {
`,r.id||(n+=`  id: Generated<string>;
`);for(let[i,s]of Object.entries(r)){let a="string";s.type==="number"?a="number":s.type==="boolean"?a="boolean":s.type==="object"||s.type==="array"?a="unknown":s.format==="datetime"&&(a="Date | string");let l=s.optional?`${a} | null`:a;n+=`  ${i}: ${l};
`}return!r.createdAt&&!r.created_at&&(n+=`  createdAt: Generated<string>;
`),!r.updatedAt&&!r.updated_at&&(n+=`  updatedAt: ColumnType<string, string | undefined, string>;
`),n+=`}

`,n+=`export interface Database {
`,n+=`  ${T(t)}s: ${o}Table;
`,n+=`}
`,n}},pe={generate:(e,t="root",r=new Set)=>{if(e.type==="object"&&e.fields){if(r.has(t))return"";r.add(t);let o="";r.size===1&&(o+=`import * as yup from 'yup';

`),o+=`export const ${t}YupSchema = yup.object({
`;for(let[n,i]of Object.entries(e.fields)){let s=i.nullable?".nullable()":"",a=i.optional?"":".required()",l=t+S(n),c="";if(i.type==="object")c=`${l}YupSchema`;else if(i.type==="array"){let f=i.itemType,u;f?.type==="string"&&f.enumValues?u=`yup.string().oneOf([${f.enumValues.map(p=>`"${p}"`).join(", ")}])`:u=f?.type==="object"?`${l}ItemYupSchema`:`yup.${f?.type??"string"}()`,c=`yup.array().of(${u})`}else i.type==="union"&&i.unionTypes?c="yup.mixed()":i.type==="string"&&i.enumValues?c=`yup.string().oneOf([${i.enumValues.map(f=>`"${f}"`).join(", ")}])`:i.type==="string"?(c="yup.string()",i.format==="email"?c+=".email()":i.format==="url"?c+=".url()":i.format==="uuid"&&(c+=".uuid()")):c=i.type==="any"?"yup.mixed()":`yup.${i.type}()`;o+=`  ${n}: ${c}${s}${a},
`}o+=`});

`;for(let[n,i]of Object.entries(e.fields)){let s=t+S(n);i.type==="object"&&(o+=pe.generate(i,s,r)),i.type==="array"&&i.itemType?.type==="object"&&(o+=pe.generate(i.itemType,s+"Item",r))}return o}return""}},me={generate:(e,t="root",r=new Set)=>{if(e.type==="object"&&e.fields){if(r.has(t))return"";r.add(t);let o="";r.size===1&&(o+=`import Joi from 'joi';

`),o+=`export const ${t}JoiSchema = Joi.object({
`;for(let[n,i]of Object.entries(e.fields)){let s=i.nullable?".allow(null)":"",a=i.optional?"":".required()",l=t+S(n),c="";if(i.type==="object")c=`${l}JoiSchema`;else if(i.type==="array"){let f=i.itemType,u;f?.type==="string"&&f.enumValues?u=`Joi.string().valid(${f.enumValues.map(p=>`"${p}"`).join(", ")})`:u=f?.type==="object"?`${l}ItemJoiSchema`:`Joi.${f?.type??"string"}()`,c=`Joi.array().items(${u})`}else i.type==="union"&&i.unionTypes?c=`Joi.alternatives().try(${i.unionTypes.map(f=>`Joi.valid(${typeof f=="string"?`"${f}"`:f})`).join(", ")})`:i.type==="string"&&i.enumValues?c=`Joi.string().valid(${i.enumValues.map(f=>`"${f}"`).join(", ")})`:i.type==="string"?(c="Joi.string()",i.format==="email"?c+=".email()":i.format==="url"?c+=".uri()":i.format==="uuid"&&(c+=".guid()")):c=`Joi.${i.type}()`;o+=`  ${n}: ${c}${s}${a},
`}o+=`});

`;for(let[n,i]of Object.entries(e.fields)){let s=t+S(n);i.type==="object"&&(o+=me.generate(i,s,r)),i.type==="array"&&i.itemType?.type==="object"&&(o+=me.generate(i.itemType,s+"Item",r))}return o}return""}},de={generate:(e,t="root",r=new Set)=>{if(e.type==="object"&&e.fields){if(r.has(t))return"";r.add(t);let o="";r.size===1&&(o+=`import * as v from 'valibot';

`),o+=`export const ${t}ValiSchema = v.object({
`;for(let[n,i]of Object.entries(e.fields)){let s=t+S(n),a="";if(i.type==="object")a=`${s}ValiSchema`;else if(i.type==="array"){let l=i.itemType,c;l?.type==="string"&&l.enumValues?c=`v.picklist([${l.enumValues.map(f=>`"${f}"`).join(", ")}])`:c=l?.type==="object"?`${s}ItemValiSchema`:`v.${l?.type??"string"}()`,a=`v.array(${c})`}else i.type==="union"&&i.unionTypes?a=`v.union([${i.unionTypes.map(l=>typeof l=="string"?`v.literal("${l}")`:`v.literal(${l})`).join(", ")}])`:i.type==="string"&&i.enumValues?a=`v.picklist([${i.enumValues.map(l=>`"${l}"`).join(", ")}])`:i.type==="string"?(a="v.string()",i.format==="email"?a="v.pipe(v.string(), v.email())":i.format==="url"?a="v.pipe(v.string(), v.url())":i.format==="uuid"&&(a="v.pipe(v.string(), v.uuid())")):a=`v.${i.type}()`;i.nullable&&(a=`v.nullable(${a})`),i.optional&&(a=`v.optional(${a})`),o+=`  ${n}: ${a},
`}o+=`});

`;for(let[n,i]of Object.entries(e.fields)){let s=t+S(n);i.type==="object"&&(o+=de.generate(i,s,r)),i.type==="array"&&i.itemType?.type==="object"&&(o+=de.generate(i.itemType,s+"Item",r))}return o}return""}},ye={generate:(e,t="root",r=new Set)=>{if(e.type==="object"&&e.fields){if(r.has(t))return"";r.add(t);let o="";r.size===1&&(o+=`import * as s from 'superstruct';

`),o+=`export const ${t}Struct = s.type({
`;for(let[n,i]of Object.entries(e.fields)){let s=t+S(n),a="";if(i.type==="object")a=`${s}Struct`;else if(i.type==="array"){let l=i.itemType,c;l?.type==="string"&&l.enumValues?c=`s.enums([${l.enumValues.map(f=>`"${f}"`).join(", ")}])`:c=l?.type==="object"?`${s}ItemStruct`:`s.${l?.type??"string"}()`,a=`s.array(${c})`}else i.type==="union"&&i.unionTypes?a=`s.union([${i.unionTypes.map(l=>typeof l=="string"?`s.literal("${l}")`:`s.literal(${l})`).join(", ")}])`:i.type==="string"&&i.enumValues?a=`s.enums([${i.enumValues.map(l=>`"${l}"`).join(", ")}])`:a=`s.${i.type}()`;i.nullable&&(a=`s.nullable(${a})`),i.optional&&(a=`s.optional(${a})`),o+=`  ${n}: ${a},
`}o+=`});

`;for(let[n,i]of Object.entries(e.fields)){let s=t+S(n);i.type==="object"&&(o+=ye.generate(i,s,r)),i.type==="array"&&i.itemType?.type==="object"&&(o+=ye.generate(i.itemType,s+"Item",r))}return o}return""}},rr={generate:(e,t="Component")=>{let r=x(e);if(!Object.keys(r).length)return"";let o=S(t),n=`import React from 'react';

`;n+=`export interface ${o}Props {
`;for(let[i,s]of Object.entries(r)){let a="string";s.type==="number"?a="number":s.type==="boolean"?a="boolean":s.type==="object"?a="Record<string, any>":s.type==="array"&&(a="any[]"),n+=`  ${i}${s.optional?"?":""}: ${a};
`}n+=`}

`,n+=`export const ${o}: React.FC<${o}Props> = (props) => {
`,n+=`  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800">
`,n+=`      <h2 className="text-xl font-bold mb-2">${o}</h2>
`,n+=`      <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
`;for(let i of Object.keys(r))n+=`        <li><strong>${i}:</strong> {String(props.${i} ?? '')}</li>
`;return n+=`      </ul>
    </div>
  );
};
`,n}},ir={generate:(e,t="State")=>{let r=x(e);if(!Object.keys(r).length)return"";let o=S(t),n=`import React, { createContext, useContext, useState, ReactNode } from 'react';

`;n+=`export interface ${o}State {
`;for(let[i,s]of Object.entries(r)){let a="string";s.type==="number"?a="number":s.type==="boolean"?a="boolean":s.type==="object"?a="Record<string, any>":s.type==="array"&&(a="any[]"),n+=`  ${i}${s.optional?"?":""}: ${a};
`}return n+=`}

`,n+=`interface ${o}ContextType {
  state: ${o}State;
  updateState: (updates: Partial<${o}State>) => void;
}

`,n+=`const ${o}Context = createContext<${o}ContextType | undefined>(undefined);

`,n+=`export const ${o}Provider = ({ children, initial }: { children: ReactNode; initial: ${o}State }) => {
`,n+=`  const [state, setState] = useState<${o}State>(initial);
`,n+=`  const updateState = (updates: Partial<${o}State>) => setState(prev => ({ ...prev, ...updates }));

`,n+=`  return (
    <${o}Context.Provider value={{ state, updateState }}>
      {children}
    </${o}Context.Provider>
  );
};

`,n+=`export const use${o}Context = () => {
  const context = useContext(${o}Context);
  if (!context) throw new Error('use${o}Context must be used within ${o}Provider');
  return context;
};
`,n}},or={generate:(e,t="User")=>{let r=x(e);if(!Object.keys(r).length)return"";let o=S(t),n=T(t),i=`import { createSlice, PayloadAction } from '@reduxjs/toolkit';

`;i+=`export interface ${o}State {
`;for(let[s,a]of Object.entries(r)){let l="string";a.type==="number"?l="number":a.type==="boolean"?l="boolean":a.type==="object"?l="Record<string, any>":a.type==="array"&&(l="any[]"),i+=`  ${s}${a.optional?"?":""}: ${l};
`}i+=`}

`,i+=`const initialState: ${o}State = {
`;for(let[s,a]of Object.entries(r)){let l="''";a.type==="number"?l="0":a.type==="boolean"?l="false":a.type==="object"?l="{}":a.type==="array"&&(l="[]"),i+=`  ${s}: ${l},
`}return i+=`};

`,i+=`export const ${n}Slice = createSlice({
`,i+=`  name: '${n}',
  initialState,
  reducers: {
`,i+=`    set${o}: (state, action: PayloadAction<Partial<${o}State>>) => {
`,i+=`      return { ...state, ...action.payload };
`,i+=`    },
`,i+=`    reset${o}: () => initialState,
`,i+=`  },
});

`,i+=`export const { set${o}, reset${o} } = ${n}Slice.actions;
`,i+=`export default ${n}Slice.reducer;
`,i}},sr={generate:(e,t="User")=>{let r=x(e);if(!Object.keys(r).length)return"";let o=S(t),n=T(t),i=`import { defineStore } from 'pinia';

`;i+=`export const use${o}Store = defineStore('${n}', {
`,i+=`  state: () => ({
`;for(let[s,a]of Object.entries(r)){let l="''";a.type==="number"?l="0":a.type==="boolean"?l="false":a.type==="object"?l="{}":a.type==="array"&&(l="[]"),i+=`    ${s}: ${l} as ${a.type==="number"?"number":a.type==="boolean"?"boolean":a.type==="array"?"any[]":a.type==="object"?"Record<string, any>":"string"},
`}return i+=`  }),
`,i+=`  actions: {
`,i+=`    update(data: Partial<ReturnType<typeof this.$state>>) {
`,i+=`      Object.assign(this.$state, data);
`,i+=`    },
`,i+=`    reset() {
      this.$reset();
    }
`,i+=`  }
});
`,i}},ar={generate:(e,t="Component")=>{let r=x(e);if(!Object.keys(r).length)return"";let o=`<script setup lang="ts">
`;o+=`defineProps<{
`;for(let[n,i]of Object.entries(r)){let s="string";i.type==="number"?s="number":i.type==="boolean"?s="boolean":i.type==="object"?s="Record<string, any>":i.type==="array"&&(s="any[]"),o+=`  ${n}${i.optional?"?":""}: ${s};
`}o+=`}>();
`,o+=`</script>

`,o+=`<template>
  <div class="vue-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
`,o+=`    <h2 class="text-xl font-bold mb-2">${S(t)}</h2>
`,o+=`    <ul class="text-sm space-y-1">
`;for(let n of Object.keys(r))o+=`      <li><strong>${n}:</strong> {{ ${n} }}</li>
`;return o+=`    </ul>
  </div>
</template>
`,o}},lr={generate:(e,t="Component")=>{let r=x(e);if(!Object.keys(r).length)return"";let o=`<script lang="ts">
`;for(let[n,i]of Object.entries(r)){let s="string";i.type==="number"?s="number":i.type==="boolean"?s="boolean":i.type==="object"?s="Record<string, any>":i.type==="array"&&(s="any[]"),o+=`  export let ${n}: ${s}${i.optional?" | undefined = undefined":""};
`}o+=`</script>

`,o+=`<div class="svelte-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
`,o+=`  <h2 class="text-xl font-bold mb-2">${S(t)}</h2>
`,o+=`  <ul class="text-sm space-y-1">
`;for(let n of Object.keys(r))o+=`    <li><strong>${n}:</strong> {${n}}</li>
`;return o+=`  </ul>
</div>
`,o}},cr={generate:(e,t="Component")=>{let r=x(e);if(!Object.keys(r).length)return"";let o=S(t),n=`import { Component } from 'solid-js';

`;n+=`export interface ${o}Props {
`;for(let[i,s]of Object.entries(r)){let a="string";s.type==="number"?a="number":s.type==="boolean"?a="boolean":s.type==="object"?a="Record<string, any>":s.type==="array"&&(a="any[]"),n+=`  ${i}${s.optional?"?":""}: ${a};
`}n+=`}

`,n+=`export const ${o}: Component<${o}Props> = (props) => {
`,n+=`  return (
    <div class="solid-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
`,n+=`      <h2 class="text-xl font-bold mb-2">${o}</h2>
`,n+=`      <ul class="text-sm space-y-1">
`;for(let i of Object.keys(r))n+=`        <li><strong>${i}:</strong> {String(props.${i} ?? '')}</li>
`;return n+=`      </ul>
    </div>
  );
};
`,n}},ur={generate:(e,t="Data")=>{let r=x(e);if(!Object.keys(r).length)return"";let o=S(t),n=`// Generated by TypeMorph (requires ArduinoJson library)
`;n+=`#include <ArduinoJson.h>

`,n+=`struct ${o} {
`;for(let[i,s]of Object.entries(r)){let a="String";s.type==="number"?a="double":s.type==="boolean"&&(a="bool"),n+=`  ${a} ${i};
`}n+=`};

`,n+=`void deserialize${o}(Stream& stream, ${o}& data) {
`,n+=`  StaticJsonDocument<1024> doc;
`,n+=`  deserializeJson(doc, stream);

`;for(let i of Object.keys(r))n+=`  data.${i} = doc["${i}"];
`;return n+=`}
`,n}},fr={generate:(e,t="RECORD")=>{let r=x(e);if(!Object.keys(r).length)return"";let o=H(t).substring(0,20),n=`      * Generated by TypeMorph \u2014 COBOL Copybook
`;n+=`       01  ${o}.
`;for(let[i,s]of Object.entries(r)){let a=H(i).substring(0,20);if(s.type==="object"&&s.fields){n+=`           05  ${a.padEnd(20)}.
`;for(let[l,c]of Object.entries(s.fields)){let f=H(l).substring(0,20),u=c.type==="number"?"9(9)V99":c.type==="boolean"?"9(1)":"X(255)";n+=`               10  ${f.padEnd(20)} PIC ${u}.
`}}else if(s.type==="array"){let l=s.itemType?.type==="number"?"9(9)V99":"X(255)";n+=`           05  ${a.padEnd(20)} OCCURS 10 TIMES PIC ${l}.
`}else{let l="X(255)";s.type==="number"?l="9(9)V99":s.type==="boolean"&&(l="9(1)"),n+=`           05  ${a.padEnd(20)} PIC ${l}.
`}}return n}},pr={generate:(e,t="data")=>{let r=x(e);if(!Object.keys(r).length)return"";let n=`(ns com.example.${T(t)}-spec
  (:require [clojure.spec.alpha :as s]))

`,i=[];for(let[a,l]of Object.entries(r)){let c=`::${T(a)}`;i.push(c);let f="string?";if(l.type==="number")f="number?";else if(l.type==="boolean")f="boolean?";else if(l.type==="array")f="(s/coll-of any?)";else if(l.type==="object"&&l.fields){let u=Object.keys(l.fields).map(p=>`::${T(p)}`);for(let[p,m]of Object.entries(l.fields)){let d=m.type==="number"?"number?":m.type==="boolean"?"boolean?":"string?";n+=`(s/def ::${T(p)} ${d})
`}f=`(s/keys :req [${u.join(" ")}])`}n+=`(s/def ${c} ${f})
`}let s=i.join(" ");return n+=`
(s/def ::${T(t)} (s/keys :req [${s}]))
`,n}},mr={generate:(e,t="Data")=>{let r=x(e);if(!Object.keys(r).length)return"";let n=`defmodule MyApp.${S(t)} do
  use Ecto.Schema
  import Ecto.Changeset

`;n+=`  schema "${T(t)}s" do
`;for(let[s,a]of Object.entries(r)){let l=":string";a.type==="number"?l=":float":a.type==="boolean"?l=":boolean":a.type==="object"||a.type==="array"?l=":map":a.format==="datetime"&&(l=":utc_datetime"),n+=`    field :${T(s)}, ${l}
`}n+=`    timestamps()
  end

`;let i=Object.entries(r).filter(([,s])=>!s.optional).map(([s])=>`:${T(s)}`);return n+=`  def changeset(struct, params \\\\ %{}) do
`,n+=`    struct
`,n+=`    |> cast(params, [${Object.keys(r).map(s=>`:${T(s)}`).join(", ")}])
`,i.length&&(n+=`    |> validate_required([${i.join(", ")}])
`),n+=`  end
end
`,n}},dr={generate:(e,t="Model")=>{let r=x(e);if(!Object.keys(r).length)return"";let o=S(t),n=`module MyApp.${o} exposing (..)

import Json.Decode as Decode exposing (Decoder)
import Json.Decode.Pipeline exposing (required, optional)

`;n+=`type alias ${o} =
    {
`;let i=Object.entries(r).map(([s,a])=>{let l="String";return a.type==="number"?l="Float":a.type==="boolean"&&(l="Bool"),a.optional&&(l=`Maybe ${l}`),`    ${s} : ${l}`});n+=i.join(`
    , `)+`
    }

`,n+=`decoder : Decoder ${o}
decoder =
    Decode.succeed ${o}
`;for(let[s,a]of Object.entries(r)){let l="Decode.string";a.type==="number"?l="Decode.float":a.type==="boolean"&&(l="Decode.bool"),a.optional?n+=`        |> optional "${s}" (Decode.nullable ${l}) Nothing
`:n+=`        |> required "${s}" ${l}
`}return n}},yr={generate:(e,t="Data")=>{let r=x(e);if(!Object.keys(r).length)return"";let o=`# Generated by TypeMorph \u2014 GDScript
class_name ${S(t)}

`;for(let[n,i]of Object.entries(r)){let s="String",a='""';i.type==="number"?(s="float",a="0.0"):i.type==="boolean"?(s="bool",a="false"):i.type==="object"?(s="Dictionary",a="{}"):i.type==="array"&&(s="Array",a="[]"),o+=`var ${T(n)}: ${s} = ${a}
`}o+=`
static func from_dict(dict: Dictionary) -> ${S(t)}:
`,o+=`  var instance = ${S(t)}.new()
`;for(let n of Object.keys(r)){let i=T(n);o+=`  if dict.has("${n}"):
    instance.${i} = dict["${n}"]
`}return o+=`  return instance
`,o}},gr={generate:(e,t="Root")=>{let r=x(e);if(!Object.keys(r).length)return"";let o=S(t),n=`{-# LANGUAGE DeriveGeneric #-}
module MyApp.${o} where

import GHC.Generics (Generic)
import Data.Aeson (FromJSON, ToJSON)

`;n+=`data ${o} = ${o}
  { `;let i=Object.entries(r).map(([s,a])=>{let l="String";return a.type==="number"?l="Double":a.type==="boolean"&&(l="Bool"),a.optional&&(l=`Maybe ${l}`),`${T(s)} :: ${l}`});return n+=i.join(`
  , `)+`
  } deriving (Show, Generic)

`,n+=`instance FromJSON ${o}
instance ToJSON ${o}
`,n}},hr={generate:(e,t="df")=>{let r=x(e);if(!Object.keys(r).length)return"";let o=T(t),n=`# Generated by TypeMorph
`;n+=`${o} <- data.frame(
`;let i=Object.entries(r).map(([s,a])=>{let l='"sample_value"';return a.type==="number"?l="0.0":a.type==="boolean"?l="TRUE":a.type==="object"||a.type==="array"?l="list()":a.format==="email"?l='"user@example.com"':a.format==="datetime"&&(l='as.POSIXct("2024-01-01")'),`  ${T(s)} = c(${l})`});return n+=i.join(`,
`)+`,
  stringsAsFactors = FALSE
)
`,n}},br={generate:(e,t="Root")=>{let r=x(e);if(!Object.keys(r).length)return"";let o=S(t),n=`// Generated by TypeMorph
`;n+=`case class ${o}(
`;let i=Object.entries(r).map(([s,a])=>{let l="String";return a.type==="number"?l="Double":a.type==="boolean"?l="Boolean":a.type==="object"?l="Map[String, Any]":a.type==="array"&&(l="List[Any]"),a.optional&&(l=`Option[${l}]`),`  ${s}: ${l}`});return n+=i.join(`,
`)+`
)
`,n}},Tr={generate:(e,t="Record")=>{let r=x(e);if(!Object.keys(r).length)return"";let o=[],n="";for(let[s,a]of Object.entries(r)){let l="string";if(a.type==="number")l="uint256";else if(a.type==="boolean")l="bool";else if(a.type==="array")l=`${a.itemType?.type==="number"?"uint256":a.itemType?.type==="boolean"?"bool":"string"}[]`;else if(a.type==="object"&&a.fields){let c=S(s),f=`    struct ${c} {
`;for(let[u,p]of Object.entries(a.fields)){let m=p.type==="number"?"uint256":p.type==="boolean"?"bool":"string";f+=`        ${m} ${u};
`}f+="    }",o.push(f),l=c}n+=`        ${l} ${s};
`}let i=`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

`;i+=`contract ${S(t)}Store {
`;for(let s of o)i+=s+`

`;return i+=`    struct ${S(t)} {
`,i+=`        uint256 id;
`,i+=n,i+=`    }
`,i+=`}
`,i}},xr={generate:(e,t="Post")=>{let r=x(e);if(!Object.keys(r).length)return"";let o=S(t),n=`from django.db import models
from rest_framework import serializers

`;n+=`class ${o}(models.Model):
`;for(let[i,s]of Object.entries(r)){let a=T(i),l=s.optional?", null=True, blank=True":"",c=`models.CharField(max_length=255${l})`;s.type==="number"?c=`models.FloatField(${l})`:s.type==="boolean"?c="models.BooleanField(default=False)":s.type==="object"||s.type==="array"?c=`models.JSONField(${l})`:s.format==="datetime"&&(c="models.DateTimeField(auto_now_add=True)"),n+=`    ${a} = ${c}
`}return n+=`

class ${o}Serializer(serializers.ModelSerializer):
`,n+=`    class Meta:
`,n+=`        model = ${o}
`,n+=`        fields = '__all__'
`,n}},Sr={generate:(e,t="User")=>{let r=x(e);if(!Object.keys(r).length)return"";let n=`class ${`Create${S(t)}s`} < ActiveRecord::Migration[7.0]
  def change
`;n+=`    create_table :${T(t)}s do |t|
`;for(let[i,s]of Object.entries(r)){if(i.toLowerCase()==="id")continue;let a="string";s.type==="number"?a=s.format==="int"?"integer":"decimal":s.type==="boolean"?a="boolean":s.type==="object"||s.type==="array"?a="jsonb":s.format==="datetime"&&(a="datetime");let l=s.optional?", null: true":", null: false";n+=`      t.${a} :${T(i)}${l}
`}return n+=`      t.timestamps
    end
  end
end
`,n}},$r={generate:(e,t="Root")=>{let r=S(t),o=T(t),n=x(e),i=Object.keys(n),s=JSON.stringify(Object.fromEntries(i.map(a=>{let l=n[a];return l.type==="number"?[a,0]:l.type==="boolean"?[a,!1]:[a,"sample"]})),null,6).replace(/^/gm,"    ");return`import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Generated by TypeMorph \u2014 Next.js App Router API Route
// Route: /api/${o}s

const ${r}Schema = z.object({
${i.map(a=>{let l=n[a],c=l.type==="number"?"z.number()":l.type==="boolean"?"z.boolean()":"z.string()";return`  ${a}: ${c}${l.optional?".optional()":""}`}).join(`,
`)}
});

export async function GET(request: NextRequest) {
  try {
    // TODO: Replace with your database query
    const items: z.infer<typeof ${r}Schema>[] = [];
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch ${o}s' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = ${r}Schema.parse(body);
    // TODO: Replace with your database insert
    return NextResponse.json(validated, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create ${o}' }, { status: 500 });
  }
}
`}},Ar={generate:(e,t="Root")=>{let r=S(t),o=t.charAt(0).toLowerCase()+t.slice(1),n=T(t),i=x(e),s=Object.keys(i);return`import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Generated by TypeMorph \u2014 React Query Hook
// Requires: @tanstack/react-query

export interface ${r} {
${s.map(a=>{let l=i[a],c=l.type==="number"?"number":l.type==="boolean"?"boolean":"string";return`  ${a}${l.optional?"?":""}: ${c};`}).join(`
`)}
}

const API_BASE = '/api/${n}s';

export const use${r}List = () => {
  return useQuery<${r}[]>({
    queryKey: ['${n}s'],
    queryFn: async () => {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error('Failed to fetch ${n}s');
      return res.json();
    },
  });
};

export const use${r}Create = () => {
  const queryClient = useQueryClient();
  return useMutation<${r}, Error, Omit<${r}, 'id'>>({
    mutationFn: async (data) => {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create ${n}');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${n}s'] });
    },
  });
};

export const use${r}Delete = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(\`\${API_BASE}/\${id}\`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete ${n}');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${n}s'] });
    },
  });
};
`}};var Or=require("crypto");function ps(e,t){typeof window>"u"||typeof window.gtag!="function"||window.gtag("event",e,t)}function Cr(e,t){ps("infer_unsupported_output",{target:e,requested:t})}var Pe=new Set(["string","number","boolean"]),Ue=(e,t)=>{let r=e.type==="union"?e.unionTypes??[]:[e.type],o=t.type==="union"?t.unionTypes??[]:[t.type],n=Array.from(new Set([...r,...o]));return n.length===1?{type:n[0]}:{type:"union",unionTypes:n}},Nr=20,he=(e,t,r=0)=>{if(r>Nr)return{type:"any"};if(!e)return t;if(!t)return e;let o=e.optional||t.optional,n=e.nullable||t.nullable;if(e.type==="any")return{...t,optional:o,nullable:n};if(t.type==="any")return{...e,optional:o,nullable:n};if(e.type!==t.type){if(Pe.has(e.type)&&Pe.has(t.type))return{...Ue(e,t),optional:o,nullable:n};if(e.type==="union"||t.type==="union"){let i=e.type==="union"?t.type:e.type;if(i==="union"||Pe.has(i))return{...Ue(e,t),optional:o,nullable:n}}return{type:"any",optional:o,nullable:n}}if(e.type==="union")return{...Ue(e,t),optional:o,nullable:n};if(e.type==="number"&&t.type==="number"){let i=e.format==="float"||t.format==="float"?"float":"int";return{...e,optional:o,nullable:n,format:i}}if(e.type==="string"&&t.type==="string"){let i;if(e.enumValues||t.enumValues){let s=Array.from(new Set([...e.enumValues??[],...t.enumValues??[]]));s.length<=6&&(i=s)}return e.format===t.format?{...e,optional:o,nullable:n,enumValues:i}:{type:"string",optional:o,nullable:n,enumValues:i}}if(e.type==="object"&&t.type==="object"){let i=e.fields??{},s=t.fields??{},a=new Set([...Object.keys(i),...Object.keys(s)]),l={};for(let c of a){let f=c in i,u=c in s;f&&u?l[c]=he(i[c],s[c],r+1):f?l[c]={...i[c],optional:!0}:l[c]={...s[c],optional:!0}}return{type:"object",fields:l,optional:o,nullable:n}}return e.type==="array"&&t.type==="array"?{type:"array",itemType:he(e.itemType,t.itemType,r+1),optional:o,nullable:n}:{...e,optional:o,nullable:n}},ms=e=>{let t={};for(let r of e)if(r&&typeof r=="object"&&!Array.isArray(r))for(let[o,n]of Object.entries(r))typeof n=="string"&&(t[o]||(t[o]=[]),t[o].push(n));return t},Er=new Set(["status","type","role","gender","state","category","mode","level","phase","kind","visibility","scope","method","action","currency","priority","tier","plan","severity","permission","provider","platform","environment","locale","theme","layout","variant","direction","alignment","position"]),ds=(e,t,r)=>{if(t.length===0)return 0;let o=0,n=e.toLowerCase(),i=r?.enumMinSamples??3;Array.from(Er).some(u=>n.includes(u))&&(o+=.4);let a=new Set(t),l=a.size/t.length;a.size===1||l<=.2?o+=.4:l<=.4&&t.length>=i&&(o+=.2);let c=r?.enumMaxUnique??6;a.size>=2&&a.size<=c&&(o+=.25),t.length>=10?o+=.2:t.length>=5&&(o+=.1);let f=new Set(["yes","no","true","false","get","post","put","delete","active","inactive","pending","success","error","failed"]);return t.every(u=>f.has(u.toLowerCase()))&&(o+=t.length>=i?.5:.2),Math.min(o,1)},ys=(e,t,r)=>{let o=r?.enumConfidenceThreshold??.6;return ds(e,t,r)>=o},gs=e=>{let t=Object.keys(e);if(t.some(s=>/currency|curr/i.test(s)))for(let s of t)/amount|price|cost|fee|tax|total|subtotal/i.test(s)&&e[s].type==="number"&&(e[s].format="float");let o=t.some(s=>/^lat(itude)?$/i.test(s)),n=t.some(s=>/^(lng|lon|longitude)$/i.test(s));if(o&&n)for(let s of t)/^lat(itude)?$|^(lng|lon|longitude)$/i.test(s)&&e[s].type==="number"&&(e[s].format="float");if(t.some(s=>/created_?at|updated_?at/i.test(s)))for(let s of t)/created_?by|updated_?by/i.test(s)&&e[s].type==="string"&&(e[s].format="uuid")},ge=(e,t,r=0,o,n)=>{let i=n?.maxDepth??Nr,s=(l,c,f)=>(n?.includeMeta&&(l._meta={reason:c,info:f}),l);if(r>i)return s({type:"any"},"max_depth_exceeded");if(e===null)return s({type:"any",nullable:!0},"null_value");if(e===void 0)return s({type:"any",optional:!0},"undefined_value");if(Array.isArray(e)){if(e.length===0)return s({type:"array",itemType:{type:"any"}},"empty_array");let l=e.length,c=n?.arrayLargeThreshold??1e3,f=n?.arraySampleCount??200,u=n?.arrayPrefixSample??10,p=new Set;if(l<=c)for(let b=0;b<l;b++)p.add(b);else{let b=Math.min(u,l);for(let A=0;A<b;A++)p.add(A);let g=Math.max(0,Math.min(f-b,l-b));if(g>0){let A=(l-b)/g;for(let E=0;E<g;E++)p.add(Math.min(l-1,Math.floor(b+E*A)))}}let m=Array.from(p).sort((b,g)=>b-g).map(b=>e[b]),d=new Set,y=ms(m);for(let[b,g]of Object.entries(y))ys(b,g,n)&&d.add(b);let $=ge(m[0],void 0,r+1,d,n);for(let b=1;b<m.length;b++)$=he($,ge(m[b],void 0,r+1,d,n),r+1);return s({type:"array",itemType:$},"array_inferred",{samples:l,sampled:m.length})}if(typeof e=="object"){let l={};for(let c in e)l[c]=ge(e[c],c,r+1,o,n);return gs(l),s({type:"object",fields:l},"object",{fieldCount:Object.keys(l).length})}if(typeof e=="string"){if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(e))return s({type:"string",format:"uuid"},"format:uuid");if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))return s({type:"string",format:"email"},"format:email");if(/^https?:\/\/[^\s]+$/.test(e))return s({type:"string",format:"url"},"format:url");if(/^\d{4}-\d{2}-\d{2}$/.test(e)&&!isNaN(Date.parse(e)))return s({type:"string",format:"date"},"format:date");if(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(e)&&!isNaN(Date.parse(e)))return s({type:"string",format:"datetime"},"format:datetime");if(/^\d/.test(e)&&e.includes("T")&&!isNaN(Date.parse(e))&&e.length>7)return s({type:"string",format:"datetime"},"format:datetime");let l=!1;if(t){let c=t.toLowerCase(),f=Array.from(Er),u=/price|amount|cost|fee|tax|rate|ratio|percent|score|weight|height|width|balance|salary|revenue/i,p=/^id$|_id$|^uuid$|^guid$|^token$/i,m=/url|uri|href|link|src|endpoint|avatar|thumbnail|image|photo/i,d=/email|mail/i;if(p.test(t))return s({type:"string",format:"uuid"},"format:uuid:keyname");if(d.test(t))return s({type:"string",format:"email"},"format:email:keyname");if(m.test(t))return s({type:"string",format:"url"},"format:url:keyname");if(o?l=o.has(t):(f.some(y=>c.includes(y))||new Set(["yes","no","true","false","get","post","put","delete","active","inactive","pending","success","error","failed"]).has(e.toLowerCase()))&&(l=!0),!l&&u.test(t))return s({type:"string"},"format:float:keyname")}return l&&e.trim()!==""?s({type:"string",enumValues:[e]},"enum_candidate",{sample:e}):s({type:"string"},"string")}if(typeof e=="number"){let l=Number.isInteger(e);return s({type:"number",format:l?"int":"float"},"number")}let a=typeof e;return s(a==="string"||a==="number"||a==="boolean"||a==="object"?{type:a}:{type:"any"},"primitive")},hs={typescript:`// Required dependencies: npm install typescript

`,zod:`// Required dependencies: npm install zod

`,go:`// Go version 1.18+ required (supports generics)

`,rust:`// Required Cargo dependencies:
// serde = { version = "1.0", features = ["derive"] }

`,java:`// Java version 8+ required (compatible with Jackson/Gson)

`,sql:`// Prisma schema format (requires: npx prisma generate)

`,php:`// PHP version 8.1+ required

`,python:`# Required dependencies: pip install pydantic

`,protobuf:`// Protocol Buffers v3 specification

`,csharp:`// C# (.NET Core 6.0+) standard class model

`,swift:`// Swift 5.0+ (Codable protocol compliant)

`,kotlin:`// Kotlin standard library data class (compatible with kotlinx.serialization)

`,csv:`// CSV Data Format (Excel compatible)

`,"sql-insert":`// ANSI SQL standard compliant INSERT statement

`,mysql:`-- MySQL / MariaDB compatible DDL (Requires MySQL 5.7+)

`,postgres:`-- PostgreSQL compatible DDL (Requires PostgreSQL 10+)

`,sqlite:`-- SQLite compatible DDL schema

`,snowflake:`-- Snowflake Data Cloud compatible DDL table schema

`,toml:`# TOML configuration format

`,yaml:`# YAML standard data format

`,env:`# Environment variables (.env template)

`,properties:`# Java .properties key-value configuration

`,mongoose:`// Required dependencies: npm install mongoose

`,sequelize:`// Required dependencies: npm install sequelize pg pg-hstore (or mysql2/sqlite3)

`,typeorm:`// Required dependencies: npm install typeorm reflect-metadata
// Note: Enable emitDecoratorMetadata and experimentalDecorators in tsconfig.json

`,drizzle:`// Required dependencies: npm install drizzle-orm drizzle-kit

`,kysely:`// Required dependencies: npm install kysely

`,yup:"",joi:"",valibot:"",superstruct:"","react-props":`// Required dependencies: npm install react

`,"react-context":`// Required dependencies: npm install react

`,"redux-slice":`// Required dependencies: npm install @reduxjs/toolkit react-redux

`,"pinia-store":`// Required dependencies: npm install pinia

`,"vue-props":`// Vue 3 <script setup lang="ts"> standard format

`,"svelte-props":`// Svelte 3/4 TypeScript component props scaffold

`,"solid-props":`// Required dependencies: npm install solid-js

`,arduino:`// Required libraries: ArduinoJson (v6 or v7)

`,clojure:`;; Clojure clojure.spec/alpha definition

`,elixir:`# Required dependencies: Ecto (mix ecto)

`,elm:`-- Required Elm packages:
-- elm install elm/json
-- elm install elm-community/json-extra

`,godot:`# Godot Engine 4.0+ GDScript class_name script

`,haskell:`-- Required GHC extensions and packages: aeson

`,django:`# Required dependencies: pip install django djangorestframework

`,rails:`# Rails ActiveRecord Migration template

`,mongodb:`// Required dependencies: npm install mongoose

`,dynamodb:`// AWS SDK required: npm install @aws-sdk/client-dynamodb

`,bigquery:`// Required dependencies: npm install @google-cloud/bigquery

`,openapi:`// OpenAPI 3.0 specification (YAML format)

`,avro:`// Apache Avro schema format

`,mermaid:`// Mermaid ER Diagram \u2014 paste into https://mermaid.live

`,postman:`// Postman Collection v2.1 format

`,http:`// HTTP file format (JetBrains IDE / VS Code REST Client compatible)

`,vscode:`// VS Code snippet format \u2014 paste into .vscode/snippets.json

`,curl:`// cURL command

`,cobol:`* COBOL Copybook format

`,scala:`// Scala case class

`,solidity:`// SPDX-License-Identifier: MIT

`,"r-lang":`# R dataframe scaffold

`,"react-query":`// Required dependencies: npm install @tanstack/react-query

`,"api-route":`// Generated Next.js App Router API Route
// Required: Next.js 13+ with App Router enabled

`,"nextjs-api":`// Generated Next.js App Router API Route
// Required: Next.js 13+ with App Router enabled

`},bs=e=>{let t=e.split(`
`).map(n=>n.trimEnd()),r=[],o=!1;for(let n of t)n===""?o||(r.push(""),o=!0):(r.push(n),o=!1);return r.join(`
`).trim()},qe=new WeakMap,Ts=e=>{if(qe.has(e))return qe.get(e);let t=n=>{if(!n)return null;if(n.type==="object"&&n.fields){let s=Object.keys(n.fields).sort((l,c)=>l.localeCompare(c)),a={};for(let l of s)a[l]=t(n.fields[l]);return{type:"object",fields:a}}if(n.type==="array"&&n.itemType)return{type:"array",item:t(n.itemType)};let i={type:n.type,optional:!!n.optional,nullable:!!n.nullable};return n.enumValues&&n.enumValues.length>0&&(i.enum=[...n.enumValues].sort()),n.format&&(i.format=n.format),i},r=JSON.stringify(t(e)),o=(0,Or.createHash)("sha256").update(r).digest("hex");return qe.set(e,o),e._structureHash=o,o},Be=(e,t=[],r="Root")=>{if(e.type==="object"&&e.fields){t.push({schema:e,parentKey:r});for(let[o,n]of Object.entries(e.fields))Be(n,t,o)}else e.type==="array"&&e.itemType&&Be(e.itemType,t,r+"Item")},Ve=(e,t,r=new Set,o={})=>{if(e.type!=="object"||t.type!=="object"||!e.fields||!t.fields)return!1;let n=Object.keys(e.fields),i=Object.keys(t.fields),s=o.minFieldsForIsomorphic??2;if(n.length<s||i.length<s)return!1;let a=e._structureHash,l=t._structureHash,c=a&&l?`${a}-${l}`:void 0;if(c&&r.has(c))return!0;c&&r.add(c);let f=Array.from(new Set([...n,...i])),u=0,p=0,m=0;for(let g of f){let A=e.fields[g],E=t.fields[g];if(A&&E)if(A.type==="any"||E.type==="any")u++;else if(A.type===E.type)if(A.type==="object"&&A.fields&&E.fields)Ve(A,E,r,o)?u++:p++;else if(A.type==="array"&&A.itemType&&E.itemType){let G=A.itemType,ne=E.itemType;G.type==="any"||ne.type==="any"?u++:G.type==="object"&&ne.type==="object"?Ve(G,ne,r,o)?u++:p++:G.type===ne.type?u++:p++}else u++;else p++;else{let G=A||E;G.optional||G.type==="any"?u++:m++}}let d=u+p+m;if(d===0)return!0;let y=u/d,$=o.minMatchRatio??.5,b=o.maxTypeMismatches??0;return y>=$&&p<=b},ze=(e,t)=>{if(!(!e.fields||!t.fields)){for(let[r,o]of Object.entries(t.fields))if(!e.fields[r])e.fields[r]={...o,optional:!0};else{let n=e.fields[r];if(n.optional=n.optional||o.optional,n.nullable=n.nullable||o.nullable,n.type==="any")e.fields[r]={...o,optional:n.optional,nullable:n.nullable};else if(n.type==="string"&&o.type==="string"){if(n.enumValues||o.enumValues){let i=Array.from(new Set([...n.enumValues??[],...o.enumValues??[]]));n.enumValues=i.length<=6?i:void 0}}else n.type==="object"&&o.type==="object"?ze(n,o):n.type==="array"&&n.itemType&&o.type==="array"&&o.itemType&&(n.itemType.type==="any"?n.itemType={...o.itemType}:n.itemType.type==="object"&&o.itemType.type==="object"?ze(n.itemType,o.itemType):n.itemType.type===o.itemType.type&&(n.itemType=he(n.itemType,o.itemType)))}for(let r of Object.keys(e.fields))t.fields[r]||(e.fields[r].optional=!0)}},xs=(e,t={})=>{let r=t.sharedPrefix!==void 0?t.sharedPrefix:"Shared",o=[];for(let s of e){let a=!1;for(let l of o)if(Ve(s.schema,l[0],new Set,t)){l.push(s.schema),a=!0;break}a||o.push([s.schema])}let n=new Set,i=[];for(let s of o){let a=1;if(s.length<2)continue;s.sort((d,y)=>Object.keys(y.fields||{}).length-Object.keys(d.fields||{}).length);let l=s[0],f=(e.find(d=>d.schema===l)||e.find(d=>s.includes(d.schema)))?.parentKey||"Object",u=Object.keys(l.fields||{}),p="";if(u.includes("city")&&(u.includes("street")||u.includes("zip")))p=r?`${r}Address`:"Address";else if(u.includes("amount")&&u.includes("currency"))p=r?`${r}Money`:"Money";else if(u.includes("created_at")&&u.includes("updated_at"))p=r?`${r}Metadata`:"Metadata";else if(u.includes("name")&&(u.includes("email")||u.includes("age")||u.includes("profile")||u.includes("role")))p=r?`${r}User`:"User";else if(u.includes("id")&&u.includes("profile")&&u.includes("permissions"))p=r?`${r}Member`:"Member";else{let d=s.map(g=>e.find(A=>A.schema===g)?.parentKey).filter(g=>!!g&&g!=="Root"&&g!=="Object"),y=d.length>0?d.sort((g,A)=>g.length-A.length)[0]:f,$=new Set(["status","address","business","process","class","series","species","means","news","analysis","basis","crisis","thesis","oasis","bonus","genius","campus","focus","corpus","census","consensus","virus","canvas","atlas","alias","bias","gas"]);y.endsWith("s")&&!y.endsWith("ss")&&!$.has(y.toLowerCase())&&(y=y.slice(0,-1));let b=y.replace(/(^\w|_\w)/g,g=>g.replace(/_/,"").toUpperCase());p=r?`${r}${b}`:b}let m=p;for(;n.has(m);)m=`${p}${a++}`;n.add(m),i.push({group:s,semanticName:m})}return i},Ss=(e,t={})=>{let r=[];Be(e,r,"Root");for(let n of r)n.schema._structureHash=Ts(n.schema);let o=xs(r,t);for(let{group:n,semanticName:i}of o){if(t.disabledUnifications?.includes(i))continue;let s=t.customTypeNames?.[i]??i,a=n[0];for(let l=1;l<n.length;l++)ze(a,n[l]);for(let l=1;l<n.length;l++)n[l].fields=a.fields;for(let l of n)l._sharedTypeName=s}};var jr=(e,t,r="",o={})=>{try{let n=ge(e);Ss(n,o);let i="",s="",a=(t||r||"").toLowerCase();s=a;let l=o.rootName??"Root",c=l.charAt(0).toLowerCase()+l.slice(1);a==="typescript"||a==="ts"?i=`/**
 * TypeMorph Generated TypeScript Interface
 */
`+en.generate(n,l,o):a==="zod"?i=`import { z } from "zod";

`+nn.generate(n,c,o):a==="go"||a==="golang"?i=mn.generate(n,l,o):a==="rust"?i=fn.generate(n,l,o):a==="java"?i=yn.generate(n,l,o):a==="python"?i=`from pydantic import BaseModel

`+an.generate(n,l,o):a==="php"?i=`<?php

`+on.generate(n,l,o):a==="sql"||a==="prisma"?i=gn.generate(n,l,o):a==="proto"||a==="protobuf"?i=`// Protocol Buffers v3 specification

syntax = "proto3";

`+ln.generate(n,l,o):a==="graphql"||a==="gql"?i=cn.generate(n,l,o):a.includes("csv")?i=kt.generate(n):a.includes("sql-insert")?i=Rt.generate(n,"table_name"):a.includes("mysql")?i=wt.generate(n,"Root"):a.includes("postgres")?i=It.generate(n,"Root"):a.includes("sqlite")?i=_t.generate(n,"Root"):a.includes("snowflake")?i=Lt.generate(n,"Root"):a.includes("mongodb")||a.includes("mongoose")?i=Qt.generate(n,"Root"):a.includes("ruby")||a.includes("rails")?i=Sr.generate(n,"Root"):a.includes("django")?i=xr.generate(n,"Root"):a.includes("dart")||a.includes("flutter")?i=rn.generate(n,"Root",o):a.includes("swift")?i=$n.generate(n):a.includes("kotlin")?i=Cn.generate(n):a.includes("csharp")||a.includes("c-sharp")?i=xn.generate(n):a.includes("openapi")?i=Ht.generate(n,"Root"):a.includes("jsonschema")?i=On.generate(n):a.includes("yup")?i=pe.generate(n,"root"):a.includes("joi")?i=me.generate(n,"root"):a.includes("valibot")?i=de.generate(n,"root"):a.includes("react-props")?i=rr.generate(n,"Component"):a.includes("vue-props")?i=ar.generate(n,"Component"):a.includes("svelte-props")?i=lr.generate(n,"Component"):a.includes("solid-props")?i=cr.generate(n,"Component"):a.includes("react-context")?i=ir.generate(n,"Root"):a.includes("react-query")?i=Ar.generate(n,l):a.includes("api-route")||a.includes("nextjs-api")?i=$r.generate(n,l):a.includes("redux-slice")?i=or.generate(n,"root"):a.includes("pinia")?i=sr.generate(n,"root"):a.includes("sequelize")?i=Zt.generate(n,"Root"):a.includes("typeorm")?i=er.generate(n,"Root"):a.includes("drizzle")?i=nr.generate(n,"Root"):a.includes("kysely")?i=tr.generate(n,"Root"):a.includes("superstruct")?i=ye.generate(n,"root"):a.includes("arduino")?i=ur.generate(n,"Data"):a.includes("mock")?i=bn.generate(n):a.includes("ui")?i=hn.generate(n,"Component"):a.includes("doc")?i=re.generate(n):a.includes("avro")?i=Vt.generate(n,"Root"):a.includes("toml")?i=Mt.generate(n,"config"):a.includes("yaml")?i=Dt.generate(n):a.includes("env")?i=Ft.generate(n):a.includes("properties")?i=Gt.generate(n):a.includes("markdown")?i=Pt.generate(n):a.includes("asciidoc")?i=Ut.generate(n):a.includes("latex")?i=qt.generate(n):a.includes("mermaid")?i=Bt.generate(n,"Root"):a.includes("bigquery")?i=zt.generate(n):a.includes("dynamodb")?i=Yt.generate(n,"Root"):a.includes("postman")?i=Kt.generate(n):a.includes("http")?i=Jt.generate(n):a.includes("vscode")?i=Wt.generate(n):a.includes("curl")?i=Xt.generate(n):a.includes("cobol")?i=fr.generate(n,"ROOT"):a.includes("clojure")?i=pr.generate(n,"Root"):a.includes("elixir")?i=mr.generate(n,"Root"):a.includes("elm")?i=dr.generate(n,"Root"):a.includes("godot")||a.includes("gdscript")?i=yr.generate(n,"Root"):a.includes("haskell")?i=gr.generate(n,"Root"):a.includes("r-lang")||a==="r"?(i=hr.generate(n,"Root"),s="r-lang"):a.includes("scala")?i=br.generate(n,"Root"):a.includes("solidity")&&(i=Tr.generate(n,"Root")),a==="json"?i=JSON.stringify(e,null,2):i||(s="unsupported",Cr(t||r||"unknown",a),i=`// Unsupported output target: "${t||r||"unknown"}"
// Supported targets include: typescript, zod, go, rust, java, python, php, sql, protobuf, graphql, swift, kotlin, jsonschema, mock, ui, doc, openapi, yup, joi, valibot, react-props, vue-props, svelte-props, solid-props, react-context, redux-slice, pinia, sequelize, typeorm, drizzle, kysely, superstruct, arduino, clojure, elixir, elm, godot, haskell, r, scala, solidity
`);let f="",u=s.toLowerCase();for(let[m,d]of Object.entries(hs))if(u===m){f=d;break}let p=f?f+i:i;return bs(p)}catch(n){return"// Error: "+String(n)}};function vr(e,t){let r=[];function o(a){return a===null?"null":Array.isArray(a)?a.length===0?"any[]":`(${Array.from(new Set(a.map(c=>o(c)))).join(" | ")})[]`:typeof a=="object"?"object":typeof a}function n(a,l="root",c=new Map,f=new Set){if(a==null)return c.set(l,"null"),c;if(typeof a=="object"){if(f.has(a))return c;f.add(a)}let u=o(a);if(c.set(l,u),Array.isArray(a)){let p=a.filter(m=>m!==null&&typeof m=="object"&&!Array.isArray(m));if(p.length>0){let m={};for(let d of p)for(let y of Object.keys(d))y in m||(m[y]=d[y]);f.add(m),n(m,`${l}[]`,c,f)}else{let m=a.filter(d=>d===null||typeof d!="object"||Array.isArray(d));if(m.length>0){let d=Array.from(new Set(m.map($=>o($)))).sort(),y=d.length===1?d[0]:`(${d.join(" | ")})`;c.set(`${l}[]`,y)}}}else if(typeof a=="object")for(let p of Object.keys(a))n(a[p],`${l}.${p}`,c,f);return c}let i=n(e),s=n(t);for(let[a,l]of i.entries()){if(l==="object"||a.endsWith("[]")&&Array.from(i.keys()).some(u=>u.startsWith(a+".")))continue;let c=a.replace(/^root\./,"");if(!s.has(a))r.push({path:c,type:"removed",oldType:l,severity:"error",description:`Field '${c}' was removed. Frontend code referencing this property will break.`});else{let f=s.get(a);if(f==="object")continue;if(l!==f){let u="error",p=`Type changed from '${l}' to '${f}'.`;f==="null"||l+" | null"===f||f.includes("null")?(u="warning",p=`Field '${c}' became optional or nullable. Update frontend to use optional chaining (\`?.\`).`):l==="any[]"&&f!=="any[]"?(u="info",p=`Array '${c}' resolved from empty array to type '${f}'.`):p=`Field '${c}' changed type from '${l}' to '${f}'. Might break existing logic.`,r.push({path:c,type:"type_changed",oldType:l,newType:f,severity:u,description:p})}}}for(let[a,l]of s.entries()){if(l==="object")continue;if(a.endsWith("[]")){if(Array.from(s.keys()).some(p=>p.startsWith(a+".")))continue;let u=a.replace(/\[\]$/,"");if(i.has(u))continue}let c=a.replace(/^root\./,"");i.has(a)||r.push({path:c,type:"added",newType:l,severity:"info",description:`New field '${c}' of type '${l}' added.`})}return r}function Ye(e){return wr.readFileSync(ee.resolve(process.cwd(),e),"utf8")}function $s(){return new Promise(e=>{let t="",r=Ir.createInterface({input:process.stdin});r.on("line",o=>t+=o+`
`),r.on("close",()=>e(t.trim()))})}function He(e){try{return JSON.parse(e)}catch{console.error("typemorph: input is not valid JSON"),process.exit(1)}}function F(e){return`\x1B[1m${e}\x1B[0m`}function q(e){return`\x1B[2m${e}\x1B[0m`}function Ke(e){return`\x1B[31m${e}\x1B[0m`}function kr(e){return`\x1B[33m${e}\x1B[0m`}function Rr(e){return`\x1B[36m${e}\x1B[0m`}function As(){let e={"TypeScript / Validation":["typescript","zod","yup","joi","valibot"],Backend:["go","rust","java","csharp","python","swift","kotlin","php","dart","scala","haskell","elixir","clojure"],Database:["prisma","mysql","postgres","sqlite","snowflake","mongodb","mongoose","sequelize","typeorm","drizzle","dynamodb","bigquery"],"API / Schema":["openapi","graphql","proto","postman","http"],Frontend:["react-props","react-context","redux","pinia","vue-props","svelte-props"],"Data / Markup":["json-schema","csv","sql-insert","toml","yaml","markdown","avro"],Docs:["doc","mock"],Other:["r","solidity","cobol","arduino","godot","django","rails"]};console.log(F(`
TypeMorph \u2014 available formats
`));for(let[t,r]of Object.entries(e))console.log(F(t)),console.log(q("  "+r.join("  "))),console.log();console.log(q(`Usage: typemorph <format> [file.json]  or  cat data.json | typemorph <format>
`))}function Cs(e,t,r){let o=He(Ye(e)),n=He(Ye(t)),i=vr(o,n),s=r?i.filter(f=>f.severity==="error"):i;if(s.length===0){console.log(q("No differences found."));return}console.log(F(`
  Schema diff: ${ee.basename(e)} \u2192 ${ee.basename(t)}
`));for(let f of s){let u=f.severity==="error"?Ke("\u2716"):f.severity==="warning"?kr("\u26A0"):Rr("\uFF0B"),p=f.type==="removed"?Ke("removed"):f.type==="added"?Rr("added"):kr("changed");console.log(`  ${u}  ${F(f.path)}  ${q("["+p+"]")}`),console.log(q(`     ${f.description}`)),f.oldType&&f.newType&&console.log(q(`     ${f.oldType} \u2192 ${f.newType}`)),console.log()}let a=i.filter(f=>f.severity==="error").length,l=i.filter(f=>f.severity==="warning").length,c=i.filter(f=>f.severity==="info").length;console.log(q(`  ${a} breaking  ${l} warnings  ${c} info
`)),a>0&&process.exit(1)}async function Os(e,t,r){let o=t?Ye(t):await $s(),n=He(o),i=jr(n,e,"",{rootName:r});process.stdout.write(i+`
`)}var Ns=`
${F("TypeMorph CLI")}

${F("Usage")}
  typemorph <format> [file.json]        Convert JSON to target format
  typemorph diff <old.json> <new.json>  Compare two JSON schemas
  typemorph list                        Show all available formats

${F("Options")}
  --root, -r <name>        Root type name  (default: Root)
  --breaking-only          diff: show only breaking changes
  --help, -h               Show this help
  --version, -v            Show version

${F("Examples")}
  cat api.json | typemorph zod
  typemorph typescript response.json --root ApiResponse
  typemorph go data.json > models.go
  typemorph diff v1.json v2.json
  typemorph diff v1.json v2.json --breaking-only
  typemorph list
`;async function Es(){let e=process.argv.slice(2);if(e.length===0||e.includes("--help")||e.includes("-h")){console.log(Ns);return}if(e.includes("--version")||e.includes("-v")){console.log("0.1.0");return}let t=e[0];if(t==="list"){As();return}if(t==="diff"){let s=e[1],a=e[2];(!s||!a)&&(console.error("Usage: typemorph diff <old.json> <new.json>"),process.exit(1));let l=e.includes("--breaking-only");Cs(s,a,l);return}let r=t,o=e.findIndex(s=>s==="--root"||s==="-r"),n=o!==-1?e[o+1]:"Root",i=e.slice(1).find(s=>!s.startsWith("-")&&e[o+1]!==s);await Os(r,i,n)}Es().catch(e=>{console.error(Ke("typemorph: "+(e?.message??String(e)))),process.exit(1)});
/*! Bundled license information:

js-yaml/dist/js-yaml.mjs:
  (*! js-yaml 4.1.1 https://github.com/nodeca/js-yaml @license MIT *)
*/
