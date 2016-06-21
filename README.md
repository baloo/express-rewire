# express-rewrite

``` javascript
var express = require('express')
var rewire = require('express-rewire')

app = express()
app.get('/test', function (req, res) {
  res.json({query: req.query})
})

app.use('/rewired', rewire('/test').middleware())
```
