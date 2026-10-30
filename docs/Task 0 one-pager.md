Simplify Money App Review: Feedback, Bugs and UX Improvements

Prepared by Prashant, based on my own use of the app and feedback from three referrals.

Summary:

The app's key numbers (idle cash, cash balance, runway) are unclear or inconsistent, which hurts trust in a finance app. The other issues are smaller: missing empty states, navigation and animation.

High priority:
1. Idle cash shows two different values. The Home summary card shows ₹0, while the Idle Cash section below shows ₹6.7K. That amount looks like an account balance, not idle cash. Gmail does not hold every transaction, so a figure built from it can be wrong.
Fix: Show one value everywhere, separate balance from estimated idle cash, label estimates, and explain how the figure is calculated.
2. Runway changes unexpectedly. It showed about 1,023 days, then about 1,173 the next morning, then 1,023 again. The month also changed from September to August, although it was October. The projected date has no year, and 1,023 days is about 2 years 9 months.
Fix: Make the calculation stable, show the year, and show "not enough data" when a reliable projection is not possible.

Medium priority:
3. Runway metrics are hard to understand. Cash Balance (about ₹15,957), Average Daily Burn, 30-Day Average Burn and Runway Date are not explained at a glance, and the cash balance does not match my real balance.
Fix: Define each metric in plain language, say whether the balance is verified or estimated, and explain how the runway date is worked out.
4. The Gmail connection shows a static "30s". It is unclear whether this is a countdown or an estimate.
Fix: Use a real countdown, or write "about 30 seconds" and say it may take longer.
5. Empty states are missing. Spend Analytics gives no reason for an empty month, the Purchased and Redeemed tabs in My Coins are blank, and Help and Support has no empty history message.
Fix: Show clear messages such as "No transactions recorded for this month yet" or "No coins purchased yet", and tell "no spending" apart from "data not synced".
6. Account deactivation requests cannot be tracked. The in-app Google Form lets me submit again, and the app shows no record or status of my request.
Fix: Record each request, show its status (Pending, Processing, Completed), and block repeat submissions while one is pending.

Low priority:
7. Back button. On Home, the system Back button steps through earlier screens before the app closes. Home should be the root screen, and Back there should exit the app.
8. Font size. Text on one screen looks smaller than elsewhere. Use one consistent type scale for headings, body text and labels.
9. Animations, carousel and haptics. The same bottom-to-top transition is used on many screens which also makes the navigation between screens slow and laggy, the carousel is okay-ish but not smooth enough on some older devices, and haptic feedback feels weak. Keep motion simple and use it only where it helps.

What worked well:
The overall feel of the app was good with informative data and features for the user. 

Three changes I would make first:
1. Make every financial number consistent and label it as verified or estimated.
2. Stabilise the runway calculation and show full dates with the year.
3. Add clear empty states and request tracking.