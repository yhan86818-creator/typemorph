#!/usr/bin/env node
"use strict";var js=Object.create;var pt=Object.defineProperty;var Os=Object.getOwnPropertyDescriptor;var ks=Object.getOwnPropertyNames;var Ns=Object.getPrototypeOf,ws=Object.prototype.hasOwnProperty;var vs=(e,n,t,o)=>{if(n&&typeof n=="object"||typeof n=="function")for(let r of ks(n))!ws.call(e,r)&&r!==t&&pt(e,r,{get:()=>n[r],enumerable:!(o=Os(n,r))||o.enumerable});return e};var jn=(e,n,t)=>(t=e!=null?js(Ns(e)):{},vs(n||!e||!e.__esModule?pt(t,"default",{value:e,enumerable:!0}):t,e));var K=jn(require("fs")),Le=jn(require("path")),As=jn(require("readline"));var Xe=e=>e.split(/[^A-Za-z0-9$]+/).filter(Boolean).map(n=>n.charAt(0).toUpperCase()+n.slice(1)).join(""),Qe=(e,n)=>e?e.kind==="classRef"?e.classRefName===n:e.kind==="array"?Qe(e.itemType,n):e.kind==="record"?Qe(e.recordValueType,n):e.kind==="tuple"?(e.tupleTypes??[]).some(t=>Qe(t,n)):!1:!1,me=(e,n)=>{if(e.type!=="array"||!e.itemType)return null;let t=e.itemType._sharedTypeName;return t||(n.endsWith("ies")?t=n.slice(0,-3)+"y":n.endsWith("s")?t=n.slice(0,-1):n.endsWith("List")?t=n.slice(0,-4):t=n+"Item"),t.includes("_")?t.split("_").map(o=>Xe(o)).join(""):Xe(t)},Y=(e,n,t)=>{if(e.type==="object"&&e.recordValueType)return{kind:"record",recordValueType:Y(e.recordValueType,n+"_"+t,"Value")};if(e.type==="array"&&e.tupleTypes)return{kind:"tuple",tupleTypes:e.tupleTypes.map(c=>Y(c,n+"_"+t,"Item"))};let o=e.refinements?.length?{refinements:e.refinements}:{};if(e.type==="union"&&e.unionTypes)return{kind:"union",unionTypes:e.unionTypes};let r=e.literalValue!==void 0?{literalValue:e.literalValue}:{},i=e.coerced?{coerced:!0}:{},s=e.rawZodType?{rawZodType:e.rawZodType}:{};if(e.type==="string")return e.enumValues?{kind:"enum",enumValues:e.enumValues,...r,...o}:e.format==="date"?{kind:"date",format:"date",...o}:e.format==="datetime"?{kind:"datetime",format:"datetime",...o}:{kind:"string",format:e.format,...i,...s,...o};if(e.type==="object")return{kind:"classRef",classRefName:e._sharedTypeName??n+"_"+t};if(e.type==="array"&&e.itemType){let c=n+"_"+t;if(e.itemType.type==="object"){let f=e.itemType._sharedTypeName;return f||(c.endsWith("ies")?f=c.slice(0,-3)+"y":c.endsWith("s")?f=c.slice(0,-1):c.endsWith("List")?f=c.slice(0,-4):f=c+"_Item"),{kind:"array",itemType:{kind:"classRef",classRefName:f},...o}}return{kind:"array",itemType:Y(e.itemType,c,"Item"),...o}}return{kind:{number:"number",boolean:"boolean",any:"any",union:"union"}[e.type]??"any",format:e.format,...r,...i,...o}},Cs=new Set(["data","result","results","payload","response","body","content","attributes","wrapper","value","item","object","record"]),Rs=e=>Cs.has(e.toLowerCase()),_s=(e,n={})=>{let t=e.map(i=>({...i,fields:[...i.fields],annotations:i.annotations?[...i.annotations]:void 0})),o=n.flattenWrappers!==!1;if(n.extractTimestamps!==!1){let i=["createdAt","updatedAt","deletedAt","created_at","updated_at","deleted_at"],s=!1,a=[];for(let l of t){let c=l.fields.filter(f=>i.includes(f.name));if(c.length>=2&&a.length===0){a=c.map(f=>({...f,docComment:"Audit timestamp metadata"}));break}}if(a.length>=2)for(let l of t){if(l.name==="TimestampModel")continue;let c=l.fields.filter(u=>i.includes(u.name)),f=c.length===a.length&&c.every(u=>a.some(p=>p.name===u.name));c.length>=2&&f&&(s||(t.push({name:"TimestampModel",fields:a,isShared:!0,docComment:"Base audit trail timestamp fields"}),s=!0),l.fields=l.fields.filter(u=>!i.includes(u.name)),l.annotations||(l.annotations=[]),l.annotations.push("extends TimestampModel"))}}if(o){let i=!0,s=new Set;for(;i;){i=!1;for(let a=0;a<t.length;a++){let l=t[a];if(l.name!=="Root"&&l.fields.length===1){let c=l.fields[0];if(c.fieldType.kind==="classRef"&&Rs(c.name)){let f=c.fieldType.classRefName;if(!f||f===l.name||s.has(f))continue;let u=t.find(p=>p.name===f);if(u&&(u.fields.length>1||(u.annotations?.length??0)>0)){if(l.fields=u.fields.map(m=>({...m,docComment:`[Flattened from ${f}] ${m.docComment??""}`})),u.annotations&&u.annotations.length>0){l.annotations||(l.annotations=[]);for(let m of u.annotations)l.annotations.includes(m)||l.annotations.push(m)}t.some(m=>m!==l&&m.name!==f&&(m.fields.some(d=>Qe(d.fieldType,f))||(m.annotations?.includes(`extends ${f}`)??!1)))||(t=t.filter(m=>m.name!==f)),s.add(f),i=!0;break}}}}}}return t},D=(e,n="Root",t={})=>{let o=[],r=new Set,i=new Set,s=(a,l)=>{if(r.has(a))return;if(r.add(a),a.type==="array"&&a.itemType){let u=a.itemType._sharedTypeName;u||(l.endsWith("ies")?u=l.slice(0,-3)+"y":l.endsWith("s")?u=l.slice(0,-1):l.endsWith("List")?u=l.slice(0,-4):u=l+"Item"),s(a.itemType,u);return}if(a.type==="object"&&a.recordValueType){let u=a.recordValueType;u.type==="object"?s(u,l+"_Value"):u.type==="array"&&u.itemType?.type==="object"&&s(u.itemType,l+"_Value_Item");return}if(a.type!=="object"||!a.fields||a._sharedTypeName&&i.has(a._sharedTypeName))return;let c=a._sharedTypeName??l;i.add(c);let f=[];for(let[u,p]of Object.entries(a.fields)){let m=Y(p,c,u);f.push({name:u,fieldType:m,isOptional:!!p.optional,isNullable:!!p.nullable,annotations:[],docComment:""})}o.push({name:c,fields:f,annotations:[],isShared:!!a._sharedTypeName});for(let[u,p]of Object.entries(a.fields)){let m=p._sharedTypeName??c+"_"+u;if(p.type==="object"&&s(p,m),p.type==="array"&&p.itemType?.type==="object"){let d=p.itemType._sharedTypeName;d||(u.endsWith("ies")?d=m.slice(0,-3)+"y":u.endsWith("s")?d=m.slice(0,-1):u.endsWith("List")?d=m.slice(0,-4):d=m+"_Item"),s(p.itemType,d)}}};return s(e,n),Es(_s(o,t))},Es=e=>{let n=new Map,t=new Map,o=new Map;for(let u of e){let p=u.name,m=p.includes("_")?p.split("_").map(d=>Xe(d)).join(""):Xe(p);if(p==="TimestampModel"&&(m="TimestampModel"),n.has(m)){let d=n.get(m)+1;n.set(m,d);let y=`${m}_v${d}`;t.set(u,y),o.set(p,y)}else n.set(m,1),t.set(u,m),o.set(p,m)}for(let[u,p]of t.entries())u.name=p;let r=u=>{if(u){if(u.kind==="classRef"&&u.classRefName&&o.has(u.classRefName)&&(u.classRefName=o.get(u.classRefName)),u.kind==="array"&&u.itemType&&r(u.itemType),u.kind==="union"&&u.unionTypes)for(let p of u.unionTypes)r(p);if(u.kind==="record"&&u.recordValueType&&r(u.recordValueType),u.kind==="tuple"&&u.tupleTypes)for(let p of u.tupleTypes)r(p)}};for(let u of e)for(let p of u.fields)r(p.fieldType);let i=[],s=new Set,a=new Set,l=new Map(e.map(u=>[u.name,u])),c=u=>{if(s.has(u.name)||a.has(u.name))return;a.add(u.name);let p=u.annotations?.find(m=>m.startsWith("extends "));if(p){let m=p.slice(8),d=l.get(m);d&&c(d)}a.delete(u.name),s.add(u.name),i.push(u)},f=e.find(u=>u.name==="TimestampModel");f&&c(f);for(let u of e)c(u);return e.length=0,e.push(...i),e};var v=e=>e.split(/[^A-Za-z0-9$]+/).filter(Boolean).map(n=>n.charAt(0).toUpperCase()+n.slice(1)).join(""),Is=e=>{let t=e.split(/[^A-Za-z0-9]+/).filter(Boolean).map(o=>o.charAt(0).toUpperCase()+o.slice(1)).join("");return t||(t="Field"),/^[0-9]/.test(t)&&(t="F"+t),t},Ms=new Set(["False","None","True","and","as","assert","async","await","break","class","continue","def","del","elif","else","except","finally","for","from","global","if","import","in","is","lambda","nonlocal","not","or","pass","raise","return","try","while","with","yield","match","case"]),Ls=e=>{let n=e.replace(/[^A-Za-z0-9_]/g,"_");return/^[A-Za-z_]/.test(n)||(n="f_"+n),Ms.has(n)&&(n=`${n}_`),n},St=e=>e.split(/[^A-Za-z0-9]+/).filter(Boolean),oe=(e,n)=>{let t=St(e);return t.length===0?n==="snake"?"field":"Field":n==="snake"?t.join("_").toLowerCase():t.map((o,r)=>n==="camel"&&r===0?o.charAt(0).toLowerCase()+o.slice(1):o.charAt(0).toUpperCase()+o.slice(1)).join("")},U=e=>{let n=e.annotations?.find(t=>t.startsWith("extends "));return n?n.slice(8):null},W=e=>{let n=v(e);return n.charAt(0).toLowerCase()+n.slice(1)},zs=(e,n)=>{let t=e.itemType?._sharedTypeName;return t?v(t):n.endsWith("ies")?v(n.slice(0,-3)+"y"):n.endsWith("s")?v(n.slice(0,-1)):n.endsWith("List")?v(n.slice(0,-4)):v(n+"Item")},kn=e=>e?e.type==="object"?e.recordValueType?kn(e.recordValueType):!!e.fields&&Object.keys(e.fields).length>0:e.type==="array"?kn(e.itemType):!1:!1,Fs=e=>Object.values(e).some(n=>n.type==="object"&&n.fields?Object.values(n.fields).some(kn):!1),Rn=e=>{let n=new Set,t=new Map;for(let o of e){let r=oe(o,"pascal"),i=r,s=2;for(;n.has(i);)i=`${r}${s++}`;n.add(i),t.set(o,i)}return t},_n=(e,n)=>{let t=new Map,o=v(n),r=(i,s)=>{let a=i.itemType;if(a?.discriminatorField&&a?.discriminatedVariants){if(Fs(a.discriminatedVariants))return;t.set(zs(i,s),{discriminatorField:a.discriminatorField,variants:a.discriminatedVariants})}};if(e.type==="array"&&r(e,o),e.type==="object"&&e.fields){for(let[i,s]of Object.entries(e.fields))if(s.type==="array"){let a=s._sharedTypeName?v(s._sharedTypeName):v(o+"_"+i);r(s,a)}}return t},de=e=>{switch(e.kind){case"union":return e.unionTypes?e.unionTypes.join(" | "):"any";case"enum":return e.enumValues?e.enumValues.map(n=>`"${n}"`).join(" | "):"string";case"date":case"datetime":return"Date";case"classRef":return e.classRefName??"any";case"array":if(e.itemType){let n=de(e.itemType);return e.itemType.kind==="union"||e.itemType.kind==="enum"?`(${n})[]`:`${n}[]`}return"any[]";case"record":return`Record<string, ${e.recordValueType?de(e.recordValueType):"any"}>`;case"tuple":return`[${(e.tupleTypes??[]).map(n=>de(n)).join(", ")}]`;default:return e.kind}},Tt={generate:(e,n="Root",t={})=>{let o=_n(e,n),r=D(e,n,t),i="";if(e.type==="array"&&e.itemType){let s=me(e,n);if(s?r.some(l=>l.name===s):!1)i+=`export type ${v(n)} = ${s}[];

`;else{let l=Y(e.itemType,n,"Item");i+=`export type ${v(n)} = ${de(l)}[];

`}}else if(e.type==="object"&&e.recordValueType){let s=v(n),a=e.recordValueType,l;if(a.type==="object"&&a.fields){let c=a._sharedTypeName??`${s}_Value`;l=c.includes("_")?c.split("_").map(f=>v(f)).join(""):v(c)}else l=de(Y(a,s,"Value"));i+=`export type ${s} = Record<string, ${l}>;

`}for(let s of r){let a=o.get(s.name);if(a){let p=Rn(Object.keys(a.variants));for(let[d,y]of Object.entries(a.variants)){let g=`${s.name}${p.get(d)}`;i+=`export interface ${g} {
`;for(let[b,h]of Object.entries(y.fields??{}))if(b===a.discriminatorField)i+=`  ${re(b)}: ${JSON.stringify(d)};
`;else{let $=Y(h,g,b),S=de($),T=h.optional?"?":"",C=h.nullable?" | null":"";i+=`  ${re(b)}${T}: ${S}${C};
`}i+=`}

`}let m=Object.keys(a.variants).map(d=>`${s.name}${p.get(d)}`);i+=`export type ${s.name} = ${m.join(" | ")};

`;continue}let l=U(s),c=l?` extends ${l}`:"",f=t.exportDefault&&s.name==="Root"?`export default interface ${s.name}${c}`:`export interface ${s.name}${c}`;i+=`${f} {
`;let u=t.optionalFields;for(let p of s.fields){let m=u||p.isOptional?"?":"",d=`${s.name}.${p.name}`,y=t.customFieldNames?.[d]??p.name,g=de(p.fieldType);p.isNullable&&(g=g.includes(" | ")?`(${g}) | null`:`${g} | null`),i+=`  ${re(y)}${m}: ${g};
`}i+=`}

`}return i}},En=e=>{let n=new Map(e.map(l=>[l.name,l])),t=new Set,o=new Set,r=[],i=new Set,s=l=>l.kind==="classRef"&&l.classRefName?[l.classRefName]:l.kind==="array"&&l.itemType?s(l.itemType):l.kind==="record"&&l.recordValueType?s(l.recordValueType):l.kind==="tuple"&&l.tupleTypes?l.tupleTypes.flatMap(s):l.kind==="union"&&l.unionTypes?[]:[],a=l=>{if(t.has(l.name)||o.has(l.name))return;o.add(l.name);let c=U(l);if(c){let f=n.get(c);f&&(o.has(c)||a(f))}for(let f of l.fields)for(let u of s(f.fieldType))if(o.has(u))i.add(u);else{let p=n.get(u);p&&a(p)}o.delete(l.name),t.add(l.name),r.push(l)};for(let l of e)a(l);return{sorted:r,cyclicClassRefs:i}},ye=(e,n,t={})=>{let o=Ds(e,n,t);return e.refinements?.length?o+e.refinements.join(""):o},Ds=(e,n,t={})=>{if(e.rawZodType)return e.rawZodType;if(e.literalValue!==void 0){let o=e.literalValue;return`z.literal(${typeof o=="string"?JSON.stringify(o):o})`}switch(e.kind){case"union":{if(!e.unionTypes||e.unionTypes.length===0)return"z.any()";let o=e.unionTypes.map(r=>ye({kind:r},n,t));return o.length===1?o[0]:`z.union([${o.join(", ")}])`}case"enum":return!e.enumValues||e.enumValues.length===0||e.enumValues.length===1?"z.string()":`z.enum([${e.enumValues.map(o=>`"${o}"`).join(", ")}])`;case"date":return t.inference==="minimal"?"z.string()":t.zodVersion==="v3"?"z.coerce.date()":"z.iso.date()";case"datetime":return t.inference==="minimal"?"z.string()":t.zodVersion==="v3"?"z.string().datetime()":"z.iso.datetime()";case"classRef":{if(!e.classRefName)return"z.any()";let o=`${W(e.classRefName)}Schema`;return n.has(e.classRefName)?`z.lazy(() => ${o})`:o}case"array":return e.itemType?`z.array(${ye(e.itemType,n,t)})`:"z.array(z.any())";case"record":{let o=e.recordValueType?ye(e.recordValueType,n,t):"z.any()";return t.zodVersion==="v3"?`z.record(${o})`:`z.record(z.string(), ${o})`}case"tuple":return!e.tupleTypes||e.tupleTypes.length===0?"z.array(z.any())":`z.tuple([${e.tupleTypes.map(r=>ye(r,n,t)).join(", ")}])`;case"string":return e.coerced?"z.coerce.string()":t.inference==="minimal"?"z.string()":e.format==="email"?t.zodVersion==="v3"?"z.string().email()":"z.email()":e.format==="url"?t.zodVersion==="v3"?"z.string().url()":"z.url()":e.format==="uuid"?t.zodVersion==="v3"?"z.string().uuid()":"z.uuid()":e.format==="color"?"z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)":"z.string()";case"number":return e.coerced||t.zodMode==="loose"?"z.coerce.number()":"z.number()";case"boolean":return e.coerced?"z.coerce.boolean()":"z.boolean()";default:return"z.any()"}},Fe=e=>{switch(e.kind){case"string":case"date":case"datetime":return"string";case"number":return"number";case"boolean":return"boolean";case"classRef":return e.classRefName??"unknown";case"array":return e.itemType?`${Fe(e.itemType)}[]`:"unknown[]";case"record":return`Record<string, ${e.recordValueType?Fe(e.recordValueType):"unknown"}>`;case"tuple":return`[${(e.tupleTypes??[]).map(n=>Fe(n)).join(", ")}]`;case"union":return e.unionTypes?.map(n=>Fe({kind:n})).join(" | ")??"unknown";case"enum":return e.enumValues?.map(n=>`"${n}"`).join(" | ")??"string";default:return"unknown"}},re=e=>/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(e)?e:JSON.stringify(e),Gs=e=>e.split(/[_\-\s]+|(?<=[a-z0-9])(?=[A-Z])/).map(n=>n.toLowerCase()).filter(Boolean),xt={generate:(e,n="root",t={})=>{let o=t.zodMode??"strict",r=o==="loose",i=o==="enterprise",s=t.zodVersion==="v3",a=s?"z.string().email()":"z.email()",l=s?"z.string().url()":"z.url()",c=s?"z.string().uuid()":"z.uuid()",f=t.inference??"smart",u=f==="smart",p=f==="minimal",m={...t,zodMode:o},d=_n(e,v(n)),y=f==="minimal"?{...t,flattenWrappers:!1,extractTimestamps:!1}:t,g=D(e,v(n),y),b="",{sorted:h,cyclicClassRefs:$}=En(g);for(let T of h){let C=d.get(T.name);if(C){let E=Rn(Object.keys(C.variants)),xe=[];for(let[w,An]of Object.entries(C.variants)){let te=E.get(w),x=W(T.name)+te,je=T.name+te;xe.push(`${x}Schema`),b+=`export const ${x}Schema = z.object({
`;for(let[H,Oe]of Object.entries(An.fields??{}))if(H===C.discriminatorField)b+=`  ${re(H)}: z.literal(${JSON.stringify(w)}),
`;else{let se=Y(Oe,je,H),ze=ye(se,$,m);Oe.nullable&&(ze+=".nullable()"),(r||Oe.optional)&&(ze+=".optional()"),b+=`  ${re(H)}: ${ze},
`}b+=`});
`,b+=`export type ${je} = z.infer<typeof ${x}Schema>;

`}let Ae=W(T.name);b+=`export const ${Ae}Schema = z.discriminatedUnion("${C.discriminatorField}", [
`;for(let w of xe)b+=`  ${w},
`;b+=`]);
`,b+=`export type ${T.name} = z.infer<typeof ${Ae}Schema>;

`;continue}let N=W(T.name),M=U(T),L=M?W(M):null,pe=$.has(T.name);if(pe){b+=`export type ${T.name} = {
`;for(let E of T.fields){let xe=Fe(E.fieldType),Ae=E.isOptional||r?"?":"",w=E.isNullable?" | null":"";b+=`  ${re(E.name)}${Ae}: ${xe}${w};
`}b+=`};

`}let Te=pe?`: z.ZodType<${T.name}>`:"";L?b+=`export const ${N}Schema${Te} = ${L}Schema.extend({
`:b+=`export const ${N}Schema${Te} = z.object({
`;for(let E of T.fields){let xe=t.optionalFields||E.isOptional||r?".optional()":"",Ae=E.isNullable?".nullable()":"",w=ye(E.fieldType,$,m),An=`${T.name}.${E.name}`,te=t.customFieldNames?.[An]??E.name,x=te.toLowerCase(),je=Gs(te),H=(...se)=>se.some(ze=>je.includes(ze));!r&&!E.fieldType.refinements?.length&&(E.fieldType.kind==="number"&&(u?/change|delta|diff|growth|variance|deviation|pnl/i.test(x)?E.fieldType.format==="int"&&(w+=".int()"):x.includes("percent")?w+=".min(0)":x.includes("latitude")||x==="lat"||x.endsWith("_lat")?w+=".min(-90).max(90)":x.includes("longitude")||x==="lng"||x==="lon"||x.endsWith("_lng")||x.endsWith("_lon")?w+=".min(-180).max(180)":x.includes("rating")?w+=".min(0).max(5)":x.includes("score")?w+=".min(0).max(100)":H("age")?w+=".int().min(0).max(150)":x.includes("year")?w+=".int().min(1900).max(2100)":x.includes("month")&&!x.includes("monthly")?w+=".int().min(1).max(12)":x==="day"||x.endsWith("_day")||x.startsWith("day_")?w+=".int().min(1).max(31)":x.includes("hour")?w+=".int().min(0).max(23)":x.includes("minute")||x.includes("second")?w+=".int().min(0).max(59)":H("count","quantity","qty")?w+=".int().min(0)":H("price","amount","cost","fee","rank","total","subtotal")?w+=".min(0)":x==="port"||x.endsWith("_port")||x==="portnumber"||x==="port_number"?w+=".int().min(1).max(65535)":E.fieldType.format==="int"&&(w+=".int()"):!p&&E.fieldType.format==="int"&&(w+=".int()")),u&&E.fieldType.kind==="string"&&!E.fieldType.format&&(x.includes("email")?w=a:x.includes("url")||x.includes("link")||x.includes("website")?w=l:x.includes("uuid")||(x.endsWith("_id")||/Id$/.test(te)||/ID$/.test(te))&&E.fieldType.format==="uuid"?w=c:x==="ip"||x.includes("ip_address")||x.includes("ipaddress")||x==="remote_ip"||x==="client_ip"||x==="server_ip"?w=s?"z.string().ip()":"z.union([z.ipv4(), z.ipv6()])":x.includes("phone")||x==="tel"||x==="telephone"||x.endsWith("_tel")||x.startsWith("tel_")?w="z.string().regex(/^\\+?[\\dA-Za-z\\s\\-.()#*]{5,}$/)":x==="zip"||x==="zipcode"||x==="zip_code"||x==="postal_code"||x==="postcode"?w="z.string().regex(/^[A-Z0-9][A-Z0-9\\s\\-]{1,8}[A-Z0-9]$/i)":x==="semver"?w="z.string().regex(/^\\d+\\.\\d+(\\.\\d+)?(-[\\w.]+)?(\\+[\\w.]+)?$/)":x.includes("slug")?w="z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)":x==="countrycode"||x==="country_code"?w="z.string().length(2)":(x.includes("name")||x.includes("label")||x.includes("title"))&&(w="z.string().trim()")),u&&E.fieldType.kind==="any"&&E.isNullable&&(je[je.length-1]==="at"||H("timestamp","datetime")?w=s?"z.string().datetime()":"z.iso.datetime()":H("date")?w=s?"z.coerce.date()":"z.iso.date()":H("time")?w=s?"z.string().datetime()":"z.iso.datetime()":x.includes("email")?w=a:(x.includes("url")||x.includes("link")||x.includes("website"))&&(w=l))),E.fieldType.kind==="number"&&E.fieldType.format==="int"&&E.fieldType.refinements?.length&&!w.includes(".int(")&&(w=w.replace(/^(z\.(?:coerce\.)?number\(\))/,"$1.int()"));let Oe=`${w}${Ae}${xe}`;if(i){let se=te.replace(/_/g," ").replace(/([A-Z])/g," $1").trim().toLowerCase();Oe+=`.describe('${se}')`}b+=`  ${re(te)}: ${Oe},
`}b+=`})${r?".passthrough()":i?".strict()":""};
`,pe?b+=`
`:b+=`export type ${T.name} = z.infer<typeof ${N}Schema>;

`}let S=me(e,v(n));if(S&&g.some(T=>T.name===S)){let T=v(n),C=W(T);b+=`export const ${C}Schema = z.array(${W(S)}Schema);
`,b+=`export type ${T} = z.infer<typeof ${C}Schema>;

`}if(e.type==="object"&&e.recordValueType){let T=v(n),C=W(T),N=Y(e.recordValueType,T,"Value"),M=ye(N,$,m),L=t.zodVersion==="v3"?`z.record(${M})`:`z.record(z.string(), ${M})`;b+=`export const ${C}Schema = ${L};
`,b+=`export type ${T} = z.infer<typeof ${C}Schema>;

`}return b}},At=e=>{switch(e.kind){case"union":return"dynamic";case"enum":return"String";case"date":case"datetime":return"DateTime";case"classRef":return e.classRefName??"dynamic";case"array":return e.itemType?`List<${At(e.itemType)}>`:"List<dynamic>";case"string":return"String";case"number":return e.format==="int"?"int":"double";case"boolean":return"bool";default:return"dynamic"}},On=e=>{if(/^[A-Za-z$][A-Za-z0-9_$]*$/.test(e))return e;let n=oe(e,"camel");return/^[0-9]/.test(n)&&(n="f"+n.charAt(0).toUpperCase()+n.slice(1)),n},jt={generate:(e,n="Root",t={})=>{let o=D(e,v(n),t),i=o.some(s=>s.fields.some(a=>On(a.name)!==a.name))?`import 'package:json_annotation/json_annotation.dart';

`:"";for(let s of o){let a=U(s),l=a?` extends ${a}`:"";i+=`class ${s.name}${l} {
`;for(let c of s.fields){let f=c.isOptional||c.isNullable,u=At(c.fieldType);f&&u!=="dynamic"&&(u+="?");let p=On(c.name);p!==c.name&&(i+=`  @JsonKey(name: '${c.name}')
`),i+=`  final ${u} ${p};
`}i+=`
  ${s.name}({
`;for(let c of s.fields){let f=c.isOptional||c.isNullable;i+=`    ${f?"":"required "}this.${On(c.name)},
`}i+=`  });
`,i+=`}

`}return i}},mt=e=>{switch(e.kind){case"union":return"mixed";case"enum":return"string";case"date":case"datetime":return"DateTime";case"classRef":return e.classRefName??"mixed";case"array":return"array";case"string":return"string";case"number":return e.format==="int"?"int":"float";case"boolean":return"bool";default:return"mixed"}},dt=e=>{if(/^[A-Za-z_][A-Za-z0-9_]*$/.test(e))return e;let n=oe(e,"camel");return/^[0-9]/.test(n)&&(n="_"+n),n},Ot={generate:(e,n="Root",t={})=>{let o=D(e,v(n),t),r="";for(let i of o){let s=U(i),a=s?` extends ${s}`:"";r+=`class ${i.name}${a}
{
`,r+=`    public function __construct(
`;for(let l of i.fields){let c=mt(l.fieldType),f=(l.isOptional||l.isNullable)&&c!=="mixed"?"?":"",u=l.isOptional||l.isNullable?" = null":"",p=dt(l.name),m=p!==l.name?` // json: "${l.name}"`:"";r+=`        private ${f}${c} $${p}${u},${m}
`}r+=`    ) {}
`;for(let l of i.fields){let c=mt(l.fieldType),f=(l.isOptional||l.isNullable)&&c!=="mixed"?"?":"",u=dt(l.name),p=u.charAt(0).toUpperCase()+u.slice(1);r+=`
    public function get${p}(): ${f}${c} { return $this->${u}; }
`,r+=`    public function set${p}(${f}${c} $${u}): void { $this->${u} = $${u}; }
`}r+=`}

`}return r}},kt=e=>{switch(e.kind){case"union":return"Any";case"enum":return"str";case"date":case"datetime":return"datetime";case"classRef":return e.classRefName??"Any";case"array":return e.itemType?`List[${kt(e.itemType)}]`:"List[Any]";case"string":return"str";case"number":return e.format==="int"?"int":"float";case"boolean":return"bool";default:return"Any"}},Nt={generate:(e,n="Root",t={})=>{let o=D(e,v(n),t),r="",{sorted:i}=En(o);for(let s of i){let a=U(s)??"BaseModel";if(r+=`class ${s.name}(${a}):
`,s.fields.length===0){r+=`    pass

`;continue}let l=new Set;for(let c of s.fields){let f=kt(c.fieldType),u=c.isOptional||c.isNullable,p=Ls(c.name);for(;l.has(p);)p+="_";l.add(p);let m=p!==c.name;if(u){let d=m?`Field(default=None, alias=${JSON.stringify(c.name)})`:"None";r+=`    ${p}: Optional[${f}] = ${d}
`}else m?r+=`    ${p}: ${f} = Field(alias=${JSON.stringify(c.name)})
`:r+=`    ${p}: ${f}
`}r+=`
`}return r}},wt=e=>{switch(e.kind){case"union":return"string";case"enum":return"string";case"date":case"datetime":return"string";case"classRef":return e.classRefName??"string";case"array":return e.itemType?`repeated ${wt(e.itemType)}`:"repeated string";case"string":return"string";case"number":return e.format==="int"?"int32":"double";case"boolean":return"bool";default:return"string"}},Ps=e=>{if(/^[A-Za-z_][A-Za-z0-9_]*$/.test(e))return e;let n=oe(e,"snake");return/^[0-9]/.test(n)&&(n="_"+n),n},vt={generate:(e,n="Message",t={})=>{let o=D(e,v(n),t),r="",i=(s,a)=>{let l=wt(s.fieldType),c=Ps(s.name),f=c!==s.name?` [json_name = "${s.name}"]`:"";return`  ${l} ${c} = ${a}${f};
`};for(let s of o){r+=`message ${s.name} {
`;let a=1,l=U(s);if(l){let c=o.find(f=>f.name===l);if(c)for(let f of c.fields)r+=i(f,a++)}for(let c of s.fields)r+=i(c,a++);r+=`}

`}return r}},Ct=e=>{switch(e.kind){case"union":return"String";case"enum":return"String";case"date":case"datetime":return"String";case"classRef":return e.classRefName??"String";case"array":return e.itemType?`[${Ct(e.itemType)}!]`:"[String]";case"string":return"String";case"number":return e.format==="int"?"Int":"Float";case"boolean":return"Boolean";default:return"String"}},Us=e=>{if(/^[_A-Za-z][_0-9A-Za-z]*$/.test(e))return e;let n=St(e).join("_");return n||(n="field"),/^[0-9]/.test(n)&&(n="_"+n),n},yt=e=>{let n=Ct(e.fieldType),t=e.isOptional||e.isNullable?"":"!",o=Us(e.name),r=o!==e.name?` # json: "${e.name}"`:"";return`  ${o}: ${n}${t}${r}
`},Rt={generate:(e,n="Type",t={})=>{let o=D(e,v(n),t),r="";for(let i of o){r+=`type ${i.name} {
`;let s=U(i);if(s){let a=o.find(l=>l.name===s);if(a)for(let l of a.fields)r+=yt(l)}for(let a of i.fields)r+=yt(a);r+=`}

`}return r}},_t=e=>e.replace(/([A-Z]+)([A-Z][a-z])/g,"$1_$2").replace(/([a-z\d])([A-Z])/g,"$1_$2").toLowerCase(),Vs=new Set(["type","struct","enum","match","use","mod","fn","let","pub","impl","trait","for","loop","while","if","else","return","break","continue","as","async","await","const","crate","dyn","extern","false","true","in","move","mut","ref","self","Self","static","super","unsafe","where"]),gt=e=>Vs.has(e)?`r#${e}`:e,qs=e=>{let n=_t(e);if(/^[A-Za-z_][A-Za-z0-9_]*$/.test(n))return gt(n);let t=oe(e,"snake");return/^[0-9]/.test(t)&&(t="_"+t),gt(t)},Et=e=>{switch(e.kind){case"union":return"serde_json::Value";case"enum":return"String";case"date":case"datetime":return"chrono::DateTime<chrono::Utc>";case"classRef":return e.classRefName??"serde_json::Value";case"array":return e.itemType?`Vec<${Et(e.itemType)}>`:"Vec<serde_json::Value>";case"string":return"String";case"number":return e.format==="int"?"i64":"f64";case"boolean":return"bool";default:return"serde_json::Value"}},It={generate:(e,n="Root",t={})=>{let o=D(e,v(n),t),r=`use serde::{Serialize, Deserialize};

`,i=me(e,v(n));i&&o.some(s=>s.name===i)&&(r+=`pub type ${v(n)} = Vec<${i}>;

`);for(let s of o){let a=U(s);if(r+=`#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ${s.name} {
`,a){let l=_t(a);r+=`  #[serde(flatten)]
  pub ${l}: ${a},
`}for(let l of s.fields){let c=Et(l.fieldType);(l.isOptional||l.isNullable)&&(c=`Option<${c}>`);let f=qs(l.name);f!==l.name&&(r+=`  #[serde(rename = "${l.name}")]
`),r+=`  pub ${f}: ${c},
`}r+=`}

`}return r}},Mt=e=>{switch(e.kind){case"union":return"interface{}";case"enum":return"string";case"date":case"datetime":return"time.Time";case"classRef":return e.classRefName??"interface{}";case"array":return e.itemType?`[]${Mt(e.itemType)}`:"[]interface{}";case"string":return"string";case"number":return e.format==="int"?"int64":"float64";case"boolean":return"bool";default:return"interface{}"}},Lt={generate:(e,n="Root",t={})=>{let o=D(e,v(n),t),i=o.some(a=>a.fields.some(l=>l.fieldType.kind==="date"||l.fieldType.kind==="datetime"))?`package main

import "time"

`:`package main

`,s=me(e,v(n));s&&o.some(a=>a.name===s)&&(i+=`type ${v(n)} []${s}

`);for(let a of o){let l=U(a);i+=`type ${a.name} struct {
`,l&&(i+=`  ${l}
`);let c=new Set;for(let f of a.fields){let u=Mt(f.fieldType);(f.isNullable||f.isOptional)&&(u=`*${u}`);let p=Is(f.name);for(;c.has(p);)p+="_";c.add(p);let m=f.isOptional||f.isNullable?",omitempty":"";i+=`  ${p} ${u} \`json:"${f.name}${m}"\`
`}i+=`}

`}return i}},Z=e=>e.split(/[_\s-]+/).map(n=>n.charAt(0).toUpperCase()+n.slice(1)).join(""),De=e=>{let n=e.replace(/_([a-zA-Z0-9])/g,(o,r)=>r.toUpperCase());if(/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n))return n;let t=oe(e,"camel");return/^[0-9]/.test(t)&&(t="_"+t),t},Nn=e=>["price","amount","cost","fee","total","subtotal","balance","payment"].some(n=>e.toLowerCase().includes(n)),wn=(e,n,t="")=>{switch(e.kind){case"union":return"Object";case"enum":return"String";case"date":return"LocalDate";case"datetime":return"OffsetDateTime";case"classRef":return Z(e.classRefName??"Object");case"array":return e.itemType?`List<${wn(e.itemType,!0,"")}>`:"List<Object>";case"string":return e.format==="uuid"?"UUID":"String";case"number":return Nn(t)?"BigDecimal":e.format==="int"?n?"Integer":"int":n?"Double":"double";case"boolean":return n?"Boolean":"boolean";default:return"Object"}},ht=new Set(["int","long","double","float","boolean","char","byte","short"]),zt={generate:(e,n="Root",t={})=>{let o=D(e,v(n),t),r=new Set(["import lombok.AllArgsConstructor;","import lombok.Builder;","import lombok.Data;","import lombok.NoArgsConstructor;","import com.fasterxml.jackson.annotation.JsonIgnoreProperties;"]),i=!1,s=!1,a=!1,l=!1,c=!1;for(let u of o)for(let p of u.fields){let m=p.isOptional||p.isNullable,d=wn(p.fieldType,m,p.name),y=De(p.name),g=p.name.toLowerCase();p.name!==y&&(i=!0),p.fieldType.kind==="array"&&r.add("import java.util.List;"),d==="UUID"&&r.add("import java.util.UUID;"),d==="LocalDate"&&r.add("import java.time.LocalDate;"),d==="OffsetDateTime"&&r.add("import java.time.OffsetDateTime;"),d==="BigDecimal"&&r.add("import java.math.BigDecimal;"),m&&(c=!0),!m&&!ht.has(d)&&(s=!0),(p.fieldType.format==="email"||g.includes("email"))&&(a=!0),p.fieldType.kind==="number"&&(Nn(p.name)||g==="count"||g.endsWith("count")||g.endsWith("_count")||g.includes("quantity")||g==="qty")&&(l=!0)}i&&r.add("import com.fasterxml.jackson.annotation.JsonProperty;"),c&&r.add("import javax.annotation.Nullable;"),s&&r.add("import jakarta.validation.constraints.NotNull;"),a&&r.add("import jakarta.validation.constraints.Email;"),l&&r.add("import jakarta.validation.constraints.Min;");let f=[...r].sort().join(`
`)+`

`;for(let u of o){f+=`@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
`,f+=`@JsonIgnoreProperties(ignoreUnknown = true)
`;let p=U(u),m=p?` extends ${Z(p)}`:"";f+=`public class ${Z(u.name)}${m} {
`;for(let d of u.fields){let y=d.isOptional||d.isNullable,g=wn(d.fieldType,y,d.name),b=De(d.name),h=d.name.toLowerCase();y?f+=`    @Nullable
`:ht.has(g)||(f+=`    @NotNull
`),(d.fieldType.format==="email"||h.includes("email"))&&(f+=`    @Email
`);let $=d.fieldType.kind==="number";if(($&&Nn(d.name)||$&&(h==="count"||h.endsWith("count")||h.endsWith("_count")||h.includes("quantity")||h==="qty"))&&(f+=`    @Min(0)
`),d.name!==b&&(f+=`    @JsonProperty("${d.name}")
`),d.fieldType.kind==="enum"&&d.fieldType.enumValues?.length){let S=d.fieldType.enumValues.map(T=>`"${T}"`).join(", ");f+=`    private String ${b}; // enum: ${S}
`}else f+=`    private ${g} ${b};
`}f+=`}

`}return f.trim()+`
`}},vn=e=>{switch(e.kind){case"union":return"String";case"enum":return"String";case"string":return"String";case"number":return e.format==="int"?"Int":"Float";case"boolean":return"Boolean";case"date":case"datetime":return"DateTime";case"classRef":return e.classRefName??"String";case"array":return e.itemType?`${vn(e.itemType)}[]`:"String[]";default:return"String"}},bt=e=>{if(/^[A-Za-z][A-Za-z0-9_]*$/.test(e))return e;let n=oe(e,"camel");return/^[0-9]/.test(n)&&(n="f"+n.charAt(0).toUpperCase()+n.slice(1)),n},Ft={generate:(e,n="Root",t={})=>{let o=D(e,v(n),t),r="";for(let i of o){r+=`model ${i.name} {
`,i.fields.some(c=>c.name==="id")||(r+=`  id String @id @default(uuid())
`);let a=U(i);if(a){let c=o.find(f=>f.name===a);if(c)for(let f of c.fields){let u=vn(f.fieldType),p=f.name==="id"?" @id":"",m=bt(f.name),d=m!==f.name?` @map("${f.name}")`:"";r+=`  ${m} ${u}${p}${d}
`}}let l=/^(price|amount|cost|total|fee|balance|discount|tax|rate|salary|revenue|budget|charge|payment|subtotal|tip|markup|margin)s?$/i;for(let c of i.fields){let f=vn(c.fieldType);f==="Float"&&l.test(c.name)&&(f="Decimal");let u=c.fieldType.kind==="array",p=c.isOptional&&!u?"?":"",m=`${i.name}.${c.name}`,d=t.customFieldNames?.[m]??c.name,y=d==="id"?" @id":"",g=bt(d),b=g!==d?` @map("${d}")`:"";if(c.fieldType.kind==="classRef"){let h=o.find($=>$.name===c.fieldType.classRefName);h&&(r+=`  /// embedded as Json \u2014 see model ${h.name} for the shape
`),r+=`  ${g} Json${p}${b}
`}else if(u&&c.fieldType.itemType?.kind==="classRef"){let h=o.find($=>$.name===c.fieldType.itemType.classRefName);h&&(r+=`  /// embedded as Json \u2014 see model ${h.name} for the element shape
`),r+=`  ${g} Json${b}
`}else if(r+=`  ${g} ${f}${p}${y}${b}
`,!u&&d.length>2&&d.endsWith("Id")&&c.fieldType.format==="uuid"){let h=d.slice(0,-2),$=h.charAt(0).toUpperCase()+h.slice(1);if(!i.fields.some(T=>T.name===h)){let T=o.find(M=>M.name===$),C=o.filter(M=>M.name!==i.name&&M.name.endsWith($)),N=T??(C.length===1?C[0]:null);N&&(r+=`  ${h} ${N.name}? @relation(fields: [${g}], references: [id])
`)}}}r+=`}

`}return r}},Dt={generate:(e,n="Component")=>{let t=e.fields||{},o=Object.keys(t),r=`import React from 'react';

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
`,r}},Gt={generate:e=>{let n=0,t=(o,r="",i="")=>{if(o.type==="object"&&o.recordValueType){let s={};for(let a=1;a<=2;a++)s[`key${a}`]=t(o.recordValueType,r,i);return s}if(o.type==="array"&&o.tupleTypes)return o.tupleTypes.map(s=>t(s,r,i));if(o.type==="object"&&o.fields){let s={};for(let[a,l]of Object.entries(o.fields))s[a]=t(l,a,r);return s}if(o.type==="array"){let s=o.itemType||{type:"string"},a=n;n=0;let l=Array.from({length:50},(c,f)=>(n=f+1,t(s,r,i)));return n=a,l}if(o.type==="number")return r.toLowerCase().includes("id")||r.toLowerCase().includes("price")||r.toLowerCase().includes("amount")?n>0?n:1:r.toLowerCase().includes("age")?28:42;if(o.type==="boolean")return!0;if(o.type==="string"){if(o.format==="uuid")return`550e8400-e29b-41d4-a716-${String(n||1).padStart(12,"0")}`;if(o.format==="email")return"test@example.com";if(o.format==="url")return"https://example.com/api";if(o.format==="datetime")return new Date().toISOString();let s=r.toLowerCase(),a=i.toLowerCase(),l=a==="items"||a==="products"||a==="entries"||a==="records";if(s.includes("name")){if(l)return`Item ${String.fromCharCode(64+(n||1))}`;let c=["Alice Johnson","Bob Smith","Carol White","David Brown","Emma Davis","Frank Wilson","Grace Lee","Henry Taylor"];return c[((n||1)-1)%c.length]}if(s.includes("email")){let c=["example.com","test.org","demo.io","sample.net"];return`user${n||1}@${c[((n||1)-1)%c.length]}`}if(s.includes("url")||s.includes("link")||s.includes("avatar")||s.includes("image"))return"https://example.com/sample.png";if(s.includes("id"))return`550e8400-e29b-41d4-a716-${String(n||1).padStart(12,"0")}`;if(s.includes("date")||s.includes("time")||s.includes("created")||s.includes("updated"))return new Date().toISOString();if(s.includes("city")){let c=["Tokyo","New York","London","Paris","Sydney","Berlin","Singapore","Toronto"];return c[((n||1)-1)%c.length]}if(s.includes("street")||s.includes("address"))return"123 Main Street";if(s.includes("zip")||s.includes("postal"))return"100-0001";if(s.includes("phone")||s.includes("tel"))return"+81-90-1234-5678";if(s.includes("role")||s.includes("type")||s.includes("status")||s.includes("category")){let c=["admin","user","guest","moderator"];return c[((n||1)-1)%c.length]}return s.includes("desc")||s.includes("memo")||s.includes("text")||s.includes("bio")||s.includes("note")?"This is a sample generated text to simulate a realistic description or content block.":s.includes("title")?"Sample Title":s.includes("price")||s.includes("cost")?(19.99+(n||0)*10).toFixed(2):s.includes("color")?"#3366ff":s.includes("country")?"Japan":s.includes("lang")||s.includes("locale")?"en-US":"sample_"+r}return null};return JSON.stringify(t(e),null,2)}},Pt=e=>{switch(e.kind){case"union":return"object";case"enum":return"string";case"date":return"DateTime";case"datetime":return"DateTimeOffset";case"classRef":return e.classRefName??"object";case"array":return e.itemType?`List<${Pt(e.itemType)}>`:"List<object>";case"string":return"string";case"number":return e.format==="int"?"long":"double";case"boolean":return"bool";default:return"object"}},Bs=e=>{let n=v(e);if(/^[A-Za-z_][A-Za-z0-9_]*$/.test(n))return n;let t=oe(e,"pascal");return/^[0-9]/.test(t)&&(t="_"+t),t},Ut={generate:(e,n="Root",t={})=>{let o=D(e,v(n),t),r="",i=!1,s=!1;for(let l of o){let c=U(l),f=c?` : ${c}`:"";r+=`public class ${l.name}${f}
{
`;for(let u of l.fields){let p=Pt(u.fieldType),m=!u.isOptional&&!u.isNullable,d=m?"":"?";m&&(i=!0,r+=`    [Required]
`);let y=Bs(u.name);/^[A-Za-z_][A-Za-z0-9_]*$/.test(u.name)||(s=!0,r+=`    [JsonPropertyName("${u.name}")]
`),r+=`    public ${p}${d} ${y} { get; set; }
`}r+=`}

`}let a="";return i&&(a+=`using System.ComponentModel.DataAnnotations;
`),s&&(a+=`using System.Text.Json.Serialization;
`),a&&(a+=`
`),a+r}},Vt=e=>{switch(e.kind){case"union":return"AnyCodable";case"enum":return"String";case"date":case"datetime":return"Date";case"classRef":return Z(e.classRefName??"AnyCodable");case"array":return e.itemType?`[${Vt(e.itemType)}]`:"[AnyCodable]";case"string":return e.format==="uuid"?"UUID":"String";case"number":return e.format==="int"?"Int":"Double";case"boolean":return"Bool";default:return"AnyCodable"}},qt={generate:(e,n="Root",t={})=>{let o=D(e,v(n),t),r=`import Foundation

`;for(let i of o){let s=Z(i.name),a=U(i),l=a?`: ${Z(a)}`:": Codable";r+=`struct ${s} ${l} {
`;let c=[];for(let u of i.fields){let p=De(u.name),m=Vt(u.fieldType);(u.isOptional||u.isNullable)&&(m+="?"),r+=`    let ${p}: ${m}
`,u.name!==p?c.push({swift:p,json:u.name}):c.push({swift:p,json:""})}if(c.some(u=>u.json!=="")){r+=`
    enum CodingKeys: String, CodingKey {
`;for(let{swift:u,json:p}of c)p?r+=`        case ${u} = "${p}"
`:r+=`        case ${u}
`;r+=`    }
`}r+=`}

`}return r}},Bt=e=>{switch(e.kind){case"union":return"Any";case"enum":return"String";case"date":return"LocalDate";case"datetime":return"Instant";case"classRef":return Z(e.classRefName??"Any");case"array":return e.itemType?`List<${Bt(e.itemType)}>`:"List<Any>";case"string":return e.format==="uuid","String";case"number":return e.format==="int"?"Int":"Double";case"boolean":return"Boolean";default:return"Any"}},$t=(e,n)=>e.some(t=>t.fields.some(o=>o.fieldType.kind===n||o.fieldType.kind==="array"&&o.fieldType.itemType?.kind===n)),Jt={generate:(e,n="Root",t={})=>{let o=D(e,v(n),t),r=!1;for(let l of o)for(let c of l.fields)if(c.name!==De(c.name)){r=!0;break}let i=$t(o,"datetime"),s=$t(o,"date"),a=`import kotlinx.serialization.Serializable
`;r&&(a+=`import kotlinx.serialization.SerialName
`),i&&(a+=`import kotlinx.datetime.Instant
`),s&&(a+=`import kotlinx.datetime.LocalDate
`),a+=`
`;for(let l of o){let c=Z(l.name),f=U(l),u=f?` : ${Z(f)}`:"";a+=`@Serializable
data class ${c}(
`;let p=l.fields.map(m=>{let d=De(m.name),y=Bt(m.fieldType);(m.isOptional||m.isNullable)&&(y+="?");let g=m.name!==d?`    @SerialName("${m.name}")
`:"",b=m.isOptional||m.isNullable?" = null":"";return`${g}    val ${d}: ${y}${b}`});a+=p.join(`,
`),a+=`
)${u}

`}return a}},Wt=e=>{switch(e.kind){case"string":return e.enumValues&&e.enumValues.length>0?e.enumValues.map(n=>`'${n}'`).join(" | "):"string";case"number":return"number";case"boolean":return"boolean";case"date":case"datetime":return"string";case"classRef":return`${Z(e.classRefName??"Object")}Dto`;case"array":if(e.itemType){let n=Wt(e.itemType);return n.includes("|")?`(${n})[]`:`${n}[]`}return"unknown[]";case"enum":return e.enumValues&&e.enumValues.length>0?e.enumValues.map(n=>`'${n}'`).join(" | "):"string";case"union":return"unknown";default:return"unknown"}},Zt={generate:(e,n="Root",t={})=>{let o=D(e,v(n),t),r=new Set,i=new Set,s=[];for(let l of o){let f=`export class ${`${l.name}Dto`} {
`;for(let u of l.fields){let p=u.name.toLowerCase(),m=u.isOptional,d=u.isNullable,y=u.fieldType,g=[];if(m&&(g.push("@IsOptional()"),r.add("IsOptional")),y.kind==="string"){let $=y.format;$==="email"||p.includes("email")?(g.push("@IsEmail()"),r.add("IsEmail")):$==="uuid"?(g.push("@IsUUID()"),r.add("IsUUID")):$==="url"||p.includes("url")||p.includes("website")?(g.push("@IsUrl()"),r.add("IsUrl")):$==="datetime"||$==="date"?(g.push("@IsISO8601()"),r.add("IsISO8601")):y.enumValues&&y.enumValues.length>0?(g.push(`@IsIn([${y.enumValues.map(S=>`'${S}'`).join(", ")}])`),r.add("IsIn")):(g.push("@IsString()"),r.add("IsString"),m||(g.push("@IsNotEmpty()"),r.add("IsNotEmpty")))}else if(y.kind==="number")y.format==="int"?(g.push("@IsInt()"),r.add("IsInt")):(g.push("@IsNumber()"),r.add("IsNumber")),p.includes("percent")?(g.push("@Min(0)","@Max(100)"),r.add("Min"),r.add("Max")):p.includes("latitude")||p==="lat"?(g.push("@Min(-90)","@Max(90)"),r.add("Min"),r.add("Max")):p.includes("longitude")||p==="lng"||p==="lon"?(g.push("@Min(-180)","@Max(180)"),r.add("Min"),r.add("Max")):p.includes("age")&&(g.push("@Min(0)","@Max(150)"),r.add("Min"),r.add("Max"));else if(y.kind==="boolean")g.push("@IsBoolean()"),r.add("IsBoolean");else if(y.kind==="date"||y.kind==="datetime")g.push("@IsISO8601()"),r.add("IsISO8601");else if(y.kind==="enum")y.enumValues&&y.enumValues.length>0?(g.push(`@IsIn([${y.enumValues.map($=>`'${$}'`).join(", ")}])`),r.add("IsIn")):(g.push("@IsString()"),r.add("IsString"));else if(y.kind==="array"){if(g.push("@IsArray()"),r.add("IsArray"),y.itemType?.kind==="classRef"){let $=Z(y.itemType.classRefName??"Object");g.push("@ValidateNested({ each: true })"),g.push(`@Type(() => ${$}Dto)`),r.add("ValidateNested"),i.add("Type")}}else if(y.kind==="classRef"){let $=Z(y.classRefName??"Object");g.push("@ValidateNested()"),g.push(`@Type(() => ${$}Dto)`),r.add("ValidateNested"),i.add("Type")}let b=Wt(y);d&&(b+=" | null");let h=m?"?":"";for(let $ of g)f+=`  ${$}
`;f+=`  ${re(u.name)}${h}: ${b};

`}f=f.trimEnd()+`
}
`,s.push(f)}let a="";return r.size>0&&(a+=`import { ${[...r].sort().join(", ")} } from 'class-validator';
`),i.size>0&&(a+=`import { ${[...i].sort().join(", ")} } from 'class-transformer';
`),a&&(a+=`
`),a+s.join(`
`)}},Kt={generate:e=>{let n=t=>{if(t.type==="object"&&t.fields){let r=Object.keys(t.fields).filter(s=>!t.fields[s].optional),i={type:t.nullable?["object","null"]:"object",properties:Object.keys(t.fields).reduce((s,a)=>({...s,[a]:n(t.fields[a])}),{})};return r.length>0&&(i.required=r),i}if(t.type==="array")return{type:t.nullable?["array","null"]:"array",items:n(t.itemType)};if(t.type==="union"&&t.unionTypes){let r={anyOf:t.unionTypes.map(i=>({type:i}))};return t.nullable&&r.anyOf.push({type:"null"}),r}let o={};return t.type!=="any"&&(o.type=t.nullable?[t.type,"null"]:t.type),t.format&&(o.format=t.format),t.enumValues&&t.enumValues.length>0&&(o.enum=t.enumValues),o};return JSON.stringify({$schema:"http://json-schema.org/draft-07/schema#",...n(e)},null,2)}},Cn=(e,n)=>{switch(e.kind){case"string":return e.format==="uuid"?"Schema.UUID":e.format==="datetime"||e.format==="date"?"Schema.DateTimeUtc":e.enumValues&&e.enumValues.length>0?`Schema.Literal(${e.enumValues.map(t=>`"${t}"`).join(", ")})`:"Schema.String";case"number":return e.format==="int"?"Schema.Int":"Schema.Number";case"boolean":return"Schema.Boolean";case"date":case"datetime":return"Schema.DateTimeUtc";case"classRef":{if(!e.classRefName)return"Schema.Unknown";let t=W(e.classRefName);return n.has(e.classRefName)?`Schema.suspend((): Schema.Schema<${e.classRefName}> => ${t})`:t}case"array":return e.itemType?`Schema.Array(${Cn(e.itemType,n)})`:"Schema.Array(Schema.Unknown)";case"enum":return e.enumValues&&e.enumValues.length>0?`Schema.Literal(${e.enumValues.map(t=>`"${t}"`).join(", ")})`:"Schema.String";case"union":if(e.unionTypes&&e.unionTypes.length>0){let t=e.unionTypes.map(o=>Cn({kind:o},n));return t.length===1?t[0]:`Schema.Union(${t.join(", ")})`}return"Schema.Unknown";default:return"Schema.Unknown"}},Ht={generate:(e,n="root",t={})=>{let o=D(e,v(n),t),{sorted:r,cyclicClassRefs:i}=En(o),s="";for(let l of r){let c=W(l.name);s+=`export const ${c} = Schema.Struct({
`;for(let f of l.fields){let u=Cn(f.fieldType,i);f.isNullable&&f.isOptional?u=`Schema.optional(Schema.NullOr(${u}))`:f.isNullable?u=`Schema.NullOr(${u})`:f.isOptional&&(u=`Schema.optional(${u})`),s+=`  ${re(f.name)}: ${u},
`}s+=`});
`,s+=`export type ${l.name} = Schema.Schema.Type<typeof ${c}>;

`}let a=me(e,v(n));if(a&&o.some(l=>l.name===a)){let l=v(n),c=W(l);s+=`export const ${c} = Schema.Array(${W(a)});
`,s+=`export type ${l} = Schema.Schema.Type<typeof ${c}>;

`}return s}},en={generate:(e,n="Root")=>{if(e.type==="object"&&e.fields){let t=`# API Field Specifications: ${n}

`;t+=`| Field | Type | Required | Description |
`,t+=`| :--- | :--- | :--- | :--- |
`;for(let[o,r]of Object.entries(e.fields)){let i=r.type==="object"?"Object":r.type==="array"?`${r.itemType?.type||"any"}[]`:r.type;r.type==="union"&&r.unionTypes&&(i=r.unionTypes.join(" \\| ")),r.nullable&&(i+=" (nullable)");let s=r.optional?"No":"Yes",a="No description provided.",l=o.toLowerCase();l.endsWith("_id")&&l!=="id"?a="Foreign key reference to an external record.":l==="id"||l.endsWith("id")?a="Unique identifier for the record.":l==="username"?a="User's unique display name.":l==="name"||l==="fullname"?a="Full name of the user or entity.":l==="email"?a="Primary email address.":l==="status"?a="Operational or lifecycle state.":l==="role"?a="User privilege role or system role.":l==="avatarurl"||l==="avatar"?a="Public URL to the user's avatar image.":l==="stats"?a="Statistical metrics and counters.":l==="preferences"?a="User preference flags and custom configurations.":l.startsWith("is")||l.startsWith("has")?a="Boolean flag representing status.":l==="createdat"||l==="created_at"?a="Timestamp representing record creation time.":l==="updatedat"||l==="updated_at"?a="Timestamp representing the last update time.":l==="lastlogin"||l==="last_login"?a="Timestamp of the user's most recent session activity.":l==="title"?a="Human-readable title or heading.":l.includes("description")||l==="desc"?a="Free-text description or summary.":l.includes("phone")||l.includes("mobile")?a="Contact phone number.":l.includes("address")?a="Physical or mailing address.":l.includes("price")||l.includes("amount")||l.includes("cost")||l.includes("fee")?a="Monetary value (non-negative).":l==="age"?a="Age in years (0\u2013150).":l.includes("age")&&r.type==="number"?a="Numeric age value.":l==="type"||l.endsWith("_type")||l.endsWith("type")?a="Discriminator or category type.":l==="slug"||l.endsWith("_slug")?a="URL-safe identifier slug.":l.endsWith("_count")||l==="count"?a="Integer count or quantity (non-negative).":l.endsWith("_at")?a="ISO 8601 timestamp.":l.endsWith("_url")||l.endsWith("_link")?a="Fully-qualified URL (HTTP/HTTPS).":l.endsWith("_code")||l==="code"?a="Short code or identifier string.":r.format==="uuid"?a="Universally Unique Identifier (UUID) format string.":r.format==="email"?a="Validated email format string.":r.format==="url"?a="Fully-qualified web URL (HTTP/HTTPS).":r.format==="datetime"&&(a="ISO 8601 compliant UTC date-time string."),t+=`| \`${o}\` | \`${i}\` | ${s} | ${a} |
`}t+=`
`;for(let[o,r]of Object.entries(e.fields))r.type==="object"&&(t+=`
---

`,t+=en.generate(r,o.charAt(0).toUpperCase()+o.slice(1))),r.type==="array"&&r.itemType?.type==="object"&&(t+=`
---

`,t+=en.generate(r.itemType,o.charAt(0).toUpperCase()+o.slice(1)+"Item"));return t}return""}},Yt={generate:(e,n="Root",t={})=>{let o=_n(e,n),r=D(e,n,t),i=[],s=(c,f)=>{switch(c.kind){case"string":return`typeof ${f} === 'string'`;case"number":return`typeof ${f} === 'number'`;case"boolean":return`typeof ${f} === 'boolean'`;case"date":case"datetime":return`(typeof ${f} === 'string' || ${f} instanceof Date)`;case"any":return"true";case"classRef":return`is${c.classRefName}(${f})`;case"array":return`Array.isArray(${f})`;case"enum":{let u=(c.enumValues??[]).map(p=>`'${p}'`).join(", ");return`typeof ${f} === 'string' && [${u}].includes(${f})`}case"union":{let u=(c.unionTypes??[]).filter(p=>p!=="any").map(p=>`typeof ${f} === '${p}'`);return u.length?`(${u.join(" || ")})`:"true"}default:return"true"}},a=c=>{let f=`o['${c.name}']`,u=s(c.fieldType,f),p=u!=="true";return c.isOptional&&c.isNullable?p?`(${f} == null || ${u})`:`(${f} == null)`:c.isOptional?p?`(${f} === undefined || ${u})`:"true":c.isNullable?p?`(${f} === null || ${u})`:`${f} === null`:u},l=(c,f)=>{i.push(`export function is${c}(obj: unknown): obj is ${c} {`),i.push("  if (typeof obj !== 'object' || obj === null) return false;"),i.push("  const o = obj as Record<string, unknown>;");let u=f.map(a).filter(p=>p!=="true");u.length===0?i.push("  return true;"):(i.push("  return ("),u.forEach((p,m)=>{let d=m<u.length-1?" &&":"";i.push(`    ${p}${d}`)}),i.push("  );")),i.push("}"),i.push("")};for(let c of r){let f=o.get(c.name);if(f){let u=Rn(Object.keys(f.variants));for(let[m,d]of Object.entries(f.variants)){let y=`${c.name}${u.get(m)}`,g=Object.entries(d.fields??{}).map(([b,h])=>b===f.discriminatorField?{name:b,fieldType:{kind:"enum",enumValues:[m]},isOptional:!1,isNullable:!1}:{name:b,fieldType:Y(h,y,b),isOptional:!!h.optional,isNullable:!!h.nullable});l(y,g)}let p=Object.keys(f.variants).map(m=>`is${c.name}${u.get(m)}(obj)`);i.push(`export function is${c.name}(obj: unknown): obj is ${c.name} {`),i.push(`  return ${p.join(" || ")};`),i.push("}"),i.push("");continue}l(c.name,c.fields)}if(e.type==="array"&&e.itemType){let c=me(e,n);if(c){let f=v(n);i.push(`export function is${f}(obj: unknown): obj is ${f} {`),i.push(`  return Array.isArray(obj) && obj.every((item) => is${c}(item));`),i.push("}"),i.push("")}}return i.join(`
`)}};function mr(e){return typeof e>"u"||e===null}function Js(e){return typeof e=="object"&&e!==null}function Ws(e){return Array.isArray(e)?e:mr(e)?[]:[e]}function Zs(e,n){var t,o,r,i;if(n)for(i=Object.keys(n),t=0,o=i.length;t<o;t+=1)r=i[t],e[r]=n[r];return e}function Ks(e,n){var t="",o;for(o=0;o<n;o+=1)t+=e;return t}function Hs(e){return e===0&&Number.NEGATIVE_INFINITY===1/e}var Ys=mr,Qs=Js,Xs=Ws,eo=Ks,no=Hs,to=Zs,F={isNothing:Ys,isObject:Qs,toArray:Xs,repeat:eo,isNegativeZero:no,extend:to};function dr(e,n){var t="",o=e.reason||"(unknown reason)";return e.mark?(e.mark.name&&(t+='in "'+e.mark.name+'" '),t+="("+(e.mark.line+1)+":"+(e.mark.column+1)+")",!n&&e.mark.snippet&&(t+=`

`+e.mark.snippet),o+" "+t):o}function Pe(e,n){Error.call(this),this.name="YAMLException",this.reason=e,this.mark=n,this.message=dr(this,!1),Error.captureStackTrace?Error.captureStackTrace(this,this.constructor):this.stack=new Error().stack||""}Pe.prototype=Object.create(Error.prototype);Pe.prototype.constructor=Pe;Pe.prototype.toString=function(n){return this.name+": "+dr(this,n)};var V=Pe;function In(e,n,t,o,r){var i="",s="",a=Math.floor(r/2)-1;return o-n>a&&(i=" ... ",n=o-a+i.length),t-o>a&&(s=" ...",t=o+a-s.length),{str:i+e.slice(n,t).replace(/\t/g,"\u2192")+s,pos:o-n+i.length}}function Mn(e,n){return F.repeat(" ",n-e.length)+e}function ro(e,n){if(n=Object.create(n||null),!e.buffer)return null;n.maxLength||(n.maxLength=79),typeof n.indent!="number"&&(n.indent=1),typeof n.linesBefore!="number"&&(n.linesBefore=3),typeof n.linesAfter!="number"&&(n.linesAfter=2);for(var t=/\r?\n|\r|\0/g,o=[0],r=[],i,s=-1;i=t.exec(e.buffer);)r.push(i.index),o.push(i.index+i[0].length),e.position<=i.index&&s<0&&(s=o.length-2);s<0&&(s=o.length-1);var a="",l,c,f=Math.min(e.line+n.linesAfter,r.length).toString().length,u=n.maxLength-(n.indent+f+3);for(l=1;l<=n.linesBefore&&!(s-l<0);l++)c=In(e.buffer,o[s-l],r[s-l],e.position-(o[s]-o[s-l]),u),a=F.repeat(" ",n.indent)+Mn((e.line-l+1).toString(),f)+" | "+c.str+`
`+a;for(c=In(e.buffer,o[s],r[s],e.position,u),a+=F.repeat(" ",n.indent)+Mn((e.line+1).toString(),f)+" | "+c.str+`
`,a+=F.repeat("-",n.indent+f+3+c.pos)+`^
`,l=1;l<=n.linesAfter&&!(s+l>=r.length);l++)c=In(e.buffer,o[s+l],r[s+l],e.position-(o[s]-o[s+l]),u),a+=F.repeat(" ",n.indent)+Mn((e.line+l+1).toString(),f)+" | "+c.str+`
`;return a.replace(/\n$/,"")}var io=ro,so=["kind","multi","resolve","construct","instanceOf","predicate","represent","representName","defaultStyle","styleAliases"],oo=["scalar","sequence","mapping"];function ao(e){var n={};return e!==null&&Object.keys(e).forEach(function(t){e[t].forEach(function(o){n[String(o)]=t})}),n}function lo(e,n){if(n=n||{},Object.keys(n).forEach(function(t){if(so.indexOf(t)===-1)throw new V('Unknown option "'+t+'" is met in definition of "'+e+'" YAML type.')}),this.options=n,this.tag=e,this.kind=n.kind||null,this.resolve=n.resolve||function(){return!0},this.construct=n.construct||function(t){return t},this.instanceOf=n.instanceOf||null,this.predicate=n.predicate||null,this.represent=n.represent||null,this.representName=n.representName||null,this.defaultStyle=n.defaultStyle||null,this.multi=n.multi||!1,this.styleAliases=ao(n.styleAliases||null),oo.indexOf(this.kind)===-1)throw new V('Unknown kind "'+this.kind+'" is specified for "'+e+'" YAML type.')}var G=lo;function Qt(e,n){var t=[];return e[n].forEach(function(o){var r=t.length;t.forEach(function(i,s){i.tag===o.tag&&i.kind===o.kind&&i.multi===o.multi&&(r=s)}),t[r]=o}),t}function co(){var e={scalar:{},sequence:{},mapping:{},fallback:{},multi:{scalar:[],sequence:[],mapping:[],fallback:[]}},n,t;function o(r){r.multi?(e.multi[r.kind].push(r),e.multi.fallback.push(r)):e[r.kind][r.tag]=e.fallback[r.tag]=r}for(n=0,t=arguments.length;n<t;n+=1)arguments[n].forEach(o);return e}function zn(e){return this.extend(e)}zn.prototype.extend=function(n){var t=[],o=[];if(n instanceof G)o.push(n);else if(Array.isArray(n))o=o.concat(n);else if(n&&(Array.isArray(n.implicit)||Array.isArray(n.explicit)))n.implicit&&(t=t.concat(n.implicit)),n.explicit&&(o=o.concat(n.explicit));else throw new V("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");t.forEach(function(i){if(!(i instanceof G))throw new V("Specified list of YAML types (or a single Type object) contains a non-Type object.");if(i.loadKind&&i.loadKind!=="scalar")throw new V("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");if(i.multi)throw new V("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.")}),o.forEach(function(i){if(!(i instanceof G))throw new V("Specified list of YAML types (or a single Type object) contains a non-Type object.")});var r=Object.create(zn.prototype);return r.implicit=(this.implicit||[]).concat(t),r.explicit=(this.explicit||[]).concat(o),r.compiledImplicit=Qt(r,"implicit"),r.compiledExplicit=Qt(r,"explicit"),r.compiledTypeMap=co(r.compiledImplicit,r.compiledExplicit),r};var yr=zn,gr=new G("tag:yaml.org,2002:str",{kind:"scalar",construct:function(e){return e!==null?e:""}}),hr=new G("tag:yaml.org,2002:seq",{kind:"sequence",construct:function(e){return e!==null?e:[]}}),br=new G("tag:yaml.org,2002:map",{kind:"mapping",construct:function(e){return e!==null?e:{}}}),$r=new yr({explicit:[gr,hr,br]});function uo(e){if(e===null)return!0;var n=e.length;return n===1&&e==="~"||n===4&&(e==="null"||e==="Null"||e==="NULL")}function fo(){return null}function po(e){return e===null}var Sr=new G("tag:yaml.org,2002:null",{kind:"scalar",resolve:uo,construct:fo,predicate:po,represent:{canonical:function(){return"~"},lowercase:function(){return"null"},uppercase:function(){return"NULL"},camelcase:function(){return"Null"},empty:function(){return""}},defaultStyle:"lowercase"});function mo(e){if(e===null)return!1;var n=e.length;return n===4&&(e==="true"||e==="True"||e==="TRUE")||n===5&&(e==="false"||e==="False"||e==="FALSE")}function yo(e){return e==="true"||e==="True"||e==="TRUE"}function go(e){return Object.prototype.toString.call(e)==="[object Boolean]"}var Tr=new G("tag:yaml.org,2002:bool",{kind:"scalar",resolve:mo,construct:yo,predicate:go,represent:{lowercase:function(e){return e?"true":"false"},uppercase:function(e){return e?"TRUE":"FALSE"},camelcase:function(e){return e?"True":"False"}},defaultStyle:"lowercase"});function ho(e){return 48<=e&&e<=57||65<=e&&e<=70||97<=e&&e<=102}function bo(e){return 48<=e&&e<=55}function $o(e){return 48<=e&&e<=57}function So(e){if(e===null)return!1;var n=e.length,t=0,o=!1,r;if(!n)return!1;if(r=e[t],(r==="-"||r==="+")&&(r=e[++t]),r==="0"){if(t+1===n)return!0;if(r=e[++t],r==="b"){for(t++;t<n;t++)if(r=e[t],r!=="_"){if(r!=="0"&&r!=="1")return!1;o=!0}return o&&r!=="_"}if(r==="x"){for(t++;t<n;t++)if(r=e[t],r!=="_"){if(!ho(e.charCodeAt(t)))return!1;o=!0}return o&&r!=="_"}if(r==="o"){for(t++;t<n;t++)if(r=e[t],r!=="_"){if(!bo(e.charCodeAt(t)))return!1;o=!0}return o&&r!=="_"}}if(r==="_")return!1;for(;t<n;t++)if(r=e[t],r!=="_"){if(!$o(e.charCodeAt(t)))return!1;o=!0}return!(!o||r==="_")}function To(e){var n=e,t=1,o;if(n.indexOf("_")!==-1&&(n=n.replace(/_/g,"")),o=n[0],(o==="-"||o==="+")&&(o==="-"&&(t=-1),n=n.slice(1),o=n[0]),n==="0")return 0;if(o==="0"){if(n[1]==="b")return t*parseInt(n.slice(2),2);if(n[1]==="x")return t*parseInt(n.slice(2),16);if(n[1]==="o")return t*parseInt(n.slice(2),8)}return t*parseInt(n,10)}function xo(e){return Object.prototype.toString.call(e)==="[object Number]"&&e%1===0&&!F.isNegativeZero(e)}var xr=new G("tag:yaml.org,2002:int",{kind:"scalar",resolve:So,construct:To,predicate:xo,represent:{binary:function(e){return e>=0?"0b"+e.toString(2):"-0b"+e.toString(2).slice(1)},octal:function(e){return e>=0?"0o"+e.toString(8):"-0o"+e.toString(8).slice(1)},decimal:function(e){return e.toString(10)},hexadecimal:function(e){return e>=0?"0x"+e.toString(16).toUpperCase():"-0x"+e.toString(16).toUpperCase().slice(1)}},defaultStyle:"decimal",styleAliases:{binary:[2,"bin"],octal:[8,"oct"],decimal:[10,"dec"],hexadecimal:[16,"hex"]}}),Ao=new RegExp("^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");function jo(e){return!(e===null||!Ao.test(e)||e[e.length-1]==="_")}function Oo(e){var n,t;return n=e.replace(/_/g,"").toLowerCase(),t=n[0]==="-"?-1:1,"+-".indexOf(n[0])>=0&&(n=n.slice(1)),n===".inf"?t===1?Number.POSITIVE_INFINITY:Number.NEGATIVE_INFINITY:n===".nan"?NaN:t*parseFloat(n,10)}var ko=/^[-+]?[0-9]+e/;function No(e,n){var t;if(isNaN(e))switch(n){case"lowercase":return".nan";case"uppercase":return".NAN";case"camelcase":return".NaN"}else if(Number.POSITIVE_INFINITY===e)switch(n){case"lowercase":return".inf";case"uppercase":return".INF";case"camelcase":return".Inf"}else if(Number.NEGATIVE_INFINITY===e)switch(n){case"lowercase":return"-.inf";case"uppercase":return"-.INF";case"camelcase":return"-.Inf"}else if(F.isNegativeZero(e))return"-0.0";return t=e.toString(10),ko.test(t)?t.replace("e",".e"):t}function wo(e){return Object.prototype.toString.call(e)==="[object Number]"&&(e%1!==0||F.isNegativeZero(e))}var Ar=new G("tag:yaml.org,2002:float",{kind:"scalar",resolve:jo,construct:Oo,predicate:wo,represent:No,defaultStyle:"lowercase"}),jr=$r.extend({implicit:[Sr,Tr,xr,Ar]}),Or=jr,kr=new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"),Nr=new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$");function vo(e){return e===null?!1:kr.exec(e)!==null||Nr.exec(e)!==null}function Co(e){var n,t,o,r,i,s,a,l=0,c=null,f,u,p;if(n=kr.exec(e),n===null&&(n=Nr.exec(e)),n===null)throw new Error("Date resolve error");if(t=+n[1],o=+n[2]-1,r=+n[3],!n[4])return new Date(Date.UTC(t,o,r));if(i=+n[4],s=+n[5],a=+n[6],n[7]){for(l=n[7].slice(0,3);l.length<3;)l+="0";l=+l}return n[9]&&(f=+n[10],u=+(n[11]||0),c=(f*60+u)*6e4,n[9]==="-"&&(c=-c)),p=new Date(Date.UTC(t,o,r,i,s,a,l)),c&&p.setTime(p.getTime()-c),p}function Ro(e){return e.toISOString()}var wr=new G("tag:yaml.org,2002:timestamp",{kind:"scalar",resolve:vo,construct:Co,instanceOf:Date,represent:Ro});function _o(e){return e==="<<"||e===null}var vr=new G("tag:yaml.org,2002:merge",{kind:"scalar",resolve:_o}),Un=`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=
\r`;function Eo(e){if(e===null)return!1;var n,t,o=0,r=e.length,i=Un;for(t=0;t<r;t++)if(n=i.indexOf(e.charAt(t)),!(n>64)){if(n<0)return!1;o+=6}return o%8===0}function Io(e){var n,t,o=e.replace(/[\r\n=]/g,""),r=o.length,i=Un,s=0,a=[];for(n=0;n<r;n++)n%4===0&&n&&(a.push(s>>16&255),a.push(s>>8&255),a.push(s&255)),s=s<<6|i.indexOf(o.charAt(n));return t=r%4*6,t===0?(a.push(s>>16&255),a.push(s>>8&255),a.push(s&255)):t===18?(a.push(s>>10&255),a.push(s>>2&255)):t===12&&a.push(s>>4&255),new Uint8Array(a)}function Mo(e){var n="",t=0,o,r,i=e.length,s=Un;for(o=0;o<i;o++)o%3===0&&o&&(n+=s[t>>18&63],n+=s[t>>12&63],n+=s[t>>6&63],n+=s[t&63]),t=(t<<8)+e[o];return r=i%3,r===0?(n+=s[t>>18&63],n+=s[t>>12&63],n+=s[t>>6&63],n+=s[t&63]):r===2?(n+=s[t>>10&63],n+=s[t>>4&63],n+=s[t<<2&63],n+=s[64]):r===1&&(n+=s[t>>2&63],n+=s[t<<4&63],n+=s[64],n+=s[64]),n}function Lo(e){return Object.prototype.toString.call(e)==="[object Uint8Array]"}var Cr=new G("tag:yaml.org,2002:binary",{kind:"scalar",resolve:Eo,construct:Io,predicate:Lo,represent:Mo}),zo=Object.prototype.hasOwnProperty,Fo=Object.prototype.toString;function Do(e){if(e===null)return!0;var n=[],t,o,r,i,s,a=e;for(t=0,o=a.length;t<o;t+=1){if(r=a[t],s=!1,Fo.call(r)!=="[object Object]")return!1;for(i in r)if(zo.call(r,i))if(!s)s=!0;else return!1;if(!s)return!1;if(n.indexOf(i)===-1)n.push(i);else return!1}return!0}function Go(e){return e!==null?e:[]}var Rr=new G("tag:yaml.org,2002:omap",{kind:"sequence",resolve:Do,construct:Go}),Po=Object.prototype.toString;function Uo(e){if(e===null)return!0;var n,t,o,r,i,s=e;for(i=new Array(s.length),n=0,t=s.length;n<t;n+=1){if(o=s[n],Po.call(o)!=="[object Object]"||(r=Object.keys(o),r.length!==1))return!1;i[n]=[r[0],o[r[0]]]}return!0}function Vo(e){if(e===null)return[];var n,t,o,r,i,s=e;for(i=new Array(s.length),n=0,t=s.length;n<t;n+=1)o=s[n],r=Object.keys(o),i[n]=[r[0],o[r[0]]];return i}var _r=new G("tag:yaml.org,2002:pairs",{kind:"sequence",resolve:Uo,construct:Vo}),qo=Object.prototype.hasOwnProperty;function Bo(e){if(e===null)return!0;var n,t=e;for(n in t)if(qo.call(t,n)&&t[n]!==null)return!1;return!0}function Jo(e){return e!==null?e:{}}var Er=new G("tag:yaml.org,2002:set",{kind:"mapping",resolve:Bo,construct:Jo}),Vn=Or.extend({implicit:[wr,vr],explicit:[Cr,Rr,_r,Er]}),le=Object.prototype.hasOwnProperty,nn=1,Ir=2,Mr=3,tn=4,Ln=1,Wo=2,Xt=3,Zo=/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/,Ko=/[\x85\u2028\u2029]/,Ho=/[,\[\]\{\}]/,Lr=/^(?:!|!!|![a-z\-]+!)$/i,zr=/^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;function er(e){return Object.prototype.toString.call(e)}function X(e){return e===10||e===13}function he(e){return e===9||e===32}function J(e){return e===9||e===32||e===10||e===13}function Ne(e){return e===44||e===91||e===93||e===123||e===125}function Yo(e){var n;return 48<=e&&e<=57?e-48:(n=e|32,97<=n&&n<=102?n-97+10:-1)}function Qo(e){return e===120?2:e===117?4:e===85?8:0}function Xo(e){return 48<=e&&e<=57?e-48:-1}function nr(e){return e===48?"\0":e===97?"\x07":e===98?"\b":e===116||e===9?"	":e===110?`
`:e===118?"\v":e===102?"\f":e===114?"\r":e===101?"\x1B":e===32?" ":e===34?'"':e===47?"/":e===92?"\\":e===78?"\x85":e===95?"\xA0":e===76?"\u2028":e===80?"\u2029":""}function ea(e){return e<=65535?String.fromCharCode(e):String.fromCharCode((e-65536>>10)+55296,(e-65536&1023)+56320)}function Fr(e,n,t){n==="__proto__"?Object.defineProperty(e,n,{configurable:!0,enumerable:!0,writable:!0,value:t}):e[n]=t}var Dr=new Array(256),Gr=new Array(256);for(ge=0;ge<256;ge++)Dr[ge]=nr(ge)?1:0,Gr[ge]=nr(ge);var ge;function na(e,n){this.input=e,this.filename=n.filename||null,this.schema=n.schema||Vn,this.onWarning=n.onWarning||null,this.legacy=n.legacy||!1,this.json=n.json||!1,this.listener=n.listener||null,this.implicitTypes=this.schema.compiledImplicit,this.typeMap=this.schema.compiledTypeMap,this.length=e.length,this.position=0,this.line=0,this.lineStart=0,this.lineIndent=0,this.firstTabInLine=-1,this.documents=[]}function Pr(e,n){var t={name:e.filename,buffer:e.input.slice(0,-1),position:e.position,line:e.line,column:e.position-e.lineStart};return t.snippet=io(t),new V(n,t)}function j(e,n){throw Pr(e,n)}function rn(e,n){e.onWarning&&e.onWarning.call(null,Pr(e,n))}var tr={YAML:function(n,t,o){var r,i,s;n.version!==null&&j(n,"duplication of %YAML directive"),o.length!==1&&j(n,"YAML directive accepts exactly one argument"),r=/^([0-9]+)\.([0-9]+)$/.exec(o[0]),r===null&&j(n,"ill-formed argument of the YAML directive"),i=parseInt(r[1],10),s=parseInt(r[2],10),i!==1&&j(n,"unacceptable YAML version of the document"),n.version=o[0],n.checkLineBreaks=s<2,s!==1&&s!==2&&rn(n,"unsupported YAML version of the document")},TAG:function(n,t,o){var r,i;o.length!==2&&j(n,"TAG directive accepts exactly two arguments"),r=o[0],i=o[1],Lr.test(r)||j(n,"ill-formed tag handle (first argument) of the TAG directive"),le.call(n.tagMap,r)&&j(n,'there is a previously declared suffix for "'+r+'" tag handle'),zr.test(i)||j(n,"ill-formed tag prefix (second argument) of the TAG directive");try{i=decodeURIComponent(i)}catch{j(n,"tag prefix is malformed: "+i)}n.tagMap[r]=i}};function ae(e,n,t,o){var r,i,s,a;if(n<t){if(a=e.input.slice(n,t),o)for(r=0,i=a.length;r<i;r+=1)s=a.charCodeAt(r),s===9||32<=s&&s<=1114111||j(e,"expected valid JSON character");else Zo.test(a)&&j(e,"the stream contains non-printable characters");e.result+=a}}function rr(e,n,t,o){var r,i,s,a;for(F.isObject(t)||j(e,"cannot merge mappings; the provided source object is unacceptable"),r=Object.keys(t),s=0,a=r.length;s<a;s+=1)i=r[s],le.call(n,i)||(Fr(n,i,t[i]),o[i]=!0)}function we(e,n,t,o,r,i,s,a,l){var c,f;if(Array.isArray(r))for(r=Array.prototype.slice.call(r),c=0,f=r.length;c<f;c+=1)Array.isArray(r[c])&&j(e,"nested arrays are not supported inside keys"),typeof r=="object"&&er(r[c])==="[object Object]"&&(r[c]="[object Object]");if(typeof r=="object"&&er(r)==="[object Object]"&&(r="[object Object]"),r=String(r),n===null&&(n={}),o==="tag:yaml.org,2002:merge")if(Array.isArray(i))for(c=0,f=i.length;c<f;c+=1)rr(e,n,i[c],t);else rr(e,n,i,t);else!e.json&&!le.call(t,r)&&le.call(n,r)&&(e.line=s||e.line,e.lineStart=a||e.lineStart,e.position=l||e.position,j(e,"duplicated mapping key")),Fr(n,r,i),delete t[r];return n}function qn(e){var n;n=e.input.charCodeAt(e.position),n===10?e.position++:n===13?(e.position++,e.input.charCodeAt(e.position)===10&&e.position++):j(e,"a line break is expected"),e.line+=1,e.lineStart=e.position,e.firstTabInLine=-1}function z(e,n,t){for(var o=0,r=e.input.charCodeAt(e.position);r!==0;){for(;he(r);)r===9&&e.firstTabInLine===-1&&(e.firstTabInLine=e.position),r=e.input.charCodeAt(++e.position);if(n&&r===35)do r=e.input.charCodeAt(++e.position);while(r!==10&&r!==13&&r!==0);if(X(r))for(qn(e),r=e.input.charCodeAt(e.position),o++,e.lineIndent=0;r===32;)e.lineIndent++,r=e.input.charCodeAt(++e.position);else break}return t!==-1&&o!==0&&e.lineIndent<t&&rn(e,"deficient indentation"),o}function an(e){var n=e.position,t;return t=e.input.charCodeAt(n),!!((t===45||t===46)&&t===e.input.charCodeAt(n+1)&&t===e.input.charCodeAt(n+2)&&(n+=3,t=e.input.charCodeAt(n),t===0||J(t)))}function Bn(e,n){n===1?e.result+=" ":n>1&&(e.result+=F.repeat(`
`,n-1))}function ta(e,n,t){var o,r,i,s,a,l,c,f,u=e.kind,p=e.result,m;if(m=e.input.charCodeAt(e.position),J(m)||Ne(m)||m===35||m===38||m===42||m===33||m===124||m===62||m===39||m===34||m===37||m===64||m===96||(m===63||m===45)&&(r=e.input.charCodeAt(e.position+1),J(r)||t&&Ne(r)))return!1;for(e.kind="scalar",e.result="",i=s=e.position,a=!1;m!==0;){if(m===58){if(r=e.input.charCodeAt(e.position+1),J(r)||t&&Ne(r))break}else if(m===35){if(o=e.input.charCodeAt(e.position-1),J(o))break}else{if(e.position===e.lineStart&&an(e)||t&&Ne(m))break;if(X(m))if(l=e.line,c=e.lineStart,f=e.lineIndent,z(e,!1,-1),e.lineIndent>=n){a=!0,m=e.input.charCodeAt(e.position);continue}else{e.position=s,e.line=l,e.lineStart=c,e.lineIndent=f;break}}a&&(ae(e,i,s,!1),Bn(e,e.line-l),i=s=e.position,a=!1),he(m)||(s=e.position+1),m=e.input.charCodeAt(++e.position)}return ae(e,i,s,!1),e.result?!0:(e.kind=u,e.result=p,!1)}function ra(e,n){var t,o,r;if(t=e.input.charCodeAt(e.position),t!==39)return!1;for(e.kind="scalar",e.result="",e.position++,o=r=e.position;(t=e.input.charCodeAt(e.position))!==0;)if(t===39)if(ae(e,o,e.position,!0),t=e.input.charCodeAt(++e.position),t===39)o=e.position,e.position++,r=e.position;else return!0;else X(t)?(ae(e,o,r,!0),Bn(e,z(e,!1,n)),o=r=e.position):e.position===e.lineStart&&an(e)?j(e,"unexpected end of the document within a single quoted scalar"):(e.position++,r=e.position);j(e,"unexpected end of the stream within a single quoted scalar")}function ia(e,n){var t,o,r,i,s,a;if(a=e.input.charCodeAt(e.position),a!==34)return!1;for(e.kind="scalar",e.result="",e.position++,t=o=e.position;(a=e.input.charCodeAt(e.position))!==0;){if(a===34)return ae(e,t,e.position,!0),e.position++,!0;if(a===92){if(ae(e,t,e.position,!0),a=e.input.charCodeAt(++e.position),X(a))z(e,!1,n);else if(a<256&&Dr[a])e.result+=Gr[a],e.position++;else if((s=Qo(a))>0){for(r=s,i=0;r>0;r--)a=e.input.charCodeAt(++e.position),(s=Yo(a))>=0?i=(i<<4)+s:j(e,"expected hexadecimal character");e.result+=ea(i),e.position++}else j(e,"unknown escape sequence");t=o=e.position}else X(a)?(ae(e,t,o,!0),Bn(e,z(e,!1,n)),t=o=e.position):e.position===e.lineStart&&an(e)?j(e,"unexpected end of the document within a double quoted scalar"):(e.position++,o=e.position)}j(e,"unexpected end of the stream within a double quoted scalar")}function sa(e,n){var t=!0,o,r,i,s=e.tag,a,l=e.anchor,c,f,u,p,m,d=Object.create(null),y,g,b,h;if(h=e.input.charCodeAt(e.position),h===91)f=93,m=!1,a=[];else if(h===123)f=125,m=!0,a={};else return!1;for(e.anchor!==null&&(e.anchorMap[e.anchor]=a),h=e.input.charCodeAt(++e.position);h!==0;){if(z(e,!0,n),h=e.input.charCodeAt(e.position),h===f)return e.position++,e.tag=s,e.anchor=l,e.kind=m?"mapping":"sequence",e.result=a,!0;t?h===44&&j(e,"expected the node content, but found ','"):j(e,"missed comma between flow collection entries"),g=y=b=null,u=p=!1,h===63&&(c=e.input.charCodeAt(e.position+1),J(c)&&(u=p=!0,e.position++,z(e,!0,n))),o=e.line,r=e.lineStart,i=e.position,ve(e,n,nn,!1,!0),g=e.tag,y=e.result,z(e,!0,n),h=e.input.charCodeAt(e.position),(p||e.line===o)&&h===58&&(u=!0,h=e.input.charCodeAt(++e.position),z(e,!0,n),ve(e,n,nn,!1,!0),b=e.result),m?we(e,a,d,g,y,b,o,r,i):u?a.push(we(e,null,d,g,y,b,o,r,i)):a.push(y),z(e,!0,n),h=e.input.charCodeAt(e.position),h===44?(t=!0,h=e.input.charCodeAt(++e.position)):t=!1}j(e,"unexpected end of the stream within a flow collection")}function oa(e,n){var t,o,r=Ln,i=!1,s=!1,a=n,l=0,c=!1,f,u;if(u=e.input.charCodeAt(e.position),u===124)o=!1;else if(u===62)o=!0;else return!1;for(e.kind="scalar",e.result="";u!==0;)if(u=e.input.charCodeAt(++e.position),u===43||u===45)Ln===r?r=u===43?Xt:Wo:j(e,"repeat of a chomping mode identifier");else if((f=Xo(u))>=0)f===0?j(e,"bad explicit indentation width of a block scalar; it cannot be less than one"):s?j(e,"repeat of an indentation width identifier"):(a=n+f-1,s=!0);else break;if(he(u)){do u=e.input.charCodeAt(++e.position);while(he(u));if(u===35)do u=e.input.charCodeAt(++e.position);while(!X(u)&&u!==0)}for(;u!==0;){for(qn(e),e.lineIndent=0,u=e.input.charCodeAt(e.position);(!s||e.lineIndent<a)&&u===32;)e.lineIndent++,u=e.input.charCodeAt(++e.position);if(!s&&e.lineIndent>a&&(a=e.lineIndent),X(u)){l++;continue}if(e.lineIndent<a){r===Xt?e.result+=F.repeat(`
`,i?1+l:l):r===Ln&&i&&(e.result+=`
`);break}for(o?he(u)?(c=!0,e.result+=F.repeat(`
`,i?1+l:l)):c?(c=!1,e.result+=F.repeat(`
`,l+1)):l===0?i&&(e.result+=" "):e.result+=F.repeat(`
`,l):e.result+=F.repeat(`
`,i?1+l:l),i=!0,s=!0,l=0,t=e.position;!X(u)&&u!==0;)u=e.input.charCodeAt(++e.position);ae(e,t,e.position,!1)}return!0}function ir(e,n){var t,o=e.tag,r=e.anchor,i=[],s,a=!1,l;if(e.firstTabInLine!==-1)return!1;for(e.anchor!==null&&(e.anchorMap[e.anchor]=i),l=e.input.charCodeAt(e.position);l!==0&&(e.firstTabInLine!==-1&&(e.position=e.firstTabInLine,j(e,"tab characters must not be used in indentation")),!(l!==45||(s=e.input.charCodeAt(e.position+1),!J(s))));){if(a=!0,e.position++,z(e,!0,-1)&&e.lineIndent<=n){i.push(null),l=e.input.charCodeAt(e.position);continue}if(t=e.line,ve(e,n,Mr,!1,!0),i.push(e.result),z(e,!0,-1),l=e.input.charCodeAt(e.position),(e.line===t||e.lineIndent>n)&&l!==0)j(e,"bad indentation of a sequence entry");else if(e.lineIndent<n)break}return a?(e.tag=o,e.anchor=r,e.kind="sequence",e.result=i,!0):!1}function aa(e,n,t){var o,r,i,s,a,l,c=e.tag,f=e.anchor,u={},p=Object.create(null),m=null,d=null,y=null,g=!1,b=!1,h;if(e.firstTabInLine!==-1)return!1;for(e.anchor!==null&&(e.anchorMap[e.anchor]=u),h=e.input.charCodeAt(e.position);h!==0;){if(!g&&e.firstTabInLine!==-1&&(e.position=e.firstTabInLine,j(e,"tab characters must not be used in indentation")),o=e.input.charCodeAt(e.position+1),i=e.line,(h===63||h===58)&&J(o))h===63?(g&&(we(e,u,p,m,d,null,s,a,l),m=d=y=null),b=!0,g=!0,r=!0):g?(g=!1,r=!0):j(e,"incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line"),e.position+=1,h=o;else{if(s=e.line,a=e.lineStart,l=e.position,!ve(e,t,Ir,!1,!0))break;if(e.line===i){for(h=e.input.charCodeAt(e.position);he(h);)h=e.input.charCodeAt(++e.position);if(h===58)h=e.input.charCodeAt(++e.position),J(h)||j(e,"a whitespace character is expected after the key-value separator within a block mapping"),g&&(we(e,u,p,m,d,null,s,a,l),m=d=y=null),b=!0,g=!1,r=!1,m=e.tag,d=e.result;else if(b)j(e,"can not read an implicit mapping pair; a colon is missed");else return e.tag=c,e.anchor=f,!0}else if(b)j(e,"can not read a block mapping entry; a multiline key may not be an implicit key");else return e.tag=c,e.anchor=f,!0}if((e.line===i||e.lineIndent>n)&&(g&&(s=e.line,a=e.lineStart,l=e.position),ve(e,n,tn,!0,r)&&(g?d=e.result:y=e.result),g||(we(e,u,p,m,d,y,s,a,l),m=d=y=null),z(e,!0,-1),h=e.input.charCodeAt(e.position)),(e.line===i||e.lineIndent>n)&&h!==0)j(e,"bad indentation of a mapping entry");else if(e.lineIndent<n)break}return g&&we(e,u,p,m,d,null,s,a,l),b&&(e.tag=c,e.anchor=f,e.kind="mapping",e.result=u),b}function la(e){var n,t=!1,o=!1,r,i,s;if(s=e.input.charCodeAt(e.position),s!==33)return!1;if(e.tag!==null&&j(e,"duplication of a tag property"),s=e.input.charCodeAt(++e.position),s===60?(t=!0,s=e.input.charCodeAt(++e.position)):s===33?(o=!0,r="!!",s=e.input.charCodeAt(++e.position)):r="!",n=e.position,t){do s=e.input.charCodeAt(++e.position);while(s!==0&&s!==62);e.position<e.length?(i=e.input.slice(n,e.position),s=e.input.charCodeAt(++e.position)):j(e,"unexpected end of the stream within a verbatim tag")}else{for(;s!==0&&!J(s);)s===33&&(o?j(e,"tag suffix cannot contain exclamation marks"):(r=e.input.slice(n-1,e.position+1),Lr.test(r)||j(e,"named tag handle cannot contain such characters"),o=!0,n=e.position+1)),s=e.input.charCodeAt(++e.position);i=e.input.slice(n,e.position),Ho.test(i)&&j(e,"tag suffix cannot contain flow indicator characters")}i&&!zr.test(i)&&j(e,"tag name cannot contain such characters: "+i);try{i=decodeURIComponent(i)}catch{j(e,"tag name is malformed: "+i)}return t?e.tag=i:le.call(e.tagMap,r)?e.tag=e.tagMap[r]+i:r==="!"?e.tag="!"+i:r==="!!"?e.tag="tag:yaml.org,2002:"+i:j(e,'undeclared tag handle "'+r+'"'),!0}function ca(e){var n,t;if(t=e.input.charCodeAt(e.position),t!==38)return!1;for(e.anchor!==null&&j(e,"duplication of an anchor property"),t=e.input.charCodeAt(++e.position),n=e.position;t!==0&&!J(t)&&!Ne(t);)t=e.input.charCodeAt(++e.position);return e.position===n&&j(e,"name of an anchor node must contain at least one character"),e.anchor=e.input.slice(n,e.position),!0}function ua(e){var n,t,o;if(o=e.input.charCodeAt(e.position),o!==42)return!1;for(o=e.input.charCodeAt(++e.position),n=e.position;o!==0&&!J(o)&&!Ne(o);)o=e.input.charCodeAt(++e.position);return e.position===n&&j(e,"name of an alias node must contain at least one character"),t=e.input.slice(n,e.position),le.call(e.anchorMap,t)||j(e,'unidentified alias "'+t+'"'),e.result=e.anchorMap[t],z(e,!0,-1),!0}function ve(e,n,t,o,r){var i,s,a,l=1,c=!1,f=!1,u,p,m,d,y,g;if(e.listener!==null&&e.listener("open",e),e.tag=null,e.anchor=null,e.kind=null,e.result=null,i=s=a=tn===t||Mr===t,o&&z(e,!0,-1)&&(c=!0,e.lineIndent>n?l=1:e.lineIndent===n?l=0:e.lineIndent<n&&(l=-1)),l===1)for(;la(e)||ca(e);)z(e,!0,-1)?(c=!0,a=i,e.lineIndent>n?l=1:e.lineIndent===n?l=0:e.lineIndent<n&&(l=-1)):a=!1;if(a&&(a=c||r),(l===1||tn===t)&&(nn===t||Ir===t?y=n:y=n+1,g=e.position-e.lineStart,l===1?a&&(ir(e,g)||aa(e,g,y))||sa(e,y)?f=!0:(s&&oa(e,y)||ra(e,y)||ia(e,y)?f=!0:ua(e)?(f=!0,(e.tag!==null||e.anchor!==null)&&j(e,"alias node should not have any properties")):ta(e,y,nn===t)&&(f=!0,e.tag===null&&(e.tag="?")),e.anchor!==null&&(e.anchorMap[e.anchor]=e.result)):l===0&&(f=a&&ir(e,g))),e.tag===null)e.anchor!==null&&(e.anchorMap[e.anchor]=e.result);else if(e.tag==="?"){for(e.result!==null&&e.kind!=="scalar"&&j(e,'unacceptable node kind for !<?> tag; it should be "scalar", not "'+e.kind+'"'),u=0,p=e.implicitTypes.length;u<p;u+=1)if(d=e.implicitTypes[u],d.resolve(e.result)){e.result=d.construct(e.result),e.tag=d.tag,e.anchor!==null&&(e.anchorMap[e.anchor]=e.result);break}}else if(e.tag!=="!"){if(le.call(e.typeMap[e.kind||"fallback"],e.tag))d=e.typeMap[e.kind||"fallback"][e.tag];else for(d=null,m=e.typeMap.multi[e.kind||"fallback"],u=0,p=m.length;u<p;u+=1)if(e.tag.slice(0,m[u].tag.length)===m[u].tag){d=m[u];break}d||j(e,"unknown tag !<"+e.tag+">"),e.result!==null&&d.kind!==e.kind&&j(e,"unacceptable node kind for !<"+e.tag+'> tag; it should be "'+d.kind+'", not "'+e.kind+'"'),d.resolve(e.result,e.tag)?(e.result=d.construct(e.result,e.tag),e.anchor!==null&&(e.anchorMap[e.anchor]=e.result)):j(e,"cannot resolve a node with !<"+e.tag+"> explicit tag")}return e.listener!==null&&e.listener("close",e),e.tag!==null||e.anchor!==null||f}function fa(e){var n=e.position,t,o,r,i=!1,s;for(e.version=null,e.checkLineBreaks=e.legacy,e.tagMap=Object.create(null),e.anchorMap=Object.create(null);(s=e.input.charCodeAt(e.position))!==0&&(z(e,!0,-1),s=e.input.charCodeAt(e.position),!(e.lineIndent>0||s!==37));){for(i=!0,s=e.input.charCodeAt(++e.position),t=e.position;s!==0&&!J(s);)s=e.input.charCodeAt(++e.position);for(o=e.input.slice(t,e.position),r=[],o.length<1&&j(e,"directive name must not be less than one character in length");s!==0;){for(;he(s);)s=e.input.charCodeAt(++e.position);if(s===35){do s=e.input.charCodeAt(++e.position);while(s!==0&&!X(s));break}if(X(s))break;for(t=e.position;s!==0&&!J(s);)s=e.input.charCodeAt(++e.position);r.push(e.input.slice(t,e.position))}s!==0&&qn(e),le.call(tr,o)?tr[o](e,o,r):rn(e,'unknown document directive "'+o+'"')}if(z(e,!0,-1),e.lineIndent===0&&e.input.charCodeAt(e.position)===45&&e.input.charCodeAt(e.position+1)===45&&e.input.charCodeAt(e.position+2)===45?(e.position+=3,z(e,!0,-1)):i&&j(e,"directives end mark is expected"),ve(e,e.lineIndent-1,tn,!1,!0),z(e,!0,-1),e.checkLineBreaks&&Ko.test(e.input.slice(n,e.position))&&rn(e,"non-ASCII line breaks are interpreted as content"),e.documents.push(e.result),e.position===e.lineStart&&an(e)){e.input.charCodeAt(e.position)===46&&(e.position+=3,z(e,!0,-1));return}if(e.position<e.length-1)j(e,"end of the stream or a document separator is expected");else return}function Ur(e,n){e=String(e),n=n||{},e.length!==0&&(e.charCodeAt(e.length-1)!==10&&e.charCodeAt(e.length-1)!==13&&(e+=`
`),e.charCodeAt(0)===65279&&(e=e.slice(1)));var t=new na(e,n),o=e.indexOf("\0");for(o!==-1&&(t.position=o,j(t,"null byte is not allowed in input")),t.input+="\0";t.input.charCodeAt(t.position)===32;)t.lineIndent+=1,t.position+=1;for(;t.position<t.length-1;)fa(t);return t.documents}function pa(e,n,t){n!==null&&typeof n=="object"&&typeof t>"u"&&(t=n,n=null);var o=Ur(e,t);if(typeof n!="function")return o;for(var r=0,i=o.length;r<i;r+=1)n(o[r])}function ma(e,n){var t=Ur(e,n);if(t.length!==0){if(t.length===1)return t[0];throw new V("expected a single document in the stream, but found more")}}var da=pa,ya=ma,Vr={loadAll:da,load:ya},qr=Object.prototype.toString,Br=Object.prototype.hasOwnProperty,Jn=65279,ga=9,Ue=10,ha=13,ba=32,$a=33,Sa=34,Fn=35,Ta=37,xa=38,Aa=39,ja=42,Jr=44,Oa=45,sn=58,ka=61,Na=62,wa=63,va=64,Wr=91,Zr=93,Ca=96,Kr=123,Ra=124,Hr=125,P={};P[0]="\\0";P[7]="\\a";P[8]="\\b";P[9]="\\t";P[10]="\\n";P[11]="\\v";P[12]="\\f";P[13]="\\r";P[27]="\\e";P[34]='\\"';P[92]="\\\\";P[133]="\\N";P[160]="\\_";P[8232]="\\L";P[8233]="\\P";var _a=["y","Y","yes","Yes","YES","on","On","ON","n","N","no","No","NO","off","Off","OFF"],Ea=/^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;function Ia(e,n){var t,o,r,i,s,a,l;if(n===null)return{};for(t={},o=Object.keys(n),r=0,i=o.length;r<i;r+=1)s=o[r],a=String(n[s]),s.slice(0,2)==="!!"&&(s="tag:yaml.org,2002:"+s.slice(2)),l=e.compiledTypeMap.fallback[s],l&&Br.call(l.styleAliases,a)&&(a=l.styleAliases[a]),t[s]=a;return t}function Ma(e){var n,t,o;if(n=e.toString(16).toUpperCase(),e<=255)t="x",o=2;else if(e<=65535)t="u",o=4;else if(e<=4294967295)t="U",o=8;else throw new V("code point within a string may not be greater than 0xFFFFFFFF");return"\\"+t+F.repeat("0",o-n.length)+n}var La=1,Ve=2;function za(e){this.schema=e.schema||Vn,this.indent=Math.max(1,e.indent||2),this.noArrayIndent=e.noArrayIndent||!1,this.skipInvalid=e.skipInvalid||!1,this.flowLevel=F.isNothing(e.flowLevel)?-1:e.flowLevel,this.styleMap=Ia(this.schema,e.styles||null),this.sortKeys=e.sortKeys||!1,this.lineWidth=e.lineWidth||80,this.noRefs=e.noRefs||!1,this.noCompatMode=e.noCompatMode||!1,this.condenseFlow=e.condenseFlow||!1,this.quotingType=e.quotingType==='"'?Ve:La,this.forceQuotes=e.forceQuotes||!1,this.replacer=typeof e.replacer=="function"?e.replacer:null,this.implicitTypes=this.schema.compiledImplicit,this.explicitTypes=this.schema.compiledExplicit,this.tag=null,this.result="",this.duplicates=[],this.usedDuplicates=null}function sr(e,n){for(var t=F.repeat(" ",n),o=0,r=-1,i="",s,a=e.length;o<a;)r=e.indexOf(`
`,o),r===-1?(s=e.slice(o),o=a):(s=e.slice(o,r+1),o=r+1),s.length&&s!==`
`&&(i+=t),i+=s;return i}function Dn(e,n){return`
`+F.repeat(" ",e.indent*n)}function Fa(e,n){var t,o,r;for(t=0,o=e.implicitTypes.length;t<o;t+=1)if(r=e.implicitTypes[t],r.resolve(n))return!0;return!1}function on(e){return e===ba||e===ga}function qe(e){return 32<=e&&e<=126||161<=e&&e<=55295&&e!==8232&&e!==8233||57344<=e&&e<=65533&&e!==Jn||65536<=e&&e<=1114111}function or(e){return qe(e)&&e!==Jn&&e!==ha&&e!==Ue}function ar(e,n,t){var o=or(e),r=o&&!on(e);return(t?o:o&&e!==Jr&&e!==Wr&&e!==Zr&&e!==Kr&&e!==Hr)&&e!==Fn&&!(n===sn&&!r)||or(n)&&!on(n)&&e===Fn||n===sn&&r}function Da(e){return qe(e)&&e!==Jn&&!on(e)&&e!==Oa&&e!==wa&&e!==sn&&e!==Jr&&e!==Wr&&e!==Zr&&e!==Kr&&e!==Hr&&e!==Fn&&e!==xa&&e!==ja&&e!==$a&&e!==Ra&&e!==ka&&e!==Na&&e!==Aa&&e!==Sa&&e!==Ta&&e!==va&&e!==Ca}function Ga(e){return!on(e)&&e!==sn}function Ge(e,n){var t=e.charCodeAt(n),o;return t>=55296&&t<=56319&&n+1<e.length&&(o=e.charCodeAt(n+1),o>=56320&&o<=57343)?(t-55296)*1024+o-56320+65536:t}function Yr(e){var n=/^\n* /;return n.test(e)}var Qr=1,Gn=2,Xr=3,ei=4,ke=5;function Pa(e,n,t,o,r,i,s,a){var l,c=0,f=null,u=!1,p=!1,m=o!==-1,d=-1,y=Da(Ge(e,0))&&Ga(Ge(e,e.length-1));if(n||s)for(l=0;l<e.length;c>=65536?l+=2:l++){if(c=Ge(e,l),!qe(c))return ke;y=y&&ar(c,f,a),f=c}else{for(l=0;l<e.length;c>=65536?l+=2:l++){if(c=Ge(e,l),c===Ue)u=!0,m&&(p=p||l-d-1>o&&e[d+1]!==" ",d=l);else if(!qe(c))return ke;y=y&&ar(c,f,a),f=c}p=p||m&&l-d-1>o&&e[d+1]!==" "}return!u&&!p?y&&!s&&!r(e)?Qr:i===Ve?ke:Gn:t>9&&Yr(e)?ke:s?i===Ve?ke:Gn:p?ei:Xr}function Ua(e,n,t,o,r){e.dump=(function(){if(n.length===0)return e.quotingType===Ve?'""':"''";if(!e.noCompatMode&&(_a.indexOf(n)!==-1||Ea.test(n)))return e.quotingType===Ve?'"'+n+'"':"'"+n+"'";var i=e.indent*Math.max(1,t),s=e.lineWidth===-1?-1:Math.max(Math.min(e.lineWidth,40),e.lineWidth-i),a=o||e.flowLevel>-1&&t>=e.flowLevel;function l(c){return Fa(e,c)}switch(Pa(n,a,e.indent,s,l,e.quotingType,e.forceQuotes&&!o,r)){case Qr:return n;case Gn:return"'"+n.replace(/'/g,"''")+"'";case Xr:return"|"+lr(n,e.indent)+cr(sr(n,i));case ei:return">"+lr(n,e.indent)+cr(sr(Va(n,s),i));case ke:return'"'+qa(n)+'"';default:throw new V("impossible error: invalid scalar style")}})()}function lr(e,n){var t=Yr(e)?String(n):"",o=e[e.length-1]===`
`,r=o&&(e[e.length-2]===`
`||e===`
`),i=r?"+":o?"":"-";return t+i+`
`}function cr(e){return e[e.length-1]===`
`?e.slice(0,-1):e}function Va(e,n){for(var t=/(\n+)([^\n]*)/g,o=(function(){var c=e.indexOf(`
`);return c=c!==-1?c:e.length,t.lastIndex=c,ur(e.slice(0,c),n)})(),r=e[0]===`
`||e[0]===" ",i,s;s=t.exec(e);){var a=s[1],l=s[2];i=l[0]===" ",o+=a+(!r&&!i&&l!==""?`
`:"")+ur(l,n),r=i}return o}function ur(e,n){if(e===""||e[0]===" ")return e;for(var t=/ [^ ]/g,o,r=0,i,s=0,a=0,l="";o=t.exec(e);)a=o.index,a-r>n&&(i=s>r?s:a,l+=`
`+e.slice(r,i),r=i+1),s=a;return l+=`
`,e.length-r>n&&s>r?l+=e.slice(r,s)+`
`+e.slice(s+1):l+=e.slice(r),l.slice(1)}function qa(e){for(var n="",t=0,o,r=0;r<e.length;t>=65536?r+=2:r++)t=Ge(e,r),o=P[t],!o&&qe(t)?(n+=e[r],t>=65536&&(n+=e[r+1])):n+=o||Ma(t);return n}function Ba(e,n,t){var o="",r=e.tag,i,s,a;for(i=0,s=t.length;i<s;i+=1)a=t[i],e.replacer&&(a=e.replacer.call(t,String(i),a)),(ie(e,n,a,!1,!1)||typeof a>"u"&&ie(e,n,null,!1,!1))&&(o!==""&&(o+=","+(e.condenseFlow?"":" ")),o+=e.dump);e.tag=r,e.dump="["+o+"]"}function fr(e,n,t,o){var r="",i=e.tag,s,a,l;for(s=0,a=t.length;s<a;s+=1)l=t[s],e.replacer&&(l=e.replacer.call(t,String(s),l)),(ie(e,n+1,l,!0,!0,!1,!0)||typeof l>"u"&&ie(e,n+1,null,!0,!0,!1,!0))&&((!o||r!=="")&&(r+=Dn(e,n)),e.dump&&Ue===e.dump.charCodeAt(0)?r+="-":r+="- ",r+=e.dump);e.tag=i,e.dump=r||"[]"}function Ja(e,n,t){var o="",r=e.tag,i=Object.keys(t),s,a,l,c,f;for(s=0,a=i.length;s<a;s+=1)f="",o!==""&&(f+=", "),e.condenseFlow&&(f+='"'),l=i[s],c=t[l],e.replacer&&(c=e.replacer.call(t,l,c)),ie(e,n,l,!1,!1)&&(e.dump.length>1024&&(f+="? "),f+=e.dump+(e.condenseFlow?'"':"")+":"+(e.condenseFlow?"":" "),ie(e,n,c,!1,!1)&&(f+=e.dump,o+=f));e.tag=r,e.dump="{"+o+"}"}function Wa(e,n,t,o){var r="",i=e.tag,s=Object.keys(t),a,l,c,f,u,p;if(e.sortKeys===!0)s.sort();else if(typeof e.sortKeys=="function")s.sort(e.sortKeys);else if(e.sortKeys)throw new V("sortKeys must be a boolean or a function");for(a=0,l=s.length;a<l;a+=1)p="",(!o||r!=="")&&(p+=Dn(e,n)),c=s[a],f=t[c],e.replacer&&(f=e.replacer.call(t,c,f)),ie(e,n+1,c,!0,!0,!0)&&(u=e.tag!==null&&e.tag!=="?"||e.dump&&e.dump.length>1024,u&&(e.dump&&Ue===e.dump.charCodeAt(0)?p+="?":p+="? "),p+=e.dump,u&&(p+=Dn(e,n)),ie(e,n+1,f,!0,u)&&(e.dump&&Ue===e.dump.charCodeAt(0)?p+=":":p+=": ",p+=e.dump,r+=p));e.tag=i,e.dump=r||"{}"}function pr(e,n,t){var o,r,i,s,a,l;for(r=t?e.explicitTypes:e.implicitTypes,i=0,s=r.length;i<s;i+=1)if(a=r[i],(a.instanceOf||a.predicate)&&(!a.instanceOf||typeof n=="object"&&n instanceof a.instanceOf)&&(!a.predicate||a.predicate(n))){if(t?a.multi&&a.representName?e.tag=a.representName(n):e.tag=a.tag:e.tag="?",a.represent){if(l=e.styleMap[a.tag]||a.defaultStyle,qr.call(a.represent)==="[object Function]")o=a.represent(n,l);else if(Br.call(a.represent,l))o=a.represent[l](n,l);else throw new V("!<"+a.tag+'> tag resolver accepts not "'+l+'" style');e.dump=o}return!0}return!1}function ie(e,n,t,o,r,i,s){e.tag=null,e.dump=t,pr(e,t,!1)||pr(e,t,!0);var a=qr.call(e.dump),l=o,c;o&&(o=e.flowLevel<0||e.flowLevel>n);var f=a==="[object Object]"||a==="[object Array]",u,p;if(f&&(u=e.duplicates.indexOf(t),p=u!==-1),(e.tag!==null&&e.tag!=="?"||p||e.indent!==2&&n>0)&&(r=!1),p&&e.usedDuplicates[u])e.dump="*ref_"+u;else{if(f&&p&&!e.usedDuplicates[u]&&(e.usedDuplicates[u]=!0),a==="[object Object]")o&&Object.keys(e.dump).length!==0?(Wa(e,n,e.dump,r),p&&(e.dump="&ref_"+u+e.dump)):(Ja(e,n,e.dump),p&&(e.dump="&ref_"+u+" "+e.dump));else if(a==="[object Array]")o&&e.dump.length!==0?(e.noArrayIndent&&!s&&n>0?fr(e,n-1,e.dump,r):fr(e,n,e.dump,r),p&&(e.dump="&ref_"+u+e.dump)):(Ba(e,n,e.dump),p&&(e.dump="&ref_"+u+" "+e.dump));else if(a==="[object String]")e.tag!=="?"&&Ua(e,e.dump,n,i,l);else{if(a==="[object Undefined]")return!1;if(e.skipInvalid)return!1;throw new V("unacceptable kind of an object to dump "+a)}e.tag!==null&&e.tag!=="?"&&(c=encodeURI(e.tag[0]==="!"?e.tag.slice(1):e.tag).replace(/!/g,"%21"),e.tag[0]==="!"?c="!"+c:c.slice(0,18)==="tag:yaml.org,2002:"?c="!!"+c.slice(18):c="!<"+c+">",e.dump=c+" "+e.dump)}return!0}function Za(e,n){var t=[],o=[],r,i;for(Pn(e,t,o),r=0,i=o.length;r<i;r+=1)n.duplicates.push(t[o[r]]);n.usedDuplicates=new Array(i)}function Pn(e,n,t){var o,r,i;if(e!==null&&typeof e=="object")if(r=n.indexOf(e),r!==-1)t.indexOf(r)===-1&&t.push(r);else if(n.push(e),Array.isArray(e))for(r=0,i=e.length;r<i;r+=1)Pn(e[r],n,t);else for(o=Object.keys(e),r=0,i=o.length;r<i;r+=1)Pn(e[o[r]],n,t)}function Ka(e,n){n=n||{};var t=new za(n);t.noRefs||Za(e,t);var o=e;return t.replacer&&(o=t.replacer.call({"":o},"",o)),ie(t,0,o,!0,!0)?t.dump+`
`:""}var Ha=Ka,Ya={dump:Ha};function Wn(e,n){return function(){throw new Error("Function yaml."+e+" is removed in js-yaml 4. Use yaml."+n+" instead, which is now safe by default.")}}var Qa=G,Xa=yr,el=$r,nl=jr,tl=Or,rl=Vn,il=Vr.load,sl=Vr.loadAll,ol=Ya.dump,al=V,ll={binary:Cr,float:Ar,map:br,null:Sr,pairs:_r,set:Er,timestamp:wr,bool:Tr,int:xr,merge:vr,omap:Rr,seq:hr,str:gr},cl=Wn("safeLoad","load"),ul=Wn("safeLoadAll","loadAll"),fl=Wn("safeDump","dump"),Be={Type:Qa,Schema:Xa,FAILSAFE_SCHEMA:el,JSON_SCHEMA:nl,CORE_SCHEMA:tl,DEFAULT_SCHEMA:rl,load:il,loadAll:sl,dump:ol,YAMLException:al,types:ll,safeLoad:cl,safeLoadAll:ul,safeDump:fl};var A=e=>e.replace(/(^\w|[_\s-]\w)/g,n=>n.replace(/[_\s-]/,"").toUpperCase()),O=e=>e.replace(/([A-Z])/g,"_$1").toLowerCase().replace(/^_/,""),Ke=e=>{let n=A(e);return n.charAt(0).toLowerCase()+n.slice(1)},Ce=e=>O(e).toUpperCase(),I=e=>/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(e)?e:JSON.stringify(e),k=e=>e.type==="array"&&e.itemType?e.itemType.fields??{}:e.fields??{},be=e=>e.type==="array"&&e.itemType?e.itemType:e,Hn=(e,n="postgres")=>{if(e.type==="number"){let t=e.format==="int";return n==="sqlite"?t?"INTEGER":"REAL":n==="mysql"?t?"BIGINT":"DOUBLE":t?"BIGINT":"DOUBLE PRECISION"}return e.type==="boolean"?n==="mysql"?"TINYINT(1)":"BOOLEAN":e.type==="object"||e.type==="array"||e.type==="union"?n==="postgres"?"JSONB":"JSON":e.format==="uuid"?n==="mysql"?"CHAR(36)":"UUID":e.format==="email"?"VARCHAR(255)":e.format==="url"?"TEXT":e.format==="datetime"?"TIMESTAMP":"VARCHAR(255)"},ti={generate:e=>{let n=k(e);if(!Object.keys(n).length)return"";let t=Object.keys(n).join(","),o=Object.entries(n).map(([,r])=>r.type==="number"?"0":r.type==="boolean"?"true":r.format==="uuid"?"uuid-xxxx-xxxx":r.format==="email"?"user@example.com":r.format==="url"?"https://example.com":r.format==="datetime"?new Date().toISOString():r.type==="object"&&r.fields?`"${JSON.stringify(Object.fromEntries(Object.entries(r.fields).map(([i,s])=>[i,s.type==="number"?0:s.type==="boolean"?!1:"sample"]))).replace(/"/g,'""')}"`:r.type==="array"?'"[]"':'"sample_value"').join(",");return`${t}
${o}
`}},ri={generate:(e,n="table_name")=>{let t=k(e);if(!Object.keys(t).length)return"";let o=Object.keys(t).map(i=>`"${i}"`).join(", "),r=Object.entries(t).map(([,i])=>{if(i.type==="number")return"0";if(i.type==="boolean")return"TRUE";if(i.format==="uuid")return"'uuid-xxxx-xxxx'";if(i.format==="email")return"'user@example.com'";if(i.format==="datetime")return`'${new Date().toISOString()}'`;if(i.type==="object"&&i.fields){let s=Object.fromEntries(Object.entries(i.fields).map(([a,l])=>[a,l.type==="number"?0:l.type==="boolean"?!1:"sample"]));return`'${JSON.stringify(s).replace(/'/g,"''")}'`}return i.type==="array"?"'[]'":"'sample_value'"}).join(", ");return`INSERT INTO "${O(n)}" (${o})
VALUES (${r});
`}},ii={generate:(e,n="Root")=>{let t=k(e);if(!Object.keys(t).length)return"";let o="id"in t,r="created_at"in t||"createdAt"in t,i="updated_at"in t||"updatedAt"in t,s=`CREATE TABLE \`${O(n)}\` (
`;o||(s+="  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,\n");for(let[a,l]of Object.entries(t)){let c=l.optional?" NULL":" NOT NULL",f=a.toLowerCase()==="id",u=f&&l.type==="number"?" AUTO_INCREMENT":"",p=f?" PRIMARY KEY":"";s+=`  \`${O(a)}\` ${Hn(l,"mysql")}${c}${u}${p},
`}return r||(s+="  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n"),i?s=s.replace(/,\s*$/,`
`):s+="  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP\n",s+=`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`,s}},si={generate:(e,n="Root")=>{let t=k(e);if(!Object.keys(t).length)return"";let o="id"in t,r="created_at"in t||"createdAt"in t,i="updated_at"in t||"updatedAt"in t,a=`CREATE TABLE "${O(n)}" (
`;o||(a+=`  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
`);for(let[l,c]of Object.entries(t)){let f=c.optional?"":" NOT NULL",p=l.toLowerCase()==="id"?" PRIMARY KEY":"";a+=`  "${O(l)}" ${Hn(c,"postgres")}${f}${p},
`}return r||(a+=`  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
`),i?a=a.replace(/,\s*$/,`
`):a+=`  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
`,a+=`);
`,a}},oi={generate:(e,n="Root")=>{let t=k(e);if(!Object.keys(t).length)return"";let o="id"in t,r="created_at"in t||"createdAt"in t,i="updated_at"in t||"updatedAt"in t,s=`CREATE TABLE IF NOT EXISTS "${O(n)}" (
`;o||(s+=`  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
`);for(let[a,l]of Object.entries(t)){let c=l.optional?"":" NOT NULL",u=a.toLowerCase()==="id"?" PRIMARY KEY":"";s+=`  "${O(a)}" ${Hn(l,"sqlite")}${c}${u},
`}return r||(s+=`  "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
`),i?s=s.replace(/,\s*$/,`
`):s+=`  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
`,s+=`);
`,s}},ai={generate:(e,n="Root")=>{let t=k(e);if(!Object.keys(t).length)return"";let o="id"in t,r="created_at"in t||"createdAt"in t,i=`CREATE OR REPLACE TABLE ${Ce(n)} (
`;o||(i+=`  ID VARCHAR(36) NOT NULL DEFAULT UUID_STRING(),
`);for(let[s,a]of Object.entries(t)){let l=Ce(s),c="VARCHAR";a.type==="number"?c="DOUBLE":a.type==="boolean"?c="BOOLEAN":a.type==="object"||a.type==="array"?c="VARIANT":a.format==="datetime"&&(c="TIMESTAMP_NTZ"),i+=`  ${l} ${c}${a.optional?"":" NOT NULL"},
`}return r?i=i.replace(/,\s*$/,`
`):i+=`  CREATED_AT TIMESTAMP_NTZ NOT NULL DEFAULT CURRENT_TIMESTAMP()
`,i+=`);
`,i}},li={generate:(e,n="config")=>{let t=k(e);if(!Object.keys(t).length)return"";let o=`[${O(n)}]
`;for(let[r,i]of Object.entries(t))if(i.type==="object"&&i.fields){o+=`
[${O(n)}.${O(r)}]
`;for(let[s,a]of Object.entries(i.fields))o+=`${O(s)} = ${ni(a)}
`}else if(i.type==="array"){let s=i.itemType?.type,a=s==="number"?"0":s==="boolean"?"false":'"sample_value"';o+=`${O(r)} = [${a}]
`}else o+=`${O(r)} = ${ni(i)}
`;return o}},ni=e=>e.type==="number"?"0":e.type==="boolean"?"false":e.format==="datetime"?'"2024-01-01T00:00:00Z"':'"sample_value"',ci={generate:e=>{let n=t=>t.type==="object"&&t.fields?Object.fromEntries(Object.entries(t.fields).map(([o,r])=>[o,n(r)])):t.type==="array"?[n(t.itemType??{type:"string"})]:t.type==="number"?0:t.type==="boolean"?!1:t.format==="uuid"?"uuid-xxxx-xxxx":t.format==="email"?"user@example.com":t.format==="url"?"https://example.com":t.format==="datetime"?"2024-01-01T00:00:00Z":"sample_value";return Be.dump(n(e),{indent:2})}},ui={generate:e=>{let n=k(e);if(!Object.keys(n).length)return"";let t=(r,i)=>{let s="";for(let[a,l]of Object.entries(r)){let c=Ce(i?`${i}_${a}`:a);if(l.type==="object"&&l.fields)s+=t(l.fields,i?`${i}_${a}`:a);else if(l.type==="array")s+=`${c}=
`;else{let f="your_value_here";l.type==="number"?f="0":l.type==="boolean"?f="false":l.format==="uuid"?f="uuid-xxxx-xxxx-xxxx-xxxxxxxxxxxx":l.format==="email"?f="user@example.com":l.format==="url"?f="https://example.com":l.format==="datetime"&&(f="2024-01-01T00:00:00Z"),s+=`${c}=${f}
`}}return s},o=`# Generated by TypeMorph
`;return o+=t(n,""),o}},fi={generate:e=>{let n=k(e);if(!Object.keys(n).length)return"";let t=(r,i)=>{let s=I(r);if(i.type==="boolean")return`  ${s}: z.enum(["true", "false"]).transform(v => v === "true")`;if(i.type==="number"){let l=i.format==="int"?".int()":"";return`  ${s}: z.coerce.number()${l}`}if(i.format==="url")return`  ${s}: z.url()`;if(i.format==="email")return`  ${s}: z.email()`;let a=i.optional?".optional()":"";return`  ${s}: z.string()${a}`};return`import { z } from "zod";

export const envSchema = z.object({
${Object.entries(n).map(([r,i])=>t(r,i)).join(`,
`)},
});

export type Env = z.infer<typeof envSchema>;

// Throws at startup if any env var is missing or invalid
export const env = envSchema.parse(process.env);`}},pi={generate:e=>{let n=k(e);if(!Object.keys(n).length)return"";let t=(r,i)=>{let s="";for(let[a,l]of Object.entries(r)){let c=(i?`${i}.${O(a)}`:O(a)).replace(/_/g,".");if(l.type==="object"&&l.fields)s+=t(l.fields,c);else if(l.type==="array")s+=`${c}=
`;else{let f="sample_value";l.type==="number"?f="0":l.type==="boolean"?f="false":l.format==="datetime"&&(f="2024-01-01T00:00:00Z"),s+=`${c}=${f}
`}}return s},o=`# Generated by TypeMorph
`;return o+=t(n,""),o}},mi={generate:e=>{let n=k(e);if(!Object.keys(n).length)return"";let t=Object.keys(n),o=`| ${t.join(" | ")} |`,r=`| ${t.map(()=>"---").join(" | ")} |`,i=`| ${Object.entries(n).map(([,s])=>s.type==="number"?"0":s.type==="boolean"?"true":s.format==="email"?"user@example.com":s.type==="object"&&s.fields?"`"+JSON.stringify(Object.fromEntries(Object.entries(s.fields).map(([a,l])=>[a,l.type==="number"?0:l.type==="boolean"?!1:"sample"])))+"`":s.type==="array"?"`[]`":"sample").join(" | ")} |`;return`${o}
${r}
${i}
`}},di={generate:e=>{let n=k(e);if(!Object.keys(n).length)return"";let t=Object.keys(n),o=`[cols="${t.map(()=>"1").join(",")}",options="header"]
|===
`;return o+=`| ${t.join(" | ")}
`,o+=`| ${Object.entries(n).map(([,r])=>r.type==="number"?"0":"sample").join(" | ")}
`,o+=`|===
`,o}},yi={generate:e=>{let n=k(e);if(!Object.keys(n).length)return"";let t=Object.keys(n),o=`\\begin{tabular}{${t.map(()=>"l").join("|")}}
`;return o+=`\\hline
`,o+=t.join(" & ")+` \\\\
\\hline
`,o+=Object.entries(n).map(([,r])=>r.type==="number"?"0":r.type==="boolean"?"false":r.type==="object"?"\\{...\\}":r.type==="array"?"[...]":r.format==="email"?"user@example.com":r.format==="datetime"?"2024-01-01T00:00:00Z":"sample\\_value").join(" & ")+` \\\\
`,o+=`\\hline
\\end{tabular}
`,o}},gi={generate:(e,n="Root")=>{let t=k(e);if(!Object.keys(t).length)return"";let o=`erDiagram
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
`)}return o}},Je=e=>e.type==="number"?"double":e.type==="boolean"?"boolean":e.type==="object"&&e.fields?{type:"record",name:"NestedRecord",fields:Object.entries(e.fields).map(([n,t])=>({name:n,type:t.optional?["null",Je(t)]:Je(t)}))}:e.type==="array"?{type:"array",items:Je(e.itemType??{type:"string"})}:e.type==="union"&&e.unionTypes?e.unionTypes.map(n=>n==="number"?"double":n):"string",hi={generate:(e,n="Root")=>{let t=k(e);if(!Object.keys(t).length)return"";let o={type:"record",name:A(n),namespace:"com.example",fields:Object.entries(t).map(([r,i])=>({name:r,type:i.optional?["null",Je(i)]:Je(i),default:i.optional?null:void 0}))};return JSON.stringify(o,null,2)}},ln=(e,n)=>{let t=n.optional?"NULLABLE":"REQUIRED";if(n.type==="number")return{name:e,type:"FLOAT64",mode:t};if(n.type==="boolean")return{name:e,type:"BOOL",mode:t};if(n.format==="datetime")return{name:e,type:"TIMESTAMP",mode:t};if(n.type==="object"&&n.fields)return{name:e,type:"RECORD",mode:t,fields:Object.entries(n.fields).map(([o,r])=>ln(o,r))};if(n.type==="array"){let o=n.itemType??{type:"string"};return o.type==="object"&&o.fields?{name:e,type:"RECORD",mode:"REPEATED",fields:Object.entries(o.fields).map(([r,i])=>ln(r,i))}:{name:e,type:ln("_item",o).type,mode:"REPEATED"}}return{name:e,type:"STRING",mode:t}},bi={generate:e=>{let n=k(e);if(!Object.keys(n).length)return"";let t=Object.entries(n).map(([o,r])=>ln(o,r));return JSON.stringify(t,null,2)}},Zn=e=>{if(e.type==="number")return{N:"0"};if(e.type==="boolean")return{BOOL:!1};if(e.type==="array"){let n=e.itemType??{type:"string"};return{L:[Zn(n)]}}return e.type==="object"&&e.fields?{M:Object.fromEntries(Object.entries(e.fields).map(([n,t])=>[n,Zn(t)]))}:e.type==="object"?{M:{}}:e.format==="datetime"?{S:"2024-01-01T00:00:00Z"}:e.format==="uuid"?{S:"uuid-xxxx-xxxx"}:e.format==="email"?{S:"user@example.com"}:e.format==="url"?{S:"https://example.com"}:{S:"sample_value"}},$i={generate:(e,n="Root")=>{let t=k(e);if(!Object.keys(t).length)return"";let o={TableName:O(n)+"s",Item:{id:{S:"uuid-xxxx-xxxx"},...Object.fromEntries(Object.entries(t).map(([r,i])=>[r,Zn(i)]))}};return JSON.stringify(o,null,2)}},Kn=e=>{if(e.type==="union"&&e.unionTypes){let t={anyOf:e.unionTypes.map(o=>({type:o}))};return e.nullable&&(t.nullable=!0),t}if(e.type==="number"){let t={type:"number",format:"double"};return e.enumValues&&e.enumValues.length&&(t.enum=e.enumValues),e.nullable&&(t.nullable=!0),t}if(e.type==="boolean")return e.nullable?{type:"boolean",nullable:!0}:{type:"boolean"};if(e.type==="array"){let t={type:"array",items:Kn(e.itemType??{type:"string"})};return e.nullable&&(t.nullable=!0),t}if(e.type==="object"&&e.fields){let t={type:"object",properties:Object.fromEntries(Object.entries(e.fields).map(([o,r])=>[o,Kn(r)]))};return e.nullable&&(t.nullable=!0),t}let n={type:"string"};return e.format==="uuid"?n.format="uuid":e.format==="email"?n.format="email":e.format==="url"?n.format="uri":e.format==="datetime"&&(n.type="string",n.format="date-time"),e.enumValues&&e.enumValues.length&&(n.enum=e.enumValues),e.nullable&&(n.nullable=!0),n},Si={generate:(e,n="Root")=>{let t=k(e),o=A(n),r=Object.entries(t).filter(([,s])=>!s.optional).map(([s])=>s),i={openapi:"3.0.3",info:{title:`${o} API`,version:"1.0.0"},paths:{[`/${O(n)}s`]:{get:{summary:`List ${o}s`,responses:{200:{description:"Success",content:{"application/json":{schema:{type:"array",items:{$ref:`#/components/schemas/${o}`}}}}}}},post:{summary:`Create ${o}`,requestBody:{required:!0,content:{"application/json":{schema:{$ref:`#/components/schemas/${o}`}}}},responses:{201:{description:"Created"}}}}},components:{schemas:{[o]:{type:"object",...r.length?{required:r}:{},properties:Object.fromEntries(Object.entries(t).map(([s,a])=>[s,Kn(a)]))}}}};return Be.dump(i,{indent:2})}},Ti={generate:(e,n="Root")=>{let t=A(n),o=`https://api.example.com/${O(n)}s`,r={info:{name:`${t} API`,schema:"https://schema.getpostman.com/json/collection/v2.1.0/"},item:[{name:`GET all ${t}s`,request:{method:"GET",url:{raw:o}}},{name:`POST create ${t}`,request:{method:"POST",url:{raw:o},header:[{key:"Content-Type",value:"application/json"}],body:{mode:"raw",raw:"{}"}}},{name:`GET ${t} by ID`,request:{method:"GET",url:{raw:`${o}/:id`}}},{name:`PUT update ${t}`,request:{method:"PUT",url:{raw:`${o}/:id`}}},{name:`DELETE ${t}`,request:{method:"DELETE",url:{raw:`${o}/:id`}}}]};return JSON.stringify(r,null,2)}},xi={generate:(e,n="Root")=>{let t=`https://api.example.com/${O(n)}s`,o=k(e),r=JSON.stringify(Object.fromEntries(Object.entries(o).map(([i,s])=>[i,s.type==="number"?0:s.type==="boolean"?!1:"sample"])),null,2);return[`### Get all ${n}s`,`GET ${t}`,"Accept: application/json","","###","",`### Create ${n}`,`POST ${t}`,"Content-Type: application/json","",r,"","###","",`### Get ${n} by ID`,`GET ${t}/{{id}}`,"","###"].join(`
`)}},Ai={generate:(e,n="Root")=>{let t=k(e),o=Object.keys(t),r=1,i=["{",...o.map(a=>{let l=t[a],c=l.type==="number"?"0":l.type==="boolean"?"false":`\${${r++}:${a}}`;return`  "${a}": ${l.type==="string"||l.format?`"${c}"`:c},`}),"}"],s={[`${A(n)} Scaffold`]:{prefix:`${n.toLowerCase()}-scaffold`,body:i,description:`Generated by TypeMorph: ${A(n)} scaffold`}};return JSON.stringify(s,null,2)}},ji={generate:(e,n="Root")=>{let t=k(e),o=i=>i.type==="number"?0:i.type==="boolean"?!1:i.type==="object"&&i.fields?Object.fromEntries(Object.entries(i.fields).map(([s,a])=>[s,o(a)])):i.type==="array"?i.itemType?[o(i.itemType)]:[]:i.format==="uuid"?"uuid-xxxx-xxxx":i.format==="email"?"user@example.com":i.format==="url"?"https://example.com":i.format==="datetime"?"2024-01-01T00:00:00Z":"sample",r=JSON.stringify(Object.fromEntries(Object.entries(t).map(([i,s])=>[i,o(s)])),null,2);return`curl -X POST https://api.example.com/${O(n)}s \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -d '${r}'
`}},Oi={generate:(e,n="Root")=>{e=be(e);let t=A(n),o=`${t}Schema`,r=(i,s="  ",a=0)=>{if(a>4)return"Schema.Types.Mixed";let l=k(i),c=`{
`;for(let[f,u]of Object.entries(l))if(c+=`${s}  ${I(f)}: `,u.type==="object")c+=r(u,s+"  ",a+1)+`,
`;else if(u.type==="array"){let p=u.itemType;if(p?.type==="object")c+=`[${r(p,s+"  ",a+1)}],
`;else{let m="String";p?.type==="number"?m="Number":p?.type==="boolean"?m="Boolean":p?.type==="union"||p?.type==="any"?m="Schema.Types.Mixed":p?.enumValues&&p.enumValues.length&&(m="String"),c+=`[${m}],
`}}else{let p="String";u.type==="number"?p="Number":u.type==="boolean"?p="Boolean":u.type==="union"&&(p="Schema.Types.Mixed");let m=`type: ${p}`;u.optional||(m+=", required: true"),u.enumValues&&u.enumValues.length&&(m+=`, enum: [${u.enumValues.map(d=>`"${d}"`).join(", ")}]`),c+=`{ ${m} },
`}return c+=`${s}}`,c};if(e.type==="object"){let i=`import mongoose, { Schema, Document } from 'mongoose';

`;return i+=`const ${o} = new Schema(${r(e)}, { timestamps: true });

`,i+=`export interface I${t} extends Document {}
`,i+=`export const ${t} = mongoose.models.${t} || mongoose.model<I${t}>('${t}', ${o});
`,i}return""}},ki={generate:(e,n="Root")=>{let t=k(e);if(!Object.keys(t).length)return"";let o=A(n),r=`import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

`;r+=`export class ${o} extends Model {}

`,r+=`${o}.init({
`,r+=`  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
`;for(let[i,s]of Object.entries(t)){let a="DataTypes.STRING";s.type==="number"?a="DataTypes.DOUBLE":s.type==="boolean"?a="DataTypes.BOOLEAN":s.type==="object"||s.type==="array"||s.type==="union"?a="DataTypes.JSON":s.format==="datetime"&&(a="DataTypes.DATE"),s.enumValues&&s.enumValues.length&&(a=`DataTypes.ENUM(${s.enumValues.map(l=>`'${l}'`).join(", ")})`),r+=`  ${I(i)}: {
    type: ${a},
    allowNull: ${!!s.optional||!!s.nullable}
  },
`}return r+=`}, {
  sequelize,
  modelName: '${o}',
  tableName: '${O(n)}s',
  timestamps: true
});
`,r}},Ni={generate:(e,n="Root")=>{let t=k(e);if(!Object.keys(t).length)return"";let o=A(n),r=`import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

`;r+=`@Entity('${O(n)}s')
`,r+=`export class ${o} {
`,t.id||(r+=`  @PrimaryGeneratedColumn('uuid')
  id!: string;

`);for(let[i,s]of Object.entries(t)){let a="string",l=null;s.type==="number"?(a="number",l="double"):s.type==="boolean"?(a="boolean",l="boolean"):s.type==="object"||s.type==="array"||s.type==="union"?(a="any",l="jsonb"):s.format==="datetime"&&(a="Date",l="timestamp");let c;if(s.enumValues&&s.enumValues.length){a=s.enumValues.map(m=>`'${m}'`).join(" | ");let p=["type: 'enum'",`enum: [${s.enumValues.map(m=>`'${m}'`).join(", ")}]`];s.nullable&&p.push("nullable: true"),c=`@Column({
    ${p.join(`,
    `)}
  })`}else if(s.nullable){let f=[];l&&f.push(`type: '${l}'`),f.push("nullable: true"),c=`@Column({ ${f.join(", ")} })`}else c=l?`@Column('${l}')`:"@Column()";r+=`  ${c}
  ${I(i)}${s.optional?"?":"!"}: ${a}${s.nullable?" | null":""};

`}return!t.createdAt&&!t.created_at&&(r+=`  @CreateDateColumn()
  createdAt!: Date;

`),!t.updatedAt&&!t.updated_at&&(r+=`  @UpdateDateColumn()
  updatedAt!: Date;
`),r+=`}
`,r}},wi={generate:(e,n="Root")=>{let t=k(e);if(!Object.keys(t).length)return"";let o=A(n),r=O(n),i=r.endsWith("s")?r:`${r}s`,s=new Set(["pgTable"]),a=[],l=[],c=[],f=!!t.id,u=!!t.createdAt||!!t.created_at,p=!!t.updatedAt||!!t.updated_at;f||(s.add("uuid"),l.push("  id: uuid('id').defaultRandom().primaryKey()"));for(let[y,g]of Object.entries(t)){let b=O(y),h=y.toLowerCase(),$=!g.optional&&!g.nullable?".notNull()":"",S="";if(y==="id"||h.endsWith("id"))y==="id"&&g.type==="number"?(s.add("serial"),S=`serial('${b}').primaryKey()`):y==="id"?(s.add("uuid"),S=`uuid('${b}').defaultRandom().primaryKey()`):g.type==="number"?(s.add("integer"),S=`integer('${b}')${$}`):(s.add("uuid"),S=`uuid('${b}')${$}`);else if(g.type==="boolean")s.add("boolean"),S=`boolean('${b}')${$}${$?h==="is_active"||h==="isactive"||h==="active"||h==="enabled"||h==="is_enabled"?".default(true)":".default(false)":""}`;else if(g.type==="number"){let T=["price","amount","cost","fee","total","subtotal","balance","payment"].some(N=>h.includes(N)),C=!T&&(g.format==="int"||["count","quantity","qty","age","year","month","day","hour","minute","second","port","rank","size","limit","offset"].some(N=>h.includes(N)));T?(s.add("numeric"),S=`numeric('${b}', { precision: 10, scale: 2 })${$}`):C?(s.add("integer"),S=`integer('${b}')${$}`):(s.add("real"),S=`real('${b}')${$}`)}else if(g.format==="datetime"||h.endsWith("_at")||h==="createdat"||h==="updatedat"||h.includes("timestamp")){s.add("timestamp");let T=h.includes("createdat")||h==="created_at"||h.includes("updatedat")||h==="updated_at"?".defaultNow()":"";S=`timestamp('${b}', { withTimezone: true })${T}${$}`}else if(g.type==="object"||g.type==="array"||g.type==="union")s.add("jsonb"),S=`jsonb('${b}')${$}`,c.push(y);else if(g.enumValues&&g.enumValues.length){s.add("pgEnum");let T=`${Ke(y)}Enum`,C=`${r}_${b}`;a.push(`export const ${T} = pgEnum('${C}', [${g.enumValues.map(N=>`'${N}'`).join(", ")}]);`),S=`${T}('${b}')${$}`}else g.format==="uuid"||h==="uuid"?(s.add("uuid"),S=`uuid('${b}')${$}`):g.format==="email"||h.includes("email")?(s.add("varchar"),S=`varchar('${b}', { length: 255 })${$}.unique()`):g.format==="url"||["url","link","website","endpoint","href"].some(T=>h.includes(T))?(s.add("text"),S=`text('${b}')${$}`):["description","bio","content","body","text","note","summary","detail","about","message","comment","remark","excerpt","caption","overview"].some(T=>h.includes(T))?(s.add("text"),S=`text('${b}')${$}`):(s.add("varchar"),S=`varchar('${b}', { length: 255 })${$}`);l.push(`  ${I(y)}: ${S}`)}u||(s.add("timestamp"),l.push("  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()")),p||(s.add("timestamp"),l.push("  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()"));let d=`import { ${["pgTable",...[...s].filter(y=>y==="pgEnum"),...[...s].filter(y=>y!=="pgTable"&&y!=="pgEnum").sort()].join(", ")} } from 'drizzle-orm/pg-core';
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
`),d}},vi={generate:(e,n="Root")=>{let t=k(e);if(!Object.keys(t).length)return"";let o=A(n),r=[],i=[],s=(c,f)=>{if(f.type==="number")return"number";if(f.type==="boolean")return"boolean";if(f.format==="datetime")return"Date | string";if(f.type==="object"&&f.fields&&Object.keys(f.fields).length){let u=A(c),p=Object.entries(f.fields).map(([d,y])=>`  ${I(d)}: ${s(d,y)};`).join(`
`);r.push(`export interface ${u} {
${p}
}`);let m=O(c).endsWith("s")?O(c):`${O(c)}s`;return i.push(`  ${m}: ${u};`),u}if(f.type==="array"&&f.itemType?.type==="object"&&f.itemType.fields){let u=A(c.replace(/s$/,"")),p=Object.entries(f.itemType.fields).map(([m,d])=>`  ${I(m)}: ${s(m,d)};`).join(`
`);return r.push(`export interface ${u} {
${p}
}`),i.push(`  ${O(c)}: ${u};`),`${u}[]`}return"string"},a=`import { Generated, ColumnType } from 'kysely';

`,l="";t.id||(l+=`  id: Generated<string>;
`);for(let[c,f]of Object.entries(t)){let u=s(c,f),p=f.optional?`${u} | null`:u;l+=`  ${I(c)}: ${p};
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
`,a}},cn={generate:(e,n="root",t=new Set)=>{if(e=be(e),e.type==="object"&&e.fields){if(t.has(n))return"";t.add(n);let o="";t.size===1&&(o+=`import * as yup from 'yup';

`),o+=`export const ${n}YupSchema = yup.object({
`;for(let[r,i]of Object.entries(e.fields)){let s=i.nullable?".nullable()":"",a=i.optional?"":".required()",l=n+A(r),c="";if(i.type==="object")c=`${l}YupSchema`;else if(i.type==="array"){let f=i.itemType,u;f?.type==="string"&&f.enumValues?u=`yup.string().oneOf([${f.enumValues.map(p=>`"${p}"`).join(", ")}])`:u=f?.type==="object"?`${l}ItemYupSchema`:`yup.${f?.type??"string"}()`,c=`yup.array().of(${u})`}else i.type==="union"&&i.unionTypes?c="yup.mixed()":i.type==="string"&&i.enumValues?c=`yup.string().oneOf([${i.enumValues.map(f=>`"${f}"`).join(", ")}])`:i.type==="string"?(c="yup.string()",i.format==="email"?c+=".email()":i.format==="url"?c+=".url()":i.format==="uuid"&&(c+=".uuid()")):c=i.type==="any"?"yup.mixed()":`yup.${i.type}()`;o+=`  ${I(r)}: ${c}${s}${a},
`}o+=`});

`;for(let[r,i]of Object.entries(e.fields)){let s=n+A(r);i.type==="object"&&(o+=cn.generate(i,s,t)),i.type==="array"&&i.itemType?.type==="object"&&(o+=cn.generate(i.itemType,s+"Item",t))}return o}return""}},un={generate:(e,n="root",t=new Set)=>{if(e=be(e),e.type==="object"&&e.fields){if(t.has(n))return"";t.add(n);let o="";t.size===1&&(o+=`import Joi from 'joi';

`),o+=`export const ${n}JoiSchema = Joi.object({
`;for(let[r,i]of Object.entries(e.fields)){let s=i.nullable?".allow(null)":"",a=i.optional?"":".required()",l=n+A(r),c="";if(i.type==="object")c=`${l}JoiSchema`;else if(i.type==="array"){let f=i.itemType,u;f?.type==="string"&&f.enumValues?u=`Joi.string().valid(${f.enumValues.map(p=>`"${p}"`).join(", ")})`:u=f?.type==="object"?`${l}ItemJoiSchema`:`Joi.${f?.type??"string"}()`,c=`Joi.array().items(${u})`}else i.type==="union"&&i.unionTypes?c=`Joi.alternatives().try(${i.unionTypes.map(f=>`Joi.${f}()`).join(", ")})`:i.type==="string"&&i.enumValues?c=`Joi.string().valid(${i.enumValues.map(f=>`"${f}"`).join(", ")})`:i.type==="string"?(c="Joi.string()",i.format==="email"?c+=".email()":i.format==="url"?c+=".uri()":i.format==="uuid"&&(c+=".guid()")):c=`Joi.${i.type}()`;o+=`  ${I(r)}: ${c}${s}${a},
`}o+=`});

`;for(let[r,i]of Object.entries(e.fields)){let s=n+A(r);i.type==="object"&&(o+=un.generate(i,s,t)),i.type==="array"&&i.itemType?.type==="object"&&(o+=un.generate(i.itemType,s+"Item",t))}return o}return""}},fn={generate:(e,n="root",t=new Set)=>{if(e=be(e),e.type==="object"&&e.fields){if(t.has(n))return"";t.add(n);let o="";t.size===1&&(o+=`import * as v from 'valibot';

`),o+=`export const ${n}ValiSchema = v.object({
`;for(let[r,i]of Object.entries(e.fields)){let s=n+A(r),a="";if(i.type==="object")a=`${s}ValiSchema`;else if(i.type==="array"){let l=i.itemType,c;l?.type==="string"&&l.enumValues?c=`v.picklist([${l.enumValues.map(f=>`"${f}"`).join(", ")}])`:c=l?.type==="object"?`${s}ItemValiSchema`:`v.${l?.type??"string"}()`,a=`v.array(${c})`}else i.type==="union"&&i.unionTypes?a=`v.union([${i.unionTypes.map(l=>`v.${l}()`).join(", ")}])`:i.type==="string"&&i.enumValues?a=`v.picklist([${i.enumValues.map(l=>`"${l}"`).join(", ")}])`:i.type==="string"?(a="v.string()",i.format==="email"?a="v.pipe(v.string(), v.email())":i.format==="url"?a="v.pipe(v.string(), v.url())":i.format==="uuid"&&(a="v.pipe(v.string(), v.uuid())")):a=`v.${i.type}()`;i.nullable&&(a=`v.nullable(${a})`),i.optional&&(a=`v.optional(${a})`),o+=`  ${I(r)}: ${a},
`}o+=`});

`;for(let[r,i]of Object.entries(e.fields)){let s=n+A(r);i.type==="object"&&(o+=fn.generate(i,s,t)),i.type==="array"&&i.itemType?.type==="object"&&(o+=fn.generate(i.itemType,s+"Item",t))}return o}return""}},pn={generate:(e,n="root",t=new Set)=>{if(e=be(e),e.type==="object"&&e.fields){if(t.has(n))return"";t.add(n);let o="";t.size===1&&(o+=`import * as s from 'superstruct';

`),o+=`export const ${n}Struct = s.type({
`;for(let[r,i]of Object.entries(e.fields)){let s=n+A(r),a="";if(i.type==="object")a=`${s}Struct`;else if(i.type==="array"){let l=i.itemType,c;l?.type==="string"&&l.enumValues?c=`s.enums([${l.enumValues.map(f=>`"${f}"`).join(", ")}])`:c=l?.type==="object"?`${s}ItemStruct`:`s.${l?.type??"string"}()`,a=`s.array(${c})`}else i.type==="union"&&i.unionTypes?a=`s.union([${i.unionTypes.map(l=>`s.${l}()`).join(", ")}])`:i.type==="string"&&i.enumValues?a=`s.enums([${i.enumValues.map(l=>`"${l}"`).join(", ")}])`:a=`s.${i.type}()`;i.nullable&&(a=`s.nullable(${a})`),i.optional&&(a=`s.optional(${a})`),o+=`  ${I(r)}: ${a},
`}o+=`});

`;for(let[r,i]of Object.entries(e.fields)){let s=n+A(r);i.type==="object"&&(o+=pn.generate(i,s,t)),i.type==="array"&&i.itemType?.type==="object"&&(o+=pn.generate(i.itemType,s+"Item",t))}return o}return""}},Yn=e=>{if(e.type==="boolean")return"boolean";if(e.type==="number")return"number";if(e.type==="object")return"Record<string, unknown>";if(e.type==="array"){let n=e.itemType;return n?n.type==="string"?"string[]":n.type==="number"?"number[]":n.type==="boolean"?"boolean[]":"Record<string, unknown>[]":"unknown[]"}return"string"},Ci={generate:(e,n="Component")=>{let t=k(e);if(!Object.keys(t).length)return"";let o=A(n),r=`import React from 'react';

`;r+=`export interface ${o}Props {
`;for(let[i,s]of Object.entries(t))r+=`  ${I(i)}${s.optional?"?":""}: ${Yn(s)};
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
`,r}},Ri={generate:(e,n="State")=>{let t=k(e);if(!Object.keys(t).length)return"";let o=A(n),r=`import React, { createContext, useContext, useState, ReactNode } from 'react';

`;r+=`export interface ${o}State {
`;for(let[i,s]of Object.entries(t))r+=`  ${I(i)}${s.optional?"?":""}: ${Yn(s)};
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
`,r}},_i={generate:(e,n="User")=>{let t=k(e);if(!Object.keys(t).length)return"";let o=A(n),r=O(n),i=`import { createSlice, PayloadAction } from '@reduxjs/toolkit';

`;i+=`export interface ${o}State {
`;for(let[s,a]of Object.entries(t))i+=`  ${I(s)}${a.optional?"?":""}: ${Yn(a)};
`;i+=`}

`,i+=`const initialState: ${o}State = {
`;for(let[s,a]of Object.entries(t)){let l="''";a.type==="number"?l="0":a.type==="boolean"?l="false":a.type==="object"?l="{}":a.type==="array"&&(l="[]"),i+=`  ${I(s)}: ${l},
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
`,i}},Ei={generate:(e,n="User")=>{let t=k(e);if(!Object.keys(t).length)return"";let o=A(n),r=O(n),i=a=>a.type==="number"?"number":a.type==="boolean"?"boolean":a.type==="array"?"any[]":a.type==="object"?"Record<string, any>":"string",s=`import { defineStore } from 'pinia';

`;s+=`export interface ${o}State {
`;for(let[a,l]of Object.entries(t))s+=`  ${I(a)}: ${i(l)};
`;s+=`}

`,s+=`export const use${o}Store = defineStore('${r}', {
`,s+=`  state: (): ${o}State => ({
`;for(let[a,l]of Object.entries(t)){let c="''";l.type==="number"?c="0":l.type==="boolean"?c="false":l.type==="object"?c="{}":l.type==="array"&&(c="[]"),s+=`    ${I(a)}: ${c},
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
`,s}},Ii={generate:(e,n="Component")=>{let t=k(e);if(!Object.keys(t).length)return"";let o=`<script setup lang="ts">
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
`,o}},Mi={generate:(e,n="Component")=>{let t=k(e);if(!Object.keys(t).length)return"";let o=i=>i==="number"?"0":i==="boolean"?"false":i==="Record<string, any>"?"{}":i==="any[]"?"[]":"''",r=`<script lang="ts">
`;for(let[i,s]of Object.entries(t)){let a="string";s.type==="number"?a="number":s.type==="boolean"?a="boolean":s.type==="object"?a="Record<string, any>":s.type==="array"&&(a="any[]");let l=s.optional?`${a} | undefined = undefined`:`${a} = ${o(a)}`;r+=`  export let ${i}: ${l};
`}r+=`</script>

`,r+=`<div class="svelte-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
`,r+=`  <h2 class="text-xl font-bold mb-2">${A(n)}</h2>
`,r+=`  <ul class="text-sm space-y-1">
`;for(let i of Object.keys(t))r+=`    <li><strong>${i}:</strong> {${i}}</li>
`;return r+=`  </ul>
</div>
`,r}},Li={generate:(e,n="Component")=>{let t=k(e);if(!Object.keys(t).length)return"";let o=A(n),r=`import { Component } from 'solid-js';

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
`,r}},zi={generate:(e,n="Data")=>{let t=k(e);if(!Object.keys(t).length)return"";let o=A(n),r=`// Generated by TypeMorph (requires ArduinoJson library)
`;r+=`#include <ArduinoJson.h>

`,r+=`struct ${o} {
`;for(let[i,s]of Object.entries(t)){let a="String";s.type==="number"?a="double":s.type==="boolean"&&(a="bool"),r+=`  ${a} ${i};
`}r+=`};

`,r+=`void deserialize${o}(Stream& stream, ${o}& data) {
`,r+=`  StaticJsonDocument<1024> doc;
`,r+=`  deserializeJson(doc, stream);

`;for(let i of Object.keys(t))r+=`  data.${i} = doc["${i}"];
`;return r+=`}
`,r}},Fi={generate:(e,n="RECORD")=>{let t=k(e);if(!Object.keys(t).length)return"";let o=Ce(n).substring(0,20),r=`      * Generated by TypeMorph \u2014 COBOL Copybook
`;r+=`       01  ${o}.
`;for(let[i,s]of Object.entries(t)){let a=Ce(i).substring(0,20);if(s.type==="object"&&s.fields){r+=`           05  ${a.padEnd(20)}.
`;for(let[l,c]of Object.entries(s.fields)){let f=Ce(l).substring(0,20),u=c.type==="number"?"9(9)V99":c.type==="boolean"?"9(1)":"X(255)";r+=`               10  ${f.padEnd(20)} PIC ${u}.
`}}else if(s.type==="array"){let l=s.itemType?.type==="number"?"9(9)V99":"X(255)";r+=`           05  ${a.padEnd(20)} OCCURS 10 TIMES PIC ${l}.
`}else{let l="X(255)";s.type==="number"?l="9(9)V99":s.type==="boolean"&&(l="9(1)"),r+=`           05  ${a.padEnd(20)} PIC ${l}.
`}}return r}},Di={generate:(e,n="data")=>{let t=k(e);if(!Object.keys(t).length)return"";let r=`(ns com.example.${O(n)}-spec
  (:require [clojure.spec.alpha :as s]))

`,i=[];for(let[a,l]of Object.entries(t)){let c=`::${O(a)}`;i.push(c);let f="string?";if(l.type==="number")f="number?";else if(l.type==="boolean")f="boolean?";else if(l.type==="array")f="(s/coll-of any?)";else if(l.type==="object"&&l.fields){let u=Object.keys(l.fields).map(p=>`::${O(p)}`);for(let[p,m]of Object.entries(l.fields)){let d=m.type==="number"?"number?":m.type==="boolean"?"boolean?":"string?";r+=`(s/def ::${O(p)} ${d})
`}f=`(s/keys :req [${u.join(" ")}])`}r+=`(s/def ${c} ${f})
`}let s=i.join(" ");return r+=`
(s/def ::${O(n)} (s/keys :req [${s}]))
`,r}},Gi={generate:(e,n="Data")=>{let t=k(e);if(!Object.keys(t).length)return"";let r=`defmodule MyApp.${A(n)} do
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
`,r}},Pi={generate:(e,n="Model")=>{let t=k(e);if(!Object.keys(t).length)return"";let o=A(n),r=`module MyApp.${o} exposing (..)

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
`}return r}},Ui={generate:(e,n="Data")=>{let t=k(e);if(!Object.keys(t).length)return"";let o=`# Generated by TypeMorph \u2014 GDScript
class_name ${A(n)}

`;for(let[r,i]of Object.entries(t)){let s="String",a='""';i.type==="number"?(s="float",a="0.0"):i.type==="boolean"?(s="bool",a="false"):i.type==="object"?(s="Dictionary",a="{}"):i.type==="array"&&(s="Array",a="[]"),o+=`var ${O(r)}: ${s} = ${a}
`}o+=`
static func from_dict(dict: Dictionary) -> ${A(n)}:
`,o+=`  var instance = ${A(n)}.new()
`;for(let r of Object.keys(t)){let i=O(r);o+=`  if dict.has("${r}"):
    instance.${i} = dict["${r}"]
`}return o+=`  return instance
`,o}},Vi={generate:(e,n="Root")=>{let t=k(e);if(!Object.keys(t).length)return"";let o=A(n),r=`{-# LANGUAGE DeriveGeneric #-}
module MyApp.${o} where

import GHC.Generics (Generic)
import Data.Aeson (FromJSON, ToJSON)

`;r+=`data ${o} = ${o}
  { `;let i=Object.entries(t).map(([s,a])=>{let l="String";return a.type==="number"?l=a.format==="int"?"Int":"Double":a.type==="boolean"&&(l="Bool"),(a.optional||a.nullable)&&(l=`Maybe ${l}`),`${Ke(s)} :: ${l}`});return r+=i.join(`
  , `)+`
  } deriving (Show, Generic)

`,r+=`instance FromJSON ${o}
instance ToJSON ${o}
`,r}},qi={generate:(e,n="df")=>{let t=k(e);if(!Object.keys(t).length)return"";let o=O(n),r=`# Generated by TypeMorph
`;r+=`${o} <- data.frame(
`;let i=Object.entries(t).map(([s,a])=>{let l='"sample_value"';return a.type==="number"?l="0.0":a.type==="boolean"?l="TRUE":a.type==="object"||a.type==="array"?l="list()":a.format==="email"?l='"user@example.com"':a.format==="datetime"&&(l='as.POSIXct("2024-01-01")'),`  ${O(s)} = c(${l})`});return r+=i.join(`,
`)+`,
  stringsAsFactors = FALSE
)
`,r}},Bi={generate:(e,n="Root")=>{let t=k(e);if(!Object.keys(t).length)return"";let o=A(n),r=`// Generated by TypeMorph
`;r+=`case class ${o}(
`;let i=Object.entries(t).map(([s,a])=>{let l="String";return a.type==="number"?l="Double":a.type==="boolean"?l="Boolean":a.type==="object"?l="Map[String, Any]":a.type==="array"&&(l="List[Any]"),a.optional&&(l=`Option[${l}]`),`  ${s}: ${l}`});return r+=i.join(`,
`)+`
)
`,r}},Ji={generate:(e,n="Record")=>{let t=k(e);if(!Object.keys(t).length)return"";let o=[],r="";for(let[s,a]of Object.entries(t)){let l="string";if(a.type==="number")l="uint256";else if(a.type==="boolean")l="bool";else if(a.type==="array")l=`${a.itemType?.type==="number"?"uint256":a.itemType?.type==="boolean"?"bool":"string"}[]`;else if(a.type==="object"&&a.fields){let c=A(s),f=`    struct ${c} {
`;for(let[u,p]of Object.entries(a.fields)){let m=p.type==="number"?"uint256":p.type==="boolean"?"bool":"string";f+=`        ${m} ${u};
`}f+="    }",o.push(f),l=c}r+=`        ${l} ${s};
`}let i=`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

`;i+=`contract ${A(n)}Store {
`;for(let s of o)i+=s+`

`;return i+=`    struct ${A(n)} {
`,i+=`        uint256 id;
`,i+=r,i+=`    }
`,i+=`}
`,i}},Wi={generate:(e,n="Post")=>{let t=k(e);if(!Object.keys(t).length)return"";let o=A(n),r=`from django.db import models
from rest_framework import serializers

`;r+=`class ${o}(models.Model):
`;for(let[i,s]of Object.entries(t)){let a=O(i),l=s.optional?"null=True, blank=True":"",c;s.type==="number"?s.format==="int"?c=s.optional?"models.IntegerField(null=True, blank=True)":"models.IntegerField()":c=s.optional?"models.FloatField(null=True, blank=True)":"models.FloatField()":s.type==="boolean"?c=s.optional?"models.BooleanField(null=True, blank=True)":"models.BooleanField(default=False)":s.type==="object"||s.type==="array"?c=s.optional?"models.JSONField(null=True, blank=True)":"models.JSONField()":s.format==="datetime"?c=s.optional?"models.DateTimeField(null=True, blank=True)":"models.DateTimeField()":s.format==="date"?c=s.optional?"models.DateField(null=True, blank=True)":"models.DateField()":s.format==="email"?c=s.optional?"models.EmailField(null=True, blank=True)":"models.EmailField()":s.format==="url"?c=s.optional?"models.URLField(null=True, blank=True)":"models.URLField()":s.format==="uuid"?c=s.optional?"models.UUIDField(null=True, blank=True)":"models.UUIDField()":c=`models.CharField(max_length=255${l?`, ${l}`:""})`,r+=`    ${a} = ${c}
`}return r+=`

class ${o}Serializer(serializers.ModelSerializer):
`,r+=`    class Meta:
`,r+=`        model = ${o}
`,r+=`        fields = '__all__'
`,r}},Zi={generate:(e,n="User")=>{let t=k(e);if(!Object.keys(t).length)return"";let r=`class ${`Create${A(n)}s`} < ActiveRecord::Migration[7.0]
  def change
`;r+=`    create_table :${O(n)}s do |t|
`;for(let[i,s]of Object.entries(t)){if(i.toLowerCase()==="id")continue;let a="string";s.type==="number"?a=s.format==="int"?"integer":"decimal":s.type==="boolean"?a="boolean":s.type==="object"||s.type==="array"?a="jsonb":s.format==="datetime"&&(a="datetime");let l=s.optional?", null: true":", null: false";r+=`      t.${a} :${O(i)}${l}
`}return r+=`      t.timestamps
    end
  end
end
`,r}},Ki={generate:(e,n="Root")=>{let t=A(n),o=O(n),r=k(e),i=Object.keys(r),s=(l,c)=>{let f=l.toLowerCase();if(c.type==="number"){let m="z.number()";return f.includes("age")?m+=".int().min(0).max(150)":f.includes("year")?m+=".int().min(1900).max(2100)":f.includes("month")&&!f.includes("monthly")?m+=".int().min(1).max(12)":f==="day"||f.endsWith("_day")||f.startsWith("day_")?m+=".int().min(1).max(31)":f.includes("count")||f.includes("quantity")?m+=".int().min(0)":["price","amount","cost","fee","rank"].some(d=>f.includes(d))&&(m+=".min(0)"),m}if(c.type==="boolean")return"z.boolean()";if(c.type==="object"||c.type==="array"||c.type==="union")return"z.any()";if(c.format==="email"||f.includes("email"))return"z.email()";if(c.format==="uuid"||l.endsWith("_id")||/Id$/.test(l)||/ID$/.test(l))return"z.uuid()";if(c.format==="url"||f.includes("url")||f.includes("link")||f.includes("website"))return"z.url()";if(c.format==="datetime")return"z.iso.datetime()";if(f.includes("password")||f.includes("passwd"))return"z.string().min(8)";if(f.includes("slug"))return"z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)";if(f.includes("phone")||f.includes("tel"))return"z.string().regex(/^\\+?[\\d\\s\\-\\.\\(\\)]{7,15}$/)";let u=["description","note","bio","comment","content","body","text","message","summary"].some(m=>f.includes(m));return f.includes("name")||f.includes("label")||f.includes("title")?c.optional?"z.string().trim()":"z.string().min(1).trim()":!c.optional&&!u?"z.string().min(1)":"z.string()"},a=JSON.stringify(Object.fromEntries(i.map(l=>{let c=r[l];return c.type==="number"?[l,0]:c.type==="boolean"?[l,!1]:[l,"sample"]})),null,6).replace(/^/gm,"    ");return`import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Generated by TypeMorph \u2014 Next.js App Router API Route
// Route: /api/${o}s

const ${t}Schema = z.object({
${i.map(l=>{let c=r[l];return`  ${I(l)}: ${s(l,c)}${c.optional?".optional()":""}`}).join(`,
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
`}},Hi={generate:(e,n="Root")=>{let t=A(n),o=n.charAt(0).toLowerCase()+n.slice(1),r=O(n),i=k(e),s=Object.keys(i);return`import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Generated by TypeMorph \u2014 React Query Hook
// Requires: @tanstack/react-query

export interface ${t} {
${s.map(a=>{let l=i[a],c=l.type==="number"?"number":l.type==="boolean"?"boolean":"string";return`  ${I(a)}${l.optional?"?":""}: ${c};`}).join(`
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
`}};var Yi={generate:(e,n="Root")=>{let t=k(e);if(!Object.keys(t).length)return"";let o=A(n),r=[],i=(c,f,u)=>c.type==="number"?{base:c.format==="int"?"int32_t":"double",ptr:!1}:c.type==="boolean"?{base:"bool",ptr:!1}:c.type==="object"?{base:A(u+"_"+f),ptr:!1}:{base:"char",ptr:!0},s=(c,f)=>{let u=`typedef struct {
`;for(let[p,m]of Object.entries(c))if(m.type==="object"&&m.fields){let d=A(f+"_"+p);r.push(s(m.fields,d)),u+=`  ${d} ${p};
`}else if(m.type==="array"){let d=m.itemType,y="char",g=!0;if(d?.type==="number")y=d.format==="int"?"int32_t":"double",g=!1;else if(d?.type==="boolean")y="bool",g=!1;else if(d?.type==="object"&&d.fields){let h=A(f+"_"+p+"Item");r.push(s(d.fields,h)),y=h,g=!1}u+=`  ${y} ${g?"**":"*"}${p};
`,u+=`  int ${p}_count;
`}else{let{base:d,ptr:y}=i(m,p,f),g=y?`*${p}`:p,b=m.optional||m.nullable?" /* nullable */":"";u+=`  ${d} ${g};${b}
`}return u+=`} ${f};`,u},a=s(t,o),l=`#include <stdbool.h>
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

`;for(let[c,f]of Object.entries(t))if(l+=`  cJSON *_${c} = cJSON_GetObjectItemCaseSensitive(root, "${c}");
`,f.type==="number"){let u=f.format==="int"?"(int32_t)":"";l+=`  if (cJSON_IsNumber(_${c})) result.${c} = ${u}_${c}->valuedouble;
`}else f.type==="boolean"?l+=`  if (cJSON_IsBool(_${c})) result.${c} = cJSON_IsTrue(_${c});
`:f.type==="array"?l+=`  if (cJSON_IsArray(_${c})) result.${c}_count = cJSON_GetArraySize(_${c});
`:f.type==="object"?l+=`  /* TODO: parse nested ${c} struct */
`:l+=`  if (cJSON_IsString(_${c})) result.${c} = _${c}->valuestring;
`;return l+=`
  cJSON_Delete(root);
  return result;
}
`,l}},Qi={generate:(e,n="Root")=>{let t=k(e);if(!Object.keys(t).length)return"";let o=A(n),r=[],i=Object.values(t).some(u=>u.optional||u.nullable),s=Object.values(t).some(u=>u.type==="array"),a=(u,p,m)=>{if(u.type==="number")return u.format==="int"?"int64_t":"double";if(u.type==="boolean")return"bool";if(u.type==="object")return A(m+p.charAt(0).toUpperCase()+p.slice(1));if(u.type==="array"){let d=u.itemType,y="std::string";return d?.type==="number"?y=d.format==="int"?"int64_t":"double":d?.type==="boolean"?y="bool":d?.type==="object"&&(y=A(m+p.charAt(0).toUpperCase()+p.slice(1)+"Item")),`std::vector<${y}>`}return"std::string"},l=(u,p)=>{for(let[d,y]of Object.entries(u))if(y.type==="object"&&y.fields){let g=A(p+d.charAt(0).toUpperCase()+d.slice(1));r.push(l(y.fields,g))}else if(y.type==="array"&&y.itemType?.type==="object"&&y.itemType.fields){let g=A(p+d.charAt(0).toUpperCase()+d.slice(1)+"Item");r.push(l(y.itemType.fields,g))}let m=`struct ${p} {
`;for(let[d,y]of Object.entries(u)){let g=a(y,d,p);(y.optional||y.nullable)&&(g=`std::optional<${g}>`),m+=`  ${g} ${d};
`}m+=`
`,m+=`  static ${p} from_json(const nlohmann::json& j) {
`,m+=`    ${p} obj;
`;for(let[d,y]of Object.entries(u)){let g=a(y,d,p);y.optional||y.nullable?(m+=`    if (j.contains("${d}") && !j["${d}"].is_null())
`,m+=`      obj.${d} = j["${d}"].get<${g}>();
`):y.type==="object"?m+=`    if (j.contains("${d}")) obj.${d} = ${g}::from_json(j["${d}"]);
`:m+=`    obj.${d} = j.at("${d}").get<${g}>();
`}m+=`    return obj;
  }

`,m+=`  nlohmann::json to_json() const {
    return {
`;for(let[d,y]of Object.entries(u))y.optional||y.nullable?m+=`      {"${d}", ${d}.has_value() ? nlohmann::json(*${d}) : nlohmann::json(nullptr)},
`:y.type==="object"?m+=`      {"${d}", ${d}.to_json()},
`:m+=`      {"${d}", ${d}},
`;return m+=`    };
  }
};
`,m},c=l(t,o),f=`#include <string>
`;s&&(f+=`#include <vector>
`),i&&(f+=`#include <optional>
`),f+=`#include <cstdint>
`,f+=`/* nlohmann/json \u2014 header-only JSON: https://github.com/nlohmann/json */
`,f+=`#include <nlohmann/json.hpp>

`;for(let u of r)f+=u+`
`;return f+=c,f}},We=(e,n)=>{let t=e.toLowerCase();return n.format==="email"||t.includes("email")?"Email address":n.format==="uuid"?"Unique identifier (UUID)":n.format==="url"||t.includes("url")||t.includes("link")?"URL":n.format==="datetime"?"ISO 8601 datetime string":t.endsWith("id")||t.endsWith("_id")?"Unique identifier":t.includes("password")||t.includes("passwd")?"Password (min 8 characters)":t==="phone"||t==="tel"||t==="telephone"?"Phone number":t.includes("count")||t.includes("quantity")||t==="qty"?"Count or quantity (non-negative)":["price","amount","cost","fee","total","subtotal","balance"].some(o=>t.includes(o))?"Monetary amount (non-negative)":t.includes("score")||t.includes("rating")?"Score or rating (0\u2013100)":t==="age"||t.endsWith("_age")?"Age in years (0\u2013150)":t==="port"||t.endsWith("_port")||t==="port_number"?"Network port (1\u201365535)":n.type==="boolean"?`Whether ${e.replace(/^(is|has|can|should)/i,"").replace(/([A-Z])/g," $1").trim().toLowerCase()||e} is true`:e.replace(/([A-Z])/g," $1").replace(/_/g," ").trim()},Ze=(e,n,t="    ",o=!0)=>{let r=e.toLowerCase(),i=n.nullable&&n.optional?".nullable().optional()":n.nullable?".nullable()":n.optional?".optional()":"";if(n.type==="boolean")return`z.boolean()${i}`;if(n.type==="number"){let s="z.number()";n.format==="int"&&(s+=".int()");let a=["price","amount","cost","fee","total","subtotal","balance"].some(l=>r.includes(l));return(n.format==="int"&&(r.includes("count")||r.includes("quantity")||r==="qty")||a)&&(s+=".min(0)"),`${s}${i}`}if(n.type==="array"){let s=n.itemType,a="z.unknown()";if(s){if(s.type==="string")a="z.string()";else if(s.type==="number")a=s.format==="int"?"z.number().int()":"z.number()";else if(s.type==="boolean")a="z.boolean()";else if(s.type==="object"&&s.fields){let l=t+"  ";a=`z.object({
${Object.entries(s.fields).map(([f,u])=>{let p=`${l}  ${f}: ${Ze(f,u,l+"  ",o)}`;return o?`${p}.describe('${We(f,u)}'),`:`${p},`}).join(`
`)}
${l}})`}}return`z.array(${a})${i}`}if(n.type==="object"&&n.fields){let s=t+"  ";return`z.object({
${Object.entries(n.fields).map(([l,c])=>{let f=`${s}${l}: ${Ze(l,c,s,o)}`;return o?`${f}.describe('${We(l,c)}'),`:`${f},`}).join(`
`)}
${t}})${i}`}return n.type==="union"&&n.enumValues?.length?`z.enum([${n.enumValues.map(a=>`"${a}"`).join(", ")}])${i}`:n.format==="email"||r.includes("email")?`z.email()${i}`:n.format==="uuid"||/Id$/.test(e)||/ID$/.test(e)||r.endsWith("_id")?`z.uuid()${i}`:n.format==="url"||r.includes("url")||r.includes("link")?`z.url()${i}`:n.format==="datetime"?`z.iso.datetime()${i}`:r.includes("password")||r.includes("passwd")?`z.string().min(8)${i}`:`z.string()${i}`},Xi={generate:(e,n="Root")=>{let t=Ke(n),o=A(n),r=`${t}Schema`,i=`parse${o}`,a=be(e).fields??{},l=Object.entries(a).map(([c,f])=>`  ${I(c)}: ${Ze(c,f,"  ",!1)},`).join(`
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
//   }`}},es={generate:(e,n="Root")=>{let t=Ke(n),o=k(e),i=Object.keys(o).map(s=>`    ${I(s)}: ${Ze(s,o[s],"    ")}.describe('${We(s,o[s])}'),`).join(`
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

export { server };`}},ns={generate:(e,n="Root")=>{let o=be(e).fields??{},r=O(n),i=(l,c)=>{let f=l.toLowerCase(),u=We(l,c);if(c.type==="object"&&c.fields){let m={},d=[];for(let[g,b]of Object.entries(c.fields))m[g]=i(g,b),!b.optional&&!b.nullable&&d.push(g);let y={type:"object",description:u,properties:m};return d.length&&(y.required=d),y}if(c.type==="array"){let m=c.itemType,d={type:"string"};if(m){if(m.type==="number")d={type:m.format==="int"?"integer":"number"};else if(m.type==="boolean")d={type:"boolean"};else if(m.type==="object"&&m.fields){let y={},g=[];for(let[b,h]of Object.entries(m.fields))y[b]=i(b,h),!h.optional&&!h.nullable&&g.push(b);d={type:"object",properties:y},g.length&&(d.required=g)}}return{type:"array",description:u,items:d}}if(c.type==="union"&&c.enumValues?.length)return{type:"string",description:u,enum:c.enumValues};if(c.type==="boolean")return{type:"boolean",description:u};if(c.type==="number"){let m={description:u};m.type=c.format==="int"?"integer":"number";let d=["price","amount","cost","fee","total","subtotal","balance","payment"].some(y=>f.includes(y));return c.format==="int"&&(f.includes("count")||f.includes("quantity")||f==="qty")&&(m.minimum=0),d&&(m.minimum=0),(f.includes("score")||f.includes("rating"))&&(m.minimum=0,m.maximum=100),(f==="age"||f.endsWith("_age"))&&(m.minimum=0,m.maximum=150),(f==="port"||f.endsWith("_port")||f==="port_number")&&(m.minimum=1,m.maximum=65535),m}let p={type:"string",description:u};return c.format==="email"||f.includes("email")?p.format="email":c.format==="uuid"||/Id$/.test(l)||/ID$/.test(l)||f.endsWith("_id")?p.format="uuid":c.format==="url"||f.includes("url")||f.includes("link")?p.format="uri":c.format==="datetime"&&(p.format="date-time"),p},s={},a=[];for(let[l,c]of Object.entries(o))s[l]=i(l,c),!c.optional&&!c.nullable&&a.push(l);return JSON.stringify({type:"function",function:{name:r,description:`Processes ${n} data \u2014 update with a meaningful description`,parameters:{type:"object",properties:s,required:a}}},null,2)}},ts={generate:(e,n="Root")=>{let t=Ke(n),o=k(e),i=Object.keys(o).map(s=>`    ${I(s)}: ${Ze(s,o[s],"    ")}.describe('${We(s,o[s])}'),`).join(`
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
});`}};var ls=require("crypto");function He(e){let n=[],t="",o=0,r=null;for(let i=0;i<e.length;i++){let s=e[i],a=e[i+1];if(r){if(t+=s,s==="\\"){t+=a??"",i++;continue}s===r&&(r=null);continue}if(s==="/"&&a==="/"){for(;i<e.length&&e[i]!==`
`;)i++;i--;continue}if(s==="/"&&a==="*"){for(i+=2;i<e.length&&!(e[i]==="*"&&e[i+1]==="/");)i++;i++;continue}if(s==='"'||s==="'"||s==="`"){r=s,t+=s;continue}if(s==="<"||s==="("||s==="["||s==="{"){o++,t+=s;continue}if(s===">"||s===")"||s==="]"||s==="}"){o=Math.max(0,o-1),t+=s;continue}if(o===0&&(s===";"||s===","||s===`
`)){t.trim()&&n.push(t.trim()),t="";continue}t+=s}return t.trim()&&n.push(t.trim()),n}function Qn(e){let n=[],t=[],o=new Set,r=/(?:export\s+)?interface\s+(\w+)/g,i;for(;(i=r.exec(e))!==null;)o.add(i[1]);let s=[],a=/(?:export\s+)?interface\s+(\w+)(?:\s+extends\s+([^{]+))?\s*\{/g,l;for(;(l=a.exec(e))!==null;){let u=l[1],p=l[2],m=1,d=l.index+l[0].length;for(;d<e.length&&m>0;){let y=e[d++];y==="{"?m++:y==="}"&&m--}s.push({name:u,body:e.slice(l.index+l[0].length,d-1),extendsRaw:p})}let c=new Map;for(let{name:u,body:p,extendsRaw:m}of s){let d=[],y;for(let h of He(p)){let $=h.match(/^\[\s*\w+\s*:\s*(?:string|number|symbol)\s*\]\s*:\s*([\s\S]+)$/);if($){y=$[1].trim();continue}let S=h.match(/^(?:readonly\s+)?(\w+)(\?)?\s*:\s*([\s\S]+)$/);if(!S)continue;let[,T,C,N]=S,M=N.replace(/[;,]\s*$/,"").trim();d.push({name:T,type:M,optional:C==="?"})}let g=m?m.split(",").map(h=>h.trim().replace(/<.*$/,"").trim()).filter(Boolean):void 0,b={id:u,label:u,fields:d,isRoot:!1,...g&&g.length?{extendsList:g}:{},...y?{indexSignature:y}:{}};c.has(u)||(n.push(b),c.set(u,b))}for(let u of n)for(let p of u.fields){let m=p.type.replace(/\[\]/g,"").split(/[|&,\s<>]+/).map(d=>d.trim()).filter(d=>d.length>0&&/^[A-Z]/.test(d));for(let d of m)o.has(d)&&d!==u.id&&(t.some(g=>g.from===u.id&&g.to===d&&g.label===p.name)||t.push({from:u.id,to:d,label:p.name}))}let f=new Set(t.map(u=>u.to));for(let u of n)u.isRoot=!f.has(u.id);return{nodes:n,edges:t}}var et=e=>{try{let n=Be.load(e);if(n==null)return{};if(typeof n!="object"||Array.isArray(n))return{value:n};let t=n;return"_parseError"in t?{}:t}catch{return null}};function ce(e,n,t,o){let r=0;for(let i=n;i<e.length;i++)if(e[i]===t)r++;else if(e[i]===o&&(r--,r===0))return i;return-1}function Re(e){let n=[],t=0,o="",r=!1,i="";for(let s=0;s<e.length;s++){let a=e[s];r?(o+=a,a===i&&e[s-1]!=="\\"&&(r=!1)):a==='"'||a==="'"?(r=!0,i=a,o+=a):a==="("||a==="{"||a==="["?(t++,o+=a):a===")"||a==="}"||a==="]"?(t--,o+=a):a===","&&t===0?(o.trim()&&n.push(o.trim()),o=""):o+=a}return o.trim()&&n.push(o.trim()),n}var pl=new Set(["min","max","length","gt","gte","lt","lte","positive","negative","nonnegative","nonpositive","multipleOf","step","finite","regex","includes","startsWith","endsWith","trim","toLowerCase","toUpperCase","default","catch","describe","brand","readonly"]);function rs(e){let n=[],t=0;for(;t<e.length;){let o=e.indexOf(".",t);if(o===-1)break;let r=/^\.([a-zA-Z]+)\s*\(/.exec(e.slice(o));if(!r){t=o+1;continue}let i=r[1],s=o+r[0].length,a=1,l="(";for(;s<e.length&&a>0;){let c=e[s];if(c==='"'||c==="'"||c==="`"){let f=c;for(s++;s<e.length&&!(e[s]===f&&e[s-1]!=="\\");)s++;s++,l="x";continue}if(c==="/"&&(l==="("||l===",")){for(s++;s<e.length&&!(e[s]==="/"&&e[s-1]!=="\\");){if(e[s]==="[")for(s++;s<e.length&&!(e[s]==="]"&&e[s-1]!=="\\");)s++;s++}for(s++;s<e.length&&/[a-z]/i.test(e[s]);)s++;l="x";continue}if(c==="("){a++,l="(",s++;continue}if(c===")"){if(a--,s++,a===0)break;l=")";continue}if(c===","){l=",",s++;continue}/\s/.test(c)||(l="x"),s++}pl.has(i)&&n.push(e.slice(o,s)),t=s}return n}var Xn=new Map;function ml(e){let n=new Map,t,o=/enum\s+(\w+)\s*\{([^}]*)\}/g;for(;t=o.exec(e);){let i=[];for(let s of t[2].split(",")){let a=s.match(/\w+\s*=\s*(['"`])(.*?)\1/);a&&i.push(a[2])}i.length&&n.set(t[1],i)}let r=/const\s+(\w+)\s*=\s*\{([^}]*)\}\s*as\s+const/g;for(;t=r.exec(e);){let i=[];for(let s of t[2].split(",")){let a=s.match(/\w+\s*:\s*(['"`])(.*?)\1/);a&&i.push(a[2])}i.length&&n.set(t[1],i)}return n}function dl(e){let n=[],t=0,o=0,r=-1;for(;o<e.length;){let i=e[o];if(i==='"'||i==="'"||i==="`"){let s=i;for(o++;o<e.length&&!(e[o]===s&&e[o-1]!=="\\");)o++;o++;continue}if(i==="("||i==="{"||i==="["){t++,o++;continue}if(i===")"||i==="}"||i==="]"){t--,o++;continue}if(t===0&&e.startsWith(".and(",o)){r===-1&&(r=o);let s=o+4,a=ce(e,s,"(",")");if(a===-1)return null;n.push(e.slice(s+1,a).trim()),o=a+1;continue}o++}return r===-1?null:[e.slice(0,r).trim(),...n]}function is(e,n,t){let o=e.filter(i=>i.type==="object"&&i.fields);if(o.length===0){let i=e.find(s=>s.type!=="any")??e[0]??{type:"any"};return{...i,optional:n||i.optional||void 0,nullable:t||i.nullable||void 0}}let r={};for(let i of o)for(let[s,a]of Object.entries(i.fields))r[s]=a;return{type:"object",fields:r,optional:n||void 0,nullable:t||void 0}}function ue(e){let n=e.trim(),t=/\.optional\(\)|\.nullish\(\)/.test(n),o=/\.nullable\(\)|\.nullish\(\)/.test(n),r=dl(n);if(r)return is(r.map(l=>ue(l)),t,o);if(/^z\.intersection\s*\(/.test(n)){let l=n.indexOf("("),c=l>-1?ce(n,l,"(",")"):-1;if(c>-1){let f=Re(n.slice(l+1,c)).map(u=>u.trim()).filter(Boolean);if(f.length)return is(f.map(u=>ue(u)),t,o)}}if(/^z\.object\s*\(/.test(n)){let l=n.indexOf("{");if(l===-1)return{type:"any"};let c=ce(n,l,"{","}"),f=c>-1?n.slice(l+1,c):"",u={};return yl(f,u),{type:"object",fields:u,optional:t||void 0,nullable:o||void 0}}if(/^z\.array\s*\(/.test(n)){let l=n.indexOf("("),c=ce(n,l,"(",")"),f=c>-1?n.slice(l+1,c).trim():"z.string()",u=ue(f),p=c>-1?rs(n.slice(c+1)):[];return{type:"array",itemType:u,optional:t||void 0,...p.length?{refinements:p}:{}}}if(/^z\.(?:nativeEnum|enum)\s*\(\s*[A-Za-z_$]/.test(n)){let c=n.match(/^z\.(?:nativeEnum|enum)\s*\(\s*([A-Za-z_$][\w$]*)/)?.[1],f=c?Xn.get(c):void 0;return f&&f.length?{type:"string",enumValues:f,optional:t||void 0}:{type:"string",rawZodType:c?`z.nativeEnum(${c})`:n,optional:t||void 0}}if(/^z\.enum\s*\(/.test(n)){let l=n.indexOf("["),c=l>-1?ce(n,l,"[","]"):-1,f=c>-1?Re(n.slice(l+1,c)).map(u=>u.trim().replace(/^['"`]|['"`]$/g,"")).filter(Boolean):[];return{type:"string",enumValues:f.length?f:void 0,optional:t||void 0}}if(/^z\.(?:union|discriminatedUnion)\s*\(/.test(n)){let l=/^z\.discriminatedUnion/.test(n),c;if(l){let u=n.match(/^z\.discriminatedUnion\s*\(\s*(['"`])(.+?)\1/);u&&(c=u[2])}let f=n.indexOf("[");if(f>-1){let u=ce(n,f,"[","]");if(u>-1){let p=Re(n.slice(f+1,u)).map(h=>h.trim()).filter(Boolean),m=!1,d=!1,y=[];for(let h of p){if(/^z\.null\s*\(\s*\)/.test(h)){m=!0;continue}if(/^z\.undefined\s*\(\s*\)/.test(h)){d=!0;continue}y.push(ue(h))}let g=h=>((t||d)&&(h.optional=!0),m&&(h.nullable=!0),h);if(y.length===0)return g({type:"any"});if(y.length===1)return g({...y[0]});if(y.every(h=>h.enumValues&&h.enumValues.length>0)){let h=[];for(let $ of y)for(let S of $.enumValues)h.includes(S)||h.push(S);return g({type:"string",enumValues:h})}if(y.every(h=>h.type==="object"&&h.fields)){let h={};for(let S of y)for(let[T,C]of Object.entries(S.fields))T in h||(h[T]={...C});for(let S of Object.keys(h))y.every(T=>T.fields&&S in T.fields)||(h[S].optional=!0);let $={type:"object",fields:h};return c&&($.discriminatorField=c),g($)}let b=[];for(let h of y)b.includes(h.type)||b.push(h.type);return b.length===1?g({...y[0]}):g({type:"union",unionTypes:b})}}return{type:"any",optional:t||void 0}}if(/^z\.tuple\s*\(/.test(n)){let l=n.indexOf("[");if(l>-1){let c=ce(n,l,"[","]");if(c>-1){let f=Re(n.slice(l+1,c)).map(u=>u.trim()).filter(Boolean);if(f.length>0){let u=f.map(p=>ue(p));return{type:"array",itemType:{type:"any"},tupleTypes:u,optional:t||void 0}}}}return{type:"array",itemType:{type:"any"},optional:t||void 0}}if(/^z\.record\s*\(/.test(n)){let l=n.indexOf("("),c=l>-1?ce(n,l,"(",")"):-1;if(c>-1){let f=Re(n.slice(l+1,c)).map(p=>p.trim()).filter(Boolean),u=f.length>=2?f[1]:f[0];if(u)return{type:"object",fields:{},recordValueType:ue(u),optional:t||void 0}}return{type:"object",fields:{},optional:t||void 0}}let i={type:"any"},s=n.match(/z\.coerce\.(string|number|boolean|bigint)\b/);if(s)i.coerced=!0,i.type=s[1]==="string"?"string":s[1]==="boolean"?"boolean":"number",i.type==="number"&&/\.int\(\)/.test(n)&&(i.format="int");else if(/z\.string\b|z\.email\b|z\.url\b|z\.uuid\b|z\.cuid\b|z\.ulid\b|z\.ip\b|z\.iso\b/.test(n))i.type="string",/\.email\(\)|z\.email\(\)/.test(n)?i.format="email":/\.uuid\(\)|z\.uuid\(\)/.test(n)?i.format="uuid":/\.url\(\)|z\.url\(\)/.test(n)?i.format="url":/z\.iso\.datetime\(\)|\.datetime\(\)/.test(n)?i.format="datetime":/z\.iso\.date\(\)/.test(n)?i.format="date":/z\.iso\.time\(\)/.test(n)?i.format="datetime":/z\.ip\(\)|\.ip\(\)/.test(n)?i.format="ip":/z\.cuid\(\)|z\.ulid\(\)/.test(n)&&(i.format="uuid");else if(/z\.number\b|z\.int\b|z\.float\b/.test(n))i.type="number",/\.int\(\)/.test(n)&&(i.format="int");else if(/z\.boolean\b|z\.bool\b/.test(n))i.type="boolean";else if(/z\.coerce\.date\b|z\.date\b/.test(n))i.type="string",i.format="date";else if(/z\.null\(\)/.test(n))i.type="any",i.nullable=!0;else if(/z\.any\(\)|z\.unknown\(\)/.test(n))i.type="any";else if(/z\.literal\(/.test(n)){let l=n.match(/z\.literal\s*\(\s*(['"`])([\s\S]*?)\1\s*\)/),c=n.match(/z\.literal\s*\(\s*(-?\d+(?:\.\d+)?)\s*\)/),f=n.match(/z\.literal\s*\(\s*(true|false)\s*\)/);l?(i.type="string",i.literalValue=l[2],i.enumValues=[l[2]]):c?(i.type="number",i.literalValue=parseFloat(c[1])):f?(i.type="boolean",i.literalValue=f[1]==="true"):i.type="string"}t&&(i.optional=!0),o&&(i.nullable=!0);let a=rs(n);return a.length&&(i.refinements=a),i}function yl(e,n){let t=Re(e);for(let o of t){let r=o.indexOf(":");if(r===-1)continue;let i=o.slice(0,r).trim().replace(/^['"`]|['"`]$/g,""),s=o.slice(r+1).trim();!i||!s||(n[i]=ue(s))}}var nt=e=>{try{Xn=ml(e);let n=e.trim();if(!n.includes("z.object(")&&!n.includes("z.array(")&&!n.includes("z.string(")&&!n.includes("z.number(")&&!n.includes("z.boolean("))return null;let t=n,o=n.match(/(?:const|let|var|export\s+(?:const|let|var)|export\s+default)\s+\w+\s*(?::\s*\w+\s*)?=\s*(z\.[\s\S]+)/);o&&(t=o[1].trim()),t=t.replace(/;\s*$/,"").trim();let r=ue(t);return r.type==="any"&&!r.optional?null:(r._isTypeMorphSchema=!0,r)}catch{return null}finally{Xn=new Map}};function gl(e,n){typeof window>"u"||typeof window.gtag!="function"||window.gtag("event",e,n)}function ss(e,n){gl("infer_unsupported_output",{target:e,requested:n})}function mn(e){if(typeof e!="object"||e===null||Array.isArray(e))return!1;let n=e,t=String(n.openapi??""),o=String(n.swagger??""),r=n.openapi!==void 0&&t.startsWith("3"),i=n.swagger!==void 0&&o.startsWith("2");return(r||i)&&!!(n.info||n.paths||n.components||n.definitions)}function dn(e){let t=typeof e.openapi=="string"||typeof e.openapi=="number"?e.components?.schemas??{}:e.definitions??{},o=new Set;function r(l){if(!l.startsWith("#/"))return null;let c=l.slice(2).split("/"),f=e;for(let u of c){if(f==null)return null;f=f[u.replace(/~1/g,"/").replace(/~0/g,"~")]}return f??null}function i(l){return l.split("/").pop()??""}function s(l,c=0,f=!1){if(c>20||!l||typeof l!="object")return{type:"any"};if(typeof l.$ref=="string"){let m=i(l.$ref);if(!f&&t[m]!==void 0)return{type:"object",_sharedTypeName:m};if(o.has(m))return{type:"any"};let d=r(l.$ref);return d?s(d,c+1,f):{type:"any"}}if(Array.isArray(l.allOf)){let m={type:"object",fields:{}};for(let d of l.allOf){let y=s(d,c+1,!0);y.type==="object"&&y.fields&&Object.assign(m.fields,y.fields)}return m}if(Array.isArray(l.anyOf)||Array.isArray(l.oneOf)){let m=(l.anyOf??l.oneOf).map(y=>s(y,c+1)),d=[...new Set(m.map(y=>y.type))];return d.length===1?m[0]:{type:"union",unionTypes:d}}let u=typeof l.type=="string"?l.type:"",p=Array.isArray(l.required)?l.required:[];if(u==="object"||!u&&l.properties){let m={};for(let[d,y]of Object.entries(l.properties??{})){let g=s(y,c+1);p.includes(d)||(g.optional=!0),y.nullable===!0&&(g.nullable=!0),m[d]=g}return{type:"object",fields:m}}if(u==="array")return{type:"array",itemType:l.items?s(l.items,c+1):{type:"any"}};if(u==="string"){let m={type:"string"};Array.isArray(l.enum)&&(m.enumValues=l.enum.map(String));let d=l.format??"";return d==="date-time"?m.format="datetime":d==="date"?m.format="date":d==="email"?m.format="email":d==="uri"||d==="url"?m.format="url":d==="uuid"&&(m.format="uuid"),m}if(u==="integer")return{type:"number",format:"int"};if(u==="number"){let m={type:"number"};return(l.format==="float"||l.format==="double")&&(m.format="float"),m}return u==="boolean"?{type:"boolean"}:{type:"any"}}let a=[];for(let[l,c]of Object.entries(t)){o.add(l);let f=s(c);o.delete(l),f._isTypeMorphSchema=!0,a.push({name:l,schema:f})}return a}var hl=new Set(["object","string","number","integer","boolean","array","null"]);function yn(e){if(typeof e!="object"||e===null||Array.isArray(e))return!1;let n=e,t=String(n.$schema??"");if(t.includes("json-schema.org")||/^https?:\/\/.*\/schema/.test(t))return!0;let o=typeof n.type=="string"&&hl.has(n.type),r=typeof n.properties=="object"&&n.properties!==null&&!Array.isArray(n.properties),i=typeof n.items=="object"&&n.items!==null;return!!(o&&(r||i)||(n.$defs!==void 0||n.definitions!==void 0)&&r||typeof n.$ref=="string"&&n.$ref.startsWith("#/")||Array.isArray(n.allOf)||Array.isArray(n.anyOf)||Array.isArray(n.oneOf))}function gn(e){let n=e.$defs??e.definitions??{};function t(a){if(!a.startsWith("#/"))return null;let l=a.slice(2).split("/"),c=e;for(let f of l){if(c==null)return null;c=c[f.replace(/~1/g,"/").replace(/~0/g,"~")]}return c??null}function o(a){return a.split("/").pop()??""}function r(a,l=0,c=!1){if(l>20||!a||typeof a!="object")return{type:"any"};if(typeof a.$ref=="string"){let d=o(a.$ref);if(!c&&n[d]!==void 0)return{type:"object",_sharedTypeName:d};let y=t(a.$ref);return y?r(y,l+1,c):{type:"any"}}if(Array.isArray(a.allOf)){let d={type:"object",fields:{}};for(let y of a.allOf){let g=r(y,l+1,!0);g.type==="object"&&g.fields&&Object.assign(d.fields,g.fields)}if(a.properties){let y=Array.isArray(a.required)?a.required:[];for(let[g,b]of Object.entries(a.properties)){let h=r(b,l+1);y.includes(g)||(h.optional=!0),d.fields[g]=h}}return d}if(Array.isArray(a.anyOf)||Array.isArray(a.oneOf)){let d=a.anyOf??a.oneOf,y=d.filter($=>$.type!=="null"&&!(typeof $.$ref=="string"&&$.$ref==="#"));if(y.length===1){let $=r(y[0],l+1,c);return y.length<d.length&&($.nullable=!0),$}let g=y.map($=>r($,l+1)),b=[...new Set(g.map($=>$.type))],h=b.length===1?g[0]:{type:"union",unionTypes:b};return y.length<d.length&&(h.nullable=!0),h}let f=a.type,u=!1;if(Array.isArray(f)){let d=f.filter(y=>y!=="null");u=d.length<f.length,f=d[0]??"any"}let p=typeof f=="string"?f:"",m=Array.isArray(a.required)?a.required:[];if(a.const!==void 0){let d=typeof a.const;if(d==="string")return{type:"string",enumValues:[String(a.const)]};if(d==="number")return{type:"number"};if(d==="boolean")return{type:"boolean"}}if(Array.isArray(a.enum)){let d=a.enum.filter(g=>g!==null),y={type:"string",enumValues:d.map(String)};return d.length<a.enum.length&&(y.nullable=!0),y}if(p==="object"||!p&&a.properties){let d={};for(let[g,b]of Object.entries(a.properties??{})){let h=r(b,l+1);m.includes(g)||(h.optional=!0),d[g]=h}let y={type:"object",fields:d};return u&&(y.nullable=!0),y}if(p==="array"){let d=Array.isArray(a.items)?a.items[0]:a.items,g={type:"array",itemType:d?r(d,l+1):{type:"any"}};return u&&(g.nullable=!0),g}if(p==="string"){let d={type:"string"},y=a.format??"";return y==="date-time"?d.format="datetime":y==="date"?d.format="date":y==="email"?d.format="email":y==="uri"||y==="url"?d.format="url":y==="uuid"&&(d.format="uuid"),u&&(d.nullable=!0),d}return p==="integer"?{type:"number",format:"int",...u?{nullable:u}:{}}:p==="number"?{type:"number",...u?{nullable:u}:{}}:p==="boolean"?{type:"boolean",...u?{nullable:u}:{}}:{type:"any"}}let i=[];for(let[a,l]of Object.entries(n)){let c=r(l);c._isTypeMorphSchema=!0,i.push({name:a,schema:c})}if(e.type||e.properties||e.allOf||e.anyOf||e.oneOf||e.items){let a=e.title??"Root";if(!i.find(l=>l.name===a)){let l=r(e);l._isTypeMorphSchema=!0,i.unshift({name:a,schema:l})}}return i}function bl(e){return e.split(/[^A-Za-z0-9$]+/).filter(Boolean).map(n=>n.charAt(0).toUpperCase()+n.slice(1)).join("")}function os(e){return e.type!=="object"||!e.fields?null:Object.keys(e.fields).sort()}function $l(e,n){if(e.length===0&&n.length===0)return 1;let t=new Set(e),o=n.filter(i=>t.has(i)).length,r=new Set([...e,...n]).size;return r===0?0:o/r}function as(e,n){let t=bl(n),[o,r]=e.type==="array"&&e.itemType?.type==="object"?[e.itemType,`${t}Item`]:e.type==="object"?[e,t]:[null,""];if(!o||o.type!=="object"||!o.fields)return;let i=os(o);if(!i||i.length<2)return;let s=i;function a(l,c){if(!(c>20||!l)&&!(l._sharedTypeName||l._isTypeMorphSchema))if(l.type==="object"&&l.fields&&l!==o){let f=os(l);if(f&&f.length>=1&&$l(s,f)>=.65){l._sharedTypeName=r,delete l.fields;return}for(let u of Object.values(l.fields))a(u,c+1)}else l.type==="array"&&l.itemType&&a(l.itemType,c+1)}for(let l of Object.values(o.fields))a(l,1)}var tt=new Set(["string","number","boolean"]),rt=(e,n)=>{let t=e.type==="union"?e.unionTypes??[]:[e.type],o=n.type==="union"?n.unionTypes??[]:[n.type],r=Array.from(new Set([...t,...o]));return r.length===1?{type:r[0]}:{type:"union",unionTypes:r}},cs=20,_e=(e,n,t=0)=>{if(t>cs)return{type:"any"};if(!e)return n;if(!n)return e;let o=e.optional||n.optional,r=e.nullable||n.nullable;if(e.type==="any")return{...n,optional:o,nullable:r};if(n.type==="any")return{...e,optional:o,nullable:r};if(e.type!==n.type){if(tt.has(e.type)&&tt.has(n.type))return{...rt(e,n),optional:o,nullable:r};if(e.type==="union"||n.type==="union"){let i=e.type==="union"?n.type:e.type;if(i==="union"||tt.has(i))return{...rt(e,n),optional:o,nullable:r}}return{type:"any",optional:o,nullable:r}}if(e.type==="union")return{...rt(e,n),optional:o,nullable:r};if(e.type==="number"&&n.type==="number"){let i=e.format==="float"||n.format==="float"?"float":"int";return{...e,optional:o,nullable:r,format:i}}if(e.type==="string"&&n.type==="string"){let i;if(e.enumValues||n.enumValues){let s=Array.from(new Set([...e.enumValues??[],...n.enumValues??[]]));s.length<=6&&(i=s)}return e.format===n.format?{...e,optional:o,nullable:r,enumValues:i}:{type:"string",optional:o,nullable:r,enumValues:i}}if(e.type==="object"&&n.type==="object"){let i=e.fields??{},s=n.fields??{},a=new Set([...Object.keys(i),...Object.keys(s)]),l={};for(let c of a){let f=c in i,u=c in s;f&&u?l[c]=_e(i[c],s[c],t+1):f?l[c]={...i[c],optional:!0}:l[c]={...s[c],optional:!0}}return{type:"object",fields:l,optional:o,nullable:r}}return e.type==="array"&&n.type==="array"?{type:"array",itemType:_e(e.itemType,n.itemType,t+1),optional:o,nullable:r}:{...e,optional:o,nullable:r}},Sl=e=>{let n={};for(let t of e)if(t&&typeof t=="object"&&!Array.isArray(t))for(let[o,r]of Object.entries(t))typeof r=="string"&&(n[o]||(n[o]=[]),n[o].push(r));return n},us=new Set(["status","type","role","gender","state","category","mode","level","phase","kind","visibility","scope","method","action","currency","priority","tier","plan","severity","permission","provider","platform","environment","locale","theme","layout","variant","direction","alignment","position"]),Tl=/(\bcountry\b|\bcurrency\b|\bcity\b|\btimezone\b|\btz\b|\blocale\b|\blanguage\b|\blang\b|\bregion\b|\bpostal\b|\bzip\b|\btag\b|categor|\bsku\b|\bslug\b|\buuid\b|\bid\b|_id\b|\burl\b|\bdomain\b)/i,xl=(e,n,t)=>{if(n.length===0)return 0;let o=0,r=e.toLowerCase(),i=t?.enumMinSamples??3;Array.from(us).some(u=>r.includes(u))&&(o+=.4);let a=new Set(n),l=a.size/n.length;a.size===1||l<=.2?o+=.4:l<=.4&&n.length>=i&&(o+=.2);let c=t?.enumMaxUnique??6;a.size>=2&&a.size<=c&&(o+=.25),n.length>=10?o+=.2:n.length>=5&&(o+=.1);let f=new Set(["yes","no","true","false","get","post","put","delete","active","inactive","pending","success","error","failed"]);return n.every(u=>f.has(u.toLowerCase()))&&(o+=n.length>=i?.5:.2),Math.min(o,1)},Al=(e,n,t)=>{let o=t?.enumConfidenceThreshold??.6;return xl(e,n,t)>=o},jl=e=>{let n=Object.keys(e);if(n.some(s=>/currency|curr/i.test(s)))for(let s of n)/amount|price|cost|fee|tax|total|subtotal/i.test(s)&&e[s].type==="number"&&(e[s].format="float");let o=n.some(s=>/^lat(itude)?$/i.test(s)),r=n.some(s=>/^(lng|lon|longitude)$/i.test(s));if(o&&r)for(let s of n)/^lat(itude)?$|^(lng|lon|longitude)$/i.test(s)&&e[s].type==="number"&&(e[s].format="float");if(n.some(s=>/created_?at|updated_?at/i.test(s)))for(let s of n)/created_?by|updated_?by/i.test(s)&&e[s].type==="string"&&(e[s].format="uuid")},Ol=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,kl=e=>{if(e.length<2)return!1;if(e.every(t=>/^\d+$/.test(t))||e.every(t=>Ol.test(t)))return!0;let n=e[0].match(/^(.*?)[_-]?\d+$/);if(n&&n[1]){let t=n[1];if(e.every(o=>{let r=o.match(/^(.*?)[_-]?\d+$/);return!!r&&r[1]===t}))return!0}return!1},Nl=/^\d{4}-\d{2}-\d{2}$/,wl=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/,q=(e,n,t=0,o,r)=>{let i=r?.maxDepth??cs,s=(l,c,f)=>(r?.includeMeta&&(l._meta={reason:c,info:f}),l);if(t>i)return s({type:"any"},"max_depth_exceeded");if(e===null)return s({type:"any",nullable:!0},"null_value");if(e===void 0)return s({type:"any",optional:!0},"undefined_value");if(Array.isArray(e)){if(e.length===0)return s({type:"array",itemType:{type:"any"}},"empty_array");let l=e.length,c=r?.arrayLargeThreshold??1e3,f=r?.arraySampleCount??200,u=r?.arrayPrefixSample??10,p=new Set;if(l<=c)for(let h=0;h<l;h++)p.add(h);else{let h=Math.min(u,l);for(let S=0;S<h;S++)p.add(S);let $=Math.max(0,Math.min(f-h,l-h));if($>0){let S=(l-h)/$;for(let T=0;T<$;T++)p.add(Math.min(l-1,Math.floor(h+T*S)))}}let m=Array.from(p).sort((h,$)=>h-$).map(h=>e[h]),d=new Set,y=Sl(m);for(let[h,$]of Object.entries(y))Al(h,$,r)&&d.add(h);let g=q(m[0],void 0,t+1,d,r);for(let h=1;h<m.length;h++)g=_e(g,q(m[h],void 0,t+1,d,r),t+1);if(r?.detectDiscriminatedUnions!==!1&&m.length>=2){let h=vl(m,t,r);h&&(g={...g,discriminatorField:h.discriminatorField,discriminatedVariants:h.variants})}let b;if(l>=2&&l<=6&&e.every(h=>h===null||typeof h!="object")){let h=e.map(S=>q(S,void 0,t+1,void 0,r));new Set(h.map(S=>S.type)).size>=2&&(b=h)}return s({type:"array",itemType:g,...b?{tupleTypes:b}:{}},"array_inferred",{samples:l,sampled:m.length})}if(typeof e=="object"){let l={};for(let f in e)l[f]=q(e[f],f,t+1,o,r);jl(l);let c=Object.keys(l);if(kl(c)){let f=l[c[0]];for(let u=1;u<c.length;u++)f=_e(f,l[c[u]],t+1);return s({type:"object",fields:l,recordValueType:f},"record_inferred",{fieldCount:c.length})}return s({type:"object",fields:l},"object",{fieldCount:Object.keys(l).length})}if(typeof e=="string"){if(e==="")return s({type:"string",format:"text"},"empty_string");if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(e))return s({type:"string",format:"uuid"},"format:uuid");if(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(e))return s({type:"string",format:"email"},"format:email");if(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(e))return s({type:"string",format:"color"},"format:color");if(/^https?:\/\/[^\s]+$/.test(e)&&e.includes("{"))return s({type:"string",format:"text"},"format:url-template");if(/^https?:\/\/[^\s]+$/.test(e))return s({type:"string",format:"url"},"format:url");if(!/version|semver|release/i.test(n??"")){if(Nl.test(e)&&!isNaN(Date.parse(e)))return s({type:"string",format:"date"},"format:date");if(wl.test(e)&&!isNaN(Date.parse(e)))return s({type:"string",format:"datetime"},"format:datetime")}let c=!1;if(n){let f=n.toLowerCase(),u=Array.from(us),p=/price|amount|cost|fee|tax|rate|ratio|percent|score|weight|height|width|balance|salary|revenue/i,m=/^uuid$|^guid$/i,d=/url|uri|href|link|(?<![a-zA-Z])src|endpoint|avatar|thumbnail|image|photo/i,y=/email|mail/i;if(m.test(n))return s({type:"string",format:"uuid"},"format:uuid:keyname");if(y.test(n))return s({type:"string",format:"email"},"format:email:keyname");let g=/^[a-z][a-z0-9+.-]*:/.test(e)&&!/^https?:\/\//.test(e);if(d.test(n)&&/^[A-Za-z0-9._-]+@[A-Za-z0-9._-]+:(?!\/)/.test(e))return s({type:"string",format:"text"},"format:text:ssh-url");if(d.test(n)&&!e.startsWith("/")&&!g&&e.includes("{"))return s({type:"string",format:"text"},"format:url-template:keyname");if(d.test(n)&&!e.startsWith("/")&&!g)return s({type:"string",format:"url"},"format:url:keyname");if(/website|homepage/i.test(n)&&!e.startsWith("/")&&!g)return s({type:"string",format:"text"},"format:text:website-nonurl");if(o?c=o.has(n):(u.some(b=>f.includes(b))||new Set(["yes","no","true","false","get","post","put","delete","active","inactive","pending","success","error","failed"]).has(e.toLowerCase()))&&(c=!0),c&&Tl.test(n)&&(c=!1),!c&&p.test(n))return s({type:"string"},"format:float:keyname")}return c&&e.trim()!==""?s({type:"string",enumValues:[e]},"enum_candidate",{sample:e}):s({type:"string"},"string")}if(typeof e=="number"){let l=Number.isInteger(e);return s({type:"number",format:l?"int":"float"},"number")}let a=typeof e;return s(a==="string"||a==="number"||a==="boolean"||a==="object"?{type:a}:{type:"any"},"primitive")},vl=(e,n,t)=>{if(e.length<2||!e.every(r=>r!==null&&typeof r=="object"&&!Array.isArray(r)))return null;let o=Object.keys(e[0]);for(let r of o){if(!e.every(f=>typeof f[r]=="string"&&f[r].length>0))continue;let i=Array.from(new Set(e.map(f=>f[r])));if(i.length<2||i.length>8)continue;let s={};for(let f of i){let u=e.filter(m=>m[r]===f);if(u.length===0)continue;let p=q(u[0],void 0,n+1,void 0,t);for(let m=1;m<u.length;m++)p=_e(p,q(u[m],void 0,n+1,void 0,t),n+1);s[f]=p}if(Object.keys(s).length<2)continue;let a=Object.values(s).map(f=>new Set(Object.entries(f.fields??{}).filter(([,u])=>!u.optional).map(([u])=>u)));if(Array.from(new Set(a.flatMap(f=>Array.from(f)))).filter(f=>!a.every(u=>u.has(f))).length>=2)return{discriminatorField:r,variants:s}}return null},Cl={typescript:`// Required dependencies: npm install typescript

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

`,"llm-response":"","llm-validator":"","llm-zod":"","type-guard":"",typeguard:""},Rl=e=>{let n=e.split(`
`).map(r=>r.trimEnd()),t=[],o=!1;for(let r of n)r===""?o||(t.push(""),o=!0):(t.push(r),o=!1);return t.join(`
`).trim()},it=new WeakMap,_l=e=>{if(it.has(e))return it.get(e);let n=r=>{if(!r)return null;if(r.type==="object"&&r.fields){let s=Object.keys(r.fields).sort((l,c)=>l.localeCompare(c)),a={};for(let l of s)a[l]=n(r.fields[l]);return{type:"object",fields:a}}if(r.type==="array"&&r.itemType)return{type:"array",item:n(r.itemType)};let i={type:r.type,optional:!!r.optional,nullable:!!r.nullable};return r.enumValues&&r.enumValues.length>0&&(i.enum=[...r.enumValues].sort()),r.format&&(i.format=r.format),i},t=JSON.stringify(n(e)),o=(0,ls.createHash)("sha256").update(t).digest("hex");return it.set(e,o),e._structureHash=o,o},st=(e,n=[],t="Root")=>{if(e.type==="object"&&e.fields){n.push({schema:e,parentKey:t});for(let[o,r]of Object.entries(e.fields))st(r,n,o)}else e.type==="array"&&e.itemType&&st(e.itemType,n,t+"Item")},ot=(e,n,t=new Set,o={})=>{if(e.type!=="object"||n.type!=="object"||!e.fields||!n.fields)return!1;let r=Object.keys(e.fields),i=Object.keys(n.fields),s=o.minFieldsForIsomorphic??2;if(r.length<s||i.length<s)return!1;let a=e._structureHash,l=n._structureHash,c=a&&l?`${a}-${l}`:void 0;if(c&&t.has(c))return!0;c&&t.add(c);let f=Array.from(new Set([...r,...i]));if(f.filter($=>e.fields[$]&&n.fields[$]).length===0)return!1;let p=0,m=0,d=0;for(let $ of f){let S=e.fields[$],T=n.fields[$];if(S&&T)if(S.type==="any"||T.type==="any")p++;else if(S.type===T.type)if(S.type==="object"&&S.fields&&T.fields)ot(S,T,t,o)?p++:m++;else if(S.type==="array"&&S.itemType&&T.itemType){let C=S.itemType,N=T.itemType;C.type==="any"||N.type==="any"?p++:C.type==="object"&&N.type==="object"?ot(C,N,t,o)?p++:m++:C.type===N.type?p++:m++}else p++;else m++;else{let C=S||T;C.optional||C.type==="any"?p++:d++}}let y=p+m+d;if(y===0)return!0;let g=p/y,b=o.minMatchRatio??.5,h=o.maxTypeMismatches??0;return g>=b&&m<=h},at=(e,n)=>{if(!(!e.fields||!n.fields)){for(let[t,o]of Object.entries(n.fields))if(!e.fields[t])e.fields[t]={...o,optional:!0};else{let r=e.fields[t];if(r.optional=r.optional||o.optional,r.nullable=r.nullable||o.nullable,r.type==="any")e.fields[t]={...o,optional:r.optional,nullable:r.nullable};else if(r.type==="string"&&o.type==="string"){if(r.enumValues||o.enumValues){let i=Array.from(new Set([...r.enumValues??[],...o.enumValues??[]]));r.enumValues=i.length<=6?i:void 0}}else r.type==="object"&&o.type==="object"?at(r,o):r.type==="array"&&r.itemType&&o.type==="array"&&o.itemType&&(r.itemType.type==="any"?r.itemType={...o.itemType}:r.itemType.type==="object"&&o.itemType.type==="object"?at(r.itemType,o.itemType):r.itemType.type===o.itemType.type&&(r.itemType=_e(r.itemType,o.itemType)))}for(let t of Object.keys(e.fields))n.fields[t]||(e.fields[t].optional=!0)}},El=e=>e.replace(/[^A-Za-z0-9_$]+([A-Za-z0-9_$])?/g,(n,t)=>t?t.toUpperCase():""),Il=(e,n={})=>{let t=n.sharedPrefix!==void 0?n.sharedPrefix:"Shared",o=[];for(let s of e){let a=!1;for(let l of o)if(ot(s.schema,l[0],new Set,n)){l.push(s.schema),a=!0;break}a||o.push([s.schema])}let r=new Set,i=[];for(let s of o){let a=1;if(s.length<2)continue;s.sort((d,y)=>Object.keys(y.fields||{}).length-Object.keys(d.fields||{}).length);let l=s[0],f=(e.find(d=>d.schema===l)||e.find(d=>s.includes(d.schema)))?.parentKey||"Object",u=Object.keys(l.fields||{}),p="";if(u.includes("city")&&(u.includes("street")||u.includes("zip")))p=t?`${t}Address`:"Address";else if(u.includes("amount")&&u.includes("currency"))p=t?`${t}Money`:"Money";else if(u.includes("created_at")&&u.includes("updated_at"))p=t?`${t}Metadata`:"Metadata";else if(u.includes("name")&&(u.includes("email")||u.includes("age")||u.includes("profile")||u.includes("role")))p=t?`${t}User`:"User";else if(u.includes("id")&&u.includes("profile")&&u.includes("permissions"))p=t?`${t}Member`:"Member";else{let d=s.map(h=>e.find($=>$.schema===h)?.parentKey).filter(h=>!!h&&h!=="Root"&&h!=="Object"),y=d.length>0?d.sort((h,$)=>h.length-$.length)[0]:f,g=new Set(["status","address","business","process","class","series","species","means","news","analysis","basis","crisis","thesis","oasis","bonus","genius","campus","focus","corpus","census","consensus","virus","canvas","atlas","alias","bias","gas"]);y.endsWith("s")&&!y.endsWith("ss")&&!g.has(y.toLowerCase())&&(y=y.slice(0,-1));let b=y.replace(/(^\w|_\w)/g,h=>h.replace(/_/,"").toUpperCase());p=t?`${t}${b}`:b}p=El(p);let m=p;for(;r.has(m);)m=`${p}${a++}`;r.add(m),i.push({group:s,semanticName:m})}return i},Ml=(e,n={})=>{let t=[];st(e,t,"Root");for(let r of t)r.schema._structureHash=_l(r.schema);let o=Il(t,n);for(let{group:r,semanticName:i}of o){if(n.disabledUnifications?.includes(i))continue;let s=n.customTypeNames?.[i]??i,a=r[0];for(let l=1;l<r.length;l++)at(a,r[l]);for(let l=1;l<r.length;l++)r[l].fields=a.fields;for(let l of r)l._sharedTypeName=s}};var Ye=(e,n,t="",o={})=>{try{if(!o._openAPIComponent&&mn(e)){let b=dn(e);if(b.length>0)return b.map(({name:$,schema:S},T)=>Ye(S,n,t,{...o,rootName:$,_openAPIComponent:T>0})).filter($=>typeof $=="string"&&$.trim()).join(`

`)}if(!o._openAPIComponent&&yn(e)){let b=gn(e);if(b.length>0)return b.map(({name:$,schema:S},T)=>Ye(S,n,t,{...o,rootName:$,_openAPIComponent:T>0})).filter($=>typeof $=="string"&&$.trim()).join(`

`)}let r=!!o._openAPIComponent,i=e&&e._isTypeMorphSchema?e:q(e);o.samplesMode&&i.type==="array"&&i.itemType&&(i=i.itemType);let s=o.rootName??"Root";!r&&!e?._isTypeMorphSchema&&as(i,s),r||Ml(i,o);let a="",l="",c=(n||t||"").toLowerCase();l=c;let f=s.charAt(0).toLowerCase()+s.slice(1);if(c==="typescript"||c==="ts")a=(r?"":`/**
 * TypeMorph Generated TypeScript Interface
 */
`)+Tt.generate(i,s,o);else if(c==="zod")a=(r?"":`import { z } from "zod";

`)+xt.generate(i,f,o);else if(c==="go"||c==="golang")a=Lt.generate(i,s,o);else if(c==="rust")a=It.generate(i,s,o);else if(c==="java")a=zt.generate(i,s,o);else if(c==="python"){let b=Nt.generate(i,s,o),h=[];/\bOptional\[/.test(b)&&h.push("Optional"),/\bList\[/.test(b)&&h.push("List"),/\bAny\b/.test(b)&&h.push("Any");let $=/\bField\(/.test(b)?`from pydantic import BaseModel, Field
`:`from pydantic import BaseModel
`;h.length&&($+=`from typing import ${h.join(", ")}
`),/:\s*datetime\b/.test(b)&&($+=`from datetime import datetime
`),a=(r?"":`${$}
`)+b}else c==="php"?a=(r?"":`<?php

`)+Ot.generate(i,s,o):c==="sql"||c==="prisma"?a=Ft.generate(i,s,o):c==="proto"||c==="protobuf"?a=(r?"":`// Protocol Buffers v3 specification

syntax = "proto3";

`)+vt.generate(i,s,o):c==="graphql"||c==="gql"?a=Rt.generate(i,s,o):c.includes("csv")?a=ti.generate(i):c.includes("sql-insert")?a=ri.generate(i,"table_name"):c.includes("mysql")?a=ii.generate(i,"Root"):c.includes("postgres")?a=si.generate(i,"Root"):c.includes("sqlite")?a=oi.generate(i,"Root"):c.includes("snowflake")?a=ai.generate(i,"Root"):c.includes("mongodb")||c.includes("mongoose")?a=Oi.generate(i,"Root"):c.includes("ruby")||c.includes("rails")?a=Zi.generate(i,"Root"):c.includes("django")?a=Wi.generate(i,"Root"):c.includes("dart")||c.includes("flutter")?a=jt.generate(i,"Root",o):c.includes("swift")?a=qt.generate(i):c.includes("kotlin")?a=Jt.generate(i):c.includes("csharp")||c.includes("c-sharp")?a=Ut.generate(i):c.includes("openapi")?a=Si.generate(i,"Root"):c.includes("jsonschema")?a=Kt.generate(i):c.includes("yup")?a=cn.generate(i,"root"):c.includes("joi")?a=un.generate(i,"root"):c.includes("valibot")?a=fn.generate(i,"root"):c.includes("react-props")?a=Ci.generate(i,"Component"):c.includes("vue-props")?a=Ii.generate(i,"Component"):c.includes("svelte-props")?a=Mi.generate(i,"Component"):c.includes("solid-props")?a=Li.generate(i,"Component"):c.includes("react-context")?a=Ri.generate(i,"Root"):c.includes("react-query")?a=Hi.generate(i,s):c.includes("api-route")||c.includes("nextjs-api")?a=Ki.generate(i,s):c.includes("redux-slice")?a=_i.generate(i,"root"):c.includes("pinia")?a=Ei.generate(i,"root"):c.includes("sequelize")?a=ki.generate(i,"Root"):c.includes("typeorm")?a=Ni.generate(i,"Root"):c.includes("drizzle")?a=wi.generate(i,"Root"):c.includes("kysely")?a=vi.generate(i,"Root"):c.includes("superstruct")?a=pn.generate(i,"root"):c.includes("arduino")?a=zi.generate(i,"Data"):c.includes("mock")?a=Gt.generate(i):c.includes("ui")?a=Dt.generate(i,"Component"):c.includes("asciidoc")?a=di.generate(i):c.includes("doc")?a=en.generate(i):c.includes("avro")?a=hi.generate(i,"Root"):c.includes("toml")?a=li.generate(i,"config"):c.includes("yaml")?a=ci.generate(i):c.includes("env-validator")?a=fi.generate(i):c.includes("env")?a=ui.generate(i):c.includes("properties")?a=pi.generate(i):c.includes("markdown")?a=mi.generate(i):c.includes("latex")?a=yi.generate(i):c.includes("mermaid")?a=gi.generate(i,"Root"):c.includes("bigquery")?a=bi.generate(i):c.includes("dynamodb")?a=$i.generate(i,"Root"):c.includes("postman")?a=Ti.generate(i):c.includes("http")?a=xi.generate(i):c.includes("vscode")?a=Ai.generate(i):c.includes("curl")?a=ji.generate(i):c.includes("cobol")?a=Fi.generate(i,"ROOT"):c.includes("clojure")?a=Di.generate(i,"Root"):c.includes("elixir")?a=Gi.generate(i,"Root"):c.includes("elm")?a=Pi.generate(i,"Root"):c.includes("godot")||c.includes("gdscript")?a=Ui.generate(i,"Root"):c.includes("haskell")?a=Vi.generate(i,"Root"):c.includes("r-lang")||c==="r"?(a=qi.generate(i,"Root"),l="r-lang"):c.includes("scala")?a=Bi.generate(i,"Root"):c.includes("solidity")?a=Ji.generate(i,"Root"):c.includes("cpp")||c.includes("c++")||c.includes("cpp-struct")||c.includes("cpp-class")?a=Qi.generate(i,s):c==="c"||c.includes("c-struct")||c.includes("json-to-c")?a=Yi.generate(i,s):c.includes("zod-migrate")||c.includes("zod-v3")||c.includes("zod-v4")?(a=`/* Zod v4 Migration \u2014 paste your Zod v3 schema in the \u2B06 Zod v4 tab */
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
export type User = z.infer<typeof UserSchema>;`,l="ts-to-zod"):c.includes("mcp-tool")||c.includes("mcp")?a=es.generate(i,s):c.includes("openai-function")||c.includes("openai-func")?a=ns.generate(i,s):c.includes("vercel-ai-tool")||c.includes("vercel-ai")?a=ts.generate(i,s):c.includes("nestjs-dto")||c.includes("nestjs")?a=Zt.generate(i,s,o):c.includes("effect-schema")||c.includes("effect")?a=Ht.generate(i,f,o):c.includes("llm-response")||c.includes("llm-validator")||c.includes("llm-zod")?a=Xi.generate(i,s):(c.includes("type-guard")||c.includes("typeguard"))&&(a=(r?"":`/**
 * TypeMorph Generated Type Guards
 * No runtime dependencies required
 */
`)+Yt.generate(i,s,o));let u=new Set(["typescript","ts","zod","go","golang","rust","java","python","php","sql","prisma","proto","protobuf","graphql","gql","json","r"]),p=["csv","sql-insert","mysql","postgres","sqlite","snowflake","mongodb","mongoose","ruby","rails","django","dart","flutter","swift","kotlin","csharp","c-sharp","openapi","jsonschema","yup","joi","valibot","react-props","vue-props","svelte-props","solid-props","react-context","react-query","api-route","nextjs-api","redux-slice","pinia","sequelize","typeorm","drizzle","kysely","superstruct","arduino","mock","ui","doc","avro","toml","yaml","env-validator","env","properties","markdown","asciidoc","latex","mermaid","bigquery","dynamodb","postman","http","vscode","curl","cobol","clojure","elixir","elm","godot","gdscript","haskell","r-lang","scala","solidity","cpp","c++","cpp-struct","cpp-class","c-struct","json-to-c","mcp-tool","mcp","openai-function","openai-func","vercel-ai-tool","vercel-ai","nestjs-dto","nestjs","effect-schema","effect","llm-response","llm-validator","llm-zod","type-guard","typeguard"],m=u.has(c)||p.some(b=>c.includes(b));c==="json"?a=JSON.stringify(e,null,2):!a&&m?a=`// No output generated for "${n||t||c}". The input may be empty or lack the structure this format expects.`:a||(l="unsupported",ss(n||t||"unknown",c),a=`// Unsupported output target: "${n||t||"unknown"}"
// Supported targets include: typescript, zod, go, rust, java, python, php, sql, protobuf, graphql, swift, kotlin, jsonschema, mock, ui, doc, openapi, yup, joi, valibot, react-props, vue-props, svelte-props, solid-props, react-context, redux-slice, pinia, sequelize, typeorm, drizzle, kysely, superstruct, arduino, clojure, elixir, elm, godot, haskell, r, scala, solidity
`);let d="",y=l.toLowerCase();for(let[b,h]of Object.entries(Cl))if(y===b){d=h;break}let g=d&&!r?d+a:a;return Rl(g)}catch(r){return"// Error: "+String(r)}};var Ll=/email|url|link|href|website|endpoint|uuid|guid|^id$|_id$|Id$|ID$|date|_at$|At$|time|timestamp|phone|\btel\b|zip|postal|^ip$|ip_/i,zl=/^(name|label|title|description|desc|summary|body|content|text|message|note|notes|comment|comments|bio|about|reason|details|info|caption|heading|subtitle|excerpt|overview|remark|remarks|placeholder|hint|tooltip|instruction|instructions|query|search|address|street|city|country|state|province|slug|tag|category|type|status|kind|mode|locale|lang|language|currency|unit|format|source|target|key|value|data)$/i,Fl=/password|passwd|secret|token|apikey|api_key|auth|credential|private/i,Dl={email:/email/i,url:/url|link|href|website|endpoint/i,uuid:/uuid|guid/i,id:/^id$|_id$|Id$|ID$/,date:/date|_at$|At$|time|timestamp/i,phone:/phone|tel/i,ip:/^ip$|ip_|ipAddr|ip_address/i};function Gl(e){return/^[a-z][a-zA-Z0-9]*$/.test(e)&&e!==e.toUpperCase()}function Pl(e){return/^[a-z][a-z0-9_]*$/.test(e)&&e.includes("_")}function Ul(e){return/^[A-Z][a-zA-Z0-9]*$/.test(e)}function fs(e){return Pl(e)?"snake_case":Ul(e)?"PascalCase":Gl(e)?"camelCase":"other"}function lt(e,n,t,o,r){if(!(t>20))if(o.maxDepth=Math.max(o.maxDepth,t),e.type==="object"&&e.fields)for(let[i,s]of Object.entries(e.fields)){let a=n?`${n}.${i}`:i;if(o.total++,o.nameCounts[fs(i)]=(o.nameCounts[fs(i)]??0)+1,s.type==="any"&&(o.anyCount++,r.push({severity:"warning",message:"Has `any` type \u2014 add a specific type",path:a})),s.optional?o.optionalCount++:o.requiredCount++,s.type==="string"){let l=!!s.format,c=Object.values(Dl).some(f=>f.test(i));l||c?o.formattedCount++:Ll.test(i)&&!zl.test(i)&&o.semanticUnformatted.push({path:a}),Fl.test(i)&&r.push({severity:"info",message:"May contain sensitive data \u2014 consider hashing or omitting",path:a})}lt(s,a,t+1,o,r)}else e.type==="array"&&e.itemType&&lt(e.itemType,`${n}[]`,t+1,o,r)}function Vl(e){let n=Object.entries(e).filter(([,i])=>i>0);if(n.length===0)return"unknown";n.sort((i,s)=>s[1]-i[1]);let t=n.reduce((i,[,s])=>i+s,0),[o,r]=n[0];return r/t>=.8?o:"mixed"}function ql(e){return e>=90?"A":e>=75?"B":e>=60?"C":e>=40?"D":"F"}function ps(e){let n=[],t={total:0,anyCount:0,formattedCount:0,semanticUnformatted:[],optionalCount:0,requiredCount:0,nameCounts:{camelCase:0,snake_case:0,PascalCase:0,other:0},maxDepth:0};lt(e,"",0,t,n);let o=100;if(t.total>0){let i=t.anyCount/t.total,s=Math.round(i*50);s>0&&(o-=s)}if(t.semanticUnformatted.length>0){let i=Math.min(20,t.semanticUnformatted.length*5);o-=i;for(let{path:s}of t.semanticUnformatted.slice(0,3))n.push({severity:"info",message:"Looks like it needs a format constraint (uuid, email, datetime\u2026)",path:s});t.semanticUnformatted.length>3&&n.push({severity:"info",message:`${t.semanticUnformatted.length-3} more fields may need format constraints`})}let r=Vl(t.nameCounts);if(r==="mixed"&&t.total>=2&&(o-=15,n.push({severity:"warning",message:"Field names mix camelCase and snake_case \u2014 pick one style consistently"})),t.maxDepth>4){let i=Math.min(10,(t.maxDepth-4)*2);o-=i,t.maxDepth>6&&n.push({severity:"warning",message:`Schema is ${t.maxDepth} levels deep \u2014 consider flattening or splitting`})}return t.total>=3&&t.requiredCount===0&&(o-=10,n.push({severity:"warning",message:"All fields are optional \u2014 mark required fields to improve type safety"})),t.total===1&&n.push({severity:"info",message:"Only 1 field \u2014 quality score is based on limited data"}),o=Math.max(0,Math.min(100,o)),{score:o,grade:ql(o),issues:n,stats:{totalFields:t.total,anyFields:t.anyCount,formattedFields:t.formattedCount,optionalFields:t.optionalCount,requiredFields:t.requiredCount,maxDepth:t.maxDepth,namingStyle:r}}}function ms(e){return e.toLowerCase().replace(/[^a-z0-9]/g,"")}function ct(e,n){let t=ms(e),o=ms(n);if(t===o)return 3;if(t.includes(o)||o.includes(t))return 2;let r=Math.min(t.length,o.length);if(r>=4){let i=0;for(;i<r&&t[i]===o[i];)i++;if(i>=4)return 1}return 0}function Bl(e,n){let t=Object.keys(e).filter(s=>!(s in n)),o=Object.keys(n).filter(s=>!(s in e)),r=new Map,i=new Set;for(let s of[!0,!1])for(let a of t){if(r.has(a))continue;let l=o.filter(u=>i.has(u)||s&&e[a].type!==n[u].type?!1:ct(a,u)>0);if(l.length===0)continue;let c=Math.max(...l.map(u=>ct(a,u))),f=l.filter(u=>ct(a,u)===c);f.length===1&&(r.set(a,f[0]),i.add(f[0]))}return r}function hn(e,n,t="root"){let o=[];function r(i,s,a){let l=a.replace(/^root\.?/,"")||"root";if(i.type!==s.type){o.push({path:l,type:"type_changed",oldType:i.type,newType:s.type,severity:"error",description:`'${l}' changed type from '${i.type}' to '${s.type}'.`});return}!i.optional&&s.optional&&o.push({path:l,type:"required_changed",severity:"warning",description:`'${l}' changed from required to optional. Consumers must handle undefined.`}),i.optional&&!s.optional&&o.push({path:l,type:"required_changed",severity:"error",description:`'${l}' changed from optional to required. Existing payloads missing this field will be invalid.`}),!i.nullable&&s.nullable&&o.push({path:l,type:"nullable_changed",severity:"info",description:`'${l}' became nullable. Add null-checks if needed.`}),i.nullable&&!s.nullable&&o.push({path:l,type:"nullable_changed",severity:"warning",description:`'${l}' is no longer nullable. Existing null values will be invalid.`}),(i.format??"")!==(s.format??"")&&o.push({path:l,type:"format_changed",oldType:i.format??"none",newType:s.format??"none",severity:i.format&&!s.format?"warning":"info",description:`'${l}' format changed from '${i.format??"none"}' to '${s.format??"none"}'.`});let c=i.enumValues??[],f=s.enumValues??[];if(c.length>0||f.length>0){let u=c.filter(m=>!f.includes(m)),p=f.filter(m=>!c.includes(m));u.length>0&&o.push({path:l,type:"enum_changed",severity:"error",description:`Enum values removed from '${l}': ${u.map(m=>`"${m}"`).join(", ")}. Existing data with these values will be invalid.`}),p.length>0&&o.push({path:l,type:"enum_changed",severity:"info",description:`New enum values added to '${l}': ${p.map(m=>`"${m}"`).join(", ")}.`})}if(i.type==="object"&&s.type==="object"){let u=i.fields??{},p=s.fields??{},m=Bl(u,p),d=new Set(m.values());for(let y of Object.keys(u)){let g=l==="root"?"":l+".";if(!(y in p))if(m.has(y)){let b=m.get(y),h=u[y].type!==p[b].type;o.push({path:`${g}${y}`,type:"renamed",oldType:y,newType:b,severity:"error",description:h?`'${y}' renamed to '${b}' (type: ${u[y].type} \u2192 ${p[b].type}). Clients using the old name will break.`:`'${y}' renamed to '${b}'. Clients using the old name will break.`}),!h&&u[y].type==="object"&&r(u[y],p[b],`${a}.${b}`)}else{let b=!u[y].optional;o.push({path:`${g}${y}`,type:"removed",oldType:u[y].type,severity:b?"error":"warning",description:b?`Required field '${y}' was removed. This is a breaking change.`:`Optional field '${y}' was removed.`})}}for(let y of Object.keys(p)){let g=l==="root"?"":l+".";if(y in u||d.has(y))continue;let b=!p[y].optional;o.push({path:`${g}${y}`,type:"added",newType:p[y].type,severity:b?"error":"info",description:b?`New required field '${y}' added. Existing payloads missing this field will be invalid.`:`New optional field '${y}' added.`})}for(let y of Object.keys(u))y in p&&r(u[y],p[y],`${a}.${y}`)}i.type==="array"&&s.type==="array"&&i.itemType&&s.itemType&&r(i.itemType,s.itemType,`${a}[]`)}return r(e,n,t),o}function Jl(e){let n=e.toLowerCase();return/(_id$|^id$)/.test(n)||/Id$/.test(e)?"a1b2c3d4-e5f6-7890-abcd-ef1234567890":/email/.test(n)?"user@example.com":/url|link|href|uri|website/.test(n)?"https://example.com":/(_at$|_date$|_time$)/.test(n)||/^(created|updated|deleted|started|ended|expires|published)/.test(n)?"2024-01-01T00:00:00Z":/phone|tel/.test(n)?"+1-555-000-0000":/zip|postal/.test(n)?"10001":/country/.test(n)?"US":/currency/.test(n)?"USD":/language|locale/.test(n)?"en":/color|colour/.test(n)?"#000000":/password|secret|token|key/.test(n)?"example-token":/name/.test(n)?"Example Name":/title/.test(n)?"Example Title":/description|desc|body|content|message|note/.test(n)?"Example text":/path|route/.test(n)?"/example":/status|type|kind|category|tag|label/.test(n)?"active":"string"}function Wl(e){let n=e.toLowerCase();return/price|amount|cost|fee|balance|salary|budget|total|subtotal/.test(n)?9.99:/percent|rate/.test(n)?50:/lat/.test(n)?35.6895:/lng|lon/.test(n)?139.6917:/year/.test(n)?2024:/month/.test(n)||/day/.test(n)?1:/age/.test(n)?30:/count|quantity|qty|size|length/.test(n)||/index|rank|page/.test(n)?1:0}function Ee(e,n,t,o,r){if(r>6)return null;let i=e.trim().replace(/;$/,"");if(i.includes("|")){let f=i.split("|").map(u=>u.trim()).filter(u=>u!=="null"&&u!=="undefined"&&u!=="never"&&u!=="void");return f.length===0?null:Ee(f[0],n,t,o,r)}if(i==="string")return Jl(n);if(i==="number"||i==="bigint"||i==="int"||i==="float")return Wl(n);if(i==="boolean")return!1;if(i==="null"||i==="undefined"||i==="void"||i==="never"||i==="any"||i==="unknown")return null;if(i==="true")return!0;if(i==="false")return!1;if(i==="object"||i==="Record<string,unknown>"||i==="Record<string, unknown>")return{};let s=i.match(/^['"](.+)['"]$/);if(s)return s[1];if(/^-?\d+(\.\d+)?$/.test(i))return parseFloat(i);let a=i.match(/^(.+)\[\]$/);if(a)return[Ee(a[1].trim(),n,t,o,r+1)];let l=i.match(/^Array<(.+)>$/);if(l)return[Ee(l[1].trim(),n,t,o,r+1)];let c=i.match(/^(?:Partial|Required|Readonly|NonNullable|Promise)<(.+)>$/);return c?Ee(c[1].split(",")[0].trim(),n,t,o,r):/^(Record|Map|Set)</.test(i)?{}:t.has(i)?o.has(i)?{}:ds(t.get(i),t,new Set([...o,i]),r+1):i.startsWith("{")&&i.endsWith("}")?Zl(i.slice(1,-1),t,o,r+1):null}function Zl(e,n,t,o){if(o>6)return{};let r={};for(let i of He(e)){if(/^\[/.test(i))continue;let s=i.match(/^(?:readonly\s+)?(\w+)(\?)?\s*:\s*([\s\S]+)$/);if(!s)continue;let[,a,,l]=s;r[a]=Ee(l.replace(/[;,]\s*$/,"").trim(),a,n,t,o)}return r}function ds(e,n,t,o){let r={};for(let i of e.fields)r[i.name]=Ee(i.type,i.name,n,t,o);return r}function Kl(e){let n=[],t=/(?:export\s+)?type\s+(\w+)\s*=\s*\{/g,o;for(;(o=t.exec(e))!==null;){let r=1,i=o.index+o[0].length;for(;i<e.length&&r>0;){let l=e[i++];l==="{"?r++:l==="}"&&r--}let s=e.slice(o.index+o[0].length,i-1),a=[];for(let l of He(s)){if(/^\[/.test(l))continue;let c=l.match(/^(?:readonly\s+)?(\w+)(\?)?\s*:\s*([\s\S]+)$/);c&&a.push({name:c[1],type:c[3].replace(/[;,]\s*$/,"").trim(),optional:c[2]==="?"})}n.push({id:o[1],label:o[1],fields:a,isRoot:!1})}return n}function Hl(e){return e.replace(/\[\]/g,"").split(/[|&,\s<>]+/).map(n=>n.trim()).filter(n=>n.length>0&&/^[A-Z]/.test(n))}function ys(e){try{let n=Qn(e),t=Kl(e).filter(c=>!n.nodes.some(f=>f.id===c.id)),o=[...n.nodes,...t];if(o.length===0)return{json:"",error:`No TypeScript interfaces or object type aliases found.

Example:

interface User {
  user_id: string;
  name: string;
  email: string;
  age: number;
}`};let r=new Map(o.map(c=>[c.id,c])),i=new Set;for(let c of o)for(let f of c.fields)for(let u of Hl(f.type))r.has(u)&&u!==c.id&&i.add(u);let s=o.filter(c=>!i.has(c.id)),a=s.length>0?s[0]:o[0],l=ds(a,r,new Set([a.id]),0);return{json:JSON.stringify(l,null,2)}}catch(n){return{json:"",error:n instanceof Error?n.message:"Parse error"}}}function Ie(e){return e===null?"null":Array.isArray(e)?"array":typeof e}function $e(e){let n;try{n=typeof e=="string"?`"${e}"`:JSON.stringify(e)}catch{n=String(e)}return n==null&&(n=String(e)),n.length>40?n.slice(0,37)+"\u2026":n}function Yl(e){return e.trim()!==""&&!Number.isNaN(Number(e))}var gs={uuid:e=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(e),email:e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e),url:e=>/^https?:\/\/\S+$/i.test(e),datetime:e=>/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(e),date:e=>/^\d{4}-\d{2}-\d{2}$/.test(e),ip:e=>/^(\d{1,3}\.){3}\d{1,3}$|:/.test(e)};function bn(e,n,t,o,r,i){if(!(e.type==="any"||e.type==="union")){if(n===null){e.nullable||r.push({recordIndex:o,path:t,code:"null",severity:"error",message:`${ee(t)} was null (expected ${e.type})`});return}if(n!==void 0)switch(e.type){case"object":{if(Ie(n)!=="object"){r.push({recordIndex:o,path:t,code:"type",severity:"error",message:`${ee(t)}: expected object, got ${Ie(n)} (${$e(n)})`});return}let s=n,a=e.fields??{};for(let l of Object.keys(a)){let c=a[l],f=t?`${t}.${l}`:l;if(!(l in s)||s[l]===void 0){c.optional||r.push({recordIndex:o,path:f,code:"missing",severity:"error",message:`missing required field ${ee(f)} (expected ${hs(c)})`});continue}bn(c,s[l],f,o,r,i)}if(i.extraFields!=="ignore")for(let l of Object.keys(s)){if(l in a)continue;let c=t?`${t}.${l}`:l;r.push({recordIndex:o,path:c,code:"extra",severity:i.extraFields==="error"?"error":"warning",message:`unexpected field ${ee(c)} appeared (not in schema)`})}return}case"array":{if(!Array.isArray(n)){r.push({recordIndex:o,path:t,code:"type",severity:"error",message:`${ee(t)}: expected array, got ${Ie(n)} (${$e(n)})`});return}if(e.tupleTypes&&e.tupleTypes.length>0){e.tupleTypes.forEach((s,a)=>{a<n.length&&bn(s,n[a],`${t}[${a}]`,o,r,i)});return}e.itemType&&n.forEach((s,a)=>bn(e.itemType,s,`${t}[${a}]`,o,r,i));return}case"string":{if(typeof n!="string"){r.push({recordIndex:o,path:t,code:"type",severity:"error",message:`${ee(t)}: expected string, got ${Ie(n)} (${$e(n)})`});return}e.enumValues&&e.enumValues.length>0&&!e.enumValues.includes(n)&&r.push({recordIndex:o,path:t,code:"enum",severity:"warning",message:`${ee(t)}: unexpected value ${$e(n)} (expected ${e.enumValues.join(" | ")})`}),e.format&&gs[e.format]&&!gs[e.format](n)&&r.push({recordIndex:o,path:t,code:"format",severity:"warning",message:`${ee(t)}: not a valid ${e.format} (${$e(n)})`});return}case"number":{if(typeof n!="number"){let s=typeof n=="string"&&Yl(n);r.push({recordIndex:o,path:t,code:"type",severity:"error",message:`${ee(t)}: expected number, got ${Ie(n)} (${$e(n)})`,fix:s?"model returned a quoted number \u2192 use z.coerce.number()":void 0})}return}case"boolean":{if(typeof n!="boolean"){let s=n==="true"||n==="false"||n===0||n===1;r.push({recordIndex:o,path:t,code:"type",severity:"error",message:`${ee(t)}: expected boolean, got ${Ie(n)} (${$e(n)})`,fix:s?"use z.coerce.boolean() or normalize the value":void 0})}return}}}}function ee(e){return e?`"${e}"`:"root"}function hs(e){return e.type==="array"?`${e.itemType?hs(e.itemType):"any"}[]`:e.enumValues&&e.enumValues.length>0?e.enumValues.map(n=>`"${n}"`).join(" | "):e.format?`${e.type} (${e.format})`:e.type}var Ql={missing:"missing field",type:"wrong type",null:"null violation",enum:"unexpected enum value",format:"format drift",extra:"extra field"};function bs(e,n,t={}){let o={strict:t.strict??!1,extraFields:t.extraFields??"warn"},r=[],i=0;n.forEach((l,c)=>{let f=r.length;bn(e,l,"",c,r,o);let u=r.slice(f);(o.strict?u.length>0:u.some(m=>m.severity==="error"))&&i++});let s=new Map;for(let l of r)s.set(l.code,(s.get(l.code)??0)+1);let a=[...s.entries()].map(([l,c])=>({code:l,label:Ql[l],count:c})).sort((l,c)=>c.count-l.count);return{total:n.length,passed:n.length-i,failed:i,issues:r,summary:a,ok:i===0}}var B=e=>`\x1B[1m${e}\x1B[0m`,_=e=>`\x1B[2m${e}\x1B[0m`,R=e=>`\x1B[31m${e}\x1B[0m`,fe=e=>`\x1B[33m${e}\x1B[0m`,Q=e=>`\x1B[32m${e}\x1B[0m`,ft=e=>`\x1B[36m${e}\x1B[0m`,Sn=e=>`\x1B[34m${e}\x1B[0m`;function ne(e){let n=Le.resolve(e);return K.existsSync(n)||(console.error(R(`File not found: ${e}`)),process.exit(1)),K.readFileSync(n,"utf8")}function $n(){return new Promise(e=>{let n="",t=As.createInterface({input:process.stdin});t.on("line",o=>n+=o+`
`),t.on("close",()=>e(n.trim()))})}function Se(e){let n=e.trim();try{return{obj:JSON.parse(n),raw:n}}catch{}try{return{obj:et(n),raw:n}}catch{}console.error(R("typemorph: input is not valid JSON or YAML")),process.exit(1)}function Tn(e){let{obj:n}=Se(e);if(mn(n)){let t=dn(n);return t.length>0?t:[{name:"Root",schema:q(n)}]}if(yn(n)){let t=gn(n);return t.length>0?t:[{name:"Root",schema:q(n)}]}return[{name:"Root",schema:q(n)}]}function Xl(e){return Tn(e)[0].schema}var ec={"TypeScript / Validation":["typescript","zod","yup","joi","valibot"],Backend:["go","rust","java","csharp","python","swift","kotlin","php","dart"],Database:["prisma","mysql","postgres","sqlite","mongoose","sequelize","typeorm","drizzle","dynamodb","bigquery","mongodb"],"API / Schema":["openapi","graphql","proto","jsonschema"],"AI Tools":["mcp-tool","openai-function","vercel-ai-tool"],"Data / Markup":["csv","sql","toml","yaml","avro"],"Docs / Mock":["doc","mock"]};function nc(){console.log(B(`
  typemorph \u2014 available formats
`));for(let[e,n]of Object.entries(ec))console.log(B(`  ${e}`)),console.log(_("  "+n.join("  "))),console.log();console.log(_(`  Usage: typemorph <format> [file.json]  or  cat data.json | typemorph <format>
`))}var tc=`
${B("typemorph")} \u2014 schema engineering CLI

${B("USAGE")}
  typemorph <format> [file]           Convert schema to target format
  typemorph <format> <f1> <f2> ...    Merge multiple files as samples of one schema
  typemorph reverse  [file.ts]        Generate JSON sample from TypeScript interfaces
  typemorph quality  [file]           Grade schema quality (A\u2013F)
  typemorph diff     <old> <new>      Detect breaking changes
  typemorph check    [file]           Detect API schema drift against a saved baseline
  typemorph envdiff                   Compare two live environments (staging vs prod)
  typemorph validate <schema> <out>   Validate LLM/API JSON output against a Zod schema
  typemorph validate --infer <out>    Infer a Zod schema from known-good outputs
  typemorph list                      Show all formats

${B("OPTIONS")}
  --root, -r <name>     Root class name for convert / infer (default: Root)
  --samples             Treat a single array input as samples of one schema (convert)
  --schema <name>       Target a specific named schema (OpenAPI/JSON Schema)
  --min-grade <grade>   Fail (exit 1) if quality grade is below threshold (quality)
  --breaking-only       Only show breaking changes (diff)
  --url <url>           URL to fetch JSON from (check)
  --baseline <file>     Path to baseline snapshot file (check)
  --update              Update baseline instead of failing on drift (check)
  --header <H:V>        HTTP header for authenticated endpoints, repeatable (check, envdiff)
  --a <url|file>        First environment URL or file (envdiff)
  --b <url|file>        Second environment URL or file (envdiff)
  --infer               Infer a schema from good outputs instead of validating (validate)
  --strict              Treat warnings (extra fields, drift) as failures (validate)
  --out <file>          Write inferred schema to a file (validate --infer)
  --format <fmt>        Report format: pretty | json | github (validate, check)
  --json                Output results as JSON (quality, diff)
  --version, -v         Show version
  --help,    -h         Show this help

${B("EXAMPLES")}
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
  typemorph check     --url https://api.example.com/users --baseline .typemorph/users.json
  typemorph check     --url https://api.example.com/users --baseline .typemorph/users.json --format github
  typemorph mcp-tool        schema.json --root SearchTool     # MCP tool definition
  typemorph openai-function schema.json --root GetUser        # OpenAI function calling
  typemorph vercel-ai-tool  schema.json --root FetchOrder     # Vercel AI SDK tool
  typemorph check     --url https://api.example.com/users --baseline .typemorph/users.json --update
  typemorph check     --url https://api.example.com/users --baseline .typemorph/users.json --header "Authorization: Bearer $TOKEN"
  typemorph check     response.json --baseline .typemorph/users.json
  typemorph envdiff   --a https://staging.api.com/users --b https://prod.api.com/users
  typemorph envdiff   --a https://staging.api.com/users --b https://prod.api.com/users --format github
  typemorph envdiff   staging.json prod.json
  typemorph validate  schema.ts responses.jsonl
  typemorph validate  schema.ts outputs.json --strict --format github
  typemorph validate  --infer good-outputs.jsonl --out schema.ts
  typemorph reverse   models.ts
  cat types.ts | typemorph reverse
  typemorph list
`,Me=["A","B","C","D","F"];function $s(e,n){return e==="A"?Q(n):e==="B"?ft(n):e==="C"?fe(n):R(n)}function rc(e,n){return Me.indexOf(e)>Me.indexOf(n)}function ic(e,n){let t=Tn(e);if(n.schema){let i=t.find(s=>s.name.toLowerCase()===n.schema.toLowerCase());i||(console.error(R(`Schema "${n.schema}" not found. Available: ${t.map(s=>s.name).join(", ")}`)),process.exit(1)),t=[i]}let o=t.map(({name:i,schema:s})=>({name:i,...ps(s)})),r=o.reduce((i,s)=>Me.indexOf(s.grade)>Me.indexOf(i.grade)||s.grade===i.grade&&s.score<i.score?s:i);if(n.json)process.stdout.write(JSON.stringify({schemas:o.map(({name:i,grade:s,score:a,issues:l,stats:c})=>({name:i,grade:s,score:a,issues:l,stats:c})),worst:{name:r.name,grade:r.grade,score:r.score}},null,2)+`
`);else{let i=o.length>1;if(i){console.log(`
  ${B("Schema Quality")}  ${_(`(${o.length} schemas)`)}
`);let a=Math.max(...o.map(l=>l.name.length));for(let l of o){let c=$s(l.grade,`${l.grade}  ${l.score}/100`),f=l.name.padEnd(a),u=l.issues[0]?_(`  \u2014 ${l.issues[0].message}`):"";console.log(`  ${B(f)}  ${c}${u}`)}console.log(),o.length>1&&console.log(_(`  Worst: ${r.name}  ${r.grade}  ${r.score}/100`))}else{let a=o[0],l=$s(a.grade,`${a.grade}  ${a.score}/100`);console.log(`
  ${B("Schema Quality Score")}  ${l}
`),console.log(_(`  Fields: ${a.stats.totalFields}  |  any: ${a.stats.anyFields}  |  optional: ${a.stats.optionalFields}  |  naming: ${a.stats.namingStyle}  |  depth: ${a.stats.maxDepth}`))}let s=i?null:o[0];if(s)if(s.issues.length===0)console.log(Q(`
  \u2713 No issues found`));else{console.log();for(let a of s.issues){let l=a.severity==="error"?R("\u2716"):a.severity==="warning"?fe("\u26A0"):_("\u2139"),c=a.path?_(` [${a.path}]`):"";console.log(`  ${l}  ${a.message}${c}`)}}console.log()}n.minGrade&&rc(r.grade,n.minGrade)&&(n.json||console.error(R(`  \u2716 ${r.name}: Grade ${r.grade} is below required minimum ${n.minGrade}`)),process.exit(1))}function xn(e){return e.severity==="error"?R(`\u2716  ${e.description}`):e.severity==="warning"?fe(`\u26A0  ${e.description}`):_(`\u2139  ${e.description}`)}function sc(e,n,t){if(t.schema){let o=t.schema.toLowerCase(),r=e.find(s=>s.name.toLowerCase()===o),i=n.find(s=>s.name.toLowerCase()===o);return r||(console.error(R(`Schema "${t.schema}" not found in old file`)),process.exit(1)),i||(console.error(R(`Schema "${t.schema}" not found in new file`)),process.exit(1)),[ut(t.schema,r.schema,i.schema,t.breakingOnly)]}if(e.length>1||n.length>1){let o=new Map(e.map(s=>[s.name,s.schema])),r=new Map(n.map(s=>[s.name,s.schema]));return[...new Set([...o.keys(),...r.keys()])].map(s=>{let a=o.get(s),l=r.get(s);return a?l?ut(s,a,l,t.breakingOnly):{name:s,score:0,breaking:1,warnings:0,info:0,diffs:[{path:s,type:"removed",severity:"error",description:`Schema "${s}" was removed. All consumers will break.`}]}:{name:s,score:0,breaking:1,warnings:0,info:0,diffs:[{path:s,type:"added",severity:"error",description:`Schema "${s}" was added (new schema, existing consumers unaffected \u2014 but flag for review)`}]}})}return[ut(e[0].name,e[0].schema,n[0].schema,t.breakingOnly)]}function ut(e,n,t,o){let r=hn(n,t),i=r.filter(f=>f.severity==="error").length,s=r.filter(f=>f.severity==="warning").length,a=r.filter(f=>f.severity==="info").length,l=Math.max(0,100-i*15-s*5),c=o?r.filter(f=>f.severity==="error"):r;return{name:e,score:l,breaking:i,warnings:s,info:a,diffs:c}}function oc(e,n,t){let o=Tn(e),r=Tn(n),i=sc(o,r,t),s=i.reduce((f,u)=>f+u.breaking,0),a=i.reduce((f,u)=>f+u.warnings,0),l=i.reduce((f,u)=>f+u.info,0),c=i.length===1?i[0].score:Math.max(0,100-s*15-a*5);if(t.json)process.stdout.write(JSON.stringify({score:c,breaking:s,warnings:a,info:l,schemas:i},null,2)+`
`);else{let f=c>=90?Q(`${c}/100`):c>=60?fe(`${c}/100`):R(`${c}/100`),u=i.length>1,p=u?`${B("Breaking Change Detector")}  ${_(`(${i.length} schemas)`)}  Compatibility ${f}`:`${B("Breaking Change Detector")}  Compatibility ${f}  ${_("(\u221215/breaking \xB7 \u22125/warning)")}`;console.log(`
  ${p}
`);for(let m of i)if(u){let d=m.breaking>0?R(`\u2716 ${m.breaking} breaking`):m.warnings>0?fe(`\u26A0 ${m.warnings} warnings`):Q("\u2713 clean");if(console.log(`  ${B(m.name.padEnd(20))}  ${d}`),m.diffs.length>0){for(let y of m.diffs){let g=y.path?Sn(`    ${y.path}`):"";g&&console.log(g),console.log(`      ${xn(y)}`)}console.log()}}else if(m.diffs.length===0)console.log(Q("  \u2713 No "+(t.breakingOnly?"breaking ":"")+"changes detected"));else for(let d of m.diffs){let y=d.path?Sn(`  ${d.path}`):"";y&&console.log(y),console.log(`    ${xn(d)}`)}console.log(_(`
  ${s} breaking  \xB7  ${a} warnings  \xB7  ${l} info
`))}s>0&&process.exit(1)}async function Ss(e,n){if(/^https?:\/\//.test(e)){let t;try{t=await fetch(e,{headers:n})}catch(o){console.error(R(`envdiff: failed to fetch ${e} \u2014 ${o?.message??o}`)),process.exit(1)}return t.ok||(console.error(R(`envdiff: HTTP ${t.status} from ${e}`)),process.exit(1)),t.text()}return ne(e)}async function ac(e){let[n,t]=await Promise.all([Ss(e.a,e.headers),Ss(e.b,e.headers)]),{obj:o}=Se(n),{obj:r}=Se(t),i=q(o),s=q(r),a=e.label?.[0]??e.a,l=e.label?.[1]??e.b,c=hn(i,s),f=e.breakingOnly?c.filter(y=>y.severity==="error"):c,u=f.filter(y=>y.severity==="error").length,p=f.filter(y=>y.severity==="warning").length,m=f.filter(y=>y.severity==="info").length,d=u===0;if(e.format==="github"){let y=[];if(y.push("## TypeMorph \xB7 Environment Diff"),y.push(`**A:** \`${a}\`  \u2192  **B:** \`${l}\``),y.push(""),d?y.push(`**\u2713 Schemas match**${p>0?` (${p} warning(s))`:""}`):y.push(`**\u2716 ${u} breaking difference(s) detected**`),f.length>0){y.push(""),y.push("| field | difference | severity |"),y.push("|---|---|---|");for(let g of f){let b=g.severity==="error"?"\u{1F534}":g.severity==="warning"?"\u{1F7E1}":"\u{1F535}";y.push(`| \`${g.path||"root"}\` | ${g.description.replace(/\|/g,"\\|")} | ${b} |`)}}process.stdout.write(y.join(`
`)+`
`)}else if(e.json)process.stdout.write(JSON.stringify({ok:d,breaking:u,warnings:p,info:m,a,b:l,diffs:f},null,2)+`
`);else{let y=d?Q("\u2713 Schemas match"):R(`\u2716 ${u} difference${u===1?"":"s"}`);if(console.log(`
  ${B("Environment Diff")}  ${y}`),console.log(`  ${_("A:")} ${ft(a)}`),console.log(`  ${_("B:")} ${ft(l)}
`),f.length===0)console.log(_(`  No ${e.breakingOnly?"breaking ":""}differences detected.
`));else{for(let g of f){let b=g.path?Sn(`  ${g.path}`):"";b&&console.log(b),console.log(`    ${xn(g)}`)}console.log(_(`
  ${u} breaking  \xB7  ${p} warnings  \xB7  ${m} info
`))}}d||(process.exitCode=1)}async function lc(e){let n;if(e.url){let u;try{u=await fetch(e.url,{headers:e.headers})}catch(p){console.error(R(`check: failed to fetch ${e.url} \u2014 ${p?.message??p}`)),process.exit(1)}u.ok||(console.error(R(`check: HTTP ${u.status} from ${e.url}`)),process.exit(1)),n=await u.text()}else e.file?n=ne(e.file):n=await $n();let{obj:t}=Se(n),o=q(t),r=Le.resolve(e.baseline);if(!K.existsSync(r)){K.mkdirSync(Le.dirname(r),{recursive:!0}),K.writeFileSync(r,JSON.stringify(o,null,2)),e.format==="github"?(console.log("## TypeMorph \xB7 API schema check"),console.log(`**Baseline saved** to \`${e.baseline}\` \u2014 run again to detect drift.`)):e.json?process.stdout.write(JSON.stringify({ok:!0,baseline:"created",file:e.baseline})+`
`):(console.log(Q(`
  \u2713 Baseline saved: ${e.baseline}`)),console.log(_(`  Run again to detect drift.
`)));return}let i;try{i=JSON.parse(K.readFileSync(r,"utf8"))}catch{console.error(R(`check: could not parse baseline file "${e.baseline}"`)),process.exit(1)}let s=hn(i,o).map(u=>u.type==="enum_changed"&&u.severity==="error"?{...u,severity:"warning",description:u.description+" (verify: inferred from single sample)"}:u),a=s.filter(u=>u.severity==="error").length,l=s.filter(u=>u.severity==="warning").length,c=s.filter(u=>u.severity==="info").length,f=a===0;if(e.format==="github"){let u=[];if(u.push("## TypeMorph \xB7 API schema check"),u.push(""),f?(u.push("**\u2713 No breaking changes detected**"),l>0&&u.push(`${l} warning(s) found.`)):u.push(`**\u2716 ${a} breaking change(s) detected**`),s.length>0){u.push(""),u.push("| field | change | severity |"),u.push("|---|---|---|");for(let p of s){let m=p.severity==="error"?"\u{1F534}":p.severity==="warning"?"\u{1F7E1}":"\u{1F535}";u.push(`| \`${p.path||"root"}\` | ${p.description.replace(/\|/g,"\\|")} | ${m} |`)}}process.stdout.write(u.join(`
`)+`
`)}else if(e.json)process.stdout.write(JSON.stringify({ok:f,breaking:a,warnings:l,info:c,diffs:s},null,2)+`
`);else{let u=f?Q("\u2713 No breaking changes"):R(`\u2716 ${a} breaking change${a===1?"":"s"}`);if(console.log(`
  ${B("API Schema Drift Check")}  ${u}
`),s.length===0)console.log(_(`  Schema matches baseline: ${e.baseline}
`));else{for(let p of s){let m=p.path?Sn(`  ${p.path}`):"";m&&console.log(m),console.log(`    ${xn(p)}`)}console.log(_(`
  ${a} breaking  \xB7  ${l} warnings  \xB7  ${c} info`)),console.log(_(`  baseline: ${e.baseline}
`))}}if(e.update&&s.length>0){K.writeFileSync(r,JSON.stringify(o,null,2)),e.format!=="github"&&!e.json&&console.log(fe(`  \u26A0 Baseline updated: ${e.baseline}
`));return}f||process.exit(1)}function cc(e){let n=ne(e);if(/\.(ts|js|mts|cts)$/i.test(e)||/\bz\s*\./.test(n)){let o=nt(n);return o||(console.error(R(`typemorph validate: could not parse a Zod schema from "${e}"`)),process.exit(1)),o}return Xl(n)}function Ts(e){let n=ne(e);if(/\.jsonl$/i.test(e))return n.split(`
`).map(o=>o.trim()).filter(Boolean).map((o,r)=>{try{return JSON.parse(o)}catch{console.error(R(`typemorph validate: ${e} line ${r+1} is not valid JSON`)),process.exit(1)}});let{obj:t}=Se(n);return Array.isArray(t)?t:[t]}function uc(e,n,t){let o=bs(e,n,{strict:t.strict});if(t.format==="json")process.stdout.write(JSON.stringify(o,null,2)+`
`);else if(t.format==="github"){let r=[];if(r.push("## TypeMorph \xB7 LLM output validation"),r.push(""),r.push(`**${o.passed} / ${o.total} passed**${o.failed?` \xB7 ${o.failed} failed`:""}`),o.issues.length>0){r.push(""),r.push("| output | field | problem |"),r.push("|---|---|---|");for(let i of o.issues){let s=i.severity==="error"?"\u{1F534}":"\u{1F7E1}";r.push(`| #${i.recordIndex} | \`${i.path||"root"}\` | ${s} ${i.message.replace(/\|/g,"\\|")} |`)}}o.summary.length>0&&(r.push(""),r.push(o.summary.map(i=>`${i.label} \xD7${i.count}`).join(" \xB7 "))),process.stdout.write(r.join(`
`)+`
`)}else{console.log(`
  ${B("TypeMorph validate")}  ${_(`${o.total} output${o.total===1?"":"s"}`)}
`);let r=o.passed>0?Q(`\u2713 ${o.passed} passed`):_("\u2713 0 passed"),i=o.failed>0?R(`\u2717 ${o.failed} failed`):_("\u2717 0 failed");console.log(`  ${r}   ${i}
`);let s=new Map;for(let a of o.issues)s.has(a.recordIndex)||s.set(a.recordIndex,[]),s.get(a.recordIndex).push(a);for(let[a,l]of[...s.entries()].sort((c,f)=>c[0]-f[0])){let c=l.some(f=>f.severity==="error");console.log(`  ${c?R("\u2717"):fe("\u26A0")} output #${a}`);for(let f of l){let u=f.severity==="error"?R(f.message):fe(f.message);console.log(`      ${u}`),f.fix&&console.log(`        ${_("\u2192 "+f.fix)}`)}}o.summary.length>0&&console.log(_(`
  ${o.summary.map(a=>`${a.label} \xD7${a.count}`).join("  \xB7  ")}`)),o.failed>0?console.log(_(`  ${o.failed} of ${o.total} outputs would fail a strict parser.
`)):console.log(Q(`  \u2713 all outputs conform
`))}o.ok||process.exit(1)}function xs(e,n,t,o){try{let r=Ye(n,e,"",{rootName:t,samplesMode:o});(!r||r.startsWith("// Unsupported"))&&(console.error(R(`typemorph: unsupported format "${e}". Run \`typemorph list\` to see all formats.`)),process.exit(1)),process.stdout.write(r)}catch(r){console.error(R(`typemorph: ${r?.message??String(r)}`)),process.exit(1)}}async function fc(){let e=process.argv.slice(2);if(e.length===0||e.includes("--help")||e.includes("-h")){console.log(tc);return}if(e.includes("--version")||e.includes("-v")){console.log("0.6.0");return}let n=e[0];if(n==="list"){nc();return}let t=e.findIndex(m=>m==="--root"||m==="-r"),o=t!==-1?e[t+1]:"Root",r=e.findIndex(m=>m==="--schema"),i=r!==-1?e[r+1]:void 0,s=e.includes("--json");if(n==="reverse"){let m=e.slice(1).find(b=>!b.startsWith("-")),d=m?ne(m):await $n(),{json:y,error:g}=ys(d);(g||!y)&&(console.error(R(`typemorph reverse: ${g??"No interfaces found"}`)),process.exit(1)),process.stdout.write(y+`
`);return}if(n==="quality"){let m=e.findIndex(h=>h==="--min-grade"),d=m!==-1?e[m+1]?.toUpperCase():void 0;d&&!Me.includes(d)&&(console.error(R(`Invalid --min-grade "${d}". Must be one of: ${Me.join(", ")}`)),process.exit(1));let y=new Set([o,d,i].filter(Boolean)),g=e.slice(1).find(h=>!h.startsWith("-")&&!y.has(h)),b=g?ne(g):await $n();ic(b,{schema:i,minGrade:d,json:s});return}if(n==="diff"){let m=new Set([o,i].filter(Boolean)),d=e.slice(1).filter(g=>!g.startsWith("-")&&!m.has(g));d.length<2&&(console.error(R("Usage: typemorph diff <old.json> <new.json> [--schema <name>]")),process.exit(1));let y=e.includes("--breaking-only");oc(ne(d[0]),ne(d[1]),{schema:i,breakingOnly:y,json:s});return}if(n==="envdiff"){let m=e.findIndex(L=>L==="--a"),d=e.findIndex(L=>L==="--b"),y=m!==-1?e[m+1]:void 0,g=d!==-1?e[d+1]:void 0,b=new Set([y,g].filter(Boolean)),h=e.slice(1).filter(L=>!L.startsWith("-")&&!b.has(L)),$=y??h[0],S=g??h[1];(!$||!S)&&(console.error(R("Usage: typemorph envdiff --a <url|file> --b <url|file>")),process.exit(1));let T=e.findIndex(L=>L==="--format"),C=T!==-1?e[T+1]??"pretty":"pretty",N=e.includes("--breaking-only"),M={};for(let L=0;L<e.length-1;L++)if(e[L]==="--header"){let pe=e[L+1],Te=pe.indexOf(":");Te>0&&(M[pe.slice(0,Te).trim()]=pe.slice(Te+1).trim())}await ac({a:$,b:S,format:C,headers:M,json:s,breakingOnly:N});return}if(n==="check"){let m=e.findIndex(N=>N==="--url"),d=m!==-1?e[m+1]:void 0,y=e.findIndex(N=>N==="--baseline"),g=y!==-1?e[y+1]:void 0;g||(console.error(R("Usage: typemorph check [file] --baseline <path> [--url <url>] [--update] [--format github]")),process.exit(1));let b=e.includes("--update"),h=e.findIndex(N=>N==="--format"),$=h!==-1?e[h+1]??"pretty":"pretty",S={};for(let N=0;N<e.length-1;N++)if(e[N]==="--header"){let M=e[N+1],L=M.indexOf(":");L>0&&(S[M.slice(0,L).trim()]=M.slice(L+1).trim())}let T=new Set([d,g,$,...Object.entries(S).flat()].filter(Boolean)),C=e.slice(1).find(N=>!N.startsWith("-")&&!T.has(N));await lc({url:d,file:C,baseline:g,update:b,format:$,headers:S,json:s});return}if(n==="validate"){let m=e.includes("--infer"),d=e.includes("--strict"),y=e.findIndex(N=>N==="--format"),g=y!==-1?e[y+1]??"pretty":"pretty";["pretty","json","github"].includes(g)||(console.error(R(`Invalid --format "${g}". Must be one of: pretty, json, github`)),process.exit(1));let b=e.findIndex(N=>N==="--out"),h=b!==-1?e[b+1]:void 0,$=new Set([o,i,g,h].filter(Boolean)),S=e.slice(1).filter(N=>!N.startsWith("-")&&!$.has(N));if(m){S.length<1&&(console.error(R("Usage: typemorph validate --infer <good-outputs.jsonl> [--out schema.ts]")),process.exit(1));let N=Ts(S[0]),M=Ye(N,"zod","",{rootName:o,samplesMode:!0});h?(K.writeFileSync(Le.resolve(h),M),console.error(Q(`\u2713 wrote inferred schema to ${h}`))):process.stdout.write(M);return}S.length<2&&(console.error(R("Usage: typemorph validate <schema.ts> <outputs.jsonl> [--strict] [--format github]")),process.exit(1));let T=cc(S[0]),C=Ts(S[1]);uc(T,C,{strict:d,format:g});return}let a=n,l=new Set([o,i].filter(Boolean)),c=e.slice(1).filter(m=>!m.startsWith("-")&&!l.has(m));if(c.length>=2){let m=c.map(d=>Se(ne(d)).obj);xs(a,m,o,!0);return}let f=c[0]?ne(c[0]):await $n(),{obj:u}=Se(f),p=e.includes("--samples")&&Array.isArray(u);xs(a,u,o,p)}fc().catch(e=>{console.error(R(`typemorph: ${e?.message??String(e)}`)),process.exit(1)});
