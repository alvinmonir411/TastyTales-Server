const express = require("express");
require("dotenv").config();
const cors = require('cors')
const app = express();
const port = 3000;
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World! this is testytales backend");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});




const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri =process.env.MONGO_DB_URI
  ;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const recipecollection = client.db("tastytales").collection("Allrecipe");
    const parcelcollection = client.db("tastytales").collection("parcel");
    app.get("/allrecipe", async (req, res) => {
      const size = parseInt(req.query.size) || 10;
      const page = parseInt(req.query.page) || 1;
      const skip = (page - 1) * size;
      const recipes = await recipecollection
        .find()
        .skip(skip)
        .limit(size)
        .toArray();
      const total = await recipecollection.estimatedDocumentCount();

      res.json({ recipes, total });
    });
    // get allrecipe
    app.get("/allrecipe/admin", async (req, res) => {
      const result = await recipecollection.find().toArray();
      res.send(result);
    });
    // get all parcels
    app.get("/parcels", async (req, res) => {
      const email = req.query.email;

      try {
        let result;

        if (email) {
          // If email is provided, return parcels only for that email
          result = await parcelcollection
            .find({ sender_email: email })
            .sort({ creation_date: -1 })
            .toArray();
        } else {
          // If no email, return all parcels
          result = await parcelcollection
            .find()
            .sort({ creation_date: -1 })
            .toArray();
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching parcels:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });
    
    // get one recipe
    app.get("/recipedetails/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await recipecollection.findOne(query);
      res.send(result);
    });
    //  get uniqueauthors for admin panel
    app.get("/uniqueauthors", async (req, res) => {
      const result = await recipecollection.distinct("author");
      res.send(result);
    });
    // for add recipe
    app.post("/addrecipe", async (req, res) => {
      const data = req.body;
      const result = await recipecollection.insertOne(data);
      res.send(result);
    });
    // for add parcel
    app.post("/addparcel", async (req, res) => {
      const newparcel = req.body;
      const result = await parcelcollection.insertOne(newparcel);
      res.send(result);
    });

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
