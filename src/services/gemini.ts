import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ProcessedNews {
  id: string;
  originalHeadline: string;
  formattedHeadline: string;
  spot: string;
  content: string;
  subheadings: string[];
}

export type ProcessMode = 'meta' | 'full';

export async function processNewsBatch(rawText: string, mode: ProcessMode = 'meta'): Promise<ProcessedNews[]> {
  const prompt = `
    Aşağıdaki haber metinlerini profesyonel bir haber editörü gibi düzenle. 
    Haberleri birbirinden ayır ve HER BİRİ İÇİN şu kuralları uygula:

    KURALLAR:
    1. ANA BAŞLIK: Haberin içeriğine uygun, çok dikkat çekici ve tamamen YENİDEN YAZILMIŞ özgün bir başlık oluştur. Sadece ilk harf ve özel isimler büyük harf olsun (Cümle düzeni).
    2. SPOT: Haberi özetleyen, merak uyandıran, profesyonel bir spot metni oluştur.
    3. ARA BAŞLIKLAR: İçerikten ilham alan ancak metinde bulunmayan, tamamen YENİDEN ÜRETİLMİŞ en az 3 adet ara başlık belirle. 
    4. İÇERİK YAPISI (${mode === 'meta' ? 'METİN KORUMA' : 'TAMAMEN YENİDEN YAZIM'}):
       ${mode === 'meta' 
         ? '- Orijinal haber içeriğini koru ancak bu içeriği yukarıda ürettiğin ARA BAŞLIKLARLA böl.' 
         : '- Haber içeriğini tamamen özgün ve profesyonel bir dille YENİDEN YAZ. Ürettiğin ARA BAŞLIKLARI bu yeni metnin içine yerleştir.'}
       - Ara başlıkları metnin içine mantıklı yerlere (paragraf aralarına) yerleştir.
       - Her ara başlıktan önce ve sonra 2 satır boşluk (\\n\\n) bırak.
       - Ara başlıklar TAMAMI BÜYÜK HARFLERLE yazılmalıdır.
    
    ÖNEMLİ: 
    - Çıktıdaki "content" alanı, ara başlıkların içine enjekte edildiği son yayın formatı olmalıdır.
    - Tüm metinlerde profesyonel haber dili kullanılmalı ve TÜRKÇE karakter kurallarına (i-İ, ı-I ayrımı dahil) tam uyulmalıdır.
    - Başlıklar ve spotlar tamamen özgün ("rewritten") olmalıdır.
    
    DÜZENLENECEK HABERLER:
    ${rawText}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              originalHeadline: { type: Type.STRING },
              formattedHeadline: { type: Type.STRING },
              spot: { type: Type.STRING },
              subheadings: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              content: { type: Type.STRING, description: "Ara başlıkların içine enjekte edildiği tam metin" }
            },
            required: ["id", "originalHeadline", "formattedHeadline", "spot", "subheadings", "content"]
          }
        }
      }
    });
    
    let responseText = response.text || "";
    return parseJSON(responseText);
  } catch (error) {
    console.error("News processing error:", error);
    throw error;
  }
}

export async function generateNews(topic: string): Promise<ProcessedNews[]> {
  const prompt = `
    Aşağıdaki konu veya anahtar kelimeler hakkında profesyonel, kapsamlı bir haber üret:
    Konu: ${topic}

    KURALLAR:
    1. ANA BAŞLIK: Çok dikkat çekici, profesyonel bir başlık. (Cümle düzeni: Sadece ilk harf ve özel isimler büyük).
    2. SPOT: Haberi özetleyen, merak uyandıran etkileyici bir spot metni.
    3. ARA BAŞLIKLAR: En az 3 adet, haberin farklı bölümlerini temsil eden yaratıcı ara başlık belirle.
    4. İÇERİK YAPISI: 
       - Konu hakkında detaylı, gerçekçi ve profesyonel bir haber metni yaz.
       - Belirlediğin ARA BAŞLIKLARI metnin içine mantıklı yerlere (paragraf aralarına) yerleştir.
       - Her ara başlıktan önce ve sonra 2 satır boşluk (\\n\\n) bırak.
       - Ara başlıklar TAMAMI BÜYÜK HARFLERLE yazılmalıdır.
    
    ÖNEMLİ:
    - Çıktıdaki "content" alanı, ara başlıkların içine enjekte edildiği tam metin olmalıdır.
    - Tüm Türkçe karakter kurallarına (i-İ, ı-I ayrımı dahil) tam uyulmalıdır.
    - Profesyonel bir haber ajansı dili kullanılmalıdır.
    
    ÇIKTI FORMATI: Tek bir haber olsa bile liste içinde döndür.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              originalHeadline: { type: Type.STRING, description: "Konu özeti veya boş bırakılabilir" },
              formattedHeadline: { type: Type.STRING },
              spot: { type: Type.STRING },
              subheadings: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              content: { type: Type.STRING, description: "Ara başlıkların içine enjekte edildiği tam metin" }
            },
            required: ["id", "originalHeadline", "formattedHeadline", "spot", "subheadings", "content"]
          }
        }
      }
    });

    return parseJSON(response.text || "");
  } catch (error) {
    console.error("News generation error:", error);
    throw error;
  }
}

const parseJSON = (text: string) => {
  try {
    return JSON.parse(text);
  } catch (e) {
    let fixedText = text.trim();
    fixedText = fixedText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
    
    try {
      return JSON.parse(fixedText);
    } catch (innerError) {
      const veryFixed = fixedText
        .replace(/\\([^"\\\/bfnrtu])/g, '$1')
        .replace(/[\u0000-\u001F]+/g, "");
      return JSON.parse(veryFixed);
    }
  }
};
