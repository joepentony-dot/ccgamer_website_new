/**
 * Shared CCG Arena scoreboard renderer: inert until loaded by a future
 * validated game-specific overlay. No submissions or third-party tracking.
 */
export const SEVEN_SEGMENTS = Object.freeze({
  '0':'abcdef','1':'bc','2':'abdeg','3':'abcdg','4':'bcfg',
  '5':'acdfg','6':'acdefg','7':'abc','8':'abcdefg','9':'abcdfg',
  '-':'g',' ':''
});
const SVG_NS = 'http://www.w3.org/2000/svg';
const GEOMETRY = Object.freeze({
  a:[[6,5],[22,5]], b:[[25,8],[25,21]], c:[[25,26],[25,39]],
  d:[[6,42],[22,42]], e:[[3,26],[3,39]], f:[[3,8],[3,21]],
  g:[[6,23.5],[22,23.5]]
});

export function displayArenaScore(score, width=6) {
  if(!Number.isSafeInteger(width)||width<1||width>9)throw new RangeError('digit width');
  return Number.isSafeInteger(score)&&score>=0&&score<10**width
    ? String(score).padStart(width,'0') : '-'.repeat(width);
}

export function normaliseArenaBoard(value, expected) {
  if(!value||typeof value!=='object'||value.ok!==true||
     value.gameKey!==expected?.gameKey||value.board!==expected?.board||
     (value.board==='challenge'&&value.challengeSlug!==expected.challengeSlug))
     return Object.freeze({status:'unavailable',rows:[]});
  if(value.status!=='available'||!Array.isArray(value.records))
    return Object.freeze({status:value.status==='no-published-challenge'?'no-challenge':'unavailable',rows:[]});
  const rows=[];
  for(const raw of value.records.slice(0,5)){
    if(!raw||typeof raw!=='object'||typeof raw.playerName!=='string'||
       raw.playerName.trim().length===0||raw.playerName.length>64||
       !Number.isSafeInteger(raw.score)||raw.score<0||raw.score>99999999)continue;
    rows.push(Object.freeze({rank:rows.length+1,name:raw.playerName,score:raw.score}));
  }
  return Object.freeze({status:rows.length?'ranked':'empty',rows});
}

export function sevenSegmentDigits(documentRef, text) {
  const chars=String(text);
  const svg=documentRef.createElementNS(SVG_NS,'svg');
  svg.setAttribute('viewBox','0 0 '+(chars.length*29)+' 48');
  svg.setAttribute('class','ccg-arena-digits');
  svg.setAttribute('aria-hidden','true');
  for(let index=0;index<chars.length;index++) {
    const active=SEVEN_SEGMENTS[chars[index]]||'';
    for(const [key,ends] of Object.entries(GEOMETRY)){
      const line=documentRef.createElementNS(SVG_NS,'line');
      line.setAttribute('x1',String(ends[0][0]+index*29));
      line.setAttribute('y1',String(ends[0][1]));
      line.setAttribute('x2',String(ends[1][0]+index*29));
      line.setAttribute('y2',String(ends[1][1]));
      line.setAttribute('class',active.includes(key)?'ccg-arena-segment on':'ccg-arena-segment');
      svg.append(line);
    }
  }
  return svg;
}

export function renderArenaBoard(container,data,{mode='alltime',digitWidth=6}={}) {
  if(!container||!container.ownerDocument)throw new TypeError('DOM container required');
  if(mode!=='alltime'&&mode!=='challenge')throw new RangeError('mode');
  const documentRef=container.ownerDocument;
  const model=data&&typeof data==='object'?data:{status:'unavailable',rows:[]};
  const section=documentRef.createElement('section');
  section.className='ccg-arena-board';
  section.setAttribute('aria-label',mode==='alltime'?'All-time scores':'Challenge scores');
  const header=documentRef.createElement('h2');
  header.className='ccg-arena-board-title';
  header.textContent='HIGH SCORES';
  section.append(header);
  const list=documentRef.createElement('ol');
  list.className='ccg-arena-board-list';
  for(let i=0;i<5;i++){
    const entry=model.rows?.[i]||null;
    const item=documentRef.createElement('li');
    item.className='ccg-arena-board-entry';
    const name=documentRef.createElement('span');
    name.className='ccg-arena-board-name';
    name.textContent='#'+(i+1)+' '+(entry?.name||'—');
    item.append(name,sevenSegmentDigits(documentRef,
      entry?displayArenaScore(entry.score,digitWidth):'-'.repeat(digitWidth)));
    if(entry){
      const readable=documentRef.createElement('span');
      readable.className='ccg-arena-board-readable';
      readable.textContent=entry.name+', '+entry.score.toLocaleString('en-GB')+' points';
      item.append(readable);
    }
    list.append(item);
  }
  section.append(list);
  const status=documentRef.createElement('p');
  status.className='ccg-arena-board-status';
  status.setAttribute('role','status');
  const words={
    ranked:mode==='alltime'?'ALL-TIME RECORDS':'CHALLENGE RECORDS',
    empty:'AWAITING FIRST VERIFIED SCORE',
    'no-challenge':'NO PUBLISHED CHALLENGE',
    unavailable:'LEADERBOARD NOT AVAILABLE'
  };
  status.textContent=words[model.status]||words.unavailable;
  section.append(status);
  container.replaceChildren(section);
}
