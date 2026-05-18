import 'dotenv/config'
import { createApp } from './app'

const port = process.env.PORT || 4003
const app = createApp()

app.listen(port, () => {
    console.log(`Recipe Manager API is listening on http://localhost:${port}`)
})