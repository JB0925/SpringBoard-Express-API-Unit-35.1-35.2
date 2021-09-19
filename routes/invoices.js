const express = require("express");
const router = new express.Router();
const ExpressError = require("../expressError");
const db = require("../db");
const pg = require("pg");

// Returns an array of invoices
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

// Returns a single invoice object.
router.get("/:id", async(req, res, next) => {
    try {
        const id = req.params.id;
        const result = await db.query(
            `SELECT comp_code, amt, paid, add_date, paid_date
             FROM invoices
             WHERE id = $1`,
             [id]
        );
        if (!result.rows.length) throw new ExpressError("Invoice not found.", 404);
        return res.json(result.rows[0]);
    } catch (err) {
        return next(err);
    };
});

// Creates a new invoice and returns it as an object.
router.post("/", async(req, res, next) => {
    try {
        const booleans = [true, false];
        const { comp_code, amt, paid, add_date, paid_date } = req.body;
        if (!comp_code || !amt || !add_date || !paid_date) {
            throw new ExpressError("Not enough data to add item.", 400);
        };
        if (booleans.indexOf(paid) === -1) throw new ExpressError("Paid column must be true or false.", 400);

        const result = await db.query(
            `INSERT INTO invoices
             (comp_code, amt, paid, add_date, paid_date)
             VALUES
             ($1, $2, $3, $4, $5)
             RETURNING comp_code, amt, paid, add_date, paid_date`,
             [comp_code, amt, paid, add_date, paid_date]
        );
        return res.json({
            invoice: {comp_code, amt, paid, add_date, paid_date}
        });
    } catch (err) {
        return next(err);
    };
});

// Updates an existing invoice object, returning the updated invoice.
router.put("/:id", async(req, res, next) => {
    try {
        const { comp_code, amt, paid, add_date, paid_date } = req.body;
        const id = req.params.id;
        const booleans = [true, false];
        if (!comp_code || !amt || !add_date || !paid_date) {
            throw new ExpressError("You must update every field to update item. Use same values on other columns if necessary", 400);
        };
        if (booleans.indexOf(paid) === -1) throw new ExpressError("Paid column must be true or false.", 400);
        const result = await db.query(
            `UPDATE invoices
             SET comp_code = $1,
                 amt = $2,
                 paid = $3,
                 add_date = $4,
                 paid_date = $5
            WHERE id = $6
            RETURNING comp_code, amt, paid, add_date, paid_date`,
            [comp_code, amt, paid, add_date, paid_date, id]
        );
        if (!result.rows.length) throw new ExpressError("Invoice not found.", 404);
        return res.json(result.rows[0]);
    } catch (err) {
        return next(err);
    };
});

// Deletes an invoice, if it exists.
router.delete("/:id", async(req, res, next) => {
    try {
        const id = req.params.id;
        const result = await db.query(
            `DELETE FROM invoices
             WHERE id = $1
             RETURNING id`, [id]
        );
        if (!result.rows.length) throw new ExpressError("Invoice not found.", 404);
        return res.json({
            status: "deleted"
        });
    } catch (err) {
        return next(err);
    };
});

module.exports = router;