import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Eye,
  ImagePlus,
  Mail,
  MessageCircle,
  Plus,
  Printer,
  RefreshCcw,
  Save,
  Search,
  Timer,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './style.css';
import logoBRS from './assets/logo-brs.png';
import { supabase } from './supabaseClient';

const origemOptions = ['Interno', 'Externo'];
const processoInternoOptions = ['Engenharia', 'Layout', 'Fábrica', 'PCP', 'Vendas', 'Expedição'];
const processoExternoOptions = ['Transporte', 'Armazenamento', 'Montagem'];
const engenhariaOptions = ['Projeto', 'Sem Revisão', 'Sem Cotas', 'Desenho Errado'];
const layoutOptions = ['Erro de Projeto Civil', 'Projeto Errado', 'Cotas Erradas', 'Posição Errada', 'Equipamento Faltando', 'Revisão'];
const fabricaOptions = ['Laser', 'Corte', 'Dobra', 'Prensa', 'Solda', 'Pintura', 'Montagem', 'Identificação'];
const pcpOptions = ['Quantidade', 'Código Errado', 'Usinagem'];
const vendasOptions = [
  'Especificação incorreta',
  'Informação comercial incorreta',
  'Pedido / cadastro incorreto',
  'Equipamento faltando na venda',
  'Projeto vendido divergente',
  'Falha de alinhamento comercial',
  'Pós-venda',
];
const expedicaoOptions = [
  'Conferência de embarque',
  'Embalagem / Proteção',
  'Identificação',
  'Carregamento',
  'Transporte / Logística',
  'Documentação',
];
const transporteOptions = ['Avaria no transporte', 'Equipamento danificado', 'Peça danificada', 'Entrega incorreta'];
const armazenamentoOptions = ['Avaria por armazenamento', 'Oxidação', 'Peça perdida', 'Equipamento danificado'];
const montagemExternaOptions = ['Peça Faltando', 'Peça Errada', 'Projeto Errado', 'Montagem incorreta', 'Ajuste em campo'];
const severidadeOptions = ['Baixa', 'Média', 'Alta', 'Crítica'];
const statusOptions = ['Aberto', 'Em análise', 'Respondido', 'Resolvido', 'Cancelado', 'Garantia negada'];
const responsavelFinanceiroOptions = ['Garantia BRS', 'Cliente', 'Fornecedor', 'Montagem', 'Comercial', 'Rateado'];

const CHART_COLORS = ['#1f4e79', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#ea580c', '#0f766e'];
const CHART_GRID = '#dbe7f3';
const CHART_TEXT = '#486581';


const initialForm = {
  status: 'Aberto',
  origem: 'Externo',
  processo: 'Transporte',
  etapa: 'Avaria no transporte',
  severidade: 'Média',
  responsavelFinanceiro: 'Garantia BRS',
  custoPecas: 0,
  custoMaoObra: 0,
  custoDeslocamento: 0,
  custoTerceiros: 0,
};

function moeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dataBr(data) {
  if (!data) return '-';
  const d = new Date(String(data).includes('T') ? data : `${data}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR');
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function somarDias(dataBase, dias) {
  const data = dataBase ? new Date(`${dataBase}T00:00:00`) : new Date();
  data.setDate(data.getDate() + dias);
  return data.toISOString().slice(0, 10);
}

function diferencaDias(dataFinal) {
  if (!dataFinal) return null;
  const hoje = new Date(`${hojeISO()}T00:00:00`);
  const prazo = new Date(`${dataFinal}T00:00:00`);
  if (Number.isNaN(prazo.getTime())) return null;
  return Math.ceil((prazo - hoje) / (1000 * 60 * 60 * 24));
}

function normalizarRn(r = {}) {
  const dataAbertura = r.data_abertura || r.created_at || r.data || null;
  const prazo = r.prazo_solucao || r.prazo_resposta || r.prazo_resolucao || r.prazo || null;
  return {
    ...r,
    data_abertura: dataAbertura,
    prazo_solucao: prazo,
    custo_total: Number(r.custo_total || r.custo || 0),
    custo_pecas: Number(r.custo_pecas || 0),
    custo_mao_obra: Number(r.custo_mao_obra || 0),
    custo_deslocamento: Number(r.custo_deslocamento || 0),
    custo_terceiros: Number(r.custo_terceiros || 0),
    solucao_final: r.solucao_final || r.resposta_solucao || '',
    diagnostico: r.diagnostico || r.diagnostico_tecnico || '',
    problema: r.problema || r.problema_relatado || '',
    tecnico: r.tecnico || r.tecnico_responsavel || '',
    runrun: r.runrun || r.runrun_id || r.runrun_link || '',
  };
}

function calcAlerta(r = {}) {
  const rn = normalizarRn(r);
  const status = rn.status || 'Aberto';
  if (['Resolvido', 'Cancelado', 'Garantia negada'].includes(status)) {
    return { nivel: 'ok', texto: 'Concluído', dias: null };
  }

  const dias = diferencaDias(rn.prazo_solucao);
  const semResposta = !String(rn.solucao_final || '').trim();

  if (dias !== null && dias < 0 && semResposta) return { nivel: 'critico', texto: `Crítico (${Math.abs(dias)} dia${Math.abs(dias) === 1 ? '' : 's'} venc.)`, dias };
  if (dias !== null && dias < 0) return { nivel: 'vencido', texto: `Vencido (${Math.abs(dias)} dia${Math.abs(dias) === 1 ? '' : 's'})`, dias };
  if (dias === 0) return { nivel: 'atencao', texto: 'Vence hoje', dias };
  if (dias !== null && dias <= 2) return { nivel: 'atencao', texto: `Faltam ${dias} dia${dias === 1 ? '' : 's'}`, dias };
  if (rn.severidade === 'Crítica' && semResposta) return { nivel: 'critico', texto: 'Crítico', dias };
  return { nivel: 'normal', texto: 'No prazo', dias };
}

function statusBadge(status) {
  const texto = status || 'Aberto';
  if (texto === 'Resolvido') return 'ok';
  if (texto === 'Respondido') return 'respondido';
  if (texto === 'Em análise') return 'analise';
  if (['Cancelado', 'Garantia negada'].includes(texto)) return 'cancelado';
  return 'aberto';
}

function gerarProximoNumero(rns) {
  const ano = new Date().getFullYear();
  const maiores = rns
    .map((rn) => String(rn.numero || '').match(/RN-\d{4}-(\d+)/))
    .filter(Boolean)
    .map((m) => Number(m[1]));
  const proximo = maiores.length ? Math.max(...maiores) + 1 : 1;
  return `RN-${ano}-${String(proximo).padStart(4, '0')}`;
}


function resumoCompartilhamentoRn(rn = {}) {
  const alerta = calcAlerta(rn);
  return [
    `RN: ${rn.numero || '-'}`,
    `Cliente: ${rn.cliente || '-'}`,
    `Pedido/OP: ${rn.pedido || '-'}`,
    `Equipamento: ${rn.equipamento || '-'}`,
    `Origem: ${rn.origem || '-'}`,
    `Processo/Etapa: ${rn.processo || '-'} / ${rn.etapa || '-'}`,
    `Status: ${rn.status || 'Aberto'}`,
    `Prazo: ${dataBr(rn.prazo_solucao)} (${alerta.texto})`,
    `Problema: ${rn.problema || '-'}`,
    `Diagnóstico: ${rn.diagnostico || '-'}`,
    `Solução/Resposta: ${rn.solucao_final || rn.acao_corretiva || '-'}`,
  ].join('\n');
}

function enviarEmailRn(rn = {}) {
  const assunto = encodeURIComponent(`RN ${rn.numero || ''} - ${rn.cliente || 'BRS'}`);
  const corpo = encodeURIComponent(resumoCompartilhamentoRn(rn));
  window.location.href = `mailto:?subject=${assunto}&body=${corpo}`;
}

function enviarWhatsappRn(rn = {}) {
  const texto = encodeURIComponent(resumoCompartilhamentoRn(rn));
  window.open(`https://wa.me/?text=${texto}`, '_blank', 'noopener,noreferrer');
}

function App() {
  const [tab, setTab] = useState('dashboard');
  const [rns, setRns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState(initialForm);
  const [fotos, setFotos] = useState([]);
  const [rnSelecionada, setRnSelecionada] = useState(null);
  const [resposta, setResposta] = useState({
    diagnostico: '',
    causa_raiz: '',
    acao_corretiva: '',
    solucao_final: '',
    responsavel_resposta: '',
    status: 'Respondido',
    responsavel_financeiro: 'Garantia BRS',
    custo_pecas: 0,
    custo_mao_obra: 0,
    custo_deslocamento: 0,
    custo_terceiros: 0,
  });

  useEffect(() => {
    carregarRns();
  }, []);

  async function carregarRns() {
    setLoading(true);
    setErro('');
    const { data, error } = await supabase.from('rn_ocorrencias').select('*').order('id', { ascending: false });
    setLoading(false);
    if (error) {
      console.error(error);
      setErro('Erro ao carregar RNs do Supabase. Confira a tabela rn_ocorrencias e as policies.');
      return;
    }
    setRns((data || []).map(normalizarRn));
  }

  function abrirDetalhe(rn) {
    const normalizada = normalizarRn(rn);
    setRnSelecionada(normalizada);
    setResposta({
      diagnostico: normalizada.diagnostico || '',
      causa_raiz: normalizada.causa_raiz || '',
      acao_corretiva: normalizada.acao_corretiva || '',
      solucao_final: normalizada.solucao_final || '',
      responsavel_resposta: normalizada.responsavel_resposta || '',
      status: normalizada.solucao_final ? 'Respondido' : normalizada.status || 'Em análise',
      responsavel_financeiro: normalizada.responsavel_financeiro || 'Garantia BRS',
      custo_pecas: Number(normalizada.custo_pecas || 0),
      custo_mao_obra: Number(normalizada.custo_mao_obra || 0),
      custo_deslocamento: Number(normalizada.custo_deslocamento || 0),
      custo_terceiros: Number(normalizada.custo_terceiros || 0),
    });
    setTab('detalhe');
  }

  function atualizarOrigem(origem) {
    const processo = origem === 'Externo' ? 'Transporte' : 'Engenharia';
    const etapa = origem === 'Externo' ? 'Avaria no transporte' : 'Projeto';
    setForm((old) => ({ ...old, origem, processo, etapa }));
  }

  function atualizarProcesso(processo) {
    const primeiraEtapa = getEtapas(processo)[0] || '';
    setForm((old) => ({ ...old, processo, etapa: primeiraEtapa }));
  }

  function getEtapas(processo) {
    if (processo === 'Engenharia') return engenhariaOptions;
    if (processo === 'Layout') return layoutOptions;
    if (processo === 'PCP') return pcpOptions;
    if (processo === 'Vendas') return vendasOptions;
    if (processo === 'Expedição') return expedicaoOptions;
    if (processo === 'Transporte') return transporteOptions;
    if (processo === 'Armazenamento') return armazenamentoOptions;
    if (processo === 'Montagem') return montagemExternaOptions;
    return fabricaOptions;
  }

  function adicionarFotos(e) {
    const arquivos = Array.from(e.target.files || []);
    const novasFotos = arquivos.map((file) => ({ nome: file.name, url: URL.createObjectURL(file) }));
    setFotos((old) => [...old, ...novasFotos]);
  }

  function limparFormulario() {
    setForm(initialForm);
    setFotos([]);
  }

  async function salvarRn(e) {
    e.preventDefault();
    const numero = gerarProximoNumero(rns);
    const dataAbertura = hojeISO();
    const totalCusto = Number(form.custoPecas || 0) + Number(form.custoMaoObra || 0) + Number(form.custoDeslocamento || 0) + Number(form.custoTerceiros || 0);

    const novo = {
      numero,
      data_abertura: dataAbertura,
      prazo_solucao: form.prazo || somarDias(dataAbertura, 5),
      cliente: form.cliente || 'Sem cliente',
      pedido: form.pedido || '',
      equipamento: form.equipamento || '',
      origem: form.origem,
      processo: form.processo,
      etapa: form.etapa,
      severidade: form.severidade,
      status: 'Aberto',
      tecnico: form.tecnico || '',
      runrun: form.runrun || '',
      problema: form.problema || '',
      diagnostico: form.diagnostico || '',
      causa_raiz: form.causaRaiz || '',
      acao_corretiva: form.acaoCorretiva || '',
      solucao_final: form.solucaoFinal || '',
      responsavel_financeiro: form.responsavelFinanceiro,
      responsavel_resposta: form.responsavelResposta || '',
      data_resposta: form.solucaoFinal ? new Date().toISOString() : null,
      custo_pecas: Number(form.custoPecas || 0),
      custo_mao_obra: Number(form.custoMaoObra || 0),
      custo_deslocamento: Number(form.custoDeslocamento || 0),
      custo_terceiros: Number(form.custoTerceiros || 0),
      custo_total: totalCusto,
      fotos_json: JSON.stringify(fotos),
    };

    const { data, error } = await supabase
      .from('rn_ocorrencias')
      .insert([novo])
      .select('*')
      .single();

    if (error) {
      console.error(error);
      alert('Erro ao salvar RN. Se aparecer coluna inexistente, rode o SQL de atualização que está no ZIP.');
      return;
    }

    const rnSalva = normalizarRn(data || novo);
    setRns((old) => [rnSalva, ...old.filter((r) => r.numero !== rnSalva.numero)]);
    limparFormulario();
    alert(`RN ${numero} salva com sucesso!`);
    abrirDetalhe(rnSalva);
    carregarRns();
  }

  async function salvarResposta() {
    if (!rnSelecionada?.id) return;
    if (!String(resposta.diagnostico || '').trim() || !String(resposta.solucao_final || '').trim() || !String(resposta.responsavel_resposta || '').trim()) {
      alert('Preencha diagnóstico, solução/resposta e responsável antes de salvar a resposta.');
      return;
    }

    const custoTotalResposta =
      Number(resposta.custo_pecas || 0) +
      Number(resposta.custo_mao_obra || 0) +
      Number(resposta.custo_deslocamento || 0) +
      Number(resposta.custo_terceiros || 0);

    const update = {
      diagnostico: resposta.diagnostico,
      causa_raiz: resposta.causa_raiz,
      acao_corretiva: resposta.acao_corretiva,
      solucao_final: resposta.solucao_final,
      responsavel_resposta: resposta.responsavel_resposta,
      responsavel_financeiro: resposta.responsavel_financeiro || rnSelecionada.responsavel_financeiro || 'Garantia BRS',
      custo_pecas: Number(resposta.custo_pecas || 0),
      custo_mao_obra: Number(resposta.custo_mao_obra || 0),
      custo_deslocamento: Number(resposta.custo_deslocamento || 0),
      custo_terceiros: Number(resposta.custo_terceiros || 0),
      custo_total: custoTotalResposta,
      data_resposta: rnSelecionada.data_resposta || new Date().toISOString(),
      status: resposta.status || 'Respondido',
    };

    const { error } = await supabase.from('rn_ocorrencias').update(update).eq('id', rnSelecionada.id);
    if (error) {
      console.error(error);
      alert('Erro ao salvar resposta. Confira se as colunas novas foram criadas no Supabase.');
      return;
    }

    const atualizada = { ...rnSelecionada, ...update };
    setRnSelecionada(atualizada);
    setRns((old) => old.map((r) => (r.id === atualizada.id ? normalizarRn(atualizada) : r)));
    alert('Resposta/solução salva com sucesso!');
  }

  async function atualizarStatus(status) {
    if (!rnSelecionada?.id) return;
    const update = { status };
    if (status === 'Resolvido') update.data_fechamento = new Date().toISOString();
    const { error } = await supabase.from('rn_ocorrencias').update(update).eq('id', rnSelecionada.id);
    if (error) {
      console.error(error);
      alert('Erro ao atualizar status.');
      return;
    }
    const atualizada = { ...rnSelecionada, ...update };
    setRnSelecionada(atualizada);
    setRns((old) => old.map((r) => (r.id === atualizada.id ? normalizarRn(atualizada) : r)));
  }

  const rnsFiltradas = useMemo(() => {
    const texto = busca.trim().toLowerCase();
    if (!texto) return rns;
    return rns.filter((r) => [r.numero, r.cliente, r.pedido, r.equipamento, r.origem, r.processo, r.etapa, r.status, r.problema]
      .filter(Boolean)
      .some((campo) => String(campo).toLowerCase().includes(texto)));
  }, [busca, rns]);

  const indicadores = useMemo(() => {
    const abertas = rns.filter((r) => !['Resolvido', 'Cancelado', 'Garantia negada'].includes(r.status)).length;
    const vencidas = rns.filter((r) => ['critico', 'vencido'].includes(calcAlerta(r).nivel)).length;
    const criticas = rns.filter((r) => r.severidade === 'Crítica' || calcAlerta(r).nivel === 'critico').length;
    const respondidas = rns.filter((r) => String(r.solucao_final || '').trim()).length;
    const resolvidas = rns.filter((r) => r.status === 'Resolvido').length;
    const emAnalise = rns.filter((r) => r.status === 'Em análise').length;
    const custoTotal = rns.reduce((s, r) => s + Number(r.custo_total || 0), 0);
    const respondidasComData = rns.filter((r) => r.data_abertura && r.data_resposta);
    const tempoMedio = respondidasComData.length
      ? Math.round(respondidasComData.reduce((s, r) => {
          const ini = new Date(`${r.data_abertura}T00:00:00`);
          const fim = new Date(r.data_resposta);
          return s + Math.max(0, Math.ceil((fim - ini) / (1000 * 60 * 60 * 24)));
        }, 0) / respondidasComData.length)
      : 0;
    return { abertas, vencidas, criticas, respondidas, resolvidas, emAnalise, custoTotal, tempoMedio };
  }, [rns]);

  const porOrigem = useMemo(() => Object.values(rns.reduce((acc, r) => {
    const chave = r.origem || 'Sem origem';
    acc[chave] ||= { nome: chave, qtd: 0, custo: 0 };
    acc[chave].qtd += 1;
    acc[chave].custo += Number(r.custo_total || 0);
    return acc;
  }, {})), [rns]);

  const porCategoria = useMemo(() => Object.values(rns.reduce((acc, r) => {
    const chave = `${r.processo || 'Sem processo'} - ${r.etapa || 'Sem etapa'}`;
    acc[chave] ||= { nome: chave, qtd: 0 };
    acc[chave].qtd += 1;
    return acc;
  }, {})), [rns]);

  const custoPorProcesso = useMemo(() => Object.values(rns.reduce((acc, r) => {
    const chave = r.processo || 'Sem processo';
    acc[chave] ||= { nome: chave, custo: 0, qtd: 0 };
    acc[chave].custo += Number(r.custo_total || 0);
    acc[chave].qtd += 1;
    return acc;
  }, {})).sort((a, b) => b.custo - a.custo), [rns]);

  const custosMes = useMemo(() => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const mapa = meses.map((mes) => ({ mes, custo: 0 }));
    rns.forEach((r) => {
      const data = new Date(r.data_abertura || r.created_at || Date.now());
      if (!Number.isNaN(data.getTime())) mapa[data.getMonth()].custo += Number(r.custo_total || 0);
    });
    return mapa;
  }, [rns]);

  return (
    <div className="app">
      <aside className="sidebar noPrint">
        <div className="brand">
          <div className="logo">BRS</div>
          <div><strong>Sistema RN</strong><span>Assistência Técnica</span></div>
        </div>
        <button onClick={() => setTab('dashboard')} className={tab === 'dashboard' ? 'active' : ''}><BarChart3 size={18} /> Dashboard</button>
        <button onClick={() => { limparFormulario(); setTab('novo'); }} className={tab === 'novo' ? 'active' : ''}><Plus size={18} /> Novo RN</button>
        <button onClick={() => setTab('lista')} className={tab === 'lista' ? 'active' : ''}><ClipboardList size={18} /> Lista RN</button>
      </aside>

      <main>
        {erro && <div className="erroBox noPrint">{erro}</div>}

        {tab === 'dashboard' && (
          <>
            <Header title="Dashboard RN" subtitle="Controle de não conformidades, prazos de resposta e custos." />
            <section className="cards cardsSix">
              <Card icon={<ClipboardList />} label="RN abertas" value={indicadores.abertas} />
              <Card icon={<Timer />} label="Em análise" value={indicadores.emAnalise} />
              <Card icon={<AlertTriangle />} label="Vencidas / críticas" value={indicadores.vencidas} />
              <Card icon={<CheckCircle2 />} label="Respondidas" value={indicadores.respondidas} />
              <Card icon={<CheckCircle2 />} label="Resolvidas" value={indicadores.resolvidas} />
              <Card icon={<DollarSign />} label="Custo total" value={moeda(indicadores.custoTotal)} />
            </section>

            <section className="grid">
              <Panel title="RN por origem">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={porOrigem}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="nome" tick={{ fill: CHART_TEXT }} />
                    <YAxis tick={{ fill: CHART_TEXT }} />
                    <Tooltip />
                    <Bar dataKey="qtd" radius={[8, 8, 0, 0]} fill="#1f4e79" />
                  </BarChart>
                </ResponsiveContainer>
              </Panel>

              <Panel title="RN por categoria">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={porCategoria} dataKey="qtd" nameKey="nome" outerRadius={90} label>
                      {porCategoria.map((entry, index) => (
                        <Cell key={`categoria-${entry.nome || index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Panel>

              <Panel title="Custo mensal">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={custosMes}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="mes" tick={{ fill: CHART_TEXT }} />
                    <YAxis tick={{ fill: CHART_TEXT }} />
                    <Tooltip formatter={(value) => moeda(value)} />
                    <Line type="monotone" dataKey="custo" stroke="#16a34a" strokeWidth={4} dot={{ r: 5, fill: '#16a34a' }} activeDot={{ r: 7 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Panel>

              <Panel title="Custo por processo">
                <div className="rankingList">
                  {custoPorProcesso.slice(0, 6).map((item) => (
                    <div className="rankingItem" key={item.nome}>
                      <span>{item.nome}</span>
                      <strong>{moeda(item.custo)}</strong>
                      <em>{item.qtd} RN</em>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Alertas em aberto">
                <div className="alertList">
                  {rns.filter((r) => !['Resolvido', 'Cancelado', 'Garantia negada'].includes(r.status)).slice(0, 8).map((r) => {
                    const alerta = calcAlerta(r);
                    return (
                      <button className={`alert ${alerta.nivel}`} key={r.id || r.numero} onClick={() => abrirDetalhe(r)}>
                        <strong>{r.numero}</strong>
                        <span>{r.cliente || 'Sem cliente'} — {r.processo || '-'} / {r.etapa || '-'}</span>
                        <em>{alerta.texto} • Prazo: {dataBr(r.prazo_solucao)}</em>
                      </button>
                    );
                  })}
                </div>
              </Panel>
            </section>
          </>
        )}

        {tab === 'novo' && (
          <>
            <Header title="Novo Registro RN" subtitle="A abertura gera prazo automático de 5 dias. Depois de salvar, a RN abre com opções de imprimir, e-mail e WhatsApp." />
            <form className="form" onSubmit={salvarRn}>
              <Section title="Identificação">
                <Field label="Cliente" value={form.cliente || ''} onChange={(v) => setForm({ ...form, cliente: v })} required />
                <Field label="Pedido / OP" value={form.pedido || ''} onChange={(v) => setForm({ ...form, pedido: v })} />
                <Field label="Equipamento" value={form.equipamento || ''} onChange={(v) => setForm({ ...form, equipamento: v })} />
                <Field label="Técnico / responsável" value={form.tecnico || ''} onChange={(v) => setForm({ ...form, tecnico: v })} />
              </Section>

              <Section title="Origem e classificação">
                <Select label="Origem" value={form.origem} options={origemOptions} onChange={atualizarOrigem} />
                <Select label="Processo" value={form.processo} options={form.origem === 'Externo' ? processoExternoOptions : processoInternoOptions} onChange={atualizarProcesso} />
                <Select label="Seção / etapa" value={form.etapa} options={getEtapas(form.processo)} onChange={(v) => setForm({ ...form, etapa: v })} />
                <Select label="Severidade" value={form.severidade} options={severidadeOptions} onChange={(v) => setForm({ ...form, severidade: v })} />
              </Section>

              <Section title="Descrição técnica">
                <Textarea label="Problema relatado" value={form.problema || ''} onChange={(v) => setForm({ ...form, problema: v })} required />
                <Textarea label="Diagnóstico inicial / ação executada" value={form.diagnostico || ''} onChange={(v) => setForm({ ...form, diagnostico: v })} />
              </Section>

              <Section title="Runrun.it e prazo">
                <Field label="ID / link Runrun.it" value={form.runrun || ''} onChange={(v) => setForm({ ...form, runrun: v })} />
                <Field label="Prazo de resposta" type="date" value={form.prazo || somarDias(hojeISO(), 5)} onChange={(v) => setForm({ ...form, prazo: v })} />
                <Select label="Responsável financeiro" value={form.responsavelFinanceiro} options={responsavelFinanceiroOptions} onChange={(v) => setForm({ ...form, responsavelFinanceiro: v })} />
              </Section>

              <Section title="Fotos da ocorrência">
                <label className="wide inputFile"><ImagePlus size={18} /> Adicionar fotos<input type="file" accept="image/*" multiple onChange={adicionarFotos} /></label>
                <div className="fotosGrid wide">
                  {fotos.map((foto, index) => <div className="fotoCard" key={`${foto.nome}-${index}`}><img src={foto.url} alt={foto.nome} /><span>{foto.nome}</span></div>)}
                </div>
              </Section>

              <div className="acoesForm">
                <button type="button" className="secondary" onClick={limparFormulario}><RefreshCcw size={18} /> Limpar</button>
                <button className="primary"><Save size={18} /> Salvar e abrir RN</button>
              </div>
            </form>
          </>
        )}

        {tab === 'lista' && (
          <>
            <Header title="Lista de RN" subtitle="Clique em uma RN para visualizar, responder, alterar status ou reimprimir." />
            <div className="toolbar noPrint">
              <div className="searchBox"><Search size={18} /><input placeholder="Buscar por RN, cliente, pedido, status, problema..." value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
              <button className="secondary" onClick={carregarRns}><RefreshCcw size={18} /> Atualizar</button>
            </div>

            <div className="table">
              {loading ? <p>Carregando RNs...</p> : (
                <table>
                  <thead><tr><th>RN</th><th>Cliente</th><th>Origem</th><th>Categoria</th><th>Status</th><th>Responsável</th><th>Prazo</th><th>SLA</th><th>Custo</th><th>Alerta</th><th>Ação</th></tr></thead>
                  <tbody>
                    {rnsFiltradas.map((r) => {
                      const alerta = calcAlerta(r);
                      return (
                        <tr key={r.id || r.numero} className={`clickableRow rowAlerta ${alerta.nivel}`} onClick={() => abrirDetalhe(r)}>
                          <td><strong>{r.numero}</strong></td>
                          <td>{r.cliente || '-'}</td>
                          <td>{r.origem || '-'}</td>
                          <td>{r.processo || '-'} - {r.etapa || '-'}</td>
                          <td><span className={`status ${statusBadge(r.status)}`}>{r.status || 'Aberto'}</span></td>
                          <td>{r.responsavel_resposta || r.tecnico || '-'}</td>
                          <td>{dataBr(r.prazo_solucao)}</td>
                          <td>{alerta.dias === null ? '-' : alerta.dias < 0 ? `${Math.abs(alerta.dias)} dia(s) vencido` : `${alerta.dias} dia(s)`}</td>
                          <td>{moeda(r.custo_total)}</td>
                          <td><span className={`pill ${alerta.nivel}`}>{alerta.texto}</span></td>
                          <td><button className="miniButton" type="button"><Eye size={16} /> Abrir</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {tab === 'detalhe' && rnSelecionada && (
          <DetalheRn
            rn={rnSelecionada}
            resposta={resposta}
            setResposta={setResposta}
            salvarResposta={salvarResposta}
            atualizarStatus={atualizarStatus}
            voltar={() => setTab('lista')}
          />
        )}
      </main>
    </div>
  );
}

function DetalheRn({ rn, resposta, setResposta, salvarResposta, atualizarStatus, voltar }) {
  const alerta = calcAlerta(rn);
  let fotos = [];
  try { fotos = rn.fotos_json ? JSON.parse(rn.fotos_json) : []; } catch { fotos = []; }

  const custoTotalResposta =
    Number(resposta.custo_pecas || 0) +
    Number(resposta.custo_mao_obra || 0) +
    Number(resposta.custo_deslocamento || 0) +
    Number(resposta.custo_terceiros || 0);

  return (
    <div className="detalhePage">
      <div className="detailActions noPrint">
        <button className="secondary" onClick={voltar}><ArrowLeft size={18} /> Voltar para lista</button>
        <button className="secondary" onClick={() => window.print()}><Printer size={18} /> Reimprimir RN</button>
        <button className="email" onClick={() => enviarEmailRn(rn)}><Mail size={18} /> Enviar por e-mail</button>
        <button className="whatsapp" onClick={() => enviarWhatsappRn(rn)}><MessageCircle size={18} /> Enviar por WhatsApp</button>
      </div>

      <div className="printArea">
        <div className="cabecalhoRelatorio">
          <div className="logoRelatorio"><img src={logoBRS} alt="BRS Equipamentos" /></div>
          <div><h2>Relatório de RN</h2><p>Registro de Não Conformidade — Assistência Técnica</p></div>
        </div>

        <section className="detailHeader detailHeaderPro">
          <div className="rnIdentity rnIdentityMega">
            <span className="labelTop">Registro</span>
            <h1>{rn.numero}</h1>
            <div className="rnClientPedidoLine">
              <div className="rnClientAvatar">👤</div>
              <div className="rnClientText">
                <strong>{rn.cliente || 'Sem cliente'}</strong>
                <span>Pedido/OP <b>{rn.pedido || '-'}</b></span>
              </div>
            </div>
          </div>

          <div className="detailBadges detailBadgesMega">
            <span className={`status ${statusBadge(rn.status)}`}>{rn.status || 'Aberto'}</span>
            <span className={`pill ${alerta.nivel}`}>{alerta.texto}</span>
          </div>
        </section>

        <section className="rnResumoTopo">
          <div><span>Equipamento</span><strong>{rn.equipamento || '-'}</strong></div>
          <div><span>Origem</span><strong>{rn.origem || '-'}</strong></div>
          <div><span>Processo / etapa</span><strong>{rn.processo || '-'} / {rn.etapa || '-'}</strong></div>
        </section>

        <section className={`prazoBox ${alerta.nivel}`}>
          <div><span>Prazo padrão</span><strong>5 dias para resposta</strong></div>
          <div><span>Vencimento</span><strong>{dataBr(rn.prazo_solucao)}</strong></div>
          <div><span>Situação</span><strong>{alerta.texto}</strong></div>
          <div><span>Responsável</span><strong>{rn.responsavel_resposta || rn.tecnico || 'Não definido'}</strong></div>
        </section>

        <TimelineRn rn={rn} />

        <section className="detailGrid">
          <Info label="Data de abertura" value={dataBr(rn.data_abertura)} />
          <Info label="Prazo de resposta" value={dataBr(rn.prazo_solucao)} />
          <Info label="Origem" value={rn.origem} />
          <Info label="Processo / etapa" value={`${rn.processo || '-'} / ${rn.etapa || '-'}`} />
          <Info label="Equipamento" value={rn.equipamento} />
          <Info label="Técnico" value={rn.tecnico} />
          <Info label="Severidade" value={rn.severidade} />
          <Info label="Runrun.it" value={rn.runrun} />
          <Info label="Data da resposta" value={dataBr(rn.data_resposta)} />
          <Info label="Data de fechamento" value={dataBr(rn.data_fechamento)} />
        </section>

        <section className="detailGrid costs">
          <Info label="Peças" value={moeda(rn.custo_pecas)} />
          <Info label="Mão de obra" value={moeda(rn.custo_mao_obra)} />
          <Info label="Deslocamento" value={moeda(rn.custo_deslocamento)} />
          <Info label="Terceiros" value={moeda(rn.custo_terceiros)} />
          <Info label="Custo total" value={moeda(rn.custo_total)} destaque />
        </section>

        <section className="detailText"><h2>Problema relatado</h2><p>{rn.problema || '-'}</p></section>
        <section className="detailText"><h2>Diagnóstico</h2><p>{rn.diagnostico || '-'}</p></section>
        <section className="detailText"><h2>Causa raiz</h2><p>{rn.causa_raiz || '-'}</p></section>
        <section className="detailText"><h2>Ação corretiva / solução</h2><p>{rn.solucao_final || rn.acao_corretiva || '-'}</p></section>

        {fotos.length > 0 && <section className="detailText"><h2>Fotos</h2><div className="fotosGrid">{fotos.map((foto, i) => <div className="fotoCard" key={i}><img src={foto.url} alt={foto.nome || 'Foto'} /><span>{foto.nome}</span></div>)}</div></section>}
      </div>

      <div className="respostaBox noPrint">
        <h2>Resposta / solução da RN</h2>
        <p className="hint">Para responder a RN, preencha diagnóstico, solução e responsável. Depois, quando tudo estiver concluído, altere o status para Resolvido.</p>
        <div className="sectionGrid">
          <Textarea label="Diagnóstico / análise" value={resposta.diagnostico} onChange={(v) => setResposta({ ...resposta, diagnostico: v })} />
          <Textarea label="Causa raiz" value={resposta.causa_raiz} onChange={(v) => setResposta({ ...resposta, causa_raiz: v })} />
          <Textarea label="Ação corretiva" value={resposta.acao_corretiva} onChange={(v) => setResposta({ ...resposta, acao_corretiva: v })} />
          <Textarea label="Solução / resposta ao problema" value={resposta.solucao_final} onChange={(v) => setResposta({ ...resposta, solucao_final: v })} />
          <Field label="Responsável pela resposta" value={resposta.responsavel_resposta} onChange={(v) => setResposta({ ...resposta, responsavel_resposta: v })} />
          <Select label="Novo status" value={resposta.status} options={statusOptions} onChange={(v) => setResposta({ ...resposta, status: v })} />
        </div>

        <h2 className="subtituloResposta">Custos da resposta</h2>
        <p className="hint">Preencha os custos somente após a análise/execução. O total é calculado automaticamente e salvo junto com a resposta.</p>
        <div className="sectionGrid custosRespostaGrid">
          <Select label="Responsável financeiro" value={resposta.responsavel_financeiro} options={responsavelFinanceiroOptions} onChange={(v) => setResposta({ ...resposta, responsavel_financeiro: v })} />
          <Field label="Peças R$" type="number" value={resposta.custo_pecas} onChange={(v) => setResposta({ ...resposta, custo_pecas: v })} />
          <Field label="Mão de obra R$" type="number" value={resposta.custo_mao_obra} onChange={(v) => setResposta({ ...resposta, custo_mao_obra: v })} />
          <Field label="Deslocamento R$" type="number" value={resposta.custo_deslocamento} onChange={(v) => setResposta({ ...resposta, custo_deslocamento: v })} />
          <Field label="Terceiros R$" type="number" value={resposta.custo_terceiros} onChange={(v) => setResposta({ ...resposta, custo_terceiros: v })} />
          <div className="infoBox destaque custoTotalResposta">
            <span>Total calculado</span>
            <strong>{moeda(custoTotalResposta)}</strong>
          </div>
        </div>
        <div className="acoesForm">
          <button className="secondary" onClick={() => atualizarStatus('Em análise')}>Marcar em análise</button>
          <button className="primary" onClick={salvarResposta}><Save size={18} /> Salvar resposta</button>
          <button className="success" onClick={() => atualizarStatus('Resolvido')}><CheckCircle2 size={18} /> Marcar resolvido</button>
        </div>
      </div>
    </div>
  );
}


function TimelineRn({ rn }) {
  const temResposta = Boolean(String(rn.solucao_final || '').trim() || rn.data_resposta);
  const status = rn.status || 'Aberto';
  const etapas = [
    { nome: 'Abertura', data: rn.data_abertura, ativo: true },
    { nome: 'Em análise', data: status === 'Em análise' ? hojeISO() : null, ativo: ['Em análise', 'Respondido', 'Resolvido'].includes(status) || temResposta },
    { nome: 'Respondido', data: rn.data_resposta, ativo: temResposta || ['Respondido', 'Resolvido'].includes(status) },
    { nome: 'Resolvido', data: rn.data_fechamento, ativo: status === 'Resolvido' },
  ];
  return (
    <section className="timelineBox">
      {etapas.map((etapa) => (
        <div className={`timelineStep ${etapa.ativo ? 'done' : ''}`} key={etapa.nome}>
          <span className="dot" />
          <strong>{etapa.nome}</strong>
          <em>{dataBr(etapa.data)}</em>
        </div>
      ))}
    </section>
  );
}

function Header({ title, subtitle }) { return <div className="pageHeader"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div></div>; }
function Card({ icon, label, value }) { return <div className="card"><div>{icon}</div><span>{label}</span><strong>{value}</strong></div>; }
function Panel({ title, children }) { return <div className="panel"><h2>{title}</h2>{children}</div>; }
function Section({ title, children }) { return <fieldset><legend>{title}</legend><div className="sectionGrid">{children}</div></fieldset>; }
function Field({ label, type = 'text', value, onChange, required = false }) { return <label>{label}<input type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)} /></label>; }
function Textarea({ label, value, onChange, required = false }) { return <label className="wide">{label}<textarea value={value} required={required} onChange={(e) => onChange(e.target.value)} /></label>; }
function Select({ label, value, options, onChange }) { return <label>{label}<select value={value || ''} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>; }
function Info({ label, value, destaque = false }) { return <div className={`infoBox ${destaque ? 'destaque' : ''}`}><span>{label}</span><strong>{value || '-'}</strong></div>; }

createRoot(document.getElementById('root')).render(<App />);
