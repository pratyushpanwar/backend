//xmodmap -e "keycode 82 = equal"

import dotenv from 'dotenv'
dotenv.config({ path: './.env'})

import connectDB from './db/index.js';
import { app } from './app.js';



connectDB()
.then(() => {
    app.on("error", (error)=> {
        console.log("ERROR: ", error)
        throw error;
    })
    app.listen(process.env.PORT || 8000, ()=> {
        console.log(`Server is runnning on port: ${process.env.PORT}`)
    })
})
.catch((err)=> {
    console.log('MONGO bd connection failed !!!', err)
})