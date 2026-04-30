import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini Setup
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  // API Routes
  app.post("/api/process-news", async (req, res) => {
    const { rawText, mode } = req.body;
    
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
      const result = await genAI.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
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
      
      res.json(JSON.parse(result.text || "[]"));
    } catch (error) {
      console.error("News processing error:", error);
      res.status(500).json({ error: "Haberler işlenirken bir hata oluştu." });
    }
  });

  app.post("/api/generate-news", async (req, res) => {
    const { topic } = req.body;

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
      const result = await genAI.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
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

      res.json(JSON.parse(result.text || "[]"));
    } catch (error) {
      console.error("News generation error:", error);
      res.status(500).json({ error: "Haber üretilirken bir hata oluştu." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
