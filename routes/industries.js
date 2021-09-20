const express = require("express");
const router = new express.Router();
const axios = require("axios");
const ExpressError = require("../expressError");
const db = require("../db");


router.get("/:industry", async(req, res, next) => {
    try {
        const { industry } = req.params;
        const allIndustries = await db.query(
            `SELECT code
            FROM industries
            WHERE industry = $1`, [industry]
        );
        return res.json(allIndustries.rows.map(industry => industry.code));
    } catch (err) {
        return next(err);
    };
});


router.post("/industries/:code", async(req, res, next) => {
    try {
        const { code, id } = req.body;
        const addToJoinTable = await db.query(
            `INSERT INTO companyindustries
             (company_code, industry_id)
             VALUES
             ($1, $2)`, [code, id]
        );
        return res.json({
            added: {code, id}
        });
    } catch (error) {
        return next(error);
    };
});


router.post("/", async(req, res, next) => {
    try {
        const { code, industry } = req.body;
        if (!code || !industry) throw new ExpressError("Not enough data to add new industry.", 400);
        const addedIndustry = await db.query(
            `INSERT INTO industries
             (code, industry)
             VALUES
             ($1, $2)
             RETURNING id, code, industry`, [code, industry]
        );
        // Here we check to see if this company code exists in our "companies" table.
        const getCompany = await db.query(
            `SELECT code
             FROM companies
             WHERE code = $1`, [code]
        );
        // If it does, we make another insert into the association table "companyindustries".
        if (getCompany.rows.length) {
            const { id } = addedIndustry.rows[0];
            await db.query(
                `INSERT INTO companyindustries
                 (company_code, industry_id)
                 VALUES
                 ($1, $2)`, [code, id]
            );
        };
        return res.json({
            added: {code, industry}
        });
    } catch (error) {
        return next(error);
    };
});

module.exports = router;