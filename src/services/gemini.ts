import { GoogleGenAI } from "@google/genai";

// Lazy initialization of Gemini client to prevent crashes if API key is missing on startup
let genAI: GoogleGenAI | null = null;
const MODEL_NAME = 'gemini-3-flash-preview';

function getAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("Chave Gemini API não configurada. Adicione GEMINI_API_KEY nas variáveis de ambiente.");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

/**
 * Generates an elegant, high-converting product description tailored for the Angolan market.
 */
export async function generateProductDescription(productName: string, bulletPoints: string): Promise<string> {
  try {
    const ai = getAI();
    const prompt = `Você é um copywriter profissional angolano especializado em e-commerce. 
Gerou uma descrição cativante, estruturada e de alta conversão para o produto abaixo na moeda local de Angola (Kwanza - Kz).
Use termos amigáveis populares em Luanda e no resto de Angola (como "madié", "bué", "fixe", "expresso") mas de forma corporativa e polida. Enfatize que o Mercado AO suporta "Cash on Delivery" (pagamento seguro apenas no momento da entrega física ao cliente).

Nome do Produto: ${productName}
Destaques/Características: ${bulletPoints}

A descrição deve ter:
1. Uma introdução sedutora.
2. Uma lista atraente de benefícios ou características.
3. Um convite de ação destacando o pagamento na entrega (Cash on Delivery).
Escreva em Português de Angola. Evite formatação pesada, prefira markdown simples.`;

    const result = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt
    });
    return result.text || "Não foi possível gerar a descrição no momento.";
  } catch (error) {
    console.error("Gemini description error:", error);
    return "Erro ao comunicar com a inteligência artificial para gerar descrição do produto.";
  }
}

/**
 * Generates engaging social media copy (for Whatsapp, Instagram or Facebook) for an Affiliate.
 */
export async function generateSocialPromoCopy(
  productName: string, 
  price: number, 
  affiliateLink: string
): Promise<string> {
  try {
    const ai = getAI();
    const prompt = `Você é um afiliado digital de alto sucesso em Angola. Escreva um post de divulgação fantástico e curto para o WhatsApp e Instagram sobre este produto.
Encoraje as pessoas a comprarem clicando no link indicado e mencione que pagam apenas no ato de entrega física (Cash on Delivery) via dinherio, IBAN ou Multicaixa Express.

Nome do Produto: ${productName}
Preço: ${price.toLocaleString()} Kz
Link de Afiliado: ${affiliateLink}

Use emojis atraentes, quebras de linhas limpas e uma linguagem vibrante, típica do marketing moderno em Angola.`;

    const result = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt
    });
    return result.text || "";
  } catch (error) {
    console.error("Gemini promo copy error:", error);
    return `🔥 Super novidade no Mercado AO!\n📦 Compre *${productName}* por apenas *${price.toLocaleString()} Kz*.\n👉 Pagamento 100% seguro apenas no ato de entrega!\n🔗 Garanta o seu aqui: ${affiliateLink}`;
  }
}

/**
 * Simulates an intelligent buyer/seller response to help with platform testing.
 */
export async function simulateUserChatReply(
  orderId: string, 
  productName: string, 
  senderName: string, 
  senderType: 'Cliente' | 'Produtor',
  lastMessagesContext: string[]
): Promise<string> {
  try {
    const ai = getAI();
    const contextStr = lastMessagesContext.join("\n");
    const roleAs = senderType === 'Cliente' ? 'Vendedor/Produtor' : 'Cliente/Comprador';
    
    const prompt = `Você é um utilizador do aplicativo de e-commerce angolano "Mercado AO". 
Você está a simular as mensagens em tempo real de uma conversa de chat sobre o pedido #${orderId.substring(6,12)} do produto "${productName}".

Você deve responder da perspetiva de um ${roleAs} (Angolano).
Se você for o Vendedor/Produtor: Seja extremamente atencioso, confirme os dados de entrega em Luanda, explique a taxa por bairro e diga que o entregador vai ligar quando estiver a caminho para receber o dinheiro ou confirmar a transferência Express no ato.
Se você for o Cliente/Comprador: Questione sobre quando chega o produto, confirme que tem o dinheiro em KWanzas em mãos ou se pode transferir via Express no momento de entrega no bairro de destino. Use um sotaque local angolano amigável ("fixe", "ta bom", "estamos juntos").

Contexto da conversa recente:
${contextStr}

Por favor, gere APENAS a próxima mensagem direta curta que o ${roleAs} responderia neste chat. Sem introduções vazias do tipo "Vendedor diz:".`;

    const result = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt
    });
    return result.text.trim() || "Estou a verificar esta questão agora mesmo, estamos juntos!";
  } catch (error) {
    console.error("Gemini chat simulation error:", error);
    return senderType === 'Cliente' ? "Olá, sim! Vou preparar a sua encomenda imediatamente e mantê-lo informado sobre a entrega do motoboy." : "Agradeço! Estarei atento ao telemóvel para receber o produto.";
  }
}
