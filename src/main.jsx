import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AlertTriangle, ClipboardList, DollarSign, Timer, Plus, BarChart3, Printer, ImagePlus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import './style.css';
import logoBRS from './assets/logo-brs.png';
import { supabase } from './supabaseClient';

const statusOptions = ['Aberto', 'Em análise', 'Aguardando peça', 'Em execução', 'Resolvido', 'Não resolvido', 'Cancelado', 'Garantia negada'];
const origemOptions = [
  'Interno',
  'Externo'
];

const processoOptions = [
  'Engenharia',
  'Layout' ,
  'Fábrica',
  'PCP'
];

const processoInternoOptions = [
  'Engenharia',
  'Layout',
  'Fábrica',
  'PCP'
];

const layoutOptions = [
  'Erro de Projeto Civil',
  'Projeto Errado',
  'Cotas Erradas',
  'Posição Errada',
  'Equipamento Faltando',
  'Revisão'
];

const processoExternoOptions = [
  'Transporte',
  'Armazenamento',
  'Montagem'
];

const engenhariaOptions = [
  'Projeto',
  'Sem Revisão',
  'Sem Cotas',
  'Desenho Errado'
];

const fabricaOptions = [
  'Laser',
  'Corte',
  'Dobra',
  'Prensa',
  'Solda',
  'Pintura',
  'Montagem',
  'Identificação',
  'Expedição'
];

const transporteOptions = [
  'Avaria no transporte',
  'Equipamento danificado',
  'Peça danificada',
  'Entrega incorreta'
];

const armazenamentoOptions = [
  'Avaria por armazenamento',
  'Oxidação',
  'Peça perdida',
  'Equipamento danificado'
];

const montagemExternaOptions = [
  'Peça Faltando',
  'Peça Errada',
  'Projeto Errado',
  'Montagem incorreta',
  'Ajuste em campo'
];

const pcpOptions = [
  'Quantidade',
  'Código Errado',
  'Usinagem'
];
const severidadeOptions = ['Baixa', 'Média', 'Alta', 'Crítica'];
const responsavelFinanceiroOptions = ['Garantia BRS', 'Cliente', 'Fornecedor', 'Montagem', 'Comercial', 'Rateado'];

const initialRns = [
  { numero:'RN-2026-0001', data:'2026-05-29', cliente:'Lagoa Bonita', pedido:'514', equipamento:'Elevador ESB', origem:'Externo — Cliente pós-instalação', setor:'Assistência técnica', categoria:'Mecânico', severidade:'Crítica', status:'Aguardando peça', tecnico:'Fabio Ribeiro', runrun:'RUN-1045', custo:3850, prazo:'2026-06-03', abertoHa:9 },
  { numero:'RN-2026-0002', data:'2026-05-28', cliente:'Interno BRS', pedido:'OP-8821', equipamento:'Correia transportadora', origem:'Interno — Fábrica', setor:'Solda', categoria:'Estrutural', severidade:'Alta', status:'Em análise', tecnico:'Qualidade', runrun:'RUN-1048', custo:740, prazo:'2026-05-31', abertoHa:3 },
  { numero:'RN-2026-0003', data:'2026-05-26', cliente:'Fazenda Modelo', pedido:'501', equipamento:'Mesa densimétrica', origem:'Externo — Montador em campo', setor:'Montagem campo', categoria:'Peça faltante', severidade:'Média', status:'Aberto', tecnico:'Montador', runrun:'', custo:1240, prazo:'2026-06-01', abertoHa:5 },
];

function moeda(v){ return Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function calcAlerta(r) {
  if (r.status === 'Resolvido') return 'ok';

  const hoje = new Date();

  const prazo = r.prazoSolucao
    ? new Date(r.prazoSolucao)
    : null;

  const venceuPorPrazo = prazo && hoje > prazo;
  const venceuPorDias = Number(r.abertoHa || 0) >= 5;

  if (
    venceuPorPrazo ||
    venceuPorDias ||
    r.severidade === 'Crítica'
  ) {
    return 'critico';
  }

  if (
    !r.solucaoFinal ||
    r.status === 'Aguardando peça'
  ) {
    return 'atencao';
  }

  return 'normal';
}

function App(){
  const [tab, setTab] = useState('dashboard');
  const [rns, setRns] = useState([]);
  const [form, setForm] = useState({ status:'Aberto', origem:'Externo — Cliente pós-instalação', categoria:'Mecânico', severidade:'Média', responsavelFinanceiro:'Garantia BRS', custoPecas:0, custoMaoObra:0, custoDeslocamento:0, custoTerceiros:0 });
  const [fotos, setFotos] = useState([]);

  useEffect(() => {
  carregarRns();
}, []);

async function carregarRns() {
  const { data, error } = await supabase
    .from('rn_ocorrencias')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    console.error(error);
    alert('Erro ao carregar RNs do Supabase');
    return;
  } 

  setRns(data || []);
}

function calcularPrazo5Dias() {
  const hoje = new Date();
  hoje.setDate(hoje.getDate() + 5);
  return hoje.toISOString().slice(0, 10);
}

function adicionarFotos(e) {
  const arquivos = Array.from(e.target.files || []);

  const novasFotos = arquivos.map((file) => ({
    nome: file.name,
    url: URL.createObjectURL(file),
  }));

  setFotos([...fotos, ...novasFotos]);
}

function imprimirRelatorio() {
  window.print();
}
  const totalCusto = Number(form.custoPecas||0)+Number(form.custoMaoObra||0)+Number(form.custoDeslocamento||0)+Number(form.custoTerceiros||0);
  const indicadores = useMemo(()=>({
    abertas: rns.filter(r=>!['Resolvido','Cancelado'].includes(r.status)).length,
    criticas: rns.filter(r=>r.severidade==='Crítica').length,
    vencidas: rns.filter(r=>calcAlerta(r)==='critico').length,
    custoTotal: rns.reduce((s,r)=>s+r.custo,0),
  }),[rns]);

  const porOrigem = Object.values(rns.reduce((acc,r)=>{ acc[r.origem] ||= {nome:r.origem, qtd:0, custo:0}; acc[r.origem].qtd++; acc[r.origem].custo += r.custo; return acc;},{}));
  const porCategoria = Object.values(rns.reduce((acc,r)=>{ acc[r.categoria] ||= {nome:r.categoria, qtd:0}; acc[r.categoria].qtd++; return acc;},{}));
  const custosMes = [{mes:'Jan',custo:0},{mes:'Fev',custo:0},{mes:'Mar',custo:0},{mes:'Abr',custo:0},{mes:'Mai',custo:indicadores.custoTotal}];

  function calcularPrazo5Dias() {
  const hoje = new Date();
  hoje.setDate(hoje.getDate() + 5);
  return hoje.toISOString().slice(0, 10);
}

  async function salvarRn(e) {
  e.preventDefault();

  const numero = `RN-2026-${String(rns.length + 1).padStart(4, '0')}`;

  const novo = {
    numero,
    data_abertura: new Date().toISOString().slice(0, 10),

    cliente: form.cliente || 'Sem cliente',
    pedido: form.pedido || '',
    equipamento: form.equipamento || '',

    origem: form.origem,
    processo: form.processo,
    etapa: form.etapa,
    severidade: form.severidade,

    status: form.status,
    tecnico: form.tecnico || '',
    runrun: form.runrun || '',

    problema: form.problema || '',  
    diagnostico: form.diagnostico || '',
    solucao_final: form.solucaoFinal || '',

    prazo_solucao:
      form.prazo || calcularPrazo5Dias(),

    custo_pecas: Number(form.custoPecas || 0),
    custo_mao_obra: Number(form.custoMaoObra || 0),
    custo_deslocamento: Number(form.custoDeslocamento || 0),
    custo_terceiros: Number(form.custoTerceiros || 0),

    custo_total: totalCusto
  };

  const { error } = await supabase
    .from('rn_ocorrencias')
    .insert([novo]);

  if (error) {
    console.error(error);
    alert('Erro ao salvar RN no banco');
    return;
  }

  await carregarRns();

  alert('RN salva com sucesso!');

  setTab('dashboard');

  setForm({
    status: 'Aberto',
    origem: 'Interno',
    processo: 'Fábrica',
    etapa: 'Laser',
    severidade: 'Média',
    responsavelFinanceiro: 'Garantia BRS',
    custoPecas: 0,
    custoMaoObra: 0,
    custoDeslocamento: 0,
    custoTerceiros: 0
  });
}

function adicionarFotos(e) {
  const arquivos = Array.from(e.target.files || []);
  const novasFotos = arquivos.map((file) => ({
    nome: file.name,
    url: URL.createObjectURL(file),
  }));
  setFotos([...fotos, ...novasFotos]);
}

function imprimirRelatorio() {
  window.print();
}

  return (
  <div className="app">
    <aside className="sidebar">
      <div className="brand"><div className="logo">BRS</div><div><strong>Sistema RN</strong><span>Assistência Técnica</span></div></div>
      <button onClick={()=>setTab('dashboard')} className={tab==='dashboard'?'active':''}><BarChart3 size={18}/> Dashboard</button>
      <button onClick={()=>setTab('novo')} className={tab==='novo'?'active':''}><Plus size={18}/> Novo RN</button>
      <button onClick={()=>setTab('lista')} className={tab==='lista'?'active':''}><ClipboardList size={18}/> Lista RN</button>
    </aside>

    <main>
      {tab==='dashboard' && <>
        <h1>Dashboard Assistência Técnica</h1>
        <section className="cards">
          <Card icon={<ClipboardList/>} label="RN abertas" value={indicadores.abertas}/>
          <Card icon={<AlertTriangle/>} label="Críticas / alertas" value={indicadores.vencidas}/>
          <Card icon={<Timer/>} label="RN críticas" value={indicadores.criticas}/>
          <Card icon={<DollarSign/>} label="Custo total" value={moeda(indicadores.custoTotal)}/>
        </section>
        <section className="grid">
  <Panel title="RN por origem">
  <ResponsiveContainer width="100%" height={260}>
    <BarChart data={porOrigem}>
      <XAxis dataKey="nome" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="qtd" fill="#2563eb" radius={[6, 6, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
</Panel>

  <Panel title="RN por categoria">
    <ResponsiveContainer width="100%" height={260}> 
  <PieChart>
    <Pie
      data={porCategoria}
      dataKey="qtd"
      nameKey="nome"
      outerRadius={90}
      label
    />
    <Tooltip />
  </PieChart>
</ResponsiveContainer>
  </Panel>

  <Panel title="Custo mensal">
    <ResponsiveContainer width="100%" height={260}>
  <LineChart data={custosMes}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="mes" />
    <YAxis />
    <Tooltip />
    <Line dataKey="custo" />
  </LineChart>
</ResponsiveContainer>
  </Panel>

  <Panel title="Alertas em aberto">
    <div className="alertList">
  {rns
    .filter((r) => r.status !== 'Resolvido')
    .map((r) => (
      <div
        className={'alert ' + calcAlerta(r)}
        key={r.numero}
      >
        <strong>{r.numero}</strong>
        <div>{r.cliente}</div>
        <div>{r.problema}</div>
      </div>
    ))}
</div>
  </Panel>
</section>
      </>
      }

      {tab==='novo' && (
  <>
    <h1>Novo Registro RN</h1>

    <div className="cabecalhoRelatorio">
  <div className="logoRelatorio">
  <img src={logoBRS} alt="BRS Equipamentos" />
</div>  

  <div>
    <h2>Registro de Atendimento Técnico</h2>
    <p>Sistema RN — Assistência Técnica</p>
  </div>
</div>

    <form className="form" onSubmit={salvarRn}>
      <Section title="Identificação">
        <Field label="Cliente" onChange={v=>setForm({...form, cliente:v})}/>
        <Field label="Pedido / OP" onChange={v=>setForm({...form, pedido:v})}/>
        <Field label="Equipamento" onChange={v=>setForm({...form, equipamento:v})}/>
      </Section>

      <Section title="Origem e classificação">
        <Select
  label="Origem do RN"
  value={form.origem}
  options={origemOptions}
  onChange={(v)=>setForm({
  ...form,
  origem: v,
  processo: v === 'Externo' ? 'Transporte' : 'Engenharia',
  etapa: v === 'Externo' ? 'Transporte' : 'Projeto'
})}
/>

<Select
  label="Processo"
  value={form.processo}
  options={
  form.origem === 'Externo'
    ? processoExternoOptions
    : processoInternoOptions
}
  onChange={(v)=>setForm({
  ...form,
  processo: v,
  etapa:
    v === 'Engenharia'
      ? 'Projeto'
      : v === 'PCP'
      ? 'Quantidade'
      : v === 'Layout'
      ? 'Erro de Projeto Civil'
      : v === 'Garantia'
      ? 'Troca por uma nova'
      : v === 'Revisão'
      ? 'Peça Faltando'
      : 'Laser'
})}
/>

<Select
  label="Seção / etapa"
  value={form.etapa}
  options={
  form.processo === 'Engenharia'
    ? engenhariaOptions
    : form.processo === 'PCP'
    ? pcpOptions
    : form.processo === 'Layout'
    ? layoutOptions
    : form.processo === 'Garantia'
    ? ['Troca por uma nova']
    : form.processo === 'Revisão'
    ? ['Peça Faltando', 'Peça Errada', 'Projeto Errado']

    : form.processo === 'Transporte'
    ? transporteOptions

    : form.processo === 'Armazenamento'
    ? armazenamentoOptions

    : form.processo === 'Montagem'
    ? montagemExternaOptions

    : fabricaOptions
}
  onChange={(v)=>setForm({...form, etapa:v})}
/>
        <Select label="Severidade" value={form.severidade} options={severidadeOptions} onChange={v=>setForm({...form, severidade:v})}/>
      </Section>

      <Section title="Descrição técnica">
        <Textarea label="Problema relatado" onChange={v=>setForm({...form, problema:v})}/>
        <Textarea label="Diagnóstico / ação executada" onChange={v=>setForm({...form, acao:v})}/>
      </Section>

      <Section title="Fotos da ocorrência">
        <label className="wide">
          Adicionar fotos
          <input type="file" accept="image/*" multiple onChange={adicionarFotos} />
        </label>

        <div className="fotosGrid wide">
          {fotos.map((foto, index) => (
            <div className="fotoCard" key={index}>
              <img src={foto.url} alt={foto.nome} />
              <span>{foto.nome}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Solução / resposta da ocorrência">
  <Textarea
    label="Solução final / resposta ao problema"
    onChange={v=>setForm({...form, solucaoFinal:v})}
  />
</Section>

      <Section title="Runrun.it e SLA">
        <Field label="ID / link Runrun.it" onChange={v=>setForm({...form, runrun:v})}/>
        <Field label="Prazo máximo para solução (5 dias)" type="date" onChange={v=>setForm({...form, prazo:v})}/>
        <Select label="Status" value={form.status} options={statusOptions} onChange={v=>setForm({...form, status:v})}/>
      </Section>

      <Section title="Custos">
        <Field label="Peças R$" type="number" onChange={v=>setForm({...form, custoPecas:v})}/>
        <Field label="Mão de obra R$" type="number" onChange={v=>setForm({...form, custoMaoObra:v})}/>
        <Field label="Deslocamento R$" type="number" onChange={v=>setForm({...form, custoDeslocamento:v})}/>
        <Field label="Terceiros R$" type="number" onChange={v=>setForm({...form, custoTerceiros:v})}/>
      </Section>

      

      <div className="acoesForm">
  <button type="button" className="secondary" onClick={imprimirRelatorio}>
    <Printer size={18} />
    Imprimir relatório
  </button>

  <button
    type="button"
    className="whatsapp"
    onClick={() => {
      const texto = `RN BRS%0ACliente: ${form.cliente || ''}%0AProblema: ${form.problema || ''}`;
      window.open(`https://wa.me/?text=${texto}`, '_blank');
    }}
  >
    Enviar WhatsApp
  </button>

  <button
  type="button"
  className="email"
  onClick={() => {
    const assunto = encodeURIComponent('Relatório RN BRS');

    const corpo = encodeURIComponent(
      `RN BRS\nCliente: ${form.cliente || ''}\nProblema: ${form.problema || ''}`
    );

    window.location.href =
      `mailto:?subject=${assunto}&body=${corpo}`;
  }}
>
  Enviar E-mail
</button>

  <button className="primary">
    Salvar RN
  </button>
</div>
    </form>
    </>
)}
  
{tab==='lista' && (
  <>
    <h1>Lista de RN</h1>

    <div className="table">
      <table>
        <thead>
          <tr>
            <th>RN</th>
            <th>Cliente</th>
            <th>Origem</th>
            <td>{`${r.processo || ''} - ${r.etapa || ''}`}</td>
            <th>Status</th>
            <th>Custo</th>
            <th>Alerta</th>
          </tr>
        </thead>
        <tbody>
  {rns.map((r) => (
    <tr key={r.id || r.numero}>
      <td>{r.numero}</td>
      <td>{r.cliente}</td>
      <td>{r.origem}</td>
      <td>{r.processo} - {r.etapa}</td>
      <td>{r.status}</td>
      <td>{moeda(r.custo_total)}</td>
      <td>{calcAlerta(r)}</td>
    </tr>
  ))}
</tbody>
      </table>
    </div>
  </>
)}

</main>
</div>
);
}
function Card({icon,label,value}){return <div className="card"><div>{icon}</div><span>{label}</span><strong>{value}</strong></div>}
function Panel({title,children}){return <div className="panel"><h2>{title}</h2>{children}</div>}
function Section({title,children}){return <fieldset><legend>{title}</legend><div className="sectionGrid">{children}</div></fieldset>}
function Field({label,type='text',onChange}){return <label>{label}<input type={type} onChange={e=>onChange(e.target.value)} /></label>}
function Textarea({label,onChange}){return <label className="wide">{label}<textarea onChange={e=>onChange(e.target.value)} /></label>}
function Select({label,value,options,onChange}){return <label>{label}<select value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o}>{o}</option>)}</select></label>}

createRoot(document.getElementById('root')).render(<App/>);

