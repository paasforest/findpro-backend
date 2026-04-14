# FindPro – Email Notifications

All emails are sent automatically (`src/utils/sendEmail.js`). **If `RESEND_API_KEY` is set**, mail goes via the **Resend SDK**. **Otherwise**, if `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` are set (e.g. Resend SMTP), mail goes via **Nodemailer**. Set `RESEND_FROM` or `EMAIL_FROM` for the sender; domain `mail.findpro.co.za` must be verified in Resend.

## Auth

| Trigger | Recipient | Subject |
|---------|-----------|---------|
| Register | New user | Verify your email – FindPro |
| Register | New user | Welcome to FindPro – List your business |
| Verify email | User | Your email is verified – FindPro |
| Resend verification | User | Verify your email – FindPro |
| Forgot password | User | FindPro – Reset your password |

## Listings

| Trigger | Recipient | Subject |
|---------|-----------|---------|
| New listing created | Admin | FindPro – New listing pending approval |
| New listing created | Business owner | FindPro – Your listing has been submitted |
| Listing approved | Business owner | Your listing "X" is now live – FindPro |
| Listing rejected | Business owner | Update on your listing "X" – FindPro |

## Claim

| Trigger | Recipient | Subject |
|---------|-----------|---------|
| User requests claim | User (email) | Claim "X" on FindPro |
| Admin sends invitation | Business | Your business "X" is listed on FindPro – claim it |
| Claim completed | New owner | You've claimed "X" – FindPro |

## Reviews

| Trigger | Recipient | Subject |
|---------|-----------|---------|
| New review submitted | Business owner | New review on X – FindPro |
| Review approved | Business owner | A review on X is now live – FindPro |

## Payments

| Trigger | Recipient | Subject |
|---------|-----------|---------|
| Payment confirmed | Business owner | Your [Product] payment for X was confirmed – FindPro |

## Test

```bash
node scripts/send-test-welcome-email.js your@email.com
```
