import React, { useState, useEffect } from 'react';
import { 
  auth, 
  createUserProfile, 
  checkIfAdminExists, 
  getUserProfile, 
  loginWithGoogle 
} from '../firebase';
import { UserRole } from '../types';
import { LogIn, ShieldAlert, ShoppingBag, Landmark, Sparkles, UserCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthScreenProps {
  onAuthSuccess: (userId: string, role: UserRole) => void;
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [nome, setNome] = useState('');
  const [role, setRole] = useState<UserRole>('Cliente');
  const [adminExists, setAdminExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const exists = await checkIfAdminExists();
        setAdminExists(exists);
        if (exists && role === 'ADM') {
          setRole('Cliente');
        }
      } catch (err) {
        console.error("Erro ao verificar Administrador:", err);
      }
    }
    checkAdmin();
  }, [isRegistering, role]);

  const handleGoogleAccess = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await loginWithGoogle();
      const profile = await getUserProfile(user.uid);
      
      if (profile) {
        onAuthSuccess(user.uid, profile.tipo);
      } else {
        // First-time guest: transition to metadata creation view
        setNome(user.displayName || '');
        setIsRegistering(true);
      }
    } catch (err: any) {
      setError(err?.message || "Ocorreu um erro no acesso com Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setError("Por favor indique o seu nome completo.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("Erro de autenticação: Utilizador não logado no Google.");
      }

      // Check one last time for admin
      if (role === 'ADM') {
        const exists = await checkIfAdminExists();
        if (exists) {
          throw new Error("Já existe uma conta de Administrador registada no Mercado AO.");
        }
      }

      await createUserProfile(currentUser.uid, nome, currentUser.email || '', role);
      onAuthSuccess(currentUser.uid, role);
    } catch (err: any) {
      setError(err?.message || "Erro ao concluir o registo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060813] text-white flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Dynamic Background decor */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-sky-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="font-display font-extrabold text-2xl tracking-tighter text-white">M</span>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-[#060813] glowing-dot"></div>
          </div>
          <div>
            <h1 className="font-display font-black text-xl tracking-tight leading-none text-white">
              Mercado <span className="text-blue-500 font-extrabold">AO</span>
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mt-1">Angola Premium Marketplace</p>
          </div>
        </div>
        <div className="p-1 px-3 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 font-mono">
          Cash on Delivery 📦
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 z-10 w-full max-w-lg mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full glass-panel rounded-3xl p-8 border border-white/10"
          id="auth_panel"
        >
          {!isRegistering ? (
            <div className="text-center">
              <span className="p-3 bg-blue-600/10 border border-blue-500/20 rounded-2xl inline-flex text-blue-400 mb-6">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </span>
              <h2 className="text-3xl font-display font-bold tracking-tight mb-2">
                Conecte-se ao <span className="text-blue-500">Mercado AO</span>
              </h2>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                A primeira plataforma premium que une Produtores locais, Afiliados digitais e Compradores em Angola com o sistema seguro de pagamento na entrega físico.
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3 mb-6 text-left flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleAccess}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white font-semibold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-40"
                id="btn_google_auth"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Aceder Seguro com Google</span>
                  </>
                )}
              </button>

              <div className="mt-8 pt-6 border-t border-slate-800 flex justify-around text-center text-xs text-slate-400 font-mono">
                <div>
                  <div className="text-blue-500 font-bold text-base">10%</div>
                  <div>Taxa Plát.</div>
                </div>
                <div className="border-r border-slate-800"></div>
                <div>
                  <div className="text-blue-500 font-bold text-base">CoD</div>
                  <div>Pago na Entrega</div>
                </div>
                <div className="border-r border-slate-800"></div>
                <div>
                  <div className="text-blue-500 font-bold text-base">200 Kz</div>
                  <div>Taxa de Saque</div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-display font-bold tracking-tight mb-2 text-center">
                Criar a sua Conta
              </h2>
              <p className="text-slate-400 text-sm mb-6 text-center">
                Olá {nome ? nome.split(' ')[0] : 'Parceiro'}, por favor escolha o seu perfil de atividade no Mercado AO.
              </p>

              <form onSubmit={handleCompleteRegistration} className="space-y-6">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-wide text-slate-400">Seu Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Manuel dos Santos"
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-mono uppercase tracking-wide text-slate-400 block">Selecione o seu Tipo de Conta</label>
                  
                  <div className="grid grid-cols-1 gap-2.5">
                    {/* CLIENT - Default role */}
                    <label 
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                        role === 'Cliente' 
                          ? 'bg-blue-600/10 border-blue-500 text-white' 
                          : 'bg-slate-900/30 border-white/5 text-slate-400 hover:border-white/10'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="userRole" 
                        value="Cliente" 
                        checked={role === 'Cliente'} 
                        onChange={() => setRole('Cliente')}
                        className="hidden"
                      />
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-sm text-white">Sou Comprador (Cliente)</div>
                        <div className="text-xs text-slate-400">Quero comprar produtos em Kwanza e pagar seguro na minha entrega.</div>
                      </div>
                    </label>

                    {/* PRODUCER */}
                    <label 
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                        role === 'Produtor' 
                          ? 'bg-blue-600/10 border-blue-500 text-white' 
                          : 'bg-slate-900/30 border-white/5 text-slate-400 hover:border-white/10'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="userRole" 
                        value="Produtor" 
                        checked={role === 'Produtor'} 
                        onChange={() => setRole('Produtor')}
                        className="hidden"
                      />
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-sm text-white">Sou Produtor (Vendedor)</div>
                        <div className="text-xs text-slate-400">Quero listar os meus produtos e gerir minhas comissões e vendas.</div>
                      </div>
                    </label>

                    {/* AFFILIATE */}
                    <label 
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                        role === 'Afiliado' 
                          ? 'bg-blue-600/10 border-blue-500 text-white' 
                          : 'bg-slate-900/30 border-white/5 text-slate-400 hover:border-white/10'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="userRole" 
                        value="Afiliado" 
                        checked={role === 'Afiliado'} 
                        onChange={() => setRole('Afiliado')}
                        className="hidden"
                      />
                      <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-sm text-white">Sou Afiliado Digital</div>
                        <div className="text-xs text-slate-400">Quero indicar e promover produtos e ganhar comissão por cada venda.</div>
                      </div>
                    </label>

                    {/* ADMIN - Only if none exists */}
                    {!adminExists && (
                      <label 
                        className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                          role === 'ADM' 
                            ? 'bg-red-600/10 border-red-500 text-white animate-pulse' 
                            : 'bg-slate-900/30 border-white/5 text-slate-400 hover:border-white/10'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="userRole" 
                          value="ADM" 
                          checked={role === 'ADM'} 
                          onChange={() => setRole('ADM')}
                          className="hidden"
                        />
                        <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
                          <UserCheck className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-sm text-red-400 flex items-center gap-1.5">
                            Administrador Principal <span className="bg-red-500 text-white rounded px-1 py-0.5 text-[8px]">ÚNICO</span>
                          </div>
                          <div className="text-xs text-slate-400">Gerir pedidos, aprovar saldos, bairros de entrega e ranking no Mercado AO.</div>
                        </div>
                      </label>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 px-6 rounded-2xl transition-all shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <span>Registar Perfil no Mercado AO</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 text-center text-xs text-slate-500 font-mono z-10">
        © 2026 Mercado AO. Desenvolvido para Angola. Todos os direitos reservados.
      </footer>
    </div>
  );
}
