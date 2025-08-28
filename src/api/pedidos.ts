import api from './axios';

export type SetorEntity = { id?: number; nome?: string | null };
export type ClienteDTOResponse = { id?: number; nome?: string | null; documento?: string | null };

export type ItemPedidoResponseDTO = {
  id: number;
  codigo: string | null;
  unidade: string | null;
  desconto: number | null;
  valor: number | null;
  descricao: string | null;
  quantidade: number | null;
  descricaoDetalhada: string | null;
  corMadeira: string | null;
  corRevestimento: string | null;
  detalhesMedidas: string | null;
  produto: any | null;
  pedidoVenda?: any | null;
};

export type PedidoVendaResponseDTO = {
  id: number;
  numero: number;
  dataEmissao: string | null;   // backend envia Date -> JSON string
  dataEntrega: string | null;
  dataPrevista: string | null;
  total: number | null;
  setor: SetorEntity | null;
  cliente: ClienteDTOResponse | null;
  itens: ItemPedidoResponseDTO[];
};

export async function listarPedidosPorPeriodo(dataInicial: string, dataFinal: string) {
  const { data } = await api.get<PedidoVendaResponseDTO[]>('/pedidos-venda', { params: { dataInicial, dataFinal }});
  return data;
}

// Ajuste este endpoint conforme seu backend (ex.: PUT /pedidos-venda/{id}/setor?nome=marcenaria)
export async function atualizarSetorDoPedido(pedidoId: number, novoSetor: string) {
  // Exemplo genérico; altere quando criar o endpoint real:
  try {
    await api.put(`/pedidos-venda/${pedidoId}/setor`, null, { params: { nome: novoSetor } });
  } catch {
    // Se ainda não tiver endpoint, ignora silenciosamente (mantém só no front por enquanto)
  }
}
