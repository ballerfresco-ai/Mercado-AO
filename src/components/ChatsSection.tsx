import { useState, useEffect, useRef, FormEvent } from 'react';
import { db, sendChatMessage, listenToOrderChats, auth } from '../firebase';
import { simulateUserChatReply } from '../services/gemini';
import { 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { ChatSimple, Order } from '../types';
import { 
  X, 
  Send, 
  Bot, 
  MessageSquare, 
  User, 
  Sparkles, 
  RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';

interface ChatsSectionProps {
  orderId: string;
  senderType: 'Cliente' | 'Produtor';
  onClose: () => void;
}

export function ChatsSection({ orderId, senderType, onClose }: ChatsSectionProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<ChatSimple[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [botSimulating, setBotSimulating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // 1. Fetch related Order details
    const getOrderDetails = async () => {
      const snap = await getDoc(doc(db, 'orders', orderId));
      if (snap.exists()) {
        setOrder(snap.data() as Order);
      }
    };
    getOrderDetails();

    // 2. Fetch Chat Messages on this order thread in real-time
    const unsub = listenToOrderChats(orderId, (chats) => {
      setMessages(chats);
    });

    return () => unsub();
  }, [orderId]);

  // Scroll to bottom helper
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !order) return;

    const val = messageInput;
    setMessageInput('');

    try {
      const senderId = auth.currentUser?.uid || 'guest';
      const senderNome = senderType === 'Cliente' ? order.cliente_nome : 'Vendedor/Produtor';
      const receiverId = senderType === 'Cliente' ? order.produtor_id : order.cliente_id;

      await sendChatMessage(orderId, senderId, senderNome, receiverId, val);
    } catch (err: any) {
      alert("Não foi possível enviar a sua mensagem. Verifique a sua ligação.");
    }
  };

  // Simulates an AI Buyer or Seller reply with Gemini AI using localized Angola accents
  const handleTriggerAiSimulationReply = async () => {
    if (!order) return;
    setBotSimulating(true);

    const contextTexts = messages.slice(-5).map(m => `${m.senderNome}: ${m.message}`);
    // Simulate the other player role
    const simulatedRole = senderType === 'Cliente' ? 'Produtor' : 'Cliente';

    try {
      const aiReply = await simulateUserChatReply(
        orderId,
        order.produto_nome,
        senderType === 'Cliente' ? order.cliente_nome : 'Vendedor Parceiro',
        simulatedRole === 'Cliente' ? 'Cliente' : 'Produtor',
        contextTexts
      );

      const senderId = simulatedRole === 'Cliente' ? order.cliente_id : order.produtor_id;
      const senderNome = simulatedRole === 'Cliente' ? order.cliente_nome : 'Vendedor/Produtor';
      const receiverId = simulatedRole === 'Cliente' ? order.produtor_id : order.cliente_id;

      await sendChatMessage(orderId, senderId, senderNome, receiverId, aiReply);
    } catch (err: any) {
      console.error(err);
    } finally {
      setBotSimulating(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 max-w-md w-full bg-[#060813] border-l border-white/10 shadow-2xl z-50 flex flex-col justify-between font-sans text-white">
      
      {/* Drawer Header */}
      <div className="p-4 border-b border-white/15 bg-slate-950 flex justify-between items-center bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-display font-medium text-sm text-white">Chat do Pedido CoD</h4>
            {order ? (
              <p className="text-[10px] text-slate-400 font-mono">Produto: {order.produto_nome}</p>
            ) : (
              <p className="text-[10px] text-slate-400 font-mono">ID: #{orderId.substring(6, 12)}</p>
            )}
          </div>
        </div>

        <button 
          onClick={onClose} 
          className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Connection Notice banner */}
      <div className="p-2.5 bg-blue-900/35 border-b border-blue-900/40 text-[10px] font-mono text-center text-blue-400 flex items-center justify-center gap-1">
        <Sparkles className="w-3.5 h-3.5 animate-spin" />
        <span>Canal CoD Encriptado • Ambiente Seguro Luanda</span>
      </div>

      {/* Messages Thread Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Bot className="w-10 h-10 text-slate-600 mx-auto animate-bounce" />
            <p className="text-xs text-slate-500 italic max-w-xs mx-auto">
              Nenhuma mensagem registada neste pedido de compra na entrega rápida.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isSelf = msg.senderId === auth.currentUser?.uid;
            return (
              <div 
                key={index}
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} space-y-1`}
              >
                {/* Meta Sender Tag */}
                <div className="text-[9px] font-mono text-slate-500 flex items-center gap-1 px-1">
                  <User className="w-2.5 h-2.5" />
                  <span>{msg.senderNome}</span>
                  {isSelf && <span className="bg-blue-600 text-white rounded px-0.5 font-bold">VOCÊ</span>}
                </div>

                <div 
                  className={`p-3.5 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                    isSelf 
                      ? 'bg-blue-600/90 text-white rounded-tr-none shadow-md shadow-blue-600/10' 
                      : 'bg-slate-900 text-slate-300 rounded-tl-none border border-white/5'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* AI BOT SIMULATOR BUTTON TRAY */}
      {order && (
        <div className="p-3 bg-slate-900/50 border-t border-slate-850 flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1"><Bot className="w-3.5 h-3.5 text-blue-400" /> Simular conversação:</span>
          <button
            onClick={handleTriggerAiSimulationReply}
            disabled={botSimulating}
            className="p-1 px-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/20 hover:border-blue-500/40 font-bold transition-all flex items-center gap-1.5"
            title="Gera uma resposta realista e automática para o outro participante usando IA"
          >
            {botSimulating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Digitando sotaque local...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                <span>Simular Resposta AI (Gemini)</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Text input form */}
      <form onSubmit={handleSendMessage} className="p-4 bg-slate-950 border-t border-white/10 flex gap-2">
        <input
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder="Escreva a sua mensagem..."
          className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={!messageInput.trim()}
          className="p-3 bg-[#2563EB] hover:bg-blue-500 text-white rounded-xl transition-colors disabled:opacity-35 font-bold"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
}
