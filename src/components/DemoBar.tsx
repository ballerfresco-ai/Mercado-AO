import React, { useState } from 'react';
import { db, createUserProfile } from '../firebase';
import { 
  collection, 
  setDoc, 
  doc, 
  getDocs, 
  writeBatch 
} from 'firebase/firestore';
import { Shield, Sparkles, RefreshCw, Users, Database } from 'lucide-react';
import { UserRole, UserProfile } from '../types';

interface DemoBarProps {
  currentUser: UserProfile | null;
  onSwitchUser: (role: UserRole) => void;
  onRefreshData: () => void;
}

export default function DemoBar({ currentUser, onSwitchUser, onRefreshData }: DemoBarProps) {
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  // Quick Seeder function
  const runSeeder = async () => {
    setSeeding(true);
    setSeedSuccess(false);
    try {
      const batch = writeBatch(db);

      // 1. Create Default Angolan Delivery Fees (Taxas de Entrega)
      const neighborhoodFees = [
        { id: 'fee_maianga', bairro: 'Luanda - Maianga', valor: 1000 },
        { id: 'fee_talatona', bairro: 'Luanda - Talatona', valor: 1500 },
        { id: 'fee_kilamba', bairro: 'Luanda - Kilamba', valor: 2000 },
        { id: 'fee_viana', bairro: 'Luanda - Viana', valor: 1800 },
        { id: 'fee_cazenga', bairro: 'Luanda - Cazenga', valor: 1200 },
        { id: 'fee_cacuaco', bairro: 'Luanda - Cacuaco', valor: 1700 },
        { id: 'fee_benfica', bairro: 'Luanda - Benfica', valor: 1600 },
        { id: 'fee_samba', bairro: 'Luanda - Samba', valor: 1100 }
      ];

      neighborhoodFees.forEach((fee) => {
        batch.set(doc(db, 'deliveryFees', fee.id), fee);
      });

      // 2. Create Default Discount Coupons
      const coupons = [
        { id: 'coupon_KIKOLA10', código: 'KIKOLA10', desconto: 10, validade: '2027-12-31' },
        { id: 'coupon_ANGOLA20', código: 'ANGOLA20', desconto: 20, validade: '2027-12-31' },
        { id: 'coupon_MERCADOAO5', código: 'MERCADOAO5', desconto: 5, validade: '2027-12-31' }
      ];

      coupons.forEach((coupon) => {
        batch.set(doc(db, 'coupons', coupon.id), coupon);
      });

      // 3. Create Default Simulation Profiles if not setup
      const simulatedUsers = [
        { uid: 'sim_adm_101', nome: 'Administrador Mercado AO', email: 'admin@mercado.ao', tipo: 'ADM' as UserRole },
        { uid: 'sim_prod_102', nome: 'Manuel Carlos (Produtor)', email: 'produtor@mercado.ao', tipo: 'Produtor' as UserRole },
        { uid: 'sim_afil_103', nome: 'Aline Silva (Afiliada)', email: 'afiliado@mercado.ao', tipo: 'Afiliado' as UserRole },
        { uid: 'sim_client_104', nome: 'Yuri Neto (Cliente)', email: 'cliente@mercado.ao', tipo: 'Cliente' as UserRole }
      ];

      simulatedUsers.forEach((user) => {
        const userRef = doc(db, 'users', user.uid);
        batch.set(userRef, {
          id: user.uid,
          nome: user.nome,
          email: user.email,
          tipo: user.tipo,
          createdAt: new Date().toISOString()
        });

        const walletRef = doc(db, 'wallets', user.uid);
        batch.set(walletRef, {
          id: user.uid,
          user_id: user.uid,
          saldo: user.tipo === 'Cliente' ? 250000 : user.tipo === 'ADM' ? 120000 : 45000 // Test balance
        });
      });

      // Add Platform general wallet
      batch.set(doc(db, 'wallets', 'PLATAFORMA'), {
        id: 'PLATAFORMA',
        user_id: 'PLATAFORMA',
        saldo: 150000
      });

      // 4. Create Approved Initial Products (Produtor Manuel)
      const products = [
        {
          id: 'prod_spark20',
          nome: 'Telemóvel Tecno Spark 20 Pro',
          descrição: 'Telemóvel topo de gama acessível da Tecno. 256GB de armazenamento, 8GB de RAM, bateria de 5000mAh com carregamento rápido de 33W. Câmara principal super nítida de 108 Megapixels ideal para as suas fotos do dia a dia.',
          preço: 85000,
          comissão_afiliado: 8, // 8% commission to affiliate
          produtor_id: 'sim_prod_102',
          status: 'approved',
          featured: true,
          imageUrl: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&q=80&w=600',
          createdAt: new Date().toISOString()
        },
        {
          id: 'prod_jblgo3',
          nome: 'Coluna Bluetooth JBL Go 3 Premium',
          descrição: 'Som original de alta qualidade JBL Pro em formato portátil. Resistível à água e poeira (IP67). Design moderno e chamativo, perfeito para curtir uma boa fuba ou passeio à praia em Luanda.',
          preço: 29000,
          comissão_afiliado: 10, // 10% commission
          produtor_id: 'sim_prod_102',
          status: 'approved',
          featured: true,
          imageUrl: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&q=80&w=600',
          createdAt: new Date().toISOString()
        },
        {
          id: 'prod_balabanana',
          nome: 'Bala de Banana de Benguela (Caixa 24 uni)',
          descrição: 'Sabor tradicional e genuíno das famosas doces balas de banana de Benguela. Perfeito para lanches, revenda ou consumo pessoal.',
          preço: 6500,
          comissão_afiliado: 15, // 15% commission
          produtor_id: 'sim_prod_102',
          status: 'approved',
          featured: false,
          imageUrl: 'https://images.unsplash.com/photo-1571506191007-a7f6dbb64ac1?auto=format&fit=crop&q=80&w=600',
          createdAt: new Date().toISOString()
        },
        {
          id: 'prod_sapatilha_vibe',
          nome: 'Sapatilhas Desportivas Unitel Vibe',
          descrição: 'Sapatilhas leves ideais para corrida e treino. Solado de alta absorção de impacto, tecido respirável e design elegante nos detalhes da cor azul.',
          preço: 32000,
          comissão_afiliado: 12,
          produtor_id: 'sim_prod_102',
          status: 'approved',
          featured: false,
          imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600',
          createdAt: new Date().toISOString()
        }
      ];

      products.forEach((prod) => {
        batch.set(doc(db, 'products', prod.id), prod);

        // Add some pre-loaded product reviews
        const reviewId = `rev_pre_${prod.id}`;
        batch.set(doc(db, 'reviews', reviewId), {
          id: reviewId,
          cliente_id: 'sim_client_104',
          cliente_nome: 'Yuri Neto',
          produto_id: prod.id,
          avaliação: 5,
          comentário: 'Produto de excelente qualidade! Recomendo bastante em Luanda, entrega muito rápida e paguei direitinho no Multicaixa Express no ato.',
          createdAt: new Date().toISOString()
        });
      });

      await batch.commit();
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 5000);
      onRefreshData();
    } catch (e) {
      console.error("Error during seeding database:", e);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div id="simulation-bar" className="bg-slate-900 border-b border-blue-500/30 text-white py-2 px-4 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="bg-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1">
            <Sparkles size={10} />
            Módulo de Demonstração
          </span>
          <p className="text-slate-300">
            {currentUser ? (
              <span>
                Sessão Conectada: <strong className="text-blue-400">{currentUser.nome}</strong> | Papel:{' '}
                <span className="text-emerald-400 font-semibold uppercase">{currentUser.tipo}</span>
              </span>
            ) : (
              <span className="text-yellow-400">Sem sessão ativa. Use os botões rápidos ao lado para testar.</span>
            )}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Change Roles */}
          <div className="flex items-center gap-1 border-r border-slate-700 pr-3 mr-1">
            <Users size={14} className="text-blue-400 mr-1" />
            <button
              onClick={() => onSwitchUser('Cliente')}
              className={`px-2 py-1 rounded transition font-medium ${
                currentUser?.tipo === 'Cliente' ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Yuri Neto - Cliente"
            >
              Cliente
            </button>
            <button
              onClick={() => onSwitchUser('Produtor')}
              className={`px-2 py-1 rounded transition font-medium ${
                currentUser?.tipo === 'Produtor' ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Manuel Carlos - Produtor"
            >
              Produtor
            </button>
            <button
              onClick={() => onSwitchUser('Afiliado')}
              className={`px-2 py-1 rounded transition font-medium ${
                currentUser?.tipo === 'Afiliado' ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Aline Silva - Afiliador"
            >
              Afiliado
            </button>
            <button
              onClick={() => onSwitchUser('ADM')}
              className={`px-2 py-1 rounded transition font-medium ${
                currentUser?.tipo === 'ADM' ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Administrador Mercado AO"
            >
              ADM
            </button>
          </div>

          {/* Database seeder */}
          <button
            onClick={runSeeder}
            disabled={seeding}
            className={`flex items-center gap-1 px-3 py-1 rounded font-semibold text-slate-900 transition ${
              seedSuccess 
                ? 'bg-emerald-400' 
                : 'bg-yellow-400 hover:bg-yellow-300 active:scale-95 disabled:opacity-50'
            }`}
            title="Preencher o Firebase com taxas de Luanda, cupons e produtos de amostra para testar instantaneamente."
          >
            <Database size={13} className={seeding ? 'animate-spin' : ''} />
            {seeding ? 'A Semear...' : seedSuccess ? 'Dados Criados!' : 'Semear Firebase'}
          </button>

          {/* Force reload */}
          <button
            onClick={onRefreshData}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
            title="Atualizar dados de todas coleções do Firebase"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
