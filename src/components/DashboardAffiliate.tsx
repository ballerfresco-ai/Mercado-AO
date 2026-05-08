import React, { useState, useEffect } from 'react';
import { 
  db, 
  getWallet, 
  requestWithdrawal 
} from '../firebase';
import { generateSocialPromoCopy } from '../services/gemini';
import { 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { Product, Wallet, Withdrawal, UserProfile } from '../types';
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
  Award
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

  // Selected product state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [generatedPromoCopy, setGeneratedPromoCopy] = useState<string>('');
  const [isGeneratingAiPromo, setIsGeneratingAiPromo] = useState<boolean>(false);

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
    });

    // 2. Affiliate's personal wallet
    const unsubWallet = onSnapshot(collection(db, 'wallets'), (snap) => {
      const match = snap.docs.find(d => d.id === userId);
      if (match) {
        setWallet(match.data() as Wallet);
      }
    });

    // 3. Affiliate's withdrawals list
    const qWiths = query(collection(db, 'withdrawals'), where('user_id', '==', userId));
    const unsubWiths = onSnapshot(qWiths, (snap) => {
      setWithdrawals(snap.docs.map(d => d.data() as Withdrawal));
    });

    return () => {
      unsubProds();
      unsubWallet();
      unsubWiths();
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

      {/* Grid: Main Column (Available Products to affiliate) & Right Column (Dashboard Rank & Withdrawals) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: PRODUCTS TO PROMOTE */}
        <div className="lg:col-span-7 space-y-6">
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

        {/* RIGHT COLUMN: RANK, GRAPH, WITHDRAWALS */}
        <div className="lg:col-span-5 space-y-6">
          {/* Rank Badge */}
          <div className="bg-gradient-to-br from-[#1E1B4B] to-[#0F172A] p-5 rounded-2xl border border-[#312E81] space-y-3 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-10 filter blur-sm">
              <Award className="w-40 h-40" />
            </div>
            
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#8B5CF6]">Seu Crescimento no Mercado AO</span>
              <h4 className="font-display font-black text-xl text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-[#8B5CF6] shrink-0" />
                <span>{affiliateRankName}</span>
              </h4>
              <p className="text-xs text-slate-350">{affiliateRankBonusMessage}</p>
            </div>

            <div className="pt-2 border-t border-indigo-900/50 flex justify-between text-xs text-slate-400">
              <span className="font-mono">Total Pago no Banco:</span>
              <strong className="font-mono text-indigo-300">{totalWithdrawnAmount.toLocaleString()} Kz</strong>
            </div>
          </div>

          {/* Withdraw form */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="font-display font-bold text-base text-white">Solicitar Transferência de Lucros</h4>
            
            {/* Gov cashout warning note */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl text-[11px] leading-relaxed flex items-start gap-2 select-none">
              <span className="font-extrabold shrink-0">REGULAMENTO:</span>
              <span>Saques de afiliados têm um desconto de <strong>200 Kz fixos</strong> por solicitação para taxas financeiras locais de processamento.</span>
            </div>

            {apiError && (
              <div className="p-3 bg-red-500/15 border border-red-500/20 text-red-500 text-xs rounded-xl select-none">
                {apiError}
              </div>
            )}
            {formSuccess && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/20 text-emerald-450 text-xs rounded-xl select-none">
                {formSuccess}
              </div>
            )}

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
                <label className="text-[10px] text-slate-400 uppercase font-mono">Dados Receptores (IBAN / Telemóvel)</label>
                <input
                  type="text"
                  required
                  placeholder="Seu IBAN AO06... ou contacto registado"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  value={withdrawDetalhes}
                  onChange={(e) => setWithdrawDetalhes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold rounded-xl text-xs transition-colors"
              >
                Solicitar Saque (Dedução de 200 Kz)
              </button>
            </form>
          </div>

          {/* Historical Cashouts tracking */}
          <div className="bg-slate-900/20 p-5 rounded-2xl border border-white/5 space-y-3">
            <h4 className="text-xs font-mono uppercase text-slate-400 tracking-wider">Histórico de Movimentações</h4>
            {withdrawals.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Nenhum saque solicitado.</p>
            ) : (
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {withdrawals.map(wit => (
                  <div key={wit.id} className="bg-[#0B0F19]/40 p-2.5 rounded-xl border border-white/5 flex justify-between items-center text-[11px]">
                    <div>
                      <span className="font-bold text-slate-100">{wit.valor.toLocaleString()} Kz</span>
                      <span className="text-[10px] text-slate-500 ml-2 font-mono">({wit.metodo})</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      wit.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                      wit.status === 'rejected' ? 'bg-red-500/15 text-red-400' :
                      'bg-slate-805 text-slate-400'
                    }`}>
                      {wit.status === 'approved' ? 'Liquido Pago' :
                       wit.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
