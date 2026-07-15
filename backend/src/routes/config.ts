import { Router } from 'express';
import { prisma } from '../db/prisma';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get(
  '/map-provider',
  asyncHandler(async (req, res) => {
    const activeProvider = await prisma.mapProviderConfig.findFirst({
      where: { isActive: true },
    });

    if (!activeProvider) {
      res.json({
        success: true,
        data: {
          providerName: 'osm',
          apiKey: null,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        providerName: activeProvider.providerName,
        apiKey: activeProvider.providerName === 'google' ? activeProvider.apiKey : null,
      },
    });
  })
);

export default router;
