import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { List, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

const sectorLabel = (key) => {
  const map = {
    usinagem: 'Usinagem',
    marcenaria: 'Marcenaria',
    montagem: 'Montagem',
    tapeçaria: 'Tapeçaria',
    lustracao: 'Lustração',
    expedicao: 'Expedição',
  };
  return map[key] || key;
};

// --- Helpers de categorização/normalização usados na impressão ---
const norm = (v) =>
  (v ?? '')
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();

/** Classifica o produto em CADEIRAS | MESAS | OUTROS com base no nome */
const classifyCategory = (productNameRaw) => {
  const s = norm(productNameRaw).toUpperCase();
  // palavras-chave — ajuste livre conforme seu catálogo
  const isChair =
    s.includes('CADEIRA') || s.includes('POLTRONA') || s.includes('BANCO') || s.includes('CADEIRAO');
  const isTable =
    s.includes('MESA') || s.includes('TAMPO') || s.includes('REDONDA') || s.includes('RETANGULAR');

  if (isChair) return 'CADEIRAS';
  if (isTable) return 'MESAS';
  return 'OUTROS';
};

/** Retorna o detalhe a exibir conforme setor */
const detailBySector = (p, sector) => {
  switch (sector) {
    case 'usinagem':
      return (p.detalhesMedidas && p.detalhesMedidas.trim()) ? p.detalhesMedidas.trim() : '—';
    case 'tapeçaria':
      return (p.coatingColor && p.coatingColor.trim()) ? p.coatingColor.trim() : '—';
    case 'lustracao':
      return (p.woodColor && p.woodColor.trim()) ? p.woodColor.trim() : '—';
    default:
      // fallback: usa "details" (descricaoDetalhada) se for útil para o setor
      return '—';
  }
};

/** Ordenação por categoria (cadeiras → mesas → outros) */
const categoryOrderIndex = (cat) => {
  switch (cat) {
    case 'CADEIRAS': return 0;
    case 'MESAS': return 1;
    default: return 2; // OUTROS
  }
};

const buildPrintableHtml = ({ tasks, sector, summary }) => {
  const now = new Date();
  const dataImpressao = now.toLocaleString('pt-BR');
  const empresa = 'Rubim Mesas e Cadeiras';
  const nomeSetor = sectorLabel(sector);

  // Utilitários
  const fmt = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
  const ucFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

  // ====== (1) Montagem da LISTA DE PEDIDOS (mantida do seu código) ======
  const pedidosHtml = tasks
    .map((t) => {
      const itens = (t.products || [])
        .map(
          (p) =>
            `<li>${p.quantity || 0}x ${p.name || '—'}${
              p.woodColor ? ` • Madeira: ${p.woodColor}` : ''
            }${p.coatingColor ? ` • Revest.: ${p.coatingColor}` : ''}${
              p.details ? ` • Detalhes: ${p.details}` : ''
            }${p.detalhesMedidas ? ` • Medidas: ${p.detalhesMedidas}` : ''}</li>`
        )
        .join('');

      return `
        <div class="pedido">
          <div class="pedido-top">
            <span class="numero">Pedido #${t.orderNumber || '—'}</span>
            <span class="prioridade ${t.priority || ''}">${ucFirst(t.priority || 'normal')}</span>
          </div>
          <div class="linhas">
            <div><b>Cliente:</b> ${t.client || '—'}</div>
            <div><b>Data do pedido:</b> ${fmt(t.dataEmissao)}</div>
            <div><b>Entrega:</b> ${fmt(t.dueDate || t.dataEntrega)}</div>
          </div>
          ${
            itens
              ? `<div class="itens"><b>Itens:</b><ul>${itens}</ul></div>`
              : `<div class="itens"><b>Itens:</b> —</div>`
          }
        </div>
      `;
    })
    .join('');

  // ====== (2) NOVA TABELA "ITENS AGRUPADOS POR CATEGORIA" ======
  // Flatten de todos os produtos das tasks
  const allProducts = [];
  (tasks || []).forEach((t) => {
    (t.products || []).forEach((p) => {
      const cat = classifyCategory(p.name || '');
      const detail = detailBySector(p, sector);
      const cleanName = (p.name || '—').trim();
      const qty = Number.isFinite(+p.quantity) ? +p.quantity : 0;

      // chave de agregação: categoria + nome + detalhe
      const key = `${cat}__${norm(cleanName).toUpperCase()}__${norm(detail).toUpperCase()}`;
      allProducts.push({
        key,
        categoria: cat,
        nome: cleanName,
        detalhe: detail,
        quantidade: qty,
      });
    });
  });

  // Agregar quantidades por (categoria, nome, detalhe)
  const aggMap = new Map();
  allProducts.forEach((row) => {
    if (aggMap.has(row.key)) {
      aggMap.set(row.key, {
        ...aggMap.get(row.key),
        quantidade: aggMap.get(row.key).quantidade + row.quantidade,
      });
    } else {
      aggMap.set(row.key, { ...row });
    }
  });

  // Ordenar: categoria (cadeiras→mesas→outros), depois nome (A-Z), depois detalhe (A-Z)
  const aggregated = Array.from(aggMap.values()).sort((a, b) => {
    const byCat = categoryOrderIndex(a.categoria) - categoryOrderIndex(b.categoria);
    if (byCat !== 0) return byCat;
    const byName = a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    if (byName !== 0) return byName;
    return a.detalhe.localeCompare(b.detalhe, 'pt-BR', { sensitivity: 'base' });
  });

  // Render por categoria com tabela
  const renderTable = (rows) => {
    if (!rows.length) return '<p class="muted">Sem itens nesta categoria.</p>';
    const trs = rows
      .map(
        (r) => `
      <tr>
        <td class="td-left">${r.nome}</td>
        <td class="td-center">${r.quantidade}</td>
        <td class="td-left">${r.detalhe}</td>
      </tr>`
      )
      .join('');
    return `
      <div class="tbl-wrap">
        <table class="table-agg">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Quantidade</th>
              <th>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            ${trs}
          </tbody>
        </table>
      </div>
    `;
  };

  const catCadeiras = aggregated.filter((r) => r.categoria === 'CADEIRAS');
  const catMesas = aggregated.filter((r) => r.categoria === 'MESAS');
  const catOutros = aggregated.filter((r) => r.categoria === 'OUTROS');

  const itensPorCategoriaHtml = `
    <h3 class="cat-title">Cadeiras</h3>
    ${renderTable(catCadeiras)}
    <h3 class="cat-title">Mesas</h3>
    ${renderTable(catMesas)}
    <h3 class="cat-title">Outros</h3>
    ${renderTable(catOutros)}
  `;

  // ====== (3) Seu resumo atual (mantido) ======
  const itensSetorHtml = summary
    .map((s) => `<li><b>${s.quantity}</b> — ${s.label}</li>`)
    .join('');


  // ====== CSS revisado =======
  const styles = `
    <style>
      * { box-sizing: border-box; }
      html, body { height: 100%; }
      body { font-family: Arial, Helvetica, sans-serif; margin: 24px; color: #111; }
      .header {
        border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px;
        display: flex; align-items: center; justify-content: space-between;
      }
      .empresa { font-size: 20px; font-weight: 800; }
      .meta { text-align: right; font-size: 12px; color: #444; }
      .titulo { margin: 0; font-size: 18px; }
      .sub { margin: 2px 0 0; }
      h2 { font-size: 16px; margin: 20px 0 8px; text-align: center; }
      h3 { font-size: 14px; margin: 16px 0 8px; }
      section { margin-bottom: 24px; }
      ul { margin: 6px 0 0 18px; }
      li { margin: 2px 0; }
      .pedido {
        border: 1px solid #ddd; border-radius: 8px; padding: 10px; margin-bottom: 10px;
      }
      .pedido-top { display:flex; justify-content: space-between; align-items:center; margin-bottom:6px; }
      .numero { font-weight: 700; }
      .prioridade { padding: 2px 8px; border-radius: 999px; font-size: 11px; border: 1px solid #ccc; }
      .prioridade.alta  { border-color: #e11; color: #a00; }
      .prioridade.media { border-color: #ea0; color: #a60; }
      .prioridade.baixa { border-color: #0a0; color: #064; }
      .linhas { font-size: 12px; display:grid; grid-template-columns: repeat(3, 1fr); gap: 4px 12px; margin-bottom: 8px; }
      .itens ul { margin-left: 16px; }
      .footer {
        margin-top: 24px; padding-top: 12px; border-top: 1px dashed #bbb; font-size: 11px; color: #555;
      }

      /* Tabela agregada centralizada e com bordas */
      .cat-title { margin-top: 18px; text-transform: uppercase; letter-spacing: .6px; }
      .tbl-wrap { display: flex; justify-content: center; margin-bottom: 10px; }
      .table-agg { border-collapse: collapse; width: 100%; max-width: 900px; }
      .table-agg th, .table-agg td {
        border: 1px solid #444; padding: 6px 8px; font-size: 12px;
      }
      .table-agg thead th {
        text-align: center; background: #f0f0f0; font-weight: 700;
      }
      .td-center { text-align: center; width: 110px; }
      .td-left { text-align: left; }

      .muted { font-size: 12px; color: #666; text-align: center; }

      @media print {
        .no-print { display: none !important; }
        body { margin: 12mm; }
      }
    </style>
  `;

  return `
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Impressão — ${nomeSetor}</title>
        ${styles}
      </head>
      <body>
        <header class="header">
          <div>
            <div class="empresa">${empresa}</div>
            <h1 class="titulo">Relatório de Produção — ${nomeSetor}</h1>
            <div class="sub">Data da impressão: ${dataImpressao}</div>
          </div>
          <div class="meta">
            <div>Setor: <b>${nomeSetor}</b></div>
            <div>Pedidos: ${tasks.length}</div>
          </div>
        </header>

        <section class="agg">
          <h2>Itens no Setor (Agrupados por Categoria)</h2>
          ${itensPorCategoriaHtml}
        </section>

        <section class="pedidos">
          <h2>Lista de Pedidos</h2>
          ${pedidosHtml || '<p class="muted">Nenhum pedido neste setor.</p>'}
        </section>

        <footer class="footer">
          Gerado automaticamente pelo sistema de PCP — ${empresa}
        </footer>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(() => window.close(), 300);
          }
        </script>
      </body>
    </html>
  `;
};

const ProductionSummary = ({ tasks, sector, extraTasksForSummary = [] }) => {
  // mantém seu resumo visível (sem alterações na regra)
  const summary = useMemo(() => {
    const productMap = new Map();

    const sourceTasks = sector === 'usinagem'
      ? [...(tasks || []), ...(extraTasksForSummary || [])]
      : (tasks || []);

    sourceTasks.forEach((task) => {
      if (!task.products) return;
      task.products.forEach((product) => {
        let key;
        let label;

        switch (sector) {
          case 'usinagem':
            key = `${product.name} - ${product.detalhesMedidas || 'N/A'}`;
            label = `${product.name} (${product.detalhesMedidas || 'N/A'})`;
            break;
          case 'tapeçaria':
            key = `${product.name} - ${product.coatingColor || 'N/A'}`;
            label = `${product.name} (${product.coatingColor || 'N/A'})`;
            break;
          case 'lustracao':
            key = `${product.name} - ${product.woodColor || 'N/A'}`;
            label = `${product.name} (${product.woodColor || 'N/A'})`;
            break;
          default:
            key = product.name;
            label = product.name;
            break;
        }

        if (productMap.has(key)) {
          productMap.set(key, {
            ...productMap.get(key),
            quantity: productMap.get(key).quantity + (product.quantity || 0),
          });
        } else {
          productMap.set(key, {
            label,
            quantity: product.quantity || 0,
          });
        }
      });
    });

    return Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity);
  }, [tasks, sector, extraTasksForSummary]);

  const handlePrint = () => {
    // Mesma regra do summary: em usinagem, somar tasks + extraTasksForSummary
    const tasksForPrint = sector === 'usinagem'
      ? [...(tasks || []), ...(extraTasksForSummary || [])]
      : (tasks || []);
    const html = buildPrintableHtml({ tasks: tasksForPrint, sector, summary });

    // 1) Tenta abrir janela e escrever diretamente (mais rápido)
    try {
      const win = window.open('', '_blank'); // sem noopener/noreferrer para não quebrar o write em alguns navegadores
      if (win && win.document) {
        win.document.open();
        win.document.write(html);
        win.document.close();
        return;
      }
    } catch (e) {
      console.warn('document.write falhou, usando Blob URL:', e);
    }

    // 2) Fallback robusto: Blob URL (funciona mesmo quando o write é bloqueado)
    try {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const win2 = window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      if (win2) return;
    } catch (e) {
      console.error('Blob URL falhou:', e);
    }

    // 3) Último recurso: data URL (menos ideal, mas quebra o galho)
    try {
      const encoded = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
      window.location.href = encoded; // abre na própria aba
    } catch (e) {
      console.error('Falha geral ao abrir impressão:', e);
      alert('Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups.');
    }
  };

  if (summary.length === 0) {
    return (
      <div className="p-3 border-b border-t bg-gray-50/50 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2 m-0">
          <List className="w-4 h-4" />
          Resumo da Produção
        </h4>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-1" />
          Imprimir
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="p-3 border-b border-t bg-gray-50/50"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <List className="w-4 h-4" />
          Resumo da Produção
        </h4>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-1" />
          Imprimir
        </Button>
      </div>
      <div className="max-h-32 overflow-y-auto pr-2 space-y-1">
        {summary.map((item, index) => (
          <div key={index} className="flex justify-between items-center text-xs text-gray-600">
            <span className="truncate pr-2">{item.label}</span>
            <span className="font-bold bg-gray-200 text-gray-800 rounded-full px-2 py-0.5">
              {item.quantity}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default ProductionSummary;
