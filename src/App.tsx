import { useState, useEffect } from 'react';
import { 
  auth, 
  getUserProfile, 
  logoutUser, 
  db 
} from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { UserProfile, UserRole } from './types';
import { AuthScreen } from './components/AuthScreen';
import { DashboardAdmin } from './components/DashboardAdmin';
import { DashboardProducer } from './components/DashboardProducer';
import { DashboardAffiliate } from './components/DashboardAffiliate';
import { MarketplaceClient } from './components/MarketplaceClient';
import { ChatsSection } from './components/ChatsSection';
import { 
  LogOut, 
  User, 
  MapPin, 
  Sparkles, 
  MessageSquare, 
  TrendingUp, 
  ShieldAlert, 
  Check, 
  UserPlus, 
  SlidersHorizontal,
  Home,
  Users,
  Trophy,
  DollarSign,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Interactive Tester Swapper states
  const [isTesterSwitcherOpen, setIsTesterSwitcherOpen] = useState(false);
  
  // Custom role override for the user interface
  const [overrideRole, setOverrideRole] = useState<UserRole | null>(null);

  // Selected Order Chat details
  const [activeChatOrderId, setActiveChatOrderId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setCurrentUser(u);
      if (u) {
        // Fetch his official profile
        const profile = await getUserProfile(u.uid);
        setUserProfile(profile || null);
      } else {
        setUserProfile(null);
        setOverrideRole(null);
      }
      setAuthLoading(false);
    });

    return () => unsub();
  }, []);

  const handleAuthSuccess = async (uid: string, role: UserRole) => {
    setAuthLoading(true);
    const profile = await getUserProfile(uid);
    setUserProfile(profile || null);
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    setActiveChatOrderId(null);
    setOverrideRole(null);
    await logoutUser();
  };

  // Switch role simulator (useful for testing on-the-fly)
  const handleForceOverrideRole = (target: UserRole) => {
    setOverrideRole(target);
    setActiveChatOrderId(null); // Clear active chat list on swap
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#060813] text-white flex flex-col items-center justify-center font-sans">
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-sky-400 flex items-center justify-center mb-4 shadow-xl">
          <span className="font-display font-extrabold text-3xl">M</span>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-[#060813] glowing-dot" />
        </div>
        <p className="text-sm text-slate-400 font-mono animate-pulse uppercase tracking-wider">Iniciando a rede do Mercado AO...</p>
      </div>
    );
  }

  if (!currentUser || !userProfile) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // Determine active view role
  const activeRole: UserRole = overrideRole || userProfile.tipo;

  return (
    <div className="min-h-screen bg-[#060813] text-white flex flex-col font-sans relative">
      
      {/* Dynamic Ambient Blur */}
      <div className="absolute top-10 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* CORE WEB NAVIGATION BAR */}
      <header className="sticky top-0 bg-[#060813]/90 backdrop-blur-md border-b border-white/5 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex justify-between items-center">
          
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-700 to-sky-400 flex items-center justify-center font-black shadow-lg shadow-blue-500/10">
              <span className="font-display text-xl text-white">M</span>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-[#060813] glowing-dot" />
            </div>
            <div>
              <h1 className="font-display font-black text-lg tracking-tight leading-none text-white">
                Mercado <span className="text-blue-500 font-extrabold">AO</span>
              </h1>
              <p className="text-[9px] font-mono uppercase tracking-widest text-[#2563EB] mt-0.5 font-bold">Premium Angola Service</p>
            </div>
          </div>

          {/* Nav Right Profile section */}
          <div className="flex items-center gap-3">
            
            {/* User details capsule */}
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-white">{userProfile.nome}</span>
              <span className="text-[10px] font-mono text-purple-400">
                {userProfile.tipo} {overrideRole ? `(Simulado como ${overrideRole})` : ''}
              </span>
            </div>

            {/* Quick action: User Avatar */}
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-350 select-none">
              <User className="w-4 h-4" />
            </div>

            {/* Log out */}
            <button
              onClick={handleLogout}
              className="p-2 bg-red-650/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors border border-red-500/15"
              id="top_logout_btn"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* CORE WEB MAIN SECTION BODY */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8 relative z-10" id="app_view_area">
        <AnimatePresence mode="wait">
          {activeRole === 'ADM' && (
            <motion.div key="adm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <DashboardAdmin userId={currentUser.uid} />
            </motion.div>
          )}

          {activeRole === 'Produtor' && (
            <motion.div key="produtor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <DashboardProducer 
                userId={currentUser.uid} 
                userProfile={userProfile}
                onOpenChat={(orderId) => setActiveChatOrderId(orderId)}
              />
            </motion.div>
          )}

          {activeRole === 'Afiliado' && (
            <motion.div key="afiliado" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <DashboardAffiliate userId={currentUser.uid} userProfile={userProfile} />
            </motion.div>
          )}

          {activeRole === 'Cliente' && (
            <motion.div key="cliente" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <MarketplaceClient 
                userId={currentUser.uid}
                onOpenChat={(orderId) => setActiveChatOrderId(orderId)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer className="py-8 px-4 border-t border-white/5 text-center text-xs text-slate-500 font-mono mt-12 bg-slate-950/25">
        © 2026 Mercado AO. Angola Digital Marketplace & Cash on Delivery Network.
      </footer>

      {/* CHATS DRAWER POPUP SLIDER */}
      <AnimatePresence>
        {activeChatOrderId && (
          <ChatsSection 
            orderId={activeChatOrderId}
            senderType={activeRole === 'Produtor' ? 'Produtor' : 'Cliente'}
            onClose={() => setActiveChatOrderId(null)}
          />
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* ⚠️ INTERACTIVE ROLE SWITCHER PANEL FOR TESTERS/EVALUATORS */}
      {/* ========================================================= */}
      <div className="fixed bottom-6 left-6 z-55">
        {!isTesterSwitcherOpen ? (
          <button
            onClick={() => setIsTesterSwitcherOpen(true)}
            className="flex items-center gap-2 bg-[#2563EB] hover:bg-blue-600 border border-blue-500 text-white font-semibold font-mono text-xs px-4 py-3 rounded-full shadow-2xl transition-all"
            id="open_tester_bar_btn"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Painel do Avaliador (Mudar Contas)</span>
          </button>
        ) : (
          <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-5 shadow-2xl w-80 space-y-3 relative">
            <button
              onClick={() => setIsTesterSwitcherOpen(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            
            <h5 className="font-display font-bold text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>Simular Diferentes Perfis</span>
            </h5>
            <p className="text-[10px] text-slate-400 leading-normal">
              Como testador, troque de perfil instantaneamente para experimentar o ecossistema completo do Mercado AO em Angola:
            </p>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono font-bold">
              <button
                onClick={() => handleForceOverrideRole('Cliente')}
                className={`py-2 px-2.5 rounded-lg border text-left flex flex-col justify-between ${
                  activeRole === 'Cliente' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-900 border-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                <span>🛒 Comprador</span>
                <span className="text-[8px] font-normal font-sans text-slate-450 mt-0.5">Fazer pedidos & avaliar</span>
              </button>

              <button
                onClick={() => handleForceOverrideRole('Produtor')}
                className={`py-2 px-2.5 rounded-lg border text-left flex flex-col justify-between ${
                  activeRole === 'Produtor' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-900 border-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                <span>🏢 Vendedor</span>
                <span className="text-[8px] font-normal font-sans text-slate-450 mt-0.5">Listar bens, IA & enviar</span>
              </button>

              <button
                onClick={() => handleForceOverrideRole('Afiliado')}
                className={`py-2 px-2.5 rounded-lg border text-left flex flex-col justify-between ${
                  activeRole === 'Afiliado' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-900 border-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                <span>✨ Afiliado</span>
                <span className="text-[8px] font-normal font-sans text-slate-450 mt-0.5">Links de comissão & copies</span>
              </button>

              <button
                onClick={() => handleForceOverrideRole('ADM')}
                className={`py-2 px-2.5 rounded-lg border text-left flex flex-col justify-between ${
                  activeRole === 'ADM' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-900 border-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                <span>👑 Admin ADM</span>
                <span className="text-[8px] font-normal font-sans text-slate-450 mt-0.5">Preços, saques & gráficos</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 text-center">
              Sua Conta Real de Registo: <span className="text-slate-350">{userProfile.tipo}</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
