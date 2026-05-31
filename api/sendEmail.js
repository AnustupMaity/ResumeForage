export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { template, templateParams } = req.body;
  
  if (!template || !templateParams) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  
  let actualTemplateId;
  if (template === 'admin') {
    actualTemplateId = process.env.EMAILJS_ADMIN_TEMPLATE;
  } else if (template === 'user') {
    actualTemplateId = process.env.EMAILJS_USER_TEMPLATE;
  } else {
    return res.status(400).json({ error: 'Invalid template specified.' });
  }

  if (!serviceId || !publicKey || !actualTemplateId) {
    console.error('EmailJS environment variables are missing.');
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: actualTemplateId,
        user_id: publicKey,
        template_params: templateParams
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('EmailJS Error:', text);
      return res.status(500).json({ error: 'Failed to send email.' });
    }
    
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Error communicating with EmailJS:', error);
    return res.status(500).json({ error: 'An error occurred while sending the email.' });
  }
}
