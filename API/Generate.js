export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pillar, tema, tono } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key no configurada' });
  }

  if (!tema || !pillar || !tono) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  const pillars = {
    riesgos: 'Riesgos No Vistos',
    decisiones: 'Decisiones Estratégicas',
    metodo: 'Método CÚSPIDE',
    senales: 'Señales de Alerta'
  };

  const prompt = `Crea contenido para redes sociales de Cúspide Risk & Security Consulting, consultoría de riesgos e inteligencia empresarial.

PILAR: ${pillars[pillar]}
TEMA: ${tema}
TONO: ${tono}

REGLAS:
- Titular: máx 12 palabras, impactante
- Descripción: máx 60 palabras, directa
- CTA: 1 línea clara
- Hashtags: 6-8 relevantes
- Sin datos de clientes reales
- Lenguaje profesional ejecutivo

Responde SOLO así, sin explicaciones:

TITULAR: [texto]
DESCRIPCION: [texto]
CTA: [texto]
HASHTAGS: [hashtags]`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json({ error: error.error?.message || 'Error en API' });
    }

    const data = await response.json();
    const text = data.content[0].text;

    const parsed = { titular: '', descripcion: '', cta: '', hashtags: '' };
    const lines = text.split('\n');
    let currentKey = null;

    lines.forEach(line => {
      if (line.startsWith('TITULAR:')) {
        currentKey = 'titular';
        parsed[currentKey] = line.replace('TITULAR:', '').trim();
      } else if (line.startsWith('DESCRIPCION:')) {
        currentKey = 'descripcion';
        parsed[currentKey] = line.replace('DESCRIPCION:', '').trim();
      } else if (line.startsWith('CTA:')) {
        currentKey = 'cta';
        parsed[currentKey] = line.replace('CTA:', '').trim();
      } else if (line.startsWith('HASHTAGS:')) {
        currentKey = 'hashtags';
        parsed[currentKey] = line.replace('HASHTAGS:', '').trim();
      } else if (currentKey && line.trim()) {
        parsed[currentKey] += ' ' + line.trim();
      }
    });

    Object.keys(parsed).forEach(k => { parsed[k] = parsed[k].trim(); });

    return res.status(200).json({ success: true, ...parsed });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
