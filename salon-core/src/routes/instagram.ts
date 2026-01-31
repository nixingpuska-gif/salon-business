import { Router, Request, Response } from 'express';
import { InstagramService } from '../services/instagram';
import { botManager } from '../services/botManager';

const router = Router();

/**
 * Webhook verification endpoint
 */
router.get('/instagram/webhook/:salonId', async (req: Request, res: Response) => {
  try {
    const { salonId } = req.params;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Get bot for this salon
    const instagramBot = await botManager.getInstagramBot(salonId);

    if (!instagramBot) {
      console.error(`Instagram bot not configured for salon: ${salonId}`);
      return res.status(404).send('Bot not configured');
    }

    if (mode === 'subscribe' && token === instagramBot['config'].verifyToken) {
      console.log(`Instagram webhook verified for salon: ${salonId}`);
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Forbidden');
    }
  } catch (error) {
    console.error('Instagram webhook verification error:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * Webhook endpoint for Instagram messages
 */
router.post('/instagram/webhook/:salonId', async (req: Request, res: Response) => {
  try {
    const { salonId } = req.params;

    // Get bot for this salon
    const instagramBot = await botManager.getInstagramBot(salonId);

    if (!instagramBot) {
      console.error(`Instagram bot not configured for salon: ${salonId}`);
      return res.status(404).json({ error: 'Bot not configured' });
    }

    // Verify signature
    const signature = req.headers['x-hub-signature-256'] as string;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    if (!instagramBot.verifyWebhookSignature(signature, rawBody)) {
      console.error('Invalid Instagram webhook signature');
      return res.status(403).send('Invalid signature');
    }

    const { object, entry } = req.body;

    if (object !== 'instagram') {
      return res.status(400).send('Invalid object type');
    }

    // Process each entry
    for (const item of entry) {
      if (item.messaging) {
        for (const event of item.messaging) {
          await handleInstagramMessage(salonId, instagramBot, event);
        }
      }
    }

    res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error('Instagram webhook error:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * Handle incoming Instagram message
 */
async function handleInstagramMessage(salonId: string, instagramBot: InstagramService, event: any) {
  const senderId = event.sender.id;
  const message = event.message;

  if (!message || !message.text) {
    return;
  }

  console.log(`Instagram message from ${senderId} to salon ${salonId}: ${message.text}`);

  // Get user profile
  const userProfile = await instagramBot.getUserProfile(senderId);

  // TODO: Process message and create booking
  // For now, send auto-reply
  await instagramBot.sendMessage(
    senderId,
    `Здравствуйте, ${userProfile.name}! 👋\n\nСпасибо за сообщение. Наш менеджер свяжется с вами в ближайшее время.`
  );
}

export default router;
