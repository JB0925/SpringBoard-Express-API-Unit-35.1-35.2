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
    await db.query(`ALTER SEQUENCE invoices_id_seq RESTART WITH 1;`);
    await db.query(`UPDATE invoices SET id=nextval('invoices_id_seq');`)
});


afterAll(async() => {
    await db.end();
});


describe("GET /invoices, /invoices/:id", () => {
    test("Does the GET invoices route return an array of all invoices?", async() => {
        const resp = await request(app).get("/invoices");
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual(testInvoice);
    });
    test("Does an empty database throw a 404 not found error?", async() => {
        const deleteQuery = await db.query("DELETE from invoices");
        const resp = await request(app).get(`/invoices`);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toEqual("No invoice data found.");
    });
    test("Does the GET single invoice route work when given a valid id?", async() => {
        const newInvoice = await db.query(
            `INSERT INTO invoices
             (comp_code, amt, paid, add_date, paid_date)
             VALUES
             ('apple', 1000, false, '2021-09-18T18:47:52.116Z', null)
             RETURNING id, comp_code, amt, paid, add_date, paid_date`
        )
        const id = newInvoice.rows[0].id;
        const resp = await request(app).get(`/invoices/${id}`);;
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual({
            comp_code: "apple",
            amt: 1000,
            paid: false,
            add_date: "2021-09-18T18:47:52.116Z",
            paid_date: null
        });
    });
    test("Does the GET single invoice route return a 404 when given an id that is not in the DB?", async() => {
        const resp = await request(app).get("/invoices/15");
        expect(resp.statusCode).toBe(404);
        expect(resp.body.error.message).toEqual("Invoice not found.");
    });
});

describe("POST /invoices", () => {
    test("Does the POST route create a new invoice in the DB?", async() => {
        const newInvoice = {
            comp_code: "apple",
            amt: 200,
            paid: true,
            add_date: "2021-09-18T18:47:52.116Z",
            paid_date: "null"
        };
        const resp = await request(app).post("/invoices").send(newInvoice);
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual({
            invoice: {
                comp_code: "apple",
                amt: 200,
                paid: true,
                add_date: "2021-09-18T18:47:52.116Z",
                paid_date: "null"
            }
        });
    });
    test("Does the POST route throw an error if not enough data is given?", async() => {
        const newInvoice = {
            comp_code: "apple",
            paid: true,
            add_date: "2021-09-18T18:47:52.116Z",
            paid_date: "null"
        };
        const resp = await request(app).post("/invoices").send(newInvoice);
        expect(resp.statusCode).toBe(400);
        expect(resp.body.error.message).toEqual("Not enough data to add item.");
    });
    test("Does the POST route throw an error if 'paid' is not a boolean?", async() => {
        const newInvoice = {
            comp_code: "apple",
            amt: 900,
            paid: 3456,
            add_date: "2021-09-18T18:47:52.116Z",
            paid_date: "null"
        };
        const resp = await request(app).post("/invoices").send(newInvoice);
        expect(resp.statusCode).toBe(400);
        expect(resp.body.error.message).toEqual("Paid column must be true or false.");
    });
});

describe("PUT /invoices/:id", () => {
    test("Does the PUT route update an existing item?", async() => {
        const newInvoice = await db.query(
            `INSERT INTO invoices
             (comp_code, amt, paid, add_date, paid_date)
             VALUES
             ('apple', 5000, false, '2021-09-18T18:47:52.116Z', null)
             RETURNING id, comp_code, amt, paid, add_date, paid_date`
        );
        const updatedInvoice = {
            comp_code: "apple",
            amt: 10000,
            paid: false,
            add_date: "2021-09-18T18:47:52.116Z",
            paid_date: "null"  
    };
        const id = newInvoice.rows[0].id;
        const resp = await request(app).put(`/invoices/${id}`).send(updatedInvoice);
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual({
            comp_code: "apple",
            amt: 10000,
            paid: false,
            add_date: "2021-09-18T18:47:52.116Z",
            paid_date: "null"
        });
    });
    test("Does the PUT route return an error if an item is not found?", async() => {
        const newInvoice = await db.query(
            `INSERT INTO invoices
             (comp_code, amt, paid, add_date, paid_date)
             VALUES
             ('apple', 5000, false, '2021-09-18T18:47:52.116Z', null)
             RETURNING id, comp_code, amt, paid, add_date, paid_date`
        )
        const updatedInvoice = {
            comp_code: "apple",
            amt: 10000,
            paid: false,
            add_date: "2021-09-18T18:47:52.116Z",
            paid_date: "null"  
        };

        // Even though request body is good, there is no data in the DB at id #15
        const resp = await request(app).put("/invoices/15").send(updatedInvoice);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toEqual("Invoice not found.");
    });
    test("Does the PUT route return an error if the 'paid' column is not a boolean?", async() => {
        const newInvoice = await db.query(
            `INSERT INTO invoices
             (comp_code, amt, paid, add_date, paid_date)
             VALUES
             ('apple', 5000, false, '2021-09-18T18:47:52.116Z', null)
             RETURNING id, comp_code, amt, paid, add_date, paid_date`
        )
        const updatedInvoice = {
            comp_code: "apple",
            amt: 10000,
            paid: "cake",
            add_date: "2021-09-18T18:47:52.116Z",
            paid_date: "null"  
        };
        const id = newInvoice.rows[0].id;
        const resp = await request(app).put(`/invoices/${id}`).send(updatedInvoice);
        expect(resp.statusCode).toBe(400);
        expect(resp.body.error.message).toEqual("Paid column must be true or false.");
    });
    test("Does the PUT route return an error if not all columns are updated?", async() => {
        const newInvoice = await db.query(
            `INSERT INTO invoices
             (comp_code, amt, paid, add_date, paid_date)
             VALUES
             ('apple', 5000, false, '2021-09-18T18:47:52.116Z', null)
             RETURNING id, comp_code, amt, paid, add_date, paid_date`
        );
        const updatedInvoice = {
            comp_code: "apple",
            paid: false,
            add_date: "2021-09-18T18:47:52.116Z",
            paid_date: "null"  
    };
        const id = newInvoice.rows[0].id;
        const resp = await request(app).put(`/invoices/${id}`).send(updatedInvoice);
        expect(resp.statusCode).toBe(400);
        expect(resp.body.error.message)
        .toEqual("You must update every field to update item. Use same values on other columns if necessary");
    });
});

describe("DELETE /invoices/:id", () => {
    test("Does the DELETE route delete an existing item?", async() => {
        const newInvoice = await db.query(
            `INSERT INTO invoices
             (comp_code, amt, paid, add_date, paid_date)
             VALUES
             ('apple', 5000, false, '2021-09-18T18:47:52.116Z', null)
             RETURNING id, comp_code, amt, paid, add_date, paid_date`
        );
        const id = newInvoice.rows[0].id;
        const resp = await request(app).delete(`/invoices/${id}`);
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual({
            status: "deleted"
        });
    });
    test("Does the DELETE route throw a 404 error if an item is not found?", async() => {
        const resp = await request(app).delete(`/invoices/15`);
        expect(resp.statusCode).toBe(404);
        expect(resp.body.error.message).toEqual("Invoice not found.");
    });
});

describe("ANY /invoices/:anything", () => {
    test("Does a request to an endpoint that does not exist throw an error as intended?", async() => {
        const resp = await request(app).get("/invoice");
        expect(resp.statusCode).toBe(404);
        expect(resp.body.error.message).toEqual("Not Found");
    });
});