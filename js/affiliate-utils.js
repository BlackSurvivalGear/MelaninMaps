/**
 * Generates a unique Affiliate ID
 * Format: MM + 5 random digits
 */
export function generateAffiliateId() {
    return 'MM' + Math.floor(10000 + Math.random() * 90000);
}

/**
 * Generates a default Referral Code from name
 * Format: NAME + 2 random digits or just name if short
 */
export function generateReferralCode(name) {
    const cleanName = name ? name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10) : 'MAPS';
    const randomSuffix = Math.floor(10 + Math.random() * 90);
    return `${cleanName}${randomSuffix}`;
}

/**
 * Validates a referral code exists in the 'affiliates' collection
 * @param {object} db - Firestore instance
 * @param {string} code - The referral code to check
 * @returns {Promise<string|null>} - Returns affiliateId if found, else null
 */
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

export async function validateReferralCode(db, code) {
    if (!code) return null;

    try {
        const docRef = doc(db, "referralCodes", code.toUpperCase().trim());
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data().uid;
        }
        return null;
    } catch (error) {
        console.error("Error validating referral code:", error);
        return null;
    }
}
