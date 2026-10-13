// 로컬 개발 환경용 .env.local 자동 로드
if (!process.env.RESEND_API_KEY) {
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.substring(0, eqIdx).trim();
            const val = trimmed.substring(eqIdx + 1).trim();
            if (!process.env[key]) process.env[key] = val;
          }
        }
      });
    }
  } catch (e) {
    // ignore
  }
}

module.exports = async function handler(req, res) {
  // CORS 및 메서드 제어
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 지원합니다.' });
  }

  const { type, name, contact, schedule, content } = req.body || {};

  if (!name || !contact || !content) {
    return res.status(400).json({ error: '필수 항목(성함, 회신 연락처, 문의 내용)을 입력해 주세요.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.RESEND_TO_EMAIL || 'jinkimmmmmmmmmm@gmail.com';
  const fromEmail = process.env.RESEND_FROM_EMAIL || '김희진 강사 포트폴리오 <onboarding@resend.dev>';

  if (!apiKey) {
    return res.status(500).json({
      error: 'RESEND_API_KEY 환경변수가 설정되지 않았습니다. Vercel 환경 변수 설정을 확인해 주세요.',
    });
  }

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 620px; margin: 0 auto; padding: 28px; border: 1px solid #DED8CB; border-radius: 8px; background-color: #FAF7F1; color: #111827;">
      <div style="margin-bottom: 22px; border-bottom: 2px solid #8B5CF6; padding-bottom: 14px;">
        <span style="display: inline-block; font-size: 11px; font-weight: 800; color: #8B5CF6; letter-spacing: 0.1em; text-transform: uppercase;">PORTFOLIO INQUIRY</span>
        <h2 style="color: #111111; margin: 6px 0 0 0; font-size: 22px; font-weight: 800;">웹사이트에서 새로운 문의가 접수되었습니다</h2>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px;">
        <tr style="border-bottom: 1px dashed #DED8CB;">
          <td style="padding: 10px 8px; font-weight: 700; width: 130px; color: #52504A;">문의 구분</td>
          <td style="padding: 10px 8px; color: #111827; font-weight: 700;">${type || '일반 문의'}</td>
        </tr>
        <tr style="border-bottom: 1px dashed #DED8CB; background-color: rgba(239, 234, 224, 0.45);">
          <td style="padding: 10px 8px; font-weight: 700; color: #52504A;">성함 / 기관(기업)명</td>
          <td style="padding: 10px 8px; color: #111827;">${name}</td>
        </tr>
        <tr style="border-bottom: 1px dashed #DED8CB;">
          <td style="padding: 10px 8px; font-weight: 700; color: #52504A;">회신 연락처</td>
          <td style="padding: 10px 8px; color: #111827; font-weight: 600;">${contact}</td>
        </tr>
        <tr style="border-bottom: 1px dashed #DED8CB; background-color: rgba(239, 234, 224, 0.45);">
          <td style="padding: 10px 8px; font-weight: 700; color: #52504A;">희망 일정 및 대상</td>
          <td style="padding: 10px 8px; color: #111827;">${schedule || '협의 가능 / 미입력'}</td>
        </tr>
      </table>

      <div style="margin-top: 24px;">
        <h4 style="margin: 0 0 10px 0; color: #111111; font-size: 15px; font-weight: 700;">상세 문의 내용</h4>
        <div style="padding: 18px; background-color: #FFFFFF; border: 1px solid #DED8CB; border-radius: 6px; white-space: pre-wrap; line-height: 1.7; font-size: 14.5px; color: #111827;">${content}</div>
      </div>

      <div style="margin-top: 28px; padding-top: 16px; border-top: 1px dashed #DED8CB; font-size: 12px; color: #716F68; text-align: center;">
        김희진 강사 웹사이트(포트폴리오) 문의 양식을 통해 자동 발송된 알림 메일입니다.
      </div>
    </div>
  `;

  try {
    const isEmail = typeof contact === 'string' && contact.includes('@') && contact.includes('.');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: isEmail ? contact.trim() : undefined,
        subject: `[웹사이트 문의] ${type || '문의'} - ${name}님`,
        html: htmlContent,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || '이메일 전송에 실패했습니다.',
      });
    }

    return res.status(200).json({ success: true, id: data.id });
  } catch (err) {
    return res.status(500).json({
      error: err.message || '서버 오류가 발생했습니다.',
    });
  }
};
