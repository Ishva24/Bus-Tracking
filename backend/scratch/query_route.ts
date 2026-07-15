import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const routes = await prisma.route.findMany({
    where: { name: { contains: 'Salem' } },
    include: {
      routeStops: {
        orderBy: { sequence: 'asc' },
        include: { stop: true }
      }
    }
  });

  console.log('Found routes matching Salem:');
  for (const r of routes) {
    console.log(`Route: ${r.name} (${r.id})`);
    for (const rs of r.routeStops) {
      console.log(`  Stop ${rs.sequence}: ${rs.stop.name} (${rs.stop.latitude}, ${rs.stop.longitude})`);
    }
  }
}

main().catch(console.error);
