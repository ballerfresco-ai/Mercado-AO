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
  Unlock,
  Package
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
  const [platformWallet, setPlatformWallet] = useState<Wallet | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'pedidos' | 'financeiro' | 'aprovacao' | 'usuarios' | 'taxas' | 'cupons' | 'perfil'
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
    const unsubPlatWallet = onSnapshot(doc(db, 'wallets', 'PLATAFORMA'), (snap) => { if (snap.exists()) setPlatformWallet(snap.data() as Wallet); });

    return () => {
      unsubUsers(); unsubProducts(); unsubOrders(); unsubWithdrawals(); 
      unsubFees(); unsubCoupons(); unsubPlatWallet();
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
    <div className="space-y-8">
      {/* Header Simples */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-6 rounded-2xl border border-white/5">
        <div>
          <h2 className="text-2xl font-bold text-white">Painel Administrativo</h2>
          <p className="text-slate-400 text-sm">Gestão global do Mercado AO</p>
        </div>
        <div className="flex items-center gap-4 bg-emerald-500/10 p-3 px-5 rounded-xl border border-emerald-500/20">
          <div className="text-right">
            <p className="text-[10px] text-emerald-500 uppercase font-bold">Saldo Plataforma</p>
            <p className="text-lg font-black text-white">{(platformWallet?.saldo || 0).toLocaleString()} Kz</p>
          </div>
          <DollarSign className="w-5 h-5 text-emerald-500" />
        </div>
      </div>

      {/* Navegação Simples */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-white/5">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'pedidos', label: 'Pedidos', icon: ClipboardList },
          { id: 'financeiro', label: 'Financeiro', icon: WalletIcon },
          { id: 'aprovacao', label: 'Moderação', icon: ShieldCheck },
          { id: 'usuarios', label: 'Usuários', icon: UserCog },
          { id: 'taxas', label: 'Logística', icon: Truck },
          { id: 'cupons', label: 'Cupons', icon: Tag },
          { id: 'perfil', label: 'Meu Perfil', icon: UserCircle },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === item.id ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div className="min-h-[400px]">
        {activeTab === 'dashboard' && <AdminDashboard users={users} products={products} orders={orders} />}
        {activeTab === 'pedidos' && <AdminOrders orders={orders} onUpdateStatus={handleForceUpdateOrderStatus} />}
        {activeTab === 'financeiro' && <AdminFinance orders={orders} withdrawals={withdrawals} onApprove={approveWithdrawal} onReject={setIsRejecting} />}
        {activeTab === 'aprovacao' && <AdminApproval products={products} onApprove={updateProductStatus} onReject={updateProductStatus} />}
        {activeTab === 'usuarios' && <AdminUsers users={users} onBlock={handleUpdateUserStatus} onDelete={deleteUser} />}
        {activeTab === 'taxas' && <AdminDeliveryFees fees={deliveryFees} onAdd={setDeliveryFee} onDelete={deleteDeliveryFee} />}
        {activeTab === 'cupons' && <AdminCoupons coupons={coupons} onSave={saveCoupon} onDelete={deleteCoupon} />}
        {activeTab === 'perfil' && <AdminProfileSection userId={userId} users={users} />}
      </div>

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

      <div className="bg-[#0B0F19] p-8 rounded-3xl border border-white/5 min-h-[400px]">
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
      </div>
    );
}

function AdminOrders({ orders, onUpdateStatus }: any) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = orders.filter((o: any) => {
    const matchesSearch = o.cliente_nome.toLowerCase().includes(search.toLowerCase()) || 
                         o.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filter === 'all' || o.status === filter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 bg-[#0B0F19] p-6 rounded-3xl border border-white/5 shadow-xl">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Buscar por cliente ou ID do pedido..." 
            className="w-full bg-[#05070A] border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:border-blue-500 outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'confirmed', 'delivered', 'cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${
                filter === s ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300'
              }`}
            >
              {s === 'all' ? 'Todos' : s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#0B0F19] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#05070A]/50 text-[10px] font-mono uppercase text-slate-500">
              <tr>
                <th className="p-6">Referência</th>
                <th className="p-6">Cliente & Contacto</th>
                <th className="p-6">Localização (Luanda)</th>
                <th className="p-6">Financeiro</th>
                <th className="p-6">Estado</th>
                <th className="p-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-white/5">
              {filtered.map((o: any) => (
                <tr key={o.id} className="hover:bg-white/5 transition-all group">
                  <td className="p-6">
                    <div className="font-mono font-bold text-blue-400">#{o.id.slice(-6)}</div>
                    <div className="text-[10px] text-slate-600 mt-1">{new Date(o.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="p-6">
                    <div className="font-bold text-white">{o.cliente_nome}</div>
                    <div className="text-xs text-slate-500">{o.cliente_phone || 'Sem telf.'}</div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2 text-slate-300">
                      <MapPin className="w-3 h-3 text-red-500" />
                      {o.bairro}
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="font-black text-slate-200">{o.total.toLocaleString()} Kz</div>
                    <div className="text-[10px] text-emerald-500">Comissão: {o.comissao_plataforma?.toLocaleString()} Kz</div>
                  </td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                      o.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-500' :
                      o.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                      o.status === 'cancelled' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="flex justify-end gap-2">
                       <button 
                        onClick={() => onUpdateStatus(o.id, 'confirmed')}
                        title="Confirmar Pedido"
                        className="p-2.5 bg-blue-600/10 text-blue-500 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                       >
                         <CheckCircle className="w-4 h-4" />
                       </button>
                       <button 
                        onClick={() => onUpdateStatus(o.id, 'delivered')}
                        title="Marcar como Entregue"
                        className="p-2.5 bg-emerald-600/10 text-emerald-500 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"
                       >
                         <Check className="w-4 h-4" />
                       </button>
                       <button 
                        onClick={() => onUpdateStatus(o.id, 'cancelled')}
                        title="Cancelar Pedido"
                        className="p-2.5 bg-red-600/10 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                       >
                         <X className="w-4 h-4" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminFinance({ orders, withdrawals, onApprove, onReject }: any) {
  const [filter, setFilter] = useState('all');
  const totalBalance = orders.filter((o: any) => o.status === 'delivered').reduce((s: any, o: any) => s + (o.comissao_plataforma || 0), 0);
  const pendingAmount = withdrawals.filter((w: any) => w.status === 'pending').reduce((s: any, w: any) => s + w.valor, 0);

  const filtered = withdrawals.filter((w: any) => filter === 'all' || w.status === filter);
  
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AdminStatCard label="Lucro Total Acumulado" value={`${totalBalance.toLocaleString()} Kz`} icon={TrendingUp} color="text-emerald-500" />
        <AdminStatCard label="Total em Solicitações" value={`${pendingAmount.toLocaleString()} Kz`} icon={Clock} color="text-amber-500" />
        <AdminStatCard label="Retenção Balanço" value="15%" icon={ShieldCheck} color="text-blue-500" />
      </div>

      <div className="bg-[#0B0F19] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-xl font-bold text-white">Fluxo de Caixa & Saques</h3>
            <p className="text-xs text-slate-500 mt-1">Gerencie os pagamentos e comissões do ecossistema.</p>
          </div>
          <div className="flex gap-2 bg-[#05070A] p-1.5 rounded-2xl border border-white/5">
            {['all', 'pending', 'approved', 'rejected'].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                  filter === s ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {s === 'all' ? 'Todos' : s}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#05070A]/30 text-[10px] font-mono uppercase text-slate-500">
              <tr>
                <th className="p-6">Beneficiário</th>
                <th className="p-6">Montante</th>
                <th className="p-6">Informação Bancária</th>
                <th className="p-6">Data</th>
                <th className="p-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-white/5">
              {filtered.map((w: any) => (
                <tr key={w.id} className="hover:bg-white/5 transition-all">
                  <td className="p-6">
                    <p className="font-bold text-white">{w.user_nome}</p>
                    <p className="text-[10px] text-blue-500 font-black uppercase mt-0.5">{w.user_tipo}</p>
                  </td>
                  <td className="p-6">
                    <div className="font-black text-emerald-400 text-lg">{w.valor.toLocaleString()} Kz</div>
                    {w.status === 'approved' && <span className="text-[9px] text-slate-500 font-mono">Processado via Multicaixa</span>}
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2 text-slate-400">
                      <CreditCard className="w-3 h-3" />
                      <span className="font-mono text-[11px]">{w.metodo || 'IBAN Standard'}</span>
                    </div>
                  </td>
                  <td className="p-6 text-slate-500 font-mono text-xs">{new Date(w.createdAt).toLocaleDateString()}</td>
                  <td className="p-6">
                    <div className="flex justify-end gap-2">
                    {w.status === 'pending' ? (
                      <>
                        <button onClick={() => onApprove(w.id, 'system')} className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black shadow-lg shadow-emerald-600/20 hover:scale-105">Liquidado</button>
                        <button onClick={() => onReject(w.id)} className="px-5 py-2 bg-red-600/10 text-red-500 rounded-xl text-[10px] font-black border border-red-500/10">Declinar</button>
                      </>
                    ) : (
                      <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                        w.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {w.status}
                      </span>
                    )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminCoupons({ coupons, onSave, onDelete }: any) {
  const [código, setCódigo] = useState('');
  const [desconto, setDesconto] = useState('');
  const [validade, setValidade] = useState('');

  const submit = (e: any) => {
    e.preventDefault();
    if (!código || !desconto || !validade) return;
    onSave(código, parseFloat(desconto), validade);
    setCódigo('');
    setDesconto('');
    setValidade('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-[#0B0F19] p-8 rounded-3xl border border-white/5 h-fit">
        <h3 className="text-xl font-bold text-white mb-6">Criar Novo Cupom</h3>
        <form onSubmit={submit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs text-slate-500 uppercase font-mono tracking-widest pl-1">Código do Cupom</label>
            <input className="w-full bg-[#05070A] border border-white/10 rounded-2xl p-4 text-white uppercase outline-none focus:border-blue-500" placeholder="EX: VERÃO15" value={código} onChange={(e) => setCódigo(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-500 uppercase font-mono tracking-widest pl-1">Desconto (%)</label>
              <input className="w-full bg-[#05070A] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-blue-500" placeholder="15" value={desconto} onChange={(e) => setDesconto(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-500 uppercase font-mono tracking-widest pl-1">Validade</label>
              <input className="w-full bg-[#05070A] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-blue-500" type="date" value={validade} onChange={(e) => setValidade(e.target.value)} />
            </div>
          </div>
          <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/20 hover:scale-[1.01] transition-all">Ativar Cupom</button>
        </form>
      </div>

      <div className="bg-[#0B0F19] p-8 rounded-3xl border border-white/5 h-fit">
        <h3 className="text-xl font-bold text-white mb-6">Cupons Ativos</h3>
        <div className="grid grid-cols-1 gap-4">
          {coupons.map((c: any) => (
            <div key={c.id} className="flex justify-between items-center p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white"><Tag className="w-5 h-5" /></div>
                 <div>
                    <p className="text-sm font-black text-white">{c.código}</p>
                    <p className="text-[10px] text-emerald-500 uppercase font-mono">-{c.desconto}% até {c.validade}</p>
                 </div>
              </div>
              <button onClick={() => onDelete(c.id)} className="p-2 text-slate-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          {coupons.length === 0 && <p className="text-center py-10 text-slate-500 text-xs italic">Nenhum cupom registado.</p>}
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
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = users.filter((u: any) => {
    const matchesSearch = u.nome.toLowerCase().includes(search.toLowerCase()) || 
                         u.email.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || u.tipo === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
        <div className="bg-[#0B0F19] p-6 rounded-3xl border border-white/5">
          <p className="text-[10px] text-slate-500 font-mono uppercase mb-1">Total</p>
          <p className="text-2xl font-black text-white">{users.length}</p>
        </div>
        <div className="bg-[#0B0F19] p-6 rounded-3xl border border-white/5">
          <p className="text-[10px] text-blue-500 font-mono uppercase mb-1">Produtores</p>
          <p className="text-2xl font-black text-white">{users.filter((u: any) => u.tipo === 'Produtor').length}</p>
        </div>
        <div className="bg-[#0B0F19] p-6 rounded-3xl border border-white/5">
          <p className="text-[10px] text-emerald-500 font-mono uppercase mb-1">Afiliados</p>
          <p className="text-2xl font-black text-white">{users.filter((u: any) => u.tipo === 'Afiliado').length}</p>
        </div>
        <div className="bg-[#0B0F19] p-6 rounded-3xl border border-white/5">
          <p className="text-[10px] text-amber-500 font-mono uppercase mb-1">Bloqueados</p>
          <p className="text-2xl font-black text-white">{users.filter((u: any) => u.status === 'blocked').length}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-[#0B0F19] p-6 rounded-3xl border border-white/5 shadow-xl">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Pesquisar por nome ou e-mail..." 
            className="w-full bg-[#05070A] border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white outline-none focus:border-blue-500 transition-all font-sans"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select 
          className="bg-[#05070A] border border-white/10 rounded-2xl px-6 py-3.5 text-sm font-bold text-slate-300 outline-none focus:border-blue-500"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">Tipos de Conta</option>
          <option value="Cliente">Compradores</option>
          <option value="Produtor">Produtores</option>
          <option value="Afiliado">Afiliados</option>
        </select>
      </div>

      <div className="bg-[#0B0F19] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#05070A]/50 text-[10px] font-mono uppercase text-slate-500">
              <tr>
                <th className="p-6">Perfil do Utilizador</th>
                <th className="p-6">Segmentação</th>
                <th className="p-6">Estado da Conta</th>
                <th className="p-6 text-right">Controle Administrativo</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-white/5">
              {filtered.map((u: any) => (
                <tr key={u.id} className="hover:bg-white/5 transition-all group">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 flex items-center justify-center text-white font-black">
                        {u.nome.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-white text-base leading-none">{u.nome}</p>
                        <p className="text-xs text-slate-500 mt-1.5">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${
                      u.tipo === 'Produtor' ? 'bg-blue-500/10 text-blue-500 border-blue-500/10' :
                      u.tipo === 'Afiliado' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10' : 
                      'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {u.tipo}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                       <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'blocked' ? 'bg-red-500 shadow-lg shadow-red-500/50' : 'bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50'}`} />
                       <span className={`text-[10px] font-black uppercase ${u.status === 'blocked' ? 'text-red-500' : 'text-emerald-500'}`}>
                        {u.status === 'blocked' ? 'Restrito / Bloqueado' : 'Auditado / Ativo'}
                      </span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0 translate-x-2">
                      <button 
                        onClick={() => onBlock(u.id, u.status === 'blocked' ? 'active' : 'blocked')} 
                        className={`p-3 rounded-xl transition-all shadow-md ${
                          u.status === 'blocked' ? 'bg-emerald-600 text-white' : 'bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white'
                        }`}
                        title={u.status === 'blocked' ? 'Desbloquear' : 'Bloquear Acesso'}
                      >
                        {u.status === 'blocked' ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={() => onDelete(u.id)} 
                        className="p-3 bg-slate-800 text-slate-400 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-md"
                        title="Eliminar permanentemente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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

function AdminProfileSection({ userId, users }: any) {
  const profile = users.find((u: any) => u.id === userId);
  return (
    <div className="max-w-xl mx-auto space-y-8 bg-[#0B0F19] p-10 rounded-[3rem] border border-white/5">
       <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] mx-auto mb-6 flex items-center justify-center text-3xl font-black text-white shadow-2xl shadow-blue-600/30">
            {profile?.nome.charAt(0)}
          </div>
          <h2 className="text-2xl font-bold text-white">{profile?.nome}</h2>
          <p className="text-blue-500 font-mono text-xs mt-1 uppercase tracking-widest">{profile?.tipo} Administrador</p>
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
