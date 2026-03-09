import { runDailySync } from '../lib/stocks/service'

const targetDate = process.argv[2]

runDailySync(targetDate)
  .then((result) => {
    console.log(JSON.stringify(result, null, 2))
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
