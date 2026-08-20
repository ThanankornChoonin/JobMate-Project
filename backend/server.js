const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const cvRoute = require("./routes/cv");
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("JobMate Backend Running");
});

const PORT = process.env.PORT || 3000;
app.use("/cv", cvRoute);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});