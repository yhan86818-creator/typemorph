#!/usr/bin/env node
"use strict";var xs=Object.create;var lt=Object.defineProperty;var As=Object.getOwnPropertyDescriptor;var js=Object.getOwnPropertyNames;var Os=Object.getPrototypeOf,Ns=Object.prototype.hasOwnProperty;var ws=(e,n,t,o)=>{if(n&&typeof n=="object"||typeof n=="function")for(let r of js(n))!Ns.call(e,r)&&r!==t&&lt(e,r,{get:()=>n[r],enumerable:!(o=As(n,r))||o.enumerable});return e};var bn=(e,n,t)=>(t=e!=null?xs(Os(e)):{},ws(n||!e||!e.__esModule?lt(t,"default",{value:e,enumerable:!0}):t,e));var Re=bn(require("fs")),ot=bn(require("path")),Ss=bn(require("readline"));var Ye=e=>e.replace(/(^\w|_\w)/g,n=>n.replace(/_/,"").toUpperCase()),Ke=(e,n)=>e?e.kind==="classRef"?e.classRefName===n:e.kind==="array"?Ke(e.itemType,n):e.kind==="record"?Ke(e.recordValueType,n):e.kind==="tuple"?(e.tupleTypes??[]).some(t=>Ke(t,n)):!1:!1,ce=(e,n)=>{if(e.type!=="array"||!e.itemType)return null;let t=e.itemType._sharedTypeName;return t||(n.endsWith("ies")?t=n.slice(0,-3)+"y":n.endsWith("s")?t=n.slice(0,-1):n.endsWith("List")?t=n.slice(0,-4):t=n+"Item"),t.includes("_")?t.split("_").map(o=>Ye(o)).join(""):Ye(t)},Y=(e,n,t)=>{if(e.type==="object"&&e.recordValueType)return{kind:"record",recordValueType:Y(e.recordValueType,n+"_"+t,"Value")};if(e.type==="array"&&e.tupleTypes)return{kind:"tuple",tupleTypes:e.tupleTypes.map(c=>Y(c,n+"_"+t,"Item"))};let o=e.refinements?.length?{refinements:e.refinements}:{};if(e.type==="union"&&e.unionTypes)return{kind:"union",unionTypes:e.unionTypes};let r=e.literalValue!==void 0?{literalValue:e.literalValue}:{},i=e.coerced?{coerced:!0}:{},s=e.rawZodType?{rawZodType:e.rawZodType}:{};if(e.type==="string")return e.enumValues?{kind:"enum",enumValues:e.enumValues,...r,...o}:e.format==="date"?{kind:"date",format:"date",...o}:e.format==="datetime"?{kind:"datetime",format:"datetime",...o}:{kind:"string",format:e.format,...i,...s,...o};if(e.type==="object")return{kind:"classRef",classRefName:e._sharedTypeName??n+"_"+t};if(e.type==="array"&&e.itemType){let c=n+"_"+t;if(e.itemType.type==="object"){let u=e.itemType._sharedTypeName;return u||(c.endsWith("ies")?u=c.slice(0,-3)+"y":c.endsWith("s")?u=c.slice(0,-1):c.endsWith("List")?u=c.slice(0,-4):u=c+"_Item"),{kind:"array",itemType:{kind:"classRef",classRefName:u},...o}}return{kind:"array",itemType:Y(e.itemType,c,"Item"),...o}}return{kind:{number:"number",boolean:"boolean",any:"any",union:"union"}[e.type]??"any",format:e.format,...r,...i,...o}},ks=(e,n={})=>{let t=e.map(i=>({...i,fields:[...i.fields],annotations:i.annotations?[...i.annotations]:void 0})),o=n.flattenWrappers!==!1;if(n.extractTimestamps!==!1){let i=["createdAt","updatedAt","deletedAt","created_at","updated_at","deleted_at"],s=!1,a=[];for(let l of t){let c=l.fields.filter(u=>i.includes(u.name));if(c.length>=2&&a.length===0){a=c.map(u=>({...u,docComment:"Audit timestamp metadata"}));break}}if(a.length>=2)for(let l of t){if(l.name==="TimestampModel")continue;let c=l.fields.filter(f=>i.includes(f.name)),u=c.length===a.length&&c.every(f=>a.some(m=>m.name===f.name));c.length>=2&&u&&(s||(t.push({name:"TimestampModel",fields:a,isShared:!0,docComment:"Base audit trail timestamp fields"}),s=!0),l.fields=l.fields.filter(f=>!i.includes(f.name)),l.annotations||(l.annotations=[]),l.annotations.push("extends TimestampModel"))}}if(o){let i=!0,s=new Set;for(;i;){i=!1;for(let a=0;a<t.length;a++){let l=t[a];if(l.name!=="Root"&&l.fields.length===1){let c=l.fields[0];if(c.fieldType.kind==="classRef"){let u=c.fieldType.classRefName;if(!u||u===l.name||s.has(u))continue;let f=t.find(m=>m.name===u);if(f&&(f.fields.length>1||(f.annotations?.length??0)>0)){if(l.fields=f.fields.map(p=>({...p,docComment:`[Flattened from ${u}] ${p.docComment??""}`})),f.annotations&&f.annotations.length>0){l.annotations||(l.annotations=[]);for(let p of f.annotations)l.annotations.includes(p)||l.annotations.push(p)}t.some(p=>p!==l&&p.name!==u&&(p.fields.some(d=>Ke(d.fieldType,u))||(p.annotations?.includes(`extends ${u}`)??!1)))||(t=t.filter(p=>p.name!==u)),s.add(u),i=!0;break}}}}}}return t},L=(e,n="Root",t={})=>{let o=[],r=new Set,i=new Set,s=(a,l)=>{if(r.has(a))return;if(r.add(a),a.type==="array"&&a.itemType){let f=a.itemType._sharedTypeName;f||(l.endsWith("ies")?f=l.slice(0,-3)+"y":l.endsWith("s")?f=l.slice(0,-1):l.endsWith("List")?f=l.slice(0,-4):f=l+"Item"),s(a.itemType,f);return}if(a.type==="object"&&a.recordValueType){let f=a.recordValueType;f.type==="object"?s(f,l+"_Value"):f.type==="array"&&f.itemType?.type==="object"&&s(f.itemType,l+"_Value_Item");return}if(a.type!=="object"||!a.fields||a._sharedTypeName&&i.has(a._sharedTypeName))return;let c=a._sharedTypeName??l;i.add(c);let u=[];for(let[f,m]of Object.entries(a.fields)){let p=Y(m,c,f);u.push({name:f,fieldType:p,isOptional:!!m.optional,isNullable:!!m.nullable,annotations:[],docComment:""})}o.push({name:c,fields:u,annotations:[],isShared:!!a._sharedTypeName});for(let[f,m]of Object.entries(a.fields)){let p=m._sharedTypeName??c+"_"+f;if(m.type==="object"&&s(m,p),m.type==="array"&&m.itemType?.type==="object"){let d=m.itemType._sharedTypeName;d||(f.endsWith("ies")?d=p.slice(0,-3)+"y":f.endsWith("s")?d=p.slice(0,-1):f.endsWith("List")?d=p.slice(0,-4):d=p+"_Item"),s(m.itemType,d)}}};return s(e,n),vs(ks(o,t))},vs=e=>{let n=new Map,t=new Map,o=new Map;for(let f of e){let m=f.name,p=m.includes("_")?m.split("_").map(d=>Ye(d)).join(""):Ye(m);if(m==="TimestampModel"&&(p="TimestampModel"),n.has(p)){let d=n.get(p)+1;n.set(p,d);let y=`${p}_v${d}`;t.set(f,y),o.set(m,y)}else n.set(p,1),t.set(f,p),o.set(m,p)}for(let[f,m]of t.entries())f.name=m;let r=f=>{if(f){if(f.kind==="classRef"&&f.classRefName&&o.has(f.classRefName)&&(f.classRefName=o.get(f.classRefName)),f.kind==="array"&&f.itemType&&r(f.itemType),f.kind==="union"&&f.unionTypes)for(let m of f.unionTypes)r(m);if(f.kind==="record"&&f.recordValueType&&r(f.recordValueType),f.kind==="tuple"&&f.tupleTypes)for(let m of f.tupleTypes)r(m)}};for(let f of e)for(let m of f.fields)r(m.fieldType);let i=[],s=new Set,a=new Set,l=new Map(e.map(f=>[f.name,f])),c=f=>{if(s.has(f.name)||a.has(f.name))return;a.add(f.name);let m=f.annotations?.find(p=>p.startsWith("extends "));if(m){let p=m.slice(8),d=l.get(p);d&&c(d)}a.delete(f.name),s.add(f.name),i.push(f)},u=e.find(f=>f.name==="TimestampModel");u&&c(u);for(let f of e)c(f);return e.length=0,e.push(...i),e};var k=e=>e.replace(/(^\w|_\w)/g,n=>n.replace(/_/,"").toUpperCase()),Cs=e=>{let t=e.split(/[^A-Za-z0-9]+/).filter(Boolean).map(o=>o.charAt(0).toUpperCase()+o.slice(1)).join("");return t||(t="Field"),/^[0-9]/.test(t)&&(t="F"+t),t},Rs=new Set(["False","None","True","and","as","assert","async","await","break","class","continue","def","del","elif","else","except","finally","for","from","global","if","import","in","is","lambda","nonlocal","not","or","pass","raise","return","try","while","with","yield","match","case"]),_s=e=>{let n=e.replace(/[^A-Za-z0-9_]/g,"_");return/^[A-Za-z_]/.test(n)||(n="f_"+n),Rs.has(n)&&(n=`${n}_`),n},gt=e=>e.split(/[^A-Za-z0-9]+/).filter(Boolean),ne=(e,n)=>{let t=gt(e);return t.length===0?n==="snake"?"field":"Field":n==="snake"?t.join("_").toLowerCase():t.map((o,r)=>n==="camel"&&r===0?o.charAt(0).toLowerCase()+o.slice(1):o.charAt(0).toUpperCase()+o.slice(1)).join("")},P=e=>{let n=e.annotations?.find(t=>t.startsWith("extends "));return n?n.slice(8):null},B=e=>{let n=k(e);return n.charAt(0).toLowerCase()+n.slice(1)},Es=(e,n)=>{let t=e.itemType?._sharedTypeName;return t?k(t):n.endsWith("ies")?k(n.slice(0,-3)+"y"):n.endsWith("s")?k(n.slice(0,-1)):n.endsWith("List")?k(n.slice(0,-4)):k(n+"Item")},Tn=e=>e?e.type==="object"?e.recordValueType?Tn(e.recordValueType):!!e.fields&&Object.keys(e.fields).length>0:e.type==="array"?Tn(e.itemType):!1:!1,Is=e=>Object.values(e).some(n=>n.type==="object"&&n.fields?Object.values(n.fields).some(Tn):!1),On=e=>{let n=new Set,t=new Map;for(let o of e){let r=ne(o,"pascal"),i=r,s=2;for(;n.has(i);)i=`${r}${s++}`;n.add(i),t.set(o,i)}return t},Nn=(e,n)=>{let t=new Map,o=k(n),r=(i,s)=>{let a=i.itemType;if(a?.discriminatorField&&a?.discriminatedVariants){if(Is(a.discriminatedVariants))return;t.set(Es(i,s),{discriminatorField:a.discriminatorField,variants:a.discriminatedVariants})}};if(e.type==="array"&&r(e,o),e.type==="object"&&e.fields){for(let[i,s]of Object.entries(e.fields))if(s.type==="array"){let a=s._sharedTypeName?k(s._sharedTypeName):k(o+"_"+i);r(s,a)}}return t},ue=e=>{switch(e.kind){case"union":return e.unionTypes?e.unionTypes.join(" | "):"any";case"enum":return e.enumValues?e.enumValues.map(n=>`"${n}"`).join(" | "):"string";case"date":case"datetime":return"Date";case"classRef":return e.classRefName??"any";case"array":if(e.itemType){let n=ue(e.itemType);return e.itemType.kind==="union"||e.itemType.kind==="enum"?`(${n})[]`:`${n}[]`}return"any[]";case"record":return`Record<string, ${e.recordValueType?ue(e.recordValueType):"any"}>`;case"tuple":return`[${(e.tupleTypes??[]).map(n=>ue(n)).join(", ")}]`;default:return e.kind}},ht={generate:(e,n="Root",t={})=>{let o=Nn(e,n),r=L(e,n,t),i="";if(e.type==="array"&&e.itemType){let s=ce(e,n);if(s?r.some(l=>l.name===s):!1)i+=`export type ${k(n)} = ${s}[];

`;else{let l=Y(e.itemType,n,"Item");i+=`export type ${k(n)} = ${ue(l)}[];

`}}else if(e.type==="object"&&e.recordValueType){let s=k(n),a=e.recordValueType,l;if(a.type==="object"&&a.fields){let c=a._sharedTypeName??`${s}_Value`;l=c.includes("_")?c.split("_").map(u=>k(u)).join(""):k(c)}else l=ue(Y(a,s,"Value"));i+=`export type ${s} = Record<string, ${l}>;

`}for(let s of r){let a=o.get(s.name);if(a){let m=On(Object.keys(a.variants));for(let[d,y]of Object.entries(a.variants)){let g=`${s.name}${m.get(d)}`;i+=`export interface ${g} {
`;for(let[b,h]of Object.entries(y.fields??{}))if(b===a.discriminatorField)i+=`  ${X(b)}: ${JSON.stringify(d)};
`;else{let $=Y(h,g,b),T=ue($),S=h.optional?"?":"",v=h.nullable?" | null":"";i+=`  ${X(b)}${S}: ${T}${v};
`}i+=`}

`}let p=Object.keys(a.variants).map(d=>`${s.name}${m.get(d)}`);i+=`export type ${s.name} = ${p.join(" | ")};

`;continue}let l=P(s),c=l?` extends ${l}`:"",u=t.exportDefault&&s.name==="Root"?`export default interface ${s.name}${c}`:`export interface ${s.name}${c}`;i+=`${u} {
`;let f=t.optionalFields;for(let m of s.fields){let p=f||m.isOptional?"?":"",d=`${s.name}.${m.name}`,y=t.customFieldNames?.[d]??m.name,g=ue(m.fieldType);m.isNullable&&(g=g.includes(" | ")?`(${g}) | null`:`${g} | null`),i+=`  ${X(y)}${p}: ${g};
`}i+=`}

`}return i}},wn=e=>{let n=new Map(e.map(l=>[l.name,l])),t=new Set,o=new Set,r=[],i=new Set,s=l=>l.kind==="classRef"&&l.classRefName?[l.classRefName]:l.kind==="array"&&l.itemType?s(l.itemType):l.kind==="record"&&l.recordValueType?s(l.recordValueType):l.kind==="tuple"&&l.tupleTypes?l.tupleTypes.flatMap(s):l.kind==="union"&&l.unionTypes?[]:[],a=l=>{if(t.has(l.name)||o.has(l.name))return;o.add(l.name);let c=P(l);if(c){let u=n.get(c);u&&(o.has(c)||a(u))}for(let u of l.fields)for(let f of s(u.fieldType))if(o.has(f))i.add(f);else{let m=n.get(f);m&&a(m)}o.delete(l.name),t.add(l.name),r.push(l)};for(let l of e)a(l);return{sorted:r,cyclicClassRefs:i}},fe=(e,n,t={})=>{let o=Ms(e,n,t);return e.refinements?.length?o+e.refinements.join(""):o},Ms=(e,n,t={})=>{if(e.rawZodType)return e.rawZodType;if(e.literalValue!==void 0){let o=e.literalValue;return`z.literal(${typeof o=="string"?JSON.stringify(o):o})`}switch(e.kind){case"union":{if(!e.unionTypes||e.unionTypes.length===0)return"z.any()";let o=e.unionTypes.map(r=>fe({kind:r},n,t));return o.length===1?o[0]:`z.union([${o.join(", ")}])`}case"enum":return!e.enumValues||e.enumValues.length===0||e.enumValues.length===1?"z.string()":`z.enum([${e.enumValues.map(o=>`"${o}"`).join(", ")}])`;case"date":return t.inference==="minimal"?"z.string()":t.zodVersion==="v3"?"z.coerce.date()":"z.iso.date()";case"datetime":return t.inference==="minimal"?"z.string()":t.zodVersion==="v3"?"z.string().datetime()":"z.iso.datetime()";case"classRef":{if(!e.classRefName)return"z.any()";let o=`${B(e.classRefName)}Schema`;return n.has(e.classRefName)?`z.lazy(() => ${o})`:o}case"array":return e.itemType?`z.array(${fe(e.itemType,n,t)})`:"z.array(z.any())";case"record":{let o=e.recordValueType?fe(e.recordValueType,n,t):"z.any()";return t.zodVersion==="v3"?`z.record(${o})`:`z.record(z.string(), ${o})`}case"tuple":return!e.tupleTypes||e.tupleTypes.length===0?"z.array(z.any())":`z.tuple([${e.tupleTypes.map(r=>fe(r,n,t)).join(", ")}])`;case"string":return e.coerced?"z.coerce.string()":t.inference==="minimal"?"z.string()":e.format==="email"?t.zodVersion==="v3"?"z.string().email()":"z.email()":e.format==="url"?t.zodVersion==="v3"?"z.string().url()":"z.url()":e.format==="uuid"?t.zodVersion==="v3"?"z.string().uuid()":"z.uuid()":e.format==="color"?"z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)":"z.string()";case"number":return e.coerced||t.zodMode==="loose"?"z.coerce.number()":"z.number()";case"boolean":return e.coerced?"z.coerce.boolean()":"z.boolean()";default:return"z.any()"}},Ee=e=>{switch(e.kind){case"string":case"date":case"datetime":return"string";case"number":return"number";case"boolean":return"boolean";case"classRef":return e.classRefName??"unknown";case"array":return e.itemType?`${Ee(e.itemType)}[]`:"unknown[]";case"record":return`Record<string, ${e.recordValueType?Ee(e.recordValueType):"unknown"}>`;case"tuple":return`[${(e.tupleTypes??[]).map(n=>Ee(n)).join(", ")}]`;case"union":return e.unionTypes?.map(n=>Ee({kind:n})).join(" | ")??"unknown";case"enum":return e.enumValues?.map(n=>`"${n}"`).join(" | ")??"string";default:return"unknown"}},X=e=>/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(e)?e:JSON.stringify(e),Ls=e=>e.split(/[_\-\s]+|(?<=[a-z0-9])(?=[A-Z])/).map(n=>n.toLowerCase()).filter(Boolean),bt={generate:(e,n="root",t={})=>{let o=t.zodMode??"strict",r=o==="loose",i=o==="enterprise",s=t.zodVersion==="v3",a=s?"z.string().email()":"z.email()",l=s?"z.string().url()":"z.url()",c=s?"z.string().uuid()":"z.uuid()",u=t.inference??"smart",f=u==="smart",m=u==="minimal",p={...t,zodMode:o},d=Nn(e,k(n)),y=u==="minimal"?{...t,flattenWrappers:!1,extractTimestamps:!1}:t,g=L(e,k(n),y),b="",{sorted:h,cyclicClassRefs:$}=wn(g);for(let S of h){let v=d.get(S.name);if(v){let _=On(Object.keys(v.variants)),he=[];for(let[w,hn]of Object.entries(v.variants)){let Q=_.get(w),x=B(S.name)+Q,$e=S.name+Q;he.push(`${x}Schema`),b+=`export const ${x}Schema = z.object({
`;for(let[K,Te]of Object.entries(hn.fields??{}))if(K===v.discriminatorField)b+=`  ${X(K)}: z.literal(${JSON.stringify(w)}),
`;else{let le=Y(Te,$e,K),_e=fe(le,$,p);Te.nullable&&(_e+=".nullable()"),(r||Te.optional)&&(_e+=".optional()"),b+=`  ${X(K)}: ${_e},
`}b+=`});
`,b+=`export type ${$e} = z.infer<typeof ${x}Schema>;

`}let be=B(S.name);b+=`export const ${be}Schema = z.discriminatedUnion("${v.discriminatorField}", [
`;for(let w of he)b+=`  ${w},
`;b+=`]);
`,b+=`export type ${S.name} = z.infer<typeof ${be}Schema>;

`;continue}let C=B(S.name),G=P(S),Je=G?B(G):null,gn=$.has(S.name);if(gn){b+=`export type ${S.name} = {
`;for(let _ of S.fields){let he=Ee(_.fieldType),be=_.isOptional||r?"?":"",w=_.isNullable?" | null":"";b+=`  ${X(_.name)}${be}: ${he}${w};
`}b+=`};

`}let at=gn?`: z.ZodType<${S.name}>`:"";Je?b+=`export const ${C}Schema${at} = ${Je}Schema.extend({
`:b+=`export const ${C}Schema${at} = z.object({
`;for(let _ of S.fields){let he=t.optionalFields||_.isOptional||r?".optional()":"",be=_.isNullable?".nullable()":"",w=fe(_.fieldType,$,p),hn=`${S.name}.${_.name}`,Q=t.customFieldNames?.[hn]??_.name,x=Q.toLowerCase(),$e=Ls(Q),K=(...le)=>le.some(_e=>$e.includes(_e));!r&&!_.fieldType.refinements?.length&&(_.fieldType.kind==="number"&&(f?x.includes("percent")?w+=".min(0).max(100)":x.includes("latitude")||x==="lat"||x.endsWith("_lat")?w+=".min(-90).max(90)":x.includes("longitude")||x==="lng"||x==="lon"||x.endsWith("_lng")||x.endsWith("_lon")?w+=".min(-180).max(180)":x.includes("rating")?w+=".min(0).max(5)":x.includes("score")?w+=".min(0).max(100)":K("age")?w+=".int().min(0).max(150)":x.includes("year")?w+=".int().min(1900).max(2100)":x.includes("month")&&!x.includes("monthly")?w+=".int().min(1).max(12)":x==="day"||x.endsWith("_day")||x.startsWith("day_")?w+=".int().min(1).max(31)":x.includes("hour")?w+=".int().min(0).max(23)":x.includes("minute")||x.includes("second")?w+=".int().min(0).max(59)":K("count","quantity","qty")?w+=".int().min(0)":K("price","amount","cost","fee","rank","total","subtotal")?w+=".min(0)":x==="port"||x.endsWith("_port")||x==="portnumber"||x==="port_number"?w+=".int().min(1).max(65535)":_.fieldType.format==="int"&&(w+=".int()"):!m&&_.fieldType.format==="int"&&(w+=".int()")),f&&_.fieldType.kind==="string"&&!_.fieldType.format&&(x.includes("email")?w=a:x.includes("url")||x.includes("link")||x.includes("website")?w=l:x.includes("uuid")||(x.endsWith("_id")||/Id$/.test(Q)||/ID$/.test(Q))&&_.fieldType.format==="uuid"?w=c:x==="ip"||x.includes("ip_address")||x.includes("ipaddress")||x==="remote_ip"||x==="client_ip"||x==="server_ip"?w=s?"z.string().ip()":"z.union([z.ipv4(), z.ipv6()])":x.includes("phone")||x==="tel"||x==="telephone"||x.endsWith("_tel")||x.startsWith("tel_")?w="z.string().regex(/^\\+?[\\d\\s\\-\\.\\(\\)]{7,15}$/)":x.includes("password")||x.includes("passwd")?w="z.string().min(8)":x==="zip"||x==="zipcode"||x==="zip_code"||x==="postal_code"||x==="postcode"?w="z.string().regex(/^[A-Z0-9][A-Z0-9\\s\\-]{1,8}[A-Z0-9]$/i)":x==="semver"?w="z.string().regex(/^\\d+\\.\\d+(\\.\\d+)?(-[\\w.]+)?(\\+[\\w.]+)?$/)":x.includes("slug")?w="z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)":x==="countrycode"||x==="country_code"?w="z.string().length(2)":(x.includes("name")||x.includes("label")||x.includes("title"))&&(w="z.string().trim()")),f&&_.fieldType.kind==="any"&&_.isNullable&&($e[$e.length-1]==="at"||K("timestamp","datetime")?w=s?"z.string().datetime()":"z.iso.datetime()":K("date")?w=s?"z.coerce.date()":"z.iso.date()":K("time")?w=s?"z.string().datetime()":"z.iso.datetime()":x.includes("email")?w=a:(x.includes("url")||x.includes("link")||x.includes("website"))&&(w=l))),_.fieldType.kind==="number"&&_.fieldType.format==="int"&&_.fieldType.refinements?.length&&!w.includes(".int(")&&(w=w.replace(/^(z\.(?:coerce\.)?number\(\))/,"$1.int()"));let Te=`${w}${be}${he}`;if(i){let le=Q.replace(/_/g," ").replace(/([A-Z])/g," $1").trim().toLowerCase();Te+=`.describe('${le}')`}b+=`  ${X(Q)}: ${Te},
`}b+=`})${r?".passthrough()":i?".strict()":""};
`,gn?b+=`
`:b+=`export type ${S.name} = z.infer<typeof ${C}Schema>;

`}let T=ce(e,k(n));if(T&&g.some(S=>S.name===T)){let S=k(n),v=B(S);b+=`export const ${v}Schema = z.array(${B(T)}Schema);
`,b+=`export type ${S} = z.infer<typeof ${v}Schema>;

`}if(e.type==="object"&&e.recordValueType){let S=k(n),v=B(S),C=Y(e.recordValueType,S,"Value"),G=fe(C,$,p),Je=t.zodVersion==="v3"?`z.record(${G})`:`z.record(z.string(), ${G})`;b+=`export const ${v}Schema = ${Je};
`,b+=`export type ${S} = z.infer<typeof ${v}Schema>;

`}return b}},$t=e=>{switch(e.kind){case"union":return"dynamic";case"enum":return"String";case"date":case"datetime":return"DateTime";case"classRef":return e.classRefName??"dynamic";case"array":return e.itemType?`List<${$t(e.itemType)}>`:"List<dynamic>";case"string":return"String";case"number":return e.format==="int"?"int":"double";case"boolean":return"bool";default:return"dynamic"}},$n=e=>{if(/^[A-Za-z$][A-Za-z0-9_$]*$/.test(e))return e;let n=ne(e,"camel");return/^[0-9]/.test(n)&&(n="f"+n.charAt(0).toUpperCase()+n.slice(1)),n},Tt={generate:(e,n="Root",t={})=>{let o=L(e,k(n),t),i=o.some(s=>s.fields.some(a=>$n(a.name)!==a.name))?`import 'package:json_annotation/json_annotation.dart';

`:"";for(let s of o){let a=P(s),l=a?` extends ${a}`:"";i+=`class ${s.name}${l} {
`;for(let c of s.fields){let u=c.isOptional||c.isNullable,f=$t(c.fieldType);u&&f!=="dynamic"&&(f+="?");let m=$n(c.name);m!==c.name&&(i+=`  @JsonKey(name: '${c.name}')
`),i+=`  final ${f} ${m};
`}i+=`
  ${s.name}({
`;for(let c of s.fields){let u=c.isOptional||c.isNullable;i+=`    ${u?"":"required "}this.${$n(c.name)},
`}i+=`  });
`,i+=`}

`}return i}},ct=e=>{switch(e.kind){case"union":return"mixed";case"enum":return"string";case"date":case"datetime":return"DateTime";case"classRef":return e.classRefName??"mixed";case"array":return"array";case"string":return"string";case"number":return e.format==="int"?"int":"float";case"boolean":return"bool";default:return"mixed"}},ut=e=>{if(/^[A-Za-z_][A-Za-z0-9_]*$/.test(e))return e;let n=ne(e,"camel");return/^[0-9]/.test(n)&&(n="_"+n),n},St={generate:(e,n="Root",t={})=>{let o=L(e,k(n),t),r="";for(let i of o){let s=P(i),a=s?` extends ${s}`:"";r+=`class ${i.name}${a}
{
`,r+=`    public function __construct(
`;for(let l of i.fields){let c=ct(l.fieldType),u=(l.isOptional||l.isNullable)&&c!=="mixed"?"?":"",f=l.isOptional||l.isNullable?" = null":"",m=ut(l.name),p=m!==l.name?` // json: "${l.name}"`:"";r+=`        private ${u}${c} $${m}${f},${p}
`}r+=`    ) {}
`;for(let l of i.fields){let c=ct(l.fieldType),u=(l.isOptional||l.isNullable)&&c!=="mixed"?"?":"",f=ut(l.name),m=f.charAt(0).toUpperCase()+f.slice(1);r+=`
    public function get${m}(): ${u}${c} { return $this->${f}; }
`,r+=`    public function set${m}(${u}${c} $${f}): void { $this->${f} = $${f}; }
`}r+=`}

`}return r}},xt=e=>{switch(e.kind){case"union":return"Any";case"enum":return"str";case"date":case"datetime":return"datetime";case"classRef":return e.classRefName??"Any";case"array":return e.itemType?`List[${xt(e.itemType)}]`:"List[Any]";case"string":return"str";case"number":return e.format==="int"?"int":"float";case"boolean":return"bool";default:return"Any"}},At={generate:(e,n="Root",t={})=>{let o=L(e,k(n),t),r="",{sorted:i}=wn(o);for(let s of i){let a=P(s)??"BaseModel";if(r+=`class ${s.name}(${a}):
`,s.fields.length===0){r+=`    pass

`;continue}let l=new Set;for(let c of s.fields){let u=xt(c.fieldType),f=c.isOptional||c.isNullable,m=_s(c.name);for(;l.has(m);)m+="_";l.add(m);let p=m!==c.name;if(f){let d=p?`Field(default=None, alias=${JSON.stringify(c.name)})`:"None";r+=`    ${m}: Optional[${u}] = ${d}
`}else p?r+=`    ${m}: ${u} = Field(alias=${JSON.stringify(c.name)})
`:r+=`    ${m}: ${u}
`}r+=`
`}return r}},jt=e=>{switch(e.kind){case"union":return"string";case"enum":return"string";case"date":case"datetime":return"string";case"classRef":return e.classRefName??"string";case"array":return e.itemType?`repeated ${jt(e.itemType)}`:"repeated string";case"string":return"string";case"number":return e.format==="int"?"int32":"double";case"boolean":return"bool";default:return"string"}},zs=e=>{if(/^[A-Za-z_][A-Za-z0-9_]*$/.test(e))return e;let n=ne(e,"snake");return/^[0-9]/.test(n)&&(n="_"+n),n},Ot={generate:(e,n="Message",t={})=>{let o=L(e,k(n),t),r="",i=(s,a)=>{let l=jt(s.fieldType),c=zs(s.name),u=c!==s.name?` [json_name = "${s.name}"]`:"";return`  ${l} ${c} = ${a}${u};
`};for(let s of o){r+=`message ${s.name} {
`;let a=1,l=P(s);if(l){let c=o.find(u=>u.name===l);if(c)for(let u of c.fields)r+=i(u,a++)}for(let c of s.fields)r+=i(c,a++);r+=`}

`}return r}},Nt=e=>{switch(e.kind){case"union":return"String";case"enum":return"String";case"date":case"datetime":return"String";case"classRef":return e.classRefName??"String";case"array":return e.itemType?`[${Nt(e.itemType)}!]`:"[String]";case"string":return"String";case"number":return e.format==="int"?"Int":"Float";case"boolean":return"Boolean";default:return"String"}},Fs=e=>{if(/^[_A-Za-z][_0-9A-Za-z]*$/.test(e))return e;let n=gt(e).join("_");return n||(n="field"),/^[0-9]/.test(n)&&(n="_"+n),n},ft=e=>{let n=Nt(e.fieldType),t=e.isOptional||e.isNullable?"":"!",o=Fs(e.name),r=o!==e.name?` # json: "${e.name}"`:"";return`  ${o}: ${n}${t}${r}
`},wt={generate:(e,n="Type",t={})=>{let o=L(e,k(n),t),r="";for(let i of o){r+=`type ${i.name} {
`;let s=P(i);if(s){let a=o.find(l=>l.name===s);if(a)for(let l of a.fields)r+=ft(l)}for(let a of i.fields)r+=ft(a);r+=`}

`}return r}},kt=e=>e.replace(/([A-Z]+)([A-Z][a-z])/g,"$1_$2").replace(/([a-z\d])([A-Z])/g,"$1_$2").toLowerCase(),Ds=new Set(["type","struct","enum","match","use","mod","fn","let","pub","impl","trait","for","loop","while","if","else","return","break","continue","as","async","await","const","crate","dyn","extern","false","true","in","move","mut","ref","self","Self","static","super","unsafe","where"]),pt=e=>Ds.has(e)?`r#${e}`:e,Gs=e=>{let n=kt(e);if(/^[A-Za-z_][A-Za-z0-9_]*$/.test(n))return pt(n);let t=ne(e,"snake");return/^[0-9]/.test(t)&&(t="_"+t),pt(t)},vt=e=>{switch(e.kind){case"union":return"serde_json::Value";case"enum":return"String";case"date":case"datetime":return"chrono::DateTime<chrono::Utc>";case"classRef":return e.classRefName??"serde_json::Value";case"array":return e.itemType?`Vec<${vt(e.itemType)}>`:"Vec<serde_json::Value>";case"string":return"String";case"number":return e.format==="int"?"i64":"f64";case"boolean":return"bool";default:return"serde_json::Value"}},Ct={generate:(e,n="Root",t={})=>{let o=L(e,k(n),t),r=`use serde::{Serialize, Deserialize};

`,i=ce(e,k(n));i&&o.some(s=>s.name===i)&&(r+=`pub type ${k(n)} = Vec<${i}>;

`);for(let s of o){let a=P(s);if(r+=`#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ${s.name} {
`,a){let l=kt(a);r+=`  #[serde(flatten)]
  pub ${l}: ${a},
`}for(let l of s.fields){let c=vt(l.fieldType);(l.isOptional||l.isNullable)&&(c=`Option<${c}>`);let u=Gs(l.name);u!==l.name&&(r+=`  #[serde(rename = "${l.name}")]
`),r+=`  pub ${u}: ${c},
`}r+=`}

`}return r}},Rt=e=>{switch(e.kind){case"union":return"interface{}";case"enum":return"string";case"date":case"datetime":return"time.Time";case"classRef":return e.classRefName??"interface{}";case"array":return e.itemType?`[]${Rt(e.itemType)}`:"[]interface{}";case"string":return"string";case"number":return e.format==="int"?"int64":"float64";case"boolean":return"bool";default:return"interface{}"}},_t={generate:(e,n="Root",t={})=>{let o=L(e,k(n),t),i=o.some(a=>a.fields.some(l=>l.fieldType.kind==="date"||l.fieldType.kind==="datetime"))?`package main

import "time"

`:`package main

`,s=ce(e,k(n));s&&o.some(a=>a.name===s)&&(i+=`type ${k(n)} []${s}

`);for(let a of o){let l=P(a);i+=`type ${a.name} struct {
`,l&&(i+=`  ${l}
`);let c=new Set;for(let u of a.fields){let f=Rt(u.fieldType);(u.isNullable||u.isOptional)&&(f=`*${f}`);let m=Cs(u.name);for(;c.has(m);)m+="_";c.add(m);let p=u.isOptional||u.isNullable?",omitempty":"";i+=`  ${m} ${f} \`json:"${u.name}${p}"\`
`}i+=`}

`}return i}},W=e=>e.split(/[_\s-]+/).map(n=>n.charAt(0).toUpperCase()+n.slice(1)).join(""),Ie=e=>{let n=e.replace(/_([a-zA-Z0-9])/g,(o,r)=>r.toUpperCase());if(/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n))return n;let t=ne(e,"camel");return/^[0-9]/.test(t)&&(t="_"+t),t},Sn=e=>["price","amount","cost","fee","total","subtotal","balance","payment"].some(n=>e.toLowerCase().includes(n)),xn=(e,n,t="")=>{switch(e.kind){case"union":return"Object";case"enum":return"String";case"date":return"LocalDate";case"datetime":return"OffsetDateTime";case"classRef":return W(e.classRefName??"Object");case"array":return e.itemType?`List<${xn(e.itemType,!0,"")}>`:"List<Object>";case"string":return e.format==="uuid"?"UUID":"String";case"number":return Sn(t)?"BigDecimal":e.format==="int"?n?"Integer":"int":n?"Double":"double";case"boolean":return n?"Boolean":"boolean";default:return"Object"}},mt=new Set(["int","long","double","float","boolean","char","byte","short"]),Et={generate:(e,n="Root",t={})=>{let o=L(e,k(n),t),r=new Set(["import lombok.AllArgsConstructor;","import lombok.Builder;","import lombok.Data;","import lombok.NoArgsConstructor;","import com.fasterxml.jackson.annotation.JsonIgnoreProperties;"]),i=!1,s=!1,a=!1,l=!1,c=!1;for(let f of o)for(let m of f.fields){let p=m.isOptional||m.isNullable,d=xn(m.fieldType,p,m.name),y=Ie(m.name),g=m.name.toLowerCase();m.name!==y&&(i=!0),m.fieldType.kind==="array"&&r.add("import java.util.List;"),d==="UUID"&&r.add("import java.util.UUID;"),d==="LocalDate"&&r.add("import java.time.LocalDate;"),d==="OffsetDateTime"&&r.add("import java.time.OffsetDateTime;"),d==="BigDecimal"&&r.add("import java.math.BigDecimal;"),p&&(c=!0),!p&&!mt.has(d)&&(s=!0),(m.fieldType.format==="email"||g.includes("email"))&&(a=!0),m.fieldType.kind==="number"&&(Sn(m.name)||g==="count"||g.endsWith("count")||g.endsWith("_count")||g.includes("quantity")||g==="qty")&&(l=!0)}i&&r.add("import com.fasterxml.jackson.annotation.JsonProperty;"),c&&r.add("import javax.annotation.Nullable;"),s&&r.add("import jakarta.validation.constraints.NotNull;"),a&&r.add("import jakarta.validation.constraints.Email;"),l&&r.add("import jakarta.validation.constraints.Min;");let u=[...r].sort().join(`
`)+`

`;for(let f of o){u+=`@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
`,u+=`@JsonIgnoreProperties(ignoreUnknown = true)
`;let m=P(f),p=m?` extends ${W(m)}`:"";u+=`public class ${W(f.name)}${p} {
`;for(let d of f.fields){let y=d.isOptional||d.isNullable,g=xn(d.fieldType,y,d.name),b=Ie(d.name),h=d.name.toLowerCase();y?u+=`    @Nullable
`:mt.has(g)||(u+=`    @NotNull
`),(d.fieldType.format==="email"||h.includes("email"))&&(u+=`    @Email
`);let $=d.fieldType.kind==="number";if(($&&Sn(d.name)||$&&(h==="count"||h.endsWith("count")||h.endsWith("_count")||h.includes("quantity")||h==="qty"))&&(u+=`    @Min(0)
`),d.name!==b&&(u+=`    @JsonProperty("${d.name}")
`),d.fieldType.kind==="enum"&&d.fieldType.enumValues?.length){let T=d.fieldType.enumValues.map(S=>`"${S}"`).join(", ");u+=`    private String ${b}; // enum: ${T}
`}else u+=`    private ${g} ${b};
`}u+=`}

`}return u.trim()+`
`}},An=e=>{switch(e.kind){case"union":return"String";case"enum":return"String";case"string":return"String";case"number":return e.format==="int"?"Int":"Float";case"boolean":return"Boolean";case"date":case"datetime":return"DateTime";case"classRef":return e.classRefName??"String";case"array":return e.itemType?`${An(e.itemType)}[]`:"String[]";default:return"String"}},dt=e=>{if(/^[A-Za-z][A-Za-z0-9_]*$/.test(e))return e;let n=ne(e,"camel");return/^[0-9]/.test(n)&&(n="f"+n.charAt(0).toUpperCase()+n.slice(1)),n},It={generate:(e,n="Root",t={})=>{let o=L(e,k(n),t),r="";for(let i of o){r+=`model ${i.name} {
`,i.fields.some(c=>c.name==="id")||(r+=`  id String @id @default(uuid())
`);let a=P(i);if(a){let c=o.find(u=>u.name===a);if(c)for(let u of c.fields){let f=An(u.fieldType),m=u.name==="id"?" @id":"",p=dt(u.name),d=p!==u.name?` @map("${u.name}")`:"";r+=`  ${p} ${f}${m}${d}
`}}let l=/^(price|amount|cost|total|fee|balance|discount|tax|rate|salary|revenue|budget|charge|payment|subtotal|tip|markup|margin)s?$/i;for(let c of i.fields){let u=An(c.fieldType);u==="Float"&&l.test(c.name)&&(u="Decimal");let f=c.fieldType.kind==="array",m=c.isOptional&&!f?"?":"",p=`${i.name}.${c.name}`,d=t.customFieldNames?.[p]??c.name,y=d==="id"?" @id":"",g=dt(d),b=g!==d?` @map("${d}")`:"";if(c.fieldType.kind==="classRef"){let h=o.find($=>$.name===c.fieldType.classRefName);h&&(r+=`  /// embedded as Json \u2014 see model ${h.name} for the shape
`),r+=`  ${g} Json${m}${b}
`}else if(f&&c.fieldType.itemType?.kind==="classRef"){let h=o.find($=>$.name===c.fieldType.itemType.classRefName);h&&(r+=`  /// embedded as Json \u2014 see model ${h.name} for the element shape
`),r+=`  ${g} Json${b}
`}else if(r+=`  ${g} ${u}${m}${y}${b}
`,!f&&d.length>2&&d.endsWith("Id")&&c.fieldType.format==="uuid"){let h=d.slice(0,-2),$=h.charAt(0).toUpperCase()+h.slice(1);if(!i.fields.some(S=>S.name===h)){let S=o.find(G=>G.name===$),v=o.filter(G=>G.name!==i.name&&G.name.endsWith($)),C=S??(v.length===1?v[0]:null);C&&(r+=`  ${h} ${C.name}? @relation(fields: [${g}], references: [id])
`)}}}r+=`}

`}return r}},Mt={generate:(e,n="Component")=>{let t=e.fields||{},o=Object.keys(t),r=`import React from 'react';

`;return r+=`export const ${n}Card = ({ data }: { data: any }) => (
`,r+=`  <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
`,r+=`    <h3 className="text-lg font-black mb-4 dark:text-white">${n}</h3>
`,r+=`    <div className="grid grid-cols-2 gap-4">
`,o.forEach(i=>{r+=`      <div>
        <p className="text-[10px] text-slate-400 uppercase">${i}</p>
        <p className="text-sm font-bold dark:text-slate-200">{typeof data?.${i} === 'object' ? JSON.stringify(data?.${i}) : String(data?.${i} ?? '-')}</p>
      </div>
`}),r+=`    </div>
  </div>
);
`,r}},Lt={generate:e=>{let n=0,t=(o,r="",i="")=>{if(o.type==="object"&&o.recordValueType){let s={};for(let a=1;a<=2;a++)s[`key${a}`]=t(o.recordValueType,r,i);return s}if(o.type==="array"&&o.tupleTypes)return o.tupleTypes.map(s=>t(s,r,i));if(o.type==="object"&&o.fields){let s={};for(let[a,l]of Object.entries(o.fields))s[a]=t(l,a,r);return s}if(o.type==="array"){let s=o.itemType||{type:"string"},a=n;n=0;let l=Array.from({length:50},(c,u)=>(n=u+1,t(s,r,i)));return n=a,l}if(o.type==="number")return r.toLowerCase().includes("id")||r.toLowerCase().includes("price")||r.toLowerCase().includes("amount")?n>0?n:1:r.toLowerCase().includes("age")?28:42;if(o.type==="boolean")return!0;if(o.type==="string"){if(o.format==="uuid")return`550e8400-e29b-41d4-a716-${String(n||1).padStart(12,"0")}`;if(o.format==="email")return"test@example.com";if(o.format==="url")return"https://example.com/api";if(o.format==="datetime")return new Date().toISOString();let s=r.toLowerCase(),a=i.toLowerCase(),l=a==="items"||a==="products"||a==="entries"||a==="records";if(s.includes("name")){if(l)return`Item ${String.fromCharCode(64+(n||1))}`;let c=["Alice Johnson","Bob Smith","Carol White","David Brown","Emma Davis","Frank Wilson","Grace Lee","Henry Taylor"];return c[((n||1)-1)%c.length]}if(s.includes("email")){let c=["example.com","test.org","demo.io","sample.net"];return`user${n||1}@${c[((n||1)-1)%c.length]}`}if(s.includes("url")||s.includes("link")||s.includes("avatar")||s.includes("image"))return"https://example.com/sample.png";if(s.includes("id"))return`550e8400-e29b-41d4-a716-${String(n||1).padStart(12,"0")}`;if(s.includes("date")||s.includes("time")||s.includes("created")||s.includes("updated"))return new Date().toISOString();if(s.includes("city")){let c=["Tokyo","New York","London","Paris","Sydney","Berlin","Singapore","Toronto"];return c[((n||1)-1)%c.length]}if(s.includes("street")||s.includes("address"))return"123 Main Street";if(s.includes("zip")||s.includes("postal"))return"100-0001";if(s.includes("phone")||s.includes("tel"))return"+81-90-1234-5678";if(s.includes("role")||s.includes("type")||s.includes("status")||s.includes("category")){let c=["admin","user","guest","moderator"];return c[((n||1)-1)%c.length]}return s.includes("desc")||s.includes("memo")||s.includes("text")||s.includes("bio")||s.includes("note")?"This is a sample generated text to simulate a realistic description or content block.":s.includes("title")?"Sample Title":s.includes("price")||s.includes("cost")?(19.99+(n||0)*10).toFixed(2):s.includes("color")?"#3366ff":s.includes("country")?"Japan":s.includes("lang")||s.includes("locale")?"en-US":"sample_"+r}return null};return JSON.stringify(t(e),null,2)}},zt=e=>{switch(e.kind){case"union":return"object";case"enum":return"string";case"date":return"DateTime";case"datetime":return"DateTimeOffset";case"classRef":return e.classRefName??"object";case"array":return e.itemType?`List<${zt(e.itemType)}>`:"List<object>";case"string":return"string";case"number":return e.format==="int"?"long":"double";case"boolean":return"bool";default:return"object"}},Ps=e=>{let n=k(e);if(/^[A-Za-z_][A-Za-z0-9_]*$/.test(n))return n;let t=ne(e,"pascal");return/^[0-9]/.test(t)&&(t="_"+t),t},Ft={generate:(e,n="Root",t={})=>{let o=L(e,k(n),t),r="",i=!1,s=!1;for(let l of o){let c=P(l),u=c?` : ${c}`:"";r+=`public class ${l.name}${u}
{
`;for(let f of l.fields){let m=zt(f.fieldType),p=!f.isOptional&&!f.isNullable,d=p?"":"?";p&&(i=!0,r+=`    [Required]
`);let y=Ps(f.name);/^[A-Za-z_][A-Za-z0-9_]*$/.test(k(f.name))||(s=!0,r+=`    [JsonPropertyName("${f.name}")]
`),r+=`    public ${m}${d} ${y} { get; set; }
`}r+=`}

`}let a="";return i&&(a+=`using System.ComponentModel.DataAnnotations;
`),s&&(a+=`using System.Text.Json.Serialization;
`),a&&(a+=`
`),a+r}},Dt=e=>{switch(e.kind){case"union":return"AnyCodable";case"enum":return"String";case"date":case"datetime":return"Date";case"classRef":return W(e.classRefName??"AnyCodable");case"array":return e.itemType?`[${Dt(e.itemType)}]`:"[AnyCodable]";case"string":return e.format==="uuid"?"UUID":"String";case"number":return e.format==="int"?"Int":"Double";case"boolean":return"Bool";default:return"AnyCodable"}},Gt={generate:(e,n="Root",t={})=>{let o=L(e,k(n),t),r=`import Foundation

`;for(let i of o){let s=W(i.name),a=P(i),l=a?`: ${W(a)}`:": Codable";r+=`struct ${s} ${l} {
`;let c=[];for(let f of i.fields){let m=Ie(f.name),p=Dt(f.fieldType);(f.isOptional||f.isNullable)&&(p+="?"),r+=`    let ${m}: ${p}
`,f.name!==m?c.push({swift:m,json:f.name}):c.push({swift:m,json:""})}if(c.some(f=>f.json!=="")){r+=`
    enum CodingKeys: String, CodingKey {
`;for(let{swift:f,json:m}of c)m?r+=`        case ${f} = "${m}"
`:r+=`        case ${f}
`;r+=`    }
`}r+=`}

`}return r}},Pt=e=>{switch(e.kind){case"union":return"Any";case"enum":return"String";case"date":return"LocalDate";case"datetime":return"Instant";case"classRef":return W(e.classRefName??"Any");case"array":return e.itemType?`List<${Pt(e.itemType)}>`:"List<Any>";case"string":return e.format==="uuid","String";case"number":return e.format==="int"?"Int":"Double";case"boolean":return"Boolean";default:return"Any"}},yt=(e,n)=>e.some(t=>t.fields.some(o=>o.fieldType.kind===n||o.fieldType.kind==="array"&&o.fieldType.itemType?.kind===n)),Ut={generate:(e,n="Root",t={})=>{let o=L(e,k(n),t),r=!1;for(let l of o)for(let c of l.fields)if(c.name!==Ie(c.name)){r=!0;break}let i=yt(o,"datetime"),s=yt(o,"date"),a=`import kotlinx.serialization.Serializable
`;r&&(a+=`import kotlinx.serialization.SerialName
`),i&&(a+=`import kotlinx.datetime.Instant
`),s&&(a+=`import kotlinx.datetime.LocalDate
`),a+=`
`;for(let l of o){let c=W(l.name),u=P(l),f=u?` : ${W(u)}`:"";a+=`@Serializable
data class ${c}(
`;let m=l.fields.map(p=>{let d=Ie(p.name),y=Pt(p.fieldType);(p.isOptional||p.isNullable)&&(y+="?");let g=p.name!==d?`    @SerialName("${p.name}")
`:"",b=p.isOptional||p.isNullable?" = null":"";return`${g}    val ${d}: ${y}${b}`});a+=m.join(`,
`),a+=`
)${f}

`}return a}},Vt=e=>{switch(e.kind){case"string":return e.enumValues&&e.enumValues.length>0?e.enumValues.map(n=>`'${n}'`).join(" | "):"string";case"number":return"number";case"boolean":return"boolean";case"date":case"datetime":return"string";case"classRef":return`${W(e.classRefName??"Object")}Dto`;case"array":if(e.itemType){let n=Vt(e.itemType);return n.includes("|")?`(${n})[]`:`${n}[]`}return"unknown[]";case"enum":return e.enumValues&&e.enumValues.length>0?e.enumValues.map(n=>`'${n}'`).join(" | "):"string";case"union":return"unknown";default:return"unknown"}},qt={generate:(e,n="Root",t={})=>{let o=L(e,k(n),t),r=new Set,i=new Set,s=[];for(let l of o){let u=`export class ${`${l.name}Dto`} {
`;for(let f of l.fields){let m=f.name.toLowerCase(),p=f.isOptional,d=f.isNullable,y=f.fieldType,g=[];if(p&&(g.push("@IsOptional()"),r.add("IsOptional")),y.kind==="string"){let $=y.format;$==="email"||m.includes("email")?(g.push("@IsEmail()"),r.add("IsEmail")):$==="uuid"?(g.push("@IsUUID()"),r.add("IsUUID")):$==="url"||m.includes("url")||m.includes("website")?(g.push("@IsUrl()"),r.add("IsUrl")):$==="datetime"||$==="date"?(g.push("@IsISO8601()"),r.add("IsISO8601")):y.enumValues&&y.enumValues.length>0?(g.push(`@IsIn([${y.enumValues.map(T=>`'${T}'`).join(", ")}])`),r.add("IsIn")):(g.push("@IsString()"),r.add("IsString"),p||(g.push("@IsNotEmpty()"),r.add("IsNotEmpty")))}else if(y.kind==="number")y.format==="int"?(g.push("@IsInt()"),r.add("IsInt")):(g.push("@IsNumber()"),r.add("IsNumber")),m.includes("percent")?(g.push("@Min(0)","@Max(100)"),r.add("Min"),r.add("Max")):m.includes("latitude")||m==="lat"?(g.push("@Min(-90)","@Max(90)"),r.add("Min"),r.add("Max")):m.includes("longitude")||m==="lng"||m==="lon"?(g.push("@Min(-180)","@Max(180)"),r.add("Min"),r.add("Max")):m.includes("age")&&(g.push("@Min(0)","@Max(150)"),r.add("Min"),r.add("Max"));else if(y.kind==="boolean")g.push("@IsBoolean()"),r.add("IsBoolean");else if(y.kind==="date"||y.kind==="datetime")g.push("@IsISO8601()"),r.add("IsISO8601");else if(y.kind==="enum")y.enumValues&&y.enumValues.length>0?(g.push(`@IsIn([${y.enumValues.map($=>`'${$}'`).join(", ")}])`),r.add("IsIn")):(g.push("@IsString()"),r.add("IsString"));else if(y.kind==="array"){if(g.push("@IsArray()"),r.add("IsArray"),y.itemType?.kind==="classRef"){let $=W(y.itemType.classRefName??"Object");g.push("@ValidateNested({ each: true })"),g.push(`@Type(() => ${$}Dto)`),r.add("ValidateNested"),i.add("Type")}}else if(y.kind==="classRef"){let $=W(y.classRefName??"Object");g.push("@ValidateNested()"),g.push(`@Type(() => ${$}Dto)`),r.add("ValidateNested"),i.add("Type")}let b=Vt(y);d&&(b+=" | null");let h=p?"?":"";for(let $ of g)u+=`  ${$}
`;u+=`  ${X(f.name)}${h}: ${b};

`}u=u.trimEnd()+`
}
`,s.push(u)}let a="";return r.size>0&&(a+=`import { ${[...r].sort().join(", ")} } from 'class-validator';
`),i.size>0&&(a+=`import { ${[...i].sort().join(", ")} } from 'class-transformer';
`),a&&(a+=`
`),a+s.join(`
`)}},Bt={generate:e=>{let n=t=>{if(t.type==="object"&&t.fields){let r=Object.keys(t.fields).filter(s=>!t.fields[s].optional),i={type:t.nullable?["object","null"]:"object",properties:Object.keys(t.fields).reduce((s,a)=>({...s,[a]:n(t.fields[a])}),{})};return r.length>0&&(i.required=r),i}if(t.type==="array")return{type:t.nullable?["array","null"]:"array",items:n(t.itemType)};if(t.type==="union"&&t.unionTypes){let r={anyOf:t.unionTypes.map(i=>({type:i}))};return t.nullable&&r.anyOf.push({type:"null"}),r}let o={};return t.type!=="any"&&(o.type=t.nullable?[t.type,"null"]:t.type),t.format&&(o.format=t.format),t.enumValues&&t.enumValues.length>0&&(o.enum=t.enumValues),o};return JSON.stringify({$schema:"http://json-schema.org/draft-07/schema#",...n(e)},null,2)}},jn=(e,n)=>{switch(e.kind){case"string":return e.format==="uuid"?"Schema.UUID":e.format==="datetime"||e.format==="date"?"Schema.DateTimeUtc":e.enumValues&&e.enumValues.length>0?`Schema.Literal(${e.enumValues.map(t=>`"${t}"`).join(", ")})`:"Schema.String";case"number":return e.format==="int"?"Schema.Int":"Schema.Number";case"boolean":return"Schema.Boolean";case"date":case"datetime":return"Schema.DateTimeUtc";case"classRef":{if(!e.classRefName)return"Schema.Unknown";let t=B(e.classRefName);return n.has(e.classRefName)?`Schema.suspend((): Schema.Schema<${e.classRefName}> => ${t})`:t}case"array":return e.itemType?`Schema.Array(${jn(e.itemType,n)})`:"Schema.Array(Schema.Unknown)";case"enum":return e.enumValues&&e.enumValues.length>0?`Schema.Literal(${e.enumValues.map(t=>`"${t}"`).join(", ")})`:"Schema.String";case"union":if(e.unionTypes&&e.unionTypes.length>0){let t=e.unionTypes.map(o=>jn({kind:o},n));return t.length===1?t[0]:`Schema.Union(${t.join(", ")})`}return"Schema.Unknown";default:return"Schema.Unknown"}},Wt={generate:(e,n="root",t={})=>{let o=L(e,k(n),t),{sorted:r,cyclicClassRefs:i}=wn(o),s="";for(let l of r){let c=B(l.name);s+=`export const ${c} = Schema.Struct({
`;for(let u of l.fields){let f=jn(u.fieldType,i);u.isNullable&&u.isOptional?f=`Schema.optional(Schema.NullOr(${f}))`:u.isNullable?f=`Schema.NullOr(${f})`:u.isOptional&&(f=`Schema.optional(${f})`),s+=`  ${X(u.name)}: ${f},
`}s+=`});
`,s+=`export type ${l.name} = Schema.Schema.Type<typeof ${c}>;

`}let a=ce(e,k(n));if(a&&o.some(l=>l.name===a)){let l=k(n),c=B(l);s+=`export const ${c} = Schema.Array(${B(a)});
`,s+=`export type ${l} = Schema.Schema.Type<typeof ${c}>;

`}return s}},He={generate:(e,n="Root")=>{if(e.type==="object"&&e.fields){let t=`# API Field Specifications: ${n}

`;t+=`| Field | Type | Required | Description |
`,t+=`| :--- | :--- | :--- | :--- |
`;for(let[o,r]of Object.entries(e.fields)){let i=r.type==="object"?"Object":r.type==="array"?`${r.itemType?.type||"any"}[]`:r.type;r.type==="union"&&r.unionTypes&&(i=r.unionTypes.join(" \\| ")),r.nullable&&(i+=" (nullable)");let s=r.optional?"No":"Yes",a="No description provided.",l=o.toLowerCase();l.endsWith("_id")&&l!=="id"?a="Foreign key reference to an external record.":l==="id"||l.endsWith("id")?a="Unique identifier for the record.":l==="username"?a="User's unique display name.":l==="name"||l==="fullname"?a="Full name of the user or entity.":l==="email"?a="Primary email address.":l==="status"?a="Operational or lifecycle state.":l==="role"?a="User privilege role or system role.":l==="avatarurl"||l==="avatar"?a="Public URL to the user's avatar image.":l==="stats"?a="Statistical metrics and counters.":l==="preferences"?a="User preference flags and custom configurations.":l.startsWith("is")||l.startsWith("has")?a="Boolean flag representing status.":l==="createdat"||l==="created_at"?a="Timestamp representing record creation time.":l==="updatedat"||l==="updated_at"?a="Timestamp representing the last update time.":l==="lastlogin"||l==="last_login"?a="Timestamp of the user's most recent session activity.":l==="title"?a="Human-readable title or heading.":l.includes("description")||l==="desc"?a="Free-text description or summary.":l.includes("phone")||l.includes("mobile")?a="Contact phone number.":l.includes("address")?a="Physical or mailing address.":l.includes("price")||l.includes("amount")||l.includes("cost")||l.includes("fee")?a="Monetary value (non-negative).":l==="age"?a="Age in years (0\u2013150).":l.includes("age")&&r.type==="number"?a="Numeric age value.":l==="type"||l.endsWith("_type")||l.endsWith("type")?a="Discriminator or category type.":l==="slug"||l.endsWith("_slug")?a="URL-safe identifier slug.":l.endsWith("_count")||l==="count"?a="Integer count or quantity (non-negative).":l.endsWith("_at")?a="ISO 8601 timestamp.":l.endsWith("_url")||l.endsWith("_link")?a="Fully-qualified URL (HTTP/HTTPS).":l.endsWith("_code")||l==="code"?a="Short code or identifier string.":r.format==="uuid"?a="Universally Unique Identifier (UUID) format string.":r.format==="email"?a="Validated email format string.":r.format==="url"?a="Fully-qualified web URL (HTTP/HTTPS).":r.format==="datetime"&&(a="ISO 8601 compliant UTC date-time string."),t+=`| \`${o}\` | \`${i}\` | ${s} | ${a} |
`}t+=`
`;for(let[o,r]of Object.entries(e.fields))r.type==="object"&&(t+=`
---

`,t+=He.generate(r,o.charAt(0).toUpperCase()+o.slice(1))),r.type==="array"&&r.itemType?.type==="object"&&(t+=`
---

`,t+=He.generate(r.itemType,o.charAt(0).toUpperCase()+o.slice(1)+"Item"));return t}return""}},Jt={generate:(e,n="Root",t={})=>{let o=Nn(e,n),r=L(e,n,t),i=[],s=(c,u)=>{switch(c.kind){case"string":return`typeof ${u} === 'string'`;case"number":return`typeof ${u} === 'number'`;case"boolean":return`typeof ${u} === 'boolean'`;case"date":case"datetime":return`(typeof ${u} === 'string' || ${u} instanceof Date)`;case"any":return"true";case"classRef":return`is${c.classRefName}(${u})`;case"array":return`Array.isArray(${u})`;case"enum":{let f=(c.enumValues??[]).map(m=>`'${m}'`).join(", ");return`typeof ${u} === 'string' && [${f}].includes(${u})`}case"union":{let f=(c.unionTypes??[]).filter(m=>m!=="any").map(m=>`typeof ${u} === '${m}'`);return f.length?`(${f.join(" || ")})`:"true"}default:return"true"}},a=c=>{let u=`o['${c.name}']`,f=s(c.fieldType,u),m=f!=="true";return c.isOptional&&c.isNullable?m?`(${u} == null || ${f})`:`(${u} == null)`:c.isOptional?m?`(${u} === undefined || ${f})`:"true":c.isNullable?m?`(${u} === null || ${f})`:`${u} === null`:f},l=(c,u)=>{i.push(`export function is${c}(obj: unknown): obj is ${c} {`),i.push("  if (typeof obj !== 'object' || obj === null) return false;"),i.push("  const o = obj as Record<string, unknown>;");let f=u.map(a).filter(m=>m!=="true");f.length===0?i.push("  return true;"):(i.push("  return ("),f.forEach((m,p)=>{let d=p<f.length-1?" &&":"";i.push(`    ${m}${d}`)}),i.push("  );")),i.push("}"),i.push("")};for(let c of r){let u=o.get(c.name);if(u){let f=On(Object.keys(u.variants));for(let[p,d]of Object.entries(u.variants)){let y=`${c.name}${f.get(p)}`,g=Object.entries(d.fields??{}).map(([b,h])=>b===u.discriminatorField?{name:b,fieldType:{kind:"enum",enumValues:[p]},isOptional:!1,isNullable:!1}:{name:b,fieldType:Y(h,y,b),isOptional:!!h.optional,isNullable:!!h.nullable});l(y,g)}let m=Object.keys(u.variants).map(p=>`is${c.name}${f.get(p)}(obj)`);i.push(`export function is${c.name}(obj: unknown): obj is ${c.name} {`),i.push(`  return ${m.join(" || ")};`),i.push("}"),i.push("");continue}l(c.name,c.fields)}if(e.type==="array"&&e.itemType){let c=ce(e,n);if(c){let u=k(n);i.push(`export function is${u}(obj: unknown): obj is ${u} {`),i.push(`  return Array.isArray(obj) && obj.every((item) => is${c}(item));`),i.push("}"),i.push("")}}return i.join(`
`)}};function cr(e){return typeof e>"u"||e===null}function Us(e){return typeof e=="object"&&e!==null}function Vs(e){return Array.isArray(e)?e:cr(e)?[]:[e]}function qs(e,n){var t,o,r,i;if(n)for(i=Object.keys(n),t=0,o=i.length;t<o;t+=1)r=i[t],e[r]=n[r];return e}function Bs(e,n){var t="",o;for(o=0;o<n;o+=1)t+=e;return t}function Ws(e){return e===0&&Number.NEGATIVE_INFINITY===1/e}var Js=cr,Ks=Us,Ys=Vs,Hs=Bs,Zs=Ws,Qs=qs,M={isNothing:Js,isObject:Ks,toArray:Ys,repeat:Hs,isNegativeZero:Zs,extend:Qs};function ur(e,n){var t="",o=e.reason||"(unknown reason)";return e.mark?(e.mark.name&&(t+='in "'+e.mark.name+'" '),t+="("+(e.mark.line+1)+":"+(e.mark.column+1)+")",!n&&e.mark.snippet&&(t+=`

`+e.mark.snippet),o+" "+t):o}function Le(e,n){Error.call(this),this.name="YAMLException",this.reason=e,this.mark=n,this.message=ur(this,!1),Error.captureStackTrace?Error.captureStackTrace(this,this.constructor):this.stack=new Error().stack||""}Le.prototype=Object.create(Error.prototype);Le.prototype.constructor=Le;Le.prototype.toString=function(n){return this.name+": "+ur(this,n)};var U=Le;function kn(e,n,t,o,r){var i="",s="",a=Math.floor(r/2)-1;return o-n>a&&(i=" ... ",n=o-a+i.length),t-o>a&&(s=" ...",t=o+a-s.length),{str:i+e.slice(n,t).replace(/\t/g,"\u2192")+s,pos:o-n+i.length}}function vn(e,n){return M.repeat(" ",n-e.length)+e}function Xs(e,n){if(n=Object.create(n||null),!e.buffer)return null;n.maxLength||(n.maxLength=79),typeof n.indent!="number"&&(n.indent=1),typeof n.linesBefore!="number"&&(n.linesBefore=3),typeof n.linesAfter!="number"&&(n.linesAfter=2);for(var t=/\r?\n|\r|\0/g,o=[0],r=[],i,s=-1;i=t.exec(e.buffer);)r.push(i.index),o.push(i.index+i[0].length),e.position<=i.index&&s<0&&(s=o.length-2);s<0&&(s=o.length-1);var a="",l,c,u=Math.min(e.line+n.linesAfter,r.length).toString().length,f=n.maxLength-(n.indent+u+3);for(l=1;l<=n.linesBefore&&!(s-l<0);l++)c=kn(e.buffer,o[s-l],r[s-l],e.position-(o[s]-o[s-l]),f),a=M.repeat(" ",n.indent)+vn((e.line-l+1).toString(),u)+" | "+c.str+`
`+a;for(c=kn(e.buffer,o[s],r[s],e.position,f),a+=M.repeat(" ",n.indent)+vn((e.line+1).toString(),u)+" | "+c.str+`
`,a+=M.repeat("-",n.indent+u+3+c.pos)+`^
`,l=1;l<=n.linesAfter&&!(s+l>=r.length);l++)c=kn(e.buffer,o[s+l],r[s+l],e.position-(o[s]-o[s+l]),f),a+=M.repeat(" ",n.indent)+vn((e.line+l+1).toString(),u)+" | "+c.str+`
`;return a.replace(/\n$/,"")}var eo=Xs,no=["kind","multi","resolve","construct","instanceOf","predicate","represent","representName","defaultStyle","styleAliases"],to=["scalar","sequence","mapping"];function ro(e){var n={};return e!==null&&Object.keys(e).forEach(function(t){e[t].forEach(function(o){n[String(o)]=t})}),n}function io(e,n){if(n=n||{},Object.keys(n).forEach(function(t){if(no.indexOf(t)===-1)throw new U('Unknown option "'+t+'" is met in definition of "'+e+'" YAML type.')}),this.options=n,this.tag=e,this.kind=n.kind||null,this.resolve=n.resolve||function(){return!0},this.construct=n.construct||function(t){return t},this.instanceOf=n.instanceOf||null,this.predicate=n.predicate||null,this.represent=n.represent||null,this.representName=n.representName||null,this.defaultStyle=n.defaultStyle||null,this.multi=n.multi||!1,this.styleAliases=ro(n.styleAliases||null),to.indexOf(this.kind)===-1)throw new U('Unknown kind "'+this.kind+'" is specified for "'+e+'" YAML type.')}var F=io;function Kt(e,n){var t=[];return e[n].forEach(function(o){var r=t.length;t.forEach(function(i,s){i.tag===o.tag&&i.kind===o.kind&&i.multi===o.multi&&(r=s)}),t[r]=o}),t}function so(){var e={scalar:{},sequence:{},mapping:{},fallback:{},multi:{scalar:[],sequence:[],mapping:[],fallback:[]}},n,t;function o(r){r.multi?(e.multi[r.kind].push(r),e.multi.fallback.push(r)):e[r.kind][r.tag]=e.fallback[r.tag]=r}for(n=0,t=arguments.length;n<t;n+=1)arguments[n].forEach(o);return e}function Rn(e){return this.extend(e)}Rn.prototype.extend=function(n){var t=[],o=[];if(n instanceof F)o.push(n);else if(Array.isArray(n))o=o.concat(n);else if(n&&(Array.isArray(n.implicit)||Array.isArray(n.explicit)))n.implicit&&(t=t.concat(n.implicit)),n.explicit&&(o=o.concat(n.explicit));else throw new U("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");t.forEach(function(i){if(!(i instanceof F))throw new U("Specified list of YAML types (or a single Type object) contains a non-Type object.");if(i.loadKind&&i.loadKind!=="scalar")throw new U("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");if(i.multi)throw new U("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.")}),o.forEach(function(i){if(!(i instanceof F))throw new U("Specified list of YAML types (or a single Type object) contains a non-Type object.")});var r=Object.create(Rn.prototype);return r.implicit=(this.implicit||[]).concat(t),r.explicit=(this.explicit||[]).concat(o),r.compiledImplicit=Kt(r,"implicit"),r.compiledExplicit=Kt(r,"explicit"),r.compiledTypeMap=so(r.compiledImplicit,r.compiledExplicit),r};var fr=Rn,pr=new F("tag:yaml.org,2002:str",{kind:"scalar",construct:function(e){return e!==null?e:""}}),mr=new F("tag:yaml.org,2002:seq",{kind:"sequence",construct:function(e){return e!==null?e:[]}}),dr=new F("tag:yaml.org,2002:map",{kind:"mapping",construct:function(e){return e!==null?e:{}}}),yr=new fr({explicit:[pr,mr,dr]});function oo(e){if(e===null)return!0;var n=e.length;return n===1&&e==="~"||n===4&&(e==="null"||e==="Null"||e==="NULL")}function ao(){return null}function lo(e){return e===null}var gr=new F("tag:yaml.org,2002:null",{kind:"scalar",resolve:oo,construct:ao,predicate:lo,represent:{canonical:function(){return"~"},lowercase:function(){return"null"},uppercase:function(){return"NULL"},camelcase:function(){return"Null"},empty:function(){return""}},defaultStyle:"lowercase"});function co(e){if(e===null)return!1;var n=e.length;return n===4&&(e==="true"||e==="True"||e==="TRUE")||n===5&&(e==="false"||e==="False"||e==="FALSE")}function uo(e){return e==="true"||e==="True"||e==="TRUE"}function fo(e){return Object.prototype.toString.call(e)==="[object Boolean]"}var hr=new F("tag:yaml.org,2002:bool",{kind:"scalar",resolve:co,construct:uo,predicate:fo,represent:{lowercase:function(e){return e?"true":"false"},uppercase:function(e){return e?"TRUE":"FALSE"},camelcase:function(e){return e?"True":"False"}},defaultStyle:"lowercase"});function po(e){return 48<=e&&e<=57||65<=e&&e<=70||97<=e&&e<=102}function mo(e){return 48<=e&&e<=55}function yo(e){return 48<=e&&e<=57}function go(e){if(e===null)return!1;var n=e.length,t=0,o=!1,r;if(!n)return!1;if(r=e[t],(r==="-"||r==="+")&&(r=e[++t]),r==="0"){if(t+1===n)return!0;if(r=e[++t],r==="b"){for(t++;t<n;t++)if(r=e[t],r!=="_"){if(r!=="0"&&r!=="1")return!1;o=!0}return o&&r!=="_"}if(r==="x"){for(t++;t<n;t++)if(r=e[t],r!=="_"){if(!po(e.charCodeAt(t)))return!1;o=!0}return o&&r!=="_"}if(r==="o"){for(t++;t<n;t++)if(r=e[t],r!=="_"){if(!mo(e.charCodeAt(t)))return!1;o=!0}return o&&r!=="_"}}if(r==="_")return!1;for(;t<n;t++)if(r=e[t],r!=="_"){if(!yo(e.charCodeAt(t)))return!1;o=!0}return!(!o||r==="_")}function ho(e){var n=e,t=1,o;if(n.indexOf("_")!==-1&&(n=n.replace(/_/g,"")),o=n[0],(o==="-"||o==="+")&&(o==="-"&&(t=-1),n=n.slice(1),o=n[0]),n==="0")return 0;if(o==="0"){if(n[1]==="b")return t*parseInt(n.slice(2),2);if(n[1]==="x")return t*parseInt(n.slice(2),16);if(n[1]==="o")return t*parseInt(n.slice(2),8)}return t*parseInt(n,10)}function bo(e){return Object.prototype.toString.call(e)==="[object Number]"&&e%1===0&&!M.isNegativeZero(e)}var br=new F("tag:yaml.org,2002:int",{kind:"scalar",resolve:go,construct:ho,predicate:bo,represent:{binary:function(e){return e>=0?"0b"+e.toString(2):"-0b"+e.toString(2).slice(1)},octal:function(e){return e>=0?"0o"+e.toString(8):"-0o"+e.toString(8).slice(1)},decimal:function(e){return e.toString(10)},hexadecimal:function(e){return e>=0?"0x"+e.toString(16).toUpperCase():"-0x"+e.toString(16).toUpperCase().slice(1)}},defaultStyle:"decimal",styleAliases:{binary:[2,"bin"],octal:[8,"oct"],decimal:[10,"dec"],hexadecimal:[16,"hex"]}}),$o=new RegExp("^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");function To(e){return!(e===null||!$o.test(e)||e[e.length-1]==="_")}function So(e){var n,t;return n=e.replace(/_/g,"").toLowerCase(),t=n[0]==="-"?-1:1,"+-".indexOf(n[0])>=0&&(n=n.slice(1)),n===".inf"?t===1?Number.POSITIVE_INFINITY:Number.NEGATIVE_INFINITY:n===".nan"?NaN:t*parseFloat(n,10)}var xo=/^[-+]?[0-9]+e/;function Ao(e,n){var t;if(isNaN(e))switch(n){case"lowercase":return".nan";case"uppercase":return".NAN";case"camelcase":return".NaN"}else if(Number.POSITIVE_INFINITY===e)switch(n){case"lowercase":return".inf";case"uppercase":return".INF";case"camelcase":return".Inf"}else if(Number.NEGATIVE_INFINITY===e)switch(n){case"lowercase":return"-.inf";case"uppercase":return"-.INF";case"camelcase":return"-.Inf"}else if(M.isNegativeZero(e))return"-0.0";return t=e.toString(10),xo.test(t)?t.replace("e",".e"):t}function jo(e){return Object.prototype.toString.call(e)==="[object Number]"&&(e%1!==0||M.isNegativeZero(e))}var $r=new F("tag:yaml.org,2002:float",{kind:"scalar",resolve:To,construct:So,predicate:jo,represent:Ao,defaultStyle:"lowercase"}),Tr=yr.extend({implicit:[gr,hr,br,$r]}),Sr=Tr,xr=new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"),Ar=new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$");function Oo(e){return e===null?!1:xr.exec(e)!==null||Ar.exec(e)!==null}function No(e){var n,t,o,r,i,s,a,l=0,c=null,u,f,m;if(n=xr.exec(e),n===null&&(n=Ar.exec(e)),n===null)throw new Error("Date resolve error");if(t=+n[1],o=+n[2]-1,r=+n[3],!n[4])return new Date(Date.UTC(t,o,r));if(i=+n[4],s=+n[5],a=+n[6],n[7]){for(l=n[7].slice(0,3);l.length<3;)l+="0";l=+l}return n[9]&&(u=+n[10],f=+(n[11]||0),c=(u*60+f)*6e4,n[9]==="-"&&(c=-c)),m=new Date(Date.UTC(t,o,r,i,s,a,l)),c&&m.setTime(m.getTime()-c),m}function wo(e){return e.toISOString()}var jr=new F("tag:yaml.org,2002:timestamp",{kind:"scalar",resolve:Oo,construct:No,instanceOf:Date,represent:wo});function ko(e){return e==="<<"||e===null}var Or=new F("tag:yaml.org,2002:merge",{kind:"scalar",resolve:ko}),Ln=`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=
\r`;function vo(e){if(e===null)return!1;var n,t,o=0,r=e.length,i=Ln;for(t=0;t<r;t++)if(n=i.indexOf(e.charAt(t)),!(n>64)){if(n<0)return!1;o+=6}return o%8===0}function Co(e){var n,t,o=e.replace(/[\r\n=]/g,""),r=o.length,i=Ln,s=0,a=[];for(n=0;n<r;n++)n%4===0&&n&&(a.push(s>>16&255),a.push(s>>8&255),a.push(s&255)),s=s<<6|i.indexOf(o.charAt(n));return t=r%4*6,t===0?(a.push(s>>16&255),a.push(s>>8&255),a.push(s&255)):t===18?(a.push(s>>10&255),a.push(s>>2&255)):t===12&&a.push(s>>4&255),new Uint8Array(a)}function Ro(e){var n="",t=0,o,r,i=e.length,s=Ln;for(o=0;o<i;o++)o%3===0&&o&&(n+=s[t>>18&63],n+=s[t>>12&63],n+=s[t>>6&63],n+=s[t&63]),t=(t<<8)+e[o];return r=i%3,r===0?(n+=s[t>>18&63],n+=s[t>>12&63],n+=s[t>>6&63],n+=s[t&63]):r===2?(n+=s[t>>10&63],n+=s[t>>4&63],n+=s[t<<2&63],n+=s[64]):r===1&&(n+=s[t>>2&63],n+=s[t<<4&63],n+=s[64],n+=s[64]),n}function _o(e){return Object.prototype.toString.call(e)==="[object Uint8Array]"}var Nr=new F("tag:yaml.org,2002:binary",{kind:"scalar",resolve:vo,construct:Co,predicate:_o,represent:Ro}),Eo=Object.prototype.hasOwnProperty,Io=Object.prototype.toString;function Mo(e){if(e===null)return!0;var n=[],t,o,r,i,s,a=e;for(t=0,o=a.length;t<o;t+=1){if(r=a[t],s=!1,Io.call(r)!=="[object Object]")return!1;for(i in r)if(Eo.call(r,i))if(!s)s=!0;else return!1;if(!s)return!1;if(n.indexOf(i)===-1)n.push(i);else return!1}return!0}function Lo(e){return e!==null?e:[]}var wr=new F("tag:yaml.org,2002:omap",{kind:"sequence",resolve:Mo,construct:Lo}),zo=Object.prototype.toString;function Fo(e){if(e===null)return!0;var n,t,o,r,i,s=e;for(i=new Array(s.length),n=0,t=s.length;n<t;n+=1){if(o=s[n],zo.call(o)!=="[object Object]"||(r=Object.keys(o),r.length!==1))return!1;i[n]=[r[0],o[r[0]]]}return!0}function Do(e){if(e===null)return[];var n,t,o,r,i,s=e;for(i=new Array(s.length),n=0,t=s.length;n<t;n+=1)o=s[n],r=Object.keys(o),i[n]=[r[0],o[r[0]]];return i}var kr=new F("tag:yaml.org,2002:pairs",{kind:"sequence",resolve:Fo,construct:Do}),Go=Object.prototype.hasOwnProperty;function Po(e){if(e===null)return!0;var n,t=e;for(n in t)if(Go.call(t,n)&&t[n]!==null)return!1;return!0}function Uo(e){return e!==null?e:{}}var vr=new F("tag:yaml.org,2002:set",{kind:"mapping",resolve:Po,construct:Uo}),zn=Sr.extend({implicit:[jr,Or],explicit:[Nr,wr,kr,vr]}),re=Object.prototype.hasOwnProperty,Ze=1,Cr=2,Rr=3,Qe=4,Cn=1,Vo=2,Yt=3,qo=/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/,Bo=/[\x85\u2028\u2029]/,Wo=/[,\[\]\{\}]/,_r=/^(?:!|!!|![a-z\-]+!)$/i,Er=/^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;function Ht(e){return Object.prototype.toString.call(e)}function H(e){return e===10||e===13}function me(e){return e===9||e===32}function V(e){return e===9||e===32||e===10||e===13}function xe(e){return e===44||e===91||e===93||e===123||e===125}function Jo(e){var n;return 48<=e&&e<=57?e-48:(n=e|32,97<=n&&n<=102?n-97+10:-1)}function Ko(e){return e===120?2:e===117?4:e===85?8:0}function Yo(e){return 48<=e&&e<=57?e-48:-1}function Zt(e){return e===48?"\0":e===97?"\x07":e===98?"\b":e===116||e===9?"	":e===110?`
`:e===118?"\v":e===102?"\f":e===114?"\r":e===101?"\x1B":e===32?" ":e===34?'"':e===47?"/":e===92?"\\":e===78?"\x85":e===95?"\xA0":e===76?"\u2028":e===80?"\u2029":""}function Ho(e){return e<=65535?String.fromCharCode(e):String.fromCharCode((e-65536>>10)+55296,(e-65536&1023)+56320)}function Ir(e,n,t){n==="__proto__"?Object.defineProperty(e,n,{configurable:!0,enumerable:!0,writable:!0,value:t}):e[n]=t}var Mr=new Array(256),Lr=new Array(256);for(pe=0;pe<256;pe++)Mr[pe]=Zt(pe)?1:0,Lr[pe]=Zt(pe);var pe;function Zo(e,n){this.input=e,this.filename=n.filename||null,this.schema=n.schema||zn,this.onWarning=n.onWarning||null,this.legacy=n.legacy||!1,this.json=n.json||!1,this.listener=n.listener||null,this.implicitTypes=this.schema.compiledImplicit,this.typeMap=this.schema.compiledTypeMap,this.length=e.length,this.position=0,this.line=0,this.lineStart=0,this.lineIndent=0,this.firstTabInLine=-1,this.documents=[]}function zr(e,n){var t={name:e.filename,buffer:e.input.slice(0,-1),position:e.position,line:e.line,column:e.position-e.lineStart};return t.snippet=eo(t),new U(n,t)}function j(e,n){throw zr(e,n)}function Xe(e,n){e.onWarning&&e.onWarning.call(null,zr(e,n))}var Qt={YAML:function(n,t,o){var r,i,s;n.version!==null&&j(n,"duplication of %YAML directive"),o.length!==1&&j(n,"YAML directive accepts exactly one argument"),r=/^([0-9]+)\.([0-9]+)$/.exec(o[0]),r===null&&j(n,"ill-formed argument of the YAML directive"),i=parseInt(r[1],10),s=parseInt(r[2],10),i!==1&&j(n,"unacceptable YAML version of the document"),n.version=o[0],n.checkLineBreaks=s<2,s!==1&&s!==2&&Xe(n,"unsupported YAML version of the document")},TAG:function(n,t,o){var r,i;o.length!==2&&j(n,"TAG directive accepts exactly two arguments"),r=o[0],i=o[1],_r.test(r)||j(n,"ill-formed tag handle (first argument) of the TAG directive"),re.call(n.tagMap,r)&&j(n,'there is a previously declared suffix for "'+r+'" tag handle'),Er.test(i)||j(n,"ill-formed tag prefix (second argument) of the TAG directive");try{i=decodeURIComponent(i)}catch{j(n,"tag prefix is malformed: "+i)}n.tagMap[r]=i}};function te(e,n,t,o){var r,i,s,a;if(n<t){if(a=e.input.slice(n,t),o)for(r=0,i=a.length;r<i;r+=1)s=a.charCodeAt(r),s===9||32<=s&&s<=1114111||j(e,"expected valid JSON character");else qo.test(a)&&j(e,"the stream contains non-printable characters");e.result+=a}}function Xt(e,n,t,o){var r,i,s,a;for(M.isObject(t)||j(e,"cannot merge mappings; the provided source object is unacceptable"),r=Object.keys(t),s=0,a=r.length;s<a;s+=1)i=r[s],re.call(n,i)||(Ir(n,i,t[i]),o[i]=!0)}function Ae(e,n,t,o,r,i,s,a,l){var c,u;if(Array.isArray(r))for(r=Array.prototype.slice.call(r),c=0,u=r.length;c<u;c+=1)Array.isArray(r[c])&&j(e,"nested arrays are not supported inside keys"),typeof r=="object"&&Ht(r[c])==="[object Object]"&&(r[c]="[object Object]");if(typeof r=="object"&&Ht(r)==="[object Object]"&&(r="[object Object]"),r=String(r),n===null&&(n={}),o==="tag:yaml.org,2002:merge")if(Array.isArray(i))for(c=0,u=i.length;c<u;c+=1)Xt(e,n,i[c],t);else Xt(e,n,i,t);else!e.json&&!re.call(t,r)&&re.call(n,r)&&(e.line=s||e.line,e.lineStart=a||e.lineStart,e.position=l||e.position,j(e,"duplicated mapping key")),Ir(n,r,i),delete t[r];return n}function Fn(e){var n;n=e.input.charCodeAt(e.position),n===10?e.position++:n===13?(e.position++,e.input.charCodeAt(e.position)===10&&e.position++):j(e,"a line break is expected"),e.line+=1,e.lineStart=e.position,e.firstTabInLine=-1}function I(e,n,t){for(var o=0,r=e.input.charCodeAt(e.position);r!==0;){for(;me(r);)r===9&&e.firstTabInLine===-1&&(e.firstTabInLine=e.position),r=e.input.charCodeAt(++e.position);if(n&&r===35)do r=e.input.charCodeAt(++e.position);while(r!==10&&r!==13&&r!==0);if(H(r))for(Fn(e),r=e.input.charCodeAt(e.position),o++,e.lineIndent=0;r===32;)e.lineIndent++,r=e.input.charCodeAt(++e.position);else break}return t!==-1&&o!==0&&e.lineIndent<t&&Xe(e,"deficient indentation"),o}function tn(e){var n=e.position,t;return t=e.input.charCodeAt(n),!!((t===45||t===46)&&t===e.input.charCodeAt(n+1)&&t===e.input.charCodeAt(n+2)&&(n+=3,t=e.input.charCodeAt(n),t===0||V(t)))}function Dn(e,n){n===1?e.result+=" ":n>1&&(e.result+=M.repeat(`
`,n-1))}function Qo(e,n,t){var o,r,i,s,a,l,c,u,f=e.kind,m=e.result,p;if(p=e.input.charCodeAt(e.position),V(p)||xe(p)||p===35||p===38||p===42||p===33||p===124||p===62||p===39||p===34||p===37||p===64||p===96||(p===63||p===45)&&(r=e.input.charCodeAt(e.position+1),V(r)||t&&xe(r)))return!1;for(e.kind="scalar",e.result="",i=s=e.position,a=!1;p!==0;){if(p===58){if(r=e.input.charCodeAt(e.position+1),V(r)||t&&xe(r))break}else if(p===35){if(o=e.input.charCodeAt(e.position-1),V(o))break}else{if(e.position===e.lineStart&&tn(e)||t&&xe(p))break;if(H(p))if(l=e.line,c=e.lineStart,u=e.lineIndent,I(e,!1,-1),e.lineIndent>=n){a=!0,p=e.input.charCodeAt(e.position);continue}else{e.position=s,e.line=l,e.lineStart=c,e.lineIndent=u;break}}a&&(te(e,i,s,!1),Dn(e,e.line-l),i=s=e.position,a=!1),me(p)||(s=e.position+1),p=e.input.charCodeAt(++e.position)}return te(e,i,s,!1),e.result?!0:(e.kind=f,e.result=m,!1)}function Xo(e,n){var t,o,r;if(t=e.input.charCodeAt(e.position),t!==39)return!1;for(e.kind="scalar",e.result="",e.position++,o=r=e.position;(t=e.input.charCodeAt(e.position))!==0;)if(t===39)if(te(e,o,e.position,!0),t=e.input.charCodeAt(++e.position),t===39)o=e.position,e.position++,r=e.position;else return!0;else H(t)?(te(e,o,r,!0),Dn(e,I(e,!1,n)),o=r=e.position):e.position===e.lineStart&&tn(e)?j(e,"unexpected end of the document within a single quoted scalar"):(e.position++,r=e.position);j(e,"unexpected end of the stream within a single quoted scalar")}function ea(e,n){var t,o,r,i,s,a;if(a=e.input.charCodeAt(e.position),a!==34)return!1;for(e.kind="scalar",e.result="",e.position++,t=o=e.position;(a=e.input.charCodeAt(e.position))!==0;){if(a===34)return te(e,t,e.position,!0),e.position++,!0;if(a===92){if(te(e,t,e.position,!0),a=e.input.charCodeAt(++e.position),H(a))I(e,!1,n);else if(a<256&&Mr[a])e.result+=Lr[a],e.position++;else if((s=Ko(a))>0){for(r=s,i=0;r>0;r--)a=e.input.charCodeAt(++e.position),(s=Jo(a))>=0?i=(i<<4)+s:j(e,"expected hexadecimal character");e.result+=Ho(i),e.position++}else j(e,"unknown escape sequence");t=o=e.position}else H(a)?(te(e,t,o,!0),Dn(e,I(e,!1,n)),t=o=e.position):e.position===e.lineStart&&tn(e)?j(e,"unexpected end of the document within a double quoted scalar"):(e.position++,o=e.position)}j(e,"unexpected end of the stream within a double quoted scalar")}function na(e,n){var t=!0,o,r,i,s=e.tag,a,l=e.anchor,c,u,f,m,p,d=Object.create(null),y,g,b,h;if(h=e.input.charCodeAt(e.position),h===91)u=93,p=!1,a=[];else if(h===123)u=125,p=!0,a={};else return!1;for(e.anchor!==null&&(e.anchorMap[e.anchor]=a),h=e.input.charCodeAt(++e.position);h!==0;){if(I(e,!0,n),h=e.input.charCodeAt(e.position),h===u)return e.position++,e.tag=s,e.anchor=l,e.kind=p?"mapping":"sequence",e.result=a,!0;t?h===44&&j(e,"expected the node content, but found ','"):j(e,"missed comma between flow collection entries"),g=y=b=null,f=m=!1,h===63&&(c=e.input.charCodeAt(e.position+1),V(c)&&(f=m=!0,e.position++,I(e,!0,n))),o=e.line,r=e.lineStart,i=e.position,je(e,n,Ze,!1,!0),g=e.tag,y=e.result,I(e,!0,n),h=e.input.charCodeAt(e.position),(m||e.line===o)&&h===58&&(f=!0,h=e.input.charCodeAt(++e.position),I(e,!0,n),je(e,n,Ze,!1,!0),b=e.result),p?Ae(e,a,d,g,y,b,o,r,i):f?a.push(Ae(e,null,d,g,y,b,o,r,i)):a.push(y),I(e,!0,n),h=e.input.charCodeAt(e.position),h===44?(t=!0,h=e.input.charCodeAt(++e.position)):t=!1}j(e,"unexpected end of the stream within a flow collection")}function ta(e,n){var t,o,r=Cn,i=!1,s=!1,a=n,l=0,c=!1,u,f;if(f=e.input.charCodeAt(e.position),f===124)o=!1;else if(f===62)o=!0;else return!1;for(e.kind="scalar",e.result="";f!==0;)if(f=e.input.charCodeAt(++e.position),f===43||f===45)Cn===r?r=f===43?Yt:Vo:j(e,"repeat of a chomping mode identifier");else if((u=Yo(f))>=0)u===0?j(e,"bad explicit indentation width of a block scalar; it cannot be less than one"):s?j(e,"repeat of an indentation width identifier"):(a=n+u-1,s=!0);else break;if(me(f)){do f=e.input.charCodeAt(++e.position);while(me(f));if(f===35)do f=e.input.charCodeAt(++e.position);while(!H(f)&&f!==0)}for(;f!==0;){for(Fn(e),e.lineIndent=0,f=e.input.charCodeAt(e.position);(!s||e.lineIndent<a)&&f===32;)e.lineIndent++,f=e.input.charCodeAt(++e.position);if(!s&&e.lineIndent>a&&(a=e.lineIndent),H(f)){l++;continue}if(e.lineIndent<a){r===Yt?e.result+=M.repeat(`
`,i?1+l:l):r===Cn&&i&&(e.result+=`
`);break}for(o?me(f)?(c=!0,e.result+=M.repeat(`
`,i?1+l:l)):c?(c=!1,e.result+=M.repeat(`
`,l+1)):l===0?i&&(e.result+=" "):e.result+=M.repeat(`
`,l):e.result+=M.repeat(`
`,i?1+l:l),i=!0,s=!0,l=0,t=e.position;!H(f)&&f!==0;)f=e.input.charCodeAt(++e.position);te(e,t,e.position,!1)}return!0}function er(e,n){var t,o=e.tag,r=e.anchor,i=[],s,a=!1,l;if(e.firstTabInLine!==-1)return!1;for(e.anchor!==null&&(e.anchorMap[e.anchor]=i),l=e.input.charCodeAt(e.position);l!==0&&(e.firstTabInLine!==-1&&(e.position=e.firstTabInLine,j(e,"tab characters must not be used in indentation")),!(l!==45||(s=e.input.charCodeAt(e.position+1),!V(s))));){if(a=!0,e.position++,I(e,!0,-1)&&e.lineIndent<=n){i.push(null),l=e.input.charCodeAt(e.position);continue}if(t=e.line,je(e,n,Rr,!1,!0),i.push(e.result),I(e,!0,-1),l=e.input.charCodeAt(e.position),(e.line===t||e.lineIndent>n)&&l!==0)j(e,"bad indentation of a sequence entry");else if(e.lineIndent<n)break}return a?(e.tag=o,e.anchor=r,e.kind="sequence",e.result=i,!0):!1}function ra(e,n,t){var o,r,i,s,a,l,c=e.tag,u=e.anchor,f={},m=Object.create(null),p=null,d=null,y=null,g=!1,b=!1,h;if(e.firstTabInLine!==-1)return!1;for(e.anchor!==null&&(e.anchorMap[e.anchor]=f),h=e.input.charCodeAt(e.position);h!==0;){if(!g&&e.firstTabInLine!==-1&&(e.position=e.firstTabInLine,j(e,"tab characters must not be used in indentation")),o=e.input.charCodeAt(e.position+1),i=e.line,(h===63||h===58)&&V(o))h===63?(g&&(Ae(e,f,m,p,d,null,s,a,l),p=d=y=null),b=!0,g=!0,r=!0):g?(g=!1,r=!0):j(e,"incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line"),e.position+=1,h=o;else{if(s=e.line,a=e.lineStart,l=e.position,!je(e,t,Cr,!1,!0))break;if(e.line===i){for(h=e.input.charCodeAt(e.position);me(h);)h=e.input.charCodeAt(++e.position);if(h===58)h=e.input.charCodeAt(++e.position),V(h)||j(e,"a whitespace character is expected after the key-value separator within a block mapping"),g&&(Ae(e,f,m,p,d,null,s,a,l),p=d=y=null),b=!0,g=!1,r=!1,p=e.tag,d=e.result;else if(b)j(e,"can not read an implicit mapping pair; a colon is missed");else return e.tag=c,e.anchor=u,!0}else if(b)j(e,"can not read a block mapping entry; a multiline key may not be an implicit key");else return e.tag=c,e.anchor=u,!0}if((e.line===i||e.lineIndent>n)&&(g&&(s=e.line,a=e.lineStart,l=e.position),je(e,n,Qe,!0,r)&&(g?d=e.result:y=e.result),g||(Ae(e,f,m,p,d,y,s,a,l),p=d=y=null),I(e,!0,-1),h=e.input.charCodeAt(e.position)),(e.line===i||e.lineIndent>n)&&h!==0)j(e,"bad indentation of a mapping entry");else if(e.lineIndent<n)break}return g&&Ae(e,f,m,p,d,null,s,a,l),b&&(e.tag=c,e.anchor=u,e.kind="mapping",e.result=f),b}function ia(e){var n,t=!1,o=!1,r,i,s;if(s=e.input.charCodeAt(e.position),s!==33)return!1;if(e.tag!==null&&j(e,"duplication of a tag property"),s=e.input.charCodeAt(++e.position),s===60?(t=!0,s=e.input.charCodeAt(++e.position)):s===33?(o=!0,r="!!",s=e.input.charCodeAt(++e.position)):r="!",n=e.position,t){do s=e.input.charCodeAt(++e.position);while(s!==0&&s!==62);e.position<e.length?(i=e.input.slice(n,e.position),s=e.input.charCodeAt(++e.position)):j(e,"unexpected end of the stream within a verbatim tag")}else{for(;s!==0&&!V(s);)s===33&&(o?j(e,"tag suffix cannot contain exclamation marks"):(r=e.input.slice(n-1,e.position+1),_r.test(r)||j(e,"named tag handle cannot contain such characters"),o=!0,n=e.position+1)),s=e.input.charCodeAt(++e.position);i=e.input.slice(n,e.position),Wo.test(i)&&j(e,"tag suffix cannot contain flow indicator characters")}i&&!Er.test(i)&&j(e,"tag name cannot contain such characters: "+i);try{i=decodeURIComponent(i)}catch{j(e,"tag name is malformed: "+i)}return t?e.tag=i:re.call(e.tagMap,r)?e.tag=e.tagMap[r]+i:r==="!"?e.tag="!"+i:r==="!!"?e.tag="tag:yaml.org,2002:"+i:j(e,'undeclared tag handle "'+r+'"'),!0}function sa(e){var n,t;if(t=e.input.charCodeAt(e.position),t!==38)return!1;for(e.anchor!==null&&j(e,"duplication of an anchor property"),t=e.input.charCodeAt(++e.position),n=e.position;t!==0&&!V(t)&&!xe(t);)t=e.input.charCodeAt(++e.position);return e.position===n&&j(e,"name of an anchor node must contain at least one character"),e.anchor=e.input.slice(n,e.position),!0}function oa(e){var n,t,o;if(o=e.input.charCodeAt(e.position),o!==42)return!1;for(o=e.input.charCodeAt(++e.position),n=e.position;o!==0&&!V(o)&&!xe(o);)o=e.input.charCodeAt(++e.position);return e.position===n&&j(e,"name of an alias node must contain at least one character"),t=e.input.slice(n,e.position),re.call(e.anchorMap,t)||j(e,'unidentified alias "'+t+'"'),e.result=e.anchorMap[t],I(e,!0,-1),!0}function je(e,n,t,o,r){var i,s,a,l=1,c=!1,u=!1,f,m,p,d,y,g;if(e.listener!==null&&e.listener("open",e),e.tag=null,e.anchor=null,e.kind=null,e.result=null,i=s=a=Qe===t||Rr===t,o&&I(e,!0,-1)&&(c=!0,e.lineIndent>n?l=1:e.lineIndent===n?l=0:e.lineIndent<n&&(l=-1)),l===1)for(;ia(e)||sa(e);)I(e,!0,-1)?(c=!0,a=i,e.lineIndent>n?l=1:e.lineIndent===n?l=0:e.lineIndent<n&&(l=-1)):a=!1;if(a&&(a=c||r),(l===1||Qe===t)&&(Ze===t||Cr===t?y=n:y=n+1,g=e.position-e.lineStart,l===1?a&&(er(e,g)||ra(e,g,y))||na(e,y)?u=!0:(s&&ta(e,y)||Xo(e,y)||ea(e,y)?u=!0:oa(e)?(u=!0,(e.tag!==null||e.anchor!==null)&&j(e,"alias node should not have any properties")):Qo(e,y,Ze===t)&&(u=!0,e.tag===null&&(e.tag="?")),e.anchor!==null&&(e.anchorMap[e.anchor]=e.result)):l===0&&(u=a&&er(e,g))),e.tag===null)e.anchor!==null&&(e.anchorMap[e.anchor]=e.result);else if(e.tag==="?"){for(e.result!==null&&e.kind!=="scalar"&&j(e,'unacceptable node kind for !<?> tag; it should be "scalar", not "'+e.kind+'"'),f=0,m=e.implicitTypes.length;f<m;f+=1)if(d=e.implicitTypes[f],d.resolve(e.result)){e.result=d.construct(e.result),e.tag=d.tag,e.anchor!==null&&(e.anchorMap[e.anchor]=e.result);break}}else if(e.tag!=="!"){if(re.call(e.typeMap[e.kind||"fallback"],e.tag))d=e.typeMap[e.kind||"fallback"][e.tag];else for(d=null,p=e.typeMap.multi[e.kind||"fallback"],f=0,m=p.length;f<m;f+=1)if(e.tag.slice(0,p[f].tag.length)===p[f].tag){d=p[f];break}d||j(e,"unknown tag !<"+e.tag+">"),e.result!==null&&d.kind!==e.kind&&j(e,"unacceptable node kind for !<"+e.tag+'> tag; it should be "'+d.kind+'", not "'+e.kind+'"'),d.resolve(e.result,e.tag)?(e.result=d.construct(e.result,e.tag),e.anchor!==null&&(e.anchorMap[e.anchor]=e.result)):j(e,"cannot resolve a node with !<"+e.tag+"> explicit tag")}return e.listener!==null&&e.listener("close",e),e.tag!==null||e.anchor!==null||u}function aa(e){var n=e.position,t,o,r,i=!1,s;for(e.version=null,e.checkLineBreaks=e.legacy,e.tagMap=Object.create(null),e.anchorMap=Object.create(null);(s=e.input.charCodeAt(e.position))!==0&&(I(e,!0,-1),s=e.input.charCodeAt(e.position),!(e.lineIndent>0||s!==37));){for(i=!0,s=e.input.charCodeAt(++e.position),t=e.position;s!==0&&!V(s);)s=e.input.charCodeAt(++e.position);for(o=e.input.slice(t,e.position),r=[],o.length<1&&j(e,"directive name must not be less than one character in length");s!==0;){for(;me(s);)s=e.input.charCodeAt(++e.position);if(s===35){do s=e.input.charCodeAt(++e.position);while(s!==0&&!H(s));break}if(H(s))break;for(t=e.position;s!==0&&!V(s);)s=e.input.charCodeAt(++e.position);r.push(e.input.slice(t,e.position))}s!==0&&Fn(e),re.call(Qt,o)?Qt[o](e,o,r):Xe(e,'unknown document directive "'+o+'"')}if(I(e,!0,-1),e.lineIndent===0&&e.input.charCodeAt(e.position)===45&&e.input.charCodeAt(e.position+1)===45&&e.input.charCodeAt(e.position+2)===45?(e.position+=3,I(e,!0,-1)):i&&j(e,"directives end mark is expected"),je(e,e.lineIndent-1,Qe,!1,!0),I(e,!0,-1),e.checkLineBreaks&&Bo.test(e.input.slice(n,e.position))&&Xe(e,"non-ASCII line breaks are interpreted as content"),e.documents.push(e.result),e.position===e.lineStart&&tn(e)){e.input.charCodeAt(e.position)===46&&(e.position+=3,I(e,!0,-1));return}if(e.position<e.length-1)j(e,"end of the stream or a document separator is expected");else return}function Fr(e,n){e=String(e),n=n||{},e.length!==0&&(e.charCodeAt(e.length-1)!==10&&e.charCodeAt(e.length-1)!==13&&(e+=`
`),e.charCodeAt(0)===65279&&(e=e.slice(1)));var t=new Zo(e,n),o=e.indexOf("\0");for(o!==-1&&(t.position=o,j(t,"null byte is not allowed in input")),t.input+="\0";t.input.charCodeAt(t.position)===32;)t.lineIndent+=1,t.position+=1;for(;t.position<t.length-1;)aa(t);return t.documents}function la(e,n,t){n!==null&&typeof n=="object"&&typeof t>"u"&&(t=n,n=null);var o=Fr(e,t);if(typeof n!="function")return o;for(var r=0,i=o.length;r<i;r+=1)n(o[r])}function ca(e,n){var t=Fr(e,n);if(t.length!==0){if(t.length===1)return t[0];throw new U("expected a single document in the stream, but found more")}}var ua=la,fa=ca,Dr={loadAll:ua,load:fa},Gr=Object.prototype.toString,Pr=Object.prototype.hasOwnProperty,Gn=65279,pa=9,ze=10,ma=13,da=32,ya=33,ga=34,_n=35,ha=37,ba=38,$a=39,Ta=42,Ur=44,Sa=45,en=58,xa=61,Aa=62,ja=63,Oa=64,Vr=91,qr=93,Na=96,Br=123,wa=124,Wr=125,D={};D[0]="\\0";D[7]="\\a";D[8]="\\b";D[9]="\\t";D[10]="\\n";D[11]="\\v";D[12]="\\f";D[13]="\\r";D[27]="\\e";D[34]='\\"';D[92]="\\\\";D[133]="\\N";D[160]="\\_";D[8232]="\\L";D[8233]="\\P";var ka=["y","Y","yes","Yes","YES","on","On","ON","n","N","no","No","NO","off","Off","OFF"],va=/^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;function Ca(e,n){var t,o,r,i,s,a,l;if(n===null)return{};for(t={},o=Object.keys(n),r=0,i=o.length;r<i;r+=1)s=o[r],a=String(n[s]),s.slice(0,2)==="!!"&&(s="tag:yaml.org,2002:"+s.slice(2)),l=e.compiledTypeMap.fallback[s],l&&Pr.call(l.styleAliases,a)&&(a=l.styleAliases[a]),t[s]=a;return t}function Ra(e){var n,t,o;if(n=e.toString(16).toUpperCase(),e<=255)t="x",o=2;else if(e<=65535)t="u",o=4;else if(e<=4294967295)t="U",o=8;else throw new U("code point within a string may not be greater than 0xFFFFFFFF");return"\\"+t+M.repeat("0",o-n.length)+n}var _a=1,Fe=2;function Ea(e){this.schema=e.schema||zn,this.indent=Math.max(1,e.indent||2),this.noArrayIndent=e.noArrayIndent||!1,this.skipInvalid=e.skipInvalid||!1,this.flowLevel=M.isNothing(e.flowLevel)?-1:e.flowLevel,this.styleMap=Ca(this.schema,e.styles||null),this.sortKeys=e.sortKeys||!1,this.lineWidth=e.lineWidth||80,this.noRefs=e.noRefs||!1,this.noCompatMode=e.noCompatMode||!1,this.condenseFlow=e.condenseFlow||!1,this.quotingType=e.quotingType==='"'?Fe:_a,this.forceQuotes=e.forceQuotes||!1,this.replacer=typeof e.replacer=="function"?e.replacer:null,this.implicitTypes=this.schema.compiledImplicit,this.explicitTypes=this.schema.compiledExplicit,this.tag=null,this.result="",this.duplicates=[],this.usedDuplicates=null}function nr(e,n){for(var t=M.repeat(" ",n),o=0,r=-1,i="",s,a=e.length;o<a;)r=e.indexOf(`
`,o),r===-1?(s=e.slice(o),o=a):(s=e.slice(o,r+1),o=r+1),s.length&&s!==`
`&&(i+=t),i+=s;return i}function En(e,n){return`
`+M.repeat(" ",e.indent*n)}function Ia(e,n){var t,o,r;for(t=0,o=e.implicitTypes.length;t<o;t+=1)if(r=e.implicitTypes[t],r.resolve(n))return!0;return!1}function nn(e){return e===da||e===pa}function De(e){return 32<=e&&e<=126||161<=e&&e<=55295&&e!==8232&&e!==8233||57344<=e&&e<=65533&&e!==Gn||65536<=e&&e<=1114111}function tr(e){return De(e)&&e!==Gn&&e!==ma&&e!==ze}function rr(e,n,t){var o=tr(e),r=o&&!nn(e);return(t?o:o&&e!==Ur&&e!==Vr&&e!==qr&&e!==Br&&e!==Wr)&&e!==_n&&!(n===en&&!r)||tr(n)&&!nn(n)&&e===_n||n===en&&r}function Ma(e){return De(e)&&e!==Gn&&!nn(e)&&e!==Sa&&e!==ja&&e!==en&&e!==Ur&&e!==Vr&&e!==qr&&e!==Br&&e!==Wr&&e!==_n&&e!==ba&&e!==Ta&&e!==ya&&e!==wa&&e!==xa&&e!==Aa&&e!==$a&&e!==ga&&e!==ha&&e!==Oa&&e!==Na}function La(e){return!nn(e)&&e!==en}function Me(e,n){var t=e.charCodeAt(n),o;return t>=55296&&t<=56319&&n+1<e.length&&(o=e.charCodeAt(n+1),o>=56320&&o<=57343)?(t-55296)*1024+o-56320+65536:t}function Jr(e){var n=/^\n* /;return n.test(e)}var Kr=1,In=2,Yr=3,Hr=4,Se=5;function za(e,n,t,o,r,i,s,a){var l,c=0,u=null,f=!1,m=!1,p=o!==-1,d=-1,y=Ma(Me(e,0))&&La(Me(e,e.length-1));if(n||s)for(l=0;l<e.length;c>=65536?l+=2:l++){if(c=Me(e,l),!De(c))return Se;y=y&&rr(c,u,a),u=c}else{for(l=0;l<e.length;c>=65536?l+=2:l++){if(c=Me(e,l),c===ze)f=!0,p&&(m=m||l-d-1>o&&e[d+1]!==" ",d=l);else if(!De(c))return Se;y=y&&rr(c,u,a),u=c}m=m||p&&l-d-1>o&&e[d+1]!==" "}return!f&&!m?y&&!s&&!r(e)?Kr:i===Fe?Se:In:t>9&&Jr(e)?Se:s?i===Fe?Se:In:m?Hr:Yr}function Fa(e,n,t,o,r){e.dump=(function(){if(n.length===0)return e.quotingType===Fe?'""':"''";if(!e.noCompatMode&&(ka.indexOf(n)!==-1||va.test(n)))return e.quotingType===Fe?'"'+n+'"':"'"+n+"'";var i=e.indent*Math.max(1,t),s=e.lineWidth===-1?-1:Math.max(Math.min(e.lineWidth,40),e.lineWidth-i),a=o||e.flowLevel>-1&&t>=e.flowLevel;function l(c){return Ia(e,c)}switch(za(n,a,e.indent,s,l,e.quotingType,e.forceQuotes&&!o,r)){case Kr:return n;case In:return"'"+n.replace(/'/g,"''")+"'";case Yr:return"|"+ir(n,e.indent)+sr(nr(n,i));case Hr:return">"+ir(n,e.indent)+sr(nr(Da(n,s),i));case Se:return'"'+Ga(n)+'"';default:throw new U("impossible error: invalid scalar style")}})()}function ir(e,n){var t=Jr(e)?String(n):"",o=e[e.length-1]===`
`,r=o&&(e[e.length-2]===`
`||e===`
`),i=r?"+":o?"":"-";return t+i+`
`}function sr(e){return e[e.length-1]===`
`?e.slice(0,-1):e}function Da(e,n){for(var t=/(\n+)([^\n]*)/g,o=(function(){var c=e.indexOf(`
`);return c=c!==-1?c:e.length,t.lastIndex=c,or(e.slice(0,c),n)})(),r=e[0]===`
`||e[0]===" ",i,s;s=t.exec(e);){var a=s[1],l=s[2];i=l[0]===" ",o+=a+(!r&&!i&&l!==""?`
`:"")+or(l,n),r=i}return o}function or(e,n){if(e===""||e[0]===" ")return e;for(var t=/ [^ ]/g,o,r=0,i,s=0,a=0,l="";o=t.exec(e);)a=o.index,a-r>n&&(i=s>r?s:a,l+=`
`+e.slice(r,i),r=i+1),s=a;return l+=`
`,e.length-r>n&&s>r?l+=e.slice(r,s)+`
`+e.slice(s+1):l+=e.slice(r),l.slice(1)}function Ga(e){for(var n="",t=0,o,r=0;r<e.length;t>=65536?r+=2:r++)t=Me(e,r),o=D[t],!o&&De(t)?(n+=e[r],t>=65536&&(n+=e[r+1])):n+=o||Ra(t);return n}function Pa(e,n,t){var o="",r=e.tag,i,s,a;for(i=0,s=t.length;i<s;i+=1)a=t[i],e.replacer&&(a=e.replacer.call(t,String(i),a)),(ee(e,n,a,!1,!1)||typeof a>"u"&&ee(e,n,null,!1,!1))&&(o!==""&&(o+=","+(e.condenseFlow?"":" ")),o+=e.dump);e.tag=r,e.dump="["+o+"]"}function ar(e,n,t,o){var r="",i=e.tag,s,a,l;for(s=0,a=t.length;s<a;s+=1)l=t[s],e.replacer&&(l=e.replacer.call(t,String(s),l)),(ee(e,n+1,l,!0,!0,!1,!0)||typeof l>"u"&&ee(e,n+1,null,!0,!0,!1,!0))&&((!o||r!=="")&&(r+=En(e,n)),e.dump&&ze===e.dump.charCodeAt(0)?r+="-":r+="- ",r+=e.dump);e.tag=i,e.dump=r||"[]"}function Ua(e,n,t){var o="",r=e.tag,i=Object.keys(t),s,a,l,c,u;for(s=0,a=i.length;s<a;s+=1)u="",o!==""&&(u+=", "),e.condenseFlow&&(u+='"'),l=i[s],c=t[l],e.replacer&&(c=e.replacer.call(t,l,c)),ee(e,n,l,!1,!1)&&(e.dump.length>1024&&(u+="? "),u+=e.dump+(e.condenseFlow?'"':"")+":"+(e.condenseFlow?"":" "),ee(e,n,c,!1,!1)&&(u+=e.dump,o+=u));e.tag=r,e.dump="{"+o+"}"}function Va(e,n,t,o){var r="",i=e.tag,s=Object.keys(t),a,l,c,u,f,m;if(e.sortKeys===!0)s.sort();else if(typeof e.sortKeys=="function")s.sort(e.sortKeys);else if(e.sortKeys)throw new U("sortKeys must be a boolean or a function");for(a=0,l=s.length;a<l;a+=1)m="",(!o||r!=="")&&(m+=En(e,n)),c=s[a],u=t[c],e.replacer&&(u=e.replacer.call(t,c,u)),ee(e,n+1,c,!0,!0,!0)&&(f=e.tag!==null&&e.tag!=="?"||e.dump&&e.dump.length>1024,f&&(e.dump&&ze===e.dump.charCodeAt(0)?m+="?":m+="? "),m+=e.dump,f&&(m+=En(e,n)),ee(e,n+1,u,!0,f)&&(e.dump&&ze===e.dump.charCodeAt(0)?m+=":":m+=": ",m+=e.dump,r+=m));e.tag=i,e.dump=r||"{}"}function lr(e,n,t){var o,r,i,s,a,l;for(r=t?e.explicitTypes:e.implicitTypes,i=0,s=r.length;i<s;i+=1)if(a=r[i],(a.instanceOf||a.predicate)&&(!a.instanceOf||typeof n=="object"&&n instanceof a.instanceOf)&&(!a.predicate||a.predicate(n))){if(t?a.multi&&a.representName?e.tag=a.representName(n):e.tag=a.tag:e.tag="?",a.represent){if(l=e.styleMap[a.tag]||a.defaultStyle,Gr.call(a.represent)==="[object Function]")o=a.represent(n,l);else if(Pr.call(a.represent,l))o=a.represent[l](n,l);else throw new U("!<"+a.tag+'> tag resolver accepts not "'+l+'" style');e.dump=o}return!0}return!1}function ee(e,n,t,o,r,i,s){e.tag=null,e.dump=t,lr(e,t,!1)||lr(e,t,!0);var a=Gr.call(e.dump),l=o,c;o&&(o=e.flowLevel<0||e.flowLevel>n);var u=a==="[object Object]"||a==="[object Array]",f,m;if(u&&(f=e.duplicates.indexOf(t),m=f!==-1),(e.tag!==null&&e.tag!=="?"||m||e.indent!==2&&n>0)&&(r=!1),m&&e.usedDuplicates[f])e.dump="*ref_"+f;else{if(u&&m&&!e.usedDuplicates[f]&&(e.usedDuplicates[f]=!0),a==="[object Object]")o&&Object.keys(e.dump).length!==0?(Va(e,n,e.dump,r),m&&(e.dump="&ref_"+f+e.dump)):(Ua(e,n,e.dump),m&&(e.dump="&ref_"+f+" "+e.dump));else if(a==="[object Array]")o&&e.dump.length!==0?(e.noArrayIndent&&!s&&n>0?ar(e,n-1,e.dump,r):ar(e,n,e.dump,r),m&&(e.dump="&ref_"+f+e.dump)):(Pa(e,n,e.dump),m&&(e.dump="&ref_"+f+" "+e.dump));else if(a==="[object String]")e.tag!=="?"&&Fa(e,e.dump,n,i,l);else{if(a==="[object Undefined]")return!1;if(e.skipInvalid)return!1;throw new U("unacceptable kind of an object to dump "+a)}e.tag!==null&&e.tag!=="?"&&(c=encodeURI(e.tag[0]==="!"?e.tag.slice(1):e.tag).replace(/!/g,"%21"),e.tag[0]==="!"?c="!"+c:c.slice(0,18)==="tag:yaml.org,2002:"?c="!!"+c.slice(18):c="!<"+c+">",e.dump=c+" "+e.dump)}return!0}function qa(e,n){var t=[],o=[],r,i;for(Mn(e,t,o),r=0,i=o.length;r<i;r+=1)n.duplicates.push(t[o[r]]);n.usedDuplicates=new Array(i)}function Mn(e,n,t){var o,r,i;if(e!==null&&typeof e=="object")if(r=n.indexOf(e),r!==-1)t.indexOf(r)===-1&&t.push(r);else if(n.push(e),Array.isArray(e))for(r=0,i=e.length;r<i;r+=1)Mn(e[r],n,t);else for(o=Object.keys(e),r=0,i=o.length;r<i;r+=1)Mn(e[o[r]],n,t)}function Ba(e,n){n=n||{};var t=new Ea(n);t.noRefs||qa(e,t);var o=e;return t.replacer&&(o=t.replacer.call({"":o},"",o)),ee(t,0,o,!0,!0)?t.dump+`
`:""}var Wa=Ba,Ja={dump:Wa};function Pn(e,n){return function(){throw new Error("Function yaml."+e+" is removed in js-yaml 4. Use yaml."+n+" instead, which is now safe by default.")}}var Ka=F,Ya=fr,Ha=yr,Za=Tr,Qa=Sr,Xa=zn,el=Dr.load,nl=Dr.loadAll,tl=Ja.dump,rl=U,il={binary:Nr,float:$r,map:dr,null:gr,pairs:kr,set:vr,timestamp:jr,bool:hr,int:br,merge:Or,omap:wr,seq:mr,str:pr},sl=Pn("safeLoad","load"),ol=Pn("safeLoadAll","loadAll"),al=Pn("safeDump","dump"),Ge={Type:Ka,Schema:Ya,FAILSAFE_SCHEMA:Ha,JSON_SCHEMA:Za,CORE_SCHEMA:Qa,DEFAULT_SCHEMA:Xa,load:el,loadAll:nl,dump:tl,YAMLException:rl,types:il,safeLoad:sl,safeLoadAll:ol,safeDump:al};var A=e=>e.replace(/(^\w|[_\s-]\w)/g,n=>n.replace(/[_\s-]/,"").toUpperCase()),O=e=>e.replace(/([A-Z])/g,"_$1").toLowerCase().replace(/^_/,""),qe=e=>{let n=A(e);return n.charAt(0).toLowerCase()+n.slice(1)},Oe=e=>O(e).toUpperCase(),E=e=>/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(e)?e:JSON.stringify(e),N=e=>e.type==="array"&&e.itemType?e.itemType.fields??{}:e.fields??{},de=e=>e.type==="array"&&e.itemType?e.itemType:e,qn=(e,n="postgres")=>{if(e.type==="number"){let t=e.format==="int";return n==="sqlite"?t?"INTEGER":"REAL":n==="mysql"?t?"BIGINT":"DOUBLE":t?"BIGINT":"DOUBLE PRECISION"}return e.type==="boolean"?n==="mysql"?"TINYINT(1)":"BOOLEAN":e.type==="object"||e.type==="array"||e.type==="union"?n==="postgres"?"JSONB":"JSON":e.format==="uuid"?n==="mysql"?"CHAR(36)":"UUID":e.format==="email"?"VARCHAR(255)":e.format==="url"?"TEXT":e.format==="datetime"?"TIMESTAMP":"VARCHAR(255)"},Qr={generate:e=>{let n=N(e);if(!Object.keys(n).length)return"";let t=Object.keys(n).join(","),o=Object.entries(n).map(([,r])=>r.type==="number"?"0":r.type==="boolean"?"true":r.format==="uuid"?"uuid-xxxx-xxxx":r.format==="email"?"user@example.com":r.format==="url"?"https://example.com":r.format==="datetime"?new Date().toISOString():r.type==="object"&&r.fields?`"${JSON.stringify(Object.fromEntries(Object.entries(r.fields).map(([i,s])=>[i,s.type==="number"?0:s.type==="boolean"?!1:"sample"]))).replace(/"/g,'""')}"`:r.type==="array"?'"[]"':'"sample_value"').join(",");return`${t}
${o}
`}},Xr={generate:(e,n="table_name")=>{let t=N(e);if(!Object.keys(t).length)return"";let o=Object.keys(t).map(i=>`"${i}"`).join(", "),r=Object.entries(t).map(([,i])=>{if(i.type==="number")return"0";if(i.type==="boolean")return"TRUE";if(i.format==="uuid")return"'uuid-xxxx-xxxx'";if(i.format==="email")return"'user@example.com'";if(i.format==="datetime")return`'${new Date().toISOString()}'`;if(i.type==="object"&&i.fields){let s=Object.fromEntries(Object.entries(i.fields).map(([a,l])=>[a,l.type==="number"?0:l.type==="boolean"?!1:"sample"]));return`'${JSON.stringify(s).replace(/'/g,"''")}'`}return i.type==="array"?"'[]'":"'sample_value'"}).join(", ");return`INSERT INTO "${O(n)}" (${o})
VALUES (${r});
`}},ei={generate:(e,n="Root")=>{let t=N(e);if(!Object.keys(t).length)return"";let o="id"in t,r="created_at"in t||"createdAt"in t,i="updated_at"in t||"updatedAt"in t,s=`CREATE TABLE \`${O(n)}\` (
`;o||(s+="  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,\n");for(let[a,l]of Object.entries(t)){let c=l.optional?" NULL":" NOT NULL",u=a.toLowerCase()==="id",f=u&&l.type==="number"?" AUTO_INCREMENT":"",m=u?" PRIMARY KEY":"";s+=`  \`${O(a)}\` ${qn(l,"mysql")}${c}${f}${m},
`}return r||(s+="  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n"),i?s=s.replace(/,\s*$/,`
`):s+="  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP\n",s+=`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`,s}},ni={generate:(e,n="Root")=>{let t=N(e);if(!Object.keys(t).length)return"";let o="id"in t,r="created_at"in t||"createdAt"in t,i="updated_at"in t||"updatedAt"in t,a=`CREATE TABLE "${O(n)}" (
`;o||(a+=`  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
`);for(let[l,c]of Object.entries(t)){let u=c.optional?"":" NOT NULL",m=l.toLowerCase()==="id"?" PRIMARY KEY":"";a+=`  "${O(l)}" ${qn(c,"postgres")}${u}${m},
`}return r||(a+=`  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
`),i?a=a.replace(/,\s*$/,`
`):a+=`  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
`,a+=`);
`,a}},ti={generate:(e,n="Root")=>{let t=N(e);if(!Object.keys(t).length)return"";let o="id"in t,r="created_at"in t||"createdAt"in t,i="updated_at"in t||"updatedAt"in t,s=`CREATE TABLE IF NOT EXISTS "${O(n)}" (
`;o||(s+=`  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
`);for(let[a,l]of Object.entries(t)){let c=l.optional?"":" NOT NULL",f=a.toLowerCase()==="id"?" PRIMARY KEY":"";s+=`  "${O(a)}" ${qn(l,"sqlite")}${c}${f},
`}return r||(s+=`  "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
`),i?s=s.replace(/,\s*$/,`
`):s+=`  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
`,s+=`);
`,s}},ri={generate:(e,n="Root")=>{let t=N(e);if(!Object.keys(t).length)return"";let o="id"in t,r="created_at"in t||"createdAt"in t,i=`CREATE OR REPLACE TABLE ${Oe(n)} (
`;o||(i+=`  ID VARCHAR(36) NOT NULL DEFAULT UUID_STRING(),
`);for(let[s,a]of Object.entries(t)){let l=Oe(s),c="VARCHAR";a.type==="number"?c="DOUBLE":a.type==="boolean"?c="BOOLEAN":a.type==="object"||a.type==="array"?c="VARIANT":a.format==="datetime"&&(c="TIMESTAMP_NTZ"),i+=`  ${l} ${c}${a.optional?"":" NOT NULL"},
`}return r?i=i.replace(/,\s*$/,`
`):i+=`  CREATED_AT TIMESTAMP_NTZ NOT NULL DEFAULT CURRENT_TIMESTAMP()
`,i+=`);
`,i}},ii={generate:(e,n="config")=>{let t=N(e);if(!Object.keys(t).length)return"";let o=`[${O(n)}]
`;for(let[r,i]of Object.entries(t))if(i.type==="object"&&i.fields){o+=`
[${O(n)}.${O(r)}]
`;for(let[s,a]of Object.entries(i.fields))o+=`${O(s)} = ${Zr(a)}
`}else if(i.type==="array"){let s=i.itemType?.type,a=s==="number"?"0":s==="boolean"?"false":'"sample_value"';o+=`${O(r)} = [${a}]
`}else o+=`${O(r)} = ${Zr(i)}
`;return o}},Zr=e=>e.type==="number"?"0":e.type==="boolean"?"false":e.format==="datetime"?'"2024-01-01T00:00:00Z"':'"sample_value"',si={generate:e=>{let n=t=>t.type==="object"&&t.fields?Object.fromEntries(Object.entries(t.fields).map(([o,r])=>[o,n(r)])):t.type==="array"?[n(t.itemType??{type:"string"})]:t.type==="number"?0:t.type==="boolean"?!1:t.format==="uuid"?"uuid-xxxx-xxxx":t.format==="email"?"user@example.com":t.format==="url"?"https://example.com":t.format==="datetime"?"2024-01-01T00:00:00Z":"sample_value";return Ge.dump(n(e),{indent:2})}},oi={generate:e=>{let n=N(e);if(!Object.keys(n).length)return"";let t=(r,i)=>{let s="";for(let[a,l]of Object.entries(r)){let c=Oe(i?`${i}_${a}`:a);if(l.type==="object"&&l.fields)s+=t(l.fields,i?`${i}_${a}`:a);else if(l.type==="array")s+=`${c}=
`;else{let u="your_value_here";l.type==="number"?u="0":l.type==="boolean"?u="false":l.format==="uuid"?u="uuid-xxxx-xxxx-xxxx-xxxxxxxxxxxx":l.format==="email"?u="user@example.com":l.format==="url"?u="https://example.com":l.format==="datetime"&&(u="2024-01-01T00:00:00Z"),s+=`${c}=${u}
`}}return s},o=`# Generated by TypeMorph
`;return o+=t(n,""),o}},ai={generate:e=>{let n=N(e);if(!Object.keys(n).length)return"";let t=(r,i)=>{let s=E(r);if(i.type==="boolean")return`  ${s}: z.enum(["true", "false"]).transform(v => v === "true")`;if(i.type==="number"){let l=i.format==="int"?".int()":"";return`  ${s}: z.coerce.number()${l}`}if(i.format==="url")return`  ${s}: z.url()`;if(i.format==="email")return`  ${s}: z.email()`;let a=i.optional?".optional()":"";return`  ${s}: z.string()${a}`};return`import { z } from "zod";

export const envSchema = z.object({
${Object.entries(n).map(([r,i])=>t(r,i)).join(`,
`)},
});

export type Env = z.infer<typeof envSchema>;

// Throws at startup if any env var is missing or invalid
export const env = envSchema.parse(process.env);`}},li={generate:e=>{let n=N(e);if(!Object.keys(n).length)return"";let t=(r,i)=>{let s="";for(let[a,l]of Object.entries(r)){let c=(i?`${i}.${O(a)}`:O(a)).replace(/_/g,".");if(l.type==="object"&&l.fields)s+=t(l.fields,c);else if(l.type==="array")s+=`${c}=
`;else{let u="sample_value";l.type==="number"?u="0":l.type==="boolean"?u="false":l.format==="datetime"&&(u="2024-01-01T00:00:00Z"),s+=`${c}=${u}
`}}return s},o=`# Generated by TypeMorph
`;return o+=t(n,""),o}},ci={generate:e=>{let n=N(e);if(!Object.keys(n).length)return"";let t=Object.keys(n),o=`| ${t.join(" | ")} |`,r=`| ${t.map(()=>"---").join(" | ")} |`,i=`| ${Object.entries(n).map(([,s])=>s.type==="number"?"0":s.type==="boolean"?"true":s.format==="email"?"user@example.com":s.type==="object"&&s.fields?"`"+JSON.stringify(Object.fromEntries(Object.entries(s.fields).map(([a,l])=>[a,l.type==="number"?0:l.type==="boolean"?!1:"sample"])))+"`":s.type==="array"?"`[]`":"sample").join(" | ")} |`;return`${o}
${r}
${i}
`}},ui={generate:e=>{let n=N(e);if(!Object.keys(n).length)return"";let t=Object.keys(n),o=`[cols="${t.map(()=>"1").join(",")}",options="header"]
|===
`;return o+=`| ${t.join(" | ")}
`,o+=`| ${Object.entries(n).map(([,r])=>r.type==="number"?"0":"sample").join(" | ")}
`,o+=`|===
`,o}},fi={generate:e=>{let n=N(e);if(!Object.keys(n).length)return"";let t=Object.keys(n),o=`\\begin{tabular}{${t.map(()=>"l").join("|")}}
`;return o+=`\\hline
`,o+=t.join(" & ")+` \\\\
\\hline
`,o+=Object.entries(n).map(([,r])=>r.type==="number"?"0":r.type==="boolean"?"false":r.type==="object"?"\\{...\\}":r.type==="array"?"[...]":r.format==="email"?"user@example.com":r.format==="datetime"?"2024-01-01T00:00:00Z":"sample\\_value").join(" & ")+` \\\\
`,o+=`\\hline
\\end{tabular}
`,o}},pi={generate:(e,n="Root")=>{let t=N(e);if(!Object.keys(t).length)return"";let o=`erDiagram
`;o+=`  ${A(n)} {
`;for(let[r,i]of Object.entries(t)){let s="string";i.type==="number"?s="float":i.type==="boolean"?s="boolean":i.type==="object"?s="object":i.type==="array"&&(s="array"),o+=`    ${s} ${r}
`}o+=`  }
`;for(let[r,i]of Object.entries(t)){if(i.type==="object"&&i.fields){let s=A(r);o+=`  ${s} {
`;for(let[a,l]of Object.entries(i.fields)){let c="string";l.type==="number"?c="float":l.type==="boolean"&&(c="boolean"),o+=`    ${c} ${a}
`}o+=`  }
`,o+=`  ${A(n)} ||--o{ ${s} : "has"
`}if(i.type==="array"&&i.itemType?.type==="object"&&i.itemType.fields){let s=A(r)+"Item";o+=`  ${s} {
`;for(let[a,l]of Object.entries(i.itemType.fields))o+=`    ${l.type==="number"?"float":"string"} ${a}
`;o+=`  }
`,o+=`  ${A(n)} ||--o{ ${s} : "contains"
`}}for(let[r,i]of Object.entries(t)){if(i.type!=="string"&&i.type!=="number"||!((r.endsWith("_id")||r.endsWith("Id")&&r!=="Id")&&r.toLowerCase()!=="id"))continue;let a=A(r.replace(/_id$/,"").replace(/Id$/,""));!a||a===A(n)||(o+=`  ${a} {
    string id
  }
`,o+=`  ${A(n)} }o--|| ${a} : "references"
`)}return o}},Pe=e=>e.type==="number"?"double":e.type==="boolean"?"boolean":e.type==="object"&&e.fields?{type:"record",name:"NestedRecord",fields:Object.entries(e.fields).map(([n,t])=>({name:n,type:t.optional?["null",Pe(t)]:Pe(t)}))}:e.type==="array"?{type:"array",items:Pe(e.itemType??{type:"string"})}:e.type==="union"&&e.unionTypes?e.unionTypes.map(n=>n==="number"?"double":n):"string",mi={generate:(e,n="Root")=>{let t=N(e);if(!Object.keys(t).length)return"";let o={type:"record",name:A(n),namespace:"com.example",fields:Object.entries(t).map(([r,i])=>({name:r,type:i.optional?["null",Pe(i)]:Pe(i),default:i.optional?null:void 0}))};return JSON.stringify(o,null,2)}},rn=(e,n)=>{let t=n.optional?"NULLABLE":"REQUIRED";if(n.type==="number")return{name:e,type:"FLOAT64",mode:t};if(n.type==="boolean")return{name:e,type:"BOOL",mode:t};if(n.format==="datetime")return{name:e,type:"TIMESTAMP",mode:t};if(n.type==="object"&&n.fields)return{name:e,type:"RECORD",mode:t,fields:Object.entries(n.fields).map(([o,r])=>rn(o,r))};if(n.type==="array"){let o=n.itemType??{type:"string"};return o.type==="object"&&o.fields?{name:e,type:"RECORD",mode:"REPEATED",fields:Object.entries(o.fields).map(([r,i])=>rn(r,i))}:{name:e,type:rn("_item",o).type,mode:"REPEATED"}}return{name:e,type:"STRING",mode:t}},di={generate:e=>{let n=N(e);if(!Object.keys(n).length)return"";let t=Object.entries(n).map(([o,r])=>rn(o,r));return JSON.stringify(t,null,2)}},Un=e=>{if(e.type==="number")return{N:"0"};if(e.type==="boolean")return{BOOL:!1};if(e.type==="array"){let n=e.itemType??{type:"string"};return{L:[Un(n)]}}return e.type==="object"&&e.fields?{M:Object.fromEntries(Object.entries(e.fields).map(([n,t])=>[n,Un(t)]))}:e.type==="object"?{M:{}}:e.format==="datetime"?{S:"2024-01-01T00:00:00Z"}:e.format==="uuid"?{S:"uuid-xxxx-xxxx"}:e.format==="email"?{S:"user@example.com"}:e.format==="url"?{S:"https://example.com"}:{S:"sample_value"}},yi={generate:(e,n="Root")=>{let t=N(e);if(!Object.keys(t).length)return"";let o={TableName:O(n)+"s",Item:{id:{S:"uuid-xxxx-xxxx"},...Object.fromEntries(Object.entries(t).map(([r,i])=>[r,Un(i)]))}};return JSON.stringify(o,null,2)}},Vn=e=>{if(e.type==="union"&&e.unionTypes){let t={anyOf:e.unionTypes.map(o=>({type:o}))};return e.nullable&&(t.nullable=!0),t}if(e.type==="number"){let t={type:"number",format:"double"};return e.enumValues&&e.enumValues.length&&(t.enum=e.enumValues),e.nullable&&(t.nullable=!0),t}if(e.type==="boolean")return e.nullable?{type:"boolean",nullable:!0}:{type:"boolean"};if(e.type==="array"){let t={type:"array",items:Vn(e.itemType??{type:"string"})};return e.nullable&&(t.nullable=!0),t}if(e.type==="object"&&e.fields){let t={type:"object",properties:Object.fromEntries(Object.entries(e.fields).map(([o,r])=>[o,Vn(r)]))};return e.nullable&&(t.nullable=!0),t}let n={type:"string"};return e.format==="uuid"?n.format="uuid":e.format==="email"?n.format="email":e.format==="url"?n.format="uri":e.format==="datetime"&&(n.type="string",n.format="date-time"),e.enumValues&&e.enumValues.length&&(n.enum=e.enumValues),e.nullable&&(n.nullable=!0),n},gi={generate:(e,n="Root")=>{let t=N(e),o=A(n),r=Object.entries(t).filter(([,s])=>!s.optional).map(([s])=>s),i={openapi:"3.0.3",info:{title:`${o} API`,version:"1.0.0"},paths:{[`/${O(n)}s`]:{get:{summary:`List ${o}s`,responses:{200:{description:"Success",content:{"application/json":{schema:{type:"array",items:{$ref:`#/components/schemas/${o}`}}}}}}},post:{summary:`Create ${o}`,requestBody:{required:!0,content:{"application/json":{schema:{$ref:`#/components/schemas/${o}`}}}},responses:{201:{description:"Created"}}}}},components:{schemas:{[o]:{type:"object",...r.length?{required:r}:{},properties:Object.fromEntries(Object.entries(t).map(([s,a])=>[s,Vn(a)]))}}}};return Ge.dump(i,{indent:2})}},hi={generate:(e,n="Root")=>{let t=A(n),o=`https://api.example.com/${O(n)}s`,r={info:{name:`${t} API`,schema:"https://schema.getpostman.com/json/collection/v2.1.0/"},item:[{name:`GET all ${t}s`,request:{method:"GET",url:{raw:o}}},{name:`POST create ${t}`,request:{method:"POST",url:{raw:o},header:[{key:"Content-Type",value:"application/json"}],body:{mode:"raw",raw:"{}"}}},{name:`GET ${t} by ID`,request:{method:"GET",url:{raw:`${o}/:id`}}},{name:`PUT update ${t}`,request:{method:"PUT",url:{raw:`${o}/:id`}}},{name:`DELETE ${t}`,request:{method:"DELETE",url:{raw:`${o}/:id`}}}]};return JSON.stringify(r,null,2)}},bi={generate:(e,n="Root")=>{let t=`https://api.example.com/${O(n)}s`,o=N(e),r=JSON.stringify(Object.fromEntries(Object.entries(o).map(([i,s])=>[i,s.type==="number"?0:s.type==="boolean"?!1:"sample"])),null,2);return[`### Get all ${n}s`,`GET ${t}`,"Accept: application/json","","###","",`### Create ${n}`,`POST ${t}`,"Content-Type: application/json","",r,"","###","",`### Get ${n} by ID`,`GET ${t}/{{id}}`,"","###"].join(`
`)}},$i={generate:(e,n="Root")=>{let t=N(e),o=Object.keys(t),r=1,i=["{",...o.map(a=>{let l=t[a],c=l.type==="number"?"0":l.type==="boolean"?"false":`\${${r++}:${a}}`;return`  "${a}": ${l.type==="string"||l.format?`"${c}"`:c},`}),"}"],s={[`${A(n)} Scaffold`]:{prefix:`${n.toLowerCase()}-scaffold`,body:i,description:`Generated by TypeMorph: ${A(n)} scaffold`}};return JSON.stringify(s,null,2)}},Ti={generate:(e,n="Root")=>{let t=N(e),o=i=>i.type==="number"?0:i.type==="boolean"?!1:i.type==="object"&&i.fields?Object.fromEntries(Object.entries(i.fields).map(([s,a])=>[s,o(a)])):i.type==="array"?i.itemType?[o(i.itemType)]:[]:i.format==="uuid"?"uuid-xxxx-xxxx":i.format==="email"?"user@example.com":i.format==="url"?"https://example.com":i.format==="datetime"?"2024-01-01T00:00:00Z":"sample",r=JSON.stringify(Object.fromEntries(Object.entries(t).map(([i,s])=>[i,o(s)])),null,2);return`curl -X POST https://api.example.com/${O(n)}s \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -d '${r}'
`}},Si={generate:(e,n="Root")=>{e=de(e);let t=A(n),o=`${t}Schema`,r=(i,s="  ",a=0)=>{if(a>4)return"Schema.Types.Mixed";let l=N(i),c=`{
`;for(let[u,f]of Object.entries(l))if(c+=`${s}  ${E(u)}: `,f.type==="object")c+=r(f,s+"  ",a+1)+`,
`;else if(f.type==="array"){let m=f.itemType;if(m?.type==="object")c+=`[${r(m,s+"  ",a+1)}],
`;else{let p="String";m?.type==="number"?p="Number":m?.type==="boolean"?p="Boolean":m?.type==="union"||m?.type==="any"?p="Schema.Types.Mixed":m?.enumValues&&m.enumValues.length&&(p="String"),c+=`[${p}],
`}}else{let m="String";f.type==="number"?m="Number":f.type==="boolean"?m="Boolean":f.type==="union"&&(m="Schema.Types.Mixed");let p=`type: ${m}`;f.optional||(p+=", required: true"),f.enumValues&&f.enumValues.length&&(p+=`, enum: [${f.enumValues.map(d=>`"${d}"`).join(", ")}]`),c+=`{ ${p} },
`}return c+=`${s}}`,c};if(e.type==="object"){let i=`import mongoose, { Schema, Document } from 'mongoose';

`;return i+=`const ${o} = new Schema(${r(e)}, { timestamps: true });

`,i+=`export interface I${t} extends Document {}
`,i+=`export const ${t} = mongoose.models.${t} || mongoose.model<I${t}>('${t}', ${o});
`,i}return""}},xi={generate:(e,n="Root")=>{let t=N(e);if(!Object.keys(t).length)return"";let o=A(n),r=`import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

`;r+=`export class ${o} extends Model {}

`,r+=`${o}.init({
`,r+=`  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
`;for(let[i,s]of Object.entries(t)){let a="DataTypes.STRING";s.type==="number"?a="DataTypes.DOUBLE":s.type==="boolean"?a="DataTypes.BOOLEAN":s.type==="object"||s.type==="array"||s.type==="union"?a="DataTypes.JSON":s.format==="datetime"&&(a="DataTypes.DATE"),s.enumValues&&s.enumValues.length&&(a=`DataTypes.ENUM(${s.enumValues.map(l=>`'${l}'`).join(", ")})`),r+=`  ${E(i)}: {
    type: ${a},
    allowNull: ${!!s.optional||!!s.nullable}
  },
`}return r+=`}, {
  sequelize,
  modelName: '${o}',
  tableName: '${O(n)}s',
  timestamps: true
});
`,r}},Ai={generate:(e,n="Root")=>{let t=N(e);if(!Object.keys(t).length)return"";let o=A(n),r=`import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

`;r+=`@Entity('${O(n)}s')
`,r+=`export class ${o} {
`,t.id||(r+=`  @PrimaryGeneratedColumn('uuid')
  id!: string;

`);for(let[i,s]of Object.entries(t)){let a="string",l=null;s.type==="number"?(a="number",l="double"):s.type==="boolean"?(a="boolean",l="boolean"):s.type==="object"||s.type==="array"||s.type==="union"?(a="any",l="jsonb"):s.format==="datetime"&&(a="Date",l="timestamp");let c;if(s.enumValues&&s.enumValues.length){a=s.enumValues.map(p=>`'${p}'`).join(" | ");let m=["type: 'enum'",`enum: [${s.enumValues.map(p=>`'${p}'`).join(", ")}]`];s.nullable&&m.push("nullable: true"),c=`@Column({
    ${m.join(`,
    `)}
  })`}else if(s.nullable){let u=[];l&&u.push(`type: '${l}'`),u.push("nullable: true"),c=`@Column({ ${u.join(", ")} })`}else c=l?`@Column('${l}')`:"@Column()";r+=`  ${c}
  ${E(i)}${s.optional?"?":"!"}: ${a}${s.nullable?" | null":""};

`}return!t.createdAt&&!t.created_at&&(r+=`  @CreateDateColumn()
  createdAt!: Date;

`),!t.updatedAt&&!t.updated_at&&(r+=`  @UpdateDateColumn()
  updatedAt!: Date;
`),r+=`}
`,r}},ji={generate:(e,n="Root")=>{let t=N(e);if(!Object.keys(t).length)return"";let o=A(n),r=O(n),i=r.endsWith("s")?r:`${r}s`,s=new Set(["pgTable"]),a=[],l=[],c=[],u=!!t.id,f=!!t.createdAt||!!t.created_at,m=!!t.updatedAt||!!t.updated_at;u||(s.add("uuid"),l.push("  id: uuid('id').defaultRandom().primaryKey()"));for(let[y,g]of Object.entries(t)){let b=O(y),h=y.toLowerCase(),$=!g.optional&&!g.nullable?".notNull()":"",T="";if(y==="id"||h.endsWith("id"))y==="id"&&g.type==="number"?(s.add("serial"),T=`serial('${b}').primaryKey()`):y==="id"?(s.add("uuid"),T=`uuid('${b}').defaultRandom().primaryKey()`):g.type==="number"?(s.add("integer"),T=`integer('${b}')${$}`):(s.add("uuid"),T=`uuid('${b}')${$}`);else if(g.type==="boolean")s.add("boolean"),T=`boolean('${b}')${$}${$?h==="is_active"||h==="isactive"||h==="active"||h==="enabled"||h==="is_enabled"?".default(true)":".default(false)":""}`;else if(g.type==="number"){let S=["price","amount","cost","fee","total","subtotal","balance","payment"].some(C=>h.includes(C)),v=!S&&(g.format==="int"||["count","quantity","qty","age","year","month","day","hour","minute","second","port","rank","size","limit","offset"].some(C=>h.includes(C)));S?(s.add("numeric"),T=`numeric('${b}', { precision: 10, scale: 2 })${$}`):v?(s.add("integer"),T=`integer('${b}')${$}`):(s.add("real"),T=`real('${b}')${$}`)}else if(g.format==="datetime"||h.endsWith("_at")||h==="createdat"||h==="updatedat"||h.includes("timestamp")){s.add("timestamp");let S=h.includes("createdat")||h==="created_at"||h.includes("updatedat")||h==="updated_at"?".defaultNow()":"";T=`timestamp('${b}', { withTimezone: true })${S}${$}`}else if(g.type==="object"||g.type==="array"||g.type==="union")s.add("jsonb"),T=`jsonb('${b}')${$}`,c.push(y);else if(g.enumValues&&g.enumValues.length){s.add("pgEnum");let S=`${qe(y)}Enum`,v=`${r}_${b}`;a.push(`export const ${S} = pgEnum('${v}', [${g.enumValues.map(C=>`'${C}'`).join(", ")}]);`),T=`${S}('${b}')${$}`}else g.format==="uuid"||h==="uuid"?(s.add("uuid"),T=`uuid('${b}')${$}`):g.format==="email"||h.includes("email")?(s.add("varchar"),T=`varchar('${b}', { length: 255 })${$}.unique()`):g.format==="url"||["url","link","website","endpoint","href"].some(S=>h.includes(S))?(s.add("text"),T=`text('${b}')${$}`):["description","bio","content","body","text","note","summary","detail","about","message","comment","remark","excerpt","caption","overview"].some(S=>h.includes(S))?(s.add("text"),T=`text('${b}')${$}`):(s.add("varchar"),T=`varchar('${b}', { length: 255 })${$}`);l.push(`  ${E(y)}: ${T}`)}f||(s.add("timestamp"),l.push("  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()")),m||(s.add("timestamp"),l.push("  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()"));let d=`import { ${["pgTable",...[...s].filter(y=>y==="pgEnum"),...[...s].filter(y=>y!=="pgTable"&&y!=="pgEnum").sort()].join(", ")} } from 'drizzle-orm/pg-core';
`;return a.length&&(d+=`
`+a.join(`
`)+`
`),d+=`
export const ${r} = pgTable('${i}', {
`,d+=l.join(`,
`)+`
`,d+=`});

`,d+=`export type ${o} = typeof ${r}.$inferSelect;
`,d+=`export type New${o} = typeof ${r}.$inferInsert;
`,c.length&&(d+=`
// Note: [${c.join(", ")}] stored as jsonb \u2014 consider extracting to separate tables with foreign key relations.
`),d}},Oi={generate:(e,n="Root")=>{let t=N(e);if(!Object.keys(t).length)return"";let o=A(n),r=[],i=[],s=(c,u)=>{if(u.type==="number")return"number";if(u.type==="boolean")return"boolean";if(u.format==="datetime")return"Date | string";if(u.type==="object"&&u.fields&&Object.keys(u.fields).length){let f=A(c),m=Object.entries(u.fields).map(([d,y])=>`  ${E(d)}: ${s(d,y)};`).join(`
`);r.push(`export interface ${f} {
${m}
}`);let p=O(c).endsWith("s")?O(c):`${O(c)}s`;return i.push(`  ${p}: ${f};`),f}if(u.type==="array"&&u.itemType?.type==="object"&&u.itemType.fields){let f=A(c.replace(/s$/,"")),m=Object.entries(u.itemType.fields).map(([p,d])=>`  ${E(p)}: ${s(p,d)};`).join(`
`);return r.push(`export interface ${f} {
${m}
}`),i.push(`  ${O(c)}: ${f};`),`${f}[]`}return"string"},a=`import { Generated, ColumnType } from 'kysely';

`,l="";t.id||(l+=`  id: Generated<string>;
`);for(let[c,u]of Object.entries(t)){let f=s(c,u),m=u.optional?`${f} | null`:f;l+=`  ${E(c)}: ${m};
`}return!t.createdAt&&!t.created_at&&(l+=`  createdAt: Generated<string>;
`),!t.updatedAt&&!t.updated_at&&(l+=`  updatedAt: ColumnType<string, string | undefined, string>;
`),r.length&&(a+=r.join(`

`)+`

`),a+=`export interface ${o}Table {
${l}}

`,a+=`export interface Database {
`,a+=`  ${O(n)}s: ${o}Table;
`,i.length&&(a+=i.join(`
`)+`
`),a+=`}
`,a}},sn={generate:(e,n="root",t=new Set)=>{if(e=de(e),e.type==="object"&&e.fields){if(t.has(n))return"";t.add(n);let o="";t.size===1&&(o+=`import * as yup from 'yup';

`),o+=`export const ${n}YupSchema = yup.object({
`;for(let[r,i]of Object.entries(e.fields)){let s=i.nullable?".nullable()":"",a=i.optional?"":".required()",l=n+A(r),c="";if(i.type==="object")c=`${l}YupSchema`;else if(i.type==="array"){let u=i.itemType,f;u?.type==="string"&&u.enumValues?f=`yup.string().oneOf([${u.enumValues.map(m=>`"${m}"`).join(", ")}])`:f=u?.type==="object"?`${l}ItemYupSchema`:`yup.${u?.type??"string"}()`,c=`yup.array().of(${f})`}else i.type==="union"&&i.unionTypes?c="yup.mixed()":i.type==="string"&&i.enumValues?c=`yup.string().oneOf([${i.enumValues.map(u=>`"${u}"`).join(", ")}])`:i.type==="string"?(c="yup.string()",i.format==="email"?c+=".email()":i.format==="url"?c+=".url()":i.format==="uuid"&&(c+=".uuid()")):c=i.type==="any"?"yup.mixed()":`yup.${i.type}()`;o+=`  ${E(r)}: ${c}${s}${a},
`}o+=`});

`;for(let[r,i]of Object.entries(e.fields)){let s=n+A(r);i.type==="object"&&(o+=sn.generate(i,s,t)),i.type==="array"&&i.itemType?.type==="object"&&(o+=sn.generate(i.itemType,s+"Item",t))}return o}return""}},on={generate:(e,n="root",t=new Set)=>{if(e=de(e),e.type==="object"&&e.fields){if(t.has(n))return"";t.add(n);let o="";t.size===1&&(o+=`import Joi from 'joi';

`),o+=`export const ${n}JoiSchema = Joi.object({
`;for(let[r,i]of Object.entries(e.fields)){let s=i.nullable?".allow(null)":"",a=i.optional?"":".required()",l=n+A(r),c="";if(i.type==="object")c=`${l}JoiSchema`;else if(i.type==="array"){let u=i.itemType,f;u?.type==="string"&&u.enumValues?f=`Joi.string().valid(${u.enumValues.map(m=>`"${m}"`).join(", ")})`:f=u?.type==="object"?`${l}ItemJoiSchema`:`Joi.${u?.type??"string"}()`,c=`Joi.array().items(${f})`}else i.type==="union"&&i.unionTypes?c=`Joi.alternatives().try(${i.unionTypes.map(u=>`Joi.${u}()`).join(", ")})`:i.type==="string"&&i.enumValues?c=`Joi.string().valid(${i.enumValues.map(u=>`"${u}"`).join(", ")})`:i.type==="string"?(c="Joi.string()",i.format==="email"?c+=".email()":i.format==="url"?c+=".uri()":i.format==="uuid"&&(c+=".guid()")):c=`Joi.${i.type}()`;o+=`  ${E(r)}: ${c}${s}${a},
`}o+=`});

`;for(let[r,i]of Object.entries(e.fields)){let s=n+A(r);i.type==="object"&&(o+=on.generate(i,s,t)),i.type==="array"&&i.itemType?.type==="object"&&(o+=on.generate(i.itemType,s+"Item",t))}return o}return""}},an={generate:(e,n="root",t=new Set)=>{if(e=de(e),e.type==="object"&&e.fields){if(t.has(n))return"";t.add(n);let o="";t.size===1&&(o+=`import * as v from 'valibot';

`),o+=`export const ${n}ValiSchema = v.object({
`;for(let[r,i]of Object.entries(e.fields)){let s=n+A(r),a="";if(i.type==="object")a=`${s}ValiSchema`;else if(i.type==="array"){let l=i.itemType,c;l?.type==="string"&&l.enumValues?c=`v.picklist([${l.enumValues.map(u=>`"${u}"`).join(", ")}])`:c=l?.type==="object"?`${s}ItemValiSchema`:`v.${l?.type??"string"}()`,a=`v.array(${c})`}else i.type==="union"&&i.unionTypes?a=`v.union([${i.unionTypes.map(l=>`v.${l}()`).join(", ")}])`:i.type==="string"&&i.enumValues?a=`v.picklist([${i.enumValues.map(l=>`"${l}"`).join(", ")}])`:i.type==="string"?(a="v.string()",i.format==="email"?a="v.pipe(v.string(), v.email())":i.format==="url"?a="v.pipe(v.string(), v.url())":i.format==="uuid"&&(a="v.pipe(v.string(), v.uuid())")):a=`v.${i.type}()`;i.nullable&&(a=`v.nullable(${a})`),i.optional&&(a=`v.optional(${a})`),o+=`  ${E(r)}: ${a},
`}o+=`});

`;for(let[r,i]of Object.entries(e.fields)){let s=n+A(r);i.type==="object"&&(o+=an.generate(i,s,t)),i.type==="array"&&i.itemType?.type==="object"&&(o+=an.generate(i.itemType,s+"Item",t))}return o}return""}},ln={generate:(e,n="root",t=new Set)=>{if(e=de(e),e.type==="object"&&e.fields){if(t.has(n))return"";t.add(n);let o="";t.size===1&&(o+=`import * as s from 'superstruct';

`),o+=`export const ${n}Struct = s.type({
`;for(let[r,i]of Object.entries(e.fields)){let s=n+A(r),a="";if(i.type==="object")a=`${s}Struct`;else if(i.type==="array"){let l=i.itemType,c;l?.type==="string"&&l.enumValues?c=`s.enums([${l.enumValues.map(u=>`"${u}"`).join(", ")}])`:c=l?.type==="object"?`${s}ItemStruct`:`s.${l?.type??"string"}()`,a=`s.array(${c})`}else i.type==="union"&&i.unionTypes?a=`s.union([${i.unionTypes.map(l=>`s.${l}()`).join(", ")}])`:i.type==="string"&&i.enumValues?a=`s.enums([${i.enumValues.map(l=>`"${l}"`).join(", ")}])`:a=`s.${i.type}()`;i.nullable&&(a=`s.nullable(${a})`),i.optional&&(a=`s.optional(${a})`),o+=`  ${E(r)}: ${a},
`}o+=`});

`;for(let[r,i]of Object.entries(e.fields)){let s=n+A(r);i.type==="object"&&(o+=ln.generate(i,s,t)),i.type==="array"&&i.itemType?.type==="object"&&(o+=ln.generate(i.itemType,s+"Item",t))}return o}return""}},Bn=e=>{if(e.type==="boolean")return"boolean";if(e.type==="number")return"number";if(e.type==="object")return"Record<string, unknown>";if(e.type==="array"){let n=e.itemType;return n?n.type==="string"?"string[]":n.type==="number"?"number[]":n.type==="boolean"?"boolean[]":"Record<string, unknown>[]":"unknown[]"}return"string"},Ni={generate:(e,n="Component")=>{let t=N(e);if(!Object.keys(t).length)return"";let o=A(n),r=`import React from 'react';

`;r+=`export interface ${o}Props {
`;for(let[i,s]of Object.entries(t))r+=`  ${E(i)}${s.optional?"?":""}: ${Bn(s)};
`;r+=`}

`,r+=`export const ${o}: React.FC<${o}Props> = (props) => {
`,r+=`  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800">
`,r+=`      <h2 className="text-xl font-bold mb-2">${o}</h2>
`,r+=`      <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
`;for(let i of Object.keys(t))r+=`        <li><strong>${i}:</strong> {String(props.${i} ?? '')}</li>
`;return r+=`      </ul>
    </div>
  );
};
`,r}},wi={generate:(e,n="State")=>{let t=N(e);if(!Object.keys(t).length)return"";let o=A(n),r=`import React, { createContext, useContext, useState, ReactNode } from 'react';

`;r+=`export interface ${o}State {
`;for(let[i,s]of Object.entries(t))r+=`  ${E(i)}${s.optional?"?":""}: ${Bn(s)};
`;return r+=`}

`,r+=`interface ${o}ContextType {
  state: ${o}State;
  updateState: (updates: Partial<${o}State>) => void;
}

`,r+=`const ${o}Context = createContext<${o}ContextType | undefined>(undefined);

`,r+=`export const ${o}Provider = ({ children, initial }: { children: ReactNode; initial: ${o}State }) => {
`,r+=`  const [state, setState] = useState<${o}State>(initial);
`,r+=`  const updateState = (updates: Partial<${o}State>) => setState(prev => ({ ...prev, ...updates }));

`,r+=`  return (
    <${o}Context.Provider value={{ state, updateState }}>
      {children}
    </${o}Context.Provider>
  );
};

`,r+=`export const use${o}Context = () => {
  const context = useContext(${o}Context);
  if (!context) throw new Error('use${o}Context must be used within ${o}Provider');
  return context;
};
`,r}},ki={generate:(e,n="User")=>{let t=N(e);if(!Object.keys(t).length)return"";let o=A(n),r=O(n),i=`import { createSlice, PayloadAction } from '@reduxjs/toolkit';

`;i+=`export interface ${o}State {
`;for(let[s,a]of Object.entries(t))i+=`  ${E(s)}${a.optional?"?":""}: ${Bn(a)};
`;i+=`}

`,i+=`const initialState: ${o}State = {
`;for(let[s,a]of Object.entries(t)){let l="''";a.type==="number"?l="0":a.type==="boolean"?l="false":a.type==="object"?l="{}":a.type==="array"&&(l="[]"),i+=`  ${E(s)}: ${l},
`}return i+=`};

`,i+=`export const ${r}Slice = createSlice({
`,i+=`  name: '${r}',
  initialState,
  reducers: {
`,i+=`    set${o}: (state, action: PayloadAction<Partial<${o}State>>) => {
`,i+=`      return { ...state, ...action.payload };
`,i+=`    },
`,i+=`    reset${o}: () => initialState,
`,i+=`  },
});

`,i+=`export const { set${o}, reset${o} } = ${r}Slice.actions;
`,i+=`export default ${r}Slice.reducer;
`,i}},vi={generate:(e,n="User")=>{let t=N(e);if(!Object.keys(t).length)return"";let o=A(n),r=O(n),i=a=>a.type==="number"?"number":a.type==="boolean"?"boolean":a.type==="array"?"any[]":a.type==="object"?"Record<string, any>":"string",s=`import { defineStore } from 'pinia';

`;s+=`export interface ${o}State {
`;for(let[a,l]of Object.entries(t))s+=`  ${E(a)}: ${i(l)};
`;s+=`}

`,s+=`export const use${o}Store = defineStore('${r}', {
`,s+=`  state: (): ${o}State => ({
`;for(let[a,l]of Object.entries(t)){let c="''";l.type==="number"?c="0":l.type==="boolean"?c="false":l.type==="object"?c="{}":l.type==="array"&&(c="[]"),s+=`    ${E(a)}: ${c},
`}return s+=`  }),
`,s+=`  actions: {
`,s+=`    update(data: Partial<${o}State>) {
`,s+=`      Object.assign(this, data);
`,s+=`    },
`,s+=`    reset() {
      this.$reset();
    }
`,s+=`  }
});
`,s}},Ci={generate:(e,n="Component")=>{let t=N(e);if(!Object.keys(t).length)return"";let o=`<script setup lang="ts">
`;o+=`defineProps<{
`;for(let[r,i]of Object.entries(t)){let s="string";i.type==="number"?s="number":i.type==="boolean"?s="boolean":i.type==="object"?s="Record<string, any>":i.type==="array"&&(s="any[]"),o+=`  ${r}${i.optional?"?":""}: ${s};
`}o+=`}>();
`,o+=`</script>

`,o+=`<template>
  <div class="vue-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
`,o+=`    <h2 class="text-xl font-bold mb-2">${A(n)}</h2>
`,o+=`    <ul class="text-sm space-y-1">
`;for(let r of Object.keys(t))o+=`      <li><strong>${r}:</strong> {{ ${r} }}</li>
`;return o+=`    </ul>
  </div>
</template>
`,o}},Ri={generate:(e,n="Component")=>{let t=N(e);if(!Object.keys(t).length)return"";let o=i=>i==="number"?"0":i==="boolean"?"false":i==="Record<string, any>"?"{}":i==="any[]"?"[]":"''",r=`<script lang="ts">
`;for(let[i,s]of Object.entries(t)){let a="string";s.type==="number"?a="number":s.type==="boolean"?a="boolean":s.type==="object"?a="Record<string, any>":s.type==="array"&&(a="any[]");let l=s.optional?`${a} | undefined = undefined`:`${a} = ${o(a)}`;r+=`  export let ${i}: ${l};
`}r+=`</script>

`,r+=`<div class="svelte-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
`,r+=`  <h2 class="text-xl font-bold mb-2">${A(n)}</h2>
`,r+=`  <ul class="text-sm space-y-1">
`;for(let i of Object.keys(t))r+=`    <li><strong>${i}:</strong> {${i}}</li>
`;return r+=`  </ul>
</div>
`,r}},_i={generate:(e,n="Component")=>{let t=N(e);if(!Object.keys(t).length)return"";let o=A(n),r=`import { Component } from 'solid-js';

`;r+=`export interface ${o}Props {
`;for(let[i,s]of Object.entries(t)){let a="string";s.type==="number"?a="number":s.type==="boolean"?a="boolean":s.type==="object"?a="Record<string, any>":s.type==="array"&&(a="any[]"),r+=`  ${i}${s.optional?"?":""}: ${a};
`}r+=`}

`,r+=`export const ${o}: Component<${o}Props> = (props) => {
`,r+=`  return (
    <div class="solid-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
`,r+=`      <h2 class="text-xl font-bold mb-2">${o}</h2>
`,r+=`      <ul class="text-sm space-y-1">
`;for(let i of Object.keys(t))r+=`        <li><strong>${i}:</strong> {String(props.${i} ?? '')}</li>
`;return r+=`      </ul>
    </div>
  );
};
`,r}},Ei={generate:(e,n="Data")=>{let t=N(e);if(!Object.keys(t).length)return"";let o=A(n),r=`// Generated by TypeMorph (requires ArduinoJson library)
`;r+=`#include <ArduinoJson.h>

`,r+=`struct ${o} {
`;for(let[i,s]of Object.entries(t)){let a="String";s.type==="number"?a="double":s.type==="boolean"&&(a="bool"),r+=`  ${a} ${i};
`}r+=`};

`,r+=`void deserialize${o}(Stream& stream, ${o}& data) {
`,r+=`  StaticJsonDocument<1024> doc;
`,r+=`  deserializeJson(doc, stream);

`;for(let i of Object.keys(t))r+=`  data.${i} = doc["${i}"];
`;return r+=`}
`,r}},Ii={generate:(e,n="RECORD")=>{let t=N(e);if(!Object.keys(t).length)return"";let o=Oe(n).substring(0,20),r=`      * Generated by TypeMorph \u2014 COBOL Copybook
`;r+=`       01  ${o}.
`;for(let[i,s]of Object.entries(t)){let a=Oe(i).substring(0,20);if(s.type==="object"&&s.fields){r+=`           05  ${a.padEnd(20)}.
`;for(let[l,c]of Object.entries(s.fields)){let u=Oe(l).substring(0,20),f=c.type==="number"?"9(9)V99":c.type==="boolean"?"9(1)":"X(255)";r+=`               10  ${u.padEnd(20)} PIC ${f}.
`}}else if(s.type==="array"){let l=s.itemType?.type==="number"?"9(9)V99":"X(255)";r+=`           05  ${a.padEnd(20)} OCCURS 10 TIMES PIC ${l}.
`}else{let l="X(255)";s.type==="number"?l="9(9)V99":s.type==="boolean"&&(l="9(1)"),r+=`           05  ${a.padEnd(20)} PIC ${l}.
`}}return r}},Mi={generate:(e,n="data")=>{let t=N(e);if(!Object.keys(t).length)return"";let r=`(ns com.example.${O(n)}-spec
  (:require [clojure.spec.alpha :as s]))

`,i=[];for(let[a,l]of Object.entries(t)){let c=`::${O(a)}`;i.push(c);let u="string?";if(l.type==="number")u="number?";else if(l.type==="boolean")u="boolean?";else if(l.type==="array")u="(s/coll-of any?)";else if(l.type==="object"&&l.fields){let f=Object.keys(l.fields).map(m=>`::${O(m)}`);for(let[m,p]of Object.entries(l.fields)){let d=p.type==="number"?"number?":p.type==="boolean"?"boolean?":"string?";r+=`(s/def ::${O(m)} ${d})
`}u=`(s/keys :req [${f.join(" ")}])`}r+=`(s/def ${c} ${u})
`}let s=i.join(" ");return r+=`
(s/def ::${O(n)} (s/keys :req [${s}]))
`,r}},Li={generate:(e,n="Data")=>{let t=N(e);if(!Object.keys(t).length)return"";let r=`defmodule MyApp.${A(n)} do
  use Ecto.Schema
  import Ecto.Changeset

`;r+=`  schema "${O(n)}s" do
`;for(let[s,a]of Object.entries(t)){let l=":string";a.type==="number"?l=":float":a.type==="boolean"?l=":boolean":a.type==="object"||a.type==="array"?l=":map":a.format==="datetime"&&(l=":utc_datetime"),r+=`    field :${O(s)}, ${l}
`}r+=`    timestamps()
  end

`;let i=Object.entries(t).filter(([,s])=>!s.optional).map(([s])=>`:${O(s)}`);return r+=`  def changeset(struct, params \\\\ %{}) do
`,r+=`    struct
`,r+=`    |> cast(params, [${Object.keys(t).map(s=>`:${O(s)}`).join(", ")}])
`,i.length&&(r+=`    |> validate_required([${i.join(", ")}])
`),r+=`  end
end
`,r}},zi={generate:(e,n="Model")=>{let t=N(e);if(!Object.keys(t).length)return"";let o=A(n),r=`module MyApp.${o} exposing (..)

import Json.Decode as Decode exposing (Decoder)
import Json.Decode.Pipeline exposing (required, optional)

`;r+=`type alias ${o} =
    {
`;let i=Object.entries(t).map(([s,a])=>{let l="String";return a.type==="number"?l="Float":a.type==="boolean"&&(l="Bool"),a.optional&&(l=`Maybe ${l}`),`    ${s} : ${l}`});r+=i.join(`
    , `)+`
    }

`,r+=`decoder : Decoder ${o}
decoder =
    Decode.succeed ${o}
`;for(let[s,a]of Object.entries(t)){let l="Decode.string";a.type==="number"?l="Decode.float":a.type==="boolean"&&(l="Decode.bool"),a.optional?r+=`        |> optional "${s}" (Decode.nullable ${l}) Nothing
`:r+=`        |> required "${s}" ${l}
`}return r}},Fi={generate:(e,n="Data")=>{let t=N(e);if(!Object.keys(t).length)return"";let o=`# Generated by TypeMorph \u2014 GDScript
class_name ${A(n)}

`;for(let[r,i]of Object.entries(t)){let s="String",a='""';i.type==="number"?(s="float",a="0.0"):i.type==="boolean"?(s="bool",a="false"):i.type==="object"?(s="Dictionary",a="{}"):i.type==="array"&&(s="Array",a="[]"),o+=`var ${O(r)}: ${s} = ${a}
`}o+=`
static func from_dict(dict: Dictionary) -> ${A(n)}:
`,o+=`  var instance = ${A(n)}.new()
`;for(let r of Object.keys(t)){let i=O(r);o+=`  if dict.has("${r}"):
    instance.${i} = dict["${r}"]
`}return o+=`  return instance
`,o}},Di={generate:(e,n="Root")=>{let t=N(e);if(!Object.keys(t).length)return"";let o=A(n),r=`{-# LANGUAGE DeriveGeneric #-}
module MyApp.${o} where

import GHC.Generics (Generic)
import Data.Aeson (FromJSON, ToJSON)

`;r+=`data ${o} = ${o}
  { `;let i=Object.entries(t).map(([s,a])=>{let l="String";return a.type==="number"?l=a.format==="int"?"Int":"Double":a.type==="boolean"&&(l="Bool"),(a.optional||a.nullable)&&(l=`Maybe ${l}`),`${qe(s)} :: ${l}`});return r+=i.join(`
  , `)+`
  } deriving (Show, Generic)

`,r+=`instance FromJSON ${o}
instance ToJSON ${o}
`,r}},Gi={generate:(e,n="df")=>{let t=N(e);if(!Object.keys(t).length)return"";let o=O(n),r=`# Generated by TypeMorph
`;r+=`${o} <- data.frame(
`;let i=Object.entries(t).map(([s,a])=>{let l='"sample_value"';return a.type==="number"?l="0.0":a.type==="boolean"?l="TRUE":a.type==="object"||a.type==="array"?l="list()":a.format==="email"?l='"user@example.com"':a.format==="datetime"&&(l='as.POSIXct("2024-01-01")'),`  ${O(s)} = c(${l})`});return r+=i.join(`,
`)+`,
  stringsAsFactors = FALSE
)
`,r}},Pi={generate:(e,n="Root")=>{let t=N(e);if(!Object.keys(t).length)return"";let o=A(n),r=`// Generated by TypeMorph
`;r+=`case class ${o}(
`;let i=Object.entries(t).map(([s,a])=>{let l="String";return a.type==="number"?l="Double":a.type==="boolean"?l="Boolean":a.type==="object"?l="Map[String, Any]":a.type==="array"&&(l="List[Any]"),a.optional&&(l=`Option[${l}]`),`  ${s}: ${l}`});return r+=i.join(`,
`)+`
)
`,r}},Ui={generate:(e,n="Record")=>{let t=N(e);if(!Object.keys(t).length)return"";let o=[],r="";for(let[s,a]of Object.entries(t)){let l="string";if(a.type==="number")l="uint256";else if(a.type==="boolean")l="bool";else if(a.type==="array")l=`${a.itemType?.type==="number"?"uint256":a.itemType?.type==="boolean"?"bool":"string"}[]`;else if(a.type==="object"&&a.fields){let c=A(s),u=`    struct ${c} {
`;for(let[f,m]of Object.entries(a.fields)){let p=m.type==="number"?"uint256":m.type==="boolean"?"bool":"string";u+=`        ${p} ${f};
`}u+="    }",o.push(u),l=c}r+=`        ${l} ${s};
`}let i=`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

`;i+=`contract ${A(n)}Store {
`;for(let s of o)i+=s+`

`;return i+=`    struct ${A(n)} {
`,i+=`        uint256 id;
`,i+=r,i+=`    }
`,i+=`}
`,i}},Vi={generate:(e,n="Post")=>{let t=N(e);if(!Object.keys(t).length)return"";let o=A(n),r=`from django.db import models
from rest_framework import serializers

`;r+=`class ${o}(models.Model):
`;for(let[i,s]of Object.entries(t)){let a=O(i),l=s.optional?"null=True, blank=True":"",c;s.type==="number"?s.format==="int"?c=s.optional?"models.IntegerField(null=True, blank=True)":"models.IntegerField()":c=s.optional?"models.FloatField(null=True, blank=True)":"models.FloatField()":s.type==="boolean"?c=s.optional?"models.BooleanField(null=True, blank=True)":"models.BooleanField(default=False)":s.type==="object"||s.type==="array"?c=s.optional?"models.JSONField(null=True, blank=True)":"models.JSONField()":s.format==="datetime"?c=s.optional?"models.DateTimeField(null=True, blank=True)":"models.DateTimeField()":s.format==="date"?c=s.optional?"models.DateField(null=True, blank=True)":"models.DateField()":s.format==="email"?c=s.optional?"models.EmailField(null=True, blank=True)":"models.EmailField()":s.format==="url"?c=s.optional?"models.URLField(null=True, blank=True)":"models.URLField()":s.format==="uuid"?c=s.optional?"models.UUIDField(null=True, blank=True)":"models.UUIDField()":c=`models.CharField(max_length=255${l?`, ${l}`:""})`,r+=`    ${a} = ${c}
`}return r+=`

class ${o}Serializer(serializers.ModelSerializer):
`,r+=`    class Meta:
`,r+=`        model = ${o}
`,r+=`        fields = '__all__'
`,r}},qi={generate:(e,n="User")=>{let t=N(e);if(!Object.keys(t).length)return"";let r=`class ${`Create${A(n)}s`} < ActiveRecord::Migration[7.0]
  def change
`;r+=`    create_table :${O(n)}s do |t|
`;for(let[i,s]of Object.entries(t)){if(i.toLowerCase()==="id")continue;let a="string";s.type==="number"?a=s.format==="int"?"integer":"decimal":s.type==="boolean"?a="boolean":s.type==="object"||s.type==="array"?a="jsonb":s.format==="datetime"&&(a="datetime");let l=s.optional?", null: true":", null: false";r+=`      t.${a} :${O(i)}${l}
`}return r+=`      t.timestamps
    end
  end
end
`,r}},Bi={generate:(e,n="Root")=>{let t=A(n),o=O(n),r=N(e),i=Object.keys(r),s=(l,c)=>{let u=l.toLowerCase();if(c.type==="number"){let p="z.number()";return u.includes("age")?p+=".int().min(0).max(150)":u.includes("year")?p+=".int().min(1900).max(2100)":u.includes("month")&&!u.includes("monthly")?p+=".int().min(1).max(12)":u==="day"||u.endsWith("_day")||u.startsWith("day_")?p+=".int().min(1).max(31)":u.includes("count")||u.includes("quantity")?p+=".int().min(0)":["price","amount","cost","fee","rank"].some(d=>u.includes(d))&&(p+=".min(0)"),p}if(c.type==="boolean")return"z.boolean()";if(c.type==="object"||c.type==="array"||c.type==="union")return"z.any()";if(c.format==="email"||u.includes("email"))return"z.email()";if(c.format==="uuid"||l.endsWith("_id")||/Id$/.test(l)||/ID$/.test(l))return"z.uuid()";if(c.format==="url"||u.includes("url")||u.includes("link")||u.includes("website"))return"z.url()";if(c.format==="datetime")return"z.iso.datetime()";if(u.includes("password")||u.includes("passwd"))return"z.string().min(8)";if(u.includes("slug"))return"z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)";if(u.includes("phone")||u.includes("tel"))return"z.string().regex(/^\\+?[\\d\\s\\-\\.\\(\\)]{7,15}$/)";let f=["description","note","bio","comment","content","body","text","message","summary"].some(p=>u.includes(p));return u.includes("name")||u.includes("label")||u.includes("title")?c.optional?"z.string().trim()":"z.string().min(1).trim()":!c.optional&&!f?"z.string().min(1)":"z.string()"},a=JSON.stringify(Object.fromEntries(i.map(l=>{let c=r[l];return c.type==="number"?[l,0]:c.type==="boolean"?[l,!1]:[l,"sample"]})),null,6).replace(/^/gm,"    ");return`import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Generated by TypeMorph \u2014 Next.js App Router API Route
// Route: /api/${o}s

const ${t}Schema = z.object({
${i.map(l=>{let c=r[l];return`  ${E(l)}: ${s(l,c)}${c.optional?".optional()":""}`}).join(`,
`)}
});

export async function GET(request: NextRequest) {
  try {
    // TODO: Replace with your database query
    const items: z.infer<typeof ${t}Schema>[] = [];
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch ${o}s' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = ${t}Schema.parse(body);
    // TODO: Replace with your database insert
    return NextResponse.json(validated, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create ${o}' }, { status: 500 });
  }
}
`}},Wi={generate:(e,n="Root")=>{let t=A(n),o=n.charAt(0).toLowerCase()+n.slice(1),r=O(n),i=N(e),s=Object.keys(i);return`import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Generated by TypeMorph \u2014 React Query Hook
// Requires: @tanstack/react-query

export interface ${t} {
${s.map(a=>{let l=i[a],c=l.type==="number"?"number":l.type==="boolean"?"boolean":"string";return`  ${E(a)}${l.optional?"?":""}: ${c};`}).join(`
`)}
}

const API_BASE = '/api/${r}s';

export const use${t}List = () => {
  return useQuery<${t}[]>({
    queryKey: ['${r}s'],
    queryFn: async () => {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error('Failed to fetch ${r}s');
      return res.json();
    },
  });
};

export const use${t}Create = () => {
  const queryClient = useQueryClient();
  return useMutation<${t}, Error, Omit<${t}, 'id'>>({
    mutationFn: async (data) => {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create ${r}');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${r}s'] });
    },
  });
};

export const use${t}Delete = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(\`\${API_BASE}/\${id}\`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete ${r}');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${r}s'] });
    },
  });
};
`}};var Ji={generate:(e,n="Root")=>{let t=N(e);if(!Object.keys(t).length)return"";let o=A(n),r=[],i=(c,u,f)=>c.type==="number"?{base:c.format==="int"?"int32_t":"double",ptr:!1}:c.type==="boolean"?{base:"bool",ptr:!1}:c.type==="object"?{base:A(f+"_"+u),ptr:!1}:{base:"char",ptr:!0},s=(c,u)=>{let f=`typedef struct {
`;for(let[m,p]of Object.entries(c))if(p.type==="object"&&p.fields){let d=A(u+"_"+m);r.push(s(p.fields,d)),f+=`  ${d} ${m};
`}else if(p.type==="array"){let d=p.itemType,y="char",g=!0;if(d?.type==="number")y=d.format==="int"?"int32_t":"double",g=!1;else if(d?.type==="boolean")y="bool",g=!1;else if(d?.type==="object"&&d.fields){let h=A(u+"_"+m+"Item");r.push(s(d.fields,h)),y=h,g=!1}f+=`  ${y} ${g?"**":"*"}${m};
`,f+=`  int ${m}_count;
`}else{let{base:d,ptr:y}=i(p,m,u),g=y?`*${m}`:m,b=p.optional||p.nullable?" /* nullable */":"";f+=`  ${d} ${g};${b}
`}return f+=`} ${u};`,f},a=s(t,o),l=`#include <stdbool.h>
#include <stdint.h>
#include <stdlib.h>
`;l+=`/* cJSON \u2014 single-header JSON parser: https://github.com/DaveGamble/cJSON */
`,l+=`#include "cJSON.h"

`;for(let c of r)l+=c+`

`;l+=a+`

`,l+=`${o} ${O(n)}_from_json(const char *json_str) {
`,l+=`  ${o} result = {0};
`,l+=`  cJSON *root = cJSON_Parse(json_str);
`,l+=`  if (!root) return result;

`;for(let[c,u]of Object.entries(t))if(l+=`  cJSON *_${c} = cJSON_GetObjectItemCaseSensitive(root, "${c}");
`,u.type==="number"){let f=u.format==="int"?"(int32_t)":"";l+=`  if (cJSON_IsNumber(_${c})) result.${c} = ${f}_${c}->valuedouble;
`}else u.type==="boolean"?l+=`  if (cJSON_IsBool(_${c})) result.${c} = cJSON_IsTrue(_${c});
`:u.type==="array"?l+=`  if (cJSON_IsArray(_${c})) result.${c}_count = cJSON_GetArraySize(_${c});
`:u.type==="object"?l+=`  /* TODO: parse nested ${c} struct */
`:l+=`  if (cJSON_IsString(_${c})) result.${c} = _${c}->valuestring;
`;return l+=`
  cJSON_Delete(root);
  return result;
}
`,l}},Ki={generate:(e,n="Root")=>{let t=N(e);if(!Object.keys(t).length)return"";let o=A(n),r=[],i=Object.values(t).some(f=>f.optional||f.nullable),s=Object.values(t).some(f=>f.type==="array"),a=(f,m,p)=>{if(f.type==="number")return f.format==="int"?"int64_t":"double";if(f.type==="boolean")return"bool";if(f.type==="object")return A(p+m.charAt(0).toUpperCase()+m.slice(1));if(f.type==="array"){let d=f.itemType,y="std::string";return d?.type==="number"?y=d.format==="int"?"int64_t":"double":d?.type==="boolean"?y="bool":d?.type==="object"&&(y=A(p+m.charAt(0).toUpperCase()+m.slice(1)+"Item")),`std::vector<${y}>`}return"std::string"},l=(f,m)=>{for(let[d,y]of Object.entries(f))if(y.type==="object"&&y.fields){let g=A(m+d.charAt(0).toUpperCase()+d.slice(1));r.push(l(y.fields,g))}else if(y.type==="array"&&y.itemType?.type==="object"&&y.itemType.fields){let g=A(m+d.charAt(0).toUpperCase()+d.slice(1)+"Item");r.push(l(y.itemType.fields,g))}let p=`struct ${m} {
`;for(let[d,y]of Object.entries(f)){let g=a(y,d,m);(y.optional||y.nullable)&&(g=`std::optional<${g}>`),p+=`  ${g} ${d};
`}p+=`
`,p+=`  static ${m} from_json(const nlohmann::json& j) {
`,p+=`    ${m} obj;
`;for(let[d,y]of Object.entries(f)){let g=a(y,d,m);y.optional||y.nullable?(p+=`    if (j.contains("${d}") && !j["${d}"].is_null())
`,p+=`      obj.${d} = j["${d}"].get<${g}>();
`):y.type==="object"?p+=`    if (j.contains("${d}")) obj.${d} = ${g}::from_json(j["${d}"]);
`:p+=`    obj.${d} = j.at("${d}").get<${g}>();
`}p+=`    return obj;
  }

`,p+=`  nlohmann::json to_json() const {
    return {
`;for(let[d,y]of Object.entries(f))y.optional||y.nullable?p+=`      {"${d}", ${d}.has_value() ? nlohmann::json(*${d}) : nlohmann::json(nullptr)},
`:y.type==="object"?p+=`      {"${d}", ${d}.to_json()},
`:p+=`      {"${d}", ${d}},
`;return p+=`    };
  }
};
`,p},c=l(t,o),u=`#include <string>
`;s&&(u+=`#include <vector>
`),i&&(u+=`#include <optional>
`),u+=`#include <cstdint>
`,u+=`/* nlohmann/json \u2014 header-only JSON: https://github.com/nlohmann/json */
`,u+=`#include <nlohmann/json.hpp>

`;for(let f of r)u+=f+`
`;return u+=c,u}},Ue=(e,n)=>{let t=e.toLowerCase();return n.format==="email"||t.includes("email")?"Email address":n.format==="uuid"?"Unique identifier (UUID)":n.format==="url"||t.includes("url")||t.includes("link")?"URL":n.format==="datetime"?"ISO 8601 datetime string":t.endsWith("id")||t.endsWith("_id")?"Unique identifier":t.includes("password")||t.includes("passwd")?"Password (min 8 characters)":t==="phone"||t==="tel"||t==="telephone"?"Phone number":t.includes("count")||t.includes("quantity")||t==="qty"?"Count or quantity (non-negative)":["price","amount","cost","fee","total","subtotal","balance"].some(o=>t.includes(o))?"Monetary amount (non-negative)":t.includes("score")||t.includes("rating")?"Score or rating (0\u2013100)":t==="age"||t.endsWith("_age")?"Age in years (0\u2013150)":t==="port"||t.endsWith("_port")||t==="port_number"?"Network port (1\u201365535)":n.type==="boolean"?`Whether ${e.replace(/^(is|has|can|should)/i,"").replace(/([A-Z])/g," $1").trim().toLowerCase()||e} is true`:e.replace(/([A-Z])/g," $1").replace(/_/g," ").trim()},Ve=(e,n,t="    ",o=!0)=>{let r=e.toLowerCase(),i=n.nullable&&n.optional?".nullable().optional()":n.nullable?".nullable()":n.optional?".optional()":"";if(n.type==="boolean")return`z.boolean()${i}`;if(n.type==="number"){let s="z.number()";n.format==="int"&&(s+=".int()");let a=["price","amount","cost","fee","total","subtotal","balance"].some(l=>r.includes(l));return(n.format==="int"&&(r.includes("count")||r.includes("quantity")||r==="qty")||a)&&(s+=".min(0)"),`${s}${i}`}if(n.type==="array"){let s=n.itemType,a="z.unknown()";if(s){if(s.type==="string")a="z.string()";else if(s.type==="number")a=s.format==="int"?"z.number().int()":"z.number()";else if(s.type==="boolean")a="z.boolean()";else if(s.type==="object"&&s.fields){let l=t+"  ";a=`z.object({
${Object.entries(s.fields).map(([u,f])=>{let m=`${l}  ${u}: ${Ve(u,f,l+"  ",o)}`;return o?`${m}.describe('${Ue(u,f)}'),`:`${m},`}).join(`
`)}
${l}})`}}return`z.array(${a})${i}`}if(n.type==="object"&&n.fields){let s=t+"  ";return`z.object({
${Object.entries(n.fields).map(([l,c])=>{let u=`${s}${l}: ${Ve(l,c,s,o)}`;return o?`${u}.describe('${Ue(l,c)}'),`:`${u},`}).join(`
`)}
${t}})${i}`}return n.type==="union"&&n.enumValues?.length?`z.enum([${n.enumValues.map(a=>`"${a}"`).join(", ")}])${i}`:n.format==="email"||r.includes("email")?`z.email()${i}`:n.format==="uuid"||/Id$/.test(e)||/ID$/.test(e)||r.endsWith("_id")?`z.uuid()${i}`:n.format==="url"||r.includes("url")||r.includes("link")?`z.url()${i}`:n.format==="datetime"?`z.iso.datetime()${i}`:r.includes("password")||r.includes("passwd")?`z.string().min(8)${i}`:`z.string()${i}`},Yi={generate:(e,n="Root")=>{let t=qe(n),o=A(n),r=`${t}Schema`,i=`parse${o}`,a=de(e).fields??{},l=Object.entries(a).map(([c,u])=>`  ${E(c)}: ${Ve(c,u,"  ",!1)},`).join(`
`);return`import { z } from "zod";

// \u2500\u2500 Schema \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
const ${r} = z.object({
${l}
});

export type ${o} = z.infer<typeof ${r}>;

// \u2500\u2500 Safe Parse \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Validates every LLM response before it reaches your application logic.
export function ${i}(raw: unknown):
  | { ok: true; data: ${o} }
  | { ok: false; errors: string[] } {
  const result = ${r}.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map(i => \`\${i.path.join(".")}: \${i.message}\`),
    };
  }
  return { ok: true, data: result.data };
}

// \u2500\u2500 Usage \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// OpenAI (json_object / json_schema mode):
//   const raw = JSON.parse(completion.choices[0].message.content!);
//   const parsed = ${i}(raw);
//
// Anthropic tool_use:
//   const parsed = ${i}(msg.content[0].input);
//
// Vercel AI SDK generateObject:
//   const parsed = ${i}(object);
//
//   if (!parsed.ok) {
//     console.error("LLM schema mismatch:", parsed.errors);
//   } else {
//     use(parsed.data); // fully typed \u2713
//   }`}},Hi={generate:(e,n="Root")=>{let t=qe(n),o=N(e),i=Object.keys(o).map(s=>`    ${E(s)}: ${Ve(s,o[s],"    ")}.describe('${Ue(s,o[s])}'),`).join(`
`);return`import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const server = new McpServer({ name: "my-server", version: "1.0.0" });

server.tool(
  "${t}",
  "Auto-generated MCP tool \u2014 replace with a meaningful description",
  {
${i}
  },
  async (args) => ({
    content: [{ type: "text", text: JSON.stringify(args) }]
  })
);

export { server };`}},Zi={generate:(e,n="Root")=>{let o=de(e).fields??{},r=O(n),i=(l,c)=>{let u=l.toLowerCase(),f=Ue(l,c);if(c.type==="object"&&c.fields){let p={},d=[];for(let[g,b]of Object.entries(c.fields))p[g]=i(g,b),!b.optional&&!b.nullable&&d.push(g);let y={type:"object",description:f,properties:p};return d.length&&(y.required=d),y}if(c.type==="array"){let p=c.itemType,d={type:"string"};if(p){if(p.type==="number")d={type:p.format==="int"?"integer":"number"};else if(p.type==="boolean")d={type:"boolean"};else if(p.type==="object"&&p.fields){let y={},g=[];for(let[b,h]of Object.entries(p.fields))y[b]=i(b,h),!h.optional&&!h.nullable&&g.push(b);d={type:"object",properties:y},g.length&&(d.required=g)}}return{type:"array",description:f,items:d}}if(c.type==="union"&&c.enumValues?.length)return{type:"string",description:f,enum:c.enumValues};if(c.type==="boolean")return{type:"boolean",description:f};if(c.type==="number"){let p={description:f};p.type=c.format==="int"?"integer":"number";let d=["price","amount","cost","fee","total","subtotal","balance","payment"].some(y=>u.includes(y));return c.format==="int"&&(u.includes("count")||u.includes("quantity")||u==="qty")&&(p.minimum=0),d&&(p.minimum=0),(u.includes("score")||u.includes("rating"))&&(p.minimum=0,p.maximum=100),(u==="age"||u.endsWith("_age"))&&(p.minimum=0,p.maximum=150),(u==="port"||u.endsWith("_port")||u==="port_number")&&(p.minimum=1,p.maximum=65535),p}let m={type:"string",description:f};return c.format==="email"||u.includes("email")?m.format="email":c.format==="uuid"||/Id$/.test(l)||/ID$/.test(l)||u.endsWith("_id")?m.format="uuid":c.format==="url"||u.includes("url")||u.includes("link")?m.format="uri":c.format==="datetime"?m.format="date-time":(u.includes("password")||u.includes("passwd"))&&(m.minLength=8),m},s={},a=[];for(let[l,c]of Object.entries(o))s[l]=i(l,c),!c.optional&&!c.nullable&&a.push(l);return JSON.stringify({type:"function",function:{name:r,description:`Processes ${n} data \u2014 update with a meaningful description`,parameters:{type:"object",properties:s,required:a}}},null,2)}},Qi={generate:(e,n="Root")=>{let t=qe(n),o=N(e),i=Object.keys(o).map(s=>`    ${E(s)}: ${Ve(s,o[s],"    ")}.describe('${Ue(s,o[s])}'),`).join(`
`);return`import { tool } from "ai";
import { z } from "zod";

export const ${t}Tool = tool({
  description: "Auto-generated from JSON sample \u2014 update with a meaningful description",
  parameters: z.object({
${i}
  }),
  execute: async (params) => {
    // implement your logic here
    return params;
  },
});`}};var is=require("crypto");function Be(e){let n=[],t="",o=0,r=null;for(let i=0;i<e.length;i++){let s=e[i],a=e[i+1];if(r){if(t+=s,s==="\\"){t+=a??"",i++;continue}s===r&&(r=null);continue}if(s==="/"&&a==="/"){for(;i<e.length&&e[i]!==`
`;)i++;i--;continue}if(s==="/"&&a==="*"){for(i+=2;i<e.length&&!(e[i]==="*"&&e[i+1]==="/");)i++;i++;continue}if(s==='"'||s==="'"||s==="`"){r=s,t+=s;continue}if(s==="<"||s==="("||s==="["||s==="{"){o++,t+=s;continue}if(s===">"||s===")"||s==="]"||s==="}"){o=Math.max(0,o-1),t+=s;continue}if(o===0&&(s===";"||s===","||s===`
`)){t.trim()&&n.push(t.trim()),t="";continue}t+=s}return t.trim()&&n.push(t.trim()),n}function Wn(e){let n=[],t=[],o=new Set,r=/(?:export\s+)?interface\s+(\w+)/g,i;for(;(i=r.exec(e))!==null;)o.add(i[1]);let s=[],a=/(?:export\s+)?interface\s+(\w+)(?:\s+extends\s+([^{]+))?\s*\{/g,l;for(;(l=a.exec(e))!==null;){let f=l[1],m=l[2],p=1,d=l.index+l[0].length;for(;d<e.length&&p>0;){let y=e[d++];y==="{"?p++:y==="}"&&p--}s.push({name:f,body:e.slice(l.index+l[0].length,d-1),extendsRaw:m})}let c=new Map;for(let{name:f,body:m,extendsRaw:p}of s){let d=[],y;for(let h of Be(m)){let $=h.match(/^\[\s*\w+\s*:\s*(?:string|number|symbol)\s*\]\s*:\s*([\s\S]+)$/);if($){y=$[1].trim();continue}let T=h.match(/^(?:readonly\s+)?(\w+)(\?)?\s*:\s*([\s\S]+)$/);if(!T)continue;let[,S,v,C]=T,G=C.replace(/[;,]\s*$/,"").trim();d.push({name:S,type:G,optional:v==="?"})}let g=p?p.split(",").map(h=>h.trim().replace(/<.*$/,"").trim()).filter(Boolean):void 0,b={id:f,label:f,fields:d,isRoot:!1,...g&&g.length?{extendsList:g}:{},...y?{indexSignature:y}:{}};c.has(f)||(n.push(b),c.set(f,b))}for(let f of n)for(let m of f.fields){let p=m.type.replace(/\[\]/g,"").split(/[|&,\s<>]+/).map(d=>d.trim()).filter(d=>d.length>0&&/^[A-Z]/.test(d));for(let d of p)o.has(d)&&d!==f.id&&(t.some(g=>g.from===f.id&&g.to===d&&g.label===m.name)||t.push({from:f.id,to:d,label:m.name}))}let u=new Set(t.map(f=>f.to));for(let f of n)f.isRoot=!u.has(f.id);return{nodes:n,edges:t}}var Kn=e=>{try{let n=Ge.load(e);if(n==null)return{};if(typeof n!="object"||Array.isArray(n))return{value:n};let t=n;return"_parseError"in t?{}:t}catch{return null}};function ie(e,n,t,o){let r=0;for(let i=n;i<e.length;i++)if(e[i]===t)r++;else if(e[i]===o&&(r--,r===0))return i;return-1}function Ne(e){let n=[],t=0,o="",r=!1,i="";for(let s=0;s<e.length;s++){let a=e[s];r?(o+=a,a===i&&e[s-1]!=="\\"&&(r=!1)):a==='"'||a==="'"?(r=!0,i=a,o+=a):a==="("||a==="{"||a==="["?(t++,o+=a):a===")"||a==="}"||a==="]"?(t--,o+=a):a===","&&t===0?(o.trim()&&n.push(o.trim()),o=""):o+=a}return o.trim()&&n.push(o.trim()),n}var ll=new Set(["min","max","length","gt","gte","lt","lte","positive","negative","nonnegative","nonpositive","multipleOf","step","finite","regex","includes","startsWith","endsWith","trim","toLowerCase","toUpperCase","default","catch","describe","brand","readonly"]);function Xi(e){let n=[],t=0;for(;t<e.length;){let o=e.indexOf(".",t);if(o===-1)break;let r=/^\.([a-zA-Z]+)\s*\(/.exec(e.slice(o));if(!r){t=o+1;continue}let i=r[1],s=o+r[0].length,a=1,l="(";for(;s<e.length&&a>0;){let c=e[s];if(c==='"'||c==="'"||c==="`"){let u=c;for(s++;s<e.length&&!(e[s]===u&&e[s-1]!=="\\");)s++;s++,l="x";continue}if(c==="/"&&(l==="("||l===",")){for(s++;s<e.length&&!(e[s]==="/"&&e[s-1]!=="\\");){if(e[s]==="[")for(s++;s<e.length&&!(e[s]==="]"&&e[s-1]!=="\\");)s++;s++}for(s++;s<e.length&&/[a-z]/i.test(e[s]);)s++;l="x";continue}if(c==="("){a++,l="(",s++;continue}if(c===")"){if(a--,s++,a===0)break;l=")";continue}if(c===","){l=",",s++;continue}/\s/.test(c)||(l="x"),s++}ll.has(i)&&n.push(e.slice(o,s)),t=s}return n}var Jn=new Map;function cl(e){let n=new Map,t,o=/enum\s+(\w+)\s*\{([^}]*)\}/g;for(;t=o.exec(e);){let i=[];for(let s of t[2].split(",")){let a=s.match(/\w+\s*=\s*(['"`])(.*?)\1/);a&&i.push(a[2])}i.length&&n.set(t[1],i)}let r=/const\s+(\w+)\s*=\s*\{([^}]*)\}\s*as\s+const/g;for(;t=r.exec(e);){let i=[];for(let s of t[2].split(",")){let a=s.match(/\w+\s*:\s*(['"`])(.*?)\1/);a&&i.push(a[2])}i.length&&n.set(t[1],i)}return n}function ul(e){let n=[],t=0,o=0,r=-1;for(;o<e.length;){let i=e[o];if(i==='"'||i==="'"||i==="`"){let s=i;for(o++;o<e.length&&!(e[o]===s&&e[o-1]!=="\\");)o++;o++;continue}if(i==="("||i==="{"||i==="["){t++,o++;continue}if(i===")"||i==="}"||i==="]"){t--,o++;continue}if(t===0&&e.startsWith(".and(",o)){r===-1&&(r=o);let s=o+4,a=ie(e,s,"(",")");if(a===-1)return null;n.push(e.slice(s+1,a).trim()),o=a+1;continue}o++}return r===-1?null:[e.slice(0,r).trim(),...n]}function es(e,n,t){let o=e.filter(i=>i.type==="object"&&i.fields);if(o.length===0){let i=e.find(s=>s.type!=="any")??e[0]??{type:"any"};return{...i,optional:n||i.optional||void 0,nullable:t||i.nullable||void 0}}let r={};for(let i of o)for(let[s,a]of Object.entries(i.fields))r[s]=a;return{type:"object",fields:r,optional:n||void 0,nullable:t||void 0}}function se(e){let n=e.trim(),t=/\.optional\(\)|\.nullish\(\)/.test(n),o=/\.nullable\(\)|\.nullish\(\)/.test(n),r=ul(n);if(r)return es(r.map(l=>se(l)),t,o);if(/^z\.intersection\s*\(/.test(n)){let l=n.indexOf("("),c=l>-1?ie(n,l,"(",")"):-1;if(c>-1){let u=Ne(n.slice(l+1,c)).map(f=>f.trim()).filter(Boolean);if(u.length)return es(u.map(f=>se(f)),t,o)}}if(/^z\.object\s*\(/.test(n)){let l=n.indexOf("{");if(l===-1)return{type:"any"};let c=ie(n,l,"{","}"),u=c>-1?n.slice(l+1,c):"",f={};return fl(u,f),{type:"object",fields:f,optional:t||void 0,nullable:o||void 0}}if(/^z\.array\s*\(/.test(n)){let l=n.indexOf("("),c=ie(n,l,"(",")"),u=c>-1?n.slice(l+1,c).trim():"z.string()",f=se(u),m=c>-1?Xi(n.slice(c+1)):[];return{type:"array",itemType:f,optional:t||void 0,...m.length?{refinements:m}:{}}}if(/^z\.(?:nativeEnum|enum)\s*\(\s*[A-Za-z_$]/.test(n)){let c=n.match(/^z\.(?:nativeEnum|enum)\s*\(\s*([A-Za-z_$][\w$]*)/)?.[1],u=c?Jn.get(c):void 0;return u&&u.length?{type:"string",enumValues:u,optional:t||void 0}:{type:"string",rawZodType:c?`z.nativeEnum(${c})`:n,optional:t||void 0}}if(/^z\.enum\s*\(/.test(n)){let l=n.indexOf("["),c=l>-1?ie(n,l,"[","]"):-1,u=c>-1?Ne(n.slice(l+1,c)).map(f=>f.trim().replace(/^['"`]|['"`]$/g,"")).filter(Boolean):[];return{type:"string",enumValues:u.length?u:void 0,optional:t||void 0}}if(/^z\.(?:union|discriminatedUnion)\s*\(/.test(n)){let l=/^z\.discriminatedUnion/.test(n),c;if(l){let f=n.match(/^z\.discriminatedUnion\s*\(\s*(['"`])(.+?)\1/);f&&(c=f[2])}let u=n.indexOf("[");if(u>-1){let f=ie(n,u,"[","]");if(f>-1){let m=Ne(n.slice(u+1,f)).map(h=>h.trim()).filter(Boolean),p=!1,d=!1,y=[];for(let h of m){if(/^z\.null\s*\(\s*\)/.test(h)){p=!0;continue}if(/^z\.undefined\s*\(\s*\)/.test(h)){d=!0;continue}y.push(se(h))}let g=h=>((t||d)&&(h.optional=!0),p&&(h.nullable=!0),h);if(y.length===0)return g({type:"any"});if(y.length===1)return g({...y[0]});if(y.every(h=>h.enumValues&&h.enumValues.length>0)){let h=[];for(let $ of y)for(let T of $.enumValues)h.includes(T)||h.push(T);return g({type:"string",enumValues:h})}if(y.every(h=>h.type==="object"&&h.fields)){let h={};for(let T of y)for(let[S,v]of Object.entries(T.fields))S in h||(h[S]={...v});for(let T of Object.keys(h))y.every(S=>S.fields&&T in S.fields)||(h[T].optional=!0);let $={type:"object",fields:h};return c&&($.discriminatorField=c),g($)}let b=[];for(let h of y)b.includes(h.type)||b.push(h.type);return b.length===1?g({...y[0]}):g({type:"union",unionTypes:b})}}return{type:"any",optional:t||void 0}}if(/^z\.tuple\s*\(/.test(n)){let l=n.indexOf("[");if(l>-1){let c=ie(n,l,"[","]");if(c>-1){let u=Ne(n.slice(l+1,c)).map(f=>f.trim()).filter(Boolean);if(u.length>0){let f=u.map(m=>se(m));return{type:"array",itemType:{type:"any"},tupleTypes:f,optional:t||void 0}}}}return{type:"array",itemType:{type:"any"},optional:t||void 0}}if(/^z\.record\s*\(/.test(n)){let l=n.indexOf("("),c=l>-1?ie(n,l,"(",")"):-1;if(c>-1){let u=Ne(n.slice(l+1,c)).map(m=>m.trim()).filter(Boolean),f=u.length>=2?u[1]:u[0];if(f)return{type:"object",fields:{},recordValueType:se(f),optional:t||void 0}}return{type:"object",fields:{},optional:t||void 0}}let i={type:"any"},s=n.match(/z\.coerce\.(string|number|boolean|bigint)\b/);if(s)i.coerced=!0,i.type=s[1]==="string"?"string":s[1]==="boolean"?"boolean":"number",i.type==="number"&&/\.int\(\)/.test(n)&&(i.format="int");else if(/z\.string\b|z\.email\b|z\.url\b|z\.uuid\b|z\.cuid\b|z\.ulid\b|z\.ip\b|z\.iso\b/.test(n))i.type="string",/\.email\(\)|z\.email\(\)/.test(n)?i.format="email":/\.uuid\(\)|z\.uuid\(\)/.test(n)?i.format="uuid":/\.url\(\)|z\.url\(\)/.test(n)?i.format="url":/z\.iso\.datetime\(\)|\.datetime\(\)/.test(n)?i.format="datetime":/z\.iso\.date\(\)/.test(n)?i.format="date":/z\.iso\.time\(\)/.test(n)?i.format="datetime":/z\.ip\(\)|\.ip\(\)/.test(n)?i.format="ip":/z\.cuid\(\)|z\.ulid\(\)/.test(n)&&(i.format="uuid");else if(/z\.number\b|z\.int\b|z\.float\b/.test(n))i.type="number",/\.int\(\)/.test(n)&&(i.format="int");else if(/z\.boolean\b|z\.bool\b/.test(n))i.type="boolean";else if(/z\.coerce\.date\b|z\.date\b/.test(n))i.type="string",i.format="date";else if(/z\.null\(\)/.test(n))i.type="any",i.nullable=!0;else if(/z\.any\(\)|z\.unknown\(\)/.test(n))i.type="any";else if(/z\.literal\(/.test(n)){let l=n.match(/z\.literal\s*\(\s*(['"`])([\s\S]*?)\1\s*\)/),c=n.match(/z\.literal\s*\(\s*(-?\d+(?:\.\d+)?)\s*\)/),u=n.match(/z\.literal\s*\(\s*(true|false)\s*\)/);l?(i.type="string",i.literalValue=l[2],i.enumValues=[l[2]]):c?(i.type="number",i.literalValue=parseFloat(c[1])):u?(i.type="boolean",i.literalValue=u[1]==="true"):i.type="string"}t&&(i.optional=!0),o&&(i.nullable=!0);let a=Xi(n);return a.length&&(i.refinements=a),i}function fl(e,n){let t=Ne(e);for(let o of t){let r=o.indexOf(":");if(r===-1)continue;let i=o.slice(0,r).trim().replace(/^['"`]|['"`]$/g,""),s=o.slice(r+1).trim();!i||!s||(n[i]=se(s))}}var Yn=e=>{try{Jn=cl(e);let n=e.trim();if(!n.includes("z.object(")&&!n.includes("z.array(")&&!n.includes("z.string(")&&!n.includes("z.number(")&&!n.includes("z.boolean("))return null;let t=n,o=n.match(/(?:const|let|var|export\s+(?:const|let|var)|export\s+default)\s+\w+\s*(?::\s*\w+\s*)?=\s*(z\.[\s\S]+)/);o&&(t=o[1].trim()),t=t.replace(/;\s*$/,"").trim();let r=se(t);return r.type==="any"&&!r.optional?null:(r._isTypeMorphSchema=!0,r)}catch{return null}finally{Jn=new Map}};function pl(e,n){typeof window>"u"||typeof window.gtag!="function"||window.gtag("event",e,n)}function ns(e,n){pl("infer_unsupported_output",{target:e,requested:n})}function cn(e){if(typeof e!="object"||e===null||Array.isArray(e))return!1;let n=e,t=String(n.openapi??""),o=String(n.swagger??""),r=n.openapi!==void 0&&t.startsWith("3"),i=n.swagger!==void 0&&o.startsWith("2");return(r||i)&&!!(n.info||n.paths||n.components||n.definitions)}function un(e){let t=typeof e.openapi=="string"||typeof e.openapi=="number"?e.components?.schemas??{}:e.definitions??{},o=new Set;function r(l){if(!l.startsWith("#/"))return null;let c=l.slice(2).split("/"),u=e;for(let f of c){if(u==null)return null;u=u[f.replace(/~1/g,"/").replace(/~0/g,"~")]}return u??null}function i(l){return l.split("/").pop()??""}function s(l,c=0,u=!1){if(c>20||!l||typeof l!="object")return{type:"any"};if(typeof l.$ref=="string"){let p=i(l.$ref);if(!u&&t[p]!==void 0)return{type:"object",_sharedTypeName:p};if(o.has(p))return{type:"any"};let d=r(l.$ref);return d?s(d,c+1,u):{type:"any"}}if(Array.isArray(l.allOf)){let p={type:"object",fields:{}};for(let d of l.allOf){let y=s(d,c+1,!0);y.type==="object"&&y.fields&&Object.assign(p.fields,y.fields)}return p}if(Array.isArray(l.anyOf)||Array.isArray(l.oneOf)){let p=(l.anyOf??l.oneOf).map(y=>s(y,c+1)),d=[...new Set(p.map(y=>y.type))];return d.length===1?p[0]:{type:"union",unionTypes:d}}let f=typeof l.type=="string"?l.type:"",m=Array.isArray(l.required)?l.required:[];if(f==="object"||!f&&l.properties){let p={};for(let[d,y]of Object.entries(l.properties??{})){let g=s(y,c+1);m.includes(d)||(g.optional=!0),y.nullable===!0&&(g.nullable=!0),p[d]=g}return{type:"object",fields:p}}if(f==="array")return{type:"array",itemType:l.items?s(l.items,c+1):{type:"any"}};if(f==="string"){let p={type:"string"};Array.isArray(l.enum)&&(p.enumValues=l.enum.map(String));let d=l.format??"";return d==="date-time"?p.format="datetime":d==="date"?p.format="date":d==="email"?p.format="email":d==="uri"||d==="url"?p.format="url":d==="uuid"&&(p.format="uuid"),p}if(f==="integer")return{type:"number",format:"int"};if(f==="number"){let p={type:"number"};return(l.format==="float"||l.format==="double")&&(p.format="float"),p}return f==="boolean"?{type:"boolean"}:{type:"any"}}let a=[];for(let[l,c]of Object.entries(t)){o.add(l);let u=s(c);o.delete(l),u._isTypeMorphSchema=!0,a.push({name:l,schema:u})}return a}var ml=new Set(["object","string","number","integer","boolean","array","null"]);function fn(e){if(typeof e!="object"||e===null||Array.isArray(e))return!1;let n=e,t=String(n.$schema??"");if(t.includes("json-schema.org")||/^https?:\/\/.*\/schema/.test(t))return!0;let o=typeof n.type=="string"&&ml.has(n.type),r=typeof n.properties=="object"&&n.properties!==null&&!Array.isArray(n.properties),i=typeof n.items=="object"&&n.items!==null;return!!(o&&(r||i)||(n.$defs!==void 0||n.definitions!==void 0)&&r||typeof n.$ref=="string"&&n.$ref.startsWith("#/")||Array.isArray(n.allOf)||Array.isArray(n.anyOf)||Array.isArray(n.oneOf))}function pn(e){let n=e.$defs??e.definitions??{};function t(a){if(!a.startsWith("#/"))return null;let l=a.slice(2).split("/"),c=e;for(let u of l){if(c==null)return null;c=c[u.replace(/~1/g,"/").replace(/~0/g,"~")]}return c??null}function o(a){return a.split("/").pop()??""}function r(a,l=0,c=!1){if(l>20||!a||typeof a!="object")return{type:"any"};if(typeof a.$ref=="string"){let d=o(a.$ref);if(!c&&n[d]!==void 0)return{type:"object",_sharedTypeName:d};let y=t(a.$ref);return y?r(y,l+1,c):{type:"any"}}if(Array.isArray(a.allOf)){let d={type:"object",fields:{}};for(let y of a.allOf){let g=r(y,l+1,!0);g.type==="object"&&g.fields&&Object.assign(d.fields,g.fields)}if(a.properties){let y=Array.isArray(a.required)?a.required:[];for(let[g,b]of Object.entries(a.properties)){let h=r(b,l+1);y.includes(g)||(h.optional=!0),d.fields[g]=h}}return d}if(Array.isArray(a.anyOf)||Array.isArray(a.oneOf)){let d=a.anyOf??a.oneOf,y=d.filter($=>$.type!=="null"&&!(typeof $.$ref=="string"&&$.$ref==="#"));if(y.length===1){let $=r(y[0],l+1,c);return y.length<d.length&&($.nullable=!0),$}let g=y.map($=>r($,l+1)),b=[...new Set(g.map($=>$.type))],h=b.length===1?g[0]:{type:"union",unionTypes:b};return y.length<d.length&&(h.nullable=!0),h}let u=a.type,f=!1;if(Array.isArray(u)){let d=u.filter(y=>y!=="null");f=d.length<u.length,u=d[0]??"any"}let m=typeof u=="string"?u:"",p=Array.isArray(a.required)?a.required:[];if(a.const!==void 0){let d=typeof a.const;if(d==="string")return{type:"string",enumValues:[String(a.const)]};if(d==="number")return{type:"number"};if(d==="boolean")return{type:"boolean"}}if(Array.isArray(a.enum)){let d=a.enum.filter(g=>g!==null),y={type:"string",enumValues:d.map(String)};return d.length<a.enum.length&&(y.nullable=!0),y}if(m==="object"||!m&&a.properties){let d={};for(let[g,b]of Object.entries(a.properties??{})){let h=r(b,l+1);p.includes(g)||(h.optional=!0),d[g]=h}let y={type:"object",fields:d};return f&&(y.nullable=!0),y}if(m==="array"){let d=Array.isArray(a.items)?a.items[0]:a.items,g={type:"array",itemType:d?r(d,l+1):{type:"any"}};return f&&(g.nullable=!0),g}if(m==="string"){let d={type:"string"},y=a.format??"";return y==="date-time"?d.format="datetime":y==="date"?d.format="date":y==="email"?d.format="email":y==="uri"||y==="url"?d.format="url":y==="uuid"&&(d.format="uuid"),f&&(d.nullable=!0),d}return m==="integer"?{type:"number",format:"int",...f?{nullable:f}:{}}:m==="number"?{type:"number",...f?{nullable:f}:{}}:m==="boolean"?{type:"boolean",...f?{nullable:f}:{}}:{type:"any"}}let i=[];for(let[a,l]of Object.entries(n)){let c=r(l);c._isTypeMorphSchema=!0,i.push({name:a,schema:c})}if(e.type||e.properties||e.allOf||e.anyOf||e.oneOf||e.items){let a=e.title??"Root";if(!i.find(l=>l.name===a)){let l=r(e);l._isTypeMorphSchema=!0,i.unshift({name:a,schema:l})}}return i}function dl(e){return e.replace(/(^\w|_\w)/g,n=>n.replace(/_/,"").toUpperCase())}function ts(e){return e.type!=="object"||!e.fields?null:Object.keys(e.fields).sort()}function yl(e,n){if(e.length===0&&n.length===0)return 1;let t=new Set(e),o=n.filter(i=>t.has(i)).length,r=new Set([...e,...n]).size;return r===0?0:o/r}function rs(e,n){let t=dl(n),[o,r]=e.type==="array"&&e.itemType?.type==="object"?[e.itemType,`${t}Item`]:e.type==="object"?[e,t]:[null,""];if(!o||o.type!=="object"||!o.fields)return;let i=ts(o);if(!i||i.length<2)return;let s=i;function a(l,c){if(!(c>20||!l)&&!(l._sharedTypeName||l._isTypeMorphSchema))if(l.type==="object"&&l.fields&&l!==o){let u=ts(l);if(u&&u.length>=1&&yl(s,u)>=.65){l._sharedTypeName=r,delete l.fields;return}for(let f of Object.values(l.fields))a(f,c+1)}else l.type==="array"&&l.itemType&&a(l.itemType,c+1)}for(let l of Object.values(o.fields))a(l,1)}var Hn=new Set(["string","number","boolean"]),Zn=(e,n)=>{let t=e.type==="union"?e.unionTypes??[]:[e.type],o=n.type==="union"?n.unionTypes??[]:[n.type],r=Array.from(new Set([...t,...o]));return r.length===1?{type:r[0]}:{type:"union",unionTypes:r}},ss=20,we=(e,n,t=0)=>{if(t>ss)return{type:"any"};if(!e)return n;if(!n)return e;let o=e.optional||n.optional,r=e.nullable||n.nullable;if(e.type==="any")return{...n,optional:o,nullable:r};if(n.type==="any")return{...e,optional:o,nullable:r};if(e.type!==n.type){if(Hn.has(e.type)&&Hn.has(n.type))return{...Zn(e,n),optional:o,nullable:r};if(e.type==="union"||n.type==="union"){let i=e.type==="union"?n.type:e.type;if(i==="union"||Hn.has(i))return{...Zn(e,n),optional:o,nullable:r}}return{type:"any",optional:o,nullable:r}}if(e.type==="union")return{...Zn(e,n),optional:o,nullable:r};if(e.type==="number"&&n.type==="number"){let i=e.format==="float"||n.format==="float"?"float":"int";return{...e,optional:o,nullable:r,format:i}}if(e.type==="string"&&n.type==="string"){let i;if(e.enumValues||n.enumValues){let s=Array.from(new Set([...e.enumValues??[],...n.enumValues??[]]));s.length<=6&&(i=s)}return e.format===n.format?{...e,optional:o,nullable:r,enumValues:i}:{type:"string",optional:o,nullable:r,enumValues:i}}if(e.type==="object"&&n.type==="object"){let i=e.fields??{},s=n.fields??{},a=new Set([...Object.keys(i),...Object.keys(s)]),l={};for(let c of a){let u=c in i,f=c in s;u&&f?l[c]=we(i[c],s[c],t+1):u?l[c]={...i[c],optional:!0}:l[c]={...s[c],optional:!0}}return{type:"object",fields:l,optional:o,nullable:r}}return e.type==="array"&&n.type==="array"?{type:"array",itemType:we(e.itemType,n.itemType,t+1),optional:o,nullable:r}:{...e,optional:o,nullable:r}},gl=e=>{let n={};for(let t of e)if(t&&typeof t=="object"&&!Array.isArray(t))for(let[o,r]of Object.entries(t))typeof r=="string"&&(n[o]||(n[o]=[]),n[o].push(r));return n},os=new Set(["status","type","role","gender","state","category","mode","level","phase","kind","visibility","scope","method","action","currency","priority","tier","plan","severity","permission","provider","platform","environment","locale","theme","layout","variant","direction","alignment","position"]),hl=/(\bcountry\b|\bcurrency\b|\bcity\b|\btimezone\b|\btz\b|\blocale\b|\blanguage\b|\blang\b|\bregion\b|\bpostal\b|\bzip\b|\btag\b|categor|\bsku\b|\bslug\b|\buuid\b|\bid\b|_id\b|\burl\b|\bdomain\b)/i,bl=(e,n,t)=>{if(n.length===0)return 0;let o=0,r=e.toLowerCase(),i=t?.enumMinSamples??3;Array.from(os).some(f=>r.includes(f))&&(o+=.4);let a=new Set(n),l=a.size/n.length;a.size===1||l<=.2?o+=.4:l<=.4&&n.length>=i&&(o+=.2);let c=t?.enumMaxUnique??6;a.size>=2&&a.size<=c&&(o+=.25),n.length>=10?o+=.2:n.length>=5&&(o+=.1);let u=new Set(["yes","no","true","false","get","post","put","delete","active","inactive","pending","success","error","failed"]);return n.every(f=>u.has(f.toLowerCase()))&&(o+=n.length>=i?.5:.2),Math.min(o,1)},$l=(e,n,t)=>{let o=t?.enumConfidenceThreshold??.6;return bl(e,n,t)>=o},Tl=e=>{let n=Object.keys(e);if(n.some(s=>/currency|curr/i.test(s)))for(let s of n)/amount|price|cost|fee|tax|total|subtotal/i.test(s)&&e[s].type==="number"&&(e[s].format="float");let o=n.some(s=>/^lat(itude)?$/i.test(s)),r=n.some(s=>/^(lng|lon|longitude)$/i.test(s));if(o&&r)for(let s of n)/^lat(itude)?$|^(lng|lon|longitude)$/i.test(s)&&e[s].type==="number"&&(e[s].format="float");if(n.some(s=>/created_?at|updated_?at/i.test(s)))for(let s of n)/created_?by|updated_?by/i.test(s)&&e[s].type==="string"&&(e[s].format="uuid")},Sl=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,xl=e=>{if(e.length<2)return!1;if(e.every(t=>/^\d+$/.test(t))||e.every(t=>Sl.test(t)))return!0;let n=e[0].match(/^(.*?)[_-]?\d+$/);if(n&&n[1]){let t=n[1];if(e.every(o=>{let r=o.match(/^(.*?)[_-]?\d+$/);return!!r&&r[1]===t}))return!0}return!1},J=(e,n,t=0,o,r)=>{let i=r?.maxDepth??ss,s=(l,c,u)=>(r?.includeMeta&&(l._meta={reason:c,info:u}),l);if(t>i)return s({type:"any"},"max_depth_exceeded");if(e===null)return s({type:"any",nullable:!0},"null_value");if(e===void 0)return s({type:"any",optional:!0},"undefined_value");if(Array.isArray(e)){if(e.length===0)return s({type:"array",itemType:{type:"any"}},"empty_array");let l=e.length,c=r?.arrayLargeThreshold??1e3,u=r?.arraySampleCount??200,f=r?.arrayPrefixSample??10,m=new Set;if(l<=c)for(let h=0;h<l;h++)m.add(h);else{let h=Math.min(f,l);for(let T=0;T<h;T++)m.add(T);let $=Math.max(0,Math.min(u-h,l-h));if($>0){let T=(l-h)/$;for(let S=0;S<$;S++)m.add(Math.min(l-1,Math.floor(h+S*T)))}}let p=Array.from(m).sort((h,$)=>h-$).map(h=>e[h]),d=new Set,y=gl(p);for(let[h,$]of Object.entries(y))$l(h,$,r)&&d.add(h);let g=J(p[0],void 0,t+1,d,r);for(let h=1;h<p.length;h++)g=we(g,J(p[h],void 0,t+1,d,r),t+1);if(r?.detectDiscriminatedUnions!==!1&&p.length>=2){let h=Al(p,t,r);h&&(g={...g,discriminatorField:h.discriminatorField,discriminatedVariants:h.variants})}let b;if(l>=2&&l<=6&&e.every(h=>h===null||typeof h!="object")){let h=e.map(T=>J(T,void 0,t+1,void 0,r));new Set(h.map(T=>T.type)).size>=2&&(b=h)}return s({type:"array",itemType:g,...b?{tupleTypes:b}:{}},"array_inferred",{samples:l,sampled:p.length})}if(typeof e=="object"){let l={};for(let u in e)l[u]=J(e[u],u,t+1,o,r);Tl(l);let c=Object.keys(l);if(xl(c)){let u=l[c[0]];for(let f=1;f<c.length;f++)u=we(u,l[c[f]],t+1);return s({type:"object",fields:l,recordValueType:u},"record_inferred",{fieldCount:c.length})}return s({type:"object",fields:l},"object",{fieldCount:Object.keys(l).length})}if(typeof e=="string"){if(e==="")return s({type:"string",format:"text"},"empty_string");if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(e))return s({type:"string",format:"uuid"},"format:uuid");if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))return s({type:"string",format:"email"},"format:email");if(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(e))return s({type:"string",format:"color"},"format:color");if(/^https?:\/\/[^\s]+$/.test(e)&&e.includes("{"))return s({type:"string",format:"text"},"format:url-template");if(/^https?:\/\/[^\s]+$/.test(e))return s({type:"string",format:"url"},"format:url");if(!/version|semver|release/i.test(n??"")){if(/^\d{4}-\d{2}-\d{2}$/.test(e)&&!isNaN(Date.parse(e)))return s({type:"string",format:"date"},"format:date");if(/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(e)&&!isNaN(Date.parse(e)))return s({type:"string",format:"date"},"format:date");if(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}[ T]\d{2}:\d{2}/.test(e)&&!isNaN(Date.parse(e)))return s({type:"string",format:"datetime"},"format:datetime");if(/^\d/.test(e)&&e.includes("T")&&!isNaN(Date.parse(e))&&e.length>7)return s({type:"string",format:"datetime"},"format:datetime")}let c=!1;if(n){let u=n.toLowerCase(),f=Array.from(os),m=/price|amount|cost|fee|tax|rate|ratio|percent|score|weight|height|width|balance|salary|revenue/i,p=/^uuid$|^guid$/i,d=/url|uri|href|link|(?<![a-zA-Z])src|endpoint|avatar|thumbnail|image|photo/i,y=/email|mail/i;if(p.test(n))return s({type:"string",format:"uuid"},"format:uuid:keyname");if(y.test(n))return s({type:"string",format:"email"},"format:email:keyname");let g=/^[a-z][a-z0-9+.-]*:/.test(e)&&!/^https?:\/\//.test(e);if(d.test(n)&&!e.startsWith("/")&&!g&&e.includes("{"))return s({type:"string",format:"text"},"format:url-template:keyname");if(d.test(n)&&!e.startsWith("/")&&!g)return s({type:"string",format:"url"},"format:url:keyname");if(o?c=o.has(n):(f.some(b=>u.includes(b))||new Set(["yes","no","true","false","get","post","put","delete","active","inactive","pending","success","error","failed"]).has(e.toLowerCase()))&&(c=!0),c&&hl.test(n)&&(c=!1),!c&&m.test(n))return s({type:"string"},"format:float:keyname")}return c&&e.trim()!==""?s({type:"string",enumValues:[e]},"enum_candidate",{sample:e}):s({type:"string"},"string")}if(typeof e=="number"){let l=Number.isInteger(e);return s({type:"number",format:l?"int":"float"},"number")}let a=typeof e;return s(a==="string"||a==="number"||a==="boolean"||a==="object"?{type:a}:{type:"any"},"primitive")},Al=(e,n,t)=>{if(e.length<2||!e.every(r=>r!==null&&typeof r=="object"&&!Array.isArray(r)))return null;let o=Object.keys(e[0]);for(let r of o){if(!e.every(u=>typeof u[r]=="string"&&u[r].length>0))continue;let i=Array.from(new Set(e.map(u=>u[r])));if(i.length<2||i.length>8)continue;let s={};for(let u of i){let f=e.filter(p=>p[r]===u);if(f.length===0)continue;let m=J(f[0],void 0,n+1,void 0,t);for(let p=1;p<f.length;p++)m=we(m,J(f[p],void 0,n+1,void 0,t),n+1);s[u]=m}if(Object.keys(s).length<2)continue;let a=Object.values(s).map(u=>new Set(Object.entries(u.fields??{}).filter(([,f])=>!f.optional).map(([f])=>f)));if(Array.from(new Set(a.flatMap(u=>Array.from(u)))).filter(u=>!a.every(f=>f.has(u))).length>=2)return{discriminatorField:r,variants:s}}return null},jl={typescript:`// Required dependencies: npm install typescript

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

`,"env-validator":`// Required dependencies: npm install zod

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

`,c:`// C99+ required. cJSON dependency: https://github.com/DaveGamble/cJSON

`,cpp:`// C++17 required. nlohmann/json: https://github.com/nlohmann/json

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

`,dynamodb:"",bigquery:"",openapi:`# OpenAPI 3.0 specification (YAML format)

`,avro:"",mermaid:`%% Mermaid ER Diagram \u2014 paste into https://mermaid.live

`,postman:"",http:`// HTTP file format (JetBrains IDE / VS Code REST Client compatible)

`,vscode:`// VS Code snippet format \u2014 paste into .vscode/snippets.json

`,curl:`# cURL command

`,cobol:`* COBOL Copybook format

`,scala:`// Scala case class

`,solidity:`// SPDX-License-Identifier: MIT

`,"r-lang":`# R dataframe scaffold

`,"react-query":`// Required dependencies: npm install @tanstack/react-query

`,"api-route":`// Generated Next.js App Router API Route
// Required: Next.js 13+ with App Router enabled

`,"nextjs-api":`// Generated Next.js App Router API Route
// Required: Next.js 13+ with App Router enabled

`,"mcp-tool":`// Required: npm install @modelcontextprotocol/sdk zod

`,"openai-function":"","vercel-ai-tool":`// Required: npm install ai zod

`,"nestjs-dto":`// Required: npm install class-validator class-transformer
// tsconfig.json: "experimentalDecorators": true, "emitDecoratorMetadata": true

`,"effect-schema":`// Required: npm install effect
import { Schema } from "effect";

`,"llm-response":"","llm-validator":"","llm-zod":"","type-guard":"",typeguard:""},Ol=e=>{let n=e.split(`
`).map(r=>r.trimEnd()),t=[],o=!1;for(let r of n)r===""?o||(t.push(""),o=!0):(t.push(r),o=!1);return t.join(`
`).trim()},Qn=new WeakMap,Nl=e=>{if(Qn.has(e))return Qn.get(e);let n=r=>{if(!r)return null;if(r.type==="object"&&r.fields){let s=Object.keys(r.fields).sort((l,c)=>l.localeCompare(c)),a={};for(let l of s)a[l]=n(r.fields[l]);return{type:"object",fields:a}}if(r.type==="array"&&r.itemType)return{type:"array",item:n(r.itemType)};let i={type:r.type,optional:!!r.optional,nullable:!!r.nullable};return r.enumValues&&r.enumValues.length>0&&(i.enum=[...r.enumValues].sort()),r.format&&(i.format=r.format),i},t=JSON.stringify(n(e)),o=(0,is.createHash)("sha256").update(t).digest("hex");return Qn.set(e,o),e._structureHash=o,o},Xn=(e,n=[],t="Root")=>{if(e.type==="object"&&e.fields){n.push({schema:e,parentKey:t});for(let[o,r]of Object.entries(e.fields))Xn(r,n,o)}else e.type==="array"&&e.itemType&&Xn(e.itemType,n,t+"Item")},et=(e,n,t=new Set,o={})=>{if(e.type!=="object"||n.type!=="object"||!e.fields||!n.fields)return!1;let r=Object.keys(e.fields),i=Object.keys(n.fields),s=o.minFieldsForIsomorphic??2;if(r.length<s||i.length<s)return!1;let a=e._structureHash,l=n._structureHash,c=a&&l?`${a}-${l}`:void 0;if(c&&t.has(c))return!0;c&&t.add(c);let u=Array.from(new Set([...r,...i]));if(u.filter($=>e.fields[$]&&n.fields[$]).length===0)return!1;let m=0,p=0,d=0;for(let $ of u){let T=e.fields[$],S=n.fields[$];if(T&&S)if(T.type==="any"||S.type==="any")m++;else if(T.type===S.type)if(T.type==="object"&&T.fields&&S.fields)et(T,S,t,o)?m++:p++;else if(T.type==="array"&&T.itemType&&S.itemType){let v=T.itemType,C=S.itemType;v.type==="any"||C.type==="any"?m++:v.type==="object"&&C.type==="object"?et(v,C,t,o)?m++:p++:v.type===C.type?m++:p++}else m++;else p++;else{let v=T||S;v.optional||v.type==="any"?m++:d++}}let y=m+p+d;if(y===0)return!0;let g=m/y,b=o.minMatchRatio??.5,h=o.maxTypeMismatches??0;return g>=b&&p<=h},nt=(e,n)=>{if(!(!e.fields||!n.fields)){for(let[t,o]of Object.entries(n.fields))if(!e.fields[t])e.fields[t]={...o,optional:!0};else{let r=e.fields[t];if(r.optional=r.optional||o.optional,r.nullable=r.nullable||o.nullable,r.type==="any")e.fields[t]={...o,optional:r.optional,nullable:r.nullable};else if(r.type==="string"&&o.type==="string"){if(r.enumValues||o.enumValues){let i=Array.from(new Set([...r.enumValues??[],...o.enumValues??[]]));r.enumValues=i.length<=6?i:void 0}}else r.type==="object"&&o.type==="object"?nt(r,o):r.type==="array"&&r.itemType&&o.type==="array"&&o.itemType&&(r.itemType.type==="any"?r.itemType={...o.itemType}:r.itemType.type==="object"&&o.itemType.type==="object"?nt(r.itemType,o.itemType):r.itemType.type===o.itemType.type&&(r.itemType=we(r.itemType,o.itemType)))}for(let t of Object.keys(e.fields))n.fields[t]||(e.fields[t].optional=!0)}},wl=(e,n={})=>{let t=n.sharedPrefix!==void 0?n.sharedPrefix:"Shared",o=[];for(let s of e){let a=!1;for(let l of o)if(et(s.schema,l[0],new Set,n)){l.push(s.schema),a=!0;break}a||o.push([s.schema])}let r=new Set,i=[];for(let s of o){let a=1;if(s.length<2)continue;s.sort((d,y)=>Object.keys(y.fields||{}).length-Object.keys(d.fields||{}).length);let l=s[0],u=(e.find(d=>d.schema===l)||e.find(d=>s.includes(d.schema)))?.parentKey||"Object",f=Object.keys(l.fields||{}),m="";if(f.includes("city")&&(f.includes("street")||f.includes("zip")))m=t?`${t}Address`:"Address";else if(f.includes("amount")&&f.includes("currency"))m=t?`${t}Money`:"Money";else if(f.includes("created_at")&&f.includes("updated_at"))m=t?`${t}Metadata`:"Metadata";else if(f.includes("name")&&(f.includes("email")||f.includes("age")||f.includes("profile")||f.includes("role")))m=t?`${t}User`:"User";else if(f.includes("id")&&f.includes("profile")&&f.includes("permissions"))m=t?`${t}Member`:"Member";else{let d=s.map(h=>e.find($=>$.schema===h)?.parentKey).filter(h=>!!h&&h!=="Root"&&h!=="Object"),y=d.length>0?d.sort((h,$)=>h.length-$.length)[0]:u,g=new Set(["status","address","business","process","class","series","species","means","news","analysis","basis","crisis","thesis","oasis","bonus","genius","campus","focus","corpus","census","consensus","virus","canvas","atlas","alias","bias","gas"]);y.endsWith("s")&&!y.endsWith("ss")&&!g.has(y.toLowerCase())&&(y=y.slice(0,-1));let b=y.replace(/(^\w|_\w)/g,h=>h.replace(/_/,"").toUpperCase());m=t?`${t}${b}`:b}let p=m;for(;r.has(p);)p=`${m}${a++}`;r.add(p),i.push({group:s,semanticName:p})}return i},kl=(e,n={})=>{let t=[];Xn(e,t,"Root");for(let r of t)r.schema._structureHash=Nl(r.schema);let o=wl(t,n);for(let{group:r,semanticName:i}of o){if(n.disabledUnifications?.includes(i))continue;let s=n.customTypeNames?.[i]??i,a=r[0];for(let l=1;l<r.length;l++)nt(a,r[l]);for(let l=1;l<r.length;l++)r[l].fields=a.fields;for(let l of r)l._sharedTypeName=s}};var We=(e,n,t="",o={})=>{try{if(!o._openAPIComponent&&cn(e)){let b=un(e);if(b.length>0)return b.map(({name:$,schema:T},S)=>We(T,n,t,{...o,rootName:$,_openAPIComponent:S>0})).filter($=>typeof $=="string"&&$.trim()).join(`

`)}if(!o._openAPIComponent&&fn(e)){let b=pn(e);if(b.length>0)return b.map(({name:$,schema:T},S)=>We(T,n,t,{...o,rootName:$,_openAPIComponent:S>0})).filter($=>typeof $=="string"&&$.trim()).join(`

`)}let r=!!o._openAPIComponent,i=e&&e._isTypeMorphSchema?e:J(e);o.samplesMode&&i.type==="array"&&i.itemType&&(i=i.itemType);let s=o.rootName??"Root";!r&&!e?._isTypeMorphSchema&&rs(i,s),r||kl(i,o);let a="",l="",c=(n||t||"").toLowerCase();l=c;let u=s.charAt(0).toLowerCase()+s.slice(1);if(c==="typescript"||c==="ts")a=(r?"":`/**
 * TypeMorph Generated TypeScript Interface
 */
`)+ht.generate(i,s,o);else if(c==="zod")a=(r?"":`import { z } from "zod";

`)+bt.generate(i,u,o);else if(c==="go"||c==="golang")a=_t.generate(i,s,o);else if(c==="rust")a=Ct.generate(i,s,o);else if(c==="java")a=Et.generate(i,s,o);else if(c==="python"){let b=At.generate(i,s,o),h=[];/\bOptional\[/.test(b)&&h.push("Optional"),/\bList\[/.test(b)&&h.push("List"),/\bAny\b/.test(b)&&h.push("Any");let $=/\bField\(/.test(b)?`from pydantic import BaseModel, Field
`:`from pydantic import BaseModel
`;h.length&&($+=`from typing import ${h.join(", ")}
`),/:\s*datetime\b/.test(b)&&($+=`from datetime import datetime
`),a=(r?"":`${$}
`)+b}else c==="php"?a=(r?"":`<?php

`)+St.generate(i,s,o):c==="sql"||c==="prisma"?a=It.generate(i,s,o):c==="proto"||c==="protobuf"?a=(r?"":`// Protocol Buffers v3 specification

syntax = "proto3";

`)+Ot.generate(i,s,o):c==="graphql"||c==="gql"?a=wt.generate(i,s,o):c.includes("csv")?a=Qr.generate(i):c.includes("sql-insert")?a=Xr.generate(i,"table_name"):c.includes("mysql")?a=ei.generate(i,"Root"):c.includes("postgres")?a=ni.generate(i,"Root"):c.includes("sqlite")?a=ti.generate(i,"Root"):c.includes("snowflake")?a=ri.generate(i,"Root"):c.includes("mongodb")||c.includes("mongoose")?a=Si.generate(i,"Root"):c.includes("ruby")||c.includes("rails")?a=qi.generate(i,"Root"):c.includes("django")?a=Vi.generate(i,"Root"):c.includes("dart")||c.includes("flutter")?a=Tt.generate(i,"Root",o):c.includes("swift")?a=Gt.generate(i):c.includes("kotlin")?a=Ut.generate(i):c.includes("csharp")||c.includes("c-sharp")?a=Ft.generate(i):c.includes("openapi")?a=gi.generate(i,"Root"):c.includes("jsonschema")?a=Bt.generate(i):c.includes("yup")?a=sn.generate(i,"root"):c.includes("joi")?a=on.generate(i,"root"):c.includes("valibot")?a=an.generate(i,"root"):c.includes("react-props")?a=Ni.generate(i,"Component"):c.includes("vue-props")?a=Ci.generate(i,"Component"):c.includes("svelte-props")?a=Ri.generate(i,"Component"):c.includes("solid-props")?a=_i.generate(i,"Component"):c.includes("react-context")?a=wi.generate(i,"Root"):c.includes("react-query")?a=Wi.generate(i,s):c.includes("api-route")||c.includes("nextjs-api")?a=Bi.generate(i,s):c.includes("redux-slice")?a=ki.generate(i,"root"):c.includes("pinia")?a=vi.generate(i,"root"):c.includes("sequelize")?a=xi.generate(i,"Root"):c.includes("typeorm")?a=Ai.generate(i,"Root"):c.includes("drizzle")?a=ji.generate(i,"Root"):c.includes("kysely")?a=Oi.generate(i,"Root"):c.includes("superstruct")?a=ln.generate(i,"root"):c.includes("arduino")?a=Ei.generate(i,"Data"):c.includes("mock")?a=Lt.generate(i):c.includes("ui")?a=Mt.generate(i,"Component"):c.includes("asciidoc")?a=ui.generate(i):c.includes("doc")?a=He.generate(i):c.includes("avro")?a=mi.generate(i,"Root"):c.includes("toml")?a=ii.generate(i,"config"):c.includes("yaml")?a=si.generate(i):c.includes("env-validator")?a=ai.generate(i):c.includes("env")?a=oi.generate(i):c.includes("properties")?a=li.generate(i):c.includes("markdown")?a=ci.generate(i):c.includes("latex")?a=fi.generate(i):c.includes("mermaid")?a=pi.generate(i,"Root"):c.includes("bigquery")?a=di.generate(i):c.includes("dynamodb")?a=yi.generate(i,"Root"):c.includes("postman")?a=hi.generate(i):c.includes("http")?a=bi.generate(i):c.includes("vscode")?a=$i.generate(i):c.includes("curl")?a=Ti.generate(i):c.includes("cobol")?a=Ii.generate(i,"ROOT"):c.includes("clojure")?a=Mi.generate(i,"Root"):c.includes("elixir")?a=Li.generate(i,"Root"):c.includes("elm")?a=zi.generate(i,"Root"):c.includes("godot")||c.includes("gdscript")?a=Fi.generate(i,"Root"):c.includes("haskell")?a=Di.generate(i,"Root"):c.includes("r-lang")||c==="r"?(a=Gi.generate(i,"Root"),l="r-lang"):c.includes("scala")?a=Pi.generate(i,"Root"):c.includes("solidity")?a=Ui.generate(i,"Root"):c.includes("cpp")||c.includes("c++")||c.includes("cpp-struct")||c.includes("cpp-class")?a=Ki.generate(i,s):c==="c"||c.includes("c-struct")||c.includes("json-to-c")?a=Ji.generate(i,s):c.includes("zod-migrate")||c.includes("zod-v3")||c.includes("zod-v4")?(a=`/* Zod v4 Migration \u2014 paste your Zod v3 schema in the \u2B06 Zod v4 tab */
import { z } from 'zod';

// Format validators are now top-level in Zod v4:
const examples = {
  email:    z.email(),           // was: z.string().email()
  url:      z.url(),             // was: z.string().url()
  uuid:     z.uuid(),            // was: z.string().uuid()
  datetime: z.iso.datetime(),    // was: z.string().datetime()
  date:     z.iso.date(),        // was: z.string().date()
};`,l="zod-migrate"):c.includes("ts-to-zod")||c==="ts-to-zod"?(a=`/* TypeScript \u2192 Zod \u2014 paste your TypeScript interfaces in the TS \u2192 Zod tab */
import { z } from 'zod';

const UserSchema = z.object({
  id:    z.string(),
  email: z.string(),
  age:   z.number(),
  role:  z.enum(['admin', 'user', 'guest']),
});
export type User = z.infer<typeof UserSchema>;`,l="ts-to-zod"):c.includes("mcp-tool")||c.includes("mcp")?a=Hi.generate(i,s):c.includes("openai-function")||c.includes("openai-func")?a=Zi.generate(i,s):c.includes("vercel-ai-tool")||c.includes("vercel-ai")?a=Qi.generate(i,s):c.includes("nestjs-dto")||c.includes("nestjs")?a=qt.generate(i,s,o):c.includes("effect-schema")||c.includes("effect")?a=Wt.generate(i,u,o):c.includes("llm-response")||c.includes("llm-validator")||c.includes("llm-zod")?a=Yi.generate(i,s):(c.includes("type-guard")||c.includes("typeguard"))&&(a=(r?"":`/**
 * TypeMorph Generated Type Guards
 * No runtime dependencies required
 */
`)+Jt.generate(i,s,o));let f=new Set(["typescript","ts","zod","go","golang","rust","java","python","php","sql","prisma","proto","protobuf","graphql","gql","json","r"]),m=["csv","sql-insert","mysql","postgres","sqlite","snowflake","mongodb","mongoose","ruby","rails","django","dart","flutter","swift","kotlin","csharp","c-sharp","openapi","jsonschema","yup","joi","valibot","react-props","vue-props","svelte-props","solid-props","react-context","react-query","api-route","nextjs-api","redux-slice","pinia","sequelize","typeorm","drizzle","kysely","superstruct","arduino","mock","ui","doc","avro","toml","yaml","env-validator","env","properties","markdown","asciidoc","latex","mermaid","bigquery","dynamodb","postman","http","vscode","curl","cobol","clojure","elixir","elm","godot","gdscript","haskell","r-lang","scala","solidity","cpp","c++","cpp-struct","cpp-class","c-struct","json-to-c","mcp-tool","mcp","openai-function","openai-func","vercel-ai-tool","vercel-ai","nestjs-dto","nestjs","effect-schema","effect","llm-response","llm-validator","llm-zod","type-guard","typeguard"],p=f.has(c)||m.some(b=>c.includes(b));c==="json"?a=JSON.stringify(e,null,2):!a&&p?a=`// No output generated for "${n||t||c}". The input may be empty or lack the structure this format expects.`:a||(l="unsupported",ns(n||t||"unknown",c),a=`// Unsupported output target: "${n||t||"unknown"}"
// Supported targets include: typescript, zod, go, rust, java, python, php, sql, protobuf, graphql, swift, kotlin, jsonschema, mock, ui, doc, openapi, yup, joi, valibot, react-props, vue-props, svelte-props, solid-props, react-context, redux-slice, pinia, sequelize, typeorm, drizzle, kysely, superstruct, arduino, clojure, elixir, elm, godot, haskell, r, scala, solidity
`);let d="",y=l.toLowerCase();for(let[b,h]of Object.entries(jl))if(y===b){d=h;break}let g=d&&!r?d+a:a;return Ol(g)}catch(r){return"// Error: "+String(r)}};var vl=/email|url|link|href|website|endpoint|uuid|guid|^id$|_id$|Id$|ID$|date|_at$|At$|time|timestamp|phone|\btel\b|zip|postal|^ip$|ip_/i,Cl=/^(name|label|title|description|desc|summary|body|content|text|message|note|notes|comment|comments|bio|about|reason|details|info|caption|heading|subtitle|excerpt|overview|remark|remarks|placeholder|hint|tooltip|instruction|instructions|query|search|address|street|city|country|state|province|slug|tag|category|type|status|kind|mode|locale|lang|language|currency|unit|format|source|target|key|value|data)$/i,Rl=/password|passwd|secret|token|apikey|api_key|auth|credential|private/i,_l={email:/email/i,url:/url|link|href|website|endpoint/i,uuid:/uuid|guid/i,id:/^id$|_id$|Id$|ID$/,date:/date|_at$|At$|time|timestamp/i,phone:/phone|tel/i,ip:/^ip$|ip_|ipAddr|ip_address/i};function El(e){return/^[a-z][a-zA-Z0-9]*$/.test(e)&&e!==e.toUpperCase()}function Il(e){return/^[a-z][a-z0-9_]*$/.test(e)&&e.includes("_")}function Ml(e){return/^[A-Z][a-zA-Z0-9]*$/.test(e)}function as(e){return Il(e)?"snake_case":Ml(e)?"PascalCase":El(e)?"camelCase":"other"}function tt(e,n,t,o,r){if(!(t>20))if(o.maxDepth=Math.max(o.maxDepth,t),e.type==="object"&&e.fields)for(let[i,s]of Object.entries(e.fields)){let a=n?`${n}.${i}`:i;if(o.total++,o.nameCounts[as(i)]=(o.nameCounts[as(i)]??0)+1,s.type==="any"&&(o.anyCount++,r.push({severity:"warning",message:"Has `any` type \u2014 add a specific type",path:a})),s.optional?o.optionalCount++:o.requiredCount++,s.type==="string"){let l=!!s.format,c=Object.values(_l).some(u=>u.test(i));l||c?o.formattedCount++:vl.test(i)&&!Cl.test(i)&&o.semanticUnformatted.push({path:a}),Rl.test(i)&&r.push({severity:"info",message:"May contain sensitive data \u2014 consider hashing or omitting",path:a})}tt(s,a,t+1,o,r)}else e.type==="array"&&e.itemType&&tt(e.itemType,`${n}[]`,t+1,o,r)}function Ll(e){let n=Object.entries(e).filter(([,i])=>i>0);if(n.length===0)return"unknown";n.sort((i,s)=>s[1]-i[1]);let t=n.reduce((i,[,s])=>i+s,0),[o,r]=n[0];return r/t>=.8?o:"mixed"}function zl(e){return e>=90?"A":e>=75?"B":e>=60?"C":e>=40?"D":"F"}function ls(e){let n=[],t={total:0,anyCount:0,formattedCount:0,semanticUnformatted:[],optionalCount:0,requiredCount:0,nameCounts:{camelCase:0,snake_case:0,PascalCase:0,other:0},maxDepth:0};tt(e,"",0,t,n);let o=100;if(t.total>0){let i=t.anyCount/t.total,s=Math.round(i*50);s>0&&(o-=s)}if(t.semanticUnformatted.length>0){let i=Math.min(20,t.semanticUnformatted.length*5);o-=i;for(let{path:s}of t.semanticUnformatted.slice(0,3))n.push({severity:"info",message:"Looks like it needs a format constraint (uuid, email, datetime\u2026)",path:s});t.semanticUnformatted.length>3&&n.push({severity:"info",message:`${t.semanticUnformatted.length-3} more fields may need format constraints`})}let r=Ll(t.nameCounts);if(r==="mixed"&&t.total>=2&&(o-=15,n.push({severity:"warning",message:"Field names mix camelCase and snake_case \u2014 pick one style consistently"})),t.maxDepth>4){let i=Math.min(10,(t.maxDepth-4)*2);o-=i,t.maxDepth>6&&n.push({severity:"warning",message:`Schema is ${t.maxDepth} levels deep \u2014 consider flattening or splitting`})}return t.total>=3&&t.requiredCount===0&&(o-=10,n.push({severity:"warning",message:"All fields are optional \u2014 mark required fields to improve type safety"})),t.total===1&&n.push({severity:"info",message:"Only 1 field \u2014 quality score is based on limited data"}),o=Math.max(0,Math.min(100,o)),{score:o,grade:zl(o),issues:n,stats:{totalFields:t.total,anyFields:t.anyCount,formattedFields:t.formattedCount,optionalFields:t.optionalCount,requiredFields:t.requiredCount,maxDepth:t.maxDepth,namingStyle:r}}}function cs(e){return e.toLowerCase().replace(/[^a-z0-9]/g,"")}function rt(e,n){let t=cs(e),o=cs(n);if(t===o)return 3;if(t.includes(o)||o.includes(t))return 2;let r=Math.min(t.length,o.length);if(r>=4){let i=0;for(;i<r&&t[i]===o[i];)i++;if(i>=4)return 1}return 0}function Fl(e,n){let t=Object.keys(e).filter(s=>!(s in n)),o=Object.keys(n).filter(s=>!(s in e)),r=new Map,i=new Set;for(let s of[!0,!1])for(let a of t){if(r.has(a))continue;let l=o.filter(f=>i.has(f)||s&&e[a].type!==n[f].type?!1:rt(a,f)>0);if(l.length===0)continue;let c=Math.max(...l.map(f=>rt(a,f))),u=l.filter(f=>rt(a,f)===c);u.length===1&&(r.set(a,u[0]),i.add(u[0]))}return r}function us(e,n,t="root"){let o=[];function r(i,s,a){let l=a.replace(/^root\.?/,"")||"root";if(i.type!==s.type){o.push({path:l,type:"type_changed",oldType:i.type,newType:s.type,severity:"error",description:`'${l}' changed type from '${i.type}' to '${s.type}'.`});return}!i.optional&&s.optional&&o.push({path:l,type:"required_changed",severity:"warning",description:`'${l}' changed from required to optional. Consumers must handle undefined.`}),i.optional&&!s.optional&&o.push({path:l,type:"required_changed",severity:"error",description:`'${l}' changed from optional to required. Existing payloads missing this field will be invalid.`}),!i.nullable&&s.nullable&&o.push({path:l,type:"nullable_changed",severity:"info",description:`'${l}' became nullable. Add null-checks if needed.`}),i.nullable&&!s.nullable&&o.push({path:l,type:"nullable_changed",severity:"warning",description:`'${l}' is no longer nullable. Existing null values will be invalid.`}),(i.format??"")!==(s.format??"")&&o.push({path:l,type:"format_changed",oldType:i.format??"none",newType:s.format??"none",severity:i.format&&!s.format?"warning":"info",description:`'${l}' format changed from '${i.format??"none"}' to '${s.format??"none"}'.`});let c=i.enumValues??[],u=s.enumValues??[];if(c.length>0||u.length>0){let f=c.filter(p=>!u.includes(p)),m=u.filter(p=>!c.includes(p));f.length>0&&o.push({path:l,type:"enum_changed",severity:"error",description:`Enum values removed from '${l}': ${f.map(p=>`"${p}"`).join(", ")}. Existing data with these values will be invalid.`}),m.length>0&&o.push({path:l,type:"enum_changed",severity:"info",description:`New enum values added to '${l}': ${m.map(p=>`"${p}"`).join(", ")}.`})}if(i.type==="object"&&s.type==="object"){let f=i.fields??{},m=s.fields??{},p=Fl(f,m),d=new Set(p.values());for(let y of Object.keys(f)){let g=l==="root"?"":l+".";if(!(y in m))if(p.has(y)){let b=p.get(y),h=f[y].type!==m[b].type;o.push({path:`${g}${y}`,type:"renamed",oldType:y,newType:b,severity:"error",description:h?`'${y}' renamed to '${b}' (type: ${f[y].type} \u2192 ${m[b].type}). Clients using the old name will break.`:`'${y}' renamed to '${b}'. Clients using the old name will break.`}),!h&&f[y].type==="object"&&r(f[y],m[b],`${a}.${b}`)}else{let b=!f[y].optional;o.push({path:`${g}${y}`,type:"removed",oldType:f[y].type,severity:b?"error":"warning",description:b?`Required field '${y}' was removed. This is a breaking change.`:`Optional field '${y}' was removed.`})}}for(let y of Object.keys(m)){let g=l==="root"?"":l+".";if(y in f||d.has(y))continue;let b=!m[y].optional;o.push({path:`${g}${y}`,type:"added",newType:m[y].type,severity:b?"error":"info",description:b?`New required field '${y}' added. Existing payloads missing this field will be invalid.`:`New optional field '${y}' added.`})}for(let y of Object.keys(f))y in m&&r(f[y],m[y],`${a}.${y}`)}i.type==="array"&&s.type==="array"&&i.itemType&&s.itemType&&r(i.itemType,s.itemType,`${a}[]`)}return r(e,n,t),o}function Dl(e){let n=e.toLowerCase();return/(_id$|^id$)/.test(n)||/Id$/.test(e)?"a1b2c3d4-e5f6-7890-abcd-ef1234567890":/email/.test(n)?"user@example.com":/url|link|href|uri|website/.test(n)?"https://example.com":/(_at$|_date$|_time$)/.test(n)||/^(created|updated|deleted|started|ended|expires|published)/.test(n)?"2024-01-01T00:00:00Z":/phone|tel/.test(n)?"+1-555-000-0000":/zip|postal/.test(n)?"10001":/country/.test(n)?"US":/currency/.test(n)?"USD":/language|locale/.test(n)?"en":/color|colour/.test(n)?"#000000":/password|secret|token|key/.test(n)?"example-token":/name/.test(n)?"Example Name":/title/.test(n)?"Example Title":/description|desc|body|content|message|note/.test(n)?"Example text":/path|route/.test(n)?"/example":/status|type|kind|category|tag|label/.test(n)?"active":"string"}function Gl(e){let n=e.toLowerCase();return/price|amount|cost|fee|balance|salary|budget|total|subtotal/.test(n)?9.99:/percent|rate/.test(n)?50:/lat/.test(n)?35.6895:/lng|lon/.test(n)?139.6917:/year/.test(n)?2024:/month/.test(n)||/day/.test(n)?1:/age/.test(n)?30:/count|quantity|qty|size|length/.test(n)||/index|rank|page/.test(n)?1:0}function ke(e,n,t,o,r){if(r>6)return null;let i=e.trim().replace(/;$/,"");if(i.includes("|")){let u=i.split("|").map(f=>f.trim()).filter(f=>f!=="null"&&f!=="undefined"&&f!=="never"&&f!=="void");return u.length===0?null:ke(u[0],n,t,o,r)}if(i==="string")return Dl(n);if(i==="number"||i==="bigint"||i==="int"||i==="float")return Gl(n);if(i==="boolean")return!1;if(i==="null"||i==="undefined"||i==="void"||i==="never"||i==="any"||i==="unknown")return null;if(i==="true")return!0;if(i==="false")return!1;if(i==="object"||i==="Record<string,unknown>"||i==="Record<string, unknown>")return{};let s=i.match(/^['"](.+)['"]$/);if(s)return s[1];if(/^-?\d+(\.\d+)?$/.test(i))return parseFloat(i);let a=i.match(/^(.+)\[\]$/);if(a)return[ke(a[1].trim(),n,t,o,r+1)];let l=i.match(/^Array<(.+)>$/);if(l)return[ke(l[1].trim(),n,t,o,r+1)];let c=i.match(/^(?:Partial|Required|Readonly|NonNullable|Promise)<(.+)>$/);return c?ke(c[1].split(",")[0].trim(),n,t,o,r):/^(Record|Map|Set)</.test(i)?{}:t.has(i)?o.has(i)?{}:fs(t.get(i),t,new Set([...o,i]),r+1):i.startsWith("{")&&i.endsWith("}")?Pl(i.slice(1,-1),t,o,r+1):null}function Pl(e,n,t,o){if(o>6)return{};let r={};for(let i of Be(e)){if(/^\[/.test(i))continue;let s=i.match(/^(?:readonly\s+)?(\w+)(\?)?\s*:\s*([\s\S]+)$/);if(!s)continue;let[,a,,l]=s;r[a]=ke(l.replace(/[;,]\s*$/,"").trim(),a,n,t,o)}return r}function fs(e,n,t,o){let r={};for(let i of e.fields)r[i.name]=ke(i.type,i.name,n,t,o);return r}function Ul(e){let n=[],t=/(?:export\s+)?type\s+(\w+)\s*=\s*\{/g,o;for(;(o=t.exec(e))!==null;){let r=1,i=o.index+o[0].length;for(;i<e.length&&r>0;){let l=e[i++];l==="{"?r++:l==="}"&&r--}let s=e.slice(o.index+o[0].length,i-1),a=[];for(let l of Be(s)){if(/^\[/.test(l))continue;let c=l.match(/^(?:readonly\s+)?(\w+)(\?)?\s*:\s*([\s\S]+)$/);c&&a.push({name:c[1],type:c[3].replace(/[;,]\s*$/,"").trim(),optional:c[2]==="?"})}n.push({id:o[1],label:o[1],fields:a,isRoot:!1})}return n}function Vl(e){return e.replace(/\[\]/g,"").split(/[|&,\s<>]+/).map(n=>n.trim()).filter(n=>n.length>0&&/^[A-Z]/.test(n))}function ps(e){try{let n=Wn(e),t=Ul(e).filter(c=>!n.nodes.some(u=>u.id===c.id)),o=[...n.nodes,...t];if(o.length===0)return{json:"",error:`No TypeScript interfaces or object type aliases found.

Example:

interface User {
  user_id: string;
  name: string;
  email: string;
  age: number;
}`};let r=new Map(o.map(c=>[c.id,c])),i=new Set;for(let c of o)for(let u of c.fields)for(let f of Vl(u.type))r.has(f)&&f!==c.id&&i.add(f);let s=o.filter(c=>!i.has(c.id)),a=s.length>0?s[0]:o[0],l=fs(a,r,new Set([a.id]),0);return{json:JSON.stringify(l,null,2)}}catch(n){return{json:"",error:n instanceof Error?n.message:"Parse error"}}}function ve(e){return e===null?"null":Array.isArray(e)?"array":typeof e}function ye(e){let n;try{n=typeof e=="string"?`"${e}"`:JSON.stringify(e)}catch{n=String(e)}return n==null&&(n=String(e)),n.length>40?n.slice(0,37)+"\u2026":n}function ql(e){return e.trim()!==""&&!Number.isNaN(Number(e))}var ms={uuid:e=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(e),email:e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e),url:e=>/^https?:\/\/\S+$/i.test(e),datetime:e=>/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(e),date:e=>/^\d{4}-\d{2}-\d{2}$/.test(e),ip:e=>/^(\d{1,3}\.){3}\d{1,3}$|:/.test(e)};function mn(e,n,t,o,r,i){if(!(e.type==="any"||e.type==="union")){if(n===null){e.nullable||r.push({recordIndex:o,path:t,code:"null",severity:"error",message:`${Z(t)} was null (expected ${e.type})`});return}if(n!==void 0)switch(e.type){case"object":{if(ve(n)!=="object"){r.push({recordIndex:o,path:t,code:"type",severity:"error",message:`${Z(t)}: expected object, got ${ve(n)} (${ye(n)})`});return}let s=n,a=e.fields??{};for(let l of Object.keys(a)){let c=a[l],u=t?`${t}.${l}`:l;if(!(l in s)||s[l]===void 0){c.optional||r.push({recordIndex:o,path:u,code:"missing",severity:"error",message:`missing required field ${Z(u)} (expected ${ds(c)})`});continue}mn(c,s[l],u,o,r,i)}if(i.extraFields!=="ignore")for(let l of Object.keys(s)){if(l in a)continue;let c=t?`${t}.${l}`:l;r.push({recordIndex:o,path:c,code:"extra",severity:i.extraFields==="error"?"error":"warning",message:`unexpected field ${Z(c)} appeared (not in schema)`})}return}case"array":{if(!Array.isArray(n)){r.push({recordIndex:o,path:t,code:"type",severity:"error",message:`${Z(t)}: expected array, got ${ve(n)} (${ye(n)})`});return}if(e.tupleTypes&&e.tupleTypes.length>0){e.tupleTypes.forEach((s,a)=>{a<n.length&&mn(s,n[a],`${t}[${a}]`,o,r,i)});return}e.itemType&&n.forEach((s,a)=>mn(e.itemType,s,`${t}[${a}]`,o,r,i));return}case"string":{if(typeof n!="string"){r.push({recordIndex:o,path:t,code:"type",severity:"error",message:`${Z(t)}: expected string, got ${ve(n)} (${ye(n)})`});return}e.enumValues&&e.enumValues.length>0&&!e.enumValues.includes(n)&&r.push({recordIndex:o,path:t,code:"enum",severity:"warning",message:`${Z(t)}: unexpected value ${ye(n)} (expected ${e.enumValues.join(" | ")})`}),e.format&&ms[e.format]&&!ms[e.format](n)&&r.push({recordIndex:o,path:t,code:"format",severity:"warning",message:`${Z(t)}: not a valid ${e.format} (${ye(n)})`});return}case"number":{if(typeof n!="number"){let s=typeof n=="string"&&ql(n);r.push({recordIndex:o,path:t,code:"type",severity:"error",message:`${Z(t)}: expected number, got ${ve(n)} (${ye(n)})`,fix:s?"model returned a quoted number \u2192 use z.coerce.number()":void 0})}return}case"boolean":{if(typeof n!="boolean"){let s=n==="true"||n==="false"||n===0||n===1;r.push({recordIndex:o,path:t,code:"type",severity:"error",message:`${Z(t)}: expected boolean, got ${ve(n)} (${ye(n)})`,fix:s?"use z.coerce.boolean() or normalize the value":void 0})}return}}}}function Z(e){return e?`"${e}"`:"root"}function ds(e){return e.type==="array"?`${e.itemType?ds(e.itemType):"any"}[]`:e.enumValues&&e.enumValues.length>0?e.enumValues.map(n=>`"${n}"`).join(" | "):e.format?`${e.type} (${e.format})`:e.type}var Bl={missing:"missing field",type:"wrong type",null:"null violation",enum:"unexpected enum value",format:"format drift",extra:"extra field"};function ys(e,n,t={}){let o={strict:t.strict??!1,extraFields:t.extraFields??"warn"},r=[],i=0;n.forEach((l,c)=>{let u=r.length;mn(e,l,"",c,r,o);let f=r.slice(u);(o.strict?f.length>0:f.some(p=>p.severity==="error"))&&i++});let s=new Map;for(let l of r)s.set(l.code,(s.get(l.code)??0)+1);let a=[...s.entries()].map(([l,c])=>({code:l,label:Bl[l],count:c})).sort((l,c)=>c.count-l.count);return{total:n.length,passed:n.length-i,failed:i,issues:r,summary:a,ok:i===0}}var q=e=>`\x1B[1m${e}\x1B[0m`,z=e=>`\x1B[2m${e}\x1B[0m`,R=e=>`\x1B[31m${e}\x1B[0m`,ge=e=>`\x1B[33m${e}\x1B[0m`,ae=e=>`\x1B[32m${e}\x1B[0m`,Wl=e=>`\x1B[36m${e}\x1B[0m`,gs=e=>`\x1B[34m${e}\x1B[0m`;function oe(e){let n=ot.resolve(e);return Re.existsSync(n)||(console.error(R(`File not found: ${e}`)),process.exit(1)),Re.readFileSync(n,"utf8")}function it(){return new Promise(e=>{let n="",t=Ss.createInterface({input:process.stdin});t.on("line",o=>n+=o+`
`),t.on("close",()=>e(n.trim()))})}function dn(e){let n=e.trim();try{return{obj:JSON.parse(n),raw:n}}catch{}try{return{obj:Kn(n),raw:n}}catch{}console.error(R("typemorph: input is not valid JSON or YAML")),process.exit(1)}function yn(e){let{obj:n}=dn(e);if(cn(n)){let t=un(n);return t.length>0?t:[{name:"Root",schema:J(n)}]}if(fn(n)){let t=pn(n);return t.length>0?t:[{name:"Root",schema:J(n)}]}return[{name:"Root",schema:J(n)}]}function Jl(e){return yn(e)[0].schema}var Kl={"TypeScript / Validation":["typescript","zod","yup","joi","valibot"],Backend:["go","rust","java","csharp","python","swift","kotlin","php","dart"],Database:["prisma","mysql","postgres","sqlite","mongoose","sequelize","typeorm","drizzle","dynamodb","bigquery","mongodb"],"API / Schema":["openapi","graphql","proto","jsonschema"],"Data / Markup":["csv","sql","toml","yaml","avro"],"Docs / Mock":["doc","mock"]};function Yl(){console.log(q(`
  typemorph \u2014 available formats
`));for(let[e,n]of Object.entries(Kl))console.log(q(`  ${e}`)),console.log(z("  "+n.join("  "))),console.log();console.log(z(`  Usage: typemorph <format> [file.json]  or  cat data.json | typemorph <format>
`))}var Hl=`
${q("typemorph")} \u2014 schema engineering CLI

${q("USAGE")}
  typemorph <format> [file]           Convert schema to target format
  typemorph <format> <f1> <f2> ...    Merge multiple files as samples of one schema
  typemorph reverse  [file.ts]        Generate JSON sample from TypeScript interfaces
  typemorph quality  [file]           Grade schema quality (A\u2013F)
  typemorph diff     <old> <new>      Detect breaking changes
  typemorph validate <schema> <out>   Validate LLM/API JSON output against a Zod schema
  typemorph validate --infer <out>    Infer a Zod schema from known-good outputs
  typemorph list                      Show all formats

${q("OPTIONS")}
  --root, -r <name>     Root class name for convert / infer (default: Root)
  --samples             Treat a single array input as samples of one schema (convert)
  --schema <name>       Target a specific named schema (OpenAPI/JSON Schema)
  --min-grade <grade>   Fail (exit 1) if quality grade is below threshold (quality)
  --breaking-only       Only show breaking changes (diff)
  --infer               Infer a schema from good outputs instead of validating (validate)
  --strict              Treat warnings (extra fields, drift) as failures (validate)
  --out <file>          Write inferred schema to a file (validate --infer)
  --format <fmt>        Report format: pretty | json | github (validate)
  --json                Output results as JSON (quality, diff)
  --version, -v         Show version
  --help,    -h         Show this help

${q("EXAMPLES")}
  cat schema.json | typemorph typescript
  typemorph zod       schema.json --root User
  typemorph zod       r1.json r2.json r3.json     # merge samples \u2192 one schema
  typemorph zod       responses.json --samples    # array = samples, not items
  typemorph go        schema.json > models.go
  typemorph quality   schema.json
  typemorph quality   openapi.yaml              # grades all schemas
  typemorph quality   openapi.yaml --min-grade B
  typemorph quality   openapi.yaml --schema User
  typemorph quality   openapi.yaml --json
  typemorph diff      v1.json v2.json
  typemorph diff      v1.yaml v2.yaml           # diffs all matching schemas
  typemorph diff      v1.yaml v2.yaml --schema User
  typemorph diff      v1.json v2.json --breaking-only
  typemorph diff      v1.json v2.json --json
  typemorph validate  schema.ts responses.jsonl
  typemorph validate  schema.ts outputs.json --strict --format github
  typemorph validate  --infer good-outputs.jsonl --out schema.ts
  typemorph reverse   models.ts
  cat types.ts | typemorph reverse
  typemorph list
`,Ce=["A","B","C","D","F"];function hs(e,n){return e==="A"?ae(n):e==="B"?Wl(n):e==="C"?ge(n):R(n)}function Zl(e,n){return Ce.indexOf(e)>Ce.indexOf(n)}function Ql(e,n){let t=yn(e);if(n.schema){let i=t.find(s=>s.name.toLowerCase()===n.schema.toLowerCase());i||(console.error(R(`Schema "${n.schema}" not found. Available: ${t.map(s=>s.name).join(", ")}`)),process.exit(1)),t=[i]}let o=t.map(({name:i,schema:s})=>({name:i,...ls(s)})),r=o.reduce((i,s)=>Ce.indexOf(s.grade)>Ce.indexOf(i.grade)||s.grade===i.grade&&s.score<i.score?s:i);if(n.json)process.stdout.write(JSON.stringify({schemas:o.map(({name:i,grade:s,score:a,issues:l,stats:c})=>({name:i,grade:s,score:a,issues:l,stats:c})),worst:{name:r.name,grade:r.grade,score:r.score}},null,2)+`
`);else{let i=o.length>1;if(i){console.log(`
  ${q("Schema Quality")}  ${z(`(${o.length} schemas)`)}
`);let a=Math.max(...o.map(l=>l.name.length));for(let l of o){let c=hs(l.grade,`${l.grade}  ${l.score}/100`),u=l.name.padEnd(a),f=l.issues[0]?z(`  \u2014 ${l.issues[0].message}`):"";console.log(`  ${q(u)}  ${c}${f}`)}console.log(),o.length>1&&console.log(z(`  Worst: ${r.name}  ${r.grade}  ${r.score}/100`))}else{let a=o[0],l=hs(a.grade,`${a.grade}  ${a.score}/100`);console.log(`
  ${q("Schema Quality Score")}  ${l}
`),console.log(z(`  Fields: ${a.stats.totalFields}  |  any: ${a.stats.anyFields}  |  optional: ${a.stats.optionalFields}  |  naming: ${a.stats.namingStyle}  |  depth: ${a.stats.maxDepth}`))}let s=i?null:o[0];if(s)if(s.issues.length===0)console.log(ae(`
  \u2713 No issues found`));else{console.log();for(let a of s.issues){let l=a.severity==="error"?R("\u2716"):a.severity==="warning"?ge("\u26A0"):z("\u2139"),c=a.path?z(` [${a.path}]`):"";console.log(`  ${l}  ${a.message}${c}`)}}console.log()}n.minGrade&&Zl(r.grade,n.minGrade)&&(n.json||console.error(R(`  \u2716 ${r.name}: Grade ${r.grade} is below required minimum ${n.minGrade}`)),process.exit(1))}function bs(e){return e.severity==="error"?R(`\u2716  ${e.description}`):e.severity==="warning"?ge(`\u26A0  ${e.description}`):z(`\u2139  ${e.description}`)}function Xl(e,n,t){if(t.schema){let o=t.schema.toLowerCase(),r=e.find(s=>s.name.toLowerCase()===o),i=n.find(s=>s.name.toLowerCase()===o);return r||(console.error(R(`Schema "${t.schema}" not found in old file`)),process.exit(1)),i||(console.error(R(`Schema "${t.schema}" not found in new file`)),process.exit(1)),[st(t.schema,r.schema,i.schema,t.breakingOnly)]}if(e.length>1||n.length>1){let o=new Map(e.map(s=>[s.name,s.schema])),r=new Map(n.map(s=>[s.name,s.schema]));return[...new Set([...o.keys(),...r.keys()])].map(s=>{let a=o.get(s),l=r.get(s);return a?l?st(s,a,l,t.breakingOnly):{name:s,score:0,breaking:1,warnings:0,info:0,diffs:[{path:s,type:"removed",severity:"error",description:`Schema "${s}" was removed. All consumers will break.`}]}:{name:s,score:0,breaking:1,warnings:0,info:0,diffs:[{path:s,type:"added",severity:"error",description:`Schema "${s}" was added (new schema, existing consumers unaffected \u2014 but flag for review)`}]}})}return[st(e[0].name,e[0].schema,n[0].schema,t.breakingOnly)]}function st(e,n,t,o){let r=us(n,t),i=r.filter(u=>u.severity==="error").length,s=r.filter(u=>u.severity==="warning").length,a=r.filter(u=>u.severity==="info").length,l=Math.max(0,100-i*15-s*5),c=o?r.filter(u=>u.severity==="error"):r;return{name:e,score:l,breaking:i,warnings:s,info:a,diffs:c}}function ec(e,n,t){let o=yn(e),r=yn(n),i=Xl(o,r,t),s=i.reduce((u,f)=>u+f.breaking,0),a=i.reduce((u,f)=>u+f.warnings,0),l=i.reduce((u,f)=>u+f.info,0),c=i.length===1?i[0].score:Math.max(0,100-s*15-a*5);if(t.json)process.stdout.write(JSON.stringify({score:c,breaking:s,warnings:a,info:l,schemas:i},null,2)+`
`);else{let u=c>=90?ae(`${c}/100`):c>=60?ge(`${c}/100`):R(`${c}/100`),f=i.length>1,m=f?`${q("Breaking Change Detector")}  ${z(`(${i.length} schemas)`)}  Compatibility ${u}`:`${q("Breaking Change Detector")}  Compatibility ${u}  ${z("(\u221215/breaking \xB7 \u22125/warning)")}`;console.log(`
  ${m}
`);for(let p of i)if(f){let d=p.breaking>0?R(`\u2716 ${p.breaking} breaking`):p.warnings>0?ge(`\u26A0 ${p.warnings} warnings`):ae("\u2713 clean");if(console.log(`  ${q(p.name.padEnd(20))}  ${d}`),p.diffs.length>0){for(let y of p.diffs){let g=y.path?gs(`    ${y.path}`):"";g&&console.log(g),console.log(`      ${bs(y)}`)}console.log()}}else if(p.diffs.length===0)console.log(ae("  \u2713 No "+(t.breakingOnly?"breaking ":"")+"changes detected"));else for(let d of p.diffs){let y=d.path?gs(`  ${d.path}`):"";y&&console.log(y),console.log(`    ${bs(d)}`)}console.log(z(`
  ${s} breaking  \xB7  ${a} warnings  \xB7  ${l} info
`))}s>0&&process.exit(1)}function nc(e){let n=oe(e);if(/\.(ts|js|mts|cts)$/i.test(e)||/\bz\s*\./.test(n)){let o=Yn(n);return o||(console.error(R(`typemorph validate: could not parse a Zod schema from "${e}"`)),process.exit(1)),o}return Jl(n)}function $s(e){let n=oe(e);if(/\.jsonl$/i.test(e))return n.split(`
`).map(o=>o.trim()).filter(Boolean).map((o,r)=>{try{return JSON.parse(o)}catch{console.error(R(`typemorph validate: ${e} line ${r+1} is not valid JSON`)),process.exit(1)}});let{obj:t}=dn(n);return Array.isArray(t)?t:[t]}function tc(e,n,t){let o=ys(e,n,{strict:t.strict});if(t.format==="json")process.stdout.write(JSON.stringify(o,null,2)+`
`);else if(t.format==="github"){let r=[];if(r.push("## TypeMorph \xB7 LLM output validation"),r.push(""),r.push(`**${o.passed} / ${o.total} passed**${o.failed?` \xB7 ${o.failed} failed`:""}`),o.issues.length>0){r.push(""),r.push("| output | field | problem |"),r.push("|---|---|---|");for(let i of o.issues){let s=i.severity==="error"?"\u{1F534}":"\u{1F7E1}";r.push(`| #${i.recordIndex} | \`${i.path||"root"}\` | ${s} ${i.message.replace(/\|/g,"\\|")} |`)}}o.summary.length>0&&(r.push(""),r.push(o.summary.map(i=>`${i.label} \xD7${i.count}`).join(" \xB7 "))),process.stdout.write(r.join(`
`)+`
`)}else{console.log(`
  ${q("TypeMorph validate")}  ${z(`${o.total} output${o.total===1?"":"s"}`)}
`);let r=o.passed>0?ae(`\u2713 ${o.passed} passed`):z("\u2713 0 passed"),i=o.failed>0?R(`\u2717 ${o.failed} failed`):z("\u2717 0 failed");console.log(`  ${r}   ${i}
`);let s=new Map;for(let a of o.issues)s.has(a.recordIndex)||s.set(a.recordIndex,[]),s.get(a.recordIndex).push(a);for(let[a,l]of[...s.entries()].sort((c,u)=>c[0]-u[0])){let c=l.some(u=>u.severity==="error");console.log(`  ${c?R("\u2717"):ge("\u26A0")} output #${a}`);for(let u of l){let f=u.severity==="error"?R(u.message):ge(u.message);console.log(`      ${f}`),u.fix&&console.log(`        ${z("\u2192 "+u.fix)}`)}}o.summary.length>0&&console.log(z(`
  ${o.summary.map(a=>`${a.label} \xD7${a.count}`).join("  \xB7  ")}`)),o.failed>0?console.log(z(`  ${o.failed} of ${o.total} outputs would fail a strict parser.
`)):console.log(ae(`  \u2713 all outputs conform
`))}o.ok||process.exit(1)}function Ts(e,n,t,o){try{let r=We(n,e,"",{rootName:t,samplesMode:o});(!r||r.startsWith("// Unsupported"))&&(console.error(R(`typemorph: unsupported format "${e}". Run \`typemorph list\` to see all formats.`)),process.exit(1)),process.stdout.write(r)}catch(r){console.error(R(`typemorph: ${r?.message??String(r)}`)),process.exit(1)}}async function rc(){let e=process.argv.slice(2);if(e.length===0||e.includes("--help")||e.includes("-h")){console.log(Hl);return}if(e.includes("--version")||e.includes("-v")){console.log("0.4.1");return}let n=e[0];if(n==="list"){Yl();return}let t=e.findIndex(p=>p==="--root"||p==="-r"),o=t!==-1?e[t+1]:"Root",r=e.findIndex(p=>p==="--schema"),i=r!==-1?e[r+1]:void 0,s=e.includes("--json");if(n==="reverse"){let p=e.slice(1).find(b=>!b.startsWith("-")),d=p?oe(p):await it(),{json:y,error:g}=ps(d);(g||!y)&&(console.error(R(`typemorph reverse: ${g??"No interfaces found"}`)),process.exit(1)),process.stdout.write(y+`
`);return}if(n==="quality"){let p=e.findIndex(h=>h==="--min-grade"),d=p!==-1?e[p+1]?.toUpperCase():void 0;d&&!Ce.includes(d)&&(console.error(R(`Invalid --min-grade "${d}". Must be one of: ${Ce.join(", ")}`)),process.exit(1));let y=new Set([o,d,i].filter(Boolean)),g=e.slice(1).find(h=>!h.startsWith("-")&&!y.has(h)),b=g?oe(g):await it();Ql(b,{schema:i,minGrade:d,json:s});return}if(n==="diff"){let p=new Set([o,i].filter(Boolean)),d=e.slice(1).filter(g=>!g.startsWith("-")&&!p.has(g));d.length<2&&(console.error(R("Usage: typemorph diff <old.json> <new.json> [--schema <name>]")),process.exit(1));let y=e.includes("--breaking-only");ec(oe(d[0]),oe(d[1]),{schema:i,breakingOnly:y,json:s});return}if(n==="validate"){let p=e.includes("--infer"),d=e.includes("--strict"),y=e.findIndex(C=>C==="--format"),g=y!==-1?e[y+1]??"pretty":"pretty";["pretty","json","github"].includes(g)||(console.error(R(`Invalid --format "${g}". Must be one of: pretty, json, github`)),process.exit(1));let b=e.findIndex(C=>C==="--out"),h=b!==-1?e[b+1]:void 0,$=new Set([o,i,g,h].filter(Boolean)),T=e.slice(1).filter(C=>!C.startsWith("-")&&!$.has(C));if(p){T.length<1&&(console.error(R("Usage: typemorph validate --infer <good-outputs.jsonl> [--out schema.ts]")),process.exit(1));let C=$s(T[0]),G=We(C,"zod","",{rootName:o,samplesMode:!0});h?(Re.writeFileSync(ot.resolve(h),G),console.error(ae(`\u2713 wrote inferred schema to ${h}`))):process.stdout.write(G);return}T.length<2&&(console.error(R("Usage: typemorph validate <schema.ts> <outputs.jsonl> [--strict] [--format github]")),process.exit(1));let S=nc(T[0]),v=$s(T[1]);tc(S,v,{strict:d,format:g});return}let a=n,l=new Set([o,i].filter(Boolean)),c=e.slice(1).filter(p=>!p.startsWith("-")&&!l.has(p));if(c.length>=2){let p=c.map(d=>dn(oe(d)).obj);Ts(a,p,o,!0);return}let u=c[0]?oe(c[0]):await it(),{obj:f}=dn(u),m=e.includes("--samples")&&Array.isArray(f);Ts(a,f,o,m)}rc().catch(e=>{console.error(R(`typemorph: ${e?.message??String(e)}`)),process.exit(1)});
