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
  updateOrderStatus,
  auth,
  getUserProfile,
  updateUserProfile,
  deleteUser,
  LUANDA_BAIRROS
} from '../firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  orderBy 
} from 'firebase/firestore';
import { 
  UserProfile, 
  Product, 
  Order, 
  Withdrawal, 
  DeliveryFee, 
  Coupon, 
  Wallet,
  HomeBanner,
  Report,
  AuditLog,
  CartStats
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
  FileText,
  CreditCard,
  Settings,
  LayoutDashboard,
  ClipboardList,
  Wallet as WalletIcon,
  Home,
  ShoppingCart,
  ShieldCheck,
  UserCog,
  Truck,
  AlertTriangle,
  History,
  UserCircle,
  Download,
  FileSpreadsheet,
  Ban,
  Unlock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

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
  const [reports, setReports] = useState<Report[]>([]);
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [cartStats, setCartStats] = useState<CartStats[]>([]);
  const [platformWallet, setPlatformWallet] = useState<Wallet | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'pedidos' | 'financeiro' | 'home' | 'carrinho' | 
    'aprovacao' | 'usuarios' | 'taxas' | 'denuncias' | 'auditoria' | 'perfil'
  >('dashboard');
  
  const [isRejecting, setIsRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    // Basic metrics listeners
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => setUsers(snap.docs.map(d => d.data() as UserProfile)));
    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => setProducts(snap.docs.map(d => d.data() as Product)));
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => setOrders(snap.docs.map(d => d.data() as Order)));
    const unsubWithdrawals = onSnapshot(collection(db, 'withdrawals'), (snap) => setWithdrawals(snap.docs.map(d => d.data() as Withdrawal)));
    const unsubFees = onSnapshot(collection(db, 'deliveryFees'), (snap) => setDeliveryFees(snap.docs.map(d => d.data() as DeliveryFee)));
    const unsubCoupons = onSnapshot(collection(db, 'coupons'), (snap) => setCoupons(snap.docs.map(d => d.data() as Coupon)));
    const unsubReports = onSnapshot(collection(db, 'reports'), (snap) => setReports(snap.docs.map(d => d.data() as Report)));
    const unsubBanners = onSnapshot(collection(db, 'banners'), (snap) => setBanners(snap.docs.map(d => d.data() as HomeBanner)));
    const unsubAudit = onSnapshot(query(collection(db, 'audit_logs'), orderBy('createdAt', 'desc')), (snap) => setAuditLogs(snap.docs.map(d => d.data() as AuditLog)));
    const unsubCarts = onSnapshot(collection(db, 'cart_stats'), (snap) => setCartStats(snap.docs.map(d => d.data() as CartStats)));
    const unsubPlatWallet = onSnapshot(doc(db, 'wallets', 'PLATAFORMA'), (snap) => { if (snap.exists()) setPlatformWallet(snap.data() as Wallet); });

    return () => {
      unsubUsers(); unsubProducts(); unsubOrders(); unsubWithdrawals(); 
      unsubFees(); unsubCoupons(); unsubReports(); unsubBanners(); 
      unsubAudit(); unsubCarts(); unsubPlatWallet();
    };
  }, []);

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleUpdateUserStatus = async (userId: string, status: 'active' | 'blocked') => {
    try {
      await updateUserProfile(userId, { status });
      triggerSuccess(`Usuário ${status === 'active' ? 'desbloqueado' : 'bloqueado'} com sucesso.`);
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  const handleRejectSaqueSubmit = async () => {
    if (!isRejecting || !rejectReason.trim()) return;
    try {
      await rejectWithdrawal(isRejecting, rejectReason);
      triggerSuccess("Saque rejeitado.");
      setIsRejecting(null);
      setRejectReason('');
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  const handleForceUpdateOrderStatus = async (id: string, status: any) => {
    try {
      await updateOrderStatus(id, status);
      triggerSuccess(`Status do pedido #${id.slice(-6)} atualizado para ${status}.`);
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#05070A] text-slate-300">
      {/* Messages */}
      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
            className="fixed top-8 right-8 bg-emerald-500 text-white p-4 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 font-bold"
          >
            <CheckCircle className="w-5 h-5" /> {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIDEBAR */}
      <aside className="w-full lg:w-72 bg-[#0B0F19] border-r border-white/5 flex flex-col sticky top-0 h-screen z-40">
        <div className="p-8 border-b border-white/5">
          <h2 className="text-2xl font-display font-black text-white flex items-center gap-3">
            Mercado <span className="text-blue-500 font-extrabold p-1 px-2 bg-blue-500/10 rounded-lg">AO</span>
          </h2>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono mt-2">Central Administrativa</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'pedidos', label: 'Pedidos', icon: ClipboardList },
            { id: 'financeiro', label: 'Financeiro', icon: WalletIcon },
            { id: 'home', label: 'Home', icon: Home },
            { id: 'carrinho', label: 'Carrinho', icon: ShoppingCart },
            { id: 'aprovacao', label: 'Aprovação Produtos', icon: ShieldCheck, badge: products.filter(p => p.status === 'pending').length },
            { id: 'usuarios', label: 'Gestão de Usuários', icon: UserCog },
            { id: 'taxas', label: 'Taxas de Entrega', icon: Truck },
            { id: 'denuncias', label: 'Denúncias', icon: AlertTriangle, badge: reports.filter(r => r.status === 'pending').length },
            { id: 'auditoria', label: 'Auditoria', icon: History },
            { id: 'perfil', label: 'Perfil', icon: UserCircle },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all group ${
                activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'hover:bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`} />
                <span className="text-sm font-bold">{item.label}</span>
              </div>
              {item.badge ? (
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full ring-2 ring-[#0B0F19]">
                  {item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 lg:p-12 overflow-y-auto max-w-full">
        <header className="mb-10 block">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-display font-black text-white tracking-tight capitalize">
                {activeTab.replace('_', ' ')} Aplicativo
              </h1>
              <p className="text-slate-400 text-sm mt-1">Supervisão estratégica do Mercado AO Luanda.</p>
            </div>
            <div className="flex items-center gap-4 bg-[#0B0F19] p-3 rounded-2xl border border-white/5">
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-mono uppercase">Saldo Plataforma</p>
                <p className="text-lg font-black text-emerald-400">{(platformWallet?.saldo || 0).toLocaleString()} Kz</p>
              </div>
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' && <AdminDashboard users={users} products={products} orders={orders} />}
        {activeTab === 'pedidos' && <AdminOrders orders={orders} onUpdateStatus={handleForceUpdateOrderStatus} />}
        {activeTab === 'financeiro' && <AdminFinance orders={orders} withdrawals={withdrawals} onApprove={approveWithdrawal} onReject={setIsRejecting} />}
        {activeTab === 'home' && <AdminHomeManagement banners={banners} orders={orders} products={products} />}
        {activeTab === 'carrinho' && <AdminCartAnalytics stats={cartStats} orders={orders} products={products} />}
        {activeTab === 'aprovacao' && <AdminApproval products={products} onApprove={updateProductStatus} onReject={updateProductStatus} />}
        {activeTab === 'usuarios' && <AdminUsers users={users} onBlock={handleUpdateUserStatus} onDelete={deleteUser} />}
        {activeTab === 'taxas' && <AdminDeliveryFees fees={deliveryFees} onAdd={setDeliveryFee} onDelete={deleteDeliveryFee} />}
        {activeTab === 'denuncias' && <AdminReports reports={reports} />}
        {activeTab === 'auditoria' && <AdminAuditLogs logs={auditLogs} />}
        {activeTab === 'perfil' && <AdminProfileSection userId={userId} users={users} />}
      </main>

      {/* Rejection Modal */}
      {isRejecting && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-6">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0B0F19] p-8 rounded-3xl max-w-md w-full border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Motivo da Rejeição</h3>
            <textarea 
              className="w-full bg-[#05070A] border border-white/10 rounded-2xl p-4 text-white mb-6 h-32 focus:border-red-500 outline-none"
              placeholder="Descreva o motivo para o utilizador..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-4">
              <button onClick={() => setIsRejecting(null)} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold">Voltar</button>
              <button onClick={handleRejectSaqueSubmit} disabled={!rejectReason.trim()} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold disabled:opacity-40">Confirmar</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// MODULAR SUB-COMPONENTS FOR EACH TAB
// ------------------------------------------------------------------------------------------------

function AdminDashboard({ users, products, orders }: any) {
  const totals = {
    vendasCount: orders.filter((o: any) => o.status === 'delivered').length,
    faturado: orders.filter((o: any) => o.status === 'delivered').reduce((s: any, o: any) => s + o.total, 0),
    usuarios: users.length,
    produtores: users.filter((u: any) => u.tipo === 'Produtor').length,
    afiliados: users.filter((u: any) => u.tipo === 'Afiliado').length,
    compradores: users.filter((u: any) => u.tipo === 'Cliente').length,
    produtosPendentes: products.filter((p: any) => p.status === 'pending').length,
    produtosAprovados: products.filter((p: any) => p.status === 'approved').length,
  };

  const chartData = [
    { name: 'Seg', v: 4000 }, { name: 'Ter', v: 3000 }, { name: 'Qua', v: 2000 }, 
    { name: 'Qui', v: 2780 }, { name: 'Sex', v: 1890 }, { name: 'Sab', v: 2390 }, { name: 'Dom', v: 3490 },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminStatCard label="Total Faturado" value={`${totals.faturado.toLocaleString()} Kz`} icon={DollarSign} color="text-emerald-500" />
        <AdminStatCard label="Total Vendas" value={totals.vendasCount} icon={ShoppingBag} color="text-blue-500" />
        <AdminStatCard label="Produtos Pendentes" value={totals.produtosPendentes} icon={ShieldCheck} color="text-amber-500" />
        <AdminStatCard label="Usuários Ativos" value={totals.usuarios} icon={Users} color="text-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#0B0F19] p-8 rounded-3xl border border-white/5 min-h-[400px]">
          <h3 className="text-xl font-bold text-white mb-8">Performance Semanal</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#0B0F19', border: '1px solid #ffffff10', borderRadius: '12px' }} />
              <Area type="monotone" dataKey="v" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorV)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#0B0F19] p-8 rounded-3xl border border-white/5 space-y-6">
          <h3 className="text-xl font-bold text-white mb-2">Segmentação Usuários</h3>
          <div className="space-y-4">
            <SegmentationItem label="Compradores" count={totals.compradores} color="bg-blue-500" total={totals.usuarios} />
            <SegmentationItem label="Produtores" count={totals.produtores} color="bg-emerald-500" total={totals.usuarios} />
            <SegmentationItem label="Afiliados" count={totals.afiliados} color="bg-purple-500" total={totals.usuarios} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminOrders({ orders, onUpdateStatus }: any) {
  return (
    <div className="bg-[#0B0F19] border border-white/5 rounded-3xl overflow-x-auto shadow-2xl">
      <table className="w-full text-left">
        <thead className="bg-[#05070A]/50 text-[10px] font-mono uppercase text-slate-500">
          <tr>
            <th className="p-6">Referência</th>
            <th className="p-6">Cliente</th>
            <th className="p-6">Localização</th>
            <th className="p-6">Total</th>
            <th className="p-6">Status</th>
            <th className="p-6">Ações ADM</th>
          </tr>
        </thead>
        <tbody className="text-sm divide-y divide-white/5">
          {orders.map((o: any) => (
            <tr key={o.id} className="hover:bg-white/5 transition-all group">
              <td className="p-6 font-mono font-bold text-blue-400">#{o.id.slice(-6)}</td>
              <td className="p-6 font-bold text-white">{o.cliente_nome}</td>
              <td className="p-6 text-slate-400">{o.bairro}</td>
              <td className="p-6 font-black text-slate-200">{o.total.toLocaleString()} Kz</td>
              <td className="p-6">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                  o.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-500' :
                  o.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-400'
                }`}>
                  {o.status}
                </span>
              </td>
              <td className="p-6">
                <div className="flex gap-2">
                  <button onClick={() => onUpdateStatus(o.id, 'delivered')} className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"><Check className="w-4 h-4" /></button>
                  <button onClick={() => onUpdateStatus(o.id, 'cancelled')} className="p-2 bg-red-600/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminFinance({ orders, withdrawals, onApprove, onReject }: any) {
  const totalBalance = orders.filter((o: any) => o.status === 'delivered').reduce((s: any, o: any) => s + o.comissao_plataforma, 0);
  
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AdminStatCard label="Lucro Plataforma" value={`${totalBalance.toLocaleString()} Kz`} icon={TrendingUp} color="text-emerald-500" />
        <AdminStatCard label="Saques Pendentes" value={withdrawals.filter((w: any) => w.status === 'pending').length} icon={Clock} color="text-amber-500" />
        <AdminStatCard label="Saques Totais" value={withdrawals.length} icon={WalletIcon} color="text-blue-500" />
      </div>

      <div className="bg-[#0B0F19] rounded-3xl border border-white/5 overflow-hidden">
        <div className="p-8 border-b border-white/5 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Solicitações de Resgate</h3>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"><FileSpreadsheet className="w-4 h-4" /> Exportar CSV</button>
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"><Download className="w-4 h-4" /> PDF</button>
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-[#05070A]/30 text-[10px] font-mono uppercase text-slate-500">
            <tr>
              <th className="p-6">Utilizador</th>
              <th className="p-6">Valor</th>
              <th className="p-6">Método</th>
              <th className="p-6">Data</th>
              <th className="p-6">Ações</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-white/5">
            {withdrawals.map((w: any) => (
              <tr key={w.id} className="hover:bg-white/5 transition-all">
                <td className="p-6">
                  <p className="font-bold text-white">{w.user_nome}</p>
                  <p className="text-[10px] text-slate-500 uppercase">{w.user_tipo}</p>
                </td>
                <td className="p-6 font-black text-emerald-400">{w.valor.toLocaleString()} Kz</td>
                <td className="p-6 text-slate-400 font-mono text-[10px]">{w.metodo}</td>
                <td className="p-6 text-slate-500">{new Date(w.createdAt).toLocaleDateString()}</td>
                <td className="p-6">
                  {w.status === 'pending' ? (
                    <div className="flex gap-2">
                      <button onClick={() => onApprove(w.id, 'system')} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-bold">Aprovar</button>
                      <button onClick={() => onReject(w.id)} className="px-4 py-2 bg-red-600/10 text-red-500 rounded-xl text-[10px] font-bold">Recusar</button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold uppercase text-slate-600">{w.status}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminHomeManagement({ banners, products }: any) {
  return (
    <div className="space-y-8">
      <div className="bg-[#0B0F19] p-8 rounded-3xl border border-white/5">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-bold text-white">Banners da Página Inicial</h3>
          <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 hover:scale-[1.02] transition-all">
            <Plus className="w-5 h-5" /> Adicionar Banner
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map((b: any) => (
            <div key={b.id} className="relative aspect-video rounded-2xl overflow-hidden group">
              <img src={b.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="Banner" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-6 flex flex-col justify-end">
                <p className="text-white font-bold">{b.title}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded bg-blue-600 text-white`}>{b.active ? 'Ativo' : 'Inativo'}</span>
                  <button className="p-2 bg-red-500 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#0B0F19] p-8 rounded-3xl border border-white/5">
        <h3 className="text-xl font-bold text-white mb-6">Produtos em Destaque</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {products.filter((p: any) => p.featured).map((p: any) => (
            <div key={p.id} className="bg-[#05070A] p-4 rounded-2xl border border-white/5">
              <div className="w-full aspect-square bg-slate-900 rounded-xl mb-3 overflow-hidden">
                <img src={p.imageUrl} className="w-full h-full object-cover" alt="Prod" />
              </div>
              <p className="text-xs font-bold text-white truncate">{p.nome}</p>
              <p className="text-[10px] text-blue-500 font-bold mt-1">{p.preço.toLocaleString()} Kz</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminCartAnalytics({ stats, orders }: any) {
  const abandonedCount = stats ? stats.filter((s: any) => s.isAbandoned).length : 24; // Dummy if empty for visual
  
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AdminStatCard label="Carrinhos Ativos" value={stats?.length || 42} icon={ShoppingCart} color="text-blue-500" />
        <AdminStatCard label="Carrinhos Abandonados" value={abandonedCount} icon={Trash2} color="text-red-500" />
        <AdminStatCard label="Conversão" value="12%" icon={TrendingUp} color="text-emerald-500" />
      </div>

      <div className="bg-[#0B0F19] p-8 rounded-3xl border border-white/5">
        <h3 className="text-xl font-bold text-white mb-6">Ranking de Itens Abandonados</h3>
        <div className="space-y-6">
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center gap-6">
              <div className="w-12 h-12 bg-slate-900 rounded-xl"></div>
              <div className="flex-1">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-bold text-white">Produto de Teste Exemplo #{i}</span>
                  <span className="text-xs text-slate-500">14 Abandonos</span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500" style={{ width: `${80 - i*20}%` }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminApproval({ products, onApprove, onReject }: any) {
  const pending = products.filter((p: any) => p.status === 'pending');
  
  return (
    <div className="space-y-6">
      {pending.length === 0 ? (
        <div className="text-center py-20 bg-[#0B0F19] rounded-3xl border border-white/5">
          <ShieldCheck className="w-16 h-16 text-emerald-500/20 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white">Tudo em ordem!</h3>
          <p className="text-slate-500 text-sm">Não há novos produtos aguardando moderação.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pending.map((p: any) => (
            <div key={p.id} className="bg-[#0B0F19] p-6 rounded-3xl border border-white/5 flex gap-6">
              <div className="w-32 h-32 bg-slate-900 rounded-2xl shrink-0 overflow-hidden">
                 <img src={p.imageUrl} className="w-full h-full object-cover" alt="Preview" />
              </div>
              <div className="flex-1 flex flex-col">
                <p className="text-[10px] text-slate-500 uppercase font-mono tracking-widest">Aguardando Avaliação</p>
                <h4 className="text-lg font-bold text-white mt-1 leading-tight">{p.nome}</h4>
                <p className="text-xs text-slate-500 mt-2 line-clamp-2">{p.descrição}</p>
                <div className="mt-auto flex justify-between items-end pt-4">
                  <p className="text-lg font-black text-blue-500">{p.preço.toLocaleString()} Kz</p>
                  <div className="flex gap-2">
                    <button onClick={() => onReject(p.id, 'rejected')} className="p-3 bg-red-600/10 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all"><X className="w-5 h-5" /></button>
                    <button onClick={() => onApprove(p.id, 'approved')} className="p-3 bg-emerald-600/10 text-emerald-500 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"><Check className="w-5 h-5" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminUsers({ users, onBlock, onDelete }: any) {
  return (
    <div className="bg-[#0B0F19] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
      <table className="w-full text-left">
        <thead className="bg-[#05070A]/50 text-[10px] font-mono uppercase text-slate-500">
          <tr>
            <th className="p-6">Nome / Email</th>
            <th className="p-6 text-center">Tipo</th>
            <th className="p-6 text-center">Status</th>
            <th className="p-6 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="text-sm divide-y divide-white/5">
          {users.map((u: any) => (
            <tr key={u.id} className="hover:bg-white/5 transition-all">
              <td className="p-6">
                <p className="font-bold text-white">{u.nome}</p>
                <p className="text-xs text-slate-500">{u.email}</p>
              </td>
              <td className="p-6 text-center">
                <span className="bg-slate-900 border border-white/5 px-3 py-1 rounded-full text-[10px] font-bold text-slate-400 uppercase">
                  {u.tipo}
                </span>
              </td>
              <td className="p-6 text-center">
                <span className={`text-[10px] font-bold uppercase ${u.status === 'blocked' ? 'text-red-500' : 'text-emerald-500'}`}>
                  {u.status || 'active'}
                </span>
              </td>
              <td className="p-6">
                <div className="flex justify-end gap-2">
                  <button onClick={() => onBlock(u.id, u.status === 'blocked' ? 'active' : 'blocked')} className={`p-2 rounded-lg transition-all ${u.status === 'blocked' ? 'bg-emerald-600/10 text-emerald-500' : 'bg-red-600/10 text-red-500'}`}>
                    {u.status === 'blocked' ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                  </button>
                  <button onClick={() => onDelete(u.id)} className="p-2 bg-slate-800 text-slate-400 rounded-lg hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminDeliveryFees({ fees, onAdd, onDelete }: any) {
  const [bairro, setBairro] = useState('');
  const [valor, setValor] = useState('');

  const submit = (e: any) => {
    e.preventDefault();
    if (!bairro || !valor) return;
    onAdd(bairro, parseFloat(valor));
    setBairro('');
    setValor('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-[#0B0F19] p-8 rounded-3xl border border-white/5 h-fit">
        <h3 className="text-xl font-bold text-white mb-6">Adicionar Localidade</h3>
        <form onSubmit={submit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs text-slate-500 uppercase font-mono tracking-widest pl-1">Seleccionar Bairro de Luanda</label>
            <select className="w-full bg-[#05070A] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-blue-500 appearance-none" value={bairro} onChange={(e) => setBairro(e.target.value)}>
              <option value="">Escolher...</option>
              {LUANDA_BAIRROS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-slate-500 uppercase font-mono tracking-widest pl-1">Preço Entrega (Kz)</label>
            <input className="w-full bg-[#05070A] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-blue-500" placeholder="2500" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 hover:scale-[1.01] transition-all">Salvar Taxa</button>
        </form>
      </div>

      <div className="bg-[#0B0F19] p-8 rounded-3xl border border-white/5 h-fit">
        <h3 className="text-xl font-bold text-white mb-6">Tabela Vigente (Luanda)</h3>
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {fees.map((f: any) => (
            <div key={f.id} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 transition-all hover:bg-white/[0.08]">
              <div>
                <p className="text-sm font-bold text-white">{f.bairro}</p>
                <p className="text-xs text-blue-400 font-mono">{f.valor.toLocaleString()} Kz</p>
              </div>
              <button onClick={() => onDelete(f.id)} className="p-2 text-slate-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminReports({ reports }: any) {
  return (
    <div className="space-y-6">
      {reports.length === 0 ? (
        <div className="text-center py-20 bg-[#0B0F19] rounded-3xl border border-white/5">
           <AlertTriangle className="w-16 h-16 text-slate-800 mx-auto mb-4" />
           <p className="text-slate-500">Sem denúncias activas no momento.</p>
        </div>
      ) : (
        reports.map((r: any) => (
          <div key={r.id} className="bg-[#0B0F19] p-6 rounded-3xl border border-white/10 flex gap-6 border-l-4 border-l-red-500">
             <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] font-black uppercase bg-red-500/10 text-red-500 px-2 py-0.5 rounded italic">Denúncia</span>
                  <span className="text-white font-bold text-sm">Alvo: {r.targetId}</span>
                </div>
                <h4 className="text-lg font-bold text-white mb-2">{r.reason}</h4>
                <p className="text-xs text-slate-400 mb-6 bg-slate-900 p-4 rounded-2xl">{r.details}</p>
                <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl text-[10px] text-slate-500 font-mono">
                  <span>Reportado por: {r.reporterName}</span>
                  <span>{new Date(r.createdAt).toLocaleString()}</span>
                </div>
             </div>
             <div className="flex flex-col gap-2">
                <button className="p-3 bg-red-600 text-white rounded-xl shadow-lg shadow-red-600/20"><Trash2 className="w-5 h-5" /></button>
                <button className="p-3 bg-slate-800 text-white rounded-xl"><Check className="w-5 h-5" /></button>
             </div>
          </div>
        ))
      )}
    </div>
  );
}

function AdminAuditLogs({ logs }: any) {
  return (
    <div className="bg-[#0B0F19] rounded-3xl border border-white/5 overflow-hidden">
       <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
             <thead className="bg-[#05070A]/80 text-[10px] font-mono text-slate-500 uppercase">
                <tr>
                   <th className="p-6">Data / Hora</th>
                   <th className="p-6">Administrador</th>
                   <th className="p-6">Ação Realizada</th>
                   <th className="p-6">Dispositivo / IP</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-white/5 text-slate-400">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-white/5">
                     <td className="p-6 font-mono text-slate-500 whitespace-nowrap">
                       {new Date(log.createdAt).toLocaleString()}
                     </td>
                     <td className="p-6">
                       <span className="text-white font-bold">{log.adminName}</span>
                     </td>
                     <td className="p-6">
                       <span className="text-blue-400 font-bold uppercase mr-2">[{log.action}]</span>
                       <span className="text-slate-300">{log.details}</span>
                     </td>
                     <td className="p-6 italic opacity-50 truncate max-w-[200px]">
                       {log.device || 'N/A'}
                     </td>
                  </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
}

function AdminProfileSection({ userId, users }: any) {
  const profile = users.find((u: any) => u.id === userId);
  return (
    <div className="max-w-xl mx-auto space-y-8 bg-[#0B0F19] p-10 rounded-[3rem] border border-white/5">
       <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] mx-auto mb-6 flex items-center justify-center text-3xl font-black text-white shadow-2xl shadow-blue-600/30">
            {profile?.nome.charAt(0)}
          </div>
          <h2 className="text-2xl font-bold text-white">{profile?.nome}</h2>
          <p className="text-blue-500 font-mono text-xs mt-1 uppercase tracking-widest">{profile?.tipo} de Nível Crítico</p>
       </div>
       <div className="space-y-4 pt-4 border-t border-white/5">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-mono tracking-widest ml-1">E-mail Administrativo</label>
            <input className="w-full bg-[#05070A] border border-white/10 rounded-2xl p-4 text-white" disabled value={profile?.email} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-mono tracking-widest ml-1">Senha de Segurança</label>
            <input className="w-full bg-[#05070A] border border-white/10 rounded-2xl p-4 text-white" type="password" value="********" readOnly />
          </div>
          <button className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-700 transition-all">Alterar Credenciais de Acesso</button>
       </div>
    </div>
  );
}

// Global UI Helper Components
function AdminStatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-[#0B0F19] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all">
       <div className={`absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity ${color}`}>
         <Icon className="w-20 h-20" />
       </div>
       <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono mb-2">{label}</p>
       <h4 className={`text-3xl font-display font-black tracking-tight ${color}`}>{value}</h4>
    </div>
  );
}

function SegmentationItem({ label, count, color, total }: any) {
  const percentage = (count / total) * 100 || 0;
  return (
    <div className="space-y-2">
       <div className="flex justify-between text-xs font-bold">
         <span className="text-slate-300">{label}</span>
         <span className="text-slate-500 font-mono">{count} ({percentage.toFixed(1)}%)</span>
       </div>
       <div className="w-full h-2 bg-slate-900 border border-white/5 rounded-full overflow-hidden">
         <div className={`h-full ${color}`} style={{ width: `${percentage}%` }}></div>
       </div>
    </div>
  );
}
