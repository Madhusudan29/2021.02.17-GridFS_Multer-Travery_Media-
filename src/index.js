const express = require("express");
const app = express();
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const methodOverride = require("method-override");
app.use(express.json()); // Middleware
app.use(methodOverride("_methods"));
app.set("view engine", "ejs"); // View Engine

const url = "mongodb://localhost:27017/Database";

const conn = mongoose.createConnection(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}); // .then(() => console.log(`Connected To DataBase`)) // .catch(() => console.log(`Connection Errupted!`));

let gfs; //Initialize Stream
conn.once("open", () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
});

//Create Storage Engine
const storage = new GridFsStorage({
  url: url,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString("hex") + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: "uploads",
        };
        resolve(fileInfo);
      });
    });
  },
});

const upload = multer({ storage });

// Routes
app.get("/", (req, res) => {
  gfs.files.find().toArray((err, files) => {
    if (!files || files.length === 0) {
      res.render("index", { files: false });
    } else {
      files.map((file) => {
        if (
          file.contentType === "image/jpeg" ||
          file.contentType === "image/jpg" ||
          file.contentType === "image/png"
        ) {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });
      res.render("index", { files: files });
    }
  });
});

app.post("/upload", upload.single("file"), (req, res) => {
  // res.json({ file: req.file });
  res.redirect("/");
});

app.get("/file", (req, res) => {
  gfs.files.find().toArray((err, files) => {
    if (!files || files.length === 0) {
      return res.status(404).json({ err: "No Such File Exist!" });
    }
    return res.json(files);
  });
  // Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client
  // Error Came Because I have redirected
});

app.get("/files/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "No Such File Found!",
      });
    }
    return res.json(file);
  });
});

app.get("/image/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "No Such File Found!",
      });
    }
    if (
      file.contentType === "image/jpeg" ||
      file.contentType === "image/jpg" ||
      file.contentType === "image/png"
    ) {
      let readStream = gfs.createReadStream(file.filename);
      readStream.pipe(res);
    } else {
      res.status(404).json({
        err: "It's Not An Image",
      });
    }
  });
});

app.delete("/files/:id", (req, res) => {
  gfs.remove({ _id: req.params.id, root: "uploads" }, (err, gridStore) => {
    if (err) {
      return res.status(404).json({ err: err });
    }
    res.redirect("/");
  });
});

// Listning
const port = 1500;
app.listen(port, () => console.log(`Listning on http://localhost:${port}`));
