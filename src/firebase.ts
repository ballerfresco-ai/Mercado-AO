import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  addDoc,
  deleteDoc,
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
// Firebase configuration handling
// For Vercel/Netlify: Use VITE_ environment variables
// For AI Studio: Use the auto-generated config file
import firebaseConfigLocal from '../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: ((import.meta as any).env.VITE_FIREBASE_API_KEY as string),
  authDomain: ((import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN as string),
  projectId: ((import.meta as any).env.VITE_FIREBASE_PROJECT_ID as string),
  storageBucket: ((import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET as string),
  messagingSenderId: ((import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID as string),
  appId: ((import.meta as any).env.VITE_FIREBASE_APP_ID as string),
  firestoreDatabaseId: ((import.meta as any).env.VITE_FIREBASE_DATABASE_ID as string) || '(default)'
};

// Error logging for missing environment variables
if (!firebaseConfig.apiKey && !firebaseConfigLocal.apiKey) {
  console.error("ERRO CRÍTICO: Chave de API do Firebase (VITE_FIREBASE_API_KEY) não encontrada nas variáveis de ambiente!");
}

// Only try to use the local config if environment variables are missing
if (!firebaseConfig.apiKey) {
  try {
    // We use a conditional check and fallback to avoid crashing the build
    // @ts-ignore
    const localConfig = firebaseConfigLocal;
    if (localConfig && localConfig.apiKey) {
      console.log("Firebase: Usando configuração local do AI Studio.");
      firebaseConfig.apiKey = localConfig.apiKey;
      firebaseConfig.authDomain = localConfig.authDomain;
      firebaseConfig.projectId = localConfig.projectId;
      firebaseConfig.storageBucket = localConfig.storageBucket;
      firebaseConfig.messagingSenderId = localConfig.messagingSenderId;
      firebaseConfig.appId = localConfig.appId;
      firebaseConfig.firestoreDatabaseId = localConfig.firestoreDatabaseId || '(default)';
    }
  } catch (e) {
    console.warn("Firebase configuration missing. Please check environment variables on Vercel/Netlify.");
  }
}

// Final safety check before initialization to prevent white screen
const isConfigValid = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

import { 
  UserProfile, 
  Product, 
  Order, 
  Wallet, 
  Withdrawal, 
  DeliveryFee, 
  Review, 
  Coupon, 
  ChatSimple, 
  Notification,
  OrderStatus,
  ProductStatus,
  UserRole,
  WithdrawalMethod,
  HomeBanner,
  Report,
  AuditLog,
  CartStats
} from './types';

// Initialize Firebase only if valid
if (!isConfigValid) {
  console.error("Firebase config is invalid. Check your environment variables.");
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Authentication Provider
const googleProvider = new GoogleAuthProvider();

// Error Handling Infrastructure as Mandated
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Details:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// -------------------------------------------------------------
// CONNECTION TESTER
// -------------------------------------------------------------
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.error("Firebase is offline. Check credentials.");
    }
    return false;
  }
}

// -------------------------------------------------------------
// AUTH & USER SERVICES
// -------------------------------------------------------------
export async function loginWithGoogle(): Promise<FirebaseUser> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'auth/google-login');
  }
}

export async function logout(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'auth/logout');
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// Audit logging helper
export async function createAuditLog(action: string, details: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  
  try {
    const profile = await getUserProfile(user.uid);
    if (!profile || profile.tipo !== 'ADM') return;

    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const log: AuditLog = {
      id: logId,
      adminId: user.uid,
      adminName: profile.nome,
      action,
      details,
      device: navigator.userAgent,
      createdAt: new Date().toISOString()
    };
    
    await setDoc(doc(db, 'audit_logs', logId), log);
  } catch (e) {
    console.error("Audit log error:", e);
  }
}

// Create profile and initialize wallet
export async function createUserProfile(userId: string, nome: string, email: string, tipo: UserRole): Promise<UserProfile> {
  const userPath = `users/${userId}`;
  const walletPath = `wallets/${userId}`;
  try {
    const batch = writeBatch(db);
    
    // Safety check: Prevent manual creation of another ADM if one exists
    if (tipo === 'ADM') {
      const exists = await checkIfAdminExists();
      if (exists) {
        throw new Error("Já existe uma conta administrativa. Apenas uma é permitida por motivos de segurança.");
      }
    }

    const profile: UserProfile = {
      id: userId,
      nome,
      email,
      tipo,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    
    const wallet: Wallet = {
      id: userId,
      user_id: userId,
      saldo: 100000 // Iniciar com saldo teste de 100.000 Kz para facilitar demonstração e testes de compras/saques!
    };

    batch.set(doc(db, 'users', userId), profile);
    batch.set(doc(db, 'wallets', userId), wallet);
    
    // Add Welcome notification
    const notificationId = `noti_welcome_${userId}`;
    const welcomeNoti: Notification = {
      id: notificationId,
      user_id: userId,
      title: 'Bem-vindo ao Mercado AO!',
      message: `Olá ${nome}, a sua conta de ${tipo} foi criada com sucesso! Aproveite a plataforma adaptada à realidade de Angola.`,
      read: false,
      createdAt: new Date().toISOString()
    };
    batch.set(doc(db, 'notifications', notificationId), welcomeNoti);

    // If ADM, also initialize platform main wallet if it doesn't exist
    if (tipo === 'ADM') {
      const platformWallet: Wallet = {
        id: 'PLATAFORMA',
        user_id: 'PLATAFORMA',
        saldo: 15000 // platform seed balance
      };
      batch.set(doc(db, 'wallets', 'PLATAFORMA'), platformWallet);
    }

    await batch.commit();
    return profile;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${userPath} & ${walletPath}`);
  }
}

// Check if any ADM is already registered to disable ADM creation option
export async function checkIfAdminExists(): Promise<boolean> {
  const path = 'users';
  try {
    const q = query(collection(db, 'users'), where('tipo', '==', 'ADM'));
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
  const path = `users/${userId}`;
  try {
    await updateDoc(doc(db, 'users', userId), data);
    
    // Log if it was an admin action on another user
    if (auth.currentUser?.uid !== userId) {
      await createAuditLog('user_management', `Atualizou perfil de ${userId}: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteUser(userId: string): Promise<void> {
  const path = `users/${userId}`;
  try {
    const profile = await getUserProfile(userId);
    if (profile?.tipo === 'ADM') throw new Error("A conta de Administrador não pode ser eliminada.");

    const batch = writeBatch(db);
    batch.delete(doc(db, 'users', userId));
    batch.delete(doc(db, 'wallets', userId));
    
    await createAuditLog('user_management', `Eliminou utilizador ${userId} (${profile?.nome})`);
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// HOME BANNERS SERVICES
// -------------------------------------------------------------
export async function getBanners(): Promise<HomeBanner[]> {
  const path = 'banners';
  try {
    const q = query(collection(db, 'banners'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as HomeBanner);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveBanner(banner: Omit<HomeBanner, 'id'>, id?: string): Promise<void> {
  const bannerId = id || `banner_${Date.now()}`;
  const path = `banners/${bannerId}`;
  try {
    await setDoc(doc(db, 'banners', bannerId), { ...banner, id: bannerId });
    await createAuditLog('home_management', `Banner ${banner.title} guardado/atualizado.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteBanner(id: string): Promise<void> {
  const path = `banners/${id}`;
  try {
    await deleteDoc(doc(db, 'banners', id));
    await createAuditLog('home_management', `Banner ${id} eliminado.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// REPORTS SERVICES
// -------------------------------------------------------------
export async function reportIssue(targetId: string, targetType: 'product' | 'user', reason: string, details: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  
  const reportId = `report_${Date.now()}`;
  try {
    const report: Report = {
      id: reportId,
      reporterId: user.uid,
      reporterName: user.displayName || 'Utilizador',
      targetId,
      targetType,
      reason,
      details,
      status: 'pending',
      priority: 'medium',
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'reports', reportId), report);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'reports');
  }
}
export async function getWallet(userId: string): Promise<Wallet | null> {
  const path = `wallets/${userId}`;
  try {
    const snap = await getDoc(doc(db, 'wallets', userId));
    return snap.exists() ? (snap.data() as Wallet) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function requestWithdrawal(
  userId: string, 
  userNome: string,
  userTipo: UserRole,
  valor: number, 
  metodo: WithdrawalMethod, 
  detalhes: string
): Promise<Withdrawal> {
  const withdrawPath = 'withdrawals';
  try {
    const walletDocRef = doc(db, 'wallets', userId);
    const walletSnap = await getDoc(walletDocRef);
    if (!walletSnap.exists()) {
      throw new Error("Carteira não encontrada.");
    }
    const currentBalance = walletSnap.data().saldo;
    
    // Validate if enough balance
    if (currentBalance < valor) {
      throw new Error(`Saldo insuficiente. O seu saldo atual é de ${currentBalance} Kz.`);
    }

    const batch = writeBatch(db);
    const withdrawalId = `with_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    const withdrawal: Withdrawal = {
      id: withdrawalId,
      user_id: userId,
      user_nome: userNome,
      user_tipo: userTipo,
      valor,
      metodo,
      detalhes,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Deduct pending balance from wallet
    batch.update(walletDocRef, { saldo: currentBalance - valor });
    batch.set(doc(db, 'withdrawals', withdrawalId), withdrawal);

    // Create system notification for ADM
    const adminNotiId = `noti_with_adm_${withdrawalId}`;
    const adminNoti: Notification = {
      id: adminNotiId,
      user_id: 'ALL_ADMS', // can be picked up by any admin list
      title: 'Nova Solicitação de Saque',
      message: `O utilizador ${userNome} (${userTipo}) solicitou um saque de ${valor.toLocaleString()} Kz via ${metodo}.`,
      read: false,
      createdAt: new Date().toISOString()
    };
    // Save to notifications collection
    batch.set(doc(db, 'notifications', adminNotiId), adminNoti);

    await batch.commit();
    return withdrawal;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, withdrawPath);
  }
}

export async function approveWithdrawal(withdrawalId: string, admId: string): Promise<void> {
  const path = `withdrawals/${withdrawalId}`;
  try {
    const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
    const withdrawalSnap = await getDoc(withdrawalRef);
    if (!withdrawalSnap.exists()) {
      throw new Error("Solicitação de saque não encontrada.");
    }
    
    const withdrawal = withdrawalSnap.data() as Withdrawal;
    if (withdrawal.status !== 'pending') {
      throw new Error("Esta solicitação já foi processada.");
    }

    const batch = writeBatch(db);
    batch.update(withdrawalRef, { status: 'approved' });
    await createAuditLog('withdrawal_management', `Aprovou saque ${withdrawalId} de ${withdrawal.valor} Kz`);

    // Handle Fee for Affiliates (200 Kz fee as requested)
    if (withdrawal.user_tipo === 'Afiliado') {
      const platWalletRef = doc(db, 'wallets', 'PLATAFORMA');
      const platWalletSnap = await getDoc(platWalletRef);
      if (platWalletSnap.exists()) {
        const platBalance = platWalletSnap.data().saldo;
        // In this logic, the 200 Kz is the platform revenue.
        // The user already has the "withdrawal.valor" deducted from their wallet during the request.
        // So we just move 200 Kz from the "withdrawn pool" to the platform's actual balance.
        // Actually, the user requests X, Y is deducted. If X-200 is what they get physically, then 200 goes to platform.
        batch.update(platWalletRef, { saldo: platBalance + 200 });
      }
    }

    // Notify requester
    const notiId = `noti_with_approved_${withdrawalId}`;
    const userNoti: Notification = {
      id: notiId,
      user_id: withdrawal.user_id,
      title: 'Saque Aprovado de Sucesso!',
      message: `O seu pedido de saque no valor de ${withdrawal.valor.toLocaleString()} Kz via ${withdrawal.metodo} foi pago com sucesso!`,
      read: false,
      createdAt: new Date().toISOString()
    };
    batch.set(doc(db, 'notifications', notiId), userNoti);

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function rejectWithdrawal(withdrawalId: string, motivo: string): Promise<void> {
  const path = `withdrawals/${withdrawalId}`;
  try {
    const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
    const withdrawalSnap = await getDoc(withdrawalRef);
    if (!withdrawalSnap.exists()) {
      throw new Error("Solicitação de saque não encontrada.");
    }
    
    const withdrawal = withdrawalSnap.data() as Withdrawal;
    if (withdrawal.status !== 'pending') {
      throw new Error("Esta solicitação já foi processada.");
    }

    const batch = writeBatch(db);
    batch.update(withdrawalRef, { status: 'rejected' });
    await createAuditLog('withdrawal_management', `Rejeitou saque ${withdrawalId}. Motivo: ${motivo}`);

    // Refund wallet
    const walletRef = doc(db, 'wallets', withdrawal.user_id);
    const walletSnap = await getDoc(walletRef);
    if (walletSnap.exists()) {
      const currentBalance = walletSnap.data().saldo;
      batch.update(walletRef, { saldo: currentBalance + withdrawal.valor });
    }

    // Notify user
    const notiId = `noti_with_rejected_${withdrawalId}`;
    const userNoti: Notification = {
      id: notiId,
      user_id: withdrawal.user_id,
      title: 'Saque Recusado',
      message: `O seu pedido de saque de ${withdrawal.valor.toLocaleString()} Kz foi rejeitado. Razão: ${motivo || 'Verifique seus detalhes de conta'}. O saldo foi devolvido.`,
      read: false,
      createdAt: new Date().toISOString()
    };
    batch.set(doc(db, 'notifications', notiId), userNoti);

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// -------------------------------------------------------------
// PRODUCTS SERVICES
// -------------------------------------------------------------
export async function createProduct(
  produtorId: string, 
  nome: string, 
  descrição: string, 
  preço: number, 
  comissãoAfiliado: number, 
  imageUrl?: string
): Promise<Product> {
  const path = 'products';
  try {
    const productId = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const product: Product = {
      id: productId,
      nome,
      descrição,
      preço,
      comissão_afiliado: comissãoAfiliado,
      produtor_id: produtorId,
      status: 'pending', // Starts pending ADM approval
      featured: false,
      imageUrl: imageUrl || '',
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'products', productId), product);

    // Notify Admins
    const adminNotiId = `noti_prod_created_${productId}`;
    const adminNoti: Notification = {
      id: adminNotiId,
      user_id: 'ALL_ADMS',
      title: 'Novo Produto Aguardando Aprovação',
      message: `O produto "${nome}" foi cadastrado por um produtor e necessita de avaliação para ser publicado.`,
      read: false,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'notifications', adminNotiId), adminNoti);

    return product;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateProductStatus(productId: string, status: ProductStatus): Promise<void> {
  const path = `products/${productId}`;
  try {
    const productRef = doc(db, 'products', productId);
    const productSnap = await getDoc(productRef);
    if (!productSnap.exists()) throw new Error("Produto não encontrado.");
    
    const product = productSnap.data() as Product;
    
    await updateDoc(productRef, { status });
    await createAuditLog('product_moderation', `${status === 'approved' ? 'Aprovou' : 'Rejeitou'} produto ${productId} (${product.nome})`);

    // Notify Producer
    const notiId = `noti_prod_status_${productId}_${status}`;
    const statusMsg = status === 'approved' ? 'foi Aprovado! Está agora visível no marketplace.' : 'foi Rejeitado pelo Administrador.';
    const userNoti: Notification = {
      id: notiId,
      user_id: product.produtor_id,
      title: `Produto ${status === 'approved' ? 'Aprovado' : 'Rejeitado'}`,
      message: `O seu produto "${product.nome}" ${statusMsg}`,
      read: false,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'notifications', notiId), userNoti);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Pay 2500 Kz to feature a product (destacar)
export async function featureProduct(productId: string, produtorId: string): Promise<void> {
  const path = `products/${productId}`;
  const cost = 2500; // 2500 Kz to feature
  try {
    const walletRef = doc(db, 'wallets', produtorId);
    const walletSnap = await getDoc(walletRef);
    if (!walletSnap.exists()) throw new Error("Carteira não encontrada.");
    
    const balance = walletSnap.data().saldo;
    if (balance < cost) {
      throw new Error(`Saldo insuficiente para destacar o produto. Requer ${cost} Kz. Saldo atual: ${balance} Kz.`);
    }

    const batch = writeBatch(db);
    
    // Deduct wallet for highlight fee
    batch.update(walletRef, { saldo: balance - cost });
    
    // Add to ADM/Platform wallet
    const platWalletRef = doc(db, 'wallets', 'PLATAFORMA');
    const platSnap = await getDoc(platWalletRef);
    if (platSnap.exists()) {
      batch.update(platWalletRef, { saldo: platSnap.data().saldo + cost });
    }

    // Highight product
    batch.update(doc(db, 'products', productId), { featured: true });

    // Confirmation notification
    const notiId = `noti_prod_featured_${productId}`;
    const userNoti: Notification = {
      id: notiId,
      user_id: produtorId,
      title: 'Produto em Destaque!',
      message: `O seu produto foi promovido com destaque no Mercado AO! Taxa paga: ${cost} Kz.`,
      read: false,
      createdAt: new Date().toISOString()
    };
    batch.set(doc(db, 'notifications', notiId), userNoti);

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// -------------------------------------------------------------
// DELIVERY FEES & COUPOUNS
// -------------------------------------------------------------
export async function getDeliveryFees(): Promise<DeliveryFee[]> {
  const path = 'deliveryFees';
  try {
    const snap = await getDocs(collection(db, 'deliveryFees'));
    return snap.docs.map(doc => doc.data() as DeliveryFee);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// Luanda Bairros definition
export const LUANDA_BAIRROS = [
  "Talatona", "Kilamba", "Benfica", "Viana", "Maianga", "Camama", 
  "Samba", "Cacuaco", "Morro Bento", "Rocha Pinto", "Golf", "Zango", 
  "Cassenda", "Maculusso", "Patriota", "Rangel", "Ingombota", "Kikolo", 
  "Hoji-Ya-Henda", "Prenda", "Futungo", "Vila Alice", "Alvalade"
];

export async function setDeliveryFee(bairro: string, valor: number): Promise<void> {
  // Validate that it's a Luanda bairro
  if (!LUANDA_BAIRROS.includes(bairro)) {
    throw new Error("Localidade inválida. Entregas disponíveis apenas para Luanda.");
  }

  const id = `fee_${bairro.toLowerCase().replace(/\s+/g, '_')}`;
  const path = `deliveryFees/${id}`;
  try {
    await setDoc(doc(db, 'deliveryFees', id), {
      id,
      bairro,
      valor
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteDeliveryFee(feeId: string): Promise<void> {
  const path = `deliveryFees/${feeId}`;
  try {
    await deleteDoc(doc(db, 'deliveryFees', feeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function getCoupons(): Promise<Coupon[]> {
  const path = 'coupons';
  try {
    const snap = await getDocs(collection(db, 'coupons'));
    return snap.docs.map(doc => doc.data() as Coupon);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveCoupon(código: string, desconto: number, validade: string): Promise<Coupon> {
  const id = `coupon_${código.toUpperCase()}`;
  const path = `coupons/${id}`;
  try {
    const coupon: Coupon = {
      id,
      código: código.toUpperCase(),
      desconto,
      validade
    };
    await setDoc(doc(db, 'coupons', id), coupon);
    return coupon;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCoupon(couponId: string): Promise<void> {
  const path = `coupons/${couponId}`;
  try {
    await deleteDoc(doc(db, 'coupons', couponId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// SHOPPING & ORDERS FLOW
// -------------------------------------------------------------
export async function checkoutOrder(
  clienteId: string,
  clienteNome: string,
  product: Product,
  bairro: string,
  taxaEntrega: number,
  couponCode?: string,
  deliveryAddress?: string,
  phone?: string,
  afiliadoId?: string,
  afiliadoNome?: string
): Promise<Order> {
  const path = 'orders';
  try {
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // Subtotal
    const subtotal = product.preço;
    let descontoPercent = 0;
    
    // Validate coupon
    if (couponCode) {
      const couponRef = doc(db, 'coupons', `coupon_${couponCode.toUpperCase()}`);
      const couponSnap = await getDoc(couponRef);
      if (couponSnap.exists()) {
        const coupon = couponSnap.data() as Coupon;
        const today = new Date().toISOString().split('T')[0];
        if (coupon.validade >= today) {
          descontoPercent = coupon.desconto;
        }
      }
    }

    const desconto = Math.floor((subtotal * descontoPercent) / 100);
    const total = subtotal - desconto + taxaEntrega;

    // Financial split ratios
    const comissaoPlataforma = Math.floor(product.preço * 0.10); // 10% Platform fee
    let comissaoAfiliadoPaga = 0;
    
    if (afiliadoId && product.comissão_afiliado > 0) {
      comissaoAfiliadoPaga = Math.floor((product.preço * product.comissão_afiliado) / 100);
    }

    // Producer share (Product Price - platform fee - affiliate fee)
    const comissaoProdutorPaga = product.preço - comissaoPlataforma - comissaoAfiliadoPaga;

    const order: Order = {
      id: orderId,
      cliente_id: clienteId,
      cliente_nome: clienteNome,
      produto_id: product.id,
      produto_nome: product.nome,
      produtor_id: product.produtor_id,
      afiliado_id: afiliadoId || '',
      afiliado_nome: afiliadoNome || '',
      status: 'pending',
      bairro,
      taxa_entrega: taxaEntrega,
      subtotal,
      desconto,
      total,
      comissao_plataforma: comissaoPlataforma,
      comissao_afiliado_paga: comissaoAfiliadoPaga,
      comissao_produtor_paga: comissaoProdutorPaga,
      delivery_address: deliveryAddress || '',
      phone: phone || '',
      createdAt: new Date().toISOString()
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'orders', orderId), order);

    // Notify Producer about sale
    const prodNotiId = `noti_sale_prod_${orderId}`;
    const prodNoti: Notification = {
      id: prodNotiId,
      user_id: product.produtor_id,
      title: 'Novo Pedido Recebido (CoD)',
      message: `Recebeu um novo pedido de "${product.nome}" feito por ${clienteNome} para entregar em ${bairro}. Pagamento na Entrega.`,
      read: false,
      createdAt: new Date().toISOString()
    };
    batch.set(doc(db, 'notifications', prodNotiId), prodNoti);

    // If there is an affiliate, notify them about the potential referral
    if (afiliadoId && comissaoAfiliadoPaga > 0) {
      const afilNotiId = `noti_refer_afil_${orderId}`;
      const afilNoti: Notification = {
        id: afilNotiId,
        user_id: afiliadoId,
        title: 'Nova Indicação Registada!',
        message: `Uma venda do produto "${product.nome}" foi feita através do seu link. Comissão de ${comissaoAfiliadoPaga.toLocaleString()} Kz pendente de entrega.`,
        read: false,
        createdAt: new Date().toISOString()
      };
      batch.set(doc(db, 'notifications', afilNotiId), afilNoti);
    }

    await batch.commit();
    return order;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// Update order status (including CoD completion financial settlements!)
export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) throw new Error("Pedido não encontrado.");
    
    const order = orderSnap.data() as Order;
    const oldStatus = order.status;
    
    if (oldStatus === status) return; // Unchanged

    const batch = writeBatch(db);
    batch.update(orderRef, { status });

    // Notify Buyer
    const buyerNotiId = `noti_order_update_${orderId}_${status}`;
    let buyerTitle = `Pedido Atualizado!`;
    let buyerMsg = `O seu pedido #${orderId.substring(6, 12)} está agora com estado: ${status}.`;
    
    if (status === 'shipped') {
      buyerTitle = 'Pedido a Caminho!';
      buyerMsg = `O entregador já saiu com o seu pedido de "${order.produto_nome}" rumo ao bairro ${order.bairro}! Prepare o dinheiro da entrega.`;
    } else if (status === 'delivered') {
      buyerTitle = 'Pedido Entregue!';
      buyerMsg = `O seu pedido de "${order.produto_nome}" foi entregue! Obrigado pela preferência no Mercado AO.`;
    } else if (status === 'cancelled') {
      buyerTitle = 'Pedido Cancelado';
      buyerMsg = `O seu pedido de "${order.produto_nome}" foi cancelado.`;
    }
    
    const buyerNoti: Notification = {
      id: buyerNotiId,
      user_id: order.cliente_id,
      title: buyerTitle,
      message: buyerMsg,
      read: false,
      createdAt: new Date().toISOString()
    };
    batch.set(doc(db, 'notifications', buyerNotiId), buyerNoti);

    // CRITICAL: Financial settlement when order is marked DELIVERED (Cash Received!)
    if (status === 'delivered' && oldStatus !== 'delivered') {
      // 1. Pay Producer: comissao_produtor_paga
      const prodWalletRef = doc(db, 'wallets', order.produtor_id);
      const prodWalletSnap = await getDoc(prodWalletRef);
      if (prodWalletSnap.exists()) {
        const prodBalance = prodWalletSnap.data().saldo;
        batch.update(prodWalletRef, { saldo: prodBalance + order.comissao_produtor_paga });
      }

      // Notify Producer about revenue
      const prodNotiId = `noti_settle_prod_${orderId}`;
      const prodNoti: Notification = {
        id: prodNotiId,
        user_id: order.produtor_id,
        title: 'Pagamento Libertado',
        message: `O pedido #${orderId.substring(6,12)} foi entregue. ${order.comissao_produtor_paga.toLocaleString()} Kz foram adicionados à sua carteira.`,
        read: false,
        createdAt: new Date().toISOString()
      };
      batch.set(doc(db, 'notifications', prodNotiId), prodNoti);

      // 2. Pay Affiliate (if exists): comissao_afiliado_paga
      if (order.afiliado_id && order.comissao_afiliado_paga > 0) {
        const afilWalletRef = doc(db, 'wallets', order.afiliado_id);
        const afilWalletSnap = await getDoc(afilWalletRef);
        if (afilWalletSnap.exists()) {
          const afilBalance = afilWalletSnap.data().saldo;
          batch.update(afilWalletRef, { saldo: afilBalance + order.comissao_afiliado_paga });
        }

        // Notify Affiliate
        const afilNotiId = `noti_settle_afil_${orderId}`;
        const afilNoti: Notification = {
          id: afilNotiId,
          user_id: order.afiliado_id,
          title: 'Comissão Libertada!',
          message: `A sua venda indicada do produto "${order.produto_nome}" foi entregue. Comissão de ${order.comissao_afiliado_paga.toLocaleString()} Kz creditada na carteira!`,
          read: false,
          createdAt: new Date().toISOString()
        };
        batch.set(doc(db, 'notifications', afilNotiId), afilNoti);
      }

      // 3. Platform wallet receives commission
      const platWalletRef = doc(db, 'wallets', 'PLATAFORMA');
      const platWalletSnap = await getDoc(platWalletRef);
      if (platWalletSnap.exists()) {
        const platBalance = platWalletSnap.data().saldo;
        batch.update(platWalletRef, { saldo: platBalance + order.comissao_plataforma });
      }
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// -------------------------------------------------------------
// REVIEWS & RATINGS
// -------------------------------------------------------------
export async function createReview(
  clienteId: string, 
  clienteNome: string,
  produtoId: string, 
  avaliação: number, 
  comentário: string
): Promise<Review> {
  const path = 'reviews';
  try {
    const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const review: Review = {
      id: reviewId,
      cliente_id: clienteId,
      cliente_nome: clienteNome,
      produto_id: produtoId,
      avaliação,
      comentário,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'reviews', reviewId), review);
    return review;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getProductReviews(produtoId: string): Promise<Review[]> {
  const path = 'reviews';
  try {
    const q = query(collection(db, 'reviews'), where('produto_id', '==', produtoId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as Review);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// -------------------------------------------------------------
// CHATS SYSTEM
// -------------------------------------------------------------
export async function sendChatMessage(
  orderId: string,
  senderId: string,
  senderNome: string,
  receiverId: string,
  message: string
): Promise<ChatSimple> {
  const path = 'chats';
  try {
    const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const chat: ChatSimple = {
      id: chatId,
      orderId,
      senderId,
      senderNome,
      receiverId,
      message,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'chats', chatId), chat);
    return chat;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function listenToOrderChats(orderId: string, onUpdate: (chats: ChatSimple[]) => void) {
  const q = query(
    collection(db, 'chats'), 
    where('orderId', '==', orderId), 
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    const chats = snap.docs.map(doc => doc.data() as ChatSimple);
    onUpdate(chats);
  }, (error) => {
    console.error("Error loading chat messages:", error);
  });
}

// -------------------------------------------------------------
// REAL-TIME NOTIFICATIONS
// -------------------------------------------------------------
export function listenToUserNotifications(userId: string, onUpdate: (notifications: Notification[]) => void) {
  // ADM will listen to both ALL_ADMS and its own specific ID
  const q = query(
    collection(db, 'notifications'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const allNotifications = snap.docs.map(doc => doc.data() as Notification);
    // Filter client-side so query doesn't complain about complex indexing
    const filtered = allNotifications.filter(n => n.user_id === userId || n.user_id === 'ALL_ADMS');
    onUpdate(filtered.slice(0, 50)); // Max 50
  }, (error) => {
    console.error("Notifications error", error);
  });
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const path = `notifications/${notificationId}`;
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// -------------------------------------------------------------
// USER LOGOUT ALIAS
// -------------------------------------------------------------
export async function logoutUser(): Promise<void> {
  return logout();
}

// -------------------------------------------------------------
// ADAPTED METHODS FOR BUYER FLOW
// -------------------------------------------------------------
export async function createOrder(
  clienteId: string,
  product: Product,
  phone: string,
  bairro: string,
  deliveryAddress: string,
  discountPercentage: number,
  taxaEntrega: number,
  afiliadoId?: string
): Promise<string> {
  const path = 'orders';
  try {
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // Fetch client name
    const clientProfile = await getUserProfile(clienteId);
    const clienteNome = clientProfile?.nome || "Cliente Premium";

    // Fetch affiliate name if applicable
    let afiliadoNome = "";
    if (afiliadoId) {
      const afilProfile = await getUserProfile(afiliadoId);
      afiliadoNome = afilProfile?.nome || "";
    }

    const subtotal = product.preço;
    const desconto = Math.floor((subtotal * discountPercentage) / 100);
    const total = subtotal - desconto + taxaEntrega;

    const comissaoPlataforma = Math.floor(product.preço * 0.10); // 10% Platform fee
    let comissaoAfiliadoPaga = 0;
    
    if (afiliadoId && product.comissão_afiliado > 0) {
      comissaoAfiliadoPaga = Math.floor((product.preço * product.comissão_afiliado) / 100);
    }

    const comissaoProdutorPaga = product.preço - comissaoPlataforma - comissaoAfiliadoPaga;

    const order: Order = {
      id: orderId,
      cliente_id: clienteId,
      cliente_nome: clienteNome,
      produto_id: product.id,
      produto_nome: product.nome,
      produtor_id: product.produtor_id,
      afiliado_id: afiliadoId || '',
      afiliado_nome: afiliadoNome,
      status: 'pending',
      bairro,
      taxa_entrega: taxaEntrega,
      subtotal,
      desconto,
      total,
      comissao_plataforma: comissaoPlataforma,
      comissao_afiliado_paga: comissaoAfiliadoPaga,
      comissao_produtor_paga: comissaoProdutorPaga,
      delivery_address: deliveryAddress,
      phone,
      createdAt: new Date().toISOString()
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'orders', orderId), order);

    // Notify Producer about sale
    const prodNotiId = `noti_sale_prod_${orderId}`;
    const prodNoti: Notification = {
      id: prodNotiId,
      user_id: product.produtor_id,
      title: 'Novo Pedido Recebido (CoD)',
      message: `Recebeu um novo pedido de "${product.nome}" feito por ${clienteNome} para entregar em ${bairro}. Pagamento na Entrega.`,
      read: false,
      createdAt: new Date().toISOString()
    };
    batch.set(doc(db, 'notifications', prodNotiId), prodNoti);

    // If there is an affiliate, notify them about the potential referral
    if (afiliadoId && comissaoAfiliadoPaga > 0) {
      const afilNotiId = `noti_refer_afil_${orderId}`;
      const afilNoti: Notification = {
        id: afilNotiId,
        user_id: afiliadoId,
        title: 'Nova Indicação Registada!',
        message: `Uma venda do produto "${product.nome}" foi feita através do seu link. Comissão de ${comissaoAfiliadoPaga.toLocaleString()} Kz pendente de entrega.`,
        read: false,
        createdAt: new Date().toISOString()
      };
      batch.set(doc(db, 'notifications', afilNotiId), afilNoti);
    }

    await batch.commit();
    return orderId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function submitReview(
  produtoId: string,
  clienteId: string,
  avaliação: number,
  comentário: string
): Promise<Review> {
  const profile = await getUserProfile(clienteId);
  const clienteNome = profile?.nome || "Cliente Premium";
  return createReview(clienteId, clienteNome, produtoId, avaliação, comentário);
}

// -------------------------------------------------------------
// CUSTOM HOOK FOR REFERRAL LINK DETECTOR
// -------------------------------------------------------------
export function useUserReferral(): string | null {
  const [referralUserId, setReferralUserId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) {
        setReferralUserId(ref);
        sessionStorage.setItem('referral_user_id', ref);
      } else {
        const cached = sessionStorage.getItem('referral_user_id');
        if (cached) {
          setReferralUserId(cached);
        }
      }
    }
  }, []);

  return referralUserId;
}

