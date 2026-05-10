import React, { useState, useEffect } from 'react';
import { 
  db, 
  createOrder, 
  submitReview, 
  useUserReferral,
  handleFirestoreError,
  OperationType,
  getUserDigitalAccess,
  updateDigitalProgress
} from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { Product, Coupon, DeliveryFee, Order, UserDigitalAccess } from '../types';
import { 
  ShoppingBag, 
  MapPin, 
  Search, 
  Tag, 
  Star, 
  Check, 
  MessageSquare, 
  X, 
  AlertCircle, 
  ShoppingBagIcon, 
  Info,
  Clock,
  Heart,
  ChevronRight,
  Sparkles,
  Flame,
  Truck,
  Download,
  PlayCircle,
  FileText,
  Link as LinkIcon,
  Globe,
  CreditCard,
  Building,
  Smartphone,
  SmartphoneIcon,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MarketplaceClientProps {
  userId: string;
  onOpenChat: (orderId: string) => void;
}

const LUANDA_BAIRROS = [
  "Maianga", "Talatona", "Viana", "Benfica", "Kilamba", "Cazenga", "Rangel", "Samba", "Sambizanga"
];

export function MarketplaceClient({ userId, onOpenChat }: MarketplaceClientProps) {
  // DB feeds
  const [products, setProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [deliveryFees, setDeliveryFees] = useState<DeliveryFee[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);

  // Search/Filters states
  const [searchWord, setSearchWord] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'featured' | 'FISICO' | 'DIGITAL'>('all');
  const [activeTab, setActiveTab] = useState<'marketplace' | 'my_digital'>('marketplace');

  // Digital Access state
  const [digitalAccessList, setDigitalAccessList] = useState<UserDigitalAccess[]>([]);
  const [selectedAccess, setSelectedAccess] = useState<UserDigitalAccess | null>(null);

  // Checkout states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [bairroSelection, setBairroSelection] = useState<string>('');
  const [deliveryFeeValue, setDeliveryFeeValue] = useState<number>(0);
  const [moreAddress, setMoreAddress] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE'>('COD');
  const [onlineChannel, setOnlineChannel] = useState<'Transferência' | 'Unitel Money' | 'MCX Express' | 'Referência'>('Transferência');
  const [userCouponInput, setUserCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponFeedback, setCouponFeedback] = useState<{ status: 'success' | 'error'; text: string } | null>(null);

  // Review states
  const [reviewStars, setReviewStars] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState(false);

  // General notices
  const [orderProcessing, setOrderProcessing] = useState(false);
  const [orderSuccessRef, setOrderSuccessRef] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Auto-detect referral link
  const detectedReferralUserId = useUserReferral();

  useEffect(() => {
    // 1. Fetch only approved products
    const qProds = query(collection(db, 'products'), where('status', '==', 'approved'));
    const unsubProds = onSnapshot(qProds, (snap) => {
      setProducts(snap.docs.map(d => d.data() as Product));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    // 2. Fetch coupons
    const unsubCoupons = onSnapshot(collection(db, 'coupons'), (snap) => {
      setCoupons(snap.docs.map(d => d.data() as Coupon));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'coupons');
    });

    // 3. Fetch delivery mapping
    const unsubFees = onSnapshot(collection(db, 'deliveryFees'), (snap) => {
      setDeliveryFees(snap.docs.map(d => d.data() as DeliveryFee));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'deliveryFees');
    });

    // 4. Fetch orders made by this client
    const qOrders = query(collection(db, 'orders'), where('cliente_id', '==', userId));
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      setActiveOrders(snap.docs.map(d => d.data() as Order));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    // 5. Fetch digital access
    const unsubAccess = onSnapshot(query(collection(db, 'digital_access'), where('user_id', '==', userId)), (snap) => {
      setDigitalAccessList(snap.docs.map(d => d.data() as UserDigitalAccess));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'digital_access');
    });

    return () => {
      unsubProds();
      unsubCoupons();
      unsubFees();
      unsubOrders();
      unsubAccess();
    };
  }, [userId]);

  // Recalculate neighborhood fee on change
  const handleBairroChange = (bairroName: string) => {
    setBairroSelection(bairroName);
    const found = deliveryFees.find(df => df.bairro.toLowerCase() === bairroName.toLowerCase());
    if (found) {
      setDeliveryFeeValue(found.valor);
    } else {
      setDeliveryFeeValue(1500); // Default standard fee for unknown address
    }
  };

  // Try applying coupon
  const handleApplyCouponCode = () => {
    setAppliedCoupon(null);
    setCouponFeedback(null);
    if (!userCouponInput.trim()) return;

    const code = userCouponInput.trim().toUpperCase();
    const found = coupons.find(c => c.código.toUpperCase() === code);

    if (found) {
      setAppliedCoupon(found);
      setCouponFeedback({ status: 'success', text: `Cupão aplicado! Desconto de -${found.desconto}% garantido.` });
    } else {
      setCouponFeedback({ status: 'error', text: 'Cupão inválido ou fora da validade.' });
    }
  };

  // Submit order
  const handlePlaceOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    if (selectedProduct.tipo === 'FISICO') {
      if (!bairroSelection || !clientPhone.trim() || !moreAddress.trim()) {
        alert("Por favor preencha todos os dados de entrega em Luanda!");
        return;
      }
    } else {
      if (!clientPhone.trim()) {
        alert("Por favor preencha o seu telemóvel!");
        return;
      }
    }

    setOrderProcessing(true);
    setApiError(null);

    const discountPercentage = appliedCoupon ? appliedCoupon.desconto : 0;
    
    try {
      const orderId = await createOrder(
        userId,
        selectedProduct,
        clientPhone,
        selectedProduct.tipo === 'FISICO' ? bairroSelection : "",
        selectedProduct.tipo === 'FISICO' ? moreAddress : "",
        discountPercentage,
        selectedProduct.tipo === 'FISICO' ? deliveryFeeValue : 0,
        detectedReferralUserId || undefined,
        selectedProduct.tipo === 'DIGITAL' ? 'ONLINE' : 'COD',
        selectedProduct.tipo === 'DIGITAL' ? onlineChannel : undefined
      );

      setOrderSuccessRef(orderId);
      setCheckoutModalOpen(false);
      setSelectedProduct(null);

      // Cleanup
      setClientPhone('');
      setBairroSelection('');
      setDeliveryFeeValue(0);
      setMoreAddress('');
      setUserCouponInput('');
      setAppliedCoupon(null);
      setCouponFeedback(null);
    } catch (err: any) {
      setApiError(err?.message || "Erro ao registrar o seu pedido.");
    } finally {
      setOrderProcessing(false);
    }
  };

  const handleReviewFormSubmit = async (e: React.FormEvent, productObj: Product) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;

    try {
      await submitReview(productObj.id, userId, reviewStars, reviewComment);
      setReviewSuccessMsg(true);
      setReviewComment('');
      setReviewStars(5);
      setTimeout(() => setReviewSuccessMsg(false), 3000);
    } catch (err: any) {
      alert("Erro ao registar a sua avaliação.");
    }
  };

  // Computations
  const featuredProducts = products.filter(p => p.featured);
  const normalProducts = products.filter(p => !p.featured);

  return (
    <div className="space-y-10" id="marketplace_client">
      
      {/* NAVIGATION TABS */}
      <div className="flex gap-4 border-b border-white/5 pb-1">
        <button
          onClick={() => setActiveTab('marketplace')}
          className={`flex items-center gap-2 px-4 py-2 font-display text-sm font-bold transition-all ${
            activeTab === 'marketplace' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Marketplace
        </button>
        <button
          onClick={() => setActiveTab('my_digital')}
          className={`flex items-center gap-2 px-4 py-2 font-display text-sm font-bold transition-all ${
            activeTab === 'my_digital' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-400 hover:text-white'
          }`}
        >
          <PlayCircle className="w-4 h-4" />
          Meus Infoprodutos
          {digitalAccessList.length > 0 && (
            <span className="bg-blue-500 text-white text-[10px] px-1.5 rounded-full">{digitalAccessList.length}</span>
          )}
        </button>
      </div>

      {activeTab === 'marketplace' ? (
        <>
          {/* REFERRAL LINK ALREADY LOADED DETECTOR NOTICE */}
      {detectedReferralUserId && (
        <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/10 p-3 rounded-xl border border-purple-500/20 text-xs text-purple-400 font-mono text-center flex items-center justify-center gap-2 select-none animate-pulse">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Indicação de compra ativada! Comissão do seu promotor será integrada de forma justa.</span>
        </div>
      )}

      {/* LUXURY EDITORIAL HERO BANNER - FEELS EXTREMELY HIGH END */}
      <div className="relative bg-[#0B0F19] p-8 md:p-12 rounded-3xl border border-white/10 overflow-hidden group">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-650/15 transition-all"></div>
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-xl space-y-4 relative z-10">
          <span className="p-1 px-3 bg-blue-500/10 border border-blue-500/20 text-blue-450 rounded-full font-mono text-[10px] uppercase tracking-wider font-semibold">Mercado AO Premium</span>
          <h1 className="font-display font-black text-3xl md:text-5xl leading-none text-white tracking-tight">O Comércio Premium com Pagamento CoD</h1>
          <p className="text-sm text-slate-300 leading-relaxed max-w-sm">
            Compre o melhor dos produtores angolanos. Pague 100% seguro apenas no ato de entrega física à porta de sua casa em Luanda por motoboy de confiança.
          </p>
          <div className="flex gap-4 pt-2 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1"><Check className="w-4 h-4 text-emerald-400" /> CoD Seguro</span>
            <span className="flex items-center gap-1"><Check className="w-4 h-4 text-emerald-400" /> Taxas Calculadas</span>
            <span className="flex items-center gap-1"><Check className="w-4 h-4 text-emerald-400" /> Escolta Express</span>
          </div>
        </div>
      </div>

      {/* FILTER PANEL AND SEARCH */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-1 flex-1 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-4 py-2 font-display text-sm font-semibold transition-all ${
              categoryFilter === 'all' ? 'text-white border-b-2 border-[#2563EB]' : 'text-slate-400 hover:text-white'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setCategoryFilter('FISICO')}
            className={`px-4 py-2 font-display text-sm font-semibold transition-all ${
              categoryFilter === 'FISICO' ? 'text-white border-b-2 border-[#2563EB]' : 'text-slate-400 hover:text-white'
            }`}
          >
            Físicos (Luanda)
          </button>
          <button
            onClick={() => setCategoryFilter('DIGITAL')}
            className={`px-4 py-2 font-display text-sm font-semibold transition-all ${
              categoryFilter === 'DIGITAL' ? 'text-white border-b-2 border-[#2563EB]' : 'text-slate-400 hover:text-white'
            }`}
          >
            Digitais (Infoprodutos)
          </button>
          <button
            onClick={() => setCategoryFilter('featured')}
            className={`px-4 py-2 font-display text-sm font-semibold transition-all flex items-center gap-1.5 ${
              categoryFilter === 'featured' ? 'text-white border-b-2 border-[#2563EB]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500/20" />
            <span>Destaques</span>
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Pesquisar produto pelo nome..."
            className="w-full bg-[#0B0F19]/60 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
          />
        </div>
      </div>

      {/* DISPLAY PRODUCTS GRID */}
      <div className="space-y-8">
        {/* ROW 1: FEATURED BENTO CORNER (paid 2,500 Kz) */}
        {categoryFilter !== 'all' || searchWord ? null : (
          featuredProducts.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-display font-black text-lg tracking-tight text-amber-450 uppercase flex items-center gap-1.5">
                <Flame className="w-5 h-5 text-amber-500 animate-bounce fill-amber-400/20" />
                <span>Vitrina Premium Selecionada</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredProducts.map(prod => (
                  <div 
                    key={prod.id} 
                    className="group bg-[#0D0B0A] rounded-3xl overflow-hidden border border-amber-500/30 p-5 space-y-4 shadow-xl hover:border-amber-400/60 transition-colors cursor-pointer flex flex-col justify-between"
                    onClick={() => { setSelectedProduct(prod); setCheckoutModalOpen(false); }}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-[9px] bg-amber-500 text-[#060813] font-bold p-0.5 px-2 rounded-full flex items-center gap-0.5 shadow-lg shadow-amber-500/10">
                          <Flame className="w-2.5 h-2.5 fill-[#060813]" /> PRODUTO POPULAR
                        </span>
                        <div className="flex text-amber-400 gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400 stroke-none" />
                          ))}
                        </div>
                      </div>

                      {prod.imageUrl && (
                        <div className="w-full h-36 rounded-2xl overflow-hidden bg-slate-900 border border-white/5 relative">
                          <img 
                            src={prod.imageUrl} 
                            alt={prod.nome} 
                            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" 
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}

                      <h4 className="font-display font-bold text-lg text-white group-hover:text-blue-450 transition-colors mt-2">{prod.nome}</h4>
                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 italic">"{prod.descrição}"</p>
                    </div>

                    <div className="border-t border-white/5 pt-3 flex justify-between items-center bg-slate-950/20 p-2.5 rounded-xl">
                      <span className="text-2xl font-display font-black text-amber-400">{prod.preço.toLocaleString()} Kz</span>
                      <ChevronRight className="w-5 h-5 text-amber-500 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* ROW 2: GENERAL MARKET products */}
        <div className="space-y-4">
          {categoryFilter === 'all' && (
            <h3 className="font-display font-semibold text-lg text-white">Prateleira Geral</h3>
          )}

          {products.length === 0 ? (
            <p className="text-slate-500 text-xs italic">Nenhum produto em comercialização no momento. Volte mais tarde!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products
                .filter(p => {
                  if (categoryFilter === 'featured') return p.featured;
                  if (categoryFilter === 'FISICO' || categoryFilter === 'DIGITAL') return p.tipo === categoryFilter;
                  return true;
                })
                .filter(p => p.nome.toLowerCase().includes(searchWord.toLowerCase()))
                .map(prod => (
                  <div 
                    key={prod.id} 
                    className="group bg-[#0B0F19]/80 rounded-3xl overflow-hidden border border-white/5 p-5 space-y-4 hover:border-white/10 transition-all hover:translate-y-[-2px] cursor-pointer flex flex-col justify-between"
                    onClick={() => { setSelectedProduct(prod); setCheckoutModalOpen(false); }}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          prod.tipo === 'DIGITAL' 
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {prod.tipo === 'DIGITAL' ? 'INFOPRODUTO' : 'PRODUTO FÍSICO'}
                        </span>
                        <span className="text-[10px] text-slate-500">{prod.categoria}</span>
                      </div>
                      {prod.imageUrl && (
                        <div className="w-full h-36 rounded-2xl overflow-hidden bg-slate-900 border border-white/5 relative">
                          <img 
                            src={prod.imageUrl} 
                            alt={prod.nome} 
                            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" 
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}

                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-display font-medium text-base text-slate-100 group-hover:text-blue-400 transition-colors">{prod.nome}</h4>
                        {prod.featured && <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full px-1.5 py-0.5 text-[8px] font-mono leading-none">DESTACADO</span>}
                      </div>
                      
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">"{prod.descrição}"</p>
                    </div>

                    <div className="border-t border-white/5 pt-3.5 flex justify-between items-center">
                      <span className="text-xl font-display font-black text-blue-450">{prod.preço.toLocaleString()} Kz</span>
                      <ChevronRight className="w-5 h-5 text-slate-500 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* TRACK ACTIVE ORDERS LIST AT BOTTOM OF SHOP */}
      {activeOrders.length > 0 && (
        <div className="space-y-4 border-t border-white/5 pt-10" id="user_orders_section">
          <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-500" />
            <span>Acompanhar Minhas Encomendas CoD ({activeOrders.length})</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeOrders.map(order => (
              <div key={order.id} className="bg-slate-900/40 p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs text-blue-400 font-bold">Ref: #{order.id.substring(6, 12)}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      order.status === 'delivered' ? 'bg-green-500/10 text-green-400' :
                      order.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                      order.status === 'shipped' ? 'bg-blue-500/10 text-blue-400 animate-pulse' :
                      'bg-slate-805 text-slate-400'
                    }`}>
                      {order.status === 'pending' ? 'Pedido Recebido' :
                       order.status === 'processing' ? 'A Embalar Item' :
                       order.status === 'shipped' ? '🛵 Nas Ruas de Luanda' :
                       order.status === 'delivered' ? 'Entregue Fisicamente' : 'Cancelado'}
                    </span>
                  </div>

                  <h4 className="font-display font-semibold text-sm text-slate-100">{order.produto_nome}</h4>
                  
                  {/* Local breakdown */}
                  <div className="text-xs text-slate-450 space-y-1">
                    <div>Morada: <strong className="text-white">{order.bairro}</strong> ({order.delivery_address})</div>
                    <div>Custo Total a pagar no ato: <strong className="text-emerald-400 font-bold">{order.total.toLocaleString()} Kz</strong></div>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-3 mt-3 flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-mono">Simulador de chat com vendedor preparado</span>
                  <button
                    onClick={() => onOpenChat(order.id)}
                    className="p-1 px-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold font-mono transition-colors flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                    <span>Falar no Chat</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DETAIL MODAL OVERLAY */}
      <AnimatePresence>
        {selectedProduct && !checkoutModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-[#0B0F19] border border-white/10 rounded-3xl max-w-xl w-full p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="text-xs font-mono text-purple-400">#COD_SERIADO_PAGADO</span>
                  <h3 className="font-display font-black text-2xl text-white mt-1">{selectedProduct.nome}</h3>
                </div>
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selectedProduct.imageUrl && (
                <div className="w-full h-48 rounded-2xl overflow-hidden bg-slate-900 border border-white/5 relative">
                  <img 
                    src={selectedProduct.imageUrl} 
                    alt={selectedProduct.nome} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-xs font-mono uppercase text-slate-400 tracking-wide">Descrição Exclusiva do Produtor</h4>
                <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap italic">
                  "{selectedProduct.descrição}"
                </div>
              </div>

              {/* Price Tag info */}
              <div className="bg-slate-900/60 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <div className="text-[10px] text-slate-500 font-mono">Valor do Investimento</div>
                  <div className="text-2xl font-display font-black text-[#2563EB]">{selectedProduct.preço.toLocaleString()} Kz</div>
                </div>
                <button
                  onClick={() => setCheckoutModalOpen(true)}
                  className={`w-full sm:w-auto px-6 py-3 font-bold text-xs font-mono tracking-wider rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95 text-white ${
                    selectedProduct.tipo === 'DIGITAL'
                      ? 'bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600'
                      : 'bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600'
                  }`}
                >
                  {selectedProduct.tipo === 'DIGITAL' ? 'PAGAR ONLINE & ACEDER JÁ' : 'COMPRAR JÁ (PAGUE NA ENTREGA)'}
                </button>
              </div>

              {/* REVIEWS & FEEDBACK CORNER */}
              <div className="border-t border-slate-800/80 pt-5 space-y-4">
                <h4 className="font-display font-bold text-sm text-white flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>Avaliações e Opiniões de Clientes</span>
                </h4>

                {/* Submitting custom client rating */}
                {reviewSuccessMsg ? (
                  <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-xl p-3">
                    Avaliação registada com sucesso! Agradecemos pelo seu contributo ao Mercado AO.
                  </div>
                ) : (
                  <form onSubmit={(e) => handleReviewFormSubmit(e, selectedProduct)} className="bg-slate-905/30 p-3.5 rounded-xl space-y-2">
                    <p className="text-[11px] text-slate-400 block font-semibold">Avaliar este produto:</p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((starIdx) => (
                        <Star 
                          key={starIdx} 
                          onClick={() => setReviewStars(starIdx)}
                          className={`w-4 h-4 cursor-pointer transition-all ${
                            starIdx <= reviewStars ? 'text-amber-400 fill-amber-400' : 'text-slate-650'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Deixe o seu comentário sincero..."
                        className="flex-1 bg-slate-950 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                      />
                      <button type="submit" className="px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold leading-none">
                        Enviar
                      </button>
                    </div>
                  </form>
                )}

                {/* Reviews List */}
                {(!selectedProduct.reviews || selectedProduct.reviews.length === 0) ? (
                  <p className="text-slate-500 text-xs italic">Ninguém avaliou este lote de importação/produção local ainda. Seja o primeiro!</p>
                ) : (
                  <div className="space-y-2 max-h-[140px] overflow-y-auto">
                    {selectedProduct.reviews.map((rev, revIdx) => (
                      <div key={revIdx} className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[10px] text-slate-300">Cliente Satisfeito</span>
                          <div className="flex text-amber-500">
                            {Array.from({ length: rev.stars }).map((_, isIdx) => (
                              <Star key={isIdx} className="w-2.5 h-2.5 fill-amber-500 stroke-none" />
                            ))}
                          </div>
                        </div>
                        <p className="text-slate-400 leading-normal italic font-light">"{rev.comment}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHECKOUT FLOW DIALOG */}
      <AnimatePresence>
        {checkoutModalOpen && selectedProduct && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-[#0B0F19] border border-white/10 rounded-3xl max-w-lg w-full p-6 md:p-8 space-y-4 max-h-[95vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-display font-black text-xl text-white">
                  {selectedProduct.tipo === 'DIGITAL' ? 'Finalizar Pagamento Digital' : 'Guia de Encomenda Segura (CoD)'}
                </h3>
                <button 
                  onClick={() => setCheckoutModalOpen(false)}
                  className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {apiError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-xl">
                  {apiError}
                </div>
              )}

              <div className="bg-slate-900/60 p-3.5 rounded-xl flex items-center gap-2 text-xs text-slate-400 select-none">
                <Info className="w-4 h-4 text-blue-400 shrink-0" />
                {selectedProduct.tipo === 'DIGITAL' ? (
                  <span>Os infoprodutos são liberados <strong>automaticamente</strong> após confirmação do pagamento online pela nossa equipe administrativa.</span>
                ) : (
                  <span>O pagamento é efetuado em Kwanza físico, por Multicaixa Express ou IBAN <strong>APENAS</strong> no momento da verificação física do produto à sua porta.</span>
                )}
              </div>

              <form onSubmit={handlePlaceOrderSubmit} className="space-y-4">
                {selectedProduct.tipo === 'FISICO' ? (
                  <>
                    {/* 1. Neighborhood selector */}
                    <div className="space-y-1">
                      <label className="text-xs font-mono uppercase text-slate-400 block">Selecione o Bairro em Luanda</label>
                      <select
                        required
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                        value={bairroSelection}
                        onChange={(e) => handleBairroChange(e.target.value)}
                      >
                        <option value="">Selecione um bairro...</option>
                        {LUANDA_BAIRROS.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Detailed delivery address */}
                    <div className="space-y-1">
                      <label className="text-xs font-mono uppercase text-slate-400 block">Ponto de Referência / Casa / Rua</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Condomínio Jardim de Rosas, Bloco G, Casa 34A"
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
                        value={moreAddress}
                        onChange={(e) => setMoreAddress(e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Digital specific: Payment Method */}
                    <div className="space-y-2">
                      <label className="text-xs font-mono uppercase text-slate-400 block">Método de Pagamento Online</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'Transferência', icon: Building, label: 'IBAN / Transf.' },
                          { id: 'Unitel Money', icon: Smartphone, label: 'Unitel Money' },
                          { id: 'MCX Express', icon: CreditCard, label: 'MCX Express' },
                          { id: 'Referência', icon: Tag, label: 'Ref. Bancária' }
                        ].map(method => (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setOnlineChannel(method.id as any)}
                            className={`flex items-center gap-2 p-3 rounded-xl border text-[10px] font-bold transition-all ${
                              onlineChannel === method.id 
                                ? 'bg-purple-500/10 border-purple-500 text-purple-400' 
                                : 'bg-slate-950/50 border-white/5 text-slate-400 hover:border-white/20'
                            }`}
                          >
                            <method.icon className="w-4 h-4" />
                            {method.label}
                          </button>
                        ))}
                      </div>
                      <div className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl text-[10px] text-purple-400 leading-relaxed italic">
                        * Após confirmar o pedido, siga as instruções de pagamento enviadas no chat para liberar o seu acesso permanente.
                      </div>
                    </div>
                  </>
                )}

                {/* 3. Telephone */}
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-slate-400 block">Telemóvel para Contacto / WhatsApp</label>
                  <input
                    type="tel"
                    required
                    placeholder="Ex: +244 923 000 000"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                  />
                </div>

                {/* 4. Discount Voucher code */}
                <div className="space-y-1 bg-slate-95 /30 p-3 rounded-xl">
                  <label className="text-[10px] text-slate-400 font-mono uppercase">Possui Cupão de Desconto?</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      placeholder="Introduza o código..."
                      className="flex-1 bg-slate-950 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white uppercase"
                      value={userCouponInput}
                      onChange={(e) => setUserCouponInput(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleApplyCouponCode}
                      className="px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs rounded-lg font-mono"
                    >
                      Aplicar
                    </button>
                  </div>
                  {couponFeedback && (
                    <div className={`text-[10px] font-mono mt-1 ${couponFeedback.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                      {couponFeedback.text}
                    </div>
                  )}
                </div>

                {/* Price calculations layout */}
                <div className="border-t border-slate-800/80 pt-3 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-450">Produto:</span>
                    <span className="text-slate-200">{selectedProduct.nome}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450">Preço de Tabela:</span>
                    <span className="text-slate-200">{selectedProduct.preço.toLocaleString()} Kz</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-green-400">
                      <span>Cupão (-{appliedCoupon.desconto}%):</span>
                      <span>-{(selectedProduct.preço * appliedCoupon.desconto / 100).toLocaleString()} Kz</span>
                    </div>
                  )}
                  {selectedProduct.tipo === 'FISICO' && (
                    <div className="flex justify-between">
                      <span className="text-slate-450">Taxa de Frete Luanda:</span>
                      <span className="text-slate-200">{deliveryFeeValue.toLocaleString()} Kz</span>
                    </div>
                  )}
                  
                  {/* Total overall calculation */}
                  {(() => {
                    const priceValue = selectedProduct.preço;
                    const discountVal = appliedCoupon ? (priceValue * appliedCoupon.desconto / 100) : 0;
                    const computedTotal = (priceValue - discountVal) + (selectedProduct.tipo === 'FISICO' ? deliveryFeeValue : 0);

                    return (
                      <div className="flex justify-between border-t border-slate-800 pt-1.5 text-sm font-bold">
                        <span className="text-slate-100">Total {selectedProduct.tipo === 'DIGITAL' ? 'do Infoproduto' : 'a Pagar na Entrega'}:</span>
                        <span className={`text-base font-display font-black ${selectedProduct.tipo === 'DIGITAL' ? 'text-purple-400' : 'text-emerald-440'}`}>
                          {computedTotal.toLocaleString()} Kz
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <button
                  type="submit"
                  disabled={orderProcessing}
                  className={`w-full py-3 text-white font-mono font-bold text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5 ${
                    selectedProduct.status === 'DIGITAL' 
                      ? 'bg-gradient-to-r from-purple-700 to-purple-600 hover:shadow-purple-500/25' 
                      : 'bg-gradient-to-r from-blue-700 to-blue-600 hover:shadow-blue-500/25'
                  }`}
                >
                  {orderProcessing ? (
                    <span className="w-5 h-5 border-2 border-white/35 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <>
                      {selectedProduct.tipo === 'DIGITAL' ? <CreditCard className="w-4 h-4" /> : <ShoppingBagIcon className="w-4 h-4 text-sky-400" />}
                      <span>{selectedProduct.tipo === 'DIGITAL' ? 'Confirmar e Pagar Online' : 'Confirmar Encomenda Sem Riscos'}</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  ) : (
    <MyDigitalProducts />
  )}

  {/* COMPLETED SUCCESS SCREEN ALERT */}
      {orderSuccessRef && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0B0F19]/90 border border-white/10 rounded-3xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-400">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="font-display font-bold text-lg text-white">Encomenda Efetuada com Sucesso!</h4>
            <p className="text-xs text-slate-350 leading-relaxed">
              Obrigado por comprar no Mercado AO. O seu pedido foi encaminhado ao Produtor local para verificação física. Ative a morada e telemóvel para receber rápidas chamadas.
            </p>
            <div className="bg-slate-900/60 p-2 text-xs font-mono text-slate-400 rounded-lg">
              Pedido ID: #{orderSuccessRef.substring(6, 12)}
            </div>
            <button
              onClick={() => setOrderSuccessRef(null)}
              className="w-full py-2 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 text-white rounded-xl text-xs font-bold"
            >
              Excluir Notificação / Acompanhar Vendas
            </button>
          </div>
        </div>
      )}

      {/* WHATSAPP FLOATING BUTTON */}
      <a
        href="https://wa.me/244950461466"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 left-6 z-[100] bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:scale-110 transition-all active:scale-95 flex items-center justify-center group"
        aria-label="Contactar no WhatsApp"
      >
        <MessageCircle className="w-6 h-6 fill-white" />
        <div className="absolute left-14 bg-slate-900 border border-white/10 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-mono">
          Suporte Mercado AO
        </div>
      </a>

    </div>
  );

  function MyDigitalProducts() {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
        <div className="bg-[#0B0F19] p-8 rounded-3xl border border-white/10 relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <h2 className="text-2xl font-display font-black text-white italic">Biblioteca Digital de Elite</h2>
            <p className="text-sm text-slate-400 max-w-md">Gerencie os seus cursos, ebooks e softwares adquiridos. O seu conhecimento é o seu maior ativo em Angola.</p>
          </div>
          <PlayCircle className="absolute -right-10 -bottom-10 w-64 h-64 text-blue-500/5 rotate-12" />
        </div>

        {digitalAccessList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-900/30 rounded-3xl border border-dashed border-white/10 space-y-4">
            <ShoppingBag className="w-12 h-12 text-slate-700" />
            <div className="text-center">
              <h4 className="text-slate-400 font-bold">Nenhum infoproduto adquirido</h4>
              <p className="text-xs text-slate-500">Explore o marketplace para encontrar conteúdos exclusivos.</p>
            </div>
            <button 
              onClick={() => setActiveTab('marketplace')}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
            >
              Ir para o Marketplace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {digitalAccessList.map(access => (
              <div key={access.id} className="bg-slate-900/60 border border-white/5 rounded-3xl p-5 space-y-4 hover:border-blue-500/30 transition-all group">
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-slate-800 rounded-2xl shrink-0 overflow-hidden border border-white/5">
                    {access.product_imageUrl ? (
                      <img src={access.product_imageUrl} className="w-full h-full object-cover" />
                    ) : (
                      <PlayCircle className="w-full h-full p-6 text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="text-sm font-bold text-white leading-tight">{access.product_nome}</h4>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Adquirido em {new Date(access.accessGrantedAt).toLocaleDateString()}
                    </div>
                    <div className="pt-2">
                       <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full" style={{ width: `${access.progress}%` }}></div>
                       </div>
                       <span className="text-[9px] text-blue-400 font-bold mt-1 block">{access.progress}% concluído</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button 
                    onClick={() => {
                      setSelectedAccess(access);
                      // In a real app, this would open the course player or file view
                    }}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-[10px] font-bold"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    ACEDER CONTEÚDO
                  </button>
                  <button className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-white/10 text-slate-300 py-2.5 rounded-xl text-[10px] font-bold">
                    <Download className="w-3.5 h-3.5" />
                    DOWNLOAD
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODAL PARA VISUALIZAÇÃO DE CONTEÚDO DIGITAL (MOCK) */}
        <AnimatePresence>
          {selectedAccess && (
            <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[60] flex items-center justify-center p-4">
              <div className="bg-[#0B0F19] border border-white/10 rounded-3xl max-w-4xl w-full h-[85vh] flex flex-col">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50 rounded-t-3xl">
                  <div className="flex items-center gap-3">
                    <PlayCircle className="w-6 h-6 text-blue-500" />
                    <div>
                      <h3 className="text-white font-black text-lg">{selectedAccess.product_nome}</h3>
                      <p className="text-[10px] text-slate-400">Ambiente de Aprendizagem Seguro</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedAccess(null)} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center space-y-6">
                   <div className="w-full max-w-2xl aspect-video bg-black rounded-3xl border border-white/10 flex flex-col items-center justify-center gap-4 relative overflow-hidden">
                      <Sparkles className="absolute top-10 right-10 w-32 h-32 text-blue-500/5 animate-pulse" />
                      <PlayCircle className="w-16 h-16 text-blue-500 animate-pulse" />
                      <div className="text-center z-10">
                        <p className="text-white font-bold">Vídeo Aula em Preparação...</p>
                        <p className="text-xs text-slate-500">O streaming seguro está a ser otimizado para a sua ligação em Angola.</p>
                      </div>
                   </div>

                   <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/5 space-y-3">
                        <h5 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ">Ficheiros para Download</h5>
                        <div className="space-y-2">
                           <div className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-white/5">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-purple-400" />
                                <span className="text-[10px] text-slate-300">Guia de Implementação .pdf</span>
                              </div>
                              <Download className="w-3.5 h-3.5 text-slate-500 hover:text-white cursor-pointer" />
                           </div>
                           <div className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-white/5">
                              <div className="flex items-center gap-2">
                                <Tag className="w-4 h-4 text-blue-400" />
                                <span className="text-[10px] text-slate-300">Templates Exclusivos .zip</span>
                              </div>
                              <Download className="w-3.5 h-3.5 text-slate-500 hover:text-white cursor-pointer" />
                           </div>
                        </div>
                     </div>

                     <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/5 space-y-3">
                        <h5 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ">Links e Acessos Externos</h5>
                        <div className="space-y-2">
                           <div className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-white/5">
                              <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-emerald-400" />
                                <span className="text-[10px] text-slate-300">Grupo VIP no Telegram</span>
                              </div>
                              <LinkIcon className="w-3.5 h-3.5 text-slate-500 hover:text-white cursor-pointer" />
                           </div>
                        </div>
                     </div>
                   </div>

                   <div className="pt-10 flex gap-4">
                      <button 
                        onClick={async () => {
                          const newProgress = Math.min(selectedAccess.progress + 10, 100);
                          await updateDigitalProgress(selectedAccess.id, newProgress);
                          setSelectedAccess({...selectedAccess, progress: newProgress});
                        }}
                        className="px-8 py-3 bg-white text-black font-black text-xs rounded-2xl hover:bg-slate-200 transition-colors"
                      >
                        MARCAR COMO CONCLUÍDO (+10%)
                      </button>
                   </div>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }
}
