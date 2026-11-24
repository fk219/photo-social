require('dotenv').config()

const app = require("./src/app")
const connectToDb = require("./config/database")
const { warmFeedCache } = require("./utils/feedCache")

const port = process.env.PORT || 3006

connectToDb()
    .then(() => {
        // Warm the guest Explore feed so the first visit after a restart does
        // not pay for the database round trips.
        return warmFeedCache()
    })
    .catch((error) => {
        console.error("Feed warm-up failed:", error.message)
    })

app.listen(port, () => {
    console.log(`Server is Running at http://localhost:${port}`)
})

