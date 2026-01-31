import { Router, Request, Response } from 'express';
import { MAXService } from '../services/max';
import { botManager } from '../services/botManager';

const router = Router();

/**
 * Webhook endpoint for MAX messenger
 */
router.post('/max/webhook', async (req: Request, res: Response) => {
  try {
    const { salon_id, event, user, message } = req.body;

    if (!salon_id) {
      return res.status(400).json({ error: 'salon_id required' });
    }

    // Get bot for this salon
    const maxBot = await botManager.getMAXBot(salon_id);

    if (!maxBot) {
      console.error(`MAX bot not configured for salon: ${salon_id}`);
      return res.status(404).json({ error: 'Bot not configured' });
    }

    // Verify signature
    const signature = req.headers['x-max-signature'] as string;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    if (!maxBot.verifyWebhookSignature(signature, rawBody)) {
      console.error('Invalid MAX webhook signature');
      return res.status(403).json({ error: 'Invalid signature' });
    }

    // Handle different event types
    switch (event) {
      case 'message':
        await handleMAXMessage(salon_id, user, message);
        break;

      case 'subscription':
        await handleMAXSubscription(salon_id, user);
        break;
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('MAX webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Handle incoming MAX message
 */
async function handleMAXMessage(salonId: string, user: any, message: any) {
  if (!message || !message.text) {
    return;
  }

  console.log(`MAX message from ${user.name} to salon ${salonId}: ${message.text}`);

  const maxBot = await botManager.getMAXBot(salonId);
  if (!maxBot) return;

  // TODO: Process message and create booking
  // For now, send auto-reply
  await maxBot.sendMessage(
    user.id,
    `Здравствуйте, ${user.name}! 👋\n\nСпасибо за сообщение. Наш менеджер свяжется с вами в ближайшее время.`
  );
}

/**
 * Handle user subscription
 */
async function handleMAXSubscription(salonId: string, user: any) {
  console.log(`MAX user subscribed to salon ${salonId}: ${user.id}`);

  const maxBot = await botManager.getMAXBot(salonId);
  if (!maxBot) return;

  await maxBot.sendMessage(
    user.id,
    `Добро пожаловать! 👋\n\nВы подписались на уведомления от нашего салона.`
  );
}

export default router;
