import axios from 'axios';

/**
 * Builds a modern, responsive HTML email template for change notifications.
 *
 * @param {Object} params
 * @param {string} params.title - Page or monitor title
 * @param {string} params.url - Monitored website URL
 * @param {string} params.summary - AI-generated Turkish summary of the change
 * @param {string|null} [params.calendarUrl] - Google Calendar "Add to Calendar" link
 * @param {Object|null} [params.eventDetails] - Extracted event info (title, startDate, etc.)
 * @returns {string} Fully styled HTML string
 */
export function buildEmailHtml({
  title,
  url,
  summary,
  calendarUrl = null,
  eventDetails = null
}) {
  const calendarButtonHtml = calendarUrl
    ? `
      <div style="margin: 28px 0; text-align: center;">
        <a href="${calendarUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 600; font-size: 15px; padding: 14px 28px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
          📅 Google Takvim'e Ekle
        </a>
        ${eventDetails?.startDate ? `<p style="margin-top: 8px; font-size: 12px; color: #64748b;">Etkinlik / Son Tarih: <strong>${eventDetails.startDate}</strong></p>` : ''}
      </div>
    `
    : '';

  return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Anımsatıcı Bildirimi</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <!-- Üst Başlık -->
    <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 24px 32px; color: #ffffff;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 24px;">🔔</span>
        <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">Anımsatıcı</h1>
      </div>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">Takip ettiğiniz sayfada yeni bir güncelleme tespit edildi.</p>
    </div>

    <!-- İçerik Alanı -->
    <div style="padding: 32px;">
      <div style="margin-bottom: 20px;">
        <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">Takip Edilen Sayfa</span>
        <h2 style="margin: 4px 0 0 0; font-size: 18px; color: #0f172a; font-weight: 600;">${title || 'Web Sayfası'}</h2>
        <a href="${url}" target="_blank" style="font-size: 13px; color: #2563eb; text-decoration: none; word-break: break-all;">${url}</a>
      </div>

      <!-- Yapay Zeka Özeti -->
      <div style="background-color: #f1f5f9; border-left: 4px solid #2563eb; border-radius: 4px 8px 8px 4px; padding: 16px 20px; margin: 24px 0;">
        <div style="font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
          <span>✨</span> Yapay Zeka Özeti
        </div>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #1e293b;">${summary}</p>
      </div>

      <!-- Google Takvim Butonu (Varsa) -->
      ${calendarButtonHtml}

      <!-- Orijinal Sayfa Butonu -->
      <div style="text-align: center; margin-top: 24px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
        <a href="${url}" target="_blank" style="font-size: 13px; color: #64748b; text-decoration: underline;">
          Orijinal Sayfayı Görüntüle ↗
        </a>
      </div>
    </div>

    <!-- Alt Bilgi (Footer) -->
    <div style="background-color: #f8fafc; padding: 16px 32px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
      Bu bildirim, Anımsatıcı akıllı web takip asistanı tarafından otomatik olarak gönderilmiştir.
    </div>

  </div>
</body>
</html>
  `.trim();
}

/**
 * Sends a change notification email to the user.
 * If RESEND_API_KEY is configured, sends via Resend API.
 * If not, logs the email details cleanly for testing/preview mode.
 *
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.title - Page title
 * @param {string} params.url - Monitored URL
 * @param {string} params.summary - AI summary
 * @param {string|null} [params.calendarUrl] - Google Calendar template link
 * @param {Object|null} [params.eventDetails] - Extracted event info
 * @param {string} [params.apiKey] - Resend API key (defaults to process.env.RESEND_API_KEY)
 * @returns {Promise<{ success: boolean, mode: 'sent'|'preview', id?: string }>}
 */
export async function sendChangeNotification({
  to,
  title,
  url,
  summary,
  calendarUrl = null,
  eventDetails = null,
  apiKey = process.env.RESEND_API_KEY
}) {
  if (!to) {
    throw new Error('Recipient email (to) is required.');
  }

  const emailHtml = buildEmailHtml({
    title,
    url,
    summary,
    calendarUrl,
    eventDetails
  });

  const subject = `🔔 [Anımsatıcı] ${title || 'Sayfa'} Güncellemesi Bildirimi`;

  // Eğer RESEND_API_KEY varsa gerçek e-posta gönderimi yap
  if (apiKey) {
    try {
      const response = await axios.post(
        'https://api.resend.com/emails',
        {
          from: 'Anımsatıcı <onboarding@resend.dev>',
          to: [to],
          subject,
          html: emailHtml
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        mode: 'sent',
        id: response.data.id
      };
    } catch (error) {
      const errDetail = error.response?.data?.message || error.message;
      throw new Error(`Failed to send email via Resend: ${errDetail}`);
    }
  }

  // API Key henüz girilmediyse: Önizleme / Test Modu
  console.log(`\n📧 [EMAIL TEST MODU] Kime: ${to}`);
  console.log(`   Konu: ${subject}`);
  console.log(`   Özet: ${summary}`);
  if (calendarUrl) {
    console.log(`   📅 Takvim Butonu Linki: ${calendarUrl}`);
  }
  console.log('   ℹ️ (Gerçek gönderim için .env dosyasına RESEND_API_KEY eklenebilir)\n');

  return {
    success: true,
    mode: 'preview',
    subject,
    html: emailHtml
  };
}
