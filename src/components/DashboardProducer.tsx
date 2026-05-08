import React, { useState, useEffect } from 'react';
import { 
  db, 
  createProduct, 
  featureProduct, 
  getWallet, 
  requestWithdrawal, 
  updateOrderStatus 
} from '../firebase';
import { generateProductDescription } from '../services/gemini';
import { 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { Product, Order, Wallet, Withdrawal, UserProfile } from '../types';
import { 
  Sparkles, 
  Plus, 
  DollarSign, 
  ArrowUpRight, 
  Percent, 
  Eye, 
  Clock, 
  Check, 
  X, 
  Award, 
  MessageSquare,
  Flame,
  LayoutGrid,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProducerProps {
  userId: string;
  userProfile: UserProfile;
  onOpenChat: (orderId: string) => void;
}

export function DashboardProducer({ userId, userProfile, onOpenChat }: DashboardProducerProps) {
  // DB feeds
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  // Form entries
  const [prodNome, setProdNome] = useState('');
  const [prodDescricao, setProdDescricao] = useState('');
  const [prodPreco, setProdPreco] = useState('');
  const [comissaoAfiliadoInput, setComissaoAfiliadoInput] = useState('10');
  const [imageUrlInput, setImageUrlInput] = useState('');

  // AI generator entries
  const [bulletsAi, setBulletsAi] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  // Withdrawal entries
  const [withdrawValor, setWithdrawValor] = useState('');
  const [withdrawMetodo, setWithdrawMetodo] = useState<'IBAN' | 'PayPay' | 'Unitel Money' | 'Afrimoney' | 'Multicaixa Express'>('IBAN');
  const [withdrawDetalhes, setWithdrawDetalhes] = useState('');

  // UI state
  const [activeTab, setActiveTab] = useState<'meus_produtos' | 'vendas_pedidos' | 'cadastrar_produto' | 'carteira_saque'>('meus_produtos');
  const [savingProduct, setSavingProduct] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Products of this producer
    const qProds = query(collection(db, 'products'), where('produtor_id', '==', userId));
    const unsubProds = onSnapshot(qProds, (snap) => {
      setProducts(snap.docs.map(d => d.data() as Product));
    });

    // 2. Orders belonging to this producer's products
    const qOrders = query(collection(db, 'orders'), where('produtor_id', '==', userId));
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      setOrders(snap.docs.map(d => d.data() as Order));
    });

    // 3. Wallet
    const unsubWallet = onSnapshot(collection(db, 'wallets'), (snap) => {
      const match = snap.docs.find(d => d.id === userId);
      if (match) {
        setWallet(match.data() as Wallet);
      }
    });

    // 4. Withdrawals of this user
    const qWith = query(collection(db, 'withdrawals'), where('user_id', '==', userId));
    const unsubWith = onSnapshot(qWith, (snap) => {
      setWithdrawals(snap.docs.map(d => d.data() as Withdrawal));
    });

    return () => {
      unsubProds();
      unsubOrders();
      unsubWallet();
      unsubWith();
    };
  }, [userId]);

  const handleAskAIForDescription = async () => {
    if (!prodNome.trim()) {
      alert("Por favor escreva o nome do produto primeiro!");
      return;
    }
    setAiGenerating(true);
    try {
      const copy = await generateProductDescription(prodNome, bulletsAi);
      setProdDescricao(copy);
      triggerSuccess("Descrição gerada pela Inteligência Artificial Gemini!");
    } catch (err: any) {
      setApiError("Erro ao solicitar descrição generativa.");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodNome.trim() || !prodDescricao.trim() || !prodPreco) return;

    setSavingProduct(true);
    setApiError(null);
    try {
      await createProduct(
        userId,
        prodNome,
        prodDescricao,
        parseFloat(prodPreco),
        parseInt(comissaoAfiliadoInput),
        imageUrlInput
      );
      
      triggerSuccess("Produto cadastrado com sucesso! Aguarda aprovação do ADM.");
      
      // Cleanup
      setProdNome('');
      setProdDescricao('');
      setProdPreco('');
      setImageUrlInput('');
      setBulletsAi('');
      setComissaoAfiliadoInput('10');
      
      setActiveTab('meus_produtos');
    } catch (err: any) {
      setApiError(err?.message || "Erro ao registar o produto.");
    } finally {
      setSavingProduct(false);
    }
  };

  const handleFeatureProductPayment = async (productId: string) => {
    if (!window.confirm("Pretende pagar uma taxa de 2.500 Kz para destacar este produto na montra principal? O valor será deduzido do seu saldo.")) {
      return;
    }
    try {
      await featureProduct(productId, userId);
      triggerSuccess("Produto promovido a Destaque de Sucesso!");
    } catch (err: any) {
      alert(err.message || "Erro ao destacar produto.");
    }
  };

  const handleUpdateStatus = async (orderId: string, nextStatus: any) => {
    try {
      await updateOrderStatus(orderId, nextStatus);
      triggerSuccess(`Estado alterado com sucesso!`);
    } catch (error: any) {
      alert(error.message || "Não foi possível gerenciar o estado da encomenda.");
    }
  };

  const handleRequestWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);
    setWithdrawSuccess(null);
    const amount = parseFloat(withdrawValor);
    
    if (isNaN(amount) || amount < 200) {
      setWithdrawError("O valor mínimo para solicitação de saque é de 200 Kz.");
      return;
    }
    if (!withdrawDetalhes.trim()) {
      setWithdrawError("Por favor forneça os detalhes de transação válidos.");
      return;
    }

    try {
      await requestWithdrawal(
        userId, 
        userProfile.nome, 
        userProfile.tipo, 
        amount, 
        withdrawMetodo, 
        withdrawDetalhes
      );
      
      setWithdrawSuccess(`Saque de ${amount.toLocaleString()} Kz solicitado pendente de aprovação.`);
      setWithdrawValor('');
      setWithdrawDetalhes('');
    } catch (err: any) {
      setWithdrawError(err.message || "Erro ao processar as finanças.");
    }
  };

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Computations
  const liveApprovedProducts = products.filter(p => p.status === 'approved');
  const revenueTotal = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + o.comissao_produtor_paga, 0);

  return (
    <div className="space-y-6" id="producer_dashboard">
      
      {/* Alert toast info */}
      {successMsg && (
        <div className="fixed top-24 right-6 bg-slate-900 border-l-4 border-blue-500 text-blue-400 p-4 rounded-xl shadow-2xl z-50 flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Header Row */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <span className="text-xs font-mono uppercase bg-blue-500/10 text-blue-400 p-1 px-2.5 rounded border border-blue-500/20 font-bold">Produtor Local</span>
          <h2 className="text-3xl font-display font-black tracking-tight mt-1">Painel do Vendedor</h2>
          <p className="text-sm text-slate-400">Gira e publique seu inventário em Angola, configure comissões de afiliados e fature no CoD.</p>
        </div>
        
        {/* Short info bar */}
        <div className="flex items-center gap-5 bg-slate-900/60 p-4 rounded-2xl border border-white/10">
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">Seu Saldo Disponível</div>
            <div className="text-2xl font-display font-black text-emerald-400">
              {(wallet?.saldo || 0).toLocaleString()} <span className="text-xs font-sans font-normal text-emerald-400">Kz</span>
            </div>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Options Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-px">
        {[
          { id: 'meus_produtos', label: 'Meus Produtos', icon: LayoutGrid, count: products.length },
          { id: 'vendas_pedidos', label: 'Entregas & Vendas', icon: FileSpreadsheet, count: orders.filter(o => o.status !== 'delivered').length },
          { id: 'cadastrar_produto', label: '+ Publicar Novo', icon: Plus },
          { id: 'carteira_saque', label: 'Carteira & Saques', icon: ArrowUpRight }
        ].map(item => {
          const Icon = item.icon;
          const isSel = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-semibold transition-all ${
                isSel 
                  ? 'bg-blue-600/10 border-t border-r border-l border-blue-500/30 text-white border-b-2 border-b-blue-500' 
                  : 'text-slate-400 hover:text-slate-200 border-b border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
              {item.count !== undefined && item.count > 0 && (
                <span className="bg-slate-800 text-xs text-slate-300 rounded-full w-5 h-5 flex items-center justify-center font-mono">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Switch panel context */}
      <div className="min-h-[300px]">
        {/* MEUS PRODUTOS */}
        {activeTab === 'meus_produtos' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-medium text-lg">Catálogo Geral ({products.length})</h3>
              <button 
                onClick={() => setActiveTab('cadastrar_produto')}
                className="bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs p-2 px-3.5 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" /> Novo Produto
              </button>
            </div>

            {products.length === 0 ? (
              <div className="glass-panel rounded-2xl p-8 text-center text-slate-500">
                <p className="font-medium mb-1">Ainda não registou nenhum produto!</p>
                <p className="text-xs mb-4">Adicione o seu inventário e deixe as Inteligências Artificiais criarem sua descrição.</p>
                <button
                  onClick={() => setActiveTab('cadastrar_produto')}
                  className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-700"
                >
                  Criar Primeiro Produto
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {products.map(prod => (
                  <div key={prod.id} className="bg-[#0B0F19] rounded-2xl overflow-hidden border border-white/5 flex flex-col justify-between">
                    <div className="p-5 space-y-3.5">
                      <div className="flex justify-between items-start gap-2">
                        {/* Status Label */}
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-black ${
                          prod.status === 'approved' ? 'bg-green-500/10 text-green-400' :
                          prod.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {prod.status === 'approved' ? 'PUBLICADO' :
                           prod.status === 'rejected' ? 'REJEITADO' : 'AGUARDA REVISÃO'}
                        </span>
                        
                        {prod.featured && (
                          <span className="bg-amber-500 text-slate-950 font-display font-black text-[9px] p-0.5 px-2 rounded-full flex items-center gap-0.5 shadow-lg shadow-amber-500/20">
                            <Flame className="w-2.5 h-2.5 fill-black" /> DESTAQUE
                          </span>
                        )}
                      </div>

                      {prod.imageUrl && (
                        <div className="w-full h-32 rounded-xl overflow-hidden bg-slate-900 border border-white/5 relative">
                          <img 
                            src={prod.imageUrl} 
                            alt={prod.nome} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              // If image loading fails, fall back to blank spacer
                              (e.target as any).style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <h4 className="font-display font-bold text-base text-slate-100">{prod.nome}</h4>
                        <div className="text-xl font-display font-black text-blue-400">{prod.preço.toLocaleString()} Kz</div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 italic">
                        "{prod.descrição}"
                      </p>

                      <div className="border-t border-slate-905 pt-2 flex justify-between items-center text-[11px] text-slate-400 font-mono">
                        <span>Comissão Afiliados:</span>
                        <span className="font-bold text-purple-400">{prod.comissão_afiliado}%</span>
                      </div>
                    </div>

                    <div className="bg-slate-900/60 p-4 border-t border-slate-800/80 flex justify-between items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-mono">Código: #{prod.id.substr(5, 5)}</span>
                      {prod.status === 'approved' && !prod.featured && (
                        <button
                          onClick={() => handleFeatureProductPayment(prod.id)}
                          className="text-xs font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-500/20 flex items-center gap-1.5"
                        >
                          <Flame className="w-3.5 h-3.5 fill-amber-400" /> Promover Destaque (2500 Kz)
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CADASTRAR PRODUTO */}
        {activeTab === 'cadastrar_produto' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
            {/* Direct Form */}
            <form onSubmit={handleCreateProductSubmit} className="bg-slate-900/30 p-6 rounded-2xl border border-white/10 space-y-4">
              <h3 className="font-display font-bold text-lg">Detalhes do Novo Produto</h3>
              
              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-slate-450 block">Nome Comercial</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Fuba de Bombó Lubango Premium"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 placeholder-slate-500"
                  value={prodNome}
                  onChange={(e) => setProdNome(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-slate-450 block">Preço de Venda (Kz)</label>
                  <input
                    type="number"
                    required
                    placeholder="Ex: 5500"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                    value={prodPreco}
                    onChange={(e) => setProdPreco(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-slate-450 block">Comissão Afiliados (%)</label>
                  <select
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                    value={comissaoAfiliadoInput}
                    onChange={(e) => setComissaoAfiliadoInput(e.target.value)}
                  >
                    <option value="5">5% comissão</option>
                    <option value="10">10% comissão</option>
                    <option value="15">15% comissão</option>
                    <option value="20">20% comissão</option>
                    <option value="30">30% comissão</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-slate-450 block">URL da Imagem Ilustrativa (Opcional)</label>
                <input
                  type="url"
                  placeholder="Ex: https://images.unsplash.com/photo-or-link"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 placeholder-slate-600"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-slate-450 block flex justify-between">
                  <span>Descrição de Venda</span>
                  <span className="text-[10px] text-slate-400 capitalize hover:text-white cursor-pointer" onClick={() => setProdDescricao('')}>Limpar campo</span>
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Escreva sobre o produto ou use o Assistente Gemini de IA ao lado..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-blue-500 whitespace-pre-wrap leading-relaxed"
                  value={prodDescricao}
                  onChange={(e) => setProdDescricao(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={savingProduct}
                className="w-full py-3 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                {savingProduct ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span>Lançar Produto para Moderação</span>
                  </>
                )}
              </button>
            </form>

            {/* AI Copywriter Generator Row */}
            <div className="bg-slate-900/10 p-6 rounded-2xl border border-dashed border-white/15 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl inline-flex text-blue-400">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-display font-black text-xl text-white">Assistente de Copywriting Angolano AI</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">Use o poder do Gemini para estruturar uma descrição irresistível focada no comprador nacional de Angola e no conforto do CoD!</p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono text-slate-400">Destaques / Ingredientes do Produto</label>
                    <textarea
                      rows={3}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-slate-200"
                      placeholder="Ex: Orgânico do Huambo, saco selado de 5kg, ótima textura para funge, super fresco..."
                      value={bulletsAi}
                      onChange={(e) => setBulletsAi(e.target.value)}
                    />
                  </div>

                  <p className="text-[10px] text-slate-500 italic block">
                    Obs: O assistente pegará no "Nome do Produto" introduzido no formulário de esquerda para estruturar o texto no dialeto e termos angolanos adequados.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAskAIForDescription}
                disabled={aiGenerating || !prodNome.trim()}
                className="w-full bg-[#1E293B] hover:bg-slate-850 text-white font-mono font-bold text-xs py-3 rounded-xl transition-all border border-blue-500/20 hover:border-blue-500/40 flex items-center justify-center gap-2 disabled:opacity-30"
              >
                {aiGenerating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-blue-500 border-t-white rounded-full animate-spin"></span>
                    <span>Criando Estudo de Linguagem com Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <span>Gerar Texto Publicitário Angola (AI)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* VENDAS & ENTREGAS (PEDIDOS) */}
        {activeTab === 'vendas_pedidos' && (
          <div className="space-y-6">
            <h3 className="font-display font-bold text-lg">Pedidos de Compra Registados</h3>
            
            {orders.length === 0 ? (
              <div className="bg-[#0B0F19]/40 p-10 rounded-2xl border border-white/5 text-center text-slate-500">
                <p>Nenhuma venda foi registada de momento.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="bg-[#0B0F19] rounded-2xl border border-white/5 overflow-hidden">
                    <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      
                      {/* Left: General Order Detail */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-xs text-blue-400">Ref: #{order.id.substring(6, 12)}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            order.status === 'delivered' ? 'bg-green-500/10 text-green-400' :
                            order.status === 'cancelled' ? 'bg-red-500/15 text-red-400' :
                            'bg-yellow-500/15 text-yellow-500'
                          }`}>
                            {order.status === 'pending' ? 'Pendente' :
                             order.status === 'processing' ? 'A Processar' :
                             order.status === 'shipped' ? 'Em Transito' :
                             order.status === 'delivered' ? 'Entregue' : 'Cancelado'}
                          </span>
                          
                          {!!order.afiliado_id && (
                            <span className="bg-purple-900/40 text-purple-300 text-[9px] font-mono p-0.5 px-2 rounded">
                              Indicação Afiliado
                            </span>
                          )}
                        </div>

                        <h4 className="font-display font-extrabold text-sm text-slate-100">{order.produto_nome}</h4>
                        <p className="text-xs text-slate-400">
                          Comprador: <strong>{order.cliente_nome}</strong> ({order.phone})
                        </p>
                        <p className="text-xs text-slate-400">
                          Destino: <strong>{order.bairro}</strong> ({order.delivery_address})
                        </p>
                      </div>

                      {/* Middle: Financial Division Details */}
                      <div className="text-right space-y-1 bg-slate-900/50 p-3 rounded-xl border border-white/5 text-xs font-mono">
                        <div>Subtotal de Itens: {order.subtotal.toLocaleString()} Kz</div>
                        <div className="text-red-400">Taxa Plataforma (10%): -{order.comissao_plataforma.toLocaleString()} Kz</div>
                        {order.comissao_afiliado_paga > 0 && (
                          <div className="text-purple-400">Comissão Afiliados: -{order.comissao_afiliado_paga.toLocaleString()} Kz</div>
                        )}
                        <div className="border-t border-slate-800 pt-1 font-bold text-emerald-400">
                          Seu Faturamento Líquido: {order.comissao_produtor_paga.toLocaleString()} Kz
                        </div>
                      </div>
                    </div>

                    {/* Bottom: Interactive CoD Steps */}
                    <div className="bg-slate-900/40 p-4 border-t border-slate-800/80 flex flex-wrap justify-between items-center gap-3">
                      <div>
                        {order.status === 'pending' && (
                          <span className="text-xs text-slate-400 flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
                            Aguardando você aceitar e iniciar o processamento da entrega.
                          </span>
                        )}
                        {order.status === 'processing' && (
                          <span className="text-xs text-blue-400 flex items-center gap-1.5">
                            <Clock className="w-4 h-4 shrink-0 animate-spin" />
                            Produto a ser embalado. Despache com o motoboy para enviar.
                          </span>
                        )}
                        {order.status === 'shipped' && (
                          <span className="text-xs text-slate-350">
                            🛵 Encomenda em trânsito pela capital. Pagamento na entrega física.
                          </span>
                        )}
                        {order.status === 'delivered' && (
                          <span className="text-xs text-green-400 font-bold flex items-center gap-1.5">
                            <Check className="w-4 h-4" /> Pagamento integrado com sucesso à sua carteira!
                          </span>
                        )}
                        {order.status === 'cancelled' && (
                          <span className="text-xs text-red-400">Pedido cancelado. Nenhuma entrega cobrada.</span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {/* Chat Link with client */}
                        <button
                          onClick={() => onOpenChat(order.id)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 border border-white/5 rounded-xl text-slate-300 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                          <span>Falar no Chat</span>
                        </button>

                        {/* Actions switcher */}
                        {order.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'processing')}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-[11px] p-2 px-3.5 rounded-xl transition-colors"
                          >
                            Aceitar Pedido
                          </button>
                        )}
                        {order.status === 'processing' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'shipped')}
                            className="bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-[11px] p-2 px-3.5 rounded-xl transition-colors"
                          >
                            Despachar / Enviar Encomenda
                          </button>
                        )}
                        {order.status === 'shipped' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'delivered')}
                            className="bg-green-600 hover:bg-green-500 text-white font-mono font-bold text-[11px] p-2 px-3.5 rounded-xl transition-colors"
                          >
                            Entregue / Dinheiro Recebido!
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CARTEIRA E PEDIDOS DE SAQUE */}
        {activeTab === 'carteira_saque' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
            {/* Create withdrawal form */}
            <form onSubmit={handleRequestWithdrawalSubmit} className="bg-slate-900/30 p-6 rounded-2xl border border-white/10 space-y-4">
              <h3 className="font-display font-bold text-lg">Solicitar Novo Saque</h3>

              {withdrawError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-xl">
                  {withdrawError}
                </div>
              )}
              {withdrawSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3 rounded-xl">
                  {withdrawSuccess}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-slate-400">Montante do Saque (Kz)</label>
                <input
                  type="number"
                  required
                  placeholder="Ex: 15000"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                  value={withdrawValor}
                  onChange={(e) => setWithdrawValor(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-slate-400 block">Canal ou Canalização</label>
                <select
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                  value={withdrawMetodo}
                  onChange={(e) => setWithdrawMetodo(e.target.value as any)}
                >
                  <option value="IBAN">Transferência Bancária (IBAN)</option>
                  <option value="Multicaixa Express">Multicaixa Express</option>
                  <option value="Unitel Money">Unitel Money</option>
                  <option value="Afrimoney">Afrimoney</option>
                  <option value="PayPay">PayPay</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-slate-400">Detalhes da sua conta (IBAN/Telemóvel)</label>
                <input
                  type="text"
                  required
                  placeholder="Introduza o IBAN AO06... ou contacto de telemóvel associado ao serviço"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder-slate-500"
                  value={withdrawDetalhes}
                  onChange={(e) => setWithdrawDetalhes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-mono font-bold text-xs text-white rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Enviar Pedido de Saque</span>
              </button>
            </form>

            {/* Withdrawals report list */}
            <div className="bg-[#0B0F19]/40 border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="font-display font-bold text-lg">Histórico de Movimentações</h3>

              {withdrawals.length === 0 ? (
                <p className="text-slate-500 text-xs italic py-4">Nenhum pedido de saque enviado até agora.</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {withdrawals.slice(0, 15).map(wit => (
                    <div key={wit.id} className="bg-slate-900/60 p-3.5 rounded-xl border border-white/5 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-mono text-emerald-400 font-bold">{wit.valor.toLocaleString()} Kz</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Canal: {wit.metodo}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-black ${
                        wit.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                        wit.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                        'bg-slate-800 text-slate-400 animate-pulse'
                      }`}>
                        {wit.status === 'approved' ? 'RESCATADO/PAGO' :
                         wit.status === 'rejected' ? 'RECUSADO' : 'PENDENTE'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
