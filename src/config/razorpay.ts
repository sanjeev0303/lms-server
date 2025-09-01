import Razorpay from "razorpay";
import * as env from "../env/index"

class RazorpayConfig{
    private static instance: Razorpay | null = null

    /**
     * Get Razorpay Instance
    */
   public static getInstance(): Razorpay{
    if (!RazorpayConfig.instance) {
        // Check if Razorpay keys are provided
        if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
            throw new Error('Razorpay configuration is missing. Please provide RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.');
        }

        RazorpayConfig.instance = new Razorpay({
            key_id: env.RAZORPAY_KEY_ID,
            key_secret: env.RAZORPAY_KEY_SECRET,
        });
    }
    return RazorpayConfig.instance;
   }

   /**
    * Check if Razorpay is configured
    */
   public static isConfigured(): boolean {
       return !!(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
   }
}

// Export the class but don't create instance immediately
export default RazorpayConfig

// Export a helper function to get instance safely
export const getRazorpayInstance = (): Razorpay | null => {
    try {
        return RazorpayConfig.isConfigured() ? RazorpayConfig.getInstance() : null;
    } catch {
        return null;
    }
}
