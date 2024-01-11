const express = require('express');
require('dotenv').config();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const app = express();

const port = process.env.PORT || 5000;
const jwtSecret = process.env.APP_SECRET


// Middlewire
app.use(
  cors({
    origin: ['http://localhost:5173', 'https://assignment-11-99dd7.web.app'],
    credentials: true,
    // methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  })
);
app.use(express.json());
app.use(cookieParser());



// verifyToken
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if(!token){
    return res.status(401).send({
      message : "Unauthorize",
      success : false,
    })
  }

  jwt.verify(token, jwtSecret , function(err, decoded) {
    if(err){
      return res.status(401).send({
        message : "Unauthorize",
        success : false,
      })
    }
    req.user = decoded
    next();
  });

}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.t259fjj.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



const dbConnect = async () => {
  try {
    client.connect();
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.log("DB error name:" , error.message);
  }
}
dbConnect();


const database = client.db("assignment_10");
const assignmentCollection = database.collection('assignments');
const submitionCollection = database.collection('submissions');
const userCollection = database.collection('user');


// Default 
app.get("/", (req, res) => {
  res.send("Home route is working");
})

// get all assignments
app.get("/api/v1/assignments", async (req, res) => {
  try {
    const queryLevel = {};
    const page = Number(req.query?.page)
    const size = Number(req.query?.size)
    
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
  } catch (error) {
    res.send({
      success : false,
      error : error.message,
    })
  }
})

// get assignment using ID
app.get("/api/v1/assignment/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const filter = {_id: new ObjectId(id)};
    const result = await assignmentCollection.findOne(filter)
    res.send(result);
  } catch (error) {
    res.send({
      success : false,
      error : error.message,
    })
  }
})

// Create assignments
app.post("/api/v1/create-assignment", async (req, res) => {
   try {
      const assignment = req.body;
      const email = req.query?.email
      const isExistsUser = await userCollection.findOne({email})
      const result = await assignmentCollection.insertOne({...assignment, user: isExistsUser?._id, updateAt: new Date()});
      res.send(result);
  } catch (error) {
    res.send({
      success : false,
      error : error.message,
    })
  }
})



// Update assignments
app.patch("/api/v1/update-assignment/:id", verifyToken, async (req, res) => {
    
  try {
    const id = req.params?.id;
    const queryEmail = req.query?.email;
    const tokenEmail = req.user?.email;
    const productEmail  = req.query?.productEmail;

    if(queryEmail !== tokenEmail){
      return res.status(401).send({
        message : "You don't own this assignment",
        success : false,
      })
    }

    const isExistsUser = await userCollection.findOne({email:queryEmail})


    const filter = {
      _id: new ObjectId(id),
    };

    const assignment = req.body;
    const updateDoc = {
      $set: {...assignment, user:isExistsUser?._id,updateAt: new Date()}
    }

    if( productEmail === tokenEmail ){
      const result = await assignmentCollection.updateOne(filter, updateDoc);
      res.send(result);
    }else{
      res.send({
        success: false,
        message : "You do not own this assignment"
      })
    }
  } catch (error) {
    res.send({
      success : false,
      error : error.message,
    })
  }
   
})

// Update assignments
app.patch("/api/v1/update-students/:id", async (req, res) => {
    
  try {
    const id = req.params?.id;
    const filter = {
      _id: new ObjectId(id),
    };
    const assignment = req.body;
    const updateDoc = {
      $set: assignment
    }

    const result = await assignmentCollection.updateOne(filter, updateDoc);
    res.send(result);
   
  } catch (error) {
    res.send({
      success : false,
      error : error.message,
    })
  }
   
})

// user wish assignment get
app.get("/api/v1/my-assignment",verifyToken, async (req, res) => {
  try {
    const email = req.query?.email;
    const tokenEmail = req.user?.email;
    if( email !== tokenEmail ){
      return res.status(403).send({
        message : "Unauthorize",
        success : false,
      })
    }

    const query = {};
    if( email ){
      query.email = email
    }

    const result = await assignmentCollection.find(query).toArray();
    res.send(result)
  } catch (error) {
    res.send({
      success : false,
      error : error.message,
    })
  }
})

// Feature assignment get
app.get("/api/v1/features-assignment", async (req, res) => {
  try {
    const query = {features : true};
    const result = await assignmentCollection.find(query).toArray();
    res.send(result)
  } catch (error) {
    res.send({
      success : false,
      error : error.message,
    })
  }
})


// Delete my assignment
app.delete("/api/v1/delete-my-assign/:id", verifyToken , async (req, res) => {
  try {
    const id = req.params?.id;
    const tokenEmail = req.user?.email;
    const email = req.query?.email;
    const assignEmail = req.query?.assemail;
    if( tokenEmail !== email ){
      return res.status(401).send({
        message : "Unauthorize",
        success : false,
      })
    }

    const filter = {
      _id: new ObjectId(id)
    };

    if( assignEmail == email ){
      const result = await assignmentCollection.deleteOne(filter);
      res.send(result)
    }else{
      res.send({
        success: false,
        message : "You do not own this assignment"
      })
    }
  } catch (error) {
    
  }
})


// Get all Submition 
app.get('/api/v1/pending-submitions', async (req, res) => {
 try {
  const filter= {status: false}
  const result = await submitionCollection.find(filter).toArray();
  res.send(result);
 } catch (error) {
  
 }
})

// Submition create
app.post('/api/v1/create-submition', async (req, res) => {
 try {
  const submition = req.body;
  const result = await submitionCollection.insertOne(submition);
  res.send(result);
 } catch (error) {
  
 }
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
  try {
    const result = await submitionCollection.updateOne(filter, doc);
    res.send(result);
  } catch (error) {
    
  }
})

// my submition 
app.get("/api/v1/my-submition", verifyToken, async (req, res) => {
  const queryEmail = req.query?.email;
  const tokenEmail = req?.user?.email;

  if( queryEmail !== tokenEmail ){
    return res.status(401).send({
      message : "Unauthorize",
      success : false,
    })
  }

  const query = {};
  if( queryEmail ){
    query.email  = queryEmail;
  }

  try {
    const result = await submitionCollection.find(query).toArray();
    res.send(result);
  } catch (error) {
    
  }

})


// Create jwt 
app.post('/api/v1/jwt', async (req, res) => {
  try {
    const user = req.body;
    const token = jwt.sign(user, jwtSecret , {expiresIn: "1h"} );
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    }).send({
      status: true,
    })
  } catch (error) {
    res.send({
      success: false,
      message : "You do not own this assignment"
    })
  }
})

// clear cookies
app.post(`/api/v1/logout`, async (req, res) => {
  try {
    res.clearCookie('token', {
      maxAge: 0,
      secure: process.env.NODE_ENV === 'production' ? true : false,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    }).send({ status: true })
  } catch (error) {
    res.send({
      success: false,
      error : error.message, 
    })
  }
})

// Create new user
app.post('/api/v1/user', async(req, res)=>{
  const body = req.body;
  try {
    const user = await userCollection.insertOne(body);
    res.send({
      success:true,
      user,
    })
  } catch (error) {
    console.log(error);
  }
})

// find single user
app.get('/api/v1/user/:id', async (req, res) => {
  try {
    const id = req.params?.id;
    const filter = {_id: new ObjectId(id)};
    const result = await userCollection.findOne(filter)
    res.send(result);
  } catch (error) {
    res.send({message:error.message})
    console.log(error);
  }
})


// Update assignments
app.patch("/api/v1/user/:id", verifyToken, async (req, res) => {
    
  try {
    const id = req.params?.id;
    const queryEmail = req.query?.email;
    const tokenEmail = req.user?.email;

    if(queryEmail !== tokenEmail){
      return res.send({
        message : "forbidden access",
        success : false,
      })
    }

    const filter = {
      _id: new ObjectId(id),
    };

    const user = req.body;
    const updateDoc = {
      $set: user
    }

    // if( productEmail === tokenEmail ){
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    // }else{
    //   res.send({
    //     success: false,
    //     message : "You do not own this assignment"
    //   })
    // }
  } catch (error) {
    res.send({
      success : false,
      error : error.message,
    })
  }
   
})


app.listen(port , () => {
    console.log(`Server is runnign at port http://localhost:${port}`);
})