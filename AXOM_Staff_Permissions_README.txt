AXOM GAMING — STAFF OPERATIONS UPDATE

WHAT STAFF CAN DO
- Main gaming dashboard: create bookings, start/view/extend/adjust/close live sessions, add snacks, collect payments, and view today's summary.
- Membership desk: search members and book existing members' PS5 membership hours.
- Dues: view gaming/manual dues, add manual dues, and collect full/partial payments.
- Stock: view active inventory and record purchases that increase stock.

WHAT REMAINS OWNER-ONLY
- Create/deactivate staff accounts.
- Create or renew memberships (the current form accepts custom prices/hours, so it is not safe to expose to staff until fixed membership plans are configured).
- Add new stock products, manually edit stock quantities, change selling prices, or adjust stock.
- Monthly reports and notification settings.
- Membership sheet setup and owner configuration.

STAFF MANUAL DUE LIMIT
- Default maximum: INR 500 per manual due record.
- The same limit is applied when staff closes a gaming session with an unpaid balance.
- To change the limit, open the Settings sheet and add/edit a row:
  Setting: STAFF_MAX_MANUAL_DUE
  Value: 500
- If that row is absent, the backend uses INR 500.
- Owner/admin accounts are not subject to this staff limit.
- Staff can collect partial or full payments against existing dues.

AUDIT FIELDS
The backend adds these columns at the end of the relevant sheets when first used:
- Admin sheet: E1 should be labelled Role (values Admin or Staff; old blank roles default to Admin).
- Manual_Dues: CreatedBy
- Manual_Due_Payments and Due_Payments: CollectedBy
- Gaming_Sales: CreatedBy
- Membership_Bookings: BookedBy
- Stock_Purchases: PurchasedBy

BACKUP FIRST
1. Make a copy of the Google Spreadsheet.
2. Make a copy of the Apps Script project or save the current Code.gs and website files.

APPS SCRIPT
1. Replace the contents of Code.gs with Code_AXOM_Staff_Operations.gs.
2. In the Admin sheet, set E1 to Role. Existing admin rows with a blank Role are treated as Admin.
3. In the Settings sheet, add Setting / Value row STAFF_MAX_MANUAL_DUE / 500 (optional; 500 is the fallback).
4. To create a staff login, edit the username and temporary password at the top of createStaffUser() in Code.gs.
   Use a unique username and a temporary password of at least 12 characters.
5. Save and run createStaffUser() once. It does not use SpreadsheetApp.getUi().
6. Remove the temporary password from the source code after the staff account is created.
7. Deploy > Manage deployments > Edit > New version > Deploy.

WEBSITE FILES
Replace these files in the GitHub Pages repository:
- script.js with script.js from this package.
- membership.js with membership_staff.js (rename it to membership.js).
- dues.html with dues.html from this package.
- dues.js with dues_staff.js (rename it to dues.js).
- dues_sidebar.css with the included dues_sidebar.css.
- stock.html with stock.html from this package.
- stock.js with stock_staff.js (rename it to stock.js).
No change to membership.html or index.html is required for these role changes.

TEST BEFORE STAFF USE
1. Log in as owner and verify all pages still work.
2. Log in as staff and verify main bookings/live sessions work.
3. Open Membership Desk: member search and membership booking should work; registration form should be hidden.
4. Open Dues: create a manual due of INR 300; try INR 501 (should be rejected); collect a partial payment.
5. Close a gaming session with a due above INR 500 as staff (should be rejected).
6. Open Stock: record a purchase; verify stock increases and PurchasedBy is recorded.
7. Try direct API access to addMember, renewMember, editSnackStock, adjustStock, and getMonthlyReport with a staff token; each must be rejected.
8. Verify owner access still works.

LIMITATIONS / NOT INCLUDED IN THIS UPDATE
- Staff membership sales and renewals remain owner-only until the app is changed to use a fixed, owner-configured plan list rather than free-form price/hour fields.
- This does not add an expenses module or a formal end-of-day cash reconciliation/approval workflow.
- This code has been syntax-checked but has not been run against the live Google Sheet. Do not deploy without testing on a spreadsheet copy first.
