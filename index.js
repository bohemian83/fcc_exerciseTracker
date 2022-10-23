const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')

mongoose.connect(process.env['MONGO_URI'], { useNewUrlParser: true, useUnifiedTopology: true });

require('dotenv').config()
app.use(express.urlencoded({extended: false}))
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

let userSchema = new mongoose.Schema({
  username: {
    type: String, 
    required: true
  }, 
  count: {
    type: Number, 
    default: 0
  }, 
  log: [{
    description: {
      type: String, 
      required: true
    }, 
    duration: {
      type: Number, 
      required: true
    }, 
    date: {
      type: String
    },
    _id : {id:false}
  }]
})

let User = mongoose.model('User', userSchema)

app.post('/api/users', (req, res) => {
  if(!req.body.username) return res.status(400).json({ error: 'error'})
  
  let user = new User({ username: req.body.username });
  
  user.save()
    .then(user => {
      if (!user || user.length === 0 ) {
        return res.status(500).send(user)
      }

      res.status(201).json({
        username: req.body.username,
        _id: user._id
      })
    })
    .catch(err => {
      res.status(500).json(err)
    }) 
})

app.get('/api/users', (req, res) => {
  User.find()
    .then(users => res.json(users))
    .catch(err => res.status(500).json(err))
})

app.post('/api/users/:_id?/exercises', (req, res) => {
  
  let date = new Date(req.body.date)
  if (req.body.date === "" || req.body.date === undefined) {
    date = new Date() 
  }

  let exercise = { 
    description: req.body.description,
    duration: req.body.duration,
    date: date
  }

  User.findByIdAndUpdate(
    { _id: req.params._id }, 
    { $inc: { count: 1 }, 
    $push: { log : [exercise] } }, {lean: true})
    .then(user => {
      if (!user || user.length === 0 ) {
          return res.status(500).send(user)
      }
      
      res.status(201).json(
        { 
          username: user.username, 
          description: req.body.description,
          duration: parseInt(req.body.duration), 
          date: date.toDateString(), 
          _id: user._id
        })
     })
    
    .catch(err => res.status(500).json(err))
})

app.get('/api/users/:_id/logs', (req, res) => {
  User.find({_id: req.params._id})
    .then(user => {
      if (!user || user.length === 0 ) {
          return res.status(500).send(user)
      }
      log = user[0].log
      log.forEach(exercise => {
        date = new Date(exercise.date)
        exercise.date = date.toDateString()
      })

      if (req.query.from && req.query.to) {
        log.filter(exercise => {
          new Date(exercise.date) >= new Date(req.query.from) 
          && new Date(exercise.date) <= new Date(req.query.to)
        })
      }

      if (req.query.limit) {
        log = log.slice(0, req.query.limit)
      }
      
      res.status(201).json({
          username: user[0].username, 
          count: user[0].count,
          _id: user[0]._id,
          log: log
        })  
    })
    .catch(err => res.status(500).json(err))
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
