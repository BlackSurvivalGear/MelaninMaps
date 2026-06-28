const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

const PAYPAL_CLIENT_ID = defineSecret("PAYPAL_CLIENT_ID");
const PAYPAL_CLIENT_SECRET = defineSecret("PAYPAL_CLIENT_SECRET");
const PAYPAL_WEBHOOK_ID = defineSecret("PAYPAL_WEBHOOK_ID");
const PAYPAL_ENV = defineSecret("PAYPAL_ENV"); // 'sandbox' or 'live'

/**
 * Gets PayPal Base URL based on environment
 */
function getPayPalBaseUrl() {
    return PAYPAL_ENV.value() === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";
}

/**
 * Gets PayPal Access Token
 */
async function getPayPalAccessToken(clientId, clientSecret) {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const baseUrl = getPayPalBaseUrl();
    const response = await axios({
        url: `${baseUrl}/v1/oauth2/token`,
        method: "post",
        data: "grant_type=client_credentials",
        headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });
    return response.data.access_token;
}

/**
 * Verifies PayPal payment via Callable function
 */
exports.verifyPayPalPayment = onCall({ secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENV] }, async (request) => {
    const { orderId, plan } = request.data;
    const uid = request.auth?.uid;

    if (!uid) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    if (!orderId || !plan) {
        throw new HttpsError("invalid-argument", "Missing orderId or plan.");
    }

    try {
        const accessToken = await getPayPalAccessToken(PAYPAL_CLIENT_ID.value(), PAYPAL_CLIENT_SECRET.value());
        const baseUrl = getPayPalBaseUrl();

        // 1. Capture the order
        const captureResponse = await axios({
            url: `${baseUrl}/v2/checkout/orders/${orderId}/capture`,
            method: "post",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
        });

        const order = captureResponse.data;

        // 2. Verify status and custom_id
        const customId = order.purchase_units[0].custom_id;
        const [orderUid, orderPlan] = customId.includes("|") ? customId.split("|") : [customId, plan];

        if (order.status !== "COMPLETED") {
             throw new HttpsError("failed-precondition", `Payment status is ${order.status}.`);
        }

        if (orderUid !== uid) {
            throw new HttpsError("permission-denied", "Order does not belong to this user.");
        }

        if (orderPlan !== plan) {
            throw new HttpsError("invalid-argument", "Plan mismatch.");
        }

        // 3. Update Firestore
        await updateSubscription(uid, plan, orderId);

        return { success: true, plan: plan };

    } catch (error) {
        console.error("PayPal Verification Error:", error.response?.data || error.message);
        const errorMessage = error.response?.data?.message || error.message;
        throw new HttpsError("internal", `Verification failed: ${errorMessage}`);
    }
});

async function updateSubscription(uid, plan, transactionId) {
    const db = admin.firestore();
    const userRef = db.collection("users").doc(uid);

    await db.runTransaction(async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists) return;

        const userData = userSnap.data();
        const currentPlan = userData.plan || "preview";

        // Skip if already upgraded to this plan or better
        if (currentPlan === plan || (currentPlan === "pro" && plan === "standard")) return;

        const referredBy = userData.referredBy;
        const commissionAlreadyGenerated = userData.commissionGenerated === true;

        // Update user
        transaction.update(userRef, {
            plan: plan,
            subscriptionStatus: "active",
            subscriptionActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
            paymentMethod: "paypal",
            paypalTransactionId: transactionId,
            upgradedBy: "paypal",
            commissionGenerated: true
        });

        // Handle Affiliate Commission
        if (referredBy && !commissionAlreadyGenerated) {
            const codeRef = db.collection("referralCodes").doc(referredBy);
            const codeSnap = await transaction.get(codeRef);

            if (codeSnap.exists) {
                const affiliateUid = codeSnap.data().uid;
                const affiliateRef = db.collection("affiliates").doc(affiliateUid);
                const affSnap = await transaction.get(affiliateRef);

                if (affSnap.exists) {
                    const bizRef = db.collection("businesses").doc(uid);
                    const bizSnap = await transaction.get(bizRef);
                    const businessName = bizSnap.exists ? bizSnap.data().businessName : "Unknown Business";

                    const amountPaid = plan === "pro" ? 49.99 : 9.99;
                    const commissionAmount = plan === "pro" ? 15.00 : 3.00;

                    // Create Commission Doc
                    const commissionRef = db.collection("commissions").doc();
                    transaction.set(commissionRef, {
                        affiliateId: affiliateUid,
                        businessId: uid,
                        businessName: businessName,
                        subscription: plan.charAt(0).toUpperCase() + plan.slice(1),
                        amountPaid: amountPaid,
                        commission: commissionAmount,
                        status: "Pending",
                        source: "paypal-webhook",
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    });

                    // Update Affiliate Totals
                    const affData = affSnap.data();
                    transaction.update(affiliateRef, {
                        pendingCommission: (affData.pendingCommission || 0) + commissionAmount,
                        totalBusinesses: (affData.totalBusinesses || 0) + 1,
                        lifetimeCommission: (affData.lifetimeCommission || 0) + commissionAmount
                    });

                    // Update Referral Record
                    const referralRef = db.collection("referrals").doc(`${affiliateUid}_${uid}`);
                    transaction.update(referralRef, {
                        subscription: plan.charAt(0).toUpperCase() + plan.slice(1),
                        status: "Paid"
                    });
                }
            }
        }
    });
}

/**
 * PayPal Webhook
 */
exports.paypalWebhook = onRequest({ secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID, PAYPAL_ENV] }, async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }

    const signatureVerification = await verifyWebhookSignature(req);
    if (!signatureVerification) {
        console.error("Webhook signature verification failed");
        return res.status(400).send("Verification failed");
    }

    const event = req.body;

    // Handle the event - Capture completed is the one we care about for confirmed payment
    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
        const resource = event.resource;
        const orderId = resource.supplementary_data?.related_ids?.order_id || resource.parent_payment;
        const customId = resource.custom_id;

        if (customId) {
            const [uid, plan] = customId.split("|");
            if (uid && plan) {
                try {
                    await updateSubscription(uid, plan, orderId || resource.id);
                    console.log(`Successfully upgraded user ${uid} (${plan}) via webhook`);
                } catch (error) {
                    console.error("Error updating subscription via webhook:", error);
                    return res.status(500).send("Internal Server Error");
                }
            }
        }
    }

    res.status(200).send("OK");
});

async function verifyWebhookSignature(req) {
    try {
        const accessToken = await getPayPalAccessToken(PAYPAL_CLIENT_ID.value(), PAYPAL_CLIENT_SECRET.value());
        const baseUrl = getPayPalBaseUrl();
        const response = await axios({
            url: `${baseUrl}/v1/notifications/verify-webhook-signature`,
            method: "post",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            data: {
                transmission_id: req.headers["paypal-transmission-id"],
                transmission_time: req.headers["paypal-transmission-time"],
                cert_url: req.headers["paypal-cert-url"],
                auth_algo: req.headers["paypal-auth-algo"],
                transmission_sig: req.headers["paypal-transmission-sig"],
                webhook_id: PAYPAL_WEBHOOK_ID.value(),
                webhook_event: req.body,
            },
        });
        return response.data.verification_status === "SUCCESS";
    } catch (error) {
        console.error("Signature verification error:", error.response?.data || error.message);
        return false;
    }
}
