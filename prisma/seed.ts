import { PrismaPg } from '@prisma/adapter-pg'

import { TOP_100_STOCKS } from '../src/data/top100-stocks'
import { PrismaClient } from '../src/generated/prisma/client.js'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding Bursa Top 100 universe...')

  await prisma.dailyPrice.deleteMany()
  await prisma.syncRun.deleteMany()
  await prisma.stock.deleteMany()

  const result = await prisma.stock.createMany({
    data: TOP_100_STOCKS,
  })

  console.log(`Seeded ${result.count} tracked stocks`)
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
