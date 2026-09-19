import { GoogleGenAI, Type } from '@google/genai';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function analyzeChangeWithAI({
  newText,
  oldText = '',
  pageTitle = '',
  url = '',
  currentDate = new Date().toISOString().split('T')[0],
  apiKey = process.env.GEMINI_API_KEY,
  model = 'gemini-3.6-flash'
}) {
  if (!apiKey) {
    throw new Error('Gemini API key is required. Please set GEMINI_API_KEY.');
  }

  if (!newText || typeof newText !== 'string') {
    throw new Error('New page text is required for AI analysis.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
Sen "KampüsRadar" adlı akıllı öğrenci ve genç yazılımcı fırsat asistanının yapay zeka motorusun.
Görevin: Bir web sayfasının yeni içeriğini (ve varsa eski içeriğini) inceleyip, sayfada üniversite öğrencileri ve geliştiricilerin bilmesi gereken gerçek ve önemli bir duyuru, etkinlik, hackathon, staj, burs veya son başvuru tarihi olup olmadığını tespit etmek.

Kurallar:
1. Gürültüyü Yoksay: Sayaçlar, telif tarihleri, rastgele menü sıralamaları, reklamlar gibi teknik değişimleri 'önemli değişiklik' (hasSignificantChange = false) sayma.
2. Özet: Eğer önemli bir duyuru/etkinlik varsa, bunu 1-3 cümleyle samimi ve net bir Türkçe ile özetle (changeSummary).
3. Etkinlik / Tarih Tespiti:
   - Eğer yeni duyuruda bir etkinlik, seminer, hackathon, sınav, burs veya son başvuru tarihi varsa (hasEvent = true), kesin tarih bilgilerini çıkar.
   - Referans Bugünün Tarihi: "${currentDate}". Tarihlerde "bu cuma", "ayın 24'ü" gibi ifadeleri kesin ISO 8601 (YYYY-MM-DD veya YYYY-MM-DDTHH:mm:ss) formatına dönüştür.
   - Net bir etkinlik/tarih YOKSA, hasEvent = false yap.
`.trim();

  const prompt = `
Sayfa Başlığı: ${pageTitle || 'Bilinmiyor'}
Hedef URL: ${url || 'Bilinmiyor'}
Referans Tarih: ${currentDate}

${oldText ? `--- ÖNCEKİ İÇERİK (ÖZET/KESİT) ---\n${oldText.slice(0, 3000)}\n\n` : ''}
--- GÜNCEL SAYFA İÇERİĞİ ---
${newText.slice(0, 8000)}

Yukarıdaki içeriği analiz et ve JSON şemasına uygun yanıt ver.
`.trim();

  const maxAttempts = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hasSignificantChange: { type: Type.BOOLEAN },
              changeSummary: { type: Type.STRING },
              hasEvent: { type: Type.BOOLEAN },
              eventDetails: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  startDate: { type: Type.STRING },
                  endDate: { type: Type.STRING },
                  isAllDay: { type: Type.BOOLEAN },
                  description: { type: Type.STRING }
                }
              }
            },
            required: ['hasSignificantChange', 'changeSummary', 'hasEvent']
          }
        }
      });

      const responseText = response.text?.trim() || '{}';
      return JSON.parse(responseText);
    } catch (err) {
      lastError = err;
      const isTransient = err.status === 503 || err.status === 429 || err.message?.includes('503') || err.message?.includes('UNAVAILABLE');
      if (isTransient && attempt < maxAttempts) {
        const delayMs = attempt * 2000;
        console.warn(`[Gemini Retry] ${attempt}/${maxAttempts} deneme geçici hata aldı (${err.message}). ${delayMs}ms sonra tekrar denenecek.`);
        await sleep(delayMs);
        continue;
      }
      throw new Error(`Gemini AI analysis failed: ${err.message}`);
    }
  }

  throw lastError;
}
