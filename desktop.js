const desktop = document.querySelector('#desktop');
const taskbar = document.querySelector('#tasks');
const start = document.querySelector('#start');
const startMenu = document.querySelector('#start-menu');
const popup = document.querySelector('#popup');
const frames = new Map();
let active = null;
let menuTrigger = null;
let layer = 0;
let theme = 'light';
try {
  if (localStorage.getItem('portfolio-theme') === 'dark') theme = 'dark';
} catch {
  // Local previews can restrict storage.
}

const entries = {
  work: {title:'Selected Project', icon:'folder', path:'C:\\Portfolio\\Selected Project', summary:'Open a file to view project notes and links.', files:['nearby','asl','furry','pet-adopter']},
  computer: {title:'My Computer', icon:'computer', path:'C:\\Portfolio', summary:'Browse the project folder and personal documents.', files:['work','about','contact']},
  nearby: {title:'What’s Near Me', file:'01 What’s Near Me', icon:'artwork', type:'Campus discovery', category:'apps'},
  asl: {title:'ASL Translator', file:'02 ASL Translator', icon:'artwork', type:'Computer vision', category:'lab'},
  furry: {title:'Furry Sound', file:'03 Furry Sound', icon:'artwork', type:'Audio & interaction', category:'lab'},
  'pet-adopter': {title:'Pet Adaptation App', file:'04 Pet Adaptation App', icon:'artwork', type:'Desktop app', category:'apps'},
  about: {title:'About.txt', icon:'note', type:'Text document'},
  contact: {title:'Contact', icon:'mail', type:'Contact card'},
  settings: {title:'Display Properties', icon:'computer'},
  help: {title:'Desktop Help', icon:'note'}
};
function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  const use = document.createElementNS(svg.namespaceURI,'use');
  svg.classList.add('icon');
  svg.setAttribute('aria-hidden','true');
  use.setAttribute('href','#'+name);
  svg.append(use);
  return svg;
}
function fragment(id) {
  return document.getElementById(id).content.cloneNode(true);
}
function button(label, action, value, image) {
  const node = document.createElement('button');
  node.type = 'button';
  node.dataset[action] = value;
  if (image) node.append(icon(image));
  const text = document.createElement('span');
  text.textContent = label;
  node.append(text);
  return node;
}
function closeMenus() {
  startMenu.hidden = true;
  start.setAttribute('aria-expanded','false');
  popup.hidden = true;
  menuTrigger?.setAttribute('aria-expanded','false');
  menuTrigger = null;
}
function focusFrame(frame, keyboard = false) {
  active?.node.classList.remove('active');
  active?.task.setAttribute('aria-pressed','false');
  active = frame;
  if (!frame) return;
  frame.node.hidden = false;
  frame.order = ++layer;
  frame.node.style.zIndex = frame.order;
  frame.node.classList.add('active');
  frame.task.setAttribute('aria-pressed','true');
  if (keyboard) frame.node.focus({preventScroll:true});
}
function fallbackFocus() {
  const visible = [...frames.values()].filter(frame => !frame.node.hidden);
  visible.sort((a,b) => b.order - a.order);
  focusFrame(visible[0] ?? null, visible.length > 0);
  if (!visible.length) start.focus();
}
function hideFrame(frame) {
  frame.node.hidden = true;
  if (active === frame) fallbackFocus();
}
function closeFrame(frame) {
  frames.delete(frame.id);
  frame.node.remove();
  frame.task.remove();
  if (active === frame) fallbackFocus();
}
function maximize(frame) {
  const max = frame.node.classList.toggle('max');
  const control = frame.node.querySelector('[data-window=max]');
  control.textContent = max ? '❐' : '□';
  control.title = max ? 'Restore' : 'Maximize';
  control.setAttribute('aria-label',control.title);
}
function place(frame, x, y) {
  const {clientWidth:width,clientHeight:height} = desktop;
  frame.node.style.left = Math.max(0, Math.min(x,width - frame.node.offsetWidth)) + 'px';
  frame.node.style.top = Math.max(0, Math.min(y,height - frame.node.offsetHeight)) + 'px';
}
function buildExplorer(entry) {
  const content = fragment('explorer');
  content.querySelector('.path').append(icon(entry.icon),entry.path);
  content.querySelector('.sidebar use').setAttribute('href','#'+entry.icon);
  content.querySelector('.sidebar h1').textContent = entry.title;
  content.querySelector('.sidebar p').textContent = entry.summary;
  content.querySelector('.files .label').textContent = entry.icon === 'folder' ? 'ALL PROJECTS' : 'PORTFOLIO CONTENTS';
  const grid = content.querySelector('.file-grid');
  for (const id of entry.files) {
    const file = entries[id];
    const node = button(file.file ?? file.title,'open',id,file.icon);
    node.className = 'file';
    const type = document.createElement('small');
    type.textContent = file.type ?? 'File folder';
    node.append(type);
    grid.append(node);
  }
  content.querySelector('.statusbar span').textContent = entry.files.length + ' objects';
  content.querySelector('.toolbar [data-open=computer]').disabled = entry.icon === 'computer';
  return content;
}
function openFrame(id) {
  closeMenus();
  if (frames.has(id)) {
    focusFrame(frames.get(id),true);
    return;
  }
  const entry = entries[id];
  const node = fragment('frame').firstElementChild;
  const title = node.querySelector('h2');
  title.textContent = entry.title + (entry.icon === 'artwork' ? ' — Project Viewer' : '');
  title.id = 'title-' + id;
  node.setAttribute('aria-labelledby',title.id);
  node.querySelector('.titlebar use').setAttribute('href','#'+entry.icon);
  node.querySelector('.win-body').append(entry.files ? buildExplorer(entry) : fragment(id+'-doc'));
  const task = button(entry.title,'task',id,entry.icon);
  task.className = 'task raised';
  task.title = entry.title;
  const frame = {id,node,task,order:0};
  frames.set(id,frame);
  taskbar.append(task);
  desktop.append(node);
  const narrow = desktop.clientWidth <= 720;
  const margin = narrow ? 7 : 118;
  const top = narrow ? 77 : 44;
  const explorer = Boolean(entry.files);
  const project = entry.icon === 'artwork';
  const width = explorer ? 720 : project ? 565 : 435;
  const height = explorer ? 399 : project ? 460 : 242;
  node.style.width = Math.min(width,desktop.clientWidth - margin - 7) + 'px';
  node.style.height = Math.max(155,Math.min(height,desktop.clientHeight - top - 9)) + 'px';
  const offset = ((frames.size-1)%5)*23;
  place(frame,Math.max(margin,(desktop.clientWidth-node.offsetWidth)*.39)+offset,top+offset);
  if (id === 'settings') updateTheme(theme);
  focusFrame(frame,true);
}
function setView(frame, mode) {
  frame.node.querySelector('.files').classList.toggle('list',mode === 'list');
  for (const toggle of frame.node.querySelectorAll('.toolbar [data-view]')) {
    toggle.setAttribute('aria-pressed',String(toggle.dataset.view === mode));
  }
}
function filterWork(frame, category) {
  let count = 0;
  for (const file of frame.node.querySelectorAll('.file')) {
    file.hidden = category !== 'all' && entries[file.dataset.open].category !== category;
    if (!file.hidden) count++;
  }
  const label = {all:'All projects',apps:'Apps',lab:'Experiments'}[category];
  frame.node.querySelector('.files .label').textContent = label.toUpperCase();
  frame.node.querySelector('.statusbar span').textContent = count + (count === 1 ? ' object' : ' objects');
}
function updateTheme(value) {
  theme = value;
  document.documentElement.dataset.theme = value;
  document.querySelector('meta[name=theme-color]').content = value === 'dark' ? '#22232a' : '#f4efe3';
  for (const item of desktop.querySelectorAll('button[data-theme]')) {
    item.setAttribute('aria-pressed', String(item.dataset.theme === value));
  }
  document.querySelector('[data-toggle-theme]').setAttribute('aria-pressed', String(value === 'dark'));
  try {
    localStorage.setItem('portfolio-theme', value);
  } catch {
    // The theme still works for the current visit.
  }
}
function showPopup(items, x, y, trigger) {
  closeMenus();
  menuTrigger = trigger;
  trigger?.setAttribute('aria-expanded','true');
  popup.replaceChildren(...items);
  popup.hidden = false;
  popup.style.left = Math.max(0,Math.min(x,desktop.clientWidth-popup.offsetWidth))+'px';
  popup.style.top = Math.max(0,Math.min(y,desktop.clientHeight-popup.offsetHeight))+'px';
  popup.querySelector('button').focus();
}
function resetDesktop() {
  closeMenus();
  for (const frame of [...frames.values()]) {
    frame.node.remove();
    frame.task.remove();
  }
  frames.clear();
  active = null;
  openFrame('work');
}
let drag = null;
desktop.addEventListener('pointerdown', event => {
  const node = event.target.closest('.window');
  if (!node || event.button !== 0) return;
  const frame = [...frames.values()].find(item => item.node === node);
  focusFrame(frame);
  const bar = event.target.closest('.titlebar');
  if (!bar || event.target.closest('button') || node.classList.contains('max')) return;
  drag = {frame,x:event.clientX-node.offsetLeft,y:event.clientY-node.offsetTop};
  bar.setPointerCapture(event.pointerId);
});
desktop.addEventListener('pointermove', event => {
  if (drag) place(drag.frame,event.clientX-drag.x,event.clientY-drag.y);
});
for (const name of ['pointerup','pointercancel','lostpointercapture']) {
  desktop.addEventListener(name,()=>{drag = null});
}
desktop.addEventListener('dblclick',event => {
  const bar = event.target.closest('.titlebar');
  if (bar && !event.target.closest('button') && active) maximize(active);
});
desktop.addEventListener('contextmenu',event => {
  if (event.target.closest('.window,button,.popup')) return;
  event.preventDefault();
  showPopup([button('Show desktop','desktop','show'),button('Display Properties','open','settings','computer')],event.clientX,event.clientY);
});
document.addEventListener('focusin',event => {
  const node = event.target.closest('.window');
  const frame = [...frames.values()].find(item => item.node === node);
  if (frame && frame !== active) focusFrame(frame);
});
document.addEventListener('click',event => {
  const target = event.target.closest('button');
  if (!target) {
    if (!event.target.closest('.start-menu,.popup')) closeMenus();
    return;
  }
  const {open,task,window:control,view,menu,filter,theme:chosen} = target.dataset;
  const owner = target.closest('.window');
  const frame = owner ? [...frames.values()].find(item => item.node === owner) : active;
  if (target === start) {
    const wasOpen = !startMenu.hidden;
    closeMenus();
    if (!wasOpen) {
      startMenu.hidden = false;
      start.setAttribute('aria-expanded','true');
      startMenu.querySelector('button').focus();
    }
  } else if (menu) {
    const wasOpen = menuTrigger === target;
    closeMenus();
    if (wasOpen) return;
    const rect = target.getBoundingClientRect();
    const items = menu === 'view'
      ? [button('Icons','view','icons'),button('List','view','list')]
      : [button('Open project folder','open','work','folder'),button('Close window','window','close')];
    if (menu === 'view' && frame?.id === 'work') {
      items.push(document.createElement('hr'),button('All projects','filter','all'),button('Apps','filter','apps'),button('Experiments','filter','lab'));
    }
    showPopup(items,rect.left,rect.bottom,target);
  } else {
    const returnFocus = popup.contains(target) ? menuTrigger : null;
    closeMenus();
    if (open) openFrame(open);
    else if (task) {
      const selected = frames.get(task);
      if (selected === active) hideFrame(selected);
      else focusFrame(selected,true);
    } else if (control && frame) {
      if (control === 'min') hideFrame(frame);
      if (control === 'max') maximize(frame);
      if (control === 'close') closeFrame(frame);
    } else if (view && frame) {
      setView(frame,view);
      returnFocus?.focus();
    } else if (filter && frame) {
      filterWork(frame,filter);
      returnFocus?.focus();
    } else if (chosen) updateTheme(chosen);
    else if (target.hasAttribute('data-toggle-theme')) {
      updateTheme(theme === 'dark' ? 'light' : 'dark');
      start.focus();
    } else if (target.id === 'otter') {
      target.setAttribute('aria-pressed', String(target.getAttribute('aria-pressed') !== 'true'));
    }
    else if (target.hasAttribute('data-reset')) resetDesktop();
    else if (target.id === 'show-desktop' || target.dataset.desktop) {
      for (const item of frames.values()) item.node.hidden = true;
      focusFrame(null);
      start.focus();
    }
  }
});
document.addEventListener('keydown',event => {
  if (event.key !== 'Escape' || (startMenu.hidden && popup.hidden)) return;
  const trigger = menuTrigger ?? start;
  closeMenus();
  trigger.focus();
});
window.addEventListener('resize',() => {
  for (const frame of frames.values()) {
    if (!frame.node.hidden && !frame.node.classList.contains('max')) place(frame,frame.node.offsetLeft,frame.node.offsetTop);
  }
});
function tick() {
  const now = new Date();
  const clock = document.querySelector('#clock');
  clock.textContent = new Intl.DateTimeFormat('en',{hour:'numeric',minute:'2-digit'}).format(now);
  clock.dateTime = now.toISOString();
  clock.title = new Intl.DateTimeFormat('en',{dateStyle:'full'}).format(now);
}
updateTheme(theme);
tick();
setInterval(tick,10000);
function openFromHash() {
  const id = location.hash.slice(1);
  openFrame(['work','about','contact'].includes(id) ? id : 'work');
}
window.addEventListener('hashchange',openFromHash);
openFromHash();
