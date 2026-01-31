import { Router, Request, Response } from 'express';
import { MessengerBot, MessengerType } from '../models/MessengerBot';
import { botManager } from '../services/botManager';
import { apiKeyAuth } from '../middleware/apiAuth';

const router = Router();

/**
 * Get all bots for a salon
 */
router.get('/admin/salons/:salonId/bots', apiKeyAuth, async (req: Request, res: Response) => {
  try {
    const { salonId } = req.params;

    const bots = await MessengerBot.findAll({
      where: { salonId },
      attributes: ['id', 'messengerType', 'config', 'isActive', 'createdAt', 'updatedAt'],
    });

    res.json({ bots });
  } catch (error) {
    console.error('Failed to get bots:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create or update bot configuration
 */
router.put('/admin/salons/:salonId/bots/:messengerType', apiKeyAuth, async (req: Request, res: Response) => {
  try {
    const { salonId, messengerType } = req.params;
    const { credentials, config } = req.body;

    if (!Object.values(MessengerType).includes(messengerType as MessengerType)) {
      return res.status(400).json({ error: 'Invalid messenger type' });
    }

    const [bot, created] = await MessengerBot.upsert({
      salonId,
      messengerType: messengerType as MessengerType,
      credentials,
      config,
      isActive: true,
    });

    // Clear cache
    botManager.clearCache(salonId, messengerType as MessengerType);

    res.json({
      bot: {
        id: bot.id,
        messengerType: bot.messengerType,
        config: bot.config,
        isActive: bot.isActive,
      },
      created,
    });
  } catch (error) {
    console.error('Failed to save bot:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete bot configuration
 */
router.delete('/admin/salons/:salonId/bots/:messengerType', apiKeyAuth, async (req: Request, res: Response) => {
  try {
    const { salonId, messengerType } = req.params;

    await MessengerBot.destroy({
      where: {
        salonId,
        messengerType: messengerType as MessengerType,
      },
    });

    // Clear cache
    botManager.clearCache(salonId, messengerType as MessengerType);

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete bot:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
