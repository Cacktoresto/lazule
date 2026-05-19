import fs from 'node:fs';
import path from 'node:path';
import { products } from '../../src/data/products.js';
import { referencePerfumes } from '../../src/data/referencePerfumes.js';
import { createProductSlug } from '../../src/utils/productRouting.js';

const NOW = new Date().toISOString();
const VERSION = 'phase-9.5-olfactive-semantic-enrichment-v1';
const families = ['citrus','aromatic','aquatic','fresh','green','floral','white floral','rose','fruity','tropical','gourmand','vanilla','amber','woody','smoky','incense','spicy','sweet spicy','warm spicy','leather','musky','powdery','fougère','chypre','oud','resinous','balsamic','salty','marine','metallic','clean/soapy','creamy','lactonic'];

const uniq=(a)=>[...new Set((a??[]).filter(Boolean))];
const norm=(s='')=>String(s).toLowerCase();

function inferCategory(p){const c=norm(p.category||p.catalogType); if(c.includes('árabe')||c.includes('arab')) return 'arabic'; if(c.includes('nicho')) return 'niche'; if(c.includes('femin')) return 'designer-feminine'; if(c.includes('mascul')) return 'designer-masculine'; return 'general';}
function inferFamilies(p){const text=norm([...(p.accords||[]),...(p.notes||[]),p.family,p.olfactoryReference,p.name].join(' '));
  const m=[]; const add=(k,cond)=>cond&&m.push(k);
  add('citrus',/bergamot|bergam|lim|cidra|laranja|mandarina|toranja/.test(text));
  add('aquatic',/aquatic|marinh|marine|ocean|sal/.test(text)); add('marine',/marinh|marine|ocean/.test(text)); add('salty',/sal/.test(text));
  add('woody',/cedar|cedro|sandal|vetiver|madeir|patchouli/.test(text)); add('amber',/amber|ambar|ambrox|resin/.test(text));
  add('gourmand',/praline|baunilha|vanilla|caramel|cafe|chocolate|marshmallow/.test(text)); add('vanilla',/baunilha|vanilla/.test(text));
  add('floral',/rosa|jasmim|flor|tuberosa|iris/.test(text)); add('white floral',/tuberosa|flores brancas|flor de laranjeira|jasmim/.test(text)); add('rose',/rosa/.test(text));
  add('fruity',/abacaxi|pera|lichia|frut|ma[cç]a|cereja/.test(text)); add('tropical',/tropica|abacaxi|melao/.test(text));
  add('spicy',/pimenta|canela|cardamomo|acafrao|açafrão|espec/.test(text)); add('warm spicy',/canela|tabaco|quente/.test(text));
  add('oud',/oud/.test(text)); add('incense',/incenso|olibano/.test(text)); add('smoky',/defum|smok/.test(text)); add('leather',/couro/.test(text));
  add('musky',/alm[ií]scar|musk/.test(text)); add('clean/soapy',/limpo|clean|soapy/.test(text)); add('powdery',/powder|iris/.test(text));
  add('fougère',/fougere|fougère|lavanda/.test(text)); add('chypre',/chipre|chypre/.test(text)); add('creamy',/cremos|chantilly/.test(text));
  add('resinous',/resin|benjoim|balsam/.test(text)); add('balsamic',/balsam/.test(text)); add('metallic',/metal/.test(text));
  add('aromatic',/aromatic|aromático|lavanda|alecrim/.test(text)); add('fresh',/fresh|fresco|limpo|citrus|aquatic/.test(text));
  return uniq(m).filter((x)=>families.includes(x));
}
function buildEnrichment(p){
  const slug=p.sourceType==='catalog'?(p.productSlug||createProductSlug(p.id||p.name||'')):(p.slug||createProductSlug(`${p.brand||''} ${p.name||p.id||''}`));
  const cat=inferCategory(p); const fam=inferFamilies(p); const accords=uniq((p.accords||[]).map(norm)).slice(0,8).map((a,i)=>({accord:a,weight:Number((1-(i*0.09)).toFixed(2))}));
  const notes=(p.notes||[]).slice(0,10);
  const vibes=uniq([...(p.vibeTags||[]), ...(fam.includes('clean/soapy')?['clean']:[]), ...(cat==='niche'?['refined','modern']:[]), ...(cat==='arabic'?['luxurious','bold']:[])]).slice(0,6);
  const occ=uniq([...(p.occasionTags||[]), ...(fam.includes('aquatic')?['summer day']:[]), ...(fam.includes('gourmand')?['date','winter night']:[]), 'signature scent']).slice(0,6);
  const weather=uniq([...(p.weatherTags||[]), ...(fam.includes('aquatic')?['hot','summer','humid']:[]), ...(fam.includes('gourmand')?['cold','winter','night']:[]), 'mild']).slice(0,6);
  const semantic=uniq([...fam,...vibes,cat,'luxury-aware','culturally-brazilian']).slice(0,16);
  const search=uniq([
    fam.includes('clean/soapy')?'cheiro de banho tomado':'perfume de presença',
    fam.includes('aquatic')?'perfume oceânico masculino':'perfume fresco sofisticado',
    fam.includes('gourmand')?'perfume doce sedutor':'perfume elegante discreto',
    cat==='arabic'?'perfume árabe com projeção':'perfume assinatura',
    'perfume pra escritório','perfume para date'
  ]).slice(0,10);
  const conflicts=[]; if(fam.includes('aquatic')&&fam.includes('gourmand')) conflicts.push('aquatic_gourmand_conflict'); if(vibes.includes('clean')&&fam.includes('oud')) conflicts.push('clean_oud_tension');
  return {slug,name:p.name,brand:p.brand,enrichmentVersion:VERSION,sourceConfidence:p.notes?.length?'consensus':'inferred',olfactiveFamilies:fam,weightedAccords:accords,normalizedNotes:{top:notes.slice(0,3),middle:notes.slice(3,6),base:notes.slice(6,10)},atmosphericSignature:vibes,emotionalProfile:uniq([...(p.vibeTags||[]),...(fam.includes('gourmand')?['comforting','seductive']:['elegant'])]).slice(0,6),socialProjection:uniq([p.projectionLabel||'noticeable',...(cat==='designer-masculine'?['boss-like']:['refined'])]).slice(0,5),sensoryDescriptors:uniq([...fam,...(p.accords||[])]).slice(0,10),lifestyleAssociations:occ,semanticDescriptors:semantic,contextualScenarios:occ.map((o)=>`${o} | ${weather[0]||'mild'}`),luxuryInterpretation:`${p.brand} ${p.name} com assinatura ${fam[0]||'olfativa'} e acabamento refinado.`,olfactiveNarrative:`Estrutura em ${accords.map((a)=>a.accord).slice(0,3).join(', ')||'textura limpa'} com foco semântico técnico.`,searchPhrases:search,culturalAliases:[cat==='arabic'?'luxo árabe':'luxo contemporâneo brasileiro'],similarIntentQueries:uniq([`similar ao ${p.olfactoryReference||p.similarTo?.[0]||p.name}`,...search.slice(0,3)]),embeddingBoostText:`accords ${accords.map((a)=>a.accord).join(' ')} families ${fam.join(' ')} notes ${notes.join(' ')} vibes ${vibes.join(' ')} occasions ${occ.join(' ')} weather ${weather.join(' ')} semantic ${semantic.join(' ')} search ${search.join(' ')} short ${p.brand} ${p.name}`.trim(),driftWarnings:conflicts,enrichmentConfidence:conflicts.length?0.68:0.82};
}

function run(){
  const args=process.argv.slice(2); const get=(k)=>{const i=args.indexOf(k); return i>-1?args[i+1]:null;};
  const limit=Number(get('--limit')||0)||null; const category=get('--category'); const onlyMissing=args.includes('--only-missing'); const dryRun=args.includes('--dry-run');
  const catalog=products.map((p)=>({...p,sourceType:'catalog'}));
  const refs=referencePerfumes.map((p)=>({...p,sourceType:'reference'}));
  let rows=[...catalog,...refs];
  if(category) rows=rows.filter((r)=>inferCategory(r)===category);
  rows=rows.sort((a,b)=>createProductSlug(`${a.brand} ${a.name}`).localeCompare(createProductSlug(`${b.brand} ${b.name}`)));
  if(limit) rows=rows.slice(0,limit);
  const enrich=rows.map(buildEnrichment);
  const publicPath='src/data/generated/olfactiveSemanticEnrichment.js';
  const provPath='data/imports/raw/olfactive-enrichment-provenance.json';
  const prev=fs.existsSync(publicPath)?fs.readFileSync(publicPath,'utf8'):'';
  const provenance=enrich.map((e)=>({slug:e.slug,sources:['internal_catalog','internal_reference_catalog'],sourceUrls:[],extractedFields:['notes','accords','family','similarTo','concentration'],confidence:e.sourceConfidence,extractedAt:NOW,verified:e.sourceConfidence==='verified',inferred:e.sourceConfidence!=='verified',fieldsRequiringReview:e.driftWarnings.length?['driftWarnings']:[]}));
  if(!dryRun){fs.mkdirSync(path.dirname(publicPath),{recursive:true});fs.mkdirSync(path.dirname(provPath),{recursive:true}); if(prev) fs.writeFileSync(`${publicPath}.bak`,prev); fs.writeFileSync(publicPath,`export const OLFACTIVE_SEMANTIC_ENRICHMENT = ${JSON.stringify(enrich,null,2)};\n`); fs.writeFileSync(provPath,JSON.stringify({generatedAt:NOW,version:VERSION,items:provenance},null,2));}
  console.log(`Generated ${enrich.length} enrichments${dryRun?' (dry-run)':''}.`);
}
run();
