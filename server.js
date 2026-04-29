const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const dataPath = path.join(__dirname, 'data.json');
const mongoose = require("mongoose");
const expressHandlebars = require('express-handlebars');

const app = express();
dotenv.config();

// set HTTP_PORT
const HTTP_PORT = process.env.PORT || 8080;

// set static folder
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "views")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.engine('.hbs', expressHandlebars.engine({extname: '.hbs', defaultLayout: false}));
app.set('view engine', '.hbs');

mongoose.connect(process.env.MONGO_URL);

const submissionSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: String,
    address: String,
    query: String,
    isCompleted: { type: Boolean, default: false } 
});

const submission = mongoose.model('submission', submissionSchema);

// home route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "home.html"));
});

app.get("/home", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "home.html"));
});

app.get("/home.html", (req, res) => {
  res.redirect("/home");
});

app.get("/resources", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "resources.html"));
});

app.get("/resources.html", (req, res) => {
  res.redirect("/resources");
});

app.get("/services", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "services.html"));
});

app.get("/services.html", (req, res) => {
  res.redirect("/services");
});

app.get("/contact", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "contact.html"));
});

app.get("/contact.html", (req, res) => {
  res.redirect("/contact");
});

// route for google review page
app.get("/review", (req, res) => {
  res.redirect("https://www.google.com/search?q=S%26L+Garage+Door");
});

app.post('/submit-form', async (req, res) => {
    const { firstName, lastName, email, address, query } = req.body;

    if(!firstName?.trim() || !email?.trim() || !query?.trim()) {
      return res.redirect(req.get('referer') || '/');
    }

    try {
      const newEntry = new submission({
          ...req.body,
          isCompleted: false
      });
      await newEntry.save();
      
      res.send(`
          <!DOCTYPE html>
          <html>
          <head><title>Success</title></head>
          <body style="text-align: center; padding: 50px; font-family: sans-serif;">
              <div style="max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                  <h1 style="color: #d9534f;">Submission Received!</h1>
                  <p>Thank you, ${firstName}. Your request has been sent to S&L Garage Door.</p>
                  <a href="/home" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #d9534f; color: white; text-decoration: none; border-radius: 5px;">Return Home</a>
              </div>
          </body>
          </html>
      `);
    }
    catch (err){
      console.error("Database Save Error: ", err);
      res.status(500).send("Database Error");
    }
});

app.get('/view-data', async (req, res) => {
    // Admin password check
    if (req.query.pw !== process.env.ADMIN_PW) {
        return res.status(403).send('Access Denied');
    }
    const data = await submission.find().lean();
    res.render('display', {entries: data});
});

app.post('/delete/:id', async (req, res) => {
    await submission.findByIdAndDelete(req.params.id);
    res.redirect(`/view-data?pw=${process.env.ADMIN_PW}`);
});

app.post('/update/:id', async (req, res) => {
    try {
        await submission.findByIdAndUpdate(req.params.id, { isCompleted: true });
        res.redirect(`/view-data?pw=${process.env.ADMIN_PW}`);
    } catch (err) {
        res.status(500).send("Update Failed");
    }
});

app.post('/toggle-status/:id', async (req, res) => {
    try {
        const entry = await submission.findById(req.params.id);
        await submission.findByIdAndUpdate(req.params.id, { isCompleted: !entry.isCompleted });
        res.redirect(`/view-data?pw=${process.env.ADMIN_PW}`);
    } catch (err) {
        res.status(500).send("Update Failed");
    }
});

// setup server
app.listen(HTTP_PORT, () => {
  console.log(`App listening on port: ${HTTP_PORT}`);
});

// 404 error handler for undefined routes
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "views", "404.html"));
});