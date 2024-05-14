const express = require('express')
const cors = require('cors')
const jwt = require("jsonwebtoken")
const cookieParser = require("cookie-parser")
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://b9a11-assignment.web.app',
    'https://b9a11-assignment.firebaseapp.com',
  ],
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3187xgx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const logger = (req, res, next) => {
  console.log('log: info', req.method, req.url)
  next()
}

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  // console.log('token in the middleware : ', token)
  if (!token) {
    return res.status(401).send({ message: 'Unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'Unauthorized access' })
    }
    req.user = decoded
    next()
  })
}

const cookieOption = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" ? true : false,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const roomCollection = client.db('assignment11DB').collection('rooms')
    const confirmCollection = client.db('assignment11DB').collection('bookings')
    const reviewCollection = client.db('assignment11DB').collection('review')


    // auth related api
    app.post('/jwt', logger, async (req, res) => {
      const user = req.body;
      console.log('user for token', user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.cookie('token', token, cookieOption)
        .send({ success: true })
    })

    app.post('/logout', async (req, res) => {
      const user = req.body;
      console.log("logout", user)
      res.clearCookie('token', { ...cookieOption, maxAge: 0 }).send({ success: true })
    })


    app.get("/rooms", async (req, res) => {
      const query = await roomCollection.find().toArray()
      res.send(query)
    })
    app.get("/rooms/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await roomCollection.findOne(query)
      res.send(result)
    })



    app.put("/rooms/:id", async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updatedBooking = req.body
      console.log(updatedBooking)
      const updateDoc = {
        $set: {
          status: updatedBooking.status
        },
      };
      const result = await roomCollection.updateOne(filter, updateDoc);
      res.send(result)
    })



    // app.get('/bookings', async (req, res) => {
    //   const query = await confirmCollection.find().toArray()
    //   res.send(query)
    // })
    // app.get("/bookings/:email", async (req, res) => {
    //   const email = req.params.email;
    //   const query = { email: email }
    //   const result = await confirmCollection.find(query).toArray()
    //   res.send(result)
    // })
    app.get("/bookings", logger, verifyToken, async (req, res) => {
      console.log(req.query.email);
      // console.log('cook cookies',req.cookies)
      console.log('token owner', req.user)
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "Forbidden Access" })
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await confirmCollection.find(query).toArray();
      res.send(result);
    })

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await confirmCollection.insertOne(booking);
      res.send(result);
    });
    app.put("/bookings/:id", async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updatedDate = req.body
      console.log(updatedDate)
      const updateDoc = {
        $set: {
          startDate: updatedDate.startDate
        },
      };
      const result = await confirmCollection.updateOne(filter, updateDoc);
      res.send(result)
    })

    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await confirmCollection.deleteOne(query);
      res.send(result);
    })

    app.get('/review', async (req, res) => {
      const query = await reviewCollection.find().sort({ newdate: -1 }).toArray()
      res.send(query)
    })
    app.get("/review/:id", async (req, res) => {
      const id = req.params.id;
      const query = { id: id }
      const result = await reviewCollection.find(query).toArray()
      res.send(result)
    })
    app.post("/review", async (req, res) => {
      const query = req.body;
      console.log(query)
      const result = await reviewCollection.insertOne(query)
      res.send(result)
    })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('assignment-11 is running')
})
app.listen(port, () => {
  console.log(`assignment-11 server is running on port ${port}`)
})