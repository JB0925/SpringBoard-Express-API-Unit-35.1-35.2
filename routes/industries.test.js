process.env.NODE_ENV = "test";
const app = require("../app");
const db = require("../db");
const parse = require("postgres-date");
const request = require("supertest");

let testCompany;
let testInvoice;
let testIndustry;

// Setup and Teardown
beforeEach(async() => {
    let company = await db.query(
        `INSERT INTO companies
         (code, name, description)
         VALUES
         ('apple', 'Apple', 'Big Tech Company. Makes iPhones and Macs.')
         RETURNING code, name, description`
    );
    let invoice = await db.query(
        `INSERT INTO invoices
         (comp_code, amt, paid, add_date, paid_date)
         VALUES
         ('apple', 500, false, '2021-09-18T18:47:52.116Z', null)
         RETURNING comp_code, amt, paid, add_date, paid_date`
    )
    let industry = await db.query(
        `INSERT INTO industries
         (code, industry)
         VALUES
         ('apple', 'Computers')
         RETURNING id, code, industry`
    )
    testCompany = company.rows[0];
    testInvoice = invoice.rows;
    testIndustry = industry.rows[0];
});


afterEach(async() => {
    await db.query(`DELETE FROM companies`);
    await db.query(`DELETE FROM invoices`);
    await db.query(`DELETE FROM industries`);
    await db.query(`DELETE FROM companyindustries`);
});


afterAll(async() => {
    await db.end();
});


// Test the GET /industries/:industry route
describe("GET /industries/:industry", () => {
    test("Does the GET industry route return good data, provided an existing industry?", async() => {
        const { code, industry } = testIndustry;
        const resp = await request(app).get(`/industries/${industry}`);
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual([code]);
    });
    test("Does the GET industry route return an empty list if the industry doesn't exist?", async() => {
        const resp = await request(app).get("/industries/carrot");
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual([]);
    });
    test("Does the GET route return an error when given an incorrect endpoint?", async() => {
        const resp = await request(app).get("/1234");
        expect(resp.statusCode).toBe(404);
        expect(resp.body.error.message).toEqual("Not Found");
    });
});

describe("POST /industries", () => {
    test("Does the POST route create a new industry, given a good request body?", async() => {
        const newIndustry = {
            code: "pizza_hut",
            industry: "Restaurants"
        };
        const resp = await request(app).post("/industries").send(newIndustry);
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual({
            added: {
                code: "pizza_hut",
                industry: "Restaurants"
            }
        });
    });
    test("Does the POST route create a new industry AND a new entry in 'companyindustries', given a good request body?", async() => {
        const newIndustry = {
            code: "apple",
            industry: "Big Tech"
        };
        const resp = await request(app).post("/industries").send(newIndustry);
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual({
            added: {
                code: "apple",
                industry: "Big Tech"
            }
        });
        const companyIndustries = await db.query(
            `SELECT * FROM companyindustries
             WHERE company_code = $1`, [newIndustry.code]
        );
        expect(companyIndustries.rows.length).toBe(1);
    });
    test("Given a bad request body, does the POST route throw an error as intended?", async() => {
        const newIndustry = {
            code: "john_deere"
        };
        const resp = await request(app).post("/industries").send(newIndustry);
        expect(resp.statusCode).toBe(400);
        expect(resp.body.error.message).toEqual("Not enough data to add new industry.");
    });
    test("Given a bad endpoint does the POST route throw an error as intended?", async() => {
        const newIndustry = {
            code: "apple",
            industry: "Big Tech"
        };
        const resp = await request(app).post("/industries/123").send(newIndustry);
        expect(resp.statusCode).toBe(500);
    });
});

describe("POST /industries/:code", () => {
    // This is not dpeendent on context; it is simply a test to see if the logic works correctly.
    test("Does the POST route with an id post to the 'companyindustries' table?", async() => {
        const requestBody = {
            code: "dunkin",
            id: 10
        };
        const resp = await request(app).post("/industries/dunkin").send(requestBody);
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual({
            added: {
                code: "dunkin",
                id: 10
            }
        });
    });
});