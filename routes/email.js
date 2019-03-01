const express = require('express');
const router = express.Router();

router.get('/', (req, res, next) => {
    console.log(req);
    res.json({
        status: "0",
        msg: '',
        result: 'success'
    })
})

module.exports = router;