// =============================================================================
// /api/notify.ts — Vercel Serverless Function
// Envía notificación a grupo de Telegram cuando se agenda una cita
// =============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = '-5597843175';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo aceptar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { patientName, patientPhone, service, date, time, status } = req.body;

  // Validar campos requeridos
  if (!patientName || !service || !date || !time) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  const statusEmoji = status === 'confirmed' ? '✅ CONFIRMADA' : '⏳ PENDIENTE';
  const message = `
🏥 *Nueva Cita - ProPhysical*

${statusEmoji}

👤 *Paciente:* ${patientName}
📱 *Teléfono:* ${patientPhone || 'No proporcionado'}
🩺 *Servicio:* ${service}
📅 *Fecha:* ${date}
🕐 *Hora:* ${time}

_Revisa el panel administrativo para más detalles._
`.trim();

  try {
    const response = await fetch(TELEGRAM_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('Telegram API error:', data);
      return res.status(500).json({ error: 'Error enviando notificación', details: data });
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error en notify.ts:', error);
    return res.status(500).json({ error: error.message });
  }
}
