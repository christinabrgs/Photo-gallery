var express  = require('express');
const bodyParser = require('body-parser')
const cors = require('cors')
const MongoClient = require('mongodb').MongoClient
const connectionString = 'mongodb+srv://christinabrgs:Breakingwith@cluster0.qia0kni.mongodb.net/?retryWrites=true&w=majority'

module.exports = function (app, passport, db) {

  
  var multer = require('multer')
  var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './uploads')
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
  })
  var upload = multer({ storage: storage })
  let arr = []
  // normal routes ===============================================================

  MongoClient.connect(connectionString, { useUnifiedTopology: true }) // client grabs input data and stores on mongo website
    .then(client => {
      const ImgCollection = client.db("album").collection("pictures");
      console.log(ImgCollection)

      app.use('/uploads', express.static('uploads'))
      app.use(bodyParser.urlencoded({extended: true}))
      app.use(bodyParser.json())
      app.use(cors())

      // show the home page (will also have our login links)
      app.get('/', function (req, res) {
        res.render('index.ejs');
      });

      // PROFILE SECTION =========================
      app.get('/profile', isLoggedIn, async (req, res) => {
        const pictures = await ImgCollection.find().toArray()
        console.log('this is', pictures)
        
          res.render('profile.ejs', {pictures: pictures})

      });

      // LOGOUT ==============================
      app.get('/logout', function (req, res) {
        req.logout(() => {
          console.log('User has logged out!')
        });
        res.redirect('/');
      });

      // message board routes ===============================================================

      app.post('/uploads', upload.single('profile-file'), async (req, res) => {

        data = {
          path: req.file.path
        }

        arr.push(data)
        await ImgCollection.insertMany([data])

        // req.file is the `profile-file` file
        // req.body will hold the text fields, if there were any
        console.log(JSON.stringify(req.file))
        var response = '<a href="/profile">Home</a><br>'
        response += "Files uploaded successfully.<br>"
        response += `<img src="${req.file.path}" /><br>`
        return res.send(response)
      })


      app.post('/messages', (req, res) => {
        db.collection('messages').save({ name: req.body.name, msg: req.body.msg, thumbUp: 0, thumbDown: 0 }, (err, result) => {
          if (err) return console.log(err)
          console.log('saved to database')
          res.redirect('/profile')
        })
      })

      app.put('/messages', (req, res) => {
        db.collection('messages')
          .findOneAndUpdate({ name: req.body.name, msg: req.body.msg }, {
            $set: {
              thumbUp: req.body.thumbUp + 1
            }
          }, {
            sort: { _id: -1 },
            upsert: true
          }, (err, result) => {
            if (err) return res.send(err)
            res.send(result)
          })
      })

      app.put('/messages/thumbsDown', (req, res) => {
        db.collection('messages')
          .findOneAndUpdate({ name: req.body.name, msg: req.body.msg }, {
            $set: {
              thumbUp: req.body.thumbUp - 1
            }
          }, {
            sort: { _id: -1 },
            upsert: true
          }, (err, result) => {
            if (err) return res.send(err)
            res.send(result)
          })
      })

      app.delete('/messages', (req, res) => {
        db.collection('messages').findOneAndDelete({ name: req.body.name, msg: req.body.msg }, (err, result) => {
          if (err) return res.send(500, err)
          res.send('Message deleted!')
        })
      })
    })

  // =============================================================================
  // AUTHENTICATE (FIRST LOGIN) ==================================================
  // =============================================================================

  // locally --------------------------------
  // LOGIN ===============================
  // show the login form
  app.get('/login', function (req, res) {
    res.render('login.ejs', { message: req.flash('loginMessage') });
  });

  // process the login form
  app.post('/login', passport.authenticate('local-login', {
    successRedirect: '/profile', // redirect to the secure profile section
    failureRedirect: '/login', // redirect back to the signup page if there is an error
    failureFlash: true // allow flash messages
  }));

  // SIGNUP =================================
  // show the signup form
  app.get('/signup', function (req, res) {
    res.render('signup.ejs', { message: req.flash('signupMessage') });
  });

  // process the signup form
  app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/profile', // redirect to the secure profile section
    failureRedirect: '/signup', // redirect back to the signup page if there is an error
    failureFlash: true // allow flash messages
  }));

  // =============================================================================
  // UNLINK ACCOUNTS =============================================================
  // =============================================================================
  // used to unlink accounts. for social accounts, just remove the token
  // for local account, remove email and password
  // user account will stay active in case they want to reconnect in the future

  // local -----------------------------------
  app.get('/unlink/local', isLoggedIn, function (req, res) {
    var user = req.user;
    user.local.email = undefined;
    user.local.password = undefined;
    user.save(function (err) {
      res.redirect('/profile');
    });
  });

};

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated())
    return next();

  res.redirect('/');
}
