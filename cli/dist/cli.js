#!/usr/bin/env node
"use strict";var zi=Object.create;var Mn=Object.defineProperty;var qi=Object.getOwnPropertyDescriptor;var Ui=Object.getOwnPropertyNames;var Pi=Object.getPrototypeOf,Vi=Object.prototype.hasOwnProperty;var Bi=(e,n,r,o)=>{if(n&&typeof n=="object"||typeof n=="function")for(let t of Ui(n))!Vi.call(e,t)&&t!==r&&Mn(e,t,{get:()=>n[t],enumerable:!(o=qi(n,t))||o.enumerable});return e};var Qe=(e,n,r)=>(r=e!=null?zi(Pi(e)):{},Bi(n||!e||!e.__esModule?Mn(r,"default",{value:e,enumerable:!0}):r,e));var Ze=Qe(require("fs")),Mi=Qe(require("path")),Di=Qe(require("readline"));var ve=e=>e.replace(/(^\w|_\w)/g,n=>n.replace(/_/,"").toUpperCase()),Dn=(e,n)=>e?e.kind==="classRef"?e.classRefName===n:e.kind==="array"?Dn(e.itemType,n):!1:!1,re=(e,n)=>{if(e.type!=="array"||!e.itemType)return null;let r=e.itemType._sharedTypeName;return r||(n.endsWith("ies")?r=n.slice(0,-3)+"y":n.endsWith("s")?r=n.slice(0,-1):n.endsWith("List")?r=n.slice(0,-4):r=n+"Item"),r.includes("_")?r.split("_").map(o=>ve(o)).join(""):ve(r)},ie=(e,n,r)=>{if(e.type==="union"&&e.unionTypes)return{kind:"union",unionTypes:e.unionTypes};if(e.type==="string")return e.enumValues?{kind:"enum",enumValues:e.enumValues}:e.format==="date"?{kind:"date",format:"date"}:e.format==="datetime"?{kind:"datetime",format:"datetime"}:{kind:"string",format:e.format};if(e.type==="object")return{kind:"classRef",classRefName:e._sharedTypeName??n+"_"+r};if(e.type==="array"&&e.itemType){let i=n+"_"+r;if(e.itemType.type==="object"){let s=e.itemType._sharedTypeName;return s||(i.endsWith("ies")?s=i.slice(0,-3)+"y":i.endsWith("s")?s=i.slice(0,-1):i.endsWith("List")?s=i.slice(0,-4):s=i+"_Item"),{kind:"array",itemType:{kind:"classRef",classRefName:s}}}return{kind:"array",itemType:ie(e.itemType,i,"Item")}}return{kind:{number:"number",boolean:"boolean",any:"any",union:"union"}[e.type]??"any",format:e.format}},Wi=(e,n={})=>{let r=e.map(i=>({...i,fields:[...i.fields],annotations:i.annotations?[...i.annotations]:void 0})),o=n.flattenWrappers!==!1;if(n.extractTimestamps!==!1){let i=["createdAt","updatedAt","deletedAt","created_at","updated_at","deleted_at"],s=!1,a=[];for(let l of r){let c=l.fields.filter(f=>i.includes(f.name));if(c.length>=2&&a.length===0){a=c.map(f=>({...f,docComment:"Audit timestamp metadata"}));break}}if(a.length>=2)for(let l of r){if(l.name==="TimestampModel")continue;let c=l.fields.filter(u=>i.includes(u.name)),f=c.length===a.length&&c.every(u=>a.some(m=>m.name===u.name));c.length>=2&&f&&(s||(r.push({name:"TimestampModel",fields:a,isShared:!0,docComment:"Base audit trail timestamp fields"}),s=!0),l.fields=l.fields.filter(u=>!i.includes(u.name)),l.annotations||(l.annotations=[]),l.annotations.push("extends TimestampModel"))}}if(o){let i=!0,s=new Set;for(;i;){i=!1;for(let a=0;a<r.length;a++){let l=r[a];if(l.name!=="Root"&&l.fields.length===1){let c=l.fields[0];if(c.fieldType.kind==="classRef"){let f=c.fieldType.classRefName;if(!f||f===l.name||s.has(f))continue;let u=r.find(m=>m.name===f);if(u&&(u.fields.length>1||(u.annotations?.length??0)>0)){if(l.fields=u.fields.map(p=>({...p,docComment:`[Flattened from ${f}] ${p.docComment??""}`})),u.annotations&&u.annotations.length>0){l.annotations||(l.annotations=[]);for(let p of u.annotations)l.annotations.includes(p)||l.annotations.push(p)}r.some(p=>p!==l&&p.name!==f&&(p.fields.some(d=>Dn(d.fieldType,f))||(p.annotations?.includes(`extends ${f}`)??!1)))||(r=r.filter(p=>p.name!==f)),s.add(f),i=!0;break}}}}}}return r},_=(e,n="Root",r={})=>{let o=[],t=new Set,i=new Set,s=(a,l)=>{if(t.has(a))return;if(t.add(a),a.type==="array"&&a.itemType){let u=a.itemType._sharedTypeName;u||(l.endsWith("ies")?u=l.slice(0,-3)+"y":l.endsWith("s")?u=l.slice(0,-1):l.endsWith("List")?u=l.slice(0,-4):u=l+"Item"),s(a.itemType,u);return}if(a.type!=="object"||!a.fields||a._sharedTypeName&&i.has(a._sharedTypeName))return;let c=a._sharedTypeName??l;i.add(c);let f=[];for(let[u,m]of Object.entries(a.fields)){let p=ie(m,c,u);f.push({name:u,fieldType:p,isOptional:!!m.optional,isNullable:!!m.nullable,annotations:[],docComment:""})}o.push({name:c,fields:f,annotations:[],isShared:!!a._sharedTypeName});for(let[u,m]of Object.entries(a.fields)){let p=m._sharedTypeName??c+"_"+u;if(m.type==="object"&&s(m,p),m.type==="array"&&m.itemType?.type==="object"){let d=m.itemType._sharedTypeName;d||(u.endsWith("ies")?d=p.slice(0,-3)+"y":u.endsWith("s")?d=p.slice(0,-1):u.endsWith("List")?d=p.slice(0,-4):d=p+"_Item"),s(m.itemType,d)}}};return s(e,n),Ji(Wi(o,r))},Ji=e=>{let n=new Map,r=new Map,o=new Map;for(let u of e){let m=u.name,p=m.includes("_")?m.split("_").map(d=>ve(d)).join(""):ve(m);if(m==="TimestampModel"&&(p="TimestampModel"),n.has(p)){let d=n.get(p)+1;n.set(p,d);let y=`${p}_v${d}`;r.set(u,y),o.set(m,y)}else n.set(p,1),r.set(u,p),o.set(m,p)}for(let[u,m]of r.entries())u.name=m;let t=u=>{if(u&&(u.kind==="classRef"&&u.classRefName&&o.has(u.classRefName)&&(u.classRefName=o.get(u.classRefName)),u.kind==="array"&&u.itemType&&t(u.itemType),u.kind==="union"&&u.unionTypes))for(let m of u.unionTypes)t(m)};for(let u of e)for(let m of u.fields)t(m.fieldType);let i=[],s=new Set,a=new Set,l=new Map(e.map(u=>[u.name,u])),c=u=>{if(s.has(u.name)||a.has(u.name))return;a.add(u.name);let m=u.annotations?.find(p=>p.startsWith("extends "));if(m){let p=m.slice(8),d=l.get(p);d&&c(d)}a.delete(u.name),s.add(u.name),i.push(u)},f=e.find(u=>u.name==="TimestampModel");f&&c(f);for(let u of e)c(u);return e.length=0,e.push(...i),e};var N=e=>e.replace(/(^\w|_\w)/g,n=>n.replace(/_/,"").toUpperCase()),D=e=>{let n=e.annotations?.find(r=>r.startsWith("extends "));return n?n.slice(8):null},V=e=>{let n=N(e);return n.charAt(0).toLowerCase()+n.slice(1)},Yi=(e,n)=>{let r=e.itemType?._sharedTypeName;return r?N(r):n.endsWith("ies")?N(n.slice(0,-3)+"y"):n.endsWith("s")?N(n.slice(0,-1)):n.endsWith("List")?N(n.slice(0,-4)):N(n+"Item")},Un=(e,n)=>{let r=new Map,o=N(n),t=(i,s)=>{let a=i.itemType;a?.discriminatorField&&a?.discriminatedVariants&&r.set(Yi(i,s),{discriminatorField:a.discriminatorField,variants:a.discriminatedVariants})};if(e.type==="array"&&t(e,o),e.type==="object"&&e.fields){for(let[i,s]of Object.entries(e.fields))if(s.type==="array"){let a=s._sharedTypeName?N(s._sharedTypeName):N(o+"_"+i);t(s,a)}}return r},we=e=>{switch(e.kind){case"union":return e.unionTypes?e.unionTypes.join(" | "):"any";case"enum":return e.enumValues?e.enumValues.map(n=>`"${n}"`).join(" | "):"string";case"date":case"datetime":return"Date";case"classRef":return e.classRefName??"any";case"array":if(e.itemType){let n=we(e.itemType);return e.itemType.kind==="union"||e.itemType.kind==="enum"?`(${n})[]`:`${n}[]`}return"any[]";default:return e.kind}},Pn={generate:(e,n="Root",r={})=>{let o=Un(e,n),t=_(e,n,r),i="";if(e.type==="array"&&e.itemType){let s=re(e,n);if(s?t.some(l=>l.name===s):!1)i+=`export type ${N(n)} = ${s}[];

`;else{let l=ie(e.itemType,n,"Item");i+=`export type ${N(n)} = ${we(l)}[];

`}}for(let s of t){let a=o.get(s.name);if(a){for(let[p,d]of Object.entries(a.variants)){let y=N(p),g=`${s.name}${y}`;i+=`export interface ${g} {
`;for(let[h,b]of Object.entries(d.fields??{}))if(h===a.discriminatorField)i+=`  ${h}: "${p}";
`;else{let $=ie(b,g,h),j=we($),k=b.optional?"?":"",v=b.nullable?" | null":"";i+=`  ${h}${k}: ${j}${v};
`}i+=`}

`}let m=Object.keys(a.variants).map(p=>`${s.name}${N(p)}`);i+=`export type ${s.name} = ${m.join(" | ")};

`;continue}let l=D(s),c=l?` extends ${l}`:"",f=r.exportDefault&&s.name==="Root"?`export default interface ${s.name}${c}`:`export interface ${s.name}${c}`;i+=`${f} {
`;let u=r.optionalFields;for(let m of s.fields){let p=u||m.isOptional?"?":"",d=`${s.name}.${m.name}`,y=r.customFieldNames?.[d]??m.name,g=we(m.fieldType);m.isNullable&&(g=g.includes(" | ")?`(${g}) | null`:`${g} | null`),i+=`  ${y}${p}: ${g};
`}i+=`}

`}return i}},Vn=e=>{let n=new Map(e.map(l=>[l.name,l])),r=new Set,o=new Set,t=[],i=new Set,s=l=>l.kind==="classRef"&&l.classRefName?[l.classRefName]:l.kind==="array"&&l.itemType?s(l.itemType):l.kind==="union"&&l.unionTypes?[]:[],a=l=>{if(r.has(l.name)||o.has(l.name))return;o.add(l.name);let c=D(l);if(c){let f=n.get(c);f&&(o.has(c)||a(f))}for(let f of l.fields)for(let u of s(f.fieldType))if(o.has(u))i.add(u);else{let m=n.get(u);m&&a(m)}o.delete(l.name),r.add(l.name),t.push(l)};for(let l of e)a(l);return{sorted:t,cyclicClassRefs:i}},Re=(e,n,r={})=>{switch(e.kind){case"union":{if(!e.unionTypes||e.unionTypes.length===0)return"z.any()";let o=e.unionTypes.map(t=>Re({kind:t},n,r));return o.length===1?o[0]:`z.union([${o.join(", ")}])`}case"enum":return!e.enumValues||e.enumValues.length===0?"z.string()":e.enumValues.length===1?`z.literal("${e.enumValues[0]}")`:`z.enum([${e.enumValues.map(o=>`"${o}"`).join(", ")}])`;case"date":return"z.coerce.date()";case"datetime":return r.zodVersion==="v3"?"z.string().datetime()":"z.iso.datetime()";case"classRef":{if(!e.classRefName)return"z.any()";let o=`${V(e.classRefName)}Schema`;return n.has(e.classRefName)?`z.lazy(() => ${o})`:o}case"array":return e.itemType?`z.array(${Re(e.itemType,n,r)})`:"z.array(z.any())";case"string":return e.format==="email"?r.zodVersion==="v3"?"z.string().email()":"z.email()":e.format==="url"?r.zodVersion==="v3"?"z.string().url()":"z.url()":e.format==="uuid"?r.zodVersion==="v3"?"z.string().uuid()":"z.uuid()":"z.string()";case"number":return r.zodMode==="loose"?"z.coerce.number()":"z.number()";case"boolean":return"z.boolean()";default:return"z.any()"}},Xe=e=>{switch(e.kind){case"string":case"date":case"datetime":return"string";case"number":return"number";case"boolean":return"boolean";case"classRef":return e.classRefName??"unknown";case"array":return e.itemType?`${Xe(e.itemType)}[]`:"unknown[]";case"union":return e.unionTypes?.map(n=>Xe({kind:n})).join(" | ")??"unknown";case"enum":return e.enumValues?.map(n=>`"${n}"`).join(" | ")??"string";default:return"unknown"}},Bn={generate:(e,n="root",r={})=>{let o=r.zodMode??"strict",t=o==="loose",i=o==="enterprise",s=r.zodVersion==="v3",a=s?"z.string().email()":"z.email()",l=s?"z.string().url()":"z.url()",c=s?"z.string().uuid()":"z.uuid()",f={...r,zodMode:o},u=Un(e,N(n)),m=_(e,N(n),r),p="",{sorted:d,cyclicClassRefs:y}=Vn(m);for(let h of d){let b=u.get(h.name);if(b){let R=[];for(let[H,C]of Object.entries(b.variants)){let ke=N(H),J=V(h.name)+ke,T=h.name+ke;R.push(`${J}Schema`),p+=`export const ${J}Schema = z.object({
`;for(let[X,Y]of Object.entries(C.fields??{}))if(X===b.discriminatorField)p+=`  ${X}: z.literal("${H}"),
`;else{let Ce=ie(Y,T,X),pe=Re(Ce,y,f);Y.nullable&&(pe+=".nullable()"),(t||Y.optional)&&(pe+=".optional()"),p+=`  ${X}: ${pe},
`}p+=`});
`,p+=`export type ${T} = z.infer<typeof ${J}Schema>;

`}let te=V(h.name);p+=`export const ${te}Schema = z.discriminatedUnion("${b.discriminatorField}", [
`;for(let H of R)p+=`  ${H},
`;p+=`]);
`,p+=`export type ${h.name} = z.infer<typeof ${te}Schema>;

`;continue}let $=V(h.name),j=D(h),k=j?V(j):null,v=y.has(h.name);if(v){p+=`export type ${h.name} = {
`;for(let R of h.fields){let te=Xe(R.fieldType),H=R.isOptional||t?"?":"",C=R.isNullable?" | null":"";p+=`  ${R.name}${H}: ${te}${C};
`}p+=`};

`}let z=v?`: z.ZodType<${h.name}>`:"";k?p+=`export const ${$}Schema${z} = ${k}Schema.extend({
`:p+=`export const ${$}Schema${z} = z.object({
`;for(let R of h.fields){let te=r.optionalFields||R.isOptional||t?".optional()":"",H=R.isNullable?".nullable()":"",C=Re(R.fieldType,y,f),ke=`${h.name}.${R.name}`,J=r.customFieldNames?.[ke]??R.name,T=J.toLowerCase();if(!t&&(R.fieldType.kind==="number"&&(T.includes("percent")?C+=".min(0).max(100)":T.includes("latitude")||T==="lat"||T.endsWith("_lat")?C+=".min(-90).max(90)":T.includes("longitude")||T==="lng"||T==="lon"||T.endsWith("_lng")||T.endsWith("_lon")?C+=".min(-180).max(180)":T.includes("rating")?C+=".min(0).max(5)":T.includes("score")?C+=".min(0).max(100)":T.includes("age")?C+=".int().min(0).max(150)":T.includes("year")?C+=".int().min(1900).max(2100)":T.includes("month")&&!T.includes("monthly")?C+=".int().min(1).max(12)":T==="day"||T.endsWith("_day")||T.startsWith("day_")?C+=".int().min(1).max(31)":T.includes("hour")?C+=".int().min(0).max(23)":T.includes("minute")||T.includes("second")?C+=".int().min(0).max(59)":T.includes("count")||T.includes("quantity")||T==="qty"?C+=".int().min(0)":["price","amount","cost","fee","rank","total","subtotal"].some(Y=>T.includes(Y))?C+=".min(0)":T==="port"||T.endsWith("_port")||T==="portnumber"||T==="port_number"?C+=".int().min(1).max(65535)":R.fieldType.format==="int"&&(C+=".int()")),R.fieldType.kind==="string"&&!R.fieldType.format))if(T.includes("email"))C=a;else if(T.includes("url")||T.includes("link")||T.includes("website"))C=l;else if(T.includes("uuid")||(T.endsWith("_id")||/Id$/.test(J)||/ID$/.test(J))&&R.fieldType.format==="uuid")C=c;else if(T.includes("phone")||T==="tel"||T==="telephone"||T.endsWith("_tel")||T.startsWith("tel_"))C="z.string().regex(/^\\+?[\\d\\s\\-\\.\\(\\)]{7,15}$/)";else if(T.includes("password")||T.includes("passwd"))C="z.string().min(8)";else if(T==="zip"||T==="zipcode"||T==="zip_code"||T==="postal_code"||T==="postcode")C="z.string().regex(/^[A-Z0-9][A-Z0-9\\s\\-]{1,8}[A-Z0-9]$/i)";else if(T==="semver")C="z.string().regex(/^\\d+\\.\\d+(\\.\\d+)?(-[\\w.]+)?(\\+[\\w.]+)?$/)";else if(T.includes("slug"))C="z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)";else{let Y=T.includes("name")||T.includes("label")||T.includes("title"),Ce=!R.isOptional&&!r.optionalFields,pe=["description","note","bio","comment","content","body","text","message","summary","detail","info","about","remark"].some(Gi=>T.includes(Gi));Y?C=Ce?"z.string().min(1).trim()":"z.string().trim()":Ce&&!pe&&(C="z.string().min(1)")}let X=`${C}${H}${te}`;if(i){let Y=J.replace(/_/g," ").replace(/([A-Z])/g," $1").trim().toLowerCase();X+=`.describe('${Y}')`}p+=`  ${J}: ${X},
`}p+=`})${t?".passthrough()":i?".strict()":""};
`,v?p+=`
`:p+=`export type ${h.name} = z.infer<typeof ${$}Schema>;

`}let g=re(e,N(n));if(g&&m.some(h=>h.name===g)){let h=N(n),b=V(h);p+=`export const ${b}Schema = z.array(${V(g)}Schema);
`,p+=`export type ${h} = z.infer<typeof ${b}Schema>;

`}return p}},Wn=e=>{switch(e.kind){case"union":return"dynamic";case"enum":return"String";case"date":case"datetime":return"DateTime";case"classRef":return e.classRefName??"dynamic";case"array":return e.itemType?`List<${Wn(e.itemType)}>`:"List<dynamic>";case"string":return"String";case"number":return e.format==="int"?"int":"double";case"boolean":return"bool";default:return"dynamic"}},Jn={generate:(e,n="Root",r={})=>{let o=_(e,N(n),r),t="";for(let i of o){let s=D(i),a=s?` extends ${s}`:"";t+=`class ${i.name}${a} {
`;for(let l of i.fields){let c=l.isOptional||l.isNullable,f=Wn(l.fieldType);c&&f!=="dynamic"&&(f+="?"),t+=`  final ${f} ${l.name};
`}t+=`
  ${i.name}({
`;for(let l of i.fields){let c=l.isOptional||l.isNullable;t+=`    ${c?"":"required "}this.${l.name},
`}t+=`  });
`,t+=`}

`}return t}},Fn=e=>{switch(e.kind){case"union":return"mixed";case"enum":return"string";case"date":case"datetime":return"DateTime";case"classRef":return e.classRefName??"mixed";case"array":return"array";case"string":return"string";case"number":return e.format==="int"?"int":"float";case"boolean":return"bool";default:return"mixed"}},Yn={generate:(e,n="Root",r={})=>{let o=_(e,N(n),r),t="";for(let i of o){let s=D(i),a=s?` extends ${s}`:"";t+=`class ${i.name}${a}
{
`,t+=`    public function __construct(
`;for(let l of i.fields){let c=Fn(l.fieldType),f=(l.isOptional||l.isNullable)&&c!=="mixed"?"?":"",u=l.isOptional||l.isNullable?" = null":"";t+=`        private ${f}${c} $${l.name}${u},
`}t+=`    ) {}
`;for(let l of i.fields){let c=Fn(l.fieldType),f=(l.isOptional||l.isNullable)&&c!=="mixed"?"?":"",u=l.name.charAt(0).toUpperCase()+l.name.slice(1);t+=`
    public function get${u}(): ${f}${c} { return $this->${l.name}; }
`,t+=`    public function set${u}(${f}${c} $${l.name}): void { $this->${l.name} = $${l.name}; }
`}t+=`}

`}return t}},Kn=e=>{switch(e.kind){case"union":return"Any";case"enum":return"str";case"date":case"datetime":return"datetime";case"classRef":return e.classRefName??"Any";case"array":return e.itemType?`List[${Kn(e.itemType)}]`:"List[Any]";case"string":return"str";case"number":return e.format==="int"?"int":"float";case"boolean":return"bool";default:return"Any"}},Hn={generate:(e,n="Root",r={})=>{let o=_(e,N(n),r),t="";for(let i of o){let s=D(i)??"BaseModel";if(t+=`class ${i.name}(${s}):
`,i.fields.length===0){t+=`    pass

`;continue}for(let a of i.fields){let l=Kn(a.fieldType);(a.isOptional||a.isNullable)&&(l=`Optional[${l}] = None`),t+=`    ${a.name}: ${l}
`}t+=`
`}return t}},en=e=>{switch(e.kind){case"union":return"string";case"enum":return"string";case"date":case"datetime":return"string";case"classRef":return e.classRefName??"string";case"array":return e.itemType?`repeated ${en(e.itemType)}`:"repeated string";case"string":return"string";case"number":return e.format==="int"?"int32":"double";case"boolean":return"bool";default:return"string"}},Zn={generate:(e,n="Message",r={})=>{let o=_(e,N(n),r),t="";for(let i of o){t+=`message ${i.name} {
`;let s=1,a=D(i);if(a){let l=o.find(c=>c.name===a);if(l)for(let c of l.fields){let f=en(c.fieldType);t+=`  ${f} ${c.name} = ${s++};
`}}for(let l of i.fields){let c=en(l.fieldType);t+=`  ${c} ${l.name} = ${s++};
`}t+=`}

`}return t}},nn=e=>{switch(e.kind){case"union":return"String";case"enum":return"String";case"date":case"datetime":return"String";case"classRef":return e.classRefName??"String";case"array":return e.itemType?`[${nn(e.itemType)}!]`:"[String]";case"string":return"String";case"number":return e.format==="int"?"Int":"Float";case"boolean":return"Boolean";default:return"String"}},Qn={generate:(e,n="Type",r={})=>{let o=_(e,N(n),r),t="";for(let i of o){t+=`type ${i.name} {
`;let s=D(i);if(s){let a=o.find(l=>l.name===s);if(a)for(let l of a.fields){let c=nn(l.fieldType),f=l.isOptional||l.isNullable?"":"!";t+=`  ${l.name}: ${c}${f}
`}}for(let a of i.fields){let l=nn(a.fieldType),c=a.isOptional||a.isNullable?"":"!";t+=`  ${a.name}: ${l}${c}
`}t+=`}

`}return t}},Gn=e=>e.replace(/([A-Z]+)([A-Z][a-z])/g,"$1_$2").replace(/([a-z\d])([A-Z])/g,"$1_$2").toLowerCase(),Ki=new Set(["type","struct","enum","match","use","mod","fn","let","pub","impl","trait","for","loop","while","if","else","return","break","continue","as","async","await","const","crate","dyn","extern","false","true","in","move","mut","ref","self","Self","static","super","unsafe","where"]),Hi=e=>Ki.has(e)?`r#${e}`:e,Xn=e=>{switch(e.kind){case"union":return"serde_json::Value";case"enum":return"String";case"date":case"datetime":return"chrono::DateTime<chrono::Utc>";case"classRef":return e.classRefName??"serde_json::Value";case"array":return e.itemType?`Vec<${Xn(e.itemType)}>`:"Vec<serde_json::Value>";case"string":return"String";case"number":return e.format==="int"?"i64":"f64";case"boolean":return"bool";default:return"serde_json::Value"}},et={generate:(e,n="Root",r={})=>{let o=_(e,N(n),r),t=`use serde::{Serialize, Deserialize};

`,i=re(e,N(n));i&&o.some(s=>s.name===i)&&(t+=`pub type ${N(n)} = Vec<${i}>;

`);for(let s of o){let a=D(s);if(t+=`#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ${s.name} {
`,a){let l=Gn(a);t+=`  #[serde(flatten)]
  pub ${l}: ${a},
`}for(let l of s.fields){let c=Xn(l.fieldType);(l.isOptional||l.isNullable)&&(c=`Option<${c}>`);let f=Hi(Gn(l.name));f!==l.name&&(t+=`  #[serde(rename = "${l.name}")]
`),t+=`  pub ${f}: ${c},
`}t+=`}

`}return t}},nt=e=>{switch(e.kind){case"union":return"interface{}";case"enum":return"string";case"date":case"datetime":return"time.Time";case"classRef":return e.classRefName??"interface{}";case"array":return e.itemType?`[]${nt(e.itemType)}`:"[]interface{}";case"string":return"string";case"number":return e.format==="int"?"int64":"float64";case"boolean":return"bool";default:return"interface{}"}},tt={generate:(e,n="Root",r={})=>{let o=_(e,N(n),r),i=o.some(a=>a.fields.some(l=>l.fieldType.kind==="date"||l.fieldType.kind==="datetime"))?`package main

import "time"

`:`package main

`,s=re(e,N(n));s&&o.some(a=>a.name===s)&&(i+=`type ${N(n)} []${s}

`);for(let a of o){let l=D(a);i+=`type ${a.name} struct {
`,l&&(i+=`  ${l}
`);for(let c of a.fields){let f=nt(c.fieldType);(c.isNullable||c.isOptional)&&(f=`*${f}`);let u=N(c.name),m=c.isOptional||c.isNullable?",omitempty":"";i+=`  ${u} ${f} \`json:"${c.name}${m}"\`
`}i+=`}

`}return i}},q=e=>e.split(/[_\s-]+/).map(n=>n.charAt(0).toUpperCase()+n.slice(1)).join(""),me=e=>e.replace(/_([a-zA-Z0-9])/g,(n,r)=>r.toUpperCase()),tn=e=>["price","amount","cost","fee","total","subtotal","balance","payment"].some(n=>e.toLowerCase().includes(n)),rn=(e,n,r="")=>{switch(e.kind){case"union":return"Object";case"enum":return"String";case"date":return"LocalDate";case"datetime":return"OffsetDateTime";case"classRef":return q(e.classRefName??"Object");case"array":return e.itemType?`List<${rn(e.itemType,!0,"")}>`:"List<Object>";case"string":return e.format==="uuid"?"UUID":"String";case"number":return tn(r)?"BigDecimal":e.format==="int"?n?"Integer":"int":n?"Double":"double";case"boolean":return n?"Boolean":"boolean";default:return"Object"}},zn=new Set(["int","long","double","float","boolean","char","byte","short"]),rt={generate:(e,n="Root",r={})=>{let o=_(e,N(n),r),t=new Set(["import lombok.AllArgsConstructor;","import lombok.Builder;","import lombok.Data;","import lombok.NoArgsConstructor;","import com.fasterxml.jackson.annotation.JsonIgnoreProperties;"]),i=!1,s=!1,a=!1,l=!1,c=!1;for(let u of o)for(let m of u.fields){let p=m.isOptional||m.isNullable,d=rn(m.fieldType,p,m.name),y=me(m.name),g=m.name.toLowerCase();m.name!==y&&(i=!0),m.fieldType.kind==="array"&&t.add("import java.util.List;"),d==="UUID"&&t.add("import java.util.UUID;"),d==="LocalDate"&&t.add("import java.time.LocalDate;"),d==="OffsetDateTime"&&t.add("import java.time.OffsetDateTime;"),d==="BigDecimal"&&t.add("import java.math.BigDecimal;"),p&&(c=!0),!p&&!zn.has(d)&&(s=!0),(m.fieldType.format==="email"||g.includes("email"))&&(a=!0),m.fieldType.kind==="number"&&(tn(m.name)||g==="count"||g.endsWith("count")||g.endsWith("_count")||g.includes("quantity")||g==="qty")&&(l=!0)}i&&t.add("import com.fasterxml.jackson.annotation.JsonProperty;"),c&&t.add("import javax.annotation.Nullable;"),s&&t.add("import jakarta.validation.constraints.NotNull;"),a&&t.add("import jakarta.validation.constraints.Email;"),l&&t.add("import jakarta.validation.constraints.Min;");let f=[...t].sort().join(`
`)+`

`;for(let u of o){f+=`@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
`,f+=`@JsonIgnoreProperties(ignoreUnknown = true)
`;let m=D(u),p=m?` extends ${q(m)}`:"";f+=`public class ${q(u.name)}${p} {
`;for(let d of u.fields){let y=d.isOptional||d.isNullable,g=rn(d.fieldType,y,d.name),h=me(d.name),b=d.name.toLowerCase();y?f+=`    @Nullable
`:zn.has(g)||(f+=`    @NotNull
`),(d.fieldType.format==="email"||b.includes("email"))&&(f+=`    @Email
`);let $=d.fieldType.kind==="number";if(($&&tn(d.name)||$&&(b==="count"||b.endsWith("count")||b.endsWith("_count")||b.includes("quantity")||b==="qty"))&&(f+=`    @Min(0)
`),d.name!==h&&(f+=`    @JsonProperty("${d.name}")
`),d.fieldType.kind==="enum"&&d.fieldType.enumValues?.length){let j=d.fieldType.enumValues.map(k=>`"${k}"`).join(", ");f+=`    private String ${h}; // enum: ${j}
`}else f+=`    private ${g} ${h};
`}f+=`}

`}return f.trim()+`
`}},sn=e=>{switch(e.kind){case"union":return"String";case"enum":return"String";case"string":return"String";case"number":return e.format==="int"?"Int":"Float";case"boolean":return"Boolean";case"date":case"datetime":return"DateTime";case"classRef":return e.classRefName??"String";case"array":return e.itemType?`${sn(e.itemType)}[]`:"String[]";default:return"String"}},it={generate:(e,n="Root",r={})=>{let o=_(e,N(n),r),t="";for(let i of o){t+=`model ${i.name} {
`,i.fields.some(c=>c.name==="id")||(t+=`  id String @id @default(uuid())
`);let a=D(i);if(a){let c=o.find(f=>f.name===a);if(c)for(let f of c.fields){let u=sn(f.fieldType),m=f.name==="id"?" @id":"";t+=`  ${f.name} ${u}${m}
`}}let l=/^(price|amount|cost|total|fee|balance|discount|tax|rate|salary|revenue|budget|charge|payment|subtotal|tip|markup|margin)s?$/i;for(let c of i.fields){let f=sn(c.fieldType);f==="Float"&&l.test(c.name)&&(f="Decimal");let u=c.fieldType.kind==="array",m=c.isOptional&&!u?"?":"",p=`${i.name}.${c.name}`,d=r.customFieldNames?.[p]??c.name,y=d==="id"?" @id":"";if(c.fieldType.kind==="classRef")t+=`  ${d} Json${m}
`;else if(u&&c.fieldType.itemType?.kind==="classRef")t+=`  ${d} Json
`;else if(t+=`  ${d} ${f}${m}${y}
`,!u&&d.length>2&&d.endsWith("Id")&&c.fieldType.format==="uuid"){let g=d.slice(0,-2),h=g.charAt(0).toUpperCase()+g.slice(1);if(!i.fields.some($=>$.name===g)){let $=o.find(v=>v.name===h),j=o.filter(v=>v.name!==i.name&&v.name.endsWith(h)),k=$??(j.length===1?j[0]:null);k&&(t+=`  ${g} ${k.name}? @relation(fields: [${d}], references: [id])
`)}}}t+=`}

`}return t}},st={generate:(e,n="Component")=>{let r=e.fields||{},o=Object.keys(r),t=`import React from 'react';

`;return t+=`export const ${n}Card = ({ data }: { data: any }) => (
`,t+=`  <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
`,t+=`    <h3 className="text-lg font-black mb-4 dark:text-white">${n}</h3>
`,t+=`    <div className="grid grid-cols-2 gap-4">
`,o.forEach(i=>{t+=`      <div>
        <p className="text-[10px] text-slate-400 uppercase">${i}</p>
        <p className="text-sm font-bold dark:text-slate-200">{typeof data?.${i} === 'object' ? JSON.stringify(data?.${i}) : String(data?.${i} ?? '-')}</p>
      </div>
`}),t+=`    </div>
  </div>
);
`,t}},ot={generate:e=>{let n=0,r=(o,t="",i="")=>{if(o.type==="object"&&o.fields){let s={};for(let[a,l]of Object.entries(o.fields))s[a]=r(l,a,t);return s}if(o.type==="array"){let s=o.itemType||{type:"string"},a=n;n=0;let l=Array.from({length:50},(c,f)=>(n=f+1,r(s,t,i)));return n=a,l}if(o.type==="number")return t.toLowerCase().includes("id")||t.toLowerCase().includes("price")||t.toLowerCase().includes("amount")?n>0?n:1:t.toLowerCase().includes("age")?28:42;if(o.type==="boolean")return!0;if(o.type==="string"){if(o.format==="uuid")return`550e8400-e29b-41d4-a716-${String(n||1).padStart(12,"0")}`;if(o.format==="email")return"test@example.com";if(o.format==="url")return"https://example.com/api";if(o.format==="datetime")return new Date().toISOString();let s=t.toLowerCase(),a=i.toLowerCase(),l=a==="items"||a==="products"||a==="entries"||a==="records";if(s.includes("name")){if(l)return`Item ${String.fromCharCode(64+(n||1))}`;let c=["Alice Johnson","Bob Smith","Carol White","David Brown","Emma Davis","Frank Wilson","Grace Lee","Henry Taylor"];return c[((n||1)-1)%c.length]}if(s.includes("email")){let c=["example.com","test.org","demo.io","sample.net"];return`user${n||1}@${c[((n||1)-1)%c.length]}`}if(s.includes("url")||s.includes("link")||s.includes("avatar")||s.includes("image"))return"https://example.com/sample.png";if(s.includes("id"))return`550e8400-e29b-41d4-a716-${String(n||1).padStart(12,"0")}`;if(s.includes("date")||s.includes("time")||s.includes("created")||s.includes("updated"))return new Date().toISOString();if(s.includes("city")){let c=["Tokyo","New York","London","Paris","Sydney","Berlin","Singapore","Toronto"];return c[((n||1)-1)%c.length]}if(s.includes("street")||s.includes("address"))return"123 Main Street";if(s.includes("zip")||s.includes("postal"))return"100-0001";if(s.includes("phone")||s.includes("tel"))return"+81-90-1234-5678";if(s.includes("role")||s.includes("type")||s.includes("status")||s.includes("category")){let c=["admin","user","guest","moderator"];return c[((n||1)-1)%c.length]}return s.includes("desc")||s.includes("memo")||s.includes("text")||s.includes("bio")||s.includes("note")?"This is a sample generated text to simulate a realistic description or content block.":s.includes("title")?"Sample Title":s.includes("price")||s.includes("cost")?(19.99+(n||0)*10).toFixed(2):s.includes("color")?"#3366ff":s.includes("country")?"Japan":s.includes("lang")||s.includes("locale")?"en-US":"sample_"+t}return null};return JSON.stringify(r(e),null,2)}},at=e=>{switch(e.kind){case"union":return"object";case"enum":return"string";case"date":return"DateTime";case"datetime":return"DateTimeOffset";case"classRef":return e.classRefName??"object";case"array":return e.itemType?`List<${at(e.itemType)}>`:"List<object>";case"string":return"string";case"number":return e.format==="int"?"long":"double";case"boolean":return"bool";default:return"object"}},lt={generate:(e,n="Root",r={})=>{let o=_(e,N(n),r),t="",i=!1;for(let a of o){let l=D(a),c=l?` : ${l}`:"";t+=`public class ${a.name}${c}
{
`;for(let f of a.fields){let u=at(f.fieldType),m=!f.isOptional&&!f.isNullable,p=m?"":"?";m&&(i=!0,t+=`    [Required]
`),t+=`    public ${u}${p} ${N(f.name)} { get; set; }
`}t+=`}

`}return(i?`using System.ComponentModel.DataAnnotations;

`:"")+t}},ct=e=>{switch(e.kind){case"union":return"AnyCodable";case"enum":return"String";case"date":case"datetime":return"Date";case"classRef":return q(e.classRefName??"AnyCodable");case"array":return e.itemType?`[${ct(e.itemType)}]`:"[AnyCodable]";case"string":return e.format==="uuid"?"UUID":"String";case"number":return e.format==="int"?"Int":"Double";case"boolean":return"Bool";default:return"AnyCodable"}},ut={generate:(e,n="Root",r={})=>{let o=_(e,N(n),r),t=`import Foundation

`;for(let i of o){let s=q(i.name),a=D(i),l=a?`: ${q(a)}`:": Codable";t+=`struct ${s} ${l} {
`;let c=[];for(let u of i.fields){let m=me(u.name),p=ct(u.fieldType);(u.isOptional||u.isNullable)&&(p+="?"),t+=`    let ${m}: ${p}
`,u.name!==m?c.push({swift:m,json:u.name}):c.push({swift:m,json:""})}if(c.some(u=>u.json!=="")){t+=`
    enum CodingKeys: String, CodingKey {
`;for(let{swift:u,json:m}of c)m?t+=`        case ${u} = "${m}"
`:t+=`        case ${u}
`;t+=`    }
`}t+=`}

`}return t}},ft=e=>{switch(e.kind){case"union":return"Any";case"enum":return"String";case"date":return"LocalDate";case"datetime":return"Instant";case"classRef":return q(e.classRefName??"Any");case"array":return e.itemType?`List<${ft(e.itemType)}>`:"List<Any>";case"string":return e.format==="uuid","String";case"number":return e.format==="int"?"Int":"Double";case"boolean":return"Boolean";default:return"Any"}},qn=(e,n)=>e.some(r=>r.fields.some(o=>o.fieldType.kind===n||o.fieldType.kind==="array"&&o.fieldType.itemType?.kind===n)),pt={generate:(e,n="Root",r={})=>{let o=_(e,N(n),r),t=!1;for(let l of o)for(let c of l.fields)if(c.name!==me(c.name)){t=!0;break}let i=qn(o,"datetime"),s=qn(o,"date"),a=`import kotlinx.serialization.Serializable
`;t&&(a+=`import kotlinx.serialization.SerialName
`),i&&(a+=`import kotlinx.datetime.Instant
`),s&&(a+=`import kotlinx.datetime.LocalDate
`),a+=`
`;for(let l of o){let c=q(l.name),f=D(l),u=f?` : ${q(f)}`:"";a+=`@Serializable
data class ${c}(
`;let m=l.fields.map(p=>{let d=me(p.name),y=ft(p.fieldType);(p.isOptional||p.isNullable)&&(y+="?");let g=p.name!==d?`    @SerialName("${p.name}")
`:"",h=p.isOptional||p.isNullable?" = null":"";return`${g}    val ${d}: ${y}${h}`});a+=m.join(`,
`),a+=`
)${u}

`}return a}},mt=e=>{switch(e.kind){case"string":return e.enumValues&&e.enumValues.length>0?e.enumValues.map(n=>`'${n}'`).join(" | "):"string";case"number":return"number";case"boolean":return"boolean";case"date":case"datetime":return"string";case"classRef":return`${q(e.classRefName??"Object")}Dto`;case"array":if(e.itemType){let n=mt(e.itemType);return n.includes("|")?`(${n})[]`:`${n}[]`}return"unknown[]";case"enum":return e.enumValues&&e.enumValues.length>0?e.enumValues.map(n=>`'${n}'`).join(" | "):"string";case"union":return"unknown";default:return"unknown"}},dt={generate:(e,n="Root",r={})=>{let o=_(e,N(n),r),t=new Set,i=new Set,s=[];for(let l of o){let f=`export class ${`${l.name}Dto`} {
`;for(let u of l.fields){let m=u.name.toLowerCase(),p=u.isOptional,d=u.isNullable,y=u.fieldType,g=[];if(p&&(g.push("@IsOptional()"),t.add("IsOptional")),y.kind==="string"){let $=y.format;$==="email"||m.includes("email")?(g.push("@IsEmail()"),t.add("IsEmail")):$==="uuid"?(g.push("@IsUUID()"),t.add("IsUUID")):$==="url"||m.includes("url")||m.includes("website")?(g.push("@IsUrl()"),t.add("IsUrl")):$==="datetime"||$==="date"?(g.push("@IsISO8601()"),t.add("IsISO8601")):y.enumValues&&y.enumValues.length>0?(g.push(`@IsIn([${y.enumValues.map(j=>`'${j}'`).join(", ")}])`),t.add("IsIn")):(g.push("@IsString()"),t.add("IsString"),p||(g.push("@IsNotEmpty()"),t.add("IsNotEmpty")))}else if(y.kind==="number")y.format==="int"?(g.push("@IsInt()"),t.add("IsInt")):(g.push("@IsNumber()"),t.add("IsNumber")),m.includes("percent")?(g.push("@Min(0)","@Max(100)"),t.add("Min"),t.add("Max")):m.includes("latitude")||m==="lat"?(g.push("@Min(-90)","@Max(90)"),t.add("Min"),t.add("Max")):m.includes("longitude")||m==="lng"||m==="lon"?(g.push("@Min(-180)","@Max(180)"),t.add("Min"),t.add("Max")):m.includes("age")&&(g.push("@Min(0)","@Max(150)"),t.add("Min"),t.add("Max"));else if(y.kind==="boolean")g.push("@IsBoolean()"),t.add("IsBoolean");else if(y.kind==="date"||y.kind==="datetime")g.push("@IsISO8601()"),t.add("IsISO8601");else if(y.kind==="enum")y.enumValues&&y.enumValues.length>0?(g.push(`@IsIn([${y.enumValues.map($=>`'${$}'`).join(", ")}])`),t.add("IsIn")):(g.push("@IsString()"),t.add("IsString"));else if(y.kind==="array"){if(g.push("@IsArray()"),t.add("IsArray"),y.itemType?.kind==="classRef"){let $=q(y.itemType.classRefName??"Object");g.push("@ValidateNested({ each: true })"),g.push(`@Type(() => ${$}Dto)`),t.add("ValidateNested"),i.add("Type")}}else if(y.kind==="classRef"){let $=q(y.classRefName??"Object");g.push("@ValidateNested()"),g.push(`@Type(() => ${$}Dto)`),t.add("ValidateNested"),i.add("Type")}let h=mt(y);d&&(h+=" | null");let b=p?"?":"";for(let $ of g)f+=`  ${$}
`;f+=`  ${u.name}${b}: ${h};

`}f=f.trimEnd()+`
}
`,s.push(f)}let a="";return t.size>0&&(a+=`import { ${[...t].sort().join(", ")} } from 'class-validator';
`),i.size>0&&(a+=`import { ${[...i].sort().join(", ")} } from 'class-transformer';
`),a&&(a+=`
`),a+s.join(`
`)}},yt={generate:e=>{let n=r=>{if(r.type==="object"&&r.fields){let t=Object.keys(r.fields).filter(s=>!r.fields[s].optional),i={type:r.nullable?["object","null"]:"object",properties:Object.keys(r.fields).reduce((s,a)=>({...s,[a]:n(r.fields[a])}),{})};return t.length>0&&(i.required=t),i}if(r.type==="array")return{type:r.nullable?["array","null"]:"array",items:n(r.itemType)};if(r.type==="union"&&r.unionTypes){let t={anyOf:r.unionTypes.map(i=>({type:i}))};return r.nullable&&t.anyOf.push({type:"null"}),t}let o={};return r.type!=="any"&&(o.type=r.nullable?[r.type,"null"]:r.type),r.format&&(o.format=r.format),r.enumValues&&r.enumValues.length>0&&(o.enum=r.enumValues),o};return JSON.stringify({$schema:"http://json-schema.org/draft-07/schema#",...n(e)},null,2)}},on=(e,n)=>{switch(e.kind){case"string":return e.format==="uuid"?"Schema.UUID":e.format==="datetime"||e.format==="date"?"Schema.DateTimeUtc":e.enumValues&&e.enumValues.length>0?`Schema.Literal(${e.enumValues.map(r=>`"${r}"`).join(", ")})`:"Schema.String";case"number":return e.format==="int"?"Schema.Int":"Schema.Number";case"boolean":return"Schema.Boolean";case"date":case"datetime":return"Schema.DateTimeUtc";case"classRef":{if(!e.classRefName)return"Schema.Unknown";let r=V(e.classRefName);return n.has(e.classRefName)?`Schema.suspend((): Schema.Schema<${e.classRefName}> => ${r})`:r}case"array":return e.itemType?`Schema.Array(${on(e.itemType,n)})`:"Schema.Array(Schema.Unknown)";case"enum":return e.enumValues&&e.enumValues.length>0?`Schema.Literal(${e.enumValues.map(r=>`"${r}"`).join(", ")})`:"Schema.String";case"union":if(e.unionTypes&&e.unionTypes.length>0){let r=e.unionTypes.map(o=>on({kind:o},n));return r.length===1?r[0]:`Schema.Union(${r.join(", ")})`}return"Schema.Unknown";default:return"Schema.Unknown"}},gt={generate:(e,n="root",r={})=>{let o=_(e,N(n),r),{sorted:t,cyclicClassRefs:i}=Vn(o),s="";for(let l of t){let c=V(l.name);s+=`export const ${c} = Schema.Struct({
`;for(let f of l.fields){let u=on(f.fieldType,i);f.isNullable&&f.isOptional?u=`Schema.optional(Schema.NullOr(${u}))`:f.isNullable?u=`Schema.NullOr(${u})`:f.isOptional&&(u=`Schema.optional(${u})`),s+=`  ${f.name}: ${u},
`}s+=`});
`,s+=`export type ${l.name} = Schema.Schema.Type<typeof ${c}>;

`}let a=re(e,N(n));if(a&&o.some(l=>l.name===a)){let l=N(n),c=V(l);s+=`export const ${c} = Schema.Array(${V(a)});
`,s+=`export type ${l} = Schema.Schema.Type<typeof ${c}>;

`}return s}},Ee={generate:(e,n="Root")=>{if(e.type==="object"&&e.fields){let r=`# API Field Specifications: ${n}

`;r+=`| Field | Type | Required | Description |
`,r+=`| :--- | :--- | :--- | :--- |
`;for(let[o,t]of Object.entries(e.fields)){let i=t.type==="object"?"Object":t.type==="array"?`${t.itemType?.type||"any"}[]`:t.type;t.type==="union"&&t.unionTypes&&(i=t.unionTypes.join(" \\| ")),t.nullable&&(i+=" (nullable)");let s=t.optional?"No":"Yes",a="No description provided.",l=o.toLowerCase();l.endsWith("_id")&&l!=="id"?a="Foreign key reference to an external record.":l==="id"||l.endsWith("id")?a="Unique identifier for the record.":l==="username"?a="User's unique display name.":l==="name"||l==="fullname"?a="Full name of the user or entity.":l==="email"?a="Primary email address.":l==="status"?a="Operational or lifecycle state.":l==="role"?a="User privilege role or system role.":l==="avatarurl"||l==="avatar"?a="Public URL to the user's avatar image.":l==="stats"?a="Statistical metrics and counters.":l==="preferences"?a="User preference flags and custom configurations.":l.startsWith("is")||l.startsWith("has")?a="Boolean flag representing status.":l==="createdat"||l==="created_at"?a="Timestamp representing record creation time.":l==="updatedat"||l==="updated_at"?a="Timestamp representing the last update time.":l==="lastlogin"||l==="last_login"?a="Timestamp of the user's most recent session activity.":l==="title"?a="Human-readable title or heading.":l.includes("description")||l==="desc"?a="Free-text description or summary.":l.includes("phone")||l.includes("mobile")?a="Contact phone number.":l.includes("address")?a="Physical or mailing address.":l.includes("price")||l.includes("amount")||l.includes("cost")||l.includes("fee")?a="Monetary value (non-negative).":l==="age"?a="Age in years (0\u2013150).":l.includes("age")&&t.type==="number"?a="Numeric age value.":l==="type"||l.endsWith("_type")||l.endsWith("type")?a="Discriminator or category type.":l==="slug"||l.endsWith("_slug")?a="URL-safe identifier slug.":l.endsWith("_count")||l==="count"?a="Integer count or quantity (non-negative).":l.endsWith("_at")?a="ISO 8601 timestamp.":l.endsWith("_url")||l.endsWith("_link")?a="Fully-qualified URL (HTTP/HTTPS).":l.endsWith("_code")||l==="code"?a="Short code or identifier string.":t.format==="uuid"?a="Universally Unique Identifier (UUID) format string.":t.format==="email"?a="Validated email format string.":t.format==="url"?a="Fully-qualified web URL (HTTP/HTTPS).":t.format==="datetime"&&(a="ISO 8601 compliant UTC date-time string."),r+=`| \`${o}\` | \`${i}\` | ${s} | ${a} |
`}r+=`
`;for(let[o,t]of Object.entries(e.fields))t.type==="object"&&(r+=`
---

`,r+=Ee.generate(t,o.charAt(0).toUpperCase()+o.slice(1))),t.type==="array"&&t.itemType?.type==="object"&&(r+=`
---

`,r+=Ee.generate(t.itemType,o.charAt(0).toUpperCase()+o.slice(1)+"Item"));return r}return""}};function Et(e){return typeof e>"u"||e===null}function Zi(e){return typeof e=="object"&&e!==null}function Qi(e){return Array.isArray(e)?e:Et(e)?[]:[e]}function Xi(e,n){var r,o,t,i;if(n)for(i=Object.keys(n),r=0,o=i.length;r<o;r+=1)t=i[r],e[t]=n[t];return e}function es(e,n){var r="",o;for(o=0;o<n;o+=1)r+=e;return r}function ns(e){return e===0&&Number.NEGATIVE_INFINITY===1/e}var ts=Et,rs=Zi,is=Qi,ss=es,os=ns,as=Xi,E={isNothing:ts,isObject:rs,toArray:is,repeat:ss,isNegativeZero:os,extend:as};function _t(e,n){var r="",o=e.reason||"(unknown reason)";return e.mark?(e.mark.name&&(r+='in "'+e.mark.name+'" '),r+="("+(e.mark.line+1)+":"+(e.mark.column+1)+")",!n&&e.mark.snippet&&(r+=`

`+e.mark.snippet),o+" "+r):o}function ye(e,n){Error.call(this),this.name="YAMLException",this.reason=e,this.mark=n,this.message=_t(this,!1),Error.captureStackTrace?Error.captureStackTrace(this,this.constructor):this.stack=new Error().stack||""}ye.prototype=Object.create(Error.prototype);ye.prototype.constructor=ye;ye.prototype.toString=function(n){return this.name+": "+_t(this,n)};var F=ye;function an(e,n,r,o,t){var i="",s="",a=Math.floor(t/2)-1;return o-n>a&&(i=" ... ",n=o-a+i.length),r-o>a&&(s=" ...",r=o+a-s.length),{str:i+e.slice(n,r).replace(/\t/g,"\u2192")+s,pos:o-n+i.length}}function ln(e,n){return E.repeat(" ",n-e.length)+e}function ls(e,n){if(n=Object.create(n||null),!e.buffer)return null;n.maxLength||(n.maxLength=79),typeof n.indent!="number"&&(n.indent=1),typeof n.linesBefore!="number"&&(n.linesBefore=3),typeof n.linesAfter!="number"&&(n.linesAfter=2);for(var r=/\r?\n|\r|\0/g,o=[0],t=[],i,s=-1;i=r.exec(e.buffer);)t.push(i.index),o.push(i.index+i[0].length),e.position<=i.index&&s<0&&(s=o.length-2);s<0&&(s=o.length-1);var a="",l,c,f=Math.min(e.line+n.linesAfter,t.length).toString().length,u=n.maxLength-(n.indent+f+3);for(l=1;l<=n.linesBefore&&!(s-l<0);l++)c=an(e.buffer,o[s-l],t[s-l],e.position-(o[s]-o[s-l]),u),a=E.repeat(" ",n.indent)+ln((e.line-l+1).toString(),f)+" | "+c.str+`
`+a;for(c=an(e.buffer,o[s],t[s],e.position,u),a+=E.repeat(" ",n.indent)+ln((e.line+1).toString(),f)+" | "+c.str+`
`,a+=E.repeat("-",n.indent+f+3+c.pos)+`^
`,l=1;l<=n.linesAfter&&!(s+l>=t.length);l++)c=an(e.buffer,o[s+l],t[s+l],e.position-(o[s]-o[s+l]),u),a+=E.repeat(" ",n.indent)+ln((e.line+l+1).toString(),f)+" | "+c.str+`
`;return a.replace(/\n$/,"")}var cs=ls,us=["kind","multi","resolve","construct","instanceOf","predicate","represent","representName","defaultStyle","styleAliases"],fs=["scalar","sequence","mapping"];function ps(e){var n={};return e!==null&&Object.keys(e).forEach(function(r){e[r].forEach(function(o){n[String(o)]=r})}),n}function ms(e,n){if(n=n||{},Object.keys(n).forEach(function(r){if(us.indexOf(r)===-1)throw new F('Unknown option "'+r+'" is met in definition of "'+e+'" YAML type.')}),this.options=n,this.tag=e,this.kind=n.kind||null,this.resolve=n.resolve||function(){return!0},this.construct=n.construct||function(r){return r},this.instanceOf=n.instanceOf||null,this.predicate=n.predicate||null,this.represent=n.represent||null,this.representName=n.representName||null,this.defaultStyle=n.defaultStyle||null,this.multi=n.multi||!1,this.styleAliases=ps(n.styleAliases||null),fs.indexOf(this.kind)===-1)throw new F('Unknown kind "'+this.kind+'" is specified for "'+e+'" YAML type.')}var I=ms;function ht(e,n){var r=[];return e[n].forEach(function(o){var t=r.length;r.forEach(function(i,s){i.tag===o.tag&&i.kind===o.kind&&i.multi===o.multi&&(t=s)}),r[t]=o}),r}function ds(){var e={scalar:{},sequence:{},mapping:{},fallback:{},multi:{scalar:[],sequence:[],mapping:[],fallback:[]}},n,r;function o(t){t.multi?(e.multi[t.kind].push(t),e.multi.fallback.push(t)):e[t.kind][t.tag]=e.fallback[t.tag]=t}for(n=0,r=arguments.length;n<r;n+=1)arguments[n].forEach(o);return e}function un(e){return this.extend(e)}un.prototype.extend=function(n){var r=[],o=[];if(n instanceof I)o.push(n);else if(Array.isArray(n))o=o.concat(n);else if(n&&(Array.isArray(n.implicit)||Array.isArray(n.explicit)))n.implicit&&(r=r.concat(n.implicit)),n.explicit&&(o=o.concat(n.explicit));else throw new F("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");r.forEach(function(i){if(!(i instanceof I))throw new F("Specified list of YAML types (or a single Type object) contains a non-Type object.");if(i.loadKind&&i.loadKind!=="scalar")throw new F("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");if(i.multi)throw new F("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.")}),o.forEach(function(i){if(!(i instanceof I))throw new F("Specified list of YAML types (or a single Type object) contains a non-Type object.")});var t=Object.create(un.prototype);return t.implicit=(this.implicit||[]).concat(r),t.explicit=(this.explicit||[]).concat(o),t.compiledImplicit=ht(t,"implicit"),t.compiledExplicit=ht(t,"explicit"),t.compiledTypeMap=ds(t.compiledImplicit,t.compiledExplicit),t};var It=un,Lt=new I("tag:yaml.org,2002:str",{kind:"scalar",construct:function(e){return e!==null?e:""}}),Mt=new I("tag:yaml.org,2002:seq",{kind:"sequence",construct:function(e){return e!==null?e:[]}}),Dt=new I("tag:yaml.org,2002:map",{kind:"mapping",construct:function(e){return e!==null?e:{}}}),Ft=new It({explicit:[Lt,Mt,Dt]});function ys(e){if(e===null)return!0;var n=e.length;return n===1&&e==="~"||n===4&&(e==="null"||e==="Null"||e==="NULL")}function gs(){return null}function hs(e){return e===null}var Gt=new I("tag:yaml.org,2002:null",{kind:"scalar",resolve:ys,construct:gs,predicate:hs,represent:{canonical:function(){return"~"},lowercase:function(){return"null"},uppercase:function(){return"NULL"},camelcase:function(){return"Null"},empty:function(){return""}},defaultStyle:"lowercase"});function bs(e){if(e===null)return!1;var n=e.length;return n===4&&(e==="true"||e==="True"||e==="TRUE")||n===5&&(e==="false"||e==="False"||e==="FALSE")}function $s(e){return e==="true"||e==="True"||e==="TRUE"}function Ss(e){return Object.prototype.toString.call(e)==="[object Boolean]"}var zt=new I("tag:yaml.org,2002:bool",{kind:"scalar",resolve:bs,construct:$s,predicate:Ss,represent:{lowercase:function(e){return e?"true":"false"},uppercase:function(e){return e?"TRUE":"FALSE"},camelcase:function(e){return e?"True":"False"}},defaultStyle:"lowercase"});function Ts(e){return 48<=e&&e<=57||65<=e&&e<=70||97<=e&&e<=102}function xs(e){return 48<=e&&e<=55}function As(e){return 48<=e&&e<=57}function js(e){if(e===null)return!1;var n=e.length,r=0,o=!1,t;if(!n)return!1;if(t=e[r],(t==="-"||t==="+")&&(t=e[++r]),t==="0"){if(r+1===n)return!0;if(t=e[++r],t==="b"){for(r++;r<n;r++)if(t=e[r],t!=="_"){if(t!=="0"&&t!=="1")return!1;o=!0}return o&&t!=="_"}if(t==="x"){for(r++;r<n;r++)if(t=e[r],t!=="_"){if(!Ts(e.charCodeAt(r)))return!1;o=!0}return o&&t!=="_"}if(t==="o"){for(r++;r<n;r++)if(t=e[r],t!=="_"){if(!xs(e.charCodeAt(r)))return!1;o=!0}return o&&t!=="_"}}if(t==="_")return!1;for(;r<n;r++)if(t=e[r],t!=="_"){if(!As(e.charCodeAt(r)))return!1;o=!0}return!(!o||t==="_")}function Os(e){var n=e,r=1,o;if(n.indexOf("_")!==-1&&(n=n.replace(/_/g,"")),o=n[0],(o==="-"||o==="+")&&(o==="-"&&(r=-1),n=n.slice(1),o=n[0]),n==="0")return 0;if(o==="0"){if(n[1]==="b")return r*parseInt(n.slice(2),2);if(n[1]==="x")return r*parseInt(n.slice(2),16);if(n[1]==="o")return r*parseInt(n.slice(2),8)}return r*parseInt(n,10)}function Ns(e){return Object.prototype.toString.call(e)==="[object Number]"&&e%1===0&&!E.isNegativeZero(e)}var qt=new I("tag:yaml.org,2002:int",{kind:"scalar",resolve:js,construct:Os,predicate:Ns,represent:{binary:function(e){return e>=0?"0b"+e.toString(2):"-0b"+e.toString(2).slice(1)},octal:function(e){return e>=0?"0o"+e.toString(8):"-0o"+e.toString(8).slice(1)},decimal:function(e){return e.toString(10)},hexadecimal:function(e){return e>=0?"0x"+e.toString(16).toUpperCase():"-0x"+e.toString(16).toUpperCase().slice(1)}},defaultStyle:"decimal",styleAliases:{binary:[2,"bin"],octal:[8,"oct"],decimal:[10,"dec"],hexadecimal:[16,"hex"]}}),ks=new RegExp("^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");function Cs(e){return!(e===null||!ks.test(e)||e[e.length-1]==="_")}function vs(e){var n,r;return n=e.replace(/_/g,"").toLowerCase(),r=n[0]==="-"?-1:1,"+-".indexOf(n[0])>=0&&(n=n.slice(1)),n===".inf"?r===1?Number.POSITIVE_INFINITY:Number.NEGATIVE_INFINITY:n===".nan"?NaN:r*parseFloat(n,10)}var ws=/^[-+]?[0-9]+e/;function Rs(e,n){var r;if(isNaN(e))switch(n){case"lowercase":return".nan";case"uppercase":return".NAN";case"camelcase":return".NaN"}else if(Number.POSITIVE_INFINITY===e)switch(n){case"lowercase":return".inf";case"uppercase":return".INF";case"camelcase":return".Inf"}else if(Number.NEGATIVE_INFINITY===e)switch(n){case"lowercase":return"-.inf";case"uppercase":return"-.INF";case"camelcase":return"-.Inf"}else if(E.isNegativeZero(e))return"-0.0";return r=e.toString(10),ws.test(r)?r.replace("e",".e"):r}function Es(e){return Object.prototype.toString.call(e)==="[object Number]"&&(e%1!==0||E.isNegativeZero(e))}var Ut=new I("tag:yaml.org,2002:float",{kind:"scalar",resolve:Cs,construct:vs,predicate:Es,represent:Rs,defaultStyle:"lowercase"}),Pt=Ft.extend({implicit:[Gt,zt,qt,Ut]}),Vt=Pt,Bt=new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"),Wt=new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$");function _s(e){return e===null?!1:Bt.exec(e)!==null||Wt.exec(e)!==null}function Is(e){var n,r,o,t,i,s,a,l=0,c=null,f,u,m;if(n=Bt.exec(e),n===null&&(n=Wt.exec(e)),n===null)throw new Error("Date resolve error");if(r=+n[1],o=+n[2]-1,t=+n[3],!n[4])return new Date(Date.UTC(r,o,t));if(i=+n[4],s=+n[5],a=+n[6],n[7]){for(l=n[7].slice(0,3);l.length<3;)l+="0";l=+l}return n[9]&&(f=+n[10],u=+(n[11]||0),c=(f*60+u)*6e4,n[9]==="-"&&(c=-c)),m=new Date(Date.UTC(r,o,t,i,s,a,l)),c&&m.setTime(m.getTime()-c),m}function Ls(e){return e.toISOString()}var Jt=new I("tag:yaml.org,2002:timestamp",{kind:"scalar",resolve:_s,construct:Is,instanceOf:Date,represent:Ls});function Ms(e){return e==="<<"||e===null}var Yt=new I("tag:yaml.org,2002:merge",{kind:"scalar",resolve:Ms}),yn=`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=
\r`;function Ds(e){if(e===null)return!1;var n,r,o=0,t=e.length,i=yn;for(r=0;r<t;r++)if(n=i.indexOf(e.charAt(r)),!(n>64)){if(n<0)return!1;o+=6}return o%8===0}function Fs(e){var n,r,o=e.replace(/[\r\n=]/g,""),t=o.length,i=yn,s=0,a=[];for(n=0;n<t;n++)n%4===0&&n&&(a.push(s>>16&255),a.push(s>>8&255),a.push(s&255)),s=s<<6|i.indexOf(o.charAt(n));return r=t%4*6,r===0?(a.push(s>>16&255),a.push(s>>8&255),a.push(s&255)):r===18?(a.push(s>>10&255),a.push(s>>2&255)):r===12&&a.push(s>>4&255),new Uint8Array(a)}function Gs(e){var n="",r=0,o,t,i=e.length,s=yn;for(o=0;o<i;o++)o%3===0&&o&&(n+=s[r>>18&63],n+=s[r>>12&63],n+=s[r>>6&63],n+=s[r&63]),r=(r<<8)+e[o];return t=i%3,t===0?(n+=s[r>>18&63],n+=s[r>>12&63],n+=s[r>>6&63],n+=s[r&63]):t===2?(n+=s[r>>10&63],n+=s[r>>4&63],n+=s[r<<2&63],n+=s[64]):t===1&&(n+=s[r>>2&63],n+=s[r<<4&63],n+=s[64],n+=s[64]),n}function zs(e){return Object.prototype.toString.call(e)==="[object Uint8Array]"}var Kt=new I("tag:yaml.org,2002:binary",{kind:"scalar",resolve:Ds,construct:Fs,predicate:zs,represent:Gs}),qs=Object.prototype.hasOwnProperty,Us=Object.prototype.toString;function Ps(e){if(e===null)return!0;var n=[],r,o,t,i,s,a=e;for(r=0,o=a.length;r<o;r+=1){if(t=a[r],s=!1,Us.call(t)!=="[object Object]")return!1;for(i in t)if(qs.call(t,i))if(!s)s=!0;else return!1;if(!s)return!1;if(n.indexOf(i)===-1)n.push(i);else return!1}return!0}function Vs(e){return e!==null?e:[]}var Ht=new I("tag:yaml.org,2002:omap",{kind:"sequence",resolve:Ps,construct:Vs}),Bs=Object.prototype.toString;function Ws(e){if(e===null)return!0;var n,r,o,t,i,s=e;for(i=new Array(s.length),n=0,r=s.length;n<r;n+=1){if(o=s[n],Bs.call(o)!=="[object Object]"||(t=Object.keys(o),t.length!==1))return!1;i[n]=[t[0],o[t[0]]]}return!0}function Js(e){if(e===null)return[];var n,r,o,t,i,s=e;for(i=new Array(s.length),n=0,r=s.length;n<r;n+=1)o=s[n],t=Object.keys(o),i[n]=[t[0],o[t[0]]];return i}var Zt=new I("tag:yaml.org,2002:pairs",{kind:"sequence",resolve:Ws,construct:Js}),Ys=Object.prototype.hasOwnProperty;function Ks(e){if(e===null)return!0;var n,r=e;for(n in r)if(Ys.call(r,n)&&r[n]!==null)return!1;return!0}function Hs(e){return e!==null?e:{}}var Qt=new I("tag:yaml.org,2002:set",{kind:"mapping",resolve:Ks,construct:Hs}),gn=Vt.extend({implicit:[Jt,Yt],explicit:[Kt,Ht,Zt,Qt]}),Q=Object.prototype.hasOwnProperty,_e=1,Xt=2,er=3,Ie=4,cn=1,Zs=2,bt=3,Qs=/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/,Xs=/[\x85\u2028\u2029]/,eo=/[,\[\]\{\}]/,nr=/^(?:!|!!|![a-z\-]+!)$/i,tr=/^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;function $t(e){return Object.prototype.toString.call(e)}function B(e){return e===10||e===13}function ne(e){return e===9||e===32}function G(e){return e===9||e===32||e===10||e===13}function oe(e){return e===44||e===91||e===93||e===123||e===125}function no(e){var n;return 48<=e&&e<=57?e-48:(n=e|32,97<=n&&n<=102?n-97+10:-1)}function to(e){return e===120?2:e===117?4:e===85?8:0}function ro(e){return 48<=e&&e<=57?e-48:-1}function St(e){return e===48?"\0":e===97?"\x07":e===98?"\b":e===116||e===9?"	":e===110?`
`:e===118?"\v":e===102?"\f":e===114?"\r":e===101?"\x1B":e===32?" ":e===34?'"':e===47?"/":e===92?"\\":e===78?"\x85":e===95?"\xA0":e===76?"\u2028":e===80?"\u2029":""}function io(e){return e<=65535?String.fromCharCode(e):String.fromCharCode((e-65536>>10)+55296,(e-65536&1023)+56320)}function rr(e,n,r){n==="__proto__"?Object.defineProperty(e,n,{configurable:!0,enumerable:!0,writable:!0,value:r}):e[n]=r}var ir=new Array(256),sr=new Array(256);for(ee=0;ee<256;ee++)ir[ee]=St(ee)?1:0,sr[ee]=St(ee);var ee;function so(e,n){this.input=e,this.filename=n.filename||null,this.schema=n.schema||gn,this.onWarning=n.onWarning||null,this.legacy=n.legacy||!1,this.json=n.json||!1,this.listener=n.listener||null,this.implicitTypes=this.schema.compiledImplicit,this.typeMap=this.schema.compiledTypeMap,this.length=e.length,this.position=0,this.line=0,this.lineStart=0,this.lineIndent=0,this.firstTabInLine=-1,this.documents=[]}function or(e,n){var r={name:e.filename,buffer:e.input.slice(0,-1),position:e.position,line:e.line,column:e.position-e.lineStart};return r.snippet=cs(r),new F(n,r)}function x(e,n){throw or(e,n)}function Le(e,n){e.onWarning&&e.onWarning.call(null,or(e,n))}var Tt={YAML:function(n,r,o){var t,i,s;n.version!==null&&x(n,"duplication of %YAML directive"),o.length!==1&&x(n,"YAML directive accepts exactly one argument"),t=/^([0-9]+)\.([0-9]+)$/.exec(o[0]),t===null&&x(n,"ill-formed argument of the YAML directive"),i=parseInt(t[1],10),s=parseInt(t[2],10),i!==1&&x(n,"unacceptable YAML version of the document"),n.version=o[0],n.checkLineBreaks=s<2,s!==1&&s!==2&&Le(n,"unsupported YAML version of the document")},TAG:function(n,r,o){var t,i;o.length!==2&&x(n,"TAG directive accepts exactly two arguments"),t=o[0],i=o[1],nr.test(t)||x(n,"ill-formed tag handle (first argument) of the TAG directive"),Q.call(n.tagMap,t)&&x(n,'there is a previously declared suffix for "'+t+'" tag handle'),tr.test(i)||x(n,"ill-formed tag prefix (second argument) of the TAG directive");try{i=decodeURIComponent(i)}catch{x(n,"tag prefix is malformed: "+i)}n.tagMap[t]=i}};function Z(e,n,r,o){var t,i,s,a;if(n<r){if(a=e.input.slice(n,r),o)for(t=0,i=a.length;t<i;t+=1)s=a.charCodeAt(t),s===9||32<=s&&s<=1114111||x(e,"expected valid JSON character");else Qs.test(a)&&x(e,"the stream contains non-printable characters");e.result+=a}}function xt(e,n,r,o){var t,i,s,a;for(E.isObject(r)||x(e,"cannot merge mappings; the provided source object is unacceptable"),t=Object.keys(r),s=0,a=t.length;s<a;s+=1)i=t[s],Q.call(n,i)||(rr(n,i,r[i]),o[i]=!0)}function ae(e,n,r,o,t,i,s,a,l){var c,f;if(Array.isArray(t))for(t=Array.prototype.slice.call(t),c=0,f=t.length;c<f;c+=1)Array.isArray(t[c])&&x(e,"nested arrays are not supported inside keys"),typeof t=="object"&&$t(t[c])==="[object Object]"&&(t[c]="[object Object]");if(typeof t=="object"&&$t(t)==="[object Object]"&&(t="[object Object]"),t=String(t),n===null&&(n={}),o==="tag:yaml.org,2002:merge")if(Array.isArray(i))for(c=0,f=i.length;c<f;c+=1)xt(e,n,i[c],r);else xt(e,n,i,r);else!e.json&&!Q.call(r,t)&&Q.call(n,t)&&(e.line=s||e.line,e.lineStart=a||e.lineStart,e.position=l||e.position,x(e,"duplicated mapping key")),rr(n,t,i),delete r[t];return n}function hn(e){var n;n=e.input.charCodeAt(e.position),n===10?e.position++:n===13?(e.position++,e.input.charCodeAt(e.position)===10&&e.position++):x(e,"a line break is expected"),e.line+=1,e.lineStart=e.position,e.firstTabInLine=-1}function w(e,n,r){for(var o=0,t=e.input.charCodeAt(e.position);t!==0;){for(;ne(t);)t===9&&e.firstTabInLine===-1&&(e.firstTabInLine=e.position),t=e.input.charCodeAt(++e.position);if(n&&t===35)do t=e.input.charCodeAt(++e.position);while(t!==10&&t!==13&&t!==0);if(B(t))for(hn(e),t=e.input.charCodeAt(e.position),o++,e.lineIndent=0;t===32;)e.lineIndent++,t=e.input.charCodeAt(++e.position);else break}return r!==-1&&o!==0&&e.lineIndent<r&&Le(e,"deficient indentation"),o}function Fe(e){var n=e.position,r;return r=e.input.charCodeAt(n),!!((r===45||r===46)&&r===e.input.charCodeAt(n+1)&&r===e.input.charCodeAt(n+2)&&(n+=3,r=e.input.charCodeAt(n),r===0||G(r)))}function bn(e,n){n===1?e.result+=" ":n>1&&(e.result+=E.repeat(`
`,n-1))}function oo(e,n,r){var o,t,i,s,a,l,c,f,u=e.kind,m=e.result,p;if(p=e.input.charCodeAt(e.position),G(p)||oe(p)||p===35||p===38||p===42||p===33||p===124||p===62||p===39||p===34||p===37||p===64||p===96||(p===63||p===45)&&(t=e.input.charCodeAt(e.position+1),G(t)||r&&oe(t)))return!1;for(e.kind="scalar",e.result="",i=s=e.position,a=!1;p!==0;){if(p===58){if(t=e.input.charCodeAt(e.position+1),G(t)||r&&oe(t))break}else if(p===35){if(o=e.input.charCodeAt(e.position-1),G(o))break}else{if(e.position===e.lineStart&&Fe(e)||r&&oe(p))break;if(B(p))if(l=e.line,c=e.lineStart,f=e.lineIndent,w(e,!1,-1),e.lineIndent>=n){a=!0,p=e.input.charCodeAt(e.position);continue}else{e.position=s,e.line=l,e.lineStart=c,e.lineIndent=f;break}}a&&(Z(e,i,s,!1),bn(e,e.line-l),i=s=e.position,a=!1),ne(p)||(s=e.position+1),p=e.input.charCodeAt(++e.position)}return Z(e,i,s,!1),e.result?!0:(e.kind=u,e.result=m,!1)}function ao(e,n){var r,o,t;if(r=e.input.charCodeAt(e.position),r!==39)return!1;for(e.kind="scalar",e.result="",e.position++,o=t=e.position;(r=e.input.charCodeAt(e.position))!==0;)if(r===39)if(Z(e,o,e.position,!0),r=e.input.charCodeAt(++e.position),r===39)o=e.position,e.position++,t=e.position;else return!0;else B(r)?(Z(e,o,t,!0),bn(e,w(e,!1,n)),o=t=e.position):e.position===e.lineStart&&Fe(e)?x(e,"unexpected end of the document within a single quoted scalar"):(e.position++,t=e.position);x(e,"unexpected end of the stream within a single quoted scalar")}function lo(e,n){var r,o,t,i,s,a;if(a=e.input.charCodeAt(e.position),a!==34)return!1;for(e.kind="scalar",e.result="",e.position++,r=o=e.position;(a=e.input.charCodeAt(e.position))!==0;){if(a===34)return Z(e,r,e.position,!0),e.position++,!0;if(a===92){if(Z(e,r,e.position,!0),a=e.input.charCodeAt(++e.position),B(a))w(e,!1,n);else if(a<256&&ir[a])e.result+=sr[a],e.position++;else if((s=to(a))>0){for(t=s,i=0;t>0;t--)a=e.input.charCodeAt(++e.position),(s=no(a))>=0?i=(i<<4)+s:x(e,"expected hexadecimal character");e.result+=io(i),e.position++}else x(e,"unknown escape sequence");r=o=e.position}else B(a)?(Z(e,r,o,!0),bn(e,w(e,!1,n)),r=o=e.position):e.position===e.lineStart&&Fe(e)?x(e,"unexpected end of the document within a double quoted scalar"):(e.position++,o=e.position)}x(e,"unexpected end of the stream within a double quoted scalar")}function co(e,n){var r=!0,o,t,i,s=e.tag,a,l=e.anchor,c,f,u,m,p,d=Object.create(null),y,g,h,b;if(b=e.input.charCodeAt(e.position),b===91)f=93,p=!1,a=[];else if(b===123)f=125,p=!0,a={};else return!1;for(e.anchor!==null&&(e.anchorMap[e.anchor]=a),b=e.input.charCodeAt(++e.position);b!==0;){if(w(e,!0,n),b=e.input.charCodeAt(e.position),b===f)return e.position++,e.tag=s,e.anchor=l,e.kind=p?"mapping":"sequence",e.result=a,!0;r?b===44&&x(e,"expected the node content, but found ','"):x(e,"missed comma between flow collection entries"),g=y=h=null,u=m=!1,b===63&&(c=e.input.charCodeAt(e.position+1),G(c)&&(u=m=!0,e.position++,w(e,!0,n))),o=e.line,t=e.lineStart,i=e.position,le(e,n,_e,!1,!0),g=e.tag,y=e.result,w(e,!0,n),b=e.input.charCodeAt(e.position),(m||e.line===o)&&b===58&&(u=!0,b=e.input.charCodeAt(++e.position),w(e,!0,n),le(e,n,_e,!1,!0),h=e.result),p?ae(e,a,d,g,y,h,o,t,i):u?a.push(ae(e,null,d,g,y,h,o,t,i)):a.push(y),w(e,!0,n),b=e.input.charCodeAt(e.position),b===44?(r=!0,b=e.input.charCodeAt(++e.position)):r=!1}x(e,"unexpected end of the stream within a flow collection")}function uo(e,n){var r,o,t=cn,i=!1,s=!1,a=n,l=0,c=!1,f,u;if(u=e.input.charCodeAt(e.position),u===124)o=!1;else if(u===62)o=!0;else return!1;for(e.kind="scalar",e.result="";u!==0;)if(u=e.input.charCodeAt(++e.position),u===43||u===45)cn===t?t=u===43?bt:Zs:x(e,"repeat of a chomping mode identifier");else if((f=ro(u))>=0)f===0?x(e,"bad explicit indentation width of a block scalar; it cannot be less than one"):s?x(e,"repeat of an indentation width identifier"):(a=n+f-1,s=!0);else break;if(ne(u)){do u=e.input.charCodeAt(++e.position);while(ne(u));if(u===35)do u=e.input.charCodeAt(++e.position);while(!B(u)&&u!==0)}for(;u!==0;){for(hn(e),e.lineIndent=0,u=e.input.charCodeAt(e.position);(!s||e.lineIndent<a)&&u===32;)e.lineIndent++,u=e.input.charCodeAt(++e.position);if(!s&&e.lineIndent>a&&(a=e.lineIndent),B(u)){l++;continue}if(e.lineIndent<a){t===bt?e.result+=E.repeat(`
`,i?1+l:l):t===cn&&i&&(e.result+=`
`);break}for(o?ne(u)?(c=!0,e.result+=E.repeat(`
`,i?1+l:l)):c?(c=!1,e.result+=E.repeat(`
`,l+1)):l===0?i&&(e.result+=" "):e.result+=E.repeat(`
`,l):e.result+=E.repeat(`
`,i?1+l:l),i=!0,s=!0,l=0,r=e.position;!B(u)&&u!==0;)u=e.input.charCodeAt(++e.position);Z(e,r,e.position,!1)}return!0}function At(e,n){var r,o=e.tag,t=e.anchor,i=[],s,a=!1,l;if(e.firstTabInLine!==-1)return!1;for(e.anchor!==null&&(e.anchorMap[e.anchor]=i),l=e.input.charCodeAt(e.position);l!==0&&(e.firstTabInLine!==-1&&(e.position=e.firstTabInLine,x(e,"tab characters must not be used in indentation")),!(l!==45||(s=e.input.charCodeAt(e.position+1),!G(s))));){if(a=!0,e.position++,w(e,!0,-1)&&e.lineIndent<=n){i.push(null),l=e.input.charCodeAt(e.position);continue}if(r=e.line,le(e,n,er,!1,!0),i.push(e.result),w(e,!0,-1),l=e.input.charCodeAt(e.position),(e.line===r||e.lineIndent>n)&&l!==0)x(e,"bad indentation of a sequence entry");else if(e.lineIndent<n)break}return a?(e.tag=o,e.anchor=t,e.kind="sequence",e.result=i,!0):!1}function fo(e,n,r){var o,t,i,s,a,l,c=e.tag,f=e.anchor,u={},m=Object.create(null),p=null,d=null,y=null,g=!1,h=!1,b;if(e.firstTabInLine!==-1)return!1;for(e.anchor!==null&&(e.anchorMap[e.anchor]=u),b=e.input.charCodeAt(e.position);b!==0;){if(!g&&e.firstTabInLine!==-1&&(e.position=e.firstTabInLine,x(e,"tab characters must not be used in indentation")),o=e.input.charCodeAt(e.position+1),i=e.line,(b===63||b===58)&&G(o))b===63?(g&&(ae(e,u,m,p,d,null,s,a,l),p=d=y=null),h=!0,g=!0,t=!0):g?(g=!1,t=!0):x(e,"incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line"),e.position+=1,b=o;else{if(s=e.line,a=e.lineStart,l=e.position,!le(e,r,Xt,!1,!0))break;if(e.line===i){for(b=e.input.charCodeAt(e.position);ne(b);)b=e.input.charCodeAt(++e.position);if(b===58)b=e.input.charCodeAt(++e.position),G(b)||x(e,"a whitespace character is expected after the key-value separator within a block mapping"),g&&(ae(e,u,m,p,d,null,s,a,l),p=d=y=null),h=!0,g=!1,t=!1,p=e.tag,d=e.result;else if(h)x(e,"can not read an implicit mapping pair; a colon is missed");else return e.tag=c,e.anchor=f,!0}else if(h)x(e,"can not read a block mapping entry; a multiline key may not be an implicit key");else return e.tag=c,e.anchor=f,!0}if((e.line===i||e.lineIndent>n)&&(g&&(s=e.line,a=e.lineStart,l=e.position),le(e,n,Ie,!0,t)&&(g?d=e.result:y=e.result),g||(ae(e,u,m,p,d,y,s,a,l),p=d=y=null),w(e,!0,-1),b=e.input.charCodeAt(e.position)),(e.line===i||e.lineIndent>n)&&b!==0)x(e,"bad indentation of a mapping entry");else if(e.lineIndent<n)break}return g&&ae(e,u,m,p,d,null,s,a,l),h&&(e.tag=c,e.anchor=f,e.kind="mapping",e.result=u),h}function po(e){var n,r=!1,o=!1,t,i,s;if(s=e.input.charCodeAt(e.position),s!==33)return!1;if(e.tag!==null&&x(e,"duplication of a tag property"),s=e.input.charCodeAt(++e.position),s===60?(r=!0,s=e.input.charCodeAt(++e.position)):s===33?(o=!0,t="!!",s=e.input.charCodeAt(++e.position)):t="!",n=e.position,r){do s=e.input.charCodeAt(++e.position);while(s!==0&&s!==62);e.position<e.length?(i=e.input.slice(n,e.position),s=e.input.charCodeAt(++e.position)):x(e,"unexpected end of the stream within a verbatim tag")}else{for(;s!==0&&!G(s);)s===33&&(o?x(e,"tag suffix cannot contain exclamation marks"):(t=e.input.slice(n-1,e.position+1),nr.test(t)||x(e,"named tag handle cannot contain such characters"),o=!0,n=e.position+1)),s=e.input.charCodeAt(++e.position);i=e.input.slice(n,e.position),eo.test(i)&&x(e,"tag suffix cannot contain flow indicator characters")}i&&!tr.test(i)&&x(e,"tag name cannot contain such characters: "+i);try{i=decodeURIComponent(i)}catch{x(e,"tag name is malformed: "+i)}return r?e.tag=i:Q.call(e.tagMap,t)?e.tag=e.tagMap[t]+i:t==="!"?e.tag="!"+i:t==="!!"?e.tag="tag:yaml.org,2002:"+i:x(e,'undeclared tag handle "'+t+'"'),!0}function mo(e){var n,r;if(r=e.input.charCodeAt(e.position),r!==38)return!1;for(e.anchor!==null&&x(e,"duplication of an anchor property"),r=e.input.charCodeAt(++e.position),n=e.position;r!==0&&!G(r)&&!oe(r);)r=e.input.charCodeAt(++e.position);return e.position===n&&x(e,"name of an anchor node must contain at least one character"),e.anchor=e.input.slice(n,e.position),!0}function yo(e){var n,r,o;if(o=e.input.charCodeAt(e.position),o!==42)return!1;for(o=e.input.charCodeAt(++e.position),n=e.position;o!==0&&!G(o)&&!oe(o);)o=e.input.charCodeAt(++e.position);return e.position===n&&x(e,"name of an alias node must contain at least one character"),r=e.input.slice(n,e.position),Q.call(e.anchorMap,r)||x(e,'unidentified alias "'+r+'"'),e.result=e.anchorMap[r],w(e,!0,-1),!0}function le(e,n,r,o,t){var i,s,a,l=1,c=!1,f=!1,u,m,p,d,y,g;if(e.listener!==null&&e.listener("open",e),e.tag=null,e.anchor=null,e.kind=null,e.result=null,i=s=a=Ie===r||er===r,o&&w(e,!0,-1)&&(c=!0,e.lineIndent>n?l=1:e.lineIndent===n?l=0:e.lineIndent<n&&(l=-1)),l===1)for(;po(e)||mo(e);)w(e,!0,-1)?(c=!0,a=i,e.lineIndent>n?l=1:e.lineIndent===n?l=0:e.lineIndent<n&&(l=-1)):a=!1;if(a&&(a=c||t),(l===1||Ie===r)&&(_e===r||Xt===r?y=n:y=n+1,g=e.position-e.lineStart,l===1?a&&(At(e,g)||fo(e,g,y))||co(e,y)?f=!0:(s&&uo(e,y)||ao(e,y)||lo(e,y)?f=!0:yo(e)?(f=!0,(e.tag!==null||e.anchor!==null)&&x(e,"alias node should not have any properties")):oo(e,y,_e===r)&&(f=!0,e.tag===null&&(e.tag="?")),e.anchor!==null&&(e.anchorMap[e.anchor]=e.result)):l===0&&(f=a&&At(e,g))),e.tag===null)e.anchor!==null&&(e.anchorMap[e.anchor]=e.result);else if(e.tag==="?"){for(e.result!==null&&e.kind!=="scalar"&&x(e,'unacceptable node kind for !<?> tag; it should be "scalar", not "'+e.kind+'"'),u=0,m=e.implicitTypes.length;u<m;u+=1)if(d=e.implicitTypes[u],d.resolve(e.result)){e.result=d.construct(e.result),e.tag=d.tag,e.anchor!==null&&(e.anchorMap[e.anchor]=e.result);break}}else if(e.tag!=="!"){if(Q.call(e.typeMap[e.kind||"fallback"],e.tag))d=e.typeMap[e.kind||"fallback"][e.tag];else for(d=null,p=e.typeMap.multi[e.kind||"fallback"],u=0,m=p.length;u<m;u+=1)if(e.tag.slice(0,p[u].tag.length)===p[u].tag){d=p[u];break}d||x(e,"unknown tag !<"+e.tag+">"),e.result!==null&&d.kind!==e.kind&&x(e,"unacceptable node kind for !<"+e.tag+'> tag; it should be "'+d.kind+'", not "'+e.kind+'"'),d.resolve(e.result,e.tag)?(e.result=d.construct(e.result,e.tag),e.anchor!==null&&(e.anchorMap[e.anchor]=e.result)):x(e,"cannot resolve a node with !<"+e.tag+"> explicit tag")}return e.listener!==null&&e.listener("close",e),e.tag!==null||e.anchor!==null||f}function go(e){var n=e.position,r,o,t,i=!1,s;for(e.version=null,e.checkLineBreaks=e.legacy,e.tagMap=Object.create(null),e.anchorMap=Object.create(null);(s=e.input.charCodeAt(e.position))!==0&&(w(e,!0,-1),s=e.input.charCodeAt(e.position),!(e.lineIndent>0||s!==37));){for(i=!0,s=e.input.charCodeAt(++e.position),r=e.position;s!==0&&!G(s);)s=e.input.charCodeAt(++e.position);for(o=e.input.slice(r,e.position),t=[],o.length<1&&x(e,"directive name must not be less than one character in length");s!==0;){for(;ne(s);)s=e.input.charCodeAt(++e.position);if(s===35){do s=e.input.charCodeAt(++e.position);while(s!==0&&!B(s));break}if(B(s))break;for(r=e.position;s!==0&&!G(s);)s=e.input.charCodeAt(++e.position);t.push(e.input.slice(r,e.position))}s!==0&&hn(e),Q.call(Tt,o)?Tt[o](e,o,t):Le(e,'unknown document directive "'+o+'"')}if(w(e,!0,-1),e.lineIndent===0&&e.input.charCodeAt(e.position)===45&&e.input.charCodeAt(e.position+1)===45&&e.input.charCodeAt(e.position+2)===45?(e.position+=3,w(e,!0,-1)):i&&x(e,"directives end mark is expected"),le(e,e.lineIndent-1,Ie,!1,!0),w(e,!0,-1),e.checkLineBreaks&&Xs.test(e.input.slice(n,e.position))&&Le(e,"non-ASCII line breaks are interpreted as content"),e.documents.push(e.result),e.position===e.lineStart&&Fe(e)){e.input.charCodeAt(e.position)===46&&(e.position+=3,w(e,!0,-1));return}if(e.position<e.length-1)x(e,"end of the stream or a document separator is expected");else return}function ar(e,n){e=String(e),n=n||{},e.length!==0&&(e.charCodeAt(e.length-1)!==10&&e.charCodeAt(e.length-1)!==13&&(e+=`
`),e.charCodeAt(0)===65279&&(e=e.slice(1)));var r=new so(e,n),o=e.indexOf("\0");for(o!==-1&&(r.position=o,x(r,"null byte is not allowed in input")),r.input+="\0";r.input.charCodeAt(r.position)===32;)r.lineIndent+=1,r.position+=1;for(;r.position<r.length-1;)go(r);return r.documents}function ho(e,n,r){n!==null&&typeof n=="object"&&typeof r>"u"&&(r=n,n=null);var o=ar(e,r);if(typeof n!="function")return o;for(var t=0,i=o.length;t<i;t+=1)n(o[t])}function bo(e,n){var r=ar(e,n);if(r.length!==0){if(r.length===1)return r[0];throw new F("expected a single document in the stream, but found more")}}var $o=ho,So=bo,lr={loadAll:$o,load:So},cr=Object.prototype.toString,ur=Object.prototype.hasOwnProperty,$n=65279,To=9,ge=10,xo=13,Ao=32,jo=33,Oo=34,fn=35,No=37,ko=38,Co=39,vo=42,fr=44,wo=45,Me=58,Ro=61,Eo=62,_o=63,Io=64,pr=91,mr=93,Lo=96,dr=123,Mo=124,yr=125,M={};M[0]="\\0";M[7]="\\a";M[8]="\\b";M[9]="\\t";M[10]="\\n";M[11]="\\v";M[12]="\\f";M[13]="\\r";M[27]="\\e";M[34]='\\"';M[92]="\\\\";M[133]="\\N";M[160]="\\_";M[8232]="\\L";M[8233]="\\P";var Do=["y","Y","yes","Yes","YES","on","On","ON","n","N","no","No","NO","off","Off","OFF"],Fo=/^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;function Go(e,n){var r,o,t,i,s,a,l;if(n===null)return{};for(r={},o=Object.keys(n),t=0,i=o.length;t<i;t+=1)s=o[t],a=String(n[s]),s.slice(0,2)==="!!"&&(s="tag:yaml.org,2002:"+s.slice(2)),l=e.compiledTypeMap.fallback[s],l&&ur.call(l.styleAliases,a)&&(a=l.styleAliases[a]),r[s]=a;return r}function zo(e){var n,r,o;if(n=e.toString(16).toUpperCase(),e<=255)r="x",o=2;else if(e<=65535)r="u",o=4;else if(e<=4294967295)r="U",o=8;else throw new F("code point within a string may not be greater than 0xFFFFFFFF");return"\\"+r+E.repeat("0",o-n.length)+n}var qo=1,he=2;function Uo(e){this.schema=e.schema||gn,this.indent=Math.max(1,e.indent||2),this.noArrayIndent=e.noArrayIndent||!1,this.skipInvalid=e.skipInvalid||!1,this.flowLevel=E.isNothing(e.flowLevel)?-1:e.flowLevel,this.styleMap=Go(this.schema,e.styles||null),this.sortKeys=e.sortKeys||!1,this.lineWidth=e.lineWidth||80,this.noRefs=e.noRefs||!1,this.noCompatMode=e.noCompatMode||!1,this.condenseFlow=e.condenseFlow||!1,this.quotingType=e.quotingType==='"'?he:qo,this.forceQuotes=e.forceQuotes||!1,this.replacer=typeof e.replacer=="function"?e.replacer:null,this.implicitTypes=this.schema.compiledImplicit,this.explicitTypes=this.schema.compiledExplicit,this.tag=null,this.result="",this.duplicates=[],this.usedDuplicates=null}function jt(e,n){for(var r=E.repeat(" ",n),o=0,t=-1,i="",s,a=e.length;o<a;)t=e.indexOf(`
`,o),t===-1?(s=e.slice(o),o=a):(s=e.slice(o,t+1),o=t+1),s.length&&s!==`
`&&(i+=r),i+=s;return i}function pn(e,n){return`
`+E.repeat(" ",e.indent*n)}function Po(e,n){var r,o,t;for(r=0,o=e.implicitTypes.length;r<o;r+=1)if(t=e.implicitTypes[r],t.resolve(n))return!0;return!1}function De(e){return e===Ao||e===To}function be(e){return 32<=e&&e<=126||161<=e&&e<=55295&&e!==8232&&e!==8233||57344<=e&&e<=65533&&e!==$n||65536<=e&&e<=1114111}function Ot(e){return be(e)&&e!==$n&&e!==xo&&e!==ge}function Nt(e,n,r){var o=Ot(e),t=o&&!De(e);return(r?o:o&&e!==fr&&e!==pr&&e!==mr&&e!==dr&&e!==yr)&&e!==fn&&!(n===Me&&!t)||Ot(n)&&!De(n)&&e===fn||n===Me&&t}function Vo(e){return be(e)&&e!==$n&&!De(e)&&e!==wo&&e!==_o&&e!==Me&&e!==fr&&e!==pr&&e!==mr&&e!==dr&&e!==yr&&e!==fn&&e!==ko&&e!==vo&&e!==jo&&e!==Mo&&e!==Ro&&e!==Eo&&e!==Co&&e!==Oo&&e!==No&&e!==Io&&e!==Lo}function Bo(e){return!De(e)&&e!==Me}function de(e,n){var r=e.charCodeAt(n),o;return r>=55296&&r<=56319&&n+1<e.length&&(o=e.charCodeAt(n+1),o>=56320&&o<=57343)?(r-55296)*1024+o-56320+65536:r}function gr(e){var n=/^\n* /;return n.test(e)}var hr=1,mn=2,br=3,$r=4,se=5;function Wo(e,n,r,o,t,i,s,a){var l,c=0,f=null,u=!1,m=!1,p=o!==-1,d=-1,y=Vo(de(e,0))&&Bo(de(e,e.length-1));if(n||s)for(l=0;l<e.length;c>=65536?l+=2:l++){if(c=de(e,l),!be(c))return se;y=y&&Nt(c,f,a),f=c}else{for(l=0;l<e.length;c>=65536?l+=2:l++){if(c=de(e,l),c===ge)u=!0,p&&(m=m||l-d-1>o&&e[d+1]!==" ",d=l);else if(!be(c))return se;y=y&&Nt(c,f,a),f=c}m=m||p&&l-d-1>o&&e[d+1]!==" "}return!u&&!m?y&&!s&&!t(e)?hr:i===he?se:mn:r>9&&gr(e)?se:s?i===he?se:mn:m?$r:br}function Jo(e,n,r,o,t){e.dump=(function(){if(n.length===0)return e.quotingType===he?'""':"''";if(!e.noCompatMode&&(Do.indexOf(n)!==-1||Fo.test(n)))return e.quotingType===he?'"'+n+'"':"'"+n+"'";var i=e.indent*Math.max(1,r),s=e.lineWidth===-1?-1:Math.max(Math.min(e.lineWidth,40),e.lineWidth-i),a=o||e.flowLevel>-1&&r>=e.flowLevel;function l(c){return Po(e,c)}switch(Wo(n,a,e.indent,s,l,e.quotingType,e.forceQuotes&&!o,t)){case hr:return n;case mn:return"'"+n.replace(/'/g,"''")+"'";case br:return"|"+kt(n,e.indent)+Ct(jt(n,i));case $r:return">"+kt(n,e.indent)+Ct(jt(Yo(n,s),i));case se:return'"'+Ko(n)+'"';default:throw new F("impossible error: invalid scalar style")}})()}function kt(e,n){var r=gr(e)?String(n):"",o=e[e.length-1]===`
`,t=o&&(e[e.length-2]===`
`||e===`
`),i=t?"+":o?"":"-";return r+i+`
`}function Ct(e){return e[e.length-1]===`
`?e.slice(0,-1):e}function Yo(e,n){for(var r=/(\n+)([^\n]*)/g,o=(function(){var c=e.indexOf(`
`);return c=c!==-1?c:e.length,r.lastIndex=c,vt(e.slice(0,c),n)})(),t=e[0]===`
`||e[0]===" ",i,s;s=r.exec(e);){var a=s[1],l=s[2];i=l[0]===" ",o+=a+(!t&&!i&&l!==""?`
`:"")+vt(l,n),t=i}return o}function vt(e,n){if(e===""||e[0]===" ")return e;for(var r=/ [^ ]/g,o,t=0,i,s=0,a=0,l="";o=r.exec(e);)a=o.index,a-t>n&&(i=s>t?s:a,l+=`
`+e.slice(t,i),t=i+1),s=a;return l+=`
`,e.length-t>n&&s>t?l+=e.slice(t,s)+`
`+e.slice(s+1):l+=e.slice(t),l.slice(1)}function Ko(e){for(var n="",r=0,o,t=0;t<e.length;r>=65536?t+=2:t++)r=de(e,t),o=M[r],!o&&be(r)?(n+=e[t],r>=65536&&(n+=e[t+1])):n+=o||zo(r);return n}function Ho(e,n,r){var o="",t=e.tag,i,s,a;for(i=0,s=r.length;i<s;i+=1)a=r[i],e.replacer&&(a=e.replacer.call(r,String(i),a)),(K(e,n,a,!1,!1)||typeof a>"u"&&K(e,n,null,!1,!1))&&(o!==""&&(o+=","+(e.condenseFlow?"":" ")),o+=e.dump);e.tag=t,e.dump="["+o+"]"}function wt(e,n,r,o){var t="",i=e.tag,s,a,l;for(s=0,a=r.length;s<a;s+=1)l=r[s],e.replacer&&(l=e.replacer.call(r,String(s),l)),(K(e,n+1,l,!0,!0,!1,!0)||typeof l>"u"&&K(e,n+1,null,!0,!0,!1,!0))&&((!o||t!=="")&&(t+=pn(e,n)),e.dump&&ge===e.dump.charCodeAt(0)?t+="-":t+="- ",t+=e.dump);e.tag=i,e.dump=t||"[]"}function Zo(e,n,r){var o="",t=e.tag,i=Object.keys(r),s,a,l,c,f;for(s=0,a=i.length;s<a;s+=1)f="",o!==""&&(f+=", "),e.condenseFlow&&(f+='"'),l=i[s],c=r[l],e.replacer&&(c=e.replacer.call(r,l,c)),K(e,n,l,!1,!1)&&(e.dump.length>1024&&(f+="? "),f+=e.dump+(e.condenseFlow?'"':"")+":"+(e.condenseFlow?"":" "),K(e,n,c,!1,!1)&&(f+=e.dump,o+=f));e.tag=t,e.dump="{"+o+"}"}function Qo(e,n,r,o){var t="",i=e.tag,s=Object.keys(r),a,l,c,f,u,m;if(e.sortKeys===!0)s.sort();else if(typeof e.sortKeys=="function")s.sort(e.sortKeys);else if(e.sortKeys)throw new F("sortKeys must be a boolean or a function");for(a=0,l=s.length;a<l;a+=1)m="",(!o||t!=="")&&(m+=pn(e,n)),c=s[a],f=r[c],e.replacer&&(f=e.replacer.call(r,c,f)),K(e,n+1,c,!0,!0,!0)&&(u=e.tag!==null&&e.tag!=="?"||e.dump&&e.dump.length>1024,u&&(e.dump&&ge===e.dump.charCodeAt(0)?m+="?":m+="? "),m+=e.dump,u&&(m+=pn(e,n)),K(e,n+1,f,!0,u)&&(e.dump&&ge===e.dump.charCodeAt(0)?m+=":":m+=": ",m+=e.dump,t+=m));e.tag=i,e.dump=t||"{}"}function Rt(e,n,r){var o,t,i,s,a,l;for(t=r?e.explicitTypes:e.implicitTypes,i=0,s=t.length;i<s;i+=1)if(a=t[i],(a.instanceOf||a.predicate)&&(!a.instanceOf||typeof n=="object"&&n instanceof a.instanceOf)&&(!a.predicate||a.predicate(n))){if(r?a.multi&&a.representName?e.tag=a.representName(n):e.tag=a.tag:e.tag="?",a.represent){if(l=e.styleMap[a.tag]||a.defaultStyle,cr.call(a.represent)==="[object Function]")o=a.represent(n,l);else if(ur.call(a.represent,l))o=a.represent[l](n,l);else throw new F("!<"+a.tag+'> tag resolver accepts not "'+l+'" style');e.dump=o}return!0}return!1}function K(e,n,r,o,t,i,s){e.tag=null,e.dump=r,Rt(e,r,!1)||Rt(e,r,!0);var a=cr.call(e.dump),l=o,c;o&&(o=e.flowLevel<0||e.flowLevel>n);var f=a==="[object Object]"||a==="[object Array]",u,m;if(f&&(u=e.duplicates.indexOf(r),m=u!==-1),(e.tag!==null&&e.tag!=="?"||m||e.indent!==2&&n>0)&&(t=!1),m&&e.usedDuplicates[u])e.dump="*ref_"+u;else{if(f&&m&&!e.usedDuplicates[u]&&(e.usedDuplicates[u]=!0),a==="[object Object]")o&&Object.keys(e.dump).length!==0?(Qo(e,n,e.dump,t),m&&(e.dump="&ref_"+u+e.dump)):(Zo(e,n,e.dump),m&&(e.dump="&ref_"+u+" "+e.dump));else if(a==="[object Array]")o&&e.dump.length!==0?(e.noArrayIndent&&!s&&n>0?wt(e,n-1,e.dump,t):wt(e,n,e.dump,t),m&&(e.dump="&ref_"+u+e.dump)):(Ho(e,n,e.dump),m&&(e.dump="&ref_"+u+" "+e.dump));else if(a==="[object String]")e.tag!=="?"&&Jo(e,e.dump,n,i,l);else{if(a==="[object Undefined]")return!1;if(e.skipInvalid)return!1;throw new F("unacceptable kind of an object to dump "+a)}e.tag!==null&&e.tag!=="?"&&(c=encodeURI(e.tag[0]==="!"?e.tag.slice(1):e.tag).replace(/!/g,"%21"),e.tag[0]==="!"?c="!"+c:c.slice(0,18)==="tag:yaml.org,2002:"?c="!!"+c.slice(18):c="!<"+c+">",e.dump=c+" "+e.dump)}return!0}function Xo(e,n){var r=[],o=[],t,i;for(dn(e,r,o),t=0,i=o.length;t<i;t+=1)n.duplicates.push(r[o[t]]);n.usedDuplicates=new Array(i)}function dn(e,n,r){var o,t,i;if(e!==null&&typeof e=="object")if(t=n.indexOf(e),t!==-1)r.indexOf(t)===-1&&r.push(t);else if(n.push(e),Array.isArray(e))for(t=0,i=e.length;t<i;t+=1)dn(e[t],n,r);else for(o=Object.keys(e),t=0,i=o.length;t<i;t+=1)dn(e[o[t]],n,r)}function ea(e,n){n=n||{};var r=new Uo(n);r.noRefs||Xo(e,r);var o=e;return r.replacer&&(o=r.replacer.call({"":o},"",o)),K(r,0,o,!0,!0)?r.dump+`
`:""}var na=ea,ta={dump:na};function Sn(e,n){return function(){throw new Error("Function yaml."+e+" is removed in js-yaml 4. Use yaml."+n+" instead, which is now safe by default.")}}var ra=I,ia=It,sa=Ft,oa=Pt,aa=Vt,la=gn,ca=lr.load,ua=lr.loadAll,fa=ta.dump,pa=F,ma={binary:Kt,float:Ut,map:Dt,null:Gt,pairs:Zt,set:Qt,timestamp:Jt,bool:zt,int:qt,merge:Yt,omap:Ht,seq:Mt,str:Lt},da=Sn("safeLoad","load"),ya=Sn("safeLoadAll","loadAll"),ga=Sn("safeDump","dump"),$e={Type:ra,Schema:ia,FAILSAFE_SCHEMA:sa,JSON_SCHEMA:oa,CORE_SCHEMA:aa,DEFAULT_SCHEMA:la,load:ca,loadAll:ua,dump:fa,YAMLException:pa,types:ma,safeLoad:da,safeLoadAll:ya,safeDump:ga};var S=e=>e.replace(/(^\w|[_\s-]\w)/g,n=>n.replace(/[_\s-]/,"").toUpperCase()),A=e=>e.replace(/([A-Z])/g,"_$1").toLowerCase().replace(/^_/,""),Be=e=>{let n=S(e);return n.charAt(0).toLowerCase()+n.slice(1)},ce=e=>A(e).toUpperCase(),O=e=>e.type==="array"&&e.itemType?e.itemType.fields??{}:e.fields??{},ue=e=>e.type==="array"&&e.itemType?e.itemType:e,An=(e,n="postgres")=>{if(e.type==="number"){let r=e.format==="int";return n==="sqlite"?r?"INTEGER":"REAL":n==="mysql"?r?"BIGINT":"DOUBLE":r?"BIGINT":"DOUBLE PRECISION"}return e.type==="boolean"?n==="mysql"?"TINYINT(1)":"BOOLEAN":e.type==="object"||e.type==="array"||e.type==="union"?n==="postgres"?"JSONB":"JSON":e.format==="uuid"?n==="mysql"?"CHAR(36)":"UUID":e.format==="email"?"VARCHAR(255)":e.format==="url"?"TEXT":e.format==="datetime"?"TIMESTAMP":"VARCHAR(255)"},Tr={generate:e=>{let n=O(e);if(!Object.keys(n).length)return"";let r=Object.keys(n).join(","),o=Object.entries(n).map(([,t])=>t.type==="number"?"0":t.type==="boolean"?"true":t.format==="uuid"?"uuid-xxxx-xxxx":t.format==="email"?"user@example.com":t.format==="url"?"https://example.com":t.format==="datetime"?new Date().toISOString():t.type==="object"&&t.fields?`"${JSON.stringify(Object.fromEntries(Object.entries(t.fields).map(([i,s])=>[i,s.type==="number"?0:s.type==="boolean"?!1:"sample"]))).replace(/"/g,'""')}"`:t.type==="array"?'"[]"':'"sample_value"').join(",");return`${r}
${o}
`}},xr={generate:(e,n="table_name")=>{let r=O(e);if(!Object.keys(r).length)return"";let o=Object.keys(r).map(i=>`"${i}"`).join(", "),t=Object.entries(r).map(([,i])=>{if(i.type==="number")return"0";if(i.type==="boolean")return"TRUE";if(i.format==="uuid")return"'uuid-xxxx-xxxx'";if(i.format==="email")return"'user@example.com'";if(i.format==="datetime")return`'${new Date().toISOString()}'`;if(i.type==="object"&&i.fields){let s=Object.fromEntries(Object.entries(i.fields).map(([a,l])=>[a,l.type==="number"?0:l.type==="boolean"?!1:"sample"]));return`'${JSON.stringify(s).replace(/'/g,"''")}'`}return i.type==="array"?"'[]'":"'sample_value'"}).join(", ");return`INSERT INTO "${A(n)}" (${o})
VALUES (${t});
`}},Ar={generate:(e,n="Root")=>{let r=O(e);if(!Object.keys(r).length)return"";let o="id"in r,t="created_at"in r||"createdAt"in r,i="updated_at"in r||"updatedAt"in r,s=`CREATE TABLE \`${A(n)}\` (
`;o||(s+="  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,\n");for(let[a,l]of Object.entries(r)){let c=l.optional?" NULL":" NOT NULL",f=a.toLowerCase()==="id",u=f&&l.type==="number"?" AUTO_INCREMENT":"",m=f?" PRIMARY KEY":"";s+=`  \`${A(a)}\` ${An(l,"mysql")}${c}${u}${m},
`}return t||(s+="  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n"),i?s=s.replace(/,\s*$/,`
`):s+="  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP\n",s+=`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`,s}},jr={generate:(e,n="Root")=>{let r=O(e);if(!Object.keys(r).length)return"";let o="id"in r,t="created_at"in r||"createdAt"in r,i="updated_at"in r||"updatedAt"in r,a=`CREATE TABLE "${A(n)}" (
`;o||(a+=`  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
`);for(let[l,c]of Object.entries(r)){let f=c.optional?"":" NOT NULL",m=l.toLowerCase()==="id"?" PRIMARY KEY":"";a+=`  "${A(l)}" ${An(c,"postgres")}${f}${m},
`}return t||(a+=`  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
`),i?a=a.replace(/,\s*$/,`
`):a+=`  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
`,a+=`);
`,a}},Or={generate:(e,n="Root")=>{let r=O(e);if(!Object.keys(r).length)return"";let o="id"in r,t="created_at"in r||"createdAt"in r,i="updated_at"in r||"updatedAt"in r,s=`CREATE TABLE IF NOT EXISTS "${A(n)}" (
`;o||(s+=`  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
`);for(let[a,l]of Object.entries(r)){let c=l.optional?"":" NOT NULL",u=a.toLowerCase()==="id"?" PRIMARY KEY":"";s+=`  "${A(a)}" ${An(l,"sqlite")}${c}${u},
`}return t||(s+=`  "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
`),i?s=s.replace(/,\s*$/,`
`):s+=`  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
`,s+=`);
`,s}},Nr={generate:(e,n="Root")=>{let r=O(e);if(!Object.keys(r).length)return"";let o="id"in r,t="created_at"in r||"createdAt"in r,i=`CREATE OR REPLACE TABLE ${ce(n)} (
`;o||(i+=`  ID VARCHAR(36) NOT NULL DEFAULT UUID_STRING(),
`);for(let[s,a]of Object.entries(r)){let l=ce(s),c="VARCHAR";a.type==="number"?c="DOUBLE":a.type==="boolean"?c="BOOLEAN":a.type==="object"||a.type==="array"?c="VARIANT":a.format==="datetime"&&(c="TIMESTAMP_NTZ"),i+=`  ${l} ${c}${a.optional?"":" NOT NULL"},
`}return t?i=i.replace(/,\s*$/,`
`):i+=`  CREATED_AT TIMESTAMP_NTZ NOT NULL DEFAULT CURRENT_TIMESTAMP()
`,i+=`);
`,i}},kr={generate:(e,n="config")=>{let r=O(e);if(!Object.keys(r).length)return"";let o=`[${A(n)}]
`;for(let[t,i]of Object.entries(r))if(i.type==="object"&&i.fields){o+=`
[${A(n)}.${A(t)}]
`;for(let[s,a]of Object.entries(i.fields))o+=`${A(s)} = ${Sr(a)}
`}else if(i.type==="array"){let s=i.itemType?.type,a=s==="number"?"0":s==="boolean"?"false":'"sample_value"';o+=`${A(t)} = [${a}]
`}else o+=`${A(t)} = ${Sr(i)}
`;return o}},Sr=e=>e.type==="number"?"0":e.type==="boolean"?"false":e.format==="datetime"?'"2024-01-01T00:00:00Z"':'"sample_value"',Cr={generate:e=>{let n=r=>r.type==="object"&&r.fields?Object.fromEntries(Object.entries(r.fields).map(([o,t])=>[o,n(t)])):r.type==="array"?[n(r.itemType??{type:"string"})]:r.type==="number"?0:r.type==="boolean"?!1:r.format==="uuid"?"uuid-xxxx-xxxx":r.format==="email"?"user@example.com":r.format==="url"?"https://example.com":r.format==="datetime"?"2024-01-01T00:00:00Z":"sample_value";return $e.dump(n(e),{indent:2})}},vr={generate:e=>{let n=O(e);if(!Object.keys(n).length)return"";let r=(t,i)=>{let s="";for(let[a,l]of Object.entries(t)){let c=ce(i?`${i}_${a}`:a);if(l.type==="object"&&l.fields)s+=r(l.fields,i?`${i}_${a}`:a);else if(l.type==="array")s+=`${c}=
`;else{let f="your_value_here";l.type==="number"?f="0":l.type==="boolean"?f="false":l.format==="uuid"?f="uuid-xxxx-xxxx-xxxx-xxxxxxxxxxxx":l.format==="email"?f="user@example.com":l.format==="url"?f="https://example.com":l.format==="datetime"&&(f="2024-01-01T00:00:00Z"),s+=`${c}=${f}
`}}return s},o=`# Generated by TypeMorph
`;return o+=r(n,""),o}},wr={generate:e=>{let n=O(e);if(!Object.keys(n).length)return"";let r=(t,i)=>{if(i.type==="boolean")return`  ${t}: z.enum(["true", "false"]).transform(v => v === "true")`;if(i.type==="number"){let a=i.format==="int"?".int()":"";return`  ${t}: z.coerce.number()${a}`}if(i.format==="url")return`  ${t}: z.url()`;if(i.format==="email")return`  ${t}: z.email()`;let s=i.optional?".optional()":"";return`  ${t}: z.string()${s}`};return`import { z } from "zod";

export const envSchema = z.object({
${Object.entries(n).map(([t,i])=>r(t,i)).join(`,
`)},
});

export type Env = z.infer<typeof envSchema>;

// Throws at startup if any env var is missing or invalid
export const env = envSchema.parse(process.env);`}},Rr={generate:e=>{let n=O(e);if(!Object.keys(n).length)return"";let r=(t,i)=>{let s="";for(let[a,l]of Object.entries(t)){let c=(i?`${i}.${A(a)}`:A(a)).replace(/_/g,".");if(l.type==="object"&&l.fields)s+=r(l.fields,c);else if(l.type==="array")s+=`${c}=
`;else{let f="sample_value";l.type==="number"?f="0":l.type==="boolean"?f="false":l.format==="datetime"&&(f="2024-01-01T00:00:00Z"),s+=`${c}=${f}
`}}return s},o=`# Generated by TypeMorph
`;return o+=r(n,""),o}},Er={generate:e=>{let n=O(e);if(!Object.keys(n).length)return"";let r=Object.keys(n),o=`| ${r.join(" | ")} |`,t=`| ${r.map(()=>"---").join(" | ")} |`,i=`| ${Object.entries(n).map(([,s])=>s.type==="number"?"0":s.type==="boolean"?"true":s.format==="email"?"user@example.com":s.type==="object"&&s.fields?"`"+JSON.stringify(Object.fromEntries(Object.entries(s.fields).map(([a,l])=>[a,l.type==="number"?0:l.type==="boolean"?!1:"sample"])))+"`":s.type==="array"?"`[]`":"sample").join(" | ")} |`;return`${o}
${t}
${i}
`}},_r={generate:e=>{let n=O(e);if(!Object.keys(n).length)return"";let r=Object.keys(n),o=`[cols="${r.map(()=>"1").join(",")}",options="header"]
|===
`;return o+=`| ${r.join(" | ")}
`,o+=`| ${Object.entries(n).map(([,t])=>t.type==="number"?"0":"sample").join(" | ")}
`,o+=`|===
`,o}},Ir={generate:e=>{let n=O(e);if(!Object.keys(n).length)return"";let r=Object.keys(n),o=`\\begin{tabular}{${r.map(()=>"l").join("|")}}
`;return o+=`\\hline
`,o+=r.join(" & ")+` \\\\
\\hline
`,o+=Object.entries(n).map(([,t])=>t.type==="number"?"0":t.type==="boolean"?"false":t.type==="object"?"\\{...\\}":t.type==="array"?"[...]":t.format==="email"?"user@example.com":t.format==="datetime"?"2024-01-01T00:00:00Z":"sample\\_value").join(" & ")+` \\\\
`,o+=`\\hline
\\end{tabular}
`,o}},Lr={generate:(e,n="Root")=>{let r=O(e);if(!Object.keys(r).length)return"";let o=`erDiagram
`;o+=`  ${S(n)} {
`;for(let[t,i]of Object.entries(r)){let s="string";i.type==="number"?s="float":i.type==="boolean"?s="boolean":i.type==="object"?s="object":i.type==="array"&&(s="array"),o+=`    ${s} ${t}
`}o+=`  }
`;for(let[t,i]of Object.entries(r)){if(i.type==="object"&&i.fields){let s=S(t);o+=`  ${s} {
`;for(let[a,l]of Object.entries(i.fields)){let c="string";l.type==="number"?c="float":l.type==="boolean"&&(c="boolean"),o+=`    ${c} ${a}
`}o+=`  }
`,o+=`  ${S(n)} ||--o{ ${s} : "has"
`}if(i.type==="array"&&i.itemType?.type==="object"&&i.itemType.fields){let s=S(t)+"Item";o+=`  ${s} {
`;for(let[a,l]of Object.entries(i.itemType.fields))o+=`    ${l.type==="number"?"float":"string"} ${a}
`;o+=`  }
`,o+=`  ${S(n)} ||--o{ ${s} : "contains"
`}}for(let[t,i]of Object.entries(r)){if(i.type!=="string"&&i.type!=="number"||!((t.endsWith("_id")||t.endsWith("Id")&&t!=="Id")&&t.toLowerCase()!=="id"))continue;let a=S(t.replace(/_id$/,"").replace(/Id$/,""));!a||a===S(n)||(o+=`  ${a} {
    string id
  }
`,o+=`  ${S(n)} }o--|| ${a} : "references"
`)}return o}},Se=e=>e.type==="number"?"double":e.type==="boolean"?"boolean":e.type==="object"&&e.fields?{type:"record",name:"NestedRecord",fields:Object.entries(e.fields).map(([n,r])=>({name:n,type:r.optional?["null",Se(r)]:Se(r)}))}:e.type==="array"?{type:"array",items:Se(e.itemType??{type:"string"})}:e.type==="union"&&e.unionTypes?e.unionTypes.map(n=>n==="number"?"double":n):"string",Mr={generate:(e,n="Root")=>{let r=O(e);if(!Object.keys(r).length)return"";let o={type:"record",name:S(n),namespace:"com.example",fields:Object.entries(r).map(([t,i])=>({name:t,type:i.optional?["null",Se(i)]:Se(i),default:i.optional?null:void 0}))};return JSON.stringify(o,null,2)}},Ge=(e,n)=>{let r=n.optional?"NULLABLE":"REQUIRED";if(n.type==="number")return{name:e,type:"FLOAT64",mode:r};if(n.type==="boolean")return{name:e,type:"BOOL",mode:r};if(n.format==="datetime")return{name:e,type:"TIMESTAMP",mode:r};if(n.type==="object"&&n.fields)return{name:e,type:"RECORD",mode:r,fields:Object.entries(n.fields).map(([o,t])=>Ge(o,t))};if(n.type==="array"){let o=n.itemType??{type:"string"};return o.type==="object"&&o.fields?{name:e,type:"RECORD",mode:"REPEATED",fields:Object.entries(o.fields).map(([t,i])=>Ge(t,i))}:{name:e,type:Ge("_item",o).type,mode:"REPEATED"}}return{name:e,type:"STRING",mode:r}},Dr={generate:e=>{let n=O(e);if(!Object.keys(n).length)return"";let r=Object.entries(n).map(([o,t])=>Ge(o,t));return JSON.stringify(r,null,2)}},Tn=e=>{if(e.type==="number")return{N:"0"};if(e.type==="boolean")return{BOOL:!1};if(e.type==="array"){let n=e.itemType??{type:"string"};return{L:[Tn(n)]}}return e.type==="object"&&e.fields?{M:Object.fromEntries(Object.entries(e.fields).map(([n,r])=>[n,Tn(r)]))}:e.type==="object"?{M:{}}:e.format==="datetime"?{S:"2024-01-01T00:00:00Z"}:e.format==="uuid"?{S:"uuid-xxxx-xxxx"}:e.format==="email"?{S:"user@example.com"}:e.format==="url"?{S:"https://example.com"}:{S:"sample_value"}},Fr={generate:(e,n="Root")=>{let r=O(e);if(!Object.keys(r).length)return"";let o={TableName:A(n)+"s",Item:{id:{S:"uuid-xxxx-xxxx"},...Object.fromEntries(Object.entries(r).map(([t,i])=>[t,Tn(i)]))}};return JSON.stringify(o,null,2)}},xn=e=>{if(e.type==="union"&&e.unionTypes){let r={anyOf:e.unionTypes.map(o=>({type:o}))};return e.nullable&&(r.nullable=!0),r}if(e.type==="number"){let r={type:"number",format:"double"};return e.enumValues&&e.enumValues.length&&(r.enum=e.enumValues),e.nullable&&(r.nullable=!0),r}if(e.type==="boolean")return e.nullable?{type:"boolean",nullable:!0}:{type:"boolean"};if(e.type==="array"){let r={type:"array",items:xn(e.itemType??{type:"string"})};return e.nullable&&(r.nullable=!0),r}if(e.type==="object"&&e.fields){let r={type:"object",properties:Object.fromEntries(Object.entries(e.fields).map(([o,t])=>[o,xn(t)]))};return e.nullable&&(r.nullable=!0),r}let n={type:"string"};return e.format==="uuid"?n.format="uuid":e.format==="email"?n.format="email":e.format==="url"?n.format="uri":e.format==="datetime"&&(n.type="string",n.format="date-time"),e.enumValues&&e.enumValues.length&&(n.enum=e.enumValues),e.nullable&&(n.nullable=!0),n},Gr={generate:(e,n="Root")=>{let r=O(e),o=S(n),t=Object.entries(r).filter(([,s])=>!s.optional).map(([s])=>s),i={openapi:"3.0.3",info:{title:`${o} API`,version:"1.0.0"},paths:{[`/${A(n)}s`]:{get:{summary:`List ${o}s`,responses:{200:{description:"Success",content:{"application/json":{schema:{type:"array",items:{$ref:`#/components/schemas/${o}`}}}}}}},post:{summary:`Create ${o}`,requestBody:{required:!0,content:{"application/json":{schema:{$ref:`#/components/schemas/${o}`}}}},responses:{201:{description:"Created"}}}}},components:{schemas:{[o]:{type:"object",...t.length?{required:t}:{},properties:Object.fromEntries(Object.entries(r).map(([s,a])=>[s,xn(a)]))}}}};return $e.dump(i,{indent:2})}},zr={generate:(e,n="Root")=>{let r=S(n),o=`https://api.example.com/${A(n)}s`,t={info:{name:`${r} API`,schema:"https://schema.getpostman.com/json/collection/v2.1.0/"},item:[{name:`GET all ${r}s`,request:{method:"GET",url:{raw:o}}},{name:`POST create ${r}`,request:{method:"POST",url:{raw:o},header:[{key:"Content-Type",value:"application/json"}],body:{mode:"raw",raw:"{}"}}},{name:`GET ${r} by ID`,request:{method:"GET",url:{raw:`${o}/:id`}}},{name:`PUT update ${r}`,request:{method:"PUT",url:{raw:`${o}/:id`}}},{name:`DELETE ${r}`,request:{method:"DELETE",url:{raw:`${o}/:id`}}}]};return JSON.stringify(t,null,2)}},qr={generate:(e,n="Root")=>{let r=`https://api.example.com/${A(n)}s`,o=O(e),t=JSON.stringify(Object.fromEntries(Object.entries(o).map(([i,s])=>[i,s.type==="number"?0:s.type==="boolean"?!1:"sample"])),null,2);return[`### Get all ${n}s`,`GET ${r}`,"Accept: application/json","","###","",`### Create ${n}`,`POST ${r}`,"Content-Type: application/json","",t,"","###","",`### Get ${n} by ID`,`GET ${r}/{{id}}`,"","###"].join(`
`)}},Ur={generate:(e,n="Root")=>{let r=O(e),o=Object.keys(r),t=1,i=["{",...o.map(a=>{let l=r[a],c=l.type==="number"?"0":l.type==="boolean"?"false":`\${${t++}:${a}}`;return`  "${a}": ${l.type==="string"||l.format?`"${c}"`:c},`}),"}"],s={[`${S(n)} Scaffold`]:{prefix:`${n.toLowerCase()}-scaffold`,body:i,description:`Generated by TypeMorph: ${S(n)} scaffold`}};return JSON.stringify(s,null,2)}},Pr={generate:(e,n="Root")=>{let r=O(e),o=i=>i.type==="number"?0:i.type==="boolean"?!1:i.type==="object"&&i.fields?Object.fromEntries(Object.entries(i.fields).map(([s,a])=>[s,o(a)])):i.type==="array"?i.itemType?[o(i.itemType)]:[]:i.format==="uuid"?"uuid-xxxx-xxxx":i.format==="email"?"user@example.com":i.format==="url"?"https://example.com":i.format==="datetime"?"2024-01-01T00:00:00Z":"sample",t=JSON.stringify(Object.fromEntries(Object.entries(r).map(([i,s])=>[i,o(s)])),null,2);return`curl -X POST https://api.example.com/${A(n)}s \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -d '${t}'
`}},Vr={generate:(e,n="Root")=>{e=ue(e);let r=S(n),o=`${r}Schema`,t=(i,s="  ",a=0)=>{if(a>4)return"Schema.Types.Mixed";let l=O(i),c=`{
`;for(let[f,u]of Object.entries(l))if(c+=`${s}  ${f}: `,u.type==="object")c+=t(u,s+"  ",a+1)+`,
`;else if(u.type==="array"){let m=u.itemType;if(m?.type==="object")c+=`[${t(m,s+"  ",a+1)}],
`;else{let p="String";m?.type==="number"?p="Number":m?.type==="boolean"?p="Boolean":m?.type==="union"||m?.type==="any"?p="Schema.Types.Mixed":m?.enumValues&&m.enumValues.length&&(p="String"),c+=`[${p}],
`}}else{let m="String";u.type==="number"?m="Number":u.type==="boolean"?m="Boolean":u.type==="union"&&(m="Schema.Types.Mixed");let p=`type: ${m}`;u.optional||(p+=", required: true"),u.enumValues&&u.enumValues.length&&(p+=`, enum: [${u.enumValues.map(d=>`"${d}"`).join(", ")}]`),c+=`{ ${p} },
`}return c+=`${s}}`,c};if(e.type==="object"){let i=`import mongoose, { Schema, Document } from 'mongoose';

`;return i+=`const ${o} = new Schema(${t(e)}, { timestamps: true });

`,i+=`export interface I${r} extends Document {}
`,i+=`export const ${r} = mongoose.models.${r} || mongoose.model<I${r}>('${r}', ${o});
`,i}return""}},Br={generate:(e,n="Root")=>{let r=O(e);if(!Object.keys(r).length)return"";let o=S(n),t=`import { DataTypes, Model } from 'sequelize';
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
  tableName: '${A(n)}s',
  timestamps: true
});
`,t}},Wr={generate:(e,n="Root")=>{let r=O(e);if(!Object.keys(r).length)return"";let o=S(n),t=`import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

`;t+=`@Entity('${A(n)}s')
`,t+=`export class ${o} {
`,r.id||(t+=`  @PrimaryGeneratedColumn('uuid')
  id!: string;

`);for(let[i,s]of Object.entries(r)){let a="string",l=null;s.type==="number"?(a="number",l="double"):s.type==="boolean"?(a="boolean",l="boolean"):s.type==="object"||s.type==="array"||s.type==="union"?(a="any",l="jsonb"):s.format==="datetime"&&(a="Date",l="timestamp");let c;if(s.enumValues&&s.enumValues.length){a=s.enumValues.map(p=>`'${p}'`).join(" | ");let m=["type: 'enum'",`enum: [${s.enumValues.map(p=>`'${p}'`).join(", ")}]`];s.nullable&&m.push("nullable: true"),c=`@Column({
    ${m.join(`,
    `)}
  })`}else if(s.nullable){let f=[];l&&f.push(`type: '${l}'`),f.push("nullable: true"),c=`@Column({ ${f.join(", ")} })`}else c=l?`@Column('${l}')`:"@Column()";t+=`  ${c}
  ${i}${s.optional?"?":"!"}: ${a}${s.nullable?" | null":""};

`}return!r.createdAt&&!r.created_at&&(t+=`  @CreateDateColumn()
  createdAt!: Date;

`),!r.updatedAt&&!r.updated_at&&(t+=`  @UpdateDateColumn()
  updatedAt!: Date;
`),t+=`}
`,t}},Jr={generate:(e,n="Root")=>{let r=O(e);if(!Object.keys(r).length)return"";let o=S(n),t=A(n),i=t.endsWith("s")?t:`${t}s`,s=new Set(["pgTable"]),a=[],l=[],c=[],f=!!r.id,u=!!r.createdAt||!!r.created_at,m=!!r.updatedAt||!!r.updated_at;f||(s.add("uuid"),l.push("  id: uuid('id').defaultRandom().primaryKey()"));for(let[y,g]of Object.entries(r)){let h=A(y),b=y.toLowerCase(),$=!g.optional&&!g.nullable?".notNull()":"",j="";if(y==="id"||b.endsWith("id"))y==="id"&&g.type==="number"?(s.add("serial"),j=`serial('${h}').primaryKey()`):y==="id"?(s.add("uuid"),j=`uuid('${h}').defaultRandom().primaryKey()`):g.type==="number"?(s.add("integer"),j=`integer('${h}')${$}`):(s.add("uuid"),j=`uuid('${h}')${$}`);else if(g.type==="boolean")s.add("boolean"),j=`boolean('${h}')${$}${$?b==="is_active"||b==="isactive"||b==="active"||b==="enabled"||b==="is_enabled"?".default(true)":".default(false)":""}`;else if(g.type==="number"){let k=["price","amount","cost","fee","total","subtotal","balance","payment"].some(z=>b.includes(z)),v=!k&&(g.format==="int"||["count","quantity","qty","age","year","month","day","hour","minute","second","port","rank","size","limit","offset"].some(z=>b.includes(z)));k?(s.add("numeric"),j=`numeric('${h}', { precision: 10, scale: 2 })${$}`):v?(s.add("integer"),j=`integer('${h}')${$}`):(s.add("real"),j=`real('${h}')${$}`)}else if(g.format==="datetime"||b.endsWith("_at")||b==="createdat"||b==="updatedat"||b.includes("timestamp")){s.add("timestamp");let k=b.includes("createdat")||b==="created_at"||b.includes("updatedat")||b==="updated_at"?".defaultNow()":"";j=`timestamp('${h}', { withTimezone: true })${k}${$}`}else if(g.type==="object"||g.type==="array"||g.type==="union")s.add("jsonb"),j=`jsonb('${h}')${$}`,c.push(y);else if(g.enumValues&&g.enumValues.length){s.add("pgEnum");let k=`${Be(y)}Enum`,v=`${t}_${h}`;a.push(`export const ${k} = pgEnum('${v}', [${g.enumValues.map(z=>`'${z}'`).join(", ")}]);`),j=`${k}('${h}')${$}`}else g.format==="uuid"||b==="uuid"?(s.add("uuid"),j=`uuid('${h}')${$}`):g.format==="email"||b.includes("email")?(s.add("varchar"),j=`varchar('${h}', { length: 255 })${$}.unique()`):g.format==="url"||["url","link","website","endpoint","href"].some(k=>b.includes(k))?(s.add("text"),j=`text('${h}')${$}`):["description","bio","content","body","text","note","summary","detail","about","message","comment","remark","excerpt","caption","overview"].some(k=>b.includes(k))?(s.add("text"),j=`text('${h}')${$}`):(s.add("varchar"),j=`varchar('${h}', { length: 255 })${$}`);l.push(`  ${y}: ${j}`)}u||(s.add("timestamp"),l.push("  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()")),m||(s.add("timestamp"),l.push("  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()"));let d=`import { ${["pgTable",...[...s].filter(y=>y==="pgEnum"),...[...s].filter(y=>y!=="pgTable"&&y!=="pgEnum").sort()].join(", ")} } from 'drizzle-orm/pg-core';
`;return a.length&&(d+=`
`+a.join(`
`)+`
`),d+=`
export const ${t} = pgTable('${i}', {
`,d+=l.join(`,
`)+`
`,d+=`});

`,d+=`export type ${o} = typeof ${t}.$inferSelect;
`,d+=`export type New${o} = typeof ${t}.$inferInsert;
`,c.length&&(d+=`
// Note: [${c.join(", ")}] stored as jsonb \u2014 consider extracting to separate tables with foreign key relations.
`),d}},Yr={generate:(e,n="Root")=>{let r=O(e);if(!Object.keys(r).length)return"";let o=S(n),t=[],i=[],s=(c,f)=>{if(f.type==="number")return"number";if(f.type==="boolean")return"boolean";if(f.format==="datetime")return"Date | string";if(f.type==="object"&&f.fields&&Object.keys(f.fields).length){let u=S(c),m=Object.entries(f.fields).map(([d,y])=>`  ${d}: ${s(d,y)};`).join(`
`);t.push(`export interface ${u} {
${m}
}`);let p=A(c).endsWith("s")?A(c):`${A(c)}s`;return i.push(`  ${p}: ${u};`),u}if(f.type==="array"&&f.itemType?.type==="object"&&f.itemType.fields){let u=S(c.replace(/s$/,"")),m=Object.entries(f.itemType.fields).map(([p,d])=>`  ${p}: ${s(p,d)};`).join(`
`);return t.push(`export interface ${u} {
${m}
}`),i.push(`  ${A(c)}: ${u};`),`${u}[]`}return"string"},a=`import { Generated, ColumnType } from 'kysely';

`,l="";r.id||(l+=`  id: Generated<string>;
`);for(let[c,f]of Object.entries(r)){let u=s(c,f),m=f.optional?`${u} | null`:u;l+=`  ${c}: ${m};
`}return!r.createdAt&&!r.created_at&&(l+=`  createdAt: Generated<string>;
`),!r.updatedAt&&!r.updated_at&&(l+=`  updatedAt: ColumnType<string, string | undefined, string>;
`),t.length&&(a+=t.join(`

`)+`

`),a+=`export interface ${o}Table {
${l}}

`,a+=`export interface Database {
`,a+=`  ${A(n)}s: ${o}Table;
`,i.length&&(a+=i.join(`
`)+`
`),a+=`}
`,a}},ze={generate:(e,n="root",r=new Set)=>{if(e=ue(e),e.type==="object"&&e.fields){if(r.has(n))return"";r.add(n);let o="";r.size===1&&(o+=`import * as yup from 'yup';

`),o+=`export const ${n}YupSchema = yup.object({
`;for(let[t,i]of Object.entries(e.fields)){let s=i.nullable?".nullable()":"",a=i.optional?"":".required()",l=n+S(t),c="";if(i.type==="object")c=`${l}YupSchema`;else if(i.type==="array"){let f=i.itemType,u;f?.type==="string"&&f.enumValues?u=`yup.string().oneOf([${f.enumValues.map(m=>`"${m}"`).join(", ")}])`:u=f?.type==="object"?`${l}ItemYupSchema`:`yup.${f?.type??"string"}()`,c=`yup.array().of(${u})`}else i.type==="union"&&i.unionTypes?c="yup.mixed()":i.type==="string"&&i.enumValues?c=`yup.string().oneOf([${i.enumValues.map(f=>`"${f}"`).join(", ")}])`:i.type==="string"?(c="yup.string()",i.format==="email"?c+=".email()":i.format==="url"?c+=".url()":i.format==="uuid"&&(c+=".uuid()")):c=i.type==="any"?"yup.mixed()":`yup.${i.type}()`;o+=`  ${t}: ${c}${s}${a},
`}o+=`});

`;for(let[t,i]of Object.entries(e.fields)){let s=n+S(t);i.type==="object"&&(o+=ze.generate(i,s,r)),i.type==="array"&&i.itemType?.type==="object"&&(o+=ze.generate(i.itemType,s+"Item",r))}return o}return""}},qe={generate:(e,n="root",r=new Set)=>{if(e=ue(e),e.type==="object"&&e.fields){if(r.has(n))return"";r.add(n);let o="";r.size===1&&(o+=`import Joi from 'joi';

`),o+=`export const ${n}JoiSchema = Joi.object({
`;for(let[t,i]of Object.entries(e.fields)){let s=i.nullable?".allow(null)":"",a=i.optional?"":".required()",l=n+S(t),c="";if(i.type==="object")c=`${l}JoiSchema`;else if(i.type==="array"){let f=i.itemType,u;f?.type==="string"&&f.enumValues?u=`Joi.string().valid(${f.enumValues.map(m=>`"${m}"`).join(", ")})`:u=f?.type==="object"?`${l}ItemJoiSchema`:`Joi.${f?.type??"string"}()`,c=`Joi.array().items(${u})`}else i.type==="union"&&i.unionTypes?c=`Joi.alternatives().try(${i.unionTypes.map(f=>`Joi.${f}()`).join(", ")})`:i.type==="string"&&i.enumValues?c=`Joi.string().valid(${i.enumValues.map(f=>`"${f}"`).join(", ")})`:i.type==="string"?(c="Joi.string()",i.format==="email"?c+=".email()":i.format==="url"?c+=".uri()":i.format==="uuid"&&(c+=".guid()")):c=`Joi.${i.type}()`;o+=`  ${t}: ${c}${s}${a},
`}o+=`});

`;for(let[t,i]of Object.entries(e.fields)){let s=n+S(t);i.type==="object"&&(o+=qe.generate(i,s,r)),i.type==="array"&&i.itemType?.type==="object"&&(o+=qe.generate(i.itemType,s+"Item",r))}return o}return""}},Ue={generate:(e,n="root",r=new Set)=>{if(e=ue(e),e.type==="object"&&e.fields){if(r.has(n))return"";r.add(n);let o="";r.size===1&&(o+=`import * as v from 'valibot';

`),o+=`export const ${n}ValiSchema = v.object({
`;for(let[t,i]of Object.entries(e.fields)){let s=n+S(t),a="";if(i.type==="object")a=`${s}ValiSchema`;else if(i.type==="array"){let l=i.itemType,c;l?.type==="string"&&l.enumValues?c=`v.picklist([${l.enumValues.map(f=>`"${f}"`).join(", ")}])`:c=l?.type==="object"?`${s}ItemValiSchema`:`v.${l?.type??"string"}()`,a=`v.array(${c})`}else i.type==="union"&&i.unionTypes?a=`v.union([${i.unionTypes.map(l=>`v.${l}()`).join(", ")}])`:i.type==="string"&&i.enumValues?a=`v.picklist([${i.enumValues.map(l=>`"${l}"`).join(", ")}])`:i.type==="string"?(a="v.string()",i.format==="email"?a="v.pipe(v.string(), v.email())":i.format==="url"?a="v.pipe(v.string(), v.url())":i.format==="uuid"&&(a="v.pipe(v.string(), v.uuid())")):a=`v.${i.type}()`;i.nullable&&(a=`v.nullable(${a})`),i.optional&&(a=`v.optional(${a})`),o+=`  ${t}: ${a},
`}o+=`});

`;for(let[t,i]of Object.entries(e.fields)){let s=n+S(t);i.type==="object"&&(o+=Ue.generate(i,s,r)),i.type==="array"&&i.itemType?.type==="object"&&(o+=Ue.generate(i.itemType,s+"Item",r))}return o}return""}},Pe={generate:(e,n="root",r=new Set)=>{if(e=ue(e),e.type==="object"&&e.fields){if(r.has(n))return"";r.add(n);let o="";r.size===1&&(o+=`import * as s from 'superstruct';

`),o+=`export const ${n}Struct = s.type({
`;for(let[t,i]of Object.entries(e.fields)){let s=n+S(t),a="";if(i.type==="object")a=`${s}Struct`;else if(i.type==="array"){let l=i.itemType,c;l?.type==="string"&&l.enumValues?c=`s.enums([${l.enumValues.map(f=>`"${f}"`).join(", ")}])`:c=l?.type==="object"?`${s}ItemStruct`:`s.${l?.type??"string"}()`,a=`s.array(${c})`}else i.type==="union"&&i.unionTypes?a=`s.union([${i.unionTypes.map(l=>`s.${l}()`).join(", ")}])`:i.type==="string"&&i.enumValues?a=`s.enums([${i.enumValues.map(l=>`"${l}"`).join(", ")}])`:a=`s.${i.type}()`;i.nullable&&(a=`s.nullable(${a})`),i.optional&&(a=`s.optional(${a})`),o+=`  ${t}: ${a},
`}o+=`});

`;for(let[t,i]of Object.entries(e.fields)){let s=n+S(t);i.type==="object"&&(o+=Pe.generate(i,s,r)),i.type==="array"&&i.itemType?.type==="object"&&(o+=Pe.generate(i.itemType,s+"Item",r))}return o}return""}},jn=e=>{if(e.type==="boolean")return"boolean";if(e.type==="number")return"number";if(e.type==="object")return"Record<string, unknown>";if(e.type==="array"){let n=e.itemType;return n?n.type==="string"?"string[]":n.type==="number"?"number[]":n.type==="boolean"?"boolean[]":"Record<string, unknown>[]":"unknown[]"}return"string"},Kr={generate:(e,n="Component")=>{let r=O(e);if(!Object.keys(r).length)return"";let o=S(n),t=`import React from 'react';

`;t+=`export interface ${o}Props {
`;for(let[i,s]of Object.entries(r))t+=`  ${i}${s.optional?"?":""}: ${jn(s)};
`;t+=`}

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
`,t}},Hr={generate:(e,n="State")=>{let r=O(e);if(!Object.keys(r).length)return"";let o=S(n),t=`import React, { createContext, useContext, useState, ReactNode } from 'react';

`;t+=`export interface ${o}State {
`;for(let[i,s]of Object.entries(r))t+=`  ${i}${s.optional?"?":""}: ${jn(s)};
`;return t+=`}

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
`,t}},Zr={generate:(e,n="User")=>{let r=O(e);if(!Object.keys(r).length)return"";let o=S(n),t=A(n),i=`import { createSlice, PayloadAction } from '@reduxjs/toolkit';

`;i+=`export interface ${o}State {
`;for(let[s,a]of Object.entries(r))i+=`  ${s}${a.optional?"?":""}: ${jn(a)};
`;i+=`}

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
`,i}},Qr={generate:(e,n="User")=>{let r=O(e);if(!Object.keys(r).length)return"";let o=S(n),t=A(n),i=a=>a.type==="number"?"number":a.type==="boolean"?"boolean":a.type==="array"?"any[]":a.type==="object"?"Record<string, any>":"string",s=`import { defineStore } from 'pinia';

`;s+=`export interface ${o}State {
`;for(let[a,l]of Object.entries(r))s+=`  ${a}: ${i(l)};
`;s+=`}

`,s+=`export const use${o}Store = defineStore('${t}', {
`,s+=`  state: (): ${o}State => ({
`;for(let[a,l]of Object.entries(r)){let c="''";l.type==="number"?c="0":l.type==="boolean"?c="false":l.type==="object"?c="{}":l.type==="array"&&(c="[]"),s+=`    ${a}: ${c},
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
`,s}},Xr={generate:(e,n="Component")=>{let r=O(e);if(!Object.keys(r).length)return"";let o=`<script setup lang="ts">
`;o+=`defineProps<{
`;for(let[t,i]of Object.entries(r)){let s="string";i.type==="number"?s="number":i.type==="boolean"?s="boolean":i.type==="object"?s="Record<string, any>":i.type==="array"&&(s="any[]"),o+=`  ${t}${i.optional?"?":""}: ${s};
`}o+=`}>();
`,o+=`</script>

`,o+=`<template>
  <div class="vue-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
`,o+=`    <h2 class="text-xl font-bold mb-2">${S(n)}</h2>
`,o+=`    <ul class="text-sm space-y-1">
`;for(let t of Object.keys(r))o+=`      <li><strong>${t}:</strong> {{ ${t} }}</li>
`;return o+=`    </ul>
  </div>
</template>
`,o}},ei={generate:(e,n="Component")=>{let r=O(e);if(!Object.keys(r).length)return"";let o=i=>i==="number"?"0":i==="boolean"?"false":i==="Record<string, any>"?"{}":i==="any[]"?"[]":"''",t=`<script lang="ts">
`;for(let[i,s]of Object.entries(r)){let a="string";s.type==="number"?a="number":s.type==="boolean"?a="boolean":s.type==="object"?a="Record<string, any>":s.type==="array"&&(a="any[]");let l=s.optional?`${a} | undefined = undefined`:`${a} = ${o(a)}`;t+=`  export let ${i}: ${l};
`}t+=`</script>

`,t+=`<div class="svelte-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
`,t+=`  <h2 class="text-xl font-bold mb-2">${S(n)}</h2>
`,t+=`  <ul class="text-sm space-y-1">
`;for(let i of Object.keys(r))t+=`    <li><strong>${i}:</strong> {${i}}</li>
`;return t+=`  </ul>
</div>
`,t}},ni={generate:(e,n="Component")=>{let r=O(e);if(!Object.keys(r).length)return"";let o=S(n),t=`import { Component } from 'solid-js';

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
`,t}},ti={generate:(e,n="Data")=>{let r=O(e);if(!Object.keys(r).length)return"";let o=S(n),t=`// Generated by TypeMorph (requires ArduinoJson library)
`;t+=`#include <ArduinoJson.h>

`,t+=`struct ${o} {
`;for(let[i,s]of Object.entries(r)){let a="String";s.type==="number"?a="double":s.type==="boolean"&&(a="bool"),t+=`  ${a} ${i};
`}t+=`};

`,t+=`void deserialize${o}(Stream& stream, ${o}& data) {
`,t+=`  StaticJsonDocument<1024> doc;
`,t+=`  deserializeJson(doc, stream);

`;for(let i of Object.keys(r))t+=`  data.${i} = doc["${i}"];
`;return t+=`}
`,t}},ri={generate:(e,n="RECORD")=>{let r=O(e);if(!Object.keys(r).length)return"";let o=ce(n).substring(0,20),t=`      * Generated by TypeMorph \u2014 COBOL Copybook
`;t+=`       01  ${o}.
`;for(let[i,s]of Object.entries(r)){let a=ce(i).substring(0,20);if(s.type==="object"&&s.fields){t+=`           05  ${a.padEnd(20)}.
`;for(let[l,c]of Object.entries(s.fields)){let f=ce(l).substring(0,20),u=c.type==="number"?"9(9)V99":c.type==="boolean"?"9(1)":"X(255)";t+=`               10  ${f.padEnd(20)} PIC ${u}.
`}}else if(s.type==="array"){let l=s.itemType?.type==="number"?"9(9)V99":"X(255)";t+=`           05  ${a.padEnd(20)} OCCURS 10 TIMES PIC ${l}.
`}else{let l="X(255)";s.type==="number"?l="9(9)V99":s.type==="boolean"&&(l="9(1)"),t+=`           05  ${a.padEnd(20)} PIC ${l}.
`}}return t}},ii={generate:(e,n="data")=>{let r=O(e);if(!Object.keys(r).length)return"";let t=`(ns com.example.${A(n)}-spec
  (:require [clojure.spec.alpha :as s]))

`,i=[];for(let[a,l]of Object.entries(r)){let c=`::${A(a)}`;i.push(c);let f="string?";if(l.type==="number")f="number?";else if(l.type==="boolean")f="boolean?";else if(l.type==="array")f="(s/coll-of any?)";else if(l.type==="object"&&l.fields){let u=Object.keys(l.fields).map(m=>`::${A(m)}`);for(let[m,p]of Object.entries(l.fields)){let d=p.type==="number"?"number?":p.type==="boolean"?"boolean?":"string?";t+=`(s/def ::${A(m)} ${d})
`}f=`(s/keys :req [${u.join(" ")}])`}t+=`(s/def ${c} ${f})
`}let s=i.join(" ");return t+=`
(s/def ::${A(n)} (s/keys :req [${s}]))
`,t}},si={generate:(e,n="Data")=>{let r=O(e);if(!Object.keys(r).length)return"";let t=`defmodule MyApp.${S(n)} do
  use Ecto.Schema
  import Ecto.Changeset

`;t+=`  schema "${A(n)}s" do
`;for(let[s,a]of Object.entries(r)){let l=":string";a.type==="number"?l=":float":a.type==="boolean"?l=":boolean":a.type==="object"||a.type==="array"?l=":map":a.format==="datetime"&&(l=":utc_datetime"),t+=`    field :${A(s)}, ${l}
`}t+=`    timestamps()
  end

`;let i=Object.entries(r).filter(([,s])=>!s.optional).map(([s])=>`:${A(s)}`);return t+=`  def changeset(struct, params \\\\ %{}) do
`,t+=`    struct
`,t+=`    |> cast(params, [${Object.keys(r).map(s=>`:${A(s)}`).join(", ")}])
`,i.length&&(t+=`    |> validate_required([${i.join(", ")}])
`),t+=`  end
end
`,t}},oi={generate:(e,n="Model")=>{let r=O(e);if(!Object.keys(r).length)return"";let o=S(n),t=`module MyApp.${o} exposing (..)

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
`}return t}},ai={generate:(e,n="Data")=>{let r=O(e);if(!Object.keys(r).length)return"";let o=`# Generated by TypeMorph \u2014 GDScript
class_name ${S(n)}

`;for(let[t,i]of Object.entries(r)){let s="String",a='""';i.type==="number"?(s="float",a="0.0"):i.type==="boolean"?(s="bool",a="false"):i.type==="object"?(s="Dictionary",a="{}"):i.type==="array"&&(s="Array",a="[]"),o+=`var ${A(t)}: ${s} = ${a}
`}o+=`
static func from_dict(dict: Dictionary) -> ${S(n)}:
`,o+=`  var instance = ${S(n)}.new()
`;for(let t of Object.keys(r)){let i=A(t);o+=`  if dict.has("${t}"):
    instance.${i} = dict["${t}"]
`}return o+=`  return instance
`,o}},li={generate:(e,n="Root")=>{let r=O(e);if(!Object.keys(r).length)return"";let o=S(n),t=`{-# LANGUAGE DeriveGeneric #-}
module MyApp.${o} where

import GHC.Generics (Generic)
import Data.Aeson (FromJSON, ToJSON)

`;t+=`data ${o} = ${o}
  { `;let i=Object.entries(r).map(([s,a])=>{let l="String";return a.type==="number"?l=a.format==="int"?"Int":"Double":a.type==="boolean"&&(l="Bool"),(a.optional||a.nullable)&&(l=`Maybe ${l}`),`${Be(s)} :: ${l}`});return t+=i.join(`
  , `)+`
  } deriving (Show, Generic)

`,t+=`instance FromJSON ${o}
instance ToJSON ${o}
`,t}},ci={generate:(e,n="df")=>{let r=O(e);if(!Object.keys(r).length)return"";let o=A(n),t=`# Generated by TypeMorph
`;t+=`${o} <- data.frame(
`;let i=Object.entries(r).map(([s,a])=>{let l='"sample_value"';return a.type==="number"?l="0.0":a.type==="boolean"?l="TRUE":a.type==="object"||a.type==="array"?l="list()":a.format==="email"?l='"user@example.com"':a.format==="datetime"&&(l='as.POSIXct("2024-01-01")'),`  ${A(s)} = c(${l})`});return t+=i.join(`,
`)+`,
  stringsAsFactors = FALSE
)
`,t}},ui={generate:(e,n="Root")=>{let r=O(e);if(!Object.keys(r).length)return"";let o=S(n),t=`// Generated by TypeMorph
`;t+=`case class ${o}(
`;let i=Object.entries(r).map(([s,a])=>{let l="String";return a.type==="number"?l="Double":a.type==="boolean"?l="Boolean":a.type==="object"?l="Map[String, Any]":a.type==="array"&&(l="List[Any]"),a.optional&&(l=`Option[${l}]`),`  ${s}: ${l}`});return t+=i.join(`,
`)+`
)
`,t}},fi={generate:(e,n="Record")=>{let r=O(e);if(!Object.keys(r).length)return"";let o=[],t="";for(let[s,a]of Object.entries(r)){let l="string";if(a.type==="number")l="uint256";else if(a.type==="boolean")l="bool";else if(a.type==="array")l=`${a.itemType?.type==="number"?"uint256":a.itemType?.type==="boolean"?"bool":"string"}[]`;else if(a.type==="object"&&a.fields){let c=S(s),f=`    struct ${c} {
`;for(let[u,m]of Object.entries(a.fields)){let p=m.type==="number"?"uint256":m.type==="boolean"?"bool":"string";f+=`        ${p} ${u};
`}f+="    }",o.push(f),l=c}t+=`        ${l} ${s};
`}let i=`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

`;i+=`contract ${S(n)}Store {
`;for(let s of o)i+=s+`

`;return i+=`    struct ${S(n)} {
`,i+=`        uint256 id;
`,i+=t,i+=`    }
`,i+=`}
`,i}},pi={generate:(e,n="Post")=>{let r=O(e);if(!Object.keys(r).length)return"";let o=S(n),t=`from django.db import models
from rest_framework import serializers

`;t+=`class ${o}(models.Model):
`;for(let[i,s]of Object.entries(r)){let a=A(i),l=s.optional?"null=True, blank=True":"",c;s.type==="number"?s.format==="int"?c=s.optional?"models.IntegerField(null=True, blank=True)":"models.IntegerField()":c=s.optional?"models.FloatField(null=True, blank=True)":"models.FloatField()":s.type==="boolean"?c=s.optional?"models.BooleanField(null=True, blank=True)":"models.BooleanField(default=False)":s.type==="object"||s.type==="array"?c=s.optional?"models.JSONField(null=True, blank=True)":"models.JSONField()":s.format==="datetime"?c=s.optional?"models.DateTimeField(null=True, blank=True)":"models.DateTimeField()":s.format==="date"?c=s.optional?"models.DateField(null=True, blank=True)":"models.DateField()":s.format==="email"?c=s.optional?"models.EmailField(null=True, blank=True)":"models.EmailField()":s.format==="url"?c=s.optional?"models.URLField(null=True, blank=True)":"models.URLField()":s.format==="uuid"?c=s.optional?"models.UUIDField(null=True, blank=True)":"models.UUIDField()":c=`models.CharField(max_length=255${l?`, ${l}`:""})`,t+=`    ${a} = ${c}
`}return t+=`

class ${o}Serializer(serializers.ModelSerializer):
`,t+=`    class Meta:
`,t+=`        model = ${o}
`,t+=`        fields = '__all__'
`,t}},mi={generate:(e,n="User")=>{let r=O(e);if(!Object.keys(r).length)return"";let t=`class ${`Create${S(n)}s`} < ActiveRecord::Migration[7.0]
  def change
`;t+=`    create_table :${A(n)}s do |t|
`;for(let[i,s]of Object.entries(r)){if(i.toLowerCase()==="id")continue;let a="string";s.type==="number"?a=s.format==="int"?"integer":"decimal":s.type==="boolean"?a="boolean":s.type==="object"||s.type==="array"?a="jsonb":s.format==="datetime"&&(a="datetime");let l=s.optional?", null: true":", null: false";t+=`      t.${a} :${A(i)}${l}
`}return t+=`      t.timestamps
    end
  end
end
`,t}},di={generate:(e,n="Root")=>{let r=S(n),o=A(n),t=O(e),i=Object.keys(t),s=(l,c)=>{let f=l.toLowerCase();if(c.type==="number"){let p="z.number()";return f.includes("age")?p+=".int().min(0).max(150)":f.includes("year")?p+=".int().min(1900).max(2100)":f.includes("month")&&!f.includes("monthly")?p+=".int().min(1).max(12)":f==="day"||f.endsWith("_day")||f.startsWith("day_")?p+=".int().min(1).max(31)":f.includes("count")||f.includes("quantity")?p+=".int().min(0)":["price","amount","cost","fee","rank"].some(d=>f.includes(d))&&(p+=".min(0)"),p}if(c.type==="boolean")return"z.boolean()";if(c.type==="object"||c.type==="array"||c.type==="union")return"z.any()";if(c.format==="email"||f.includes("email"))return"z.email()";if(c.format==="uuid"||l.endsWith("_id")||/Id$/.test(l)||/ID$/.test(l))return"z.uuid()";if(c.format==="url"||f.includes("url")||f.includes("link")||f.includes("website"))return"z.url()";if(c.format==="datetime")return"z.iso.datetime()";if(f.includes("password")||f.includes("passwd"))return"z.string().min(8)";if(f.includes("slug"))return"z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)";if(f.includes("phone")||f.includes("tel"))return"z.string().regex(/^\\+?[\\d\\s\\-\\.\\(\\)]{7,15}$/)";let u=["description","note","bio","comment","content","body","text","message","summary"].some(p=>f.includes(p));return f.includes("name")||f.includes("label")||f.includes("title")?c.optional?"z.string().trim()":"z.string().min(1).trim()":!c.optional&&!u?"z.string().min(1)":"z.string()"},a=JSON.stringify(Object.fromEntries(i.map(l=>{let c=t[l];return c.type==="number"?[l,0]:c.type==="boolean"?[l,!1]:[l,"sample"]})),null,6).replace(/^/gm,"    ");return`import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Generated by TypeMorph \u2014 Next.js App Router API Route
// Route: /api/${o}s

const ${r}Schema = z.object({
${i.map(l=>{let c=t[l];return`  ${l}: ${s(l,c)}${c.optional?".optional()":""}`}).join(`,
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
`}},yi={generate:(e,n="Root")=>{let r=S(n),o=n.charAt(0).toLowerCase()+n.slice(1),t=A(n),i=O(e),s=Object.keys(i);return`import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
`}};var gi={generate:(e,n="Root")=>{let r=O(e);if(!Object.keys(r).length)return"";let o=S(n),t=[],i=(c,f,u)=>c.type==="number"?{base:c.format==="int"?"int32_t":"double",ptr:!1}:c.type==="boolean"?{base:"bool",ptr:!1}:c.type==="object"?{base:S(u+"_"+f),ptr:!1}:{base:"char",ptr:!0},s=(c,f)=>{let u=`typedef struct {
`;for(let[m,p]of Object.entries(c))if(p.type==="object"&&p.fields){let d=S(f+"_"+m);t.push(s(p.fields,d)),u+=`  ${d} ${m};
`}else if(p.type==="array"){let d=p.itemType,y="char",g=!0;if(d?.type==="number")y=d.format==="int"?"int32_t":"double",g=!1;else if(d?.type==="boolean")y="bool",g=!1;else if(d?.type==="object"&&d.fields){let b=S(f+"_"+m+"Item");t.push(s(d.fields,b)),y=b,g=!1}u+=`  ${y} ${g?"**":"*"}${m};
`,u+=`  int ${m}_count;
`}else{let{base:d,ptr:y}=i(p,m,f),g=y?`*${m}`:m,h=p.optional||p.nullable?" /* nullable */":"";u+=`  ${d} ${g};${h}
`}return u+=`} ${f};`,u},a=s(r,o),l=`#include <stdbool.h>
#include <stdint.h>
#include <stdlib.h>
`;l+=`/* cJSON \u2014 single-header JSON parser: https://github.com/DaveGamble/cJSON */
`,l+=`#include "cJSON.h"

`;for(let c of t)l+=c+`

`;l+=a+`

`,l+=`${o} ${A(n)}_from_json(const char *json_str) {
`,l+=`  ${o} result = {0};
`,l+=`  cJSON *root = cJSON_Parse(json_str);
`,l+=`  if (!root) return result;

`;for(let[c,f]of Object.entries(r))if(l+=`  cJSON *_${c} = cJSON_GetObjectItemCaseSensitive(root, "${c}");
`,f.type==="number"){let u=f.format==="int"?"(int32_t)":"";l+=`  if (cJSON_IsNumber(_${c})) result.${c} = ${u}_${c}->valuedouble;
`}else f.type==="boolean"?l+=`  if (cJSON_IsBool(_${c})) result.${c} = cJSON_IsTrue(_${c});
`:f.type==="array"?l+=`  if (cJSON_IsArray(_${c})) result.${c}_count = cJSON_GetArraySize(_${c});
`:f.type==="object"?l+=`  /* TODO: parse nested ${c} struct */
`:l+=`  if (cJSON_IsString(_${c})) result.${c} = _${c}->valuestring;
`;return l+=`
  cJSON_Delete(root);
  return result;
}
`,l}},hi={generate:(e,n="Root")=>{let r=O(e);if(!Object.keys(r).length)return"";let o=S(n),t=[],i=Object.values(r).some(u=>u.optional||u.nullable),s=Object.values(r).some(u=>u.type==="array"),a=(u,m,p)=>{if(u.type==="number")return u.format==="int"?"int64_t":"double";if(u.type==="boolean")return"bool";if(u.type==="object")return S(p+m.charAt(0).toUpperCase()+m.slice(1));if(u.type==="array"){let d=u.itemType,y="std::string";return d?.type==="number"?y=d.format==="int"?"int64_t":"double":d?.type==="boolean"?y="bool":d?.type==="object"&&(y=S(p+m.charAt(0).toUpperCase()+m.slice(1)+"Item")),`std::vector<${y}>`}return"std::string"},l=(u,m)=>{for(let[d,y]of Object.entries(u))if(y.type==="object"&&y.fields){let g=S(m+d.charAt(0).toUpperCase()+d.slice(1));t.push(l(y.fields,g))}else if(y.type==="array"&&y.itemType?.type==="object"&&y.itemType.fields){let g=S(m+d.charAt(0).toUpperCase()+d.slice(1)+"Item");t.push(l(y.itemType.fields,g))}let p=`struct ${m} {
`;for(let[d,y]of Object.entries(u)){let g=a(y,d,m);(y.optional||y.nullable)&&(g=`std::optional<${g}>`),p+=`  ${g} ${d};
`}p+=`
`,p+=`  static ${m} from_json(const nlohmann::json& j) {
`,p+=`    ${m} obj;
`;for(let[d,y]of Object.entries(u)){let g=a(y,d,m);y.optional||y.nullable?(p+=`    if (j.contains("${d}") && !j["${d}"].is_null())
`,p+=`      obj.${d} = j["${d}"].get<${g}>();
`):y.type==="object"?p+=`    if (j.contains("${d}")) obj.${d} = ${g}::from_json(j["${d}"]);
`:p+=`    obj.${d} = j.at("${d}").get<${g}>();
`}p+=`    return obj;
  }

`,p+=`  nlohmann::json to_json() const {
    return {
`;for(let[d,y]of Object.entries(u))y.optional||y.nullable?p+=`      {"${d}", ${d}.has_value() ? nlohmann::json(*${d}) : nlohmann::json(nullptr)},
`:y.type==="object"?p+=`      {"${d}", ${d}.to_json()},
`:p+=`      {"${d}", ${d}},
`;return p+=`    };
  }
};
`,p},c=l(r,o),f=`#include <string>
`;s&&(f+=`#include <vector>
`),i&&(f+=`#include <optional>
`),f+=`#include <cstdint>
`,f+=`/* nlohmann/json \u2014 header-only JSON: https://github.com/nlohmann/json */
`,f+=`#include <nlohmann/json.hpp>

`;for(let u of t)f+=u+`
`;return f+=c,f}},Te=(e,n)=>{let r=e.toLowerCase();return n.format==="email"||r.includes("email")?"Email address":n.format==="uuid"?"Unique identifier (UUID)":n.format==="url"||r.includes("url")||r.includes("link")?"URL":n.format==="datetime"?"ISO 8601 datetime string":r.endsWith("id")||r.endsWith("_id")?"Unique identifier":r.includes("password")||r.includes("passwd")?"Password (min 8 characters)":r==="phone"||r==="tel"||r==="telephone"?"Phone number":r.includes("count")||r.includes("quantity")||r==="qty"?"Count or quantity (non-negative)":["price","amount","cost","fee","total","subtotal","balance"].some(o=>r.includes(o))?"Monetary amount (non-negative)":r.includes("score")||r.includes("rating")?"Score or rating (0\u2013100)":r==="age"||r.endsWith("_age")?"Age in years (0\u2013150)":r==="port"||r.endsWith("_port")||r==="port_number"?"Network port (1\u201365535)":n.type==="boolean"?`Whether ${e.replace(/^(is|has|can|should)/i,"").replace(/([A-Z])/g," $1").trim().toLowerCase()||e} is true`:e.replace(/([A-Z])/g," $1").replace(/_/g," ").trim()},Ve=(e,n,r="    ")=>{let o=e.toLowerCase(),t=n.optional||n.nullable?".optional()":"";if(n.type==="boolean")return`z.boolean()${t}`;if(n.type==="number"){let i="z.number()";n.format==="int"&&(i+=".int()");let s=["price","amount","cost","fee","total","subtotal","balance"].some(a=>o.includes(a));return(n.format==="int"&&(o.includes("count")||o.includes("quantity")||o==="qty")||s)&&(i+=".min(0)"),`${i}${t}`}if(n.type==="array"){let i=n.itemType,s="z.unknown()";if(i){if(i.type==="string")s="z.string()";else if(i.type==="number")s=i.format==="int"?"z.number().int()":"z.number()";else if(i.type==="boolean")s="z.boolean()";else if(i.type==="object"&&i.fields){let a=r+"  ";s=`z.object({
${Object.entries(i.fields).map(([c,f])=>`${a}  ${c}: ${Ve(c,f,a+"  ")}.describe('${Te(c,f)}'),`).join(`
`)}
${a}})`}}return`z.array(${s})${t}`}if(n.type==="object"&&n.fields){let i=r+"  ";return`z.object({
${Object.entries(n.fields).map(([a,l])=>`${i}${a}: ${Ve(a,l,i)}.describe('${Te(a,l)}'),`).join(`
`)}
${r}})${t}`}return n.type==="union"&&n.enumValues?.length?`z.enum([${n.enumValues.map(s=>`"${s}"`).join(", ")}])${t}`:n.format==="email"||o.includes("email")?`z.email()${t}`:n.format==="uuid"||/Id$/.test(e)||/ID$/.test(e)||o.endsWith("_id")?`z.uuid()${t}`:n.format==="url"||o.includes("url")||o.includes("link")?`z.url()${t}`:n.format==="datetime"?`z.iso.datetime()${t}`:o.includes("password")||o.includes("passwd")?`z.string().min(8)${t}`:`z.string()${t}`},bi={generate:(e,n="Root")=>{let r=Be(n),o=O(e),t=Object.keys(o),i=t.map(a=>`    ${a}: ${Ve(a,o[a],"    ")}.describe('${Te(a,o[a])}'),`).join(`
`),s=t.join(", ");return`import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const server = new McpServer({ name: "my-server", version: "1.0.0" });

server.tool(
  "${r}",
  "Auto-generated MCP tool \u2014 replace with a meaningful description",
  {
${i}
  },
  async ({ ${s} }) => ({
    content: [{ type: "text", text: JSON.stringify({ ${s} }) }]
  })
);

export { server };`}},$i={generate:(e,n="Root")=>{let o=ue(e).fields??{},t=A(n),i=(l,c)=>{let f=l.toLowerCase(),u=Te(l,c);if(c.type==="object"&&c.fields){let p={},d=[];for(let[g,h]of Object.entries(c.fields))p[g]=i(g,h),!h.optional&&!h.nullable&&d.push(g);let y={type:"object",description:u,properties:p};return d.length&&(y.required=d),y}if(c.type==="array"){let p=c.itemType,d={type:"string"};if(p){if(p.type==="number")d={type:p.format==="int"?"integer":"number"};else if(p.type==="boolean")d={type:"boolean"};else if(p.type==="object"&&p.fields){let y={},g=[];for(let[h,b]of Object.entries(p.fields))y[h]=i(h,b),!b.optional&&!b.nullable&&g.push(h);d={type:"object",properties:y},g.length&&(d.required=g)}}return{type:"array",description:u,items:d}}if(c.type==="union"&&c.enumValues?.length)return{type:"string",description:u,enum:c.enumValues};if(c.type==="boolean")return{type:"boolean",description:u};if(c.type==="number"){let p={description:u};p.type=c.format==="int"?"integer":"number";let d=["price","amount","cost","fee","total","subtotal","balance","payment"].some(y=>f.includes(y));return c.format==="int"&&(f.includes("count")||f.includes("quantity")||f==="qty")&&(p.minimum=0),d&&(p.minimum=0),(f.includes("score")||f.includes("rating"))&&(p.minimum=0,p.maximum=100),(f==="age"||f.endsWith("_age"))&&(p.minimum=0,p.maximum=150),(f==="port"||f.endsWith("_port")||f==="port_number")&&(p.minimum=1,p.maximum=65535),p}let m={type:"string",description:u};return c.format==="email"||f.includes("email")?m.format="email":c.format==="uuid"||/Id$/.test(l)||/ID$/.test(l)||f.endsWith("_id")?m.format="uuid":c.format==="url"||f.includes("url")||f.includes("link")?m.format="uri":c.format==="datetime"?m.format="date-time":(f.includes("password")||f.includes("passwd"))&&(m.minLength=8),m},s={},a=[];for(let[l,c]of Object.entries(o))s[l]=i(l,c),!c.optional&&!c.nullable&&a.push(l);return JSON.stringify({type:"function",function:{name:t,description:`Processes ${n} data \u2014 update with a meaningful description`,parameters:{type:"object",properties:s,required:a}}},null,2)}},Si={generate:(e,n="Root")=>{let r=Be(n),o=O(e),i=Object.keys(o).map(s=>`    ${s}: ${Ve(s,o[s],"    ")}.describe('${Te(s,o[s])}'),`).join(`
`);return`import { tool } from "ai";
import { z } from "zod";

export const ${r}Tool = tool({
  description: "Auto-generated from JSON sample \u2014 update with a meaningful description",
  parameters: z.object({
${i}
  }),
  execute: async (params) => {
    // implement your logic here
    return params;
  },
});`}};var ji=require("crypto");var On=e=>{try{let n=$e.load(e);if(n==null)return{};if(typeof n!="object"||Array.isArray(n))return{value:n};let r=n;return"_parseError"in r?{}:r}catch{return null}};function ha(e,n){typeof window>"u"||typeof window.gtag!="function"||window.gtag("event",e,n)}function Ti(e,n){ha("infer_unsupported_output",{target:e,requested:n})}function We(e){if(typeof e!="object"||e===null||Array.isArray(e))return!1;let n=e,r=String(n.openapi??""),o=String(n.swagger??""),t=n.openapi!==void 0&&r.startsWith("3"),i=n.swagger!==void 0&&o.startsWith("2");return(t||i)&&!!(n.info||n.paths||n.components||n.definitions)}function Je(e){let r=typeof e.openapi=="string"||typeof e.openapi=="number"?e.components?.schemas??{}:e.definitions??{},o=new Set;function t(l){if(!l.startsWith("#/"))return null;let c=l.slice(2).split("/"),f=e;for(let u of c){if(f==null)return null;f=f[u.replace(/~1/g,"/").replace(/~0/g,"~")]}return f??null}function i(l){return l.split("/").pop()??""}function s(l,c=0,f=!1){if(c>20||!l||typeof l!="object")return{type:"any"};if(typeof l.$ref=="string"){let p=i(l.$ref);if(!f&&r[p]!==void 0)return{type:"object",_sharedTypeName:p};if(o.has(p))return{type:"any"};let d=t(l.$ref);return d?s(d,c+1,f):{type:"any"}}if(Array.isArray(l.allOf)){let p={type:"object",fields:{}};for(let d of l.allOf){let y=s(d,c+1,!0);y.type==="object"&&y.fields&&Object.assign(p.fields,y.fields)}return p}if(Array.isArray(l.anyOf)||Array.isArray(l.oneOf)){let p=(l.anyOf??l.oneOf).map(y=>s(y,c+1)),d=[...new Set(p.map(y=>y.type))];return d.length===1?p[0]:{type:"union",unionTypes:d}}let u=typeof l.type=="string"?l.type:"",m=Array.isArray(l.required)?l.required:[];if(u==="object"||!u&&l.properties){let p={};for(let[d,y]of Object.entries(l.properties??{})){let g=s(y,c+1);m.includes(d)||(g.optional=!0),y.nullable===!0&&(g.nullable=!0),p[d]=g}return{type:"object",fields:p}}if(u==="array")return{type:"array",itemType:l.items?s(l.items,c+1):{type:"any"}};if(u==="string"){let p={type:"string"};Array.isArray(l.enum)&&(p.enumValues=l.enum.map(String));let d=l.format??"";return d==="date-time"?p.format="datetime":d==="date"?p.format="date":d==="email"?p.format="email":d==="uri"||d==="url"?p.format="url":d==="uuid"&&(p.format="uuid"),p}if(u==="integer")return{type:"number",format:"int"};if(u==="number"){let p={type:"number"};return(l.format==="float"||l.format==="double")&&(p.format="float"),p}return u==="boolean"?{type:"boolean"}:{type:"any"}}let a=[];for(let[l,c]of Object.entries(r)){o.add(l);let f=s(c);o.delete(l),f._isTypeMorphSchema=!0,a.push({name:l,schema:f})}return a}function Ye(e){if(typeof e!="object"||e===null||Array.isArray(e))return!1;let r=String(e.$schema??"");return r.includes("json-schema.org")||/^https?:\/\/.*\/schema/.test(r)}function Ke(e){let n=e.$defs??e.definitions??{};function r(a){if(!a.startsWith("#/"))return null;let l=a.slice(2).split("/"),c=e;for(let f of l){if(c==null)return null;c=c[f.replace(/~1/g,"/").replace(/~0/g,"~")]}return c??null}function o(a){return a.split("/").pop()??""}function t(a,l=0,c=!1){if(l>20||!a||typeof a!="object")return{type:"any"};if(typeof a.$ref=="string"){let d=o(a.$ref);if(!c&&n[d]!==void 0)return{type:"object",_sharedTypeName:d};let y=r(a.$ref);return y?t(y,l+1,c):{type:"any"}}if(Array.isArray(a.allOf)){let d={type:"object",fields:{}};for(let y of a.allOf){let g=t(y,l+1,!0);g.type==="object"&&g.fields&&Object.assign(d.fields,g.fields)}if(a.properties){let y=Array.isArray(a.required)?a.required:[];for(let[g,h]of Object.entries(a.properties)){let b=t(h,l+1);y.includes(g)||(b.optional=!0),d.fields[g]=b}}return d}if(Array.isArray(a.anyOf)||Array.isArray(a.oneOf)){let d=a.anyOf??a.oneOf,y=d.filter($=>$.type!=="null"&&!(typeof $.$ref=="string"&&$.$ref==="#"));if(y.length===1){let $=t(y[0],l+1,c);return y.length<d.length&&($.nullable=!0),$}let g=y.map($=>t($,l+1)),h=[...new Set(g.map($=>$.type))],b=h.length===1?g[0]:{type:"union",unionTypes:h};return y.length<d.length&&(b.nullable=!0),b}let f=a.type,u=!1;if(Array.isArray(f)){let d=f.filter(y=>y!=="null");u=d.length<f.length,f=d[0]??"any"}let m=typeof f=="string"?f:"",p=Array.isArray(a.required)?a.required:[];if(a.const!==void 0){let d=typeof a.const;if(d==="string")return{type:"string",enumValues:[String(a.const)]};if(d==="number")return{type:"number"};if(d==="boolean")return{type:"boolean"}}if(Array.isArray(a.enum)){let d=a.enum.filter(g=>g!==null),y={type:"string",enumValues:d.map(String)};return d.length<a.enum.length&&(y.nullable=!0),y}if(m==="object"||!m&&a.properties){let d={};for(let[g,h]of Object.entries(a.properties??{})){let b=t(h,l+1);p.includes(g)||(b.optional=!0),d[g]=b}let y={type:"object",fields:d};return u&&(y.nullable=!0),y}if(m==="array"){let d=Array.isArray(a.items)?a.items[0]:a.items,g={type:"array",itemType:d?t(d,l+1):{type:"any"}};return u&&(g.nullable=!0),g}if(m==="string"){let d={type:"string"},y=a.format??"";return y==="date-time"?d.format="datetime":y==="date"?d.format="date":y==="email"?d.format="email":y==="uri"||y==="url"?d.format="url":y==="uuid"&&(d.format="uuid"),u&&(d.nullable=!0),d}return m==="integer"?{type:"number",format:"int",...u?{nullable:u}:{}}:m==="number"?{type:"number",...u?{nullable:u}:{}}:m==="boolean"?{type:"boolean",...u?{nullable:u}:{}}:{type:"any"}}let i=[];for(let[a,l]of Object.entries(n)){let c=t(l);c._isTypeMorphSchema=!0,i.push({name:a,schema:c})}if(e.type||e.properties||e.allOf||e.anyOf||e.oneOf||e.items){let a=e.title??"Root";if(!i.find(l=>l.name===a)){let l=t(e);l._isTypeMorphSchema=!0,i.unshift({name:a,schema:l})}}return i}function ba(e){return e.replace(/(^\w|_\w)/g,n=>n.replace(/_/,"").toUpperCase())}function xi(e){return e.type!=="object"||!e.fields?null:Object.keys(e.fields).sort()}function $a(e,n){if(e.length===0&&n.length===0)return 1;let r=new Set(e),o=n.filter(i=>r.has(i)).length,t=new Set([...e,...n]).size;return t===0?0:o/t}function Ai(e,n){let r=ba(n),[o,t]=e.type==="array"&&e.itemType?.type==="object"?[e.itemType,`${r}Item`]:e.type==="object"?[e,r]:[null,""];if(!o||o.type!=="object"||!o.fields)return;let i=xi(o);if(!i||i.length<2)return;let s=i;function a(l,c){if(!(c>20||!l)&&!(l._sharedTypeName||l._isTypeMorphSchema))if(l.type==="object"&&l.fields&&l!==o){let f=xi(l);if(f&&f.length>=1&&$a(s,f)>=.65){l._sharedTypeName=t,delete l.fields;return}for(let u of Object.values(l.fields))a(u,c+1)}else l.type==="array"&&l.itemType&&a(l.itemType,c+1)}for(let l of Object.values(o.fields))a(l,1)}var Nn=new Set(["string","number","boolean"]),kn=(e,n)=>{let r=e.type==="union"?e.unionTypes??[]:[e.type],o=n.type==="union"?n.unionTypes??[]:[n.type],t=Array.from(new Set([...r,...o]));return t.length===1?{type:t[0]}:{type:"union",unionTypes:t}},Oi=20,xe=(e,n,r=0)=>{if(r>Oi)return{type:"any"};if(!e)return n;if(!n)return e;let o=e.optional||n.optional,t=e.nullable||n.nullable;if(e.type==="any")return{...n,optional:o,nullable:t};if(n.type==="any")return{...e,optional:o,nullable:t};if(e.type!==n.type){if(Nn.has(e.type)&&Nn.has(n.type))return{...kn(e,n),optional:o,nullable:t};if(e.type==="union"||n.type==="union"){let i=e.type==="union"?n.type:e.type;if(i==="union"||Nn.has(i))return{...kn(e,n),optional:o,nullable:t}}return{type:"any",optional:o,nullable:t}}if(e.type==="union")return{...kn(e,n),optional:o,nullable:t};if(e.type==="number"&&n.type==="number"){let i=e.format==="float"||n.format==="float"?"float":"int";return{...e,optional:o,nullable:t,format:i}}if(e.type==="string"&&n.type==="string"){let i;if(e.enumValues||n.enumValues){let s=Array.from(new Set([...e.enumValues??[],...n.enumValues??[]]));s.length<=6&&(i=s)}return e.format===n.format?{...e,optional:o,nullable:t,enumValues:i}:{type:"string",optional:o,nullable:t,enumValues:i}}if(e.type==="object"&&n.type==="object"){let i=e.fields??{},s=n.fields??{},a=new Set([...Object.keys(i),...Object.keys(s)]),l={};for(let c of a){let f=c in i,u=c in s;f&&u?l[c]=xe(i[c],s[c],r+1):f?l[c]={...i[c],optional:!0}:l[c]={...s[c],optional:!0}}return{type:"object",fields:l,optional:o,nullable:t}}return e.type==="array"&&n.type==="array"?{type:"array",itemType:xe(e.itemType,n.itemType,r+1),optional:o,nullable:t}:{...e,optional:o,nullable:t}},Sa=e=>{let n={};for(let r of e)if(r&&typeof r=="object"&&!Array.isArray(r))for(let[o,t]of Object.entries(r))typeof t=="string"&&(n[o]||(n[o]=[]),n[o].push(t));return n},Ni=new Set(["status","type","role","gender","state","category","mode","level","phase","kind","visibility","scope","method","action","currency","priority","tier","plan","severity","permission","provider","platform","environment","locale","theme","layout","variant","direction","alignment","position"]),Ta=(e,n,r)=>{if(n.length===0)return 0;let o=0,t=e.toLowerCase(),i=r?.enumMinSamples??3;Array.from(Ni).some(u=>t.includes(u))&&(o+=.4);let a=new Set(n),l=a.size/n.length;a.size===1||l<=.2?o+=.4:l<=.4&&n.length>=i&&(o+=.2);let c=r?.enumMaxUnique??6;a.size>=2&&a.size<=c&&(o+=.25),n.length>=10?o+=.2:n.length>=5&&(o+=.1);let f=new Set(["yes","no","true","false","get","post","put","delete","active","inactive","pending","success","error","failed"]);return n.every(u=>f.has(u.toLowerCase()))&&(o+=n.length>=i?.5:.2),Math.min(o,1)},xa=(e,n,r)=>{let o=r?.enumConfidenceThreshold??.6;return Ta(e,n,r)>=o},Aa=e=>{let n=Object.keys(e);if(n.some(s=>/currency|curr/i.test(s)))for(let s of n)/amount|price|cost|fee|tax|total|subtotal/i.test(s)&&e[s].type==="number"&&(e[s].format="float");let o=n.some(s=>/^lat(itude)?$/i.test(s)),t=n.some(s=>/^(lng|lon|longitude)$/i.test(s));if(o&&t)for(let s of n)/^lat(itude)?$|^(lng|lon|longitude)$/i.test(s)&&e[s].type==="number"&&(e[s].format="float");if(n.some(s=>/created_?at|updated_?at/i.test(s)))for(let s of n)/created_?by|updated_?by/i.test(s)&&e[s].type==="string"&&(e[s].format="uuid")},W=(e,n,r=0,o,t)=>{let i=t?.maxDepth??Oi,s=(l,c,f)=>(t?.includeMeta&&(l._meta={reason:c,info:f}),l);if(r>i)return s({type:"any"},"max_depth_exceeded");if(e===null)return s({type:"any",nullable:!0},"null_value");if(e===void 0)return s({type:"any",optional:!0},"undefined_value");if(Array.isArray(e)){if(e.length===0)return s({type:"array",itemType:{type:"any"}},"empty_array");let l=e.length,c=t?.arrayLargeThreshold??1e3,f=t?.arraySampleCount??200,u=t?.arrayPrefixSample??10,m=new Set;if(l<=c)for(let h=0;h<l;h++)m.add(h);else{let h=Math.min(u,l);for(let $=0;$<h;$++)m.add($);let b=Math.max(0,Math.min(f-h,l-h));if(b>0){let $=(l-h)/b;for(let j=0;j<b;j++)m.add(Math.min(l-1,Math.floor(h+j*$)))}}let p=Array.from(m).sort((h,b)=>h-b).map(h=>e[h]),d=new Set,y=Sa(p);for(let[h,b]of Object.entries(y))xa(h,b,t)&&d.add(h);let g=W(p[0],void 0,r+1,d,t);for(let h=1;h<p.length;h++)g=xe(g,W(p[h],void 0,r+1,d,t),r+1);if(t?.detectDiscriminatedUnions!==!1&&p.length>=2){let h=ja(p,r,t);h&&(g={...g,discriminatorField:h.discriminatorField,discriminatedVariants:h.variants})}return s({type:"array",itemType:g},"array_inferred",{samples:l,sampled:p.length})}if(typeof e=="object"){let l={};for(let c in e)l[c]=W(e[c],c,r+1,o,t);return Aa(l),s({type:"object",fields:l},"object",{fieldCount:Object.keys(l).length})}if(typeof e=="string"){if(e==="")return s({type:"string",format:"text"},"empty_string");if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(e))return s({type:"string",format:"uuid"},"format:uuid");if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))return s({type:"string",format:"email"},"format:email");if(/^https?:\/\/[^\s]+$/.test(e)&&e.includes("{"))return s({type:"string",format:"text"},"format:url-template");if(/^https?:\/\/[^\s]+$/.test(e))return s({type:"string",format:"url"},"format:url");if(!/version|semver|release/i.test(n??"")){if(/^\d{4}-\d{2}-\d{2}$/.test(e)&&!isNaN(Date.parse(e)))return s({type:"string",format:"date"},"format:date");if(/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(e)&&!isNaN(Date.parse(e)))return s({type:"string",format:"date"},"format:date");if(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}[ T]\d{2}:\d{2}/.test(e)&&!isNaN(Date.parse(e)))return s({type:"string",format:"datetime"},"format:datetime");if(/^\d/.test(e)&&e.includes("T")&&!isNaN(Date.parse(e))&&e.length>7)return s({type:"string",format:"datetime"},"format:datetime")}let c=!1;if(n){let f=n.toLowerCase(),u=Array.from(Ni),m=/price|amount|cost|fee|tax|rate|ratio|percent|score|weight|height|width|balance|salary|revenue/i,p=/^uuid$|^guid$/i,d=/url|uri|href|link|(?<![a-zA-Z])src|endpoint|avatar|thumbnail|image|photo/i,y=/email|mail/i;if(p.test(n))return s({type:"string",format:"uuid"},"format:uuid:keyname");if(y.test(n))return s({type:"string",format:"email"},"format:email:keyname");let g=/^[a-z][a-z0-9+.-]*:/.test(e)&&!/^https?:\/\//.test(e);if(d.test(n)&&!e.startsWith("/")&&!g&&e.includes("{"))return s({type:"string",format:"text"},"format:url-template:keyname");if(d.test(n)&&!e.startsWith("/")&&!g)return s({type:"string",format:"url"},"format:url:keyname");if(o?c=o.has(n):(u.some(h=>f.includes(h))||new Set(["yes","no","true","false","get","post","put","delete","active","inactive","pending","success","error","failed"]).has(e.toLowerCase()))&&(c=!0),!c&&m.test(n))return s({type:"string"},"format:float:keyname")}return c&&e.trim()!==""?s({type:"string",enumValues:[e]},"enum_candidate",{sample:e}):s({type:"string"},"string")}if(typeof e=="number"){let l=Number.isInteger(e);return s({type:"number",format:l?"int":"float"},"number")}let a=typeof e;return s(a==="string"||a==="number"||a==="boolean"||a==="object"?{type:a}:{type:"any"},"primitive")},ja=(e,n,r)=>{if(e.length<2||!e.every(t=>t!==null&&typeof t=="object"&&!Array.isArray(t)))return null;let o=Object.keys(e[0]);for(let t of o){if(!e.every(f=>typeof f[t]=="string"&&f[t].length>0))continue;let i=Array.from(new Set(e.map(f=>f[t])));if(i.length<2||i.length>8)continue;let s={};for(let f of i){let u=e.filter(p=>p[t]===f);if(u.length===0)continue;let m=W(u[0],void 0,n+1,void 0,r);for(let p=1;p<u.length;p++)m=xe(m,W(u[p],void 0,n+1,void 0,r),n+1);s[f]=m}if(Object.keys(s).length<2)continue;let a=Object.values(s).map(f=>new Set(Object.entries(f.fields??{}).filter(([,u])=>!u.optional).map(([u])=>u)));if(Array.from(new Set(a.flatMap(f=>Array.from(f)))).filter(f=>!a.every(u=>u.has(f))).length>=2)return{discriminatorField:t,variants:s}}return null},Oa={typescript:`// Required dependencies: npm install typescript

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

`},Na=e=>{let n=e.split(`
`).map(t=>t.trimEnd()),r=[],o=!1;for(let t of n)t===""?o||(r.push(""),o=!0):(r.push(t),o=!1);return r.join(`
`).trim()},Cn=new WeakMap,ka=e=>{if(Cn.has(e))return Cn.get(e);let n=t=>{if(!t)return null;if(t.type==="object"&&t.fields){let s=Object.keys(t.fields).sort((l,c)=>l.localeCompare(c)),a={};for(let l of s)a[l]=n(t.fields[l]);return{type:"object",fields:a}}if(t.type==="array"&&t.itemType)return{type:"array",item:n(t.itemType)};let i={type:t.type,optional:!!t.optional,nullable:!!t.nullable};return t.enumValues&&t.enumValues.length>0&&(i.enum=[...t.enumValues].sort()),t.format&&(i.format=t.format),i},r=JSON.stringify(n(e)),o=(0,ji.createHash)("sha256").update(r).digest("hex");return Cn.set(e,o),e._structureHash=o,o},vn=(e,n=[],r="Root")=>{if(e.type==="object"&&e.fields){n.push({schema:e,parentKey:r});for(let[o,t]of Object.entries(e.fields))vn(t,n,o)}else e.type==="array"&&e.itemType&&vn(e.itemType,n,r+"Item")},wn=(e,n,r=new Set,o={})=>{if(e.type!=="object"||n.type!=="object"||!e.fields||!n.fields)return!1;let t=Object.keys(e.fields),i=Object.keys(n.fields),s=o.minFieldsForIsomorphic??2;if(t.length<s||i.length<s)return!1;let a=e._structureHash,l=n._structureHash,c=a&&l?`${a}-${l}`:void 0;if(c&&r.has(c))return!0;c&&r.add(c);let f=Array.from(new Set([...t,...i]));if(f.filter($=>e.fields[$]&&n.fields[$]).length===0)return!1;let m=0,p=0,d=0;for(let $ of f){let j=e.fields[$],k=n.fields[$];if(j&&k)if(j.type==="any"||k.type==="any")m++;else if(j.type===k.type)if(j.type==="object"&&j.fields&&k.fields)wn(j,k,r,o)?m++:p++;else if(j.type==="array"&&j.itemType&&k.itemType){let v=j.itemType,z=k.itemType;v.type==="any"||z.type==="any"?m++:v.type==="object"&&z.type==="object"?wn(v,z,r,o)?m++:p++:v.type===z.type?m++:p++}else m++;else p++;else{let v=j||k;v.optional||v.type==="any"?m++:d++}}let y=m+p+d;if(y===0)return!0;let g=m/y,h=o.minMatchRatio??.5,b=o.maxTypeMismatches??0;return g>=h&&p<=b},Rn=(e,n)=>{if(!(!e.fields||!n.fields)){for(let[r,o]of Object.entries(n.fields))if(!e.fields[r])e.fields[r]={...o,optional:!0};else{let t=e.fields[r];if(t.optional=t.optional||o.optional,t.nullable=t.nullable||o.nullable,t.type==="any")e.fields[r]={...o,optional:t.optional,nullable:t.nullable};else if(t.type==="string"&&o.type==="string"){if(t.enumValues||o.enumValues){let i=Array.from(new Set([...t.enumValues??[],...o.enumValues??[]]));t.enumValues=i.length<=6?i:void 0}}else t.type==="object"&&o.type==="object"?Rn(t,o):t.type==="array"&&t.itemType&&o.type==="array"&&o.itemType&&(t.itemType.type==="any"?t.itemType={...o.itemType}:t.itemType.type==="object"&&o.itemType.type==="object"?Rn(t.itemType,o.itemType):t.itemType.type===o.itemType.type&&(t.itemType=xe(t.itemType,o.itemType)))}for(let r of Object.keys(e.fields))n.fields[r]||(e.fields[r].optional=!0)}},Ca=(e,n={})=>{let r=n.sharedPrefix!==void 0?n.sharedPrefix:"Shared",o=[];for(let s of e){let a=!1;for(let l of o)if(wn(s.schema,l[0],new Set,n)){l.push(s.schema),a=!0;break}a||o.push([s.schema])}let t=new Set,i=[];for(let s of o){let a=1;if(s.length<2)continue;s.sort((d,y)=>Object.keys(y.fields||{}).length-Object.keys(d.fields||{}).length);let l=s[0],f=(e.find(d=>d.schema===l)||e.find(d=>s.includes(d.schema)))?.parentKey||"Object",u=Object.keys(l.fields||{}),m="";if(u.includes("city")&&(u.includes("street")||u.includes("zip")))m=r?`${r}Address`:"Address";else if(u.includes("amount")&&u.includes("currency"))m=r?`${r}Money`:"Money";else if(u.includes("created_at")&&u.includes("updated_at"))m=r?`${r}Metadata`:"Metadata";else if(u.includes("name")&&(u.includes("email")||u.includes("age")||u.includes("profile")||u.includes("role")))m=r?`${r}User`:"User";else if(u.includes("id")&&u.includes("profile")&&u.includes("permissions"))m=r?`${r}Member`:"Member";else{let d=s.map(b=>e.find($=>$.schema===b)?.parentKey).filter(b=>!!b&&b!=="Root"&&b!=="Object"),y=d.length>0?d.sort((b,$)=>b.length-$.length)[0]:f,g=new Set(["status","address","business","process","class","series","species","means","news","analysis","basis","crisis","thesis","oasis","bonus","genius","campus","focus","corpus","census","consensus","virus","canvas","atlas","alias","bias","gas"]);y.endsWith("s")&&!y.endsWith("ss")&&!g.has(y.toLowerCase())&&(y=y.slice(0,-1));let h=y.replace(/(^\w|_\w)/g,b=>b.replace(/_/,"").toUpperCase());m=r?`${r}${h}`:h}let p=m;for(;t.has(p);)p=`${m}${a++}`;t.add(p),i.push({group:s,semanticName:p})}return i},va=(e,n={})=>{let r=[];vn(e,r,"Root");for(let t of r)t.schema._structureHash=ka(t.schema);let o=Ca(r,n);for(let{group:t,semanticName:i}of o){if(n.disabledUnifications?.includes(i))continue;let s=n.customTypeNames?.[i]??i,a=t[0];for(let l=1;l<t.length;l++)Rn(a,t[l]);for(let l=1;l<t.length;l++)t[l].fields=a.fields;for(let l of t)l._sharedTypeName=s}};var He=(e,n,r="",o={})=>{try{if(!o._openAPIComponent&&We(e)){let h=Je(e);if(h.length>0)return h.map(({name:$,schema:j},k)=>He(j,n,r,{...o,rootName:$,_openAPIComponent:k>0})).filter($=>typeof $=="string"&&$.trim()).join(`

`)}if(!o._openAPIComponent&&Ye(e)){let h=Ke(e);if(h.length>0)return h.map(({name:$,schema:j},k)=>He(j,n,r,{...o,rootName:$,_openAPIComponent:k>0})).filter($=>typeof $=="string"&&$.trim()).join(`

`)}let t=!!o._openAPIComponent,i=e&&e._isTypeMorphSchema?e:W(e),s=o.rootName??"Root";!t&&!e?._isTypeMorphSchema&&Ai(i,s),t||va(i,o);let a="",l="",c=(n||r||"").toLowerCase();l=c;let f=s.charAt(0).toLowerCase()+s.slice(1);if(c==="typescript"||c==="ts")a=(t?"":`/**
 * TypeMorph Generated TypeScript Interface
 */
`)+Pn.generate(i,s,o);else if(c==="zod")a=(t?"":`import { z } from "zod";

`)+Bn.generate(i,f,o);else if(c==="go"||c==="golang")a=tt.generate(i,s,o);else if(c==="rust")a=et.generate(i,s,o);else if(c==="java")a=rt.generate(i,s,o);else if(c==="python"){let h=Hn.generate(i,s,o),b=[];/\bOptional\[/.test(h)&&b.push("Optional"),/\bList\[/.test(h)&&b.push("List"),/\bAny\b/.test(h)&&b.push("Any");let $=`from pydantic import BaseModel
`;b.length&&($+=`from typing import ${b.join(", ")}
`),/:\s*datetime\b/.test(h)&&($+=`from datetime import datetime
`),a=(t?"":`${$}
`)+h}else c==="php"?a=(t?"":`<?php

`)+Yn.generate(i,s,o):c==="sql"||c==="prisma"?a=it.generate(i,s,o):c==="proto"||c==="protobuf"?a=(t?"":`// Protocol Buffers v3 specification

syntax = "proto3";

`)+Zn.generate(i,s,o):c==="graphql"||c==="gql"?a=Qn.generate(i,s,o):c.includes("csv")?a=Tr.generate(i):c.includes("sql-insert")?a=xr.generate(i,"table_name"):c.includes("mysql")?a=Ar.generate(i,"Root"):c.includes("postgres")?a=jr.generate(i,"Root"):c.includes("sqlite")?a=Or.generate(i,"Root"):c.includes("snowflake")?a=Nr.generate(i,"Root"):c.includes("mongodb")||c.includes("mongoose")?a=Vr.generate(i,"Root"):c.includes("ruby")||c.includes("rails")?a=mi.generate(i,"Root"):c.includes("django")?a=pi.generate(i,"Root"):c.includes("dart")||c.includes("flutter")?a=Jn.generate(i,"Root",o):c.includes("swift")?a=ut.generate(i):c.includes("kotlin")?a=pt.generate(i):c.includes("csharp")||c.includes("c-sharp")?a=lt.generate(i):c.includes("openapi")?a=Gr.generate(i,"Root"):c.includes("jsonschema")?a=yt.generate(i):c.includes("yup")?a=ze.generate(i,"root"):c.includes("joi")?a=qe.generate(i,"root"):c.includes("valibot")?a=Ue.generate(i,"root"):c.includes("react-props")?a=Kr.generate(i,"Component"):c.includes("vue-props")?a=Xr.generate(i,"Component"):c.includes("svelte-props")?a=ei.generate(i,"Component"):c.includes("solid-props")?a=ni.generate(i,"Component"):c.includes("react-context")?a=Hr.generate(i,"Root"):c.includes("react-query")?a=yi.generate(i,s):c.includes("api-route")||c.includes("nextjs-api")?a=di.generate(i,s):c.includes("redux-slice")?a=Zr.generate(i,"root"):c.includes("pinia")?a=Qr.generate(i,"root"):c.includes("sequelize")?a=Br.generate(i,"Root"):c.includes("typeorm")?a=Wr.generate(i,"Root"):c.includes("drizzle")?a=Jr.generate(i,"Root"):c.includes("kysely")?a=Yr.generate(i,"Root"):c.includes("superstruct")?a=Pe.generate(i,"root"):c.includes("arduino")?a=ti.generate(i,"Data"):c.includes("mock")?a=ot.generate(i):c.includes("ui")?a=st.generate(i,"Component"):c.includes("asciidoc")?a=_r.generate(i):c.includes("doc")?a=Ee.generate(i):c.includes("avro")?a=Mr.generate(i,"Root"):c.includes("toml")?a=kr.generate(i,"config"):c.includes("yaml")?a=Cr.generate(i):c.includes("env-validator")?a=wr.generate(i):c.includes("env")?a=vr.generate(i):c.includes("properties")?a=Rr.generate(i):c.includes("markdown")?a=Er.generate(i):c.includes("latex")?a=Ir.generate(i):c.includes("mermaid")?a=Lr.generate(i,"Root"):c.includes("bigquery")?a=Dr.generate(i):c.includes("dynamodb")?a=Fr.generate(i,"Root"):c.includes("postman")?a=zr.generate(i):c.includes("http")?a=qr.generate(i):c.includes("vscode")?a=Ur.generate(i):c.includes("curl")?a=Pr.generate(i):c.includes("cobol")?a=ri.generate(i,"ROOT"):c.includes("clojure")?a=ii.generate(i,"Root"):c.includes("elixir")?a=si.generate(i,"Root"):c.includes("elm")?a=oi.generate(i,"Root"):c.includes("godot")||c.includes("gdscript")?a=ai.generate(i,"Root"):c.includes("haskell")?a=li.generate(i,"Root"):c.includes("r-lang")||c==="r"?(a=ci.generate(i,"Root"),l="r-lang"):c.includes("scala")?a=ui.generate(i,"Root"):c.includes("solidity")?a=fi.generate(i,"Root"):c.includes("cpp")||c.includes("c++")||c.includes("cpp-struct")||c.includes("cpp-class")?a=hi.generate(i,s):c==="c"||c.includes("c-struct")||c.includes("json-to-c")?a=gi.generate(i,s):c.includes("mcp-tool")||c.includes("mcp")?a=bi.generate(i,s):c.includes("openai-function")||c.includes("openai-func")?a=$i.generate(i,s):c.includes("vercel-ai-tool")||c.includes("vercel-ai")?a=Si.generate(i,s):c.includes("nestjs-dto")||c.includes("nestjs")?a=dt.generate(i,s,o):(c.includes("effect-schema")||c.includes("effect"))&&(a=gt.generate(i,f,o));let u=new Set(["typescript","ts","zod","go","golang","rust","java","python","php","sql","prisma","proto","protobuf","graphql","gql","json","r"]),m=["csv","sql-insert","mysql","postgres","sqlite","snowflake","mongodb","mongoose","ruby","rails","django","dart","flutter","swift","kotlin","csharp","c-sharp","openapi","jsonschema","yup","joi","valibot","react-props","vue-props","svelte-props","solid-props","react-context","react-query","api-route","nextjs-api","redux-slice","pinia","sequelize","typeorm","drizzle","kysely","superstruct","arduino","mock","ui","doc","avro","toml","yaml","env-validator","env","properties","markdown","asciidoc","latex","mermaid","bigquery","dynamodb","postman","http","vscode","curl","cobol","clojure","elixir","elm","godot","gdscript","haskell","r-lang","scala","solidity","cpp","c++","cpp-struct","cpp-class","c-struct","json-to-c","mcp-tool","mcp","openai-function","openai-func","vercel-ai-tool","vercel-ai","nestjs-dto","nestjs","effect-schema","effect"],p=u.has(c)||m.some(h=>c.includes(h));c==="json"?a=JSON.stringify(e,null,2):!a&&p?a=`// No output generated for "${n||r||c}". The input may be empty or lack the structure this format expects.`:a||(l="unsupported",Ti(n||r||"unknown",c),a=`// Unsupported output target: "${n||r||"unknown"}"
// Supported targets include: typescript, zod, go, rust, java, python, php, sql, protobuf, graphql, swift, kotlin, jsonschema, mock, ui, doc, openapi, yup, joi, valibot, react-props, vue-props, svelte-props, solid-props, react-context, redux-slice, pinia, sequelize, typeorm, drizzle, kysely, superstruct, arduino, clojure, elixir, elm, godot, haskell, r, scala, solidity
`);let d="",y=l.toLowerCase();for(let[h,b]of Object.entries(Oa))if(y===h){d=b;break}let g=d&&!t?d+a:a;return Na(g)}catch(t){return"// Error: "+String(t)}};var wa=/email|url|link|href|website|endpoint|uuid|guid|^id$|_id$|Id$|ID$|date|_at$|At$|time|timestamp|phone|\btel\b|zip|postal|^ip$|ip_/i,Ra=/^(name|label|title|description|desc|summary|body|content|text|message|note|notes|comment|comments|bio|about|reason|details|info|caption|heading|subtitle|excerpt|overview|remark|remarks|placeholder|hint|tooltip|instruction|instructions|query|search|address|street|city|country|state|province|slug|tag|category|type|status|kind|mode|locale|lang|language|currency|unit|format|source|target|key|value|data)$/i,Ea=/password|passwd|secret|token|apikey|api_key|auth|credential|private/i,_a={email:/email/i,url:/url|link|href|website|endpoint/i,uuid:/uuid|guid/i,id:/^id$|_id$|Id$|ID$/,date:/date|_at$|At$|time|timestamp/i,phone:/phone|tel/i,ip:/^ip$|ip_|ipAddr|ip_address/i};function Ia(e){return/^[a-z][a-zA-Z0-9]*$/.test(e)&&e!==e.toUpperCase()}function La(e){return/^[a-z][a-z0-9_]*$/.test(e)&&e.includes("_")}function Ma(e){return/^[A-Z][a-zA-Z0-9]*$/.test(e)}function ki(e){return La(e)?"snake_case":Ma(e)?"PascalCase":Ia(e)?"camelCase":"other"}function En(e,n,r,o,t){if(!(r>20))if(o.maxDepth=Math.max(o.maxDepth,r),e.type==="object"&&e.fields)for(let[i,s]of Object.entries(e.fields)){let a=n?`${n}.${i}`:i;if(o.total++,o.nameCounts[ki(i)]=(o.nameCounts[ki(i)]??0)+1,s.type==="any"&&(o.anyCount++,t.push({severity:"warning",message:"Has `any` type \u2014 add a specific type",path:a})),s.optional?o.optionalCount++:o.requiredCount++,s.type==="string"){let l=!!s.format,c=Object.values(_a).some(f=>f.test(i));l||c?o.formattedCount++:wa.test(i)&&!Ra.test(i)&&o.semanticUnformatted.push({path:a}),Ea.test(i)&&t.push({severity:"info",message:"May contain sensitive data \u2014 consider hashing or omitting",path:a})}En(s,a,r+1,o,t)}else e.type==="array"&&e.itemType&&En(e.itemType,`${n}[]`,r+1,o,t)}function Da(e){let n=Object.entries(e).filter(([,i])=>i>0);if(n.length===0)return"unknown";n.sort((i,s)=>s[1]-i[1]);let r=n.reduce((i,[,s])=>i+s,0),[o,t]=n[0];return t/r>=.8?o:"mixed"}function Fa(e){return e>=90?"A":e>=75?"B":e>=60?"C":e>=40?"D":"F"}function Ci(e){let n=[],r={total:0,anyCount:0,formattedCount:0,semanticUnformatted:[],optionalCount:0,requiredCount:0,nameCounts:{camelCase:0,snake_case:0,PascalCase:0,other:0},maxDepth:0};En(e,"",0,r,n);let o=100;if(r.total>0){let i=r.anyCount/r.total,s=Math.round(i*50);s>0&&(o-=s)}if(r.semanticUnformatted.length>0){let i=Math.min(20,r.semanticUnformatted.length*5);o-=i;for(let{path:s}of r.semanticUnformatted.slice(0,3))n.push({severity:"info",message:"Looks like it needs a format constraint (uuid, email, datetime\u2026)",path:s});r.semanticUnformatted.length>3&&n.push({severity:"info",message:`${r.semanticUnformatted.length-3} more fields may need format constraints`})}let t=Da(r.nameCounts);if(t==="mixed"&&r.total>=2&&(o-=15,n.push({severity:"warning",message:"Field names mix camelCase and snake_case \u2014 pick one style consistently"})),r.maxDepth>4){let i=Math.min(10,(r.maxDepth-4)*2);o-=i,r.maxDepth>6&&n.push({severity:"warning",message:`Schema is ${r.maxDepth} levels deep \u2014 consider flattening or splitting`})}return r.total>=3&&r.requiredCount===0&&(o-=10,n.push({severity:"warning",message:"All fields are optional \u2014 mark required fields to improve type safety"})),r.total===1&&n.push({severity:"info",message:"Only 1 field \u2014 quality score is based on limited data"}),o=Math.max(0,Math.min(100,o)),{score:o,grade:Fa(o),issues:n,stats:{totalFields:r.total,anyFields:r.anyCount,formattedFields:r.formattedCount,optionalFields:r.optionalCount,requiredFields:r.requiredCount,maxDepth:r.maxDepth,namingStyle:t}}}function vi(e,n,r="root"){let o=[];function t(i,s,a){let l=a.replace(/^root\.?/,"")||"root";if(i.type!==s.type){o.push({path:l,type:"type_changed",oldType:i.type,newType:s.type,severity:"error",description:`'${l}' changed type from '${i.type}' to '${s.type}'.`});return}!i.optional&&s.optional&&o.push({path:l,type:"required_changed",severity:"warning",description:`'${l}' changed from required to optional. Consumers must handle undefined.`}),i.optional&&!s.optional&&o.push({path:l,type:"required_changed",severity:"error",description:`'${l}' changed from optional to required. Existing payloads missing this field will be invalid.`}),!i.nullable&&s.nullable&&o.push({path:l,type:"nullable_changed",severity:"info",description:`'${l}' became nullable. Add null-checks if needed.`}),i.nullable&&!s.nullable&&o.push({path:l,type:"nullable_changed",severity:"warning",description:`'${l}' is no longer nullable. Existing null values will be invalid.`}),(i.format??"")!==(s.format??"")&&o.push({path:l,type:"format_changed",oldType:i.format??"none",newType:s.format??"none",severity:i.format&&!s.format?"warning":"info",description:`'${l}' format changed from '${i.format??"none"}' to '${s.format??"none"}'.`});let c=i.enumValues??[],f=s.enumValues??[];if(c.length>0||f.length>0){let u=c.filter(p=>!f.includes(p)),m=f.filter(p=>!c.includes(p));u.length>0&&o.push({path:l,type:"enum_changed",severity:"error",description:`Enum values removed from '${l}': ${u.map(p=>`"${p}"`).join(", ")}. Existing data with these values will be invalid.`}),m.length>0&&o.push({path:l,type:"enum_changed",severity:"info",description:`New enum values added to '${l}': ${m.map(p=>`"${p}"`).join(", ")}.`})}if(i.type==="object"&&s.type==="object"){let u=i.fields??{},m=s.fields??{};for(let p of Object.keys(u))if(!(p in m)){let d=!u[p].optional;o.push({path:`${l==="root"?"":l+"."}${p}`,type:"removed",oldType:u[p].type,severity:d?"error":"warning",description:d?`Required field '${p}' was removed. This is a breaking change.`:`Optional field '${p}' was removed.`})}for(let p of Object.keys(m))if(!(p in u)){let d=!m[p].optional;o.push({path:`${l==="root"?"":l+"."}${p}`,type:"added",newType:m[p].type,severity:d?"error":"info",description:d?`New required field '${p}' added. Existing payloads missing this field will be invalid.`:`New optional field '${p}' added.`})}for(let p of Object.keys(u))p in m&&t(u[p],m[p],`${a}.${p}`)}i.type==="array"&&s.type==="array"&&i.itemType&&s.itemType&&t(i.itemType,s.itemType,`${a}[]`)}return t(e,n,r),o}function wi(e){let n=[],r=[],o=new Set,t=/(?:export\s+)?interface\s+(\w+)/g,i;for(;(i=t.exec(e))!==null;)o.add(i[1]);let s=[],a=/(?:export\s+)?interface\s+(\w+)\s*(?:extends\s+[\w,\s]+)?\s*\{/g,l;for(;(l=a.exec(e))!==null;){let u=l[1],m=1,p=l.index+l[0].length;for(;p<e.length&&m>0;){let d=e[p++];d==="{"?m++:d==="}"&&m--}s.push({name:u,body:e.slice(l.index+l[0].length,p-1)})}let c=new Map;for(let{name:u,body:m}of s){let p=[],d=m.split(`
`).map(g=>g.trim()).filter(Boolean);for(let g of d){if(g.startsWith("//")||g.startsWith("*")||g.startsWith("/*"))continue;let h=g.match(/^(\w+)(\?)?:\s*(.+?);?\s*$/);if(!h)continue;let[,b,$,j]=h,k=j.replace(/[;,]$/,"").trim();p.push({name:b,type:k,optional:$==="?"})}let y={id:u,label:u,fields:p,isRoot:!1};c.has(u)||(n.push(y),c.set(u,y))}for(let u of n)for(let m of u.fields){let p=m.type.replace(/\[\]/g,"").split(/[|&,\s<>]+/).map(d=>d.trim()).filter(d=>d.length>0&&/^[A-Z]/.test(d));for(let d of p)o.has(d)&&d!==u.id&&(r.some(g=>g.from===u.id&&g.to===d&&g.label===m.name)||r.push({from:u.id,to:d,label:m.name}))}let f=new Set(r.map(u=>u.to));for(let u of n)u.isRoot=!f.has(u.id);return{nodes:n,edges:r}}function Ga(e){let n=e.toLowerCase();return/(_id$|^id$)/.test(n)||/Id$/.test(e)?"a1b2c3d4-e5f6-7890-abcd-ef1234567890":/email/.test(n)?"user@example.com":/url|link|href|uri|website/.test(n)?"https://example.com":/(_at$|_date$|_time$)/.test(n)||/^(created|updated|deleted|started|ended|expires|published)/.test(n)?"2024-01-01T00:00:00Z":/phone|tel/.test(n)?"+1-555-000-0000":/zip|postal/.test(n)?"10001":/country/.test(n)?"US":/currency/.test(n)?"USD":/language|locale/.test(n)?"en":/color|colour/.test(n)?"#000000":/password|secret|token|key/.test(n)?"example-token":/name/.test(n)?"Example Name":/title/.test(n)?"Example Title":/description|desc|body|content|message|note/.test(n)?"Example text":/path|route/.test(n)?"/example":/status|type|kind|category|tag|label/.test(n)?"active":"string"}function za(e){let n=e.toLowerCase();return/price|amount|cost|fee|balance|salary|budget|total|subtotal/.test(n)?9.99:/percent|rate/.test(n)?50:/lat/.test(n)?35.6895:/lng|lon/.test(n)?139.6917:/year/.test(n)?2024:/month/.test(n)||/day/.test(n)?1:/age/.test(n)?30:/count|quantity|qty|size|length/.test(n)||/index|rank|page/.test(n)?1:0}function Ae(e,n,r,o,t){if(t>6)return null;let i=e.trim().replace(/;$/,"");if(i.includes("|")){let f=i.split("|").map(u=>u.trim()).filter(u=>u!=="null"&&u!=="undefined"&&u!=="never"&&u!=="void");return f.length===0?null:Ae(f[0],n,r,o,t)}if(i==="string")return Ga(n);if(i==="number"||i==="bigint"||i==="int"||i==="float")return za(n);if(i==="boolean")return!1;if(i==="null"||i==="undefined"||i==="void"||i==="never"||i==="any"||i==="unknown")return null;if(i==="true")return!0;if(i==="false")return!1;if(i==="object"||i==="Record<string,unknown>"||i==="Record<string, unknown>")return{};let s=i.match(/^['"](.+)['"]$/);if(s)return s[1];if(/^-?\d+(\.\d+)?$/.test(i))return parseFloat(i);let a=i.match(/^(.+)\[\]$/);if(a)return[Ae(a[1].trim(),n,r,o,t+1)];let l=i.match(/^Array<(.+)>$/);if(l)return[Ae(l[1].trim(),n,r,o,t+1)];let c=i.match(/^(?:Partial|Required|Readonly|NonNullable|Promise)<(.+)>$/);return c?Ae(c[1].split(",")[0].trim(),n,r,o,t):/^(Record|Map|Set)</.test(i)?{}:r.has(i)?o.has(i)?{}:Ri(r.get(i),r,new Set([...o,i]),t+1):null}function Ri(e,n,r,o){let t={};for(let i of e.fields)t[i.name]=Ae(i.type,i.name,n,r,o);return t}function Ei(e){try{let n=wi(e);if(n.nodes.length===0)return{json:"",error:`No TypeScript interfaces found.

Example:

interface User {
  user_id: string;
  name: string;
  email: string;
  age: number;
}`};let r=new Map(n.nodes.map(s=>[s.id,s])),o=n.nodes.filter(s=>s.isRoot),t=o.length>0?o[0]:n.nodes[0],i=Ri(t,r,new Set([t.id]),0);return{json:JSON.stringify(i,null,2)}}catch(n){return{json:"",error:n instanceof Error?n.message:"Parse error"}}}var P=e=>`\x1B[1m${e}\x1B[0m`,U=e=>`\x1B[2m${e}\x1B[0m`,L=e=>`\x1B[31m${e}\x1B[0m`,Ne=e=>`\x1B[33m${e}\x1B[0m`,Oe=e=>`\x1B[32m${e}\x1B[0m`,qa=e=>`\x1B[36m${e}\x1B[0m`,_i=e=>`\x1B[34m${e}\x1B[0m`;function je(e){let n=Mi.resolve(e);return Ze.existsSync(n)||(console.error(L(`File not found: ${e}`)),process.exit(1)),Ze.readFileSync(n,"utf8")}function _n(){return new Promise(e=>{let n="",r=Di.createInterface({input:process.stdin});r.on("line",o=>n+=o+`
`),r.on("close",()=>e(n.trim()))})}function Fi(e){let n=e.trim();try{return{obj:JSON.parse(n),raw:n}}catch{}try{return{obj:On(n),raw:n}}catch{}console.error(L("typemorph: input is not valid JSON or YAML")),process.exit(1)}function Ln(e){let{obj:n}=Fi(e);if(We(n)){let r=Je(n);return r.length>0?r:[{name:"Root",schema:W(n)}]}if(Ye(n)){let r=Ke(n);return r.length>0?r:[{name:"Root",schema:W(n)}]}return[{name:"Root",schema:W(n)}]}var Ua={"TypeScript / Validation":["typescript","zod","yup","joi","valibot"],Backend:["go","rust","java","csharp","python","swift","kotlin","php","dart"],Database:["prisma","mysql","postgres","sqlite","mongoose","sequelize","typeorm","drizzle","dynamodb","bigquery","mongodb"],"API / Schema":["openapi","graphql","proto","jsonschema"],"Data / Markup":["csv","sql","toml","yaml","avro"],"Docs / Mock":["doc","mock"]};function Pa(){console.log(P(`
  typemorph \u2014 available formats
`));for(let[e,n]of Object.entries(Ua))console.log(P(`  ${e}`)),console.log(U("  "+n.join("  "))),console.log();console.log(U(`  Usage: typemorph <format> [file.json]  or  cat data.json | typemorph <format>
`))}var Va=`
${P("typemorph")} \u2014 schema engineering CLI

${P("USAGE")}
  typemorph <format> [file]           Convert schema to target format
  typemorph reverse  [file.ts]        Generate JSON sample from TypeScript interfaces
  typemorph quality  [file]           Grade schema quality (A\u2013F)
  typemorph diff     <old> <new>      Detect breaking changes
  typemorph list                      Show all formats

${P("OPTIONS")}
  --root, -r <name>     Root class name for convert (default: Root)
  --schema <name>       Target a specific named schema (OpenAPI/JSON Schema)
  --min-grade <grade>   Fail (exit 1) if quality grade is below threshold (quality)
  --breaking-only       Only show breaking changes (diff)
  --json                Output results as JSON (quality, diff)
  --version, -v         Show version
  --help,    -h         Show this help

${P("EXAMPLES")}
  cat schema.json | typemorph typescript
  typemorph zod       schema.json --root User
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
  typemorph reverse   models.ts
  cat types.ts | typemorph reverse
  typemorph list
`,fe=["A","B","C","D","F"];function Ii(e,n){return e==="A"?Oe(n):e==="B"?qa(n):e==="C"?Ne(n):L(n)}function Ba(e,n){return fe.indexOf(e)>fe.indexOf(n)}function Wa(e,n){let r=Ln(e);if(n.schema){let i=r.find(s=>s.name.toLowerCase()===n.schema.toLowerCase());i||(console.error(L(`Schema "${n.schema}" not found. Available: ${r.map(s=>s.name).join(", ")}`)),process.exit(1)),r=[i]}let o=r.map(({name:i,schema:s})=>({name:i,...Ci(s)})),t=o.reduce((i,s)=>fe.indexOf(s.grade)>fe.indexOf(i.grade)||s.grade===i.grade&&s.score<i.score?s:i);if(n.json)process.stdout.write(JSON.stringify({schemas:o.map(({name:i,grade:s,score:a,issues:l,stats:c})=>({name:i,grade:s,score:a,issues:l,stats:c})),worst:{name:t.name,grade:t.grade,score:t.score}},null,2)+`
`);else{let i=o.length>1;if(i){console.log(`
  ${P("Schema Quality")}  ${U(`(${o.length} schemas)`)}
`);let a=Math.max(...o.map(l=>l.name.length));for(let l of o){let c=Ii(l.grade,`${l.grade}  ${l.score}/100`),f=l.name.padEnd(a),u=l.issues[0]?U(`  \u2014 ${l.issues[0].message}`):"";console.log(`  ${P(f)}  ${c}${u}`)}console.log(),o.length>1&&console.log(U(`  Worst: ${t.name}  ${t.grade}  ${t.score}/100`))}else{let a=o[0],l=Ii(a.grade,`${a.grade}  ${a.score}/100`);console.log(`
  ${P("Schema Quality Score")}  ${l}
`),console.log(U(`  Fields: ${a.stats.totalFields}  |  any: ${a.stats.anyFields}  |  optional: ${a.stats.optionalFields}  |  naming: ${a.stats.namingStyle}  |  depth: ${a.stats.maxDepth}`))}let s=i?null:o[0];if(s)if(s.issues.length===0)console.log(Oe(`
  \u2713 No issues found`));else{console.log();for(let a of s.issues){let l=a.severity==="error"?L("\u2716"):a.severity==="warning"?Ne("\u26A0"):U("\u2139"),c=a.path?U(` [${a.path}]`):"";console.log(`  ${l}  ${a.message}${c}`)}}console.log()}n.minGrade&&Ba(t.grade,n.minGrade)&&(n.json||console.error(L(`  \u2716 ${t.name}: Grade ${t.grade} is below required minimum ${n.minGrade}`)),process.exit(1))}function Li(e){return e.severity==="error"?L(`\u2716  ${e.description}`):e.severity==="warning"?Ne(`\u26A0  ${e.description}`):U(`\u2139  ${e.description}`)}function Ja(e,n,r){if(r.schema){let o=r.schema.toLowerCase(),t=e.find(s=>s.name.toLowerCase()===o),i=n.find(s=>s.name.toLowerCase()===o);return t||(console.error(L(`Schema "${r.schema}" not found in old file`)),process.exit(1)),i||(console.error(L(`Schema "${r.schema}" not found in new file`)),process.exit(1)),[In(r.schema,t.schema,i.schema,r.breakingOnly)]}if(e.length>1||n.length>1){let o=new Map(e.map(s=>[s.name,s.schema])),t=new Map(n.map(s=>[s.name,s.schema]));return[...new Set([...o.keys(),...t.keys()])].map(s=>{let a=o.get(s),l=t.get(s);return a?l?In(s,a,l,r.breakingOnly):{name:s,score:0,breaking:1,warnings:0,info:0,diffs:[{path:s,type:"removed",severity:"error",description:`Schema "${s}" was removed. All consumers will break.`}]}:{name:s,score:0,breaking:1,warnings:0,info:0,diffs:[{path:s,type:"added",severity:"error",description:`Schema "${s}" was added (new schema, existing consumers unaffected \u2014 but flag for review)`}]}})}return[In(e[0].name,e[0].schema,n[0].schema,r.breakingOnly)]}function In(e,n,r,o){let t=vi(n,r),i=t.filter(f=>f.severity==="error").length,s=t.filter(f=>f.severity==="warning").length,a=t.filter(f=>f.severity==="info").length,l=Math.max(0,100-i*15-s*5),c=o?t.filter(f=>f.severity==="error"):t;return{name:e,score:l,breaking:i,warnings:s,info:a,diffs:c}}function Ya(e,n,r){let o=Ln(e),t=Ln(n),i=Ja(o,t,r),s=i.reduce((f,u)=>f+u.breaking,0),a=i.reduce((f,u)=>f+u.warnings,0),l=i.reduce((f,u)=>f+u.info,0),c=i.length===1?i[0].score:Math.max(0,100-s*15-a*5);if(r.json)process.stdout.write(JSON.stringify({score:c,breaking:s,warnings:a,info:l,schemas:i},null,2)+`
`);else{let f=c>=90?Oe(`${c}/100`):c>=60?Ne(`${c}/100`):L(`${c}/100`),u=i.length>1,m=u?`${P("Breaking Change Detector")}  ${U(`(${i.length} schemas)`)}  Compatibility ${f}`:`${P("Breaking Change Detector")}  Compatibility ${f}  ${U("(\u221215/breaking \xB7 \u22125/warning)")}`;console.log(`
  ${m}
`);for(let p of i)if(u){let d=p.breaking>0?L(`\u2716 ${p.breaking} breaking`):p.warnings>0?Ne(`\u26A0 ${p.warnings} warnings`):Oe("\u2713 clean");if(console.log(`  ${P(p.name.padEnd(20))}  ${d}`),p.diffs.length>0){for(let y of p.diffs){let g=y.path?_i(`    ${y.path}`):"";g&&console.log(g),console.log(`      ${Li(y)}`)}console.log()}}else if(p.diffs.length===0)console.log(Oe("  \u2713 No "+(r.breakingOnly?"breaking ":"")+"changes detected"));else for(let d of p.diffs){let y=d.path?_i(`  ${d.path}`):"";y&&console.log(y),console.log(`    ${Li(d)}`)}console.log(U(`
  ${s} breaking  \xB7  ${a} warnings  \xB7  ${l} info
`))}s>0&&process.exit(1)}function Ka(e,n,r){let{obj:o}=Fi(n);try{let t=He(o,e,"",{rootName:r});(!t||t.startsWith("// Unsupported"))&&(console.error(L(`typemorph: unsupported format "${e}". Run \`typemorph list\` to see all formats.`)),process.exit(1)),process.stdout.write(t)}catch(t){console.error(L(`typemorph: ${t?.message??String(t)}`)),process.exit(1)}}async function Ha(){let e=process.argv.slice(2);if(e.length===0||e.includes("--help")||e.includes("-h")){console.log(Va);return}if(e.includes("--version")||e.includes("-v")){console.log("0.3.4");return}let n=e[0];if(n==="list"){Pa();return}let r=e.findIndex(u=>u==="--root"||u==="-r"),o=r!==-1?e[r+1]:"Root",t=e.findIndex(u=>u==="--schema"),i=t!==-1?e[t+1]:void 0,s=e.includes("--json");if(n==="reverse"){let u=e.slice(1).find(y=>!y.startsWith("-")),m=u?je(u):await _n(),{json:p,error:d}=Ei(m);(d||!p)&&(console.error(L(`typemorph reverse: ${d??"No interfaces found"}`)),process.exit(1)),process.stdout.write(p+`
`);return}if(n==="quality"){let u=e.findIndex(g=>g==="--min-grade"),m=u!==-1?e[u+1]?.toUpperCase():void 0;m&&!fe.includes(m)&&(console.error(L(`Invalid --min-grade "${m}". Must be one of: ${fe.join(", ")}`)),process.exit(1));let p=new Set([o,m,i].filter(Boolean)),d=e.slice(1).find(g=>!g.startsWith("-")&&!p.has(g)),y=d?je(d):await _n();Wa(y,{schema:i,minGrade:m,json:s});return}if(n==="diff"){let u=new Set([o,i].filter(Boolean)),m=e.slice(1).filter(d=>!d.startsWith("-")&&!u.has(d));m.length<2&&(console.error(L("Usage: typemorph diff <old.json> <new.json> [--schema <name>]")),process.exit(1));let p=e.includes("--breaking-only");Ya(je(m[0]),je(m[1]),{schema:i,breakingOnly:p,json:s});return}let a=n,l=new Set([o,i].filter(Boolean)),c=e.slice(1).find(u=>!u.startsWith("-")&&!l.has(u)),f=c?je(c):await _n();Ka(a,f,o)}Ha().catch(e=>{console.error(L(`typemorph: ${e?.message??String(e)}`)),process.exit(1)});
