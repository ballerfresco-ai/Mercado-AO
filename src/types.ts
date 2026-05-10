export type UserRole = 'ADM' | 'Produtor' | 'Afiliado' | 'Cliente';

export interface UserProfile {
  id: string; // matches Auth UID
  nome: string;
  email: string;
  tipo: UserRole;
  status: 'active' | 'blocked';
  phone?: string;
  bairro?: string;
  avatarUrl?: string;
  createdAt: string;
}

export type ProductStatus = 'pending' | 'approved' | 'rejected';
export type ProductType = 'FISICO' | 'DIGITAL';

export interface Product {
  id: string;
  nome: string;
  descrição: string;
  preço: number;
  comissão_afiliado: number; // percentage (0-100)
  produtor_id: string;
  status: ProductStatus;
  tipo: ProductType;
  categoria: string;
  subcategoria?: string;
  estado?: 'Novo' | 'Usado' | 'Reciclado';
  peso?: string;
  tamanho?: string;
  cor?: string;
  endereco_recolha?: string;
  contacto_produtor?: string;
  featured: boolean;
  imageUrl?: string; // main image
  images?: string[]; // multi-image support
  videoUrl?: string; // presentation video
  fileUrl?: string; // the protected digital file
  fileName?: string;
  externalLink?: string;
  digitalContent?: string; // private instructions or access key
  salesCount: number;
  rejectionReason?: string;
  createdAt: string;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentMethod = 'COD' | 'ONLINE';

export interface Order {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  produto_id: string;
  produto_nome: string;
  produtor_id: string;
  afiliado_id?: string;
  afiliado_nome?: string;
  status: OrderStatus;
  bairro?: string; // optional for digital
  taxa_entrega: number; // 0 for digital
  subtotal: number;
  desconto: number;
  total: number;
  comissao_plataforma: number;
  comissao_afiliado_paga: number;
  comissao_produtor_paga: number;
  delivery_address?: string; // optional for digital
  phone: string;
  payment_method: PaymentMethod;
  payment_channel?: string;
  digital_access_granted?: boolean;
  createdAt: string;
}

export interface UserDigitalAccess {
  id: string; // matches product_id_user_id
  user_id: string;
  product_id: string;
  product_nome: string;
  product_imageUrl?: string;
  progress: number; // 0-100
  lastViewedAt: string;
  accessGrantedAt: string;
}

export interface Wallet {
  id: string; // same as user_id
  user_id: string;
  saldo: number;
}

export type WithdrawalMethod = 'IBAN' | 'PayPay' | 'Unitel Money' | 'Afrimoney' | 'Multicaixa Express';
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected';

export interface Withdrawal {
  id: string;
  user_id: string;
  user_nome: string;
  user_tipo: UserRole;
  valor: number;
  metodo: WithdrawalMethod;
  detalhes: string; // IBAN, phone number or identification details
  status: WithdrawalStatus;
  createdAt: string;
}

export interface DeliveryFee {
  id: string;
  bairro: string;
  valor: number;
}

export interface Bairro {
  id: string;
  nome: string;
  isCustom?: boolean;
}

export interface Review {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  produto_id: string;
  avaliação: number; // 1 to 5
  comentário: string;
  createdAt: string;
}

export interface Coupon {
  id: string;
  código: string;
  desconto: number; // percentage (e.g. 10 for 10%)
  validade: string; // YYYY-MM-DD
  produtor_id?: string;
}

export interface MaterialApoio {
  id: string;
  produtor_id: string;
  titulo: string;
  descricao: string;
  link?: string;
  tipo: 'Link' | 'Arquivo' | 'Texto';
  createdAt: string;
}

export interface ChatSimple {
  id: string;
  orderId: string;
  senderId: string;
  senderNome: string;
  receiverId: string;
  message: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  user_id: string; // targeted user
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}
