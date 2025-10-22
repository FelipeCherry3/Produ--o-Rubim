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

const buildPrintableHtml = ({ tasks, sector, summary }) => {
  const now = new Date();
  const dataImpressao = now.toLocaleString('pt-BR');
  const empresa = 'Rubim Mesas e Cadeiras';
  const nomeSetor = sectorLabel(sector);

  // Utilitários
  const fmt = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
  const ucFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

  // Cabeçalho + corpo
  const pedidosHtml = tasks
    .map((t) => {
      const itens = (t.products || [])
        .map(
          (p) =>
            `<li>${p.quantity || 0}x ${p.name || '—'}${
              p.woodColor ? ` • Madeira: ${p.woodColor}` : ''
            }${p.coatingColor ? ` • Revest.: ${p.coatingColor}` : ''}${
              p.details ? ` • Detalhes: ${p.details}` : ''
            } ${p.detalhesMedidas ? ` • Medidas: ${p.detalhesMedidas}` : ''}</li>`

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

  const itensSetorHtml = summary
    .map((s) => `<li><b>${s.quantity}</b> — ${s.label}</li>`)
    .join('');

  // CSS simples e limpo para impressão
  const styles = `
    <style>
      * { box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; margin: 24px; color: #111; }
      .header {
        border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px;
        display: flex; align-items: center; justify-content: space-between;
      }
      .empresa { font-size: 20px; font-weight: 800; }
      .meta { text-align: right; font-size: 12px; color: #444; }
      .titulo { margin: 0; font-size: 18px; }
      .sub { margin: 2px 0 0; }
      h2 { font-size: 16px; margin: 20px 0 8px; }
      h3 { font-size: 14px; margin: 16px 0 8px; }
      .resumo, .pedidos { page-break-inside: avoid; }
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

        <section class="resumo">
          <h2>Itens no Setor (Modelo — Quantidade)</h2>
          ${
            summary.length
              ? `<ul>${itensSetorHtml}</ul>`
              : '<p>Sem itens.</p>'
          }
        </section>

        <section class="pedidos">
          <h2>Lista de Pedidos</h2>
          ${pedidosHtml || '<p>Nenhum pedido neste setor.</p>'}
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
  const html = buildPrintableHtml({ tasks, sector, summary });

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
    // cai para o fallback
    console.warn('document.write falhou, usando Blob URL:', e);
  }

  // 2) Fallback robusto: Blob URL (funciona mesmo quando o write é bloqueado)
  try {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win2 = window.open(url, '_blank'); // abrir a página já com o conteúdo
    // Se quiser, pode revogar depois de alguns segundos:
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
