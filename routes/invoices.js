const express = require("express");
const router = new express.Router();
const ExpressError = require("../expressError");
const db = require("../db");
const pg = require("pg");

router.get("/", async(req, res, next) => {
    try {
        const results = await db.query(
            `SELECT comp_code, amt, paid, add_date, paid_date
             FROM invoices`
        );
        return res.json(results.rows);
    } catch (err) {
        return next(err);
    };
});






module.exports = router;