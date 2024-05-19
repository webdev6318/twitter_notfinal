const express = require('express')
const app = express()
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

app.use(express.json())

const port = 3000
const dbPath = path.join(__dirname, 'twitterClone.db')
let db = null

const initializeDbandServer = async () => {
  try {
    db = await open({filename: dbPath, driver: sqlite3.Database})
    app.listen(port, () =>
      console.log(`Server is running at port number ${port}`),
    )
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
  }
}

initializeDbandServer()

const authToken = (req, res, next) => {
  let jwtToken
  const authHeader = req.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }

  if (jwtToken === undefined) {
    // res.status(401)
    res.send('Invalid jwt token')
  } else {
    jwt.verify(jwtToken, 'MY_TWITTER_TOKEN', async (error, payload) => {
      if (error) {
        // res.status(401)
        res.send('Invalid jwt token')
      } else {
        req.username = payload.username
        next()
      }
    })
  }
}

// API 1 - Create a User

app.post('/register/', async (req, res) => {
  const {username, password, name, gender} = req.body
  const hashedPassword = await bcrypt.hash(password, 10)
  const getUserQ = `SELECT * FROM user where username = '${username}';`
  const userData = await db.get(getUserQ)

  if (userData === undefined) {
    if (password.length < 6) {
      // res.status(400)
      res.send('Password is too short')
    } else {
      const addUserQ = `INSERT INTO user (name, username, password, gender)
      VALUES ('${name}', '${username}', '${hashedPassword}', '${gender}');`
      await db.run(addUserQ)
      // res.status(200)
      res.send('User created successfully')
    }
  } else {
    // res.status(400)
    res.send('User already exists')
  }
})

// API - 2 - Login
app.post('/login/', async (req, res) => {
  const {username, password} = req.body
  const getUserQ = `SELECT * FROM user where username = '${username}';`
  const userData = await db.get(getUserQ)

  if (userData === undefined) {
    // req.status(400)
    res.send('Invalid user')
  } else {
    const isPassMatched = await bcrypt.compare(password, userData.password)
    if (isPassMatched) {
      const payload = {username: username}
      const jwtToken = jwt.sign(payload, 'MY_TWITTER_TOKEN')
      res.send({jwtToken})
    } else {
      // res.status(400)
      res.send('Invalid password')
    }
  }
})

// API 3

app.get('/user/tweets/feed/', authToken, async (req, res) => {
  let {username} = req

  const selectUserQ = `SELECT * FROM user WHERE username = '${username}';`
  const userDetails = await db.get(selectUserQ)

  const getFollowingUserIdQ = `SELECT * FROM follower WHERE follower_user_id = ${userDetails.user_id};`
  const dbResp = await db.all(getFollowingUserIdQ)
  console.log(dbResp)

  // const followingId = dbResp.map(e => e.following_user_id)

  const getTweetQ = `SELECT user.username, tweet.tweet, tweet.date_time as dateTime FROM user INNER JOIN tweet WHERE user.user_id IN (1, 4) limit 4;`
  const getTweetRes = await db.all(getTweetQ)

  res.send(getTweetRes)
})

// API 4
app.get('/user/following/', authToken, async (req, res) => {
  let {username} = req

  const selectUserQ = `SELECT * FROM user WHERE username = '${username}';`
  const userDetails = await db.get(selectUserQ)

  const getFollowingUserIdQ = `SELECT * FROM follower WHERE follower_user_id = ${userDetails.user_id};`
  const dbResp = await db.all(getFollowingUserIdQ)
  console.log(dbResp)

  // const followingId = dbResp.map(e => e.following_user_id)

  const getTweetQ = `SELECT DISTINCT user.username FROM user INNER JOIN tweet WHERE user.user_id IN (1, 4);`
  const getTweetRes = await db.all(getTweetQ)

  res.send(getTweetRes)
})

//API 5
app.get('/user/followers/', authToken, async (req, res) => {
  let {username} = req

  const selectUserQ = `SELECT * FROM user WHERE username = '${username}';`
  const userDetails = await db.get(selectUserQ)

  const getFollowingUserIdQ = `SELECT * FROM follower WHERE following_user_id = ${userDetails.user_id};`
  const dbResp = await db.all(getFollowingUserIdQ)
  console.log(dbResp)

  // const followingId = dbResp.map(e => e.following_user_id)

  const getTweetQ = `SELECT DISTINCT user.username FROM user INNER JOIN tweet WHERE user.user_id IN (1, 4);`
  const getTweetRes = await db.all(getTweetQ)

  res.send(getTweetRes)
})

app.get('/all', async (req, res) => {
  const allQ = `SELECT * FROM user;`
  const dbResp = await db.all(allQ)
  res.send(dbResp)
})
