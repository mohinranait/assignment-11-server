const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();



// Middlewire
app.use(express.json());
app.use(cors({
  origin : ["http://localhost:5173"],
  credentials: true,
}));




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.t259fjj.mongodb.net/?retryWrites=true&w=majority`;

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
  
    const database = client.db("assignment_10");
    const assignmentCollection = database.collection('assignments');
    const submitionCollection = database.collection('submissions');

    // get all assignments
    app.get("/api/v1/assignments", async (req, res) => {
      const queryLevel = {};
      const page = Number(req.query?.page)
      const size = Number(req.query?.size)
      console.log(page, size);
      
      const level = req.query?.level;
      if(level){
        queryLevel.level = level
      }
        const cursor =  assignmentCollection.find(queryLevel).skip(page*size).limit(size)
        const result = await cursor.toArray();
        const count = await assignmentCollection.estimatedDocumentCount();
        res.send({
          result,
          count : Number(count)
        });
    })

    // get assignment using ID
    app.get("/api/v1/assignment/:id", async (req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};


      const result = await assignmentCollection.findOne(filter)
      res.send(result);
  })

    // Create assignments
    app.post("/api/v1/create-assignment", async (req, res) => {
        const assignment = req.body;
        const result = await assignmentCollection.insertOne(assignment);
        res.send(result);
    })



    // Create assignments
    app.patch("/api/v1/update-assignment/:id", async (req, res) => {
        const id = req.params?.id;
        console.log(id);
        const filter = {_id: new ObjectId(id)};
        const assignment = req.body;

        const updateDoc = {
          $set: assignment
        }

        const result = await assignmentCollection.updateOne(filter, updateDoc);
        res.send(result);
    })

    // user wish assignment get
    app.get("/api/v1/my-assignment", async (req, res) => {
      const email = req.query?.email;
      const filter = {email: email};
      const result = await assignmentCollection.find(filter).toArray();
      res.send(result)
    })

    // Delete my assignment
    app.delete("/api/v1/delete-my-assign/:id", async (req, res) => {
      const id = req.params?.id;
      const filter = {_id: new ObjectId(id) };
      const result = await assignmentCollection.deleteOne(filter);
      res.send(result)
    })


    // Get all Submition 
    app.get('/api/v1/pending-submitions', async (req, res) => {
      const filter= {status: false}
      const result = await submitionCollection.find(filter).toArray();
      res.send(result);
    })

    // Submition create
    app.post('/api/v1/create-submition', async (req, res) => {
      const submition = req.body;
      const result = await submitionCollection.insertOne(submition);
      res.send(result);
    })

    // Submition create
    app.patch('/api/v1/update-submite/:id', async (req, res) => {
      const id = req.params?.id;
      const filter = { _id: new ObjectId(id) };
      const submition = req.body;
      const doc = {
        $set : {
          given_marks : submition.examinMarks,
          feedback : submition.feedback,
          status : true
        }
      }
      const result = await submitionCollection.updateOne(filter, doc);
      res.send(result);
    })


    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get("/", (req, res) => {
    res.send("Home route is working");
})


app.listen(port , () => {
    console.log(`Server is runnign at port http://localhost:${port}`);
})