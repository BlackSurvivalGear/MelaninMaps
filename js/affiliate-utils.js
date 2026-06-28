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
import { collection, query, where, getDocs, limit } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

export async function validateReferralCode(db, code) {
    if (!code) return null;

    try {
        const affiliatesRef = collection(db, "affiliates");
        const q = query(affiliatesRef, where("referralCode", "==", code.toUpperCase().trim()), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            return querySnapshot.docs[0].data().affiliateId;
        }
        return null;
    } catch (error) {
        console.error("Error validating referral code:", error);
        return null;
    }
}
