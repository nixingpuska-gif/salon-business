import { Router, Request, Response } from 'express';
import { VKService } from '../services/vk';
import { botManager } from '../services/botManager';

const router = Router();

/**
 * Webhook endpoint for VK Callback API
 */
router.post('/vk/webhook/:salonId', async (req: Request, res: Response) => {
  try {
    const { salonId } = req.params;
    const { type, secret, object } = req.body;

    // Get bot for this salon
    const vkBot = await botManager.getVKBot(salonId);

    if (!vkBot) {
      console.error(`VK bot not configured for salon: ${salonId}`);
      return res.status(404).json({ error: 'Bot not configured' });
    }

    // Verify secret key
    if (secret !== vkBot['config'].secretKey) {
      console.error('Invalid VK secret key');
      return res.status(403).send('Forbidden');
    }

    // Handle confirmation
    if (type === 'confirmation') {
      return res.status(200).send(vkBot['config'].confirmationToken);
    }

    // Handle new message
    if (type === 'message_new') {
      await handleVKMessage(salonId, vkBot, object.message);
      return res.status(200).send('ok');
    }

    // Handle other events
    res.status(200).send('ok');
  } catch (error) {
    console.error('VK webhook error:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * Handle incoming VK message
 */
async function handleVKMessage(salonId: string, vkBot: VKService, message: any) {
  const userId = message.from_id;
  const text = message.text;

  if (!text) {
    return;
  }

  console.log(`VK message from ${userId} to salon ${salonId}: ${text}`);

  // Get user info
  const userInfo = await vkBot.getUserInfo(userId);

  // TODO: Process message and create booking
  // For now, send auto-reply
  await vkBot.sendMessage(
    userId,
    `Здравствуйте, ${userInfo.first_name}! 👋\n\nСпасибо за сообщение. Наш менеджер свяжется с вами в ближайшее время.`
  );
}

export default router;
