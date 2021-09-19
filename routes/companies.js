const express = require("express");
const router = new express.Router();
const ExpressError = require("../expressError");
const db = require("../db");

// Returns an array of all companies
router.get("/", async(req, res, next) => {
    try {
        const results = await db.query(
            `SELECT code, name, description
             FROM companies`
        );
        if (!results.rows.length) throw new ExpressError("No company data found.", 400);
        return res.json(results.rows)
    } catch (err) {
        return next(err);
    };
});

// Returns an object of a specific company, and their invoices, or a 404 error if the company is not found
router.get("/:code", async(req, res, next) => {
    try {
        const code = req.params.code;
        const companyResults = await db.query(
            `SELECT code, name, description
             FROM companies
             WHERE code=$1`, [code]
        );
        const companyInvoices = await db.query(
            `SELECT comp_code, amt, paid, add_date, paid_date
             FROM invoices
             WHERE comp_code = $1`, [code]
        )
        if (!companyResults.rows.length) throw new ExpressError("Not Found", 404);
        let company = companyResults.rows[0];
        company.invoices = companyInvoices.rows;
        return res.json(company);
    } catch (err) {
        return next(err);
    };
});

// Creates a new company in the database; returns the company data as an object
router.post("/", async(req, res, next) => {
    try {
        const { code, name, description } = req.body;
        if (!code || !name || !description) throw new ExpressError("Not enough data to add company.", 400);
        const results = await db.query(
            `INSERT INTO companies
             (code, name, description)
             VALUES
             ($1, $2, $3)
             RETURNING code, name, description`, [code, name, description]
        );
        return res.status(201).json({
            company: {code, name, description}
        });
    } catch (err) {
        return next(err);
    };
});

// Updates a company; returns the updated company data as an object
// If the company is not found, returns a 404 error.
router.put("/:code", async(req, res, next) => {
    try {
        const { code, name, description } = req.body;
        if (!code || !name || !description) throw new ExpressError("Not enough data.", 400);
        const results = await db.query(
            `UPDATE companies
            SET code = $1,
                name = $2,
                description = $3
            WHERE code = $4
            RETURNING code, name, description`, [code, name, description, req.params.code]
        );
        if (!results.rows.length) throw new ExpressError("No rows found.", 404);
        return res.json({
            company: {code, name, description}
    });
    } catch (err) {
        return next(err);
    };
});

// Deletes a company and returns a success message
// If the company is not found, returns a 404 error.
router.delete("/:code", async(req, res, next) => {
    try {
        const code = req.params.code;
        const results = await db.query(
            `DELETE FROM companies
             WHERE code = $1
             RETURNING code`, [code]
        );
        if (!results.rows.length) throw new ExpressError("Company not found.", 404);
        return res.json({
            status: "deleted"
        });
    } catch (err) {
        return next(err);
    };
});

module.exports = router;