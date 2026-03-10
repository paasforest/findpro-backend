# FindPro server – next steps (178.104.4.77)

## 1. Add your database and secrets

SSH in and edit `.env`:

```bash
ssh -i ~/.ssh/id_ed25519_hetzner root@178.104.4.77
nano /root/findpro-backend/.env
```

**Set these:**

- `DATABASE_URL` – Your Hetzner Managed PostgreSQL connection string (from Hetzner Cloud Console).
- `JWT_SECRET` – A long random string (e.g. 32+ characters).

Save and exit (Ctrl+O, Enter, Ctrl+X).

## 2. Run migrations and seed

```bash
cd /root/findpro-backend
npx prisma migrate deploy
npx prisma db seed
```

## 3. Start the API with PM2

```bash
cd /root/findpro-backend
pm2 start server.js --name findpro-api
pm2 save
pm2 startup
```

## 4. Nginx (when you have a domain)

When `api.findpro.co.za` points to `178.104.4.77`:

```bash
# On server
cp /root/findpro-backend/deploy/nginx-findpro-api.conf /etc/nginx/sites-available/findpro-api
ln -sf /etc/nginx/sites-available/findpro-api /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

Then get SSL:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d api.findpro.co.za
```

## 5. Test

- Without domain: `http://178.104.4.77:5000/api/health` (open port 5000 in Hetzner firewall if needed).
- With Nginx on 80: `http://178.104.4.77/api/health`
- With domain: `https://api.findpro.co.za/api/health`
