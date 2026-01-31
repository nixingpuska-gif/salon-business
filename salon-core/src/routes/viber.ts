import { Router, Request, Response } from 'express';
import { ViberService } from '../services/viber';
import { botManager } from '../services/botManager';

const router = Router();

/**
 * Webhook endpoint for Viber
 */
router.post('/viber/webhook/:salonId', async (req: Request, res: Response) => {
  try {
    const { salonId } = req.params;

    // Get bot for this salon
    const viberBot = await botManager.getViberBot(salonId);

    if (!viberBot) {
      console.error(`Viber bot not configured for salon: ${salonId}`);
      return res.status(404).json({ error: 'Bot not configured' });
    }

    // Verify signature
    const signature = req.headers['x-viber-content-signature'] as string;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    if (!viberBot.verifyWebhookSignature(signature, rawBody)) {
      console.error('Invalid Viber webhook signature');
      return res.status(403).send('Invalid signature');
    }

    const { event, sender, message } = req.body;

    // Handle different event types
    switch (event) {
      case 'webhook':
        // Webhook verification
        return res.status(200).send('ok');

      case 'subscribed':
        // User subscribed to bot
        await handleViberSubscription(salonId, viberBot, sender);
        break;

      case 'message':
        // New message from user
        await handleViberMessage(salonId, viberBot, sender, message);
        break;

      case 'conversation_started':
        // Conversation started
        await handleViberConversationStart(salonId, viberBot, sender);
        break;
    }

    res.status(200).send('ok');
  } catch (error) {
    console.error('Viber webhook error:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * Handle user subscription
 */
async function handleViberSubscription(salonId: string, viberBot: ViberService, sender: any) {
  console.log(`Viber user subscribed to salon ${salonId}: ${sender.id}`);

  await viberBot.sendMessage(
    sender.id,
    `Добро пожаловать! 👋\n\nВы подписались на уведомления от нашего салона красоты.`
  );
}

/**
 * Handle incoming message
 */
async function handleViberMessage(salonId: string, viberBot: ViberService, sender: any, message: any) {
  if (!message || message.type !== 'text') {
    return;
  }

  console.log(`Viber message from ${sender.name} to salon ${salonId}: ${message.text}`);

  // TODO: Process message and create booking
  // For now, send auto-reply
  await viberBot.sendMessage(
    sender.id,
    `Здравствуйте, ${sender.name}! 👋\n\nСпасибо за сообщение. Наш менеджер свяжется с вами в ближайшее время.`
  );
}

/**
 * Handle conversation start
 */
async function handleViberConversationStart(salonId: string, viberBot: ViberService, sender: any) {
  console.log(`Viber conversation started for salon ${salonId}: ${sender.id}`);

  await viberBot.sendMessage(
    sender.id,
    `Здравствуйте! 👋\n\nДобро пожаловать в наш салон красоты. Чем могу помочь?`
  );
}

export default router;
