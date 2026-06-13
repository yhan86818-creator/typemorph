#!/usr/bin/env node
"use strict";var Xr=Object.create;var pn=Object.defineProperty;var Zr=Object.getOwnPropertyDescriptor;var ei=Object.getOwnPropertyNames;var ni=Object.getPrototypeOf,ti=Object.prototype.hasOwnProperty;var ri=(e,n,r,o)=>{if(n&&typeof n=="object"||typeof n=="function")for(let t of ei(n))!ti.call(e,t)&&t!==r&&pn(e,t,{get:()=>n[t],enumerable:!(o=Zr(n,t))||o.enumerable});return e};var Ie=(e,n,r)=>(r=e!=null?Xr(ni(e)):{},ri(n||!e||!e.__esModule?pn(r,"default",{value:e,enumerable:!0}):r,e));var Re=Ie(require("fs")),Wr=Ie(require("path")),Kr=Ie(require("readline"));var ce=e=>e.replace(/(^\w|_\w)/g,n=>n.replace(/_/,"").toUpperCase()),mn=(e,n)=>e?e.kind==="classRef"?e.classRefName===n:e.kind==="array"?mn(e.itemType,n):!1:!1,X=(e,n)=>{if(e.type!=="array"||!e.itemType)return null;let r=e.itemType._sharedTypeName;return r||(n.endsWith("ies")?r=n.slice(0,-3)+"y":n.endsWith("s")?r=n.slice(0,-1):n.endsWith("List")?r=n.slice(0,-4):r=n+"Item"),r.includes("_")?r.split("_").map(o=>ce(o)).join(""):ce(r)},Z=(e,n,r)=>{if(e.type==="union"&&e.unionTypes)return{kind:"union",unionTypes:e.unionTypes};if(e.type==="string")return e.enumValues?{kind:"enum",enumValues:e.enumValues}:e.format==="date"?{kind:"date",format:"date"}:e.format==="datetime"?{kind:"datetime",format:"datetime"}:{kind:"string",format:e.format};if(e.type==="object")return{kind:"classRef",classRefName:e._sharedTypeName??n+"_"+r};if(e.type==="array"&&e.itemType){let i=n+"_"+r;if(e.itemType.type==="object"){let s=e.itemType._sharedTypeName;return s||(i.endsWith("ies")?s=i.slice(0,-3)+"y":i.endsWith("s")?s=i.slice(0,-1):i.endsWith("List")?s=i.slice(0,-4):s=i+"_Item"),{kind:"array",itemType:{kind:"classRef",classRefName:s}}}return{kind:"array",itemType:Z(e.itemType,i,"Item")}}return{kind:{number:"number",boolean:"boolean",any:"any",union:"union"}[e.type]??"any",format:e.format}},ii=(e,n={})=>{let r=e.map(i=>({...i,fields:[...i.fields],annotations:i.annotations?[...i.annotations]:void 0})),o=n.flattenWrappers!==!1;if(n.extractTimestamps!==!1){let i=["createdAt","updatedAt","deletedAt","created_at","updated_at","deleted_at"],s=!1,a=[];for(let l of r){let c=l.fields.filter(f=>i.includes(f.name));if(c.length>=2&&a.length===0){a=c.map(f=>({...f,docComment:"Audit timestamp metadata"}));break}}if(a.length>=2)for(let l of r){if(l.name==="TimestampModel")continue;let c=l.fields.filter(u=>i.includes(u.name)),f=c.length===a.length&&c.every(u=>a.some(p=>p.name===u.name));c.length>=2&&f&&(s||(r.push({name:"TimestampModel",fields:a,isShared:!0,docComment:"Base audit trail timestamp fields"}),s=!0),l.fields=l.fields.filter(u=>!i.includes(u.name)),l.annotations||(l.annotations=[]),l.annotations.push("extends TimestampModel"))}}if(o){let i=!0,s=new Set;for(;i;){i=!1;for(let a=0;a<r.length;a++){let l=r[a];if(l.name!=="Root"&&l.fields.length===1){let c=l.fields[0];if(c.fieldType.kind==="classRef"){let f=c.fieldType.classRefName;if(!f||f===l.name||s.has(f))continue;let u=r.find(p=>p.name===f);if(u){if(l.fields=u.fields.map(m=>({...m,docComment:`[Flattened from ${f}] ${m.docComment??""}`})),u.annotations&&u.annotations.length>0){l.annotations||(l.annotations=[]);for(let m of u.annotations)l.annotations.includes(m)||l.annotations.push(m)}r.some(m=>m!==l&&m.name!==f&&(m.fields.some(d=>mn(d.fieldType,f))||(m.annotations?.includes(`extends ${f}`)??!1)))||(r=r.filter(m=>m.name!==f)),s.add(f),i=!0;break}}}}}}return r},R=(e,n="Root",r={})=>{let o=[],t=new Set,i=new Set,s=(a,l)=>{if(t.has(a))return;if(t.add(a),a.type==="array"&&a.itemType){let u=a.itemType._sharedTypeName;u||(l.endsWith("ies")?u=l.slice(0,-3)+"y":l.endsWith("s")?u=l.slice(0,-1):l.endsWith("List")?u=l.slice(0,-4):u=l+"Item"),s(a.itemType,u);return}if(a.type!=="object"||!a.fields||a._sharedTypeName&&i.has(a._sharedTypeName))return;let c=a._sharedTypeName??l;i.add(c);let f=[];for(let[u,p]of Object.entries(a.fields)){let m=Z(p,c,u);f.push({name:u,fieldType:m,isOptional:!!p.optional,isNullable:!!p.nullable,annotations:[],docComment:""})}o.push({name:c,fields:f,annotations:[],isShared:!!a._sharedTypeName});for(let[u,p]of Object.entries(a.fields)){let m=p._sharedTypeName??c+"_"+u;if(p.type==="object"&&s(p,m),p.type==="array"&&p.itemType?.type==="object"){let d=p.itemType._sharedTypeName;d||(u.endsWith("ies")?d=m.slice(0,-3)+"y":u.endsWith("s")?d=m.slice(0,-1):u.endsWith("List")?d=m.slice(0,-4):d=m+"_Item"),s(p.itemType,d)}}};return s(e,n),oi(ii(o,r))},oi=e=>{let n=new Map,r=new Map,o=new Map;for(let u of e){let p=u.name,m=p.includes("_")?p.split("_").map(d=>ce(d)).join(""):ce(p);if(p==="TimestampModel"&&(m="TimestampModel"),n.has(m)){let d=n.get(m)+1;n.set(m,d);let y=`${m}_v${d}`;r.set(u,y),o.set(p,y)}else n.set(m,1),r.set(u,m),o.set(p,m)}for(let[u,p]of r.entries())u.name=p;let t=u=>{if(u&&(u.kind==="classRef"&&u.classRefName&&o.has(u.classRefName)&&(u.classRefName=o.get(u.classRefName)),u.kind==="array"&&u.itemType&&t(u.itemType),u.kind==="union"&&u.unionTypes))for(let p of u.unionTypes)t(p)};for(let u of e)for(let p of u.fields)t(p.fieldType);let i=[],s=new Set,a=new Set,l=new Map(e.map(u=>[u.name,u])),c=u=>{if(s.has(u.name)||a.has(u.name))return;a.add(u.name);let p=u.annotations?.find(m=>m.startsWith("extends "));if(p){let m=p.slice(8),d=l.get(m);d&&c(d)}a.delete(u.name),s.add(u.name),i.push(u)},f=e.find(u=>u.name==="TimestampModel");f&&c(f);for(let u of e)c(u);return e.length=0,e.push(...i),e};var C=e=>e.replace(/(^\w|_\w)/g,n=>n.replace(/_/,"").toUpperCase()),w=e=>{let n=e.annotations?.find(r=>r.startsWith("extends "));return n?n.slice(8):null},V=e=>{let n=C(e);return n.charAt(0).toLowerCase()+n.slice(1)},si=(e,n)=>{let r=e.itemType?._sharedTypeName;return r?C(r):n.endsWith("ies")?C(n.slice(0,-3)+"y"):n.endsWith("s")?C(n.slice(0,-1)):n.endsWith("List")?C(n.slice(0,-4)):C(n+"Item")},yn=(e,n)=>{let r=new Map,o=C(n),t=(i,s)=>{let a=i.itemType;a?.discriminatorField&&a?.discriminatedVariants&&r.set(si(i,s),{discriminatorField:a.discriminatorField,variants:a.discriminatedVariants})};if(e.type==="array"&&t(e,o),e.type==="object"&&e.fields){for(let[i,s]of Object.entries(e.fields))if(s.type==="array"){let a=s._sharedTypeName?C(s._sharedTypeName):C(o+"_"+i);t(s,a)}}return r},Le=e=>{switch(e.kind){case"union":return e.unionTypes?e.unionTypes.join(" | "):"any";case"enum":return e.enumValues?e.enumValues.map(n=>`"${n}"`).join(" | "):"string";case"date":case"datetime":return"Date";case"classRef":return e.classRefName??"any";case"array":if(e.itemType){let n=Le(e.itemType);return e.itemType.kind==="union"||e.itemType.kind==="enum"?`(${n})[]`:`${n}[]`}return"any[]";default:return e.kind}},gn={generate:(e,n="Root",r={})=>{let o=yn(e,n),t=R(e,n,r),i="";{let s=X(e,n);s&&t.some(a=>a.name===s)&&(i+=`export type ${C(n)} = ${s}[];

`)}for(let s of t){let a=o.get(s.name);if(a){for(let[m,d]of Object.entries(a.variants)){let y=C(m),b=`${s.name}${y}`;i+=`export interface ${b} {
`;for(let[g,h]of Object.entries(d.fields??{}))if(g===a.discriminatorField)i+=`  ${g}: "${m}";
`;else{let T=Z(h,b,g),O=Le(T),v=h.optional?"?":"",L=h.nullable?" | null":"";i+=`  ${g}${v}: ${O}${L};
`}i+=`}

`}let p=Object.keys(a.variants).map(m=>`${s.name}${C(m)}`);i+=`export type ${s.name} = ${p.join(" | ")};

`;continue}let l=w(s),c=l?` extends ${l}`:"",f=r.exportDefault&&s.name==="Root"?`export default interface ${s.name}${c}`:`export interface ${s.name}${c}`;i+=`${f} {
`;let u=r.optionalFields;for(let p of s.fields){let m=u||p.isOptional?"?":"",d=`${s.name}.${p.name}`,y=r.customFieldNames?.[d]??p.name,b=Le(p.fieldType);p.isNullable&&(b=`(${b}) | null`),i+=`  ${y}${m}: ${b};
`}i+=`}

`}return i}},ai=e=>{let n=new Map(e.map(l=>[l.name,l])),r=new Set,o=new Set,t=[],i=new Set,s=l=>l.kind==="classRef"&&l.classRefName?[l.classRefName]:l.kind==="array"&&l.itemType?s(l.itemType):l.kind==="union"&&l.unionTypes?[]:[],a=l=>{if(r.has(l.name)||o.has(l.name))return;o.add(l.name);let c=w(l);if(c){let f=n.get(c);f&&(o.has(c)||a(f))}for(let f of l.fields)for(let u of s(f.fieldType))if(o.has(u))i.add(u);else{let p=n.get(u);p&&a(p)}o.delete(l.name),r.add(l.name),t.push(l)};for(let l of e)a(l);return{sorted:t,cyclicClassRefs:i}},fe=(e,n,r={})=>{switch(e.kind){case"union":{if(!e.unionTypes||e.unionTypes.length===0)return"z.any()";let o=e.unionTypes.map(t=>fe({kind:t},n,r));return o.length===1?o[0]:`z.union([${o.join(", ")}])`}case"enum":return e.enumValues?`z.enum([${e.enumValues.map(o=>`"${o}"`).join(", ")}])`:"z.string()";case"date":return"z.coerce.date()";case"datetime":return"z.string().datetime()";case"classRef":{if(!e.classRefName)return"z.any()";let o=`${V(e.classRefName)}Schema`;return n.has(e.classRefName)?`z.lazy(() => ${o})`:o}case"array":return e.itemType?`z.array(${fe(e.itemType,n,r)})`:"z.array(z.any())";case"string":return e.format==="email"?"z.string().email()":e.format==="url"?"z.string().url()":e.format==="uuid"?"z.string().uuid()":"z.string()";case"number":return"z.number()";case"boolean":return"z.boolean()";default:return"z.any()"}},hn={generate:(e,n="root",r={})=>{let o=yn(e,C(n)),t=R(e,C(n),r),i="",{sorted:s,cyclicClassRefs:a}=ai(t);for(let c of s){let f=o.get(c.name);if(f){let d=[];for(let[b,g]of Object.entries(f.variants)){let h=C(b),T=V(c.name)+h,O=c.name+h;d.push(`${T}Schema`),i+=`export const ${T}Schema = z.object({
`;for(let[v,L]of Object.entries(g.fields??{}))if(v===f.discriminatorField)i+=`  ${v}: z.literal("${b}"),
`;else{let Qr=Z(L,O,v),_e=fe(Qr,a,r);L.nullable&&(_e+=".nullable()"),L.optional&&(_e+=".optional()"),i+=`  ${v}: ${_e},
`}i+=`});
`,i+=`export type ${O} = z.infer<typeof ${T}Schema>;

`}let y=V(c.name);i+=`export const ${y}Schema = z.discriminatedUnion("${f.discriminatorField}", [
`;for(let b of d)i+=`  ${b},
`;i+=`]);
`,i+=`export type ${c.name} = z.infer<typeof ${y}Schema>;

`;continue}let u=V(c.name),p=w(c),m=p?V(p):null;m?i+=`export const ${u}Schema = ${m}Schema.extend({
`:i+=`export const ${u}Schema = z.object({
`;for(let d of c.fields){let y=r.optionalFields||d.isOptional?".optional()":"",b=d.isNullable?".nullable()":"",g=fe(d.fieldType,a,r),h=`${c.name}.${d.name}`,T=r.customFieldNames?.[h]??d.name,O=T.toLowerCase();d.fieldType.kind==="number"&&(["age","price","amount","cost","fee","quantity","count","score","rating","rank"].some(v=>O.includes(v))&&(g=g+".min(0)"),(O.includes("rating")||O.includes("score"))&&(g=g+".max(100)")),d.fieldType.kind==="string"&&!d.fieldType.format&&(O.includes("email")?g="z.string().email()":O.includes("url")||O.includes("link")||O.includes("website")?g="z.string().url()":O.includes("uuid")||O==="id"||O.endsWith("_id")||/Id$/.test(T)||/ID$/.test(T)?g="z.string().uuid()":(O.includes("phone")||O.includes("tel"))&&(g="z.string().regex(/^\\+?[\\d\\s\\-\\.\\(\\)]{7,15}$/)")),i+=`  ${T}: ${g}${b}${y},
`}i+=`});
`,i+=`export type ${c.name} = z.infer<typeof ${u}Schema>;

`}let l=X(e,C(n));if(l&&t.some(c=>c.name===l)){let c=C(n),f=V(c);i+=`export const ${f}Schema = z.array(${V(l)}Schema);
`,i+=`export type ${c} = z.infer<typeof ${f}Schema>;

`}return i}},bn=e=>{switch(e.kind){case"union":return"dynamic";case"enum":return"String";case"date":case"datetime":return"DateTime";case"classRef":return e.classRefName??"dynamic";case"array":return e.itemType?`List<${bn(e.itemType)}>`:"List<dynamic>";case"string":return"String";case"number":return e.format==="int"?"int":"double";case"boolean":return"bool";default:return"dynamic"}},Tn={generate:(e,n="Root",r={})=>{let o=R(e,C(n),r),t="";for(let i of o){let s=w(i),a=s?` extends ${s}`:"";t+=`class ${i.name}${a} {
`;for(let l of i.fields){let c=bn(l.fieldType);t+=`  final ${c} ${l.name};
`}t+=`
  ${i.name}({
`;for(let l of i.fields)t+=`    required this.${l.name},
`;t+=`  });
`,t+=`}

`}return t}},li=e=>{switch(e.kind){case"union":return"mixed";case"enum":return"string";case"date":case"datetime":return"DateTime";case"classRef":return e.classRefName??"mixed";case"array":return"array";case"string":return"string";case"number":return e.format==="int"?"int":"float";case"boolean":return"bool";default:return"mixed"}},Sn={generate:(e,n="Root",r={})=>{let o=R(e,C(n),r),t="";for(let i of o){let s=w(i),a=s?` extends ${s}`:"";t+=`class ${i.name}${a} {
`;for(let l of i.fields){let c=li(l.fieldType);t+=`    public ${c} $${l.name};
`}t+=`}

`}return t}},xn=e=>{switch(e.kind){case"union":return"Any";case"enum":return"str";case"date":case"datetime":return"datetime";case"classRef":return e.classRefName??"Any";case"array":return e.itemType?`List[${xn(e.itemType)}]`:"List[Any]";case"string":return"str";case"number":return e.format==="int"?"int":"float";case"boolean":return"bool";default:return"Any"}},$n={generate:(e,n="Root",r={})=>{let o=R(e,C(n),r),t="";for(let i of o){let s=w(i)??"BaseModel";if(t+=`class ${i.name}(${s}):
`,i.fields.length===0){t+=`    pass

`;continue}for(let a of i.fields){let l=xn(a.fieldType);(a.isOptional||a.isNullable)&&(l=`Optional[${l}] = None`),t+=`    ${a.name}: ${l}
`}t+=`
`}return t}},Me=e=>{switch(e.kind){case"union":return"string";case"enum":return"string";case"date":case"datetime":return"string";case"classRef":return e.classRefName??"string";case"array":return e.itemType?`repeated ${Me(e.itemType)}`:"repeated string";case"string":return"string";case"number":return e.format==="int"?"int32":"double";case"boolean":return"bool";default:return"string"}},An={generate:(e,n="Message",r={})=>{let o=R(e,C(n),r),t="";for(let i of o){t+=`message ${i.name} {
`;let s=1,a=w(i);if(a){let l=o.find(c=>c.name===a);if(l)for(let c of l.fields){let f=Me(c.fieldType);t+=`  ${f} ${c.name} = ${s++};
`}}for(let l of i.fields){let c=Me(l.fieldType);t+=`  ${c} ${l.name} = ${s++};
`}t+=`}

`}return t}},Fe=e=>{switch(e.kind){case"union":return"String";case"enum":return"String";case"date":case"datetime":return"String";case"classRef":return e.classRefName??"String";case"array":return e.itemType?`[${Fe(e.itemType)}]`:"[String]";case"string":return"String";case"number":return e.format==="int"?"Int":"Float";case"boolean":return"Boolean";default:return"String"}},On={generate:(e,n="Type",r={})=>{let o=R(e,C(n),r),t="";for(let i of o){t+=`type ${i.name} {
`;let s=w(i);if(s){let a=o.find(l=>l.name===s);if(a)for(let l of a.fields){let c=Fe(l.fieldType);t+=`  ${l.name}: ${c}
`}}for(let a of i.fields){let l=Fe(a.fieldType);t+=`  ${a.name}: ${l}
`}t+=`}

`}return t}},dn=e=>e.replace(/([A-Z]+)([A-Z][a-z])/g,"$1_$2").replace(/([a-z\d])([A-Z])/g,"$1_$2").toLowerCase(),ci=new Set(["type","struct","enum","match","use","mod","fn","let","pub","impl","trait","for","loop","while","if","else","return","break","continue","as","async","await","const","crate","dyn","extern","false","true","in","move","mut","ref","self","Self","static","super","unsafe","where"]),ui=e=>ci.has(e)?`r#${e}`:e,Cn=e=>{switch(e.kind){case"union":return"serde_json::Value";case"enum":return"String";case"date":case"datetime":return"chrono::DateTime<chrono::Utc>";case"classRef":return e.classRefName??"serde_json::Value";case"array":return e.itemType?`Vec<${Cn(e.itemType)}>`:"Vec<serde_json::Value>";case"string":return"String";case"number":return e.format==="int"?"i64":"f64";case"boolean":return"bool";default:return"serde_json::Value"}},vn={generate:(e,n="Root",r={})=>{let o=R(e,C(n),r),t=`use serde::{Serialize, Deserialize};

`,i=X(e,C(n));i&&o.some(s=>s.name===i)&&(t+=`pub type ${C(n)} = Vec<${i}>;

`);for(let s of o){let a=w(s);if(t+=`#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ${s.name} {
`,a){let l=dn(a);t+=`  #[serde(flatten)]
  pub ${l}: ${a},
`}for(let l of s.fields){let c=Cn(l.fieldType);(l.isOptional||l.isNullable)&&(c=`Option<${c}>`);let f=ui(dn(l.name));f!==l.name&&(t+=`  #[serde(rename = "${l.name}")]
`),t+=`  pub ${f}: ${c},
`}t+=`}

`}return t}},jn=e=>{switch(e.kind){case"union":return"interface{}";case"enum":return"string";case"date":case"datetime":return"time.Time";case"classRef":return e.classRefName??"interface{}";case"array":return e.itemType?`[]${jn(e.itemType)}`:"[]interface{}";case"string":return"string";case"number":return e.format==="int"?"int64":"float64";case"boolean":return"bool";default:return"interface{}"}},kn={generate:(e,n="Root",r={})=>{let o=R(e,C(n),r),i=o.some(a=>a.fields.some(l=>l.fieldType.kind==="date"||l.fieldType.kind==="datetime"))?`package main

import "time"

`:`package main

`,s=X(e,C(n));s&&o.some(a=>a.name===s)&&(i+=`type ${C(n)} []${s}

`);for(let a of o){let l=w(a);i+=`type ${a.name} struct {
`,l&&(i+=`  ${l}
`);for(let c of a.fields){let f=jn(c.fieldType);(c.isNullable||c.isOptional)&&(f=`*${f}`);let u=C(c.name),p=c.isOptional?",omitempty":"";i+=`  ${u} ${f} \`json:"${c.name}${p}"\`
`}i+=`}

`}return i}},De=(e,n)=>{switch(e.kind){case"union":return"Object";case"enum":return"String";case"date":return"LocalDate";case"datetime":return"LocalDateTime";case"classRef":return e.classRefName??"Object";case"array":return e.itemType?`List<${De(e.itemType,!0)}>`:"List<Object>";case"string":return"String";case"number":return e.format==="int"?n?"Integer":"int":n?"Double":"double";case"boolean":return n?"Boolean":"boolean";default:return"Object"}},Nn={generate:(e,n="Root",r={})=>{let o=R(e,C(n),r),t="",i=!1,s=!1,a=!1,l=!1;for(let c of o)for(let f of c.fields)f.fieldType.kind==="array"&&(i=!0),f.fieldType.kind==="date"&&(s=!0),f.fieldType.kind==="datetime"&&(a=!0),f.isOptional&&(l=!0);i&&(t+=`import java.util.List;
`),s&&(t+=`import java.time.LocalDate;
`),a&&(t+=`import java.time.LocalDateTime;
`),l&&(t+=`import javax.annotation.Nullable;
`),t!==""&&(t+=`
`);for(let c of o){let f=w(c),u=f?` extends ${f}`:"";t+=`public class ${c.name}${u} {
`;for(let p of c.fields){let m=p.isOptional||p.isNullable,d=De(p.fieldType,m);p.isOptional&&(t+=`  @Nullable
`);let y="";p.fieldType.kind==="enum"&&p.fieldType.enumValues&&p.fieldType.enumValues.length>0&&(y=` // enum: ${p.fieldType.enumValues.map(b=>`"${b}"`).join(" | ")}`),t+=`  private ${d} ${p.name};${y}
`}c.fields.length>0&&(t+=`
`);for(let p of c.fields){let m=p.isOptional||p.isNullable,d=De(p.fieldType,m),y=p.name.charAt(0).toUpperCase()+p.name.slice(1);t+=`  public ${d} get${y}() { return ${p.name}; }
`,t+=`  public void set${y}(${d} ${p.name}) { this.${p.name} = ${p.name}; }
`}t+=`}

`}return t.trim()+`
`}},ue=e=>{switch(e.kind){case"union":return"String";case"enum":return"String";case"string":return"String";case"number":return e.format==="int"?"Int":"Float";case"boolean":return"Boolean";case"date":case"datetime":return"DateTime";case"classRef":return e.classRefName??"String";case"array":return e.itemType?`${ue(e.itemType)}[]`:"String[]";default:return"String"}},En={generate:(e,n="Root",r={})=>{let o=R(e,C(n),r),t="";for(let i of o){t+=`model ${i.name} {
`,i.fields.some(l=>l.name==="id")||(t+=`  id String @id @default(uuid())
`);let a=w(i);if(a){let l=o.find(c=>c.name===a);if(l)for(let c of l.fields){let f=ue(c.fieldType),u=c.name==="id"?" @id":"";t+=`  ${c.name} ${f}${u}
`}}for(let l of i.fields){let c=ue(l.fieldType),f=l.fieldType.kind==="array",u=l.isOptional&&!f?"?":"",p=`${i.name}.${l.name}`,m=r.customFieldNames?.[p]??l.name,d=m==="id"?" @id":"";if(l.fieldType.kind==="classRef"){let y=l.fieldType.classRefName,b=`${l.name}Id`,h=o.find(O=>O.name===y)?.fields.find(O=>O.name==="id"),T=h?ue(h.fieldType):"String";t+=`  ${m} ${y}${u} @relation(fields: [${m}Id], references: [id])
`,t+=`  ${m}Id ${T}${u}
`}else if(t+=`  ${m} ${c}${u}${d}
`,!f&&m.length>2&&m.endsWith("Id")&&l.fieldType.format==="uuid"){let y=m.slice(0,-2),b=y.charAt(0).toUpperCase()+y.slice(1);if(!i.fields.some(h=>h.name===y)){let h=o.find(v=>v.name===b),T=o.filter(v=>v.name!==i.name&&v.name.endsWith(b)),O=h??(T.length===1?T[0]:null);O&&(t+=`  ${y} ${O.name}? @relation(fields: [${m}], references: [id])
`)}}}t+=`}

`}return t}},Rn={generate:(e,n="Component")=>{let r=e.fields||{},o=Object.keys(r),t=`import React from 'react';

`;return t+=`export const ${n}Card = ({ data }: { data: any }) => (
`,t+=`  <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
`,t+=`    <h3 className="text-lg font-black mb-4 dark:text-white">${n}</h3>
`,t+=`    <div className="grid grid-cols-2 gap-4">
`,o.slice(0,8).forEach(i=>{t+=`      <div>
        <p className="text-[10px] text-slate-400 uppercase">${i}</p>
        <p className="text-sm font-bold dark:text-slate-200">{typeof data?.${i} === 'object' ? JSON.stringify(data?.${i}) : String(data?.${i} ?? '-')}</p>
      </div>
`}),t+=`    </div>
  </div>
);
`,t}},wn={generate:e=>{let n=0,r=(o,t="",i="")=>{if(o.type==="object"&&o.fields){let s={};for(let[a,l]of Object.entries(o.fields))s[a]=r(l,a,t);return s}if(o.type==="array"){let s=o.itemType||{type:"string"},a=n;n=0;let l=Array.from({length:50},(c,f)=>(n=f+1,r(s,t,i)));return n=a,l}if(o.type==="number")return t.toLowerCase().includes("id")||t.toLowerCase().includes("price")||t.toLowerCase().includes("amount")?n>0?n:1:t.toLowerCase().includes("age")?28:42;if(o.type==="boolean")return!0;if(o.type==="string"){if(o.format==="uuid")return`550e8400-e29b-41d4-a716-${String(n||1).padStart(12,"0")}`;if(o.format==="email")return"test@example.com";if(o.format==="url")return"https://example.com/api";if(o.format==="datetime")return new Date().toISOString();let s=t.toLowerCase(),a=i.toLowerCase(),l=a==="items"||a==="products"||a==="entries"||a==="records";if(s.includes("name")){if(l)return`Item ${String.fromCharCode(64+(n||1))}`;let c=["Alice Johnson","Bob Smith","Carol White","David Brown","Emma Davis","Frank Wilson","Grace Lee","Henry Taylor"];return c[((n||1)-1)%c.length]}if(s.includes("email")){let c=["example.com","test.org","demo.io","sample.net"];return`user${n||1}@${c[((n||1)-1)%c.length]}`}if(s.includes("url")||s.includes("link")||s.includes("avatar")||s.includes("image"))return"https://example.com/sample.png";if(s.includes("id"))return`550e8400-e29b-41d4-a716-${String(n||1).padStart(12,"0")}`;if(s.includes("date")||s.includes("time")||s.includes("created")||s.includes("updated"))return new Date().toISOString();if(s.includes("city")){let c=["Tokyo","New York","London","Paris","Sydney","Berlin","Singapore","Toronto"];return c[((n||1)-1)%c.length]}if(s.includes("street")||s.includes("address"))return"123 Main Street";if(s.includes("zip")||s.includes("postal"))return"100-0001";if(s.includes("phone")||s.includes("tel"))return"+81-90-1234-5678";if(s.includes("role")||s.includes("type")||s.includes("status")||s.includes("category")){let c=["admin","user","guest","moderator"];return c[((n||1)-1)%c.length]}return s.includes("desc")||s.includes("memo")||s.includes("text")||s.includes("bio")||s.includes("note")?"This is a sample generated text to simulate a realistic description or content block.":s.includes("title")?"Sample Title":s.includes("price")||s.includes("cost")?(19.99+(n||0)*10).toFixed(2):s.includes("color")?"#3366ff":s.includes("country")?"Japan":s.includes("lang")||s.includes("locale")?"en-US":"sample_"+t}return null};return JSON.stringify(r(e),null,2)}},_n=e=>{switch(e.kind){case"union":return"object";case"enum":return"string";case"date":case"datetime":return"DateTime";case"classRef":return e.classRefName??"object";case"array":return e.itemType?`List<${_n(e.itemType)}>`:"List<object>";case"string":return"string";case"number":return e.format==="int"?"long":"double";case"boolean":return"bool";default:return"object"}},In={generate:(e,n="Root",r={})=>{let o=R(e,C(n),r),t="";for(let i of o){let s=w(i),a=s?` : ${s}`:"";t+=`public class ${i.name}${a}
{
`;for(let l of i.fields){let c=_n(l.fieldType),f=l.isOptional||l.isNullable?"?":"";t+=`    public ${c}${f} ${C(l.name)} { get; set; }
`}t+=`}

`}return t}},Ln=e=>{switch(e.kind){case"union":return"AnyCodable";case"enum":return"String";case"date":case"datetime":return"Date";case"classRef":return e.classRefName??"AnyCodable";case"array":return e.itemType?`[${Ln(e.itemType)}]`:"[AnyCodable]";case"string":return"String";case"number":return e.format==="int"?"Int":"Double";case"boolean":return"Bool";default:return"AnyCodable"}},Mn={generate:(e,n="Root",r={})=>{let o=R(e,C(n),r),t="";for(let i of o){let s=w(i),a=s?`: ${s}`:": Codable";t+=`struct ${i.name} ${a} {
`;for(let l of i.fields){let c=Ln(l.fieldType);(l.isOptional||l.isNullable)&&(c+="?"),t+=`    let ${l.name}: ${c}
`}t+=`}

`}return t}},Fn=e=>{switch(e.kind){case"union":return"Any";case"enum":return"String";case"date":case"datetime":return"String // ISO 8601";case"classRef":return e.classRefName??"Any";case"array":return e.itemType?`List<${Fn(e.itemType)}>`:"List<Any>";case"string":return"String";case"number":return e.format==="int"?"Int":"Double";case"boolean":return"Boolean";default:return"Any"}},Dn={generate:(e,n="Root",r={})=>{let o=R(e,C(n),r),t="";for(let i of o){let s=w(i),a=s?` : ${s}`:"";t+=`data class ${i.name}(
`;let l=i.fields.map(c=>{let f=Fn(c.fieldType);return(c.isOptional||c.isNullable)&&(f+="?"),`    val ${c.name}: ${f}`});t+=l.join(`,
`),t+=`
)${a}

`}return t}},Gn={generate:e=>{let n=r=>{if(r.type==="object"&&r.fields){let t=Object.keys(r.fields).filter(s=>!r.fields[s].optional),i={type:"object",properties:Object.keys(r.fields).reduce((s,a)=>({...s,[a]:n(r.fields[a])}),{})};return t.length>0&&(i.required=t),r.nullable&&(i.nullable=!0),i}if(r.type==="array"){let t={type:"array",items:n(r.itemType)};return r.nullable&&(t.nullable=!0),t}if(r.type==="union"&&r.unionTypes){let t={anyOf:r.unionTypes.map(i=>({type:i}))};return r.nullable&&(t.nullable=!0),t}let o={type:r.type};return r.format&&(o.format=r.format),r.enumValues&&r.enumValues.length>0&&(o.enum=r.enumValues),r.nullable&&(o.nullable=!0),o};return JSON.stringify({$schema:"http://json-schema.org/draft-07/schema#",...n(e)},null,2)}},pe={generate:(e,n="Root")=>{if(e.type==="object"&&e.fields){let r=`# API Field Specifications: ${n}

`;r+=`| Field | Type | Required | Description |
`,r+=`| :--- | :--- | :--- | :--- |
`;for(let[o,t]of Object.entries(e.fields)){let i=t.type==="object"?"Object":t.type==="array"?`${t.itemType?.type||"any"}[]`:t.type;t.type==="union"&&t.unionTypes&&(i=t.unionTypes.join(" \\| ")),t.nullable&&(i+=" (nullable)");let s=t.optional?"No":"Yes",a="No description provided.",l=o.toLowerCase();l==="id"||l.endsWith("id")?a="Unique identifier for the record.":l==="username"?a="User's unique display name.":l==="name"||l==="fullname"?a="Full name of the user or entity.":l==="email"?a="Primary email address.":l==="status"?a="Operational or lifecycle state.":l==="role"?a="User privilege role or system role.":l==="avatarurl"||l==="avatar"?a="Public URL to the user's avatar image.":l==="stats"?a="Statistical metrics and counters.":l==="preferences"?a="User preference flags and custom configurations.":l.startsWith("is")||l.startsWith("has")?a="Boolean flag representing status.":l==="createdat"||l==="created_at"?a="Timestamp representing record creation time.":l==="updatedat"||l==="updated_at"?a="Timestamp representing the last update time.":l==="lastlogin"||l==="last_login"?a="Timestamp of the user's most recent session activity.":t.format==="uuid"?a="Universally Unique Identifier (UUID) format string.":t.format==="email"?a="Validated email format string.":t.format==="url"?a="Fully-qualified web URL (HTTP/HTTPS).":t.format==="datetime"&&(a="ISO 8601 compliant UTC date-time string."),r+=`| \`${o}\` | \`${i}\` | ${s} | ${a} |
`}r+=`
`;for(let[o,t]of Object.entries(e.fields))t.type==="object"&&(r+=`
---

`,r+=pe.generate(t,o.charAt(0).toUpperCase()+o.slice(1))),t.type==="array"&&t.itemType?.type==="object"&&(r+=`
---

`,r+=pe.generate(t.itemType,o.charAt(0).toUpperCase()+o.slice(1)+"Item"));return r}return""}};function nt(e){return typeof e>"u"||e===null}function fi(e){return typeof e=="object"&&e!==null}function pi(e){return Array.isArray(e)?e:nt(e)?[]:[e]}function mi(e,n){var r,o,t,i;if(n)for(i=Object.keys(n),r=0,o=i.length;r<o;r+=1)t=i[r],e[t]=n[t];return e}function di(e,n){var r="",o;for(o=0;o<n;o+=1)r+=e;return r}function yi(e){return e===0&&Number.NEGATIVE_INFINITY===1/e}var gi=nt,hi=fi,bi=pi,Ti=di,Si=yi,xi=mi,k={isNothing:gi,isObject:hi,toArray:bi,repeat:Ti,isNegativeZero:Si,extend:xi};function tt(e,n){var r="",o=e.reason||"(unknown reason)";return e.mark?(e.mark.name&&(r+='in "'+e.mark.name+'" '),r+="("+(e.mark.line+1)+":"+(e.mark.column+1)+")",!n&&e.mark.snippet&&(r+=`

`+e.mark.snippet),o+" "+r):o}function ne(e,n){Error.call(this),this.name="YAMLException",this.reason=e,this.mark=n,this.message=tt(this,!1),Error.captureStackTrace?Error.captureStackTrace(this,this.constructor):this.stack=new Error().stack||""}ne.prototype=Object.create(Error.prototype);ne.prototype.constructor=ne;ne.prototype.toString=function(n){return this.name+": "+tt(this,n)};var _=ne;function Ge(e,n,r,o,t){var i="",s="",a=Math.floor(t/2)-1;return o-n>a&&(i=" ... ",n=o-a+i.length),r-o>a&&(s=" ...",r=o+a-s.length),{str:i+e.slice(n,r).replace(/\t/g,"\u2192")+s,pos:o-n+i.length}}function Pe(e,n){return k.repeat(" ",n-e.length)+e}function $i(e,n){if(n=Object.create(n||null),!e.buffer)return null;n.maxLength||(n.maxLength=79),typeof n.indent!="number"&&(n.indent=1),typeof n.linesBefore!="number"&&(n.linesBefore=3),typeof n.linesAfter!="number"&&(n.linesAfter=2);for(var r=/\r?\n|\r|\0/g,o=[0],t=[],i,s=-1;i=r.exec(e.buffer);)t.push(i.index),o.push(i.index+i[0].length),e.position<=i.index&&s<0&&(s=o.length-2);s<0&&(s=o.length-1);var a="",l,c,f=Math.min(e.line+n.linesAfter,t.length).toString().length,u=n.maxLength-(n.indent+f+3);for(l=1;l<=n.linesBefore&&!(s-l<0);l++)c=Ge(e.buffer,o[s-l],t[s-l],e.position-(o[s]-o[s-l]),u),a=k.repeat(" ",n.indent)+Pe((e.line-l+1).toString(),f)+" | "+c.str+`
`+a;for(c=Ge(e.buffer,o[s],t[s],e.position,u),a+=k.repeat(" ",n.indent)+Pe((e.line+1).toString(),f)+" | "+c.str+`
`,a+=k.repeat("-",n.indent+f+3+c.pos)+`^
`,l=1;l<=n.linesAfter&&!(s+l>=t.length);l++)c=Ge(e.buffer,o[s+l],t[s+l],e.position-(o[s]-o[s+l]),u),a+=k.repeat(" ",n.indent)+Pe((e.line+l+1).toString(),f)+" | "+c.str+`
`;return a.replace(/\n$/,"")}var Ai=$i,Oi=["kind","multi","resolve","construct","instanceOf","predicate","represent","representName","defaultStyle","styleAliases"],Ci=["scalar","sequence","mapping"];function vi(e){var n={};return e!==null&&Object.keys(e).forEach(function(r){e[r].forEach(function(o){n[String(o)]=r})}),n}function ji(e,n){if(n=n||{},Object.keys(n).forEach(function(r){if(Oi.indexOf(r)===-1)throw new _('Unknown option "'+r+'" is met in definition of "'+e+'" YAML type.')}),this.options=n,this.tag=e,this.kind=n.kind||null,this.resolve=n.resolve||function(){return!0},this.construct=n.construct||function(r){return r},this.instanceOf=n.instanceOf||null,this.predicate=n.predicate||null,this.represent=n.represent||null,this.representName=n.representName||null,this.defaultStyle=n.defaultStyle||null,this.multi=n.multi||!1,this.styleAliases=vi(n.styleAliases||null),Ci.indexOf(this.kind)===-1)throw new _('Unknown kind "'+this.kind+'" is specified for "'+e+'" YAML type.')}var N=ji;function Pn(e,n){var r=[];return e[n].forEach(function(o){var t=r.length;r.forEach(function(i,s){i.tag===o.tag&&i.kind===o.kind&&i.multi===o.multi&&(t=s)}),r[t]=o}),r}function ki(){var e={scalar:{},sequence:{},mapping:{},fallback:{},multi:{scalar:[],sequence:[],mapping:[],fallback:[]}},n,r;function o(t){t.multi?(e.multi[t.kind].push(t),e.multi.fallback.push(t)):e[t.kind][t.tag]=e.fallback[t.tag]=t}for(n=0,r=arguments.length;n<r;n+=1)arguments[n].forEach(o);return e}function Ue(e){return this.extend(e)}Ue.prototype.extend=function(n){var r=[],o=[];if(n instanceof N)o.push(n);else if(Array.isArray(n))o=o.concat(n);else if(n&&(Array.isArray(n.implicit)||Array.isArray(n.explicit)))n.implicit&&(r=r.concat(n.implicit)),n.explicit&&(o=o.concat(n.explicit));else throw new _("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");r.forEach(function(i){if(!(i instanceof N))throw new _("Specified list of YAML types (or a single Type object) contains a non-Type object.");if(i.loadKind&&i.loadKind!=="scalar")throw new _("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");if(i.multi)throw new _("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.")}),o.forEach(function(i){if(!(i instanceof N))throw new _("Specified list of YAML types (or a single Type object) contains a non-Type object.")});var t=Object.create(Ue.prototype);return t.implicit=(this.implicit||[]).concat(r),t.explicit=(this.explicit||[]).concat(o),t.compiledImplicit=Pn(t,"implicit"),t.compiledExplicit=Pn(t,"explicit"),t.compiledTypeMap=ki(t.compiledImplicit,t.compiledExplicit),t};var rt=Ue,it=new N("tag:yaml.org,2002:str",{kind:"scalar",construct:function(e){return e!==null?e:""}}),ot=new N("tag:yaml.org,2002:seq",{kind:"sequence",construct:function(e){return e!==null?e:[]}}),st=new N("tag:yaml.org,2002:map",{kind:"mapping",construct:function(e){return e!==null?e:{}}}),at=new rt({explicit:[it,ot,st]});function Ni(e){if(e===null)return!0;var n=e.length;return n===1&&e==="~"||n===4&&(e==="null"||e==="Null"||e==="NULL")}function Ei(){return null}function Ri(e){return e===null}var lt=new N("tag:yaml.org,2002:null",{kind:"scalar",resolve:Ni,construct:Ei,predicate:Ri,represent:{canonical:function(){return"~"},lowercase:function(){return"null"},uppercase:function(){return"NULL"},camelcase:function(){return"Null"},empty:function(){return""}},defaultStyle:"lowercase"});function wi(e){if(e===null)return!1;var n=e.length;return n===4&&(e==="true"||e==="True"||e==="TRUE")||n===5&&(e==="false"||e==="False"||e==="FALSE")}function _i(e){return e==="true"||e==="True"||e==="TRUE"}function Ii(e){return Object.prototype.toString.call(e)==="[object Boolean]"}var ct=new N("tag:yaml.org,2002:bool",{kind:"scalar",resolve:wi,construct:_i,predicate:Ii,represent:{lowercase:function(e){return e?"true":"false"},uppercase:function(e){return e?"TRUE":"FALSE"},camelcase:function(e){return e?"True":"False"}},defaultStyle:"lowercase"});function Li(e){return 48<=e&&e<=57||65<=e&&e<=70||97<=e&&e<=102}function Mi(e){return 48<=e&&e<=55}function Fi(e){return 48<=e&&e<=57}function Di(e){if(e===null)return!1;var n=e.length,r=0,o=!1,t;if(!n)return!1;if(t=e[r],(t==="-"||t==="+")&&(t=e[++r]),t==="0"){if(r+1===n)return!0;if(t=e[++r],t==="b"){for(r++;r<n;r++)if(t=e[r],t!=="_"){if(t!=="0"&&t!=="1")return!1;o=!0}return o&&t!=="_"}if(t==="x"){for(r++;r<n;r++)if(t=e[r],t!=="_"){if(!Li(e.charCodeAt(r)))return!1;o=!0}return o&&t!=="_"}if(t==="o"){for(r++;r<n;r++)if(t=e[r],t!=="_"){if(!Mi(e.charCodeAt(r)))return!1;o=!0}return o&&t!=="_"}}if(t==="_")return!1;for(;r<n;r++)if(t=e[r],t!=="_"){if(!Fi(e.charCodeAt(r)))return!1;o=!0}return!(!o||t==="_")}function Gi(e){var n=e,r=1,o;if(n.indexOf("_")!==-1&&(n=n.replace(/_/g,"")),o=n[0],(o==="-"||o==="+")&&(o==="-"&&(r=-1),n=n.slice(1),o=n[0]),n==="0")return 0;if(o==="0"){if(n[1]==="b")return r*parseInt(n.slice(2),2);if(n[1]==="x")return r*parseInt(n.slice(2),16);if(n[1]==="o")return r*parseInt(n.slice(2),8)}return r*parseInt(n,10)}function Pi(e){return Object.prototype.toString.call(e)==="[object Number]"&&e%1===0&&!k.isNegativeZero(e)}var ut=new N("tag:yaml.org,2002:int",{kind:"scalar",resolve:Di,construct:Gi,predicate:Pi,represent:{binary:function(e){return e>=0?"0b"+e.toString(2):"-0b"+e.toString(2).slice(1)},octal:function(e){return e>=0?"0o"+e.toString(8):"-0o"+e.toString(8).slice(1)},decimal:function(e){return e.toString(10)},hexadecimal:function(e){return e>=0?"0x"+e.toString(16).toUpperCase():"-0x"+e.toString(16).toUpperCase().slice(1)}},defaultStyle:"decimal",styleAliases:{binary:[2,"bin"],octal:[8,"oct"],decimal:[10,"dec"],hexadecimal:[16,"hex"]}}),qi=new RegExp("^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");function Ui(e){return!(e===null||!qi.test(e)||e[e.length-1]==="_")}function Bi(e){var n,r;return n=e.replace(/_/g,"").toLowerCase(),r=n[0]==="-"?-1:1,"+-".indexOf(n[0])>=0&&(n=n.slice(1)),n===".inf"?r===1?Number.POSITIVE_INFINITY:Number.NEGATIVE_INFINITY:n===".nan"?NaN:r*parseFloat(n,10)}var Vi=/^[-+]?[0-9]+e/;function zi(e,n){var r;if(isNaN(e))switch(n){case"lowercase":return".nan";case"uppercase":return".NAN";case"camelcase":return".NaN"}else if(Number.POSITIVE_INFINITY===e)switch(n){case"lowercase":return".inf";case"uppercase":return".INF";case"camelcase":return".Inf"}else if(Number.NEGATIVE_INFINITY===e)switch(n){case"lowercase":return"-.inf";case"uppercase":return"-.INF";case"camelcase":return"-.Inf"}else if(k.isNegativeZero(e))return"-0.0";return r=e.toString(10),Vi.test(r)?r.replace("e",".e"):r}function Yi(e){return Object.prototype.toString.call(e)==="[object Number]"&&(e%1!==0||k.isNegativeZero(e))}var ft=new N("tag:yaml.org,2002:float",{kind:"scalar",resolve:Ui,construct:Bi,predicate:Yi,represent:zi,defaultStyle:"lowercase"}),pt=at.extend({implicit:[lt,ct,ut,ft]}),mt=pt,dt=new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"),yt=new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$");function Hi(e){return e===null?!1:dt.exec(e)!==null||yt.exec(e)!==null}function Wi(e){var n,r,o,t,i,s,a,l=0,c=null,f,u,p;if(n=dt.exec(e),n===null&&(n=yt.exec(e)),n===null)throw new Error("Date resolve error");if(r=+n[1],o=+n[2]-1,t=+n[3],!n[4])return new Date(Date.UTC(r,o,t));if(i=+n[4],s=+n[5],a=+n[6],n[7]){for(l=n[7].slice(0,3);l.length<3;)l+="0";l=+l}return n[9]&&(f=+n[10],u=+(n[11]||0),c=(f*60+u)*6e4,n[9]==="-"&&(c=-c)),p=new Date(Date.UTC(r,o,t,i,s,a,l)),c&&p.setTime(p.getTime()-c),p}function Ki(e){return e.toISOString()}var gt=new N("tag:yaml.org,2002:timestamp",{kind:"scalar",resolve:Hi,construct:Wi,instanceOf:Date,represent:Ki});function Ji(e){return e==="<<"||e===null}var ht=new N("tag:yaml.org,2002:merge",{kind:"scalar",resolve:Ji}),He=`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=
\r`;function Qi(e){if(e===null)return!1;var n,r,o=0,t=e.length,i=He;for(r=0;r<t;r++)if(n=i.indexOf(e.charAt(r)),!(n>64)){if(n<0)return!1;o+=6}return o%8===0}function Xi(e){var n,r,o=e.replace(/[\r\n=]/g,""),t=o.length,i=He,s=0,a=[];for(n=0;n<t;n++)n%4===0&&n&&(a.push(s>>16&255),a.push(s>>8&255),a.push(s&255)),s=s<<6|i.indexOf(o.charAt(n));return r=t%4*6,r===0?(a.push(s>>16&255),a.push(s>>8&255),a.push(s&255)):r===18?(a.push(s>>10&255),a.push(s>>2&255)):r===12&&a.push(s>>4&255),new Uint8Array(a)}function Zi(e){var n="",r=0,o,t,i=e.length,s=He;for(o=0;o<i;o++)o%3===0&&o&&(n+=s[r>>18&63],n+=s[r>>12&63],n+=s[r>>6&63],n+=s[r&63]),r=(r<<8)+e[o];return t=i%3,t===0?(n+=s[r>>18&63],n+=s[r>>12&63],n+=s[r>>6&63],n+=s[r&63]):t===2?(n+=s[r>>10&63],n+=s[r>>4&63],n+=s[r<<2&63],n+=s[64]):t===1&&(n+=s[r>>2&63],n+=s[r<<4&63],n+=s[64],n+=s[64]),n}function eo(e){return Object.prototype.toString.call(e)==="[object Uint8Array]"}var bt=new N("tag:yaml.org,2002:binary",{kind:"scalar",resolve:Qi,construct:Xi,predicate:eo,represent:Zi}),no=Object.prototype.hasOwnProperty,to=Object.prototype.toString;function ro(e){if(e===null)return!0;var n=[],r,o,t,i,s,a=e;for(r=0,o=a.length;r<o;r+=1){if(t=a[r],s=!1,to.call(t)!=="[object Object]")return!1;for(i in t)if(no.call(t,i))if(!s)s=!0;else return!1;if(!s)return!1;if(n.indexOf(i)===-1)n.push(i);else return!1}return!0}function io(e){return e!==null?e:[]}var Tt=new N("tag:yaml.org,2002:omap",{kind:"sequence",resolve:ro,construct:io}),oo=Object.prototype.toString;function so(e){if(e===null)return!0;var n,r,o,t,i,s=e;for(i=new Array(s.length),n=0,r=s.length;n<r;n+=1){if(o=s[n],oo.call(o)!=="[object Object]"||(t=Object.keys(o),t.length!==1))return!1;i[n]=[t[0],o[t[0]]]}return!0}function ao(e){if(e===null)return[];var n,r,o,t,i,s=e;for(i=new Array(s.length),n=0,r=s.length;n<r;n+=1)o=s[n],t=Object.keys(o),i[n]=[t[0],o[t[0]]];return i}var St=new N("tag:yaml.org,2002:pairs",{kind:"sequence",resolve:so,construct:ao}),lo=Object.prototype.hasOwnProperty;function co(e){if(e===null)return!0;var n,r=e;for(n in r)if(lo.call(r,n)&&r[n]!==null)return!1;return!0}function uo(e){return e!==null?e:{}}var xt=new N("tag:yaml.org,2002:set",{kind:"mapping",resolve:co,construct:uo}),We=mt.extend({implicit:[gt,ht],explicit:[bt,Tt,St,xt]}),q=Object.prototype.hasOwnProperty,me=1,$t=2,At=3,de=4,qe=1,fo=2,qn=3,po=/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/,mo=/[\x85\u2028\u2029]/,yo=/[,\[\]\{\}]/,Ot=/^(?:!|!!|![a-z\-]+!)$/i,Ct=/^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;function Un(e){return Object.prototype.toString.call(e)}function M(e){return e===10||e===13}function Y(e){return e===9||e===32}function I(e){return e===9||e===32||e===10||e===13}function W(e){return e===44||e===91||e===93||e===123||e===125}function go(e){var n;return 48<=e&&e<=57?e-48:(n=e|32,97<=n&&n<=102?n-97+10:-1)}function ho(e){return e===120?2:e===117?4:e===85?8:0}function bo(e){return 48<=e&&e<=57?e-48:-1}function Bn(e){return e===48?"\0":e===97?"\x07":e===98?"\b":e===116||e===9?"	":e===110?`
`:e===118?"\v":e===102?"\f":e===114?"\r":e===101?"\x1B":e===32?" ":e===34?'"':e===47?"/":e===92?"\\":e===78?"\x85":e===95?"\xA0":e===76?"\u2028":e===80?"\u2029":""}function To(e){return e<=65535?String.fromCharCode(e):String.fromCharCode((e-65536>>10)+55296,(e-65536&1023)+56320)}function vt(e,n,r){n==="__proto__"?Object.defineProperty(e,n,{configurable:!0,enumerable:!0,writable:!0,value:r}):e[n]=r}var jt=new Array(256),kt=new Array(256);for(z=0;z<256;z++)jt[z]=Bn(z)?1:0,kt[z]=Bn(z);var z;function So(e,n){this.input=e,this.filename=n.filename||null,this.schema=n.schema||We,this.onWarning=n.onWarning||null,this.legacy=n.legacy||!1,this.json=n.json||!1,this.listener=n.listener||null,this.implicitTypes=this.schema.compiledImplicit,this.typeMap=this.schema.compiledTypeMap,this.length=e.length,this.position=0,this.line=0,this.lineStart=0,this.lineIndent=0,this.firstTabInLine=-1,this.documents=[]}function Nt(e,n){var r={name:e.filename,buffer:e.input.slice(0,-1),position:e.position,line:e.line,column:e.position-e.lineStart};return r.snippet=Ai(r),new _(n,r)}function S(e,n){throw Nt(e,n)}function ye(e,n){e.onWarning&&e.onWarning.call(null,Nt(e,n))}var Vn={YAML:function(n,r,o){var t,i,s;n.version!==null&&S(n,"duplication of %YAML directive"),o.length!==1&&S(n,"YAML directive accepts exactly one argument"),t=/^([0-9]+)\.([0-9]+)$/.exec(o[0]),t===null&&S(n,"ill-formed argument of the YAML directive"),i=parseInt(t[1],10),s=parseInt(t[2],10),i!==1&&S(n,"unacceptable YAML version of the document"),n.version=o[0],n.checkLineBreaks=s<2,s!==1&&s!==2&&ye(n,"unsupported YAML version of the document")},TAG:function(n,r,o){var t,i;o.length!==2&&S(n,"TAG directive accepts exactly two arguments"),t=o[0],i=o[1],Ot.test(t)||S(n,"ill-formed tag handle (first argument) of the TAG directive"),q.call(n.tagMap,t)&&S(n,'there is a previously declared suffix for "'+t+'" tag handle'),Ct.test(i)||S(n,"ill-formed tag prefix (second argument) of the TAG directive");try{i=decodeURIComponent(i)}catch{S(n,"tag prefix is malformed: "+i)}n.tagMap[t]=i}};function P(e,n,r,o){var t,i,s,a;if(n<r){if(a=e.input.slice(n,r),o)for(t=0,i=a.length;t<i;t+=1)s=a.charCodeAt(t),s===9||32<=s&&s<=1114111||S(e,"expected valid JSON character");else po.test(a)&&S(e,"the stream contains non-printable characters");e.result+=a}}function zn(e,n,r,o){var t,i,s,a;for(k.isObject(r)||S(e,"cannot merge mappings; the provided source object is unacceptable"),t=Object.keys(r),s=0,a=t.length;s<a;s+=1)i=t[s],q.call(n,i)||(vt(n,i,r[i]),o[i]=!0)}function K(e,n,r,o,t,i,s,a,l){var c,f;if(Array.isArray(t))for(t=Array.prototype.slice.call(t),c=0,f=t.length;c<f;c+=1)Array.isArray(t[c])&&S(e,"nested arrays are not supported inside keys"),typeof t=="object"&&Un(t[c])==="[object Object]"&&(t[c]="[object Object]");if(typeof t=="object"&&Un(t)==="[object Object]"&&(t="[object Object]"),t=String(t),n===null&&(n={}),o==="tag:yaml.org,2002:merge")if(Array.isArray(i))for(c=0,f=i.length;c<f;c+=1)zn(e,n,i[c],r);else zn(e,n,i,r);else!e.json&&!q.call(r,t)&&q.call(n,t)&&(e.line=s||e.line,e.lineStart=a||e.lineStart,e.position=l||e.position,S(e,"duplicated mapping key")),vt(n,t,i),delete r[t];return n}function Ke(e){var n;n=e.input.charCodeAt(e.position),n===10?e.position++:n===13?(e.position++,e.input.charCodeAt(e.position)===10&&e.position++):S(e,"a line break is expected"),e.line+=1,e.lineStart=e.position,e.firstTabInLine=-1}function j(e,n,r){for(var o=0,t=e.input.charCodeAt(e.position);t!==0;){for(;Y(t);)t===9&&e.firstTabInLine===-1&&(e.firstTabInLine=e.position),t=e.input.charCodeAt(++e.position);if(n&&t===35)do t=e.input.charCodeAt(++e.position);while(t!==10&&t!==13&&t!==0);if(M(t))for(Ke(e),t=e.input.charCodeAt(e.position),o++,e.lineIndent=0;t===32;)e.lineIndent++,t=e.input.charCodeAt(++e.position);else break}return r!==-1&&o!==0&&e.lineIndent<r&&ye(e,"deficient indentation"),o}function be(e){var n=e.position,r;return r=e.input.charCodeAt(n),!!((r===45||r===46)&&r===e.input.charCodeAt(n+1)&&r===e.input.charCodeAt(n+2)&&(n+=3,r=e.input.charCodeAt(n),r===0||I(r)))}function Je(e,n){n===1?e.result+=" ":n>1&&(e.result+=k.repeat(`
`,n-1))}function xo(e,n,r){var o,t,i,s,a,l,c,f,u=e.kind,p=e.result,m;if(m=e.input.charCodeAt(e.position),I(m)||W(m)||m===35||m===38||m===42||m===33||m===124||m===62||m===39||m===34||m===37||m===64||m===96||(m===63||m===45)&&(t=e.input.charCodeAt(e.position+1),I(t)||r&&W(t)))return!1;for(e.kind="scalar",e.result="",i=s=e.position,a=!1;m!==0;){if(m===58){if(t=e.input.charCodeAt(e.position+1),I(t)||r&&W(t))break}else if(m===35){if(o=e.input.charCodeAt(e.position-1),I(o))break}else{if(e.position===e.lineStart&&be(e)||r&&W(m))break;if(M(m))if(l=e.line,c=e.lineStart,f=e.lineIndent,j(e,!1,-1),e.lineIndent>=n){a=!0,m=e.input.charCodeAt(e.position);continue}else{e.position=s,e.line=l,e.lineStart=c,e.lineIndent=f;break}}a&&(P(e,i,s,!1),Je(e,e.line-l),i=s=e.position,a=!1),Y(m)||(s=e.position+1),m=e.input.charCodeAt(++e.position)}return P(e,i,s,!1),e.result?!0:(e.kind=u,e.result=p,!1)}function $o(e,n){var r,o,t;if(r=e.input.charCodeAt(e.position),r!==39)return!1;for(e.kind="scalar",e.result="",e.position++,o=t=e.position;(r=e.input.charCodeAt(e.position))!==0;)if(r===39)if(P(e,o,e.position,!0),r=e.input.charCodeAt(++e.position),r===39)o=e.position,e.position++,t=e.position;else return!0;else M(r)?(P(e,o,t,!0),Je(e,j(e,!1,n)),o=t=e.position):e.position===e.lineStart&&be(e)?S(e,"unexpected end of the document within a single quoted scalar"):(e.position++,t=e.position);S(e,"unexpected end of the stream within a single quoted scalar")}function Ao(e,n){var r,o,t,i,s,a;if(a=e.input.charCodeAt(e.position),a!==34)return!1;for(e.kind="scalar",e.result="",e.position++,r=o=e.position;(a=e.input.charCodeAt(e.position))!==0;){if(a===34)return P(e,r,e.position,!0),e.position++,!0;if(a===92){if(P(e,r,e.position,!0),a=e.input.charCodeAt(++e.position),M(a))j(e,!1,n);else if(a<256&&jt[a])e.result+=kt[a],e.position++;else if((s=ho(a))>0){for(t=s,i=0;t>0;t--)a=e.input.charCodeAt(++e.position),(s=go(a))>=0?i=(i<<4)+s:S(e,"expected hexadecimal character");e.result+=To(i),e.position++}else S(e,"unknown escape sequence");r=o=e.position}else M(a)?(P(e,r,o,!0),Je(e,j(e,!1,n)),r=o=e.position):e.position===e.lineStart&&be(e)?S(e,"unexpected end of the document within a double quoted scalar"):(e.position++,o=e.position)}S(e,"unexpected end of the stream within a double quoted scalar")}function Oo(e,n){var r=!0,o,t,i,s=e.tag,a,l=e.anchor,c,f,u,p,m,d=Object.create(null),y,b,g,h;if(h=e.input.charCodeAt(e.position),h===91)f=93,m=!1,a=[];else if(h===123)f=125,m=!0,a={};else return!1;for(e.anchor!==null&&(e.anchorMap[e.anchor]=a),h=e.input.charCodeAt(++e.position);h!==0;){if(j(e,!0,n),h=e.input.charCodeAt(e.position),h===f)return e.position++,e.tag=s,e.anchor=l,e.kind=m?"mapping":"sequence",e.result=a,!0;r?h===44&&S(e,"expected the node content, but found ','"):S(e,"missed comma between flow collection entries"),b=y=g=null,u=p=!1,h===63&&(c=e.input.charCodeAt(e.position+1),I(c)&&(u=p=!0,e.position++,j(e,!0,n))),o=e.line,t=e.lineStart,i=e.position,J(e,n,me,!1,!0),b=e.tag,y=e.result,j(e,!0,n),h=e.input.charCodeAt(e.position),(p||e.line===o)&&h===58&&(u=!0,h=e.input.charCodeAt(++e.position),j(e,!0,n),J(e,n,me,!1,!0),g=e.result),m?K(e,a,d,b,y,g,o,t,i):u?a.push(K(e,null,d,b,y,g,o,t,i)):a.push(y),j(e,!0,n),h=e.input.charCodeAt(e.position),h===44?(r=!0,h=e.input.charCodeAt(++e.position)):r=!1}S(e,"unexpected end of the stream within a flow collection")}function Co(e,n){var r,o,t=qe,i=!1,s=!1,a=n,l=0,c=!1,f,u;if(u=e.input.charCodeAt(e.position),u===124)o=!1;else if(u===62)o=!0;else return!1;for(e.kind="scalar",e.result="";u!==0;)if(u=e.input.charCodeAt(++e.position),u===43||u===45)qe===t?t=u===43?qn:fo:S(e,"repeat of a chomping mode identifier");else if((f=bo(u))>=0)f===0?S(e,"bad explicit indentation width of a block scalar; it cannot be less than one"):s?S(e,"repeat of an indentation width identifier"):(a=n+f-1,s=!0);else break;if(Y(u)){do u=e.input.charCodeAt(++e.position);while(Y(u));if(u===35)do u=e.input.charCodeAt(++e.position);while(!M(u)&&u!==0)}for(;u!==0;){for(Ke(e),e.lineIndent=0,u=e.input.charCodeAt(e.position);(!s||e.lineIndent<a)&&u===32;)e.lineIndent++,u=e.input.charCodeAt(++e.position);if(!s&&e.lineIndent>a&&(a=e.lineIndent),M(u)){l++;continue}if(e.lineIndent<a){t===qn?e.result+=k.repeat(`
`,i?1+l:l):t===qe&&i&&(e.result+=`
`);break}for(o?Y(u)?(c=!0,e.result+=k.repeat(`
`,i?1+l:l)):c?(c=!1,e.result+=k.repeat(`
`,l+1)):l===0?i&&(e.result+=" "):e.result+=k.repeat(`
`,l):e.result+=k.repeat(`
`,i?1+l:l),i=!0,s=!0,l=0,r=e.position;!M(u)&&u!==0;)u=e.input.charCodeAt(++e.position);P(e,r,e.position,!1)}return!0}function Yn(e,n){var r,o=e.tag,t=e.anchor,i=[],s,a=!1,l;if(e.firstTabInLine!==-1)return!1;for(e.anchor!==null&&(e.anchorMap[e.anchor]=i),l=e.input.charCodeAt(e.position);l!==0&&(e.firstTabInLine!==-1&&(e.position=e.firstTabInLine,S(e,"tab characters must not be used in indentation")),!(l!==45||(s=e.input.charCodeAt(e.position+1),!I(s))));){if(a=!0,e.position++,j(e,!0,-1)&&e.lineIndent<=n){i.push(null),l=e.input.charCodeAt(e.position);continue}if(r=e.line,J(e,n,At,!1,!0),i.push(e.result),j(e,!0,-1),l=e.input.charCodeAt(e.position),(e.line===r||e.lineIndent>n)&&l!==0)S(e,"bad indentation of a sequence entry");else if(e.lineIndent<n)break}return a?(e.tag=o,e.anchor=t,e.kind="sequence",e.result=i,!0):!1}function vo(e,n,r){var o,t,i,s,a,l,c=e.tag,f=e.anchor,u={},p=Object.create(null),m=null,d=null,y=null,b=!1,g=!1,h;if(e.firstTabInLine!==-1)return!1;for(e.anchor!==null&&(e.anchorMap[e.anchor]=u),h=e.input.charCodeAt(e.position);h!==0;){if(!b&&e.firstTabInLine!==-1&&(e.position=e.firstTabInLine,S(e,"tab characters must not be used in indentation")),o=e.input.charCodeAt(e.position+1),i=e.line,(h===63||h===58)&&I(o))h===63?(b&&(K(e,u,p,m,d,null,s,a,l),m=d=y=null),g=!0,b=!0,t=!0):b?(b=!1,t=!0):S(e,"incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line"),e.position+=1,h=o;else{if(s=e.line,a=e.lineStart,l=e.position,!J(e,r,$t,!1,!0))break;if(e.line===i){for(h=e.input.charCodeAt(e.position);Y(h);)h=e.input.charCodeAt(++e.position);if(h===58)h=e.input.charCodeAt(++e.position),I(h)||S(e,"a whitespace character is expected after the key-value separator within a block mapping"),b&&(K(e,u,p,m,d,null,s,a,l),m=d=y=null),g=!0,b=!1,t=!1,m=e.tag,d=e.result;else if(g)S(e,"can not read an implicit mapping pair; a colon is missed");else return e.tag=c,e.anchor=f,!0}else if(g)S(e,"can not read a block mapping entry; a multiline key may not be an implicit key");else return e.tag=c,e.anchor=f,!0}if((e.line===i||e.lineIndent>n)&&(b&&(s=e.line,a=e.lineStart,l=e.position),J(e,n,de,!0,t)&&(b?d=e.result:y=e.result),b||(K(e,u,p,m,d,y,s,a,l),m=d=y=null),j(e,!0,-1),h=e.input.charCodeAt(e.position)),(e.line===i||e.lineIndent>n)&&h!==0)S(e,"bad indentation of a mapping entry");else if(e.lineIndent<n)break}return b&&K(e,u,p,m,d,null,s,a,l),g&&(e.tag=c,e.anchor=f,e.kind="mapping",e.result=u),g}function jo(e){var n,r=!1,o=!1,t,i,s;if(s=e.input.charCodeAt(e.position),s!==33)return!1;if(e.tag!==null&&S(e,"duplication of a tag property"),s=e.input.charCodeAt(++e.position),s===60?(r=!0,s=e.input.charCodeAt(++e.position)):s===33?(o=!0,t="!!",s=e.input.charCodeAt(++e.position)):t="!",n=e.position,r){do s=e.input.charCodeAt(++e.position);while(s!==0&&s!==62);e.position<e.length?(i=e.input.slice(n,e.position),s=e.input.charCodeAt(++e.position)):S(e,"unexpected end of the stream within a verbatim tag")}else{for(;s!==0&&!I(s);)s===33&&(o?S(e,"tag suffix cannot contain exclamation marks"):(t=e.input.slice(n-1,e.position+1),Ot.test(t)||S(e,"named tag handle cannot contain such characters"),o=!0,n=e.position+1)),s=e.input.charCodeAt(++e.position);i=e.input.slice(n,e.position),yo.test(i)&&S(e,"tag suffix cannot contain flow indicator characters")}i&&!Ct.test(i)&&S(e,"tag name cannot contain such characters: "+i);try{i=decodeURIComponent(i)}catch{S(e,"tag name is malformed: "+i)}return r?e.tag=i:q.call(e.tagMap,t)?e.tag=e.tagMap[t]+i:t==="!"?e.tag="!"+i:t==="!!"?e.tag="tag:yaml.org,2002:"+i:S(e,'undeclared tag handle "'+t+'"'),!0}function ko(e){var n,r;if(r=e.input.charCodeAt(e.position),r!==38)return!1;for(e.anchor!==null&&S(e,"duplication of an anchor property"),r=e.input.charCodeAt(++e.position),n=e.position;r!==0&&!I(r)&&!W(r);)r=e.input.charCodeAt(++e.position);return e.position===n&&S(e,"name of an anchor node must contain at least one character"),e.anchor=e.input.slice(n,e.position),!0}function No(e){var n,r,o;if(o=e.input.charCodeAt(e.position),o!==42)return!1;for(o=e.input.charCodeAt(++e.position),n=e.position;o!==0&&!I(o)&&!W(o);)o=e.input.charCodeAt(++e.position);return e.position===n&&S(e,"name of an alias node must contain at least one character"),r=e.input.slice(n,e.position),q.call(e.anchorMap,r)||S(e,'unidentified alias "'+r+'"'),e.result=e.anchorMap[r],j(e,!0,-1),!0}function J(e,n,r,o,t){var i,s,a,l=1,c=!1,f=!1,u,p,m,d,y,b;if(e.listener!==null&&e.listener("open",e),e.tag=null,e.anchor=null,e.kind=null,e.result=null,i=s=a=de===r||At===r,o&&j(e,!0,-1)&&(c=!0,e.lineIndent>n?l=1:e.lineIndent===n?l=0:e.lineIndent<n&&(l=-1)),l===1)for(;jo(e)||ko(e);)j(e,!0,-1)?(c=!0,a=i,e.lineIndent>n?l=1:e.lineIndent===n?l=0:e.lineIndent<n&&(l=-1)):a=!1;if(a&&(a=c||t),(l===1||de===r)&&(me===r||$t===r?y=n:y=n+1,b=e.position-e.lineStart,l===1?a&&(Yn(e,b)||vo(e,b,y))||Oo(e,y)?f=!0:(s&&Co(e,y)||$o(e,y)||Ao(e,y)?f=!0:No(e)?(f=!0,(e.tag!==null||e.anchor!==null)&&S(e,"alias node should not have any properties")):xo(e,y,me===r)&&(f=!0,e.tag===null&&(e.tag="?")),e.anchor!==null&&(e.anchorMap[e.anchor]=e.result)):l===0&&(f=a&&Yn(e,b))),e.tag===null)e.anchor!==null&&(e.anchorMap[e.anchor]=e.result);else if(e.tag==="?"){for(e.result!==null&&e.kind!=="scalar"&&S(e,'unacceptable node kind for !<?> tag; it should be "scalar", not "'+e.kind+'"'),u=0,p=e.implicitTypes.length;u<p;u+=1)if(d=e.implicitTypes[u],d.resolve(e.result)){e.result=d.construct(e.result),e.tag=d.tag,e.anchor!==null&&(e.anchorMap[e.anchor]=e.result);break}}else if(e.tag!=="!"){if(q.call(e.typeMap[e.kind||"fallback"],e.tag))d=e.typeMap[e.kind||"fallback"][e.tag];else for(d=null,m=e.typeMap.multi[e.kind||"fallback"],u=0,p=m.length;u<p;u+=1)if(e.tag.slice(0,m[u].tag.length)===m[u].tag){d=m[u];break}d||S(e,"unknown tag !<"+e.tag+">"),e.result!==null&&d.kind!==e.kind&&S(e,"unacceptable node kind for !<"+e.tag+'> tag; it should be "'+d.kind+'", not "'+e.kind+'"'),d.resolve(e.result,e.tag)?(e.result=d.construct(e.result,e.tag),e.anchor!==null&&(e.anchorMap[e.anchor]=e.result)):S(e,"cannot resolve a node with !<"+e.tag+"> explicit tag")}return e.listener!==null&&e.listener("close",e),e.tag!==null||e.anchor!==null||f}function Eo(e){var n=e.position,r,o,t,i=!1,s;for(e.version=null,e.checkLineBreaks=e.legacy,e.tagMap=Object.create(null),e.anchorMap=Object.create(null);(s=e.input.charCodeAt(e.position))!==0&&(j(e,!0,-1),s=e.input.charCodeAt(e.position),!(e.lineIndent>0||s!==37));){for(i=!0,s=e.input.charCodeAt(++e.position),r=e.position;s!==0&&!I(s);)s=e.input.charCodeAt(++e.position);for(o=e.input.slice(r,e.position),t=[],o.length<1&&S(e,"directive name must not be less than one character in length");s!==0;){for(;Y(s);)s=e.input.charCodeAt(++e.position);if(s===35){do s=e.input.charCodeAt(++e.position);while(s!==0&&!M(s));break}if(M(s))break;for(r=e.position;s!==0&&!I(s);)s=e.input.charCodeAt(++e.position);t.push(e.input.slice(r,e.position))}s!==0&&Ke(e),q.call(Vn,o)?Vn[o](e,o,t):ye(e,'unknown document directive "'+o+'"')}if(j(e,!0,-1),e.lineIndent===0&&e.input.charCodeAt(e.position)===45&&e.input.charCodeAt(e.position+1)===45&&e.input.charCodeAt(e.position+2)===45?(e.position+=3,j(e,!0,-1)):i&&S(e,"directives end mark is expected"),J(e,e.lineIndent-1,de,!1,!0),j(e,!0,-1),e.checkLineBreaks&&mo.test(e.input.slice(n,e.position))&&ye(e,"non-ASCII line breaks are interpreted as content"),e.documents.push(e.result),e.position===e.lineStart&&be(e)){e.input.charCodeAt(e.position)===46&&(e.position+=3,j(e,!0,-1));return}if(e.position<e.length-1)S(e,"end of the stream or a document separator is expected");else return}function Et(e,n){e=String(e),n=n||{},e.length!==0&&(e.charCodeAt(e.length-1)!==10&&e.charCodeAt(e.length-1)!==13&&(e+=`
`),e.charCodeAt(0)===65279&&(e=e.slice(1)));var r=new So(e,n),o=e.indexOf("\0");for(o!==-1&&(r.position=o,S(r,"null byte is not allowed in input")),r.input+="\0";r.input.charCodeAt(r.position)===32;)r.lineIndent+=1,r.position+=1;for(;r.position<r.length-1;)Eo(r);return r.documents}function Ro(e,n,r){n!==null&&typeof n=="object"&&typeof r>"u"&&(r=n,n=null);var o=Et(e,r);if(typeof n!="function")return o;for(var t=0,i=o.length;t<i;t+=1)n(o[t])}function wo(e,n){var r=Et(e,n);if(r.length!==0){if(r.length===1)return r[0];throw new _("expected a single document in the stream, but found more")}}var _o=Ro,Io=wo,Rt={loadAll:_o,load:Io},wt=Object.prototype.toString,_t=Object.prototype.hasOwnProperty,Qe=65279,Lo=9,te=10,Mo=13,Fo=32,Do=33,Go=34,Be=35,Po=37,qo=38,Uo=39,Bo=42,It=44,Vo=45,ge=58,zo=61,Yo=62,Ho=63,Wo=64,Lt=91,Mt=93,Ko=96,Ft=123,Jo=124,Dt=125,E={};E[0]="\\0";E[7]="\\a";E[8]="\\b";E[9]="\\t";E[10]="\\n";E[11]="\\v";E[12]="\\f";E[13]="\\r";E[27]="\\e";E[34]='\\"';E[92]="\\\\";E[133]="\\N";E[160]="\\_";E[8232]="\\L";E[8233]="\\P";var Qo=["y","Y","yes","Yes","YES","on","On","ON","n","N","no","No","NO","off","Off","OFF"],Xo=/^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;function Zo(e,n){var r,o,t,i,s,a,l;if(n===null)return{};for(r={},o=Object.keys(n),t=0,i=o.length;t<i;t+=1)s=o[t],a=String(n[s]),s.slice(0,2)==="!!"&&(s="tag:yaml.org,2002:"+s.slice(2)),l=e.compiledTypeMap.fallback[s],l&&_t.call(l.styleAliases,a)&&(a=l.styleAliases[a]),r[s]=a;return r}function es(e){var n,r,o;if(n=e.toString(16).toUpperCase(),e<=255)r="x",o=2;else if(e<=65535)r="u",o=4;else if(e<=4294967295)r="U",o=8;else throw new _("code point within a string may not be greater than 0xFFFFFFFF");return"\\"+r+k.repeat("0",o-n.length)+n}var ns=1,re=2;function ts(e){this.schema=e.schema||We,this.indent=Math.max(1,e.indent||2),this.noArrayIndent=e.noArrayIndent||!1,this.skipInvalid=e.skipInvalid||!1,this.flowLevel=k.isNothing(e.flowLevel)?-1:e.flowLevel,this.styleMap=Zo(this.schema,e.styles||null),this.sortKeys=e.sortKeys||!1,this.lineWidth=e.lineWidth||80,this.noRefs=e.noRefs||!1,this.noCompatMode=e.noCompatMode||!1,this.condenseFlow=e.condenseFlow||!1,this.quotingType=e.quotingType==='"'?re:ns,this.forceQuotes=e.forceQuotes||!1,this.replacer=typeof e.replacer=="function"?e.replacer:null,this.implicitTypes=this.schema.compiledImplicit,this.explicitTypes=this.schema.compiledExplicit,this.tag=null,this.result="",this.duplicates=[],this.usedDuplicates=null}function Hn(e,n){for(var r=k.repeat(" ",n),o=0,t=-1,i="",s,a=e.length;o<a;)t=e.indexOf(`
`,o),t===-1?(s=e.slice(o),o=a):(s=e.slice(o,t+1),o=t+1),s.length&&s!==`
`&&(i+=r),i+=s;return i}function Ve(e,n){return`
`+k.repeat(" ",e.indent*n)}function rs(e,n){var r,o,t;for(r=0,o=e.implicitTypes.length;r<o;r+=1)if(t=e.implicitTypes[r],t.resolve(n))return!0;return!1}function he(e){return e===Fo||e===Lo}function ie(e){return 32<=e&&e<=126||161<=e&&e<=55295&&e!==8232&&e!==8233||57344<=e&&e<=65533&&e!==Qe||65536<=e&&e<=1114111}function Wn(e){return ie(e)&&e!==Qe&&e!==Mo&&e!==te}function Kn(e,n,r){var o=Wn(e),t=o&&!he(e);return(r?o:o&&e!==It&&e!==Lt&&e!==Mt&&e!==Ft&&e!==Dt)&&e!==Be&&!(n===ge&&!t)||Wn(n)&&!he(n)&&e===Be||n===ge&&t}function is(e){return ie(e)&&e!==Qe&&!he(e)&&e!==Vo&&e!==Ho&&e!==ge&&e!==It&&e!==Lt&&e!==Mt&&e!==Ft&&e!==Dt&&e!==Be&&e!==qo&&e!==Bo&&e!==Do&&e!==Jo&&e!==zo&&e!==Yo&&e!==Uo&&e!==Go&&e!==Po&&e!==Wo&&e!==Ko}function os(e){return!he(e)&&e!==ge}function ee(e,n){var r=e.charCodeAt(n),o;return r>=55296&&r<=56319&&n+1<e.length&&(o=e.charCodeAt(n+1),o>=56320&&o<=57343)?(r-55296)*1024+o-56320+65536:r}function Gt(e){var n=/^\n* /;return n.test(e)}var Pt=1,ze=2,qt=3,Ut=4,H=5;function ss(e,n,r,o,t,i,s,a){var l,c=0,f=null,u=!1,p=!1,m=o!==-1,d=-1,y=is(ee(e,0))&&os(ee(e,e.length-1));if(n||s)for(l=0;l<e.length;c>=65536?l+=2:l++){if(c=ee(e,l),!ie(c))return H;y=y&&Kn(c,f,a),f=c}else{for(l=0;l<e.length;c>=65536?l+=2:l++){if(c=ee(e,l),c===te)u=!0,m&&(p=p||l-d-1>o&&e[d+1]!==" ",d=l);else if(!ie(c))return H;y=y&&Kn(c,f,a),f=c}p=p||m&&l-d-1>o&&e[d+1]!==" "}return!u&&!p?y&&!s&&!t(e)?Pt:i===re?H:ze:r>9&&Gt(e)?H:s?i===re?H:ze:p?Ut:qt}function as(e,n,r,o,t){e.dump=(function(){if(n.length===0)return e.quotingType===re?'""':"''";if(!e.noCompatMode&&(Qo.indexOf(n)!==-1||Xo.test(n)))return e.quotingType===re?'"'+n+'"':"'"+n+"'";var i=e.indent*Math.max(1,r),s=e.lineWidth===-1?-1:Math.max(Math.min(e.lineWidth,40),e.lineWidth-i),a=o||e.flowLevel>-1&&r>=e.flowLevel;function l(c){return rs(e,c)}switch(ss(n,a,e.indent,s,l,e.quotingType,e.forceQuotes&&!o,t)){case Pt:return n;case ze:return"'"+n.replace(/'/g,"''")+"'";case qt:return"|"+Jn(n,e.indent)+Qn(Hn(n,i));case Ut:return">"+Jn(n,e.indent)+Qn(Hn(ls(n,s),i));case H:return'"'+cs(n)+'"';default:throw new _("impossible error: invalid scalar style")}})()}function Jn(e,n){var r=Gt(e)?String(n):"",o=e[e.length-1]===`
`,t=o&&(e[e.length-2]===`
`||e===`
`),i=t?"+":o?"":"-";return r+i+`
`}function Qn(e){return e[e.length-1]===`
`?e.slice(0,-1):e}function ls(e,n){for(var r=/(\n+)([^\n]*)/g,o=(function(){var c=e.indexOf(`
`);return c=c!==-1?c:e.length,r.lastIndex=c,Xn(e.slice(0,c),n)})(),t=e[0]===`
`||e[0]===" ",i,s;s=r.exec(e);){var a=s[1],l=s[2];i=l[0]===" ",o+=a+(!t&&!i&&l!==""?`
`:"")+Xn(l,n),t=i}return o}function Xn(e,n){if(e===""||e[0]===" ")return e;for(var r=/ [^ ]/g,o,t=0,i,s=0,a=0,l="";o=r.exec(e);)a=o.index,a-t>n&&(i=s>t?s:a,l+=`
`+e.slice(t,i),t=i+1),s=a;return l+=`
`,e.length-t>n&&s>t?l+=e.slice(t,s)+`
`+e.slice(s+1):l+=e.slice(t),l.slice(1)}function cs(e){for(var n="",r=0,o,t=0;t<e.length;r>=65536?t+=2:t++)r=ee(e,t),o=E[r],!o&&ie(r)?(n+=e[t],r>=65536&&(n+=e[t+1])):n+=o||es(r);return n}function us(e,n,r){var o="",t=e.tag,i,s,a;for(i=0,s=r.length;i<s;i+=1)a=r[i],e.replacer&&(a=e.replacer.call(r,String(i),a)),(G(e,n,a,!1,!1)||typeof a>"u"&&G(e,n,null,!1,!1))&&(o!==""&&(o+=","+(e.condenseFlow?"":" ")),o+=e.dump);e.tag=t,e.dump="["+o+"]"}function Zn(e,n,r,o){var t="",i=e.tag,s,a,l;for(s=0,a=r.length;s<a;s+=1)l=r[s],e.replacer&&(l=e.replacer.call(r,String(s),l)),(G(e,n+1,l,!0,!0,!1,!0)||typeof l>"u"&&G(e,n+1,null,!0,!0,!1,!0))&&((!o||t!=="")&&(t+=Ve(e,n)),e.dump&&te===e.dump.charCodeAt(0)?t+="-":t+="- ",t+=e.dump);e.tag=i,e.dump=t||"[]"}function fs(e,n,r){var o="",t=e.tag,i=Object.keys(r),s,a,l,c,f;for(s=0,a=i.length;s<a;s+=1)f="",o!==""&&(f+=", "),e.condenseFlow&&(f+='"'),l=i[s],c=r[l],e.replacer&&(c=e.replacer.call(r,l,c)),G(e,n,l,!1,!1)&&(e.dump.length>1024&&(f+="? "),f+=e.dump+(e.condenseFlow?'"':"")+":"+(e.condenseFlow?"":" "),G(e,n,c,!1,!1)&&(f+=e.dump,o+=f));e.tag=t,e.dump="{"+o+"}"}function ps(e,n,r,o){var t="",i=e.tag,s=Object.keys(r),a,l,c,f,u,p;if(e.sortKeys===!0)s.sort();else if(typeof e.sortKeys=="function")s.sort(e.sortKeys);else if(e.sortKeys)throw new _("sortKeys must be a boolean or a function");for(a=0,l=s.length;a<l;a+=1)p="",(!o||t!=="")&&(p+=Ve(e,n)),c=s[a],f=r[c],e.replacer&&(f=e.replacer.call(r,c,f)),G(e,n+1,c,!0,!0,!0)&&(u=e.tag!==null&&e.tag!=="?"||e.dump&&e.dump.length>1024,u&&(e.dump&&te===e.dump.charCodeAt(0)?p+="?":p+="? "),p+=e.dump,u&&(p+=Ve(e,n)),G(e,n+1,f,!0,u)&&(e.dump&&te===e.dump.charCodeAt(0)?p+=":":p+=": ",p+=e.dump,t+=p));e.tag=i,e.dump=t||"{}"}function et(e,n,r){var o,t,i,s,a,l;for(t=r?e.explicitTypes:e.implicitTypes,i=0,s=t.length;i<s;i+=1)if(a=t[i],(a.instanceOf||a.predicate)&&(!a.instanceOf||typeof n=="object"&&n instanceof a.instanceOf)&&(!a.predicate||a.predicate(n))){if(r?a.multi&&a.representName?e.tag=a.representName(n):e.tag=a.tag:e.tag="?",a.represent){if(l=e.styleMap[a.tag]||a.defaultStyle,wt.call(a.represent)==="[object Function]")o=a.represent(n,l);else if(_t.call(a.represent,l))o=a.represent[l](n,l);else throw new _("!<"+a.tag+'> tag resolver accepts not "'+l+'" style');e.dump=o}return!0}return!1}function G(e,n,r,o,t,i,s){e.tag=null,e.dump=r,et(e,r,!1)||et(e,r,!0);var a=wt.call(e.dump),l=o,c;o&&(o=e.flowLevel<0||e.flowLevel>n);var f=a==="[object Object]"||a==="[object Array]",u,p;if(f&&(u=e.duplicates.indexOf(r),p=u!==-1),(e.tag!==null&&e.tag!=="?"||p||e.indent!==2&&n>0)&&(t=!1),p&&e.usedDuplicates[u])e.dump="*ref_"+u;else{if(f&&p&&!e.usedDuplicates[u]&&(e.usedDuplicates[u]=!0),a==="[object Object]")o&&Object.keys(e.dump).length!==0?(ps(e,n,e.dump,t),p&&(e.dump="&ref_"+u+e.dump)):(fs(e,n,e.dump),p&&(e.dump="&ref_"+u+" "+e.dump));else if(a==="[object Array]")o&&e.dump.length!==0?(e.noArrayIndent&&!s&&n>0?Zn(e,n-1,e.dump,t):Zn(e,n,e.dump,t),p&&(e.dump="&ref_"+u+e.dump)):(us(e,n,e.dump),p&&(e.dump="&ref_"+u+" "+e.dump));else if(a==="[object String]")e.tag!=="?"&&as(e,e.dump,n,i,l);else{if(a==="[object Undefined]")return!1;if(e.skipInvalid)return!1;throw new _("unacceptable kind of an object to dump "+a)}e.tag!==null&&e.tag!=="?"&&(c=encodeURI(e.tag[0]==="!"?e.tag.slice(1):e.tag).replace(/!/g,"%21"),e.tag[0]==="!"?c="!"+c:c.slice(0,18)==="tag:yaml.org,2002:"?c="!!"+c.slice(18):c="!<"+c+">",e.dump=c+" "+e.dump)}return!0}function ms(e,n){var r=[],o=[],t,i;for(Ye(e,r,o),t=0,i=o.length;t<i;t+=1)n.duplicates.push(r[o[t]]);n.usedDuplicates=new Array(i)}function Ye(e,n,r){var o,t,i;if(e!==null&&typeof e=="object")if(t=n.indexOf(e),t!==-1)r.indexOf(t)===-1&&r.push(t);else if(n.push(e),Array.isArray(e))for(t=0,i=e.length;t<i;t+=1)Ye(e[t],n,r);else for(o=Object.keys(e),t=0,i=o.length;t<i;t+=1)Ye(e[o[t]],n,r)}function ds(e,n){n=n||{};var r=new ts(n);r.noRefs||ms(e,r);var o=e;return r.replacer&&(o=r.replacer.call({"":o},"",o)),G(r,0,o,!0,!0)?r.dump+`
`:""}var ys=ds,gs={dump:ys};function Xe(e,n){return function(){throw new Error("Function yaml."+e+" is removed in js-yaml 4. Use yaml."+n+" instead, which is now safe by default.")}}var hs=N,bs=rt,Ts=at,Ss=pt,xs=mt,$s=We,As=Rt.load,Os=Rt.loadAll,Cs=gs.dump,vs=_,js={binary:bt,float:ft,map:st,null:lt,pairs:St,set:xt,timestamp:gt,bool:ct,int:ut,merge:ht,omap:Tt,seq:ot,str:it},ks=Xe("safeLoad","load"),Ns=Xe("safeLoadAll","loadAll"),Es=Xe("safeDump","dump"),oe={Type:hs,Schema:bs,FAILSAFE_SCHEMA:Ts,JSON_SCHEMA:Ss,CORE_SCHEMA:xs,DEFAULT_SCHEMA:$s,load:As,loadAll:Os,dump:Cs,YAMLException:vs,types:js,safeLoad:ks,safeLoadAll:Ns,safeDump:Es};var A=e=>e.replace(/(^\w|[_\s-]\w)/g,n=>n.replace(/[_\s-]/,"").toUpperCase()),x=e=>e.replace(/([A-Z])/g,"_$1").toLowerCase().replace(/^_/,""),Q=e=>x(e).toUpperCase(),$=e=>e.type==="array"&&e.itemType?e.itemType.fields??{}:e.fields??{},ae=e=>e.type==="array"&&e.itemType?e.itemType:e,nn=(e,n="postgres")=>{if(e.type==="number"){let r=e.format==="int";return n==="sqlite"?r?"INTEGER":"REAL":n==="mysql"?r?"BIGINT":"DOUBLE":r?"BIGINT":"DOUBLE PRECISION"}return e.type==="boolean"?n==="mysql"?"TINYINT(1)":"BOOLEAN":e.type==="object"||e.type==="array"||e.type==="union"?n==="postgres"?"JSONB":"JSON":e.format==="uuid"?n==="mysql"?"CHAR(36)":"UUID":e.format==="email"?"VARCHAR(255)":e.format==="url"?"TEXT":e.format==="datetime"?"TIMESTAMP":"VARCHAR(255)"},Vt={generate:e=>{let n=$(e);if(!Object.keys(n).length)return"";let r=Object.keys(n).join(","),o=Object.entries(n).map(([,t])=>t.type==="number"?"0":t.type==="boolean"?"true":t.format==="uuid"?"uuid-xxxx-xxxx":t.format==="email"?"user@example.com":t.format==="url"?"https://example.com":t.format==="datetime"?new Date().toISOString():t.type==="object"&&t.fields?`"${JSON.stringify(Object.fromEntries(Object.entries(t.fields).map(([i,s])=>[i,s.type==="number"?0:s.type==="boolean"?!1:"sample"]))).replace(/"/g,'""')}"`:t.type==="array"?'"[]"':'"sample_value"').join(",");return`${r}
${o}
`}},zt={generate:(e,n="table_name")=>{let r=$(e);if(!Object.keys(r).length)return"";let o=Object.keys(r).map(i=>`"${i}"`).join(", "),t=Object.entries(r).map(([,i])=>{if(i.type==="number")return"0";if(i.type==="boolean")return"TRUE";if(i.format==="uuid")return"'uuid-xxxx-xxxx'";if(i.format==="email")return"'user@example.com'";if(i.format==="datetime")return`'${new Date().toISOString()}'`;if(i.type==="object"&&i.fields){let s=Object.fromEntries(Object.entries(i.fields).map(([a,l])=>[a,l.type==="number"?0:l.type==="boolean"?!1:"sample"]));return`'${JSON.stringify(s).replace(/'/g,"''")}'`}return i.type==="array"?"'[]'":"'sample_value'"}).join(", ");return`INSERT INTO "${x(n)}" (${o})
VALUES (${t});
`}},Yt={generate:(e,n="Root")=>{let r=$(e);if(!Object.keys(r).length)return"";let o="id"in r,t="created_at"in r||"createdAt"in r,i="updated_at"in r||"updatedAt"in r,s=`CREATE TABLE \`${x(n)}\` (
`;o||(s+="  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,\n");for(let[a,l]of Object.entries(r)){let c=l.optional?" NULL":" NOT NULL",f=a.toLowerCase()==="id",u=f?" AUTO_INCREMENT":"",p=f?" PRIMARY KEY":"";s+=`  \`${x(a)}\` ${nn(l,"mysql")}${c}${u}${p},
`}return t||(s+="  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n"),i?s=s.replace(/,\s*$/,`
`):s+="  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP\n",s+=`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`,s}},Ht={generate:(e,n="Root")=>{let r=$(e);if(!Object.keys(r).length)return"";let o="id"in r,t="created_at"in r||"createdAt"in r,i="updated_at"in r||"updatedAt"in r,a=`CREATE TABLE "${x(n)}" (
`;o||(a+=`  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
`);for(let[l,c]of Object.entries(r)){let f=c.optional?"":" NOT NULL",p=l.toLowerCase()==="id"?" PRIMARY KEY":"";a+=`  "${x(l)}" ${nn(c,"postgres")}${f}${p},
`}return t||(a+=`  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
`),i?a=a.replace(/,\s*$/,`
`):a+=`  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
`,a+=`);
`,a}},Wt={generate:(e,n="Root")=>{let r=$(e);if(!Object.keys(r).length)return"";let o="id"in r,t="created_at"in r||"createdAt"in r,i="updated_at"in r||"updatedAt"in r,s=`CREATE TABLE IF NOT EXISTS "${x(n)}" (
`;o||(s+=`  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
`);for(let[a,l]of Object.entries(r)){let c=l.optional?"":" NOT NULL",u=a.toLowerCase()==="id"?" PRIMARY KEY":"";s+=`  "${x(a)}" ${nn(l,"sqlite")}${c}${u},
`}return t||(s+=`  "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
`),i?s=s.replace(/,\s*$/,`
`):s+=`  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
`,s+=`);
`,s}},Kt={generate:(e,n="Root")=>{let r=$(e);if(!Object.keys(r).length)return"";let o=`CREATE OR REPLACE TABLE ${Q(n)} (
`;o+=`  ID VARCHAR(36) NOT NULL DEFAULT UUID_STRING(),
`;for(let[t,i]of Object.entries(r)){let s=Q(t),a="VARCHAR";i.type==="number"?a="DOUBLE":i.type==="boolean"?a="BOOLEAN":i.type==="object"||i.type==="array"?a="VARIANT":i.format==="datetime"&&(a="TIMESTAMP_NTZ"),o+=`  ${s} ${a}${i.optional?"":" NOT NULL"},
`}return o+=`  CREATED_AT TIMESTAMP_NTZ NOT NULL DEFAULT CURRENT_TIMESTAMP()
`,o+=`);
`,o}},Jt={generate:(e,n="config")=>{let r=$(e);if(!Object.keys(r).length)return"";let o=`[${x(n)}]
`;for(let[t,i]of Object.entries(r))if(i.type==="object"&&i.fields){o+=`
[${x(n)}.${x(t)}]
`;for(let[s,a]of Object.entries(i.fields))o+=`${x(s)} = ${Bt(a)}
`}else if(i.type==="array"){let s=i.itemType?.type,a=s==="number"?"0":s==="boolean"?"false":'"sample_value"';o+=`${x(t)} = [${a}]
`}else o+=`${x(t)} = ${Bt(i)}
`;return o}},Bt=e=>e.type==="number"?"0":e.type==="boolean"?"false":e.format==="datetime"?'"2024-01-01T00:00:00Z"':'"sample_value"',Qt={generate:e=>{let n=r=>r.type==="object"&&r.fields?Object.fromEntries(Object.entries(r.fields).map(([o,t])=>[o,n(t)])):r.type==="array"?[n(r.itemType??{type:"string"})]:r.type==="number"?0:r.type==="boolean"?!1:r.format==="uuid"?"uuid-xxxx-xxxx":r.format==="email"?"user@example.com":r.format==="url"?"https://example.com":r.format==="datetime"?"2024-01-01T00:00:00Z":"sample_value";return oe.dump(n(e),{indent:2})}},Xt={generate:e=>{let n=$(e);if(!Object.keys(n).length)return"";let r=(t,i)=>{let s="";for(let[a,l]of Object.entries(t)){let c=Q(i?`${i}_${a}`:a);if(l.type==="object"&&l.fields)s+=r(l.fields,i?`${i}_${a}`:a);else if(l.type==="array")s+=`${c}=
`;else{let f="your_value_here";l.type==="number"?f="0":l.type==="boolean"?f="false":l.format==="uuid"?f="uuid-xxxx-xxxx-xxxx-xxxxxxxxxxxx":l.format==="email"?f="user@example.com":l.format==="url"?f="https://example.com":l.format==="datetime"&&(f="2024-01-01T00:00:00Z"),s+=`${c}=${f}
`}}return s},o=`# Generated by TypeMorph
`;return o+=r(n,""),o}},Zt={generate:e=>{let n=$(e);if(!Object.keys(n).length)return"";let r=(t,i)=>{let s="";for(let[a,l]of Object.entries(t)){let c=(i?`${i}.${x(a)}`:x(a)).replace(/_/g,".");if(l.type==="object"&&l.fields)s+=r(l.fields,c);else if(l.type==="array")s+=`${c}=
`;else{let f="sample_value";l.type==="number"?f="0":l.type==="boolean"?f="false":l.format==="datetime"&&(f="2024-01-01T00:00:00Z"),s+=`${c}=${f}
`}}return s},o=`# Generated by TypeMorph
`;return o+=r(n,""),o}},er={generate:e=>{let n=$(e);if(!Object.keys(n).length)return"";let r=Object.keys(n),o=`| ${r.join(" | ")} |`,t=`| ${r.map(()=>"---").join(" | ")} |`,i=`| ${Object.entries(n).map(([,s])=>s.type==="number"?"0":s.type==="boolean"?"true":s.format==="email"?"user@example.com":s.type==="object"&&s.fields?"`"+JSON.stringify(Object.fromEntries(Object.entries(s.fields).map(([a,l])=>[a,l.type==="number"?0:l.type==="boolean"?!1:"sample"])))+"`":s.type==="array"?"`[]`":"sample").join(" | ")} |`;return`${o}
${t}
${i}
`}},nr={generate:e=>{let n=$(e);if(!Object.keys(n).length)return"";let r=Object.keys(n),o=`[cols="${r.map(()=>"1").join(",")}",options="header"]
|===
`;return o+=`| ${r.join(" | ")}
`,o+=`| ${Object.entries(n).map(([,t])=>t.type==="number"?"0":"sample").join(" | ")}
`,o+=`|===
`,o}},tr={generate:e=>{let n=$(e);if(!Object.keys(n).length)return"";let r=Object.keys(n),o=`\\begin{tabular}{${r.map(()=>"l").join("|")}}
`;return o+=`\\hline
`,o+=r.join(" & ")+` \\\\
\\hline
`,o+=Object.entries(n).map(([,t])=>t.type==="number"?"0":t.type==="boolean"?"false":t.type==="object"?"\\{...\\}":t.type==="array"?"[...]":t.format==="email"?"user@example.com":t.format==="datetime"?"2024-01-01T00:00:00Z":"sample\\_value").join(" & ")+` \\\\
`,o+=`\\hline
\\end{tabular}
`,o}},rr={generate:(e,n="Root")=>{let r=$(e);if(!Object.keys(r).length)return"";let o=`erDiagram
`;o+=`  ${A(n)} {
`;for(let[t,i]of Object.entries(r)){let s="string";i.type==="number"?s="float":i.type==="boolean"?s="boolean":i.type==="object"?s="object":i.type==="array"&&(s="array"),o+=`    ${s} ${t}
`}o+=`  }
`;for(let[t,i]of Object.entries(r)){if(i.type==="object"&&i.fields){let s=A(t);o+=`  ${s} {
`;for(let[a,l]of Object.entries(i.fields)){let c="string";l.type==="number"?c="float":l.type==="boolean"&&(c="boolean"),o+=`    ${c} ${a}
`}o+=`  }
`,o+=`  ${A(n)} ||--o{ ${s} : "has"
`}if(i.type==="array"&&i.itemType?.type==="object"&&i.itemType.fields){let s=A(t)+"Item";o+=`  ${s} {
`;for(let[a,l]of Object.entries(i.itemType.fields))o+=`    ${l.type==="number"?"float":"string"} ${a}
`;o+=`  }
`,o+=`  ${A(n)} ||--o{ ${s} : "contains"
`}}return o}},se=e=>e.type==="number"?"double":e.type==="boolean"?"boolean":e.type==="object"&&e.fields?{type:"record",name:"NestedRecord",fields:Object.entries(e.fields).map(([n,r])=>({name:n,type:r.optional?["null",se(r)]:se(r)}))}:e.type==="array"?{type:"array",items:se(e.itemType??{type:"string"})}:e.type==="union"&&e.unionTypes?e.unionTypes.map(n=>n==="number"?"double":n):"string",ir={generate:(e,n="Root")=>{let r=$(e);if(!Object.keys(r).length)return"";let o={type:"record",name:A(n),namespace:"com.example",fields:Object.entries(r).map(([t,i])=>({name:t,type:i.optional?["null",se(i)]:se(i),default:i.optional?null:void 0}))};return JSON.stringify(o,null,2)}},Te=(e,n)=>{let r=n.optional?"NULLABLE":"REQUIRED";if(n.type==="number")return{name:e,type:"FLOAT64",mode:r};if(n.type==="boolean")return{name:e,type:"BOOL",mode:r};if(n.format==="datetime")return{name:e,type:"TIMESTAMP",mode:r};if(n.type==="object"&&n.fields)return{name:e,type:"RECORD",mode:r,fields:Object.entries(n.fields).map(([o,t])=>Te(o,t))};if(n.type==="array"){let o=n.itemType??{type:"string"};return o.type==="object"&&o.fields?{name:e,type:"RECORD",mode:"REPEATED",fields:Object.entries(o.fields).map(([t,i])=>Te(t,i))}:{name:e,type:Te("_item",o).type,mode:"REPEATED"}}return{name:e,type:"STRING",mode:r}},or={generate:e=>{let n=$(e);if(!Object.keys(n).length)return"";let r=Object.entries(n).map(([o,t])=>Te(o,t));return JSON.stringify(r,null,2)}},Ze=e=>{if(e.type==="number")return{N:"0"};if(e.type==="boolean")return{BOOL:!1};if(e.type==="array"){let n=e.itemType??{type:"string"};return{L:[Ze(n)]}}return e.type==="object"&&e.fields?{M:Object.fromEntries(Object.entries(e.fields).map(([n,r])=>[n,Ze(r)]))}:e.type==="object"?{M:{}}:e.format==="datetime"?{S:"2024-01-01T00:00:00Z"}:e.format==="uuid"?{S:"uuid-xxxx-xxxx"}:e.format==="email"?{S:"user@example.com"}:e.format==="url"?{S:"https://example.com"}:{S:"sample_value"}},sr={generate:(e,n="Root")=>{let r=$(e);if(!Object.keys(r).length)return"";let o={TableName:x(n)+"s",Item:{id:{S:"uuid-xxxx-xxxx"},...Object.fromEntries(Object.entries(r).map(([t,i])=>[t,Ze(i)]))}};return JSON.stringify(o,null,2)}},en=e=>{if(e.type==="union"&&e.unionTypes){let r={anyOf:e.unionTypes.map(o=>({type:o}))};return e.nullable&&(r.nullable=!0),r}if(e.type==="number"){let r={type:"number",format:"double"};return e.enumValues&&e.enumValues.length&&(r.enum=e.enumValues),e.nullable&&(r.nullable=!0),r}if(e.type==="boolean")return e.nullable?{type:"boolean",nullable:!0}:{type:"boolean"};if(e.type==="array"){let r={type:"array",items:en(e.itemType??{type:"string"})};return e.nullable&&(r.nullable=!0),r}if(e.type==="object"&&e.fields){let r={type:"object",properties:Object.fromEntries(Object.entries(e.fields).map(([o,t])=>[o,en(t)]))};return e.nullable&&(r.nullable=!0),r}let n={type:"string"};return e.format==="uuid"?n.format="uuid":e.format==="email"?n.format="email":e.format==="url"?n.format="uri":e.format==="datetime"&&(n.type="string",n.format="date-time"),e.enumValues&&e.enumValues.length&&(n.enum=e.enumValues),e.nullable&&(n.nullable=!0),n},ar={generate:(e,n="Root")=>{let r=$(e),o=A(n),t=Object.entries(r).filter(([,s])=>!s.optional).map(([s])=>s),i={openapi:"3.0.3",info:{title:`${o} API`,version:"1.0.0"},paths:{[`/${x(n)}s`]:{get:{summary:`List ${o}s`,responses:{200:{description:"Success",content:{"application/json":{schema:{type:"array",items:{$ref:`#/components/schemas/${o}`}}}}}}},post:{summary:`Create ${o}`,requestBody:{required:!0,content:{"application/json":{schema:{$ref:`#/components/schemas/${o}`}}}},responses:{201:{description:"Created"}}}}},components:{schemas:{[o]:{type:"object",...t.length?{required:t}:{},properties:Object.fromEntries(Object.entries(r).map(([s,a])=>[s,en(a)]))}}}};return oe.dump(i,{indent:2})}},lr={generate:(e,n="Root")=>{let r=A(n),o=`https://api.example.com/${x(n)}s`,t={info:{name:`${r} API`,schema:"https://schema.getpostman.com/json/collection/v2.1.0/"},item:[{name:`GET all ${r}s`,request:{method:"GET",url:{raw:o}}},{name:`POST create ${r}`,request:{method:"POST",url:{raw:o},header:[{key:"Content-Type",value:"application/json"}],body:{mode:"raw",raw:"{}"}}},{name:`GET ${r} by ID`,request:{method:"GET",url:{raw:`${o}/:id`}}},{name:`PUT update ${r}`,request:{method:"PUT",url:{raw:`${o}/:id`}}},{name:`DELETE ${r}`,request:{method:"DELETE",url:{raw:`${o}/:id`}}}]};return JSON.stringify(t,null,2)}},cr={generate:(e,n="Root")=>{let r=`https://api.example.com/${x(n)}s`,o=$(e),t=JSON.stringify(Object.fromEntries(Object.entries(o).map(([i,s])=>[i,s.type==="number"?0:s.type==="boolean"?!1:"sample"])),null,2);return[`### Get all ${n}s`,`GET ${r}`,"Accept: application/json","","###","",`### Create ${n}`,`POST ${r}`,"Content-Type: application/json","",t,"","###","",`### Get ${n} by ID`,`GET ${r}/{{id}}`,"","###"].join(`
`)}},ur={generate:(e,n="Root")=>{let r=$(e),o=Object.keys(r),t=1,i=["{",...o.map(a=>{let l=r[a],c=l.type==="number"?"0":l.type==="boolean"?"false":`\${${t++}:${a}}`;return`  "${a}": ${l.type==="string"||l.format?`"${c}"`:c},`}),"}"],s={[`${A(n)} Scaffold`]:{prefix:`${n.toLowerCase()}-scaffold`,body:i,description:`Generated by TypeMorph: ${A(n)} scaffold`}};return JSON.stringify(s,null,2)}},fr={generate:(e,n="Root")=>{let r=$(e),o=i=>i.type==="number"?0:i.type==="boolean"?!1:i.type==="object"&&i.fields?Object.fromEntries(Object.entries(i.fields).map(([s,a])=>[s,o(a)])):i.type==="array"?i.itemType?[o(i.itemType)]:[]:i.format==="uuid"?"uuid-xxxx-xxxx":i.format==="email"?"user@example.com":i.format==="url"?"https://example.com":i.format==="datetime"?"2024-01-01T00:00:00Z":"sample",t=JSON.stringify(Object.fromEntries(Object.entries(r).map(([i,s])=>[i,o(s)])),null,2);return`curl -X POST https://api.example.com/${x(n)}s \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -d '${t}'
`}},pr={generate:(e,n="Root")=>{e=ae(e);let r=A(n),o=`${r}Schema`,t=(i,s="  ")=>{let a=$(i),l=`{
`;for(let[c,f]of Object.entries(a))if(l+=`${s}  ${c}: `,f.type==="object")l+=t(f,s+"  ")+`,
`;else if(f.type==="array"){let u=f.itemType;if(u?.type==="object")l+=`[${t(u,s+"  ")}],
`;else{let p="String";u?.type==="number"?p="Number":u?.type==="boolean"?p="Boolean":u?.type==="union"||u?.type==="any"?p="Schema.Types.Mixed":u?.enumValues&&u.enumValues.length&&(p="String"),l+=`[${p}],
`}}else{let u="String";f.type==="number"?u="Number":f.type==="boolean"?u="Boolean":f.type==="union"&&(u="Schema.Types.Mixed");let p=`type: ${u}`;f.optional||(p+=", required: true"),f.enumValues&&f.enumValues.length&&(p+=`, enum: [${f.enumValues.map(m=>`"${m}"`).join(", ")}]`),l+=`{ ${p} },
`}return l+=`${s}}`,l};if(e.type==="object"){let i=`import mongoose, { Schema, Document } from 'mongoose';

`;return i+=`const ${o} = new Schema(${t(e)}, { timestamps: true });

`,i+=`export interface I${r} extends Document {}
`,i+=`export const ${r} = mongoose.models.${r} || mongoose.model<I${r}>('${r}', ${o});
`,i}return""}},mr={generate:(e,n="Root")=>{let r=$(e);if(!Object.keys(r).length)return"";let o=A(n),t=`import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

`;t+=`export class ${o} extends Model {}

`,t+=`${o}.init({
`,t+=`  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
`;for(let[i,s]of Object.entries(r)){let a="DataTypes.STRING";s.type==="number"?a="DataTypes.DOUBLE":s.type==="boolean"?a="DataTypes.BOOLEAN":s.type==="object"||s.type==="array"||s.type==="union"?a="DataTypes.JSON":s.format==="datetime"&&(a="DataTypes.DATE"),s.enumValues&&s.enumValues.length&&(a=`DataTypes.ENUM(${s.enumValues.map(l=>`'${l}'`).join(", ")})`),t+=`  ${i}: {
    type: ${a},
    allowNull: ${!!s.optional||!!s.nullable}
  },
`}return t+=`}, {
  sequelize,
  modelName: '${o}',
  tableName: '${x(n)}s',
  timestamps: true
});
`,t}},dr={generate:(e,n="Root")=>{let r=$(e);if(!Object.keys(r).length)return"";let o=A(n),t=`import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

`;t+=`@Entity('${x(n)}s')
`,t+=`export class ${o} {
`,r.id||(t+=`  @PrimaryGeneratedColumn('uuid')
  id!: string;

`);for(let[i,s]of Object.entries(r)){let a="string",l="@Column()";if(s.type==="number"?(a="number",l="@Column('double')"):s.type==="boolean"?(a="boolean",l="@Column('boolean')"):s.type==="object"||s.type==="array"||s.type==="union"?(a="any",l="@Column('jsonb')"):s.format==="datetime"&&(a="Date",l="@Column('timestamp')"),s.enumValues&&s.enumValues.length){let c=s.enumValues.map(u=>`'${u}'`).join(" | ");a=c;let f=["type: 'enum'",`enum: [${c}]`];s.nullable&&f.push("nullable: true"),l=`@Column({
    ${f.join(`,
    `)}
  })`}s.nullable&&!(s.enumValues&&s.enumValues.length)&&(l=l.replace(/\)$/,", nullable: true)")),t+=`  ${l}
  ${i}${s.optional?"?":"!"}: ${a}${s.nullable?" | null":""};

`}return!r.createdAt&&!r.created_at&&(t+=`  @CreateDateColumn()
  createdAt!: Date;

`),!r.updatedAt&&!r.updated_at&&(t+=`  @UpdateDateColumn()
  updatedAt!: Date;
`),t+=`}
`,t}},yr={generate:(e,n="Root")=>{let r=$(e);if(!Object.keys(r).length)return"";let o=`${x(n)}s`,t=`import { pgTable, uuid, varchar, doublePrecision, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';

`;t+=`export const ${x(n)} = pgTable('${o}', {
`,r.id||(t+=`  id: uuid('id').defaultRandom().primaryKey(),
`);for(let[i,s]of Object.entries(r)){let a=x(i),l=`varchar('${a}', { length: 255 })`;s.type==="number"?l=`doublePrecision('${a}')`:s.type==="boolean"?l=`boolean('${a}')`:s.type==="object"||s.type==="array"||s.type==="union"?l=`jsonb('${a}')`:s.format==="datetime"&&(l=`timestamp('${a}')`),s.enumValues&&s.enumValues.length&&(l=`varchar('${a}', { enum: [${s.enumValues.map(f=>`'${f}'`).join(", ")}] })`);let c=s.optional||s.nullable?"":".notNull()";t+=`  ${i}: ${l}${c},
`}return!r.createdAt&&!r.created_at&&(t+=`  createdAt: timestamp('created_at').defaultNow().notNull(),
`),!r.updatedAt&&!r.updated_at&&(t+=`  updatedAt: timestamp('updated_at').defaultNow().notNull()
`),t=t.replace(/,\n$/,`
`),t+=`});
`,t}},gr={generate:(e,n="Root")=>{let r=$(e);if(!Object.keys(r).length)return"";let o=A(n),t=`import { Generated, ColumnType } from 'kysely';

`;t+=`export interface ${o}Table {
`,r.id||(t+=`  id: Generated<string>;
`);for(let[i,s]of Object.entries(r)){let a="string";s.type==="number"?a="number":s.type==="boolean"?a="boolean":s.type==="object"||s.type==="array"?a="unknown":s.format==="datetime"&&(a="Date | string");let l=s.optional?`${a} | null`:a;t+=`  ${i}: ${l};
`}return!r.createdAt&&!r.created_at&&(t+=`  createdAt: Generated<string>;
`),!r.updatedAt&&!r.updated_at&&(t+=`  updatedAt: ColumnType<string, string | undefined, string>;
`),t+=`}

`,t+=`export interface Database {
`,t+=`  ${x(n)}s: ${o}Table;
`,t+=`}
`,t}},Se={generate:(e,n="root",r=new Set)=>{if(e=ae(e),e.type==="object"&&e.fields){if(r.has(n))return"";r.add(n);let o="";r.size===1&&(o+=`import * as yup from 'yup';

`),o+=`export const ${n}YupSchema = yup.object({
`;for(let[t,i]of Object.entries(e.fields)){let s=i.nullable?".nullable()":"",a=i.optional?"":".required()",l=n+A(t),c="";if(i.type==="object")c=`${l}YupSchema`;else if(i.type==="array"){let f=i.itemType,u;f?.type==="string"&&f.enumValues?u=`yup.string().oneOf([${f.enumValues.map(p=>`"${p}"`).join(", ")}])`:u=f?.type==="object"?`${l}ItemYupSchema`:`yup.${f?.type??"string"}()`,c=`yup.array().of(${u})`}else i.type==="union"&&i.unionTypes?c="yup.mixed()":i.type==="string"&&i.enumValues?c=`yup.string().oneOf([${i.enumValues.map(f=>`"${f}"`).join(", ")}])`:i.type==="string"?(c="yup.string()",i.format==="email"?c+=".email()":i.format==="url"?c+=".url()":i.format==="uuid"&&(c+=".uuid()")):c=i.type==="any"?"yup.mixed()":`yup.${i.type}()`;o+=`  ${t}: ${c}${s}${a},
`}o+=`});

`;for(let[t,i]of Object.entries(e.fields)){let s=n+A(t);i.type==="object"&&(o+=Se.generate(i,s,r)),i.type==="array"&&i.itemType?.type==="object"&&(o+=Se.generate(i.itemType,s+"Item",r))}return o}return""}},xe={generate:(e,n="root",r=new Set)=>{if(e=ae(e),e.type==="object"&&e.fields){if(r.has(n))return"";r.add(n);let o="";r.size===1&&(o+=`import Joi from 'joi';

`),o+=`export const ${n}JoiSchema = Joi.object({
`;for(let[t,i]of Object.entries(e.fields)){let s=i.nullable?".allow(null)":"",a=i.optional?"":".required()",l=n+A(t),c="";if(i.type==="object")c=`${l}JoiSchema`;else if(i.type==="array"){let f=i.itemType,u;f?.type==="string"&&f.enumValues?u=`Joi.string().valid(${f.enumValues.map(p=>`"${p}"`).join(", ")})`:u=f?.type==="object"?`${l}ItemJoiSchema`:`Joi.${f?.type??"string"}()`,c=`Joi.array().items(${u})`}else i.type==="union"&&i.unionTypes?c=`Joi.alternatives().try(${i.unionTypes.map(f=>`Joi.valid(${typeof f=="string"?`"${f}"`:f})`).join(", ")})`:i.type==="string"&&i.enumValues?c=`Joi.string().valid(${i.enumValues.map(f=>`"${f}"`).join(", ")})`:i.type==="string"?(c="Joi.string()",i.format==="email"?c+=".email()":i.format==="url"?c+=".uri()":i.format==="uuid"&&(c+=".guid()")):c=`Joi.${i.type}()`;o+=`  ${t}: ${c}${s}${a},
`}o+=`});

`;for(let[t,i]of Object.entries(e.fields)){let s=n+A(t);i.type==="object"&&(o+=xe.generate(i,s,r)),i.type==="array"&&i.itemType?.type==="object"&&(o+=xe.generate(i.itemType,s+"Item",r))}return o}return""}},$e={generate:(e,n="root",r=new Set)=>{if(e=ae(e),e.type==="object"&&e.fields){if(r.has(n))return"";r.add(n);let o="";r.size===1&&(o+=`import * as v from 'valibot';

`),o+=`export const ${n}ValiSchema = v.object({
`;for(let[t,i]of Object.entries(e.fields)){let s=n+A(t),a="";if(i.type==="object")a=`${s}ValiSchema`;else if(i.type==="array"){let l=i.itemType,c;l?.type==="string"&&l.enumValues?c=`v.picklist([${l.enumValues.map(f=>`"${f}"`).join(", ")}])`:c=l?.type==="object"?`${s}ItemValiSchema`:`v.${l?.type??"string"}()`,a=`v.array(${c})`}else i.type==="union"&&i.unionTypes?a=`v.union([${i.unionTypes.map(l=>typeof l=="string"?`v.literal("${l}")`:`v.literal(${l})`).join(", ")}])`:i.type==="string"&&i.enumValues?a=`v.picklist([${i.enumValues.map(l=>`"${l}"`).join(", ")}])`:i.type==="string"?(a="v.string()",i.format==="email"?a="v.pipe(v.string(), v.email())":i.format==="url"?a="v.pipe(v.string(), v.url())":i.format==="uuid"&&(a="v.pipe(v.string(), v.uuid())")):a=`v.${i.type}()`;i.nullable&&(a=`v.nullable(${a})`),i.optional&&(a=`v.optional(${a})`),o+=`  ${t}: ${a},
`}o+=`});

`;for(let[t,i]of Object.entries(e.fields)){let s=n+A(t);i.type==="object"&&(o+=$e.generate(i,s,r)),i.type==="array"&&i.itemType?.type==="object"&&(o+=$e.generate(i.itemType,s+"Item",r))}return o}return""}},Ae={generate:(e,n="root",r=new Set)=>{if(e=ae(e),e.type==="object"&&e.fields){if(r.has(n))return"";r.add(n);let o="";r.size===1&&(o+=`import * as s from 'superstruct';

`),o+=`export const ${n}Struct = s.type({
`;for(let[t,i]of Object.entries(e.fields)){let s=n+A(t),a="";if(i.type==="object")a=`${s}Struct`;else if(i.type==="array"){let l=i.itemType,c;l?.type==="string"&&l.enumValues?c=`s.enums([${l.enumValues.map(f=>`"${f}"`).join(", ")}])`:c=l?.type==="object"?`${s}ItemStruct`:`s.${l?.type??"string"}()`,a=`s.array(${c})`}else i.type==="union"&&i.unionTypes?a=`s.union([${i.unionTypes.map(l=>typeof l=="string"?`s.literal("${l}")`:`s.literal(${l})`).join(", ")}])`:i.type==="string"&&i.enumValues?a=`s.enums([${i.enumValues.map(l=>`"${l}"`).join(", ")}])`:a=`s.${i.type}()`;i.nullable&&(a=`s.nullable(${a})`),i.optional&&(a=`s.optional(${a})`),o+=`  ${t}: ${a},
`}o+=`});

`;for(let[t,i]of Object.entries(e.fields)){let s=n+A(t);i.type==="object"&&(o+=Ae.generate(i,s,r)),i.type==="array"&&i.itemType?.type==="object"&&(o+=Ae.generate(i.itemType,s+"Item",r))}return o}return""}},hr={generate:(e,n="Component")=>{let r=$(e);if(!Object.keys(r).length)return"";let o=A(n),t=`import React from 'react';

`;t+=`export interface ${o}Props {
`;for(let[i,s]of Object.entries(r)){let a="string";s.type==="number"?a="number":s.type==="boolean"?a="boolean":s.type==="object"?a="Record<string, any>":s.type==="array"&&(a="any[]"),t+=`  ${i}${s.optional?"?":""}: ${a};
`}t+=`}

`,t+=`export const ${o}: React.FC<${o}Props> = (props) => {
`,t+=`  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800">
`,t+=`      <h2 className="text-xl font-bold mb-2">${o}</h2>
`,t+=`      <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
`;for(let i of Object.keys(r))t+=`        <li><strong>${i}:</strong> {String(props.${i} ?? '')}</li>
`;return t+=`      </ul>
    </div>
  );
};
`,t}},br={generate:(e,n="State")=>{let r=$(e);if(!Object.keys(r).length)return"";let o=A(n),t=`import React, { createContext, useContext, useState, ReactNode } from 'react';

`;t+=`export interface ${o}State {
`;for(let[i,s]of Object.entries(r)){let a="string";s.type==="number"?a="number":s.type==="boolean"?a="boolean":s.type==="object"?a="Record<string, any>":s.type==="array"&&(a="any[]"),t+=`  ${i}${s.optional?"?":""}: ${a};
`}return t+=`}

`,t+=`interface ${o}ContextType {
  state: ${o}State;
  updateState: (updates: Partial<${o}State>) => void;
}

`,t+=`const ${o}Context = createContext<${o}ContextType | undefined>(undefined);

`,t+=`export const ${o}Provider = ({ children, initial }: { children: ReactNode; initial: ${o}State }) => {
`,t+=`  const [state, setState] = useState<${o}State>(initial);
`,t+=`  const updateState = (updates: Partial<${o}State>) => setState(prev => ({ ...prev, ...updates }));

`,t+=`  return (
    <${o}Context.Provider value={{ state, updateState }}>
      {children}
    </${o}Context.Provider>
  );
};

`,t+=`export const use${o}Context = () => {
  const context = useContext(${o}Context);
  if (!context) throw new Error('use${o}Context must be used within ${o}Provider');
  return context;
};
`,t}},Tr={generate:(e,n="User")=>{let r=$(e);if(!Object.keys(r).length)return"";let o=A(n),t=x(n),i=`import { createSlice, PayloadAction } from '@reduxjs/toolkit';

`;i+=`export interface ${o}State {
`;for(let[s,a]of Object.entries(r)){let l="string";a.type==="number"?l="number":a.type==="boolean"?l="boolean":a.type==="object"?l="Record<string, any>":a.type==="array"&&(l="any[]"),i+=`  ${s}${a.optional?"?":""}: ${l};
`}i+=`}

`,i+=`const initialState: ${o}State = {
`;for(let[s,a]of Object.entries(r)){let l="''";a.type==="number"?l="0":a.type==="boolean"?l="false":a.type==="object"?l="{}":a.type==="array"&&(l="[]"),i+=`  ${s}: ${l},
`}return i+=`};

`,i+=`export const ${t}Slice = createSlice({
`,i+=`  name: '${t}',
  initialState,
  reducers: {
`,i+=`    set${o}: (state, action: PayloadAction<Partial<${o}State>>) => {
`,i+=`      return { ...state, ...action.payload };
`,i+=`    },
`,i+=`    reset${o}: () => initialState,
`,i+=`  },
});

`,i+=`export const { set${o}, reset${o} } = ${t}Slice.actions;
`,i+=`export default ${t}Slice.reducer;
`,i}},Sr={generate:(e,n="User")=>{let r=$(e);if(!Object.keys(r).length)return"";let o=A(n),t=x(n),i=`import { defineStore } from 'pinia';

`;i+=`export const use${o}Store = defineStore('${t}', {
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
`,i}},xr={generate:(e,n="Component")=>{let r=$(e);if(!Object.keys(r).length)return"";let o=`<script setup lang="ts">
`;o+=`defineProps<{
`;for(let[t,i]of Object.entries(r)){let s="string";i.type==="number"?s="number":i.type==="boolean"?s="boolean":i.type==="object"?s="Record<string, any>":i.type==="array"&&(s="any[]"),o+=`  ${t}${i.optional?"?":""}: ${s};
`}o+=`}>();
`,o+=`</script>

`,o+=`<template>
  <div class="vue-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
`,o+=`    <h2 class="text-xl font-bold mb-2">${A(n)}</h2>
`,o+=`    <ul class="text-sm space-y-1">
`;for(let t of Object.keys(r))o+=`      <li><strong>${t}:</strong> {{ ${t} }}</li>
`;return o+=`    </ul>
  </div>
</template>
`,o}},$r={generate:(e,n="Component")=>{let r=$(e);if(!Object.keys(r).length)return"";let o=`<script lang="ts">
`;for(let[t,i]of Object.entries(r)){let s="string";i.type==="number"?s="number":i.type==="boolean"?s="boolean":i.type==="object"?s="Record<string, any>":i.type==="array"&&(s="any[]"),o+=`  export let ${t}: ${s}${i.optional?" | undefined = undefined":""};
`}o+=`</script>

`,o+=`<div class="svelte-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
`,o+=`  <h2 class="text-xl font-bold mb-2">${A(n)}</h2>
`,o+=`  <ul class="text-sm space-y-1">
`;for(let t of Object.keys(r))o+=`    <li><strong>${t}:</strong> {${t}}</li>
`;return o+=`  </ul>
</div>
`,o}},Ar={generate:(e,n="Component")=>{let r=$(e);if(!Object.keys(r).length)return"";let o=A(n),t=`import { Component } from 'solid-js';

`;t+=`export interface ${o}Props {
`;for(let[i,s]of Object.entries(r)){let a="string";s.type==="number"?a="number":s.type==="boolean"?a="boolean":s.type==="object"?a="Record<string, any>":s.type==="array"&&(a="any[]"),t+=`  ${i}${s.optional?"?":""}: ${a};
`}t+=`}

`,t+=`export const ${o}: Component<${o}Props> = (props) => {
`,t+=`  return (
    <div class="solid-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
`,t+=`      <h2 class="text-xl font-bold mb-2">${o}</h2>
`,t+=`      <ul class="text-sm space-y-1">
`;for(let i of Object.keys(r))t+=`        <li><strong>${i}:</strong> {String(props.${i} ?? '')}</li>
`;return t+=`      </ul>
    </div>
  );
};
`,t}},Or={generate:(e,n="Data")=>{let r=$(e);if(!Object.keys(r).length)return"";let o=A(n),t=`// Generated by TypeMorph (requires ArduinoJson library)
`;t+=`#include <ArduinoJson.h>

`,t+=`struct ${o} {
`;for(let[i,s]of Object.entries(r)){let a="String";s.type==="number"?a="double":s.type==="boolean"&&(a="bool"),t+=`  ${a} ${i};
`}t+=`};

`,t+=`void deserialize${o}(Stream& stream, ${o}& data) {
`,t+=`  StaticJsonDocument<1024> doc;
`,t+=`  deserializeJson(doc, stream);

`;for(let i of Object.keys(r))t+=`  data.${i} = doc["${i}"];
`;return t+=`}
`,t}},Cr={generate:(e,n="RECORD")=>{let r=$(e);if(!Object.keys(r).length)return"";let o=Q(n).substring(0,20),t=`      * Generated by TypeMorph \u2014 COBOL Copybook
`;t+=`       01  ${o}.
`;for(let[i,s]of Object.entries(r)){let a=Q(i).substring(0,20);if(s.type==="object"&&s.fields){t+=`           05  ${a.padEnd(20)}.
`;for(let[l,c]of Object.entries(s.fields)){let f=Q(l).substring(0,20),u=c.type==="number"?"9(9)V99":c.type==="boolean"?"9(1)":"X(255)";t+=`               10  ${f.padEnd(20)} PIC ${u}.
`}}else if(s.type==="array"){let l=s.itemType?.type==="number"?"9(9)V99":"X(255)";t+=`           05  ${a.padEnd(20)} OCCURS 10 TIMES PIC ${l}.
`}else{let l="X(255)";s.type==="number"?l="9(9)V99":s.type==="boolean"&&(l="9(1)"),t+=`           05  ${a.padEnd(20)} PIC ${l}.
`}}return t}},vr={generate:(e,n="data")=>{let r=$(e);if(!Object.keys(r).length)return"";let t=`(ns com.example.${x(n)}-spec
  (:require [clojure.spec.alpha :as s]))

`,i=[];for(let[a,l]of Object.entries(r)){let c=`::${x(a)}`;i.push(c);let f="string?";if(l.type==="number")f="number?";else if(l.type==="boolean")f="boolean?";else if(l.type==="array")f="(s/coll-of any?)";else if(l.type==="object"&&l.fields){let u=Object.keys(l.fields).map(p=>`::${x(p)}`);for(let[p,m]of Object.entries(l.fields)){let d=m.type==="number"?"number?":m.type==="boolean"?"boolean?":"string?";t+=`(s/def ::${x(p)} ${d})
`}f=`(s/keys :req [${u.join(" ")}])`}t+=`(s/def ${c} ${f})
`}let s=i.join(" ");return t+=`
(s/def ::${x(n)} (s/keys :req [${s}]))
`,t}},jr={generate:(e,n="Data")=>{let r=$(e);if(!Object.keys(r).length)return"";let t=`defmodule MyApp.${A(n)} do
  use Ecto.Schema
  import Ecto.Changeset

`;t+=`  schema "${x(n)}s" do
`;for(let[s,a]of Object.entries(r)){let l=":string";a.type==="number"?l=":float":a.type==="boolean"?l=":boolean":a.type==="object"||a.type==="array"?l=":map":a.format==="datetime"&&(l=":utc_datetime"),t+=`    field :${x(s)}, ${l}
`}t+=`    timestamps()
  end

`;let i=Object.entries(r).filter(([,s])=>!s.optional).map(([s])=>`:${x(s)}`);return t+=`  def changeset(struct, params \\\\ %{}) do
`,t+=`    struct
`,t+=`    |> cast(params, [${Object.keys(r).map(s=>`:${x(s)}`).join(", ")}])
`,i.length&&(t+=`    |> validate_required([${i.join(", ")}])
`),t+=`  end
end
`,t}},kr={generate:(e,n="Model")=>{let r=$(e);if(!Object.keys(r).length)return"";let o=A(n),t=`module MyApp.${o} exposing (..)

import Json.Decode as Decode exposing (Decoder)
import Json.Decode.Pipeline exposing (required, optional)

`;t+=`type alias ${o} =
    {
`;let i=Object.entries(r).map(([s,a])=>{let l="String";return a.type==="number"?l="Float":a.type==="boolean"&&(l="Bool"),a.optional&&(l=`Maybe ${l}`),`    ${s} : ${l}`});t+=i.join(`
    , `)+`
    }

`,t+=`decoder : Decoder ${o}
decoder =
    Decode.succeed ${o}
`;for(let[s,a]of Object.entries(r)){let l="Decode.string";a.type==="number"?l="Decode.float":a.type==="boolean"&&(l="Decode.bool"),a.optional?t+=`        |> optional "${s}" (Decode.nullable ${l}) Nothing
`:t+=`        |> required "${s}" ${l}
`}return t}},Nr={generate:(e,n="Data")=>{let r=$(e);if(!Object.keys(r).length)return"";let o=`# Generated by TypeMorph \u2014 GDScript
class_name ${A(n)}

`;for(let[t,i]of Object.entries(r)){let s="String",a='""';i.type==="number"?(s="float",a="0.0"):i.type==="boolean"?(s="bool",a="false"):i.type==="object"?(s="Dictionary",a="{}"):i.type==="array"&&(s="Array",a="[]"),o+=`var ${x(t)}: ${s} = ${a}
`}o+=`
static func from_dict(dict: Dictionary) -> ${A(n)}:
`,o+=`  var instance = ${A(n)}.new()
`;for(let t of Object.keys(r)){let i=x(t);o+=`  if dict.has("${t}"):
    instance.${i} = dict["${t}"]
`}return o+=`  return instance
`,o}},Er={generate:(e,n="Root")=>{let r=$(e);if(!Object.keys(r).length)return"";let o=A(n),t=`{-# LANGUAGE DeriveGeneric #-}
module MyApp.${o} where

import GHC.Generics (Generic)
import Data.Aeson (FromJSON, ToJSON)

`;t+=`data ${o} = ${o}
  { `;let i=Object.entries(r).map(([s,a])=>{let l="String";return a.type==="number"?l="Double":a.type==="boolean"&&(l="Bool"),a.optional&&(l=`Maybe ${l}`),`${x(s)} :: ${l}`});return t+=i.join(`
  , `)+`
  } deriving (Show, Generic)

`,t+=`instance FromJSON ${o}
instance ToJSON ${o}
`,t}},Rr={generate:(e,n="df")=>{let r=$(e);if(!Object.keys(r).length)return"";let o=x(n),t=`# Generated by TypeMorph
`;t+=`${o} <- data.frame(
`;let i=Object.entries(r).map(([s,a])=>{let l='"sample_value"';return a.type==="number"?l="0.0":a.type==="boolean"?l="TRUE":a.type==="object"||a.type==="array"?l="list()":a.format==="email"?l='"user@example.com"':a.format==="datetime"&&(l='as.POSIXct("2024-01-01")'),`  ${x(s)} = c(${l})`});return t+=i.join(`,
`)+`,
  stringsAsFactors = FALSE
)
`,t}},wr={generate:(e,n="Root")=>{let r=$(e);if(!Object.keys(r).length)return"";let o=A(n),t=`// Generated by TypeMorph
`;t+=`case class ${o}(
`;let i=Object.entries(r).map(([s,a])=>{let l="String";return a.type==="number"?l="Double":a.type==="boolean"?l="Boolean":a.type==="object"?l="Map[String, Any]":a.type==="array"&&(l="List[Any]"),a.optional&&(l=`Option[${l}]`),`  ${s}: ${l}`});return t+=i.join(`,
`)+`
)
`,t}},_r={generate:(e,n="Record")=>{let r=$(e);if(!Object.keys(r).length)return"";let o=[],t="";for(let[s,a]of Object.entries(r)){let l="string";if(a.type==="number")l="uint256";else if(a.type==="boolean")l="bool";else if(a.type==="array")l=`${a.itemType?.type==="number"?"uint256":a.itemType?.type==="boolean"?"bool":"string"}[]`;else if(a.type==="object"&&a.fields){let c=A(s),f=`    struct ${c} {
`;for(let[u,p]of Object.entries(a.fields)){let m=p.type==="number"?"uint256":p.type==="boolean"?"bool":"string";f+=`        ${m} ${u};
`}f+="    }",o.push(f),l=c}t+=`        ${l} ${s};
`}let i=`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

`;i+=`contract ${A(n)}Store {
`;for(let s of o)i+=s+`

`;return i+=`    struct ${A(n)} {
`,i+=`        uint256 id;
`,i+=t,i+=`    }
`,i+=`}
`,i}},Ir={generate:(e,n="Post")=>{let r=$(e);if(!Object.keys(r).length)return"";let o=A(n),t=`from django.db import models
from rest_framework import serializers

`;t+=`class ${o}(models.Model):
`;for(let[i,s]of Object.entries(r)){let a=x(i),l=s.optional?", null=True, blank=True":"",c=`models.CharField(max_length=255${l})`;s.type==="number"?c=`models.FloatField(${l})`:s.type==="boolean"?c="models.BooleanField(default=False)":s.type==="object"||s.type==="array"?c=`models.JSONField(${l})`:s.format==="datetime"&&(c="models.DateTimeField(auto_now_add=True)"),t+=`    ${a} = ${c}
`}return t+=`

class ${o}Serializer(serializers.ModelSerializer):
`,t+=`    class Meta:
`,t+=`        model = ${o}
`,t+=`        fields = '__all__'
`,t}},Lr={generate:(e,n="User")=>{let r=$(e);if(!Object.keys(r).length)return"";let t=`class ${`Create${A(n)}s`} < ActiveRecord::Migration[7.0]
  def change
`;t+=`    create_table :${x(n)}s do |t|
`;for(let[i,s]of Object.entries(r)){if(i.toLowerCase()==="id")continue;let a="string";s.type==="number"?a=s.format==="int"?"integer":"decimal":s.type==="boolean"?a="boolean":s.type==="object"||s.type==="array"?a="jsonb":s.format==="datetime"&&(a="datetime");let l=s.optional?", null: true":", null: false";t+=`      t.${a} :${x(i)}${l}
`}return t+=`      t.timestamps
    end
  end
end
`,t}},Mr={generate:(e,n="Root")=>{let r=A(n),o=x(n),t=$(e),i=Object.keys(t),s=JSON.stringify(Object.fromEntries(i.map(a=>{let l=t[a];return l.type==="number"?[a,0]:l.type==="boolean"?[a,!1]:[a,"sample"]})),null,6).replace(/^/gm,"    ");return`import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Generated by TypeMorph \u2014 Next.js App Router API Route
// Route: /api/${o}s

const ${r}Schema = z.object({
${i.map(a=>{let l=t[a],c=l.type==="number"?"z.number()":l.type==="boolean"?"z.boolean()":"z.string()";return`  ${a}: ${c}${l.optional?".optional()":""}`}).join(`,
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
`}},Fr={generate:(e,n="Root")=>{let r=A(n),o=n.charAt(0).toLowerCase()+n.slice(1),t=x(n),i=$(e),s=Object.keys(i);return`import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Generated by TypeMorph \u2014 React Query Hook
// Requires: @tanstack/react-query

export interface ${r} {
${s.map(a=>{let l=i[a],c=l.type==="number"?"number":l.type==="boolean"?"boolean":"string";return`  ${a}${l.optional?"?":""}: ${c};`}).join(`
`)}
}

const API_BASE = '/api/${t}s';

export const use${r}List = () => {
  return useQuery<${r}[]>({
    queryKey: ['${t}s'],
    queryFn: async () => {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error('Failed to fetch ${t}s');
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
      if (!res.ok) throw new Error('Failed to create ${t}');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${t}s'] });
    },
  });
};

export const use${r}Delete = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(\`\${API_BASE}/\${id}\`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete ${t}');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${t}s'] });
    },
  });
};
`}};var qr=require("crypto");var tn=e=>{try{let n=oe.load(e);if(n==null)return{};if(typeof n!="object"||Array.isArray(n))return{value:n};let r=n;return"_parseError"in r?{}:r}catch{return null}};function Rs(e,n){typeof window>"u"||typeof window.gtag!="function"||window.gtag("event",e,n)}function Dr(e,n){Rs("infer_unsupported_output",{target:e,requested:n})}function Oe(e){if(typeof e!="object"||e===null||Array.isArray(e))return!1;let n=e,r=String(n.openapi??""),o=String(n.swagger??""),t=n.openapi!==void 0&&r.startsWith("3"),i=n.swagger!==void 0&&o.startsWith("2");return(t||i)&&!!(n.info||n.paths||n.components||n.definitions)}function Ce(e){let r=typeof e.openapi=="string"||typeof e.openapi=="number"?e.components?.schemas??{}:e.definitions??{},o=new Set;function t(l){if(!l.startsWith("#/"))return null;let c=l.slice(2).split("/"),f=e;for(let u of c){if(f==null)return null;f=f[u.replace(/~1/g,"/").replace(/~0/g,"~")]}return f??null}function i(l){return l.split("/").pop()??""}function s(l,c=0,f=!1){if(c>20||!l||typeof l!="object")return{type:"any"};if(typeof l.$ref=="string"){let m=i(l.$ref);if(!f&&r[m]!==void 0)return{type:"object",_sharedTypeName:m};if(o.has(m))return{type:"any"};let d=t(l.$ref);return d?s(d,c+1,f):{type:"any"}}if(Array.isArray(l.allOf)){let m={type:"object",fields:{}};for(let d of l.allOf){let y=s(d,c+1,!0);y.type==="object"&&y.fields&&Object.assign(m.fields,y.fields)}return m}if(Array.isArray(l.anyOf)||Array.isArray(l.oneOf)){let m=(l.anyOf??l.oneOf).map(y=>s(y,c+1)),d=[...new Set(m.map(y=>y.type))];return d.length===1?m[0]:{type:"union",unionTypes:d}}let u=typeof l.type=="string"?l.type:"",p=Array.isArray(l.required)?l.required:[];if(u==="object"||!u&&l.properties){let m={};for(let[d,y]of Object.entries(l.properties??{})){let b=s(y,c+1);p.includes(d)||(b.optional=!0),y.nullable===!0&&(b.nullable=!0),m[d]=b}return{type:"object",fields:m}}if(u==="array")return{type:"array",itemType:l.items?s(l.items,c+1):{type:"any"}};if(u==="string"){let m={type:"string"};Array.isArray(l.enum)&&(m.enumValues=l.enum.map(String));let d=l.format??"";return d==="date-time"?m.format="datetime":d==="date"?m.format="date":d==="email"?m.format="email":d==="uri"||d==="url"?m.format="url":d==="uuid"&&(m.format="uuid"),m}if(u==="integer")return{type:"number",format:"int"};if(u==="number"){let m={type:"number"};return(l.format==="float"||l.format==="double")&&(m.format="float"),m}return u==="boolean"?{type:"boolean"}:{type:"any"}}let a=[];for(let[l,c]of Object.entries(r)){o.add(l);let f=s(c);o.delete(l),f._isTypeMorphSchema=!0,a.push({name:l,schema:f})}return a}function ve(e){if(typeof e!="object"||e===null||Array.isArray(e))return!1;let r=String(e.$schema??"");return r.includes("json-schema.org")||/^https?:\/\/.*\/schema/.test(r)}function je(e){let n=e.$defs??e.definitions??{};function r(a){if(!a.startsWith("#/"))return null;let l=a.slice(2).split("/"),c=e;for(let f of l){if(c==null)return null;c=c[f.replace(/~1/g,"/").replace(/~0/g,"~")]}return c??null}function o(a){return a.split("/").pop()??""}function t(a,l=0,c=!1){if(l>20||!a||typeof a!="object")return{type:"any"};if(typeof a.$ref=="string"){let d=o(a.$ref);if(!c&&n[d]!==void 0)return{type:"object",_sharedTypeName:d};let y=r(a.$ref);return y?t(y,l+1,c):{type:"any"}}if(Array.isArray(a.allOf)){let d={type:"object",fields:{}};for(let y of a.allOf){let b=t(y,l+1,!0);b.type==="object"&&b.fields&&Object.assign(d.fields,b.fields)}if(a.properties){let y=Array.isArray(a.required)?a.required:[];for(let[b,g]of Object.entries(a.properties)){let h=t(g,l+1);y.includes(b)||(h.optional=!0),d.fields[b]=h}}return d}if(Array.isArray(a.anyOf)||Array.isArray(a.oneOf)){let d=a.anyOf??a.oneOf,y=d.filter(T=>T.type!=="null"&&!(typeof T.$ref=="string"&&T.$ref==="#"));if(y.length===1){let T=t(y[0],l+1,c);return y.length<d.length&&(T.nullable=!0),T}let b=y.map(T=>t(T,l+1)),g=[...new Set(b.map(T=>T.type))],h=g.length===1?b[0]:{type:"union",unionTypes:g};return y.length<d.length&&(h.nullable=!0),h}let f=a.type,u=!1;if(Array.isArray(f)){let d=f.filter(y=>y!=="null");u=d.length<f.length,f=d[0]??"any"}let p=typeof f=="string"?f:"",m=Array.isArray(a.required)?a.required:[];if(a.const!==void 0){let d=typeof a.const;if(d==="string")return{type:"string",enumValues:[String(a.const)]};if(d==="number")return{type:"number"};if(d==="boolean")return{type:"boolean"}}if(Array.isArray(a.enum)){let d=a.enum.filter(b=>b!==null),y={type:"string",enumValues:d.map(String)};return d.length<a.enum.length&&(y.nullable=!0),y}if(p==="object"||!p&&a.properties){let d={};for(let[b,g]of Object.entries(a.properties??{})){let h=t(g,l+1);m.includes(b)||(h.optional=!0),d[b]=h}let y={type:"object",fields:d};return u&&(y.nullable=!0),y}if(p==="array"){let d=Array.isArray(a.items)?a.items[0]:a.items,b={type:"array",itemType:d?t(d,l+1):{type:"any"}};return u&&(b.nullable=!0),b}if(p==="string"){let d={type:"string"},y=a.format??"";return y==="date-time"?d.format="datetime":y==="date"?d.format="date":y==="email"?d.format="email":y==="uri"||y==="url"?d.format="url":y==="uuid"&&(d.format="uuid"),u&&(d.nullable=!0),d}return p==="integer"?{type:"number",format:"int",...u?{nullable:u}:{}}:p==="number"?{type:"number",...u?{nullable:u}:{}}:p==="boolean"?{type:"boolean",...u?{nullable:u}:{}}:{type:"any"}}let i=[];for(let[a,l]of Object.entries(n)){let c=t(l);c._isTypeMorphSchema=!0,i.push({name:a,schema:c})}if(e.type||e.properties||e.allOf||e.anyOf||e.oneOf||e.items){let a=e.title??"Root";if(!i.find(l=>l.name===a)){let l=t(e);l._isTypeMorphSchema=!0,i.unshift({name:a,schema:l})}}return i}function Gr(e){return e.type!=="object"||!e.fields?null:Object.keys(e.fields).sort()}function ws(e,n){if(e.length===0&&n.length===0)return 1;let r=new Set(e),o=n.filter(i=>r.has(i)).length,t=new Set([...e,...n]).size;return t===0?0:o/t}function Pr(e,n){let[r,o]=e.type==="array"&&e.itemType?.type==="object"?[e.itemType,`${n}Item`]:e.type==="object"?[e,n]:[null,""];if(!r||r.type!=="object"||!r.fields)return;let t=Gr(r);if(!t||t.length<2)return;let i=t;function s(a,l){if(!(l>20||!a)&&!(a._sharedTypeName||a._isTypeMorphSchema))if(a.type==="object"&&a.fields&&a!==r){let c=Gr(a);if(c&&c.length>=1&&ws(i,c)>=.65){a._sharedTypeName=o,delete a.fields;return}for(let f of Object.values(a.fields))s(f,l+1)}else a.type==="array"&&a.itemType&&s(a.itemType,l+1)}for(let a of Object.values(r.fields))s(a,1)}var rn=new Set(["string","number","boolean"]),on=(e,n)=>{let r=e.type==="union"?e.unionTypes??[]:[e.type],o=n.type==="union"?n.unionTypes??[]:[n.type],t=Array.from(new Set([...r,...o]));return t.length===1?{type:t[0]}:{type:"union",unionTypes:t}},Ur=20,le=(e,n,r=0)=>{if(r>Ur)return{type:"any"};if(!e)return n;if(!n)return e;let o=e.optional||n.optional,t=e.nullable||n.nullable;if(e.type==="any")return{...n,optional:o,nullable:t};if(n.type==="any")return{...e,optional:o,nullable:t};if(e.type!==n.type){if(rn.has(e.type)&&rn.has(n.type))return{...on(e,n),optional:o,nullable:t};if(e.type==="union"||n.type==="union"){let i=e.type==="union"?n.type:e.type;if(i==="union"||rn.has(i))return{...on(e,n),optional:o,nullable:t}}return{type:"any",optional:o,nullable:t}}if(e.type==="union")return{...on(e,n),optional:o,nullable:t};if(e.type==="number"&&n.type==="number"){let i=e.format==="float"||n.format==="float"?"float":"int";return{...e,optional:o,nullable:t,format:i}}if(e.type==="string"&&n.type==="string"){let i;if(e.enumValues||n.enumValues){let s=Array.from(new Set([...e.enumValues??[],...n.enumValues??[]]));s.length<=6&&(i=s)}return e.format===n.format?{...e,optional:o,nullable:t,enumValues:i}:{type:"string",optional:o,nullable:t,enumValues:i}}if(e.type==="object"&&n.type==="object"){let i=e.fields??{},s=n.fields??{},a=new Set([...Object.keys(i),...Object.keys(s)]),l={};for(let c of a){let f=c in i,u=c in s;f&&u?l[c]=le(i[c],s[c],r+1):f?l[c]={...i[c],optional:!0}:l[c]={...s[c],optional:!0}}return{type:"object",fields:l,optional:o,nullable:t}}return e.type==="array"&&n.type==="array"?{type:"array",itemType:le(e.itemType,n.itemType,r+1),optional:o,nullable:t}:{...e,optional:o,nullable:t}},_s=e=>{let n={};for(let r of e)if(r&&typeof r=="object"&&!Array.isArray(r))for(let[o,t]of Object.entries(r))typeof t=="string"&&(n[o]||(n[o]=[]),n[o].push(t));return n},Br=new Set(["status","type","role","gender","state","category","mode","level","phase","kind","visibility","scope","method","action","currency","priority","tier","plan","severity","permission","provider","platform","environment","locale","theme","layout","variant","direction","alignment","position"]),Is=(e,n,r)=>{if(n.length===0)return 0;let o=0,t=e.toLowerCase(),i=r?.enumMinSamples??3;Array.from(Br).some(u=>t.includes(u))&&(o+=.4);let a=new Set(n),l=a.size/n.length;a.size===1||l<=.2?o+=.4:l<=.4&&n.length>=i&&(o+=.2);let c=r?.enumMaxUnique??6;a.size>=2&&a.size<=c&&(o+=.25),n.length>=10?o+=.2:n.length>=5&&(o+=.1);let f=new Set(["yes","no","true","false","get","post","put","delete","active","inactive","pending","success","error","failed"]);return n.every(u=>f.has(u.toLowerCase()))&&(o+=n.length>=i?.5:.2),Math.min(o,1)},Ls=(e,n,r)=>{let o=r?.enumConfidenceThreshold??.6;return Is(e,n,r)>=o},Ms=e=>{let n=Object.keys(e);if(n.some(s=>/currency|curr/i.test(s)))for(let s of n)/amount|price|cost|fee|tax|total|subtotal/i.test(s)&&e[s].type==="number"&&(e[s].format="float");let o=n.some(s=>/^lat(itude)?$/i.test(s)),t=n.some(s=>/^(lng|lon|longitude)$/i.test(s));if(o&&t)for(let s of n)/^lat(itude)?$|^(lng|lon|longitude)$/i.test(s)&&e[s].type==="number"&&(e[s].format="float");if(n.some(s=>/created_?at|updated_?at/i.test(s)))for(let s of n)/created_?by|updated_?by/i.test(s)&&e[s].type==="string"&&(e[s].format="uuid")},F=(e,n,r=0,o,t)=>{let i=t?.maxDepth??Ur,s=(l,c,f)=>(t?.includeMeta&&(l._meta={reason:c,info:f}),l);if(r>i)return s({type:"any"},"max_depth_exceeded");if(e===null)return s({type:"any",nullable:!0},"null_value");if(e===void 0)return s({type:"any",optional:!0},"undefined_value");if(Array.isArray(e)){if(e.length===0)return s({type:"array",itemType:{type:"any"}},"empty_array");let l=e.length,c=t?.arrayLargeThreshold??1e3,f=t?.arraySampleCount??200,u=t?.arrayPrefixSample??10,p=new Set;if(l<=c)for(let g=0;g<l;g++)p.add(g);else{let g=Math.min(u,l);for(let T=0;T<g;T++)p.add(T);let h=Math.max(0,Math.min(f-g,l-g));if(h>0){let T=(l-g)/h;for(let O=0;O<h;O++)p.add(Math.min(l-1,Math.floor(g+O*T)))}}let m=Array.from(p).sort((g,h)=>g-h).map(g=>e[g]),d=new Set,y=_s(m);for(let[g,h]of Object.entries(y))Ls(g,h,t)&&d.add(g);let b=F(m[0],void 0,r+1,d,t);for(let g=1;g<m.length;g++)b=le(b,F(m[g],void 0,r+1,d,t),r+1);if(t?.detectDiscriminatedUnions!==!1&&m.length>=2){let g=Fs(m,r,t);g&&(b={...b,discriminatorField:g.discriminatorField,discriminatedVariants:g.variants})}return s({type:"array",itemType:b},"array_inferred",{samples:l,sampled:m.length})}if(typeof e=="object"){let l={};for(let c in e)l[c]=F(e[c],c,r+1,o,t);return Ms(l),s({type:"object",fields:l},"object",{fieldCount:Object.keys(l).length})}if(typeof e=="string"){if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(e))return s({type:"string",format:"uuid"},"format:uuid");if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))return s({type:"string",format:"email"},"format:email");if(/^https?:\/\/[^\s]+$/.test(e))return s({type:"string",format:"url"},"format:url");if(/^\d{4}-\d{2}-\d{2}$/.test(e)&&!isNaN(Date.parse(e)))return s({type:"string",format:"date"},"format:date");if(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(e)&&!isNaN(Date.parse(e)))return s({type:"string",format:"datetime"},"format:datetime");if(/^\d/.test(e)&&e.includes("T")&&!isNaN(Date.parse(e))&&e.length>7)return s({type:"string",format:"datetime"},"format:datetime");let l=!1;if(n){let c=n.toLowerCase(),f=Array.from(Br),u=/price|amount|cost|fee|tax|rate|ratio|percent|score|weight|height|width|balance|salary|revenue/i,p=/^id$|_id$|^uuid$|^guid$|^token$/i,m=/url|uri|href|link|src|endpoint|avatar|thumbnail|image|photo/i,d=/email|mail/i;if(p.test(n))return s({type:"string",format:"uuid"},"format:uuid:keyname");if(d.test(n))return s({type:"string",format:"email"},"format:email:keyname");if(m.test(n))return s({type:"string",format:"url"},"format:url:keyname");if(o?l=o.has(n):(f.some(y=>c.includes(y))||new Set(["yes","no","true","false","get","post","put","delete","active","inactive","pending","success","error","failed"]).has(e.toLowerCase()))&&(l=!0),!l&&u.test(n))return s({type:"string"},"format:float:keyname")}return l&&e.trim()!==""?s({type:"string",enumValues:[e]},"enum_candidate",{sample:e}):s({type:"string"},"string")}if(typeof e=="number"){let l=Number.isInteger(e);return s({type:"number",format:l?"int":"float"},"number")}let a=typeof e;return s(a==="string"||a==="number"||a==="boolean"||a==="object"?{type:a}:{type:"any"},"primitive")},Fs=(e,n,r)=>{if(e.length<2||!e.every(t=>t!==null&&typeof t=="object"&&!Array.isArray(t)))return null;let o=Object.keys(e[0]);for(let t of o){if(!e.every(f=>typeof f[t]=="string"&&f[t].length>0))continue;let i=Array.from(new Set(e.map(f=>f[t])));if(i.length<2||i.length>8)continue;let s={};for(let f of i){let u=e.filter(m=>m[t]===f);if(u.length===0)continue;let p=F(u[0],void 0,n+1,void 0,r);for(let m=1;m<u.length;m++)p=le(p,F(u[m],void 0,n+1,void 0,r),n+1);s[f]=p}if(Object.keys(s).length<2)continue;let a=Object.values(s).map(f=>new Set(Object.entries(f.fields??{}).filter(([,u])=>!u.optional).map(([u])=>u)));if(Array.from(new Set(a.flatMap(f=>Array.from(f)))).filter(f=>!a.every(u=>u.has(f))).length>=2)return{discriminatorField:t,variants:s}}return null},Ds={typescript:`// Required dependencies: npm install typescript

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

`},Gs=e=>{let n=e.split(`
`).map(t=>t.trimEnd()),r=[],o=!1;for(let t of n)t===""?o||(r.push(""),o=!0):(r.push(t),o=!1);return r.join(`
`).trim()},sn=new WeakMap,Ps=e=>{if(sn.has(e))return sn.get(e);let n=t=>{if(!t)return null;if(t.type==="object"&&t.fields){let s=Object.keys(t.fields).sort((l,c)=>l.localeCompare(c)),a={};for(let l of s)a[l]=n(t.fields[l]);return{type:"object",fields:a}}if(t.type==="array"&&t.itemType)return{type:"array",item:n(t.itemType)};let i={type:t.type,optional:!!t.optional,nullable:!!t.nullable};return t.enumValues&&t.enumValues.length>0&&(i.enum=[...t.enumValues].sort()),t.format&&(i.format=t.format),i},r=JSON.stringify(n(e)),o=(0,qr.createHash)("sha256").update(r).digest("hex");return sn.set(e,o),e._structureHash=o,o},an=(e,n=[],r="Root")=>{if(e.type==="object"&&e.fields){n.push({schema:e,parentKey:r});for(let[o,t]of Object.entries(e.fields))an(t,n,o)}else e.type==="array"&&e.itemType&&an(e.itemType,n,r+"Item")},ln=(e,n,r=new Set,o={})=>{if(e.type!=="object"||n.type!=="object"||!e.fields||!n.fields)return!1;let t=Object.keys(e.fields),i=Object.keys(n.fields),s=o.minFieldsForIsomorphic??2;if(t.length<s||i.length<s)return!1;let a=e._structureHash,l=n._structureHash,c=a&&l?`${a}-${l}`:void 0;if(c&&r.has(c))return!0;c&&r.add(c);let f=Array.from(new Set([...t,...i])),u=0,p=0,m=0;for(let h of f){let T=e.fields[h],O=n.fields[h];if(T&&O)if(T.type==="any"||O.type==="any")u++;else if(T.type===O.type)if(T.type==="object"&&T.fields&&O.fields)ln(T,O,r,o)?u++:p++;else if(T.type==="array"&&T.itemType&&O.itemType){let v=T.itemType,L=O.itemType;v.type==="any"||L.type==="any"?u++:v.type==="object"&&L.type==="object"?ln(v,L,r,o)?u++:p++:v.type===L.type?u++:p++}else u++;else p++;else{let v=T||O;v.optional||v.type==="any"?u++:m++}}let d=u+p+m;if(d===0)return!0;let y=u/d,b=o.minMatchRatio??.5,g=o.maxTypeMismatches??0;return y>=b&&p<=g},cn=(e,n)=>{if(!(!e.fields||!n.fields)){for(let[r,o]of Object.entries(n.fields))if(!e.fields[r])e.fields[r]={...o,optional:!0};else{let t=e.fields[r];if(t.optional=t.optional||o.optional,t.nullable=t.nullable||o.nullable,t.type==="any")e.fields[r]={...o,optional:t.optional,nullable:t.nullable};else if(t.type==="string"&&o.type==="string"){if(t.enumValues||o.enumValues){let i=Array.from(new Set([...t.enumValues??[],...o.enumValues??[]]));t.enumValues=i.length<=6?i:void 0}}else t.type==="object"&&o.type==="object"?cn(t,o):t.type==="array"&&t.itemType&&o.type==="array"&&o.itemType&&(t.itemType.type==="any"?t.itemType={...o.itemType}:t.itemType.type==="object"&&o.itemType.type==="object"?cn(t.itemType,o.itemType):t.itemType.type===o.itemType.type&&(t.itemType=le(t.itemType,o.itemType)))}for(let r of Object.keys(e.fields))n.fields[r]||(e.fields[r].optional=!0)}},qs=(e,n={})=>{let r=n.sharedPrefix!==void 0?n.sharedPrefix:"Shared",o=[];for(let s of e){let a=!1;for(let l of o)if(ln(s.schema,l[0],new Set,n)){l.push(s.schema),a=!0;break}a||o.push([s.schema])}let t=new Set,i=[];for(let s of o){let a=1;if(s.length<2)continue;s.sort((d,y)=>Object.keys(y.fields||{}).length-Object.keys(d.fields||{}).length);let l=s[0],f=(e.find(d=>d.schema===l)||e.find(d=>s.includes(d.schema)))?.parentKey||"Object",u=Object.keys(l.fields||{}),p="";if(u.includes("city")&&(u.includes("street")||u.includes("zip")))p=r?`${r}Address`:"Address";else if(u.includes("amount")&&u.includes("currency"))p=r?`${r}Money`:"Money";else if(u.includes("created_at")&&u.includes("updated_at"))p=r?`${r}Metadata`:"Metadata";else if(u.includes("name")&&(u.includes("email")||u.includes("age")||u.includes("profile")||u.includes("role")))p=r?`${r}User`:"User";else if(u.includes("id")&&u.includes("profile")&&u.includes("permissions"))p=r?`${r}Member`:"Member";else{let d=s.map(h=>e.find(T=>T.schema===h)?.parentKey).filter(h=>!!h&&h!=="Root"&&h!=="Object"),y=d.length>0?d.sort((h,T)=>h.length-T.length)[0]:f,b=new Set(["status","address","business","process","class","series","species","means","news","analysis","basis","crisis","thesis","oasis","bonus","genius","campus","focus","corpus","census","consensus","virus","canvas","atlas","alias","bias","gas"]);y.endsWith("s")&&!y.endsWith("ss")&&!b.has(y.toLowerCase())&&(y=y.slice(0,-1));let g=y.replace(/(^\w|_\w)/g,h=>h.replace(/_/,"").toUpperCase());p=r?`${r}${g}`:g}let m=p;for(;t.has(m);)m=`${p}${a++}`;t.add(m),i.push({group:s,semanticName:m})}return i},Us=(e,n={})=>{let r=[];an(e,r,"Root");for(let t of r)t.schema._structureHash=Ps(t.schema);let o=qs(r,n);for(let{group:t,semanticName:i}of o){if(n.disabledUnifications?.includes(i))continue;let s=n.customTypeNames?.[i]??i,a=t[0];for(let l=1;l<t.length;l++)cn(a,t[l]);for(let l=1;l<t.length;l++)t[l].fields=a.fields;for(let l of t)l._sharedTypeName=s}};var ke=(e,n,r="",o={})=>{try{if(!o._openAPIComponent&&Oe(e)){let g=Ce(e);if(g.length>0)return g.map(({name:T,schema:O},v)=>ke(O,n,r,{...o,rootName:T,_openAPIComponent:v>0})).filter(T=>typeof T=="string"&&T.trim()).join(`

`)}if(!o._openAPIComponent&&ve(e)){let g=je(e);if(g.length>0)return g.map(({name:T,schema:O},v)=>ke(O,n,r,{...o,rootName:T,_openAPIComponent:v>0})).filter(T=>typeof T=="string"&&T.trim()).join(`

`)}let t=!!o._openAPIComponent,i=e&&e._isTypeMorphSchema?e:F(e),s=o.rootName??"Root";!t&&!e?._isTypeMorphSchema&&Pr(i,s),t||Us(i,o);let a="",l="",c=(n||r||"").toLowerCase();l=c;let f=s.charAt(0).toLowerCase()+s.slice(1);c==="typescript"||c==="ts"?a=(t?"":`/**
 * TypeMorph Generated TypeScript Interface
 */
`)+gn.generate(i,s,o):c==="zod"?a=(t?"":`import { z } from "zod";

`)+hn.generate(i,f,o):c==="go"||c==="golang"?a=kn.generate(i,s,o):c==="rust"?a=vn.generate(i,s,o):c==="java"?a=Nn.generate(i,s,o):c==="python"?a=(t?"":`from pydantic import BaseModel

`)+$n.generate(i,s,o):c==="php"?a=(t?"":`<?php

`)+Sn.generate(i,s,o):c==="sql"||c==="prisma"?a=En.generate(i,s,o):c==="proto"||c==="protobuf"?a=(t?"":`// Protocol Buffers v3 specification

syntax = "proto3";

`)+An.generate(i,s,o):c==="graphql"||c==="gql"?a=On.generate(i,s,o):c.includes("csv")?a=Vt.generate(i):c.includes("sql-insert")?a=zt.generate(i,"table_name"):c.includes("mysql")?a=Yt.generate(i,"Root"):c.includes("postgres")?a=Ht.generate(i,"Root"):c.includes("sqlite")?a=Wt.generate(i,"Root"):c.includes("snowflake")?a=Kt.generate(i,"Root"):c.includes("mongodb")||c.includes("mongoose")?a=pr.generate(i,"Root"):c.includes("ruby")||c.includes("rails")?a=Lr.generate(i,"Root"):c.includes("django")?a=Ir.generate(i,"Root"):c.includes("dart")||c.includes("flutter")?a=Tn.generate(i,"Root",o):c.includes("swift")?a=Mn.generate(i):c.includes("kotlin")?a=Dn.generate(i):c.includes("csharp")||c.includes("c-sharp")?a=In.generate(i):c.includes("openapi")?a=ar.generate(i,"Root"):c.includes("jsonschema")?a=Gn.generate(i):c.includes("yup")?a=Se.generate(i,"root"):c.includes("joi")?a=xe.generate(i,"root"):c.includes("valibot")?a=$e.generate(i,"root"):c.includes("react-props")?a=hr.generate(i,"Component"):c.includes("vue-props")?a=xr.generate(i,"Component"):c.includes("svelte-props")?a=$r.generate(i,"Component"):c.includes("solid-props")?a=Ar.generate(i,"Component"):c.includes("react-context")?a=br.generate(i,"Root"):c.includes("react-query")?a=Fr.generate(i,s):c.includes("api-route")||c.includes("nextjs-api")?a=Mr.generate(i,s):c.includes("redux-slice")?a=Tr.generate(i,"root"):c.includes("pinia")?a=Sr.generate(i,"root"):c.includes("sequelize")?a=mr.generate(i,"Root"):c.includes("typeorm")?a=dr.generate(i,"Root"):c.includes("drizzle")?a=yr.generate(i,"Root"):c.includes("kysely")?a=gr.generate(i,"Root"):c.includes("superstruct")?a=Ae.generate(i,"root"):c.includes("arduino")?a=Or.generate(i,"Data"):c.includes("mock")?a=wn.generate(i):c.includes("ui")?a=Rn.generate(i,"Component"):c.includes("asciidoc")?a=nr.generate(i):c.includes("doc")?a=pe.generate(i):c.includes("avro")?a=ir.generate(i,"Root"):c.includes("toml")?a=Jt.generate(i,"config"):c.includes("yaml")?a=Qt.generate(i):c.includes("env")?a=Xt.generate(i):c.includes("properties")?a=Zt.generate(i):c.includes("markdown")?a=er.generate(i):c.includes("latex")?a=tr.generate(i):c.includes("mermaid")?a=rr.generate(i,"Root"):c.includes("bigquery")?a=or.generate(i):c.includes("dynamodb")?a=sr.generate(i,"Root"):c.includes("postman")?a=lr.generate(i):c.includes("http")?a=cr.generate(i):c.includes("vscode")?a=ur.generate(i):c.includes("curl")?a=fr.generate(i):c.includes("cobol")?a=Cr.generate(i,"ROOT"):c.includes("clojure")?a=vr.generate(i,"Root"):c.includes("elixir")?a=jr.generate(i,"Root"):c.includes("elm")?a=kr.generate(i,"Root"):c.includes("godot")||c.includes("gdscript")?a=Nr.generate(i,"Root"):c.includes("haskell")?a=Er.generate(i,"Root"):c.includes("r-lang")||c==="r"?(a=Rr.generate(i,"Root"),l="r-lang"):c.includes("scala")?a=wr.generate(i,"Root"):c.includes("solidity")&&(a=_r.generate(i,"Root"));let u=new Set(["typescript","ts","zod","go","golang","rust","java","python","php","sql","prisma","proto","protobuf","graphql","gql","json","r"]),p=["csv","sql-insert","mysql","postgres","sqlite","snowflake","mongodb","mongoose","ruby","rails","django","dart","flutter","swift","kotlin","csharp","c-sharp","openapi","jsonschema","yup","joi","valibot","react-props","vue-props","svelte-props","solid-props","react-context","react-query","api-route","nextjs-api","redux-slice","pinia","sequelize","typeorm","drizzle","kysely","superstruct","arduino","mock","ui","doc","avro","toml","yaml","env","properties","markdown","asciidoc","latex","mermaid","bigquery","dynamodb","postman","http","vscode","curl","cobol","clojure","elixir","elm","godot","gdscript","haskell","r-lang","scala","solidity"],m=u.has(c)||p.some(g=>c.includes(g));c==="json"?a=JSON.stringify(e,null,2):!a&&m?a=`// No output generated for "${n||r||c}". The input may be empty or lack the structure this format expects.`:a||(l="unsupported",Dr(n||r||"unknown",c),a=`// Unsupported output target: "${n||r||"unknown"}"
// Supported targets include: typescript, zod, go, rust, java, python, php, sql, protobuf, graphql, swift, kotlin, jsonschema, mock, ui, doc, openapi, yup, joi, valibot, react-props, vue-props, svelte-props, solid-props, react-context, redux-slice, pinia, sequelize, typeorm, drizzle, kysely, superstruct, arduino, clojure, elixir, elm, godot, haskell, r, scala, solidity
`);let d="",y=l.toLowerCase();for(let[g,h]of Object.entries(Ds))if(y===g){d=h;break}let b=d&&!t?d+a:a;return Gs(b)}catch(t){return"// Error: "+String(t)}};var Bs=/email|url|link|href|website|endpoint|uuid|guid|^id$|_id$|Id$|ID$|date|_at$|At$|time|timestamp|phone|tel|zip|postal|ip$|ip_|token|hash/i,Vs=/^(name|label|title|description|desc|summary|body|content|text|message|note|notes|comment|comments|bio|about|reason|details|info|caption|heading|subtitle|excerpt|overview|remark|remarks|placeholder|hint|tooltip|instruction|instructions|query|search|address|street|city|country|state|province|slug|tag|category|type|status|kind|mode|locale|lang|language|currency|unit|format|source|target|key|value|data)$/i,zs=/password|passwd|secret|token|apikey|api_key|auth|credential|private/i,Ys={email:/email/i,url:/url|link|href|website|endpoint/i,uuid:/uuid|guid/i,id:/^id$|_id$|Id$|ID$/,date:/date|_at$|At$|time|timestamp/i,phone:/phone|tel/i,ip:/^ip$|ip_|ipAddr|ip_address/i};function Hs(e){return/^[a-z][a-zA-Z0-9]*$/.test(e)&&e!==e.toUpperCase()}function Ws(e){return/^[a-z][a-z0-9_]*$/.test(e)&&e.includes("_")}function Ks(e){return/^[A-Z][a-zA-Z0-9]*$/.test(e)}function Vr(e){return Ws(e)?"snake_case":Ks(e)?"PascalCase":Hs(e)?"camelCase":"other"}function un(e,n,r,o,t){if(!(r>20))if(o.maxDepth=Math.max(o.maxDepth,r),e.type==="object"&&e.fields)for(let[i,s]of Object.entries(e.fields)){let a=n?`${n}.${i}`:i;if(o.total++,o.nameCounts[Vr(i)]=(o.nameCounts[Vr(i)]??0)+1,s.type==="any"&&(o.anyCount++,t.push({severity:"warning",message:"Has `any` type \u2014 add a specific type",path:a})),s.optional?o.optionalCount++:o.requiredCount++,s.type==="string"){let l=!!s.format,c=Object.values(Ys).some(f=>f.test(i));l||c?o.formattedCount++:Bs.test(i)&&!Vs.test(i)&&o.semanticUnformatted.push({path:a}),zs.test(i)&&t.push({severity:"info",message:"May contain sensitive data \u2014 consider hashing or omitting",path:a})}un(s,a,r+1,o,t)}else e.type==="array"&&e.itemType&&un(e.itemType,`${n}[]`,r+1,o,t)}function Js(e){let n=Object.entries(e).filter(([,i])=>i>0);if(n.length===0)return"unknown";n.sort((i,s)=>s[1]-i[1]);let r=n.reduce((i,[,s])=>i+s,0),[o,t]=n[0];return t/r>=.8?o:"mixed"}function Qs(e){return e>=90?"A":e>=75?"B":e>=60?"C":e>=40?"D":"F"}function zr(e){let n=[],r={total:0,anyCount:0,formattedCount:0,semanticUnformatted:[],optionalCount:0,requiredCount:0,nameCounts:{camelCase:0,snake_case:0,PascalCase:0,other:0},maxDepth:0};un(e,"",0,r,n);let o=100;if(r.total>0){let i=r.anyCount/r.total,s=Math.round(i*50);s>0&&(o-=s)}if(r.semanticUnformatted.length>0){let i=Math.min(20,r.semanticUnformatted.length*5);o-=i;for(let{path:s}of r.semanticUnformatted.slice(0,3))n.push({severity:"info",message:"Looks like it needs a format constraint (uuid, email, datetime\u2026)",path:s});r.semanticUnformatted.length>3&&n.push({severity:"info",message:`${r.semanticUnformatted.length-3} more fields may need format constraints`})}let t=Js(r.nameCounts);if(t==="mixed"&&r.total>=3&&(o-=15,n.push({severity:"warning",message:"Field names mix camelCase and snake_case \u2014 pick one style consistently"})),r.maxDepth>4){let i=Math.min(10,(r.maxDepth-4)*2);o-=i,r.maxDepth>6&&n.push({severity:"warning",message:`Schema is ${r.maxDepth} levels deep \u2014 consider flattening or splitting`})}return r.total>=3&&r.requiredCount===0&&(o-=10,n.push({severity:"warning",message:"All fields are optional \u2014 mark required fields to improve type safety"})),r.total===1&&n.push({severity:"info",message:"Only 1 field \u2014 quality score is based on limited data"}),o=Math.max(0,Math.min(100,o)),{score:o,grade:Qs(o),issues:n,stats:{totalFields:r.total,anyFields:r.anyCount,formattedFields:r.formattedCount,optionalFields:r.optionalCount,requiredFields:r.requiredCount,maxDepth:r.maxDepth,namingStyle:t}}}function Yr(e,n,r="root"){let o=[];function t(i,s,a){let l=a.replace(/^root\.?/,"")||"root";if(i.type!==s.type){o.push({path:l,type:"type_changed",oldType:i.type,newType:s.type,severity:"error",description:`'${l}' changed type from '${i.type}' to '${s.type}'.`});return}!i.optional&&s.optional&&o.push({path:l,type:"required_changed",severity:"warning",description:`'${l}' changed from required to optional. Consumers must handle undefined.`}),i.optional&&!s.optional&&o.push({path:l,type:"required_changed",severity:"error",description:`'${l}' changed from optional to required. Existing payloads missing this field will be invalid.`}),!i.nullable&&s.nullable&&o.push({path:l,type:"nullable_changed",severity:"info",description:`'${l}' became nullable. Add null-checks if needed.`}),i.nullable&&!s.nullable&&o.push({path:l,type:"nullable_changed",severity:"warning",description:`'${l}' is no longer nullable. Existing null values will be invalid.`}),(i.format??"")!==(s.format??"")&&o.push({path:l,type:"format_changed",oldType:i.format??"none",newType:s.format??"none",severity:i.format&&!s.format?"warning":"info",description:`'${l}' format changed from '${i.format??"none"}' to '${s.format??"none"}'.`});let c=i.enumValues??[],f=s.enumValues??[];if(c.length>0||f.length>0){let u=c.filter(m=>!f.includes(m)),p=f.filter(m=>!c.includes(m));u.length>0&&o.push({path:l,type:"enum_changed",severity:"error",description:`Enum values removed from '${l}': ${u.map(m=>`"${m}"`).join(", ")}. Existing data with these values will be invalid.`}),p.length>0&&o.push({path:l,type:"enum_changed",severity:"info",description:`New enum values added to '${l}': ${p.map(m=>`"${m}"`).join(", ")}.`})}if(i.type==="object"&&s.type==="object"){let u=i.fields??{},p=s.fields??{};for(let m of Object.keys(u))if(!(m in p)){let d=!u[m].optional;o.push({path:`${l==="root"?"":l+"."}${m}`,type:"removed",oldType:u[m].type,severity:d?"error":"warning",description:d?`Required field '${m}' was removed. This is a breaking change.`:`Optional field '${m}' was removed.`})}for(let m of Object.keys(p))if(!(m in u)){let d=!p[m].optional;o.push({path:`${l==="root"?"":l+"."}${m}`,type:"added",newType:p[m].type,severity:d?"error":"info",description:d?`New required field '${m}' added. Existing payloads missing this field will be invalid.`:`New optional field '${m}' added.`})}for(let m of Object.keys(u))m in p&&t(u[m],p[m],`${a}.${m}`)}i.type==="array"&&s.type==="array"&&i.itemType&&s.itemType&&t(i.itemType,s.itemType,`${a}[]`)}return t(e,n,r),o}var U=e=>`\x1B[1m${e}\x1B[0m`,B=e=>`\x1B[2m${e}\x1B[0m`,D=e=>`\x1B[31m${e}\x1B[0m`,we=e=>`\x1B[33m${e}\x1B[0m`,Ee=e=>`\x1B[32m${e}\x1B[0m`,Xs=e=>`\x1B[36m${e}\x1B[0m`,Zs=e=>`\x1B[34m${e}\x1B[0m`;function Ne(e){let n=Wr.resolve(e);return Re.existsSync(n)||(console.error(D(`File not found: ${e}`)),process.exit(1)),Re.readFileSync(n,"utf8")}function Hr(){return new Promise(e=>{let n="",r=Kr.createInterface({input:process.stdin});r.on("line",o=>n+=o+`
`),r.on("close",()=>e(n.trim()))})}function Jr(e){let n=e.trim();try{return{obj:JSON.parse(n),raw:n}}catch{}try{return{obj:tn(n),raw:n}}catch{}console.error(D("typemorph: input is not valid JSON or YAML")),process.exit(1)}function fn(e){let{obj:n}=Jr(e);return Oe(n)?Ce(n)[0]?.schema??F(n):ve(n)?je(n)[0]?.schema??F(n):F(n)}var ea={"TypeScript / Validation":["typescript","zod","yup","joi","valibot"],Backend:["go","rust","java","csharp","python","swift","kotlin","php","dart"],Database:["prisma","mysql","postgres","sqlite","mongoose","sequelize","typeorm","drizzle","dynamodb","bigquery","mongodb"],"API / Schema":["openapi","graphql","proto","jsonschema"],"Data / Markup":["csv","sql","toml","yaml","avro"],"Docs / Mock":["doc","mock"]};function na(){console.log(U(`
  typemorph \u2014 available formats
`));for(let[e,n]of Object.entries(ea))console.log(U(`  ${e}`)),console.log(B("  "+n.join("  "))),console.log();console.log(B(`  Usage: typemorph <format> [file.json]  or  cat data.json | typemorph <format>
`))}var ta=`
${U("typemorph")} \u2014 schema engineering CLI

${U("USAGE")}
  typemorph <format> [file]           Convert schema to target format
  typemorph quality  [file]           Grade schema quality (A\u2013F)
  typemorph diff     <old> <new>      Detect breaking changes
  typemorph list                      Show all formats

${U("OPTIONS")}
  --root, -r <name>     Root class name (default: Root)
  --breaking-only       Only show breaking changes  (diff)
  --version, -v         Show version
  --help,    -h         Show this help

${U("EXAMPLES")}
  cat schema.json | typemorph typescript
  typemorph zod       schema.json --root User
  typemorph go        schema.json > models.go
  typemorph quality   schema.json
  typemorph diff      v1.json v2.json
  typemorph diff      v1.json v2.json --breaking-only
  typemorph list
`;function ra(e,n){return e==="A"?Ee(n):e==="B"?Xs(n):e==="C"?we(n):D(n)}function ia(e){let n=fn(e),r=zr(n),{score:o,grade:t,issues:i,stats:s}=r,a=ra(t,`${t}  ${o}/100`);if(console.log(`
  ${U("Schema Quality Score")}  ${a}
`),console.log(B(`  Fields: ${s.totalFields}  |  any: ${s.anyFields}  |  optional: ${s.optionalFields}  |  naming: ${s.namingStyle}  |  depth: ${s.maxDepth}`)),i.length===0)console.log(Ee(`
  \u2713 No issues found`));else{console.log();for(let l of i){let c=l.severity==="error"?D("\u2716"):l.severity==="warning"?we("\u26A0"):B("\u2139"),f=l.path?B(` [${l.path}]`):"";console.log(`  ${c}  ${l.message}${f}`)}}console.log()}function oa(e){return e.severity==="error"?D(`\u2716  ${e.description}`):e.severity==="warning"?we(`\u26A0  ${e.description}`):B(`\u2139  ${e.description}`)}function sa(e,n,r){let o=fn(e),t=fn(n),i=Yr(o,t),s=r?i.filter(u=>u.severity==="error"):i,a=i.filter(u=>u.severity==="error").length,l=i.filter(u=>u.severity==="warning").length,c=Math.max(0,100-a*15-l*5),f=c>=90?Ee(`${c}/100`):c>=60?we(`${c}/100`):D(`${c}/100`);if(console.log(`
  ${U("Breaking Change Detector")}  Compatibility ${f}  ${B("(\u221215/breaking \xB7 \u22125/warning)")}
`),s.length===0)console.log(Ee("  \u2713 No "+(r?"breaking ":"")+"changes detected"));else for(let u of s){let p=u.path?Zs(`  ${u.path}`):"";console.log(`${p}`),console.log(`    ${oa(u)}`)}console.log(B(`
  ${a} breaking  \xB7  ${l} warnings  \xB7  ${i.filter(u=>u.severity==="info").length} info
`)),a>0&&process.exit(1)}function aa(e,n,r){let{obj:o}=Jr(n);try{let t=ke(o,e,{rootName:r});(!t||t.startsWith("// Unsupported"))&&(console.error(D(`typemorph: unsupported format "${e}". Run \`typemorph list\` to see all formats.`)),process.exit(1)),process.stdout.write(t)}catch(t){console.error(D(`typemorph: ${t?.message??String(t)}`)),process.exit(1)}}async function la(){let e=process.argv.slice(2);if(e.length===0||e.includes("--help")||e.includes("-h")){console.log(ta);return}if(e.includes("--version")||e.includes("-v")){console.log("0.2.0");return}let n=e[0];if(n==="list"){na();return}let r=e.findIndex(a=>a==="--root"||a==="-r"),o=r!==-1?e[r+1]:"Root";if(n==="quality"){let a=e.slice(1).find(c=>!c.startsWith("-")&&c!==o),l=a?Ne(a):await Hr();ia(l);return}if(n==="diff"){let a=e.slice(1).filter(c=>!c.startsWith("-")&&c!==o);a.length<2&&(console.error(D("Usage: typemorph diff <old.json> <new.json>")),process.exit(1));let l=e.includes("--breaking-only");sa(Ne(a[0]),Ne(a[1]),l);return}let t=n,i=e.slice(1).find(a=>!a.startsWith("-")&&a!==o),s=i?Ne(i):await Hr();aa(t,s,o)}la().catch(e=>{console.error(D(`typemorph: ${e?.message??String(e)}`)),process.exit(1)});
