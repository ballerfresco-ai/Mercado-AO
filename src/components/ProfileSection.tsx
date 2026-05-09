import React, { useState } from 'react';
import { UserProfile } from '../types';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { User, Mail, Shield, Save, CheckCircle, Smartphone, Lock } from 'lucide-react';
import { motion } from 'motion/react';

interface ProfileSectionProps {
  userProfile: UserProfile;
  onUpdate: (profile: UserProfile) => void;
}

export function ProfileSection({ userProfile, onUpdate }: ProfileSectionProps) {
  const [nome, setNome] = useState(userProfile.nome);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await updateDoc(doc(db, 'users', userProfile.id), {
        nome: nome.trim()
      });
      
      onUpdate({
        ...userProfile,
        nome: nome.trim()
      });
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError("Erro ao atualizar perfil. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fadeIn">
      <div className="text-center space-y-2">
        <div className="w-20 h-20 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/20">
          <User className="w-10 h-10 text-blue-500" />
        </div>
        <h2 className="text-2xl font-display font-black text-white">Configurações de Perfil</h2>
        <p className="text-sm text-slate-400">Gerencie suas informações pessoais e segurança da conta.</p>
      </div>

      <div className="bg-[#0B0F19] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-8 space-y-6">
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
                Nome Completo
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Seu nome"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" />
                Email (Vinculado ao Google)
              </label>
              <input
                type="email"
                disabled
                value={userProfile.email}
                className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed"
              />
              <p className="text-[10px] text-slate-500 mt-1 italic">O email não pode ser alterado pois está vinculado à sua conta Google.</p>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSaving || nome === userProfile.nome}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                {isSaving ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </button>
            </div>

            {success && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl flex items-center gap-2 text-sm"
              >
                <CheckCircle className="w-4 h-4" />
                Perfil atualizado com sucesso!
              </motion.div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm italic">
                {error}
              </div>
            )}
          </form>

          <div className="border-t border-white/5 pt-8 space-y-6">
            <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-500" />
              Segurança e Palavra-passe
            </h3>
            
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-6 space-y-3">
              <p className="text-sm text-slate-300 leading-relaxed font-sans">
                Como você utiliza o <strong>Acesso pelo Google</strong>, a sua palavra-passe e segurança da conta são gerenciadas diretamente pela Google.
              </p>
              <p className="text-xs text-slate-400 font-sans italic">
                Para alterar sua senha ou ativar a verificação em duas etapas, acesse as configurações de segurança da sua Conta Google.
              </p>
              <a 
                href="https://myaccount.google.com/security" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs font-bold text-amber-500 hover:text-amber-400 underline decoration-dotted underline-offset-4"
              >
                Ir para Segurança Google <Smartphone className="w-3 h-3" />
              </a>
            </div>

            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  Nível de Acesso
                </h4>
                <p className="text-[10px] uppercase font-mono text-slate-400 tracking-wider mt-1">Sua função no ecossistema</p>
              </div>
              <span className="bg-blue-600/10 text-blue-400 px-3 py-1 rounded-full text-xs font-bold border border-blue-500/20">
                {userProfile.tipo}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
