const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000

// middleware
app.use(cors())
app.use(express.json())


const verifyJWT = (req, res, next) =>{
  const authorization = req.headers.authorization

  if(!authorization){
    return res.status(401).send({error: true, message: 'Unauthorized access'})
  }

  // bearer token
  const token = authorization.split(' ')[1]

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
    if(err){
      return res.status(401).send({error: true, message: 'Unauthorized access'})
    }

    req.decoded = decoded
    next()
  })

}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lgdhrpf.mongodb.net/?retryWrites=true&w=majority`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    const usersCollection = client.db('summerCampDB').collection('users')
    const courseCollection = client.db('summerCampDB').collection('courses')
    const bookingsCollection = client.db('summerCampDB').collection('bookings')

    // jwt
    app.post('/jwt', (req, res)=>{
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({token}) 
    })

  
  // const decodedEmail = req.decoded.email
  // if(email !== decodedEmail){
  //   return res.status(403).send({error: true, message: 'Forbidden access'})
  // }



    //get all users
    app.get('/users', async(req, res)=>{
      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    app.get('/users/:email', async (req, res)=>{
      const email = req.params.email
      console.log(email);
      const query = { email: email }
      const result =await usersCollection.find(query).toArray()
      res.send(result)
    })

    //user email save to database
      
    app.post('/users', async(req, res)=>{
      const user = req.body
      console.log(user);
      const query = {email: user.email}
      const existingUser =await usersCollection.findOne(query)
      console.log('existingUser', existingUser);
      if(existingUser){
        return res.send({message: 'user already exists'})
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })


    app.delete('/users/:id', async (req, res)=>{
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await usersCollection.deleteOne(query)
      res.send(result)
    })

    // make user admin
    app.patch('/users/admin/:id', async(req, res)=>{
      const id = req.params.id
      const filter = {_id: new ObjectId(id)}
      const updateUser = {
        $set: {
          role: 'Admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updateUser)
      res.send(result)
    })


    // make user instructor
    app.patch('/users/instructor/:id', async(req, res)=>{
      const id = req.params.id
      const filter = {_id: new ObjectId(id)}
      const updateUser = {
        $set: {
          role: 'Instructor'
        }
      }
      const result = await usersCollection.updateOne(filter, updateUser)
      res.send(result)
    })


    // create stripe payment
    app.post("/create-payment-intent", verifyJWT, async (req, res) =>{
      const { price } = req.body;
      const amount = price * 100

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount, 
        currency: "usd",
        payment_method_types: ['card']
      })
      res.send({
        clientSecret: paymentIntent.client_secret,
      })
    })



    // post courses to database
    app.post('/courses', async(req, res)=>{
      const newCourse = req.body
      console.log(newCourse);
      const result = await courseCollection.insertOne(newCourse)
      res.send(result)
    })


    //get all course
    app.get('/courses', async(req, res)=>{
      const result = await courseCollection.find().toArray()
      res.send(result)
    })


    // delete a course   
    app.delete('/courses/:id', async (req, res)=>{
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await courseCollection.deleteOne(query)
      res.send(result)
    })


    // get a gingle data of course data
    app.get('/courses/:id', async (req, res)=>{
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await courseCollection.findOne(query)
      res.send(result)
    })


    // update course
    app.put('/courses/:id', async(req, res)=>{
      const id = req.params.id
      const filter = {_id: new ObjectId(id)}
      const options = {upsert: true}
      const updateCourse = req.body
      const course = {
        $set: {
          courseName: updateCourse.courseName, 
          instructorNname:  updateCourse.instructorNname, 
          price:  updateCourse.price, 
          photoURL:  updateCourse.photoURL, 
          seat:  updateCourse.seat
        }
      }
      const result = await courseCollection.updateOne(filter, course, options)
      res.send(result)
    })


    // booking course
    app.patch('/bookings', async(req, res)=>{
      const addCourse = req.body
      console.log(addCourse);
      const query = {email: addCourse.email}
      const existingUser = await bookingsCollection.findOne(query)

      if(existingUser){
            return res.send({message: 'user already exists'})
          }

      const result = await bookingsCollection.insertOne(addCourse)
      res.send(result)
    })

    // app.post('/bookings', async (req, res) => {
    //   const addCourse = req.body;
    //   const query = {email: addCourse.email}
    //   const existingUser = await bookingsCollection.findOne(query)
    //   if(existingUser){
    //     return res.send({message: 'user already exists'})
    //   }
    //   const result = await bookingsCollection.insertOne(addCourse);
    //   res.send(result);
    // })


    app.get('/bookings',async(req, res)=>{
    
      const result = await bookingsCollection.find().toArray()
      res.send(result)
    })


    app.delete('/bookings/:id', async (req, res)=>{
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await bookingsCollection.deleteOne(query)
      res.send(result)
    })


    app.patch('/bookings/confirm/:id', async(req, res)=>{
      const id = req.params.id
      const filter = {_id: new ObjectId(id)}
      const updateUser = {
        $set: {
          status: 'Confirm'
        }
      }
      const result = await bookingsCollection.updateOne(filter, updateUser)
      res.send(result)
    })


    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res)=>{
    res.send("summer camp course")
})
app.listen(port, ()=>{
    console.log(`Port is running on ${port}`);
})

