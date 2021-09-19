process.env.NODE_ENV = "test";
const app = require("../app");
const db = require("../db");
const parse = require("postgres-date");
const request = require("supertest");

let testCompany;
let testInvoice;

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
    testCompany = company.rows[0];
    testInvoice = invoice.rows;
});


afterEach(async() => {
    await db.query(`DELETE FROM companies`);
    await db.query(`DELETE FROM invoices`);
});


afterAll(async() => {
    await db.end();
});


describe("GET /companies, /companies/:code", () => {
    test("Do the GET routes return the expected data when passed good parameters?", async() => {
        const { code, name, description } = testCompany;
        const resp = await request(app).get("/companies");
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual(
            [
                {
                    code,
                    name,
                    description
                }
            ]
        );
    });
    test("Does the main GET route return an error if a bad endpoint is given?", async() => {
        const deleteExisting = await request(app).delete("/companies/apple");
        const resp = await request(app).get("/companies");
        expect(resp.statusCode).toBe(400);
        expect(resp.body.error.message).toEqual("No company data found.");
    });
    test("Does the GET company by code route return good data, given a good code parameter?", async() => {
        const { code, name, description } = testCompany;
        const invoices  = testInvoice;
        const result = {code, name, description, invoices};
        const resp = await request(app).get("/companies/apple");
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual(result);
    });
    test("Does the GET company by code route return an error, given a bad parameter", async() => {
        const resp = await request(app).get("/companies/fizzbuzz");
        expect(resp.statusCode).toBe(404);
        expect(resp.body.error.message).toEqual("Not Found");
    });
});

describe("/POST /companies", () => {
    test("Does the POST route allow us to create a new company, given a good request body?", async() => {
        const newCompany = {
            code: "msft",
            name: "Microsoft",
            description: "Makes computer operating systems."
        };
        const resp = await request(app).post("/companies").send(newCompany);
        expect(resp.statusCode).toBe(201);
        expect(resp.body).toEqual({
            company: {code: "msft", name: "Microsoft", description: "Makes computer operating systems."}
        });
    });
    test("Does the POST route return an error if there is not enough data?", async() => {
        const newCompany = {
            code: "msft",
            name: "Microsoft",
        };
        const resp = await request(app).post("/companies").send(newCompany);
        expect(resp.statusCode).toBe(400);
        expect(resp.body.error.message).toEqual("Not enough data to add company.");
    });
});

describe("/PUT /companies/:code", () => {
    test("Does the PUT route correctly update a company, given a correct company code and all required data?", async() => {
        const updatedCompany = {
            code: "apple",
            name: "Apple",
            description: "Makes good stuff."
        };
        const resp = await request(app).put("/companies/apple").send(updatedCompany);
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual({
            company: {code: "apple", name: "Apple", description: "Makes good stuff."}
        });
    });
    test("Does the PUT route throw a 404 when a company is not found?", async() => {
        const updatedCompany = {
            code: "apple",
            name: "Apple",
            description: "Makes good stuff."
        };
        const resp = await request(app).put("/companies/fizzbuzz").send(updatedCompany);
        expect(resp.statusCode).toBe(404);
        expect(resp.body.error.message).toEqual("No rows found.");
    });
    test("Does the PUT route throw an error if not enough data is provided to update a company?", async() => {
        const updatedCompany = {
            code: "apple",
            name: "Apple",
        };
        const resp = await request(app).put("/companies/apple").send(updatedCompany);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toEqual("Not enough data.");
    });
});

describe("DELETE /companies/:code", () => {
    test("Does the DELETE route delete a company from the database, given an existing company code?", async() => {
        const resp = await request(app).delete("/companies/apple");
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual({
            status: "deleted"
        });
    });
    test("Does the DELETE route throw an error if the code given is for a nonexistant company?", async() => {
        const resp = await request(app).delete("/companies/nike");
        expect(resp.statusCode).toBe(404);
        expect(resp.body.error.message).toEqual("Company not found.");
    });
});


