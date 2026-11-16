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
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2800); }
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
const TELAS_LOGADO = ['pedir', 'agenda', 'meus', 'painel', 'cadastros', 'config'];
function ir(tela) { if (location.hash !== '#' + tela) location.hash = tela; else desenhar(); }
window.addEventListener('hashchange', () => desenhar());

async function desenhar() {
  let tela = (location.hash || '').slice(1) || (S.sessao ? 'pedir' : 'login');
  if (!S.sessao && !['login', 'cadastro'].includes(tela)) tela = 'login';
  if (S.sessao && ['login', 'cadastro'].includes(tela)) tela = 'pedir';
  if (S.sessao && !TELAS_LOGADO.includes(tela)) tela = 'pedir';
  if (S.sessao && !S.eu) {
    $('#app').innerHTML = '<div class="carregando"><div class="spin"></div></div>';
    try { await carregarEu(); } catch (e) { if (!S.sessao) return; $('#app').innerHTML = `<div class="login"><p class="tit">Não deu para carregar</p><p class="sub">${esc(e.message)}</p><button class="btn pri largo" onclick="location.reload()">Tentar de novo</button></div>`; return; }
    ativarPush();
  }
  if (['painel', 'cadastros', 'config'].includes(tela) && !S.eu?.admin) tela = 'pedir';
  S.tela = tela;
  const R = { login: telaLogin, cadastro: telaCadastro, pedir: telaPedir, agenda: telaAgenda, meus: telaMeus, painel: telaPainel, cadastros: telaCadastros, config: telaConfig }[tela];
  await R();
}

function moldura(titulo, sub, corpo) {
  const a = S.eu?.admin;
  const n = (S.eu?.pedidos_pendentes || 0), c = (S.eu?.cadastros_pendentes || 0);
  const item = (t, rot, ico, b) => `<a href="#${t}" class="${S.tela === t ? 'on' : ''}">${b ? `<span class="bolha">${b}</span>` : ''}${ICO[ico]}${rot}</a>`;
  $('#app').innerHTML = `
  <header class="topo"><img src="icons/icon-192.png" alt=""><div class="topo-tit"><b>${esc(titulo)}</b><span>${esc(sub)}</span></div>
    <button class="btn-ico" id="bt-sair" aria-label="Sair">${ICO.sair}</button></header>
  <main class="conteudo">${corpo}</main>
  <nav class="nav"><div class="nav-in">
    ${item('pedir', 'Pedir', 'pedir')}${item('agenda', 'Agenda', 'agenda')}${item('meus', a ? 'Meus' : 'Meus pedidos', 'meus')}
    ${a ? item('painel', 'Logística', 'painel', n || '') + item('config', 'Ajustes', 'config', c || '') : ''}
  </div></nav>`;
  $('#bt-sair').onclick = async () => { if (await confirmar('Sair do app?', 'Você vai precisar da matrícula e da senha para entrar de novo.', 'Sair')) sair(); };
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
      S.eu = null; ir('pedir');
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

async function telaPedir() {
  const F = S.form;
  if (!F.equipamento_id && S.equipamentos[0]) Object.assign(F, { equipamento_id: S.equipamentos[0].id, data: amanha(), inicio: '07:30', fim: '09:30', quantidade: 1, setor: S.eu.setor && S.eu.setores.includes(S.eu.setor) ? S.eu.setor : '', urgente: false });
  const fila = lerJSON(FILA) || [];
  moldura('Novo pedido', `Olá, ${primeiroNome(S.eu.nome)}`, S.equipamentos.length ? `
    ${fila.length ? `<div class="aviso sug">📶 ${fila.length} pedido(s) esperando sinal para enviar. <button class="link" id="p-fila">Enviar agora</button></div>` : ''}
    <p class="sec">O que você precisa</p>
    <div class="chips" id="p-eq">${S.equipamentos.map(e => `<button class="chip chip-eq ${e.id === F.equipamento_id ? 'on' : ''}" data-eq="${e.id}">${e.exclusivo ? ICO.painel : ICO.carreta}<span>${esc(e.nome)}<small>${e.exclusivo ? 'um uso por vez' : `até ${e.max_qtd} por pedido`}</small></span></button>`).join('')}</div>
    <div id="p-qtd"></div>
    <p class="sec">Quando</p>
    <div class="chips" id="p-dias">${proximosDias(10).map(d => `<button class="chip dia-chip ${d.iso === F.data ? 'on' : ''}" data-dia="${d.iso}"><small>${d.sem}</small><b>${d.dia}</b></button>`).join('')}</div>
    <div class="dupla" style="margin-top:12px">
      <label class="campo" style="margin:0"><span>Início</span><input type="time" id="p-ini" value="${F.inicio}" step="900"></label>
      <label class="campo" style="margin:0"><span>Fim</span><input type="time" id="p-fim" value="${F.fim}" step="900"></label>
    </div>
    <div class="card" id="p-ocupacao"><p class="sub">Carregando a agenda do dia…</p></div>
    <p class="sec">Detalhes</p>
    <label class="campo"><span>Setor que está pedindo</span><select id="p-setor"><option value="">Escolha</option>${S.eu.setores.map(s => `<option ${s === F.setor ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label>
    <div class="dupla">
      <label class="campo"><span>Origem</span><input id="p-orig" value="${esc(F.origem || '')}" placeholder="Ex.: Oficina"></label>
      <label class="campo"><span>Destino</span><input id="p-dest" value="${esc(F.destino || '')}" placeholder="Ex.: MCC 4"></label>
    </div>
    <label class="campo"><span>O que vai transportar</span><input id="p-carga" value="${esc(F.carga || '')}" placeholder="Ex.: Molde M-02, 2 segmentos"></label>
    <label class="campo"><span>Observação (opcional)</span><textarea id="p-obs" placeholder="Peso, contato no local, cuidados…">${esc(F.observacao || '')}</textarea></label>
    <label class="card" style="display:flex;gap:12px;align-items:center;cursor:pointer"><input type="checkbox" id="p-urg" ${F.urgente ? 'checked' : ''} style="width:24px;min-height:24px;accent-color:var(--erro)">
      <span><b>É emergência</b><br><span class="sub">A logística recebe o aviso como emergência e vê o pedido primeiro.</span></span></label>
    <p class="erro-msg" id="p-erro" hidden></p>
    <button class="btn pri largo" id="p-enviar">Enviar pedido</button>` : '<div class="vazio"><b>Nenhum equipamento cadastrado</b>A logística ainda não cadastrou os equipamentos.</div>');
  if (!S.equipamentos.length) return;
  const salvar = () => Object.assign(F, { inicio: $('#p-ini').value, fim: $('#p-fim').value, setor: $('#p-setor').value, origem: $('#p-orig').value, destino: $('#p-dest').value, carga: $('#p-carga').value, observacao: $('#p-obs').value, urgente: $('#p-urg').checked });
  document.querySelectorAll('[data-eq]').forEach(b => b.onclick = () => { salvar(); F.equipamento_id = Number(b.dataset.eq); F.quantidade = 1; telaPedir(); });
  document.querySelectorAll('[data-dia]').forEach(b => b.onclick = () => { salvar(); F.data = b.dataset.dia; telaPedir(); });
  ['#p-ini', '#p-fim'].forEach(s => $(s).addEventListener('change', () => { salvar(); desenharOcupacao(); }));
  desenharQtd();
  $('#p-fila') && ($('#p-fila').onclick = enviarFila);
  $('#p-enviar').onclick = async () => {
    salvar();
    const er = $('#p-erro'); er.hidden = true;
    const corpo = { equipamento_id: F.equipamento_id, inicio: `${F.data} ${F.inicio}`, fim: `${F.fim <= F.inicio ? diaSeguinte(F.data) : F.data} ${F.fim}`, origem: F.origem, destino: F.destino, carga: F.carga, observacao: F.observacao, setor: F.setor, quantidade: F.quantidade, urgente: F.urgente };
    if (!F.setor) { er.textContent = 'Escolha o setor.'; er.hidden = false; return; }
    if (!F.origem.trim() || !F.destino.trim() || !F.carga.trim()) { er.textContent = 'Preencha origem, destino e o que vai transportar.'; er.hidden = false; return; }
    const bt = $('#p-enviar'); bt.disabled = true;
    try {
      const r = await api('/api/logistica/pedidos', { method: 'POST', body: corpo });
      S.form = { equipamento_id: F.equipamento_id, data: F.data, inicio: F.inicio, fim: F.fim, quantidade: 1, setor: F.setor, urgente: false };
      toast(r.disputa ? 'Pedido enviado. Outra pessoa também pediu esse horário: a logística decide.' : 'Pedido enviado para a logística.');
      ir('meus');
    } catch (e) {
      if (e.rede) {
        const fila = lerJSON(FILA) || []; fila.push(corpo); gravarJSON(FILA, fila);
        toast('Sem sinal: o pedido fica guardado e é enviado quando a conexão voltar.');
        S.form = { equipamento_id: F.equipamento_id, data: F.data, inicio: F.inicio, fim: F.fim, quantidade: 1, setor: F.setor };
        telaPedir();
      } else { er.textContent = e.message; er.hidden = false; bt.disabled = false; }
    }
  };
  desenharOcupacao();
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
    const lista = await api(`/api/logistica/agenda?inicio=${S.form.data}&dias=1&equipamento_id=${e.id}`);
    if (!$('#p-ocupacao')) return;
    const ini = S.form.inicio, fim = S.form.fim;
    const choque = e.exclusivo && lista.some(p => p.status === 'aprovado' && p.inicio.slice(11, 16) < (fim > ini ? fim : '24:00') && p.fim.slice(11, 16) > ini && p.inicio.slice(0, 10) === S.form.data);
    el.innerHTML = `<div class="eq-cab"><b>${esc(e.nome)} · ${dataBR(S.form.data)}</b><span>${lista.length ? `${lista.length} reserva(s)` : 'livre o dia todo'}</span></div>
      ${trilho(lista, S.form.data, { ini, fim })}
      ${choque ? '<div class="aviso conf">Esse horário já tem reserva aprovada. Escolha outro horário.</div>' : ''}
      ${!e.exclusivo ? '<p class="mini">A carreta é fornecida pela CBSI: pode haver mais de um pedido no mesmo horário. A logística confirma.</p>' : ''}
      ${lista.map(linhaReserva).join('')}`;
  } catch (err) { el.innerHTML = `<p class="sub">${esc(err.message)}</p>`; }
}
function minutos(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
function trilho(lista, dia, sel) {
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
  return `<div class="trilho">${lista.map(p => `<div class="bloco ${p.status} ${p.meu ? 'meu' : ''}" style="${pos(p)}" title="${esc(p.inicio.slice(11, 16))}–${esc(p.fim.slice(11, 16))}"></div>`).join('')}${s}</div>
    <div class="horas"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>24h</span></div>`;
}
function linhaReserva(p) {
  return `<div class="reserva"><span class="hora">${p.inicio.slice(11, 16)}–${p.fim.slice(11, 16)}</span>
    <span class="det"><b>${esc(p.setor || '—')}</b> · ${esc(p.origem)} → ${esc(p.destino)}${p.quantidade > 1 ? ` · ${p.quantidade} un.` : ''}<br>
    ${p.status === 'pendente' ? '<span style="color:var(--alerta)">aguardando a logística</span>' : 'aprovado'}${p.urgente ? ' · 🚨 emergência' : ''}${p.meu ? ' · seu pedido' : ` · ${esc(primeiroNome(p.solicitante_nome))}`}</span></div>`;
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
  S.dados.dia = S.dados.dia || hoje();
  const dia = S.dados.dia;
  moldura('Agenda', 'Reservas aprovadas e pedidos aguardando', `
    <div class="chips">${proximosDias(14).map(d => `<button class="chip dia-chip ${d.iso === dia ? 'on' : ''}" data-dia="${d.iso}"><small>${d.sem}</small><b>${d.dia}</b></button>`).join('')}</div>
    <div class="legenda"><span><i></i>Aprovado</span><span><i class="p"></i>Aguardando a logística</span></div>
    <div id="ag-lista"><div class="card"><p class="sub">Carregando…</p></div></div>`);
  document.querySelectorAll('[data-dia]').forEach(b => b.onclick = () => { S.dados.dia = b.dataset.dia; telaAgenda(); });
  try {
    const lista = await api(`/api/logistica/agenda?inicio=${dia}&dias=1`);
    $('#ag-lista').innerHTML = S.equipamentos.map(e => {
      const meus = lista.filter(p => p.equipamento_id === e.id);
      return `<div class="card eq"><div class="eq-cab"><b>${esc(e.nome)}</b><span>${meus.length ? `${meus.length} reserva(s)` : 'livre'}</span></div>
        ${trilho(meus, dia)}${meus.map(linhaReserva).join('')}
        <button class="btn largo" data-pedir="${e.id}" style="margin-top:12px">Pedir ${esc(e.nome)} neste dia</button></div>`;
    }).join('');
    document.querySelectorAll('[data-pedir]').forEach(b => b.onclick = () => { Object.assign(S.form, { equipamento_id: Number(b.dataset.pedir), data: dia, quantidade: 1 }); ir('pedir'); });
  } catch (e) { $('#ag-lista').innerHTML = `<div class="card"><p class="sub">${esc(e.message)}</p></div>`; }
}

// ------------------------------------------------------------------ meus pedidos
function cartaoPedido(p, admin) {
  const rot = { pendente: 'Aguardando', aprovado: 'Aprovado', recusado: 'Recusado', cancelado: 'Cancelado', sugerido: 'Aguardando' }[p.status] || p.status;
  const ativo = ['pendente', 'aprovado'].includes(p.status) && p.fim >= `${hoje()} 00:00`;
  return `<div class="card ped st-${p.status} ${p.urgente && p.status === 'pendente' ? 'urg' : ''}">
    <div class="ped-top"><h3>${p.urgente ? '🚨 ' : ''}${esc(p.equipamento)}${p.quantidade > 1 ? ` <span class="sub">× ${p.quantidade}</span>` : ''}</h3><span class="selo ${p.status}">${rot}</span></div>
    <p class="ped-quando">${quando(p)}</p>
    <p class="ped-rota"><b>${esc(p.origem)}</b> → <b>${esc(p.destino)}</b> · ${esc(p.carga)}</p>
    ${admin ? `<p class="ped-rota">${esc(p.solicitante_nome || p.solicitante)}${p.setor ? ' · ' + esc(p.setor) : ''}${p.solicitante_telefone ? ` · <a href="tel:${esc(p.solicitante_telefone)}" style="color:var(--marca)">${esc(p.solicitante_telefone)}</a>` : ''}</p>` : ''}
    ${p.observacao ? `<p class="mini">“${esc(p.observacao)}”</p>` : ''}
    ${p.reagendado && p.status === 'aprovado' ? `<div class="aviso sug">A logística remarcou: você pediu ${dataBR(p.sugestao_inicio)}.${p.motivo ? ' ' + esc(p.motivo) : ''}</div>` : ''}
    ${p.status === 'recusado' && p.motivo ? `<div class="aviso conf">Motivo: ${esc(p.motivo)}</div>` : ''}
    ${admin && p.conflitos?.length ? `<div class="aviso conf">Choca com: ${p.conflitos.map(c => `${esc(c.nome || '')} ${c.inicio.slice(11)}–${c.fim.slice(11)} (${c.status === 'aprovado' ? 'aprovado' : 'aguardando'})`).join('; ')}</div>` : ''}
    ${admin && ['pendente', 'sugerido'].includes(p.status) ? `<div class="btns"><button class="btn ok" data-ap="${p.id}">Aprovar</button><button class="btn" data-rm="${p.id}">Remarcar</button><button class="btn perigo" data-rc="${p.id}">Recusar</button></div>` : ''}
    ${admin && p.status === 'aprovado' ? `<div class="btns"><button class="btn" data-rm="${p.id}">Remarcar</button><button class="btn perigo" data-cn="${p.id}">Cancelar</button></div>` : ''}
    ${!admin && ativo ? `<div class="btns"><button class="btn perigo" data-cn="${p.id}">Cancelar pedido</button></div>` : ''}
    ${p.decidido_por_nome && p.status !== 'pendente' ? `<p class="mini">${p.status === 'cancelado' ? 'Cancelado' : 'Decidido'} por ${esc(primeiroNome(p.decidido_por_nome))} em ${dataBR(p.decidido_em)}</p>` : `<p class="mini">Pedido em ${dataBR(p.criado_em)}</p>`}
  </div>`;
}
function ligarAcoes(recarregar) {
  const acao = async (id, body, msg) => { try { await api(`/api/logistica/pedidos/${id}/decidir`, { method: 'POST', body }); toast(msg); S.eu = await api('/api/logistica/eu'); recarregar(); } catch (e) { toast(e.message); } };
  document.querySelectorAll('[data-ap]').forEach(b => b.onclick = () => acao(b.dataset.ap, { acao: 'aprovar' }, 'Aprovado. Quem pediu foi avisado.'));
  document.querySelectorAll('[data-rc]').forEach(b => b.onclick = () => folha(`<h2>Recusar pedido</h2><p class="sub">Quem pediu vai ver o motivo.</p>
      <label class="campo"><span>Motivo</span><textarea id="rc-m" placeholder="Ex.: carreta da CBSI indisponível nesse dia"></textarea></label><div class="btns"><button class="btn" data-x>Voltar</button><button class="btn pri" data-ok>Recusar</button></div>`,
    (f, fechar) => { f.querySelector('[data-x]').onclick = fechar; f.querySelector('[data-ok]').onclick = () => { const m = f.querySelector('#rc-m').value.trim(); if (!m) return toast('Escreva o motivo.'); fechar(); acao(b.dataset.rc, { acao: 'recusar', motivo: m }, 'Recusado. Quem pediu foi avisado.'); }; }));
  document.querySelectorAll('[data-rm]').forEach(b => {
    b.onclick = () => {
      const p = (S.dados.pedidos || []).find(x => String(x.id) === b.dataset.rm) || {};
      const d = (p.inicio || '').slice(0, 10) || amanha();
      folha(`<h2>Remarcar</h2><p class="sub">O pedido fica aprovado no novo dia e horário, e quem pediu é avisado.</p>
        <label class="campo"><span>Dia</span><input type="date" id="rm-d" value="${d}"></label>
        <div class="dupla"><label class="campo"><span>Início</span><input type="time" id="rm-i" value="${(p.inicio || '').slice(11, 16) || '07:30'}"></label><label class="campo"><span>Fim</span><input type="time" id="rm-f" value="${(p.fim || '').slice(11, 16) || '09:30'}"></label></div>
        <label class="campo"><span>Recado (opcional)</span><input id="rm-m" placeholder="Ex.: CBSI só tem carreta à tarde"></label>
        <div class="btns"><button class="btn" data-x>Voltar</button><button class="btn pri" data-ok>Remarcar e aprovar</button></div>`, (f, fechar) => {
        f.querySelector('[data-x]').onclick = fechar;
        f.querySelector('[data-ok]').onclick = () => {
          const dia = f.querySelector('#rm-d').value, i = f.querySelector('#rm-i').value, fi = f.querySelector('#rm-f').value;
          fechar(); acao(b.dataset.rm, { acao: 'remarcar', inicio: `${dia} ${i}`, fim: `${fi <= i ? diaSeguinte(dia) : dia} ${fi}`, motivo: f.querySelector('#rm-m').value }, 'Remarcado e aprovado. Quem pediu foi avisado.');
        };
      });
    };
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
  moldura('Logística', 'Decida os pedidos', `
    <div class="chips"><button class="chip ${aba === 'pendente' ? 'on' : ''}" data-aba="pendente">Para decidir${S.eu.pedidos_pendentes ? ` <small>(${S.eu.pedidos_pendentes})</small>` : ''}</button>
    <button class="chip ${aba === 'proximos' ? 'on' : ''}" data-aba="proximos">Aprovados próximos</button>
    <button class="chip ${aba === 'recusado' ? 'on' : ''}" data-aba="recusado">Recusados</button></div>
    <div id="pn-lista"><div class="card"><p class="sub">Carregando…</p></div></div>`);
  document.querySelectorAll('[data-aba]').forEach(b => b.onclick = () => { S.dados.abaPainel = b.dataset.aba; telaPainel(); });
  try {
    const lista = await api(`/api/logistica/pedidos?status=${aba}`); S.dados.pedidos = lista;
    $('#pn-lista').innerHTML = lista.length ? lista.map(p => cartaoPedido(p, true)).join('')
      : `<div class="vazio"><b>${aba === 'pendente' ? 'Nada para decidir' : 'Nada aqui'}</b>${aba === 'pendente' ? 'Quando alguém pedir, você recebe um aviso no celular.' : ''}</div>`;
    ligarAcoes(telaPainel);
  } catch (e) { $('#pn-lista').innerHTML = `<div class="card"><p class="sub">${esc(e.message)}</p></div>`; }
}

// ------------------------------------------------------------------ ajustes (cadastros, equipamentos, ADMs)
async function telaConfig() {
  moldura('Ajustes', 'Cadastros, equipamentos e quem gerencia', '<div id="cf"><div class="card"><p class="sub">Carregando…</p></div></div>');
  try {
    const [cads, eqs, adms] = await Promise.all([api('/api/logistica/cadastros'), api('/api/logistica/equipamentos?todos=true'), api('/api/logistica/admins')]);
    $('#cf').innerHTML = `
      <p class="sec">Pedidos de cadastro</p>
      <div class="card">${cads.length ? cads.map(c => `<div class="lista-linha"><div><b>${esc(c.nome)}</b><small>${esc(c.matricula)} · ${esc(c.setor || '')}${c.telefone ? ' · ' + esc(c.telefone) : ''}</small></div>
        <button class="btn ok" data-cok="${c.id}">Liberar</button><button class="btn perigo" data-cno="${c.id}" aria-label="Recusar">✕</button></div>`).join('') : '<p class="sub">Nenhum pedido de cadastro.</p>'}</div>
      <p class="sec">Equipamentos</p>
      <div class="card">${eqs.map(e => `<div class="lista-linha"><div><b>${esc(e.nome)}</b><small>${e.exclusivo ? 'Um uso por vez' : `Pedido em quantidade (até ${e.max_qtd})`}${e.identificacao ? ' · ' + esc(e.identificacao) : ''}${e.ativo ? '' : ' · desativado'}</small></div>
        <button class="btn" data-eqed="${e.id}">Editar</button></div>`).join('')}
        <button class="btn largo" id="eq-novo">+ Novo equipamento</button></div>
      <p class="sec">Quem gerencia (técnicos da logística)</p>
      <div class="card">${adms.map(a => `<div class="lista-linha"><div><b>${esc(a.nome || a.matricula)}</b><small>${esc(a.matricula)}</small></div>${a.matricula !== S.sessao.matricula ? `<button class="btn perigo" data-admrm="${esc(a.matricula)}">Tirar</button>` : '<small>você</small>'}</div>`).join('')}
        <div class="dupla" style="margin-top:12px;grid-template-columns:1fr auto"><input id="adm-mat" placeholder="Matrícula" autocapitalize="characters"><button class="btn pri" id="adm-add">Adicionar</button></div>
        <p class="mini">Quem gerencia recebe os pedidos, aprova, remarca e libera cadastros. A pessoa precisa ter conta (OMS ou cadastro aprovado).</p></div>
      ${htmlInstalar(true)}`;
    const decidir = async (id, aprovar) => { try { await api(`/api/logistica/cadastros/${id}/decidir`, { method: 'POST', body: { aprovar } }); toast(aprovar ? 'Acesso liberado.' : 'Pedido recusado.'); S.eu = await api('/api/logistica/eu'); telaConfig(); } catch (e) { toast(e.message); } };
    document.querySelectorAll('[data-cok]').forEach(b => b.onclick = () => decidir(b.dataset.cok, true));
    document.querySelectorAll('[data-cno]').forEach(b => b.onclick = async () => { if (await confirmar('Recusar cadastro?', 'A pessoa não vai conseguir entrar.', 'Recusar')) decidir(b.dataset.cno, false); });
    document.querySelectorAll('[data-eqed]').forEach(b => b.onclick = () => editarEquip(eqs.find(e => e.id === Number(b.dataset.eqed))));
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
if ('serviceWorker' in navigator && !LOCAL) navigator.serviceWorker.register('sw.js').catch(() => {});
if (S.sessao) renovar();
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && S.sessao && S.eu) {
    try { S.eu = await api('/api/logistica/eu'); } catch { return; /* sem sinal */ }
    if (['meus', 'painel', 'agenda'].includes(S.tela) && !document.querySelector('.fundo')) desenhar();
  }
});
desenhar();
