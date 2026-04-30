import { GoogleGenAI, Type } from "@google/genai";

export interface ProcessedNews {
  id: string;
  originalHeadline: string;
  formattedHeadline: string;
  spot: string;
  content: string;
  subheadings: string[];
}

export type ProcessMode = 'meta' | 'full';

// Initialize Gemini with the API key from environment
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const NEWS_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      originalHeadline: { type: Type.STRING },
      formattedHeadline: { type: Type.STRING },
      spot: { type: Type.STRING },
      subheadings: { type: Type.ARRAY, items: { type: Type.STRING } },
      content: { type: Type.STRING }
    },
    required: ["id", "originalHeadline", "formattedHeadline", "spot", "subheadings", "content"]
  }
};

export async function processNewsBatch(rawText: string, mode: ProcessMode = 'meta'): Promise<ProcessedNews[]> {
  try {
    const prompt = `
      Aşağıdaki haber metinlerini profesyonel bir haber editörü gibi düzenle. 
      Haberleri birbirinden ayır ve HER BİRİ İÇİN şu kuralları uygula:

      KURALLAR:
      1. ANA BAŞLIK: Haberin içeriğine uygun, çok dikkat çekici ve tamamen YENİDEN YAZILMIŞ özgün bir başlık oluştur. Cümle düzeni (Sadece ilk harf büyük).
      2. SPOT: Haberi özetleyen, merak uyandıran, profesyonel bir spot metni oluştur.
      3. ARA BAŞLIKLAR: En az 3 adet, tamamen YENİDEN ÜRETİLMİŞ ara başlık belirle. 
      4. İÇERİK YAPISI (${mode === 'meta' ? 'METİN KORUMA' : 'TAMAMEN YENİDEN YAZIM'}):
         ${mode === 'meta' 
           ? '- Orijinal haber içeriğini koru ancak bu içeriği yukarıda ürettiğin ARA BAŞLIKLARLA böl.' 
           : '- Haber içeriğini tamamen özgün ve profesyonel bir dille YENİDEN YAZ. Ürettiğin ARA BAŞLIKLARI bu yeni metnin içine yerleştir.'}
         - Her ara başlıktan önce ve sonra 2 satır boşluk bırak.
         - Ara başlıklar TAMAMI BÜYÜK HARFLERLE yazılmalıdır.
      
      ÖNEMLİ: Çıktı "content" alanı, ara başlıkların içine enjekte edildiği tam metin olmalıdır.
      DÜZENLENECEK METİNLER:
      ${rawText}
    `;

    const result = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: NEWS_SCHEMA
      }
    });

    const text = result.text;
    if (!text) throw new Error("Yapay zekadan boş yanıt geldi.");
    return JSON.parse(text);
  } catch (error: any) {
    console.error("News processing error:", error.message || error);
    throw error;
  }
}

export async function generateNews(topic: string): Promise<ProcessedNews[]> {
  try {
    const prompt = `
      Konu: ${topic}
      Hakkında profesyonel, kapsamlı ve ilgi çekici bir haber üret.
      
      KURALLAR:
      1. ANA BAŞLIK: Çok dikkat çekici, merak uyandıran özgün bir başlık oluştur.
      2. SPOT: Haberi özetleyen ve okumaya teşvik eden etkileyici bir spot metni.
      3. ARA BAŞLIKLAR: Haber içeriğini mantıklı bölümlere ayıran en az 3 adet yaratıcı ara başlık.
      4. İÇERİK YAPISI: 
         - Tüm haber metnini ara başlıklarla bölerek oluştur. 
         - Her ara başlıktan önce ve sonra 2 satır boşluk bırak.
         - Ara başlıklar TAMAMI BÜYÜK HARFLERLE ve metnin akışına uygun yerlerde olmalıdır.
         - Haber dili profesyonel ajans (AA, İHA, Reuters) üslubunda olmalıdır.
      
      ÖNEMLİ: Çıktı "content" alanı, ara başlıkların tüm metin içine enjekte edildiği tam haber metni olmalıdır.
      Array formatında döndür.
    `;

    const result = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: NEWS_SCHEMA
      }
    });

    const text = result.text;
    if (!text) throw new Error("Yapay zekadan boş yanıt geldi.");
    return JSON.parse(text);
  } catch (error: any) {
    console.error("News generation error:", error.message || error);
    throw error;
  }
}

