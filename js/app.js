// OMS Logística — agendamento de caminhãozinho, carreta CBSI e outros equipamentos da GMLC.
// Mesmo servidor e mesmo login do OMS. Quem não tem conta pede cadastro e a logística aprova.

const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
const API = LOCAL ? `http://${location.hostname}:8000` : 'https://api-oms-csn.onrender.com';
const CHAVE = 'oms_logistica_sessao_v1';
const FILA = 'oms_logistica_fila_v1';

const S = { sessao: lerJSON(CHAVE), eu: null, tela: 'login', equipamentos: [], dados: {}, form: {} };

// ------------------------------------------------------------------ utilidades
function lerJSON(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } }
function gravarJSON(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } }
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = sel => document.querySelector(sel);
const pad = n => String(n).padStart(2, '0');
const isoDia = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hoje = () => isoDia(new Date());
const amanha = () => { const d = new Date(); d.setDate(d.getDate() + 1); return isoDia(d); };
const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
function dataBR(txt) { if (!txt) return ''; const [d, h] = txt.split(' '); const [a, m, dd] = d.split('-'); return `${dd}/${m}${h ? ' ' + h.slice(0, 5) : ''}`; }
function quando(p) {
  const di = p.inicio.slice(0, 10), df = p.fim.slice(0, 10);
  const d = new Date(di + 'T12:00'), rot = di === hoje() ? 'Hoje' : di === amanha() ? 'Amanhã' : `${SEMANA[d.getDay()]} ${dataBR(di)}`;
  return `${rot}, ${p.inicio.slice(11, 16)} às ${df !== di ? dataBR(df) + ' ' : ''}${p.fim.slice(11, 16)}`;
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), msg.length > 60 ? 5000 : 3200); }
const nomeBonito = n => (n || '').toLowerCase().replace(/(^|\s)(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/\b(Da|De|Do|Das|Dos)\b/g, x => x.toLowerCase());
const primeiroNome = n => (n || '').split(' ')[0].toLowerCase().replace(/^./, c => c.toUpperCase());

async function api(caminho, opcoes = {}) {
  const h = { 'Content-Type': 'application/json' };
  if (S.sessao?.token) h.Authorization = 'Bearer ' + S.sessao.token;
  let r;
  try {
    r = await fetch(API + caminho, { ...opcoes, headers: h, body: opcoes.body ? JSON.stringify(opcoes.body) : undefined });
  } catch {
    const e = new Error('Sem conexão com o servidor. Confira o sinal e tente de novo.'); e.rede = true; throw e;
  }
  let d = null; try { d = await r.json(); } catch { /* sem corpo */ }
  if (r.status === 401 && S.sessao) { sair(true); throw new Error('Sua sessão expirou. Entre de novo.'); }
  if (!r.ok) throw new Error((d && (typeof d.detail === 'string' ? d.detail : d.detail?.[0]?.msg)) || `Erro ${r.status}`);
  return d;
}

// ------------------------------------------------------------------ ícones (traço simples)
const ICO = {
  pedir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  agenda: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  meus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>',
  painel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 17h2m4 0h8m4 0h4V12l-3-5h-5v10"/><path d="M3 17V7h12"/><circle cx="5.5" cy="17.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/></svg>',
  config: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  carreta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 16V6h13v10"/><path d="M15 9h4l3 4v3h-2"/><path d="M2 16h1m4 0h4m4 0h1"/><circle cx="5" cy="17" r="2"/><circle cx="13" cy="17" r="2"/><circle cx="18" cy="17" r="2"/></svg>',
  historico: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 3"/></svg>',
  inicio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  sair: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
};

// ------------------------------------------------------------------ sessão
async function entrar(matricula, senha) {
  const r = await api('/api/colaboradores/login', { method: 'POST', body: { matricula, senha, app: 'logistica' } });
  if (r.precisa_definir_senha) return { definirSenha: true, nome: r.nome };
  S.sessao = { matricula: matricula.trim().toUpperCase(), nome: r.nome, token: r.token };
  gravarJSON(CHAVE, S.sessao);
  return { ok: true };
}
async function definirSenha(matricula, atual, nova) {
  const r = await api('/api/colaboradores/definir_senha', { method: 'POST', body: { matricula, senha_atual: atual, nova_senha: nova, senha_exata: true } });
  S.sessao = { matricula: matricula.trim().toUpperCase(), nome: '', token: r.token };
  gravarJSON(CHAVE, S.sessao);
}
function sair(expirou) {
  S.sessao = null; S.eu = null; gravarJSON(CHAVE, null);
  if (!expirou) toast('Você saiu.');
  ir('login');
}
async function carregarEu() {
  S.eu = await api('/api/logistica/eu');
  S.equipamentos = await api('/api/logistica/equipamentos');
}
async function renovar() {
  try { const r = await api('/api/colaboradores/renovar_sessao', { method: 'POST' }); if (r?.token) { S.sessao.token = r.token; gravarJSON(CHAVE, S.sessao); } } catch { /* fica com o atual */ }
}

// ------------------------------------------------------------------ navegação
const TELAS_LOGADO = ['inicio', 'pedir', 'agenda', 'meus', 'painel', 'cadastros', 'config', 'historico', 'tv'];
function ir(tela) { if (location.hash !== '#' + tela) location.hash = tela; else desenhar(); }
window.addEventListener('hashchange', () => desenhar());

async function desenhar() {
  let tela = (location.hash || '').slice(1) || (S.sessao ? (S.eu?.admin ? 'inicio' : 'pedir') : 'login');
  if (!S.sessao && !['login', 'cadastro'].includes(tela)) tela = 'login';
  if (S.sessao && ['login', 'cadastro'].includes(tela)) tela = S.eu?.admin ? 'inicio' : 'pedir';
  if (S.sessao && !S.eu) {
    $('#app').innerHTML = '<div class="carregando"><div class="spin"></div></div>';
    try { await carregarEu(); } catch (e) { if (!S.sessao) return; $('#app').innerHTML = `<div class="login"><p class="tit">Não deu para carregar</p><p class="sub">${esc(e.message)}</p><button class="btn pri largo" onclick="location.reload()">Tentar de novo</button></div>`; return; }
    ativarPush();
  }
  if (S.sessao && !TELAS_LOGADO.includes(tela)) tela = S.eu?.admin ? 'inicio' : 'pedir';
  if (['inicio', 'painel', 'cadastros', 'config', 'tv'].includes(tela) && !S.eu?.admin) tela = 'pedir';
  S.tela = tela;
  const R = { login: telaLogin, cadastro: telaCadastro, pedir: telaPedir, agenda: telaAgenda, meus: telaMeus, painel: telaPainel, cadastros: telaCadastros, config: telaConfig, historico: telaHistorico, tv: telaTV, inicio: telaInicio }[tela];
  await R();
}

function moldura(titulo, sub, corpo) {
  const a = S.eu?.admin;
  const n = (S.eu?.pedidos_pendentes || 0), c = (S.eu?.cadastros_pendentes || 0);
  const item = (t, rot, ico, b) => `<a href="#${t}" class="${S.tela === t ? 'on' : ''}">${b ? `<span class="bolha">${b}</span>` : ''}${ICO[ico]}${rot}</a>`;
  $('#app').innerHTML = `
  <header class="topo"><img src="icons/icon-192.png" alt=""><div class="topo-tit"><b>${esc(titulo)}</b><span>${esc(sub)}</span></div>
    <button class="btn-ico" id="bt-sair" aria-label="Sair">${ICO.sair}</button></header>
  <main class="conteudo">${S.eu?.para_responder && S.tela !== 'meus' ? `<a class="aviso-resp" href="#meus">🔔 A logística sugeriu outro horário para ${S.eu.para_responder > 1 ? S.eu.para_responder + ' pedidos seus' : 'um pedido seu'}. <b>Toque para responder</b></a>` : ''}
    ${typeof Notification !== 'undefined' && Notification.permission !== 'granted' && ['meus', 'painel', 'inicio'].includes(S.tela) ? `<button class="aviso-notif" id="bt-notif">🔕 As notificações estão desligadas: você não fica sabendo quando a logística responder. <b>Ligar</b></button>` : ''}${corpo}</main>
  <nav class="nav"><div class="nav-in">
    ${a ? item('inicio', 'Início', 'inicio') + item('painel', 'Decidir', 'painel', n || '') + item('agenda', 'Horários', 'agenda') + item('historico', 'Histórico', 'historico') + item('config', 'Ajustes', 'config', c || '')
        : item('pedir', 'Pedir', 'pedir') + item('agenda', 'Horários', 'agenda') + item('meus', 'Meus pedidos', 'meus', S.eu?.para_responder || '') + item('historico', 'Histórico', 'historico')}
  </div></nav>`;
  const bn = $('#bt-notif'); if (bn) bn.onclick = async () => {
    if (Notification.permission === 'denied') return folha('<h2>Notificações bloqueadas</h2><p class="sub">O celular está bloqueando os avisos deste app. Abra as configurações do navegador (ou do app instalado), procure Notificações e permita para o OMS Logística. Depois volte aqui.</p><button class="btn pri largo" data-x>Entendi</button>', (f, x) => { f.querySelector('[data-x]').onclick = x; });
    await ativarPush(); desenhar();
  };
  $('#bt-sair').onclick = async () => { if (await confirmar('Sair do app?', 'Você vai precisar da matrícula e da senha para entrar de novo.', 'Sair')) sair(); };
}

// ------------------------------------------------------------------ ajuda de primeiro uso
const AJUDA = 'oms_logistica_ajuda_v1';
function htmlAjuda(chave, titulo, passos) {
  const vistos = lerJSON(AJUDA) || {};
  if (vistos[chave]) return '';
  return `<div class="card ajuda" data-ajuda="${chave}"><b>${esc(titulo)}</b><ol>${passos.map(x => `<li>${x}</li>`).join('')}</ol>
    <button class="btn largo" data-ajuda-ok="${chave}">Entendi</button></div>`;
}
function ligarAjuda() {
  document.querySelectorAll('[data-ajuda-ok]').forEach(b => b.onclick = () => {
    const v = lerJSON(AJUDA) || {}; v[b.dataset.ajudaOk] = true; gravarJSON(AJUDA, v);
    b.closest('.ajuda').remove();
  });
}

// ------------------------------------------------------------------ modais
function folha(html, ligar) {
  const f = document.createElement('div'); f.className = 'fundo'; f.innerHTML = `<div class="folha" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(f);
  const fechar = () => f.remove();
  f.addEventListener('click', e => { if (e.target === f) fechar(); });
  ligar && ligar(f, fechar);
  return fechar;
}
function confirmar(titulo, texto, ok = 'Confirmar') {
  return new Promise(res => folha(`<h2>${esc(titulo)}</h2><p class="sub">${esc(texto)}</p><div class="btns"><button class="btn" data-n>Voltar</button><button class="btn pri" data-s>${esc(ok)}</button></div>`,
    (f, fechar) => { f.querySelector('[data-n]').onclick = () => { fechar(); res(false); }; f.querySelector('[data-s]').onclick = () => { fechar(); res(true); }; }));
}

// ------------------------------------------------------------------ login e cadastro
function telaLogin() {
  $('#app').innerHTML = `<div class="login">
    <img class="login-logo" src="icons/icon-192.png" alt="">
    <h1>OMS <em>Logística</em></h1>
    <p class="sub">Peça o caminhãozinho ou a carreta e acompanhe a resposta da logística.</p>
    <form id="f-login">
      <label class="campo"><span>Matrícula</span><input id="l-mat" autocomplete="username" autocapitalize="characters" required></label>
      <label class="campo"><span>Senha</span><input id="l-senha" type="password" autocomplete="current-password" required></label>
      <p class="erro-msg" id="l-erro" hidden></p>
      <button class="btn pri largo" id="l-bt">Entrar</button>
    </form>
    <p class="sub" style="margin-top:18px">Já usa o OMS? Entre com a mesma matrícula e senha.</p>
    <button class="link" id="l-cad">Não tenho conta: pedir cadastro</button>
    ${htmlInstalar()}
  </div>`;
  $('#l-cad').onclick = () => ir('cadastro');
  ligarInstalar();
  $('#f-login').onsubmit = async e => {
    e.preventDefault();
    const bt = $('#l-bt'), er = $('#l-erro'), mat = $('#l-mat').value.trim(), senha = $('#l-senha').value;
    bt.disabled = true; er.hidden = true;
    try {
      const r = await entrar(mat, senha);
      if (r.definirSenha) return pedirNovaSenha(mat, senha, r.nome);
      S.eu = null; ir('inicio');
    } catch (err) { er.textContent = err.message; er.hidden = false; } finally { bt.disabled = false; }
  };
}

function pedirNovaSenha(mat, atual, nome) {
  folha(`<h2>Crie sua senha</h2><p class="sub">Olá, ${esc(primeiroNome(nome))}. É seu primeiro acesso: escolha uma senha (mínimo 6 caracteres).</p>
    <label class="campo"><span>Nova senha</span><input id="ns-1" type="password" autocomplete="new-password"></label>
    <label class="campo"><span>Repita a senha</span><input id="ns-2" type="password" autocomplete="new-password"></label>
    <p class="erro-msg" id="ns-e" hidden></p><button class="btn pri largo" id="ns-ok">Salvar e entrar</button>`, (f, fechar) => {
    f.querySelector('#ns-ok').onclick = async () => {
      const a = f.querySelector('#ns-1').value, b = f.querySelector('#ns-2').value, e = f.querySelector('#ns-e');
      if (a !== b) { e.textContent = 'As senhas não são iguais.'; e.hidden = false; return; }
      try { await definirSenha(mat, atual, a); fechar(); S.eu = null; ir('pedir'); } catch (err) { e.textContent = err.message; e.hidden = false; }
    };
  });
}

function telaCadastro() {
  const setores = ['OMS', 'OMR', 'GMLC', 'Máquina', 'Outro'];
  $('#app').innerHTML = `<div class="login">
    <button class="link" id="c-voltar" style="align-self:flex-start">← Voltar</button>
    <h1>Pedir cadastro</h1>
    <p class="sub">A logística confere e libera seu acesso. Você recebe a resposta aqui mesmo, entrando com a matrícula e a senha que criar agora.</p>
    <form id="f-cad">
      <label class="campo"><span>Matrícula</span><input id="c-mat" autocapitalize="characters" required></label>
      <label class="campo"><span>Nome completo</span><input id="c-nome" autocomplete="name" required></label>
      <label class="campo"><span>Setor</span><select id="c-setor" required><option value="">Escolha</option>${setores.map(s => `<option>${s}</option>`).join('')}</select></label>
      <label class="campo"><span>Telefone (WhatsApp)</span><input id="c-tel" type="tel" inputmode="tel" autocomplete="tel" placeholder="(24) 9 0000-0000"></label>
      <label class="campo"><span>Crie uma senha</span><input id="c-senha" type="password" autocomplete="new-password" minlength="6" required></label>
      <p class="erro-msg" id="c-erro" hidden></p>
      <button class="btn pri largo" id="c-bt">Enviar pedido</button>
    </form>
  </div>`;
  $('#c-voltar').onclick = () => ir('login');
  $('#f-cad').onsubmit = async e => {
    e.preventDefault();
    const bt = $('#c-bt'), er = $('#c-erro'); bt.disabled = true; er.hidden = true;
    try {
      await api('/api/logistica/cadastro', { method: 'POST', body: { matricula: $('#c-mat').value, nome: $('#c-nome').value, setor: $('#c-setor').value, telefone: $('#c-tel').value, senha: $('#c-senha').value } });
      $('#app').innerHTML = `<div class="login"><img class="login-logo" src="icons/icon-192.png" alt=""><h1>Pedido enviado</h1>
        <p class="sub">A logística vai conferir seu cadastro. Depois de liberado, entre com sua matrícula e a senha que você criou.</p>
        <button class="btn pri largo" onclick="location.hash='login'">Ir para o login</button></div>`;
    } catch (err) { er.textContent = err.message; er.hidden = false; bt.disabled = false; }
  };
}

// ------------------------------------------------------------------ pedir
function eqSel() { return S.equipamentos.find(e => e.id === S.form.equipamento_id) || null; }

const LUGARES_PADRAO = ['Oficina OMS', 'OMR', 'Máquina', 'Aciaria', 'Pátio de sucata', 'MCC 3', 'MCC 4'];
const PREF = 'oms_logistica_pref_v1';
function rotasDe(pedidos) {
  const vistas = new Map();
  for (const p of pedidos) {
    const k = `${p.equipamento_id}|${p.origem}|${p.destino}|${p.carga}`;
    if (!vistas.has(k)) vistas.set(k, { equipamento_id: p.equipamento_id, equipamento: p.equipamento, origem: p.origem, destino: p.destino, carga: p.carga, setor: p.setor, quantidade: p.quantidade || 1, n: 0 });
    vistas.get(k).n++;
  }
  return [...vistas.values()].sort((a, b) => b.n - a.n).slice(0, 4);
}
function lugares(extra) {
  const cont = {};
  (S.dados.rotas || []).forEach(r => { cont[r.origem] = (cont[r.origem] || 0) + r.n; cont[r.destino] = (cont[r.destino] || 0) + r.n; });
  const usados = Object.keys(cont).sort((a, b) => cont[b] - cont[a]);
  const l = [...new Set([...usados, ...LUGARES_PADRAO])].slice(0, 9);
  if (extra && !l.includes(extra)) l.unshift(extra);
  return l;
}
const somaHora = (hhmm, h) => { const m = minutos(hhmm) + h * 60; return m >= 1440 ? '23:59' : `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };

async function telaPedir() {
  const F = S.form;
  const pref = lerJSON(PREF) || {};
  if (!F.equipamento_id && S.equipamentos[0]) Object.assign(F, { equipamento_id: S.equipamentos[0].id, data: amanha(), inicio: '07:00', dur: 2, quantidade: 1,
    setor: pref.setor || (S.eu.setores.includes(S.eu.setor) ? S.eu.setor : ''), urgente: false });
  if (!F.passo) F.passo = 1;
  if (!F.dur && !F.custom) F.dur = 2;
  if (!F.custom) F.fim = somaHora(F.inicio, F.dur);
  if (!S.dados.rotas) { try { S.dados.rotas = rotasDe(await api('/api/logistica/pedidos/meus')); } catch { S.dados.rotas = []; } }
  if (!S.equipamentos.length) return moldura('Novo pedido', '', '<div class="vazio"><b>Nenhum equipamento cadastrado</b>A logística ainda não cadastrou os equipamentos.</div>');
  const e = eqSel(), passo = F.passo, rotas = S.dados.rotas || [], fila = lerJSON(FILA) || [];
  const TIT = ['', 'O que você precisa?', 'Para quando?', 'De onde, para onde?', 'Confira e envie'];
  let ag = [];
  if (passo === 2) { try { if (e) ag = await api(`/api/logistica/agenda?inicio=${F.data}&dias=1&equipamento_id=${e.id}`); } catch { /* sem sinal */ } }
  const ocupado = (ini, fim, st) => ag.some(p => p.status === st && p.inicio.slice(0, 10) === F.data && p.inicio.slice(11, 16) < fim && p.fim.slice(11, 16) > ini);
  const choque = !F.custom && e?.exclusivo && ocupado(F.inicio, F.fim, 'aprovado');
  const chipLugar = (campo, valor) => `<div class="chips chips-wrap" id="p-${campo}-box">${lugares(valor).map(l => `<button class="chip ${l === valor && !F[campo + 'Outro'] ? 'on' : ''}" data-${campo}="${esc(l)}">${esc(l)}</button>`).join('')}
    <button class="chip ${F[campo + 'Outro'] ? 'on' : ''}" data-${campo}-outro>Outro lugar…</button></div>
    ${F[campo + 'Outro'] ? `<input id="p-${campo}" value="${esc(valor || '')}" placeholder="Escreva o local" style="margin-top:8px">` : ''}`;
  const quandoTxt = `${F.data === hoje() ? 'Hoje' : F.data === amanha() ? 'Amanhã' : SEMANA[new Date(F.data + 'T12:00').getDay()] + ' ' + dataBR(F.data)}, ${F.inicio} às ${F.fim}`;
  let corpo = '';
  if (passo === 1) corpo = `
    ${fila.length && !F.treino ? `<div class="aviso sug">📶 ${fila.length} pedido(s) esperando sinal para enviar. <button class="link" id="p-fila">Enviar agora</button></div>` : ''}
    ${rotas.length && !F.treino ? `<p class="rot">Pedir igual a um anterior</p><div class="atalhos">${rotas.map((r, k) => `<button class="atalho" data-rota="${k}"><b>${esc(r.origem)} → ${esc(r.destino)}</b><small>${esc(r.equipamento)}${r.quantidade > 1 ? ' ×' + r.quantidade : ''} · ${esc(r.carga)}</small></button>`).join('')}</div><p class="rot">Ou escolha:</p>` : ''}
    <div class="chips lista-eq" id="p-eqs">${S.equipamentos.map(x => `<button class="chip chip-eq ${x.id === F.equipamento_id ? 'on' : ''}" data-eq="${x.id}">${/carreta/i.test(x.nome) ? ICO.carreta : ICO.painel}<span>${esc(x.nome)}${x.max_qtd > 1 ? `<small>até ${x.max_qtd} por pedido</small>` : ''}</span></button>`).join('')}</div>
    ${e && e.max_qtd > 1 ? `<p class="rot">Quantas?</p><div class="chips">${Array.from({ length: e.max_qtd }, (_, k) => k + 1).map(q => `<button class="chip ${q === F.quantidade ? 'on' : ''}" data-q="${q}">${q}</button>`).join('')}</div>` : ''}`;
  if (passo === 2) corpo = `
    <p class="rot">Dia</p>
    <div class="chips" id="p-dias">${proximosDias(10).map(d => `<button class="chip dia-chip ${d.iso === F.data ? 'on' : ''}" data-dia="${d.iso}"><small>${d.sem}</small><b>${d.dia}</b></button>`).join('')}</div>
    ${F.custom ? `<div class="dupla" style="margin-top:12px">
        <label class="campo" style="margin:0"><span>Começa</span><input type="time" id="p-ini" value="${F.inicio}" step="900"></label>
        <label class="campo" style="margin:0"><span>Termina</span><input type="time" id="p-fim" value="${F.fim}" step="900"></label></div>
      <button class="link" data-modo-hora="botoes">← Voltar para os botões</button>`
    : `<p class="rot">Horário de início</p>
      <div class="horas-grid" id="p-horas">${Array.from({ length: 13 }, (_, k) => `${pad(6 + k)}:00`).map(h => { const fimH = somaHora(h, F.dur); const apr = e?.exclusivo && ocupado(h, fimH, 'aprovado'); const pen = e?.exclusivo && !apr && ocupado(h, fimH, 'pendente');
        return `<button class="hora ${h === F.inicio ? 'on' : ''} ${apr ? 'ocupada' : ''} ${pen ? 'disputada' : ''}" data-hora="${h}" ${apr ? 'disabled' : ''}>${h.slice(0, 2)}h</button>`; }).join('')}</div>
      ${e?.exclusivo ? '<p class="mini">Riscado = ocupado. Ponto laranja = alguém já pediu.</p>' : ''}
      <p class="rot">Vai precisar por quanto tempo?</p>
      <div class="chips chips-wrap">${[1, 2, 3, 4].map(d => `<button class="chip ${d === F.dur ? 'on' : ''}" data-dur="${d}">${d} hora${d > 1 ? 's' : ''}</button>`).join('')}<button class="chip" data-modo-hora="livre">Outro</button></div>`}
    <div class="card" id="p-ocupacao" style="margin-top:14px"><p class="sub">Conferindo o horário…</p></div>`;
  if (passo === 3) corpo = `
    <p class="rot">Sai de</p>${chipLugar('origem', F.origem)}
    <p class="rot">Vai para</p>${chipLugar('destino', F.destino)}
    <label class="campo"><span>O que vai levar?</span><input id="p-carga" value="${esc(F.carga || '')}" placeholder="Ex.: Molde M-02, 2 segmentos"></label>`;
  if (passo === 4) corpo = `
    <div class="card conferir">
      <button class="linha-conf" data-ir="1"><span>Equipamento</span><b>${esc(e.nome)}${F.quantidade > 1 ? ' × ' + F.quantidade : ''}</b><em>alterar</em></button>
      <button class="linha-conf" data-ir="2"><span>Quando</span><b>${quandoTxt}</b><em>alterar</em></button>
      <button class="linha-conf" data-ir="3"><span>Trajeto</span><b>${esc(F.origem)} → ${esc(F.destino)}</b><small>${esc(F.carga)}</small><em>alterar</em></button>
      <div class="linha-conf"><span>Setor</span><div class="chips chips-wrap">${S.eu.setores.map(x => `<button class="chip ${x === F.setor ? 'on' : ''}" data-setor="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>
    </div>
    <button class="chip chip-urg ${F.urgente ? 'on' : ''}" id="p-urg">🚨 É emergência</button>
    <details class="mais" ${F.equip_oms_id || F.observacao || F.repetir ? 'open' : ''}><summary>Mais opções (observação, repetir toda semana, peça do OMS)</summary>
      <label class="campo"><span>Observação</span><textarea id="p-obs" placeholder="Peso, contato no local, cuidados…">${esc(F.observacao || '')}</textarea></label>
      <label class="campo"><span>Repetir</span><select id="p-rep">${[[0, 'Só esta vez'], [1, 'Toda semana, por 2 semanas'], [3, 'Toda semana, por 4 semanas'], [7, 'Toda semana, por 8 semanas'], [11, 'Toda semana, por 12 semanas']].map(([v, t]) => `<option value="${v}" ${Number(F.repetir || 0) === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo"><span>Peça do OMS</span>
        <div class="busca-peca">${F.equip_oms_id ? `<div class="peca-sel"><b>🔧 ${esc(F.equip_oms_id)}</b><span>${esc(F.equip_oms_desc || '')}</span><button type="button" class="link" id="p-peca-x">Trocar</button></div>`
          : `<input id="p-peca" placeholder="Digite o código: M-02, S-14…" autocomplete="off"><div id="p-peca-res" class="peca-res"></div>`}</div></label>
    </details>
    <p class="mini">Depois de enviar, a logística aprova ou sugere outro horário. Você acompanha em <b>Meus pedidos</b>.</p>`;
  moldura('Novo pedido', `Passo ${passo} de 4`, `
    ${F.treino ? '<div class="faixa-treino"><b>MODO TREINO</b> · nada será enviado <button class="link" id="t-sair">Sair do treino</button></div>'
      : passo === 1 && !treinoFeito() ? `<div class="card ajuda convite-treino"><b>Primeira vez aqui?</b><p>Faça um <b>pedido de treino</b>: o app mostra onde tocar, passo a passo. Nada é enviado.</p>
        <div class="btns"><button class="btn" id="t-pular">Pular</button><button class="btn pri" id="t-comecar">Começar treino</button></div></div>` : ''}
    <div class="progresso" aria-hidden="true">${[1, 2, 3, 4].map(k => `<i class="${k <= passo ? 'on' : ''}"></i>`).join('')}</div>
    <h2 class="passo-tit">${TIT[passo]}</h2>
    ${corpo}
    ${passo === 1 && !F.treino && treinoFeito() ? '<button class="link" id="t-rever" style="margin-top:12px">Ver o treino de novo</button>' : ''}
    <p class="erro-msg" id="p-erro" hidden></p>
    <div class="barra-passo">${passo > 1 ? '<button class="btn" id="p-voltar">Voltar</button>' : ''}
      <button class="btn pri" id="p-seguir" ${choque ? 'disabled' : ''}>${passo < 4 ? 'Continuar' : 'Enviar pedido'}</button></div>`);
  const salvar = () => {
    if ($('#p-ini')) { F.inicio = $('#p-ini').value; F.fim = $('#p-fim').value; }
    if ($('#p-origem')) F.origem = $('#p-origem').value;
    if ($('#p-destino')) F.destino = $('#p-destino').value;
    if ($('#p-carga')) F.carga = $('#p-carga').value;
    if ($('#p-obs')) F.observacao = $('#p-obs').value;
    if ($('#p-rep')) F.repetir = Number($('#p-rep').value) || 0;
  };
  const erro = msg => { const er = $('#p-erro'); er.textContent = msg; er.hidden = false; er.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
  const on = (sel, fn) => document.querySelectorAll(sel).forEach(b => b.onclick = () => { salvar(); fn(b); telaPedir(); });
  on('[data-eq]', b => { F.equipamento_id = Number(b.dataset.eq); F.quantidade = 1; F.veioDeAtalho = false; F.tEq = true; });
  on('[data-q]', b => { F.quantidade = Number(b.dataset.q); });
  on('[data-dia]', b => { F.data = b.dataset.dia; F.tDia = true; });
  on('[data-hora]', b => { F.inicio = b.dataset.hora; F.tHora = true; });
  on('[data-dur]', b => { F.dur = Number(b.dataset.dur); });
  on('[data-modo-hora]', b => { F.custom = b.dataset.modoHora === 'livre'; if (!F.custom) F.dur = F.dur || 2; });
  on('[data-setor]', b => { F.setor = b.dataset.setor; gravarJSON(PREF, { ...pref, setor: F.setor }); });
  on('[data-origem]', b => { F.origem = b.dataset.origem; F.origemOutro = false; });
  on('[data-destino]', b => { F.destino = b.dataset.destino; F.destinoOutro = false; });
  on('[data-origem-outro]', () => { F.origemOutro = true; if (LUGARES_PADRAO.includes(F.origem)) F.origem = ''; });
  on('[data-destino-outro]', () => { F.destinoOutro = true; if (LUGARES_PADRAO.includes(F.destino)) F.destino = ''; });
  on('#p-urg', () => { F.urgente = !F.urgente; });
  on('[data-ir]', b => { F.passo = Number(b.dataset.ir); });
  on('[data-rota]', b => { const r = rotas[Number(b.dataset.rota)]; Object.assign(F, { equipamento_id: r.equipamento_id, origem: r.origem, destino: r.destino, carga: r.carga, quantidade: r.quantidade, setor: r.setor || F.setor, origemOutro: false, destinoOutro: false, passo: 2, veioDeAtalho: true }); });
  on('#p-voltar', () => { F.passo = F.veioDeAtalho && F.passo === 4 ? 2 : F.passo - 1; });
  ['#p-ini', '#p-fim'].forEach(x => $(x) && $(x).addEventListener('change', () => { salvar(); desenharOcupacao(); }));
  ligarBuscaPeca(salvar); ligarAjuda();
  const novoForm = extra => ({ equipamento_id: S.equipamentos[0].id, data: amanha(), inicio: '07:00', dur: 2, quantidade: 1, setor: F.setor, urgente: false, passo: 1, ...extra });
  on('#t-comecar', () => { S.form = novoForm({ treino: true }); });
  on('#t-rever', () => { S.form = novoForm({ treino: true }); });
  on('#t-sair', () => { S.form = novoForm(); });
  $('#t-pular') && ($('#t-pular').onclick = () => { marcarTreino(); telaPedir(); });
  if (F.treino) guiarTreino();
  $('#p-fila') && ($('#p-fila').onclick = enviarFila);
  $('#p-seguir').onclick = async () => {
    salvar();
    if (passo === 2 && F.veioDeAtalho && F.origem && F.destino && F.carga) { F.passo = 4; return telaPedir(); }
    if (passo === 3) {
      const falta = [!(F.origem || '').trim() && 'de onde sai', !(F.destino || '').trim() && 'para onde vai', !(F.carga || '').trim() && 'o que vai levar'].filter(Boolean);
      if (falta.length) return erro('Falta dizer ' + falta.join(', ') + '.');
    }
    if (passo < 4) { F.passo = passo + 1; window.scrollTo(0, 0); return telaPedir(); }
    if (!F.setor) return erro('Escolha o seu setor.');
    if (F.treino) return fimTreino();
    const corpo = { equipamento_id: F.equipamento_id, inicio: `${F.data} ${F.inicio}`, fim: `${F.fim <= F.inicio ? diaSeguinte(F.data) : F.data} ${F.fim}`, origem: F.origem.trim(), destino: F.destino.trim(), carga: F.carga.trim(), observacao: F.observacao, setor: F.setor, quantidade: F.quantidade, urgente: F.urgente, repetir_semanas: F.repetir || 0, equip_oms_id: F.equip_oms_id || null, equip_oms_desc: F.equip_oms_desc || null };
    const bt = $('#p-seguir'); bt.disabled = true; bt.textContent = 'Enviando…';
    const novo = () => ({ equipamento_id: F.equipamento_id, data: F.data, inicio: F.inicio, dur: F.dur, quantidade: 1, setor: F.setor, urgente: false, passo: 1 });
    try {
      const r = await api('/api/logistica/pedidos', { method: 'POST', body: corpo });
      S.form = novo(); S.dados.rotas = null;
      toast(r.criados > 1 ? `${r.criados} pedidos enviados (um por semana)${r.pulados?.length ? `. Ocupado em ${r.pulados.join(', ')}: esses não entraram` : ''}.`
        : r.disputa ? 'Pedido enviado. Outra pessoa também pediu esse horário: a logística decide.' : 'Pedido enviado! A logística vai responder.');
      ir('meus');
    } catch (err) {
      if (err.rede) {
        const fl = lerJSON(FILA) || []; fl.push(corpo); gravarJSON(FILA, fl);
        toast('Sem sinal: o pedido fica guardado e é enviado quando a conexão voltar.');
        S.form = novo(); telaPedir();
      } else { erro(err.message); bt.disabled = false; bt.textContent = 'Enviar pedido'; }
    }
  };
  if (passo === 2) desenharOcupacao();
}

// ------------------------------------------------------------------ treino guiado (primeiro acesso)
const TREINO = 'oms_logistica_treino_v1';
const treinoFeito = () => !!lerJSON(TREINO);
const marcarTreino = () => gravarJSON(TREINO, { em: new Date().toISOString() });
function guiarTreino() {
  const F = S.form, p = F.passo;
  const alvo = p === 1 ? (!F.tEq ? ['#p-eqs', 'Toque no veículo que você precisa.'] : null)
    : p === 2 ? (!F.tDia ? ['#p-dias', 'Escolha o dia. Arraste para o lado para ver mais dias.'] : !F.tHora && $('#p-horas') ? ['#p-horas', 'Agora toque na hora em que você precisa.'] : null)
    : p === 3 ? (!F.origem ? ['#p-origem-box', 'Toque no lugar de onde sai.'] : !F.destino ? ['#p-destino-box', 'Agora toque no lugar para onde vai.'] : !(F.carga || '').trim() ? ['#p-carga', 'Escreva o que vai levar. Ex.: molde, segmentos.'] : null)
    : null;
  const fim = { 1: 'Ótimo! Agora toque em Continuar.', 2: 'Tudo certo. Toque em Continuar.', 3: 'Pronto. Toque em Continuar.', 4: 'Confira o resumo. Se estiver certo, toque em Enviar pedido (é só treino).' }[p];
  document.querySelectorAll('.balao, .coach-alvo').forEach(x => x.classList.contains('balao') ? x.remove() : x.classList.remove('coach-alvo'));
  const el = alvo ? $(alvo[0]) : $('#p-seguir');
  if (!el) return;
  const b = document.createElement('div'); b.className = 'balao'; b.textContent = '👇 ' + (alvo ? alvo[1] : fim);
  if (alvo) el.parentNode.insertBefore(b, el); else $('.barra-passo').prepend(b);
  el.classList.add('coach-alvo');
  b.scrollIntoView({ block: 'center', behavior: 'smooth' });
  const carga = $('#p-carga');
  if (carga && p === 3) carga.oninput = () => { F.carga = carga.value; if (!!carga.value.trim() !== !!carga.dataset.tinha) { carga.dataset.tinha = carga.value.trim() ? '1' : ''; guiarTreino(); } };
}
function fimTreino() {
  marcarTreino();
  const permissao = () => typeof Notification === 'undefined' ? 'sem' : Notification.permission;
  const blocoAviso = () => {
    const p = permissao();
    if (p === 'granted') return '<div class="aviso livre">✓ Avisos ligados. Você vai saber quando a logística responder.</div>';
    if (ehIOS && !instalado()) return `<div class="aviso disputa"><b>No iPhone, instale o app primeiro</b> para receber avisos: toque em <b>Compartilhar</b> e depois em <b>"Adicionar à Tela de Início"</b>. Abra o app pelo ícone e ligue os avisos.</div>`;
    if (p === 'denied') return '<div class="aviso conf"><b>Os avisos estão bloqueados</b> neste celular. Abra as configurações do navegador, procure Notificações e permita para o OMS Logística.</div>';
    if (p === 'sem') return '<div class="aviso disputa">Este navegador não mostra avisos. Acompanhe pelo app em <b>Meus pedidos</b>.</div>';
    return '<button class="btn ok largo" data-avisos>🔔 Ligar os avisos</button>';
  };
  folha(`<h2>🎉 Pronto, você aprendeu!</h2>
    <p class="sub">Isso foi um <b>treino</b>: nada foi enviado. No pedido de verdade:</p>
    <ol class="lista-fim"><li>A logística recebe seu pedido.</li><li>Ela <b>aprova</b> ou <b>sugere outro horário</b>.</li><li>Você <b>recebe um aviso no celular</b> e responde em <b>Meus pedidos</b>.</li></ol>
    <p class="sec">Último passo: ligue os avisos</p>
    <p class="sub">Sem isso você não fica sabendo quando a logística aprovar ou mudar seu horário.</p>
    <div id="fim-avisos">${blocoAviso()}</div>
    <button class="btn pri largo" data-real style="margin-top:12px">Fazer meu pedido de verdade</button>`, (f, fechar) => {
    const ligar = () => { const bt = f.querySelector('[data-avisos]'); if (bt) bt.onclick = async () => { bt.disabled = true; bt.textContent = 'Aguardando você permitir…'; await ativarPush(); f.querySelector('#fim-avisos').innerHTML = blocoAviso(); ligar(); }; };
    ligar();
    f.querySelector('[data-real]').onclick = () => { fechar(); S.form = { equipamento_id: S.equipamentos[0].id, data: amanha(), inicio: '07:00', dur: 2, quantidade: 1, setor: S.form.setor, urgente: false, passo: 1 }; window.scrollTo(0, 0); telaPedir(); };
  });
}
function ligarBuscaPeca(salvar) {
  const F = S.form;
  const x = $('#p-peca-x'); if (x) x.onclick = () => { salvar(); F.equip_oms_id = null; F.equip_oms_desc = null; telaPedir(); };
  const inp = $('#p-peca'); if (!inp) return;
  let t;
  inp.addEventListener('input', () => {
    clearTimeout(t);
    const q = inp.value.trim(), res = $('#p-peca-res');
    if (q.length < 2) { res.innerHTML = ''; return; }
    t = setTimeout(async () => {
      try {
        const l = await api(`/api/logistica/pecas?q=${encodeURIComponent(q)}`);
        res.innerHTML = l.length ? l.map(p => `<button type="button" data-peca="${esc(p.id)}" data-desc="${esc([p.tipo, p.local].filter(Boolean).join(' · '))}"><b>${esc(p.id)}</b><span>${esc(p.tipo || '')}${p.local ? ' · ' + esc(p.local) : ''}</span></button>`).join('') : '<p class="mini">Nada encontrado no OMS. Escreva no campo de baixo.</p>';
        res.querySelectorAll('[data-peca]').forEach(b => b.onclick = () => {
          salvar(); F.equip_oms_id = b.dataset.peca; F.equip_oms_desc = b.dataset.desc;
          if (!(F.carga || '').trim()) F.carga = `${b.dataset.peca}${b.dataset.desc ? ' (' + b.dataset.desc.split(' · ')[0] + ')' : ''}`;
          telaPedir();
        });
      } catch { res.innerHTML = ''; }
    }, 250);
  });
}
function diaSeguinte(iso) { const d = new Date(iso + 'T12:00'); d.setDate(d.getDate() + 1); return isoDia(d); }
function proximosDias(n) {
  const out = []; const d = new Date();
  for (let i = 0; i < n; i++) { out.push({ iso: isoDia(d), sem: i === 0 ? 'hoje' : i === 1 ? 'amanhã' : SEMANA[d.getDay()], dia: d.getDate() }); d.setDate(d.getDate() + 1); }
  return out;
}
function desenharQtd() {
  const e = eqSel(), el = $('#p-qtd');
  if (!e || e.max_qtd <= 1) { el.innerHTML = ''; return; }
  el.innerHTML = `<p class="sec">Quantas</p><div class="chips">${Array.from({ length: e.max_qtd }, (_, i) => i + 1).map(q => `<button class="chip ${q === S.form.quantidade ? 'on' : ''}" data-q="${q}">${q} ${q > 1 ? 'unidades' : 'unidade'}</button>`).join('')}</div>`;
  el.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { S.form.quantidade = Number(b.dataset.q); desenharQtd(); });
}
async function desenharOcupacao() {
  const el = $('#p-ocupacao'); if (!el) return;
  const e = eqSel();
  try {
    const [lista, bls] = await Promise.all([api(`/api/logistica/agenda?inicio=${S.form.data}&dias=1&equipamento_id=${e.id}`), api(`/api/logistica/bloqueios?inicio=${S.form.data}&dias=1`)]);
    const bl = bls.filter(b => b.equipamento_id === e.id);
    if (!$('#p-ocupacao')) return;
    const ini = S.form.inicio, fim = S.form.fim;
    const cruza = p => p.inicio.slice(11, 16) < (fim > ini ? fim : '24:00') && p.fim.slice(11, 16) > ini && p.inicio.slice(0, 10) === S.form.data;
    const choque = e.exclusivo && lista.some(p => p.status === 'aprovado' && cruza(p));
    const disputa = e.exclusivo && !choque ? lista.filter(p => p.status === 'pendente' && !p.meu && cruza(p)) : [];
    const aberto = matchMedia('(min-width: 900px)').matches ? 'open' : '';
    el.innerHTML = `${choque ? '<div class="aviso conf">Esse horário já tem reserva aprovada. Escolha outro horário.</div>' : ''}
      ${disputa.length ? `<div class="aviso disputa">⚠️ ${disputa.map(p => `<b>${esc(nomeBonito(p.solicitante_nome))}</b> já pediu ${p.inicio.slice(11, 16)}–${p.fim.slice(11, 16)}`).join(', ')} e está aguardando a logística. Se puder, escolha outro horário. Se pedir mesmo assim, a logística decide quem fica.</div>` : !choque ? '<div class="aviso livre">✓ Horário livre</div>' : ''}
      ${bl.map(b => `<div class="aviso bloq">⛔ Bloqueado ${b.inicio.slice(11, 16)}–${b.fim.slice(0, 10) > S.form.data ? '24:00' : b.fim.slice(11, 16)}${b.motivo ? ': ' + esc(b.motivo) : ''}</div>`).join('')}
      ${!e.exclusivo ? '<p class="mini">A carreta é fornecida pela CBSI: pode haver mais de um pedido no mesmo horário. A logística confirma.</p>' : ''}
      ${lista.length || bl.length ? `<details class="ocup-mais" ${aberto}><summary>Ver agenda do dia · ${lista.length ? lista.length + (lista.length > 1 ? ' reservas' : ' reserva') : 'bloqueio'}</summary>
      ${trilho(lista, S.form.data, { ini, fim }, bl)}
      ${lista.map(linhaReserva).join('')}</details>` : `<p class="mini">${esc(e.nome)}: livre o dia todo.</p>`}`;
  } catch (err) { el.innerHTML = `<p class="sub">${esc(err.message)}</p>`; }
}
function minutos(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
function trilho(lista, dia, sel, bloqueios = []) {
  const pos = p => {
    const a = p.inicio.slice(0, 10) < dia ? 0 : minutos(p.inicio.slice(11, 16));
    const b = p.fim.slice(0, 10) > dia ? 1440 : minutos(p.fim.slice(11, 16));
    return `left:${a / 14.4}%;width:${Math.max(0.8, (b - a) / 14.4)}%`;
  };
  let s = '';
  if (sel && sel.ini && sel.fim) {
    const a = minutos(sel.ini), b = sel.fim > sel.ini ? minutos(sel.fim) : 1440;
    s = `<div class="bloco" style="left:${a / 14.4}%;width:${(b - a) / 14.4}%;background:transparent;outline:2px dashed var(--texto);opacity:1"></div>`;
  }
  const bq = bloqueios.map(b => `<div class="bloco bloqueado" style="${pos(b)}" title="Bloqueado"></div>`).join('');
  return `<div class="trilho">${bq}${lista.map(p => `<div class="bloco ${p.status} ${p.meu ? 'meu' : ''}" style="${pos(p)}" title="${esc(p.inicio.slice(11, 16))}–${esc(p.fim.slice(11, 16))}"></div>`).join('')}${s}</div>
    <div class="horas"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>24h</span></div>`;
}
function linhaReserva(p) {
  const quem = p.meu ? 'Você' : nomeBonito(p.solicitante_nome) || p.solicitante;
  return `<div class="reserva"><span class="hora">${p.inicio.slice(11, 16)}–${p.fim.slice(11, 16)}</span>
    <span class="det"><b>${esc(quem)}</b>${p.setor ? ` · ${esc(p.setor)}` : ''}<br>
    ${esc(p.origem)} → ${esc(p.destino)}${p.quantidade > 1 ? ` · ${p.quantidade} un.` : ''}<br>
    ${p.status === 'pendente' ? '<span style="color:var(--alerta)">aguardando a logística</span>' : '<span style="color:var(--ok)">aprovado</span>'}${p.urgente ? ' · 🚨 emergência' : ''}</span></div>`;
}
async function enviarFila() {
  const fila = lerJSON(FILA) || []; if (!fila.length) return;
  const resto = []; let ok = 0;
  for (const corpo of fila) {
    try { await api('/api/logistica/pedidos', { method: 'POST', body: corpo }); ok++; } catch (e) { if (e.rede) resto.push(corpo); else toast(`Um pedido guardado não entrou: ${e.message}`); }
  }
  gravarJSON(FILA, resto.length ? resto : null);
  if (ok) toast(`${ok} pedido(s) guardado(s) enviado(s).`);
  if (S.tela === 'pedir') telaPedir();
}
window.addEventListener('online', () => { if (S.sessao) enviarFila(); });

// ------------------------------------------------------------------ agenda
async function telaAgenda() {
  const A = S.dados.ag || (S.dados.ag = { modo: 'semana', filtro: 'todos', dia: hoje(), semana: 0 });
  const adm = S.eu.admin;
  const filtros = [['todos', 'Todos'], ['pendente', adm ? 'Para aprovar' : 'Aguardando'], ['aprovado', 'Aprovados']];
  const ini = A.modo === 'semana' ? (() => { const d = new Date(); d.setDate(d.getDate() + 7 * A.semana); return isoDia(d); })() : A.dia;
  moldura('Horários', A.modo === 'semana' ? (adm ? 'Os próximos 7 dias, aprovados e para aprovar' : 'Veja o que está ocupado antes de pedir') : 'Um dia, equipamento por equipamento', `
    <div class="ag-topo">
      <div class="chips"><button class="chip ${A.modo === 'semana' ? 'on' : ''}" data-modo="semana">Semana</button><button class="chip ${A.modo === 'dia' ? 'on' : ''}" data-modo="dia">Dia</button></div>
      <div class="chips">${filtros.map(([v, t]) => `<button class="chip ${A.filtro === v ? 'on' : ''}" data-filtro="${v}">${t}</button>`).join('')}</div>
    </div>
    ${A.modo === 'semana' ? `<div class="sem-nav"><button class="btn" data-sem="-1" ${A.semana <= 0 ? 'disabled' : ''}>‹ Anterior</button><b>${dataBR(ini)} a ${dataBR(isoDia(new Date(new Date(ini + 'T12:00').getTime() + 6 * 864e5)))}</b><button class="btn" data-sem="1">Próxima ›</button></div>`
      : `<div class="chips">${proximosDias(14).map(d => `<button class="chip dia-chip ${d.iso === A.dia ? 'on' : ''}" data-dia="${d.iso}"><small>${d.sem}</small><b>${d.dia}</b></button>`).join('')}</div>`}
    <div class="legenda"><span><i></i>Aprovado</span><span><i class="p"></i>${adm ? 'Para aprovar' : 'Aguardando aprovação'}</span><span><i class="b"></i>Bloqueado</span></div>
    <div id="ag-lista"><div class="card"><p class="sub">Carregando…</p></div></div>`);
  document.querySelectorAll('[data-modo]').forEach(b => b.onclick = () => { A.modo = b.dataset.modo; telaAgenda(); });
  document.querySelectorAll('[data-filtro]').forEach(b => b.onclick = () => { A.filtro = b.dataset.filtro; telaAgenda(); });
  document.querySelectorAll('[data-sem]').forEach(b => b.onclick = () => { A.semana = Math.max(0, A.semana + Number(b.dataset.sem)); telaAgenda(); });
  document.querySelectorAll('[data-dia]').forEach(b => b.onclick = () => { A.dia = b.dataset.dia; telaAgenda(); });
  const dias = A.modo === 'semana' ? 7 : 1;
  try {
    const [todos, bls] = await Promise.all([api(`/api/logistica/agenda?inicio=${ini}&dias=${dias}`), api(`/api/logistica/bloqueios?inicio=${ini}&dias=${dias}`)]);
    const lista = todos.filter(p => A.filtro === 'todos' || p.status === A.filtro);
    S.dados.pedidos = lista;
    if (A.modo === 'dia') {
      const dia = A.dia;
      $('#ag-lista').innerHTML = S.equipamentos.map(e => {
        const meus = lista.filter(p => p.equipamento_id === e.id), bl = bls.filter(b => b.equipamento_id === e.id);
        return `<div class="card eq"><div class="eq-cab"><b>${esc(e.nome)}</b><span>${meus.length ? `${meus.length} pedido(s)` : 'livre'}</span></div>
          ${trilho(meus, dia, null, bl)}${bl.map(b => `<div class="aviso bloq">⛔ Bloqueado ${b.inicio.slice(11, 16)}–${b.fim.slice(0, 10) > dia ? '24:00' : b.fim.slice(11, 16)}${b.motivo ? ': ' + esc(b.motivo) : ''}</div>`).join('')}
          ${meus.map(p => linhaReserva(p) + (adm && p.status === 'pendente' ? acoesRapidas(p) : '')).join('')}
          <button class="btn largo" data-pedir="${e.id}" data-diap="${dia}" style="margin-top:12px">Pedir ${esc(e.nome)} neste dia</button></div>`;
      }).join('');
    } else {
      const dd = Array.from({ length: 7 }, (_, k) => isoDia(new Date(new Date(ini + 'T12:00').getTime() + k * 864e5)));
      const pend = lista.filter(p => p.status === 'pendente').length, apr = lista.filter(p => p.status === 'aprovado').length;
      $('#ag-lista').innerHTML = `<div class="resumo"><div class="res"><b>${lista.length}</b><span>na semana</span></div><div class="res ${pend ? 'alerta' : ''}"><b>${pend}</b><span>para aprovar</span></div><div class="res"><b>${apr}</b><span>aprovados</span></div></div>
        <div class="semana">${dd.map(d => {
          const ps = lista.filter(p => p.inicio.slice(0, 10) <= d && p.fim.slice(0, 10) >= d).sort((a, b) => a.inicio.localeCompare(b.inicio));
          const bs = bls.filter(b => b.inicio.slice(0, 10) <= d && b.fim.slice(0, 10) >= d);
          const dt = new Date(d + 'T12:00'), rot = d === hoje() ? 'Hoje' : d === amanha() ? 'Amanhã' : SEMANA[dt.getDay()];
          return `<div class="sem-dia ${d === hoje() ? 'hoje' : ''}"><div class="sem-cab"><b>${rot}</b><span>${dataBR(d)}</span><button class="link" data-verdia="${d}">ver dia</button></div>
            ${bs.map(b => `<div class="sem-it bloqueado"><span class="sem-h">⛔</span><span class="sem-d"><b>${esc(b.equipamento)}</b><small>Bloqueado${b.motivo ? ' · ' + esc(b.motivo) : ''}</small></span></div>`).join('')}
            ${ps.length ? ps.map(p => `<div class="sem-it ${p.status}"><span class="sem-h">${p.inicio.slice(0, 10) < d ? '00:00' : p.inicio.slice(11, 16)}<small>${p.fim.slice(0, 10) > d ? '24:00' : p.fim.slice(11, 16)}</small></span>
              <span class="sem-d"><b>${esc(p.equipamento)}${p.quantidade > 1 ? ' ×' + p.quantidade : ''}${p.urgente ? ' 🚨' : ''}</b><small>${esc(p.meu ? 'Você' : nomeBonito(p.solicitante_nome))}${p.setor ? ' · ' + esc(p.setor) : ''}</small><small>${esc(p.origem)} → ${esc(p.destino)}</small>
              ${p.status === 'pendente' ? `<em>${adm ? 'para aprovar' : 'aguardando aprovação'}</em>` : ''}${adm && p.status === 'pendente' ? acoesRapidas(p) : ''}</span></div>`).join('')
              : `<p class="sem-livre">${A.filtro === 'pendente' ? 'Nada para aprovar' : 'Livre'}</p>`}</div>`;
        }).join('')}</div>`;
      document.querySelectorAll('[data-verdia]').forEach(b => b.onclick = () => { A.modo = 'dia'; A.dia = b.dataset.verdia; telaAgenda(); });
    }
    document.querySelectorAll('[data-pedir]').forEach(b => b.onclick = () => { Object.assign(S.form, { equipamento_id: Number(b.dataset.pedir), data: b.dataset.diap, quantidade: 1 }); ir('pedir'); });
    ligarAcoes(telaAgenda);
  } catch (e) { $('#ag-lista').innerHTML = `<div class="card"><p class="sub">${esc(e.message)}</p></div>`; }
}
function acoesRapidas(p) {
  return `<div class="btns rapidas"><button class="btn ok" data-ap="${p.id}">Aprovar</button><button class="btn" data-rm="${p.id}">Mudar horário</button><button class="btn perigo" data-rc="${p.id}" aria-label="Recusar">Recusar</button></div>`;
}

// ------------------------------------------------------------------ meus pedidos
function cartaoPedido(p, admin) {
  const rot = p.fase === 'entregue' ? 'Entregue' : p.fase === 'a_caminho' ? 'A caminho' : ({ pendente: 'Aguardando', aprovado: 'Aprovado', recusado: 'Recusado', cancelado: 'Cancelado', sugerido: admin ? 'Esperando resposta' : 'Responda' }[p.status] || p.status);
  const seloCls = p.fase === 'entregue' ? 'entregue' : p.fase === 'a_caminho' ? 'caminho' : p.status;
  const ativo = ['pendente', 'aprovado'].includes(p.status) && p.fim >= `${hoje()} 00:00`;
  return `<div class="card ped st-${p.status} ${p.urgente && p.status === 'pendente' ? 'urg' : ''}">
    <div class="ped-top"><h3>${p.urgente ? '🚨 ' : ''}${esc(p.equipamento)}${p.quantidade > 1 ? ` <span class="sub">× ${p.quantidade}</span>` : ''}</h3><span class="selo ${seloCls}">${rot}</span></div>
    ${admin ? `<p class="ped-quem">${esc(nomeBonito(p.solicitante_nome) || p.solicitante)}${p.setor ? ` <span>· ${esc(p.setor)}</span>` : ''} <span>· ${esc(p.solicitante)}</span></p>` : ''}
    <p class="ped-quando">${quando(p)}</p>
    <p class="ped-rota"><b>${esc(p.origem)}</b> → <b>${esc(p.destino)}</b> · ${esc(p.carga)}</p>
    ${p.equip_oms_id || p.serie_id ? `<p class="ped-tags">${p.equip_oms_id ? `<span class="tag">🔧 ${esc(p.equip_oms_id)}</span>` : ''}${p.serie_id ? '<span class="tag">↻ semanal</span>' : ''}</p>` : ''}
    ${p.status === 'aprovado' ? linhaTransporte(p) : ''}
    ${admin && p.solicitante_telefone ? `<p class="ped-rota">📞 <a href="tel:${esc(p.solicitante_telefone)}" style="color:var(--marca)">${esc(p.solicitante_telefone)}</a> </p>` : ''}
    ${p.observacao ? `<p class="mini">“${esc(p.observacao)}”</p>` : ''}
    ${p.reagendado && p.status === 'aprovado' ? `<div class="aviso sug">A logística remarcou: você pediu ${dataBR(p.sugestao_inicio)}.${p.motivo ? ' ' + esc(p.motivo) : ''}</div>` : ''}
    ${p.status === 'sugerido' && !admin ? `<div class="aviso sug sug-forte"><b>A logística sugeriu outro horário:</b><br>${quando({ inicio: p.sugestao_inicio, fim: p.sugestao_fim })}${p.motivo ? `<br><span class="sub">${esc(p.motivo)}</span>` : ''}
      <div class="btns"><button class="btn ok" data-aceita="${p.id}">Aceito</button><button class="btn perigo" data-naopode="${p.id}">Não posso</button></div></div>` : ''}
    ${p.status === 'sugerido' && admin ? `<div class="aviso sug">Você sugeriu ${quando({ inicio: p.sugestao_inicio, fim: p.sugestao_fim })}. Esperando ${esc(primeiroNome(p.solicitante_nome))} responder.</div>` : ''}
    ${p.status === 'pendente' && admin && p.motivo ? `<div class="aviso conf">${esc(p.motivo)}</div>` : ''}
    ${p.status === 'recusado' && p.motivo ? `<div class="aviso conf">Motivo: ${esc(p.motivo)}</div>` : ''}
    ${admin && p.conflitos?.length ? `<div class="aviso conf">Choca com: ${p.conflitos.map(c => `${esc(nomeBonito(c.nome) || '')} ${c.inicio.slice(11)}–${c.fim.slice(11)} (${c.status === 'aprovado' ? 'aprovado' : 'aguardando'})`).join('; ')}</div>` : ''}
    ${admin && p.status === 'pendente' ? `<div class="btns"><button class="btn ok" data-ap="${p.id}">Aprovar</button><button class="btn" data-rm="${p.id}">Mudar horário</button></div>
      <div class="btns"><button class="btn" data-ed="${p.id}">Editar</button><button class="btn perigo" data-rc="${p.id}">Recusar</button></div>` : ''}
    ${admin && p.status === 'sugerido' ? `<div class="btns"><button class="btn" data-rm="${p.id}">Mudar horário</button><button class="btn" data-ed="${p.id}">Editar</button><button class="btn perigo" data-cn="${p.id}">Cancelar</button></div>` : ''}
    ${admin && p.status === 'aprovado' && !p.entregue_em ? `${!p.saiu_em ? `<div class="btns"><button class="btn pri largo" data-saiu="${p.id}">🚚 Marcar saída</button></div><button class="link" data-ent="${p.id}" data-pular="1">Já foi entregue? Marcar entrega direto</button>`
        : `<div class="btns"><button class="btn ok largo" data-ent="${p.id}">✅ Marcar entrega</button></div>`}
      ${!p.saiu_em ? `<div class="btns"><button class="btn" data-rm="${p.id}">Mudar horário</button><button class="btn" data-ed="${p.id}">Editar</button><button class="btn perigo" data-cn="${p.id}">Cancelar</button></div>` : ''}` : ''}
    ${!admin && ativo && !p.saiu_em ? `<div class="btns"><button class="btn perigo" data-cn="${p.id}">Cancelar pedido</button></div>` : ''}
    ${p.decidido_por_nome && p.status !== 'pendente' ? `<p class="mini">${p.status === 'cancelado' ? 'Cancelado' : 'Decidido'} por ${esc(primeiroNome(p.decidido_por_nome))} em ${dataBR(p.decidido_em)}</p>` : `<p class="mini">Pedido em ${dataBR(p.criado_em)}</p>`}
  </div>`;
}
function linhaTransporte(p) {
  const h = t => t ? t.slice(11, 16) : '';
  const passos = [['Aprovado', true, h(p.decidido_em)], ['Saiu', !!p.saiu_em, h(p.saiu_em)], ['Entregue', !!p.entregue_em, h(p.entregue_em)]];
  return `<div class="fases">${passos.map(([n, ok, t]) => `<span class="fase ${ok ? 'ok' : ''}"><i></i>${n}${ok && t ? ` <small>${t}</small>` : ''}</span>`).join('')}</div>`;
}
function ligarAcoes(recarregar) {
  const mudar = async (id, rota, msg) => { try { await api(`/api/logistica/pedidos/${id}/${rota}`, { method: 'POST' }); toast(msg); recarregar(); } catch (e) { toast(e.message); } };
  document.querySelectorAll('[data-saiu]').forEach(b => b.onclick = () => mudar(b.dataset.saiu, 'saiu', 'Marcado como saiu. Quem pediu foi avisado.'));
  // Entrega direta: o servidor pode exigir a saída antes, então marca a saída primeiro.
  document.querySelectorAll('[data-ent]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    try {
      if (b.dataset.pular) await api(`/api/logistica/pedidos/${b.dataset.ent}/saiu`, { method: 'POST' });
      await api(`/api/logistica/pedidos/${b.dataset.ent}/entregue`, { method: 'POST' });
      toast('Entregue. Quem pediu foi avisado.'); recarregar();
    } catch (e) { toast('Não deu para marcar a entrega: ' + e.message); b.disabled = false; }
  });
  const acao = async (id, body, msg) => { try { await api(`/api/logistica/pedidos/${id}/decidir`, { method: 'POST', body }); toast(msg); S.eu = await api('/api/logistica/eu'); recarregar(); } catch (e) { toast(e.message); } };
  document.querySelectorAll('[data-ap]').forEach(b => b.onclick = () => acao(b.dataset.ap, { acao: 'aprovar' }, 'Aprovado. Quem pediu foi avisado.'));
  document.querySelectorAll('[data-rc]').forEach(b => b.onclick = () => folha(`<h2>Recusar pedido</h2><p class="sub">Quem pediu vai ver o motivo.</p>
      <label class="campo"><span>Motivo</span><textarea id="rc-m" placeholder="Ex.: carreta da CBSI indisponível nesse dia"></textarea></label><div class="btns"><button class="btn" data-x>Voltar</button><button class="btn pri" data-ok>Recusar</button></div>`,
    (f, fechar) => { f.querySelector('[data-x]').onclick = fechar; f.querySelector('[data-ok]').onclick = () => { const m = f.querySelector('#rc-m').value.trim(); if (!m) return toast('Escreva o motivo.'); fechar(); acao(b.dataset.rc, { acao: 'recusar', motivo: m }, 'Recusado. Quem pediu foi avisado.'); }; }));
  document.querySelectorAll('[data-rm]').forEach(b => {
    b.onclick = () => {
      const p = (S.dados.pedidos || []).find(x => String(x.id) === b.dataset.rm) || {};
      const d = (p.inicio || '').slice(0, 10) || amanha();
      folha(`<h2>Mudar horário</h2><p class="sub">Escolha o novo dia e horário. A pessoa confirma se dá ou não.</p>
        <label class="campo"><span>Dia</span><input type="date" id="rm-d" value="${d}"></label>
        <div class="dupla"><label class="campo"><span>Início</span><input type="time" id="rm-i" value="${(p.inicio || '').slice(11, 16) || '07:30'}"></label><label class="campo"><span>Fim</span><input type="time" id="rm-f" value="${(p.fim || '').slice(11, 16) || '09:30'}"></label></div>
        <label class="campo"><span>Recado para a pessoa (opcional)</span><input id="rm-m" placeholder="Ex.: CBSI só tem carreta à tarde"></label>
        <button class="btn pri largo" data-sug>Enviar para ${esc(primeiroNome(p.solicitante_nome) || 'a pessoa')} confirmar</button>
        <p class="mini" style="text-align:center">Ela recebe uma notificação e responde "Aceito" ou "Não posso". Só fica aprovado quando ela aceitar.</p>
        <button class="btn largo" data-x style="margin-top:8px">Voltar</button>`, (f, fechar) => {
        f.querySelector('[data-x]').onclick = fechar;
        const corpo = tipo => { const dia = f.querySelector('#rm-d').value, i = f.querySelector('#rm-i').value, fi = f.querySelector('#rm-f').value;
          return { acao: tipo, inicio: `${dia} ${i}`, fim: `${fi <= i ? diaSeguinte(dia) : dia} ${fi}`, motivo: f.querySelector('#rm-m').value }; };
        f.querySelector('[data-sug]').onclick = () => { const c = corpo('sugerir'); fechar(); acao(b.dataset.rm, c, 'Sugestão enviada. Você é avisado quando a pessoa responder.'); };
      });
    };
  });
  const responder = async (id, body, msg) => { try { await api(`/api/logistica/pedidos/${id}/responder`, { method: 'POST', body }); toast(msg); recarregar(); } catch (e) { toast(e.message); } };
  document.querySelectorAll('[data-aceita]').forEach(b => b.onclick = () => responder(b.dataset.aceita, { aceitar: true }, 'Combinado! Seu pedido está aprovado no novo horário.'));
  document.querySelectorAll('[data-naopode]').forEach(b => b.onclick = () => folha(`<h2>Não pode nesse horário?</h2><p class="sub">Conte para a logística o melhor horário para você.</p>
      <label class="campo"><span>Mensagem</span><textarea id="np-m" placeholder="Ex.: Só consigo depois das 13h"></textarea></label><div class="btns"><button class="btn" data-x>Voltar</button><button class="btn pri" data-ok>Enviar</button></div>`,
    (f, fechar) => { f.querySelector('[data-x]').onclick = fechar; f.querySelector('[data-ok]').onclick = () => { const m = f.querySelector('#np-m').value.trim(); fechar(); responder(b.dataset.naopode, { aceitar: false, motivo: m }, 'Enviado. A logística vai ver outro horário.'); }; }));
  document.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => {
    const p = (S.dados.pedidos || []).find(x => String(x.id) === b.dataset.ed) || {};
    const eq = S.equipamentos.find(e => e.id === p.equipamento_id) || {};
    folha(`<h2>Editar pedido</h2><p class="sub">${esc(nomeBonito(p.solicitante_nome))} é avisado do que mudar.</p>
      <label class="campo"><span>Setor</span><select id="ed-s">${S.eu.setores.map(x => `<option ${x === p.setor ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
      <div class="dupla"><label class="campo"><span>Origem</span><input id="ed-o" value="${esc(p.origem)}"></label><label class="campo"><span>Destino</span><input id="ed-d" value="${esc(p.destino)}"></label></div>
      <label class="campo"><span>O que vai transportar</span><input id="ed-c" value="${esc(p.carga)}"></label>
      ${eq.max_qtd > 1 ? `<label class="campo"><span>Quantidade</span><input id="ed-q" type="number" min="1" max="${eq.max_qtd}" value="${p.quantidade || 1}"></label>` : ''}
      <label class="campo"><span>Observação</span><textarea id="ed-ob">${esc(p.observacao || '')}</textarea></label>
      <div class="btns"><button class="btn" data-x>Voltar</button><button class="btn pri" data-ok>Salvar e avisar</button></div>`, (f, fechar) => {
      f.querySelector('[data-x]').onclick = fechar;
      f.querySelector('[data-ok]').onclick = async () => {
        const v = id => f.querySelector(id)?.value;
        try {
          const r = await api(`/api/logistica/pedidos/${p.id}/editar`, { method: 'POST', body: { setor: v('#ed-s'), origem: v('#ed-o'), destino: v('#ed-d'), carga: v('#ed-c'), observacao: v('#ed-ob'), quantidade: v('#ed-q') ? Number(v('#ed-q')) : null } });
          fechar(); toast(r.mudou.length ? 'Salvo. Quem pediu foi avisado.' : 'Nada mudou.'); recarregar();
        } catch (e) { toast(e.message); }
      };
    });
  });
  document.querySelectorAll('[data-cn]').forEach(b => b.onclick = async () => {
    if (!await confirmar('Cancelar este pedido?', 'O horário fica livre para outra pessoa.', 'Cancelar pedido')) return;
    try { await api(`/api/logistica/pedidos/${b.dataset.cn}/cancelar`, { method: 'POST' }); toast('Pedido cancelado.'); recarregar(); } catch (e) { toast(e.message); }
  });
}

async function telaMeus() {
  moldura('Meus pedidos', 'Acompanhe a resposta da logística', '<div id="m-lista"><div class="card"><p class="sub">Carregando…</p></div></div>');
  try {
    const lista = await api('/api/logistica/pedidos/meus'); S.dados.pedidos = lista;
    const ativos = lista.filter(p => ['pendente', 'aprovado', 'sugerido'].includes(p.status) && p.fim >= `${hoje()} 00:00`);
    const antigos = lista.filter(p => !ativos.includes(p));
    $('#m-lista').innerHTML = lista.length ? `
      ${ativos.length ? '<p class="sec">Em andamento</p>' + ativos.map(p => cartaoPedido(p, false)).join('') : ''}
      ${antigos.length ? '<p class="sec">Histórico</p>' + antigos.slice(0, 30).map(p => cartaoPedido(p, false)).join('') : ''}`
      : '<div class="vazio"><b>Nenhum pedido ainda</b>Toque em Pedir para agendar o caminhãozinho ou a carreta.</div>';
    ligarAcoes(telaMeus);
  } catch (e) { $('#m-lista').innerHTML = `<div class="card"><p class="sub">${esc(e.message)}</p></div>`; }
}

// ------------------------------------------------------------------ painel da logística
async function telaPainel() {
  const aba = S.dados.abaPainel || 'pendente';
  moldura('Pedidos', 'Aprove, remarque ou recuse', `
    ${htmlAjuda('decidir', 'Como decidir os pedidos', ['Em <b>Para decidir</b>: toque em <b>Aprovar</b>, <b>Mudar horário</b> (a pessoa confirma) ou <b>Recusar</b>.', 'No dia, em <b>Já aprovados</b>: toque em <b>Marcar saída</b> quando o veículo sair.', 'Quando chegar, toque em <b>Marcar entrega</b>. Quem pediu é avisado em cada passo.'])}
    <div id="pn-resumo"></div>
    <div class="chips chips-wrap"><button class="chip ${aba === 'pendente' ? 'on' : ''}" data-aba="pendente">Para decidir${S.eu.pedidos_pendentes ? ` <small>(${S.eu.pedidos_pendentes})</small>` : ''}</button>
    <button class="chip ${aba === 'sugerido' ? 'on' : ''}" data-aba="sugerido">Esperando resposta</button>
    <button class="chip ${aba === 'proximos' ? 'on' : ''}" data-aba="proximos">Já aprovados</button>
    <button class="chip ${aba === 'recusado' ? 'on' : ''}" data-aba="recusado">Recusados</button></div>
    <div id="pn-lista"><div class="card"><p class="sub">Carregando…</p></div></div>`);
  document.querySelectorAll('[data-aba]').forEach(b => b.onclick = () => { S.dados.abaPainel = b.dataset.aba; telaPainel(); });
  ligarAjuda();
  try {
    const lista = await api(`/api/logistica/pedidos?status=${aba}`); S.dados.pedidos = lista;
    try {
      const prox = aba === 'proximos' ? lista : await api('/api/logistica/pedidos?status=proximos');
      const hj = prox.filter(p => p.inicio.slice(0, 10) === hoje()).length, am = prox.filter(p => p.inicio.slice(0, 10) === amanha()).length;
      const pend = S.eu.pedidos_pendentes || 0;
      $('#pn-resumo').innerHTML = `<div class="resumo">
        <button class="res ${pend ? 'alerta' : ''}" data-aba="pendente"><b>${pend}</b><span>para decidir</span></button>
        <button class="res" data-aba="proximos"><b>${hj}</b><span>hoje</span></button>
        <button class="res" data-aba="proximos"><b>${am}</b><span>amanhã</span></button></div>`;
      document.querySelectorAll('#pn-resumo [data-aba]').forEach(b => b.onclick = () => { S.dados.abaPainel = b.dataset.aba; telaPainel(); });
    } catch { /* resumo é opcional */ }
    $('#pn-lista').innerHTML = lista.length ? lista.map(p => cartaoPedido(p, true)).join('')
      : `<div class="vazio"><b>${aba === 'pendente' ? 'Nada para decidir' : 'Nada aqui'}</b>${aba === 'pendente' ? 'Quando alguém pedir, você recebe um aviso no celular.' : ''}</div>`;
    ligarAcoes(telaPainel);
  } catch (e) { $('#pn-lista').innerHTML = `<div class="card"><p class="sub">${esc(e.message)}</p></div>`; }
}

// ------------------------------------------------------------------ ajustes (cadastros, equipamentos, ADMs)
async function telaConfig() {
  moldura('Ajustes', 'Equipamentos, pessoas e quem gerencia', '<div id="cf"><div class="card"><p class="sub">Carregando…</p></div></div>');
  try {
    const [cads, eqs, adms, bls, pes] = await Promise.all([api('/api/logistica/cadastros'), api('/api/logistica/equipamentos?todos=true'), api('/api/logistica/admins'), api(`/api/logistica/bloqueios?inicio=${hoje()}&dias=60`), api('/api/logistica/pessoas')]);
    const aba = S.dados.cfAba || 'equip';
    const abas = [['equip', 'Equipamentos'], ['pessoas', 'Pessoas'], ['bloq', 'Bloqueios'], ['gestores', 'Gestores'], ['mais', 'Mais']];
    $('#cf').innerHTML = `
      ${cads.length ? `<p class="sec">Pedidos de cadastro (${cads.length})</p>
      <div class="card destaque">${cads.map(c => `<div class="lista-linha"><div><b>${esc(c.nome)}</b><small>${esc(c.matricula)} · ${esc(c.setor || '')}${c.telefone ? ' · ' + esc(c.telefone) : ''}</small></div>
        <button class="btn ok" data-cok="${c.id}">Liberar</button><button class="btn perigo" data-cno="${c.id}" aria-label="Recusar">✕</button></div>`).join('')}</div>` : ''}
      <div class="chips cf-abas">${abas.map(([v, t]) => `<button class="chip ${v === aba ? 'on' : ''}" data-cfaba="${v}">${t}</button>`).join('')}</div>
      <section class="cf-sec" data-sec="pessoas" ${aba === 'pessoas' ? '' : 'hidden'}>
      <div class="card">
        <p class="mini" style="margin-top:0">Quem não tem conta no OMS. Elas só entram neste app, nunca no OMS.</p>
        <input id="pes-busca" placeholder="Buscar por nome ou matrícula" style="margin-top:8px">
        <div id="pes-lista">${pes.length ? pes.map(p => `<div class="lista-linha pes ${p.ativo ? '' : 'inativo'}" data-busca="${esc((p.nome + ' ' + p.matricula + ' ' + (p.setor || '')).toLowerCase())}"><div><b>${esc(nomeBonito(p.nome))}</b>
          <small>${esc(p.matricula)}${p.setor ? ' · ' + esc(p.setor) : ''}${p.telefone ? ' · ' + esc(p.telefone) : ''}</small>
          <small>${!p.ativo ? '⛔ Desativado' : p.primeiro_acesso ? 'Ainda não entrou (senha = matrícula)' : p.ultimo_acesso ? 'Último acesso ' + dataBR(p.ultimo_acesso) : 'Já criou a senha'} · ${p.pedidos} pedido(s)</small></div>
          <button class="btn" data-pesmenu="${esc(p.matricula)}" aria-label="Opções">⋯</button></div>`).join('') : '<p class="sub" style="margin-top:10px">Ninguém de fora cadastrado ainda.</p>'}</div>
        <button class="btn pri largo" id="pes-novo">+ Cadastrar pessoa</button></div></section>
      <section class="cf-sec" data-sec="equip" ${aba === 'equip' ? '' : 'hidden'}>
      <div class="card">${eqs.map(e => `<div class="lista-linha"><div><b>${esc(e.nome)}</b><small>${e.exclusivo ? 'Um uso por vez' : `Pedido em quantidade (até ${e.max_qtd})`}${e.identificacao ? ' · ' + esc(e.identificacao) : ''}${e.ativo ? '' : ' · desativado'}</small></div>
        <button class="btn" data-eqed="${e.id}">Editar</button></div>`).join('')}
        <button class="btn largo" id="eq-novo">+ Novo equipamento</button></div></section>
      <section class="cf-sec" data-sec="bloq" ${aba === 'bloq' ? '' : 'hidden'}>
      <div class="card">${bls.length ? bls.map(b => `<div class="lista-linha"><div><b>${esc(b.equipamento)}</b><small>${dataBR(b.inicio)} até ${dataBR(b.fim)}${b.motivo ? ' · ' + esc(b.motivo) : ''}</small></div><button class="btn perigo" data-blrm="${b.id}">Liberar</button></div>`).join('') : '<p class="sub">Nenhum bloqueio nos próximos 60 dias.</p>'}
        <button class="btn largo" id="bl-novo">+ Bloquear horário (manutenção, feriado…)</button></div></section>
      <section class="cf-sec" data-sec="mais" ${aba === 'mais' ? '' : 'hidden'}>
      <div class="card"><p class="sub">Agenda de hoje e amanhã em letra grande, para deixar aberta num monitor ou telão do escritório. Atualiza sozinha.</p><button class="btn largo" id="bt-tv">Abrir quadro de transportes</button></div>
      ${htmlInstalar(true)}</section>
      <section class="cf-sec" data-sec="gestores" ${aba === 'gestores' ? '' : 'hidden'}>
      <div class="card">${adms.map(a => `<div class="lista-linha"><div><b>${esc(a.nome || a.matricula)}</b><small>${esc(a.matricula)}</small></div>${a.matricula !== S.sessao.matricula ? `<button class="btn perigo" data-admrm="${esc(a.matricula)}">Tirar</button>` : '<small>você</small>'}</div>`).join('')}
        <div class="dupla" style="margin-top:12px;grid-template-columns:1fr auto"><input id="adm-mat" placeholder="Matrícula" autocapitalize="characters"><button class="btn pri" id="adm-add">Adicionar</button></div>
        <p class="mini">Quem gerencia recebe os pedidos, aprova, remarca e libera cadastros. A pessoa precisa ter conta (OMS ou cadastro aprovado).</p></div></section>`;
    document.querySelectorAll('[data-cfaba]').forEach(b => b.onclick = () => { S.dados.cfAba = b.dataset.cfaba;
      document.querySelectorAll('[data-cfaba]').forEach(x => x.classList.toggle('on', x === b));
      document.querySelectorAll('.cf-sec').forEach(sec => { sec.hidden = sec.dataset.sec !== b.dataset.cfaba; }); });
    const decidir = async (id, aprovar) => { try { await api(`/api/logistica/cadastros/${id}/decidir`, { method: 'POST', body: { aprovar } }); toast(aprovar ? 'Acesso liberado.' : 'Pedido recusado.'); S.eu = await api('/api/logistica/eu'); telaConfig(); } catch (e) { toast(e.message); } };
    document.querySelectorAll('[data-cok]').forEach(b => b.onclick = () => decidir(b.dataset.cok, true));
    document.querySelectorAll('[data-cno]').forEach(b => b.onclick = async () => { if (await confirmar('Recusar cadastro?', 'A pessoa não vai conseguir entrar.', 'Recusar')) decidir(b.dataset.cno, false); });
    document.querySelectorAll('[data-eqed]').forEach(b => b.onclick = () => editarEquip(eqs.find(e => e.id === Number(b.dataset.eqed))));
    document.querySelectorAll('[data-blrm]').forEach(b => b.onclick = async () => { try { await api(`/api/logistica/bloqueios/${b.dataset.blrm}/remover`, { method: 'POST' }); toast('Horário liberado.'); telaConfig(); } catch (e) { toast(e.message); } });
    $('#bl-novo').onclick = () => novoBloqueio(eqs);
    $('#pes-novo').onclick = () => cadastrarPessoa();
    $('#pes-busca').addEventListener('input', ev => { const q = ev.target.value.trim().toLowerCase(); document.querySelectorAll('.pes').forEach(l => { l.hidden = q && !l.dataset.busca.includes(q); }); });
    document.querySelectorAll('[data-pesmenu]').forEach(b => b.onclick = () => menuPessoa(pes.find(p => p.matricula === b.dataset.pesmenu)));
    $('#bt-tv').onclick = () => { location.hash = 'tv'; };
    $('#eq-novo').onclick = () => editarEquip({ nome: '', exclusivo: true, max_qtd: 1, ativo: true, ordem: eqs.length });
    document.querySelectorAll('[data-admrm]').forEach(b => b.onclick = async () => { if (!await confirmar('Tirar da gestão?', `${b.dataset.admrm} deixa de receber e decidir os pedidos.`, 'Tirar')) return; try { await api('/api/logistica/admins', { method: 'POST', body: { matricula: b.dataset.admrm, remover: true } }); telaConfig(); } catch (e) { toast(e.message); } });
    $('#adm-add').onclick = async () => { try { await api('/api/logistica/admins', { method: 'POST', body: { matricula: $('#adm-mat').value } }); toast('Adicionado.'); telaConfig(); } catch (e) { toast(e.message); } };
    ligarInstalar();
  } catch (e) { $('#cf').innerHTML = `<div class="card"><p class="sub">${esc(e.message)}</p></div>`; }
}
function editarEquip(e) {
  folha(`<h2>${e.id ? 'Editar' : 'Novo'} equipamento</h2>
    <label class="campo"><span>Nome</span><input id="eq-n" value="${esc(e.nome)}" placeholder="Ex.: Caminhãozinho OMS"></label>
    <label class="campo"><span>Placa ou identificação (opcional)</span><input id="eq-i" value="${esc(e.identificacao || '')}"></label>
    <label class="campo"><span>Como funciona</span><select id="eq-x"><option value="1" ${e.exclusivo ? 'selected' : ''}>Um uso por vez (horário exclusivo)</option><option value="0" ${!e.exclusivo ? 'selected' : ''}>Pedido em quantidade (ex.: carreta da CBSI)</option></select></label>
    <label class="campo"><span>Quantidade máxima por pedido</span><input id="eq-q" type="number" min="1" max="20" value="${e.max_qtd || 1}"></label>
    <label class="campo" style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="eq-a" ${e.ativo ? 'checked' : ''} style="width:22px;min-height:22px"> <span style="margin:0">Disponível para pedir</span></label>
    <div class="btns"><button class="btn" data-x>Voltar</button><button class="btn pri" data-ok>Salvar</button></div>`, (f, fechar) => {
    f.querySelector('[data-x]').onclick = fechar;
    f.querySelector('[data-ok]').onclick = async () => {
      try {
        await api('/api/logistica/equipamentos', { method: 'POST', body: { id: e.id, nome: f.querySelector('#eq-n').value, identificacao: f.querySelector('#eq-i').value, exclusivo: f.querySelector('#eq-x').value === '1', max_qtd: Number(f.querySelector('#eq-q').value) || 1, ativo: f.querySelector('#eq-a').checked, ordem: e.ordem || 0, tipo: e.tipo } });
        fechar(); S.equipamentos = await api('/api/logistica/equipamentos'); toast('Salvo.'); telaConfig();
      } catch (err) { toast(err.message); }
    };
  });
}
async function telaCadastros() { ir('config'); }
function cadastrarPessoa() {
  folha(`<h2>Cadastrar pessoa</h2><p class="sub">Para quem não tem conta no OMS. A pessoa entra só neste app.</p>
    <label class="campo"><span>Matrícula</span><input id="cp-m" autocapitalize="characters" placeholder="Ex.: CBSI01"></label>
    <label class="campo"><span>Nome completo</span><input id="cp-n"></label>
    <label class="campo"><span>Setor / empresa</span><input id="cp-s" list="cp-setores" placeholder="Ex.: GMLC, CBSI"><datalist id="cp-setores">${S.eu.setores.concat(['CBSI']).map(x => `<option value="${esc(x)}">`).join('')}</datalist></label>
    <label class="campo"><span>Telefone (WhatsApp)</span><input id="cp-t" type="tel" inputmode="tel"></label>
    <p class="aviso sug">No primeiro acesso a senha é a própria matrícula. O app obriga a pessoa a criar uma senha nova.</p>
    <div class="btns"><button class="btn" data-x>Voltar</button><button class="btn pri" data-ok>Cadastrar</button></div>`, (f, fechar) => {
    f.querySelector('[data-x]').onclick = fechar;
    f.querySelector('[data-ok]').onclick = async () => {
      const v = id => f.querySelector(id).value;
      try {
        const r = await api('/api/logistica/pessoas', { method: 'POST', body: { matricula: v('#cp-m'), nome: v('#cp-n'), setor: v('#cp-s'), telefone: v('#cp-t') } });
        fechar();
        folha(`<h2>Cadastrado!</h2><p class="sub">Mande para a pessoa:</p><div class="card msg-pronta" id="msg">Seu acesso ao app da Logística está liberado.\nLink: ${location.origin}\nMatrícula: ${r.matricula}\nSenha no 1º acesso: ${r.matricula} (o app pede para trocar)</div>
          <div class="btns"><button class="btn pri" data-cp>Copiar mensagem</button><button class="btn" data-x>Fechar</button></div>`, (g, fch) => {
          g.querySelector('[data-x]').onclick = () => { fch(); telaConfig(); };
          g.querySelector('[data-cp]').onclick = async () => { try { await navigator.clipboard.writeText(g.querySelector('#msg').innerText); toast('Copiado. Cole no WhatsApp.'); } catch { toast('Não deu para copiar. Selecione o texto.'); } };
        });
      } catch (e) { toast(e.message); }
    };
  });
}
function menuPessoa(p) {
  folha(`<h2>${esc(nomeBonito(p.nome))}</h2><p class="sub">${esc(p.matricula)}${p.setor ? ' · ' + esc(p.setor) : ''} · ${p.pedidos} pedido(s)${p.ultimo_pedido ? ', último em ' + dataBR(p.ultimo_pedido) : ''}</p>
    ${p.telefone ? `<a class="btn largo" href="tel:${esc(p.telefone)}">📞 Ligar ${esc(p.telefone)}</a>` : ''}
    <button class="btn largo" data-hist>Ver pedidos dela</button>
    <button class="btn largo" data-reset>Zerar senha (volta a ser a matrícula)</button>
    <button class="btn largo ${p.ativo ? 'perigo' : 'ok'}" data-at>${p.ativo ? 'Desativar acesso' : 'Reativar acesso'}</button>
    <button class="btn largo" data-x>Fechar</button>`, (f, fechar) => {
    f.querySelector('[data-x]').onclick = fechar;
    f.querySelector('[data-hist]').onclick = () => { fechar(); S.dados.hist = { de: periodo(365), ate: periodo(-365), equipamento_id: '', setor: '', status: '', q: p.matricula.toLowerCase(), aba: 'lista' }; ir('historico'); };
    f.querySelector('[data-reset]').onclick = async () => {
      if (!await confirmar('Zerar a senha?', `A senha de ${nomeBonito(p.nome)} volta a ser a matrícula (${p.matricula}) e ela cria outra ao entrar.`, 'Zerar')) return;
      try { await api(`/api/logistica/pessoas/${p.matricula}/resetar-senha`, { method: 'POST' }); fechar(); toast('Senha zerada.'); telaConfig(); } catch (e) { toast(e.message); }
    };
    f.querySelector('[data-at]').onclick = async () => {
      if (p.ativo && !await confirmar('Desativar acesso?', `${nomeBonito(p.nome)} sai do app na hora e não consegue mais entrar. Os pedidos dela continuam no histórico.`, 'Desativar')) return;
      try { await api(`/api/logistica/pessoas/${p.matricula}/ativo`, { method: 'POST', body: { ativo: !p.ativo } }); fechar(); toast(p.ativo ? 'Acesso desativado.' : 'Acesso reativado.'); telaConfig(); } catch (e) { toast(e.message); }
    };
  });
}
function novoBloqueio(eqs) {
  folha(`<h2>Bloquear horário</h2><p class="sub">Ninguém consegue pedir nesse período. Use para manutenção, feriado ou parada.</p>
    <label class="campo"><span>Equipamento</span><select id="bl-eq">${eqs.filter(e => e.ativo).map(e => `<option value="${e.id}">${esc(e.nome)}</option>`).join('')}</select></label>
    <div class="dupla"><label class="campo"><span>De (dia)</span><input type="date" id="bl-d1" value="${amanha()}"></label><label class="campo"><span>Hora</span><input type="time" id="bl-h1" value="00:00"></label></div>
    <div class="dupla"><label class="campo"><span>Até (dia)</span><input type="date" id="bl-d2" value="${amanha()}"></label><label class="campo"><span>Hora</span><input type="time" id="bl-h2" value="23:59"></label></div>
    <label class="campo"><span>Motivo</span><input id="bl-m" placeholder="Ex.: Manutenção preventiva"></label>
    <div class="btns"><button class="btn" data-x>Voltar</button><button class="btn pri" data-ok>Bloquear</button></div>`, (f, fechar) => {
    f.querySelector('[data-x]').onclick = fechar;
    f.querySelector('[data-ok]').onclick = async () => {
      const v = id => f.querySelector(id).value;
      try {
        const r = await api('/api/logistica/bloqueios', { method: 'POST', body: { equipamento_id: Number(v('#bl-eq')), inicio: `${v('#bl-d1')} ${v('#bl-h1')}`, fim: `${v('#bl-d2')} ${v('#bl-h2')}`, motivo: v('#bl-m') } });
        fechar(); toast(r.pedidos_afetados ? `Bloqueado. Atenção: ${r.pedidos_afetados} pedido(s) aprovado(s) nesse período precisam ser remarcados.` : 'Horário bloqueado.'); telaConfig();
      } catch (e) { toast(e.message); }
    };
  });
}

// ------------------------------------------------------------------ histórico e números
function periodo(dias) { const d = new Date(); d.setDate(d.getDate() - dias); return isoDia(d); }
// o histórico também mostra o que já está agendado para frente (até 1 ano)
const ATE_PADRAO = () => periodo(-365);
async function telaHistorico() {
  const H = S.dados.hist || (S.dados.hist = { de: periodo(30), ate: ATE_PADRAO(), equipamento_id: '', setor: '', status: '', q: '', aba: 'lista' });
  const adm = S.eu.admin;
  moldura('Histórico', adm ? 'Todos os pedidos, com filtros' : 'Seus pedidos, com filtros', `
    ${adm ? `<div class="chips"><button class="chip ${H.aba === 'lista' ? 'on' : ''}" data-haba="lista">Lista</button><button class="chip ${H.aba === 'numeros' ? 'on' : ''}" data-haba="numeros">Números</button></div>` : ''}
    <div class="card filtros">
      <div class="chips chips-wrap">${[[7, 'Últimos 7 dias'], [30, 'Últimos 30 dias'], [90, 'Últimos 3 meses'], [365, 'Último ano']].map(([d, t]) => `<button class="chip ${H.de === periodo(d) && H.ate === ATE_PADRAO() ? 'on' : ''}" data-per="${d}">${t}</button>`).join('')}</div>
      <div class="dupla"><label class="campo"><span>De</span><input type="date" id="h-de" value="${H.de}"></label><label class="campo"><span>Até</span><input type="date" id="h-ate" value="${H.ate}"></label></div>
      ${H.aba === 'lista' ? `<div class="filtros-grid">
        <label class="campo"><span>Equipamento</span><select id="h-eq"><option value="">Todos</option>${S.equipamentos.map(e => `<option value="${e.id}" ${String(e.id) === String(H.equipamento_id) ? 'selected' : ''}>${esc(e.nome)}</option>`).join('')}</select></label>
        <label class="campo"><span>Setor</span><select id="h-setor"><option value="">Todos</option>${S.eu.setores.map(x => `<option ${x === H.setor ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
        <label class="campo"><span>Situação</span><select id="h-st"><option value="">Todas</option>${[['aprovado', 'Aprovado'], ['pendente', 'Aguardando'], ['recusado', 'Recusado'], ['cancelado', 'Cancelado']].map(([v, t]) => `<option value="${v}" ${v === H.status ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label class="campo"><span>Buscar</span><input id="h-q" value="${esc(H.q)}" placeholder="Nome, peça, origem, destino…"></label></div>` : ''}
    </div>
    <div id="h-res"><div class="card"><p class="sub">Carregando…</p></div></div>`);
  document.querySelectorAll('[data-haba]').forEach(b => b.onclick = () => { H.aba = b.dataset.haba; telaHistorico(); });
  document.querySelectorAll('[data-per]').forEach(b => b.onclick = () => { H.de = periodo(Number(b.dataset.per)); H.ate = ATE_PADRAO(); telaHistorico(); });
  const ler = () => { H.de = $('#h-de').value; H.ate = $('#h-ate').value; if ($('#h-eq')) Object.assign(H, { equipamento_id: $('#h-eq').value, setor: $('#h-setor').value, status: $('#h-st').value, q: $('#h-q').value }); };
  ['#h-de', '#h-ate', '#h-eq', '#h-setor', '#h-st'].forEach(id => $(id) && $(id).addEventListener('change', () => { ler(); telaHistorico(); }));
  let t; $('#h-q') && $('#h-q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { ler(); carregarHist(); }, 400); });
  H.aba === 'numeros' && adm ? carregarNumeros() : carregarHist();
}
async function carregarHist() {
  const H = S.dados.hist, el = $('#h-res'); if (!el) return;
  const qs = new URLSearchParams({ de: H.de, ate: H.ate }); ['equipamento_id', 'setor', 'status', 'q'].forEach(k => H[k] && qs.set(k, H[k]));
  try {
    const d = await api(`/api/logistica/historico?${qs}`); S.dados.histItens = d.itens;
    const r = d.resumo;
    el.innerHTML = `<div class="resumo resumo4"><div class="res"><b>${r.total}</b><span>pedidos</span></div><div class="res"><b>${r.aprovado}</b><span>aprovados</span></div><div class="res"><b>${r.recusado}</b><span>recusados</span></div><div class="res"><b>${r.cancelado}</b><span>cancelados</span></div></div>
      ${d.itens.length ? `<button class="btn largo" id="h-csv" style="margin:0 0 6px">⬇ Baixar planilha (Excel)</button>
      <div class="card tabela">${d.itens.map(i => `<div class="hl">
        <div class="hl-q"><b>${dataBR(i.inicio)}</b><small>${i.inicio.slice(11, 16)}–${i.fim.slice(11, 16)}</small></div>
        <div class="hl-o"><b>${esc(i.equipamento)}${i.quantidade > 1 ? ' ×' + i.quantidade : ''}${i.urgente ? ' 🚨' : ''}</b><small>${esc(nomeBonito(i.solicitante_nome) || i.solicitante)}${i.setor ? ' · ' + esc(i.setor) : ''}</small>
          <small>${esc(i.origem)} → ${esc(i.destino)} · ${esc(i.carga)}${i.equip_oms_id ? ' · 🔧 ' + esc(i.equip_oms_id) : ''}</small>${i.status === 'recusado' && i.motivo ? `<small class="ruim">Motivo: ${esc(i.motivo)}</small>` : ''}</div>
        <span class="selo ${i.fase === 'entregue' ? 'entregue' : i.status}">${i.fase === 'entregue' ? 'Entregue' : esc(i.status_nome)}</span></div>`).join('')}</div>
      ${d.itens.length >= 500 ? '<p class="mini">Mostrando os 500 mais recentes. Diminua o período para ver o resto.</p>' : ''}`
      : '<div class="vazio"><b>Nada nesse período</b>Mude as datas ou os filtros.</div>'}`;
    $('#h-csv') && ($('#h-csv').onclick = () => baixarCSV(d.itens, `logistica_${H.de}_a_${H.ate}.csv`));
  } catch (e) { el.innerHTML = `<div class="card"><p class="sub">${esc(e.message)}</p></div>`; }
}
function baixarCSV(itens, nome) {
  const col = [['Data', i => dataBR(i.inicio).slice(0, 5) + '/' + i.inicio.slice(0, 4)], ['Início', i => i.inicio.slice(11, 16)], ['Fim', i => i.fim.slice(11, 16)], ['Equipamento', i => i.equipamento], ['Qtd', i => i.quantidade],
    ['Solicitante', i => nomeBonito(i.solicitante_nome) || i.solicitante], ['Matrícula', i => i.solicitante], ['Setor', i => i.setor], ['Origem', i => i.origem], ['Destino', i => i.destino], ['Carga', i => i.carga],
    ['Peça OMS', i => i.equip_oms_id], ['Emergência', i => i.urgente ? 'Sim' : 'Não'], ['Situação', i => i.fase === 'entregue' ? 'Entregue' : i.status_nome], ['Motivo', i => i.motivo],
    ['Pedido em', i => dataBR(i.criado_em)], ['Decidido por', i => nomeBonito(i.decidido_por_nome)], ['Decidido em', i => dataBR(i.decidido_em)], ['Saiu', i => dataBR(i.saiu_em)], ['Entregue', i => dataBR(i.entregue_em)]];
  const cel = v => { const t = String(v ?? ''); return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  const csv = '\ufeff' + [col.map(c => c[0]).join(';'), ...itens.map(i => col.map(c => cel(c[1](i))).join(';'))].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = nome; document.body.appendChild(a); a.click(); a.remove();
}
function barras(lista, total) {
  if (!lista.length) return '<p class="sub">Sem dados.</p>';
  const mx = Math.max(...lista.map(x => x.total));
  return lista.map(x => `<div class="barra"><span class="barra-n">${esc(x.nome)}</span><span class="barra-t"><i style="width:${Math.max(3, 100 * x.total / mx)}%"></i></span><b>${x.total}</b>${total ? `<small>${Math.round(100 * x.total / total)}%</small>` : ''}</div>`).join('');
}
const tempoTxt = m => m == null ? '—' : m < 60 ? `${m} min` : m < 1440 ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}` : `${(m / 1440).toFixed(1).replace('.', ',')} dias`;
async function carregarNumeros() {
  const H = S.dados.hist, el = $('#h-res');
  try {
    const r = await api(`/api/logistica/relatorio?de=${H.de}&ate=${H.ate}`);
    el.innerHTML = `<div class="kpis">
      <div class="kpi"><b>${r.total}</b><span>pedidos</span></div>
      <div class="kpi"><b>${tempoTxt(r.tempo_resposta_min)}</b><span>tempo médio de resposta</span></div>
      <div class="kpi"><b>${r.recusados_pct == null ? '—' : r.recusados_pct + '%'}</b><span>recusados</span></div>
      <div class="kpi"><b>${r.emergencias}</b><span>emergências</span></div>
      <div class="kpi"><b>${r.entregues}</b><span>entregues</span></div>
      <div class="kpi"><b>${tempoTxt(r.tempo_transporte_min)}</b><span>tempo médio de transporte</span></div></div>
      <div class="graf-grid">
        <div class="card"><p class="sec">Por equipamento</p>${barras(r.por_equipamento, r.total)}</div>
        <div class="card"><p class="sec">Por setor</p>${barras(r.por_setor, r.total)}</div>
        <div class="card"><p class="sec">Situação</p>${barras(r.por_status, r.total)}</div>
        <div class="card"><p class="sec">Por mês</p>${barras(r.por_mes.map(x => ({ ...x, nome: x.nome.slice(5) + '/' + x.nome.slice(0, 4) })))}</div>
        <div class="card"><p class="sec">Quem mais pede</p>${barras(r.quem_mais_pede.map(x => ({ ...x, nome: nomeBonito(x.nome) })))}</div>
        <div class="card"><p class="sec">Motivos de recusa</p>${barras(r.motivos_recusa)}</div>
      </div>
      <p class="mini">Tempo de resposta: do pedido até a logística aprovar ou recusar. Tempo de transporte: de "Saiu" até "Entregue".</p>`;
  } catch (e) { el.innerHTML = `<div class="card"><p class="sub">${esc(e.message)}</p></div>`; }
}

// ------------------------------------------------------------------ visão geral (início dos gestores)
async function telaInicio() {
  moldura('Visão geral', `Olá, ${primeiroNome(S.eu.nome)}`, `<div id="vg"><div class="card"><p class="sub">Carregando…</p></div></div>`);
  try {
    const v = await api('/api/logistica/visao');
    const h = v.hoje_resumo, m = v.mes;
    const max = Math.max(1, ...v.semana.map(d => d.aprovado + d.pendente));
    const alerta = [];
    if (v.emergencias) alerta.push(`<a class="alerta-it urg" href="#painel">🚨 ${v.emergencias} emergência(s) esperando decisão</a>`);
    if (h.atrasados) alerta.push(`<a class="alerta-it" href="#painel">⏰ ${h.atrasados} transporte(s) de hoje passaram do horário sem sair</a>`);
    if (v.cadastros) alerta.push(`<a class="alerta-it" href="#config">👤 ${v.cadastros} pedido(s) de cadastro para liberar</a>`);
    $('#vg').innerHTML = `
      ${alerta.length ? `<div class="alertas">${alerta.join('')}</div>` : ''}
      <div class="kpis vg-kpis">
        <a class="kpi ${v.para_decidir ? 'quente' : ''}" href="#painel"><b>${v.para_decidir}</b><span>para decidir</span></a>
        <a class="kpi" href="#painel"><b>${v.esperando_resposta}</b><span>esperando a pessoa</span></a>
        <a class="kpi" href="#agenda"><b>${h.total}</b><span>transportes hoje</span></a>
        <a class="kpi" href="#agenda"><b>${h.a_caminho}</b><span>a caminho agora</span></a>
      </div>
      <div class="vg-grid">
        <div class="card"><div class="eq-cab"><b>Hoje</b><span>${h.entregues}/${h.total} entregues</span></div>
          ${v.hoje.length ? v.hoje.map(p => `<div class="vg-hoje ${p.atrasado ? 'atrasado' : ''} ${p.agora ? 'agora' : ''}"><span class="sem-h">${p.inicio.slice(11, 16)}<small>${p.fim.slice(11, 16)}</small></span>
            <span class="sem-d"><b>${esc(p.equipamento)}${p.quantidade > 1 ? ' ×' + p.quantidade : ''}${p.urgente ? ' 🚨' : ''}</b><small>${esc(p.origem)} → ${esc(p.destino)} · ${esc(nomeBonito(p.solicitante_nome))}</small></span>
            <span class="selo ${p.fase === 'entregue' ? 'entregue' : p.fase === 'a_caminho' ? 'caminho' : p.atrasado ? 'recusado' : 'aprovado'}">${p.fase === 'entregue' ? 'Entregue' : p.fase === 'a_caminho' ? 'A caminho' : p.atrasado ? 'Atrasado' : p.agora ? 'Agora' : 'Aguardando'}</span></div>`).join('')
            : '<p class="sub" style="margin-top:8px">Nenhum transporte aprovado para hoje.</p>'}
          <a class="btn largo" href="#painel" style="margin-top:12px">Marcar saída / entrega</a></div>
        <div class="card"><div class="eq-cab"><b>Esta semana</b><a class="link" href="#agenda">ver horários</a></div>
          <div class="vg-sem">${v.semana.map(d => { const dt = new Date(d.dia + 'T12:00'); return `<a class="vg-col ${d.dia === hoje() ? 'hoje' : ''}" href="#agenda">
            <span class="vg-bar"><i class="a" style="height:${100 * d.aprovado / max}%"></i><i class="p" style="height:${100 * d.pendente / max}%"></i></span>
            <b>${d.aprovado + d.pendente || ''}</b><small>${SEMANA[dt.getDay()]}</small></a>`; }).join('')}</div>
          <div class="legenda"><span><i></i>Aprovado</span><span><i class="p"></i>Para aprovar</span></div></div>
        <div class="card"><div class="eq-cab"><b>Este mês</b><a class="link" href="#historico" data-num>ver números</a></div>
          <div class="kpis mini-kpis"><div class="kpi"><b>${m.total}</b><span>pedidos</span></div><div class="kpi"><b>${tempoTxt(m.tempo_resposta_min)}</b><span>resposta média</span></div>
            <div class="kpi"><b>${m.recusados_pct == null ? '—' : m.recusados_pct + '%'}</b><span>recusados</span></div><div class="kpi"><b>${m.emergencias}</b><span>emergências</span></div></div>
          <p class="sec">Por setor</p>${barras(m.por_setor, m.total)}</div>
      </div>
      <div class="btns"><a class="btn pri" href="#pedir">+ Novo pedido</a><a class="btn" href="#tv">Quadro de transportes</a></div>`;
    const num = document.querySelector('[data-num]'); if (num) num.onclick = () => { S.dados.hist = { de: isoDia(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), ate: periodo(-365), equipamento_id: '', setor: '', status: '', q: '', aba: 'numeros' }; };
  } catch (e) { $('#vg').innerHTML = `<div class="card"><p class="sub">${esc(e.message)}</p></div>`; }
}

// ------------------------------------------------------------------ quadro de transportes (telão; rota #tv mantida)
async function telaTV() {
  clearInterval(S.tvTimer);
  const desenharTV = async () => {
    if (S.tela !== 'tv') return clearInterval(S.tvTimer);
    try {
      const [l, bl] = await Promise.all([api(`/api/logistica/agenda?inicio=${hoje()}&dias=2`), api(`/api/logistica/bloqueios?inicio=${hoje()}&dias=2`)]);
      const agora = new Date(), hh = `${pad(agora.getHours())}:${pad(agora.getMinutes())}`;
      const col = (dia, rot) => `<div class="tv-col"><h2>${rot} <small>${dataBR(dia)}</small></h2>${S.equipamentos.map(e => {
        const ps = l.filter(p => p.equipamento_id === e.id && p.inicio.slice(0, 10) <= dia && p.fim.slice(0, 10) >= dia);
        const bs = bl.filter(b => b.equipamento_id === e.id && b.inicio.slice(0, 10) <= dia && b.fim.slice(0, 10) >= dia);
        return `<div class="tv-eq"><h3>${esc(e.nome)}</h3>${bs.map(b => `<div class="tv-it bloq">⛔ Bloqueado${b.motivo ? ' · ' + esc(b.motivo) : ''}</div>`).join('')}
          ${ps.length ? ps.map(p => { const agoraNela = dia === hoje() && p.inicio.slice(11, 16) <= hh && p.fim.slice(11, 16) > hh;
            return `<div class="tv-it ${p.status} ${agoraNela ? 'agora' : ''}"><span class="tv-h">${p.inicio.slice(11, 16)}–${p.fim.slice(11, 16)}</span><span class="tv-d"><b>${esc(p.origem)} → ${esc(p.destino)}${p.quantidade > 1 ? ' · ' + p.quantidade + ' un.' : ''}</b><small>${esc(nomeBonito(p.solicitante_nome))}${p.setor ? ' · ' + esc(p.setor) : ''}${p.status === 'pendente' ? ' · aguardando' : ''}${p.urgente ? ' · 🚨' : ''}</small></span></div>`; }).join('') : '<div class="tv-livre">Livre</div>'}</div>`;
      }).join('')}</div>`;
      $('#app').innerHTML = `<div class="tv"><header><img src="icons/icon-192.png" alt=""><b>OMS Logística</b><span class="tv-hora">${hh}</span><button class="btn" onclick="location.hash='config'">Sair do quadro</button></header>
        <div class="tv-grid">${col(hoje(), 'Hoje')}${col(amanha(), 'Amanhã')}</div></div>`;
    } catch { /* sem sinal: tenta de novo no próximo minuto */ }
  };
  await desenharTV();
  S.tvTimer = setInterval(desenharTV, 60 * 1000);
}

// ------------------------------------------------------------------ instalar e notificações
let eventoInstalar = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); eventoInstalar = e; const b = $('#bt-instalar'); if (b) b.hidden = false; });
const ehIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const instalado = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
function htmlInstalar(card) {
  if (instalado()) return '';
  const txt = ehIOS ? 'No iPhone: toque em Compartilhar e depois em "Adicionar à Tela de Início".' : 'Instale para abrir direto da tela do celular e receber os avisos.';
  return `<div class="card instalar" style="${card ? '' : 'margin-top:24px'}"><img src="icons/icon-192.png" alt=""><div style="flex:1"><b>Instalar o app</b><p class="sub">${txt}</p></div>${ehIOS ? '' : `<button class="btn pri" id="bt-instalar" ${eventoInstalar ? '' : 'hidden'}>Instalar</button>`}</div>`;
}
function ligarInstalar() { const b = $('#bt-instalar'); if (b) b.onclick = async () => { if (!eventoInstalar) return; eventoInstalar.prompt(); await eventoInstalar.userChoice; eventoInstalar = null; b.hidden = true; }; }

function b64(s) { const p = '='.repeat((4 - s.length % 4) % 4); const r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...r].map(c => c.charCodeAt(0))); }
async function ativarPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !S.sessao) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    let perm = Notification.permission;
    if (perm === 'default') perm = await Notification.requestPermission();
    if (perm !== 'granted') return;
    const { publicKey } = await api('/api/push/vapid_public_key');
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(publicKey) });
    const j = sub.toJSON();
    await api('/api/push/subscribe', { method: 'POST', body: { matricula: S.sessao.matricula, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, app: 'logistica' } });
  } catch { /* notificação é opcional */ }
}

// ------------------------------------------------------------------ início
// Atualização: quando sai versão nova, aparece um aviso fixo com o botão "Atualizar".
function avisoAtualizar(reg) {
  if (document.getElementById('bn-atualizar')) return;
  const d = document.createElement('div'); d.id = 'bn-atualizar'; d.className = 'atualizar';
  d.innerHTML = '<span><b>Nova versão disponível</b><small>Toque para atualizar o app</small></span><button class="btn pri" type="button">Atualizar</button>';
  d.querySelector('button').onclick = () => { d.querySelector('button').disabled = true; (reg.waiting || reg.installing)?.postMessage('ATUALIZAR'); setTimeout(() => location.reload(), 2500); };
  document.body.appendChild(d);
}
if ('serviceWorker' in navigator && !LOCAL) {
  const tinhaControle = !!navigator.serviceWorker.controller;
  let recarregando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (tinhaControle && !recarregando) { recarregando = true; location.reload(); } });
  navigator.serviceWorker.register('sw.js').then(reg => {
    if (reg.waiting && navigator.serviceWorker.controller) avisoAtualizar(reg);
    reg.addEventListener('updatefound', () => {
      const n = reg.installing; if (!n) return;
      n.addEventListener('statechange', () => { if (n.state === 'installed' && navigator.serviceWorker.controller) avisoAtualizar(reg); });
    });
    const procurar = () => reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') procurar(); });
    setInterval(procurar, 30 * 60 * 1000);
  }).catch(() => {});
}
if (S.sessao) renovar();
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && S.sessao && S.eu) {
    try { S.eu = await api('/api/logistica/eu'); } catch { return; /* sem sinal */ }
    if (['meus', 'painel', 'agenda', 'inicio'].includes(S.tela) && !document.querySelector('.fundo')) desenhar();
  }
});
desenhar();
