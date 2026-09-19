import { GoogleGenAI, Type } from '@google/genai';

/**
 * Analyzes web page changes using Google Gemini.
 * Detects whether the change is significant (ignoring noise/ads),
 * generates a Turkish summary, and extracts event/deadline details if present.
 *
 * @param {Object} params
 * @param {string} params.newText - Current clean page text
 * @param {string} [params.oldText=''] - Previous clean page text (if any)
 * @param {string} [params.pageTitle=''] - Web page title
 * @param {string} [params.url=''] - Target page URL
 * @param {string} [params.currentDate] - Reference date in YYYY-MM-DD format (defaults to today)
 * @param {string} [params.apiKey] - Gemini API Key (defaults to process.env.GEMINI_API_KEY)
 * @param {string} [params.model='gemini-3.6-flash'] - Gemini model name
 * @returns {Promise<{
 *   hasSignificantChange: boolean,
 *   changeSummary: string,
 *   hasEvent: boolean,
 *   eventDetails: {
 *     title: string,
 *     startDate: string,
 *     endDate: string,
 *     isAllDay: boolean,
 *     description: string
 *   }
 * }>}
 */
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
    throw new Error('Gemini API key is required. Please set GEMINI_API_KEY in your environment or .env file.');
  }

  if (!newText || typeof newText !== 'string') {
    throw new Error('New page text is required for AI analysis.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
Sen "Anımsatıcı" adlı web takip asistanının yapay zeka motorusun.
Görevin: Bir web sayfasının yeni içeriğini (ve varsa eski içeriğini) inceleyip, sayfada kullanıcının bilmesi gereken gerçek ve önemli bir değişiklik/duyuru/etkinlik olup olmadığını tespit etmek.

Kurallar:
1. Gürültüyü Yoksay: Sayaçlar, telif tarihleri, rastgele menü sıralamaları, reklamlar gibi önemsiz teknik değişimleri 'önemli değişiklik' (hasSignificantChange = false) sayma.
2. Özet: Eğer önemli bir duyuru/etkinlik/değişim varsa, bunu kullanıcıya 1-3 cümleyle samimi ve anlaşılır bir Türkçe ile özetle (changeSummary).
3. Etkinlik / Tarih Tespiti:
   - Eğer yeni duyuruda bir etkinlik, seminer, konser, sınav, burs veya son başvuru tarihi varsa (hasEvent = true), kesin tarih bilgilerini çıkar.
   - Referans Bugünün Tarihi: "${currentDate}". Tarihlerde "bu cuma", "haftaya salı", "ayın 24'ü" gibi ifadeler geçerse bu referans tarihe göre kesin ISO 8601 (YYYY-MM-DD veya YYYY-MM-DDTHH:mm:ss) formatına dönüştür.
   - Yalnızca gün belirtilmişse (saat yoksa), isAllDay = true yap ve startDate için YYYY-MM-DD formatını kullan.
   - Eğer net bir etkinlik/tarih YOKSA, hasEvent = false yap ve eventDetails alanlarını boş bırak.
`.trim();

  const userPrompt = `
Sayfa Başlığı: ${pageTitle || 'Belirtilmedi'}
Sayfa URL: ${url || 'Belirtilmedi'}
Bugünün Tarihi: ${currentDate}

${oldText ? `--- ESKİ İÇERİK ---\n${oldText.slice(0, 4000)}\n\n` : ''}
--- YENİ İÇERİK ---
${newText.slice(0, 5000)}
`.trim();

  const response = await ai.models.generateContent({
    model,
    contents: userPrompt,
    config: {
      systemInstruction,
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseJsonSchema: {
        type: Type.OBJECT,
        properties: {
          hasSignificantChange: {
            type: Type.BOOLEAN,
            description: 'True if there is a meaningful new announcement, event, deadline or change. False if trivial noise or no real change.'
          },
          changeSummary: {
            type: Type.STRING,
            description: 'Concise Turkish summary of the change or announcement. Empty string if hasSignificantChange is false.'
          },
          hasEvent: {
            type: Type.BOOLEAN,
            description: 'True if a specific upcoming event, deadline, seminar, or date is detected.'
          },
          eventDetails: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'Title of the event or deadline'
              },
              startDate: {
                type: Type.STRING,
                description: 'ISO 8601 date string (e.g. 2026-10-24 or 2026-10-24T14:00:00)'
              },
              endDate: {
                type: Type.STRING,
                description: 'ISO 8601 end date string, or empty string if not mentioned'
              },
              isAllDay: {
                type: Type.BOOLEAN,
                description: 'True if no specific hour was specified (all-day event or deadline day)'
              },
              description: {
                type: Type.STRING,
                description: 'Brief description for the calendar event'
              }
            },
            propertyOrdering: ['title', 'startDate', 'endDate', 'isAllDay', 'description']
          }
        },
        propertyOrdering: ['hasSignificantChange', 'changeSummary', 'hasEvent', 'eventDetails']
      }
    }
  });

  if (!response.text) {
    throw new Error('Empty response received from Gemini API.');
  }

  const result = JSON.parse(response.text);
  return result;
}
