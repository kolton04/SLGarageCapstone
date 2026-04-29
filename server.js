const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const dataPath = path.join(__dirname, 'data.json');
const mongoose = require("mongoose");
const expressHandlebars = require('express-handlebars');
const nodemailer = require("nodemailer");


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


// setup server


app.post('/submit-form', async (req, res) => {
    const { firstName, lastName, email, address, query } = req.body;

    try {
        const newEntry = new submission({ firstName, lastName, email, address, query, isCompleted: false });
        await newEntry.save();

        res.send(`
            <!DOCTYPE html>
            <html>
            <body style="text-align: center; padding: 50px; font-family: sans-serif;">
                <h1 style="color: #d9534f;">Submission Received!</h1>
                <p>Thank you, ${firstName}. We will get back to you shortly.</p>
                <a href="/home" style="color: red; font-weight: bold;">Return Home</a>
            </body>
            </html>
        `);

        const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 465, 
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });

        transporter.sendMail({
            from: '"S&L Website" <noreply@slgaragedoor.com>',
            to: process.env.EMAIL_USER,
            subject: `New Lead: ${firstName} ${lastName}`,
            html: `<p>New message from ${firstName} ${lastName} regarding: ${query}</p>`
        }).catch(err => console.log("Background email error:", err));

    } catch (dbErr) {
        res.status(500).send("Database Error");
    }
});

app.get('/view-data', async (req, res) => {
    if (req.query.pw !== process.env.ADMIN_PW) {
        return res.status(403).send('Access Denied');
    }
    const data = await submission.find().lean();
    res.render('display', { entries: data });
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

app.get("/review", (req, res) => {
  res.redirect("https://www.google.com/search?client=firefox-b-1-d&hs=3Knp&sca_esv=e49a19319df6f3e9&biw=1280&bih=587&sxsrf=ANbL-n7mPhLz_ucB2RKAnyk-_VPCUNwHIA:1777428497117&si=AL3DRZEsmMGCryMMFSHJ3StBhOdZ2-6yYkXd_doETEE1OR-qOYKkwHfOj3MbFNveJnjFM7k0-UxBg-rZuZ-jeit8CnGuHiZ_WO2c7C9a4xskU6RHj87weUmMXuUjJV61Py28-97sWvzWaieQ_VNwEfhy59iG3kQYHg%3D%3D&q=S+%26+L+Garage+Door+Reviews&sa=X&ved=2ahUKEwi1wbyR_ZGUAxWnlSsGHf-MOhIQ0bkNegQIHxAF");
});

app.listen(HTTP_PORT, () => {
  console.log(`App listening on port: ${HTTP_PORT}`);
});

// 404 error handler for undefined routes
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "views", "404.html"));
});