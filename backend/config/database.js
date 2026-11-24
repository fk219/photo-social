const mongoose = require('mongoose')

const connectToDb = () => {
    return mongoose.connect(process.env.MONGO_URI).then(()=> {
        console.log("Database is Connected")
    })
}

module.exports = connectToDb