require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
app.use(cors());
app.use(express.json());
// 
const stripe = require("stripe")(`${process.env.STRIPE_SECRET}`);

// MongoDB setup
const uri = process.env.MONGO_DB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  },
});

// DB connection function
async function run() {
  try {
    const recipecollection = client.db("tastytales").collection("Allrecipe");
    const parcelcollection = client.db("tastytales").collection("parcel");
    const orderscollection = client.db("tastytales").collection('orders')
  

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



    // this is for admin pannel delele data 
    app.delete('/parcle/:id', async (req, res) => {
      const id = req.params.id;
      const result = await parcelcollection.deleteOne({
        _id: new ObjectId(id)
      });
      res.send(result);
    });

    app.get("/allrecipe/admin", async (req, res) => {
      const result = await recipecollection.find().toArray();
      res.send(result);
    });

    app.get("/parcels", async (req, res) => {
      const email = req.query.email;
      try {
        let result;
        if (email) {
          result = await parcelcollection
            .find({ sender_email: email })
            .sort({ creation_date: -1 })
            .toArray();
        } else {
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

    app.get("/recipedetails/:id", async (req, res) => {
      const id = req.params.id;
      const result = await recipecollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });
   
    app.get("/uniqueauthors", async (req, res) => {
      const result = await recipecollection.distinct("author");
      res.send(result);
    });

    app.post("/addrecipe", async (req, res) => {
      const data = req.body;
      const result = await recipecollection.insertOne(data);
      res.send(result);
    });

    app.post("/addparcel", async (req, res) => {
      const newparcel = req.body;
      const result = await parcelcollection.insertOne(newparcel);
      res.send(result);
    });

    // payment intend
    app.post("/creat-payment-intent", async (req, res) => {
      const { recipeId, totalPrice, quantity, deliveryCharge } = req.body;

      try {
        const recipe = await recipecollection.findOne({
          _id: new ObjectId(recipeId),
        });

        if (!recipe) {
          return res.status(404).send({ message: "Recipe not found" });
        }

        const totalPriceInCents = Math.round(totalPrice * 100); // Convert to cents

        const paymentIntent = await stripe.paymentIntents.create({
          amount: totalPriceInCents,
          currency: "usd",
          automatic_payment_methods: {
            enabled: true,
          },
        });

        // ✅ Send client secret to frontend
        res.send({
          clientSecret: paymentIntent.client_secret,
        });

        console.log("Created PaymentIntent:", paymentIntent.id);
      } catch (err) {
        console.error("PaymentIntent Error:", err.message);
        res.status(500).send({ error: err.message });
      }
    });
    
    app.post("/orders", async (req, res) => {
    
      const neworders = req.body;
      const result = await orderscollection.insertOne(neworders)
res.send(result);

    });
    // get my order
    app.get("/orders", async (req, res) => {
      const { email } = req.query;
      const query = { "buyerInfo.email": email };
      const result = await orderscollection.find( query ).toArray();
      res.send(result);
    });

    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB Error:", err);
  }
}
run();

const PORT = process.env.PORT || 5001;
app.get("/", (req, res) => {
  res.send("Hello World! this is tastytales backend");
});
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
module.exports = app;
