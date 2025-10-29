// backend/routes/checkout.js
const express = require("express");
const router = express.Router();
const paypal = require("@paypal/checkout-server-sdk");

// ENV & credentials
const ENV = (process.env.PAYPAL_ENV || "sandbox").toLowerCase();
const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_SECRET;

if (!clientId || !clientSecret) {
  console.error("❌ PayPal creds manquantes (PAYPAL_CLIENT_ID / PAYPAL_SECRET).");
}

const Environment =
  ENV === "live" ? paypal.core.LiveEnvironment : paypal.core.SandboxEnvironment;

const paypalClient = new paypal.core.PayPalHttpClient(
  new Environment(clientId, clientSecret)
);

/**
 * POST /api/checkout/create-payment
 * Body: { amount: "115.00" } (string ou number)
 * Réponse: { approvalUrl, orderID }
 */
router.post("/create-payment", async (req, res) => {
  try {
    const amount =
      typeof req.body?.amount === "number"
        ? req.body.amount.toFixed(2)
        : String(req.body?.amount ?? "0.00");

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: { currency_code: "CAD", value: amount },
          description: "Achat chez Lyséa",
        },
      ],
      application_context: {
        brand_name: "Lyséa",
        landing_page: "LOGIN",
        user_action: "PAY_NOW",
        return_url: "http://localhost:3000/paypal-success",
        cancel_url: "http://localhost:3000/order",
      },
    });

    const order = await paypalClient.execute(request);
    const links = order.result.links || [];
    const approve = links.find((l) => l.rel === "approve");
    const approvalUrl = approve?.href;

    if (!approvalUrl) {
      return res.status(500).json({ error: "no_approval_link" });
    }

    return res.json({ approvalUrl, orderID: order.result.id });
  } catch (error) {
    console.error("❌ PayPal create-payment:", error?.message || error);
    if (error?.statusCode || error?.result) {
      console.error("↳ details:", error.statusCode, error.result);
    }
    return res.status(500).json({ error: "paypal_create_failed" });
  }
});

/**
 * POST /api/checkout/capture-payment
 * Body: { orderID }  OU bien PayPal renvoie ?token= dans l'URL (on lit aussi req.query.token)
 * Réponse: objet capture PayPal
 */
router.post("/capture-payment", async (req, res) => {
  try {
    const orderID = req.body?.orderID || req.query?.token;
    if (!orderID) return res.status(400).json({ error: "missing_order_id" });

    const request = new paypal.orders.OrdersCaptureRequest(orderID);
    request.requestBody({});

    const capture = await paypalClient.execute(request);
    return res.json(capture.result);
  } catch (error) {
    console.error("❌ PayPal capture-payment:", error?.message || error);
    if (error?.statusCode || error?.result) {
      console.error("↳ details:", error.statusCode, error.result);
    }
    return res.status(500).json({ error: "paypal_capture_failed" });
  }
});

module.exports = router;
