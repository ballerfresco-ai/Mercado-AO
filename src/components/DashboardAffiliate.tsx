import React, { useState, useEffect } from 'react';
import { 
  db, 
  getWallet, 
  requestWithdrawal,
  handleFirestoreError,
  OperationType 
} from '../firebase';
import { generateSocialPromoCopy } from '../services/gemini';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  getDocs,
  orderBy
} from 'firebase/firestore';
import { Product, Wallet, Withdrawal, UserProfile, Order, MaterialApoio } from '../types';
import { 
  Sparkles, 
  Percent, 
  DollarSign, 
  Share2, 
  Copy, 
  FileText, 
  Check, 
  Link as LinkIcon, 
  Clock, 
  HelpCircle,
  TrendingUp,
  Award,
  Wallet as WalletIcon,
  ShoppingBag,
  Info,
  Trophy,
  Users,
  Search,
  ExternalLink,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardAffiliateProps {
  userId: string;
  userProfile: UserProfile;
}

export function DashboardAffiliate({ userId, userProfile }: DashboardAffiliateProps) {
  // DB states
  const [products, setProducts] = useState<Product[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [materials, setMaterials] = useState<MaterialApoio[]>([]);
  const [topAffiliates, setTopAffiliates] = useState<UserProfile[]>([]);

  // Selected product state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [generatedPromoCopy, setGeneratedPromoCopy] = useState<string>('');
  const [isGeneratingAiPromo, setIsGeneratingAiPromo] = useState<boolean>(false);

  // UI state
  const [activeTab, setActiveTab] = useState<'afiliar_me' | 'sou_afiliado' | 'pedidos' | 'material_apoio' | 'ranking' | 'carteira'>('afiliar_me');

  // Form states
  const [withdrawAmountInput, setWithdrawAmountInput] = useState('');
  const [withdrawMetodo, setWithdrawMetodo] = useState<'IBAN' | 'PayPay' | 'Unitel Money' | 'Afrimoney' | 'Multicaixa Express'>('IBAN');
  const [withdrawDetalhes, setWithdrawDetalhes] = useState('');

  // Local notices
  const [apiError, setApiError] = useState<string | null>(null);
  const [copiedPromoText, setCopiedPromoText] = useState(false);
  const [copiedLinkMap, setCopiedLinkMap] = useState<{ [id: string]: boolean }>({});
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    // 1. All approved products listing
    const qProds = query(collection(db, 'products'), where('status', '==', 'approved'));
    const unsubProds = onSnapshot(qProds, (snap) => {
      setProducts(snap.docs.map(d => d.data() as Product));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    // 2. Affiliate's personal wallet
    const unsubWallet = onSnapshot(collection(db, 'wallets'), (snap) => {
      const match = snap.docs.find(d => d.id === userId);
      if (match) {
        setWallet(match.data() as Wallet);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'wallets');
    });

    // 3. Affiliate's withdrawals list
    const qWiths = query(collection(db, 'withdrawals'), where('user_id', '==', userId));
    const unsubWiths = onSnapshot(qWiths, (snap) => {
      setWithdrawals(snap.docs.map(d => d.data() as Withdrawal));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'withdrawals');
    });

    // 4. Affiliate's orders (sales made by them)
    const qOrders = query(collection(db, 'orders'), where('afiliado_id', '==', userId));
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      setMyOrders(snap.docs.map(d => d.data() as Order));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    // 5. Materials (all available materials since any affiliate can promote any product)
    const qMats = query(collection(db, 'material_apoio'));
    const unsubMats = onSnapshot(qMats, (snap) => {
      setMaterials(snap.docs.map(d => d.data() as MaterialApoio));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'material_apoio');
    });

    // 6. Ranking of Affiliates (just fetch all affiliates to calculate rank)
    const fetchRanking = async () => {
      const qUsers = query(collection(db, 'users'), where('tipo', '==', 'Afiliado'));
      const snap = await getDocs(qUsers);
      setTopAffiliates(snap.docs.map(d => d.data() as UserProfile));
    };
    fetchRanking();

    return () => {
      unsubProds();
      unsubWallet();
      unsubWiths();
      unsubOrders();
      unsubMats();
    };
  }, [userId]);

  const handleCopyAffiliateLink = (prod: Product) => {
    const affiliateUrl = `${window.location.origin}${window.location.pathname}?ref=${userId}&prodId=${prod.id}`;
    
    navigator.clipboard.writeText(affiliateUrl);
    setCopiedLinkMap(prev => ({ ...prev, [prod.id]: true }));
    setTimeout(() => {
      setCopiedLinkMap(prev => ({ ...prev, [prod.id]: false }));
    }, 2500);
  };

  const handleBuildAiPromoCopy = async (prod: Product) => {
    setSelectedProduct(prod);
    setGeneratedPromoCopy('');
    setIsGeneratingAiPromo(true);
    setApiError(null);

    const affiliateUrl = `${window.location.origin}${window.location.pathname}?ref=${userId}&prodId=${prod.id}`;

    try {
      const copyResult = await generateSocialPromoCopy(
        prod.nome, 
        prod.preço, 
        affiliateUrl
      );
      setGeneratedPromoCopy(copyResult);
    } catch (err: any) {
      setApiError("Erro ao contactar a AI para gerar a sua copy em kwanza.");
    } finally {
      setIsGeneratingAiPromo(false);
    }
  };

  const handleCopyPromoCopyText = () => {
    if (!generatedPromoCopy) return;
    navigator.clipboard.writeText(generatedPromoCopy);
    setCopiedPromoText(true);
    setTimeout(() => setCopiedPromoText(false), 2500);
  };

  const handleWithrawRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setFormSuccess(null);
    const amount = parseFloat(withdrawAmountInput);

    if (isNaN(amount) || amount < 200) {
      setApiError("O montante mínimo de saco regulamentado por lei é de 200 Kz.");
      return;
    }

    const totalBalance = wallet?.saldo || 0;
    if (amount > totalBalance) {
      setApiError("Não possui fundos suficientes na sua carteira.");
      return;
    }

    if (!withdrawDetalhes.trim()) {
      setApiError("Por favor escreva as informações de destino de transferências.");
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

      setFormSuccess(`Solicitação enviada de ${amount.toLocaleString()} Kz (Será deduzido a taxa fixa governamental de 200 Kz no desembolso final de ADM).`);
      setWithdrawAmountInput('');
      setWithdrawDetalhes('');
    } catch (error: any) {
      setApiError(error.message || "Erro de finanças.");
    }
  };

  // Determine user rank title
  const totalWithdrawnAmount = withdrawals
    .filter(w => w.status === 'approved')
    .reduce((sum, w) => sum + w.valor, 0);

  let affiliateRankName = "Nível Bronze";
  let affiliateRankBonusMessage = "Venda mais para atingir o rank de Prata!";
  
  if (totalWithdrawnAmount >= 100000) {
    affiliateRankName = "Estrela de Diamante (Nível Máximo)";
    affiliateRankBonusMessage = "Você é um destaque angolano! Suas taxas têm maior prioridade de liberação bancária.";
  } else if (totalWithdrawnAmount >= 30000) {
    affiliateRankName = "Afiliado Ouro";
    affiliateRankBonusMessage = "Crescimento expressivo! Continue a promover nas redes.";
  } else if (totalWithdrawnAmount >= 5000) {
    affiliateRankName = "Afiliado Prata";
    affiliateRankBonusMessage = "Ótimo percurso! Continue no mercado.";
  }

  return (
    <div className="space-y-8" id="affiliate_dashboard">
      
      {/* Overview Top Info */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <span className="text-xs font-mono uppercase bg-purple-500/10 text-purple-400 p-1 px-2 rounded border border-purple-500/20 font-bold">Afiliado Premium</span>
          <h2 className="text-3xl font-display font-black tracking-tight mt-1">Ganhos por Promoção</h2>
          <p className="text-sm text-slate-400 mt-1">Promova serviços e produtos locais com o seu código de referência e fature na hora do faturamento físico.</p>
        </div>

        {/* Balance Card */}
        <div className="flex items-center gap-4 bg-slate-900/60 p-4 rounded-xl border border-white/10" id="affiliate_wallet">
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">Suas Comissões Disponíveis</div>
            <div className="text-2xl font-display font-black text-[#8B5CF6]">
              {(wallet?.saldo || 0).toLocaleString()} <span className="text-xs font-sans font-normal text-purple-400">Kz</span>
            </div>
          </div>
          <div className="p-3 bg-[#8B5CF6]/10 rounded-xl text-purple-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-px">
        {[
          { id: 'afiliar_me', label: 'Afiliar-me', icon: ShoppingBag },
          { id: 'sou_afiliado', label: 'Sou Afiliado', icon: Users },
          { id: 'pedidos', label: 'Pedidos', icon: FileText },
          { id: 'material_apoio', label: 'Apoio', icon: Info },
          { id: 'ranking', label: 'Ranking', icon: Trophy },
          { id: 'carteira', label: 'Carteira', icon: WalletIcon }
        ].map(item => {
          const Icon = item.icon;
          const isSel = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-semibold transition-all ${
                isSel 
                  ? 'bg-purple-600/10 border-t border-r border-l border-purple-500/30 text-white border-b-2 border-b-purple-500' 
                  : 'text-slate-400 hover:text-slate-200 border-b border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Grid Content Panel */}
      <div className="min-h-[400px]">
        {/* AFILIAR-ME / BROWSE PRODUCTS */}
        {activeTab === 'afiliar_me' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-lg text-white">Produtos Disponíveis para Afiliar ({products.length})</h3>
            <span className="text-xs text-slate-400 font-mono">10% Platform split apply</span>
          </div>

          {products.length === 0 ? (
            <p className="text-slate-500 italic text-sm bg-slate-900/10 p-6 rounded-xl border border-white/5 text-center">Nenhum produto aprovado pelo ADM disponível para afiliação de momento.</p>
          ) : (
            <div className="space-y-4">
              {products.map(prod => {
                const calculatedComisVal = Math.round((prod.preço * prod.comissão_afiliado) / 100);
                const isCopied = !!copiedLinkMap[prod.id];
                
                return (
                  <div key={prod.id} className="bg-[#0B0F19] p-5 rounded-2xl border border-white/5 space-y-4 hover:border-white/10 transition-colors">
                    <div className="flex items-start gap-4">
                      {prod.imageUrl && (
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-900 shrink-0">
                          <img 
                            src={prod.imageUrl} 
                            alt={prod.nome} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as any).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      
                      <div className="flex-1 space-y-1">
                        <h4 className="font-display font-semibold text-white text-base leading-none">{prod.nome}</h4>
                        <div className="text-xs text-slate-400 line-clamp-2 italic">"{prod.descrição}"</div>
                        <div className="flex items-center gap-3 text-xs mt-1">
                          <span className="text-blue-400 font-bold font-mono">{prod.preço.toLocaleString()} Kz</span>
                          <span className="text-slate-600 font-mono">|</span>
                          <span className="text-purple-400 font-bold font-mono flex items-center gap-0.5">
                            <Percent className="w-3.5 h-3.5" /> {prod.comissão_afiliado}% comissão
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-905/30 p-2.5 rounded-xl flex items-center justify-between text-xs font-mono text-slate-350">
                      <span>Estimativa seu Ganho por Venda:</span>
                      <strong className="text-emerald-450 text-sm font-display font-extrabold">{calculatedComisVal.toLocaleString()} Kz</strong>
                    </div>

                    {/* Actions container */}
                    <div className="flex flex-wrap gap-2 pt-1.5">
                      <button
                        onClick={() => handleCopyAffiliateLink(prod)}
                        className={`px-4 py-2 border rounded-xl text-xs font-semibold font-mono flex items-center gap-1.5 transition-all ${
                          isCopied 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                            : 'bg-slate-900 hover:bg-slate-850 border-white/5 text-slate-200'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>Link de Afiliado Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-blue-400" />
                            <span>Obter Link Único de Afiliado</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleBuildAiPromoCopy(prod)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-sky-300 animate-pulse" />
                        <span>Gerar Copy Whatsapp (AI)</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* AI GENERATED COPY AREA */}
          <AnimatePresence>
            {selectedProduct && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[#0B0F19] border border-dashed border-blue-500/30 rounded-2xl p-5 space-y-4"
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-display font-black text-sm text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Copy de Divulgação: <span className="text-blue-400">{selectedProduct.nome}</span></span>
                  </h4>
                  <button 
                    onClick={() => setSelectedProduct(null)}
                    className="text-slate-500 hover:text-white font-mono text-[10px]"
                  >
                    Fechar
                  </button>
                </div>

                {isGeneratingAiPromo ? (
                  <div className="flex items-center gap-3 py-4 text-xs font-mono text-slate-400">
                    <span className="w-4 h-4 border-2 border-purple-500 border-t-white rounded-full animate-spin"></span>
                    <span>Elaborando cópia de atração com foco no frete...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <pre className="bg-slate-950 p-4 rounded-xl text-slate-300 text-xs font-sans whitespace-pre-wrap leading-relaxed select-all border border-white/5 relative">
                      {generatedPromoCopy}
                    </pre>

                    <button
                      onClick={handleCopyPromoCopyText}
                      className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold font-mono transition-colors flex items-center justify-center gap-1.5"
                    >
                      {copiedPromoText ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Texto de WhatsApp Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copiar Todo Texto de Divulgação</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    )}

        {/* SOU AFILIADO */}
        {activeTab === 'sou_afiliado' && (
          <div className="space-y-6">
            <h3 className="font-display font-bold text-lg text-white">Meus Links de Venda Ativos</h3>
            {myOrders.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/10 rounded-2xl border border-dashed border-slate-700">
                <p className="text-slate-400 text-sm">Ainda não registou vendas ou promoveu produtos. Comece em "Afiliar-me"!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {Array.from(new Set(myOrders.map(o => o.produto_id))).map(pidObj => {
                  const pid = pidObj as string;
                  const prod = products.find(p => p.id === pid);
                  if (!prod) return null;
                  const isCopied = !!copiedLinkMap[prod.id];
                  return (
                    <div key={pid} className="bg-slate-900 border border-white/10 p-5 rounded-2xl flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400">
                          <LinkIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-display font-bold text-white text-sm">{prod.nome}</h4>
                          <p className="text-[10px] text-slate-500 font-mono">ID: #{pid.substr(0, 8)}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleCopyAffiliateLink(prod)}
                        className={`p-2.5 rounded-xl border transition-all ${isCopied ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-800 border-white/5 text-slate-400 hover:text-white'}`}
                      >
                        {isCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PEDIDOS */}
        {activeTab === 'pedidos' && (
          <div className="space-y-6">
            <h3 className="font-display font-bold text-lg text-white">Rastreador de Vendas Indicadas</h3>
            <div className="bg-slate-900/60 rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-800/80 text-slate-400">
                  <tr>
                    <th className="p-4 py-3">Produto</th>
                    <th className="p-4 py-3 text-center">Data</th>
                    <th className="p-4 py-3 text-center">Status</th>
                    <th className="p-4 py-3 text-right">Comissão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {myOrders.length === 0 ? (
                    <tr><td colSpan={4} className="p-10 text-center text-slate-500 italic">Sem vendas registadas ainda.</td></tr>
                  ) : (
                    myOrders.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(order => (
                      <tr key={order.id} className="hover:bg-white/5">
                        <td className="p-4">
                          <p className="font-display font-bold text-white mb-1">{order.produto_nome}</p>
                          <p className="text-[10px] text-slate-500">#{order.id.substr(0, 8)}</p>
                        </td>
                        <td className="p-4 text-center text-slate-400">
                          {new Date(order.createdAt).toLocaleDateString('pt-AO')}
                        </td>
                        <td className="p-4 text-center text-slate-400 uppercase text-[9px] font-black">
                          <span className={`px-2 py-0.5 rounded ${
                            order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-400' :
                            order.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                            'bg-slate-800 text-slate-500'
                          }`}>
                            {order.status === 'delivered' ? 'Concluída' : 
                             order.status === 'cancelled' ? 'Cancelada' : 'No Fluxo'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <strong className="text-emerald-400">{order.comissao_afiliado_paga.toLocaleString()} Kz</strong>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MATERIAL DE APOIO */}
        {activeTab === 'material_apoio' && (
          <div className="space-y-6">
            <h3 className="font-display font-bold text-lg text-white">Suporte ao Afiliado (Materiais dos Produtores)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {materials.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-slate-900/10 rounded-2xl border border-dashed border-slate-700">
                  <p className="text-slate-500">Nenhum material de apoio disponível de momento.</p>
                </div>
              ) : (
                materials.map(mat => (
                  <div key={mat.id} className="bg-slate-900 p-5 rounded-2xl border border-white/5 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                        <FileText className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-bold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{mat.tipo}</span>
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-white text-sm">{mat.titulo}</h4>
                      <p className="text-[10px] text-slate-400 leading-tight mt-1">{mat.descricao}</p>
                    </div>
                    {mat.link && (
                      <a href={mat.link} target="_blank" rel="noopener noreferrer" className="block w-full py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-xl text-[10px] font-bold font-mono text-center flex items-center justify-center gap-2">
                        <ExternalLink className="w-3 h-3" /> Aceder Recurso
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* RANKING */}
        {activeTab === 'ranking' && (
          <div className="space-y-6">
            <h3 className="font-display font-bold text-lg text-white">Ranking Global de Desempenho</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-4 space-y-6">
                <div className="bg-gradient-to-br from-purple-900/40 to-slate-900 p-6 rounded-2xl border border-purple-500/20 space-y-4">
                  <Award className="w-12 h-12 text-yellow-400" />
                  <div>
                    <h4 className="font-display font-black text-xl text-white">Seu Status</h4>
                    <p className="text-3xl font-display font-black text-purple-400 mt-2">{affiliateRankName}</p>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed italic">{affiliateRankBonusMessage}</p>
                </div>
              </div>
              <div className="md:col-span-8">
                <div className="bg-slate-900/60 rounded-2xl border border-white/10 overflow-hidden">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-800/80 text-slate-500 uppercase tracking-widest text-[10px]">
                      <tr>
                        <th className="p-4">Posição</th>
                        <th className="p-4">Afiliado</th>
                        <th className="p-4 text-right">Volume Ganhos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(() => {
                        const rankList = topAffiliates.map(u => {
                          const vol = myOrders.filter(o => o.afiliado_id === u.id && o.status === 'delivered').reduce((s, o) => s + o.comissao_afiliado_paga, 0);
                          return { ...u, volume: vol };
                        }).sort((a,b) => b.volume - a.volume).slice(0, 10);

                        return rankList.length === 0 ? (
                          <tr><td colSpan={3} className="p-10 text-center text-slate-500">Sem dados de ranking.</td></tr>
                        ) : (
                          rankList.map((user, i) => (
                            <tr key={user.id} className="hover:bg-white/5">
                              <td className="p-4 font-black text-slate-500">#0{i+1}</td>
                              <td className="p-4 font-display font-bold text-white">{user.id === userId ? 'VOCÊ' : user.nome}</td>
                              <td className="p-4 text-right font-black text-emerald-400">{user.volume.toLocaleString()} Kz</td>
                            </tr>
                          ))
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CARTEIRA */}
        {activeTab === 'carteira' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
            <div className="lg:col-span-5 space-y-6">
              {/* Balanço Mini */}
              <div className="bg-slate-900 p-6 rounded-2xl border border-white/10 flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-mono">Saldo Disponível</p>
                  <h4 className="text-3xl font-display font-black text-emerald-400">{wallet?.saldo.toLocaleString()} <span className="text-sm font-sans font-normal opacity-70">Kz</span></h4>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                  <WalletIcon className="w-8 h-8" />
                </div>
              </div>

              {/* Withdraw form */}
              <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
                <h4 className="font-display font-bold text-base text-white">Solicitar Transferência de Lucros</h4>
                
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl text-[11px] leading-relaxed flex items-start gap-2">
                  <span className="font-extrabold shrink-0">REGULAMENTO:</span>
                  <span>Saques de afiliados têm um desconto de <strong>200 Kz fixos</strong> por solicitação.</span>
                </div>

                {apiError && <div className="p-3 bg-red-500/15 border border-red-500/20 text-red-500 text-xs rounded-xl">{apiError}</div>}
                {formSuccess && <div className="p-3 bg-emerald-500/15 border border-emerald-500/20 text-emerald-450 text-xs rounded-xl">{formSuccess}</div>}

                <form onSubmit={handleWithrawRequestSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-mono">Valor Pretendido (Kz)</label>
                    <input
                      type="number"
                      required
                      placeholder="Ex: 5000"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
                      value={withdrawAmountInput}
                      onChange={(e) => setWithdrawAmountInput(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-400 uppercase font-mono block">Canal Associado</label>
                    <select
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
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
                    <label className="text-[10px] text-slate-400 uppercase font-mono">Dados Receptores</label>
                    <input
                      type="text"
                      required
                      placeholder="Seu IBAN ou contacto registado"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
                      value={withdrawDetalhes}
                      onChange={(e) => setWithdrawDetalhes(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-colors"
                  >
                    Confirmar Levantamento
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/5 space-y-4">
                <h4 className="text-xs font-mono uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Histórico de Movimentações
                </h4>
                {withdrawals.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Nenhum saque solicitado.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {withdrawals.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(wit => (
                      <div key={wit.id} className="bg-slate-950 p-4 rounded-2xl border border-white/5 flex justify-between items-center group">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${wit.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : wit.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-500'}`}>
                            {wit.status === 'approved' ? <Check className="w-4 h-4" /> : wit.status === 'rejected' ? <X className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className="font-bold text-white text-sm">{wit.valor.toLocaleString()} Kz</span>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{new Date(wit.createdAt).toLocaleDateString('pt-AO')} • {wit.metodo}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                            wit.status === 'approved' ? 'bg-emerald-500 text-slate-950' : 
                            wit.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {wit.status === 'approved' ? 'Pago' : wit.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
