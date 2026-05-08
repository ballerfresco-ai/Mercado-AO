import React, { useState, useEffect } from 'react';
import { 
  db, 
  approveWithdrawal, 
  rejectWithdrawal, 
  updateProductStatus, 
  setDeliveryFee, 
  deleteDeliveryFee, 
  saveCoupon, 
  deleteCoupon, 
  updateOrderStatus 
} from '../firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { 
  UserProfile, 
  Product, 
  Order, 
  Withdrawal, 
  DeliveryFee, 
  Coupon, 
  Wallet 
} from '../types';
import { 
  Check, 
  X, 
  Trash2, 
  Plus, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  MapPin, 
  Tag, 
  Trophy, 
  TrendingUp, 
  Bell, 
  Clock, 
  Sparkles,
  Search,
  CheckCircle,
  XCircle,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardAdminProps {
  userId: string;
}

export function DashboardAdmin({ userId }: DashboardAdminProps) {
  // DB States
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [deliveryFees, setDeliveryFees] = useState<DeliveryFee[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [platformWallet, setPlatformWallet] = useState<Wallet | null>(null);

  // Input states
  const [bairroInput, setBairroInput] = useState('');
  const [feeValorInput, setFeeValorInput] = useState('');
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponDescontoInput, setCouponDescontoInput] = useState('');
  const [couponValidadeInput, setCouponValidadeInput] = useState('');

  // UI state
  const [activeTab, setActiveTab] = useState<'visão_geral' | 'produtos' | 'saques' | 'pedidos' | 'bairros_cupons' | 'ranking_parceiros'>('visão_geral');
  const [rejectReasonPopup, setRejectReasonPopup] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    // 1. Listen to users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => d.data() as UserProfile));
    });

    // 2. Listen to products
    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(d => d.data() as Product));
    });

    // 3. Listen to orders
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
      setOrders(snap.docs.map(d => d.data() as Order));
    });

    // 4. Listen to withdrawals
    const unsubWithdrawals = onSnapshot(collection(db, 'withdrawals'), (snap) => {
      setWithdrawals(snap.docs.map(d => d.data() as Withdrawal));
    });

    // 5. Listen to delivery fees
    const unsubFees = onSnapshot(collection(db, 'deliveryFees'), (snap) => {
      setDeliveryFees(snap.docs.map(d => d.data() as DeliveryFee));
    });

    // 6. Listen to coupons
    const unsubCoupons = onSnapshot(collection(db, 'coupons'), (snap) => {
      setCoupons(snap.docs.map(d => d.data() as Coupon));
    });

    // 7. Listen to Platform Balance Wallet
    const unsubPlatWallet = onSnapshot(doc(db, 'wallets', 'PLATAFORMA'), (snap) => {
      if (snap.exists()) {
        setPlatformWallet(snap.data() as Wallet);
      }
    });

    return () => {
      unsubUsers();
      unsubProducts();
      unsubOrders();
      unsubWithdrawals();
      unsubFees();
      unsubCoupons();
      unsubPlatWallet();
    };
  }, []);

  const handleApproveProduct = async (id: string) => {
    setProcessingId(id);
    try {
      await updateProductStatus(id, 'approved');
      triggerSuccess("Produto aprovado com sucesso! Está agora público no mercado.");
    } catch (err: any) {
      setApiError(err?.message || "Erro ao aprovar produto.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectProduct = async (id: string) => {
    setProcessingId(id);
    try {
      await updateProductStatus(id, 'rejected');
      triggerSuccess("Produto rejeitado.");
    } catch (err: any) {
      setApiError(err?.message || "Erro ao rejeitar produto.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveSaque = async (id: string) => {
    setProcessingId(id);
    try {
      await approveWithdrawal(id, userId);
      triggerSuccess("Saque aprovado e comissão transferida com êxito!");
    } catch (err: any) {
      setApiError(err?.message || "Erro ao aprovar transferência de saque.");
    } finally {
      setProcessingId(null);
    }
  };

  const openRecusarPopup = (id: string) => {
    setRejectId(id);
    setRejectReasonPopup('');
  };

  const handleRejectSaqueSubmit = async () => {
    if (!rejectReasonPopup) return;
    setProcessingId(rejectId);
    try {
      await rejectWithdrawal(rejectId, rejectReasonPopup);
      triggerSuccess("Solicitação de saque rejeitada e fundos devolvidos ao utilizador.");
      setRejectReasonPopup(null);
    } catch (err: any) {
      setApiError(err?.message || "Erro ao rejeitar transferência.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleAddDeliveryFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bairroInput.trim() || !feeValorInput) return;
    
    try {
      await setDeliveryFee(bairroInput, parseFloat(feeValorInput));
      setBairroInput('');
      setFeeValorInput('');
      triggerSuccess("Taxa de entrega atualizada com sucesso para o bairro.");
    } catch (err: any) {
      setApiError("Erro ao gravar taxa de entrega.");
    }
  };

  const handleDeleteDeliveryFee = async (id: string) => {
    try {
      await deleteDeliveryFee(id);
      triggerSuccess("Bairro removido do sistema de entrega.");
    } catch (err: any) {
      setApiError("Não foi possível excluir o bairro.");
    }
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCodeInput.trim() || !couponDescontoInput || !couponValidadeInput) return;
    
    try {
      await saveCoupon(
        couponCodeInput, 
        parseInt(couponDescontoInput), 
        couponValidadeInput
      );
      setCouponCodeInput('');
      setCouponDescontoInput('');
      setCouponValidadeInput('');
      triggerSuccess("Cupão de desconto lançado com sucesso!");
    } catch (errValue: any) {
      setApiError("Erro ao guardar cupão.");
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    try {
      await deleteCoupon(id);
      triggerSuccess("Cupão eliminado.");
    } catch (err: any) {
      setApiError("Não foi possível eliminar o cupão.");
    }
  };

  const handleForceUpdateOrderStatus = async (orderId: string, nextStatus: any) => {
    try {
      await updateOrderStatus(orderId, nextStatus);
      triggerSuccess(`Estado do pedido alterado com sucesso para ${nextStatus}!`);
    } catch (error: any) {
      setApiError(error.message || "Erro ao atualizar estado.");
    }
  };

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // -------------------------------------------------------------
  // REVENUE & STATS COMPUTATIONS
  // -------------------------------------------------------------
  const totalSellsCount = orders.filter(o => o.status === 'delivered').length;
  
  // Total transaction volume
  const totalVolume = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + o.subtotal, 0);

  // Platform earned commissions
  const platVolume = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + o.comissao_plataforma, 0);

  // Pending Cash sales (orders not delivered yet)
  const pendingVolume = orders
    .filter(o => o.status === 'pending' || o.status === 'processing' || o.status === 'shipped')
    .reduce((sum, o) => sum + o.total, 0);

  // Get Top Selling Products (report)
  const productSalesMap: { [name: string]: number } = {};
  orders.filter(o => o.status === 'delivered').forEach(order => {
    productSalesMap[order.produto_nome] = (productSalesMap[order.produto_nome] || 0) + 1;
  });
  const topProductsReport = Object.keys(productSalesMap)
    .map(name => ({ name, count: productSalesMap[name] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Get Top Bairros (report)
  const bairroOrdersMap: { [name: string]: number } = {};
  orders.forEach(order => {
    bairroOrdersMap[order.bairro] = (bairroOrdersMap[order.bairro] || 0) + 1;
  });
  const topBairrosReport = Object.keys(bairroOrdersMap)
    .map(bairro => ({ name: bairro, count: bairroOrdersMap[bairro] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Affiliate Rankings
  const affiliateMap: { [id: string]: { nome: string; comissão: number; vendas: number } } = {};
  orders.filter(o => o.status === 'delivered' && o.afiliado_id).forEach(order => {
    if (order.afiliado_id) {
      if (!affiliateMap[order.afiliado_id]) {
        affiliateMap[order.afiliado_id] = { nome: order.afiliado_nome || 'Afiliado Indefinido', comissão: 0, vendas: 0 };
      }
      affiliateMap[order.afiliado_id].comissão += order.comissao_afiliado_paga;
      affiliateMap[order.afiliado_id].vendas += 1;
    }
  });
  const rankedAffiliates = Object.keys(affiliateMap)
    .map(id => ({ id, ...affiliateMap[id] }))
    .sort((a, b) => b.comissão - a.comissão);

  return (
    <div className="space-y-8" id="admin_dashboard">
      
      {/* Messages */}
      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-24 right-6 bg-[#0F172A] border-l-4 border-blue-500 text-blue-400 p-4 rounded-xl shadow-2xl z-50 flex items-center gap-3"
          >
            <Sparkles className="w-5 h-5 text-blue-400 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Operação Efetuada</p>
              <p className="text-xs text-slate-300">{successMsg}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intro Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-[#2563EB] font-bold">Painel de Controlo Principal</span>
          <h2 className="text-3xl font-display font-black tracking-tight mt-1 flex items-center gap-3">
            Mercado <span className="text-blue-500 font-extrabold uppercase p-1 px-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">ADM</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">Gestão geral financeira, aprovações, tarifas de entrega e cupons.</p>
        </div>
        <div className="flex items-center gap-4 bg-slate-900/60 p-4 rounded-2xl border border-white/10" id="plat_balance_widget">
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Saldo da Plataforma (10%)</div>
            <div className="text-2xl font-display font-black text-sky-400">
              {(platformWallet?.saldo || 0).toLocaleString()} <span className="text-xs font-sans font-normal text-sky-400">Kz</span>
            </div>
          </div>
          <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-px">
        {[
          { id: 'visão_geral', label: 'Dashboard', icon: TrendingUp },
          { id: 'produtos', label: 'Acolher Produtos', icon: ShoppingBag, badge: products.filter(p => p.status === 'pending').length },
          { id: 'saques', label: 'Pedidos Saque', icon: DollarSign, badge: withdrawals.filter(w => w.status === 'pending').length },
          { id: 'pedidos', label: 'Gerir Vendas', icon: FileText },
          { id: 'bairros_cupons', label: 'Bairros & Cupons', icon: MapPin },
          { id: 'ranking_parceiros', label: 'Ranking Afiliados', icon: Trophy }
        ].map(tab => {
          const IconComp = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-t-xl text-sm font-semibold transition-all ${
                isActive 
                  ? 'bg-blue-600/15 border-t border-r border-l border-blue-500/30 text-white border-b-2 border-b-blue-500' 
                  : 'text-slate-400 hover:text-slate-200 border-b border-transparent hover:border-slate-800'
              }`}
            >
              <IconComp className={`w-4 h-4 ${isActive ? 'text-blue-500' : ''}`} />
              <span>{tab.label}</span>
              {!!tab.badge && (
                <span className="bg-blue-500 text-white font-mono text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Error display */}
      {apiError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3 flex justify-between items-center">
          <span>{apiError}</span>
          <X className="w-4 h-4 cursor-pointer" onClick={() => setApiError(null)} />
        </div>
      )}

      {/* CONTENT SWITCHER */}
      <div className="min-h-[400px]">
        {activeTab === 'visão_geral' && (
          <div className="space-y-8 animate-fadeIn">
            {/* 4 Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/5 space-y-2">
                <div className="text-xs font-mono text-slate-400 uppercase">Faturamento CoD Concluído</div>
                <div className="text-3xl font-display font-black text-slate-100">{totalVolume.toLocaleString()} Kz</div>
                <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span>Plataforma reteve 10%:</span>
                  <strong className="font-mono">{platVolume.toLocaleString()} Kz</strong>
                </div>
              </div>

              <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/5 space-y-2">
                <div className="text-xs font-mono text-slate-400 uppercase font-medium">Encomendas CoD Pendentes</div>
                <div className="text-3xl font-display font-black text-amber-500">{pendingVolume.toLocaleString()} Kz</div>
                <div className="text-[10px] text-slate-400 leading-none">Vendas em processamento na rua com motoboy.</div>
              </div>

              <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/5 space-y-2">
                <div className="text-xs font-mono text-slate-400 uppercase">Utilizadores Totais</div>
                <div className="text-3xl font-display font-black text-blue-400">{users.length}</div>
                <div className="text-[10px] text-slate-400 flex gap-2">
                  <span>Clientes: {users.filter(u => u.tipo === 'Cliente').length}</span>
                  <span>|</span>
                  <span>Produtores: {users.filter(u => u.tipo === 'Produtor').length}</span>
                </div>
              </div>

              <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/5 space-y-2">
                <div className="text-xs font-mono text-slate-400 uppercase">Iniciativas de Afiliação</div>
                <div className="text-3xl font-display font-black text-[#8B5CF6]">{users.filter(u => u.tipo === 'Afiliado').length}</div>
                <div className="text-[10px] text-slate-400 leading-none">Afiliados digitais ativos impulsionando o comércio.</div>
              </div>
            </div>

            {/* Reports and Charts layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Report 1: Top Products */}
              <div className="bg-[#0B0F19]/60 border border-white/10 rounded-2xl p-6 space-y-4">
                <h4 className="font-display font-bold text-lg text-white flex items-center gap-2">
                  <FlameIcon className="w-5 h-5 text-amber-500" />
                  <span>Produtos Mais Vendidos</span>
                </h4>
                <div className="space-y-3">
                  {topProductsReport.length === 0 ? (
                    <p className="text-sm text-slate-500 italic py-4">Nenhuma encomenda entregue ainda para calcular o ranking.</p>
                  ) : (
                    topProductsReport.map((prod, index) => {
                      const percentages = Math.min(100, Math.max(10, (prod.count / totalSellsCount) * 100));
                      return (
                        <div key={prod.name} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-semibold text-slate-300">{index + 1}. {prod.name}</span>
                            <span className="font-mono text-blue-400 font-bold">{prod.count} {prod.count === 1 ? 'venda' : 'vendas'}</span>
                          </div>
                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-600 to-sky-400 h-full rounded-full" style={{ width: `${percentages}%` }}></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Report 2: Sales by Bairro */}
              <div className="bg-[#0B0F19]/60 border border-white/10 rounded-2xl p-6 space-y-4">
                <h4 className="font-display font-bold text-lg text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-400" />
                  <span>Bairros Mais Ativos (Pedidos)</span>
                </h4>
                <div className="space-y-3">
                  {topBairrosReport.length === 0 ? (
                    <p className="text-sm text-slate-500 italic py-4">Sem dados geográficos de compras no momento.</p>
                  ) : (
                    topBairrosReport.map((ba, index) => {
                      const itemPercentage = Math.min(100, Math.max(12, (ba.count / orders.length) * 100));
                      return (
                        <div key={ba.name} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-semibold text-slate-300">{index + 1}. {ba.name}</span>
                            <span className="font-mono text-slate-400 font-bold">{ba.count} {ba.count === 1 ? 'pedido' : 'pedidos'}</span>
                          </div>
                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div className="bg-gradient-to-r from-[#8B5CF6] to-pink-500 h-full rounded-full" style={{ width: `${itemPercentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Custom SVG line-chart to satisfy top-tier aesthetic visuals */}
            <div className="bg-slate-900/30 p-6 rounded-2xl border border-white/5 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-display font-bold text-lg">Curva de Negócio Mercado AO</h4>
                  <p className="text-xs text-slate-400">Fluxo semanal de vendas e entregas simulada com base em transações reais.</p>
                </div>
                <span className="text-xs font-mono text-green-400 flex items-center gap-1 bg-green-500/10 p-1.5 px-2 rounded-lg">
                  <Check className="w-3 h-3" /> Sistema Nominal Kz
                </span>
              </div>
              <div className="h-44 w-full relative">
                {/* SVG Line Graph */}
                <svg className="w-full h-full" viewBox="0 0 600 150" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Grid Lines */}
                  <line x1="0" y1="35" x2="600" y2="35" stroke="#1E293B" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="0" y1="75" x2="600" y2="75" stroke="#1E293B" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="0" y1="115" x2="600" y2="115" stroke="#1E293B" strokeWidth="1" strokeDasharray="4 4" />
                  
                  {/* Area */}
                  <path d="M 0 150 Q 80 110, 150 90 T 300 110 T 450 60 T 600 40 L 600 150 Z" fill="url(#chartGrad)" />
                  {/* Line */}
                  <path d="M 0 150 Q 80 110, 150 90 T 300 110 T 450 60 T 600 40" fill="none" stroke="#3B82F6" strokeWidth="3" />
                  
                  {/* Dots */}
                  <circle cx="150" cy="90" r="5" fill="#3B82F6" />
                  <circle cx="450" cy="60" r="5" fill="#3B82F6" />
                  <circle cx="600" cy="40" r="5" fill="#60A5FA" />
                </svg>
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-2">
                  <span>Segunda</span>
                  <span>Terça</span>
                  <span>Quarta</span>
                  <span>Quinta</span>
                  <span>Sexta</span>
                  <span>Hoje</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* APPROVE PRODUCTS TAB */}
        {activeTab === 'produtos' && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="font-display font-bold text-xl text-white">Moderação de Produtos</h3>
            <p className="text-sm text-slate-400">Verifique a qualidade, comissão de afiliado sugerida por produtores locais angolanos antes de irem para o público.</p>

            {products.filter(p => p.status === 'pending').length === 0 ? (
              <div className="glass-panel rounded-2xl p-8 text-center text-slate-400 border border-white/5">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="font-semibold text-slate-200">Sem produtos em fila de espera!</p>
                <p className="text-xs text-slate-400">Tudo verificado e aprovado para o comércio.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.filter(p => p.status === 'pending').map(prod => (
                  <div key={prod.id} className="bg-[#0B0F19] border border-white/10 rounded-2xl overflow-hidden flex flex-col justify-between">
                    <div className="p-5 space-y-4">
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 p-1 rounded">PENDENTE ADM</span>
                          <h4 className="font-display font-semibold text-lg text-white mt-2">{prod.nome}</h4>
                        </div>
                        <span className="text-blue-400 font-display font-black text-xl">{prod.preço.toLocaleString()} Kz</span>
                      </div>
                      
                      <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed bg-slate-900/40 p-3 rounded-lg border border-white/5 italic">
                        "{prod.descrição}"
                      </p>

                      <div className="grid grid-cols-2 text-xs font-mono bg-slate-900/60 p-3 rounded-xl gap-2 text-slate-400">
                        <div>
                          Produtor ID:
                          <div className="text-slate-200 mt-0.5 truncate">{prod.produtor_id}</div>
                        </div>
                        <div>
                          Comissão Afiliados:
                          <div className="text-purple-400 font-bold mt-0.5">{prod.comissão_afiliado}%</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900/70 p-4 border-t border-slate-800/80 flex gap-2">
                      <button
                        onClick={() => handleRejectProduct(prod.id)}
                        disabled={processingId === prod.id}
                        className="flex-1 px-4 py-2 bg-red-600/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-bold font-mono transition-colors border border-red-500/20 flex items-center justify-center gap-1.5"
                      >
                        <X className="w-4 h-4" /> Recusar
                      </button>
                      <button
                        onClick={() => handleApproveProduct(prod.id)}
                        disabled={processingId === prod.id}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 text-white rounded-xl text-xs font-bold font-mono transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4" /> Aprovar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* WITHDRAWALS TAB */}
        {activeTab === 'saques' && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="font-display font-bold text-xl text-white block">Aprovação de Saques Finanças</h3>
            <p className="text-sm text-slate-400">Os saques estão sujeitos à taxa fixa de 200 Kz para Afiliados e transferência express/IBAN para os Produtores.</p>

            {withdrawals.filter(w => w.status === 'pending').length === 0 ? (
              <div className="bg-slate-900/30 rounded-2xl p-8 text-center text-slate-400 border border-white/5">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="font-semibold text-slate-200">Sem pedidos de saque pendentes!</p>
                <p className="text-xs text-slate-400">Todas as obrigações financeiras foram liquidadas.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {withdrawals.filter(w => w.status === 'pending').map(wit => (
                  <div key={wit.id} className="bg-[#0B0F19] border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[#3B82F6] font-display font-black text-lg">{wit.valor.toLocaleString()} Kz</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                          wit.user_tipo === 'Afiliado' ? 'bg-purple-900/40 text-purple-300' : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          {wit.user_tipo} (Comitê)
                        </span>
                      </div>
                      <div className="text-xs text-slate-300">
                        Por: <strong className="text-white">{wit.user_nome}</strong> | Canal de Pago: <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 font-mono text-[10px] rounded">{wit.metodo}</span>
                      </div>
                      <div className="text-xs font-mono text-slate-400">
                        Detalhes Conta: <span className="text-slate-300 select-all">{wit.detalhes}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                      <button
                        onClick={() => openRecusarPopup(wit.id)}
                        className="p-2.5 bg-red-600/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors border border-red-500/20 text-xs font-bold leading-none flex items-center gap-1"
                      >
                        <X className="w-4 h-4" /> Recusar
                      </button>
                      <button
                        onClick={() => handleApproveSaque(wit.id)}
                        disabled={processingId === wit.id}
                        className="px-4 py-2.5 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" /> Aprovar Desembolso
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recusar Modal overlay if active */}
            {rejectReasonPopup !== null && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-[#0B0F19] border border-white/10 rounded-2xl max-w-sm w-full p-6 space-y-4">
                  <h4 className="font-display font-bold text-lg text-white">Razão de Recusa do Saque</h4>
                  <p className="text-xs text-slate-400">O saldo requisitado retornará ao bolso do parceiro com esta notificação explicativa.</p>
                  
                  <textarea
                    rows={3}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 text-white"
                    placeholder="Ex: IBAN incorreto ou Conta Unitel Money não identificada..."
                    value={rejectReasonPopup}
                    onChange={(e) => setRejectReasonPopup(e.target.value)}
                  />

                  <div className="flex justify-end gap-2 text-xs font-semibold pt-2">
                    <button
                      onClick={() => setRejectReasonPopup(null)}
                      className="px-4 py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleRejectSaqueSubmit}
                      disabled={!rejectReasonPopup.trim() || processingId !== null}
                      className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-40"
                    >
                      Confirmar Rejeição
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MANAGE ACTIVE SALES/ORDERS */}
        {activeTab === 'pedidos' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-display font-bold text-xl text-white">Gestão Unificada de Pedidos</h3>
                <p className="text-sm text-slate-400">Supervisione as negociações Cash on Delivery (CoD) na rede.</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Pesquisar por bairro, cliente..."
                  className="w-full bg-slate-900/60 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {orders.length === 0 ? (
              <p className="text-slate-500 italic py-6 text-center">Nenhum pedido efetuado no Mercado AO ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 font-mono uppercase bg-slate-900/40">
                      <th className="p-3">Ref ID</th>
                      <th className="p-3">Cliente / Contacto</th>
                      <th className="p-3">Item / Produtor</th>
                      <th className="p-3 text-right">Preço + Entrega = Total</th>
                      <th className="p-3">Destino (Bairro)</th>
                      <th className="p-3">Estado CoD</th>
                      <th className="p-3 text-center">Ações Forçadas (ADM)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders
                      .filter(o => 
                        o.cliente_nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        o.bairro.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        o.id.includes(searchQuery)
                      )
                      .map(order => {
                        return (
                          <tr key={order.id} className="border-b border-white/5 hover:bg-slate-900/20">
                            <td className="p-3 font-mono font-bold text-blue-400">#{order.id.substring(6, 12)}</td>
                            <td className="p-3">
                              <div className="font-semibold">{order.cliente_nome}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{order.phone}</div>
                            </td>
                            <td className="p-3">
                              <div className="text-slate-200 font-semibold">{order.produto_nome}</div>
                              <div className="text-[10px] text-slate-500">Produtor: {order.produtor_id.substring(0, 8)}</div>
                            </td>
                            <td className="p-3 text-right">
                              <div className="text-slate-300">{(order.subtotal - order.desconto).toLocaleString()} + {order.taxa_entrega}</div>
                              <div className="font-bold text-emerald-400">{order.total.toLocaleString()} Kz</div>
                            </td>
                            <td className="p-3">
                              <div className="text-slate-300 font-medium">{order.bairro}</div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{order.delivery_address}</div>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                order.status === 'delivered' ? 'bg-green-500/10 text-green-400' :
                                order.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                                order.status === 'shipped' ? 'bg-blue-600/20 text-blue-400 animate-pulse' :
                                order.status === 'processing' ? 'bg-pink-500/10 text-pink-400' :
                                'bg-slate-800 text-slate-400'
                              }`}>
                                {order.status === 'pending' ? 'Pendente' :
                                 order.status === 'processing' ? 'A Processar' :
                                 order.status === 'shipped' ? 'Em Trânsito' :
                                 order.status === 'delivered' ? 'Entregue' :
                                 'Cancelado'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {order.status !== 'delivered' && order.status !== 'cancelled' ? (
                                <div className="flex gap-1.5 justify-center">
                                  <button
                                    onClick={() => handleForceUpdateOrderStatus(order.id, 'delivered')}
                                    className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white rounded font-bold uppercase text-[9px]"
                                    title="Marcar Entregue"
                                  >
                                    Entregue
                                  </button>
                                  <button
                                    onClick={() => handleForceUpdateOrderStatus(order.id, 'cancelled')}
                                    className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded font-bold uppercase text-[9px]"
                                    title="Cancelar Compra"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-500 font-mono text-[10px]">- Settle Concluído -</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* DELIVERY FEES & COUPONS TAB */}
        {activeTab === 'bairros_cupons' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
            {/* Delivery Fee Column */}
            <div className="space-y-6">
              <div className="bg-slate-900/20 p-5 rounded-2xl border border-white/5 space-y-4">
                <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-500" />
                  <span>Cadastrar Taxas por Bairro</span>
                </h3>
                
                <form onSubmit={handleAddDeliveryFee} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Bairro de Luanda/Angola</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 text-white focus:outline-none"
                        placeholder="Ex: Talatona, Benfica..."
                        value={bairroInput}
                        onChange={(e) => setBairroInput(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Taxa de Frete (Kz)</label>
                      <input
                        type="number"
                        required
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 text-white focus:outline-none"
                        placeholder="Ex: 1500"
                        value={feeValorInput}
                        onChange={(e) => setFeeValorInput(e.target.value)}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold font-mono transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Cadastrar Taxa
                  </button>
                </form>
              </div>

              {/* Fee List */}
              <div className="bg-[#0B0F19]/40 border border-white/10 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs uppercase font-mono text-slate-400 tracking-wider">Tabela de Fretes Cadastrados</h4>
                {deliveryFees.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Sem taxas personalizadas de entrega. Custo padrão zero no checkout.</p>
                ) : (
                  <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1">
                    {deliveryFees.map(fee => (
                      <div key={fee.id} className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                        <span className="font-semibold text-xs text-slate-100">{fee.bairro}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-emerald-400 font-bold text-xs">{fee.valor.toLocaleString()} Kz</span>
                          <button
                            onClick={() => handleDeleteDeliveryFee(fee.id)}
                            className="text-red-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Coupons Column */}
            <div className="space-y-6">
              <div className="bg-slate-900/20 p-5 rounded-2xl border border-white/5 space-y-4">
                <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                  <Tag className="w-5 h-5 text-blue-500" />
                  <span>Gerar Cupões de Desconto</span>
                </h3>

                <form onSubmit={handleAddCoupon} className="space-y-3">
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Código Promocional</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 text-white focus:outline-none"
                        placeholder="Ex: QUINTA10, MERCADOAO20"
                        value={couponCodeInput}
                        onChange={(e) => setCouponCodeInput(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Desconto (%)</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          required
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 text-white"
                          placeholder="Ex: 15"
                          value={couponDescontoInput}
                          onChange={(e) => setCouponDescontoInput(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Validade</label>
                        <input
                          type="date"
                          required
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 text-white"
                          value={couponValidadeInput}
                          onChange={(e) => setCouponValidadeInput(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-gradient-to-r from-blue-700 to-blue-600 rounded-xl text-xs font-bold font-mono text-white transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Criar Lote Cupão
                  </button>
                </form>
              </div>

              {/* Coupons List */}
              <div className="bg-[#0B0F19]/40 border border-white/10 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs uppercase font-mono text-slate-400 tracking-wider">Cupons Ativos Regulamentados</h4>
                {coupons.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Sem cupons cadastrados. Crie um acima para campanhas de marketing.</p>
                ) : (
                  <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1">
                    {coupons.map(cop => (
                      <div key={cop.id} className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                        <div className="space-y-1">
                          <span className="font-mono font-bold text-xs bg-blue-500 text-white rounded px-1.5 py-0.5">{cop.código}</span>
                          <span className="text-[10px] text-slate-400 font-mono ml-2">Expira em: {cop.validade}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[#3B82F6] font-bold text-xs">-{cop.desconto}%</span>
                          <button
                            onClick={() => handleDeleteCoupon(cop.id)}
                            className="text-red-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* RANKING DE AFILIADOS TAB */}
        {activeTab === 'ranking_parceiros' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h3 className="font-display font-bold text-xl text-white flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                <span>Ranking de Afiliados Estrela</span>
              </h3>
              <p className="text-sm text-slate-400">Classificação com base na comissão total libertada por compras concluídas de Cash on Delivery.</p>
            </div>

            {rankedAffiliates.length === 0 ? (
              <div className="bg-slate-900/30 rounded-2xl p-8 text-center text-slate-450 border border-white/5">
                <p className="text-sm text-slate-450 italic">Sem vendas de afiliados realizadas no momento.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rankedAffiliates.map((afil, index) => {
                  return (
                    <div 
                      key={afil.id} 
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                        index === 0 
                          ? 'bg-amber-500/10 border-amber-500' 
                          : index === 1 
                          ? 'bg-slate-300/10 border-slate-300' 
                          : index === 2 
                          ? 'bg-amber-700/10 border-amber-800' 
                          : 'bg-[#0B0F19]/60 border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-extrabold text-sm ${
                          index === 0 ? 'bg-amber-500 text-[#060813]' :
                          index === 1 ? 'bg-slate-300 text-[#060813]' :
                          index === 2 ? 'bg-amber-800 text-white' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-white">{afil.nome}</p>
                          <p className="text-[10px] text-slate-400 font-mono">UID: {afil.id.substring(0, 8)}</p>
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <div className="text-emerald-450 font-display font-extrabold text-base">{afil.comissão.toLocaleString()} Kz</div>
                        <div className="text-[10px] font-mono text-slate-400">{afil.vendas} {afil.vendas === 1 ? 'venda convertida' : 'vendas convertidas'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

// Icon fallbacks inside code to be explicit
function FlameIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}
