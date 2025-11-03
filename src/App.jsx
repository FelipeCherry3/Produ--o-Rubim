import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, BarChart3, Download } from 'lucide-react';
import KanbanColumn from '@/components/KanbanColumn';
import TaskModal from '@/components/TaskModal';
import StatsCard from '@/components/StatsCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import api from './api/axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


// ▶️ NOVO: Dialog (shadcn/ui)
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

function App() {
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedTask, setDraggedTask] = useState(null);
  const [csrfToken, setCsrfToken] = useState(null);
  const { toast } = useToast();

  // ▶️ NOVO: estado para confirmação de movimento
  const [confirmMove, setConfirmMove] = useState({ open: false, task: null, newSector: null });
  const [isMoving, setIsMoving] = useState(false);

  // ▶️ Estados do fluxo Bling
  const [blingDialogOpen, setBlingDialogOpen] = useState(false);
  const [authInProgress, setAuthInProgress] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [dataInicialSync, setDataInicialSync] = useState(() => new Date().toISOString().split('T')[0]); // hoje
  const [dataFinalSync, setDataFinalSync] = useState(() => new Date().toISOString().split('T')[0]);     // hoje


  // ▶️ Fluxo Baixa de Pedidos
  const [baixaDialogOpen, setBaixaDialogOpen] = useState(false);
  const [baixaPwdDialogOpen, setBaixaPwdDialogOpen] = useState(false);
  const [baixaSearch, setBaixaSearch] = useState('');
  const [baixaSelected, setBaixaSelected] = useState(new Set()); // numeros dos pedidos
  const [baixaInProgress, setBaixaInProgress] = useState(false);
  const [baixaPassword, setBaixaPassword] = useState('');

  // Dialogs e senhas
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [loadPassword, setLoadPassword] = useState('');
  const [syncPassword, setSyncPassword] = useState('');
  const [movePassword, setMovePassword] = useState('');

  // Validação simples
  const requirePassword = (pwd) => {
    if (!pwd || String(pwd).trim() === '') {
      toast({ title: '⚠️ Senha obrigatória', description: 'Digite a senha para continuar.', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const sectorMap = {
    usinagem:   { id: 1, name: 'Usinagem' },
    montagem:   { id: 3, name: 'Montagem' },
    lustracao:  { id: 5, name: 'Lustração' },
    expedicao:  { id: 6, name: 'Expedição' },
  };
  const sectors = Object.keys(sectorMap);

  // === BLING FLUXO FUNCTIONS ===

  const startBlingAuth = async () => {
  try {
    setAuthInProgress(true);

    // (Opcional mas recomendado) garantir sessão + CSRF antes, caso seu /authorize exija auth
    const okLogin = await login();
    if (!okLogin) { setAuthInProgress(false); return; }
    await fetchCsrfToken();

    // Chama seu backend /authorize
    const res = await api.get('/authorize', { responseType: 'text' });
    let text = typeof res.data === 'string' ? res.data : String(res.data || '');

    // Seu /authorize retorna texto no formato "Redirecione o usuário para: <URL>"
    // Vamos extrair a URL com um split simples:
    let url = text;
    const idx = text.indexOf('http');
    if (idx >= 0) url = text.slice(idx).trim();

    if (!url.startsWith('http')) {
      throw new Error('Não foi possível obter a URL de autorização do Bling.');
    }

    // Abre em nova aba (ou popup); o Bling vai redirecionar para SEU /callback no back
    window.open(url, '_blank', 'noopener,noreferrer');

    toast({
      title: '🔐 Autorização iniciada',
      description: 'Finalize no site do Bling. Depois volte aqui para sincronizar.',
      });
    } catch (err) {
      console.error('Erro iniciar autorização:', err);
      toast({
        title: '❌ Erro na autorização',
        description: err?.message || 'Falha ao obter a URL de autorização.',
        variant: 'destructive',
      });
    } finally {
      setAuthInProgress(false);
    }
  };

  const syncBlingPedidos = async () => {
  try {
    setSyncInProgress(true);


    // (Opcional) garantir sessão + CSRF para rotas que exigem:   
    const okLogin = await login();
    if (!okLogin) { setSyncInProgress(false); return; }
    await fetchCsrfToken();

    // Validações simples de data
    if (!dataInicialSync || !dataFinalSync) {
      toast({ title: '⚠️ Período inválido', description: 'Selecione data inicial e final.' });
      setSyncInProgress(false);
      return;
    }

    // GET /pedidos/getVendas?dataInicial=YYYY-MM-DD&dataFinal=YYYY-MM-DD
    const { data } = await api.get('/pedidos/getVendas', {
      params: { dataInicial: dataInicialSync, dataFinal: dataFinalSync},
      responseType: 'text',
    });

    toast({
      title: '✅ Sincronização concluída',
      description: (typeof data === 'string' ? data : 'Pedidos sincronizados com sucesso.'),
    });
    setSyncPassword('');

    // Se quiser já recarregar os pedidos do seu board:
    await fetchPedidos();
    } catch (err) {
      console.error('Erro sincronizar pedidos:', err);
      toast({
        title: '❌ Erro ao sincronizar',
        description: err?.response?.data || err?.message || 'Falha ao sincronizar pedidos.',
        variant: 'destructive',
      });
    } finally {
      setSyncInProgress(false);
    }
  };


  // === LOGIN ===
  const login = async () => {
    try {
      const form = new URLSearchParams();
      form.set('username', import.meta.env.VITE_BACK_USER || 'admin');
      form.set('password', import.meta.env.VITE_SPRING_PASSWORD || 'senha123');

      const res = await api.post('/login', form.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      console.log('Login OK:', res.status);
      return true;
    } catch (error) {
      toast({
        title: '❌ Erro ao fazer login',
        description: error?.message || 'Não foi possível autenticar no servidor.',
        variant: 'destructive',
      });
      console.error('Erro login:', error?.response?.data || error?.message);
      return false;
    }
  };

  // === CSRF ===
  const fetchCsrfToken = async () => {
    try {
      const { data } = await api.get('/api/csrf');
      const headerName = data?.headerName || 'X-XSRF-TOKEN';
      api.defaults.headers.common[headerName] = data?.token;
      setCsrfToken(data?.token);
      console.log('CSRF OK:', headerName, data?.token);
      return true;
    } catch (error) {
      toast({
        title: '❌ Erro ao obter CSRF',
        description: error?.message || 'Não foi possível obter o token CSRF.',
        variant: 'destructive',
      });
      console.error('Erro CSRF:', error?.response?.data || error?.message);
      return false;
    }
  };

  // === BUSCAR PEDIDOS ===
  const fetchPedidos = async (passwordFront) => {
    try {
      const dataInicial = new Date('2024-01-01');
      const dataFinal = new Date('2025-12-31');

      const { data } = await api.get('/api/pedidos-venda', {
        params: {
          dataInicial: dataInicial.toISOString().split('T')[0],
          dataFinal:   dataFinal.toISOString().split('T')[0],
          password:    passwordFront,
        },
      });

      const fetchedTasks = (data || []).map((pedido) => ({
        id: pedido.id,
        orderNumber: String(pedido.numero ?? ''),
        client: pedido.cliente?.nome || 'Cliente Desconhecido',
        description: (pedido.itens || []).map((i) => i?.descricao).filter(Boolean).join(', '),
        dataEmissao: pedido.dataEmissao || new Date().toISOString(),
        dataFinal: pedido.dataPrevista || new Date().toISOString(),
        dueDate: pedido.dataEntrega || '',
        estimatedHours: pedido.horasEstimadas || 1,
        orderValue: pedido.valorTotal || 0,
        orderStatus: pedido.status || 'PENDENTE',
        dataEntrega: pedido.dataEntrega || '',
        products: (pedido.itens || []).map((item) => ({
          id: item.id,                               // 👉 ESSENCIAL para o patch no back
          name: item.descricao || 'Sem descrição',
          quantity: item.quantidade ?? 1,
          woodColor: item.corMadeira || '',
          coatingColor: item.corRevestimento || '',
          details: item.descricaoDetalhada || '',
          detalhesMedidas: item.detalhesMedidas || '',
        })),
        sector: mapSectorFromId(pedido.setor?.id),
        priority: pedido.priority || 'normal',
        createdAt: pedido.dataCriacao || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      setTasks(fetchedTasks);
      toast({
        title: '✅ Pedidos carregados!',
        description: `${fetchedTasks.length} pedidos foram carregados com sucesso.`,
      });
    } catch (error) {
      toast({
        title: '❌ Erro ao carregar pedidos',
        description: 'Não foi possível buscar os pedidos do servidor.',
        variant: 'destructive',
      });
      console.error('Erro buscar pedidos:', error?.response?.data || error?.message);
    }
  };

  const handleLoadPedidos = async (passwordFront) => {
    const okLogin = await login();
    if (!okLogin) return;
    const okCsrf = await fetchCsrfToken();
    if (!okCsrf) return;
    await fetchPedidos(passwordFront);
  };

  const mapSectorFromId = (setorId) => {
    if (!setorId) return 'usinagem';
    for (const [sector, { id }] of Object.entries(sectorMap)) {
      if (id === setorId) return sector;
    }
    return 'usinagem';
  };

  useEffect(() => {
    localStorage.setItem('furniture-production-tasks', JSON.stringify(tasks));
  }, [tasks]);

  const handleSaveTask = (taskData) => {
    if (isEditing) {
      setTasks((prev) => prev.map((t) => (t.id === taskData.id ? taskData : t)));
      toast({ title: '✅ Pedido atualizado!', description: 'As alterações foram salvas com sucesso.' });
    } else {
      setTasks((prev) => [...prev, taskData]);
      toast({
        title: '🎉 Novo pedido criado!',
        description: `Pedido "${taskData.orderNumber}" adicionado ao setor ${taskData.sector}.`,
      });
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleNewTask = () => {
    setSelectedTask(null);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => setDraggedTask(null);
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };

  // ⤵️ ALTERADO: não move mais de forma otimista; abre modal de confirmação
  const handleDrop = (e, newSector) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.sector === newSector) {
      setDraggedTask(null);
      return;
    }
    setConfirmMove({ open: true, task: draggedTask, newSector });
    setDraggedTask(null);
  };

  // ▶️ NOVO: confirmar movimento
  const confirmMoveAction = async () => {
    const task = confirmMove.task;
    const newSector = confirmMove.newSector;
    if (!task || !newSector) return;

    const oldSector = task.sector;
    setIsMoving(true);
    try {
      await api.put('/api/pedidos-venda/atualizarSetor', {
        idPedido: task.id,
        idNovoSetor: sectorMap[newSector].id,
      });

      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, sector: newSector, updatedAt: new Date().toISOString() } : t))
      );

      toast({
        title: '📋 Pedido movido!',
        description: `Pedido "${task.orderNumber}" → ${sectorMap[newSector].name}.`,
      });
    } catch (error) {
      toast({
        title: '❌ Erro ao mover pedido',
        description: error?.response?.data?.message || 'Não foi possível atualizar o setor no servidor.',
        variant: 'destructive',
      });
      console.error('Erro atualizar setor:', error?.response?.data || error?.message);
    } finally {
      setIsMoving(false);
      setConfirmMove({ open: false, task: null, newSector: null });
    }
  };

  // ▶️ NOVO: cancelar movimento
  const cancelMoveAction = () => {
    setConfirmMove({ open: false, task: null, newSector: null });
  };

  const filteredTasks = tasks.filter((task) =>
    task.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.products.some((p) => (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStats = () => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.sector === 'expedicao').length;
    const inProgress = total - completed;
    const highPriority = tasks.filter((t) => t.priority === 'alta').length;
    return { total, completed, inProgress, highPriority };
  };

  const stats = getStats();

  // helper para nome do setor
  const sectorLabel = (key) => sectorMap[key]?.name || key;
  
  // Total de peças do pedido (soma quantidades)
  const getTotalPecas = (task) =>
    (task?.products || []).reduce((acc, p) => acc + Number(p?.quantity || 0), 0);

  // Lista filtrada só para o modal de baixa (busca independente)
  const baixaList = tasks.filter((t) => {
    const query = baixaSearch.toLowerCase();
    const haystack = [
      t.orderNumber,
      t.client,
      t.description,
      ...(t.products || []).map((p) => p?.name || '')
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  });

  // Selecionar/Desselecionar um pedido pelo número
  const toggleSelectOne = (orderNumber) => {
    setBaixaSelected((prev) => {
      const next = new Set(prev);
      if (next.has(orderNumber)) next.delete(orderNumber);
      else next.add(orderNumber);
      return next;
    });
  };

  // Selecionar/Desselecionar todos (com base na lista filtrada)
  const toggleSelectAll = () => {
    const allNumbers = baixaList.map((t) => t.orderNumber);
    const allSelected = allNumbers.every((n) => baixaSelected.has(n));
    setBaixaSelected(() => {
      if (allSelected) return new Set();
      return new Set(allNumbers);
    });
  };

  const realizarBaixaPedidos = async () => {
    try {
      if (baixaSelected.size === 0) {
        toast({ title: '⚠️ Nenhum pedido selecionado', description: 'Marque ao menos um pedido.' });
        return;
      }
      if (!requirePassword(baixaPassword)) return;

      setBaixaInProgress(true);

      // garante sessão e CSRF (segue seu padrão)
      const okLogin = await login();
      if (!okLogin) { setBaixaInProgress(false); return; }
      const okCsrf = await fetchCsrfToken();
      if (!okCsrf) { setBaixaInProgress(false); return; }

      // monta o DTO esperado pelo backend
      const dto = {
        password: baixaPassword,
        numerosPedidos: Array.from(baixaSelected).map((n) => Number(n)),
      };

      // PUT no endpoint novo
      const res = await api.put('/api/pedidos-venda/marcarComoEntregue', dto, { responseType: 'json' });

      const msg = res?.data?.message || 'Baixa realizada com sucesso.';
      toast({ title: '✅ Baixa realizada', description: msg });

      // limpa estados e recarrega
      setBaixaPassword('');
      setBaixaSelected(new Set());
      setBaixaPwdDialogOpen(false);
      setBaixaDialogOpen(false);
      await fetchPedidos();
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || 'Falha ao realizar baixa.';

      if (status === 401) {
        toast({ title: '🔒 Senha inválida', description: msg, variant: 'destructive' });
      } else if (status === 404) {
        toast({ title: '🔎 Nenhum pedido encontrado', description: msg, variant: 'destructive' });
      } else {
        toast({ title: '❌ Erro ao realizar baixa', description: msg, variant: 'destructive' });
      }
      console.error('Erro baixar pedidos:', err?.response?.data || err?.message);
    } finally {
      setBaixaInProgress(false);
    }
  };
  // ------------------------RELATÓRIOS ------------------------
  // ▶️ Estados locais para modal de Relatórios (adicionados aqui dentro do componente)
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportParamsOpen, setReportParamsOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportParams, setReportParams] = useState({
    dataInicial: new Date().toISOString().split('T')[0],
    dataFinal: new Date().toISOString().split('T')[0],
    password: '',
  });

  const reports = [
    { id: 'resumo-producao', title: 'Resumo de Produção' },
    { id: 'pedidos-por-setor', title: 'Pedidos por Setor' },
    { id: 'pedidos-entregues', title: 'Pedidos Entregues' },
  ];

  const openReportParams = (report) => {
    setSelectedReport(report);
    setReportParams((p) => ({
      ...p,
      dataInicial: new Date().toISOString().split('T')[0],
      dataFinal: new Date().toISOString().split('T')[0],
      password: '',
    }));
    setReportParamsOpen(true);
  };

 const getFirst = (obj, keys) => {
  for (const k of keys) {
    if (obj && obj[k] != null) return obj[k];
  }
  return null;
};

// Converte ISO string, epoch number, array [yyyy,MM,dd,HH,mm,ss] ou já Date
const toBRDate = (val) => {
  if (val == null) return '—';

  let d;

  if (val instanceof Date) {
    d = val;
  } else if (Array.isArray(val)) {
    // Jackson pode serializar como array
    const [y, m = 1, day = 1, hh = 0, mm = 0, ss = 0, ms = 0] = val;
    d = new Date(Date.UTC(y, (m - 1), day, hh, mm, ss, ms));
  } else if (typeof val === 'number') {
    // epoch millis/seconds
    d = new Date(val > 1e12 ? val : val * 1000);
  } else if (typeof val === 'string') {
    d = new Date(val);
  } else {
    return '—';
  }

  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  };

  const buildFileName = (id, ini, fim) => {
    const norm = (s) => (s || '').toString().replaceAll('-', '');
    return `${id}-${norm(ini)}-${norm(fim)}.pdf`;
  };

 const generateReport = async () => {
  if (!requirePassword(reportParams.password)) return;

  setReportParamsOpen(false);
  setReportDialogOpen(false);

  const reportId = (selectedReport && selectedReport.id) || 'pedidos-entregues';
  toast({ title: 'Gerando relatório…', description: (selectedReport && selectedReport.title) || 'Pedidos entregues' });

  try {
    // Espera JSON do backend (o seu Controller atual)
    const { data } = await api.get('/api/relatorios/pedidos-entregues', {
      params: {
        dataInicial: reportParams.dataInicial, // YYYY-MM-DD
        dataFinal: reportParams.dataFinal,     // YYYY-MM-DD
        password: reportParams.password,
      },
    });

    if (!data || !Array.isArray(data.itens) || !data.resumo) {
      throw new Error('Resposta inesperada do servidor.');
    }

    const periodoInicial = getFirst(data, ['periodoInicial', 'dataInicial']);
    const periodoFinal   = getFirst(data, ['periodoFinal', 'dataFinal']);
    const itens          = data.itens || [];
    const resumo         = data.resumo || {};

    const totalPedidosEntregues  = getFirst(resumo, ['totalPedidosEntregues', 'totalPedidos']);
    const totalPecasEntregues    = getFirst(resumo, ['totalPecasEntregues', 'total']);
    const tempoMedioProducaoDias = getFirst(resumo, ['tempoMedioProducaoDias', 'mediaDias']);

    // ---- PDF ----
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Cabeçalho
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Relatório – Pedidos Entregues', 40, 50);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Período: ${toBRDate(periodoInicial)} até ${toBRDate(periodoFinal)}`, 40, 70);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${toBRDate(new Date())}`, 40, 85);

    // Tabela
    const head = [['Número do Pedido', 'Cliente', 'Data do Pedido', 'Data da Entrega', 'Peças']];

    const body = itens.map((it) => {
      const numero       = getFirst(it, ['numeroPedido', 'numero']);       // Long/Str
      const nomeCliente  = getFirst(it, ['nomeCliente', 'cliente', 'nome']);
      const dataPedido   = getFirst(it, ['dataPedido', 'data_pedido']);
      const dataEntrega  = getFirst(it, ['data_entrega', 'data_entrega']);
      const totalPecas   = getFirst(it, ['quantidadePecas', 'quantidadePecas']);
      const leadtimeDias = getFirst(it, ['leadTimeDias', 'lead_time_dias']);

      return [
        numero != null ? String(numero) : '—',
        nomeCliente != null ? String(nomeCliente) : '—',
        toBRDate(dataPedido),
        toBRDate(dataEntrega),
        totalPecas != null ? String(totalPecas) : '0',
      ];
      });

      autoTable(doc, {
        head,
        body,
        startY: 110,
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 6, valign: 'middle' },
        headStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 110 },
          1: { cellWidth: 190 },
          2: { cellWidth: 110 },
          3: { cellWidth: 110 },
          4: { cellWidth: 60, halign: 'right' },
        },
        didDrawPage: () => {
          const str = `Página ${doc.getNumberOfPages()}`;
          doc.setFontSize(9);
          doc.setTextColor(100);
          doc.text(str, pageWidth - 40, pageHeight - 20, { align: 'right' });
        },
      });

      // Resumo
      const afterTableY = doc.lastAutoTable?.finalY || 120;
      const resumoY = afterTableY + 25;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Resumo', 40, resumoY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      let y = resumoY + 20;

      doc.text(`Total de pedidos entregues: ${totalPedidosEntregues ?? 0}`, 40, y); y += 18;
      doc.text(`Total de peças entregues: ${totalPecasEntregues ?? 0}`, 40, y);   y += 18;
      doc.text(`Tempo médio de produção (dias): ${tempoMedioProducaoDias ?? 0}`, 40, y);

      // Salvar
      const fileName = buildFileName(reportId, periodoInicial, periodoFinal);
      doc.save(fileName);

      toast({ title: '✅ Relatório gerado', description: `Download: ${fileName}` });
    } catch (err) {
      console.error('Erro gerar relatório:', err?.response?.data || err?.message || err);
      toast({
        title: '❌ Falha ao gerar relatório',
        description: err?.response?.data || err?.message || 'Verifique os parâmetros e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSelectedReport(null);
      setReportParams((p) => ({ ...p, password: '' }));
    }
  };

  return (
    <>
      <Helmet>
        <title>Sistema de Produção de Móveis - Gerenciamento Kanban</title>
        <meta
          name="description"
          content="Sistema completo para gerenciamento de produção de móveis com controle por setores: Usinagem, Marcenaria, Montagem, Tapeçaria, Lustração e Expedição."
        />
      </Helmet>

      <div className="min-h-screen p-6">
        <div className="max-w-screen-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">🏭 Produção Rubim</h1>
                <p className="text-gray-600">Gerenciamento de Produção Rubim Mesas e Cadeiras</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar pedidos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>

                <Button variant="default" onClick={() => setBaixaDialogOpen(true)}>
                  ✅ Entregar Pedidos
                </Button>
                {/* ▶️ NOVO: Botões do fluxo Bling */}
                <Button variant="default" onClick={() => setBlingDialogOpen(true)}>
                  🔄 Sincronizar Bling
                </Button>
                <Dialog open={blingDialogOpen} onOpenChange={(open) => setBlingDialogOpen(open)}>
                  <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                      <DialogTitle>Sincronizar pedidos do Bling</DialogTitle>
                      <DialogDescription>
                        1) Autorize o acesso no Bling. 2) Selecione o período e sincronize os pedidos.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <Button onClick={startBlingAuth} disabled={authInProgress}>
                          {authInProgress ? 'Abrindo autorização…' : '🔐 Autorizar no Bling'}
                        </Button>
                        <span className="text-xs text-gray-500">
                          Uma nova aba será aberta; finalize lá e volte aqui.
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Data inicial</label>
                          <Input
                            type="date"
                            value={dataInicialSync}
                            onChange={(e) => setDataInicialSync(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Data final</label>
                          <Input
                            type="date"
                            value={dataFinalSync}
                            onChange={(e) => setDataFinalSync(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <DialogFooter className="mt-6 gap-2 sm:gap-0">
                      <Button variant="outline" onClick={() => setBlingDialogOpen(false)} disabled={syncInProgress || authInProgress}>
                        Fechar
                      </Button>
                      <Button onClick={syncBlingPedidos} disabled={syncInProgress || authInProgress}>
                        {syncInProgress ? 'Sincronizando…' : '🔄 Sincronizar'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="outline"
                  onClick={() => setReportDialogOpen(true)}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Relatórios
                </Button>

                <Button variant="default" onClick={() => setLoadDialogOpen(true)}>
                   <Download className="w-4 h-4 mr-2" />
                   Carregar Pedidos
                 </Button>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            <StatsCard title="Total de Pedidos" value={stats.total} icon="📋" color="bg-blue-100" description="Todos os pedidos de produção" />
            <StatsCard title="Em Produção" value={stats.inProgress} icon="⚙️" color="bg-orange-100" description="Pedidos em andamento" />
            <StatsCard title="Finalizados" value={stats.completed} icon="✅" color="bg-green-100" description="Pedidos expedidos" />
            <StatsCard title="Alta Prioridade" value={stats.highPriority} icon="🔥" color="bg-red-100" description="Pedidos urgentes" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-6 overflow-x-auto pb-6"
          >
            {sectors.map((sector) => (
              <KanbanColumn
                key={sector}
                sector={sector}
                tasks={filteredTasks}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onTaskClick={handleTaskClick}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              />
            ))}
          </motion.div>

          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleNewTask} className="floating-add-btn">
            <Plus className="w-6 h-6" />
          </motion.button>

          <AnimatePresence>
            {isModalOpen && (
              <TaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                task={selectedTask}
                onSave={handleSaveTask}
                isEditing={isEditing}
              />
            )}
          </AnimatePresence>
        </div>
        <Toaster />
      </div>

      {/* ▶️ NOVO: Modal de Confirmação de Apontamento */}
      <Dialog open={confirmMove.open} onOpenChange={(open) => !isMoving && setConfirmMove((prev) => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Confirmar apontamento</DialogTitle>
            <DialogDescription>
              {confirmMove.task && (
                <span>
                  Confirmar apontamento do Pedido Nº <b>{confirmMove.task.orderNumber}</b> do setor{' '}
                  <b>{sectorLabel(confirmMove.task.sector)}</b> para o setor{' '}
                  <b>{sectorLabel(confirmMove.newSector)}</b>?
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Informações adicionais do pedido */}
          {confirmMove.task && (
            <div className="mt-4 space-y-2 text-sm text-gray-700">
              <div><b>Cliente:</b> {confirmMove.task.client}</div>
              <div><b>Descrição:</b> {confirmMove.task.description || '—'}</div>
              <div className="text-xs text-gray-500">Última atualização: {new Date(confirmMove.task.updatedAt || Date.now()).toLocaleString()}</div>
            </div>
          )}

          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button variant="outline" onClick={cancelMoveAction} disabled={isMoving}>
              Cancelar
            </Button>
            <Button onClick={confirmMoveAction} disabled={isMoving}>
              {isMoving ? 'Movendo…' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ▶️ Modal: Lista de Relatórios */}
      <Dialog open={reportDialogOpen} onOpenChange={(o) => setReportDialogOpen(o)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Relatórios disponíveis</DialogTitle>
            <DialogDescription>Selecione um relatório para inserir os parâmetros.</DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                <div>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-gray-500">Clique para definir parâmetros e gerar</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openReportParams(r)}>Parâmetros</Button>
                  <Button size="sm" onClick={() => { setSelectedReport(r); setReportParamsOpen(true); }}>Gerar</Button>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ▶️ Modal: Parâmetros do Relatório selecionado */}
      <Dialog open={reportParamsOpen} onOpenChange={(o) => setReportParamsOpen(o)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Parâmetros: {selectedReport?.title}</DialogTitle>
            <DialogDescription>Preencha o período e a senha (se necessário).</DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data inicial</label>
                <Input
                  type="date"
                  value={reportParams.dataInicial}
                  onChange={(e) => setReportParams((p) => ({ ...p, dataInicial: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data final</label>
                <Input
                  type="date"
                  value={reportParams.dataFinal}
                  onChange={(e) => setReportParams((p) => ({ ...p, dataFinal: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <Input
                type="password"
                placeholder="Senha (se aplicável)"
                value={reportParams.password}
                onChange={(e) => setReportParams((p) => ({ ...p, password: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setReportParamsOpen(false); setSelectedReport(null); }}>Cancelar</Button>
            <Button onClick={generateReport}>Gerar relatório</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ▶️ NOVO: Modal Carregar Pedidos */}
      <Dialog open={loadDialogOpen} onOpenChange={(o) => setLoadDialogOpen(o)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Digite a senha</DialogTitle>
            <DialogDescription>Necessária para carregar os pedidos do servidor.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              type="password"
              placeholder="Senha"
              value={loadPassword}
              onChange={(e) => setLoadPassword(e.target.value)}
            />
          </div>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setLoadDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={async () => {
                if (!requirePassword(loadPassword)) return;
                setLoadDialogOpen(false);
                await handleLoadPedidos(loadPassword);
                setLoadPassword('');
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={baixaDialogOpen} onOpenChange={(o) => { if (!baixaInProgress) setBaixaDialogOpen(o) }}>
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>Baixar Pedidos</DialogTitle>
          <DialogDescription>Selecione os pedidos e clique em “Realizar Baixa”.</DialogDescription>
        </DialogHeader>

        {/* Busca */}
        <div className="flex items-center gap-2 my-2">
          <div className="relative grow">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por número, cliente, item…"
              value={baixaSearch}
              onChange={(e) => setBaixaSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={toggleSelectAll}>
            {baixaList.length > 0 && baixaList.every((t) => baixaSelected.has(t.orderNumber))
              ? 'Desmarcar todos'
              : 'Selecionar todos'}
          </Button>
        </div>

                {/* Tabela */}
                {/* Tabela com scroll interno e altura máxima */}
        <div className="border rounded-md overflow-hidden mt-2">
          <div className="max-h-[400px] overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="text-left">
                  <th className="p-3">Selecionar</th>
                  <th className="p-3">Nº Pedido</th>
                  <th className="p-3">Data</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Total Peças</th>
                </tr>
              </thead>
              <tbody>
                {baixaList.length === 0 && (
                  <tr>
                    <td className="p-4 text-gray-500" colSpan={5}>
                      Nenhum pedido encontrado.
                    </td>
                  </tr>
                )}
                {baixaList.map((t) => {
                  const selected = baixaSelected.has(t.orderNumber);
                  const dataExib = (t.dataEntrega || t.dataEmissao || '').slice(0, 10);
                  return (
                    <tr
                      key={t.orderNumber}
                      className="border-t hover:bg-gray-50 transition-colors"
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelectOne(t.orderNumber)}
                        />
                      </td>
                      <td className="p-3 font-medium whitespace-nowrap">
                        {t.orderNumber}
                      </td>
                      <td className="p-3">{dataExib || '—'}</td>
                      <td className="p-3 truncate max-w-[200px]">{t.client || '—'}</td>
                      <td className="p-3">{getTotalPecas(t)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>


        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setBaixaDialogOpen(false)} disabled={baixaInProgress}>
            Fechar
          </Button>
          <Button
            onClick={() => {
              if (baixaSelected.size === 0) {
                toast({ title: '⚠️ Selecione ao menos um pedido', description: 'Marque os pedidos na tabela.' });
                return;
              }
              setBaixaPwdDialogOpen(true);
            }}
            disabled={baixaInProgress}
          >
            {baixaInProgress ? 'Processando…' : 'Realizar Baixa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={baixaPwdDialogOpen} onOpenChange={(o) => setBaixaPwdDialogOpen(o)}>
    <DialogContent className="sm:max-w-[420px]">
      <DialogHeader>
        <DialogTitle>Digite a senha</DialogTitle>
        <DialogDescription>Necessária para confirmar a baixa dos pedidos selecionados.</DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <Input
          type="password"
          placeholder="Senha"
          value={baixaPassword}
          onChange={(e) => setBaixaPassword(e.target.value)}
          disabled={baixaInProgress}
        />
      </div>

      <DialogFooter className="mt-4 gap-2 sm:gap-0">
        <Button variant="outline" onClick={() => setBaixaPwdDialogOpen(false)} disabled={baixaInProgress}>
          Cancelar
        </Button>
        <Button
          onClick={async () => {
            if (!requirePassword(baixaPassword)) return;
            await realizarBaixaPedidos();
          }}
          disabled={baixaInProgress}
        >
          {baixaInProgress ? 'Baixando…' : 'Confirmar Baixa'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

    </>
    
  );
}

export default App;
